import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { db, Service, uid } from '../data/db';
import { CATS, CT, DOCS, EDU, FOLLOWERS, JOB_HIST, NB, QUIZ, UNITS, WHERE, catIcon } from '../data/catalog';
import { OptRow, AlertIll, Avatar, Btn, Chip, Chips, Empty, Field, Input, Label, Note, SelectBox, Seg, StatusPill, SwitchRow, Txt, Kpis, CoTag } from '../ui/kit';
import { Icon } from '../ui/Icon';
import { afterSheet, pick, sheet, SheetTitle, toast, confirm } from '../ui/overlay';
import { C, R, S } from '../ui/theme';
import { P, budgetNum, cityLabel, digits, isEmail, isPhone, isW, myCity, mySkill, has } from '../logic/core';
import { openCities } from './account';
import { services, syncContacts, toggleFollow } from '../logic/account';
import { bump, later } from '../logic/live';
import { openProfile } from '../logic/nav';
import { LanguagesEditor } from '../components/skills';
import { PhoneInput } from '../components/auth';

/* ---------------- services ---------------- */
export function openService(id?: string) {
  const s = id ? services().find((x) => x.id === id) : null;
  const e: Service & { isNew?: number } = s
    ? { ...s, pub: s.draft ? true : s.pub }
    : { id: uid('s'), skill: [mySkill(), ...db.user.skills, ...CATS.map((c) => c[0])].find((n) => n && !services().some((x) => x.skill === n)) || mySkill(), price: '', unit: 'per job', where: WHERE[0], desc: '', pub: true, boost: 0, isNew: 1 };
  sheet.show(() => <ServiceForm e={e} />, { full: true });
}
function ServiceForm({ e }: { e: Service & { isNew?: number } }) {
  const [, f] = useState(0);
  const [tried, setTried] = useState(false);
  const re = () => f((x) => x + 1);
  const price = digits(String(e.price || ''));
  return (
    <View style={{ gap: 14 }}>
      <SheetTitle>{e.isNew ? 'Add a service' : e.draft ? 'Complete your service' : 'Edit service'}</SheetTitle>
      <Field label="Service">
        <SelectBox icon={catIcon(e.skill)} value={e.skill} onPress={() => pick('Service', CATS.map((c) => c[0]), e.skill, (v) => ((e.skill = v), re()), true)} />
      </Field>
      <Field label="Starting price" error={tried && !price && 'Add a starting price'}>
        <Input prefix="XAF" keyboardType="number-pad" value={price ? (+price).toLocaleString('en-US') : ''} onChangeText={(v) => ((e.price = digits(v)), re())} placeholder="e.g. 5,000" invalid={tried && !price} />
      </Field>
      <View>
        <Label>Charged</Label>
        <Chips>
          {UNITS.map((u) => (
            <Chip key={u} small label={u} on={e.unit === u} onPress={() => ((e.unit = u), re())} />
          ))}
        </Chips>
      </View>
      <View>
        <Label>Where you work</Label>
        <Chips>
          {WHERE.map((u) => (
            <Chip key={u} small label={u} on={e.where === u} onPress={() => ((e.where = u), re())} />
          ))}
        </Chips>
      </View>
      <Field label="What’s included · optional">
        <Input multiline value={e.desc} onChangeText={(v) => ((e.desc = v), re())} maxLength={200} placeholder="e.g. Tools included, free estimate, 30-day guarantee" />
      </Field>
      <SwitchRow title="Show in search" sub="People nearby can find this service" value={e.pub} onChange={(v) => ((e.pub = v), re())} />
      <Btn
        variant="yellow"
        title={e.isNew ? 'Add service' : e.draft ? 'Publish service' : 'Save changes'}
        onPress={() => {
          setTried(true);
          if (!price) return;
          const L = services();
          const i = L.findIndex((x) => x.id === e.id);
          const wasDraft = e.draft;
          const { isNew, draft, ...clean } = e;
          const s: Service = { ...clean, price: +price };
          if (i >= 0) L[i] = s;
          else L.push(s);
          const added = !db.user.skills.includes(e.skill);
          if (added) db.user.skills.push(e.skill);
          sheet.close(wasDraft ? `${e.skill} service published` : i >= 0 ? 'Service updated' : `${e.skill} service added${added ? ' — and added to your skills' : ''}`);
        }}
      />
      {!e.isNew ? <Btn variant="ghost" title="Delete service" onPress={() => delService(e.id)} /> : null}
    </View>
  );
}
function delService(id: string) {
  const L = services();
  if (L.length <= 1) {
    toast('Keep at least one service on your profile');
    return;
  }
  const s = L.find((x) => x.id === id)!;
  confirm({
    title: `Delete ${s.skill}?`,
    text: 'People won’t find this service any more.',
    ok: 'Delete',
    danger: true,
    icon: 'trash',
    onOk: () => {
      db.PR.services = L.filter((x) => x.id !== id);
      bump();
      toast('Service deleted');
    },
  });
}
export function openSvcMenu(id: string) {
  sheet.show(() => {
    const s = services().find((x) => x.id === id);
    if (!s) return <Empty title="Service not found" />;
    return (
      <View>
        <SheetTitle>{s.skill}</SheetTitle>
        <OptRow icon="edit" bg="#fff" title="Edit service" sub="Price, where you work, what’s included" onPress={() => afterSheet(() => openService(id))} />
        <OptRow
          icon={s.pub ? 'eyeoff' : 'eye'}
          bg={C.lav}
          title={s.pub ? 'Hide from search' : 'Show in search'}
          sub={s.pub ? 'Pause new offers for this service' : 'Start getting offers again'}
          onPress={() => {
            s.pub = !s.pub;
            sheet.close(s.pub ? 'Visible in search again' : 'Hidden from search');
          }}
        />
        <OptRow icon="rocket" title="Boost in search" sub={s.boost ? `Boosted · ${s.boost} day${s.boost > 1 ? 's' : ''} left` : 'Show first to people nearby'} onPress={() => afterSheet(() => openBoost(id))} />
        <OptRow icon="trash" bg={C.errSoft} title="Delete" sub="Remove this service from your profile" danger onPress={() => afterSheet(() => delService(id))} />
      </View>
    );
  });
}
export function openBoost(id: string) {
  sheet.show(() => <Boost id={id} />);
}
function Boost({ id }: { id: string }) {
  const s = services().find((x) => x.id === id)!;
  const O: [number, number][] = [
    [1, 500],
    [3, 1200],
    [7, 2500],
  ];
  const [d, setD] = useState(3);
  const [busy, setBusy] = useState(false);
  const free = db.user.pro.regular;
  const cost = O.find((o) => o[0] === d)![1];
  return (
    <View>
      <AlertIll icon="rocket" />
      <SheetTitle center sub={`Show up first on the map and feed around ${db.PR.area.home || myCity()}. Boosted profiles get about 4× more views.`}>
        Boost your {s.skill.toLowerCase()} service
      </SheetTitle>
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 14 }}>
        {O.map(([n, p]) => (
          <Pressable key={n} accessibilityRole="radio" accessibilityState={{ checked: d === n }} onPress={() => setD(n)} style={{ flex: 1, padding: 12, borderRadius: 14, alignItems: 'center', backgroundColor: C.s2, borderWidth: 2, borderColor: d === n ? C.yellow : 'transparent' }}>
            <Txt s={15} w={8}>
              {n} day{n > 1 ? 's' : ''}
            </Txt>
            <Txt s={12} c={C.muted}>
              {free && n === 1 ? 'Free with Pro' : 'XAF ' + p.toLocaleString('en-US')}
            </Txt>
            {n === 3 ? (
              <Txt s={10} w={8} c={C.yellow}>
                POPULAR
              </Txt>
            ) : null}
          </Pressable>
        ))}
      </View>
      <View style={[S.row, { gap: 8, marginTop: 12 }]}>
        <Icon name="coins" size={16} color={C.yellow} />
        <Txt s={12} c={C.muted}>
          Pay with MTN MoMo or Orange Money
        </Txt>
      </View>
      <Btn
        variant="yellow"
        style={{ marginTop: 14 }}
        loading={busy}
        title={busy ? 'Waiting for Mobile Money approval…' : free && d === 1 ? 'Use a free boost' : `Pay XAF ${cost.toLocaleString('en-US')}`}
        onPress={() => {
          setBusy(true);
          later(free && d === 1 ? 400 : 1400, () => {
            s.boost = (s.boost || 0) + d;
            s.pub = true;
            sheet.close(`🚀 Boosted! ${s.skill} shows first for ${d} day${d > 1 ? 's' : ''}`);
          });
        }}
      />
    </View>
  );
}

