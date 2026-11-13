import React, { useEffect, useRef } from 'react';
import { Animated, Easing, View } from 'react-native';
import { router } from 'expo-router';
import * as Location from 'expo-location';
import { locate } from '../src/logic/here';
import { cityLabel } from '../src/logic/core';
import { Btn, Grow, Page, Sub, Title, TopBar, Txt } from '../src/ui/kit';
import { Icon } from '../src/ui/Icon';
import { C } from '../src/ui/theme';
import { toast } from '../src/ui/overlay';
import { wantsWork } from '../src/logic/account';

// Kinds of help around you (an illustration: no real people are shown before location is allowed).
const PINS: [string, string, number, number][] = [
  ['cat-plumber', 'Plumber', 0.08, 0.22],
  ['cat-electrician', 'Electrician', 0.7, 0.1],
  ['cat-cleaner', 'Cleaner', 0.04, 0.7],
  ['cat-tailor', 'Tailor', 0.76, 0.66],
];

export default function LocationScreen() {
  const w = wantsWork();
  const pulse = useRef(new Animated.Value(0)).current;
  const pop = useRef(PINS.map(() => new Animated.Value(0))).current;
  useEffect(() => {
    const l = Animated.loop(Animated.timing(pulse, { toValue: 1, duration: 2600, easing: Easing.out(Easing.quad), useNativeDriver: true }));
    l.start();
    Animated.stagger(300, pop.map((p) => Animated.spring(p, { toValue: 1, useNativeDriver: true, bounciness: 10 }))).start();
    return () => l.stop();
  }, []);
  const after = () => router.push(w ? '/jobtypes' : '/done');
  const allow = async () => {
    try {
      // Ask now; the position and city fill in in the background so the next screen isn't held up.
      const p = await Location.requestForegroundPermissionsAsync();
      if (p.granted) locate(false).then((c) => c && cityLabel() && toast('Location on · ' + cityLabel()));
      else toast('You can turn location on later in Settings');
    } catch {}
    after();
  };
  return (
    <Page bg={C.blue}>
      <TopBar />
      <View style={{ width: '100%', maxWidth: 330, aspectRatio: 1, alignSelf: 'center', marginTop: 12 }}>
        {[1, 0.72, 0.44].map((s) => (
          <View key={s} style={{ position: 'absolute', top: (`${(1 - s) * 50}%` as any), left: (`${(1 - s) * 50}%` as any), width: (`${s * 100}%` as any), height: (`${s * 100}%` as any), borderRadius: 999, borderWidth: 1.5, borderColor: 'rgba(255,255,255,.22)' }} />
        ))}
        <Animated.View
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 999, borderWidth: 1.5, borderColor: 'rgba(255,255,255,.5)', opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }), transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }) }] }}
        />
        <View style={{ position: 'absolute', top: '50%', left: '50%', marginLeft: -42, marginTop: -42, width: 84, height: 84, borderRadius: 42, backgroundColor: C.yellow, borderWidth: 3, borderColor: '#000', alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="pin" size={36} color="#000" />
        </View>
        {PINS.map(([icon, label, x, y], i) => (
          <Animated.View key={icon} style={{ position: 'absolute', left: (`${x * 100}%` as any), top: (`${y * 100}%` as any), alignItems: 'center', gap: 4, transform: [{ scale: pop[i] }] }}>
            <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: '#fff', borderWidth: 2, borderColor: '#000', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name={icon as any} size={22} color="#000" />
            </View>
            <Txt s={11} w={7}>
              {label}
            </Txt>
          </Animated.View>
        ))}
      </View>
      <View style={{ alignItems: 'center' }}>
        <Title sm center style={{ marginTop: 14 }}>
          {w ? 'Get found nearby' : 'Find help nearby'}
        </Title>
        <Sub center style={{ color: 'rgba(255,255,255,.78)' }}>
          {w ? 'Allow location so people and businesses around you can find you and see how far away you are.' : 'Allow location so we can show skilled people around you and how far away they are.'}
        </Sub>
      </View>
      <Grow />
      <View style={{ gap: 12, marginTop: 24 }}>
        <Btn testID="allow-location" title="Allow location access" onPress={allow} />
        <Btn testID="not-now" title="Not now" variant="ghost" style={{ borderColor: 'rgba(255,255,255,.35)' }} onPress={after} />
      </View>
    </Page>
  );
}
