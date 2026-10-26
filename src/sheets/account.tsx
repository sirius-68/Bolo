import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { db, ui, MyBiz } from '../data/db';
import { AREAS, CITIES, SIZES, ST_C, ST_W } from '../data/catalog';
import { AlertIll, Avatar, Btn, Chip, Chips, Field, Input, Label, Note, OptRow, ProTag, SelectBox, SwitchRow, Txt, Verified, StatusPill } from '../ui/kit';
import { Icon } from '../ui/Icon';
import { afterSheet, pick, sheet, SheetTitle, toast } from '../ui/overlay';
import { C, S } from '../ui/theme';
import { bizLogo, bizName, bizPct, curBiz, myCity, isEmail, isPhone, isW, myPhoto, digits, xaf } from '../logic/core';
import { canAddBiz, cancelPro, MAX_FREE_BIZ, newBizDraft, payPro, saveBiz, setRole, useBiz } from '../logic/account';
import { bump } from '../logic/live';
import { setCityManually, gpsCity } from '../logic/here';
import { resetTo } from '../logic/nav';
import { LogoPicker } from '../components/business';
import { pickImage } from '../logic/media';
import { PhoneInput } from '../components/auth';

/* ---------------- Pro plans ---------------- */
export function openPro(kind?: 'regular' | 'business', why?: string) {
  const k = kind || (isW() ? 'regular' : 'business');
  sheet.show(() => <ProSheet kind={k} why={why} />, { full: true });
}
function ProSheet({ kind, why }: { kind: 'regular' | 'business'; why?: string }) {
  const [bill, setBill] = useState<'month' | 'year'>(ui.proBill as any);
  const [busy, setBusy] = useState(false);
  const R = kind === 'regular';
  const on = db.user.pro[kind];
  const price = R ? 2000 : 15000;
  const yr = Math.round((price * 12 * 0.8) / 100) * 100;
  const F: [string, string, string][] = R
    ? [
        ['rocket', 'Get jobs faster', 'Priority applications — you show first to employers'],
        ['file', 'Premium CV templates', 'Stand-out CV designs on top of the free CV builder'],
        ['rocket', 'Profile boosts', '2 free boosts every month for your services'],
        ['eye', 'Who viewed you', 'See which businesses looked at your profile'],
        ['cap', '1 free career expert session', 'A CV or interview review each month'],
      ]
    : [
        ['rocket', 'Cheaper ads', '20% off every ad — vacancies, programs and courses'],
        ['storefront', 'More businesses', `Run more than ${MAX_FREE_BIZ} business pages from one account`],
        ['star', 'Featured company', 'Your company shows first in “Companies hiring”'],
        ['follow', 'Applicant insights', 'Skills match scores and priority candidates'],
        ['follow', 'Unlimited recruiters', 'Bring your whole HR team'],
      ];
  const lead = ({ more: `You’ve used your ${MAX_FREE_BIZ} free business pages.`, ads: 'Business Pro makes every ad 20% cheaper.', cv: 'The Modern CV template is part of bolo Pro.', priority: 'Priority applications are part of bolo Pro.' } as Record<string, string>)[why || ''] || '';
  return (
    <View>
      <View style={{ padding: 18, borderRadius: 22, backgroundColor: R ? C.yellow : C.blue }}>
        <ProTag text={R ? 'PRO' : 'BUSINESS PRO'} />
        <Txt s={22} w={8} c={R ? '#000' : '#fff'} style={{ marginTop: 10 }}>
          {R ? 'Get hired faster with bolo Pro' : 'Grow your team with Business Pro'}
        </Txt>
        <Txt s={13} c={R ? '#222' : '#e8ebff'} style={{ marginTop: 4 }}>
          {lead || (R ? 'For your Regular profile — tools that put you ahead.' : 'Business pages are free. Pro adds promotion and growth tools.')}
        </Txt>
      </View>
      <View style={{ gap: 12, marginTop: 16 }}>
        {F.map(([i, t, s]) => (
          <View key={t} style={[S.row, { gap: 12 }]}>
            <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: C.s2, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name={i} size={18} color={C.yellow} />
            </View>
            <View style={{ flex: 1 }}>
              <Txt s={14} w={8}>
                {t}
              </Txt>
              <Txt s={12} c={C.muted}>
                {s}
              </Txt>
            </View>
          </View>
        ))}
      </View>
      {on ? (
        <>
          <Note icon="checkc" color={C.mint} style={{ marginTop: 16 }}>
            Your plan is active. It renews at the start of next month.
          </Note>
          <Btn
            variant="ghost"
            title="Cancel plan"
            style={{ marginTop: 12 }}
            onPress={() => {
              cancelPro(kind);
              sheet.close();
            }}
          />
        </>
      ) : (
        <>
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 18 }}>
            {(
              [
                ['month', price, 'per month'],
                ['year', yr, 'per year'],
              ] as const
            ).map(([k, p, l]) => (
              <Pressable
                key={k}
                accessibilityRole="radio"
                accessibilityState={{ checked: bill === k }}
                onPress={() => {
                  ui.proBill = k;
                  setBill(k);
                }}
                style={{ flex: 1, padding: 14, borderRadius: 16, backgroundColor: C.s2, borderWidth: 2, borderColor: bill === k ? C.yellow : 'transparent' }}
              >
                {k === 'year' ? (
                  <Txt s={11} w={8} c={C.mint}>
                    Save 20%
                  </Txt>
                ) : null}
                <Txt s={18} w={8}>
                  {xaf(p)}
                </Txt>
                <Txt s={12} c={C.muted}>
                  {l}
                </Txt>
              </Pressable>
            ))}
          </View>
          <View style={[S.row, { gap: 8, marginTop: 12 }]}>
            <Icon name="coins" size={16} color={C.yellow} />
            <Txt s={12} c={C.muted} style={{ flex: 1 }}>
              Pay with MTN MoMo or Orange Money · cancel any time
            </Txt>
          </View>
          <Btn
            variant="yellow"
            style={{ marginTop: 14 }}
            loading={busy}
            title={busy ? 'Waiting for Mobile Money approval…' : `Start ${R ? 'Pro' : 'Business Pro'} · ${xaf(bill === 'month' ? price : yr)}`}
            onPress={() => {
              setBusy(true);
              payPro(kind, () => sheet.close());
            }}
          />
        </>
      )}
    </View>
  );
}

