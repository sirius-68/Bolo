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
import { openFund } from '../src/sheets/wallet';
import { ensureWallet } from '../src/logic/wallet';
import { startAdTicker } from '../src/logic/career';
import { hasSession, pull, startSync } from '../src/logic/remote';
import { locate } from '../src/logic/here';
import { StoryHost } from '../src/components/Stories';
import { ensureAdJobs } from '../src/logic/career';
import { ensureCourseListings } from '../src/logic/listings';
import { Linking, Platform } from 'react-native';
import { setMonitorUser, startMonitoring } from '../src/lib/monitor';
import { updateRequired } from '../src/logic/remote';
import { confirm } from '../src/ui/overlay';

startMonitoring();

/** Builds from CI carry their run number; the server can ask older builds to update. */
const BUILD = Number(process.env.EXPO_PUBLIC_BUILD || 0);
const UPDATE_URL = process.env.EXPO_PUBLIC_UPDATE_URL || 'https://github.com/sirius-68/Bolo/releases/latest';
async function checkVersion() {
  if (Platform.OS !== 'android' && Platform.OS !== 'ios') return;
  const msg = await updateRequired(Platform.OS, BUILD);
  if (msg) confirm({ title: 'Update bolo', text: msg, ok: 'Update', cancel: 'Later', icon: 'download', onOk: () => Linking.openURL(UPDATE_URL).catch(() => {}) });
}

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
      // Courses are listings that open the school's website; refresh old saves (drops in-app test classes).
      ensureCourseListings();
      ensureAdJobs();
      ensureWallet();
      // Old bug: tapping Edit cleared cvDone, so leaving the editor left the CV unreachable. Restore it.
      if (db.user.cv && !db.user.cvDone) db.user.cvDone = true;
      // Copies saved before real accounts existed are demo sessions.
      if (db.loggedIn && !db.uid) db.demo = true;
      if (db.loggedIn && !db.demo) {
        if (await hasSession()) (setMonitorUser(db.uid), pull());
        else db.loggedIn = false; // session expired or revoked → log in again
      }
      if (db.loggedIn) {
        ui.returning = true;
        ui.appStarted = true;
        resumeSims();
        if (db.BIZ.list.some((b) => (b.ads || []).some((a) => a.status === 'active'))) startAdTicker();
      }
      setReady(true);
      if (!db.demo) checkVersion();
    });
    const a = on('doneAlert', (id: string) => showDoneAlert(id));
    const b = on('fundAlert', (id: string) => openFund(id));
    return () => (a(), b());
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
