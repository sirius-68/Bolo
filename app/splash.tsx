import React from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { db } from '../src/data/db';
import { markStarted, setMode } from '../src/g/data';
import { GIcon } from '../src/g/icons';
import { useG } from '../src/g/theme';
import { Big, Link, Lockup, Screen, T } from '../src/g/ui';

/** Start: one screen, one button. Looking needs no account. */
export default function Intro() {
  const t = useG();
  const ins = useSafeAreaInsets();
  const start = () => {
    setMode('hire');
    markStarted();
    router.replace('/find' as any);
  };
  return (
    <Screen style={{ paddingHorizontal: 24, paddingBottom: 28 + ins.bottom }}>
      <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
        <Link testID="intro-signin" title="Sign in" onPress={() => router.push('/login')} />
      </View>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 32 }}>
        <View style={{ marginBottom: 40 }}>
          <Lockup mark={92} word={74} gap={16} />
        </View>
        <T s={31} w={8} lh={1.15} ls={-0.8} center style={{ paddingHorizontal: 6 }}>
          Find a good worker{'\n'}in seconds
        </T>
        <T s={17} w={7} lh={1.45} center style={{ maxWidth: 310, marginTop: 20 }}>
          Leaky tap? Torn dress? Lights out?{'\n'}
          <T s={17} w={8} lh={1.45} c={t.accent}>
            Just say it, and getit.
          </T>
        </T>
      </View>
      <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start', marginBottom: 18 }}>
        <View style={{ marginTop: 1 }}>
          <GIcon name="shield" size={20} color={t.muted} />
        </View>
        <T s={13} lh={1.5} c={t.muted} style={{ flex: 1 }}>
          No account needed to look. getit uses your area to show people near you, and asks for your number only when you contact someone.
        </T>
      </View>
      <Big testID="intro-continue" title="Continue" onPress={start} />
      <Link
        testID="intro-work"
        title="I offer a skill · get work"
        color={t.text}
        h={48}
        style={{ marginTop: 8 }}
        onPress={() => {
          db.user.bizOnly = false;
          router.push('/wland' as any);
        }}
      />
    </Screen>
  );
}
