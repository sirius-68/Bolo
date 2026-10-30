import React, { useCallback } from 'react';
import { Tabs, useFocusEffect } from 'expo-router';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NavBar } from '../../src/components/NavBar';
import { setToastOffset } from '../../src/ui/overlay';
import { C } from '../../src/ui/theme';
import { isW } from '../../src/logic/core';

export default function TabsLayout() {
  useFocusEffect(
    useCallback(() => {
      setToastOffset(98);
      return () => setToastOffset(32);
    }, []),
  );
  const ins = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
    <Tabs
      initialRouteName={isW() ? 'feed' : 'home'}
      tabBar={(p) => <NavBar {...p} />}
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: C.bg }, lazy: true, animation: 'fade' }}
    >
      <Tabs.Screen name="home" />
      <Tabs.Screen name="feed" />
      <Tabs.Screen name="career" />
      <Tabs.Screen name="me" />
    </Tabs>
      {/* keeps the status bar readable over scrolled content */}
      <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, height: ins.top, backgroundColor: 'rgba(0,0,0,0.92)', zIndex: 50, elevation: 50 }} />
    </View>
  );
}
