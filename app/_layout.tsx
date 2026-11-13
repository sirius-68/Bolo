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
import { bootGuard, clearSaved, restore, startAutosave } from '../src/logic/persist';
import { db, ui } from '../src/data/db';
import { on } from '../src/logic/events';
import { showDoneAlert } from '../src/sheets/work';
import { hasSession, pull, resumeSession, startServer, startSync } from '../src/logic/remote';
import { initPush } from '../src/logic/push';
import { loadAuthCaps } from '../src/components/auth';
import { locate } from '../src/logic/here';
import { StoryHost } from '../src/components/Stories';
import { Linking, Platform, Pressable, Text, View } from 'react-native';
import { resetTo } from '../src/logic/nav';
import { report, setMonitorUser, startMonitoring } from '../src/lib/monitor';
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

/** Shown instead of a broken screen. Plain parts only, so it can't break too.
    First it offers to try again or go home; if the same thing keeps happening, it can clear this phone's
    saved copy (the account and its data stay on the server) and start clean. */
export function ErrorBoundary({ error, retry }: { error: Error; retry: () => Promise<void> | void }) {
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    report(error, 'screen');
    // also in the device log, so automatic tests can see which screen broke
    console.error('bolo: screen crash ·', String(error?.message || error), String(error?.stack || '').slice(0, 600));
    crashes++;
  }, [error]);
  const home = () => {
    try {
      resetTo(db.loggedIn ? (db.user.role === 'client' ? '/home' : '/feed') : '/splash');
    } catch {}
    void retry();
  };
  const repair = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await clearSaved();
      const { makeDb, setDb } = require('../src/data/db');
      setDb(makeDb());
      if (await hasSession()) {
        await resumeSession();
        if (db.loggedIn) {
          startServer();
          ui.appStarted = true;
        }
      }
    } catch {}
    setBusy(false);
    home();
  };
  const btn = (title: string, onPress: () => void, primary?: boolean) => (
    <Pressable accessibilityRole="button" onPress={onPress} style={{ height: 54, borderRadius: 27, alignItems: 'center', justifyContent: 'center', backgroundColor: primary ? '#f6ee5c' : 'transparent', borderWidth: primary ? 0 : 1.5, borderColor: '#3a3a40' }}>
      <Text style={{ color: primary ? '#000' : '#fff', fontSize: 16, fontWeight: '700' }}>{title}</Text>
    </Pressable>
  );
  return (
    <View style={{ flex: 1, backgroundColor: '#000', padding: 24, paddingTop: 96, paddingBottom: 40 }}>
      <Text style={{ color: '#fff', fontSize: 26, fontWeight: '800' }}>This screen hit a problem</Text>
      <Text style={{ color: '#a0a0a8', fontSize: 15, lineHeight: 22, marginTop: 10 }}>
        Sorry about that. Your account and your data are safe. {crashes > 1 ? 'It happened again, so try “Repair and restart”: it reloads everything fresh from bolo.' : 'Try again, or go back to the home screen.'}
      </Text>
      <View style={{ flex: 1 }} />
      <View style={{ gap: 12 }}>
        {btn('Try again', () => void retry(), true)}
        {btn('Go to home', home)}
        {btn(busy ? 'Repairing…' : 'Repair and restart', repair)}
      </View>
      <Text selectable style={{ color: '#55555c', fontSize: 11, marginTop: 18 }} numberOfLines={2}>
        {String(error?.message || error).slice(0, 160)}
      </Text>
    </View>
  );
}
let crashes = 0;

SplashScreen.preventAutoHideAsync().catch(() => {});
SystemUI.setBackgroundColorAsync('#000000').catch(() => {});

export default function Root() {
  const [fonts, fontErr] = useFonts({ PlusJakartaSans_500Medium, PlusJakartaSans_600SemiBold, PlusJakartaSans_700Bold, PlusJakartaSans_800ExtraBold });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    initPush();
    void loadAuthCaps();
    let done = false;
    const go = () => {
      if (done) return;
      done = true;
      setReady(true);
      checkVersion().catch(() => {});
    };
    // never sit on the splash screen: whatever happens below, the app opens
    const safety = setTimeout(go, 10000);
    (async () => {
      try {
        // two starts in a row that didn't survive → skip the saved copy this time
        const skipped = await bootGuard();
        if (!skipped) await restore();
        startAutosave();
        startSync();
        // Refresh position and city quietly when location is already allowed (never prompts here).
        void locate(false);
        // Old bug: tapping Edit cleared cvDone, so leaving the editor left the CV unreachable. Restore it.
        if (db.user.cv && !db.user.cvDone) db.user.cvDone = true;
        if (await hasSession()) {
          // first start after an update: no saved copy yet, but still signed in
          if (!db.loggedIn || !db.uid) await resumeSession();
          if (db.loggedIn) {
            setMonitorUser(db.uid);
            void pull();
            startServer();
            ui.returning = true;
            ui.appStarted = true;
          }
        } else db.loggedIn = false; // signed out, or the session expired: log in again
      } catch (e) {
        report(e, 'start');
      } finally {
        clearTimeout(safety);
        go();
      }
    })();
    const a = on('doneAlert', (id: string) => showDoneAlert(id));
    return () => a();
  }, []);

  useEffect(() => {
    if ((fonts || fontErr) && ready) SplashScreen.hideAsync().catch(() => {});
  }, [fonts, fontErr, ready]);

  // if the fonts can't load, the app still opens (with the phone's own font)
  if ((!fonts && !fontErr) || !ready) return null;
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
