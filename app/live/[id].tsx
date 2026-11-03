import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, FlatList, KeyboardAvoidingView, PanResponder, Platform, Pressable, ScrollView, TextInput, View, useWindowDimensions } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Line, Path, Text as SvgText } from 'react-native-svg';
import { StatusBar } from 'expo-status-bar';
import { db, Course } from '../../src/data/db';
import { Avatar, Empty, Txt, tap } from '../../src/ui/kit';
import { Icon } from '../../src/ui/Icon';
import { C, S, tx } from '../../src/ui/theme';
import { confirm, sheet, SheetTitle, toast } from '../../src/ui/overlay';
import { P, fname, myPhoto } from '../../src/logic/core';
import { lessonsOf } from '../../src/logic/career';
import { classPeople, fmtTs, saveLiveRecording } from '../../src/logic/classes';
import * as Clipboard from 'expo-clipboard';

type ChatM = { id: number; who: string; t: string; at: string };
type Q = { id: number; who: string; t: string; votes: number; voted?: boolean; done?: boolean };
type Stroke = { d: string; c: string; w: number };
const PENS = ['#111111', '#e11d48', '#3d5af1', '#16a34a', '#f59e0b'];
const LINES = ['Can you explain the second step again?', 'Thanks, this is clear now 🙏', 'Will the slides be in the group?', 'I tried it and it works!', 'Is this on the final project?', 'Good morning from Limbe 👋'];
const nowHM = () => new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

/** Live class (mobile). Teacher = the course is yours: board pen, record, mute all, hands, end class.
    Student: watch, raise hand, chat and ask questions. Audio/video streams connect when the video service is on. */
export default function LiveClass() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const c = db.COURSES.find((x) => x.id === id);
  const ins = useSafeAreaInsets();
  if (!c)
    return (
      <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: ins.top + 60 }}>
        <Empty title="Class not found" />
      </View>
    );
  return <Room c={c} />;
}

