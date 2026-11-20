import React from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { db } from '../src/data/db';
import { bump } from '../src/logic/live';
import { ensureSkillList } from '../src/logic/core';
import { markStarted, setMode } from '../src/g/data';
import { GIcon } from '../src/g/icons';
import { useG } from '../src/g/theme';
import { Big, Link, Lockup, Round, Screen, T } from '../src/g/ui';
import { openSignIn } from '../src/g/signin';

const POINTS: [string, string][] = [
  ['Free to join', 'getit takes nothing from what you earn.'],
  ['Clients come to you', 'They call or message you straight from getit.'],
  ['You stay in charge', 'Pick your jobs, your prices and your hours.'],
];

/** Worker start screen: what you get, then Start. */
export default function WorkerStart() {
  const t = useG();
  const ins = useSafeAreaInsets();
  const start = () => {
    if (db.loggedIn && db.user.skills.length) {
      // already offers a skill: just switch to working
      if (!db.user.intents.includes('find')) db.user.intents = ['find', ...db.user.intents];
      setMode('work');
      markStarted();
      ensureSkillList();
      bump();
      return router.replace('/find' as any);
    }
    // two short steps (your skill, how you work), then your number
    router.push('/w1' as any);
  };
  return (
    <Screen style={{ paddingHorizontal: 24, paddingBottom: 28 + ins.bottom }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Round icon="back" label="Back" onPress={() => (router.canGoBack() ? router.back() : router.replace('/splash'))} />
        {db.loggedIn ? <View /> : <Link testID="wland-signin" title="Sign in" onPress={() => openSignIn({ work: true, then: () => router.replace('/find' as any) })} />}
      </View>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Lockup mark={80} word={64} gap={14} />
        <T s={31} w={8} lh={1.15} ls={-0.8} center style={{ marginTop: 32, marginBottom: 8 }}>
          Get work near you
        </T>
        <T s={15} lh={1.5} c={t.muted} center style={{ maxWidth: 300 }}>
          People near you need help every day. Be the one they call.
        </T>
      </View>
      <View style={{ gap: 14, marginBottom: 24 }}>
        {POINTS.map(([title, sub]) => (
          <View key={title} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: t.tabOn, alignItems: 'center', justifyContent: 'center' }}>
              <GIcon name="check" size={18} color={t.accent} sw={2.6} />
            </View>
            <View style={{ flex: 1, gap: 1 }}>
              <T s={15} w={8}>
                {title}
              </T>
              <T s={13} c={t.muted}>
                {sub}
              </T>
            </View>
          </View>
        ))}
      </View>
      <Big testID="wland-start" title="Start" onPress={start} />
    </Screen>
  );
}
