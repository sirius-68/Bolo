import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { Btn, Field, Grow, Input, Page, Pict, TextLink, TopBar, Txt } from '../src/ui/kit';
import { C } from '../src/ui/theme';
import { db } from '../src/data/db';
import { ContactField, Divider, Mode, Socials, contactOk } from '../src/components/auth';
import { startApp } from '../src/logic/account';
import { resetTo } from '../src/logic/nav';

export default function Login() {
  const [mode, setMode] = useState<Mode>('phone');
  const [contact, setContact] = useState('');
  const [pwd, setPwd] = useState('');
  const [tried, setTried] = useState(false);
  const bad = { contact: tried && !contactOk(mode, contact), pwd: tried && pwd.length < 4 };
  const enter = () => {
    startApp(true);
    resetTo('/feed');
  };
  const submit = () => {
    setTried(true);
    if (!contactOk(mode, contact) || pwd.length < 4) return;
    db.user.contact = db.user.contact || (mode === 'phone' ? contact.replace(/\D/g, '') : contact.trim());
    enter();
  };
  return (
    <Page keyboard>
      <TopBar title="Log in" />
      <Pict pic="img/logo-yellow" style={{ width: 150, height: 54, alignSelf: 'center', marginTop: 14 }} fit="contain" />
      <Txt s={24} w={8} center style={{ marginTop: 10 }}>
        Welcome back
      </Txt>
      <Txt s={14} c={C.muted} center style={{ marginTop: 6 }}>
        Log in to hire or get hired around you.
      </Txt>
      <View style={{ gap: 16, marginTop: 28 }}>
        <ContactField testID="li-contact" mode={mode} setMode={setMode} value={contact} onChange={setContact} error={bad.contact && (mode === 'phone' ? 'Enter a valid phone number' : 'Enter a valid email address')} />
        <Field label="Password" error={bad.pwd && 'Enter your password'}>
          <Input testID="li-pwd" value={pwd} onChangeText={setPwd} icon="lock" placeholder="Your password" secure invalid={bad.pwd} onSubmit={submit} returnKeyType="go" />
        </Field>
        <Pressable onPress={() => router.push('/forgot')} style={{ alignSelf: 'flex-end', marginTop: -6 }} hitSlop={8}>
          <Txt s={13} w={7} c={C.lav}>
            Forgot password?
          </Txt>
        </Pressable>
        <Btn testID="li-submit" title="Log in" onPress={submit} />
      </View>
      <Divider text="or log in with" />
      <Socials onPick={() => enter()} />
      <Grow />
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 24 }}>
        <Txt s={14} c={C.muted}>Don’t have an account?</Txt>
        <TextLink title="Sign up" s={14} onPress={() => router.replace('/role')} />
      </View>
    </Page>
  );
}
