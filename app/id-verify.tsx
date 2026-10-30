import React, { useEffect, useState } from 'react';
import { BackHandler, Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { Btn, Check, Note, Page, Pict, Steps, Sub, Title, TopBar, Txt, tap } from '../src/ui/kit';
import { Icon } from '../src/ui/Icon';
import { C, R, S } from '../src/ui/theme';
import { db } from '../src/data/db';
import { bump, later } from '../src/logic/live';
import { pickImage } from '../src/logic/media';
import { pick, toast } from '../src/ui/overlay';
import { COUNTRIES, countryByIso, flag } from '../src/data/countries';

type Doc = 'id' | 'passport' | 'licence' | 'permit';
const DOCS: [Doc, string, string, string][] = [
  ['id', 'National ID card', 'Front and back', 'idcard'],
  ['passport', 'Passport', 'Photo page only', 'globe'],
  ['licence', 'Driver’s licence', 'Front and back', 'steer'],
  ['permit', 'Residence permit', 'Front and back', 'file'],
];
const STEP_T = ['Before you start', 'Your document', 'Front of your document', 'Back of your document', 'Take a selfie', 'Check and send'];

/** In-app identity check (used by the Career Expert application and anywhere a verified ID is needed).
    Separate from sign-up: finishing it returns to where it was opened. */
export default function IdVerify() {
  const [step, setStep] = useState(0);
  const [iso, setIso] = useState((db.user.country || 'CM').toUpperCase());
  const [doc, setDoc] = useState<Doc | null>(null);
  const [front, setFront] = useState<string | null>(null);
  const [back, setBack] = useState<string | null>(null);
  const [selfie, setSelfie] = useState<string | null>(null);
  const [agree, setAgree] = useState(false);
  const [sent, setSent] = useState(false);
  const needBack = doc !== 'passport';
  const c = countryByIso(iso) || countryByIso('CM')!;
  const total = needBack ? 6 : 5;
  const at = needBack || step < 3 ? step : step - 1; // progress position

  const go = (s: number) => setStep(s === 3 && !needBack ? 4 : s);
  // Android back goes to the previous step, not out of the flow.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (sent || step === 0) return false;
      setStep(step === 4 && !needBack ? 2 : step - 1);
      return true;
    });
    return () => sub.remove();
  }, [step, sent, needBack]);
  const shoot = async (set: (v: string) => void, front?: boolean, gallery?: boolean) => {
    tap();
    const p = await pickImage(gallery ? {} : { camera: true, front });
    if (p) set(p);
  };
  const submit = () => {
    db.PR.docs.id = 'review';
    bump();
    setSent(true);
    // Demo: approve after a short wait so the whole flow can be seen. Real accounts wait for a reviewer.
    if (db.demo)
      later(6000, () => {
        if (db.PR.docs.id !== 'review') return;
        db.PR.docs.id = 'verified';
        db.user.verified = true;
        bump();
        toast('Your identity is verified');
      });
  };

  if (sent)
    return (
      <Page>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 }}>
          <View style={{ width: 92, height: 92, borderRadius: 46, backgroundColor: 'rgba(169,182,255,.15)', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="shield" size={44} color={C.lav} />
          </View>
          <Title center style={{ marginTop: 18 }}>
            We’re checking your ID
          </Title>
          <Sub center>Most checks finish within a few hours. We’ll send you a notification when it’s done. You can keep going in the meantime.</Sub>
        </View>
        <Btn testID="idv-done" variant="yellow" title="Continue" onPress={() => router.back()} />
      </Page>
    );

  const Frame = ({ pic, oval, onTake, onGallery, label }: { pic: string | null; oval?: boolean; onTake: () => void; onGallery?: () => void; label: string }) => (
    <View style={{ marginTop: 18, gap: 14 }}>
      <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onTake} style={{ alignSelf: 'center', width: oval ? 220 : '100%', aspectRatio: oval ? 0.8 : 1.586, borderRadius: oval ? 120 : 20, overflow: 'hidden', backgroundColor: C.s1, borderWidth: 2, borderStyle: pic ? 'solid' : 'dashed', borderColor: pic ? C.mint : C.s3, alignItems: 'center', justifyContent: 'center' }}>
        {pic ? (
          <Pict pic={pic} style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0 }} />
        ) : (
          <>
            {!oval
              ? [
                  { top: 14, left: 14, borderTopWidth: 3, borderLeftWidth: 3 },
                  { top: 14, right: 14, borderTopWidth: 3, borderRightWidth: 3 },
                  { bottom: 14, left: 14, borderBottomWidth: 3, borderLeftWidth: 3 },
                  { bottom: 14, right: 14, borderBottomWidth: 3, borderRightWidth: 3 },
                ].map((st, i) => <View key={i} style={[{ position: 'absolute', width: 26, height: 26, borderColor: C.yellow, borderRadius: 4 }, st]} />)
              : null}
            <Icon name={oval ? 'user' : 'cam'} size={34} color={C.muted} />
            <Txt s={13} w={7} c={C.muted} style={{ marginTop: 8 }}>
              Tap to take a photo
            </Txt>
          </>
        )}
        {pic ? (
          <View style={[S.row, { position: 'absolute', top: 10, right: 10, gap: 4, paddingHorizontal: 10, height: 28, borderRadius: 14, backgroundColor: C.mint }]}>
            <Icon name="check" size={13} color="#000" />
            <Txt s={12} w={8} c="#000">
              Added
            </Txt>
          </View>
        ) : null}
      </Pressable>
      <View style={{ gap: 8 }}>
        {(oval ? ['Face the camera in good light', 'No hat, mask or sunglasses', 'Only you in the photo'] : ['All four corners inside the frame', 'Text sharp and easy to read', 'No glare or fingers over the card']).map((x) => (
          <View key={x} style={[S.row, { gap: 10 }]}>
            <Icon name="checkc" size={16} color={pic ? C.mint : C.faint} />
            <Txt s={13} c={C.muted}>
              {x}
            </Txt>
          </View>
        ))}
      </View>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        {onGallery ? <Btn variant="dark" icon="image" title="Upload" style={{ flex: 1 }} onPress={onGallery} /> : null}
        <Btn variant={pic ? 'dark' : 'white'} icon="cam" title={pic ? 'Retake' : 'Take photo'} style={{ flex: onGallery ? 1 : undefined }} onPress={onTake} />
      </View>
    </View>
  );

  let body: React.ReactNode = null;
  let ok = true;
  if (step === 0) {
    body = (
      <View style={{ gap: 12, marginTop: 18 }}>
        {[
          ['idcard', 'A valid photo ID', 'National ID card, passport, driver’s licence or residence permit'],
          ['cam', 'Your phone camera', 'Two or three quick photos, about 2 minutes'],
          ['sparkle', 'Good light', 'Near a window works best'],
        ].map(([i, t, s]) => (
          <View key={t} style={[S.row, { gap: 14, padding: 14, borderRadius: 18, backgroundColor: C.s1, borderWidth: 1, borderColor: C.line }]}>
            <View style={{ width: 42, height: 42, borderRadius: 14, backgroundColor: C.s2, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name={i} size={20} color={C.yellow} />
            </View>
            <View style={{ flex: 1 }}>
              <Txt s={15} w={8}>
                {t}
              </Txt>
              <Txt s={12} c={C.muted}>
                {s}
              </Txt>
            </View>
          </View>
        ))}
        <Note icon="lock">Your photos are only used to confirm who you are. They’re never shown on your profile.</Note>
      </View>
    );
  }
  if (step === 1) {
    ok = !!doc;
    body = (
      <View style={{ gap: 12, marginTop: 18 }}>
        <Pressable
          testID="idv-country"
          accessibilityRole="button"
          onPress={() =>
            pick(
              'Country that issued it',
              COUNTRIES.map((k) => `${flag(k.iso)}  ${k.name}`),
              `${flag(c.iso)}  ${c.name}`,
              (v) => {
                const k = COUNTRIES.find((x) => `${flag(x.iso)}  ${x.name}` === v);
                if (k) setIso(k.iso);
              },
              true,
            )
          }
          style={[S.rowB, { height: 56, paddingHorizontal: 16, borderRadius: R.md, backgroundColor: C.s1, borderWidth: 1, borderColor: C.line }]}
        >
          <View style={[S.row, { gap: 10 }]}>
            <Txt s={20}>{flag(c.iso)}</Txt>
            <View>
              <Txt s={11} c={C.muted}>
                Issued in
              </Txt>
              <Txt s={15} w={7}>
                {c.name}
              </Txt>
            </View>
          </View>
          <Icon name="down" size={16} color={C.muted} />
        </Pressable>
        {DOCS.map(([k, t, s, i]) => {
          const on = doc === k;
          return (
            <Pressable key={k} testID={`idv-doc-${k}`} accessibilityRole="radio" accessibilityState={{ selected: on }} onPress={() => (tap(), setDoc(k), setFront(null), setBack(null))} style={[S.row, { gap: 14, padding: 14, borderRadius: 18, backgroundColor: on ? 'rgba(61,90,241,.2)' : C.s1, borderWidth: 1.5, borderColor: on ? C.lav : C.line }]}>
              <View style={{ width: 42, height: 42, borderRadius: 14, backgroundColor: on ? C.blue : C.s2, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name={i} size={20} color={on ? '#fff' : C.yellow} />
              </View>
              <View style={{ flex: 1 }}>
                <Txt s={15} w={8}>
                  {t}
                </Txt>
                <Txt s={12} c={C.muted}>
                  {s}
                </Txt>
              </View>
              <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: on ? C.lav : C.s3, alignItems: 'center', justifyContent: 'center' }}>
                {on ? <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: C.lav }} /> : null}
              </View>
            </Pressable>
          );
        })}
      </View>
    );
  }
  if (step === 2) {
    ok = !!front;
    body = <Frame label="Front of your document" pic={front} onTake={() => shoot(setFront)} onGallery={() => shoot(setFront, false, true)} />;
  }
  if (step === 3) {
    ok = !!back;
    body = <Frame label="Back of your document" pic={back} onTake={() => shoot(setBack)} onGallery={() => shoot(setBack, false, true)} />;
  }
  if (step === 4) {
    ok = !!selfie;
    body = <Frame oval label="Take a selfie" pic={selfie} onTake={() => shoot(setSelfie, true)} />;
  }
  if (step === 5) {
    ok = agree;
    const shots: [string, string | null, number][] = [['Front', front, 2], ...(needBack ? ([['Back', back, 3]] as [string, string | null, number][]) : []), ['Selfie', selfie, 4]];
    body = (
      <View style={{ gap: 14, marginTop: 18 }}>
        <View style={[S.row, { gap: 12, padding: 14, borderRadius: 18, backgroundColor: C.s1, borderWidth: 1, borderColor: C.line }]}>
          <Icon name={DOCS.find((d) => d[0] === doc)![3]} size={20} color={C.yellow} />
          <Txt s={14} w={7} style={{ flex: 1 }}>
            {DOCS.find((d) => d[0] === doc)![1]} · {flag(c.iso)} {c.name}
          </Txt>
          <Pressable hitSlop={8} onPress={() => setStep(1)}>
            <Txt s={13} w={8} c={C.lav}>
              Change
            </Txt>
          </Pressable>
        </View>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {shots.map(([l, pic, s]) => (
            <Pressable key={l} onPress={() => setStep(s)} style={{ flex: 1 }}>
              <View style={{ aspectRatio: 0.8, borderRadius: 16, overflow: 'hidden', backgroundColor: C.s1 }}>{pic ? <Pict pic={pic} style={{ width: '100%', height: '100%' }} /> : null}</View>
              <Txt s={12} w={7} c={C.muted} center style={{ marginTop: 6 }}>
                {l} · Retake
              </Txt>
            </Pressable>
          ))}
        </View>
        <Check on={agree} onPress={() => setAgree(!agree)}>
          I confirm this is my own, valid document and that bolo may use these photos to verify my identity.
        </Check>
      </View>
    );
  }
  const last = step === 5;
  return (
    <Page>
      <TopBar title="Verify your identity" onBack={() => (step === 0 ? router.back() : setStep(step === 4 && !needBack ? 2 : step - 1))} />
      <Steps total={total} on={at + 1} />
      <Txt s={12} w={7} c={C.muted} style={{ marginTop: 14 }}>
        Step {at + 1} of {total}
      </Txt>
      <Title sm style={{ marginTop: 2 }}>
        {step === 2 && doc === 'passport' ? 'Your passport photo page' : STEP_T[step]}
      </Title>
      {step === 0 ? <Sub>A verified ID builds trust with the people you work with, and it’s required for Career Experts.</Sub> : null}
      {body}
      <View style={{ flex: 1, minHeight: 20 }} />
      <Btn testID="idv-next" variant="yellow" disabled={!ok} title={step === 0 ? 'Start' : last ? 'Send for checking' : 'Continue'} onPress={() => (last ? submit() : go(step + 1))} style={{ marginTop: 20 }} />
    </Page>
  );
}
