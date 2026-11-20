/* A conversation, in the getit design: the person and a call button on top, the job you share with them,
   the messages, quick replies and the message box. Everything a message can be (a quote, a photo, a file,
   a voice note, a place) keeps working as before. */
import React, { useEffect, useState } from 'react';
import { FlatList, Linking, Pressable, ScrollView, TextInput, View } from 'react-native';
import { KeyAvoid, useKeyboardOpen } from '../../src/ui/keyboard';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { db, Msg } from '../../src/data/db';
import { Missing, Pict, goBack, tap } from '../../src/ui/kit';
import { toast } from '../../src/ui/overlay';
import { P, THREADS, fname, isGroup } from '../../src/logic/core';
import { answerOffer, hiringIn, markChatRead, retryText, sendText } from '../../src/logic/work';
import { callsAvailable, startCall } from '../../src/logic/calls';
import { useLive } from '../../src/logic/live';
import { setViewing } from '../../src/logic/push';
import { iAmTyping, leftChat, loadSeen, seenLabel, stoppedTyping, typingIn } from '../../src/logic/presence';
import { membersOf } from '../../src/logic/server';
import { openProfile } from '../../src/logic/nav';
import { groupOf } from '../../src/logic/career';
import { openAttach, openChatMenu, openMsgMenu, openQuote, openRules } from '../../src/sheets/chat';
import { openMedia, openJob } from '../../src/sheets/work';
import { GIcon } from '../../src/g/icons';
import { Face, Round, T } from '../../src/g/ui';
import { GOOD, RED, Theme, ft, useG } from '../../src/g/theme';

type Row = { m: Msg; i: number; grp: boolean; seen?: string };
const ON_RED = 'rgba(255, 255, 255, 0.85)';

