/* Asking several workers for a price: one plain line says where things stand and what you can do,
   and it stays true while you wait. The request is underneath, to change or cancel. */
import React, { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLive } from '../../src/logic/live';
import { P, fname, postById } from '../../src/logic/core';
import { refreshPosts } from '../../src/logic/server';
import { closeJob } from '../../src/logic/work';
import { areaLabel, findWorkers, localWorkers, low, money, plural, whenText } from '../../src/g/data';
import { GIcon } from '../../src/g/icons';
import { confirm } from '../../src/g/notice';
import { LogoDot, Pulse, Halo, Top } from '../../src/g/parts';
import { openBook, openRequest } from '../../src/g/sheets';
import { GOOD, RED, useG } from '../../src/g/theme';
import { goBack, tap } from '../../src/g/touch';
import { Link, T } from '../../src/g/ui';

type Act = { label: string; run: () => void; main?: boolean };

export default function Asked() {
  useLive();
  const t = useG();
  const ins = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const po = postById(id);
  const trade = po?.cat || '';
  const [near, setNear] = useState<number | null>(() => (trade ? localWorkers(trade).length || null : null));
  const [keep, setKeep] = useState(false);
  const [, tick] = useState(0);
  // who could answer, and fresh offers while this screen is open
  useEffect(() => {
    let live = true;
    if (trade) void findWorkers(trade).then((r) => live && setNear(r.ids.length));
    void refreshPosts();
    const x = setInterval(() => (void refreshPosts(), tick((n) => n + 1)), 20000);
    return () => {
      live = false;
      clearInterval(x);
    };
  }, [trade]);
  if (!po)
    return (
      <View style={{ flex: 1, backgroundColor: t.bg, paddingTop: ins.top + 16 }}>
        <Top close />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 8 }}>
          <T s={20} w={8} center>
            This request is closed
          </T>
          <T s={15} c="muted" center>
            Someone was booked, or it was cancelled.
          </T>
        </View>
      </View>
    );
  const many = plural(trade || 'Worker');
  const one = (trade || 'worker').toLowerCase();
  const offers = po.offerList || [];
  const mins = po.at ? (Date.now() - po.at) / 60000 : 0;
  const callSomeone = () => router.push(`/workers?trade=${encodeURIComponent(trade)}&need=${encodeURIComponent(po.title || '')}` as any);
  let st: { good?: boolean; title: string; sub: string; acts: Act[] };
  if (offers.length) {
    // the best so far: the lowest price among those who can come soonest
    const best = offers.map((o, i) => ({ o, i })).sort((a, b) => (parseInt(a.o.price.replace(/[^\d]/g, ''), 10) || 9e9) - (parseInt(b.o.price.replace(/[^\d]/g, ''), 10) || 9e9))[0];
    const who = fname(P(best.o.by).name);
    st = {
      good: true,
      title: `${who} offered ${money(best.o.price)}`,
      sub: `Can come ${low(whenText(best.o.when))}. ${offers.length > 1 ? `${offers.length} offers so far.` : 'Still asking the others.'}`,
      acts: [
        { label: `Book ${who}`, main: true, run: () => openBook({ worker: best.o.by, need: po.title || '', postId: po.id, offer: best.i }) },
        { label: offers.length > 1 ? `See ${offers.length} offers` : 'See the offer', run: () => router.push(`/offers/${po.id}` as any) },
      ],
    };
  } else if (near === 0)
    st = {
      title: `No ${many} on getit near you yet`,
      sub: keep ? 'OK. Your request stays open, and we’ll tell you the moment someone who offers this joins.' : `Your request stays open. Still need a ${one}?`,
      acts: keep ? [] : [{ label: 'Yes, keep it open', main: true, run: () => setKeep(true) }, { label: 'Change details', run: () => openRequest({ trade, need: po.title || '', postId: po.id }) }],
    };
  else if (mins > 12)
    st = {
      title: 'No one’s free yet',
      sub: keep ? 'OK, still asking. We’ll tell you the moment someone answers.' : `All ${many} nearby have your request. Still need a ${one}?`,
      acts: keep ? [{ label: 'Call someone', run: callSomeone }] : [{ label: 'Keep waiting', main: true, run: () => setKeep(true) }, { label: 'Call someone', run: callSomeone }, { label: 'Change time', run: () => openRequest({ trade, need: po.title || '', postId: po.id }) }],
    };
  else st = { title: near ? `Asking ${near} ${near === 1 ? one : many} near you` : `Asking ${many} near you`, sub: 'We’ll update you here as they answer. You can close getit.', acts: [] };
  const cancel = () =>
    confirm({
      title: 'Cancel this request?',
      text: offers.length ? 'The workers who sent a price are told.' : 'Workers stop seeing it.',
      ok: 'Cancel request',
      cancel: 'Keep it',
      danger: true,
      onOk: () => {
        closeJob(po.id);
        goBack();
      },
    });
  return (
    <View style={{ flex: 1, backgroundColor: t.bg, paddingTop: ins.top + 16, paddingHorizontal: 20, paddingBottom: ins.bottom + 28 }}>
      <Top close pad={0} />
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 20 }}>
        {st.good ? (
          <Halo size={220} core={116} color="#ff3b1f">
            <LogoDot size={116} />
          </Halo>
        ) : (
          <Pulse size={220} core={116} rings={2} period={2400}>
            <LogoDot size={116} />
          </Pulse>
        )}
        <View testID="asked-status" accessibilityRole="summary" accessibilityLiveRegion="polite" style={{ flexDirection: 'row', gap: 12, alignSelf: 'stretch', padding: 16, borderRadius: 22, backgroundColor: t.card, borderWidth: 1, borderColor: t.line }}>
          <View style={{ marginTop: 2 }}>{st.good ? <GIcon name="check" size={20} color={GOOD} sw={2.6} /> : <GIcon name="clock" size={20} color={t.accent} />}</View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <T s={17} w={8} lh={1.3}>
              {st.title}
            </T>
            <T s={14} lh={1.45} c="muted" style={{ marginTop: 4 }}>
              {st.sub}
            </T>
            {st.acts.length ? (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
                {st.acts.map((a) => (
                  <Pressable key={a.label} testID={`asked-act-${a.label}`} accessibilityRole="button" onPress={() => (tap(), a.run())} style={{ height: 40, paddingHorizontal: 14, borderRadius: 20, borderWidth: 1, borderColor: a.main ? RED : t.line, backgroundColor: a.main ? RED : 'transparent', justifyContent: 'center' }}>
                    <T s={14} w={7} c={a.main ? '#ffffff' : t.text}>
                      {a.label}
                    </T>
                  </Pressable>
                ))}
              </View>
            ) : null}
          </View>
        </View>
      </View>
      <View style={{ padding: 16, borderRadius: 22, backgroundColor: t.card, borderWidth: 1, borderColor: t.line }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <T s={16} w={8} lines={2} style={{ flex: 1 }}>
            {po.title}
          </T>
          <Link testID="asked-edit" title="Edit" h={36} onPress={() => openRequest({ trade, need: po.title || '', postId: po.id })} style={{ paddingHorizontal: 8 }} />
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 }}>
          <GIcon name="clock" size={16} color={t.muted} />
          <T s={14} c="muted">
            {whenText(po.when) || 'Any time'}
          </T>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 }}>
          <GIcon name="pin" size={16} color={t.muted} />
          <T s={14} c="muted">
            {po.area || areaLabel()}
          </T>
        </View>
      </View>
      <Link testID="asked-cancel" title="Cancel request" color="text" h={48} style={{ marginTop: 12 }} onPress={cancel} />
    </View>
  );
}
