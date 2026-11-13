import React, { useEffect, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Linking, Platform, Pressable, ScrollView, TextInput, View } from 'react-native';
import { fmtTs } from '../../src/logic/classes';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { db, Msg } from '../../src/data/db';
import { Avatar, CoTag, Empty, IconBtn, Pict, Txt, Verified, goBack, tap, Missing } from '../../src/ui/kit';
import { Icon } from '../../src/ui/Icon';
import { toast } from '../../src/ui/overlay';
import { C, S, tx } from '../../src/ui/theme';
import { P, THREADS, fname, isGroup, isW, postById } from '../../src/logic/core';
import { hiringIn } from '../../src/logic/work';
import { callsAvailable, startCall } from '../../src/logic/calls';
import { useLive } from '../../src/logic/live';
import { answerOffer, markChatRead, retryText, sendText } from '../../src/logic/work';
import { setViewing } from '../../src/logic/push';
import { openProfile } from '../../src/logic/nav';
import { groupOf } from '../../src/logic/career';
import { openAttach, openChatMenu, openMsgMenu, openQuote, openRules } from '../../src/sheets/chat';
import { openMedia, openJob } from '../../src/sheets/work';

type Row = { m: Msg; i: number; grp: boolean };

export default function Chat() {
  useLive();
  const { id } = useLocalSearchParams<{ id: string }>();
  const ins = useSafeAreaInsets();
  const [text, setText] = useState('');
  const th = THREADS()[id];
  const p = P(id);
  useEffect(() => {
    markChatRead(id);
  });
  useEffect(() => {
    setViewing(th?.cid);
    return () => setViewing(undefined);
  }, [th?.cid]);
  useEffect(() => {
    if (th && isGroup(id) && !th.rulesOk && (groupOf(id)?.rules || []).length) setTimeout(() => openRules(id), 350);
  }, [id]);
  if (!th || !p?.name)
    return <Missing bar="Chat" title="Chat not found" text="It may have been deleted." />;
  const grp = isGroup(id);
  const msgs = th.msgs;
  const rows: Row[] = msgs.map((m, i) => ({ m, i, grp: !m.d && !m.sys && !!msgs[i + 1] && msgs[i + 1].f === m.f && !msgs[i + 1].sys && !msgs[i + 1].d })).reverse();
  const hiring = hiringIn(id);
  const quick = grp ? ['Hello everyone 👋', 'Thanks! 🙏', 'See you at the session'] : hiring ? ['When can you come?', 'What’s your price?', 'Send me a quote', 'Thanks! 🙏'] : ['I can come tomorrow', 'On my way 🛵', 'Thanks! 🙏'];
  const send = () => {
    const t = text.trim();
    if (!t) return;
    setText('');
    // if it couldn't even be queued (no connection before the chat existed), give the words back
    void sendText(id, t).then((ok) => !ok && setText((cur) => cur || t));
  };
  const job = th.job;
  const viewJob = () => {
    const po = db.POSTS.find((x) => x.mine && (x.offerList || []).some((o) => o.by === id)) || db.POSTS.find((x) => x.client === id && db.myOffers[x.id]);
    const b = db.BOOKINGS.find((x) => (x.worker === id || x.client === id) && x.state !== 'confirmed');
    if (b) router.push(`/track/${b.id}` as any);
    else if (po) openJob(po.id);
    else toast(job || 'No active job');
  };
  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: C.bg }} behavior="padding" keyboardVerticalOffset={0}>
      <View style={[S.row, { gap: 10, paddingTop: ins.top + 6, paddingHorizontal: 12, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: C.line, backgroundColor: C.bg }]}>
        <IconBtn name="back" label="Back" onPress={goBack} />
        <Pressable accessibilityRole="button" accessibilityLabel={grp ? 'Group info' : `${p.name}’s profile`} onPress={() => (grp ? router.push(`/group/${id}` as any) : openProfile(id))} style={[S.row, { gap: 10, flex: 1, minWidth: 0 }]}>
          <Avatar pic={p.photo} square={!!p.biz || grp} size={42} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <View style={[S.row, { gap: 4 }]}>
              <Txt s={15} w={8} lines={1} style={{ flexShrink: 1 }}>
                {p.name}
              </Txt>
              {p.verified ? <Verified size={13} /> : null}
              {p.biz ? <CoTag /> : null}
            </View>
            <Txt s={12} c={C.muted} lines={1}>
              {grp ? `${(th.members || []).length + 1} members` : p.biz ? 'Business' : p.role}
            </Txt>
          </View>
        </Pressable>
        {!grp && callsAvailable() ? (
          <>
            <IconBtn name="phone" label="Voice call" onPress={() => startCall(id, 'voice')} />
            <IconBtn name="video" label="Video call" onPress={() => startCall(id, 'video')} />
          </>
        ) : null}
        <IconBtn name="dots" label="Chat options" onPress={() => openChatMenu(id)} />
      </View>
      {job ? (
        <Pressable onPress={viewJob} style={[S.row, { gap: 8, marginHorizontal: 12, marginTop: 8, padding: 10, borderRadius: 14, backgroundColor: C.s1, borderWidth: 1, borderColor: C.line }]}>
          <Icon name="job" size={16} color={C.yellow} />
          <Txt s={12} c={C.muted} lines={1} style={{ flex: 1 }}>
            Active job ·{' '}
            <Txt s={12} w={8}>
              {job}
            </Txt>
          </Txt>
          <Txt s={12} w={8} c={C.lav}>
            View
          </Txt>
        </Pressable>
      ) : null}
      <FlatList
        inverted
        data={rows}
        keyExtractor={(r) => String(r.i)}
        contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 12 }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        ListEmptyComponent={
          <View style={{ alignItems: 'center', gap: 8, paddingVertical: 30, transform: [{ scaleY: -1 }] }}>
            <Avatar pic={p.photo} size={64} square={!!p.biz || grp} />
            <Txt s={14} c={C.muted} center>
              Say hi to {fname(p.name)}. Ask about prices or availability.
            </Txt>
          </View>
        }
        renderItem={({ item }) => <Bubble id={id} r={item} hiring={hiring} />}
        initialNumToRender={20}
      />
      <ScrollView horizontal keyboardShouldPersistTaps="always" showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={{ paddingHorizontal: 12, gap: 8, paddingBottom: 8 }}>
        {!grp && !hiring ? (
          <Pressable onPress={() => openQuote(id)} style={[S.row, { gap: 4, height: 34, paddingHorizontal: 12, borderRadius: 999, backgroundColor: C.yellow }]}>
            <Icon name="money" size={14} color="#000" />
            <Txt s={12} w={8} c="#000">
              Send a quote
            </Txt>
          </Pressable>
        ) : null}
        {quick.map((q) => (
          <Pressable key={q} onPress={() => (tap(), sendText(id, q))} style={{ height: 34, paddingHorizontal: 12, borderRadius: 999, backgroundColor: C.s1, borderWidth: 1, borderColor: C.line, justifyContent: 'center' }}>
            <Txt s={12} w={7}>
              {q}
            </Txt>
          </Pressable>
        ))}
      </ScrollView>
      <View style={[S.row, { gap: 8, paddingHorizontal: 12, paddingTop: 6, paddingBottom: ins.bottom + 8, borderTopWidth: 1, borderTopColor: C.line }]}>
        <>
            <Pressable accessibilityLabel="Attach" onPress={() => openAttach(id)} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: C.s2, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="plus" size={22} color={C.text} />
            </Pressable>
            <TextInput
              value={text}
              onChangeText={setText}
              placeholder="Message"
              placeholderTextColor={C.faint}
              multiline
              style={[tx(15, 5, C.text), { flex: 1, minHeight: 46, maxHeight: 120, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12, borderRadius: 23, backgroundColor: C.s1 }]}
              accessibilityLabel="Message"
              testID="chat-input"
            />
            {text.trim() ? (
              <Pressable accessibilityLabel="Send" onPress={send} style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: C.yellow, alignItems: 'center', justifyContent: 'center' }} testID="chat-send">
                <Icon name="send" size={20} color="#000" />
              </Pressable>
            ) : null}
        </>
      </View>
    </KeyboardAvoidingView>
  );
}

