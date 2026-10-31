import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { db } from '../src/data/db';
import { CITIES, EDU, EX, POPULAR, SKILLS, SOFT } from '../src/data/catalog';
import { Btn, Chip, Chips, Field, Grow, Input, Label, Page, Pict, SelectBox, Steps, TopBar, Txt } from '../src/ui/kit';
import { Icon } from '../src/ui/Icon';
import { pick, sheet, SheetTitle, toast } from '../src/ui/overlay';
import { C, S } from '../src/ui/theme';
import { digits, ensureSkillList, isEmail, isPhone, myCity } from '../src/logic/core';
import { syncContacts } from '../src/logic/account';
import { bump, later } from '../src/logic/live';
import { openCV } from '../src/sheets/career';
import { PhoneInput } from '../src/components/auth';
import { openCities, pickCountry } from '../src/sheets/account';

type Edu = { lv: string; name: string; org: string; year: string };
type Exp = { role: string; org: string; from: number; to: number | null; desc: string };
type CVF = { prof: string; any: boolean; first: string; last: string; gender: string; dob: string; email: string; phone: string; city: string; cit: string; permit: string; edu: Edu[]; skills: string[]; exp: Exp[]; noExp: boolean; shuffle: number };

function initial(): CVF {
  ensureSkillList();
  syncContacts();
  const nm = (db.user.name || '').trim().split(/\s+/);
  return {
    prof: db.user.cv?.prof || db.user.skillList?.[0]?.n || '',
    any: false,
    first: nm[0] || '',
    last: nm.slice(1).join(' '),
    gender: db.user.cv?.gender || '',
    dob: db.user.cv?.dob || '',
    email: db.PR.ct.email || '',
    phone: db.PR.ct.phone || '',
    city: myCity(),
    cit: db.user.cv?.cit || 'Cameroon',
    permit: db.user.cv?.permit || 'Cameroon',
    edu: db.PR.edu.courses.map((c) => ({ lv: db.PR.edu.level, name: c.name, org: c.org, year: c.year })),
    skills: [...(db.user.cv?.skills || [])],
    exp: db.PR.exp.map((e) => ({ ...e })),
    noExp: !!db.user.cv?.noExp,
    shuffle: 0,
  };
}
const SCHOOLS = ['University of Buea', 'University of Bamenda', 'University of Douala', 'University of Yaoundé I', 'GTHS Buea', 'Catholic University Institute of Buea', 'HIBMAT Buea', 'Saker Baptist College', 'CCAST Bambili'];

