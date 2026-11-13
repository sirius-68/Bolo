/* Loading layout: grey shapes where the content will be, with a soft light moving across them
   (the pattern YouTube and others use). It shows what is coming instead of a blank screen or a spinner. */
import React, { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Dimensions, Easing, StyleProp, View, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { C } from './theme';

// one clock for every shape on screen, so the light moves across all of them together
const sweep = new Animated.Value(0);
let users = 0;
let loop: Animated.CompositeAnimation | null = null;
let still = false;
AccessibilityInfo.isReduceMotionEnabled?.()
  .then((v) => (still = !!v))
  .catch(() => {});
function useSweep() {
  useEffect(() => {
    users++;
    if (!loop && !still) {
      sweep.setValue(0);
      loop = Animated.loop(Animated.timing(sweep, { toValue: 1, duration: 1300, easing: Easing.inOut(Easing.quad), useNativeDriver: true }));
      loop.start();
    }
    return () => {
      users--;
      if (!users && loop) {
        loop.stop();
        loop = null;
      }
    };
  }, []);
}
const BAND = 180;
const SCREEN = Dimensions.get('window').width;

/** One grey shape. */
export function Bone({ w, h, r = 10, style }: { w?: number | `${number}%`; h: number; r?: number; style?: StyleProp<ViewStyle> }) {
  useSweep();
  const [x, setX] = useState(0);
  const box = useRef<View>(null);
  // where this shape sits on the screen, so the light crosses the page as one beam
  const place = () => box.current?.measureInWindow((px) => typeof px === 'number' && Math.abs(px - x) > 1 && setX(px));
  return (
    <View ref={box} onLayout={place} style={[{ width: w, height: h, borderRadius: r, backgroundColor: C.s2, overflow: 'hidden' }, style]}>
      {still ? null : (
        <Animated.View style={{ position: 'absolute', top: 0, bottom: 0, left: -x, width: BAND, transform: [{ translateX: sweep.interpolate({ inputRange: [0, 1], outputRange: [-BAND, SCREEN + BAND] }) }] }}>
          <LinearGradient colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.09)', 'rgba(255,255,255,0)']} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={{ flex: 1 }} />
        </Animated.View>
      )}
    </View>
  );
}

/** The home screen while it loads: the row of recommended cards, the tip banner, and the first posts. */
export function FeedSkeleton() {
  return (
    <View accessible accessibilityLabel="Loading" accessibilityRole="progressbar" testID="feed-loading">
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 24, marginBottom: 12 }}>
        <Bone w={190} h={20} />
        <Bone w={48} h={14} />
      </View>
      <View style={{ flexDirection: 'row', gap: 12, marginRight: -20, overflow: 'hidden' }}>
        {[0, 1].map((i) => (
          <View key={i} style={{ width: 280, padding: 16, borderRadius: 24, backgroundColor: C.s1, gap: 14 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Bone w={44} h={44} r={22} />
              <View style={{ flex: 1, gap: 8 }}>
                <Bone w="60%" h={13} />
                <Bone w="40%" h={11} />
              </View>
            </View>
            <Bone w="70%" h={24} />
            <Bone w={84} h={26} r={13} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
              <Bone w={60} h={26} />
              <Bone w={84} h={38} r={19} />
            </View>
          </View>
        ))}
      </View>
      <Bone w="100%" h={128} r={24} style={{ marginTop: 16 }} />
      <Bone w={150} h={20} style={{ marginTop: 26, marginBottom: 12 }} />
      {[0, 1, 2].map((i) => (
        <View key={i} style={{ padding: 16, borderRadius: 24, backgroundColor: C.s1, gap: 12, marginBottom: 14 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Bone w={42} h={42} r={21} />
            <View style={{ flex: 1, gap: 8 }}>
              <Bone w="45%" h={13} />
              <Bone w="30%" h={11} />
            </View>
            <Bone w={64} h={24} r={12} />
          </View>
          <Bone w="90%" h={14} />
          <Bone w="65%" h={14} />
          {i === 0 ? <Bone w="100%" h={150} r={18} /> : null}
        </View>
      ))}
    </View>
  );
}
