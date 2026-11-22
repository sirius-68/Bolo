/* The getit agent at work on one of my requests: one line says where it stands and what I can do, its pick
   comes with the reason, every offer is listed with what its rating is for, and "What getit did" shows each step.
   The rules run on the server; this screen asks where things stand every few seconds while it is open. */
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { db } from '../../src/data/db';
import { useLive } from '../../src/logic/live';
import { fname, postById } from '../../src/logic/core';
import { refreshBooking, refreshPosts } from '../../src/logic/server';
import { closeJob } from '../../src/logic/work';
import { AgentOffer, AgentView, WANT_TEXT, agentMore, agentStop, agentTick, offerRating, triesLeft, whyAI, whyLocal } from '../../src/g/agent';
import { low, money, plural, whenText } from '../../src/g/data';
import { GIcon } from '../../src/g/icons';
import { confirm, toast } from '../../src/g/notice';
import { Kicker, Top } from '../../src/g/parts';
import { openBook, openRequest } from '../../src/g/sheets';
import { BRAND, GOOD, RED, useG } from '../../src/g/theme';
import { goBack, tap } from '../../src/g/touch';
import { Face, Link, T } from '../../src/g/ui';

type Act = { id: string; label: string; run: () => void; main?: boolean };
const clock = (iso: string) => {
  const d = new Date(iso);
  return isNaN(+d) ? '' : d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }).toLowerCase();
};