/* ---------------- Regular ↔ Business ---------------- */
/** A Regular profile tried to do something only business pages can do. */
export function bizOnlyPrompt(what: string) {
  const first = db.BIZ.list[0];
  sheet.show(() => (
    <View>
      <AlertIll icon="storefront" />
      <SheetTitle center sub={`Only business pages can ${what}. Setting one up is free — you keep your Regular profile too.`}>
        That’s a Business feature
      </SheetTitle>
      <Btn variant="yellow" style={{ marginTop: 16 }} title={first ? 'Switch to ' + bizName(first) : 'Set up a business'} onPress={() => (first ? switchToBiz(first.id) : afterSheet(() => openBizSetup('new')))} />
      <Btn variant="ghost" style={{ marginTop: 10 }} title="Not now" onPress={() => sheet.close()} />
    </View>
  ));
}
/** A business-only account tried to switch to a Regular profile. */
export function bizOnlyInfo() {
  sheet.show(() => (
    <View>
      <AlertIll icon="storefront" bg={C.lav} />
      <SheetTitle center sub="Business accounts are only for recruiting, so there’s no Regular profile to switch to. To look for work or hire for personal jobs, create a separate Regular account with another phone number or email.">
        This is a business account
      </SheetTitle>
      <Btn variant="ghost" style={{ marginTop: 16 }} title="Got it" onPress={() => sheet.close()} />
    </View>
  ));
}
function switchToBiz(id: string) {
  sheet.close();
  useBiz(id);
  resetTo('/home');
}
/** Switch to the Regular profile or a business page, handling every edge case. */
export function switchRole(r: 'worker' | 'client') {
  const res = setRole(r);
  if (res === 'bizOnly') return bizOnlyInfo();
  if (res === 'needBiz') return openBizSetup('prompt');
  resetTo(r === 'client' ? '/home' : '/feed');
}
export function openAccounts() {
  sheet.show(() => <Accounts />);
}
function Accounts() {
  const w = isW();
  const bo = db.user.bizOnly;
  const Row = ({ on, pic, sq, name, sub, onPress, verified }: { on: boolean; pic: any; sq?: boolean; name: string; sub: string; onPress: () => void; verified?: boolean }) => (
    <Pressable accessibilityRole="button" accessibilityState={{ selected: on }} onPress={onPress} style={({ pressed }) => [S.row, { gap: 12, padding: 12, borderRadius: 16, backgroundColor: on ? 'rgba(246,238,92,.10)' : pressed ? C.s3 : C.s2, borderWidth: 1, borderColor: on ? C.yellow : 'transparent' }]}>
      <Avatar pic={pic} square={sq} size={44} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={[S.row, { gap: 4 }]}>
          <Txt s={14} w={8} lines={1} style={{ flexShrink: 1 }}>
            {name}
          </Txt>
          {verified ? <Verified size={14} /> : null}
        </View>
        <Txt s={12} c={C.muted} lines={1}>
          {sub}
        </Txt>
      </View>
      {on ? <Icon name="check" size={20} color={C.yellow} /> : null}
    </Pressable>
  );
  return (
    <View style={{ gap: 8 }}>
      <SheetTitle sub={bo ? 'Business account — switch between your business pages or add another.' : 'One account — a Regular profile for everyday jobs, and business pages to recruit for your company.'}>{bo ? 'Switch business' : 'Switch profile'}</SheetTitle>
      {!bo ? (
        <Row
          on={w}
          pic={myPhoto()}
          name={db.user.name || 'Your name'}
          sub="Regular · find work and hire for personal jobs"
          onPress={() => {
            sheet.close();
            if (!w) switchRole('worker');
          }}
        />
      ) : null}
      {db.BIZ.list.map((b) => (
        <Row key={b.id} on={!w && db.BIZ.active === b.id} pic={bizLogo(b)} sq verified={b.verified === 'verified'} name={bizName(b)} sub={'Business' + (b.draft ? ` · profile ${bizPct(b)}% complete` : b.sector ? ' · ' + b.sector : '')} onPress={() => (!w && db.BIZ.active === b.id ? sheet.close() : switchToBiz(b.id))} />
      ))}
      <Pressable accessibilityRole="button" onPress={addBusiness} style={({ pressed }) => [S.row, { gap: 12, padding: 12, borderRadius: 16, backgroundColor: pressed ? C.s3 : 'transparent', borderWidth: 1, borderColor: C.line, borderStyle: 'dashed' }]}>
        <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: C.s2, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="plus" size={20} color={C.yellow} />
        </View>
        <View style={{ flex: 1 }}>
          <Txt s={14} w={8}>
            Add a business
          </Txt>
          <Txt s={12} c={C.muted}>
            {canAddBiz() ? `Free · ${db.BIZ.list.length} of ${db.user.pro.business ? 'unlimited' : MAX_FREE_BIZ} used` : `You’ve used your ${MAX_FREE_BIZ} free businesses — upgrade to Business Pro`}
          </Txt>
        </View>
      </Pressable>
    </View>
  );
}
export function addBusiness() {
  if (!canAddBiz()) return afterSheet(() => openPro('business', 'more'));
  afterSheet(() => openBizSetup('new'));
}
/** After sign-up, when the person said they also want to hire for a business. */
export function openBizPrompt() {
  openBizSetup('prompt');
}

