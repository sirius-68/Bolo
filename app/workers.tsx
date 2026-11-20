import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Share, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { db } from '../src/data/db';
import { useLive } from '../src/logic/live';
import { fname } from '../src/logic/core';
import { loadReviewsOf } from '../src/logic/server';
import { startCall } from '../src/logic/calls';
import { openChat } from '../src/sheets/chat';
import { toast } from '../src/ui/overlay';
import { tap } from '../src/ui/kit';
import { areaLabel, findWorkers, kmText, localWorkers, plural } from '../src/g/data';
import { GIcon } from '../src/g/icons';
import { BRAND, useG } from '../src/g/theme';
import { Big, Face, Link, Round, Screen, T } from '../src/g/ui';

/** Contacting someone needs an account: say so, and take people to create one (free, a minute). */
function needAccount(what: string) {
  if (db.loggedIn) return false;
  db.user.intents = ['hire'];
  db.user.bizOnly = false;
  toast(`Create your free account to ${what}`);
  router.push('/signup');
  return true;
}

/** Workers found for a need: the best match on top with one tap to call, the others below. */
export default function Workers() {
  useLive();
  const t = useG();
  const ins = useSafeAreaInsets();
  const p = useLocalSearchParams<{ trade?: string; need?: string }>();
  const trade = typeof p.trade === 'string' && p.trade ? p.trade : 'Plumber';
  const need = typeof p.need === 'string' && p.need ? p.need : trade;
  const many = plural(trade);
  const [ids, setIds] = useState<string[]>(() => localWorkers(trade));
  const [state, setState] = useState<'loading' | 'ok' | 'failed'>('loading');
  const [pick, setPick] = useState<string | null>(null);
  const load = () => {
    setState('loading');
    findWorkers(trade).then((r) => {
      setIds(r.ids);
      setState(r.failed ? 'failed' : 'ok');
    });
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(load, [trade]);
  const list = ids.filter((id) => db.P[id]);
  const topId = pick && list.includes(pick) ? pick : list[0];
  const top = topId ? db.P[topId] : undefined;
  useEffect(() => {
    if (topId && !db.REVIEWS[topId]) void loadReviewsOf(topId);
  }, [topId]);
  const more = list.filter((id) => id !== topId);
  const review = topId ? (db.REVIEWS[topId] || []).find((r) => r.text) : undefined;
  const close = () => (router.canGoBack() ? router.back() : router.replace('/find' as any));
  const askPrices = () => {
    if (needAccount('ask for prices')) return;
    router.push(`/post-job?title=${encodeURIComponent(need)}&cat=${encodeURIComponent(trade)}` as any);
  };
  const stat = (value: React.ReactNode, label: string) => (
    <View style={{ flex: 1, paddingVertical: 10, paddingHorizontal: 6, borderRadius: 16, backgroundColor: t.card2, alignItems: 'center' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>{value}</View>
      <T s={12} c={t.muted} style={{ marginTop: 2 }}>
        {label}
      </T>
    </View>
  );
  const num = (x: string | number) => (
    <T s={17} w={8}>
      {x}
    </T>
  );
  return (
    <Screen top={0}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 28 + ins.bottom }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 16 }}>
          <Round testID="workers-close" icon="x" label="Back" onPress={close} />
          <Round icon="share" label="Share" onPress={() => void Share.share({ message: `I’m looking for help with “${need}” on getit.` }).catch(() => {})} />
        </View>
        <View style={{ paddingHorizontal: 20, paddingTop: 14 }}>
          <T s={13} w={8} ls={0.4} c={t.accent}>
            {(state === 'loading' && !list.length ? `Looking for ${many}` : `${list.length} ${list.length === 1 ? trade : many} near you`).toUpperCase()}
          </T>
          <T s={28} w={8} lh={1.15} ls={-0.6} style={{ marginTop: 4, marginBottom: 2 }}>
            {need}
          </T>
          <T s={14} c={t.muted}>
            {areaLabel()} · free to contact
          </T>
        </View>

        {top && topId ? (
          <View style={{ marginHorizontal: 16, marginTop: 16, padding: 18, borderRadius: 28, backgroundColor: t.card, borderWidth: 1, borderColor: t.line }}>
            <Pressable testID="workers-top" accessibilityRole="button" accessibilityLabel={`See ${fname(top.name)}’s profile`} onPress={() => (tap(), router.push(`/profile/${topId}` as any))} style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              <Face name={top.name} photo={top.photo} size={68} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <T s={20} w={8} lh={1.25} ls={0} lines={1} style={{ flexShrink: 1 }}>
                    {top.name}
                  </T>
                  {top.verified ? <GIcon name="tick" size={18} /> : null}
                </View>
                <T s={14} c={t.muted} lines={1} style={{ marginTop: 2 }}>
                  {[trade, kmText(top) ? `${kmText(top)} away` : top.area].filter(Boolean).join(' · ')}
                </T>
              </View>
              <GIcon name="chev" size={18} color={t.muted} />
            </Pressable>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 16 }}>
              {stat(
                top.rate ? (
                  <>
                    {num(top.rate.toFixed(1))}
                    <GIcon name="star" size={15} />
                  </>
                ) : (
                  num('New')
                ),
                'Rating',
              )}
              {stat(num(top.jobs || 0), 'Jobs done')}
              {stat(num(top.years ? `${top.years} yr` : '–'), 'Experience')}
            </View>
            {review ? (
              <T s={14} lh={1.5} lines={3} style={{ marginTop: 14 }}>
                “{review.text}”{' '}
                <T s={14} lh={1.5} c={t.muted}>
                  · {fname(review.name)}, {review.time}
                </T>
              </T>
            ) : top.about ? (
              <T s={14} lh={1.5} c={t.muted} lines={3} style={{ marginTop: 14 }}>
                {top.about}
              </T>
            ) : null}
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
              <Big testID="workers-call" icon="phone" title={`Call ${fname(top.name)}`} style={{ flex: 1 }} onPress={() => !needAccount(`call ${fname(top.name)}`) && void startCall(topId, 'voice')} />
              <Round testID="workers-chat" icon="chat" label={`Message ${fname(top.name)}`} size={56} bg={t.card2} plain onPress={() => !needAccount(`message ${fname(top.name)}`) && openChat(topId)} />
            </View>
          </View>
        ) : state === 'loading' ? (
          <View style={{ height: 260, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator color={BRAND} />
          </View>
        ) : (
          <View style={{ marginHorizontal: 16, marginTop: 16, padding: 20, borderRadius: 28, backgroundColor: t.card, borderWidth: 1, borderColor: t.line }}>
            <T s={20} w={8} lh={1.25} ls={0}>
              {state === 'failed' ? 'We couldn’t look right now' : `No ${many} on getit near you yet`}
            </T>
            <T s={14} lh={1.5} c={t.muted} style={{ marginTop: 6 }}>
              {state === 'failed' ? 'Check your connection and try again.' : 'getit is new here. You can still ask for prices: your request stays open, and we tell you the moment someone answers.'}
            </T>
            {state === 'failed' ? <Big title="Try again" h={48} onPress={load} style={{ marginTop: 16, alignSelf: 'flex-start' }} /> : null}
          </View>
        )}

        <Pressable testID="workers-prices" accessibilityRole="button" onPress={() => (tap(), askPrices())} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, marginHorizontal: 16, marginTop: 10, paddingVertical: 14, paddingHorizontal: 16, borderRadius: 22, borderWidth: 1, borderColor: t.line, backgroundColor: t.card, opacity: pressed ? 0.8 : 1 })}>
          <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: t.tabOn, alignItems: 'center', justifyContent: 'center' }}>
            <GIcon name="bell" size={20} color={t.accent} />
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <T s={15} w={8}>
              Get prices from {many} nearby
            </T>
            <T s={13} c={t.muted}>
              They send offers, you pick one. We keep you posted
            </T>
          </View>
          <GIcon name="chev" size={18} color={t.muted} />
        </Pressable>

        {more.length ? (
          <>
            <T s={17} w={8} style={{ marginHorizontal: 20, marginTop: 22, marginBottom: 10 }}>
              More {many} nearby
            </T>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 4, gap: 10 }}>
              {more.map((id) => {
                const m = db.P[id];
                return (
                  <Pressable key={id} testID={`workers-more-${id}`} accessibilityRole="button" accessibilityLabel={`Show ${m.name}`} onPress={() => (tap(), setPick(id))} style={({ pressed }) => ({ width: 196, padding: 14, gap: 10, borderRadius: 22, borderWidth: 1, borderColor: t.line, backgroundColor: t.card, opacity: pressed ? 0.8 : 1 })}>
                    <Face name={m.name} photo={m.photo} size={44} />
                    <View style={{ gap: 2 }}>
                      <T s={15} w={8} lines={1}>
                        {m.name}
                      </T>
                      <T s={13} c={t.muted} lines={1}>
                        {[m.rate ? `${m.rate.toFixed(1)} ★` : 'New', kmText(m)].filter(Boolean).join(' · ')}
                      </T>
                    </View>
                  </Pressable>
                );
              })}
            </ScrollView>
          </>
        ) : null}
        <View style={{ alignItems: 'center', paddingTop: 12 }}>
          <Link testID="workers-change" title="Not right? Change it" onPress={close} />
        </View>
      </ScrollView>
    </Screen>
  );
}
