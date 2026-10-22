import React from 'react';
import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { Btn, Page, Pict, Sub, Title, TopBar, Txt, tap } from '../src/ui/kit';
import { Icon } from '../src/ui/Icon';
import { C } from '../src/ui/theme';
import { db } from '../src/data/db';
import { useLive, bump } from '../src/logic/live';
import { toggle } from '../src/logic/core';

const ROLES: [string, string, string, string, string, string][] = [
  ['find', 'Find work', 'Jobs, gigs, internships and programs near you', 'toolbox', C.yellow, '#000'],
  ['hire', 'Hire for personal jobs', 'A fix at home, a tutor, a driver', 'house', C.blue, '#fff'],
  ['biz', 'Hire for my business', 'Vacancies, contracts, internships and programs', 'phone', C.lav, '#000'],
];

export default function Role() {
  useLive();
  const I = db.user.intents;
  return (
    <Page>
      <TopBar title="Sign up" />
      <Title>What brings you to bolo?</Title>
      <Sub>Pick all that apply. Everyone gets a Regular profile — you can add a business page any time.</Sub>
      <View style={{ gap: 14, marginTop: 28 }}>
        {ROLES.map(([k, t, s, art, bg, fg]) => {
          const on = I.includes(k);
          return (
            <Pressable
              key={k}
              testID={`intent-${k}`}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: on }}
              onPress={() => {
                tap();
                toggle(I, k);
                bump();
              }}
              style={({ pressed }) => ({
                minHeight: 150,
                padding: 20,
                borderRadius: 22,
                backgroundColor: bg,
                overflow: 'hidden',
                justifyContent: 'flex-end',
                borderWidth: 3,
                borderColor: on ? '#fff' : 'transparent',
                transform: [{ translateY: pressed ? 1 : 0 }],
              })}
            >
              <Pict pic={`art/${art}`} style={{ position: 'absolute', right: -14, top: -14, width: 150, height: 132 }} fit="contain" />
              <View style={{ position: 'absolute', left: 18, top: 18, width: 26, height: 26, borderRadius: 13, borderWidth: 2, borderColor: on ? (fg === '#fff' ? '#fff' : '#000') : fg, backgroundColor: on ? (fg === '#fff' ? '#fff' : '#000') : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
                {on ? <Icon name="check" size={14} color={fg === '#fff' ? C.blue : C.yellow} /> : null}
              </View>
              <Txt s={20} w={8} c={fg}>
                {t}
              </Txt>
              <Txt s={13} c={fg} style={{ opacity: 0.78, maxWidth: 200, marginTop: 2 }}>
                {s}
              </Txt>
            </Pressable>
          );
        })}
      </View>
      <View style={{ flex: 1, minHeight: 20 }} />
      <Btn testID="role-continue" title={I.length ? 'Continue' : 'Pick at least one'} disabled={!I.length} onPress={() => router.push('/signup')} style={{ marginTop: 24 }} />
    </Page>
  );
}
