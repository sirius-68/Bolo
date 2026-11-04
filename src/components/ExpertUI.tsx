/* Building blocks for Career experts: the expert card, the "find a mentor for me" quiz,
   service picker, reviews and the sheet for a session you booked. */
import React, { useState } from 'react';
import { Dimensions, Pressable, ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import { Avatar, Btn, Input, Steps, Txt, tap } from '../ui/kit';
import { Icon } from '../ui/Icon';
import { C, S } from '../ui/theme';
import { afterSheet, confirm, sheet, SheetTitle, toast } from '../ui/overlay';
import { Expert, ExReview, EX_GOALS, EX_SPECS } from '../data/experts';
import { ExBooking, MATCH_Q, applyMatch, cancelSession, confirmSession, expertById, expertContact, exRating, fromPrice, nearestDate, rateSession, reviewsOfEx, serviceOf } from '../logic/experts';
import { xaf } from '../logic/core';
import { Stars } from './Reviews';
import { openChat } from '../sheets/chat';

export const goExpert = (id: string) => (tap(), router.push(`/expert/${id}` as any));
export const goBook = (e: string, s: string) => router.push(`/expert-book?e=${e}&s=${s}` as any);

/** Rating line: "5.0 ★★★★★ · 11 reviews" */
export function ExRating({ e, onReviews, big }: { e: Expert; onReviews?: () => void; big?: boolean }) {
  const { avg, n } = exRating(e);
  if (!n) return <Txt s={12} c={C.muted}>New expert</Txt>;
  return (
    <View style={[S.row, { gap: 6 }]} accessibilityLabel={`Rated ${avg.toFixed(1)} out of 5 from ${n} reviews`}>
      <Txt s={big ? 15 : 13} w={8}>
        {avg.toFixed(1)}
      </Txt>
      <Stars value={Math.round(avg)} size={big ? 14 : 12} />
      <Txt s={big ? 14 : 12} w={7} c={C.lav} onPress={onReviews}>
        {n} review{n === 1 ? '' : 's'}
      </Txt>
    </View>
  );
}

/** Chips for the fields an expert knows, with a "+n" overflow. */
export function SpecChips({ specs, max = 2 }: { specs: string[]; max?: number }) {
  const more = specs.length - max;
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
      {specs.slice(0, max).map((s) => (
        <View key={s} style={{ paddingHorizontal: 10, height: 28, borderRadius: 14, backgroundColor: C.s2, justifyContent: 'center' }}>
          <Txt s={12} w={7} lines={1}>
            {s}
          </Txt>
        </View>
      ))}
      {more > 0 ? (
        <View style={{ paddingHorizontal: 10, height: 28, borderRadius: 14, backgroundColor: C.s2, justifyContent: 'center' }}>
          <Txt s={12} w={7} c={C.muted}>
            +{more}
          </Txt>
        </View>
      ) : null}
    </View>
  );
}

export function Bullets({ items, lines, c = C.text }: { items: string[]; lines?: number; c?: string }) {
  return (
    <View style={{ gap: 4 }}>
      {items.map((t) => (
        <View key={t} style={[S.row, { gap: 8, alignItems: 'flex-start' }]}>
          <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: C.yellow, marginTop: 7 }} />
          <Txt s={13} c={c} lines={lines} style={{ flex: 1 }}>
            {t}
          </Txt>
        </View>
      ))}
    </View>
  );
}

