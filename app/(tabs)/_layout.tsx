import React from 'react';
import { Tabs } from 'expo-router';
import { View } from 'react-native';
import { TabBar } from '../../src/g/TabBar';
import { useG } from '../../src/g/theme';

/** getit's three tabs. The old profile editor (me) stays reachable from the "you" sheet, without a tab of its own. */
export default function TabsLayout() {
  const t = useG();
  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <Tabs initialRouteName="find" tabBar={(p) => <TabBar {...p} />} screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: t.bg }, lazy: true, animation: 'fade' }}>
        <Tabs.Screen name="find" />
        <Tabs.Screen name="jobs" />
        <Tabs.Screen name="inbox" />
        <Tabs.Screen name="me" />
      </Tabs>
    </View>
  );
}
