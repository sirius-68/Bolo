/* A booked job, step by step, in the getit design. The same screen serves both sides:
   the person who booked sees where the worker is and confirms at the end; the worker moves the job along
   with one button at the bottom (leave, arrive, done). */
import React, { useEffect, useRef, useState } from 'react';
import { ratingText, useServiceRatings } from '../../src/g/ratings';
import { Animated, Easing, Pressable, ScrollView, Share, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { P, fname, nowT, pinOf } from '../../src/logic/core';
import { useLive } from '../../src/logic/live';
import { bk, confirmDone, trOther, wArrive, wDone, wStart } from '../../src/logic/work';
import { money, whenText } from '../../src/g/data';
import { openChat } from '../../src/g/nav';
import { Gone } from '../../src/g/parts';
import { RouteMap } from '../../src/g/RouteMap';
import { openBook, openCancel, openProblem, openRate } from '../../src/g/sheets';
import { goBack, tap } from '../../src/g/touch';
import { hasMapbox } from '../../src/lib/mapbox';
import { db } from '../../src/data/db';
import { refreshBooking } from '../../src/logic/server';
import { callsAvailable, startCall } from '../../src/logic/calls';
import { GIcon, GIconName } from '../../src/g/icons';
import { Big, Face, Ghost, Link, Round, T } from '../../src/g/ui';
import { BRAND, RED, useG } from '../../src/g/theme';

const STEPS: [string, string][] = [
  ['booked', 'Booked'],
  ['onway', 'On the way'],
  ['working', 'Working'],
  ['done', 'Done'],
];

/** One soft ring growing out from behind the picture while the work is going on. */
function Pulse({ children }: { children: React.ReactNode }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const run = Animated.loop(Animated.timing(v, { toValue: 1, duration: 2400, easing: Easing.out(Easing.quad), useNativeDriver: true }));
    run.start();
    return () => run.stop();
  }, [v]);
  return (
    <View style={{ width: 170, height: 170, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View pointerEvents="none" style={{ position: 'absolute', width: 96, height: 96, borderRadius: 48, backgroundColor: BRAND, opacity: v.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0] }), transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [1, 1.77] }) }] }} />
      {children}
    </View>
  );
}

