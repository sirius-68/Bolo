import React, { useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AREAS, BO_HIRE, BZCOLORS, CITIES, SIZES } from '../src/data/catalog';
import { Avatar, Btn, Chip, Chips, Field, IconBtn, Input, Label, Note, SelectBox, Txt, tap, Pict } from '../src/ui/kit';
import { Icon } from '../src/ui/Icon';
import { C, R } from '../src/ui/theme';
import { pick, toast } from '../src/ui/overlay';
import { createBusinessAccount, newBizDraft } from '../src/logic/account';
import { openCities } from '../src/sheets/account';
import { bizLogo, isEmail, isPhone } from '../src/logic/core';
import { pickImage } from '../src/logic/media';
import { resetTo } from '../src/logic/nav';
import { LogoPicker } from '../src/components/business';
import { signup } from '../src/components/auth';
import { isReal, signUp } from '../src/logic/remote';
import { db } from '../src/data/db';
import { PhoneInput, intlPhone } from '../src/components/auth';

/** Business-only sign-up (from the welcome screen). */
export default function BizOnboarding() {
  const ins = useSafeAreaInsets();
  const scroll = useRef<ScrollView>(null);
  const [step, setStep] = useState(0);
  const [o, setO] = useState({ owner: '', ownerRole: 'Owner', email: '', phone: '', pass: '' });
  const [b, setB] = useState(newBizDraft());
  const [areas, setAreas] = useState<string[]>([]);
  const [types, setTypes] = useState<string[]>(['Full-time staff']);
  const [err, setErr] = useState<string | null>(null);
  const up = (k: keyof typeof o, v: string) => setO({ ...o, [k]: v });
  const ub = (patch: any) => setB({ ...b, ...patch });
  const goStep = (s: number) => {
    setErr(null);
    setStep(s);
    scroll.current?.scrollTo({ y: 0, animated: false });
  };
  const next = () => {
    if (step === 0) {
      if (o.owner.trim().length < 2) return setErr('owner');
      if (!isEmail(o.email) && !isPhone(o.phone)) return setErr('contact');
      if (o.pass.length < 8) return setErr('pass');
    }
    if (step === 1) {
      if (!b.name.trim()) return setErr('name');
      if (!b.sector) return setErr('sector');
    }
    if (step === 2 && !b.city.trim()) return setErr('city');
    goStep(step + 1);
  };
  const back = () => (step === 0 || step === 5 ? router.back() : goStep(step - 1));
  const toggle = (L: string[], set: (x: string[]) => void, v: string) => set(L.includes(v) ? L.filter((x) => x !== v) : [...L, v]);
  const finish = (verify: boolean) => {
    if (!verify) ub({ rccm: '', niu: '' });
    goStep(5);
  };
  const [busy, setBusy] = useState(false);
  const enter = async () => {
    const biz = { ...b, phone: b.phone ? intlPhone(b.phone) : o.phone ? intlPhone(o.phone) : '', email: b.email || o.email.trim(), hires: areas, hireTypes: types };
    const done = () => {
      createBusinessAccount({ owner: o.owner.trim(), email: o.email.trim(), phone: o.phone ? intlPhone(o.phone) : '', biz });
      resetTo('/home');
    };
    if (!isReal()) return done();
    // Real account: log-in uses the work email (or the phone when there's no email).
    const contact = isEmail(o.email) ? o.email.trim() : intlPhone(o.phone);
    setBusy(true);
    const r = await signUp(contact, o.pass, { name: o.owner.trim(), biz_only: true });
    setBusy(false);
    if (r.error) {
      toast(r.error);
      if (/already exists/.test(r.error)) goStep(0);
      return;
    }
    db.user.contact = contact;
    if (!r.needsCode) return done();
    signup.otpMode = 'signup';
    signup.contact = contact;
    signup.next = done;
    signup.pwd = o.pass;
    router.push('/otp');
  };

  let body: React.ReactNode = null;
  if (step === 0)
    body = (
      <>
        <View style={{ flexDirection: 'row', alignSelf: 'flex-start', alignItems: 'center', gap: 6, paddingHorizontal: 10, height: 28, borderRadius: 999, backgroundColor: 'rgba(246,238,92,.14)' }}>
          <Icon name="storefront" size={14} color={C.yellow} />
          <Txt s={12} w={8} c={C.yellow}>
            Business account
          </Txt>
        </View>
        <Txt s={26} w={8} style={{ marginTop: 14 }}>
          Create your business account
        </Txt>
        <Txt s={14} c={C.muted} style={{ marginTop: 6 }}>
          You’ll manage hiring for your company from here.
        </Txt>
        <View style={{ gap: 14, marginTop: 22 }}>
          <Field label="Your full name" error={err === 'owner' && 'Add your name'}>
            <Input testID="bo-owner" value={o.owner} onChangeText={(v) => up('owner', v)} placeholder="e.g. Peter Ekole" autoCapitalize="words" invalid={err === 'owner'} />
          </Field>
          <Field label="Your role in the business">
            <SelectBox value={o.ownerRole} onPress={() => pick('Your role', ['Owner', 'Co-founder', 'HR / recruiter', 'Manager'], o.ownerRole, (v) => up('ownerRole', v))} />
          </Field>
          <Field label="Work email" error={err === 'contact' && 'Add a work email or phone number'}>
            <Input testID="bo-email" value={o.email} onChangeText={(v) => up('email', v)} icon="mail" placeholder="you@yourbusiness.cm" keyboardType="email-address" invalid={err === 'contact'} />
          </Field>
          <Field label="Phone number">
            <PhoneInput value={o.phone} onChange={(v) => up('phone', v)} />
          </Field>
          <Field label="Create a password" error={err === 'pass' && 'Password needs at least 8 characters'}>
            <Input testID="bo-pass" value={o.pass} onChangeText={(v) => up('pass', v)} icon="lock" placeholder="At least 8 characters" secure invalid={err === 'pass'} />
          </Field>
          <Note>A business account is only for recruiting. To look for work, you’d create a separate Regular account.</Note>
        </View>
      </>
    );
  if (step === 1)
    body = (
      <>
        <Txt s={26} w={8}>
          Tell us about your business
        </Txt>
        <View style={{ gap: 14, marginTop: 22 }}>
          <Field label="Business name" error={err === 'name' && 'Add your business name'}>
            <Input testID="bo-name" value={b.name} onChangeText={(v) => ub({ name: v })} icon="storefront" placeholder="e.g. Ekole Services Ltd" maxLength={50} invalid={err === 'name'} />
          </Field>
          <Field label="Sector" error={err === 'sector' && 'Choose a sector'}>
            <SelectBox value={b.sector} placeholder="Choose a sector" invalid={err === 'sector'} onPress={() => pick('Sector', AREAS.map((a) => a[0]), b.sector, (v) => ub({ sector: v }))} />
          </Field>
          <View>
            <Label>Team size</Label>
            <Chips>
              {SIZES.map((z) => (
                <Chip key={z} label={z} on={b.size === z} onPress={() => ub({ size: z })} />
              ))}
            </Chips>
          </View>
          <Field label="What does your business do?">
            <Input multiline value={b.about} onChangeText={(v) => ub({ about: v })} maxLength={240} placeholder="One or two sentences candidates will read" />
          </Field>
        </View>
      </>
    );
  if (step === 2)
    body = (
      <>
        <Txt s={26} w={8}>
          Where is your business?
        </Txt>
        <View style={{ gap: 14, marginTop: 22 }}>
          <Field label="City" error={err === 'city' && 'Choose the city your business is in'}>
            <SelectBox testID="bo-city" value={b.city} placeholder="Choose a city" icon="pin" invalid={err === 'city'} onPress={() => openCities((v) => setB((x) => ({ ...x, city: v })), b.city)} />
          </Field>
          <Field label="Neighbourhood">
            <Input value={b.area} onChangeText={(v) => ub({ area: v })} placeholder="Neighbourhood or district" />
          </Field>
          <Field label="Street address">
            <Input value={b.address} onChangeText={(v) => ub({ address: v })} icon="pin" placeholder="Street, building or landmark" />
          </Field>
          <Field label="Business phone">
            <PhoneInput value={b.phone} onChange={(v) => ub({ phone: v })} />
          </Field>
          <Field label="Website · optional">
            <Input value={b.web} onChangeText={(v) => ub({ web: v })} icon="globe" placeholder="yourbusiness.cm" autoCapitalize="none" />
          </Field>
        </View>
      </>
    );
  if (step === 3)
    body = (
      <>
        <Txt s={26} w={8}>
          Who do you want to hire?
        </Txt>
        <Txt s={14} c={C.muted} style={{ marginTop: 6 }}>
          We’ll show you matching talent near you. Pick all that apply.
        </Txt>
        <View style={{ height: 14 }} />
        <Label>
          <Txt s={12} w={6} c={C.muted}>
            Kinds of work
          </Txt>
        </Label>
        <Chips>
          {AREAS.map(([a]) => (
            <Chip key={a} small label={a} on={areas.includes(a)} onPress={() => toggle(areas, setAreas, a)} />
          ))}
        </Chips>
        <View style={{ height: 18 }} />
        <Label>How you hire</Label>
        <Chips>
          {BO_HIRE.map((t) => (
            <Chip key={t} small label={t} on={types.includes(t)} onPress={() => toggle(types, setTypes, t)} />
          ))}
        </Chips>
      </>
    );
  if (step === 4)
    body = (
      <>
        <Txt s={26} w={8}>
          Logo & verification
        </Txt>
        <Txt s={14} c={C.muted} style={{ marginTop: 6 }}>
          Verified businesses get a badge and can hire under company contracts.
        </Txt>
        <LogoPicker b={b} onChange={ub} />
        <View style={{ gap: 14, marginTop: 18 }}>
          <Field label="Trade register number (RCCM)">
            <Input value={b.rccm} onChangeText={(v) => ub({ rccm: v })} icon="file" placeholder="e.g. RC/BUE/2024/B/123" autoCapitalize="characters" />
          </Field>
          <Field label="Taxpayer number (NIU)">
            <Input value={b.niu} onChangeText={(v) => ub({ niu: v })} icon="idcard" placeholder="e.g. M012345678901A" autoCapitalize="characters" />
          </Field>
        </View>
      </>
    );
  if (step === 5)
    body = (
      <View style={{ alignItems: 'center', marginTop: 40 }}>
        <Avatar pic={bizLogo(b)} size={96} square />
        <Txt s={24} w={8} center style={{ marginTop: 16 }}>
          {b.name} is live 🎉
        </Txt>
        <Txt s={14} c={C.muted} center style={{ marginTop: 6, maxWidth: 320 }}>
          Your business page is ready. {b.rccm && b.niu ? 'We’re verifying your documents — usually a few minutes.' : 'Verify any time from your dashboard to unlock company contracts.'}
        </Txt>
        <View style={{ gap: 12, marginTop: 24, alignSelf: 'stretch' }}>
          {[
            ['job', 'Post your first vacancy'],
            ['follow', 'Browse talent near you'],
            ['cap', 'Create internships and programs'],
            ['file', 'Hire under company contracts'],
          ].map(([i, t]) => (
            <View key={t} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: C.s2, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name={i} size={18} color={C.yellow} />
              </View>
              <Txt s={14} w={6}>
                {t}
              </Txt>
            </View>
          ))}
        </View>
      </View>
    );

  const actions =
    step < 3 ? (
      <Btn testID="bo-continue" variant="yellow" title="Continue" onPress={next} />
    ) : step === 3 ? (
      <View style={{ gap: 10 }}>
        <Btn variant="yellow" title="Continue" onPress={next} />
        <Btn variant="soft" title="Skip for now" onPress={() => goStep(4)} />
      </View>
    ) : step === 4 ? (
      <View style={{ gap: 10 }}>
        <Btn testID="bo-create" variant="yellow" title={b.rccm && b.niu ? 'Create & verify my business' : 'Create my business'} onPress={() => finish(true)} />
        <Btn variant="soft" title="Verify later" onPress={() => finish(false)} />
      </View>
    ) : (
      <Btn testID="bo-enter" variant="yellow" title="Go to my dashboard" loading={busy} onPress={enter} />
    );

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'android' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: C.bg, paddingTop: ins.top }}>
      {step < 5 ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, height: 56, marginTop: 4 }}>
          <IconBtn name="back" label="Back" onPress={back} />
          <View style={{ flex: 1, flexDirection: 'row', gap: 6 }}>
            {[0, 1, 2, 3, 4].map((i) => (
              <View key={i} style={{ flex: 1, height: 4, borderRadius: 4, backgroundColor: i <= step ? C.yellow : C.s3 }} />
            ))}
          </View>
          <View style={{ width: 44 }} />
        </View>
      ) : null}
      <ScrollView ref={scroll} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets contentContainerStyle={{ padding: 20, paddingBottom: 30 }}>
        {body}
      </ScrollView>
      <View style={{ paddingHorizontal: 20, paddingTop: 10, paddingBottom: ins.bottom + 16, borderTopWidth: 1, borderTopColor: C.line, backgroundColor: C.bg }}>{actions}</View>
    </KeyboardAvoidingView>
  );
}
