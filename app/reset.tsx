import React, { useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { Btn, Field, Input, Page, Sub, Title, TopBar, Txt } from '../src/ui/kit';
import { Icon } from '../src/ui/Icon';
import { C } from '../src/ui/theme';
import { toast } from '../src/ui/overlay';
import { db } from '../src/data/db';
import { isReal, updatePassword } from '../src/logic/remote';
import { startApp } from '../src/logic/account';
import { resetTo } from '../src/logic/nav';

export default function Reset() {
  const [a, setA] = useState('');
  const [b, setB] = useState('');
  const [busy, setBusy] = useState(false);
  // same rule as sign-up: 8 characters or more
  const r = { len: a.length >= 8, match: !!a && a === b };
  const ok = r.len && r.match;
  const rule = (on: boolean, t: string) => (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <View style={{ width: 18, height: 18, borderRadius: 9, borderWidth: 1.5, borderColor: on ? C.ok : C.s3, backgroundColor: on ? C.ok : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
        {on ? <Icon name="check" size={12} color="#fff" /> : null}
      </View>
      <Txt s={13} c={on ? C.text : C.muted}>
        {t}
      </Txt>
    </View>
  );
  return (
    <Page keyboard>
      <TopBar title="Reset password" />
      <Title sm>Create a new password</Title>
      <Sub>Make it different from the one you used before.</Sub>
      <View style={{ gap: 16, marginTop: 28 }}>
        <Field label="New password">
          <Input value={a} onChangeText={setA} icon="lock" placeholder="New password" secure />
        </Field>
        <Field label="Confirm password">
          <Input value={b} onChangeText={setB} icon="lock" placeholder="Type it again" secure />
        </Field>
        <View style={{ gap: 8, marginHorizontal: 4 }}>
          {rule(r.len, 'At least 8 characters')}
          {rule(r.match, 'Passwords match')}
        </View>
        <Btn
          title="Update password"
          disabled={!ok}
          loading={busy}
          style={{ marginTop: 12 }}
          onPress={async () => {
            if (isReal()) {
              setBusy(true);
              const e = await updatePassword(a);
              setBusy(false);
              if (e) return toast(e);
            }
            if (db.loggedIn) {
              toast('Password updated');
              router.dismissTo('/settings');
            } else {
              // the code already proved who this is: go straight in with the new password set
              toast('Password updated');
              startApp(true);
              resetTo(db.user.role === 'client' ? '/home' : '/feed');
            }
          }}
        />
      </View>
    </Page>
  );
}