/* ---------------- skill test ---------------- */
export function openTest(sk?: string) {
  const skills = db.user.skills.length ? db.user.skills : [mySkill()];
  const q = { skill: sk || skills.find((s) => db.PR.tests[s] !== 'passed') || skills[0], i: -1, score: 0, pick: null as number | null };
  sheet.show(() => <Quiz q={q} />);
}
function Quiz({ q }: { q: { skill: string; i: number; score: number; pick: number | null } }) {
  const [, f] = useState(0);
  const re = () => f((x) => x + 1);
  const Q = QUIZ[q.skill] || QUIZ.General;
  const skills = db.user.skills.length ? db.user.skills : [mySkill()];
  if (q.i < 0)
    return (
      <View>
        <AlertIll icon="exam" bg={C.lav} />
        <SheetTitle center sub={`${Q.length} quick questions · about 1 minute. Get ${Q.length - 1} right to earn a verified badge.`}>
          Skill test
        </SheetTitle>
        <Label>Choose a skill</Label>
        <Chips>
          {skills.map((s) => (
            <Chip key={s} label={(db.PR.tests[s] === 'passed' ? '✓ ' : '') + s} on={q.skill === s} onPress={() => ((q.skill = s), re())} />
          ))}
        </Chips>
        <Btn variant="yellow" style={{ marginTop: 16 }} title={db.PR.tests[q.skill] === 'passed' ? 'Take it again' : 'Start test'} onPress={() => ((q.i = 0), (q.score = 0), re())} />
      </View>
    );
  if (q.i >= Q.length) {
    const ok = q.score >= Q.length - 1;
    if (ok && db.PR.tests[q.skill] !== 'passed') {
      db.PR.tests[q.skill] = 'passed';
      bump();
    }
    const more = skills.some((s) => db.PR.tests[s] !== 'passed');
    return (
      <View>
        <AlertIll icon={ok ? 'verified' : 'x'} bg={ok ? C.ok : C.errSoft} />
        <SheetTitle center sub={`You got ${q.score} of ${Q.length} right. ${ok ? 'Your skill now shows a verified badge.' : `Review the basics and try again — you need ${Q.length - 1} of ${Q.length}.`}`}>
          {ok ? `${q.skill} verified!` : 'Not quite this time'}
        </SheetTitle>
        <Btn variant="yellow" style={{ marginTop: 16 }} title={ok ? 'Done' : 'Try again'} onPress={() => (ok ? sheet.close() : ((q.i = 0), (q.score = 0), (q.pick = null), re()))} />
        {ok && more ? <Btn variant="ghost" style={{ marginTop: 10 }} title="Test another skill" onPress={() => openTest()} /> : null}
      </View>
    );
  }
  const [qt, opts, ans] = Q[q.i];
  const p = q.pick;
  return (
    <View>
      <Txt s={12} w={7} c={C.muted}>
        {q.skill} · Question {q.i + 1} of {Q.length}
      </Txt>
      <View style={{ height: 4, borderRadius: 2, backgroundColor: C.s3, marginTop: 8 }}>
        <View style={{ height: 4, borderRadius: 2, backgroundColor: C.yellow, width: `${((q.i + (p != null ? 1 : 0)) / Q.length) * 100}%` }} />
      </View>
      <Txt s={18} w={8} style={{ marginTop: 14, marginBottom: 12 }}>
        {qt}
      </Txt>
      <View style={{ gap: 8 }}>
        {opts.map((o, j) => {
          const right = p != null && j === ans;
          const wrong = p === j && j !== ans;
          return (
            <Pressable
              key={o}
              disabled={p != null}
              onPress={() => {
                q.pick = j;
                if (j === ans) q.score++;
                re();
              }}
              style={[S.row, { gap: 8, padding: 14, borderRadius: 14, backgroundColor: right ? 'rgba(47,179,109,.2)' : wrong ? 'rgba(255,107,107,.18)' : C.s2, borderWidth: 1, borderColor: right ? C.ok : wrong ? C.err : 'transparent', opacity: p != null && !right && !wrong ? 0.5 : 1 }]}
            >
              <Txt s={14} w={6} style={{ flex: 1 }}>
                {o}
              </Txt>
              {right ? <Icon name="check" size={18} color={C.mint} /> : wrong ? <Icon name="x" size={18} color={C.err} /> : null}
            </Pressable>
          );
        })}
      </View>
      {p != null ? <Btn variant="yellow" style={{ marginTop: 16 }} title={q.i + 1 < Q.length ? 'Next question' : 'See result'} onPress={() => (q.i++, (q.pick = null), re())} /> : null}
    </View>
  );
}

