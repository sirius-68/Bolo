import React, { useEffect, useRef } from 'react';
import { Animated, Easing, View } from 'react-native';
import { router } from 'expo-router';
import * as Location from 'expo-location';
import { Avatar, Btn, Grow, Page, Sub, Title, TopBar, Txt } from '../src/ui/kit';
import { Icon } from '../src/ui/Icon';
import { C } from '../src/ui/theme';
import { db } from '../src/data/db';
import { toast } from '../src/ui/overlay';
import { wantsWork } from '../src/logic/account';

const PINS: [string, number, number][] = [
  ['yann', 0.08, 0.22],
  ['njinda', 0.72, 0.1],
  ['grace', 0.04, 0.7],
  ['samuel', 0.78, 0.66],
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
      const r = await Location.requestForegroundPermissionsAsync();
      if (r.granted) toast('Location on');
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
        {PINS.map(([id, x, y], i) => (
          <Animated.View key={id} style={{ position: 'absolute', left: (`${x * 100}%` as any), top: (`${y * 100}%` as any), alignItems: 'center', gap: 4, transform: [{ scale: pop[i] }] }}>
            <Avatar pic={db.P[id].pin} size={44} ring="#fff" />
            <Txt s={11} w={7}>
              {db.P[id].name.split(' ')[0]}
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
