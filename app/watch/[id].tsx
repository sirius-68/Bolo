import React, { useEffect, useRef, useState } from 'react';
import { ScrollView, View, useWindowDimensions } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Avatar, Btn, Empty, IconBtn, Input, Txt, goBack, tap } from '../../src/ui/kit';
import { RecRow } from '../../src/components/RecRow';
import { Icon } from '../../src/ui/Icon';
import { C, S } from '../../src/ui/theme';
import { sheet, SheetTitle } from '../../src/ui/overlay';
import { useLive } from '../../src/logic/live';
import { Rec, askAt, courseOfRec, fmtTs, isSavedVideo, progressOf, recById, recordingsOf, saveProgress, toggleSavedVideo, videoSource } from '../../src/logic/classes';

/** A class recording: plays where you stopped (or at a shared timestamp), lets you ask at the exact moment. */
export default function Watch() {
  useLive();
  const { id, t } = useLocalSearchParams<{ id: string; t?: string }>();
  const ins = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const r = recById(id);
  const c = r ? courseOfRec(r) : undefined;
  if (!r || !c)
    return (
      <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: ins.top + 60, paddingHorizontal: 20 }}>
        <Empty title="Recording not found" text="It may have been removed by the trainer." />
      </View>
    );
  return <Player key={r.id + (t || '')} r={r} start={t != null ? +t : progressOf(r.id)?.t || 0} width={width} top={ins.top} bottom={ins.bottom} fromShare={t != null} />;
}

function Player({ r, start, width, top, bottom, fromShare }: { r: Rec; start: number; width: number; top: number; bottom: number; fromShare: boolean }) {
  const c = courseOfRec(r)!;
  const [err, setErr] = useState(false);
  const sought = useRef(false);
  const player = useVideoPlayer(videoSource(r.src), (p) => {
    p.timeUpdateEventInterval = 1;
    p.play();
  });
  useEffect(() => {
    const s = player.addListener('statusChange', ({ status }) => {
      if (status === 'error') setErr(true);
      if (status === 'readyToPlay') {
        setErr(false);
        // Jump to the shared moment / where you stopped, once.
        if (!sought.current && start > 0) {
          sought.current = true;
          player.currentTime = start;
        }
      }
    });
    const iv = setInterval(() => saveProgress(r.id, player.currentTime, player.duration), 5000);
    return () => {
      s.remove();
      clearInterval(iv);
      try {
        saveProgress(r.id, player.currentTime, player.duration);
      } catch {}
    };
  }, [player]);
  const others = recordingsOf(c).filter((x) => x.id !== r.id);
  const saved = isSavedVideo(r.id);
  const ask = () => {
    tap();
    const ts = player.currentTime || 0;
    player.pause();
    openAsk(r, ts, () => player.play());
  };
  return (
    <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: top }}>
      <View style={[S.rowB, { paddingHorizontal: 20, height: 56, marginTop: 4 }]}>
        <IconBtn name="back" label="Back" onPress={goBack} />
        <Txt s={15} w={8}>
          {r.live ? 'Live class recording' : 'Recording'}
        </Txt>
        <IconBtn testID="watch-save" name="bookmark" bg={saved ? C.yellow : undefined} color={saved ? '#000' : undefined} label={saved ? 'Remove from saved' : 'Save video'} onPress={() => toggleSavedVideo(r.id)} />
      </View>
      <View testID="watch-video" style={{ width, height: (width * 9) / 16, backgroundColor: '#000' }}>
        <VideoView player={player} style={{ width, height: (width * 9) / 16 }} nativeControls contentFit="contain" />
        {err ? (
          <View style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: 'rgba(0,0,0,.75)' }}>
            <Txt s={14} w={7}>
              Couldn’t load the recording
            </Txt>
            <Btn small variant="yellow" title="Try again" onPress={() => (setErr(false), player.replace(videoSource(r.src)), player.play())} />
          </View>
        ) : null}
      </View>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 30 + bottom, gap: 14 }} showsVerticalScrollIndicator={false}>
        <View style={[S.row, { gap: 8 }]}>
          <Avatar pic={c.prov.logo} square size={22} />
          <Txt s={13} c={C.muted} lines={1} style={{ flex: 1 }}>
            {c.title}
          </Txt>
        </View>
        <Txt s={22} w={8} style={{ lineHeight: 26 }}>
          {r.title}
        </Txt>
        <Txt s={13} c={C.muted}>
          Lesson {r.lesson + 1} · {r.at} · {fmtTs(r.dur)}
          {start > 0 ? ` · ${fromShare ? 'opened at' : 'resumed at'} ${fmtTs(start)}` : ''}
        </Txt>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Btn testID="watch-ask" variant="yellow" icon="chat" title="Ask in class group" style={{ flex: 1 }} onPress={ask} />
        </View>
        <Txt s={12} c={C.faint}>
          Your question includes the exact moment you’re watching, so classmates can jump straight to it.
        </Txt>
        {others.length ? (
          <>
            <Txt s={18} w={8} style={{ marginTop: 10 }}>
              More recordings
            </Txt>
            {others.map((x) => (
              <RecRow key={x.id} r={x} replace />
            ))}
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

function openAsk(r: Rec, ts: number, onDone: () => void) {
  sheet.show(() => <Ask r={r} ts={ts} />, { onClose: onDone });
}
function Ask({ r, ts }: { r: Rec; ts: number }) {
  const [v, setV] = useState('');
  return (
    <View style={{ gap: 12 }}>
      <SheetTitle sub="Your class group sees the time; tapping it plays the video from that moment.">Ask in class group</SheetTitle>
      <View style={[S.row, { gap: 8, alignSelf: 'flex-start', paddingHorizontal: 12, height: 34, borderRadius: 17, backgroundColor: 'rgba(246,238,92,.16)' }]}>
        <Icon name="clock" size={14} color={C.yellow} />
        <Txt testID="ask-ts" s={14} w={8} c={C.yellow}>
          {fmtTs(ts)}
        </Txt>
        <Txt s={12} c={C.muted} lines={1} style={{ maxWidth: 180 }}>
          {r.title}
        </Txt>
      </View>
      <Input testID="ask-text" value={v} onChangeText={setV} multiline maxLength={400} placeholder="e.g. Can someone explain this part?" autoFocus />
      <Btn
        testID="ask-send"
        variant="yellow"
        icon="send"
        title={`Send at ${fmtTs(ts)}`}
        disabled={!v.trim()}
        onPress={() => {
          askAt(r, ts, v);
          sheet.close();
        }}
      />
    </View>
  );
}