/* ---------------- business page set-up (3 steps) ---------------- */
type BzState = { mode: 'new' | 'edit' | 'prompt'; step: number; b: MyBiz; tried?: boolean };
export function openBizSetup(mode: 'new' | 'edit' | 'prompt', step?: number) {
  const cur = curBiz();
  const b: MyBiz = mode === 'edit' && cur ? JSON.parse(JSON.stringify(cur)) : newBizDraft();
  const st: BzState = { mode, step: step != null ? step : mode === 'prompt' ? 0 : 1, b };
  sheet.show(() => <BizSetup st={st} />, { full: true, tag: 'bizsetup' });
}
function BizSetup({ st }: { st: BzState }) {
  const [, f] = useState(0);
  const re = () => f((x) => x + 1);
  const b = st.b;
  const set = (k: keyof MyBiz, v: any) => ((b as any)[k] = v);
  const finish = () => {
    if (!b.name.trim()) {
      st.step = 1;
      st.tried = true;
      toast('Add your business name');
      return re();
    }
    const submit = !!(b.rccm && b.niu && b.verified === 'none');
    const isNew = saveBiz(b, { submitDocs: submit });
    sheet.close();
    ui.meTab = 'Company';
    toast(isNew ? `${bizName(b)} is ready` : 'Business profile saved');
    if (isNew) resetTo('/home');
  };
  const skip = () => {
    if (st.mode === 'prompt' && st.step === 0) return sheet.close();
    if (!b.name.trim()) {
      sheet.close('You can set up your business any time from Me → Switch profile');
      return;
    }
    finish();
  };
  if (st.step === 0)
    return (
      <View>
        <AlertIll icon="storefront" />
        <SheetTitle center sub="You don’t have a business profile yet. It’s free and takes about 2 minutes.">
          Set up your business page
        </SheetTitle>
        <View style={{ gap: 10, marginTop: 14 }}>
          {[
            ['job', 'Post vacancies under your company name'],
            ['follow', 'Track applicants: shortlist, interview, hire'],
            ['file', 'Hire under company contracts (verified businesses)'],
            ['cap', 'Create internships, programs and courses'],
            ['user', 'Add your team and recruiters'],
          ].map(([i, t]) => (
            <View key={t} style={[S.row, { gap: 10 }]}>
              <Icon name={i} size={18} color={C.yellow} />
              <Txt s={14}>{t}</Txt>
            </View>
          ))}
        </View>
        <Btn variant="yellow" style={{ marginTop: 18 }} title="Set up my business" onPress={() => ((st.step = 1), re())} />
        <Btn variant="ghost" style={{ marginTop: 10 }} title="Not now" onPress={() => sheet.close()} />
        <Txt s={12} c={C.muted} center style={{ marginTop: 10 }}>
          You can do it any time from Me → Switch profile.
        </Txt>
      </View>
    );
  const head = (
    <View>
      <View style={[S.rowB]}>
        <Txt s={12} w={7} c={C.muted}>
          Step {st.step} of 3
        </Txt>
        {st.mode !== 'edit' ? (
          <Pressable onPress={skip} hitSlop={8}>
            <Txt s={13} w={7} c={C.lav}>
              {b.name.trim() ? 'Save and finish later' : 'Skip for now'}
            </Txt>
          </Pressable>
        ) : null}
      </View>
      <View style={{ height: 4, borderRadius: 2, backgroundColor: C.s3, marginTop: 8 }}>
        <View style={{ width: `${(st.step / 3) * 100}%`, height: 4, borderRadius: 2, backgroundColor: C.yellow }} />
      </View>
    </View>
  );
  const nav = (last?: boolean) => (
    <View style={{ flexDirection: 'row', gap: 10, marginTop: 6 }}>
      {st.step > 1 ? <Btn variant="ghost" title="Back" style={{ flex: 1 }} onPress={() => (st.step--, re())} /> : null}
      <Btn
        variant="yellow"
        style={{ flex: 1 }}
        title={last ? (st.mode === 'edit' ? 'Save' : 'Create business') : st.mode === 'edit' ? 'Save' : 'Continue'}
        onPress={() => {
          if (st.step === 1 && !b.name.trim()) {
            st.tried = true;
            return re();
          }
          if (st.mode === 'edit' || last) return finish();
          st.step++;
          re();
        }}
      />
    </View>
  );
  if (st.step === 1)
    return (
      <View style={{ gap: 14 }}>
        {head}
        <SheetTitle>About your business</SheetTitle>
        <Field label="Business name" error={st.tried && !b.name.trim() && 'Add your business name'}>
          <Input icon="storefront" value={b.name} onChangeText={(v) => (set('name', v), re())} placeholder="e.g. Ekole Services Ltd" maxLength={50} invalid={st.tried && !b.name.trim()} autoCapitalize="words" />
        </Field>
        <Field label="Sector">
          <SelectBox value={b.sector} placeholder="Choose a sector" onPress={() => pick('Sector', AREAS.map((a) => a[0]), b.sector, (v) => (set('sector', v), re()))} />
        </Field>
        <View>
          <Label>Team size</Label>
          <Chips>
            {SIZES.map((z) => (
              <Chip key={z} label={z} on={b.size === z} onPress={() => (set('size', z), re())} />
            ))}
          </Chips>
        </View>
        <Field label="What does your business do?">
          <Input multiline value={b.about} onChangeText={(v) => (set('about', v), re())} maxLength={240} placeholder="One or two sentences candidates will read on your page" />
        </Field>
        {nav()}
      </View>
    );
  if (st.step === 2) {
    const phoneBad = !!b.phone && !isPhone(b.phone);
    const mailBad = !!b.email && !isEmail(b.email);
    return (
      <View style={{ gap: 14 }}>
        {head}
        <SheetTitle>Location & contact</SheetTitle>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Field label="City" style={{ flex: 1 }}>
            <SelectBox value={b.city} onPress={() => pick('City', CITIES.map(([c, r]) => ({ v: c, sub: r })), b.city, (v) => (set('city', v), re()), true)} />
          </Field>
          <Field label="Neighbourhood" style={{ flex: 1 }}>
            <Input value={b.area} onChangeText={(v) => (set('area', v), re())} />
          </Field>
        </View>
        <Field label="Street address">
          <Input icon="pin" value={b.address} onChangeText={(v) => (set('address', v), re())} placeholder="e.g. Opposite Total, Molyko" />
        </Field>
        <Field label="Business phone" error={phoneBad && 'Enter a valid phone number'}>
          <PhoneInput value={b.phone || ''} onChange={(v) => (set('phone', v), re())} invalid={phoneBad} />
        </Field>
        <Field label="Email" error={mailBad && 'That email doesn’t look right'}>
          <Input keyboardType="email-address" autoCapitalize="none" value={b.email} onChangeText={(v) => (set('email', v.trim()), re())} placeholder="jobs@yourbusiness.cm" invalid={mailBad} />
        </Field>
        <Field label="Website · optional">
          <Input icon="globe" autoCapitalize="none" value={b.web} onChangeText={(v) => (set('web', v.trim()), re())} placeholder="yourbusiness.cm" />
        </Field>
        {nav()}
      </View>
    );
  }
  return (
    <View style={{ gap: 14 }}>
      {head}
      <SheetTitle>Logo & verification</SheetTitle>
      <LogoPicker b={b} onChange={(p) => (Object.assign(b, p), re())} />
      {b.verified === 'verified' ? (
        <StatusPill kind="acc" text="Verified business" />
      ) : b.verified === 'review' ? (
        <StatusPill kind="wait" text="Verification in progress" />
      ) : null}
      <Field label="Trade register number (RCCM)">
        <Input icon="file" autoCapitalize="characters" value={b.rccm} onChangeText={(v) => (set('rccm', v), re())} placeholder="e.g. RC/BUE/2024/B/123" editable={b.verified === 'none'} />
      </Field>
      <Field label="Taxpayer number (NIU)">
        <Input icon="idcard" autoCapitalize="characters" value={b.niu} onChangeText={(v) => (set('niu', v), re())} placeholder="e.g. M012345678901A" editable={b.verified === 'none'} />
      </Field>
      <Note icon="verified">With your RCCM and NIU we verify your business. Only verified businesses can hire under company contracts.</Note>
      {nav(true)}
    </View>
  );
}