function Bubble({ id, r, hiring }: { id: string; r: Row; hiring: boolean }) {
  const { m, i, grp } = r;
  const [playing, setPlaying] = useState(false);
  if (m.d)
    return (
      <Txt s={11} w={7} c={C.faint} center style={{ marginVertical: 10 }}>
        {m.d}
      </Txt>
    );
  if (m.sys)
    return (
      <View style={[S.row, { gap: 6, alignSelf: 'center', marginVertical: 8, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, backgroundColor: m.missed ? 'rgba(255,107,107,.14)' : C.s1 }]}>
        <Icon name={m.call ? (m.missed ? 'missed' : 'phone') : 'check'} size={13} color={m.missed ? C.err : C.mint} />
        <Txt s={12} c={m.missed ? C.errSoft : C.muted}>
          {m.sys}
        </Txt>
      </View>
    );
  const me = m.f === 'me';
  const p = P(id);
  let body: React.ReactNode;
  if (m.k === 'offer')
    body = (
      <View style={{ width: 260, borderRadius: 18, overflow: 'hidden', backgroundColor: C.s1, borderWidth: 1, borderColor: C.line }}>
        <View style={[S.row, { gap: 6, padding: 10, backgroundColor: C.lav }]}>
          <Icon name="job" size={14} color="#000" />
          <Txt s={12} w={8} c="#000">
            {me ? (m.wk === 'them' ? 'Your price offer' : 'Your quote') : (m.wk === 'me' ? 'Price offer from ' : 'Quote from ') + fname(p.name)}
          </Txt>
        </View>
        <View style={{ padding: 12, gap: 6 }}>
          <Txt s={15} w={8}>
            {m.job}
          </Txt>
          <Txt s={20} w={8} c={C.yellow}>
            {m.price}
          </Txt>
          <View style={[S.row, { gap: 12 }]}>
            <View style={[S.row, { gap: 4 }]}>
              <Icon name="clock" size={13} color={C.muted} />
              <Txt s={12} c={C.muted}>
                {m.when}
              </Txt>
            </View>
            {m.dur ? (
              <View style={[S.row, { gap: 4 }]}>
                <Icon name="wrench" size={13} color={C.muted} />
                <Txt s={12} c={C.muted}>
                  {m.dur}
                </Txt>
              </View>
            ) : null}
          </View>
          {m.state ? (
            <View style={[S.row, { gap: 6, marginTop: 4 }]}>
              <Icon name={m.state === 'acc' ? 'check' : 'x'} size={14} color={m.state === 'acc' ? C.mint : C.errSoft} />
              <Txt s={12} w={7} c={m.state === 'acc' ? C.mint : C.errSoft}>
                {m.state === 'acc' ? 'Accepted, job booked' : 'Declined'}
              </Txt>
            </View>
          ) : !me ? (
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 6 }}>
              <Pressable onPress={() => answerOffer(id, i, 'acc')} style={{ flex: 1, height: 38, borderRadius: 12, backgroundColor: C.yellow, alignItems: 'center', justifyContent: 'center' }}>
                <Txt s={13} w={8} c="#000">
                  {m.wk === 'me' ? 'Accept offer' : 'Accept quote'}
                </Txt>
              </Pressable>
              <Pressable onPress={() => answerOffer(id, i, 'dec')} style={{ flex: 1, height: 38, borderRadius: 12, backgroundColor: C.s2, alignItems: 'center', justifyContent: 'center' }}>
                <Txt s={13} w={7}>
                  Decline
                </Txt>
              </Pressable>
            </View>
          ) : (
            <Txt s={12} c={C.muted}>
              Waiting for {fname(p.name)} to answer
            </Txt>
          )}
        </View>
      </View>
    );
  else if (m.k === 'ts')
    body = (
      <View style={{ maxWidth: 280, padding: 10, borderRadius: 18, backgroundColor: me ? C.blue : C.s1, gap: 6 }}>
        <Pressable
          testID="ts-chip"
          accessibilityRole="link"
          accessibilityLabel={`Play the recording from ${fmtTs(m.ts || 0)}`}
          onPress={() => (tap(), router.push(`/watch/${m.rec}?t=${m.ts || 0}` as any))}
          style={[S.row, { gap: 6, alignSelf: 'flex-start', paddingHorizontal: 10, height: 30, borderRadius: 15, backgroundColor: me ? 'rgba(255,255,255,.2)' : 'rgba(246,238,92,.16)' }]}
        >
          <Icon name="playfill" size={12} color={me ? '#fff' : C.yellow} />
          <Txt s={13} w={8} c={me ? '#fff' : C.yellow}>
            {fmtTs(m.ts || 0)}
          </Txt>
          <Txt s={11} c={me ? 'rgba(255,255,255,.8)' : C.muted} lines={1} style={{ maxWidth: 150 }}>
            {m.name}
          </Txt>
        </Pressable>
        <Txt s={14}>
          <Txt s={14} w={8}>
            {fmtTs(m.ts || 0)}
          </Txt>{' '}
          — {m.t}
        </Txt>
      </View>
    );
  else if (m.k === 'file')
    body = (
      <View style={[S.row, { gap: 10, maxWidth: 260, padding: 10, borderRadius: 18, backgroundColor: me ? C.blue : C.s1 }]}>
        <View style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: 'rgba(255,255,255,.15)', alignItems: 'center', justifyContent: 'center' }}>
          <Txt s={10} w={8}>
            {(m.name?.split('.').pop() || 'FILE').toUpperCase().slice(0, 4)}
          </Txt>
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Txt s={13} w={7} lines={1}>
            {m.name}
          </Txt>
          <Txt s={11} c="rgba(255,255,255,.7)">
            {m.size}
          </Txt>
        </View>
        <Pressable accessibilityLabel={`Open ${m.name}`} onPress={() => (m.src ? Linking.openURL(m.src).catch(() => toast('Couldn’t open the file')) : toast('The file is still uploading'))} hitSlop={8}>
          <Icon name="download" size={18} color="#fff" />
        </Pressable>
      </View>
    );
  else if (m.k === 'voice')
    body = (
      <Pressable
        accessibilityLabel={playing ? 'Playing voice message' : 'Play voice message'}
        onPress={() => {
          setPlaying(true);
          const [mm, ss] = (m.dur || '0:03').split(':').map(Number);
          setTimeout(() => setPlaying(false), Math.min(8000, (mm * 60 + ss) * 1000));
        }}
        style={[S.row, { gap: 8, width: 220, padding: 10, borderRadius: 18, backgroundColor: me ? C.blue : C.s1 }]}
      >
        <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: me ? '#fff' : C.yellow, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name={playing ? 'pause' : 'playfill'} size={14} color="#000" />
        </View>
        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 2, height: 24 }}>
          {Array.from({ length: 22 }, (_, j) => (
            <View key={j} style={{ flex: 1, height: `${20 + Math.round(Math.abs(Math.sin(j * 1.7 + i)) * 80)}%`, borderRadius: 1, backgroundColor: playing ? (me ? '#fff' : C.yellow) : me ? 'rgba(255,255,255,.6)' : C.muted }} />
          ))}
        </View>
        <Txt s={11} c={me ? '#fff' : C.muted}>
          {m.dur}
        </Txt>
      </Pressable>
    );
  else if (m.k === 'img')
    body = (
      <Pressable onPress={() => openMedia(m.src!)} accessibilityLabel="Open photo">
        <Pict pic={m.src!} style={{ width: 220, height: 220, borderRadius: 18 }} />
      </Pressable>
    );
  else if (m.k === 'loc')
    body = (
      <Pressable accessibilityLabel="Open location in maps" onPress={() => (m.lat != null ? Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${m.lat},${m.lng}`).catch(() => {}) : toast('No exact position was shared'))} style={{ width: 240, height: 150, borderRadius: 18, overflow: 'hidden' }}>
        <Pict pic="img/map-bg" style={{ width: 240, height: 150, opacity: 0.8 }} />
        <View style={{ position: 'absolute', left: 103, top: 50, width: 34, height: 34, borderRadius: 17, backgroundColor: C.yellow, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: '#000' }}>
          <Icon name="pin" size={16} color="#000" />
        </View>
        <Txt s={12} w={8} style={{ position: 'absolute', left: 12, bottom: 10 }}>
          {m.t}
        </Txt>
      </Pressable>
    );
  else
    body = (
      <View style={{ maxWidth: '82%', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20, borderBottomRightRadius: me && !grp ? 6 : 20, borderBottomLeftRadius: !me && !grp ? 6 : 20, backgroundColor: me ? C.blue : C.s1 }}>
        {m.fw ? (
          <Txt s={11} c={me ? 'rgba(255,255,255,.7)' : C.muted} style={{ marginBottom: 2 }}>
            ↪ Forwarded
          </Txt>
        ) : null}
        {!me && m.name && isGroup(id) ? (
          <Txt s={11} w={8} c={C.lav}>
            {m.name}
          </Txt>
        ) : null}
        <Txt s={15} c="#fff" selectable>
          {m.t}
        </Txt>
      </View>
    );
  return (
    <Pressable onPress={m.st === 'failed' && m.id ? () => (tap(), retryText(id, m.id!)) : undefined} onLongPress={() => (tap(), openMsgMenu(id, i))} delayLongPress={300} style={{ alignItems: me ? 'flex-end' : 'flex-start', marginTop: grp ? 2 : 8, opacity: m.st === 'sending' ? 0.7 : 1 }}>
      {body}
      {m.st === 'failed' ? (
        <View style={[S.row, { gap: 4, marginTop: 3, paddingHorizontal: 4 }]}>
          <Icon name="warn" size={12} color={C.err} />
          <Txt s={11} w={7} c={C.err}>
            Not sent · Tap to retry
          </Txt>
        </View>
      ) : !grp ? (
        <View style={[S.row, { gap: 3, marginTop: 3, paddingHorizontal: 4 }]}>
          <Txt s={10} c={C.faint}>
            {m.at || ''}
          </Txt>
          {me ? <Icon name={m.st === 'sending' ? 'clock' : m.st === 'read' ? 'check2' : 'check'} size={12} color={m.st === 'read' ? C.lav : C.faint} /> : null}
        </View>
      ) : null}
    </Pressable>
  );
}
export { isW, postById, Platform };