export default function CVFlow() {
  const [c] = useState<CVF>(initial);
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<null | 'edu' | 'exp'>(null);
  const [, f] = useState(0);
  const re = () => f((x) => x + 1);
  const back = () => {
    if (form) return setForm(null);
    if (step) return setStep(step - 1);
    router.back();
  };
  const finish = () => {
    db.user.name = [c.first, c.last].filter(Boolean).join(' ') || db.user.name;
    db.PR.ct.email = c.email.trim();
    db.PR.ct.phone = digits(c.phone).replace(/^237/, '');
    db.user.cv = { prof: c.any ? 'Open to any job' : c.prof, gender: c.gender, dob: c.dob, cit: c.cit, permit: c.permit, skills: [...c.skills], noExp: c.noExp && !c.exp.length };
    if (c.edu.length) {
      db.PR.edu.courses = c.edu.map((e) => ({ name: e.name, org: e.org, year: e.year }));
      db.PR.edu.level = c.edu[0].lv || db.PR.edu.level;
    }
    db.PR.exp = c.exp;
    db.user.cvDone = true;
    bump();
    router.back();
    later(350, () => {
      openCV();
      toast('🎉 Your CV is ready');
    });
  };
  let body: React.ReactNode = null;
  if (step === 0)
    body = (
      <>
        <Txt s={26} w={8} style={{ marginTop: 18 }}>
          What job do you want?
        </Txt>
        {c.prof && !c.any ? (
          <Pressable onPress={() => openProfPicker(c, re)} style={[S.row, { gap: 10, marginTop: 18, padding: 16, borderRadius: 18, backgroundColor: C.s1, borderWidth: 1, borderColor: C.line }]}>
            <View style={{ flex: 1 }}>
              <Txt s={12} c={C.muted}>
                Profession
              </Txt>
              <Txt s={17} w={8}>
                {c.prof}
              </Txt>
            </View>
            <Icon name="edit" size={18} color={C.muted} />
          </Pressable>
        ) : null}
        <Grow />
        <View style={{ gap: 10 }}>
          {c.prof && !c.any ? <Btn variant="yellow" title="Continue" onPress={() => setStep(1)} /> : null}
          <Btn variant="soft" title={c.prof && !c.any ? 'Change profession' : 'Choose a profession'} onPress={() => openProfPicker(c, re)} />
          <Btn
            variant="soft"
            title="I’m open to any job"
            onPress={() => {
              c.any = true;
              c.prof = '';
              setStep(1);
            }}
          />
        </View>
      </>
    );
  if (step === 1) {
    const mailBad = !!c.email && !isEmail(c.email);
    const phoneBad = !!c.phone && !isPhone(c.phone);
    const okDate = !c.dob || /^\d{4}-\d{2}-\d{2}$/.test(c.dob);
    body = (
      <View style={{ gap: 14 }}>
        <Txt s={26} w={8} style={{ marginTop: 18 }}>
          Fill in the main information
        </Txt>
        <Field label="Surname">
          <Input value={c.last} onChangeText={(v) => ((c.last = v), re())} autoCapitalize="words" />
        </Field>
        <Field label="Name" error={!c.first.trim() && 'Add your first name'}>
          <Input value={c.first} onChangeText={(v) => ((c.first = v), re())} autoCapitalize="words" invalid={!c.first.trim()} />
        </Field>
        <Field label="Gender · optional">
          <SelectBox value={c.gender} placeholder="Gender" onPress={() => pick('Gender', ['Male', 'Female', 'Prefer not to say'], c.gender, (v) => ((c.gender = v), re()))} />
        </Field>
        <Field label="Date of birth · optional" error={!okDate && 'Use YYYY-MM-DD, e.g. 1998-04-21'}>
          <Input value={c.dob} onChangeText={(v) => ((c.dob = v), re())} placeholder="YYYY-MM-DD" keyboardType="numbers-and-punctuation" invalid={!okDate} />
        </Field>
        <Field label="Email address" error={mailBad && 'That email doesn’t look right'}>
          <Input value={c.email} onChangeText={(v) => ((c.email = v), re())} keyboardType="email-address" autoCapitalize="none" invalid={mailBad} />
        </Field>
        <Field label="Phone number" error={phoneBad && 'Enter a valid phone number'}>
          <PhoneInput value={c.phone || ''} onChange={(v) => ((c.phone = v), re())} invalid={phoneBad} />
        </Field>
        <Field label="City of residence">
          <SelectBox value={c.city} placeholder="Choose a city" onPress={() => openCities((v) => ((c.city = v), re()), c.city)} />
        </Field>
        <Field label="Citizenship">
          <SelectBox value={c.cit} onPress={() => pickCountry('Citizenship', c.cit, (v) => ((c.cit = v), re()))} />
        </Field>
        <Field label="Work permit">
          <SelectBox value={c.permit} onPress={() => pickCountry('Allowed to work in', c.permit, (v) => ((c.permit = v), re()), ['Not required', 'Several countries'])} />
        </Field>
        <Btn variant="yellow" title="Save and continue" disabled={!c.first.trim() || mailBad || phoneBad || !okDate} onPress={() => setStep(2)} />
      </View>
    );
  }
  if (step === 2) body = form === 'edu' ? <EduForm onSave={(e) => (c.edu.push(e), setForm(null))} /> : (
    <>
      <Txt s={26} w={8} style={{ marginTop: 18 }}>
        Where did you study?
      </Txt>
      {c.edu.length ? (
        <View style={{ gap: 8, marginTop: 16 }}>
          {c.edu.map((e, i) => (
            <View key={i} style={[S.row, { gap: 10, padding: 12, borderRadius: 16, backgroundColor: C.s1 }]}>
              <Icon name="cap" size={18} color={C.yellow} />
              <View style={{ flex: 1 }}>
                <Txt s={14} w={8}>
                  {e.name}
                </Txt>
                <Txt s={12} c={C.muted}>
                  {e.org}
                  {e.year ? ' · ' + e.year : ''}
                </Txt>
              </View>
              <Pressable accessibilityLabel="Remove" hitSlop={8} onPress={() => (c.edu.splice(i, 1), re())}>
                <Icon name="x" size={18} color={C.muted} />
              </Pressable>
            </View>
          ))}
        </View>
      ) : (
        <View style={{ alignItems: 'center', marginTop: 30, gap: 6 }}>
          <Pict pic="art/ill_edu" style={{ width: 200, height: 150 }} fit="contain" />
          <Txt s={16} w={8}>
            Add relevant education
          </Txt>
          <Txt s={13} c={C.muted}>
            It will help employers find you
          </Txt>
        </View>
      )}
      <Grow />
      <View style={{ gap: 10 }}>
        {c.edu.length ? <Btn variant="yellow" title="Continue" onPress={() => setStep(3)} /> : null}
        <Btn variant={c.edu.length ? 'soft' : 'yellow'} title={c.edu.length ? 'Add another' : 'Add an educational institution'} onPress={() => setForm('edu')} />
        {!c.edu.length ? <Btn variant="soft" title="Add later" onPress={() => setStep(3)} /> : null}
      </View>
    </>
  );
  if (step === 3) body = <SkillsStep c={c} re={re} onNext={() => setStep(4)} />;
  if (step === 4)
    body =
      form === 'exp' ? (
        <ExpForm prof={c.prof} onSave={(e) => (c.exp.unshift(e), (c.noExp = false), setForm(null))} />
      ) : (
        <>
          <Txt s={26} w={8} style={{ marginTop: 18 }}>
            Where have you worked?
          </Txt>
          {c.exp.length ? (
            <View style={{ gap: 8, marginTop: 16 }}>
              {c.exp.map((e, i) => (
                <View key={i} style={[S.row, { gap: 10, padding: 12, borderRadius: 16, backgroundColor: C.s1 }]}>
                  <Icon name="job" size={18} color={C.yellow} />
                  <View style={{ flex: 1 }}>
                    <Txt s={14} w={8}>
                      {e.role}
                    </Txt>
                    <Txt s={12} c={C.muted}>
                      {e.org} · {e.from} – {e.to || 'present'}
                    </Txt>
                  </View>
                  <Pressable accessibilityLabel="Remove" hitSlop={8} onPress={() => (c.exp.splice(i, 1), re())}>
                    <Icon name="x" size={18} color={C.muted} />
                  </Pressable>
                </View>
              ))}
            </View>
          ) : (
            <View style={{ alignItems: 'center', marginTop: 30, gap: 6 }}>
              <Pict pic="art/ill_work" style={{ width: 200, height: 150 }} fit="contain" />
              <Txt s={16} w={8}>
                Add work experience
              </Txt>
              <Txt s={13} c={C.muted} center>
                Jobs, internships, volunteering or self-employment all count
              </Txt>
            </View>
          )}
          <Grow />
          <View style={{ gap: 10 }}>
            <Btn variant={c.exp.length ? 'soft' : 'yellow'} title={c.exp.length ? 'Add another' : 'Add a place of work'} onPress={() => setForm('exp')} />
            <Btn
              variant={c.exp.length ? 'yellow' : 'soft'}
              title={c.exp.length ? 'Create my CV' : 'I have no experience yet'}
              onPress={() => {
                if (!c.exp.length) c.noExp = true;
                finish();
              }}
            />
          </View>
        </>
      );
  return (
    <Page keyboard header={<TopBar title="Create your CV" onBack={back} />} contentStyle={{ flexGrow: 1 }}>
      <Steps total={5} on={step + 1} />
      {body}
    </Page>
  );
}

