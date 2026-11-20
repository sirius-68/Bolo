/* The first second: the bag drops in and winks hello, the name follows, and the app opens.
   Someone new lands on the opening screen; everyone else goes straight home. */
import React, { useEffect, useRef } from 'react';
import { Animated, Easing, View } from 'react-native';
import { router } from 'expo-router';
import { db } from '../src/data/db';
import { hasStarted } from '../src/g/data';
import { Mark, Word } from '../src/g/icons';
import { useG } from '../src/g/theme';

export default function Splash() {
  const t = useG();
  const bag = useRef(new Animated.Value(0)).current;
  const word = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const known = db.loggedIn || hasStarted();
    Animated.sequence([
      Animated.spring(bag, { toValue: 1, friction: 5, tension: 90, useNativeDriver: true }),
      Animated.timing(word, { toValue: 1, duration: known ? 180 : 320, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.delay(known ? 120 : 520),
    ]).start(() => router.replace((known ? '/find' : '/intro') as any));
  }, [bag, word]);
  return (
    <View accessible accessibilityRole="image" accessibilityLabel="getit" style={{ flex: 1, backgroundColor: t.bg, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 16 }}>
        <Animated.View style={{ opacity: bag.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0, 1, 1] }), transform: [{ scale: bag.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }) }, { rotate: bag.interpolate({ inputRange: [0, 1], outputRange: ['-18deg', '0deg'] }) }] }}>
          <Mark height={92} />
        </Animated.View>
        <Animated.View style={{ opacity: word, transform: [{ translateX: word.interpolate({ inputRange: [0, 1], outputRange: [-14, 0] }) }] }}>
          <Word height={74} color={t.text} />
        </Animated.View>
      </View>
    </View>
  );
}
