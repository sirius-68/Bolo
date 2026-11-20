/* A worker's profile as a client sees it: who they are, what they charge, their work, what clients said. */
import React, { useEffect } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { db } from '../data/db';
import { useLive } from '../logic/live';
import { P, aboutOf, fname, has, profileRaw } from '../logic/core';
import { loadPerson } from '../logic/server';
import { startCall } from '../logic/calls';
import { toggleSave } from '../logic/work';
import { openChat } from '../sheets/chat';
import { openHire, openMedia } from '../sheets/work';
import { tap } from '../ui/kit';
import { withAccount } from './signin';
import { kmText } from './data';
import { GIcon } from './icons';
import { RED, useG } from './theme';
import { Big, Face, Round, Screen, T } from './ui';

/** "5,000 FCFA per hour" from a listed service; "Ask for a price" when none was given. */
function priceOf(x: any): string {
  if (typeof x.price === 'number' && x.price > 0) return `${x.price.toLocaleString('en-US')} FCFA${x.unit ? ' ' + x.unit : ''}`;
  const s = String(x.price || '').trim();
  return s ? s.replace(/^XAF\s*/i, '') + (/^XAF/i.test(s) ? ' FCFA' : '') : 'Ask for a price';
}

export function WorkerProfile({ id }: { id: string }) {
  useLive();
  const t = useG();
  const ins = useSafeAreaInsets();
  // fresh numbers, bio and reviews every time the profile opens
  useEffect(() => {
    void loadPerson(id);
  }, [id]);
  const p = P(id);
  const f = fname(p.name);
  const saved = has(db.saved, id);
  const about = aboutOf(id);
  const prices: [string, string][] = ((profileRaw(id)?.services || []) as any[]).filter((x) => x && x.pub !== false && !x.draft && x.skill).map((x) => [String(x.skill), priceOf(x)]);
  // photos they shared of their work
  const photos = db.POSTS.filter((x) => x.by === id && x.kind !== 'request')
    .flatMap((x) => [x.src, ...(x.photos || [])])
    .filter((u): u is string => typeof u === 'string' && u.startsWith('uri:'))
    .slice(0, 9);
  const reviews = db.REVIEWS[id] || [];
  const where = [p.role !== 'Member' ? p.role : '', p.area, kmText(p) ? `${kmText(p)} away` : ''].filter(Boolean).join(' · ');
  // how they work, as they said when joining (older profiles have none of this, and show nothing)
  const ar = (profileRaw(id)?.area || {}) as { ways?: string[]; radius?: number };
  const ways = Array.isArray(ar.ways) ? ar.ways : [];
  const how = [ways.includes('go') ? (ar.radius && ar.radius < 50 ? `Comes to you, up to ${ar.radius} km` : 'Comes to you') : '', ways.includes('come') ? 'Has a shop' : '', ways.includes('online') ? 'Works online' : ''].filter(Boolean).join(' · ');
  const stat = (value: string, label: string) => (
    <View style={{ flex: 1, paddingVertical: 10, paddingHorizontal: 6, borderRadius: 16, backgroundColor: t.card, borderWidth: 1, borderColor: t.line, alignItems: 'center' }}>
      <T s={17} w={8}>
        {value}
      </T>
      <T s={12} c={t.muted} style={{ marginTop: 2 }}>
        {label}
      </T>
    </View>
  );
  const h2 = (text: string, gap = 6) => (
    <T s={17} w={8} style={{ marginTop: 24, marginBottom: gap }}>
      {text}
    </T>
  );
  return (
    <Screen top={0}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 16 }}>
          <Round testID="profile-back" icon="back" label="Back" onPress={() => (router.canGoBack() ? router.back() : router.replace('/find' as any))} />
          <Pressable
            testID="profile-save"
            accessibilityRole="button"
            accessibilityLabel={saved ? `Remove ${f} from saved` : `Save ${f}`}
            accessibilityState={{ selected: saved }}
            onPress={() => (tap(), withAccount(`save ${f}`, () => toggleSave(id)))}
            style={({ pressed }) => ({ width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: t.line, backgroundColor: t.card, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.7 : 1 })}
          >
            <GIcon name="heart" size={20} color={saved ? RED : t.text} fill={saved ? RED : 'none'} />
          </Pressable>
        </View>
        <View style={{ alignItems: 'center', paddingHorizontal: 20, paddingTop: 6 }}>
          <Face name={p.name} photo={p.photo} size={96} />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12 }}>
            <T s={24} w={8} lh={1.25} ls={-0.5} center lines={2} style={{ flexShrink: 1 }}>
              {p.name}
            </T>
            {p.verified ? (
              <View accessible accessibilityLabel="ID checked by getit">
                <GIcon name="tick" size={20} />
              </View>
            ) : null}
          </View>
          {where ? (
            <T s={14} c={t.muted} center style={{ marginTop: 4 }}>
              {where}
            </T>
          ) : null}
          {how ? (
            <T s={13} w={7} c={t.accent} center style={{ marginTop: 6 }}>
              {how}
            </T>
          ) : null}
        </View>
        <View style={{ flexDirection: 'row', gap: 8, marginHorizontal: 16, marginTop: 18 }}>
          {stat(p.rate ? `${p.rate.toFixed(1)} ★` : 'New', 'Rating')}
          {stat(String(p.jobs || 0), 'Jobs done')}
          {stat(p.years ? `${p.years} yr` : '–', 'Experience')}
        </View>
        <View style={{ paddingHorizontal: 20 }}>
          {about.bio ? (
            <>
              {h2('About')}
              <T s={15} lh={1.55}>
                {about.bio}
              </T>
            </>
          ) : null}
          {prices.length ? (
            <>
              {h2('Prices', 4)}
              {prices.map(([name, price], i) => (
                <View key={name + i} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, minHeight: 48, borderBottomWidth: 1, borderBottomColor: t.line }}>
                  <T s={15} style={{ flex: 1 }}>
                    {name}
                  </T>
                  <T s={15} w={8}>
                    {price}
                  </T>
                </View>
              ))}
            </>
          ) : null}
          {photos.length ? (
            <>
              {h2('Photos of past work', 10)}
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {photos.map((u, i) => (
                  <Pressable key={u + i} accessibilityRole="imagebutton" accessibilityLabel={`Photo ${i + 1} of ${f}’s work`} onPress={() => openMedia(u)} style={{ width: '31.5%', aspectRatio: 1, borderRadius: 16, overflow: 'hidden', backgroundColor: t.card2 }}>
                    <Image source={{ uri: u.slice(4) }} style={{ width: '100%', height: '100%' }} contentFit="cover" transition={120} />
                  </Pressable>
                ))}
              </View>
            </>
          ) : null}
          {h2(`Reviews · ${reviews.length || p.reviews || 0}`, 10)}
          {reviews.length ? (
            <View style={{ gap: 10 }}>
              {reviews.map((r, i) => (
                <View key={i} style={{ padding: 14, borderRadius: 18, backgroundColor: t.card, borderWidth: 1, borderColor: t.line }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                    <T s={14} w={8} lines={1} style={{ flexShrink: 1 }}>
                      {r.name}
                    </T>
                    <T s={12} c={t.muted}>
                      {r.time}
                    </T>
                  </View>
                  <T s={13} w={7} c={t.accent} style={{ marginTop: 4 }}>
                    {[`${r.stars} ★`, ...(r.tags || [])].join(' · ')}
                  </T>
                  {r.text ? (
                    <T s={14} lh={1.5} style={{ marginTop: 6 }}>
                      {r.text}
                    </T>
                  ) : null}
                </View>
              ))}
            </View>
          ) : (
            <T s={14} lh={1.5} c={t.muted}>
              No reviews yet. {f} is new on getit.
            </T>
          )}
          <Pressable testID="profile-book" accessibilityRole="button" onPress={() => (tap(), withAccount(`book ${f}`, () => openHire(id)))} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 24, paddingVertical: 14, paddingHorizontal: 16, borderRadius: 22, borderWidth: 1, borderColor: t.line, backgroundColor: t.card, opacity: pressed ? 0.8 : 1 })}>
            <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: t.tabOn, alignItems: 'center', justifyContent: 'center' }}>
              <GIcon name="calendar" size={20} color={t.accent} />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <T s={15} w={8}>
                Already agreed with {f}?
              </T>
              <T s={13} c={t.muted}>
                Book the job so you can both follow it
              </T>
            </View>
            <GIcon name="chev" size={18} color={t.muted} />
          </Pressable>
        </View>
      </ScrollView>
      <View style={{ flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 24 + ins.bottom, borderTopWidth: 1, borderTopColor: t.line, backgroundColor: t.bg }}>
        <Big testID="profile-call" icon="phone" title={`Call ${f}`} style={{ flex: 1 }} onPress={() => withAccount(`call ${f}`, () => void startCall(id, 'voice'))} />
        <Round testID="profile-chat" icon="chat" label={`Message ${f}`} size={56} bg={t.card2} plain onPress={() => withAccount(`message ${f}`, () => openChat(id))} />
      </View>
    </Screen>
  );
}