function openProfPicker(c: CVF, re: () => void) {
  sheet.show(() => {
    const PP = () => {
      const [q, setQ] = useState('');
      const qq = q.trim().toLowerCase();
      const L = qq ? SKILLS.map((s) => s.n).filter((n) => n.toLowerCase().includes(qq)).slice(0, 30) : POPULAR.map((s) => s.n);
      const choose = (n: string) => {
        c.prof = n;
        c.any = false;
        sheet.close();
        re();
      };
      return (
        <View style={{ gap: 8 }}>
          <SheetTitle center>Profession</SheetTitle>
          <Input icon="search" value={q} onChangeText={setQ} placeholder="Search" autoFocus />
          <Txt s={12} w={7} c={C.muted}>
            {qq ? 'Results' : 'Popular'}
          </Txt>
          {L.map((n) => (
            <Pressable key={n} onPress={() => choose(n)} style={({ pressed }) => ({ paddingVertical: 12, paddingHorizontal: 8, borderRadius: 10, backgroundColor: pressed ? C.s2 : 'transparent' })}>
              <Txt s={15}>{n}</Txt>
            </Pressable>
          ))}
          {qq && !L.length ? <Btn variant="soft" title={`Use “${q.trim()}”`} onPress={() => choose(q.trim())} /> : null}
        </View>
      );
    };
    return <PP />;
  }, { full: true });
}
function EduForm({ onSave }: { onSave: (e: Edu) => void }) {
  const [lv, setLv] = useState('University');
  const [org, setOrg] = useState('');
  const [sp, setSp] = useState('');
  const [yr, setYr] = useState('');
  const [tried, setTried] = useState(false);
  return (
    <View style={{ gap: 14 }}>
      <Txt s={24} w={8} style={{ marginTop: 18 }}>
        Add an educational institution
      </Txt>
      <Field label="Level">
        <SelectBox value={lv} onPress={() => pick('Level', EDU, lv, setLv)} />
      </Field>
      <Field label="Institution" error={tried && !org.trim() && 'Add the school or university'}>
        <Input value={org} onChangeText={setOrg} placeholder="e.g. University of Buea" invalid={tried && !org.trim()} />
      </Field>
      {!org ? (
        <Chips>
          {SCHOOLS.slice(0, 6).map((s) => (
            <Chip key={s} small label={s} onPress={() => setOrg(s)} />
          ))}
        </Chips>
      ) : null}
      <Field label="Faculty or speciality">
        <Input value={sp} onChangeText={setSp} placeholder="e.g. Computer Science" />
      </Field>
      <Field label="Year of graduation">
        <Input value={yr} onChangeText={(v) => setYr(digits(v).slice(0, 4))} keyboardType="number-pad" placeholder="e.g. 2024" />
      </Field>
      <Btn
        variant="yellow"
        title="Save"
        onPress={() => {
          setTried(true);
          if (!org.trim()) return;
          onSave({ lv, name: sp.trim() || lv, org: org.trim(), year: yr });
        }}
      />
    </View>
  );
}
function ExpForm({ prof, onSave }: { prof: string; onSave: (e: Exp) => void }) {
  const Y = new Date().getFullYear();
  const [org, setOrg] = useState('');
  const [role, setRole] = useState(prof);
  const [from, setFrom] = useState(String(Y - 1));
  const [to, setTo] = useState('Present');
  const [desc, setDesc] = useState('');
  const [tried, setTried] = useState(false);
  const yrs = Array.from({ length: 41 }, (_, k) => String(Y - k));
  const bad = to !== 'Present' && +to < +from;
  return (
    <View style={{ gap: 14 }}>
      <Txt s={24} w={8} style={{ marginTop: 18 }}>
        Add a place of work
      </Txt>
      <Field label="Company or employer" error={tried && !org.trim() && 'Add the employer, or “Self-employed”'}>
        <Input value={org} onChangeText={setOrg} placeholder="e.g. Nexa Digital, or Self-employed" invalid={tried && !org.trim()} />
      </Field>
      <Field label="Position" error={tried && !role.trim() && 'Add your position'}>
        <Input value={role} onChangeText={setRole} placeholder="e.g. Sales representative" invalid={tried && !role.trim()} />
      </Field>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Field label="Start year" style={{ flex: 1 }}>
          <SelectBox value={from} onPress={() => pick('Start year', yrs, from, setFrom)} />
        </Field>
        <Field label="End year" style={{ flex: 1 }} error={bad && 'Before the start'}>
          <SelectBox value={to} invalid={bad} onPress={() => pick('End year', ['Present', ...yrs], to, setTo)} />
        </Field>
      </View>
      <Field label="What did you achieve? · optional">
        <Input multiline value={desc} onChangeText={setDesc} maxLength={240} />
      </Field>
      <Btn
        variant="yellow"
        title="Save"
        onPress={() => {
          setTried(true);
          if (!org.trim() || !role.trim() || bad) return;
          onSave({ org: org.trim(), role: role.trim(), from: +from, to: to === 'Present' ? null : +to, desc: desc.trim() });
        }}
      />
    </View>
  );
}
function SkillsStep({ c, re, onNext }: { c: CVF; re: () => void; onNext: () => void }) {
  const [q, setQ] = useState('');
  const sk = SKILLS.find((x) => x.n === c.prof);
  const pool = [...new Set([...(sk ? sk.x.flatMap((k) => EX[k]?.o || []) : []), ...(c.prof ? [c.prof] : POPULAR.slice(0, 6).map((x) => x.n)), ...SOFT])];
  const n = c.shuffle % Math.max(1, pool.length);
  const rot = pool.slice(n).concat(pool.slice(0, n)).slice(0, 14);
  const qq = q.trim().toLowerCase();
  const res = qq ? [...new Set([...SKILLS.map((x) => x.n), ...Object.values(EX).flatMap((e) => e.o), ...SOFT])].filter((x) => x.toLowerCase().includes(qq)).slice(0, 14) : rot;
  const add = (x: string) => {
    if (c.skills.length >= 30) return toast('Up to 30 skills');
    if (!c.skills.includes(x)) c.skills.push(x);
    setQ('');
    re();
  };
  return (
    <View style={{ gap: 12, flex: 1 }}>
      <Txt s={26} w={8} style={{ marginTop: 18 }}>
        What skills do you have?
      </Txt>
      <Txt s={13} c={C.muted}>
        You can select up to 30 skills · {c.skills.length} selected
      </Txt>
      <Input icon="search" value={q} onChangeText={setQ} placeholder="Search skills" onSubmit={() => q.trim() && add(q.trim())} returnKeyType="done" />
      {c.skills.length ? (
        <Chips>
          {c.skills.map((x) => (
            <Chip key={x} small on label={x + ' ✕'} onPress={() => ((c.skills = c.skills.filter((y) => y !== x)), re())} />
          ))}
        </Chips>
      ) : null}
      <View style={S.rowB}>
        <Label>{qq ? 'Search results' : c.prof ? 'Needed in your profession' : 'Popular skills'}</Label>
        {!qq ? (
          <Pressable accessibilityLabel="Show other skills" hitSlop={8} onPress={() => ((c.shuffle += 5), re())}>
            <Icon name="arrow" size={18} color={C.lav} />
          </Pressable>
        ) : null}
      </View>
      <Chips>
        {res
          .filter((x) => !c.skills.includes(x))
          .map((x) => (
            <Chip key={x} small label={x} onPress={() => add(x)} />
          ))}
        {qq && !res.length ? <Chip small label={`+ Add “${q.trim()}”`} onPress={() => add(q.trim())} /> : null}
      </Chips>
      <Grow />
      <Btn variant="yellow" title="Save and continue" onPress={onNext} />
    </View>
  );
}
export { Label };