/* ---------------- profile basics ---------------- */
export function openEdit() {
  const d = { name: db.user.name, bio: db.user.bio, contact: db.user.contact };
  sheet.show(() => <EditSheet d={d} />, { full: true });
}
function EditSheet({ d }: { d: { name: string; bio: string; contact: string } }) {
  const [, f] = useState(0);
  const re = () => f((x) => x + 1);
  const bad = !!d.contact && !isEmail(d.contact) && !isPhone(d.contact);
  return (
    <View style={{ gap: 14 }}>
      <SheetTitle>Edit profile</SheetTitle>
      <View style={[S.row, { gap: 14 }]}>
        <Avatar pic={myPhoto()} size={64} />
        <Btn
          small
          variant="dark"
          icon="camera"
          title="Change photo"
          onPress={async () => {
            const p = await pickImage({ square: true });
            if (p) {
              db.user.avatar = p;
              bump();
              re();
            }
          }}
        />
      </View>
      <Field label="Name" error={!d.name.trim() && 'Your name can’t be empty'}>
        <Input value={d.name} onChangeText={(v) => ((d.name = v), re())} autoCapitalize="words" invalid={!d.name.trim()} />
      </Field>
      <Field label="Bio">
        <Input multiline value={d.bio} onChangeText={(v) => ((d.bio = v), re())} maxLength={200} placeholder={isW() ? 'What you do, how long you’ve done it, what clients love about you' : 'What kind of jobs you usually post'} />
      </Field>
      <Field label="Phone or email used to log in" error={bad && 'Enter a valid phone or email'}>
        <Input value={d.contact} onChangeText={(v) => ((d.contact = v), re())} autoCapitalize="none" invalid={bad} />
      </Field>
      {isW() ? <OptRow icon="tools" title="Skills, level and languages" sub="What you do and how well" onPress={() => afterSheet(() => router.push('/skills?mode=edit'))} /> : null}
      <Btn
        variant="yellow"
        title="Save"
        disabled={!d.name.trim() || bad}
        onPress={() => {
          db.user.name = d.name.trim();
          db.user.bio = d.bio.trim();
          db.user.contact = d.contact.trim();
          sheet.close('Profile saved');
        }}
      />
    </View>
  );
}
export function openStatus() {
  sheet.show(() => {
    const w = isW();
    const L = w ? ST_W : ST_C;
    const k = w ? db.PR.wst : db.PR.cst;
    return (
      <View>
        <SheetTitle>{w ? 'Your work status' : 'Your hiring status'}</SheetTitle>
        {L.map(([key, t, s, c]) => (
          <OptRow
            key={key}
            title={t}
            sub={s}
            chev={false}
            right={key === k ? <Icon name="check" size={20} color={C.yellow} /> : <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: c }} />}
            onPress={() => {
              if (w) db.PR.wst = key;
              else db.PR.cst = key;
              sheet.close('Status: ' + t);
            }}
          />
        ))}
      </View>
    );
  });
}

