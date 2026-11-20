/* The floating tab bar: Find (or Work), Jobs, Inbox, and a round search button beside it. */
import React, { useEffect } from 'react';
import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { tap } from '../ui/kit';
import { setToastOffset } from '../ui/overlay';
import { db } from '../data/db';
import { useLive } from '../logic/live';
import { unreadMsgs, unreadNotifs } from '../logic/core';
import { maybeShowWhatsNew } from '../logic/whatsnew';
import { GIcon, GIconName } from './icons';
import { RED, ft, lift, useG } from './theme';
import { working } from './data';

/** Space the bar takes at the bottom of a tab screen (bar + gaps), before the phone's own inset. */
export const TAB_SPACE = 108;

export function TabBar({ state, navigation }: BottomTabBarProps) {
  useLive();
  const t = useG();
  const ins = useSafeAreaInsets();
  const cur = state.routes[state.index]?.name;
  useEffect(() => {
    setToastOffset(TAB_SPACE);
    // after an update, show what's new once
    const x = setTimeout(maybeShowWhatsNew, 1800);
    return () => clearTimeout(x);
  }, []);
  const unread = db.loggedIn ? unreadMsgs() + unreadNotifs() : 0;
  const tabs: { name: string; icon: GIconName; label: string; dot?: boolean }[] = [
    { name: 'find', icon: 'find', label: working() ? 'Work' : 'Find' },
    { name: 'jobs', icon: 'jobs', label: 'Jobs' },
    { name: 'inbox', icon: 'chat', label: 'Inbox', dot: unread > 0 },
  ];
  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', left: 16, right: 16, bottom: 20 + ins.bottom, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <View accessibilityRole="tablist" style={[{ flex: 1, height: 64, padding: 6, borderRadius: 32, backgroundColor: t.bar, borderWidth: 1, borderColor: t.line, flexDirection: 'row' }, lift(t)]}>
        {tabs.map((x) => {
          const on = cur === x.name;
          const c = on ? t.accent : t.muted;
          return (
            <Pressable
              key={x.name}
              testID={`tab-${x.name}`}
              accessibilityRole="tab"
              accessibilityLabel={x.dot ? `${x.label}, new` : x.label}
              accessibilityState={{ selected: on }}
              onPress={() => {
                tap();
                const route = state.routes.find((r) => r.name === x.name);
                if (route) navigation.navigate(route.name as never);
              }}
              style={{ flex: 1, borderRadius: 26, backgroundColor: on ? t.tabOn : 'transparent', alignItems: 'center', justifyContent: 'center', gap: 2 }}
            >
              <View>
                <GIcon name={x.icon} size={22} color={c} />
                {x.dot ? <View style={{ position: 'absolute', top: -2, right: -4, width: 10, height: 10, borderRadius: 5, backgroundColor: RED, borderWidth: 2, borderColor: on ? t.tabOn : t.card }} /> : null}
              </View>
              <Text maxFontSizeMultiplier={1.15} style={ft(11, 7, c, 1.3)}>
                {x.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <Pressable
        testID="tab-search"
        accessibilityRole="button"
        accessibilityLabel="Search"
        onPress={() => (tap(), router.push('/need' as any))}
        style={({ pressed }) => [{ width: 64, height: 64, borderRadius: 32, borderWidth: 1, borderColor: t.line, backgroundColor: t.bar, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.8 : 1 }, lift(t)]}
      >
        <GIcon name="search" size={24} color={t.text} />
      </Pressable>
    </View>
  );
}
