import React, { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { db, Notif } from '../../src/data/db';
import { useLive } from '../../src/logic/live';
import { NOTIFS, ORDER, P, THREADS } from '../../src/logic/core';
import { preview, readNotif } from '../../src/logic/work';
import { goTo } from '../../src/g/goto';
import { openChat } from '../../src/g/nav';
import { Pull } from '../../src/g/parts';
import { openChatMenu, openTeamNote } from '../../src/g/sheets';
import { tap } from '../../src/g/touch';
import { working } from '../../src/g/data';
import { openSignIn } from '../../src/g/signin';
import { TAB_SPACE } from '../../src/g/TabBar';
import { RED, ft, useG } from '../../src/g/theme';
import { Big, Face, Link, Screen, Seg, T } from '../../src/g/ui';

/** What an update says, in one line. */
function updateText(n: Notif): string {
  const base = (n.text || '').trim();
  if (n.type === 'missed') return n.count && n.count > 1 ? `${n.count} missed calls` : 'Missed call';
  if (base && n.snip) return `${base}: ${n.snip}`;
  return base || n.snip || 'Something new for you';
}

/** Inbox: chats with people, and updates from getit (offers, bookings, reminders). */
export default function Inbox() {
  useLive();
  const t = useG();
  const ins = useSafeAreaInsets();
  const [tab, setTab] = useState<'msgs' | 'updates'>('msgs');
  const signed = db.loggedIn;
  const T0 = signed ? THREADS() : {};
  const chats = signed ? ORDER().filter((id) => T0[id] && P(id)?.name && (T0[id].cid || T0[id].msgs.length)) : [];
  const notes = signed ? NOTIFS() : [];
  const newNotes = notes.filter((n) => !n.read).length;
  const openNote = (n: Notif) => {
    tap();
    readNotif(n.id);
    const who = typeof n.who === 'string' ? n.who : Array.isArray(n.who) ? n.who[0] : '';
    // a missed call: the chat with them, where calling back is one tap
    if (n.type === 'missed' && who) return openChat(who);
    // from the getit team: read it in full
    if (n.bolo || n.go?.k === 'notifs') return openTeamNote('From getit', updateText(n));
    if (n.go) return goTo(n.go);
  };
  const rowStyle = (last: boolean) => ({ pressed }: { pressed: boolean }) => ({ flexDirection: 'row' as const, alignItems: 'center' as const, gap: 12, minHeight: 70, paddingVertical: 10, paddingHorizontal: 2, borderBottomWidth: last ? 0 : 1, borderBottomColor: t.line, opacity: pressed ? 0.6 : 1 });
  const dot = <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: RED }} />;
  const empty = (title: string, sub: string) => (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, paddingBottom: 60 }}>
      <T s={20} w={8} lh={1.25} ls={0} center>
        {title}
      </T>
      <T s={15} lh={1.5} c={t.muted} center style={{ maxWidth: 280 }}>
        {sub}
      </T>
      <Big testID="inbox-empty" h={48} title={working() ? 'See jobs near you' : 'Find a worker'} style={{ marginTop: 12 }} onPress={() => router.navigate('/find' as any)} />
      {!signed ? <Link testID="tab-signin" title="Sign in" onPress={() => openSignIn()} /> : null}
    </View>
  );
  return (
    <Screen top={28} style={{ paddingHorizontal: 20 }}>
      <T s={34} w={8} lh={1.15} ls={-0.8}>
        Inbox
      </T>
      <View style={{ marginTop: 16 }}>
        <Seg
          items={[
            ['msgs', 'Messages'],
            ['updates', newNotes ? `Updates · ${newNotes}` : 'Updates'],
          ]}
          value={tab}
          onChange={setTab}
        />
      </View>
      <ScrollView showsVerticalScrollIndicator={false} refreshControl={signed ? <Pull /> : undefined} contentContainerStyle={{ paddingBottom: TAB_SPACE + ins.bottom, flexGrow: 1 }}>
        {tab === 'msgs' ? (
          chats.length ? (
            <>
              <T s={13} w={7} c={t.muted} style={{ marginTop: 20, marginBottom: 2 }}>
                Messages
              </T>
              {chats.map((id, i) => {
                const th = T0[id];
                const p = P(id);
                const [cls, txt] = preview(th, false);
                return (
                  <Pressable key={id} testID={`chat-${id}`} accessibilityRole="button" accessibilityHint="Long-press for options" onPress={() => (tap(), openChat(id))} onLongPress={() => (tap(), openChatMenu(id))} delayLongPress={350} style={rowStyle(i === chats.length - 1)}>
                    <Face name={p.name} photo={p.photo} size={48} />
                    <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
                        <T s={15} w={8} lines={1} style={{ flexShrink: 1 }}>
                          {p.name}
                        </T>
                        <T s={12} c={t.muted} lines={1}>
                          {th.time}
                        </T>
                      </View>
                      <T s={13} w={th.unread ? 7 : 5} c={cls === 'typing' ? t.accent : th.unread ? t.text : t.muted} lines={1}>
                        {txt}
                      </T>
                    </View>
                    {th.unread ? dot : null}
                  </Pressable>
                );
              })}
            </>
          ) : (
            empty('No messages yet', working() ? 'When a client writes to you, the chat shows here.' : 'When you contact a worker, your chat shows here.')
          )
        ) : notes.length ? (
          <>
            <T s={13} w={7} c={t.muted} style={{ marginTop: 20, marginBottom: 2 }}>
              Updates
            </T>
            {notes.map((n, i) => {
              const who = typeof n.who === 'string' ? P(n.who) : Array.isArray(n.who) && n.who[0] ? P(n.who[0]) : undefined;
              const team = !who || n.bolo;
              return (
                <Pressable key={n.id} testID={`update-${n.id}`} accessibilityRole="button" onPress={() => openNote(n)} style={rowStyle(i === notes.length - 1)}>
                  {team ? (
                    <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: RED, alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={ft(18, 8, '#ffffff')}>g</Text>
                    </View>
                  ) : (
                    <Face name={who!.name} photo={who!.photo} size={48} />
                  )}
                  <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
                      <T s={15} w={8} lines={1} style={{ flexShrink: 1 }}>
                        {team ? 'getit' : who!.name}
                      </T>
                      <T s={12} c={t.muted} lines={1}>
                        {n.time}
                      </T>
                    </View>
                    <T s={13} w={n.read ? 5 : 7} c={n.read ? t.muted : t.text} lines={2}>
                      {updateText(n)}
                    </T>
                  </View>
                  {!n.read ? dot : null}
                </Pressable>
              );
            })}
          </>
        ) : (
          empty('No updates yet', 'Offers, bookings and reminders show here.')
        )}
      </ScrollView>
    </Screen>
  );
}
