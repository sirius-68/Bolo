import React from 'react';
import { Pressable, View } from 'react-native';
import { Field, Input, Pict, Seg, Txt, tap } from '../ui/kit';
import { C, R } from '../ui/theme';

/** Shared sign-up state between auth screens. */
export const signup = { otpMode: 'signup' as 'signup' | 'reset' | 'login', contact: '', next: null as null | (() => void) };

export type Mode = 'phone' | 'email';
export function ContactField({ mode, setMode, value, onChange, error, testID }: { mode: Mode; setMode: (m: Mode) => void; value: string; onChange: (v: string) => void; error?: string | false; testID?: string }) {
  return (
    <View style={{ gap: 16 }}>
      <Seg
        items={[
          ['phone', 'Phone'],
          ['email', 'Email'],
        ]}
        value={mode}
        onChange={(m) => {
          setMode(m);
          onChange('');
        }}
      />
      <Field label={mode === 'phone' ? 'Phone number' : 'Email'} error={error}>
        {mode === 'phone' ? (
          <Input testID={testID} value={value} onChangeText={onChange} prefix="+237" placeholder="6XX XX XX XX" keyboardType="phone-pad" invalid={!!error} maxLength={14} />
        ) : (
          <Input testID={testID} value={value} onChangeText={onChange} icon="mail" placeholder="you@example.com" keyboardType="email-address" invalid={!!error} />
        )}
      </Field>
    </View>
  );
}
export const contactOk = (mode: Mode, v: string) => (mode === 'phone' ? v.replace(/\D/g, '').length >= 9 : /^\S+@\S+\.\S+$/.test(v.trim()));

export function Strength({ v }: { v: string }) {
  let s = 0;
  if (v.length >= 8) s++;
  if (/\d/.test(v)) s++;
  if (/[A-Z]/.test(v) && /[a-z]/.test(v)) s++;
  if (/[^A-Za-z0-9]/.test(v) || v.length >= 12) s++;
  return (
    <View style={{ flexDirection: 'row', gap: 6, marginTop: 10, marginHorizontal: 4 }}>
      {[0, 1, 2, 3].map((i) => (
        <View key={i} style={{ flex: 1, height: 4, borderRadius: 4, backgroundColor: i < s ? C.yellow : C.s3 }} />
      ))}
    </View>
  );
}

export function Divider({ text }: { text: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 24, marginBottom: 16 }}>
      <View style={{ flex: 1, height: 1, backgroundColor: C.s3 }} />
      <Txt s={12} w={6} c={C.muted}>
        {text}
      </Txt>
      <View style={{ flex: 1, height: 1, backgroundColor: C.s3 }} />
    </View>
  );
}

export function Socials({ onPick }: { onPick: (n: string) => void }) {
  return (
    <View style={{ flexDirection: 'row', gap: 10 }}>
      {[
        ['Apple', 'img/apple'],
        ['Google', 'img/google'],
        ['Facebook', 'img/facebook'],
      ].map(([n, f]) => (
        <Pressable
          key={n}
          accessibilityLabel={`Continue with ${n}`}
          onPress={() => {
            tap();
            onPick(n);
          }}
          style={({ pressed }) => ({ flex: 1, height: 52, borderRadius: R.md, backgroundColor: pressed ? C.s3 : C.s2, alignItems: 'center', justifyContent: 'center' })}
        >
          <Pict pic={f} style={{ width: 26, height: 26 }} fit="contain" />
        </Pressable>
      ))}
    </View>
  );
}