/* ---------------- area, contacts, experience, education ---------------- */
export function openArea() {
  const a = { home: db.PR.area.home, areas: [...db.PR.area.areas], radius: db.PR.area.radius };
  sheet.show(() => <AreaForm a={a} />);
}
function AreaForm({ a }: { a: { home: string; areas: string[]; radius: number } }) {
  const [, f] = useState(0);
  const re = () => f((x) => x + 1);
  const w = isW();
  return (
    <View style={{ gap: 14 }}>
      <SheetTitle>{w ? 'Work area' : 'Where you live'}</SheetTitle>
      <Field label="Neighbourhood or district you live in">
        <Input testID="area-home" icon="pin" value={a.home} onChangeText={(v) => ((a.home = v), re())} placeholder={cityLabel() ? `e.g. a district of ${cityLabel()}` : 'e.g. your district'} autoCapitalize="words" />
      </Field>
      <OptRow icon="gpsfix" title={cityLabel() || 'Set your city'} sub="City · tap to change or use GPS" onPress={() => openCities()} />
      {w ? (
        <>
          <View>
            <Label>How far you’ll travel for jobs</Label>
            <Chips>
              {[2, 5, 10, 25, 50].map((r) => (
                <Chip key={r} small label={`${r} km`} on={a.radius === r} onPress={() => ((a.radius = r), re())} />
              ))}
            </Chips>
          </View>
          <Note icon="pin">We show you jobs within {a.radius} km of where you are.</Note>
        </>
      ) : (
        <Note icon="lock">People you hire only see your neighbourhood until you book them.</Note>
      )}
      <Btn
        variant="yellow"
        title="Save"
        onPress={() => {
          a.home = a.home.trim();
          a.areas = a.home ? [a.home] : [];
          db.PR.area = a;
          sheet.close(w ? 'Work area saved' : 'Location saved');
        }}
      />
    </View>
  );
}
export function openContacts(focus?: string) {
  syncContacts();
  const d = { ...db.PR.ct };
  sheet.show(() => <Contacts d={d} focus={focus} />, { full: true });
}
function Contacts({ d, focus }: { d: Record<string, string>; focus?: string }) {
  const [, f] = useState(0);
  const re = () => f((x) => x + 1);
  const bad = (k: string) => !!d[k] && ((k === 'phone' && !isPhone(d[k])) || (k === 'email' && !isEmail(d[k])) || (k === 'whatsapp' && !isPhone(d[k])));
  const anyBad = CT.some(([k]) => bad(k));
  return (
    <View style={{ gap: 14 }}>
      <SheetTitle>Contact info</SheetTitle>
      {CT.map(([k, l, i, ph, t]) => (
        <Field key={k} label={l} error={bad(k) && (k === 'email' ? 'That email doesn’t look right' : 'Enter a valid phone number')}>
{k === 'phone' || k === 'whatsapp' ? (
            <PhoneInput value={d[k] || ''} onChange={(v) => ((d[k] = v), re())} invalid={bad(k)} />
          ) : (
          <Input
            icon={i}
            value={d[k] || ''}
            onChangeText={(v) => ((d[k] = v), re())}
            placeholder={ph}
            keyboardType={t === 'tel' ? 'phone-pad' : t === 'email' ? 'email-address' : 'default'}
            autoCapitalize="none"
            autoFocus={focus === k}
            invalid={bad(k)}
          />
          )}
        </Field>
      ))}
      <Note icon="lock">Only shown to people you’ve agreed to work with.</Note>
      <Btn
        variant="yellow"
        title="Save"
        disabled={anyBad}
        onPress={() => {
          Object.keys(d).forEach((k) => (d[k] = (d[k] || '').trim()));
          db.PR.ct = d;
          sheet.close('Contact info saved');
        }}
      />
    </View>
  );
}
export function openExp(i?: number) {
  const Y = new Date().getFullYear();
  const cur = i != null ? db.PR.exp[i] : null;
  const e = cur ? { ...cur } : { role: mySkill(), org: '', from: Y - db.user.years, to: null as number | null, desc: '' };
  sheet.show(() => <ExpForm e={e} i={i} />, { full: true });
}
function ExpForm({ e, i }: { e: { role: string; org: string; from: number; to: number | null; desc: string }; i?: number }) {
  const [, f] = useState(0);
  const [tried, setTried] = useState(false);
  const re = () => f((x) => x + 1);
  const Y = new Date().getFullYear();
  const yrs = Array.from({ length: 41 }, (_, k) => String(Y - k));
  const badRange = e.to != null && e.to < e.from;
  return (
    <View style={{ gap: 14 }}>
      <SheetTitle>{i != null ? 'Edit work experience' : 'Add work experience'}</SheetTitle>
      <Field label="What did you do?" error={tried && !e.role.trim() && 'Add your role'}>
        <Input icon="job" value={e.role} onChangeText={(v) => ((e.role = v), re())} maxLength={50} invalid={tried && !e.role.trim()} />
      </Field>
      <Field label="Where?" error={tried && !e.org.trim() && 'Add a company, or “Self-employed”'}>
        <Input value={e.org} onChangeText={(v) => ((e.org = v), re())} placeholder="Company name, or Self-employed" maxLength={50} invalid={tried && !e.org.trim()} />
      </Field>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Field label="From" style={{ flex: 1 }}>
          <SelectBox value={String(e.from)} onPress={() => pick('From', yrs, String(e.from), (v) => ((e.from = +v), re()))} />
        </Field>
        <Field label="To" style={{ flex: 1 }} error={badRange && 'Before the start'}>
          <SelectBox value={e.to ? String(e.to) : 'Now'} invalid={badRange} onPress={() => pick('To', ['Now', ...yrs], e.to ? String(e.to) : 'Now', (v) => ((e.to = v === 'Now' ? null : +v), re()))} />
        </Field>
      </View>
      <Field label="Achievements · optional">
        <Input multiline value={e.desc} onChangeText={(v) => ((e.desc = v), re())} maxLength={240} placeholder="e.g. Fixed plumbing in 40+ homes, trained 2 apprentices" />
      </Field>
      <Btn
        variant="yellow"
        title="Save"
        onPress={() => {
          setTried(true);
          if (!e.role.trim() || !e.org.trim() || badRange) return;
          const v = { ...e, role: e.role.trim(), org: e.org.trim(), desc: e.desc.trim() };
          if (i != null) db.PR.exp[i] = v;
          else db.PR.exp.unshift(v);
          db.PR.exp.sort((a, b) => (b.to || 9999) - (a.to || 9999) || b.from - a.from);
          sheet.close('Experience saved');
        }}
      />
      {i != null ? (
        <Btn
          variant="ghost"
          title="Remove"
          onPress={() => {
            db.PR.exp.splice(i, 1);
            sheet.close('Experience removed');
          }}
        />
      ) : null}
    </View>
  );
}
export function openEdu() {
  const d = { level: db.PR.edu.level, courses: db.PR.edu.courses.map((c) => ({ ...c })) };
  sheet.show(() => <EduForm d={d} />, { full: true });
}
function EduForm({ d }: { d: { level: string; courses: { name: string; org: string; year: string }[] } }) {
  const [, f] = useState(0);
  const re = () => f((x) => x + 1);
  const [n, setN] = useState('');
  const [o, setO] = useState('');
  const [y, setY] = useState('');
  return (
    <View style={{ gap: 14 }}>
      <SheetTitle>Education & courses</SheetTitle>
      <View>
        <Label>Highest level</Label>
        <Chips>
          {EDU.map((l) => (
            <Chip key={l} small label={l} on={d.level === l} onPress={() => ((d.level = l), re())} />
          ))}
        </Chips>
      </View>
      <View style={{ gap: 6 }}>
        <Label>Courses & certificates</Label>
        {d.courses.map((c, i) => (
          <View key={c.name + i} style={[S.row, { gap: 10, padding: 10, borderRadius: 12, backgroundColor: C.s2 }]}>
            <Icon name="cert" size={18} color={C.yellow} />
            <View style={{ flex: 1 }}>
              <Txt s={14} w={7}>
                {c.name}
              </Txt>
              <Txt s={12} c={C.muted}>
                {c.org}
                {c.year ? ' · ' + c.year : ''}
              </Txt>
            </View>
            <Pressable accessibilityLabel="Remove" hitSlop={8} onPress={() => (d.courses.splice(i, 1), re())}>
              <Icon name="x" size={18} color={C.muted} />
            </Pressable>
          </View>
        ))}
        <Input value={n} onChangeText={setN} placeholder="Course or certificate, e.g. Solar installation" />
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Input value={o} onChangeText={setO} placeholder="Where, e.g. GTHS Buea" style={{ flex: 2 }} />
          <Input value={y} onChangeText={(v) => setY(digits(v).slice(0, 4))} placeholder="Year" keyboardType="number-pad" style={{ flex: 1 }} />
        </View>
        <Btn
          variant="dark"
          icon="plus"
          title="Add to list"
          disabled={!n.trim()}
          onPress={() => {
            d.courses.push({ name: n.trim(), org: o.trim() || '—', year: y });
            setN('');
            setO('');
            setY('');
          }}
        />
      </View>
      <Btn
        variant="yellow"
        title="Save"
        onPress={() => {
          if (n.trim()) d.courses.push({ name: n.trim(), org: o.trim() || '—', year: y });
          db.PR.edu = d;
          sheet.close('Education saved');
        }}
      />
    </View>
  );
}