export default function Chat() {
  useLive();
  const t = useG();
  const { id } = useLocalSearchParams<{ id: string }>();
  const ins = useSafeAreaInsets();
  const [text, setText] = useState('');
  const kbOpen = useKeyboardOpen();
  const th = THREADS()[id];
  const p = P(id);
  useEffect(() => {
    markChatRead(id);
  });
  useEffect(() => {
    setViewing(th?.cid);
    // who is online, now and while the chat stays open
    const other = th?.cid ? membersOf(th.cid).filter((m: any) => m.user_id !== db.uid).map((m: any) => m.user_id) : [];
    if (other.length === 1) void loadSeen(other);
    const tm = other.length === 1 ? setInterval(() => void loadSeen(other), 30000) : null;
    return () => {
      setViewing(undefined);
      leftChat(th?.cid);
      if (tm) clearInterval(tm);
    };
  }, [th?.cid]);
  useEffect(() => {
    if (th && isGroup(id) && !th.rulesOk && (groupOf(id)?.rules || []).length) setTimeout(() => openRules(id), 350);
  }, [id]);
  if (!th || !p?.name) return <Missing bar="Chat" title="Chat not found" text="It may have been deleted." />;
  const grp = isGroup(id);
  const msgs = th.msgs;
  const rows: Row[] = msgs.map((m, i) => ({ m, i, grp: !m.d && !m.sys && !!msgs[i + 1] && msgs[i + 1].f === m.f && !msgs[i + 1].sys && !msgs[i + 1].d })).reverse();
  // "Seen" under my newest message once the other person has opened the chat (with the time, in a chat of two)
  const others = th.cid ? membersOf(th.cid).filter((m: any) => m.user_id !== db.uid) : [];
  const mineLast = rows.find((r) => r.m.f === 'me' && !r.m.sys && !r.m.d);
  if (mineLast && mineLast.m.st === 'read') {
    const at = others.length === 1 ? new Date(others[0].last_read_at) : null;
    const today = at && new Date().toDateString() === at.toDateString();
    // in a group: how many of the others have opened the chat since
    const n = others.filter((o: any) => +new Date(o.last_read_at) >= (mineLast.m.ts0 || 0)).length;
    mineLast.seen = others.length > 1 ? (n >= others.length ? 'Seen by everyone' : `Seen by ${n}`) : at && today ? `Seen ${String(at.getHours()).padStart(2, '0')}:${String(at.getMinutes()).padStart(2, '0')}` : 'Seen';
  }
  const typers = typingIn(th.cid);
  const typer = typers.length;
  const status = grp ? '' : seenLabel(others[0]?.user_id);
  const online = status === 'online';
  const onType = (v: string) => {
    setText(v);
    iAmTyping(th.cid, v);
  };
  const hiring = hiringIn(id);
  const quick = grp ? ['Hello everyone', 'Thanks!', 'See you at the session'] : hiring ? ['When can you come?', 'What’s your price?', 'Send me a quote', 'Thanks!'] : ['I can come tomorrow', 'On my way', 'Thanks!'];
  const send = () => {
    const v = text.trim();
    if (!v) return;
    setText('');
    stoppedTyping(th.cid);
    // if it couldn't even be queued (no connection before the chat existed), give the words back
    void sendText(id, v).then((ok) => !ok && setText((cur) => cur || v));
  };
  const job = th.job;
  const viewJob = () => {
    const po = db.POSTS.find((x) => x.mine && (x.offerList || []).some((o) => o.by === id)) || db.POSTS.find((x) => x.client === id && db.myOffers[x.id]);
    const b = db.BOOKINGS.find((x) => (x.worker === id || x.client === id) && x.state !== 'confirmed');
    if (b) router.push(`/track/${b.id}` as any);
    else if (po) openJob(po.id);
    else toast(job || 'No active job');
  };
  const line = typer ? (!grp ? 'typing…' : typer > 1 ? `${typer} people are typing…` : `${fname(P(typers[0])?.name || 'Someone')} is typing…`) : grp ? `${(th.members || []).length + 1} members` : online ? 'Online now' : status ? status[0].toUpperCase() + status.slice(1) : p.biz ? 'Business' : p.role || '';
  return (
    <KeyAvoid style={{ flex: 1, backgroundColor: t.bg }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: ins.top + 12, paddingBottom: 12, paddingLeft: 8, paddingRight: 12, borderBottomWidth: 1, borderBottomColor: t.line }}>
        <Round icon="back" label="Back" onPress={goBack} plain bg="transparent" testID="chat-back" />
        <Pressable accessibilityRole="button" accessibilityLabel={grp ? 'Group info' : `${p.name}’s profile`} onPress={() => (grp ? router.push(`/group/${id}` as any) : openProfile(id))} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
          <Face name={p.name} photo={p.photo} size={40} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <T s={16} w={8} lines={1} style={{ flexShrink: 1 }}>
                {p.name}
              </T>
              {p.verified ? <GIcon name="tick" size={15} /> : null}
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 1 }}>
              {online || typer ? <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#2fb36d' }} /> : null}
              <T testID="chat-status" s={12} c={t.muted} lines={1} style={{ flexShrink: 1 }}>
                {line}
              </T>
            </View>
          </View>
        </Pressable>
        {!grp && callsAvailable() ? <Round icon="phone" label={`Call ${fname(p.name)}`} onPress={() => startCall(id, 'voice')} testID="chat-call" /> : null}
        <Round icon="dots" label="Chat options" onPress={() => openChatMenu(id)} plain bg="transparent" testID="chat-menu" />
      </View>
      {job ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginHorizontal: 16, marginTop: 12, paddingVertical: 12, paddingHorizontal: 14, borderRadius: 18, backgroundColor: t.card, borderWidth: 1, borderColor: t.line }}>
          <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: t.tabOn, alignItems: 'center', justifyContent: 'center' }}>
            <GIcon name="jobs" size={18} color={t.accent} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <T s={14} w={8} lines={1}>
              {job}
            </T>
            <T s={12} c={t.muted} lines={1}>
              {hiring ? `With ${fname(p.name)}` : `For ${fname(p.name)}`}
            </T>
          </View>
          <Pressable testID="chat-job" accessibilityRole="button" accessibilityLabel="View the job" onPress={() => (tap(), viewJob())} style={({ pressed }) => ({ height: 40, paddingHorizontal: 14, borderRadius: 20, backgroundColor: RED, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.9 : 1 })}>
            <T s={13} w={8} c="#ffffff">
              View
            </T>
          </Pressable>
        </View>
      ) : null}
      <FlatList
        inverted
        data={rows}
        keyExtractor={(r) => String(r.i)}
        contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 12 }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        ListHeaderComponent={
          typer ? (
            <View testID="chat-typing" accessibilityLabel="Typing" style={{ alignSelf: 'flex-start', flexDirection: 'row', gap: 5, marginTop: 8, paddingHorizontal: 14, paddingVertical: 13, borderRadius: 20, borderBottomLeftRadius: 6, backgroundColor: t.card2 }}>
              {[0, 1, 2].map((d) => (
                <View key={d} style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: t.muted, opacity: 0.45 + d * 0.25 }} />
              ))}
            </View>
          ) : null
        }
        ListEmptyComponent={
          <View style={{ alignItems: 'center', gap: 10, paddingVertical: 30, transform: [{ scaleY: -1 }] }}>
            <Face name={p.name} photo={p.photo} size={72} />
            <T s={15} c={t.muted} center style={{ maxWidth: 260 }}>
              Say hello to {fname(p.name)}. Ask about the price, or when they can come.
            </T>
          </View>
        }
        renderItem={({ item }) => <Bubble id={id} r={item} t={t} />}
        initialNumToRender={20}
      />
      {/* quick replies, then the message box */}
      <ScrollView horizontal keyboardShouldPersistTaps="always" showsHorizontalScrollIndicator={false} style={{ flexGrow: 0, flexShrink: 0 }} contentContainerStyle={{ paddingHorizontal: 16, gap: 8, paddingBottom: 8, alignItems: 'center' }}>
        {!grp && !hiring ? (
          <Pressable testID="chat-quote" accessibilityRole="button" onPress={() => (tap(), openQuote(id))} style={{ height: 36, paddingHorizontal: 14, borderRadius: 18, backgroundColor: RED, justifyContent: 'center' }}>
            <T s={13} w={8} c="#ffffff">
              Send a quote
            </T>
          </Pressable>
        ) : null}
        {quick.map((q) => (
          <Pressable key={q} accessibilityRole="button" onPress={() => (tap(), sendText(id, q))} style={{ height: 36, paddingHorizontal: 14, borderRadius: 18, backgroundColor: t.card, borderWidth: 1, borderColor: t.line, justifyContent: 'center' }}>
            <T s={13} w={7}>
              {q}
            </T>
          </Pressable>
        ))}
      </ScrollView>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8, paddingHorizontal: 12, paddingTop: 4, paddingBottom: (kbOpen ? 0 : ins.bottom) + 12 }}>
        <Pressable testID="chat-attach" accessibilityRole="button" accessibilityLabel="Add a photo, a file or a place" onPress={() => (tap(), openAttach(id))} style={{ width: 48, height: 48, borderRadius: 24, borderWidth: 1, borderColor: t.line, backgroundColor: t.card, alignItems: 'center', justifyContent: 'center' }}>
          <GIcon name="plus" size={22} color={t.text} />
        </Pressable>
        <TextInput
          value={text}
          onChangeText={onType}
          placeholder="Message"
          placeholderTextColor={t.muted}
          selectionColor={RED}
          multiline
          maxFontSizeMultiplier={1.3}
          style={[ft(15, 5, t.text), { flex: 1, minHeight: 48, maxHeight: 120, paddingHorizontal: 18, paddingTop: 13, paddingBottom: 13, borderRadius: 24, borderWidth: 1, borderColor: t.line, backgroundColor: t.card2 }]}
          accessibilityLabel="Message"
          testID="chat-input"
        />
        <Pressable testID="chat-send" accessibilityRole="button" accessibilityLabel="Send" accessibilityState={{ disabled: !text.trim() }} onPress={() => (tap(), send())} style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: RED, alignItems: 'center', justifyContent: 'center', opacity: text.trim() ? 1 : 0.4 }}>
          <GIcon name="send" size={20} color="#ffffff" sw={2.2} />
        </Pressable>
      </View>
    </KeyAvoid>
  );
}

