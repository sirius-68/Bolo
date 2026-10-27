import React, { useEffect } from 'react';
import { Pressable, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Icon } from '../ui/Icon';
import { C, tx } from '../ui/theme';
import { tap } from '../ui/kit';
import { useTick } from '../logic/live';
import { isW } from '../logic/core';
import { prItems } from '../logic/account';
import { openCreate } from '../sheets/create';
import { setToastOffset } from '../ui/overlay';

/** Kept for screens that still pass it; the create button now lives in the bar, so nothing floats over content. */
export function onScrollFab(_e?: any) {}

/** Height of the bar including the gap under it (for content padding). */
export const NAV_H = 76;

type Tab = { name: string; icon: string; label: string };

export function NavBar({ state, navigation }: BottomTabBarProps) {
  useTick();
  const ins = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const w = Math.min(420, width - 24);
  const cur = state.routes[state.index]?.name;
  const todo = isW() ? prItems().filter((x) => !x[1]).length : 0;
  useEffect(() => {
    setToastOffset(NAV_H + 22);
  }, []);
  const W = isW();
  const tabs: Tab[] = [
    W ? { name: 'home', icon: 'mapt', label: 'Map' } : { name: 'home', icon: 'squares', label: 'Home' },
    { name: 'feed', icon: 'feed', label: W ? 'Feed' : 'Talent' },
    { name: '+', icon: 'plus', label: 'Create' },
    { name: 'career', icon: 'job', label: 'Career' },
    { name: 'me', icon: 'user', label: W ? 'Profile' : 'Company' },
  ];
  return (
    <>
    {/* Backdrop behind the status bar so scrolled content never shows through it */}
    <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, height: ins.top, backgroundColor: 'rgba(0,0,0,0.94)' }} />
    <View
      style={{
        position: 'absolute',
        bottom: 10 + ins.bottom,
        alignSelf: 'center',
        width: w,
        height: 66,
        borderRadius: 24,
        paddingHorizontal: 6,
        backgroundColor: 'rgba(24,24,27,0.97)',
        borderWidth: 1,
        borderColor: '#2c2c30',
        flexDirection: 'row',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOpacity: 0.55,
        shadowRadius: 20,
        shadowOffset: { width: 0, height: 12 },
        elevation: 14,
      }}
    >
      {tabs.map((t) => {
        if (t.name === '+')
          return (
            <View key="+" style={{ flex: 1, alignItems: 'center' }}>
              <Pressable
                testID="fab-create"
                accessibilityRole="button"
                accessibilityLabel={W ? 'Create: post a job, share your work, offer a mentorship' : 'Create: post a vacancy, internship or program'}
                onPress={() => (tap(), openCreate())}
                style={({ pressed }) => ({ width: 52, height: 52, borderRadius: 18, backgroundColor: C.yellow, alignItems: 'center', justifyContent: 'center', transform: [{ scale: pressed ? 0.94 : 1 }] })}
              >
                <Icon name="plus" size={26} color="#000" />
              </Pressable>
            </View>
          );
        const on = cur === t.name;
        return (
          <Pressable
            key={t.name}
            testID={`tab-${t.name}`}
            accessibilityRole="tab"
            accessibilityLabel={t.name === 'me' && todo ? `${t.label}, ${todo} things to complete` : t.label}
            accessibilityState={{ selected: on }}
            onPress={() => {
              tap();
              const route = state.routes.find((r) => r.name === t.name);
              if (route) navigation.navigate(route.name as never);
            }}
            style={{ flex: 1, height: 54, marginHorizontal: 2, borderRadius: 18, alignItems: 'center', justifyContent: 'center', gap: 2, backgroundColor: on ? C.yellow : 'transparent' }}
          >
            <View style={{ height: 26, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name={t.icon} size={22} color={on ? '#000' : C.muted} />
              {t.name === 'me' && todo ? (
                <View style={{ position: 'absolute', top: -4, right: -12, minWidth: 17, height: 17, borderRadius: 9, paddingHorizontal: 4, backgroundColor: C.blue, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: on ? C.yellow : '#18181b' }}>
                  <Text style={tx(9, 8, '#fff', { lineHeight: 12 })}>{todo}</Text>
                </View>
              ) : null}
            </View>
            <Text numberOfLines={1} maxFontSizeMultiplier={1.2} style={tx(11, on ? 8 : 6, on ? '#000' : C.muted)}>
              {t.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
    </>
  );
}
