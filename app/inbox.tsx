import React, { useState } from 'react';
import { FlatList, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { db, ui } from '../src/data/db';
import { Avatar, Empty, IconBtn, OptRow, PTabs, Txt, Verified, CoTag, tap } from '../src/ui/kit';
import { Icon } from '../src/ui/Icon';
import { sheet, SheetTitle, toast } from '../src/ui/overlay';
import { C, S } from '../src/ui/theme';
import { ORDER, P, THREADS, fname } from '../src/logic/core';
import { bump, useLive } from '../src/logic/live';
import { deleteChat, preview } from '../src/logic/work';
import { openChat, openCompose } from '../src/sheets/chat';
import { SearchBar } from '../src/components/common';
import { goBack } from '../src/ui/kit';

const TABS: Record<string, (id: string) => boolean> = {
  All: () => true,
  Unread: (id) => (THREADS()[id]?.unread || 0) > 0,
  Groups: (id) => !!P(id)?.group,
  Jobs: (id) => !!THREADS()[id]?.job,
};

export default function Inbox() {
  useLive();
  const ins = useSafeAreaInsets();
  const [q, setQ] = useState('');
  const T = THREADS();
  const O = ORDER().filter((id) => T[id] && P(id)?.name);
  const tab = ui.ibTab in TABS ? ui.ibTab : 'All';
  const qq = q.trim().toLowerCase();
  const ids = O.filter(TABS[tab])
    .filter((id) => !qq || P(id).name.toLowerCase().includes(qq) || T[id].msgs.some((m) => (m.t || '').toLowerCase().includes(qq)))
    .sort((a, b) => (T[b].pinned || 0) - (T[a].pinned || 0));
  const online = O.filter((id) => T[id].on);
  const unread = O.reduce((a, id) => a + (T[id].unread || 0), 0);
  const menu = (id: string) => {
    tap();
    const th = T[id];
    sheet.show(() => (
      <View>
        <SheetTitle>{P(id).name}</SheetTitle>
        <OptRow
          icon="pushpin"
          bg={C.lav}
          title={th.pinned ? 'Unpin' : 'Pin to top'}
          onPress={() => {
            th.pinned = th.pinned ? 0 : 1;
            sheet.close(th.pinned ? 'Chat pinned' : 'Chat unpinned');
          }}
        />
        <OptRow
          icon="check"
          bg="#fff"
          title={th.unread ? 'Mark as read' : 'Mark as unread'}
          onPress={() => {
            th.unread = th.unread ? 0 : 1;
            sheet.close();
          }}
        />
        <OptRow icon="trash" bg={C.errSoft} danger title="Delete chat" onPress={() => (sheet.close(), deleteChat(id))} />
      </View>
    ));
  };
  return (
    <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: ins.top }}>
      <FlatList
        data={ids}
        keyExtractor={(id) => id}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 + ins.bottom }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        ListHeaderComponent={
          <View>
            <View style={[S.row, { gap: 10, paddingTop: 6 }]}>
              <IconBtn name="back" label="Back" onPress={goBack} />
              <View style={{ flex: 1 }}>
                <Txt s={22} w={8}>
                  Messages
                </Txt>
                <Txt s={12} c={C.muted}>
                  {db.user.name ? `Hello, ${fname(db.user.name)}` : 'Your conversations'}
                  {unread ? ` · ${unread} unread` : ''}
                </Txt>
              </View>
              <IconBtn
                name="check2"
                label="Mark all as read"
                onPress={() => {
                  O.forEach((id) => (T[id].unread = 0));
                  bump();
                  toast('All chats marked as read');
                }}
              />
              <IconBtn name="edit" bg={C.yellow} color="#000" label="New message or group" onPress={openCompose} />
            </View>
            <View style={{ marginTop: 14 }}>
              <SearchBar value={q} onChange={setQ} placeholder="Search names and messages" />
            </View>
            {online.length && !qq ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -20, marginTop: 14 }} contentContainerStyle={{ paddingHorizontal: 20, gap: 14 }}>
                {online.map((id) => (
                  <Pressable key={id} accessibilityLabel={`Chat with ${P(id).name}, online`} onPress={() => openChat(id)} style={{ alignItems: 'center', gap: 4, width: 58 }}>
                    <View>
                      <Avatar pic={P(id).photo} size={54} square={!!P(id).biz} />
                      <View style={{ position: 'absolute', right: 1, bottom: 1, width: 14, height: 14, borderRadius: 7, backgroundColor: C.ok, borderWidth: 2, borderColor: C.bg }} />
                    </View>
                    <Txt s={11} w={6} lines={1}>
                      {fname(P(id).name)}
                    </Txt>
                  </Pressable>
                ))}
              </ScrollView>
            ) : null}
            <PTabs
              style={{ marginTop: 14, marginBottom: 6 }}
              items={Object.keys(TABS).map((t) => [t, t, O.filter(TABS[t]).length] as [string, string, number])}
              value={tab}
              onChange={(t) => {
                ui.ibTab = t;
                bump();
              }}
            />
          </View>
        }
        renderItem={({ item: id }) => {
          const th = T[id];
          const p = P(id);
          const [cls, txt, ic] = preview(th, false);
          return (
            <Pressable onPress={() => openChat(id)} onLongPress={() => menu(id)} delayLongPress={350} accessibilityHint="Long-press for options" style={({ pressed }) => [S.row, { gap: 12, paddingVertical: 10, paddingHorizontal: 6, borderRadius: 16, backgroundColor: pressed ? C.s1 : 'transparent' }]}>
              <View>
                <Avatar pic={p.photo} square={!!p.biz || !!p.group} size={52} />
                {th.on ? <View style={{ position: 'absolute', right: 1, bottom: 1, width: 13, height: 13, borderRadius: 7, backgroundColor: C.ok, borderWidth: 2, borderColor: C.bg }} /> : null}
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <View style={[S.row, { gap: 4 }]}>
                  <Txt s={15} w={8} lines={1} style={{ flexShrink: 1 }}>
                    {p.name}
                  </Txt>
                  {p.verified ? <Verified size={13} /> : null}
                  {p.biz ? <CoTag /> : null}
                  {th.pinned ? <Icon name="pushpin" size={13} color={C.muted} /> : null}
                </View>
                <View style={[S.row, { gap: 4 }]}>
                  {ic ? <Icon name={ic} size={13} color={C.muted} /> : null}
                  <Txt s={13} w={th.unread ? 7 : 5} c={cls === 'typing' ? C.mint : th.unread ? C.text : C.muted} lines={1} style={{ flex: 1 }}>
                    {txt}
                  </Txt>
                </View>
              </View>
              <View style={{ alignItems: 'flex-end', gap: 4 }}>
                <Txt s={11} c={th.unread ? C.yellow : C.faint}>
                  {th.time}
                </Txt>
                {th.unread ? (
                  <View style={{ minWidth: 20, height: 20, borderRadius: 10, paddingHorizontal: 6, backgroundColor: C.yellow, alignItems: 'center', justifyContent: 'center' }}>
                    <Txt s={11} w={8} c="#000">
                      {th.unread}
                    </Txt>
                  </View>
                ) : th.job ? (
                  <View style={{ paddingHorizontal: 6, height: 18, borderRadius: 5, backgroundColor: C.s2, justifyContent: 'center' }}>
                    <Txt s={10} w={8} c={C.lav}>
                      Job
                    </Txt>
                  </View>
                ) : null}
              </View>
            </Pressable>
          );
        }}
        ListEmptyComponent={<Empty style={{ marginTop: 20 }} title="No chats here" text={qq ? 'Try another name.' : 'Unread, group and job chats will show up here.'} />}
        initialNumToRender={12}
      />
    </View>
  );
}
