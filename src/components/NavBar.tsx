import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { router } from 'expo-router';
import { Icon } from '../ui/Icon';
import { C, tx } from '../ui/theme';
import { tap } from '../ui/kit';
import { useTick } from '../logic/live';
import { isW } from '../logic/core';
import { prItems } from '../logic/account';
import { openCreate } from '../sheets/create';
import { setToastOffset } from '../ui/overlay';
import { Text } from 'react-native';

/** Floating FAB visibility, driven by scrolling (hides while scrolling down). */
const fabY = new Animated.Value(0);
let lastY = 0;
let hidden = false;
export function onScrollFab(e: any) {
  const y = e.nativeEvent.contentOffset.y;
  if (y > lastY + 6 && y > 120 && !hidden) {
    hidden = true;
    Animated.timing(fabY, { toValue: 1, duration: 180, useNativeDriver: true }).start();
  } else if ((y < lastY - 6 || y < 40) && hidden) {
    hidden = false;
    Animated.timing(fabY, { toValue: 0, duration: 180, useNativeDriver: true }).start();
  }
  lastY = y;
}

const ROUTES: [string, string, string][] = [
  ['home', 'nav', 'Map'],
  ['feed', 'feed', 'Feed'],
  ['reels', 'play', 'Reels'],
  ['career', 'job', 'Career'],
  ['me', 'user', 'My profile'],
];

export function NavBar({ state, navigation }: BottomTabBarProps) {
  useTick();
  const ins = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const w = Math.min(380, width - 32);
  const cur = state.routes[state.index]?.name;
  const todo = isW() ? prItems().filter((x) => !x[1]).length : 0;
  useEffect(() => {
    setToastOffset(98);
  }, []);
  const fab = useRef(fabY).current;
  // Each tab starts with the + button visible (it only hides while scrolling down).
  useEffect(() => {
    hidden = false;
    lastY = 0;
    Animated.timing(fabY, { toValue: 0, duration: 140, useNativeDriver: true }).start();
  }, [cur]);
  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', left: 0, right: 0, bottom: 14 + ins.bottom, alignItems: 'center' }}>
      <View
        style={{
          width: w,
          height: 66,
          borderRadius: 999,
          paddingHorizontal: 9,
          backgroundColor: 'rgba(28,28,31,0.96)',
          borderWidth: 1,
          borderColor: '#2c2c30',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          shadowColor: '#000',
          shadowOpacity: 0.55,
          shadowRadius: 20,
          shadowOffset: { width: 0, height: 12 },
          elevation: 14,
        }}
      >
        <Animated.View
          style={{
            position: 'absolute',
            right: 2,
            bottom: 66 + 14,
            transform: [{ translateY: fab.interpolate({ inputRange: [0, 1], outputRange: [0, 120] }) }, { scale: fab.interpolate({ inputRange: [0, 1], outputRange: [1, 0.6] }) }],
            opacity: fab.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }),
          }}
        >
          <Pressable
            testID="fab-create"
            accessibilityLabel="Create"
            onPress={() => {
              tap();
              openCreate();
            }}
            style={({ pressed }) => ({
              width: 60,
              height: 60,
              borderRadius: 30,
              backgroundColor: C.yellow,
              alignItems: 'center',
              justifyContent: 'center',
              transform: [{ scale: pressed ? 0.94 : 1 }],
              shadowColor: '#000',
              shadowOpacity: 0.5,
              shadowRadius: 14,
              shadowOffset: { width: 0, height: 8 },
              elevation: 10,
              borderWidth: 4,
              borderColor: 'rgba(0,0,0,0.35)',
            })}
          >
            <Icon name="plus" size={28} color="#000" />
          </Pressable>
        </Animated.View>
        {ROUTES.map(([name, icon, label]) => {
          const on = cur === name;
          const ic = name === 'home' && !isW() ? 'squares' : icon;
          const lab = name === 'home' && !isW() ? 'Business home' : label;
          return (
            <Pressable
              key={name}
              testID={`tab-${name}`}
              accessibilityRole="tab"
              accessibilityLabel={name === 'me' && todo ? `${lab}, ${todo} things to complete` : lab}
              accessibilityState={{ selected: on }}
              onPress={() => {
                tap();
                if (name === 'reels') {
                  router.push('/reels');
                  return;
                }
                const route = state.routes.find((r) => r.name === name);
                if (route) navigation.navigate(route.name as never);
              }}
              style={{ width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? C.yellow : C.s2 }}
            >
              <Icon name={ic} size={22} color={on ? '#000' : '#fff'} />
              {name === 'me' && todo ? (
                <View style={{ position: 'absolute', top: -2, right: -2, minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 4, backgroundColor: C.yellow, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#000' }}>
                  <Text style={tx(10, 8, '#000', { lineHeight: 13 })}>{todo}</Text>
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
