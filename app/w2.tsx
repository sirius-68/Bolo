/* Joining to offer a skill, step 2 of 3: how you work (you go to clients, they come to you, online),
   where you are and how far you go. The last step is your number, in the sign-in sheet. */
import React, { useReducer } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { db } from '../src/data/db';
import { tap } from '../src/g/touch';
import { useLive } from '../src/logic/live';
import { cityLabel } from '../src/logic/core';
import { countryByIso } from '../src/data/countries';
import { GIcon, GIconName } from '../src/g/icons';
import { RED, useG } from '../src/g/theme';
import { Big, Link, Pill, StepBar, T } from '../src/g/ui';
import { areaLabel, hasArea } from '../src/g/data';
import { openSignIn } from '../src/g/signin';
import { Top } from '../src/g/parts';
import { openArea } from '../src/g/sheets';
import { goBack } from '../src/g/touch';
import { bump } from '../src/logic/live';
import { Way, applyWorkerDraft, workerDraft } from '../src/g/worker';

const WAYS: [Way, string, string, GIconName][] = [
  ['go', 'I go to clients', 'Repairs, cleaning, home visits', 'pin'],
  ['come', 'Clients come to me', 'I have a shop, salon or workshop', 'jobs'],
  ['online', 'I work online', 'Design, lessons, from anywhere', 'chat'],
];

export default function W2() {
  useLive();
  const t = useG();
  const ins = useSafeAreaInsets();
  const [, re] = useReducer((x: number) => x + 1, 0);
  const { edit } = useLocalSearchParams<{ edit?: string }>();
  const d = workerDraft();
  // changing it from the profile: start from what is saved
  const [loaded] = React.useState(() => {
    if (!edit) return false;
    const a = (db.PR.area || {}) as any;
    d.ways = Array.isArray(a.ways) ? [...a.ways] : [];
    d.range = Number(a.radius) >= 50 ? 0 : Number(a.radius) || 5;
    d.reach = a.reach || 'country';
    return true;
  });
  void loaded;
  const has = (w: Way) => d.ways.includes(w);
  const city = cityLabel();
  const country = countryByIso(db.user.country)?.name || 'my country';
  const next = () => {
    if (!d.ways.length) return;
    if (edit) {
      db.PR.area = { ...db.PR.area, radius: d.range || 50, ways: d.ways, reach: d.ways.includes('online') ? d.reach : undefined } as any;
      bump();
      return goBack();
    }
    const done = () => {
      if (applyWorkerDraft()) router.replace('/wdone' as any);
    };
    if (db.loggedIn) done();
    else openSignIn({ work: true, then: done });
  };
  return (
    <View style={{ flex: 1, backgroundColor: t.bg, paddingTop: ins.top + 16, paddingHorizontal: 20 }}>
      {edit ? <Top pad={0} /> : <StepBar on={2} total={3} onBack={() => (router.canGoBack() ? router.back() : router.replace('/w1' as any))} />}
      <ScrollView showsVerticalScrollIndicator={false} style={{ marginHorizontal: -20 }} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 12 }}>
        <T s={28} w={8} lh={1.15} ls={-0.6} style={{ marginTop: 26, marginBottom: 6 }}>
          How do you work?
        </T>
        <T s={15} c={t.muted} style={{ marginBottom: 16 }}>
          Pick all that fit. Clients see this on your profile.
        </T>
        <View style={{ gap: 10 }}>
          {WAYS.map(([k, title, sub, icon]) => {
            const on = has(k);
            return (
              <Pressable
                key={k}
                testID={`w2-${k}`}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: on }}
                onPress={() => {
                  tap();
                  d.ways = on ? d.ways.filter((x) => x !== k) : [...d.ways, k];
                  re();
                }}
                style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 72, paddingVertical: 12, paddingLeft: 12, paddingRight: 16, borderRadius: 22, borderWidth: on ? 2 : 1, margin: on ? -1 : 0, borderColor: on ? RED : t.line, backgroundColor: on ? t.tabOn : t.card, opacity: pressed ? 0.9 : 1 })}
              >
                <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: on ? RED : t.card2, alignItems: 'center', justifyContent: 'center' }}>
                  <GIcon name={icon} size={22} color={on ? '#ffffff' : t.text} />
                </View>
                <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                  <T s={16} w={8}>
                    {title}
                  </T>
                  <T s={13} lh={1.35} c={t.muted}>
                    {sub}
                  </T>
                </View>
                <View style={{ width: 24, height: 24, borderRadius: 8, borderWidth: 2, borderColor: on ? RED : t.line, backgroundColor: on ? RED : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
                  {on ? <GIcon name="check" size={14} color="#ffffff" sw={3} /> : null}
                </View>
              </Pressable>
            );
          })}
        </View>
        {has('go') || has('come') ? (
          <>
            <T s={15} w={8} style={{ marginTop: 24, marginBottom: 10 }}>
              {has('come') ? 'Where’s your shop?' : 'Where are you based?'}
            </T>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, paddingLeft: 14, paddingRight: 8, borderRadius: 22, backgroundColor: t.card, borderWidth: 1, borderColor: t.line }}>
              <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: t.tabOn, alignItems: 'center', justifyContent: 'center' }}>
                <GIcon name="pin" size={22} color={t.accent} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <T s={16} w={8} lines={1}>
                  {hasArea() ? areaLabel() : 'Choose your area'}
                </T>
                <T s={13} c={t.muted} style={{ marginTop: 2 }}>
                  {has('come') ? 'Clients get the exact spot from you, by call or chat' : 'Only your area is shown, never your address'}
                </T>
              </View>
              <Link testID="w2-area" title={hasArea() ? 'Change' : 'Choose'} onPress={() => openArea()} />
            </View>
          </>
        ) : null}
        {has('go') ? (
          <>
            <T s={15} w={8} style={{ marginTop: 24, marginBottom: 10 }}>
              How far will you go for a job?
            </T>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {([2, 5, 10, 0] as number[]).map((n) => (
                <Pill key={n} testID={`w2-range-${n}`} label={n ? `${n} km` : `All of ${city || 'my city'}`} on={d.range === n} onPress={() => ((d.range = n), re())} />
              ))}
            </View>
          </>
        ) : null}
        {has('online') ? (
          <>
            <T s={15} w={8} style={{ marginTop: 24, marginBottom: 10 }}>
              Who can hire you online?
            </T>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {(
                [
                  ['city', `In ${city || 'my city'}`],
                  ['country', `In ${country}`],
                  ['anywhere', 'Anywhere'],
                ] as ['city' | 'country' | 'anywhere', string][]
              ).map(([k, label]) => (
                <Pill key={k} testID={`w2-reach-${k}`} label={label} on={d.reach === k} onPress={() => ((d.reach = k), re())} />
              ))}
            </View>
          </>
        ) : null}
      </ScrollView>
      <Big testID="w2-continue" title={d.ways.length ? (edit ? 'Save' : 'Continue') : 'Pick at least one'} quiet={!d.ways.length} onPress={next} style={{ marginTop: 12, marginBottom: ins.bottom + 28 }} />
    </View>
  );
}
