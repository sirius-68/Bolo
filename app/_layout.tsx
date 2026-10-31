import React, { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import * as SystemUI from 'expo-system-ui';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  useFonts,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
} from '@expo-google-fonts/plus-jakarta-sans';
import { Overlays } from '../src/ui/overlay';
import { restore, startAutosave } from '../src/logic/persist';
import { db, ui } from '../src/data/db';
import { resumeSims } from '../src/logic/work';
import { on } from '../src/logic/events';
import { showDoneAlert } from '../src/sheets/work';
import { startAdTicker } from '../src/logic/career';
import { hasSession, pull, startSync } from '../src/logic/remote';
import { locate } from '../src/logic/here';
import { StoryHost } from '../src/components/Stories';
import { ensureQuickCourse, scheduleClass } from '../src/logic/career';

export { ErrorBoundary } from 'expo-router';

SplashScreen.preventAutoHideAsync().catch(() => {});
SystemUI.setBackgroundColorAsync('#000000').catch(() => {});

export default function Root() {
  const [fonts] = useFonts({ PlusJakartaSans_500Medium, PlusJakartaSans_600SemiBold, PlusJakartaSans_700Bold, PlusJakartaSans_800ExtraBold });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    restore().then(async () => {
      startAutosave();
      startSync();
      // Refresh position and city quietly when location is already allowed (never prompts here).
      locate(false);
      // Test course (starts 1 minute after enrolling) and timers for classes you've joined.
      ensureQuickCourse();
      db.myLearning.forEach((cid) => {
        const c = db.COURSES.find((x) => x.id === cid);
        if (c) scheduleClass(c);
      });
      // Copies saved before real accounts existed are demo sessions.
      if (db.loggedIn && !db.uid) db.demo = true;
      if (db.loggedIn && !db.demo) {
        if (await hasSession()) pull();
        else db.loggedIn = false; // session expired or revoked → log in again
      }
      if (db.loggedIn) {
        ui.returning = true;
        ui.appStarted = true;
        resumeSims();
        if (db.BIZ.list.some((b) => (b.ads || []).some((a) => a.status === 'active'))) startAdTicker();
      }
      setReady(true);
    });
    return on('doneAlert', (id: string) => showDoneAlert(id));
  }, []);

  useEffect(() => {
    if (fonts && ready) SplashScreen.hideAsync().catch(() => {});
  }, [fonts, ready]);

  if (!fonts || !ready) return null;
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#000' },
          animation: 'slide_from_right',
          animationDuration: 220,
        }}
      >
        <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
        <Stack.Screen name="reels" options={{ animation: 'fade' }} />
        <Stack.Screen name="call" options={{ animation: 'fade', gestureEnabled: false }} />
        <Stack.Screen name="splash" options={{ animation: 'none' }} />
      </Stack>
      <Overlays />
      <StoryHost />
    </SafeAreaProvider>
  );
}
