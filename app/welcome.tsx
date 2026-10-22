import React from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { Btn, Fine, Grow, Page, Pict, Sub, Txt } from '../src/ui/kit';
import { C } from '../src/ui/theme';
import { db } from '../src/data/db';

export default function Welcome() {
  return (
    <Page>
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
      <Fine>By continuing you agree to bolo’s Terms and Privacy Policy.</Fine>
    </Page>
  );
}
