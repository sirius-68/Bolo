/* The offers on a request: who, how much, when, in their words. Pick one. */
import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLive } from '../../src/logic/live';
import { P, fname, kmOf, postById } from '../../src/logic/core';
import { refreshPosts } from '../../src/logic/server';
import { amount, kmText, money, whenText } from '../../src/g/data';
import { GIcon } from '../../src/g/icons';
import { Kicker, Top } from '../../src/g/parts';
import { openBook } from '../../src/g/sheets';
import { RatingText } from '../../src/g/ratings';
import { openChat } from '../../src/g/nav';
import { RED, useG } from '../../src/g/theme';
import { tap } from '../../src/g/touch';
import { Big, Face, Round, T } from '../../src/g/ui';

type Sort = 'best' | 'price' | 'soon';
const soon = (w: string) => (/now/i.test(w) ? 0 : /hour/i.test(w) ? 1 : /today/i.test(whenText(w)) ? 2 : /tomorrow/i.test(whenText(w)) ? 3 : 4);

export default function Offers() {
  useLive();
  const t = useG();
  const ins = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [sort, setSort] = useState<Sort>('best');
  useEffect(() => {
    void refreshPosts();
  }, []);
  const po = postById(id);
  const list = (po?.offerList || []).map((o, i) => ({ o, i, p: P(o.by) })).filter((x) => x.p?.name);
  // best match: sooner, closer, better rated, then cheaper (never who answered first)
  const score = (x: (typeof list)[number]) => soon(x.o.when) * 2 + (kmOf(x.p.dist) || 5) / 2 - (x.p.rate || 4) + amount(x.o.price) / 5000;
  const sorted = [...list].sort((a, b) => (sort === 'price' ? amount(a.o.price) - amount(b.o.price) : sort === 'soon' ? soon(a.o.when) - soon(b.o.when) : score(a) - score(b)));
  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingTop: ins.top + 16, paddingBottom: ins.bottom + 28 }}>
        <Top />
        <View style={{ paddingTop: 14, paddingHorizontal: 20 }}>
          <Kicker>
            {list.length} {list.length === 1 ? 'offer' : 'offers'}
          </Kicker>
          <T s={28} w={8} lh={1.15} ls={-0.6} style={{ marginTop: 4, marginBottom: 2 }}>
            {po?.title || 'Your request'}
          </T>
          <T s={14} c="muted">
            {list.length ? 'Pick one. You pay the worker directly.' : 'No offers yet. We’ll tell you the moment one arrives.'}
          </T>
        </View>
        {list.length > 1 ? (
          <View style={{ flexDirection: 'row', gap: 8, paddingTop: 16, paddingHorizontal: 20, paddingBottom: 4 }}>
            {(
              [
                ['best', 'Best match'],
                ['price', 'Lowest price'],
                ['soon', 'Soonest'],
              ] as [Sort, string][]
            ).map(([k, label]) => (
              <Pressable key={k} testID={`offers-sort-${k}`} accessibilityRole="button" accessibilityState={{ selected: sort === k }} onPress={() => (tap(), setSort(k))} style={{ height: 38, paddingHorizontal: 14, borderRadius: 19, borderWidth: 1, borderColor: sort === k ? RED : t.line, backgroundColor: sort === k ? RED : t.card, justifyContent: 'center' }}>
                <T s={13} w={7} c={sort === k ? '#ffffff' : t.text}>
                  {label}
                </T>
              </Pressable>
            ))}
          </View>
        ) : null}
        <View style={{ gap: 10, paddingTop: 10, paddingHorizontal: 16 }}>
          {sorted.map(({ o, i, p }) => {
            const f = fname(p.name);
            return (
              <View key={o.id || i} style={{ padding: 16, borderRadius: 24, backgroundColor: t.card, borderWidth: 1, borderColor: t.line }}>
                <Pressable accessibilityRole="button" accessibilityLabel={`See ${p.name}’s profile`} onPress={() => (tap(), router.push(`/profile/${o.by}${po?.service ? `?service=${encodeURIComponent(po.service)}` : ''}` as any))} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <Face name={p.name} photo={p.photo} size={52} />
                  <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                      <T s={16} w={8} lines={1} style={{ flexShrink: 1 }}>
                        {p.name}
                      </T>
                      {p.verified ? <GIcon name="tick" size={15} /> : null}
                    </View>
                    <RatingText id={o.by} service={po?.service} overall={p.rate} total={+p.reviews || 0} tail={kmText(p)} />
                  </View>
                  <T s={18} w={8}>
                    {money(o.price)}
                  </T>
                </Pressable>
                {o.msg ? (
                  <T s={14} lh={1.5} style={{ marginTop: 12 }}>
                    “{o.msg}”
                  </T>
                ) : null}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 }}>
                  <GIcon name="clock" size={15} color={t.accent} />
                  <T s={13} w={7} c="accent">
                    {whenText(o.when)}
                  </T>
                </View>
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 14 }}>
                  <Big testID={`offer-accept-${i}`} h={48} title="Accept" style={{ flex: 1 }} onPress={() => openBook({ worker: o.by, need: po?.title || '', service: po?.service, postId: po!.id, offer: i })} />
                  <Round testID={`offer-chat-${i}`} icon="chat" label={`Message ${f}`} size={48} plain bg={t.card2} onPress={() => openChat(o.by)} />
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}