function Bubble({ id, r, t }: { id: string; r: Row; t: Theme }) {
  const { m, i, grp } = r;
  const [playing, setPlaying] = useState(false);
  if (m.d)
    return (
      <T s={12} w={7} c={t.muted} center style={{ marginVertical: 10 }}>
        {m.d}
      </T>
    );
  if (m.sys)
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'center', marginVertical: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14, backgroundColor: t.card2 }}>
        {m.call ? <GIcon name="phone" size={13} color={m.missed ? t.accent : t.muted} /> : null}
        <T s={12} w={7} c={m.missed ? t.accent : t.muted} center>
          {m.sys}
        </T>
      </View>
    );
  const me = m.f === 'me';
  const p = P(id);
  const bg = me ? RED : t.card2;
  const fg = me ? '#ffffff' : t.text;
  const soft = me ? ON_RED : t.muted;
  // the time (and, on mine, whether it arrived) sits inside the bubble, bottom right
  const stamp = (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 4, marginTop: 4 }}>
      <T s={11} c={soft}>
        {m.at || ''}
      </T>
      {me ? <GIcon name={m.st === 'sending' ? 'clock' : m.st === 'read' || m.st === 'delivered' ? 'checks' : 'check'} size={13} color={m.st === 'read' ? '#ffffff' : ON_RED} sw={2.2} /> : null}
    </View>
  );
  const corner = { borderRadius: 20, borderBottomRightRadius: me && !grp ? 6 : 20, borderBottomLeftRadius: !me && !grp ? 6 : 20 };
  let body: React.ReactNode;
  let own = false; // has its own look, so the time goes underneath
  if (m.k === 'offer') {
    own = true;
    body = (
      <View style={{ width: 272, borderRadius: 20, overflow: 'hidden', backgroundColor: t.card, borderWidth: 1, borderColor: t.line }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 10, backgroundColor: t.tabOn }}>
          <GIcon name="jobs" size={16} color={t.accent} />
          <T s={12} w={8} c={t.accent}>
            {me ? (m.wk === 'them' ? 'Your price offer' : 'Your quote') : (m.wk === 'me' ? 'Price offer from ' : 'Quote from ') + fname(p.name)}
          </T>
        </View>
        <View style={{ padding: 14, gap: 4 }}>
          <T s={15} w={8}>
            {m.job}
          </T>
          <T s={24} w={8} ls={-0.5}>
            {m.price}
          </T>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
            <GIcon name="clock" size={14} color={t.muted} />
            <T s={13} c={t.muted}>
              {[m.when, m.dur].filter(Boolean).join(' · ')}
            </T>
          </View>
          {m.state ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 }}>
              <GIcon name={m.state === 'acc' ? 'check' : 'x'} size={16} color={m.state === 'acc' ? GOOD : t.muted} sw={2.4} />
              <T s={13} w={7} c={m.state === 'acc' ? GOOD : t.muted}>
                {m.state === 'acc' ? 'Accepted. The job is booked' : 'Declined'}
              </T>
            </View>
          ) : !me ? (
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
              <Pressable testID="offer-accept" accessibilityRole="button" onPress={() => (tap(), answerOffer(id, i, 'acc'))} style={{ flex: 1, height: 44, borderRadius: 22, backgroundColor: RED, alignItems: 'center', justifyContent: 'center' }}>
                <T s={14} w={8} c="#ffffff">
                  Accept
                </T>
              </Pressable>
              <Pressable testID="offer-decline" accessibilityRole="button" onPress={() => (tap(), answerOffer(id, i, 'dec'))} style={{ flex: 1, height: 44, borderRadius: 22, borderWidth: 1, borderColor: t.line, alignItems: 'center', justifyContent: 'center' }}>
                <T s={14} w={7}>
                  Decline
                </T>
              </Pressable>
            </View>
          ) : (
            <T s={13} c={t.muted} style={{ marginTop: 6 }}>
              Waiting for {fname(p.name)} to answer
            </T>
          )}
        </View>
      </View>
    );
  } else if (m.k === 'file')
    body = (
      <Pressable accessibilityRole="button" accessibilityLabel={`Open ${m.name}`} onPress={() => (m.src ? Linking.openURL(m.src).catch(() => toast('Couldn’t open the file')) : toast('The file is still uploading'))} style={[{ width: 260, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: bg }, corner]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: me ? 'rgba(255, 255, 255, 0.2)' : t.card, alignItems: 'center', justifyContent: 'center' }}>
            <T s={10} w={8} c={fg}>
              {(m.name?.split('.').pop() || 'FILE').toUpperCase().slice(0, 4)}
            </T>
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <T s={14} w={7} c={fg} lines={1}>
              {m.name}
            </T>
            <T s={12} c={soft}>
              {m.size}
            </T>
          </View>
          <GIcon name="download" size={20} color={fg} />
        </View>
        {stamp}
      </Pressable>
    );
  else if (m.k === 'voice')
    body = (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={playing ? 'Playing voice message' : 'Play voice message'}
        onPress={() => {
          setPlaying(true);
          const [mm, ss] = (m.dur || '0:03').split(':').map(Number);
          setTimeout(() => setPlaying(false), Math.min(8000, (mm * 60 + ss) * 1000));
        }}
        style={[{ width: 236, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: bg }, corner]}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: me ? '#ffffff' : RED, alignItems: 'center', justifyContent: 'center' }}>
            <GIcon name={playing ? 'pause' : 'play'} size={16} color={me ? RED : '#ffffff'} />
          </View>
          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 2, height: 26 }}>
            {Array.from({ length: 22 }, (_, j) => (
              <View key={j} style={{ flex: 1, height: `${20 + Math.round(Math.abs(Math.sin(j * 1.7 + i)) * 80)}%`, borderRadius: 1, backgroundColor: me ? (playing ? '#ffffff' : 'rgba(255, 255, 255, 0.6)') : playing ? RED : t.muted }} />
            ))}
          </View>
          <T s={12} c={soft}>
            {m.dur}
          </T>
        </View>
        {stamp}
      </Pressable>
    );
  else if (m.k === 'img') {
    own = true;
    body = (
      <Pressable onPress={() => openMedia(m.src!)} accessibilityRole="imagebutton" accessibilityLabel="Open photo">
        <Pict pic={m.src!} style={{ width: 228, height: 228, borderRadius: 20, backgroundColor: t.card2 }} />
      </Pressable>
    );
  } else if (m.k === 'loc')
    body = (
      <Pressable accessibilityRole="button" accessibilityLabel="Open this place in maps" onPress={() => (m.lat != null ? Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${m.lat},${m.lng}`).catch(() => {}) : toast('No exact position was shared'))} style={[{ width: 248, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: bg }, corner]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: me ? 'rgba(255, 255, 255, 0.2)' : t.card, alignItems: 'center', justifyContent: 'center' }}>
            <GIcon name="pin" size={20} color={fg} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <T s={14} w={7} c={fg} lines={2}>
              {m.t || 'My position'}
            </T>
            <T s={12} c={soft}>
              Open in maps
            </T>
          </View>
        </View>
        {stamp}
      </Pressable>
    );
  else
    body = (
      <View style={[{ maxWidth: '78%', paddingHorizontal: 14, paddingVertical: 10, backgroundColor: bg }, corner]}>
        {m.fw ? (
          <T s={11} c={soft} style={{ marginBottom: 2 }}>
            Forwarded
          </T>
        ) : null}
        {!me && m.name && isGroup(id) ? (
          <T s={12} w={8} c={t.accent}>
            {m.name}
          </T>
        ) : null}
        <T s={15} c={fg} style={{ flexShrink: 1 }}>
          {m.t}
        </T>
        {stamp}
      </View>
    );
  return (
    <Pressable onPress={m.st === 'failed' && m.id ? () => (tap(), retryText(id, m.id!)) : undefined} onLongPress={() => (tap(), openMsgMenu(id, i))} delayLongPress={300} style={{ alignItems: me ? 'flex-end' : 'flex-start', marginTop: grp ? 3 : 8, opacity: m.st === 'sending' ? 0.7 : 1 }}>
      {body}
      {own ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3, paddingHorizontal: 4 }}>
          <T s={11} c={t.muted}>
            {m.at || ''}
          </T>
          {me ? <GIcon name={m.st === 'sending' ? 'clock' : m.st === 'read' || m.st === 'delivered' ? 'checks' : 'check'} size={13} color={m.st === 'read' ? GOOD : t.muted} sw={2.2} /> : null}
        </View>
      ) : null}
      {m.st === 'failed' ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4, paddingHorizontal: 4 }}>
          <GIcon name="warn" size={13} color={t.accent} />
          <T s={12} w={7} c={t.accent}>
            Not sent. Tap to try again
          </T>
        </View>
      ) : me && r.seen ? (
        <T testID="msg-seen" s={11} w={7} c={t.muted} style={{ marginTop: 3, paddingHorizontal: 4 }}>
          {r.seen}
        </T>
      ) : null}
    </Pressable>
  );
}