/* ---------------- settings sheets ---------------- */
export function openPayments() {
  sheet.show(() => <Payments />);
}
function Payments() {
  const [, f] = useState(0);
  const [net, setNet] = useState('MTN MoMo');
  const [num, setNum] = useState('');
  return (
    <View style={{ gap: 8 }}>
      <SheetTitle sub="Pay for jobs and receive payouts with Mobile Money.">Payments</SheetTitle>
      {db.PREF.momo.map(([n, no, d], i) => (
        <View key={n + no} style={[S.row, { gap: 12, padding: 12, borderRadius: 14, backgroundColor: C.s2 }]}>
          <View style={{ width: 38, height: 38, borderRadius: 10, backgroundColor: n.startsWith('MTN') ? C.yellow : C.orange, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="coins" size={18} color="#000" />
          </View>
          <View style={{ flex: 1 }}>
            <Txt s={14} w={8}>
              {n}
            </Txt>
            <Txt s={12} c={C.muted}>
              {no}
            </Txt>
          </View>
          {d ? (
            <StatusPill kind="acc" text="Default" />
          ) : (
            <Btn
              small
              variant="dark"
              title="Make default"
              onPress={() => {
                db.PREF.momo.forEach((m) => (m[2] = 0));
                db.PREF.momo[i][2] = 1;
                bump();
                f((x) => x + 1);
              }}
            />
          )}
        </View>
      ))}
      <Label>Add a number</Label>
      <Chips>
        {['MTN MoMo', 'Orange Money'].map((x) => (
          <Chip key={x} small label={x} on={net === x} onPress={() => setNet(x)} />
        ))}
      </Chips>
      <Input prefix="+237" keyboardType="phone-pad" value={num} onChangeText={setNum} placeholder="6XX XX XX XX" />
      <Btn
        variant="yellow"
        title="Add payment method"
        disabled={digits(num).length < 9}
        onPress={() => {
          const v = digits(num);
          db.PREF.momo.push([net, v.slice(0, 3) + ' ••• ' + v.slice(-3), 0]);
          setNum('');
          bump();
          toast('Payment method added');
        }}
      />
    </View>
  );
}
export function openPrivacy() {
  sheet.show(() => {
    const P = () => {
      const [, f] = useState(0);
      const sw = (k: 'visible' | 'phoneAfterHire' | 'twoStep', t: string, s: string) => (
        <SwitchRow
          title={t}
          sub={s}
          value={db.PREF[k]}
          onChange={(v) => {
            db.PREF[k] = v;
            bump();
            f((x) => x + 1);
          }}
        />
      );
      return (
        <View style={{ gap: 4 }}>
          <SheetTitle>Privacy & security</SheetTitle>
          {sw('visible', 'Show my profile in search', 'People near you can find you on the map and feed')}
          {sw('phoneAfterHire', 'Hide my phone until hired', 'Your number is shared only after a booking')}
          {sw('twoStep', 'Two-step login', 'Get a code by SMS when you log in on a new phone')}
          <OptRow icon="lock" bg="#fff" title="Change password" sub="We’ll send you a reset code" onPress={() => afterSheet(() => router.push('/forgot'))} />
          <OptRow icon="eyeoff" bg={C.orange} title="Blocked users" sub="None" chev={false} onPress={() => toast('You haven’t blocked anyone')} />
        </View>
      );
    };
    return <P />;
  });
}
export function openLang() {
  sheet.show(() => (
    <View>
      <SheetTitle>Language</SheetTitle>
      {[
        ['English', 'Use bolo in English'],
        ['Français', 'Utiliser bolo en français — bientôt disponible'],
      ].map(([l, s]) => (
        <OptRow
          key={l}
          title={l}
          sub={s}
          chev={false}
          right={db.PREF.lang === l ? <Icon name="check" size={20} color={C.yellow} /> : null}
          onPress={() => {
            if (l !== 'English') {
              toast('French is coming soon — we’ll let you know');
              return;
            }
            db.PREF.lang = l;
            sheet.close();
          }}
        />
      ))}
    </View>
  ));
}
const FAQ: [string, string][] = [
  ['How do I get paid?', 'When the client confirms the job is done, payment goes to your Mobile Money within minutes.'],
  ['Is it free to post a job?', 'Yes. Regular profiles can post unlimited personal jobs. Business pages are free too.'],
  ['What’s the difference between Regular and Business?', 'Your Regular profile is you: find work and hire for personal jobs. A business page recruits for a company — vacancies, internships, courses and contracts.'],
  ['How do company contracts work?', 'Verified businesses send a contract in the app; both sides sign and the person appears under Team.'],
  ['How do I verify my business?', 'Add your RCCM and NIU on your business page. Verification usually takes a few minutes.'],
  ['When can I leave a review?', 'Only after the job is marked done and confirmed — so every review on bolo is from real work.'],
];
export function openHelp() {
  sheet.show(() => {
    const H = () => {
      const [open, setOpen] = useState<number | null>(null);
      return (
        <View style={{ gap: 8 }}>
          <SheetTitle>Help & support</SheetTitle>
          {FAQ.map(([q, a], i) => (
            <Pressable key={q} accessibilityRole="button" accessibilityState={{ expanded: open === i }} onPress={() => setOpen(open === i ? null : i)} style={{ padding: 14, borderRadius: 14, backgroundColor: C.s2 }}>
              <View style={[S.row, { gap: 8 }]}>
                <Txt s={14} w={7} style={{ flex: 1 }}>
                  {q}
                </Txt>
                <Icon name={open === i ? 'up' : 'down'} size={16} color={C.muted} />
              </View>
              {open === i ? (
                <Txt s={13} c="#d9d9de" style={{ marginTop: 8 }}>
                  {a}
                </Txt>
              ) : null}
            </Pressable>
          ))}
          <Btn variant="yellow" icon="chat" title="Chat with bolo" style={{ marginTop: 8 }} onPress={() => sheet.close('A bolo agent will reply in a few minutes')} />
        </View>
      );
    };
    return <H />;
  });
}
const NT_SET: [string, string][] = [
  ['Hires and bookings', 'Offers, bookings and job updates'],
  ['Messages', 'New messages and replies'],
  ['Reminders', 'Before a job starts'],
  ['Applicants', 'New applications to your jobs and programs'],
  ['Tips and news', 'Career tips and product news'],
];
export function openNotifSettings() {
  sheet.show(() => {
    const N = () => {
      const [, f] = useState(0);
      return (
        <View style={{ gap: 4 }}>
          <SheetTitle>Notifications</SheetTitle>
          {NT_SET.map(([t, s], i) => (
            <SwitchRow
              key={t}
              title={t}
              sub={s}
              value={!!db.PREF.notif[i]}
              onChange={(v) => {
                db.PREF.notif[i] = v ? 1 : 0;
                bump();
                f((x) => x + 1);
              }}
            />
          ))}
        </View>
      );
    };
    return <N />;
  });
}
/** Choose a city anywhere in the world: from GPS, by typing it, or from suggestions. */
export function openCities(onPick?: (c: string) => void, current?: string) {
  sheet.show(() => <CitySheet onPick={onPick} current={current ?? myCity()} />, { tag: 'city' });
}
function CitySheet({ onPick, current }: { onPick?: (c: string) => void; current: string }) {
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(false);
  const done = (c: string, auto = false) => {
    sheet.close();
    if (onPick) return onPick(c);
    if (!auto) setCityManually(c);
    toast('Location: ' + c);
  };
  const sugg = CITIES.map(([c]) => c).filter((c) => !q || c.toLowerCase().includes(q.trim().toLowerCase()));
  return (
    <View style={{ gap: 14 }}>
      <SheetTitle sub={current ? `Now: ${current}` : 'Used for the map, distances and what’s near you.'}>Your location</SheetTitle>
      <Btn
        testID="city-gps"
        title="Use my current location"
        icon="gpsfix"
        loading={busy}
        onPress={async () => {
          setBusy(true);
          const ok = await gpsCity();
          setBusy(false);
          if (!ok) return toast('Allow location in your phone settings, or type your city');
          done(myCity(), true);
        }}
      />
      <Field label="Or type your city">
        <Input testID="city-input" value={q} onChangeText={setQ} icon="pin" placeholder="e.g. Moscow, Lagos, Douala" autoCapitalize="words" returnKeyType="done" onSubmit={() => q.trim() && done(q.trim())} />
      </Field>
      {q.trim() && !sugg.some((c) => c.toLowerCase() === q.trim().toLowerCase()) ? <OptRow icon="pin" title={q.trim()} sub="Use this city" onPress={() => done(q.trim())} /> : null}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {sugg.slice(0, 8).map((c) => (
          <Chip key={c} label={c} on={c === current} onPress={() => done(c)} />
        ))}
      </View>
    </View>
  );
}
