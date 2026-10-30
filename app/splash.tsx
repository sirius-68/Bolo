import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Pict, Txt } from '../src/ui/kit';
import { C } from '../src/ui/theme';

export default function Splash() {
  const ins = useSafeAreaInsets();
  const dots = [useRef(new Animated.Value(0)).current, useRef(new Animated.Value(0)).current, useRef(new Animated.Value(0)).current];
  const float = useRef(new Animated.Value(0)).current;
  const done = useRef(false);
  const next = () => {
    if (done.current) return;
    done.current = true;
    router.replace('/onboard');
  };
  useEffect(() => {
    const loops = dots.map((d, i) =>
      Animated.loop(Animated.sequence([Animated.delay(i * 150), Animated.timing(d, { toValue: 1, duration: 500, useNativeDriver: true }), Animated.timing(d, { toValue: 0, duration: 500, useNativeDriver: true })])),
    );
    loops.forEach((l) => l.start());
    const f = Animated.loop(Animated.sequence([Animated.timing(float, { toValue: 1, duration: 2000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }), Animated.timing(float, { toValue: 0, duration: 2000, easing: Easing.inOut(Easing.sin), useNativeDriver: true })]));
    f.start();
    const t = setTimeout(next, 2400);
    return () => {
      clearTimeout(t);
      loops.forEach((l) => l.stop());
      f.stop();
    };
  }, []);
  return (
    <Pressable style={{ flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' }} onPress={next} accessibilityLabel="Continue">
      <Animated.View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, transform: [{ translateY: float.interpolate({ inputRange: [0, 1], outputRange: [0, -8] }) }] }}>
        <Pict pic="art/splash" style={{ width: '100%', height: '100%' }} fit="cover" />
      </Animated.View>
      <Pict pic="img/logo-yellow" style={{ width: 230, height: 82 }} fit="contain" />
      <Txt s={14} w={6} c={C.muted} center style={{ marginTop: 14 }}>
        Jobs, talent and careers right around the corner
      </Txt>
      <View style={{ position: 'absolute', bottom: 48 + ins.bottom, flexDirection: 'row', gap: 6 }}>
        {dots.map((d, i) => (
          <Animated.View
            key={i}
            style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: [C.yellow, C.blue, C.orange][i], opacity: d.interpolate({ inputRange: [0, 1], outputRange: [1, 0.25] }), transform: [{ scale: d.interpolate({ inputRange: [0, 1], outputRange: [1, 0.7] }) }] }}
          />
        ))}
      </View>
    </Pressable>
  );
}