/** One expert in the list: photo, name, headline, what they've done, rating, fields and price. */
export function ExpertCard({ e }: { e: Expert }) {
  return (
    <Pressable testID={`expert-${e.id}`} accessibilityRole="button" accessibilityLabel={`${e.name}, ${e.head}`} onPress={() => goExpert(e.id)} style={({ pressed }) => ({ padding: 14, borderRadius: 24, backgroundColor: pressed ? C.s2 : C.s1, borderWidth: 1, borderColor: C.line, gap: 12 })}>
      <View style={[S.row, { gap: 14, alignItems: 'flex-start' }]}>
        <Avatar pic={e.pic} square size={84} style={{ borderRadius: 24 }} />
        <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
          <View style={[S.row, { gap: 6 }]}>
            <Txt s={17} w={8} lines={1} style={{ flexShrink: 1 }}>
              {e.name}
            </Txt>
            <Icon name="verified" size={15} color={C.blue} />
          </View>
          <Txt s={13} c={C.muted} lines={2}>
            {e.head}
          </Txt>
          <ExRating e={e} />
        </View>
      </View>
      <Bullets items={e.bio.slice(0, 3)} lines={1} c="#d6d6dc" />
      <SpecChips specs={e.specs} />
      <View style={[S.rowB, { paddingTop: 10, borderTopWidth: 1, borderColor: C.line }]}>
        <Txt s={14} w={8} c={C.yellow}>
          From {xaf(fromPrice(e))}
        </Txt>
        <View style={[S.row, { gap: 5 }]}>
          <Icon name="calcheck" size={14} color={C.mint} />
          <Txt s={12} w={7} c={C.mint}>
            {e.soon <= 1 ? 'Free tomorrow' : `From ${nearestDate(e)}`}
          </Txt>
        </View>
      </View>
    </Pressable>
  );
}

/** "It's now easier to find a mentor" card, shown inside the list. */
export function MatchPromo() {
  return (
    <View testID="ex-match-promo" style={{ padding: 18, borderRadius: 24, backgroundColor: C.lav, gap: 6, overflow: 'hidden' }}>
      <View style={{ position: 'absolute', right: -18, top: -18, width: 96, height: 96, borderRadius: 48, backgroundColor: 'rgba(0,0,0,.08)' }} />
      <Icon name="sparkle" size={24} color="#000" />
      <Txt s={20} w={8} c="#000" style={{ lineHeight: 24 }}>
        It’s now easier to find a mentor
      </Txt>
      <Txt s={13} c="#26294a">
        Answer 3 quick questions and we’ll pick the experts who fit you best.
      </Txt>
      <Pressable testID="ex-match" accessibilityRole="button" onPress={() => (tap(), openMatchQuiz())} style={({ pressed }) => [S.row, { alignSelf: 'flex-start', gap: 8, marginTop: 8, height: 44, paddingHorizontal: 18, borderRadius: 22, backgroundColor: '#000', transform: [{ scale: pressed ? 0.97 : 1 }] }]}>
        <Txt s={14} w={8}>
          Find a mentor for me
        </Txt>
        <Icon name="arrow" size={14} color="#fff" />
      </Pressable>
    </View>
  );
}