/* ---------------- documents & video ---------------- */
export function openDoc(k: string) {
  sheet.show(() => <DocSheet k={k} />);
}
function DocSheet({ k }: { k: string }) {
  const [t, , s] = DOCS[k];
  const st = db.PR.docs[k];
  const submit = () => {
    db.PR.docs[k] = 'review';
    sheet.close(db.demo ? `${t} sent for review` : `${t} sent — we’ll notify you once it’s checked`);
    if (db.demo) later(4000, () => {
      db.PR.docs[k] = 'verified';
      toast(`✅ ${t} verified`);
    });
  };
  if (st)
    return (
      <View>
        <AlertIll icon={st === 'verified' ? 'verified' : 'timer'} bg={st === 'verified' ? C.ok : C.s3} color={st === 'verified' ? '#000' : '#fff'} />
        <SheetTitle center sub={st === 'verified' ? 'Checked by bolo. People see a verified badge on your profile.' : 'We’re checking your document. This usually takes a few minutes.'}>
          {t}
        </SheetTitle>
        <Btn style={{ marginTop: 16 }} title="OK" onPress={() => sheet.close()} />
      </View>
    );
  return (
    <View style={{ gap: 12 }}>
      <SheetTitle sub={`${s}. Take a clear photo — all four corners visible, no glare.`}>{t}</SheetTitle>
      <Pressable
        onPress={async () => {
          const r = await ImagePicker.launchCameraAsync({ quality: 0.7 }).catch(() => null);
          if (r && !r.canceled) submit();
        }}
        style={{ aspectRatio: 1.6, borderRadius: R.lg, borderWidth: 2, borderStyle: 'dashed', borderColor: C.s3, alignItems: 'center', justifyContent: 'center', gap: 8 }}
      >
        <Icon name="camera" size={28} color={C.yellow} />
        <Txt s={14} w={7}>
          Take a photo
        </Txt>
      </Pressable>
      <Btn
        variant="dark"
        icon="image"
        title="Upload from gallery"
        onPress={async () => {
          const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7 }).catch(() => null);
          if (r && !r.canceled) submit();
        }}
      />
    </View>
  );
}
export async function openVideo() {
  const perm = await ImagePicker.requestCameraPermissionsAsync();
  if (!perm.granted) {
    toast('Allow camera access in Settings to record your intro');
    return;
  }
  const r = await ImagePicker.launchCameraAsync({ mediaTypes: ['videos'], videoMaxDuration: 60, cameraType: ImagePicker.CameraType.front, quality: 0.6 as any }).catch(() => null);
  if (!r || r.canceled) return;
  const secs = Math.round((r.assets[0].duration || 30000) / 1000);
  db.PR.video = { dur: `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`, at: 'Just now' };
  db.PR.vidHide = false;
  bump();
  toast('Intro video saved');
}
export function openLangs() {
  const d = { langs: db.PR.langs.map((x) => [...x] as [string, string]) };
  sheet.show(() => {
    const L = () => {
      const [, f] = useState(0);
      return (
        <View style={{ gap: 12 }}>
          <SheetTitle>Languages</SheetTitle>
          <LanguagesEditor langs={d.langs} onChange={() => f((x) => x + 1)} />
          <Btn
            variant="yellow"
            title="Save"
            disabled={!d.langs.length}
            onPress={() => {
              db.PR.langs = d.langs;
              sheet.close('Languages saved');
            }}
          />
        </View>
      );
    };
    return <L />;
  }, { full: true });
}

