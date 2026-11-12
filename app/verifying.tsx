import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, View } from 'react-native';
import { router } from 'expo-router';
import { Btn, Grow, Page, Pict, Sub, Title, Txt } from '../src/ui/kit';
import { Icon } from '../src/ui/Icon';
import { C } from '../src/ui/theme';
import { ui } from '../src/data/db';
import { idShots, submitDocs } from '../src/logic/verify';

const ITEMS = ['Uploading your photos', 'Sending them to bolo', 'Waiting for a reviewer'];

/** Sends the ID photos and selfie for a real check. A reviewer approves them; the badge appears after that. */
export default function Verifying() {
  const [st, setSt] = useState<('' | 'run' | 'ok' | 'err')[]>(['run', '', '']);
  const [err, setErr] = useState('');
  const spin = useRef(new Animated.Value(0)).current;
  const send = async () => {
    setErr('');
    setSt(['run', '', '']);
    const t = setTimeout(() => setSt(['ok', 'run', '']), 700);
    const e = await submitDocs(idShots.files, 'id');
    clearTimeout(t);
    if (e) {
      setErr(e);
      setSt(['err', '', '']);
      return;
    }
    idShots.files = [];
    setSt(['ok', 'ok', 'ok']);
  };
  useEffect(() => {
    const l = Animated.loop(Animated.timing(spin, { toValue: 1, duration: 900, easing: Easing.linear, useNativeDriver: true }));
    l.start();
    void send();
    return () => l.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const all = st.every((x) => x === 'ok');
  const leave = () => {
    if (ui.verifyReturn) {
      const to = ui.verifyReturn;
      ui.verifyReturn = '';
      router.dismissTo(to as any);
    } else router.push('/done');
  };
  return (
    <Page>
      <View style={{ height: 64 }} />
      <Pict pic="art/verify" style={{ width: '90%', maxWidth: 320, aspectRatio: 340 / 300, alignSelf: 'center' }} fit="contain" />
      <Title sm center>{all ? 'Sent for checking' : err ? 'Couldn’t send your photos' : 'Sending your documents'}</Title>
      <Sub center>{all ? 'A bolo reviewer checks your ID, usually within a day. You’ll get a notification, and a verified badge, once it’s approved. You can use bolo meanwhile.' : err || 'This takes a few seconds on a good connection.'}</Sub>
      <View style={{ gap: 16, marginTop: 28, alignSelf: 'center' }}>
        {ITEMS.map((t, i) => (
          <View key={t} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            {st[i] === 'run' ? (
              <Animated.View style={{ width: 26, height: 26, borderRadius: 13, borderWidth: 2, borderColor: C.yellow, borderTopColor: 'transparent', transform: [{ rotate: spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }] }} />
            ) : (
              <View style={{ width: 26, height: 26, borderRadius: 13, borderWidth: 2, borderColor: st[i] === 'ok' ? C.ok : st[i] === 'err' ? C.err : C.s3, backgroundColor: st[i] === 'ok' ? C.ok : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
                {st[i] === 'ok' ? <Icon name="check" size={14} color="#fff" /> : st[i] === 'err' ? <Icon name="x" size={14} color={C.err} /> : null}
              </View>
            )}
            <Txt s={14} w={6} c={st[i] === 'ok' ? C.text : C.faint}>
              {i === 2 && all ? 'With a reviewer now' : t}
            </Txt>
          </View>
        ))}
      </View>
      <Grow />
      {err ? <Btn variant="yellow" title="Try again" style={{ marginTop: 24 }} onPress={send} /> : null}
      <Btn testID="finish-verification" title={all ? 'Continue' : err ? 'Skip for now' : 'Sending…'} variant={err ? 'ghost' : undefined} disabled={!all && !err} style={{ marginTop: err ? 10 : 24 }} onPress={leave} />
    </Page>
  );
}