export default function Agent() {
  useLive();
  const t = useG();
  const ins = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const po = postById(id);
  const [v, setV] = useState<AgentView | null>(null);
  const [state, setState] = useState<'loading' | 'ok' | 'none' | 'failed'>('loading');
  const [why, setWhy] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const seen = useRef('');
  const take = (x: AgentView | null) => {
    if (!x) return;
    setV(x);
    setState('ok');
    // new offers, a new price or a booking: the request's own list is read again, so booking works from here
    const sig = `${x.state}:${x.offers.map((o) => o.id + o.price).join()}`;
    if (sig !== seen.current) {
      seen.current = sig;
      void refreshPosts();
      if (x.state === 'booked' && x.booking) void refreshBooking(x.booking);
    }
  };
  useEffect(() => {
    let live = true;
    let fails = 0;
    const ask = async () => {
      const x = await agentTick(id);
      if (!live) return;
      if (x) return (fails = 0), take(x);
      // nothing came back: not handled by the agent, or no connection right now
      if (++fails >= 2) setState((s) => (s === 'ok' ? s : postById(id)?.agent === '1' ? 'failed' : 'none'));
    };
    void ask();
    const timer = setInterval(ask, 8000);
    return () => {
      live = false;
      clearInterval(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);
  const pick = v?.pick ? v.offers.find((o) => o.id === v.pick) : undefined;
  useEffect(() => {
    setWhy(null);
    if (!v || !pick) return;
    let live = true;
    void whyAI(v, pick).then((x) => live && x && setWhy(x));
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pick?.id, pick?.amount]);

  const shell = (body: React.ReactNode) => (
    <View style={{ flex: 1, backgroundColor: t.bg, paddingTop: ins.top + 16 }}>
      <Top close />
      {body}
    </View>
  );
  if (!v) {
    return shell(
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 10 }}>
        {state === 'loading' ? (
          <ActivityIndicator color={BRAND} />
        ) : (
          <>
            <T s={20} w={8} center>
              {state === 'failed' ? 'We couldn’t reach getit right now' : po ? 'getit isn’t handling this request' : 'This request is closed'}
            </T>
            <T s={15} c="muted" center>
              {state === 'failed' ? 'Check your connection. It keeps working for you meanwhile.' : po ? 'Its offers are under Jobs.' : 'Someone was booked, or it was cancelled.'}
            </T>
            {po && state !== 'failed' ? <Link testID="agent-plain" title="Open the request" onPress={() => router.replace(`/asked/${po.id}` as any)} /> : null}
          </>
        )}
      </View>,
    );
  }

  const many = plural(v.trade || 'Worker');
  const offerIndex = (o: AgentOffer) => (po?.offerList || []).findIndex((x) => x.id === o.id);
  const localId = (o: AgentOffer) => (po?.offerList || []).find((x) => x.id === o.id)?.by;
  const book = (o: AgentOffer) => {
    const i = offerIndex(o);
    const by = localId(o);
    if (i < 0 || !by) return (void refreshPosts(), toast('One moment, the offer is still loading'));
    openBook({ worker: by, need: v.title, service: v.service, postId: v.post, offer: i });
  };
  const run = async (f: (post: string) => Promise<AgentView | null>) => {
    if (busy) return;
    setBusy(true);
    const x = await f(v.post);
    setBusy(false);
    if (x) take(x);
    else toast('That didn’t go through. Check your connection and try again.');
  };
  const rebrief = () => openRequest({ trade: v.trade, need: v.title, postId: v.post, agent: true, budget: v.budget, when: v.want });
  const callSomeone = () => router.push(`/workers?trade=${encodeURIComponent(v.trade)}&need=${encodeURIComponent(v.title)}${v.service ? `&service=${encodeURIComponent(v.service)}` : ''}` as any);
  const waiting = v.offers.filter((o) => o.counter_state === 'asked').length;

  let st: { good?: boolean; title: string; sub: string; acts: Act[] };
  if (v.state === 'booked') {
    const o = v.offers.find((x) => x.id === v.pick);
    st = {
      good: true,
      title: o ? `Booked ${fname(o.name)} for ${money(o.amount)}` : 'Booked',
      sub: o ? `${fname(o.name)} can come ${low(whenText(o.when))}. Agree the exact place by chat or call.` : 'Your job is under Jobs.',
      acts: v.booking ? [{ id: 'job', label: 'Open the job', main: true, run: () => router.replace(`/track/${v.booking}` as any) }] : [],
    };
  } else if (v.state === 'pick' && pick) {
    const who = fname(pick.name);
    st = {
      good: true,
      title: `Best offer: ${who}, ${money(pick.amount)}`,
      sub: why || whyLocal(v, pick),
      acts: [
        { id: 'book', label: `Book ${who}`, main: true, run: () => book(pick) },
        { id: 'more', label: 'Look for a better one', run: () => void run(agentMore) },
      ],
    };
  } else if (v.state === 'nobody') {
    st = {
      title: v.offers.length ? 'No offer fits yet' : 'Nobody has answered yet',
      sub: v.offers.length ? `${v.offers.length === 1 ? 'The offer so far is' : `The ${v.offers.length} offers so far are`} listed below. I can ask more ${many}, or you can change the budget or the time.` : `Your request stays open. I can ask more ${many}, or you can call one yourself.`,
      acts: [
        { id: 'more', label: 'Keep asking', main: true, run: () => void run(agentMore) },
        { id: 'change', label: 'Change budget or time', run: rebrief },
        { id: 'call', label: 'Call someone', run: callSomeone },
      ],
    };
  } else if (v.state === 'stopped') {
    st = {
      title: 'You took over',
      sub: v.offers.length ? 'The offers are yours to choose from. More workers can see your request now.' : 'More workers can see your request now. Offers show here and under Jobs.',
      acts: [{ id: 'again', label: 'Let getit handle it again', run: rebrief }],
    };
  } else {
    const told = v.told;
    st = {
      title: v.offers.length ? `${v.offers.length} ${v.offers.length === 1 ? 'offer' : 'offers'} so far` : told ? `Asked ${told} ${told === 1 ? v.trade.toLowerCase() : many}` : `Looking for ${many} near you`,
      sub: waiting
        ? `Waiting for ${waiting === 1 ? 'one worker' : `${waiting} workers`} to say whether your budget works. I’ll come back with the best offer.`
        : v.offers.length
          ? `Comparing them${v.auto && v.budget ? ', and booking the best one when it fits' : ''}. A few more minutes for the others to answer.`
          : told
            ? 'Those who do this kind of job were asked first. I ask more if they don’t answer. You can close getit: I’ll tell you.'
            : 'Nobody nearby offers this yet. Your request stays open, and I’ll tell you when someone answers.',
      acts: [],
    };
  }

  const tag = (text: string, color: string) => (
    <View style={{ paddingHorizontal: 8, height: 24, borderRadius: 12, justifyContent: 'center', backgroundColor: t.card2 }}>
      <T s={12} w={7} c={color}>
        {text}
      </T>
    </View>
  );
  const active = v.state === 'asking' || v.state === 'pick' || v.state === 'nobody';
  const stop = () =>
    confirm({
      title: 'Take over?',
      text: 'getit stops comparing. Your request stays open, more workers see it, and you choose from the offers yourself.',
      ok: 'Take over',
      cancel: 'Let getit continue',
      onOk: () => void run(agentStop),
    });
  const cancel = () =>
    confirm({
      title: 'Cancel this request?',
      text: v.offers.length ? 'The workers who sent a price are told.' : 'Workers stop seeing it.',
      ok: 'Cancel request',
      cancel: 'Keep it',
      danger: true,
      onOk: () => {
        closeJob(v.post);
        goBack();
      },
    });
  const left = triesLeft(v.tries);
  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingTop: ins.top + 16, paddingBottom: ins.bottom + 28 }}>
        <Top close />
        <View style={{ paddingTop: 14, paddingHorizontal: 20 }}>
          <Kicker>getit is handling this</Kicker>
          <T s={28} w={8} lh={1.15} ls={-0.6} style={{ marginTop: 4, marginBottom: 4 }}>
            {v.title}
          </T>
          <T testID="agent-brief" s={14} lh={1.45} c="muted">
            {[v.service, v.budget ? `budget ${money(v.budget)}` : 'no budget set', WANT_TEXT[v.want], v.budget ? (v.auto ? 'books the best offer for you' : 'asks you before booking') : 'asks you before booking'].filter(Boolean).join(' · ')}
          </T>
        </View>

        <View testID="agent-status" accessibilityRole="summary" accessibilityLiveRegion="polite" style={{ flexDirection: 'row', gap: 12, marginHorizontal: 16, marginTop: 16, padding: 16, borderRadius: 22, backgroundColor: t.card, borderWidth: 1, borderColor: t.line }}>
          <View style={{ width: 22, height: 22, marginTop: 1, alignItems: 'center', justifyContent: 'center' }}>
            {st.good ? <View style={{ position: 'absolute', width: 20, height: 20, borderRadius: 10, backgroundColor: GOOD, opacity: 0.22 }} /> : null}
            <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: st.good ? GOOD : RED }} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <T testID="agent-title" s={17} w={8} lh={1.3}>
              {st.title}
            </T>
            <T s={14} lh={1.45} c="muted" style={{ marginTop: 4 }}>
              {st.sub}
            </T>
            {st.acts.length ? (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
                {st.acts.map((a) => (
                  <Pressable key={a.id} testID={`agent-act-${a.id}`} accessibilityRole="button" disabled={busy} onPress={() => (tap(), a.run())} style={{ height: 40, paddingHorizontal: 14, borderRadius: 20, borderWidth: 1, borderColor: a.main ? RED : t.line, backgroundColor: a.main ? RED : 'transparent', alignItems: 'center', justifyContent: 'center', opacity: busy ? 0.6 : 1 }}>
                    <T s={14} w={7} c={a.main ? '#ffffff' : t.text}>
                      {a.label}
                    </T>
                  </Pressable>
                ))}
              </View>
            ) : null}
          </View>
        </View>

        {v.offers.length ? (
          <>
            <T s={17} w={8} style={{ marginHorizontal: 20, marginTop: 22, marginBottom: 4 }}>
              {v.offers.length === 1 ? 'The offer' : `All ${v.offers.length} offers`}
            </T>
            {v.service ? (
              <T s={13} lh={1.45} c="muted" style={{ marginHorizontal: 20, marginBottom: 6 }}>
                Ratings are for {v.service.toLowerCase()} where a worker has some. Otherwise it says what they cover.
              </T>
            ) : null}
            <View style={{ marginHorizontal: 16, borderRadius: 22, backgroundColor: t.card, borderWidth: 1, borderColor: t.line, paddingHorizontal: 14 }}>
              {v.offers.map((o, i) => {
                const by = localId(o);
                const chosen = o.id === v.pick;
                return (
                  <Pressable key={o.id} testID={`agent-offer-${i}`} accessibilityRole="button" accessibilityLabel={`See ${fname(o.name)}’s profile`} onPress={() => by && (tap(), router.push(`/profile/${by}${v.service ? `?service=${encodeURIComponent(v.service)}` : ''}` as any))} style={{ flexDirection: 'row', gap: 12, paddingVertical: 14, borderBottomWidth: i === v.offers.length - 1 ? 0 : 1, borderBottomColor: t.line }}>
                    <Face name={o.name} photo={by ? db.P[by]?.photo : undefined} size={44} />
                    <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <T s={15} w={8} lines={1} style={{ flexShrink: 1 }}>
                          {o.name}
                        </T>
                        {o.verified ? <GIcon name="tick" size={15} /> : null}
                        <View style={{ flex: 1 }} />
                        <T s={15} w={8}>
                          {money(o.amount)}
                        </T>
                      </View>
                      <T s={13} c="muted">
                        Can come {low(whenText(o.when))}
                      </T>
                      <T s={13} c="muted">
                        {offerRating(o, v.service)}
                      </T>
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                        {chosen ? tag(v.state === 'booked' ? 'Booked' : 'getit’s pick', t.accent) : null}
                        {o.over ? tag('Above your budget', t.muted) : v.budget ? tag('Within budget', t.text) : null}
                        {!o.over && !o.fit ? tag('Later than you wanted', t.muted) : null}
                        {o.counter_state === 'asked' && o.counter ? tag(`Asked if ${money(o.counter)} works`, t.muted) : null}
                        {o.counter_state === 'yes' ? tag('Agreed to your budget', t.text) : null}
                        {o.counter_state === 'no' ? tag('Keeps their price', t.muted) : null}
                        {v.service && o.does_service ? tag(`Does ${v.service.toLowerCase()}`, t.text) : null}
                      </View>
                      {v.state !== 'booked' && !chosen ? <Link testID={`agent-book-${i}`} title={`Book ${fname(o.name)} instead`} h={36} onPress={() => book(o)} style={{ alignSelf: 'flex-start' }} /> : null}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </>
        ) : null}

        <T s={17} w={8} style={{ marginHorizontal: 20, marginTop: 22, marginBottom: 6 }}>
          What getit did
        </T>
        <View testID="agent-log" style={{ marginHorizontal: 16, borderRadius: 22, backgroundColor: t.card, borderWidth: 1, borderColor: t.line, paddingHorizontal: 16, paddingVertical: 6 }}>
          {[...v.log].reverse().map((s, i, all) => (
            <View key={s.k + i} style={{ flexDirection: 'row', gap: 12, paddingVertical: 10, borderBottomWidth: i === all.length - 1 ? 0 : 1, borderBottomColor: t.line }}>
              <T s={12} c="muted" style={{ width: 62, marginTop: 2 }}>
                {clock(s.at)}
              </T>
              <View style={{ flex: 1 }}>
                <T s={14} w={7} lh={1.4}>
                  {s.t}
                </T>
                {s.s ? (
                  <T s={13} lh={1.45} c="muted" style={{ marginTop: 2 }}>
                    {s.s}
                  </T>
                ) : null}
              </View>
            </View>
          ))}
        </View>
        <T s={13} lh={1.45} c="muted" center style={{ marginHorizontal: 28, marginTop: 14 }}>
          {v.tries.pro ? 'Included in your getit Pro.' : left ? `You have ${left} free ${left === 1 ? 'try' : 'tries'} left. A try is used only when getit comes back with an offer.` : 'You have used your 3 free tries. This request carries on as it is.'}
        </T>
        <View style={{ alignItems: 'center', marginTop: 6 }}>
          {active ? <Link testID="agent-stop" title="Stop, I’ll choose myself" color="text" h={44} onPress={stop} /> : null}
          {v.state !== 'booked' ? <Link testID="agent-cancel" title="Cancel request" color="text" h={44} onPress={cancel} /> : null}
        </View>
      </ScrollView>
    </View>
  );
}