/* ---------------- followers ---------------- */
export function openFollows(tab: 'Followers' | 'Following') {
  sheet.show(() => <Follows tab0={tab} />, { full: true });
}
function Follows({ tab0 }: { tab0: 'Followers' | 'Following' }) {
  const [tab, setTab] = useState(tab0);
  const [q, setQ] = useState('');
  const [, f] = useState(0);
  const src = tab === 'Followers' ? FOLLOWERS : db.followed;
  const L = src.filter((id) => P(id)?.name && (!q || P(id).name.toLowerCase().includes(q.toLowerCase())));
  return (
    <View style={{ gap: 10 }}>
      <Seg
        items={[
          ['Followers', `Followers ${FOLLOWERS.length}`],
          ['Following', `Following ${db.followed.length}`],
        ]}
        value={tab}
        onChange={setTab}
      />
      <Input icon="search" value={q} onChangeText={setQ} placeholder="Search" />
      {L.length ? (
        L.map((id) => {
          const p = P(id);
          const on = has(db.followed, id);
          return (
            <View key={id} style={[S.row, { gap: 12 }]}>
              <Pressable onPress={() => afterSheet(() => openProfile(id))} style={[S.row, { gap: 12, flex: 1, minWidth: 0 }]}>
                <Avatar pic={p.photo} square={!!p.biz} size={44} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <View style={[S.row, { gap: 4 }]}>
                    <Txt s={14} w={8} lines={1} style={{ flexShrink: 1 }}>
                      {p.name}
                    </Txt>
                    {p.biz ? <CoTag /> : null}
                  </View>
                  <Txt s={12} c={C.muted} lines={1}>
                    {p.biz ? db.BIZ_SAMPLE[id]?.sector || 'Company' : p.role}
                  </Txt>
                </View>
              </Pressable>
              <Btn
                small
                variant={on ? 'ghost' : 'yellow'}
                title={tab === 'Following' ? (on ? 'Unfollow' : 'Follow') : on ? 'Following' : 'Follow back'}
                onPress={() => {
                  toggleFollow(id);
                  f((x) => x + 1);
                }}
              />
            </View>
          );
        })
      ) : (
        <Empty title={q ? 'No one found' : tab === 'Following' ? 'You’re not following anyone' : 'No followers yet'} />
      )}
    </View>
  );
}

