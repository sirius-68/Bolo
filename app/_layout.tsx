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

SplashScreen.preventAutoHideAsync().catch(() => {});
SystemUI.setBackgroundColorAsync('#000000').catch(() => {});

export default function Root() {
  const [fonts] = useFonts({ PlusJakartaSans_500Medium, PlusJakartaSans_600SemiBold, PlusJakartaSans_700Bold, PlusJakartaSans_800ExtraBold });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    restore().then(() => {
      startAutosave();
      if (db.loggedIn) {
        ui.appStarted = true;
        resumeSims();
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
    </SafeAreaProvider>
  );
}
