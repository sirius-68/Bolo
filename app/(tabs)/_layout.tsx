import React, { useCallback } from 'react';
import { Tabs, useFocusEffect } from 'expo-router';
import { NavBar } from '../../src/components/NavBar';
import { setToastOffset } from '../../src/ui/overlay';
import { C } from '../../src/ui/theme';

export default function TabsLayout() {
  useFocusEffect(
    useCallback(() => {
      setToastOffset(98);
      return () => setToastOffset(32);
    }, []),
  );
  return (
    <Tabs
      tabBar={(p) => <NavBar {...p} />}
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: C.bg }, lazy: true, animation: 'fade' }}
    >
      <Tabs.Screen name="home" />
      <Tabs.Screen name="feed" />
      <Tabs.Screen name="career" />
      <Tabs.Screen name="me" />
    </Tabs>
  );
}