/* ---------------- job history (Regular, as a worker) ---------------- */
export function openJobHistory() {
  sheet.show(() => <JobHistory />, { full: true });
}
function JobHistory() {
  const [flt, setF] = useState<'All' | 'Completed' | 'In progress'>('All');
  const live = db.BOOKINGS.filter((b) => b.worker === 'me').map((b) => [b.title, b.client, b.state === 'confirmed' ? 'Today' : b.when, b.price, b.state === 'confirmed' ? 5 : 0, b.state] as [string, string, string, string, number, string]);
  const all = [...live, ...JOB_HIST.map((x) => [...x, 'confirmed'] as [string, string, string, string, number, string])];
  const done = all.filter((x) => x[5] === 'confirmed');
  const L = all.filter((x) => flt === 'All' || (flt === 'Completed' ? x[5] === 'confirmed' : x[5] !== 'confirmed'));
  const earn = done.reduce((a, x) => a + budgetNum(x[3]), 0);
  const rated = done.filter((x) => x[4]);
  const avg = rated.length ? (rated.reduce((a, x) => a + x[4], 0) / rated.length).toFixed(1) : '—';
  return (
    <View style={{ gap: 12 }}>
      <SheetTitle>Job history</SheetTitle>
      <Kpis
        items={[
          [done.length, 'Jobs done'],
          [Math.round(earn / 1000) + 'k', 'XAF earned'],
          [avg, 'Avg rating'],
        ]}
      />
      <Chips>
        {(['All', 'Completed', 'In progress'] as const).map((t) => (
          <Chip key={t} small label={t} on={flt === t} onPress={() => setF(t)} />
        ))}
      </Chips>
      {L.length ? (
        L.map(([t, c, w, pr, s, st], i) => (
          <View key={t + i} style={[S.row, { gap: 12, padding: 12, borderRadius: 16, backgroundColor: C.s1, borderWidth: 1, borderColor: C.line }]}>
            <Avatar pic={P(c)?.photo} size={40} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Txt s={14} w={8} lines={1}>
                {t}
              </Txt>
              <Txt s={12} c={C.muted} lines={1}>
                {P(c)?.name} · {w}
              </Txt>
              {s ? (
                <Txt s={12} c={C.yellow}>
                  {'★'.repeat(s)}
                  {'☆'.repeat(5 - s)}
                </Txt>
              ) : null}
            </View>
            <View style={{ alignItems: 'flex-end', gap: 4 }}>
              <Txt s={13} w={8}>
                {pr}
              </Txt>
              <StatusPill kind={st === 'confirmed' ? 'acc' : 'wait'} text={st === 'confirmed' ? 'Paid' : st === 'done' ? 'Awaiting confirm' : st === 'booked' ? 'Upcoming' : 'In progress'} />
            </View>
          </View>
        ))
      ) : (
        <Empty title="Nothing here" />
      )}
    </View>
  );
}
