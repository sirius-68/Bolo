import React, { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { Btn, Grow, Page, Steps, Sub, TextLink, Title, TopBar, Txt } from '../src/ui/kit';
import { C, R, tx } from '../src/ui/theme';
import { db } from '../src/data/db';
import { signup } from '../src/components/auth';
import { toast } from '../src/ui/overlay';
import { wantsWork } from '../src/logic/account';

export default function Otp() {
  const [v, setV] = useState('');
  const [bad, setBad] = useState(false);
  const [t, setT] = useState(30);
  const inp = useRef<TextInput>(null);
  const shake = useRef(new Animated.Value(0)).current;
  const reset = signup.otpMode === 'reset';
  const c = reset ? signup.contact : db.user.contact;
  const d = (c || '').replace(/\D/g, '');
  const to = c.includes('@') ? c : '+237 ' + (d ? d.slice(0, 1) + '•• •• •• ' + d.slice(-2) : '6•• •• •• 40');

  useEffect(() => {
    const i = setInterval(() => setT((x) => (x > 0 ? x - 1 : 0)), 1000);
    const f = setTimeout(() => inp.current?.focus(), 350);
    return () => {
      clearInterval(i);
      clearTimeout(f);
    };
  }, []);

  const verify = (code: string) => {
    if (code.length < 4) return;
    if (code !== '1234') {
      setBad(true);
      Animated.sequence([-6, 6, -4, 4, 0].map((x) => Animated.timing(shake, { toValue: x, duration: 60, useNativeDriver: true }))).start();
      toast('That code isn’t right. Try 1234');
      setTimeout(() => {
        setV('');
        setBad(false);
      }, 500);
      return;
    }
    toast('Verified');
    router.replace(reset ? '/reset' : '/setup');
  };
  const change = (x: string) => {
    const n = x.replace(/\D/g, '').slice(0, 4);
    setV(n);
    setBad(false);
    if (n.length === 4) setTimeout(() => verify(n), 200);
  };
  return (
    <Page keyboard>
      <TopBar title="Verification" />
      {!reset ? <Steps total={wantsWork() ? 7 : 3} on={2} /> : null}
      <Title sm>Enter the code</Title>
      <Sub>
        We sent a 4‑digit code to <Txt s={14} w={8}>{to}</Txt>. <Txt s={14} c={C.faint}>(Demo code: 1234)</Txt>
      </Sub>
      <Pressable onPress={() => inp.current?.focus()} accessibilityLabel="Enter the 4-digit code">
        <Animated.View style={{ flexDirection: 'row', gap: 12, justifyContent: 'center', marginTop: 30, transform: [{ translateX: shake }] }}>
          {[0, 1, 2, 3].map((i) => (
            <View
              key={i}
              style={{ width: 62, height: 68, borderRadius: R.md, backgroundColor: C.s2, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: bad ? C.err : i === v.length ? C.blue : 'transparent' }}
            >
              <Txt s={28} w={8}>
                {v[i] || ''}
              </Txt>
            </View>
          ))}
        </Animated.View>
      </Pressable>
      <TextInput
        ref={inp}
        testID="otp-input"
        value={v}
        onChangeText={change}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="sms-otp"
        maxLength={4}
        style={[tx(1), { position: 'absolute', opacity: 0, height: 1, width: 1 }]}
      />
      <View style={{ alignItems: 'center', marginTop: 18 }}>
        {t > 0 ? (
          <Txt s={13} c={C.muted}>
            Resend code in <Txt s={13} w={8}>0:{String(t).padStart(2, '0')}</Txt>
          </Txt>
        ) : (
          <View style={{ flexDirection: 'row', gap: 6 }}>
            <Txt s={13} c={C.muted}>Didn’t get it?</Txt>
            <TextLink
              title="Resend code"
              onPress={() => {
                setT(30);
                toast('New code sent');
              }}
            />
          </View>
        )}
      </View>
      <Grow />
      <Btn testID="otp-verify" title="Verify" disabled={v.length < 4} onPress={() => verify(v)} style={{ marginTop: 24 }} />
    </Page>
  );
}
