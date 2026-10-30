import React, { useRef, useState } from 'react';
import { Animated, Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { ui } from '../src/data/db';
import { Btn, Grow, Page, Pict, Steps, Sub, TextLink, Title, TopBar } from '../src/ui/kit';
import { C } from '../src/ui/theme';
import { pickImage } from '../src/logic/media';
import { toast } from '../src/ui/overlay';

export default function Selfie() {
  const [pic, setPic] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const flash = useRef(new Animated.Value(0)).current;
  const done = (p?: string | null) => {
    if (p) setPic(p);
    setOk(true);
    Animated.sequence([Animated.timing(flash, { toValue: 0.9, duration: 100, useNativeDriver: true }), Animated.timing(flash, { toValue: 0, duration: 400, useNativeDriver: true })]).start();
    toast('Selfie captured');
  };
  const corner = (pos: any) => <View style={[{ position: 'absolute', width: 34, height: 34, borderColor: '#fff' }, pos]} />;
  return (
    <Page>
      <TopBar right={<TextLink title="Later" onPress={() => (ui.verifyReturn ? (router.dismissTo(ui.verifyReturn as any), (ui.verifyReturn = '')) : router.push('/done'))} />} />
      <Steps total={7} on={7} />
      <Pressable onPress={() => !ok && done(null)} style={{ width: '100%', maxWidth: 300, aspectRatio: 1, alignSelf: 'center', marginTop: 22, borderRadius: 22, backgroundColor: C.lav, overflow: 'hidden' }}>
        <Pict pic={pic || 'art/face'} style={{ width: '100%', height: '100%' }} />
        <View style={{ position: 'absolute', top: '16%', left: '16%', right: '16%', bottom: '16%' }}>
          {corner({ left: 0, top: 0, borderLeftWidth: 3, borderTopWidth: 3, borderTopLeftRadius: 10 })}
          {corner({ right: 0, top: 0, borderRightWidth: 3, borderTopWidth: 3, borderTopRightRadius: 10 })}
          {corner({ left: 0, bottom: 0, borderLeftWidth: 3, borderBottomWidth: 3, borderBottomLeftRadius: 10 })}
          {corner({ right: 0, bottom: 0, borderRightWidth: 3, borderBottomWidth: 3, borderBottomRightRadius: 10 })}
        </View>
        <Animated.View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#fff', opacity: flash }} />
      </Pressable>
      <Title sm center>Take a selfie</Title>
      <Sub center>We compare your selfie with the photo on your ID. Good light, no hat or sunglasses.</Sub>
      <Grow />
      <Btn
        testID="selfie-btn"
        icon={ok ? 'check' : 'cam'}
        title={ok ? 'Looks good — continue' : 'Take selfie'}
        style={{ marginTop: 24 }}
        onPress={async () => {
          if (ok) {
            router.push('/verifying');
            return;
          }
          const p = await pickImage({ camera: true, front: true, square: true });
          if (p) done(p);
        }}
      />
      {!ok ? <TextLink title="Can’t use the camera? Tap the photo to continue" s={12} style={{ alignSelf: 'center', marginTop: 12 }} onPress={() => done(null)} /> : null}
    </Page>
  );
}
