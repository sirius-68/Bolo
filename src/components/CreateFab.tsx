import React, { useEffect, useRef, useState } from 'react';
import { Animated, BackHandler, Pressable, Text, View } from 'react-native';
import { Icon } from '../ui/Icon';
import { C, tx } from '../ui/theme';
import { tap } from '../ui/kit';
import { createActions } from '../sheets/create';

/** Floating + at the side. Tapping it fans out a short list of actions (speed dial) with a springy stagger. */
export function CreateFab({ bottom, right = 18 }: { bottom: number; right?: number }) {
  const [open, setOpen] = useState(false);
  const [shown, setShown] = useState(false);
  const acts = createActions();
  const anims = useRef(acts.map(() => new Animated.Value(0))).current;
  while (anims.length < acts.length) anims.push(new Animated.Value(0));
  const spin = useRef(new Animated.Value(0)).current;
  const dim = useRef(new Animated.Value(0)).current;

  const toggle = (to: boolean) => {
    tap();
    setOpen(to);
    if (to) setShown(true);
    Animated.spring(spin, { toValue: to ? 1 : 0, useNativeDriver: true, speed: 16, bounciness: 12 }).start();
    Animated.timing(dim, { toValue: to ? 1 : 0, duration: to ? 180 : 140, useNativeDriver: true }).start();
    // Nearest item pops first on open, last on close.
    const order = acts.map((_, i) => i);
    Animated.stagger(
      to ? 45 : 25,
      order.map((i) =>
        to
          ? Animated.spring(anims[i], { toValue: 1, useNativeDriver: true, speed: 13, bounciness: 14 })
          : Animated.timing(anims[i], { toValue: 0, duration: 120, useNativeDriver: true }),
      ),
    ).start(() => !to && setShown(false));
  };
  useEffect(() => {
    if (!open) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => (toggle(false), true));
    return () => sub.remove();
  }, [open]);

  return (
    <>
      {shown ? (
        <Animated.View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,.55)', opacity: dim }}>
          <Pressable accessibilityLabel="Close menu" style={{ flex: 1 }} onPress={() => toggle(false)} />
        </Animated.View>
      ) : null}
      {shown ? (
        <View pointerEvents="box-none" style={{ position: 'absolute', right, bottom: bottom + 70, alignItems: 'flex-end', gap: 10 }}>
          {acts.map((a, i) => {
            // index 0 sits closest to the + (bottom of the stack)
            const v = anims[acts.length - 1 - i];
            const it = acts[acts.length - 1 - i];
            return (
              <Animated.View
                key={it.k}
                style={{
                  opacity: v.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0, 1, 1] }),
                  transform: [
                    { translateY: v.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) },
                    { translateX: v.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) },
                    { scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) },
                  ],
                }}
              >
                <Pressable
                  testID={`cr-${it.k}`}
                  accessibilityRole="button"
                  accessibilityLabel={it.label}
                  onPress={() => {
                    toggle(false);
                    setTimeout(it.run, 160);
                  }}
                  style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 10, paddingLeft: 6, paddingRight: 16, height: 50, borderRadius: 25, backgroundColor: '#232326', borderWidth: 1, borderColor: '#2f2f34', transform: [{ scale: pressed ? 0.96 : 1 }] })}
                >
                  <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: it.bg, alignItems: 'center', justifyContent: 'center' }}>
                    <Icon name={it.icon} size={18} color="#000" />
                  </View>
                  <Text style={tx(14, 7, C.text)}>{it.label}</Text>
                </Pressable>
              </Animated.View>
            );
          })}
        </View>
      ) : null}
      <Pressable
        testID="fab-create"
        accessibilityRole="button"
        accessibilityLabel={open ? 'Close' : 'Create'}
        accessibilityState={{ expanded: open }}
        onPress={() => toggle(!open)}
        style={({ pressed }) => ({ position: 'absolute', right, bottom, transform: [{ scale: pressed ? 0.92 : 1 }] })}
      >
        <Animated.View
          style={{
            width: 58,
            height: 58,
            borderRadius: 29,
            backgroundColor: open ? '#2a2a2e' : C.yellow,
            borderWidth: open ? 1 : 0,
            borderColor: '#3a3a40',
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: '#000',
            shadowOpacity: 0.5,
            shadowRadius: 14,
            shadowOffset: { width: 0, height: 8 },
            elevation: 12,
            transform: [{ rotate: spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '135deg'] }) }],
          }}
        >
          <Icon name="plus" size={28} color={open ? '#fff' : '#000'} />
        </Animated.View>
      </Pressable>
    </>
  );
}
