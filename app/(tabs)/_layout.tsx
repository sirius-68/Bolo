import React, { useCallback } from 'react';
import { Tabs, useFocusEffect } from 'expo-router';
import { View } from 'react-native';
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
    </View>
  );
}