function Room({ c }: { c: Course }) {
  const ins = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const host = !!c.mine;
  const people = useMemo(() => classPeople(c), [c.id]);
  const lesson = lessonsOf(c)[Math.min(c.done || 0, lessonsOf(c).length - 1)];
  const t0 = useRef(c.startAt && Date.now() >= c.startAt && Date.now() - c.startAt < 90 * 60_000 ? c.startAt : Date.now()).current;
  const [secs, setSecs] = useState(Math.floor((Date.now() - t0) / 1000));
  const [stage, setStage] = useState<'video' | 'board'>('video');
  const [panel, setPanel] = useState<'chat' | 'people' | 'qa'>('chat');
  const [mic, setMic] = useState(host);
  const [cam, setCam] = useState(host);
  const [hand, setHand] = useState(false);
  const [rec, setRec] = useState(false);
  const recFrom = useRef(0);
  const [share, setShare] = useState(false);
  const [hands, setHands] = useState<string[]>([]);
  const [speaker, setSpeaker] = useState(0);
  const [chat, setChat] = useState<ChatM[]>([{ id: 0, who: host ? 'me' : 'host', t: host ? 'Welcome everyone! We start in a minute.' : `Welcome everyone! Today: ${lesson}.`, at: nowHM() }]);
  const [qs, setQs] = useState<Q[]>(people.length ? [{ id: 1, who: people[0], t: 'Will we get the recording after class?', votes: 3 }] : []);
  const [draft, setDraft] = useState('');
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [pen, setPen] = useState(PENS[2]);
  const nextId = useRef(10);
  const chatRef = useRef<FlatList<ChatM>>(null);
  const pulse = useRef(new Animated.Value(0)).current;
  const teacher = host ? 'me' : 'host';
  const teacherName = host ? 'You' : c.prov.n;

  useEffect(() => {
    const t = setInterval(() => setSecs(Math.floor((Date.now() - t0) / 1000)), 1000);
    const loop = Animated.loop(Animated.timing(pulse, { toValue: 1, duration: 1200, easing: Easing.out(Easing.quad), useNativeDriver: true }));
    loop.start();
    // The class is alive: people chat, someone raises a hand, the speaker changes.
    const chatT = setInterval(() => {
      if (!people.length) return;
      const who = people[Math.floor(Math.random() * people.length)];
      setChat((L) => [...L, { id: nextId.current++, who, t: LINES[L.length % LINES.length], at: nowHM() }]);
    }, 9000);
    const spk = setInterval(() => setSpeaker((x) => x + 1), 4000);
    const handT = setTimeout(() => host && people[1] && setHands((h) => (h.includes(people[1]) ? h : [...h, people[1]])), 12000);
    return () => {
      clearInterval(t);
      clearInterval(chatT);
      clearInterval(spk);
      clearTimeout(handT);
      loop.stop();
    };
  }, []);

  const send = () => {
    const t = draft.trim();
    if (!t) return;
    if (panel === 'qa') setQs((L) => [...L, { id: nextId.current++, who: 'me', t, votes: 0, voted: false }]);
    else setChat((L) => [...L, { id: nextId.current++, who: 'me', t, at: nowHM() }]);
    setDraft('');
  };
  const raise = () => {
    tap();
    const on = !hand;
    setHand(on);
    toast(on ? 'Hand raised. The teacher will see it' : 'Hand lowered');
    if (on)
      setTimeout(() => {
        setHand(false);
        setMic(true);
        toast(`${teacherName} let you speak. Your mic is on`);
      }, 5000);
  };
  const toggleRec = () => {
    tap();
    if (!rec) recFrom.current = secs;
    setRec(!rec);
    toast(!rec ? 'Recording started. Students see a red dot' : 'Recording paused');
  };
  const end = () =>
    confirm({
      title: host ? 'End the class for everyone?' : 'Leave the class?',
      text: host ? (rec ? 'The recording is saved to the course for your students.' : 'Students are sent back to the course page.') : 'You can join again while the class is live.',
      ok: host ? 'End class' : 'Leave',
      danger: true,
      icon: 'video',
      onOk: () => {
        if (host && rec) saveLiveRecording(c, secs - recFrom.current);
        if (host) toast(rec ? 'Class ended · recording saved to Recordings' : 'Class ended');
        router.back();
      },
    });
  const more = () =>
    sheet.show(() => (
      <View style={{ gap: 4 }}>
        <SheetTitle sub={`${people.length + 1} in class · ${fmtTs(secs)}`}>{c.title}</SheetTitle>
        {[
          ['follow', 'Participants', () => (sheet.close(), setPanel('people'))],
          ['file', 'Copy invite link', async () => (await Clipboard.setStringAsync(`bolo://live/${c.id}`), sheet.close(), toast('Invite link copied'))],
          ...(host ? ([['micoff', 'Mute everyone', () => (sheet.close(), toast('Everyone is muted. They can unmute to speak'))]] as any[]) : []),
          ['help', 'Audio and video', () => (sheet.close(), toast('Live audio and video connect when bolo’s video service is switched on'))],
          ['flag', 'Report a problem', () => (sheet.close(), toast('Thanks, we’ll look into it'))],
        ].map(([ic, t, f]: any) => (
          <Pressable key={t} accessibilityRole="button" onPress={f} style={[S.row, { gap: 12, height: 52 }]}>
            <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: C.s2, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name={ic} size={18} color={C.text} />
            </View>
            <Txt s={15} w={7}>
              {t}
            </Txt>
          </Pressable>
        ))}
      </View>
    ));

  // whiteboard drawing (teacher)
  const cur = useRef<string>('');
  const pr = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => host && stage === 'board',
        onMoveShouldSetPanResponder: () => host && stage === 'board',
        onPanResponderGrant: (e) => {
          const { locationX: x, locationY: y } = e.nativeEvent;
          cur.current = `M${x.toFixed(1)} ${y.toFixed(1)}`;
          setStrokes((L) => [...L, { d: cur.current, c: pen, w: 3 }]);
        },
        onPanResponderMove: (e) => {
          const { locationX: x, locationY: y } = e.nativeEvent;
          cur.current += ` L${x.toFixed(1)} ${y.toFixed(1)}`;
          const d = cur.current;
          setStrokes((L) => (L.length ? [...L.slice(0, -1), { ...L[L.length - 1], d }] : L));
        },
      }),
    [host, stage, pen],
  );

  const SH = Math.round(width * 0.66);
  const speakId = [teacher, ...people][speaker % Math.min(3, people.length + 1)];
  const tiles = [{ id: 'me', name: 'You', pic: myPhoto(), mic, hand }, ...(host ? [] : [{ id: 'host', name: c.prov.n, pic: c.prov.logo, mic: true, hand: false }]), ...people.map((pid) => ({ id: pid, name: fname(P(pid).name), pic: P(pid).photo, mic: speakId === pid, hand: hands.includes(pid) }))];

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: '#0b0b0d' }}>
      <StatusBar style="light" />
      {/* header */}
      <View style={[S.row, { gap: 10, paddingTop: ins.top + 6, paddingHorizontal: 14, paddingBottom: 10 }]}>
        <Pressable accessibilityLabel="Minimise" onPress={() => router.back()} hitSlop={8} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: C.s1, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="down" size={18} color={C.text} />
        </Pressable>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Txt s={15} w={8} lines={1}>
            {c.title}
          </Txt>
          <View style={[S.row, { gap: 6, marginTop: 2 }]}>
            <View style={[S.row, { gap: 4, paddingHorizontal: 6, height: 18, borderRadius: 5, backgroundColor: '#e11d48' }]}>
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#fff' }} />
              <Txt s={10} w={8}>
                LIVE
              </Txt>
            </View>
            <Txt testID="live-timer" s={12} c={C.muted}>
              {fmtTs(secs)} · {people.length + 1} in class
            </Txt>
            {rec ? (
              <Txt s={12} w={8} c="#ff6b81">
                ● REC
              </Txt>
            ) : null}
          </View>
        </View>
        <Pressable testID="live-end" accessibilityRole="button" onPress={end} style={{ paddingHorizontal: 14, height: 36, borderRadius: 18, backgroundColor: host ? '#e11d48' : C.s2, justifyContent: 'center' }}>
          <Txt s={13} w={8}>
            {host ? 'End class' : 'Leave'}
          </Txt>
        </Pressable>
      </View>

      {/* stage: video or whiteboard */}
      <View style={{ height: SH, marginHorizontal: 12, borderRadius: 22, overflow: 'hidden', backgroundColor: stage === 'board' ? '#fbfbf7' : '#1a1a1e' }} {...(stage === 'board' ? pr.panHandlers : {})}>
        {stage === 'video' ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            {share && host ? (
              <View style={{ alignItems: 'center', gap: 10 }}>
                <Icon name="squares" size={44} color={C.lav} />
                <Txt s={14} w={7}>
                  You’re sharing your screen
                </Txt>
              </View>
            ) : (
              <>
                <Animated.View style={{ position: 'absolute', width: 170, height: 170, borderRadius: 85, borderWidth: 3, borderColor: C.mint, opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.8, 0] }), transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1.2] }) }] }} />
                <Avatar pic={host ? myPhoto() : c.prov.logo} square={!host} size={140} />
                {host && !cam ? (
                  <Txt s={12} c={C.muted} style={{ marginTop: 10 }}>
                    Your camera is off
                  </Txt>
                ) : null}
              </>
            )}
            <View style={[S.row, { gap: 6, position: 'absolute', left: 12, bottom: 12, paddingHorizontal: 10, height: 30, borderRadius: 15, backgroundColor: 'rgba(0,0,0,.55)' }]}>
              <Icon name={host ? (mic ? 'mic' : 'micoff') : 'mic'} size={13} color="#fff" />
              <Txt s={12} w={7}>
                {teacherName} · Teacher
              </Txt>
            </View>
            {/* your own small tile */}
            {!host ? (
              <View style={{ position: 'absolute', right: 12, bottom: 12, width: 84, height: 108, borderRadius: 16, backgroundColor: '#2a2a30', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: mic ? C.mint : 'transparent' }}>
                <Avatar pic={myPhoto()} size={46} />
                <Txt s={10} c={C.muted} style={{ marginTop: 6 }}>
                  {cam ? 'You' : 'Camera off'}
                </Txt>
              </View>
            ) : null}
          </View>
        ) : (
          <View style={{ flex: 1 }}>
            <Svg width="100%" height="100%">
              <SvgText x={18} y={36} fill="#111" fontSize={18} fontWeight="bold">
                {lesson.slice(0, 34)}
              </SvgText>
              <SvgText x={18} y={64} fill="#444" fontSize={13}>
                1. What it is   2. How to do it   3. Practice
              </SvgText>
              <Line x1={40} y1={SH - 40} x2={width - 80} y2={SH - 40} stroke="#333" strokeWidth={2} />
              <Line x1={40} y1={SH - 40} x2={40} y2={90} stroke="#333" strokeWidth={2} />
              <Path d={`M50 ${SH - 60} Q ${width / 2 - 20} ${90} ${width - 100} ${SH - 70}`} stroke="#e11d48" strokeWidth={3} fill="none" />
              {strokes.map((s, i) => (
                <Path key={i} d={s.d} stroke={s.c} strokeWidth={s.w} fill="none" strokeLinecap="round" strokeLinejoin="round" />
              ))}
            </Svg>
            {host ? (
              <View style={[S.row, { gap: 8, position: 'absolute', left: 10, bottom: 10, padding: 6, borderRadius: 16, backgroundColor: '#fff', shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 8, elevation: 3 }]}>
                {PENS.map((p) => (
                  <Pressable key={p} accessibilityLabel={`Pen colour ${p}`} onPress={() => setPen(p)} style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: p, borderWidth: 3, borderColor: pen === p ? '#cfd6ff' : '#fff' }} />
                ))}
                <Pressable accessibilityLabel="Undo" onPress={() => setStrokes((L) => L.slice(0, -1))} style={{ paddingHorizontal: 6 }}>
                  <Icon name="back" size={18} color="#111" />
                </Pressable>
                <Pressable accessibilityLabel="Clear board" onPress={() => setStrokes([])} style={{ paddingHorizontal: 6 }}>
                  <Icon name="trash" size={18} color="#111" />
                </Pressable>
              </View>
            ) : (
              <View style={{ position: 'absolute', right: 10, bottom: 10, paddingHorizontal: 10, height: 26, borderRadius: 13, backgroundColor: 'rgba(0,0,0,.6)', justifyContent: 'center' }}>
                <Txt s={11} w={7}>
                  {teacherName} is writing
                </Txt>
              </View>
            )}
          </View>
        )}
        {/* stage switch */}
        <View style={[S.row, { position: 'absolute', top: 10, left: 10, padding: 3, borderRadius: 14, backgroundColor: 'rgba(0,0,0,.55)' }]}>
          {(['video', 'board'] as const).map((k) => (
            <Pressable key={k} testID={`live-stage-${k}`} accessibilityRole="tab" accessibilityState={{ selected: stage === k }} onPress={() => (tap(), setStage(k))} style={{ paddingHorizontal: 12, height: 28, borderRadius: 11, justifyContent: 'center', backgroundColor: stage === k ? '#fff' : 'transparent' }}>
              <Txt s={12} w={8} c={stage === k ? '#000' : '#fff'}>
                {k === 'video' ? 'Video' : 'Whiteboard'}
              </Txt>
            </Pressable>
          ))}
        </View>
      </View>

      {/* participants strip */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0, marginTop: 10 }} contentContainerStyle={{ paddingHorizontal: 12, gap: 8 }}>
        {tiles.slice(0, 8).map((p) => (
          <View key={p.id} style={{ width: 62, alignItems: 'center' }}>
            <View style={{ borderRadius: 26, borderWidth: 2, borderColor: p.mic && speakId === p.id ? C.mint : 'transparent' }}>
              <Avatar pic={p.pic} size={48} square={p.id === 'host'} />
            </View>
            {p.hand ? (
              <View style={{ position: 'absolute', top: -2, right: 4, width: 20, height: 20, borderRadius: 10, backgroundColor: C.yellow, alignItems: 'center', justifyContent: 'center' }}>
                <Txt s={11}>✋</Txt>
              </View>
            ) : null}
            <Txt s={10} c={C.muted} lines={1} style={{ marginTop: 3 }}>
              {p.name}
            </Txt>
          </View>
        ))}
        {tiles.length > 8 ? (
          <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: C.s2, alignItems: 'center', justifyContent: 'center' }}>
            <Txt s={12} w={8}>
              +{tiles.length - 8}
            </Txt>
          </View>
        ) : null}
      </ScrollView>

      {/* panel */}
      <View style={{ flex: 1, marginTop: 8, marginHorizontal: 12, borderRadius: 22, backgroundColor: C.s1, overflow: 'hidden' }}>
        <View style={[S.row, { padding: 4, margin: 8, borderRadius: 14, backgroundColor: C.s2 }]}>
          {(
            [
              ['chat', 'Chat'],
              ['people', `People${hands.length && host ? ' ✋' + hands.length : ''}`],
              ['qa', `Q&A ${qs.filter((q) => !q.done).length || ''}`],
            ] as const
          ).map(([k, l]) => (
            <Pressable key={k} testID={`live-tab-${k}`} accessibilityRole="tab" accessibilityState={{ selected: panel === k }} onPress={() => (tap(), setPanel(k))} style={{ flex: 1, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: panel === k ? C.blue : 'transparent' }}>
              <Txt s={12} w={8}>
                {l}
              </Txt>
            </Pressable>
          ))}
        </View>
        {panel === 'chat' ? (
          <FlatList
            data={chat}
            keyExtractor={(m) => String(m.id)}
            contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 8, gap: 10 }}
            ref={chatRef}
            onContentSizeChange={() => chatRef.current?.scrollToEnd({ animated: true })}
            renderItem={({ item: m }) => {
              const nm = m.who === 'me' ? 'You' : m.who === 'host' ? c.prov.n : fname(P(m.who)?.name || '');
              const pic = m.who === 'me' ? myPhoto() : m.who === 'host' ? c.prov.logo : P(m.who)?.photo || '';
              return (
                <View style={[S.row, { gap: 8, alignItems: 'flex-start' }]}>
                  <Avatar pic={pic} size={28} square={m.who === 'host'} />
                  <View style={{ flex: 1 }}>
                    <Txt s={12} w={8} c={m.who === teacher ? C.yellow : C.text}>
                      {nm} <Txt s={10} c={C.faint}>{m.at}</Txt>
                    </Txt>
                    <Txt s={13} c="#d9d9de">
                      {m.t}
                    </Txt>
                  </View>
                </View>
              );
            }}
          />
        ) : panel === 'people' ? (
          <ScrollView contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 8, gap: 6 }}>
            {host && hands.length ? (
              <Txt s={12} w={8} c={C.yellow}>
                Raised hands
              </Txt>
            ) : null}
            {[...tiles].sort((a, b) => +b.hand - +a.hand).map((p) => (
              <View key={p.id} style={[S.row, { gap: 10, paddingVertical: 6 }]}>
                <Avatar pic={p.pic} size={34} square={p.id === 'host'} />
                <View style={{ flex: 1 }}>
                  <Txt s={13} w={7}>
                    {p.name}
                    {p.id === teacher ? ' · Teacher' : ''}
                  </Txt>
                </View>
                {p.hand && host ? (
                  <Pressable accessibilityRole="button" onPress={() => (setHands((h) => h.filter((x) => x !== p.id)), toast(`${p.name} can speak now`))} style={{ paddingHorizontal: 10, height: 28, borderRadius: 14, backgroundColor: C.yellow, justifyContent: 'center' }}>
                    <Txt s={11} w={8} c="#000">
                      Let speak
                    </Txt>
                  </Pressable>
                ) : null}
                <Icon name={p.mic ? 'mic' : 'micoff'} size={16} color={p.mic ? C.mint : C.faint} />
              </View>
            ))}
          </ScrollView>
        ) : (
          <ScrollView contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 8, gap: 8 }}>
            {qs.length ? null : (
              <Txt s={13} c={C.muted} style={{ padding: 8 }}>
                No questions yet. {host ? 'Students’ questions appear here.' : 'Ask one below; others can upvote it.'}
              </Txt>
            )}
            {[...qs].sort((a, b) => +!!a.done - +!!b.done || b.votes - a.votes).map((q) => (
              <View key={q.id} style={[S.row, { gap: 10, padding: 10, borderRadius: 14, backgroundColor: C.s2, opacity: q.done ? 0.55 : 1 }]}>
                <Pressable accessibilityLabel="Upvote" onPress={() => setQs((L) => L.map((x) => (x.id === q.id ? { ...x, voted: !x.voted, votes: x.votes + (x.voted ? -1 : 1) } : x)))} style={{ alignItems: 'center', width: 32 }}>
                  <Icon name="up" size={16} color={q.voted ? C.yellow : C.muted} />
                  <Txt s={11} w={8} c={q.voted ? C.yellow : C.muted}>
                    {q.votes}
                  </Txt>
                </Pressable>
                <View style={{ flex: 1 }}>
                  <Txt s={13}>{q.t}</Txt>
                  <Txt s={11} c={C.muted}>
                    {q.who === 'me' ? 'You' : fname(P(q.who)?.name || '')}
                    {q.done ? ' · answered' : ''}
                  </Txt>
                </View>
                {host && !q.done ? (
                  <Pressable accessibilityRole="button" onPress={() => setQs((L) => L.map((x) => (x.id === q.id ? { ...x, done: true } : x)))} style={{ paddingHorizontal: 10, height: 28, borderRadius: 14, backgroundColor: C.mint, justifyContent: 'center' }}>
                    <Txt s={11} w={8} c="#000">
                      Answered
                    </Txt>
                  </Pressable>
                ) : null}
              </View>
            ))}
          </ScrollView>
        )}
        {panel !== 'people' ? (
          <View style={[S.row, { gap: 8, padding: 8, borderTopWidth: 1, borderColor: C.line }]}>
            <TextInput testID="live-input" value={draft} onChangeText={setDraft} onSubmitEditing={send} returnKeyType="send" placeholder={panel === 'qa' ? 'Ask a question…' : 'Message the class…'} placeholderTextColor={C.faint} style={[tx(14, 5), { flex: 1, height: 40, paddingHorizontal: 14, borderRadius: 20, backgroundColor: C.s2 }]} />
            <Pressable testID="live-send" accessibilityLabel="Send" onPress={send} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: draft.trim() ? C.yellow : C.s3, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="send" size={17} color="#000" />
            </Pressable>
          </View>
        ) : null}
      </View>

      {/* controls */}
      <View style={[S.row, { justifyContent: 'space-around', paddingTop: 10, paddingBottom: ins.bottom + 10, paddingHorizontal: 8 }]}>
        <Ctl icon={mic ? 'mic' : 'micoff'} label={mic ? 'Mic' : 'Muted'} on={mic} onPress={() => (tap(), setMic(!mic))} testID="live-mic" />
        <Ctl icon={cam ? 'video' : 'video2'} label={cam ? 'Camera' : 'Cam off'} on={cam} onPress={() => (tap(), setCam(!cam))} testID="live-cam" />
        {host ? <Ctl icon="squares" label={share ? 'Sharing' : 'Screen'} on={share} onPress={() => (tap(), setShare(!share), setStage('video'))} testID="live-share" /> : <Ctl icon="follow" label={hand ? 'Lower' : 'Raise hand'} on={hand} accent onPress={raise} testID="live-hand" />}
        {host ? <Ctl icon="record" label={rec ? 'Stop rec' : 'Record'} on={rec} danger={rec} onPress={toggleRec} testID="live-rec" /> : <Ctl icon="chat" label="Q&A" on={panel === 'qa'} onPress={() => (tap(), setPanel('qa'))} testID="live-qa" />}
        <Ctl icon="dots" label="More" onPress={more} testID="live-more" />
      </View>
    </KeyboardAvoidingView>
  );
}

function Ctl({ icon, label, on, onPress, danger, accent, testID }: { icon: string; label: string; on?: boolean; onPress: () => void; danger?: boolean; accent?: boolean; testID?: string }) {
  return (
    <Pressable testID={testID} accessibilityRole="button" accessibilityState={{ selected: !!on }} accessibilityLabel={label} onPress={onPress} style={{ alignItems: 'center', width: 64 }}>
      <View style={{ width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: danger ? '#e11d48' : on ? (accent ? C.yellow : '#fff') : C.s2 }}>
        <Icon name={icon} size={20} color={danger ? '#fff' : on ? '#000' : C.text} />
      </View>
      <Txt s={10} c={C.muted} style={{ marginTop: 4 }} lines={1}>
        {label}
      </Txt>
    </Pressable>
  );
}
