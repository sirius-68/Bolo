import React, { useEffect, useState } from 'react';
import { Stack, usePathname } from 'expo-router';
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
import { bootGuard, clearSaved, restore, startAutosave } from '../src/logic/persist';
import { db, ui } from '../src/data/db';
import { on } from '../src/logic/events';
import { hasSession, pull, resumeSession, startServer, startSync } from '../src/logic/remote';
import { initPush } from '../src/logic/push';
import { loadAuthCaps } from '../src/g/auth';
import { locate } from '../src/logic/here';
import { StoryHost } from '../src/g/Stories';
import { Linking, Platform, Pressable, Text, View } from 'react-native';
import { resetTo, setHere } from '../src/logic/nav';
import { report, setMonitorUser, startMonitoring } from '../src/lib/monitor';
import { serviceNotice, updateRequired } from '../src/logic/remote';
import { NoticeHost, confirm } from '../src/g/notice';
import { bk } from '../src/logic/work';
import { openJobAlert } from '../src/g/sheets';
import { working } from '../src/g/data';
import { postById } from '../src/logic/core';
import { loadPost } from '../src/logic/server';
import { router } from 'expo-router';
import { GSheetHost, GStatusBar, gsheet } from '../src/g/ui';
import { loadLook, useG } from '../src/g/theme';
import { loadStarted } from '../src/g/data';

startMonitoring();

/** Builds from CI carry their run number; the server can ask older builds to update. */
const BUILD = Number(process.env.EXPO_PUBLIC_BUILD || 0);
const UPDATE_URL = process.env.EXPO_PUBLIC_UPDATE_URL || 'https://github.com/sirius-68/Bolo/releases/latest';
async function checkVersion() {
  if (Platform.OS !== 'android' && Platform.OS !== 'ios') return;
  const msg = await updateRequired(Platform.OS, BUILD);
  if (msg) return confirm({ title: 'Update getit', text: msg, ok: 'Update', cancel: 'Later', icon: 'download', onOk: () => Linking.openURL(UPDATE_URL).catch(() => {}) });
  // a notice from the getit team (for example planned maintenance)
  const note = await serviceNotice();
  if (note) confirm({ title: 'A note from getit', text: note, ok: 'OK', icon: 'bell', onOk: () => {} });
}

/** Shown instead of a broken screen. Plain parts only, so it can't break too.
    First it offers to try again or go home; if the same thing keeps happening, it can clear this phone's
    saved copy (the account and its data stay on the server) and start clean. */
export function ErrorBoundary({ error, retry }: { error: Error; retry: () => Promise<void> | void }) {
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    report(error, 'screen');
    // also in the device log, so automatic tests can see which screen broke
    console.error('getit: screen crash ·', String(error?.message || error), String(error?.stack || '').slice(0, 600));
    crashes++;
  }, [error]);
  const home = () => {
    try {
      resetTo(db.loggedIn ? '/find' : '/intro');
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
    <Pressable accessibilityRole="button" onPress={onPress} style={{ height: 54, borderRadius: 27, alignItems: 'center', justifyContent: 'center', backgroundColor: primary ? '#e02f17' : 'transparent', borderWidth: primary ? 0 : 1.5, borderColor: '#363330' }}>
      <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>{title}</Text>
    </Pressable>
  );
  return (
    <View style={{ flex: 1, backgroundColor: '#171615', padding: 24, paddingTop: 96, paddingBottom: 40 }}>
      <Text style={{ color: '#fff', fontSize: 26, fontWeight: '800' }}>This screen hit a problem</Text>
      <Text style={{ color: '#a0a0a8', fontSize: 15, lineHeight: 22, marginTop: 10 }}>
        Sorry about that. Your account and your data are safe. {crashes > 1 ? 'It happened again, so try “Repair and restart”: it reloads everything fresh from getit.' : 'Try again, or go back to the home screen.'}
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

/** Keeps track of the screen on top, so a screen is never opened on top of itself (see openScreen). */
function Here() {
  const path = usePathname();
  useEffect(() => {
    setHere(path);
  }, [path]);
  return null;
}

SplashScreen.preventAutoHideAsync().catch(() => {});
SystemUI.setBackgroundColorAsync('#171615').catch(() => {});

export default function Root() {
  const [fonts, fontErr] = useFonts({ PlusJakartaSans_500Medium, PlusJakartaSans_600SemiBold, PlusJakartaSans_700Bold, PlusJakartaSans_800ExtraBold });
  const [ready, setReady] = useState(false);
  const t = useG();

  useEffect(() => {
    SystemUI.setBackgroundColorAsync(t.bg).catch(() => {});
  }, [t.bg]);

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
        // the look (dark or light) and whether the opening screen was already passed, before the first screen shows
        await Promise.all([loadLook(), loadStarted()]);
        // two starts in a row that didn't survive → skip the saved copy this time
        const skipped = await bootGuard();
        // a saved copy of a signed-in account means this phone has used getit before (What's new depends on it)
        if (!skipped && (await restore()) && db.loggedIn) ui.returning = true;
        startAutosave();
        startSync();
        // Refresh position and city quietly when location is already allowed (never prompts here).
        void locate(false);
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
        ui.bootDone = true;
        clearTimeout(safety);
        go();
      }
    })();
    const a = on('doneAlert', (id: string) => {
      const b = bk(id);
      if (b && b.client === 'me') router.push(`/track/${id}` as any);
    });
    // a new job arrives while a worker has the app open: show it at once
    const n = on('notif', async (row: any) => {
      if (row?.type !== 'newjob' || !working() || gsheet.isOpen()) return;
      const id = row?.target?.id;
      if (!id) return;
      if (!postById(id)) await loadPost(id).catch(() => {});
      if (postById(id)) openJobAlert(id);
    });
    return () => {
      a();
      n();
    };
  }, []);

  useEffect(() => {
    if ((fonts || fontErr) && ready) SplashScreen.hideAsync().catch(() => {});
  }, [fonts, fontErr, ready]);

  // if the fonts can't load, the app still opens (with the phone's own font)
  if ((!fonts && !fontErr) || !ready) return null;
  return (
    <SafeAreaProvider>
      <GStatusBar />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: t.bg },
          animation: 'slide_from_right',
          animationDuration: 220,
        }}
      >
        <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
        <Stack.Screen name="call" options={{ animation: 'fade', gestureEnabled: false }} />
        <Stack.Screen name="index" options={{ animation: 'none' }} />
        <Stack.Screen name="intro" options={{ animation: 'fade' }} />
      </Stack>
      <GSheetHost />
      <NoticeHost />
      <StoryHost />
      <Here />
    </SafeAreaProvider>
  );
}
