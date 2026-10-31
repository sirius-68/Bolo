import React, { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Avatar, Btn, Input, Pict, Txt, tap } from '../ui/kit';
import { Icon } from '../ui/Icon';
import { C, S } from '../ui/theme';
import { sheet, SheetTitle } from '../ui/overlay';
import { P, fname, isW, myPhoto } from '../logic/core';
import { useLive } from '../logic/live';
import { pickImage } from '../logic/media';
import { openProfile } from '../logic/nav';
import { GRADS, STATUS_IDEAS, addStatus, markSeen, myStatuses, myStories, seen, statusPeople, storiesOf } from '../logic/status';
import { showStories } from './Stories';
import { openChat } from '../sheets/chat';
import { openJob } from '../sheets/work';

const SIZE = 64;
const act = { job: openJob, chat: openChat, profile: openProfile };

/** Statuses from people and companies you follow, like the top of a social app. First bubble is yours. */
export function StatusRow() {
  useLive();
  const L = statusPeople();
  const mine = myStatuses();
  const openMine = () => (tap(), mine.length ? showStories(myStories(() => setTimeout(openAddStatus, 300)), { label: 'Your status' }) : openAddStatus());
  return (
    <ScrollView testID="status-row" horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -20, marginTop: 10 }} contentContainerStyle={{ paddingHorizontal: 20, gap: 14 }}>
      <View style={{ width: SIZE + 6, alignItems: 'center' }}>
        <Pressable testID="status-mine" accessibilityRole="button" accessibilityLabel={mine.length ? 'View your status' : 'Add to your status'} onPress={openMine}>
          <Ring on={!!mine.length} seen={false}>
            <Avatar pic={myPhoto()} size={SIZE - 8} />
          </Ring>
          <Pressable testID="status-add" accessibilityRole="button" accessibilityLabel="Add to your status" hitSlop={6} onPress={() => (tap(), openAddStatus())} style={{ position: 'absolute', right: -2, bottom: -2, width: 24, height: 24, borderRadius: 12, backgroundColor: C.yellow, borderWidth: 2.5, borderColor: C.bg, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="plus" size={13} color="#000" />
          </Pressable>
        </Pressable>
        <Txt s={11} w={6} c={C.muted} lines={1} style={{ marginTop: 6 }}>
          {mine.length ? 'Your status' : 'Add status'}
        </Txt>
      </View>
      {L.map(({ id, follow }) => {
        const p = P(id);
        const sn = seen(id);
        return (
          <Pressable
            key={id}
            testID={`status-${id}`}
            accessibilityRole="button"
            accessibilityLabel={`${p.name} status${sn ? ', seen' : ', new'}`}
            onPress={() => {
              tap();
              const list = storiesOf(id, act);
              showStories(list, { label: p.name, onClose: () => markSeen(id) });
            }}
            style={{ width: SIZE + 6, alignItems: 'center' }}
          >
            <Ring on seen={sn} square={!!p.biz}>
              <Avatar pic={p.photo} square={!!p.biz} size={SIZE - 8} />
            </Ring>
            <Txt s={11} w={sn ? 5 : 7} c={sn ? C.muted : C.text} lines={1} style={{ marginTop: 6 }}>
              {p.biz ? p.name.split(' ')[0] : fname(p.name)}
            </Txt>
            {!follow ? (
              <Txt s={9} c={C.faint} lines={1}>
                Suggested
              </Txt>
            ) : null}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
function Ring({ on, seen, square, children }: { on: boolean; seen: boolean; square?: boolean; children: React.ReactNode }) {
  const r = square ? 20 : SIZE / 2;
  if (!on || seen)
    return <View style={{ width: SIZE, height: SIZE, borderRadius: r, borderWidth: 2, borderColor: on ? C.s3 : 'transparent', alignItems: 'center', justifyContent: 'center' }}>{children}</View>;
  return (
    <LinearGradient colors={[C.yellow, C.orange, C.lav]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ width: SIZE, height: SIZE, borderRadius: r, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: SIZE - 5, height: SIZE - 5, borderRadius: r - 2, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' }}>{children}</View>
    </LinearGradient>
  );
}

/* ---------------- add to your status ---------------- */
export function openAddStatus() {
  sheet.show(() => <AddStatus />, { full: true });
}
function AddStatus() {
  const [pic, setPic] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [g, setG] = useState(0);
  const get = async (camera: boolean) => {
    const p = await pickImage({ camera });
    if (p) setPic(p);
  };
  const ok = !!pic || !!text.trim();
  const light = !pic && g === 4;
  return (
    <View style={{ gap: 14 }}>
      <SheetTitle sub={isW() ? 'Your followers see it for 24 hours. Show work in progress, when you’re free, or what you just finished.' : 'Followers see it for 24 hours. Share openings, team moments and news.'}>Add to your status</SheetTitle>
      {/* preview */}
      <View style={{ height: 300, borderRadius: 26, overflow: 'hidden' }}>
        {pic ? <Pict pic={pic} style={{ position: 'absolute', width: '100%', height: '100%' }} /> : <LinearGradient colors={GRADS[g]} style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }} />}
        {pic ? <LinearGradient colors={['transparent', 'rgba(0,0,0,.65)']} style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 140 }} /> : null}
        <View style={{ flex: 1, padding: 18, justifyContent: pic ? 'flex-end' : 'center' }}>
          <Txt s={pic ? 18 : 26} w={8} c={light ? '#000' : '#fff'} center={!pic} lines={4}>
            {text.trim() || (pic ? '' : 'Type something or add a photo')}
          </Txt>
        </View>
        {pic ? (
          <Pressable accessibilityRole="button" accessibilityLabel="Remove photo" onPress={() => setPic(null)} style={{ position: 'absolute', right: 12, top: 12, width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(0,0,0,.5)', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="x" size={16} color="#fff" />
          </Pressable>
        ) : null}
      </View>
      <View style={[S.row, { gap: 10 }]}>
        <Btn small variant="dark" icon="image" title="Photo" style={{ flex: 1 }} onPress={() => get(false)} />
        <Btn small variant="dark" icon="cam" title="Camera" style={{ flex: 1 }} onPress={() => get(true)} />
        {!pic ? (
          <View style={[S.row, { gap: 6 }]}>
            {GRADS.map((c, i) => (
              <Pressable key={i} accessibilityLabel={`Colour ${i + 1}`} onPress={() => (tap(), setG(i))} style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: c[0], borderWidth: 2, borderColor: g === i ? C.text : 'transparent' }} />
            ))}
          </View>
        ) : null}
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {STATUS_IDEAS().map((t) => (
          <Pressable key={t} onPress={() => (tap(), setText(t))} style={{ paddingHorizontal: 12, height: 34, borderRadius: 17, backgroundColor: text === t ? C.text : C.s2, justifyContent: 'center' }}>
            <Txt s={12} w={7} c={text === t ? '#000' : C.text}>
              {t}
            </Txt>
          </Pressable>
        ))}
      </ScrollView>
      <Input testID="status-text" value={text} onChangeText={setText} maxLength={120} placeholder="Say something (optional with a photo)" />
      <Btn
        testID="status-share"
        variant="yellow"
        icon="send"
        title="Share status"
        disabled={!ok}
        onPress={() => {
          addStatus({ pic: pic || undefined, text: text.trim(), colors: GRADS[g] });
          sheet.close();
        }}
      />
    </View>
  );
}
