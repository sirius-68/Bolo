import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, View } from 'react-native';
import { router } from 'expo-router';
import { Btn, Grow, Page, Pict, Sub, Title, Txt } from '../src/ui/kit';
import { Icon } from '../src/ui/Icon';
import { C } from '../src/ui/theme';
import { db, ui } from '../src/data/db';

const ITEMS = ['Documents uploaded', 'Documents approved', 'Selfie approved'];

export default function Verifying() {
  const [st, setSt] = useState<('' | 'run' | 'ok')[]>(['', '', '']);
  const spin = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const l = Animated.loop(Animated.timing(spin, { toValue: 1, duration: 900, easing: Easing.linear, useNativeDriver: true }));
    l.start();
    const ts: any[] = [];
    ITEMS.forEach((_, i) => {
      ts.push(setTimeout(() => setSt((s) => s.map((x, j) => (j === i ? 'run' : x))), i * 1100));
      ts.push(setTimeout(() => setSt((s) => s.map((x, j) => (j === i ? 'ok' : x))), i * 1100 + 900));
    });
    return () => {
      l.stop();
      ts.forEach(clearTimeout);
    };
  }, []);
  const all = st.every((x) => x === 'ok');
  return (
    <Page>
      <View style={{ height: 64 }} />
      <Pict pic="art/verify" style={{ width: '90%', maxWidth: 320, aspectRatio: 340 / 300, alignSelf: 'center' }} fit="contain" />
      <Title sm center>Wait a minute</Title>
      <Sub center>We’re checking your profile. This usually takes less than a minute.</Sub>
      <View style={{ gap: 16, marginTop: 28, alignSelf: 'center' }}>
        {ITEMS.map((t, i) => (
          <View key={t} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            {st[i] === 'run' ? (
              <Animated.View style={{ width: 26, height: 26, borderRadius: 13, borderWidth: 2, borderColor: C.yellow, borderTopColor: 'transparent', transform: [{ rotate: spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }] }} />
            ) : (
              <View style={{ width: 26, height: 26, borderRadius: 13, borderWidth: 2, borderColor: st[i] === 'ok' ? C.ok : C.s3, backgroundColor: st[i] === 'ok' ? C.ok : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
                {st[i] === 'ok' ? <Icon name="check" size={14} color="#fff" /> : null}
              </View>
            )}
            <Txt s={14} w={6} c={st[i] === 'ok' ? C.text : C.faint}>
              {t}
            </Txt>
          </View>
        ))}
      </View>
      <Grow />
      <Btn
        testID="finish-verification"
        title="Finish verification"
        disabled={!all}
        style={{ marginTop: 24 }}
        onPress={() => {
          db.user.verified = true;
          // Demo approves at once; real accounts wait for a reviewer.
          db.PR.docs.id = db.demo ? 'verified' : 'review';
          if (ui.verifyReturn) {
            const to = ui.verifyReturn;
            ui.verifyReturn = '';
            router.dismissTo(to as any);
          } else router.push('/done');
        }}
      />
    </Page>
  );
}
