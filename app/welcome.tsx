import React from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { Btn, Fine, Grow, Page, Pict, Sub, TextLink, Txt } from '../src/ui/kit';
import { Pressable } from 'react-native';
import { bump, useLive } from '../src/logic/live';
import { toast } from '../src/ui/overlay';
import { C } from '../src/ui/theme';
import { db } from '../src/data/db';

export default function Welcome() {
  useLive();
  return (
    <Page>
      {db.demo ? (
        <Pressable
          testID="demo-exit"
          accessibilityRole="button"
          onPress={() => {
            db.demo = false;
            bump();
            toast('Demo mode off — accounts are real again');
          }}
          style={{ alignSelf: 'center', marginTop: 8, paddingHorizontal: 14, height: 32, borderRadius: 999, backgroundColor: 'rgba(169,182,255,.18)', justifyContent: 'center' }}
        >
          <Txt s={12} w={8} c={C.lav}>
            Demo mode · sample data, nothing is saved online · Exit
          </Txt>
        </Pressable>
      ) : null}
      <Grow />
      <Pict pic="art/welcome" style={{ width: '100%', maxWidth: 340, aspectRatio: 340 / 300, alignSelf: 'center' }} fit="contain" />
      <View style={{ alignItems: 'center' }}>
        <Pict pic="img/logo-yellow" style={{ width: 120, height: 43, marginTop: 10 }} fit="contain" />
        <Txt s={28} w={8} center style={{ marginTop: 10, lineHeight: 32 }}>
          Jobs, talent and careers — near you
        </Txt>
        <Sub center>Find work, hire skilled people, or recruit for your business — from developers and teachers to plumbers and drivers.</Sub>
      </View>
      <View style={{ gap: 12, marginTop: 24 }}>
        <Btn
          testID="create-account"
          title="Create an account"
          onPress={() => {
            db.user.bizOnly = false;
            router.push('/role');
          }}
        />
        <Btn testID="create-business" title="Create a business account" icon="storefront" variant="ghost" onPress={() => router.push('/bizob')} />
        <Btn testID="have-account" title="I already have an account" variant="ghost" onPress={() => router.push('/login')} />
      </View>
      {!db.demo ? (
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 18 }}>
          <Txt s={13} c={C.muted}>Just looking?</Txt>
          <TextLink
            testID="demo"
            title="Explore the demo"
            s={13}
            onPress={() => {
              db.demo = true;
              bump();
              toast('Demo mode: sample data, codes are 1234, nothing is saved online');
            }}
          />
        </View>
      ) : null}
      <Fine>By continuing you agree to bolo’s Terms and Privacy Policy.</Fine>
    </Page>
  );
}
