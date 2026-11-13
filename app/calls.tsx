import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar, Empty, PTabs, TopBar, Txt, Verified } from '../src/ui/kit';
import { Icon } from '../src/ui/Icon';
import { C, S } from '../src/ui/theme';
import { P } from '../src/logic/core';
import { useLive } from '../src/logic/live';
import { ago, dayLabel } from '../src/logic/server';
import { CallLine, callLines, callsAvailable, loadCalls, onCall, seenMissed, startCall } from '../src/logic/calls';
import { openChat } from '../src/sheets/chat';
import { Pull } from '../src/components/common';

const len = (s: number) => (s >= 3600 ? `${Math.floor(s / 3600)} h ${Math.floor((s % 3600) / 60)} min` : s >= 60 ? `${Math.floor(s / 60)} min ${s % 60 ? (s % 60) + ' s' : ''}`.trim() : `${s} s`);

/** Call history: every call made, received and missed. Calls in a row with the same person are one line with a count. */
export default function Calls() {
  useLive();
  const ins = useSafeAreaInsets();
  const { tab: start } = useLocalSearchParams<{ tab?: string }>();
  const [tab, setTab] = useState<'All' | 'Missed'>(start === 'missed' ? 'Missed' : 'All');
  const [ready, setReady] = useState(false);
  // fresh every time the screen is opened, and when a call ends while it is open
  useFocusEffect(
    useCallback(() => {
      let alive = true;
      void loadCalls().finally(() => alive && setReady(true));
      seenMissed();
      return () => {
        alive = false;
      };
    }, []),
  );
  useEffect(() => {
    const off = onCall((c) => c.status !== 'ringing' && c.status !== 'accepted' && void loadCalls());
    return () => {
      off();
    };
  }, []);
  const lines = callLines(tab === 'Missed' ? 'missed' : undefined);
  const missedN = callLines('missed').reduce((a, l) => a + l.n, 0);
  return (
    <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: ins.top }}>
      <View style={{ paddingHorizontal: 20 }}>
        <TopBar title="Calls" />
        <PTabs
          style={{ marginTop: 6 }}
          items={[
            ['All', 'All', null],
            ['Missed', 'Missed', missedN || null],
          ]}
          value={tab}
          onChange={(t) => setTab(t as 'All' | 'Missed')}
        />
      </View>
      <FlatList
        testID="calls-list"
        refreshControl={<Pull />}
        data={lines}
        keyExtractor={(l) => l.id}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 40 + ins.bottom }}
        renderItem={({ item }) => <Row l={item} />}
        ListEmptyComponent={
          ready ? (
            <Empty style={{ marginTop: 30 }} title={tab === 'Missed' ? 'No missed calls' : 'No calls yet'} text={tab === 'Missed' ? 'Calls you don’t answer will show here.' : 'Call anyone you’re chatting with from the phone or camera button in the chat.'} />
          ) : (
            <View style={{ gap: 10 }} accessibilityLabel="Loading">
              {[0, 1, 2, 3].map((i) => (
                <View key={i} style={{ height: 72, borderRadius: 18, backgroundColor: C.s1 }} />
              ))}
            </View>
          )
        }
        initialNumToRender={12}
      />
    </View>
  );
}

function Row({ l }: { l: CallLine }) {
  const p = P(l.who);
  const video = l.kind === 'video';
  const what = l.missed ? 'Missed' : l.out ? (l.status === 'declined' ? 'Declined' : l.status === 'busy' ? 'Busy' : l.secs ? 'Outgoing' : 'No answer') : l.status === 'declined' ? 'You declined' : 'Incoming';
  const day = dayLabel(l.at);
  const when = day === 'Today' ? ago(l.at) : day;
  return (
    <View style={[S.row, { gap: 12, padding: 12, marginBottom: 8, borderRadius: 18, backgroundColor: C.s1, borderWidth: 1, borderColor: l.missed ? 'rgba(255,107,107,.25)' : C.line }]}>
      <Pressable accessibilityRole="button" accessibilityLabel={`Message ${p.name}`} hitSlop={6} onPress={() => openChat(l.who)}>
        <Avatar pic={p.photo} square={!!p.biz} size={46} />
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel={`${p.name}, ${what} ${video ? 'video' : 'voice'} call${l.n > 1 ? `, ${l.n} times` : ''}. Open chat`} onPress={() => openChat(l.who)} style={{ flex: 1, minWidth: 0 }}>
        <View style={[S.row, { gap: 4 }]}>
          <Txt s={15} w={8} c={l.missed ? C.errSoft : C.text} lines={1} style={{ flexShrink: 1 }}>
            {p.name}
          </Txt>
          {p.verified ? <Verified size={13} /> : null}
          {l.n > 1 ? (
            <Txt s={13} w={7} c={l.missed ? C.errSoft : C.muted}>
              ({l.n})
            </Txt>
          ) : null}
        </View>
        <View style={[S.row, { gap: 5, marginTop: 2 }]}>
          <Icon name={l.missed ? 'missed' : video ? 'video' : 'phone'} size={13} color={l.missed ? C.err : l.secs ? C.mint : C.muted} />
          <Txt s={12} c={C.muted} lines={1} style={{ flexShrink: 1 }}>
            {what} {video ? 'video' : 'voice'} call{l.secs ? ` · ${len(l.secs)}` : ''} · {when}
          </Txt>
        </View>
      </Pressable>
      {callsAvailable() ? (
        <Pressable accessibilityRole="button" accessibilityLabel={`Call ${p.name} back`} hitSlop={6} onPress={() => startCall(l.who, l.kind)} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: C.s2, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name={video ? 'video' : 'phone'} size={20} color={C.mint} />
        </Pressable>
      ) : null}
    </View>
  );
}
