import React, { useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { Btn, Page, Pict, Sub, TextLink, Title, TopBar, Txt } from '../src/ui/kit';
import { C } from '../src/ui/theme';
import { ContactField, Mode, contactOk, signup } from '../src/components/auth';
import { isReal, sendReset } from '../src/logic/remote';

export default function Forgot() {
  const [mode, setMode] = useState<Mode>('phone');
  const [contact, setContact] = useState('');
  const [tried, setTried] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const bad = tried && !contactOk(mode, contact);
  return (
    <Page keyboard>
      <TopBar title="Reset password" />
      <Pict pic="art/lock" style={{ width: '80%', maxWidth: 300, aspectRatio: 340 / 300, alignSelf: 'center', marginTop: 6 }} fit="contain" />
      <Title sm>Forgot your password?</Title>
      <Sub>No worries. Enter the phone number or email on your account and we’ll send you a code.</Sub>
      <View style={{ gap: 16, marginTop: 24 }}>
        <ContactField mode={mode} setMode={setMode} value={contact} onChange={setContact} error={bad && (mode === 'phone' ? 'Enter a valid phone number' : 'Enter a valid email address')} />
        {err ? (
          <Txt s={13} w={7} c={C.err} center>
            {err}
          </Txt>
        ) : null}
        <Btn
          title="Send code"
          loading={busy}
          onPress={async () => {
            setTried(true);
            setErr('');
            if (!contactOk(mode, contact)) return;
            signup.otpMode = 'reset';
            signup.contact = mode === 'phone' ? contact.replace(/\D/g, '') : contact.trim();
            signup.next = null;
            if (isReal()) {
              setBusy(true);
              const e = await sendReset(signup.contact);
              setBusy(false);
              if (e) return setErr(e);
            }
            router.push('/otp');
          }}
        />
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 20 }}>
        <Txt s={14} c={C.muted}>Remembered it?</Txt>
        <TextLink title="Back to log in" s={14} onPress={() => router.back()} />
      </View>
    </Page>
  );
}