export default function Track() {
  useLive();
  const t = useG();
  const { id } = useLocalSearchParams<{ id: string }>();
  const ins = useSafeAreaInsets();
  const b = bk(id);
  // one step at a time: the button shows it's working, and a second tap can't send the step twice
  const [busy, setBusy] = useState(false);
  const run = async (fn: () => Promise<any>) => {
    if (busy) return;
    setBusy(true);
    try {
      await fn();
    } finally {
      setBusy(false);
    }
  };
  // opened from a notification before the booking was loaded
  useEffect(() => {
    if (id && !bk(id)) void refreshBooking(id);
  }, [id]);
  // the worker's rating, for the service this job is for when they have one (else said as combined)
  const them = b && b.worker !== 'me' ? b.worker : '';
  const theirRows = useServiceRatings(them);
  if (!b) return <Gone title="This job isn’t here any more" text="It may have been cancelled." />;
  const theirRating = them && P(them)?.rate ? ratingText(theirRows, b.service, P(them).rate, +P(them).reviews || 0) : '';
  const W = b.worker === 'me';
  const oid = trOther(b);
  const o = P(oid);
  const f = fname(o.name);
  const idx = b.state === 'confirmed' ? STEPS.length : STEPS.findIndex((s) => s[0] === b.state);
  const prog = b.state === 'booked' ? 0 : b.state === 'onway' ? Math.max(0.06, b.eta0 ? 1 - b.eta / b.eta0 : 0.1) : 1;
  // real places only: where the job is (shared when it was booked), or the client's own position on their phone
  const dest: [number, number] | null = b.dest || (W ? null : db.user.coord || null);
  const workerAt = b.state === 'onway' ? b.live || (W ? db.user.coord : P(b.worker).coord) || null : null;
  const fresh = b.liveAt ? Math.round((Date.now() - b.liveAt) / 1000) : null;
  const started = b.log.working || nowT();
  const map = b.state === 'onway' && hasMapbox && (dest || workerAt);

  const Hero = ({ icon, title, sub, red }: { icon: GIconName; title: string; sub: string; red?: boolean }) => (
    <View style={{ alignItems: 'center', paddingTop: red ? 18 : 26, paddingHorizontal: 24 }}>
      {red ? (
        <View style={{ width: 132, height: 132, borderRadius: 66, backgroundColor: t.ringB, alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ width: 76, height: 76, borderRadius: 38, backgroundColor: RED, alignItems: 'center', justifyContent: 'center' }}>
            <GIcon name={icon} size={36} color="#ffffff" sw={2.6} />
          </View>
        </View>
      ) : (
        <View style={{ width: 88, height: 88, borderRadius: 44, backgroundColor: t.tabOn, alignItems: 'center', justifyContent: 'center' }}>
          <GIcon name={icon} size={40} color={t.accent} />
        </View>
      )}
      <T s={24} w={8} ls={-0.5} lh={1.2} center style={{ marginTop: red ? 10 : 16 }}>
        {title}
      </T>
      <T s={14} c={t.muted} center style={{ marginTop: 4 }}>
        {sub}
      </T>
    </View>
  );
  const Info = ({ icon, children }: { icon: GIconName; children: React.ReactNode }) => (
    <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start', marginHorizontal: 16, marginTop: 16, paddingVertical: 12, paddingHorizontal: 14, borderRadius: 18, backgroundColor: t.tabOn }}>
      <View style={{ marginTop: 1 }}>
        <GIcon name={icon} size={18} color={t.accent} />
      </View>
      <T s={14} lh={1.45} style={{ flex: 1 }}>
        {children}
      </T>
    </View>
  );
  const Pay = ({ title, sub }: { title: string; sub: string }) => (
    <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center', marginHorizontal: 16, marginTop: 16, paddingVertical: 14, paddingHorizontal: 16, borderRadius: 20, backgroundColor: t.card, borderWidth: 1, borderColor: t.line }}>
      <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: t.tabOn, alignItems: 'center', justifyContent: 'center' }}>
        <GIcon name="wallet" size={20} color={t.accent} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <T s={16} w={8}>
          {title}
        </T>
        <T s={13} c={t.muted} style={{ marginTop: 2 }}>
          {sub}
        </T>
      </View>
    </View>
  );

  let top: React.ReactNode = null;
  if (b.state === 'booked')
    top = W ? (
      <Hero icon="calendar" title={`${b.title} · ${whenText(b.when)}`} sub={`Tap the button when you leave, so ${f} can follow you.`} />
    ) : (
      <Hero icon="calendar" title={`Booked for ${whenText(b.when)}`} sub={`${f} will let you know when leaving.`} />
    );
  else if (b.state === 'onway')
    top = (
      <>
        {map ? (
          <View style={{ marginHorizontal: 16, marginTop: 16, borderRadius: 24, overflow: 'hidden', borderWidth: 1, borderColor: t.line }}>
            <RouteMap from={workerAt || dest!} to={dest || workerAt!} live={workerAt} name={W ? db.user.name || 'You' : P(b.worker).name} photo={W ? db.user.avatar : P(b.worker).photo} height={200} />
            {b.eta ? (
              <View style={{ position: 'absolute', left: 12, top: 12, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 14, backgroundColor: t.card }}>
                <T s={14} w={8}>
                  {W ? `${f} sees you · ${b.eta} min` : `Arrives in ${b.eta} min`}
                </T>
              </View>
            ) : null}
          </View>
        ) : null}
        {map ? (
          <View style={{ paddingTop: 16, paddingHorizontal: 20 }}>
            <T s={24} w={8} ls={-0.5}>
              {W ? `On your way to ${f}` : `${f} is on the way`}
            </T>
            <T s={14} c={t.muted} style={{ marginTop: 4 }}>
              {W ? b.area || `${f} can follow you on the map` : b.eta ? `About ${b.eta} min away${fresh != null && fresh > 90 ? ` · seen ${Math.round(fresh / 60)} min ago` : ''}` : 'You’ll get a message on arrival.'}
            </T>
          </View>
        ) : (
          <Hero icon="pin" title={W ? `On your way to ${f}` : `${f} is on the way`} sub={W ? b.area || 'Call or message if you can’t find the place.' : b.eta ? `About ${b.eta} min away` : 'You’ll get a message on arrival.'} />
        )}
        {!W ? (
          <Info icon="shield">
            Your job code is <T s={14} w={8} ls={2}>{pinOf(b.id)}</T>. Give it to {f} on arrival.
          </Info>
        ) : null}
      </>
    );
  else if (b.state === 'working')
    top = (
      <View style={{ alignItems: 'center', paddingTop: 16, paddingHorizontal: 24 }}>
        <Pulse>
          <Face name={W ? db.user.name || 'You' : o.name} photo={W ? db.user.avatar : o.photo} size={96} />
        </Pulse>
        <T s={24} w={8} ls={-0.5} center style={{ marginTop: 6 }}>
          {W ? 'Working' : `${f} is working`}
        </T>
        <T s={14} c={t.muted} center style={{ marginTop: 4 }}>
          Started at {started}
        </T>
      </View>
    );
  else if (b.state === 'done')
    top = W ? (
      <>
        <Hero red icon="check" title={`Waiting for ${f}`} sub="You marked the job as done." />
        <Pay title={`Collect ${money(b.price)}`} sub={`Cash or Mobile Money, from ${f}`} />
      </>
    ) : (
      <>
        <Hero red icon="check" title={`${f} says the job is done`} sub="Check the work, then confirm." />
        <Pay title={`Pay ${f} ${money(b.price)}`} sub={`Cash or Mobile Money, straight to ${f}`} />
        <View style={{ gap: 10, paddingTop: 14, paddingHorizontal: 16 }}>
          <Big testID="tk-confirm" title="Yes, all good" onPress={() => (confirmDone(b.id), openRate(b.id, () => router.replace(`/thanks?b=${b.id}` as any)))} />
          <Ghost testID="tk-problem" title="Not yet, something’s wrong" onPress={() => openProblem(b.id)} />
        </View>
      </>
    );
  else
    top = (
      <>
        <Hero red icon="check" title="Job complete" sub={W ? `${f} confirmed. Agreed price: ${money(b.price)}.` : `Agreed price: ${money(b.price)}. Pay ${f} directly if you haven’t yet.`} />
        <View style={{ gap: 10, paddingTop: 16, paddingHorizontal: 16 }}>
          {b.reviewed ? (
            <T s={14} c={t.muted} center>
              Thanks for your review.
            </T>
          ) : (
            <Big testID="tk-rate" title={`Rate ${f}`} onPress={() => openRate(b.id, () => router.replace((W ? `/wclosed?b=${b.id}` : `/thanks?b=${b.id}`) as any))} />
          )}
          {!W ? <Ghost title={`Book ${f} again`} onPress={() => openBook({ worker: oid, need: b.title, service: b.service })} /> : null}
        </View>
      </>
    );

  // the worker's one next step, on a bar at the bottom
  const next: { title: string; run: () => Promise<any>; testID: string } | null = !W
    ? null
    : b.state === 'booked'
      ? { title: 'I’m leaving now', run: () => wStart(b.id), testID: 'tk-start' }
      : b.state === 'onway'
        ? { title: 'I’ve arrived', run: () => wArrive(b.id), testID: 'tk-arrive' }
        : b.state === 'working'
          ? { title: 'The job is done', run: () => wDone(b.id), testID: 'tk-done' }
          : null;
  const details: [string, string][] = ([
    ['Job', b.title],
    ['When', whenText(b.when)],
    ['Price', /\d/.test(b.price) ? `${money(b.price)} · ${W ? `${f} pays you directly` : `you pay ${f} directly`}` : b.price],
    ['Where', b.area],
  ] as [string, string][]).filter((x) => !!x[1]);
  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingTop: ins.top + 16, paddingBottom: (next ? 0 : ins.bottom) + 28 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20 }}>
          <Round testID="tk-back" icon="back" label="Back" onPress={goBack} />
          <T s={16} w={8}>
            {W ? `Job for ${f}` : 'Your job'}
          </T>
          <Round testID="tk-chat" icon="chat" label={`Message ${f}`} onPress={() => openChat(oid)} />
        </View>
        {b.log.issue && b.state === 'working' ? (
          <Info icon="flag">{W ? `${f} reported a problem. Sort it out together, then mark the job done again.` : `You reported a problem. ${f} has been told and will come back to finish.`}</Info>
        ) : null}
        {top}
        <View style={{ flexDirection: 'row', gap: 6, marginHorizontal: 16, marginTop: 20 }}>
          {STEPS.map(([key, label], j) => {
            const on = j <= idx;
            return (
              <View key={key} style={{ flex: 1 }} accessibilityLabel={`${label}${j < idx ? ', done' : j === idx ? ', now' : ''}`}>
                <View style={{ height: 4, borderRadius: 2, backgroundColor: on ? BRAND : t.line }} />
                <T s={12} w={7} c={on ? t.text : t.muted} lines={1} style={{ marginTop: 6 }}>
                  {label}
                </T>
              </View>
            );
          })}
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginHorizontal: 16, marginTop: 16, paddingVertical: 12, paddingHorizontal: 14, borderRadius: 20, backgroundColor: t.card, borderWidth: 1, borderColor: t.line }}>
          <Pressable accessibilityRole="button" accessibilityLabel={`${o.name}’s profile`} onPress={() => (tap(), W ? undefined : router.push(`/profile/${oid}` as any))} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
            <Face name={o.name} photo={o.photo} size={48} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                <T s={15} w={8} lines={1} style={{ flexShrink: 1 }}>
                  {o.name}
                </T>
                {o.verified ? <GIcon name="tick" size={15} /> : null}
              </View>
              <T s={13} c={t.muted} lines={1} style={{ marginTop: 2 }}>
                {W ? [o.crate ? `${o.crate.toFixed(1)} ★ as a client` : '', 'Client'].filter(Boolean).join(' · ') : [theirRating, b.service || o.role].filter(Boolean).join(' · ')}
              </T>
            </View>
          </Pressable>
          {callsAvailable() ? <Round testID="tk-call" icon="phone" label={`Call ${f}`} plain bg={RED} color="#ffffff" onPress={() => startCall(oid, 'voice')} /> : null}
          <Round icon="chat" label={`Message ${f}`} plain bg={t.card2} onPress={() => openChat(oid)} />
        </View>
        <View style={{ marginHorizontal: 16, marginTop: 10, paddingVertical: 4, paddingHorizontal: 16, borderRadius: 20, backgroundColor: t.card, borderWidth: 1, borderColor: t.line }}>
          {details.map(([label, value], j) => (
            <View key={label} style={{ paddingVertical: 12, borderBottomWidth: j < details.length - 1 ? 1 : 0, borderBottomColor: t.line }}>
              <T s={12} w={7} c={t.muted}>
                {label}
              </T>
              <T s={15} w={7} style={{ marginTop: 2 }}>
                {value}
              </T>
            </View>
          ))}
        </View>
        {b.state !== 'confirmed' ? (
          <View style={{ alignItems: 'center', paddingTop: 10 }}>
            <Link
              testID="tk-share"
              icon="share"
              title="Share this job with someone you trust"
              color="text"
              w={6}
              onPress={() =>
                void Share.share({ message: `My getit job: ${b.title}, ${whenText(b.when)}${b.area ? ', ' + b.area : ''}. With ${o.name}${W ? ' (client)' : ` (${o.role})`}.` }).catch(() => {})
              }
            />
          </View>
        ) : null}
        {b.state === 'booked' || (!W && b.state === 'onway') ? (
          <View style={{ alignItems: 'center' }}>
            <Link testID="tk-cancel" title="Cancel job" color="danger" onPress={() => openCancel(b.id)} />
          </View>
        ) : null}
      </ScrollView>
      {next ? (
        <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: ins.bottom + 16, borderTopWidth: 1, borderTopColor: t.line, backgroundColor: t.bg }}>
          <Big testID={next.testID} title={next.title} loading={busy} onPress={() => run(next.run)} />
        </View>
      ) : null}
    </View>
  );
}
