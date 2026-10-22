import React, { useEffect, useRef, useState } from 'react';
import { Pressable, View, useWindowDimensions } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Avatar, Pict, Txt, tap } from '../src/ui/kit';
import { Icon } from '../src/ui/Icon';
import { toast } from '../src/ui/overlay';
import { C } from '../src/ui/theme';
import { P, myPhoto } from '../src/logic/core';
import { logCall } from '../src/logic/work';

/** Voice / video call screen (simulated: the other side picks up after 2 s). */
export default function Call() {
  const { id, type } = useLocalSearchParams<{ id: string; type?: 'voice' | 'video' }>();
  const ins = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const p = P(id);
  const [video, setVideo] = useState(type === 'video');
  const [secs, setSecs] = useState<number | null>(null);
  const [mute, setMute] = useState(false);
  const [spk, setSpk] = useState(false);
  const s = useRef(0);
  const ended = useRef(false);
  useEffect(() => {
    const t0 = setTimeout(() => setSecs(0), 2000);
    const t = setInterval(() => setSecs((v) => (v == null ? v : ((s.current = v + 1), v + 1))), 1000);
    return () => {
      clearTimeout(t0);
      clearInterval(t);
      if (!ended.current) logCall(id, video ? 'video' : 'voice', s.current);
    };
  }, []);
  const end = () => {
    ended.current = true;
    logCall(id, video ? 'video' : 'voice', s.current);
    toast('Call ended');
    router.back();
  };
  const state = secs == null ? (video ? 'Video calling…' : 'Calling…') : `${video ? 'Video call · ' : ''}${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`;
  const B = ({ icon, label, on, onPress, bg }: { icon: string; label: string; on?: boolean; onPress: () => void; bg?: string }) => (
    <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ selected: !!on }} onPress={() => (tap(), onPress())} style={{ alignItems: 'center', gap: 6 }}>
      <View style={{ width: 62, height: 62, borderRadius: 31, backgroundColor: bg || (on ? '#fff' : 'rgba(255,255,255,.16)'), alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={icon} size={26} color={bg ? '#fff' : on ? '#000' : '#fff'} />
      </View>
      <Txt s={11} w={6}>
        {label}
      </Txt>
    </Pressable>
  );
  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <StatusBar style="light" />
      <Pict pic={p.photo} style={{ position: 'absolute', width, height, opacity: video && secs != null ? 1 : 0.25 }} />
      {!(video && secs != null) ? <View style={{ position: 'absolute', width, height, backgroundColor: 'rgba(0,0,0,.55)' }} /> : null}
      <View style={{ alignItems: 'center', paddingTop: ins.top + 60, gap: 10 }}>
        {!(video && secs != null) ? <Avatar pic={p.photo} size={120} ring={C.yellow} /> : null}
        <Txt s={26} w={8} style={{ marginTop: 10 }}>
          {p.name}
        </Txt>
        <Txt s={14} c="rgba(255,255,255,.8)">
          {state}
        </Txt>
      </View>
      {video ? (
        <View style={{ position: 'absolute', right: 16, top: ins.top + 16, width: 100, height: 140, borderRadius: 16, overflow: 'hidden', borderWidth: 2, borderColor: '#fff' }}>
          <Pict pic={myPhoto()} style={{ width: 100, height: 140 }} />
        </View>
      ) : null}
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: ins.bottom + 40, flexDirection: 'row', justifyContent: 'space-evenly' }}>
        <B icon={mute ? 'micoff' : 'mic'} label={mute ? 'Unmute' : 'Mute'} on={mute} onPress={() => setMute(!mute)} />
        <B icon="speaker" label="Speaker" on={spk} onPress={() => setSpk(!spk)} />
        <B icon="video" label={video ? 'Camera off' : 'Camera'} on={video} onPress={() => setVideo(!video)} />
        <B icon="hangup" label="End" bg={C.err} onPress={end} />
      </View>
    </View>
  );
}
