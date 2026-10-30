import React, { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { Btn, Grow, Page, Steps, Sub, TextLink, Title, TopBar, Txt } from '../src/ui/kit';
import { C, R, tx } from '../src/ui/theme';
import { db } from '../src/data/db';
import { signup, splitPhone } from '../src/components/auth';
import { showPhone } from '../src/data/countries';
import { toast } from '../src/ui/overlay';
import { wantsWork } from '../src/logic/account';
import { isReal, resendCode, signIn, verifyCode } from '../src/logic/remote';

/** +7 9•• ••• •• 67 — keeps the country code and the last two digits. */
function maskPhone(p: string) {
  const { c, local } = splitPhone(showPhone(p));
  const l = local.replace(/\D/g, '');
  return '+' + c.dial + ' ' + l.split('').map((x, i) => (i === 0 || i >= l.length - 2 ? x : '•')).join('');
}

export default function Otp() {
  const [v, setV] = useState('');
  const [bad, setBad] = useState(false);
  const [t, setT] = useState(30);
  const [busy, setBusy] = useState(false);
  const real = isReal();
  const LEN = real ? 6 : 4;
  const inp = useRef<TextInput>(null);
  const shake = useRef(new Animated.Value(0)).current;
  const reset = signup.otpMode === 'reset';
  const c = signup.contact || db.user.contact;
  const d = (c || '').replace(/\D/g, '');
  const to = c.includes('@') ? c : d ? maskPhone(c) : '+237 6•• •• •• 40';

  useEffect(() => {
    const i = setInterval(() => setT((x) => (x > 0 ? x - 1 : 0)), 1000);
    const f = setTimeout(() => inp.current?.focus(), 350);
    return () => {
      clearInterval(i);
      clearTimeout(f);
    };
  }, []);

  const fail = (msg: string) => {
    setBad(true);
    Animated.sequence([-6, 6, -4, 4, 0].map((x) => Animated.timing(shake, { toValue: x, duration: 60, useNativeDriver: true }))).start();
    toast(msg);
    setTimeout(() => {
      setV('');
      setBad(false);
    }, 500);
  };
  const ok = () => {
    toast('Verified');
    if (signup.next) {
      const n = signup.next;
      signup.next = null;
      return n();
    }
    signup.pwd = '';
    router.replace(reset ? '/reset' : '/setup');
  };
  // Some email templates send a confirmation link instead of a code. Once the link is tapped the
  // account is confirmed, so logging in with the password just chosen finishes the same step.
  const linkDone = async () => {
    if (busy) return;
    setBusy(true);
    const e = await signIn(c, signup.pwd);
    setBusy(false);
    if (e) return toast(/confirm/i.test(e) ? 'Not confirmed yet. Tap the link in the email first' : e);
    ok();
  };
  const canLink = real && !reset && c.includes('@') && !!signup.pwd;
  const verify = async (code: string) => {
    if (code.length < LEN || busy) return;
    if (!real) return code === '1234' ? ok() : fail('That code isn’t right. Try 1234');
    setBusy(true);
    const e = await verifyCode(c, code, reset ? 'recovery' : 'signup');
    setBusy(false);
    if (e) return fail(e);
    ok();
  };
  const change = (x: string) => {
    const n = x.replace(/\D/g, '').slice(0, LEN);
    setV(n);
    setBad(false);
    if (n.length === LEN) setTimeout(() => verify(n), 200);
  };
  return (
    <Page keyboard>
      <TopBar title="Verification" />
      {!reset ? <Steps total={wantsWork() ? 7 : 3} on={2} /> : null}
      <Title sm>Enter the code</Title>
      <Sub>
        We sent a {LEN}‑digit code to <Txt s={14} w={8}>{to}</Txt>.{real ? (c.includes('@') ? ' Check your inbox and spam folder.' : '') : <Txt s={14} c={C.faint}> (Demo code: 1234)</Txt>}
      </Sub>
      <Pressable onPress={() => inp.current?.focus()} accessibilityLabel={`Enter the ${LEN}-digit code`}>
        <Animated.View style={{ flexDirection: 'row', gap: LEN > 4 ? 8 : 12, justifyContent: 'center', marginTop: 30, transform: [{ translateX: shake }] }}>
          {Array.from({ length: LEN }, (_, i) => i).map((i) => (
            <View
              key={i}
              style={{ width: LEN > 4 ? 46 : 62, height: 64, borderRadius: R.md, backgroundColor: C.s2, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: bad ? C.err : i === v.length ? C.blue : 'transparent' }}
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
        maxLength={LEN}
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
              onPress={async () => {
                setT(30);
                if (real) {
                  const e = await resendCode(c, reset ? 'recovery' : 'signup');
                  if (e) return toast(e);
                }
                toast('New code sent');
              }}
            />
          </View>
        )}
      </View>
      {canLink ? (
        <View style={{ alignItems: 'center', marginTop: 14 }}>
          <TextLink testID="otp-link" title="Got a link instead? I’ve tapped it" onPress={linkDone} />
        </View>
      ) : null}
      <Grow />
      <Btn testID="otp-verify" title="Verify" loading={busy} disabled={v.length < LEN} onPress={() => verify(v)} style={{ marginTop: 24 }} />
    </Page>
  );
}
