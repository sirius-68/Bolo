/* The ID check: a photo of your ID card, a selfie, then getit checks it. The blue tick follows. */
import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { db } from '../src/data/db';
import { useLive } from '../src/logic/live';
import { pickImage } from '../src/logic/media';
import { submitDocs } from '../src/logic/verify';
import { GIcon } from '../src/g/icons';
import { toast } from '../src/g/notice';
import { Hint, Top } from '../src/g/parts';
import { openSignIn } from '../src/g/signin';
import { RED, useG } from '../src/g/theme';
import { goBack } from '../src/g/touch';
import { Big, Link, T } from '../src/g/ui';

export default function WId() {
  useLive();
  const t = useG();
  const ins = useSafeAreaInsets();
  const [card, setCard] = useState<string | null>(null);
  const [selfie, setSelfie] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const state = db.PR.docs.id; // null, 'review' or 'verified'
  const sent = state === 'review' || state === 'verified';
  const steps: [string, string, boolean][] = [
    ['Photo of your ID card', card || sent ? 'Added' : 'National ID, passport or driving licence', !!card || sent],
    ['A photo of your face', selfie || sent ? 'Added' : 'A selfie, so we can match your face to the card', !!selfie || sent],
    ['We check it', state === 'verified' ? 'Done. You have the blue tick' : sent ? 'We’ll tell you when it’s done' : 'Then you get the blue tick', state === 'verified'],
  ];
  const now = steps.findIndex((s) => !s[2]);
  /** One step forward: the ID card first, then the photo of the face. `upload` takes a photo already on the phone. */
  const next = async (upload = false) => {
    if (sent) return goBack();
    if (busy) return;
    if (!db.loggedIn) return openSignIn({ work: true });
    if (!card) {
      const p = await pickImage(upload ? {} : { camera: true });
      if (p) setCard(p);
      return;
    }
    const p = selfie || (await pickImage(upload ? { square: true } : { camera: true, front: true, square: true }));
    if (!p) return;
    setSelfie(p);
    setBusy(true);
    const e = await submitDocs([card, p], 'id');
    setBusy(false);
    // not sent (no connection, for example): both photos are kept, and the button sends them again
    if (e) return toast(e);
    toast('Sent. We’ll tell you when it’s checked');
  };
  /** Take a step's photo again before sending. */
  const redo = (i: number) => {
    if (sent || busy) return;
    if (i === 0) setCard(null), setSelfie(null);
    if (i === 1) setSelfie(null);
  };
  return (
    <View style={{ flex: 1, backgroundColor: t.bg, paddingTop: ins.top + 16, paddingHorizontal: 20, paddingBottom: ins.bottom + 28 }}>
      <Top pad={0} />
      <View style={{ alignItems: 'center', marginTop: 10 }}>
        <View style={{ width: 88, height: 88, borderRadius: 44, backgroundColor: t.tabOn, alignItems: 'center', justifyContent: 'center' }}>
          <GIcon name="idcard" size={40} color={t.accent} />
        </View>
        <T s={28} w={8} ls={-0.6} center style={{ marginTop: 16, marginBottom: 6 }}>
          Check your ID
        </T>
        <T s={15} lh={1.5} c="muted" center style={{ maxWidth: 310 }}>
          A blue tick tells clients you are who you say. It takes two minutes.
        </T>
      </View>
      <View style={{ gap: 4, marginTop: 24 }}>
        {steps.map(([label, sub, done], i) => (
          <Pressable key={label} disabled={sent || !done || i > 1} accessibilityRole="button" accessibilityLabel={done && i < 2 && !sent ? `${label}. Added. Tap to change it` : label} onPress={() => redo(i)} style={{ flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 64, borderBottomWidth: 1, borderBottomColor: t.line }}>
            <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: done ? RED : i === now ? t.tabOn : t.card2, alignItems: 'center', justifyContent: 'center' }}>
              {done ? (
                <GIcon name="check" size={18} color="#ffffff" sw={2.6} />
              ) : (
                <T s={15} w={8} c={i === now ? t.accent : t.muted}>
                  {i + 1}
                </T>
              )}
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <T s={15} w={8}>
                {label}
              </T>
              <T s={13} c="muted">
                {sub}
              </T>
            </View>
            {done && i < 2 && !sent ? (
              <T s={13} w={8} c="accent">
                Change
              </T>
            ) : null}
          </Pressable>
        ))}
      </View>
      <Hint icon="lock" style={{ marginTop: 16 }}>
        Your ID is only used to check who you are. Clients never see it.
      </Hint>
      <View style={{ flex: 1 }} />
      <Big testID="wid-next" icon={sent || selfie ? undefined : 'camera'} title={sent ? 'Done' : !card ? 'Take a photo of your ID' : selfie ? 'Send for checking' : 'Take a selfie'} loading={busy} onPress={() => void next()} />
      {/* a photo already on the phone works too (a camera that won't open, or an ID photographed earlier) */}
      {!sent && !selfie ? <Link testID="wid-upload" title={!card ? 'Upload a photo of your ID instead' : 'Upload a photo of your face instead'} color="text" h={48} style={{ marginTop: 6 }} onPress={() => void next(true)} /> : null}
    </View>
  );
}
