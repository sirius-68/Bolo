import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Field, Input, Pict, Seg, Txt, tap } from '../ui/kit';
import { Icon } from '../ui/Icon';
import { pick } from '../ui/overlay';
import { C, R } from '../ui/theme';
import { COUNTRIES, Country, countryByIso, deviceCountry, flag } from '../data/countries';

/** Last country picked for phone numbers (starts as the phone's own region). */
let lastCountry: Country | null = null;
const defCountry = () => (lastCountry ||= deviceCountry());

/** Split a stored number (+7 9151234567, or an old local Cameroon number) into country + local part. */
export function splitPhone(v: string, hint?: Country): { c: Country; local: string } {
  const s = (v || '').trim();
  if (!s.startsWith('+')) return { c: hint || defCountry(), local: s };
  const d = s.replace(/\D/g, '');
  if (hint && d.startsWith(hint.dial)) return { c: hint, local: d.slice(hint.dial.length) };
  const best = COUNTRIES.filter((c) => d.startsWith(c.dial)).sort((a, b) => b.dial.length - a.dial.length)[0];
  return best ? { c: best, local: d.slice(best.dial.length) } : { c: defCountry(), local: d };
}
const joinPhone = (c: Country, local: string) => '+' + c.dial + ' ' + local.replace(/[^\d ]/g, '').replace(/^0+/, '');

/** Phone number input with a country / dialling-code picker. `value` is the full international number, e.g. "+7 9151234567". */
export function PhoneInput({ value, onChange, invalid, testID }: { value: string; onChange: (v: string) => void; invalid?: boolean; testID?: string }) {
  const [iso, setIso] = useState<string | null>(null);
  const { c, local } = splitPhone(value, countryByIso(iso) || undefined);
  const choose = () => {
    tap();
    pick(
      'Country code',
      COUNTRIES.map((k) => ({ v: `${flag(k.iso)}  ${k.name}`, sub: '+' + k.dial })),
      `${flag(c.iso)}  ${c.name}`,
      (lbl) => {
        const k = COUNTRIES.find((x) => `${flag(x.iso)}  ${x.name}` === lbl);
        if (!k) return;
        lastCountry = k;
        setIso(k.iso);
        onChange(joinPhone(k, local));
      },
      true,
    );
  };
  return (
    <View style={{ flexDirection: 'row', gap: 8 }}>
      <Pressable testID={testID ? testID + '-cc' : undefined} accessibilityRole="button" accessibilityLabel={`Country code ${c.name} +${c.dial}. Change`} onPress={choose} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, height: 54, paddingHorizontal: 12, borderRadius: R.md, backgroundColor: C.s2, borderWidth: 1.5, borderColor: invalid ? C.err : 'transparent' }}>
        <Txt s={18}>{flag(c.iso)}</Txt>
        <Txt s={15} w={7}>
          +{c.dial}
        </Txt>
        <Icon name="down" size={14} color={C.muted} />
      </Pressable>
      <Input
        testID={testID}
        style={{ flex: 1 }}
        value={local}
        onChangeText={(t) => {
          if (!iso) setIso(c.iso);
          onChange(t ? joinPhone(c, t) : '');
        }}
        placeholder={c.iso === 'CM' ? '6XX XX XX XX' : c.iso === 'RU' ? '9XX XXX XX XX' : 'Phone number'}
        keyboardType="phone-pad"
        invalid={invalid}
        maxLength={16}
      />
    </View>
  );
}

/** Digits-only form of an international number, with a leading + (what Supabase/SMS expects). */
export const intlPhone = (v: string) => {
  const { c, local } = splitPhone(v);
  return '+' + c.dial + local.replace(/\D/g, '').replace(/^0+/, '');
};

/** Shared sign-up state between auth screens. */
export const signup = { otpMode: 'signup' as 'signup' | 'reset' | 'login', contact: '', pwd: '', next: null as null | (() => void) };

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
          <PhoneInput testID={testID} value={value} onChange={onChange} invalid={!!error} />
        ) : (
          <Input testID={testID} value={value} onChangeText={onChange} icon="mail" placeholder="you@example.com" keyboardType="email-address" invalid={!!error} />
        )}
      </Field>
    </View>
  );
}
export const contactOk = (mode: Mode, v: string) => {
  if (mode === 'email') return /^\S+@\S+\.\S+$/.test(v.trim());
  const n = splitPhone(v).local.replace(/\D/g, '').replace(/^0+/, '').length;
  return n >= 6 && n <= 14;
};
/** What to store / send for the contact: an email, or a phone number like +79151234567. */
export const contactValue = (mode: Mode, v: string) => (mode === 'phone' ? intlPhone(v) : v.trim());

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
