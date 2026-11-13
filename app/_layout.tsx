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
import { on } from '../src/logic/events';
import { showDoneAlert } from '../src/sheets/work';
import { hasSession, pull, resumeSession, startServer, startSync } from '../src/logic/remote';
import { initPush } from '../src/logic/push';
import { loadAuthCaps } from '../src/components/auth';
import { locate } from '../src/logic/here';
import { StoryHost } from '../src/components/Stories';
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
    initPush();
    void loadAuthCaps();
    restore().then(async () => {
      startAutosave();
      startSync();
      // Refresh position and city quietly when location is already allowed (never prompts here).
      locate(false);
      // Old bug: tapping Edit cleared cvDone, so leaving the editor left the CV unreachable. Restore it.
      if (db.user.cv && !db.user.cvDone) db.user.cvDone = true;
      if (await hasSession()) {
        // first start after this update: no saved copy yet, but still signed in
        if (!db.loggedIn || !db.uid) await resumeSession();
        if (db.loggedIn) {
          setMonitorUser(db.uid);
          pull();
          startServer();
          ui.returning = true;
          ui.appStarted = true;
        }
      } else db.loggedIn = false; // signed out, or the session expired: log in again
      setReady(true);
      checkVersion();
    });
    const a = on('doneAlert', (id: string) => showDoneAlert(id));
    return () => a();
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
