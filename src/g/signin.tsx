/* Signing in, at the moment it is needed: a phone number (or an email where text messages aren't on yet),
   a 6-digit code, and a first name the first time. No password. */
import React, { useEffect, useRef, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { db } from '../data/db';
import { COUNTRIES, Country, countryByIso, deviceCountry, flag } from '../data/countries';
import { authCaps, loadAuthCaps } from './auth';
import { startApp } from '../logic/account';
import { bump, useLive } from '../logic/live';
import { sendLoginCode, verifyLoginCode } from '../logic/remote';
import { tap } from './touch';
import { markStarted, mode, setMode } from './data';
import { RED, ft, useG } from './theme';
import { Big, Input, Label, Link, T, gsheet } from './ui';

export type SignInFor = {
  /** "Sign in to call Emmanuel" */
  title?: string;
  sub?: string;
  /** the worker's last step: their number is how clients reach them */
  work?: boolean;
  /** what to do once signed in */
  then?: () => void;
};

export function openSignIn(o: SignInFor = {}) {
  void loadAuthCaps();
  gsheet.show(() => <SignInSheet o={o} />);
}
/** Run something that needs an account: at once when signed in, otherwise after signing in. `what` finishes "Sign in to …". */
export function withAccount(what: string, run: () => void) {
  if (db.loggedIn) return run();
  openSignIn({ title: `Sign in to ${what}`, then: run });
}

const emailOk = (v: string) => /^\S+@\S+\.\S+$/.test(v.trim());

function SignInSheet({ o }: { o: SignInFor }) {
  useLive();
  const t = useG();
  const [step, setStep] = useState<'contact' | 'code' | 'name' | 'country'>('contact');
  const [cq, setCq] = useState('');
  // text messages only where the server can send them; an email works everywhere
  const [how, setHow] = useState<'phone' | 'email'>(authCaps.phone ? 'phone' : 'email');
  useEffect(() => {
    if (!authCaps.phone && how === 'phone') setHow('email');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authCaps.phone]);
  const [ctry, setCtry] = useState<Country>(() => countryByIso(db.user.country) || deviceCountry());
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [again, setAgain] = useState(0);
  const codeRef = useRef<TextInput>(null);
  const local = phone.replace(/\D/g, '').replace(/^0+/, '');
  const contact = how === 'phone' ? `+${ctry.dial}${local}` : email.trim().toLowerCase();
  const ok = how === 'phone' ? local.length >= 6 && local.length <= 14 : emailOk(email);
  // a new code can be asked for after half a minute
  useEffect(() => {
    if (step !== 'code' || again <= 0) return;
    const x = setTimeout(() => setAgain((n) => n - 1), 1000);
    return () => clearTimeout(x);
  }, [step, again]);

  const send = async () => {
    if (!ok || busy) return;
    setErr('');
    setBusy(true);
    const e = await sendLoginCode(contact);
    setBusy(false);
    if (e) return setErr(e);
    setCode('');
    setAgain(30);
    setStep('code');
  };
  const finish = () => {
    markStarted();
    gsheet.close();
    if (o.then) setTimeout(o.then, 320);
  };
  const check = async (c: string) => {
    if (c.length < 6 || busy) return;
    setErr('');
    setBusy(true);
    const e = await verifyLoginCode(contact, c);
    if (e) {
      setBusy(false);
      setCode('');
      codeRef.current?.focus();
      return setErr(e);
    }
    // signed in: keep doing what they were doing (hiring stays hiring), or start working
    const was = mode();
    db.user.contact = db.user.contact || contact;
    if (how === 'phone' && !db.PR.ct.phone) db.PR.ct.phone = contact;
    startApp(!!db.user.name);
    setMode(o.work ? 'work' : was);
    setBusy(false);
    if (!db.user.name) return setStep('name');
    finish();
  };
  const saveName = () => {
    const n = name.trim();
    if (n.length < 2) return;
    db.user.name = n;
    bump();
    finish();
  };
  const chooseCountry = () => {
    tap();
    setCq('');
    setStep('country');
  };
  const error = err ? (
    <T s={13} w={7} lh={1.45} c={t.accent} style={{ marginTop: 10 }}>
      {err}
    </T>
  ) : null;

  if (step === 'country') {
    const q = cq.trim().toLowerCase();
    const list = COUNTRIES.filter((k) => !q || k.name.toLowerCase().includes(q) || k.dial.startsWith(q.replace(/^\+/, ''))).slice(0, 40);
    return (
      <View>
        <T s={24} w={8} ls={-0.5}>
          Your country
        </T>
        <Input testID="signin-country-search" value={cq} onChangeText={setCq} placeholder="Search" autoFocus autoCorrect={false} style={{ marginTop: 14 }} />
        <View style={{ marginTop: 6 }}>
          {list.map((k) => (
            <Pressable
              key={k.iso}
              accessibilityRole="button"
              onPress={() => {
                tap();
                setCtry(k);
                setStep('contact');
              }}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 52, borderBottomWidth: 1, borderBottomColor: t.line }}
            >
              <Text style={ft(20, 5, t.text)}>{flag(k.iso)}</Text>
              <T s={15} w={7} lines={1} style={{ flex: 1 }}>
                {k.name}
              </T>
              <T s={15} c={t.muted}>
                +{k.dial}
              </T>
            </Pressable>
          ))}
        </View>
      </View>
    );
  }
  if (step === 'name')
    return (
      <View>
        <T s={24} w={8} lh={1.2} ls={-0.5}>
          What’s your first name?
        </T>
        <T s={14} lh={1.5} c={t.muted} style={{ marginTop: 6, marginBottom: 18 }}>
          It’s what {o.work ? 'clients' : 'workers'} see when you call or write.
        </T>
        <Label>Your first name</Label>
        <Input testID="signin-name" value={name} onChangeText={setName} placeholder="For example: Paul" autoFocus autoCapitalize="words" maxLength={40} returnKeyType="done" onSubmitEditing={saveName} />
        <Big testID="signin-name-continue" title="Continue" disabled={name.trim().length < 2} onPress={saveName} style={{ marginTop: 18 }} />
      </View>
    );

  if (step === 'code')
    return (
      <View>
        <T s={24} w={8} lh={1.2} ls={-0.5}>
          Enter the code
        </T>
        <T s={14} lh={1.5} c={t.muted} style={{ marginTop: 6, marginBottom: 18 }}>
          We sent it by {how === 'phone' ? 'SMS' : 'email'} to {contact}.{' '}
          <Text accessibilityRole="button" onPress={() => (setErr(''), setStep('contact'))} style={ft(14, 7, t.accent, 1.5)}>
            {how === 'phone' ? 'Change number' : 'Change email'}
          </Text>
        </T>
        <Pressable accessibilityLabel="Code, 6 digits" onPress={() => codeRef.current?.focus()} style={{ flexDirection: 'row', gap: 8 }}>
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <View key={i} style={{ flex: 1, height: 58, borderRadius: 14, backgroundColor: t.card2, borderWidth: 2, borderColor: i === code.length ? RED : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
              <Text maxFontSizeMultiplier={1} style={ft(24, 8, t.text, 1.2)}>
                {code[i] || ''}
              </Text>
            </View>
          ))}
        </Pressable>
        {/* the real field: off screen, it only takes the typing (and the code a phone offers from the SMS) */}
        <TextInput
          ref={codeRef}
          testID="signin-code"
          value={code}
          onChangeText={(v) => {
            const c = v.replace(/\D/g, '').slice(0, 6);
            setCode(c);
            if (c.length === 6) void check(c);
          }}
          keyboardType="number-pad"
          autoFocus
          autoComplete="sms-otp"
          textContentType="oneTimeCode"
          maxLength={6}
          caretHidden
          style={{ position: 'absolute', opacity: 0.01, height: 58, left: 0, right: 0, top: 96 }}
        />
        {error}
        <T s={13} c={t.muted} style={{ marginTop: 14 }}>
          {busy ? 'Checking…' : 'It can take a minute to arrive.'}
        </T>
        <Big testID="signin-check" title="Continue" loading={busy} disabled={code.length < 6} onPress={() => void check(code)} style={{ marginTop: 18 }} />
        <Link title={again > 0 ? `Send a new code in ${again} s` : 'Send a new code'} color={again > 0 ? t.muted : t.accent} onPress={() => again <= 0 && void send()} style={{ marginTop: 6 }} />
      </View>
    );

  return (
    <View>
      <T s={24} w={8} lh={1.2} ls={-0.5}>
        {o.title || (o.work ? (how === 'phone' ? 'Last step: your number' : 'Last step: your email') : 'Welcome back')}
      </T>
      <T s={14} lh={1.5} c={t.muted} style={{ marginTop: 6, marginBottom: 18 }}>
        {o.sub || (o.work ? (how === 'phone' ? 'Clients will call or message you on this number. We send you a code to check it.' : 'It keeps your profile yours. We email you a code to check it. Clients call and message you inside getit.') : o.title ? 'Just your number, once. No password, no forms.' : how === 'phone' ? 'Enter your number and we’ll text you a code.' : 'Enter your email and we’ll send you a code.')}
      </T>
      {how === 'phone' ? (
        <>
          <Label>Phone number</Label>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Pressable testID="signin-cc" accessibilityRole="button" accessibilityLabel={`Country code ${ctry.name} +${ctry.dial}. Change`} onPress={chooseCountry} style={{ height: 52, paddingHorizontal: 14, borderRadius: 16, borderWidth: 1, borderColor: t.line, backgroundColor: t.card2, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={ft(17, 5, t.text)}>{flag(ctry.iso)}</Text>
              <Text maxFontSizeMultiplier={1.2} style={ft(16, 7, t.text)}>
                +{ctry.dial}
              </Text>
            </Pressable>
            <Input testID="signin-phone" value={phone} onChangeText={(v) => (setPhone(v.replace(/[^\d ]/g, '')), setErr(''))} placeholder={ctry.iso === 'CM' ? '6XX XX XX XX' : 'Phone number'} keyboardType="phone-pad" maxLength={16} returnKeyType="done" onSubmitEditing={send} style={{ flex: 1 }} />
          </View>
        </>
      ) : (
        <>
          <Label>Email</Label>
          <Input testID="signin-email" value={email} onChangeText={(v) => (setEmail(v), setErr(''))} placeholder="you@example.com" keyboardType="email-address" autoCapitalize="none" autoCorrect={false} maxLength={120} returnKeyType="done" onSubmitEditing={send} />
        </>
      )}
      {error}
      <Big testID="signin-send" title="Send me a code" loading={busy} disabled={!ok} onPress={send} style={{ marginTop: 18 }} />
      {authCaps.phone ? <Link testID="signin-switch" title={how === 'phone' ? 'Use my email instead' : 'Use my phone number instead'} color={t.text} onPress={() => (setErr(''), setHow(how === 'phone' ? 'email' : 'phone'))} style={{ marginTop: 6 }} /> : null}
      <T s={12} lh={1.5} c={t.muted} center style={{ marginTop: 14 }}>
        No password to remember. By continuing you confirm you’re 18 or older and accept the getit terms.
      </T>
    </View>
  );
}
