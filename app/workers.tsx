import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Share, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { db } from '../src/data/db';
import { useLive } from '../src/logic/live';
import { fname } from '../src/logic/core';
import { loadReviewsOf } from '../src/logic/server';
import { startCall } from '../src/logic/calls';
import { tap } from '../src/g/touch';
import { withAccount } from '../src/g/signin';
import { openChat } from '../src/g/nav';
import { openAgentPro, openRequest } from '../src/g/sheets';
import { Tries, Want, agentLeft, triesLeft } from '../src/g/agent';
import { ratingFor, scopeOf, useServiceRatings } from '../src/g/ratings';
import { offers } from '../src/g/services';
import { canListen } from '../src/g/speech';
import { areaLabel, findWorkers, hasArea, kmText, localWorkers, plural } from '../src/g/data';
import { GIcon } from '../src/g/icons';
import { BRAND, useG } from '../src/g/theme';
import { Big, Face, Link, Round, Screen, T } from '../src/g/ui';

/** Workers found for a need: the best match on top with one tap to call, the others below. */
export default function Workers() {
  useLive();
  const t = useG();
  const ins = useSafeAreaInsets();
  const p = useLocalSearchParams<{ trade?: string; need?: string; service?: string; when?: string; budget?: string }>();
  const trade = typeof p.trade === 'string' && p.trade ? p.trade : 'Plumber';
  const need = typeof p.need === 'string' && p.need ? p.need : trade;
  const many = plural(trade);
  // the service under the skill the words pointed at ("House wiring"), and what they said about when and how much
  const service = typeof p.service === 'string' && p.service ? p.service : null;
  const when = (['now', 'today', 'tomorrow', 'week'] as Want[]).find((w) => w === p.when) || null;
  const budget = +(p.budget || 0) >= 100 ? Math.round(+p.budget!) : null;
  const [tries, setTries] = useState<Tries | null>(null);
  useEffect(() => {
    if (db.loggedIn) void agentLeft().then(setTries);
  }, []);
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
  // those who say they do this very service come first; the order among them stays (closest, then best rated)
  const does = (id: string) => offers((db.P[id].services || []).map((skill) => ({ skill })), service);
  const list = ids.filter((id) => db.P[id]).sort((a, b) => +does(b) - +does(a));
  const topId = pick && list.includes(pick) ? pick : list[0];
  const top = topId ? db.P[topId] : undefined;
  useEffect(() => {
    if (topId && !db.REVIEWS[topId]) void loadReviewsOf(topId);
  }, [topId]);
  const more = list.filter((id) => id !== topId);
  const review = topId ? (db.REVIEWS[topId] || []).find((r) => r.text) : undefined;
  const close = () => (router.canGoBack() ? router.back() : router.replace('/find' as any));
  const askPrices = () => openRequest({ trade, need, service, when, budget });
  const handIt = () => (tries && !tries.pro && tries.used >= tries.free ? openAgentPro() : openRequest({ trade, need, service, when, budget, agent: true }));
  // the top worker's ratings, per service: the number shown says what it is for
  const rows = useServiceRatings(topId || '');
  const shown = top ? ratingFor(rows, service, top.rate, +top.reviews || 0) : null;
  const scope = top ? (shown?.own && service ? `for ${service.toLowerCase()}` : scopeOf(rows, +top.reviews || 0)) : '';
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
            {(list.length ? `${list.length} ${list.length === 1 ? trade : many} near you` : state === 'loading' ? `Looking for ${many}` : many).toUpperCase()}
          </T>
          <T s={28} w={8} lh={1.15} ls={-0.6} style={{ marginTop: 4, marginBottom: 2 }}>
            {need}
          </T>
          <T s={14} c={t.muted}>
            {hasArea() ? `${areaLabel()} · free to contact` : 'Free to contact'}
          </T>
        </View>

        {top && topId ? (
          <View style={{ marginHorizontal: 16, marginTop: 16, padding: 18, borderRadius: 28, backgroundColor: t.card, borderWidth: 1, borderColor: t.line }}>
            <Pressable testID="workers-top" accessibilityRole="button" accessibilityLabel={`See ${fname(top.name)}’s profile`} onPress={() => (tap(), router.push(`/profile/${topId}${service ? `?service=${encodeURIComponent(service)}` : ''}` as any))} style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              <Face name={top.name} photo={top.photo} size={68} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <T s={20} w={8} lh={1.25} ls={0} lines={1} style={{ flexShrink: 1 }}>
                    {top.name}
                  </T>
                  {top.verified ? <GIcon name="tick" size={18} /> : null}
                </View>
                <T s={14} c={t.muted} lines={1} style={{ marginTop: 2 }}>
                  {[service && does(topId) ? service : trade, kmText(top) ? `${kmText(top)} away` : top.area].filter(Boolean).join(' · ')}
                </T>
              </View>
              <GIcon name="chev" size={18} color={t.muted} />
            </Pressable>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 16 }}>
              {stat(
                shown && shown.stars ? (
                  <>
                    {num(shown.stars.toFixed(1))}
                    <GIcon name="star" size={15} />
                  </>
                ) : (
                  num('New')
                ),
                shown && shown.stars ? 'Rating' : 'Not rated yet',
              )}
              {stat(num(shown?.n || 0), (shown?.n || 0) === 1 ? 'Rating given' : 'Ratings given')}
              {stat(num(top.jobs || 0), 'Jobs done')}
            </View>
            {shown && shown.stars && scope ? (
              <T testID="workers-scope" s={13} lh={1.45} c={t.muted} style={{ marginTop: 8 }}>
                {shown.own ? `${shown.stars.toFixed(1)} ★ is ${scope} only (${shown.n} ${shown.n === 1 ? 'rating' : 'ratings'}).` : `${shown.stars.toFixed(1)} ★ is ${scope}${service ? `, none yet for ${service.toLowerCase()}` : ''}.`} See the profile for each service.
              </T>
            ) : null}
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
              <Big testID="workers-call" icon="phone" title={`Call ${fname(top.name)}`} style={{ flex: 1 }} onPress={() => withAccount(`call ${fname(top.name)}`, () => void startCall(topId, 'voice'))} />
              <Round testID="workers-chat" icon="chat" label={`Message ${fname(top.name)}`} size={56} bg={t.card2} plain onPress={() => openChat(topId)} />
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
              {state === 'failed' ? 'Check your connection and try again.' : 'getit is new here. You can still ask for prices: your request stays open, and we tell you the moment someone who offers this joins.'}
            </T>
            {state === 'failed' ? <Big title="Try again" h={48} onPress={load} style={{ marginTop: 16, alignSelf: 'flex-start' }} /> : null}
          </View>
        )}

        <Pressable testID="workers-agent" accessibilityRole="button" onPress={() => (tap(), handIt())} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, marginHorizontal: 16, marginTop: 10, paddingVertical: 14, paddingHorizontal: 16, borderRadius: 22, borderWidth: 1, borderColor: t.accent, backgroundColor: t.card, opacity: pressed ? 0.8 : 1 })}>
          <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: BRAND, alignItems: 'center', justifyContent: 'center' }}>
            <T s={18} w={8} c="#ffffff">
              g
            </T>
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <T s={15} w={8}>
              Let getit handle it
            </T>
            <T s={13} lh={1.4} c={t.muted}>
              It asks {many}, checks prices against your budget and brings you the best offer
            </T>
            <T testID="workers-agent-left" s={12} w={7} c={t.accent} style={{ marginTop: 2 }}>
              {tries?.pro ? 'Included in getit Pro' : tries && tries.used >= tries.free ? 'Free tries used · part of getit Pro' : `${triesLeft(tries)} free ${triesLeft(tries) === 1 ? 'try' : 'tries'}`}
            </T>
          </View>
          <GIcon name="chev" size={18} color={t.muted} />
        </Pressable>

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
                        {[m.rate ? `${m.rate.toFixed(1)} ★${(m.services || []).length > 1 ? ' overall' : ''}` : 'New', kmText(m)].filter(Boolean).join(' · ')}
                      </T>
                      <T s={12} w={7} c={service && does(id) ? t.accent : t.muted} lines={1}>
                        {service && does(id) ? `Does ${service.toLowerCase()}` : (m.services || []).length ? `${m.services!.length} ${m.services!.length === 1 ? 'service' : 'services'}` : trade}
                      </T>
                    </View>
                  </Pressable>
                );
              })}
            </ScrollView>
          </>
        ) : null}
        <View style={{ alignItems: 'center', paddingTop: 12 }}>
          <Link testID="workers-change" title={canListen() ? 'Not right? Say it again' : 'Not right? Change it'} onPress={() => (canListen() ? router.replace('/listen' as any) : close())} />
        </View>
      </ScrollView>
    </Screen>
  );
}
