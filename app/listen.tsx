import React, { useEffect, useRef, useState } from 'react';
import { Linking, Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { understand, plural } from '../src/g/data';
import { GIcon } from '../src/g/icons';
import { ft, useG } from '../src/g/theme';
import { BigButton, Link, Round, Screen, T } from '../src/g/ui';
import { tap } from '../src/g/touch';
import { SR, canListen } from '../src/g/speech';

function phoneSpeaksFrench() {
  try {
    const L = require('expo-localization');
    return String(L.getLocales?.()[0]?.languageCode || '').toLowerCase() === 'fr';
  } catch {
    return false;
  }
}

type Phase = 'listening' | 'got' | 'finding' | 'quiet' | 'blocked';

/** Tap, say it. What was heard shows as it is said; then the right workers open. */
export default function Listen() {
  const t = useG();
  const ins = useSafeAreaInsets();
  const [phase, setPhase] = useState<Phase>('listening');
  const [heard, setHeard] = useState('');
  const [trade, setTrade] = useState('');
  const [french, setFrench] = useState(phoneSpeaksFrench);
  const said = useRef('');
  const done = useRef(false);
  const live = useRef(true);
  const type = (q = '') => router.replace((q ? `/need?q=${encodeURIComponent(q)}&miss=1` : '/need') as any);

  const finish = async (text: string) => {
    if (done.current) return;
    const words = text.trim();
    if (!words) return setPhase('quiet');
    done.current = true;
    setHeard(words);
    setPhase('got');
    const u = await understand(words);
    if (!live.current) return;
    if (!u.trade) return type(words);
    setTrade(u.trade);
    setPhase('finding');
    setTimeout(() => live.current && router.replace(`/workers?trade=${encodeURIComponent(u.trade!)}&need=${encodeURIComponent(u.title)}` as any), 500);
  };
  const start = async (fr = french) => {
    if (!SR) return type();
    done.current = false;
    said.current = '';
    setHeard('');
    try {
      const p = await SR.requestPermissionsAsync();
      if (!live.current) return;
      if (!p.granted) return setPhase('blocked');
      setPhase('listening');
      SR.start({ lang: fr ? 'fr-FR' : 'en-US', interimResults: true, continuous: false, maxAlternatives: 1, addsPunctuation: false });
    } catch {
      type();
    }
  };

  useEffect(() => {
    live.current = true;
    if (!canListen()) {
      type();
      return;
    }
    const subs = [
      SR!.addListener('result', (e: any) => {
        const words = String(e?.results?.[0]?.transcript || '');
        if (words) {
          said.current = words;
          setHeard(words);
        }
        if (e?.isFinal) void finish(words || said.current);
      }),
      // the recogniser stopped: use what was heard, or say that nothing was
      SR!.addListener('end', () => {
        if (!done.current) void finish(said.current);
      }),
      SR!.addListener('error', (e: any) => {
        const code = String(e?.error || '');
        if (code === 'not-allowed' || code === 'service-not-allowed') setPhase('blocked');
        else if (code === 'no-speech' || code === 'speech-timeout' || code === 'aborted') {
          if (!done.current && !said.current) setPhase('quiet');
        } else if (!done.current && !said.current) setPhase('quiet');
      }),
    ];
    void start();
    return () => {
      live.current = false;
      subs.forEach((s) => s.remove());
      try {
        SR!.abort();
      } catch {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const press = () => {
    if (phase === 'listening') {
      // done speaking: stop and use what was heard
      try {
        SR?.stop();
      } catch {}
      if (said.current) void finish(said.current);
    } else if (phase === 'quiet') void start();
    else if (phase === 'blocked') void Linking.openSettings().catch(() => {});
  };
  const title = phase === 'listening' ? 'Listening…' : phase === 'got' ? 'Got it' : phase === 'finding' ? `Finding ${plural(trade)} near you…` : phase === 'quiet' ? 'Didn’t catch that' : 'Microphone is off';
  const sub =
    phase === 'listening'
      ? 'Say what you need, in your own words'
      : phase === 'got'
        ? 'One moment'
        : phase === 'finding'
          ? 'Checking who is free'
          : phase === 'quiet'
            ? 'Tap the button and try again'
            : 'Allow the microphone for getit in your phone’s settings, or type instead';
  const busy = phase === 'listening';
  return (
    <Screen style={{ paddingHorizontal: 20, paddingBottom: 32 + ins.bottom }}>
      <View style={{ flexDirection: 'row' }}>
        <Round testID="listen-close" icon="x" label="Close" onPress={() => (router.canGoBack() ? router.back() : router.replace('/find' as any))} />
      </View>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <T s={24} w={8} ls={-0.5} center>
          {title}
        </T>
        <T s={14} c={t.muted} center style={{ marginTop: 6, marginBottom: 14, minHeight: 21, maxWidth: 300 }}>
          {sub}
        </T>
        <BigButton testID="listen-big" label={busy ? 'Stop and show workers' : phase === 'blocked' ? 'Open settings' : 'Try again'} size={320} period={1800} peak={0.4} still={!busy} onPress={press} />
        <View style={{ minHeight: 100, marginTop: 14, alignItems: 'center', gap: 6, paddingHorizontal: 8 }}>
          {heard ? (
            <T s={20} w={7} lh={1.35} ls={0} center lines={3}>
              “{heard}”
            </T>
          ) : busy ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <GIcon name="mic" size={20} color={t.muted} />
              <Text maxFontSizeMultiplier={1.3} style={ft(15, 6, t.muted)}>
                {french ? 'Parlez maintenant : « réparer mon évier »' : 'Speak now, like “fix my sink”'}
              </Text>
            </View>
          ) : null}
          {busy || phase === 'quiet' ? (
            <Link
              testID="listen-lang"
              title={french ? 'Speak in English instead' : 'Parler en français'}
              color={t.muted}
              w={6}
              h={36}
              onPress={() => {
                const fr = !french;
                setFrench(fr);
                try {
                  SR?.abort();
                } catch {}
                done.current = true;
                setTimeout(() => void start(fr), 250);
              }}
            />
          ) : null}
        </View>
      </View>
      <Pressable testID="listen-type" accessibilityRole="button" onPress={() => (tap(), type())} style={({ pressed }) => [{ alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 8, height: 48, paddingHorizontal: 20, borderRadius: 24, borderWidth: 1, borderColor: t.line, backgroundColor: t.card, opacity: pressed ? 0.8 : 1 }]}>
        <GIcon name="keyboard" size={20} color={t.text} />
        <Text maxFontSizeMultiplier={1.2} style={ft(15, 7, t.text)}>
          Type instead
        </Text>
      </Pressable>
    </Screen>
  );
}
