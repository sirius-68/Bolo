import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { ui } from '../src/data/db';
import { Btn, Grow, Page, Pict, Seg, Steps, Sub, TextLink, Title, TopBar, Txt } from '../src/ui/kit';
import { Icon } from '../src/ui/Icon';
import { C, R } from '../src/ui/theme';
import { pickImage } from '../src/logic/media';
import { toast } from '../src/ui/overlay';

export default function VerifyId() {
  const [doc, setDoc] = useState<'id' | 'pass' | 'lic'>('id');
  const [shots, setShots] = useState<(string | null)[]>([null, null]);
  const tile = (i: number, label: string) => {
    const s = shots[i];
    return (
      <Pressable
        accessibilityLabel={`Add ${label}`}
        onPress={async () => {
          const p = await pickImage({ camera: false });
          if (p) setShots(shots.map((x, j) => (j === i ? p : x)));
        }}
        style={{ flex: 1, aspectRatio: 1.45, borderRadius: R.md, borderWidth: 1.5, borderStyle: s ? 'solid' : 'dashed', borderColor: s ? C.ok : C.s3, backgroundColor: C.s1, alignItems: 'center', justifyContent: 'center', gap: 6, overflow: 'hidden' }}
      >
        {s === 'sample' ? (
          <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#fff', padding: 10 }}>
            <View style={{ height: 22, borderRadius: 6, backgroundColor: i ? C.lav : C.blue }} />
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
              <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: C.orange }} />
              <View style={{ flex: 1, gap: 6 }}>
                <View style={{ height: 6, borderRadius: 3, backgroundColor: '#111' }} />
                <View style={{ height: 5, width: '70%', borderRadius: 3, backgroundColor: '#ccc' }} />
              </View>
            </View>
          </View>
        ) : s ? (
          <Pict pic={s} style={{ position: 'absolute', width: '100%', height: '100%' }} />
        ) : (
          <>
            <Icon name="upload" size={22} color={C.muted} />
            <Txt s={12} w={6} c={C.muted}>
              {label}
            </Txt>
          </>
        )}
        {s ? (
          <View style={{ position: 'absolute', top: 8, right: 8, width: 22, height: 22, borderRadius: 11, backgroundColor: C.ok, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="check" size={14} color="#fff" />
          </View>
        ) : null}
      </Pressable>
    );
  };
  return (
    <Page>
      <TopBar title="Verify identity" right={<TextLink title="Later" onPress={() => (ui.verifyReturn ? (router.dismissTo(ui.verifyReturn as any), (ui.verifyReturn = '')) : router.push('/done'))} />} />
      <Steps total={7} on={6} />
      <Title sm>Upload your ID</Title>
      <Sub>Verified profiles get a badge and up to 3× more hires.</Sub>
      <View style={{ gap: 16, marginTop: 28 }}>
        <Seg
          items={[
            ['id', 'ID card'],
            ['pass', 'Passport'],
            ['lic', 'Licence'],
          ]}
          value={doc}
          onChange={setDoc}
        />
        <View style={{ flexDirection: 'row', gap: 12 }}>
          {tile(0, doc === 'pass' ? 'Photo page' : 'Front side')}
          {doc === 'pass' ? <View style={{ flex: 1 }} /> : tile(1, 'Back side')}
        </View>
        <View style={{ flexDirection: 'row', gap: 12, padding: 14, borderRadius: R.md, backgroundColor: C.s1 }}>
          <Icon name="shield" size={22} color={C.yellow} />
          <Txt s={13} c={C.muted} style={{ flex: 1 }}>
            <Txt s={13} w={8}>Your data is safe. </Txt>
            We only use it to confirm it’s really you. Nobody else sees your documents.
          </Txt>
        </View>
        <TextLink
          title="No document handy? Use sample photos"
          s={12}
          style={{ alignSelf: 'center' }}
          onPress={() => {
            setShots(['sample', 'sample']);
            toast('Sample documents added');
          }}
        />
      </View>
      <Grow />
      <Btn testID="id-continue" title="Continue" disabled={!shots[0] || (doc !== 'pass' && !shots[1])} onPress={() => router.push('/selfie')} style={{ marginTop: 24 }} />
    </Page>
  );
}
