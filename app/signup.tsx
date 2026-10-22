import React, { useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { Btn, Check, Field, Input, Page, Steps, Sub, TextLink, Title, TopBar, Txt } from '../src/ui/kit';
import { C } from '../src/ui/theme';
import { db } from '../src/data/db';
import { ContactField, Divider, Mode, Socials, Strength, contactOk, signup } from '../src/components/auth';
import { toast } from '../src/ui/overlay';
import { wantsWork } from '../src/logic/account';

export default function Signup() {
  const [mode, setMode] = useState<Mode>('phone');
  const [name, setName] = useState(db.user.name);
  const [contact, setContact] = useState('');
  const [pwd, setPwd] = useState('');
  const [terms, setTerms] = useState(false);
  const [tried, setTried] = useState(false);
  const bad = { name: tried && name.trim().length < 2, contact: tried && !contactOk(mode, contact), pwd: tried && pwd.length < 8 };
  const submit = () => {
    setTried(true);
    if (name.trim().length < 2 || !contactOk(mode, contact) || pwd.length < 8) return;
    db.user.name = name.trim();
    db.user.contact = mode === 'phone' ? contact.replace(/\D/g, '') : contact.trim();
    if (mode === 'phone') db.PR.ct.phone = db.user.contact;
    else db.PR.ct.email = db.user.contact;
    signup.otpMode = 'signup';
    router.push('/otp');
  };
  return (
    <Page keyboard>
      <TopBar title="Create account" />
      <Steps total={wantsWork() ? 7 : 3} on={1} />
      <Title sm>Let’s get you started</Title>
      <Sub>{wantsWork() ? 'Get hired by people and businesses around you.' : 'Hire trusted people around you in minutes.'}</Sub>
      <View style={{ gap: 16, marginTop: 28 }}>
        <Field label="Full name" error={bad.name && 'Enter your full name'}>
          <Input testID="su-name" value={name} onChangeText={setName} icon="user" placeholder="e.g. Edward Isle" invalid={bad.name} autoCapitalize="words" />
        </Field>
        <ContactField testID="su-contact" mode={mode} setMode={setMode} value={contact} onChange={setContact} error={bad.contact && (mode === 'phone' ? 'Enter a valid phone number' : 'Enter a valid email address')} />
        <Field label="Password" error={bad.pwd && 'Use 8 or more characters'}>
          <Input testID="su-pwd" value={pwd} onChangeText={setPwd} icon="lock" placeholder="At least 8 characters" secure invalid={bad.pwd} />
          <Strength v={pwd} />
        </Field>
        <Check on={terms} onPress={() => setTerms(!terms)}>
          I agree to bolo’s <Txt s={13} w={7} c={C.lav}>Terms of Service</Txt> and <Txt s={13} w={7} c={C.lav}>Privacy Policy</Txt>.
        </Check>
        <Btn testID="su-submit" title="Create account" disabled={!terms} onPress={submit} />
      </View>
      <Divider text="or sign up with" />
      <Socials
        onPick={(n) => {
          toast(`Connected with ${n}`);
          router.push('/setup');
        }}
      />
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 22 }}>
        <Txt s={14} c={C.muted}>Already have an account?</Txt>
        <TextLink title="Log in" s={14} onPress={() => router.replace('/login')} />
      </View>
    </Page>
  );
}