/** 3 steps: goal → field → format. Then the list shows the best matches. */
export function openMatchQuiz() {
  sheet.show(() => <MatchQuiz />, { full: true, tag: 'ex-match' });
}
function MatchQuiz() {
  const [step, setStep] = useState(0);
  const [a, setA] = useState<string[]>(['', '', '']);
  const q = MATCH_Q[step];
  const opts = q.k === 'goal' ? EX_GOALS : q.k === 'spec' ? [...EX_SPECS, 'Not sure yet'] : q.opts;
  const choose = (v: string) => {
    tap();
    const next = a.slice();
    next[step] = v;
    setA(next);
    if (step < MATCH_Q.length - 1) return setStep(step + 1);
    const L = applyMatch(next[0], next[1] === 'Not sure yet' ? '' : next[1], next[2]);
    sheet.close();
    toast(L.length ? `${L.length === 1 ? "1 expert matches" : L.length + " experts match"} what you need` : 'No exact match yet. Showing the closest experts');
  };
  return (
    <View style={{ gap: 14, flex: 1 }}>
      <View style={S.rowB}>
        <Steps total={MATCH_Q.length} on={step + 1} style={{ flex: 1, marginTop: 0 }} />
        {step ? (
          <Txt s={13} w={7} c={C.lav} onPress={() => setStep(step - 1)} style={{ marginLeft: 16 }}>
            Back
          </Txt>
        ) : null}
      </View>
      <SheetTitle sub={q.sub}>{q.q}</SheetTitle>
      <ScrollView style={{ maxHeight: Dimensions.get('window').height * 0.6 }} contentContainerStyle={{ gap: 8, paddingBottom: 8 }} showsVerticalScrollIndicator={false}>
        {opts.map((o, i) => (
          <Pressable key={o} testID={`match-${step}-${i}`} accessibilityRole="button" onPress={() => choose(o)} style={({ pressed }) => [S.rowB, { minHeight: 54, paddingHorizontal: 16, borderRadius: 18, backgroundColor: pressed || a[step] === o ? C.s3 : C.s2 }]}>
            <Txt s={15} w={7} style={{ flex: 1 }}>
              {o}
            </Txt>
            <Icon name="chev" size={16} color={C.muted} />
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

/** Pick which service to book when the expert offers several. */
export function openServicePicker(e: Expert) {
  if (e.services.length === 1) return goBook(e.id, e.services[0].id);
  sheet.show(() => (
    <View style={{ gap: 8 }}>
      <SheetTitle sub={`${e.name} · nearest date ${nearestDate(e)}`}>Select a service</SheetTitle>
      {e.services.map((s) => (
        <Pressable key={s.id} testID={`pick-svc-${s.id}`} accessibilityRole="button" onPress={() => (tap(), sheet.close(), afterSheet(() => goBook(e.id, s.id)))} style={({ pressed }) => [S.row, { gap: 12, padding: 14, borderRadius: 18, backgroundColor: pressed ? C.s3 : C.s2 }]}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Txt s={15} w={8} lines={2}>
              {s.t}
            </Txt>
            <Txt s={12} c={C.muted}>
              {s.fmt}
              {s.mins ? ` · ${s.mins} min` : ''}
            </Txt>
          </View>
          <Txt s={14} w={8} c={C.yellow}>
            {xaf(s.price)}
          </Txt>
          <Icon name="chev" size={16} color={C.muted} />
        </Pressable>
      ))}
    </View>
  ));
}

export function ReviewItem({ r, full }: { r: ExReview; full?: boolean }) {
  return (
    <View style={{ gap: 6, padding: 14, borderRadius: 20, backgroundColor: C.s1, borderWidth: 1, borderColor: C.line }}>
      <View style={S.rowB}>
        <Txt s={14} w={8}>
          {r.n}
        </Txt>
        <Txt s={12} c={C.muted}>
          {r.at}
        </Txt>
      </View>
      <View style={[S.row, { gap: 8 }]}>
        <Stars value={r.r} size={12} />
        {r.s ? (
          <Txt s={12} c={C.muted} lines={1} style={{ flex: 1 }}>
            {r.s}
          </Txt>
        ) : null}
      </View>
      {r.t ? (
        <Txt s={13} c="#d6d6dc" lines={full ? undefined : 3}>
          {r.t}
        </Txt>
      ) : null}
    </View>
  );
}
export function openAllReviews(e: Expert) {
  const { avg, n } = exRating(e);
  sheet.show(
    () => (
      <View style={{ gap: 10, flex: 1 }}>
        <SheetTitle sub={`${avg.toFixed(1)} out of 5 from ${n} review${n === 1 ? '' : 's'}`}>Reviews of {e.name.split(' ')[0]}</SheetTitle>
        <ScrollView style={{ maxHeight: Dimensions.get('window').height * 0.72 }} contentContainerStyle={{ gap: 8, paddingBottom: 20 }} showsVerticalScrollIndicator={false}>
          {reviewsOfEx(e).map((r, i) => (
            <ReviewItem key={i} r={r} full />
          ))}
        </ScrollView>
      </View>
    ),
    { full: true },
  );
}

const STATE: Record<ExBooking['state'], [string, string]> = {
  booked: ['Waiting for a time', C.yellow],
  scheduled: ['Time agreed', C.mint],
  done: ['Done', C.muted],
  cancelled: ['Cancelled', C.err],
};
/** A row for a session you booked. */
export function SessionRow({ b }: { b: ExBooking }) {
  const e = expertById(b.ex);
  if (!e) return null;
  const [t, col] = STATE[b.state];
  return (
    <Pressable testID={`exb-${b.ex}`} accessibilityRole="button" onPress={() => (tap(), openSession(b))} style={({ pressed }) => [S.row, { gap: 12, padding: 12, borderRadius: 20, backgroundColor: pressed ? C.s2 : C.s1, borderWidth: 1, borderColor: C.line }]}>
      <Avatar pic={e.pic} size={44} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Txt s={14} w={8} lines={1}>
          {b.title}
        </Txt>
        <Txt s={12} c={C.muted} lines={1}>
          {e.name} · {b.when || `from ${b.date}`}
        </Txt>
      </View>
      <View style={{ paddingHorizontal: 10, height: 26, borderRadius: 13, backgroundColor: C.s2, justifyContent: 'center' }}>
        <Txt s={11} w={8} c={col}>
          {t}
        </Txt>
      </View>
    </Pressable>
  );
}

/** What you can do with a booked session: chat, confirm it happened (releases payment), cancel, rate. */
export function openSession(b: ExBooking) {
  sheet.show(() => <Session b={b} />, { tag: 'exb:' + b.id });
}
function Session({ b }: { b: ExBooking }) {
  const e = expertById(b.ex)!;
  const s = serviceOf(e, b.svc);
  const [stars, setStars] = useState(0);
  const [text, setText] = useState('');
  const open = b.state === 'booked' || b.state === 'scheduled';
  return (
    <View style={{ gap: 12 }}>
      <View style={[S.row, { gap: 12 }]}>
        <Avatar pic={e.pic} size={52} />
        <View style={{ flex: 1 }}>
          <Txt s={18} w={8} lines={2}>
            {b.title}
          </Txt>
          <Txt s={13} c={C.muted}>
            {e.name} · {s?.fmt}
          </Txt>
        </View>
      </View>
      <View style={{ padding: 14, borderRadius: 18, backgroundColor: C.s2, gap: 8 }}>
        <Line k="Status" v={STATE[b.state][0]} c={STATE[b.state][1]} />
        <Line k="When" v={b.when || `${b.date} or later · the expert confirms in chat`} />
        <Line k={b.state === 'done' ? 'Paid' : b.state === 'cancelled' ? 'Refunded' : 'Held by bolo'} v={xaf(b.amt) + (b.code ? ` · ${b.code}` : '')} />
      </View>
      {open ? (
        <Txt s={12} c={C.muted}>
          Your money stays with bolo until you confirm the session happened. Cancel before it starts for a full refund.
        </Txt>
      ) : null}
      <Btn testID="exb-chat" variant="yellow" icon="chat" title={`Message ${e.name.split(' ')[0]}`} onPress={() => (sheet.close(), afterSheet(() => openChat(expertContact(e))))} />
      {open ? (
        <Btn
          testID="exb-done"
          variant="dark"
          icon="checkc"
          title="Session done · release payment"
          onPress={() =>
            confirm({
              title: 'Did the session happen?',
              text: `${xaf(b.amt)} goes to ${e.name}. Only confirm once you’ve had your session or received your report.`,
              ok: 'Yes, release payment',
              icon: 'checkc',
              onOk: () => (confirmSession(b), afterSheet(() => openSession(b))),
            })
          }
        />
      ) : null}
      {open ? (
        <Txt
          s={13}
          w={7}
          c={C.err}
          center
          onPress={() =>
            confirm({ title: 'Cancel this session?', text: `${xaf(b.amt)} goes back to your wallet.`, ok: 'Cancel session', danger: true, icon: 'x', onOk: () => cancelSession(b) })
          }
          style={{ paddingVertical: 6 }}
        >
          Cancel and get a refund
        </Txt>
      ) : null}
      {b.state === 'done' && !b.rated ? (
        <View style={{ gap: 10, paddingTop: 6 }}>
          <Txt s={15} w={8}>
            How was it?
          </Txt>
          <Stars value={stars} size={30} onPick={setStars} />
          <Input value={text} onChangeText={setText} multiline maxLength={400} placeholder="What helped you most? (optional)" minHeight={80} />
          <Btn testID="exb-rate" variant="yellow" title="Post review" disabled={!stars} onPress={() => (rateSession(b, stars, text), sheet.close())} />
        </View>
      ) : null}
    </View>
  );
}
function Line({ k, v, c }: { k: string; v: string; c?: string }) {
  return (
    <View style={[S.row, { gap: 10, alignItems: 'flex-start' }]}>
      <Txt s={13} c={C.muted} style={{ width: 92 }}>
        {k}
      </Txt>
      <Txt s={13} w={7} c={c} style={{ flex: 1 }}>
        {v}
      </Txt>
    </View>
  );
}
