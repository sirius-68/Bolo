import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { Avatar, Btn, Field, Input, Page, SelectBox, Steps, Sub, TextLink, Title, TopBar } from '../src/ui/kit';
import { Icon } from '../src/ui/Icon';
import { C } from '../src/ui/theme';
import { db } from '../src/data/db';
import { pick } from '../src/ui/overlay';
import { wantsWork } from '../src/logic/account';
import { pickImage } from '../src/logic/media';
import { bump, useLive } from '../src/logic/live';

const CITIES = ['Buea CM', 'Limbe CM', 'Douala CM', 'Yaoundé CM', 'Bamenda CM', 'Kumba CM', 'Bafoussam CM'];

export default function Setup() {
  useLive();
  const [name, setName] = useState(db.user.name);
  const [city, setCity] = useState(db.user.city);
  const go = () => {
    if (name.trim()) db.user.name = name.trim();
    db.user.city = city;
    bump();
    router.push('/location');
  };
  return (
    <Page keyboard>
      <TopBar title="Your profile" right={<TextLink title="Skip" onPress={() => router.push('/location')} />} />
      <Steps total={wantsWork() ? 7 : 3} on={3} />
      <Title sm>Add a face to your name</Title>
      <Sub>{wantsWork() ? 'People hire faster when they can see who’s coming.' : 'Workers like to know who they’re helping.'}</Sub>
      <Pressable
        accessibilityLabel="Add a profile photo"
        onPress={async () => {
          const p = await pickImage({ square: true });
          if (p) {
            db.user.avatar = p;
            bump();
          }
        }}
        style={{ alignSelf: 'center', marginTop: 26 }}
      >
        {db.user.avatar ? (
          <Avatar pic={db.user.avatar} size={112} />
        ) : (
          <View style={{ width: 112, height: 112, borderRadius: 56, backgroundColor: C.yellow, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="user" size={56} color="#000" />
          </View>
        )}
        <View style={{ position: 'absolute', right: -2, bottom: 4, width: 36, height: 36, borderRadius: 18, backgroundColor: C.blue, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: C.bg }}>
          <Icon name="cam" size={18} color="#fff" />
        </View>
      </Pressable>
      <View style={{ gap: 16, marginTop: 28 }}>
        <Field label="Display name">
          <Input value={name} onChangeText={setName} icon="user" placeholder="How people will see you" autoCapitalize="words" />
        </Field>
        <Field label="Location">
          <SelectBox icon="pin" value={city} onPress={() => pick('Your city', CITIES, city, setCity)} />
        </Field>
        <Btn testID="setup-continue" title="Continue" onPress={go} style={{ marginTop: 8 }} />
      </View>
    </Page>
  );
}
