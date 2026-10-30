import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { db, ui, Course } from '../data/db';
import { router } from 'expo-router';
import { ARTICLES, CATS, EXPERTS, OPP_KINDS, PATHS, RULES, SALARIES, catIcon } from '../data/catalog';
import { OptRow, AlertIll, Avatar, Btn, Chip, Chips, Empty, Field, Input, Label, Meta, Note, Pill, ProTag, Rate, SelectBox, StatusPill, Stepper, Steps, Txt, Verified, tap } from '../ui/kit';
import { Icon } from '../ui/Icon';
import { afterSheet, pick, sheet, SheetTitle, toast } from '../ui/overlay';
import { C, R, S } from '../ui/theme';
import { P, isW, xaf, oppBiz, mOwner, curBiz, bizName, bizLogo, has, postById, fname, digits } from '../logic/core';
import { saveToggle } from '../logic/work';
import { announce, answerApplicant, answerMentee, courseGroup, enroll, enrolEmployees, joinMentor, joinOpp, publishMentor, publishOpp, removeStudent, setProgress, OppForm } from '../logic/career';
import { bump } from '../logic/live';
import { openProfile, openCourses, resetTo } from '../logic/nav';
import { MyCV, myCvHtml } from '../components/cv';
import { ListRow, OppCard } from '../components/cards';
import { openChat, RulePicker } from './chat';
import { openJob } from './work';
import { openPro, bizOnlyPrompt } from './account';

const SaveBtn = ({ list, id, label }: { list: 'savedOpps' | 'savedCourses' | 'savedCos' | 'savedMentors'; id: string; label: string }) => {
  const on = has(db[list], id);
  return (
    <Pressable accessibilityLabel={on ? 'Unsave' : 'Save'} hitSlop={6} onPress={() => saveToggle(list, id, label)} style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: on ? C.yellow : C.s2, alignItems: 'center', justifyContent: 'center' }}>
      <Icon name="bookmark" size={18} color={on ? '#000' : '#fff'} />
    </Pressable>
  );
};
function Facts({ items }: { items: [string, string][] }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 12 }}>
      {items.map(([i, t]) => (
        <View key={i + t} style={[S.row, { gap: 6, height: 30, paddingHorizontal: 12, borderRadius: 999, backgroundColor: C.s2 }]}>
          <Icon name={i} size={14} color={C.yellow} />
          <Txt s={12} w={7}>
            {t}
          </Txt>
        </View>
      ))}
    </View>
  );
}
function Head({ pic, sq, name, sub, right }: { pic: string; sq?: boolean; name: string; sub: string; right?: React.ReactNode }) {
  return (
    <View style={[S.row, { gap: 12 }]}>
      <Avatar pic={pic} size={46} square={sq} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Txt s={15} w={8} lines={1}>
          {name}
        </Txt>
        <Txt s={12} c={C.muted} lines={1}>
          {sub}
        </Txt>
      </View>
      {right}
    </View>
  );
}
const Lab = ({ icon, text }: { icon: string; text: string }) => (
  <View style={[S.row, { gap: 6, alignSelf: 'flex-start', marginTop: 16, height: 26, paddingHorizontal: 10, borderRadius: 999, backgroundColor: 'rgba(246,238,92,.14)' }]}>
    <Icon name={icon} size={14} color={C.yellow} />
    <Txt s={12} w={8} c={C.yellow}>
      {text}
    </Txt>
  </View>
);
const H4 = ({ t, n }: { t: string; n?: number }) => (
  <View style={[S.row, { gap: 8, marginTop: 20, marginBottom: 10 }]}>
    <Txt s={16} w={8}>
      {t}
    </Txt>
    {n != null ? (
      <View style={{ minWidth: 22, height: 22, borderRadius: 11, paddingHorizontal: 6, backgroundColor: C.s3, alignItems: 'center', justifyContent: 'center' }}>
        <Txt s={11} w={8}>
          {n}
        </Txt>
      </View>
    ) : null}
  </View>
);
function ReqRow({ pid, st, word, onAnswer }: { pid: string; st?: string; word: string; onAnswer: (s: 'acc' | 'dec') => void }) {
  const p = P(pid);
  const s = st || 'pending';
  return (
    <View style={[S.row, { gap: 12, padding: 10, borderRadius: 16, backgroundColor: C.s2 }]}>
      <Pressable onPress={() => afterSheet(() => openProfile(pid))}>
        <Avatar pic={p.photo} size={42} />
      </Pressable>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Txt s={14} w={8} lines={1}>
          {p.name}
        </Txt>
        <Meta parts={[p.role, <Rate key="r" r={p.rate} />]} />
      </View>
      {s === 'pending' ? (
        <View style={{ flexDirection: 'row', gap: 6 }}>
          <Pill title="Accept" onPress={() => onAnswer('acc')} />
          <Pill kind="outline" title="Decline" onPress={() => onAnswer('dec')} />
        </View>
      ) : (
        <StatusPill kind={s === 'acc' ? 'acc' : 'wait'} text={s === 'acc' ? word : 'Declined'} />
      )}
    </View>
  );
}

/* ======================= internships & programs ======================= */
/** Navigate to a full screen, closing any open sheet first. */
function pushScreen(path: string) {
  const go = () => router.push(path as any);
  if (sheet.isOpen()) afterSheet(go);
  else go();
}
export function openOpp(id: string) {
  pushScreen(`/opp/${id}`);
}
export function OppSheet({ id }: { id: string }) {
  const o = db.OPPS.find((x) => x.id === id);
  if (!o) return <Empty title="No longer available" />;
  const b = oppBiz(o);
  const full = o.joined >= o.seats;
  const forIndividuals = o.kind === 'Internship' || o.kind === 'Graduate program';
  return (
    <View>
      <Head pic={b.logo} sq name={b.name} sub={o.mode} right={!o.mine ? <SaveBtn list="savedOpps" id={o.id} label={o.kind} /> : db.user.pro.business ? <ProTag small text="PROMOTED" /> : null} />
      <Lab icon="cap" text={o.kind} />
      <Txt s={22} w={8} style={{ marginTop: 10, lineHeight: 26 }}>
        {o.title}
      </Txt>
      <Txt s={14} c="#d9d9de" style={{ marginTop: 6 }}>
        {o.desc}
      </Txt>
      <Facts
        items={[
          ['clock', o.dur],
          ['calcheck', `Starts ${o.start}`],
          ['money', o.pay],
          ['follow', `${o.joined}/${o.seats} places taken`],
          ['timer', `Apply by ${o.deadline}`],
        ]}
      />
      {o.skills.length ? (
        <Chips style={{ marginTop: 12 }}>
          {o.skills.map((s) => (
            <View key={s} style={{ height: 28, paddingHorizontal: 10, borderRadius: 999, backgroundColor: C.s3, justifyContent: 'center' }}>
              <Txt s={12} w={7}>
                {s}
              </Txt>
            </View>
          ))}
        </Chips>
      ) : null}
      {o.mine ? (
        <>
          <H4 t={o.kind === 'Training program' ? 'Requests to join' : 'Applications'} n={(o.people || []).length} />
          <Txt s={12} c={C.muted} style={{ marginTop: -4, marginBottom: 8 }}>
            {(o.people || []).filter((p) => o.st?.[p] === 'acc').length} accepted · {(o.people || []).filter((p) => !o.st?.[p]).length} waiting for your answer
          </Txt>
          <View style={{ gap: 8 }}>
            {(o.people || []).length ? (
              o.people!.map((pid) => <ReqRow key={pid} pid={pid} st={o.st?.[pid]} word={o.kind === 'Training program' ? 'Joined' : 'Accepted'} onAnswer={(s) => answerApplicant(o.id, pid, s)} />)
            ) : (
              <Empty title="No applications yet" text="People who apply show up here." />
            )}
          </View>
        </>
      ) : isW() ? (
        o.applied ? (
          <View style={{ marginTop: 16, padding: 14, borderRadius: 16, backgroundColor: 'rgba(47,179,109,.14)', flexDirection: 'row', gap: 8, alignItems: 'center' }}>
            <Icon name="check" size={18} color={C.mint} />
            <Txt s={14} w={7} c={C.mint} style={{ flex: 1 }}>
              {o.kind === 'Training program' ? 'You’ve joined' : 'Application sent'}
            </Txt>
            <Txt s={13} w={8}>
              Starts {o.start}
            </Txt>
          </View>
        ) : (
          <Btn variant="yellow" style={{ marginTop: 18 }} disabled={full} title={full ? 'Full' : o.kind === 'Training program' ? (o.pay.startsWith('Free') ? 'Join for free' : 'Join · ' + o.pay) : 'Apply now'} onPress={() => joinOpp(o.id)} />
        )
      ) : forIndividuals ? (
        <Note icon="user" style={{ marginTop: 16 }}>
          Internships are for individuals. Switch to your Regular profile to apply.
        </Note>
      ) : (
        <View style={{ marginTop: 16, gap: 8 }}>
          {o.emp ? (
            <StatusPill kind="acc" text={`${o.emp} employee${o.emp > 1 ? 's' : ''} enrolled · ${bizName(curBiz())}`} />
          ) : null}
          <Btn variant="yellow" icon="follow" title="Enrol employees" onPress={() => openEmpEnroll('opp', o.id)} />
        </View>
      )}
      {b.id ? <Btn variant="ghost" title={`About ${b.name}`} style={{ marginTop: 10 }} onPress={() => afterSheet(() => openProfile(b.id!))} /> : null}
    </View>
  );
}

type OF = OppForm & { lv: string };
export function openOppForm(kind?: string) {
  if (isW()) {
    bizOnlyPrompt('create internships, programs and courses');
    return;
  }
  const f: OF = { kind: kind || 'Internship', title: '', cat: '', desc: '', dur: '3 months', start: '', mode: 'On-site', paid: kind === 'Training program' ? 'Free' : kind === 'Course' ? 'Fee' : 'Paid', amount: '', seats: 5, deadline: '', lv: 'Beginner' };
  sheet.show(() => <OppFormSheet f={f} />, { full: true });
}
function OppFormSheet({ f }: { f: OF }) {
  const [, force] = useState(0);
  const re = () => force((x) => x + 1);
  const course = f.kind === 'Course';
  const fee = /Training|Course/.test(f.kind);
  const paidOpts = fee ? ['Free', 'Fee'] : ['Paid', 'Unpaid'];
  if (!paidOpts.includes(f.paid)) f.paid = paidOpts[fee ? 1 : 0];
  const set = (k: keyof OF, v: any) => ((f as any)[k] = v);
  return (
    <View style={{ gap: 14 }}>
      <SheetTitle sub={course ? `Published by ${bizName(curBiz())} in Career → Courses, where anyone can enroll or businesses can enrol their team.` : `Published by ${bizName(curBiz())} in Career, where anyone can apply or join.`}>
        New {f.kind.toLowerCase()}
      </SheetTitle>
      <View>
        <Label>Type</Label>
        <Chips>
          {OPP_KINDS.map((k) => (
            <Chip key={k} small label={k} on={f.kind === k} onPress={() => (set('kind', k), re())} />
          ))}
        </Chips>
      </View>
      <Field label="Title">
        <Input value={f.title} onChangeText={(v) => (set('title', v), re())} maxLength={60} placeholder={course ? 'e.g. Excel for small businesses' : f.kind === 'Internship' ? 'e.g. Marketing internship' : 'e.g. Customer service training'} />
      </Field>
      <Field label="Field">
        <SelectBox value={f.cat} placeholder="Choose a field" onPress={() => pick('Field', CATS.map((c) => c[0]), f.cat, (v) => (set('cat', v), re()))} />
      </Field>
      <Field label="What will people do and learn?">
        <Input multiline value={f.desc} onChangeText={(v) => (set('desc', v), re())} maxLength={400} />
      </Field>
      {course ? (
        <View>
          <Label>Level</Label>
          <Chips>
            {['Beginner', 'Advanced'].map((l) => (
              <Chip key={l} small label={l === 'Beginner' ? 'From zero' : 'Advanced'} on={f.lv === l} onPress={() => (set('lv', l), re())} />
            ))}
          </Chips>
        </View>
      ) : null}
      <View>
        <Label>Duration</Label>
        <Chips>
          {['2 weeks', '1 month', '3 months', '6 months', '12 months'].map((x) => (
            <Chip key={x} small label={x} on={f.dur === x} onPress={() => (set('dur', x), re())} />
          ))}
        </Chips>
      </View>
      <View>
        <Label>Where</Label>
        <Chips>
          {['On-site', 'Hybrid', 'Online'].map((x) => (
            <Chip key={x} small label={x} on={f.mode === x} onPress={() => (set('mode', x), re())} />
          ))}
        </Chips>
      </View>
      <View>
        <Label>{fee ? 'Price' : 'Pay'}</Label>
        <Chips>
          {paidOpts.map((x) => (
            <Chip key={x} small label={x} on={f.paid === x} onPress={() => (set('paid', x), re())} />
          ))}
        </Chips>
        {f.paid === 'Paid' || f.paid === 'Fee' ? (
          <Input style={{ marginTop: 10 }} value={f.amount} onChangeText={(v) => (set('amount', digits(v)), re())} prefix="XAF" keyboardType="number-pad" placeholder={f.paid === 'Paid' ? 'Monthly stipend, e.g. 40,000' : 'Fee, e.g. 25,000'} />
        ) : null}
      </View>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Field label="Starts" style={{ flex: 1 }}>
          <SelectBox value={f.start} placeholder="Pick a date" onPress={() => pick('Starts', nextDates(), f.start, (v) => (set('start', v), re()))} />
        </Field>
        <Field label="Apply by" style={{ flex: 1 }}>
          <SelectBox value={f.deadline} placeholder="Rolling" onPress={() => pick('Apply by', nextDates(), f.deadline, (v) => (set('deadline', v), re()))} />
        </Field>
      </View>
      <View>
        <Label>{course ? 'Places per intake' : 'Places'}</Label>
        <Stepper text={`${f.seats} place${f.seats > 1 ? 's' : ''}`} onMinus={() => (set('seats', Math.max(1, f.seats - 1)), re())} onPlus={() => (set('seats', Math.min(500, f.seats + 1)), re())} />
      </View>
      <Btn
        variant="yellow"
        title={`Publish ${f.kind.toLowerCase()}`}
        disabled={!f.title.trim()}
        onPress={() => {
          const kind = publishOpp({ ...f, start: toISO(f.start), deadline: toISO(f.deadline) });
          sheet.close();
          if (kind) {
            ui.meTab = 'Programs';
            resetTo('/me');
          }
        }}
      />
    </View>
  );
}
/** Next 12 weeks of Mondays as pickable dates. */
function nextDates() {
  const out: string[] = [];
  const d = new Date();
  d.setDate(d.getDate() + ((8 - d.getDay()) % 7 || 7));
  for (let i = 0; i < 12; i++) {
    out.push(d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }));
    d.setDate(d.getDate() + 7);
  }
  return out;
}
function toISO(label: string) {
  if (!label) return '';
  const d = new Date(`${label} ${new Date().getFullYear()}`);
  if (isNaN(+d)) return '';
  if (+d < Date.now() - 864e5) d.setFullYear(d.getFullYear() + 1);
  return d.toISOString();
}

/* ======================= company page (sheet) ======================= */
export function crSee(kind: 'Internship' | 'program') {
  pushScreen(`/opps?kind=${kind}`);
}

/* ======================= mentorship ======================= */
export function openMentor(id: string) {
  pushScreen(`/mentor/${id}`);
}
export function MentorSheet({ id }: { id: string }) {
  const m = db.MENTORSHIPS.find((x) => x.id === id);
  if (!m) return <Empty title="No longer available" />;
  const o = mOwner(m);
  return (
    <View>
      <Head pic={o.photo} sq={o.sq} name={o.name} sub={o.sub} right={!m.mine ? <SaveBtn list="savedMentors" id={m.id} label="Mentorship" /> : null} />
      <Lab icon="follow" text={`Mentorship · ${m.format}`} />
      <Txt s={22} w={8} style={{ marginTop: 10, lineHeight: 26 }}>
        {m.title}
      </Txt>
      <Txt s={14} c="#d9d9de" style={{ marginTop: 6 }}>
        {m.desc}
      </Txt>
      <Facts
        items={[
          ['clock', m.dur],
          ['money', m.price],
          ['follow', `${m.joined}/${m.seats} mentees`],
          [catIcon(m.field), m.field],
        ]}
      />
      {(m.rules || []).length ? (
        <View style={{ marginTop: 14, padding: 12, borderRadius: 14, backgroundColor: C.s2, gap: 8 }}>
          <Txt s={12} w={8} c={C.muted}>
            GROUP RULES
          </Txt>
          {m.rules!.map((k) =>
            RULES[k] ? (
              <View key={k} style={[S.row, { gap: 8 }]}>
                <Icon name={RULES[k][1]} size={15} color={C.lav} />
                <Txt s={13}>{RULES[k][0]}</Txt>
              </View>
            ) : null,
          )}
        </View>
      ) : null}
      {m.mine ? (
        <>
          <H4 t="Mentee requests" n={(m.people || []).length} />
          <View style={{ gap: 8 }}>
            {(m.people || []).length ? m.people!.map((pid) => <ReqRow key={pid} pid={pid} st={m.st?.[pid]} word="Mentee" onAnswer={(s) => answerMentee(m.id, pid, s)} />) : <Empty title="No requests yet" text="People who want you as a mentor show up here." />}
          </View>
        </>
      ) : m.joinedMe ? (
        <View style={{ marginTop: 16, gap: 10 }}>
          <View style={{ padding: 14, borderRadius: 16, backgroundColor: 'rgba(47,179,109,.14)', flexDirection: 'row', gap: 8, alignItems: 'center' }}>
            <Icon name={m.joinedMe === 'req' ? 'clock' : 'check'} size={18} color={C.mint} />
            <Txt s={14} w={7} c={C.mint} style={{ flex: 1 }}>
              {m.joinedMe === 'req' ? `Request sent, waiting for ${o.name.split(' ')[0]}` : 'You’re in! First session this week'}
            </Txt>
          </View>
          {m.joinedMe === 'yes' ? <Btn variant="dark" icon="chat" title="Open the group chat" onPress={() => afterSheet(() => openChat('g_' + m.id))} /> : null}
        </View>
      ) : !isW() && m.format === 'Group' ? (
        <Btn variant="yellow" icon="follow" title="Add employees to this mentorship" style={{ marginTop: 18 }} onPress={() => openEmpEnroll('mentor', m.id)} />
      ) : !isW() ? (
        <Note icon="user" style={{ marginTop: 16 }}>
          1-to-1 mentorships are for individuals. Switch to your Regular profile to request one.
        </Note>
      ) : (
        <Btn variant="yellow" style={{ marginTop: 18 }} disabled={m.joined >= m.seats} title={m.joined >= m.seats ? 'Full' : m.format === '1-to-1' ? 'Request a mentor' : 'Join mentorship'} onPress={() => joinMentor(m.id)} />
      )}
      {o.id ? <Btn variant="ghost" title={`About ${o.name}`} style={{ marginTop: 10 }} onPress={() => afterSheet(() => openProfile(o.id!))} /> : null}
    </View>
  );
}
type MF = { title: string; field: string; format: '1-to-1' | 'Group'; dur: string; price: 'Free' | 'Paid'; amount: string; seats: number; desc: string; rules: string[] };
export function openMentorForm() {
  const f: MF = { title: '', field: '', format: '1-to-1', dur: '1 month', price: 'Free', amount: '', seats: 3, desc: '', rules: ['noDM', 'respect'] };
  sheet.show(() => <MentorForm f={f} />, { full: true });
}
const MSTEPS = ['What you’ll mentor', 'How it runs', 'Price and what mentees get', 'Group rules and publish'];
function MentorForm({ f }: { f: MF }) {
  const [, force] = useState(0);
  const [step, setStep] = useState(0);
  const [tried, setTried] = useState(false);
  const re = () => force((x) => x + 1);
  const who = isW() ? db.user.name || 'you' : bizName(curBiz());
  const okStep = [f.title.trim().length >= 4 && !!f.field, true, f.price === 'Free' || Number(f.amount) > 0, true][step];
  const next = () => {
    setTried(true);
    if (!okStep) return;
    setTried(false);
    if (step < MSTEPS.length - 1) return setStep(step + 1);
    publishMentor(f);
    sheet.close();
  };
  return (
    <View style={{ gap: 14 }}>
      <Steps total={MSTEPS.length} on={step + 1} />
      <View>
        <Txt s={12} w={7} c={C.muted}>
          Step {step + 1} of {MSTEPS.length}
        </Txt>
        <SheetTitle sub={step === 0 ? `Published by ${who} in Career. Share what you know and help people grow.` : undefined}>{MSTEPS[step]}</SheetTitle>
      </View>
      {step === 0 ? (
        <>
          <Field label="Title" error={tried && f.title.trim().length < 4 && 'Give it a short title'}>
            <Input testID="mf-title" value={f.title} onChangeText={(v) => ((f.title = v), re())} maxLength={60} placeholder="e.g. Start your career in sales" invalid={tried && f.title.trim().length < 4} />
          </Field>
          <Field label="Field" error={tried && !f.field && 'Choose the field you’ll mentor in'}>
            <SelectBox testID="mf-field" value={f.field} placeholder="Choose a field" invalid={tried && !f.field} onPress={() => pick('Field', CATS.map((c) => c[0]), f.field, (v) => ((f.field = v), re()), true)} />
          </Field>
        </>
      ) : null}
      {step === 1 ? (
        <>
          <View>
            <Label>Format</Label>
            <Chips>
              {(['1-to-1', 'Group'] as const).map((x) => (
                <Chip key={x} small label={x} on={f.format === x} onPress={() => ((f.format = x), (f.seats = x === 'Group' ? 10 : 3), re())} />
              ))}
            </Chips>
          </View>
          <View>
            <Label>Length</Label>
            <Chips>
              {['2 weeks', '1 month', '3 months', '6 months'].map((x) => (
                <Chip key={x} small label={x} on={f.dur === x} onPress={() => ((f.dur = x), re())} />
              ))}
            </Chips>
          </View>
          <View>
            <Label>{f.format === 'Group' ? 'Places in the group' : 'Mentees at a time'}</Label>
            <Stepper text={String(f.seats)} onMinus={() => ((f.seats = Math.max(1, f.seats - 1)), re())} onPlus={() => ((f.seats = Math.min(100, f.seats + 1)), re())} />
          </View>
        </>
      ) : null}
      {step === 2 ? (
        <>
          <View>
            <Label>Price</Label>
            <Chips>
              {(['Free', 'Paid'] as const).map((x) => (
                <Chip key={x} small label={x} on={f.price === x} onPress={() => ((f.price = x), re())} />
              ))}
            </Chips>
            {f.price === 'Paid' ? <Input style={{ marginTop: 10 }} value={f.amount} onChangeText={(v) => ((f.amount = digits(v)), re())} prefix="XAF" keyboardType="number-pad" placeholder="Per month, e.g. 10,000" invalid={tried && !(Number(f.amount) > 0)} /> : null}
          </View>
          <Field label="What will mentees get? · optional">
            <Input multiline value={f.desc} onChangeText={(v) => ((f.desc = v), re())} maxLength={300} placeholder="e.g. Weekly calls, CV feedback, help with your first applications" />
          </Field>
        </>
      ) : null}
      {step === 3 ? (
        <>
          <RulePicker rules={f.rules} onChange={(r) => ((f.rules = r), re())} />
          <View style={{ padding: 14, borderRadius: 16, backgroundColor: C.s2, gap: 4 }}>
            <Txt s={15} w={8}>
              {f.title}
            </Txt>
            <Txt s={12} c={C.muted}>
              {[f.field, f.format, f.dur, `${f.seats} ${f.seats === 1 ? 'place' : 'places'}`, f.price === 'Free' ? 'Free' : `XAF ${Number(f.amount).toLocaleString('en')} / month`].join(' · ')}
            </Txt>
          </View>
        </>
      ) : null}
      <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
        {step > 0 ? <Btn variant="dark" title="Back" style={{ flex: 1 }} onPress={() => (setTried(false), setStep(step - 1))} /> : null}
        <Btn testID="mf-next" variant="yellow" style={{ flex: 2 }} title={step < MSTEPS.length - 1 ? 'Continue' : 'Publish mentorship'} onPress={next} />
      </View>
    </View>
  );
}

/* ======================= businesses enrol employees ======================= */
export function openEmpEnroll(kind: 'course' | 'mentor' | 'opp', id: string) {
  const st = { set: [] as string[], extra: [] as string[], q: '' };
  sheet.show(() => <EmpEnroll kind={kind} id={id} st={st} />, { full: true });
}
function EmpEnroll({ kind, id, st }: { kind: 'course' | 'mentor' | 'opp'; id: string; st: { set: string[]; extra: string[]; q: string } }) {
  const [, force] = useState(0);
  const [busy, setBusy] = useState(false);
  const re = () => force((x) => x + 1);
  const b = curBiz()!;
  const it: any = kind === 'course' ? db.COURSES.find((c) => c.id === id) : kind === 'mentor' ? db.MENTORSHIPS.find((m) => m.id === id) : db.OPPS.find((o) => o.id === id);
  const n = st.set.length + st.extra.length;
  const price = kind === 'course' ? it.price : 0;
  const add = () => {
    const v = st.q.trim();
    if (!v) return;
    st.extra.push(v);
    st.q = '';
    re();
  };
  return (
    <View style={{ gap: 12 }}>
      <SheetTitle sub={`${bizName(b)} pays and your employees follow “${it.title}”. A business can’t enrol on its own.`}>Enrol employees</SheetTitle>
      {b.team.length ? (
        b.team.map((pid) => {
          const on = st.set.includes(pid);
          return (
            <Pressable key={pid} onPress={() => ((st.set = on ? st.set.filter((x) => x !== pid) : [...st.set, pid]), re())} style={[S.row, { gap: 12, padding: 10, borderRadius: 14, backgroundColor: on ? 'rgba(61,90,241,.16)' : C.s2 }]}>
              <Avatar pic={P(pid).photo} size={40} />
              <View style={{ flex: 1 }}>
                <Txt s={14} w={7}>
                  {P(pid).name}
                </Txt>
                <Txt s={12} c={C.muted}>
                  {P(pid).role} · on your team
                </Txt>
              </View>
              <Icon name={on ? 'checkc' : 'plus'} size={20} color={on ? C.yellow : C.muted} />
            </Pressable>
          );
        })
      ) : (
        <Note icon="follow">Nobody is on your team yet. Add employees by name or phone below. They’ll get an invite by SMS.</Note>
      )}
      {st.extra.map((e, i) => (
        <View key={e + i} style={[S.row, { gap: 12, padding: 10, borderRadius: 14, backgroundColor: 'rgba(61,90,241,.16)' }]}>
          <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: C.s3, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="user" size={18} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Txt s={14} w={7}>
              {e}
            </Txt>
            <Txt s={12} c={C.muted}>
              Invite by SMS
            </Txt>
          </View>
          <Pressable accessibilityLabel="Remove" onPress={() => (st.extra.splice(i, 1), re())} hitSlop={8}>
            <Icon name="x" size={18} color={C.muted} />
          </Pressable>
        </View>
      ))}
      <View style={[S.row, { gap: 8 }]}>
        <Input value={st.q} onChangeText={(v) => ((st.q = v), re())} placeholder="Add employee: name or phone" style={{ flex: 1, height: 48, minHeight: 48 }} onSubmit={add} />
        <Pressable onPress={add} style={{ height: 48, paddingHorizontal: 16, borderRadius: R.md, backgroundColor: C.s3, justifyContent: 'center' }}>
          <Txt s={13} w={7}>
            Add
          </Txt>
        </Pressable>
      </View>
      {price ? (
        <View style={[S.row, { gap: 10, padding: 12, borderRadius: 14, backgroundColor: C.s2 }]}>
          <Icon name="coins" size={18} color={C.yellow} />
          <Txt s={13} style={{ flex: 1 }}>
            {n} × {xaf(price)} = <Txt s={13} w={8}>{xaf(n * price)}</Txt> · Mobile Money
          </Txt>
        </View>
      ) : null}
      <Btn
        variant="yellow"
        loading={busy}
        disabled={!n}
        title={n ? `Enrol ${n} employee${n > 1 ? 's' : ''}` : 'Choose employees'}
        onPress={() => {
          setBusy(true);
          setTimeout(() => {
            enrolEmployees(kind, id, n);
            sheet.close();
          }, 900);
        }}
      />
    </View>
  );
}

/* ======================= courses ======================= */
export function openCourse(id: string) {
  sheet.show(() => <CourseSheet id={id} />, { tag: 'course:' + id, full: true });
}
function CourseSheet({ id }: { id: string }) {
  const [busy, setBusy] = useState(false);
  const c = db.COURSES.find((x) => x.id === id);
  if (!c) return <Empty title="Course not found" />;
  const d = c.old ? Math.round((1 - c.price / c.old) * 100) : 0;
  const e = db.myLearning.includes(id);
  return (
    <View>
      <Head pic={c.prov.logo} sq name={c.prov.n} sub={c.fmt + (c.reg ? ' · ' + c.reg : '')} right={!c.mine ? <SaveBtn list="savedCourses" id={c.id} label="Course" /> : null} />
      <Lab icon="cap" text={`${c.cat} · ${c.type}`} />
      <Txt s={22} w={8} style={{ marginTop: 10, lineHeight: 26 }}>
        {c.title}
      </Txt>
      <Facts items={[['star', c.lv === 'Beginner' ? 'From zero' : 'Advanced'], ['clock', c.dur], ...(c.prof ? ([['job', `Become a ${c.prof.toLowerCase()}`]] as [string, string][]) : [])]} />
      <H4 t="What you’ll learn" />
      {[...c.skills, `A certificate from ${c.prov.n}`].map((s) => (
        <View key={s} style={[S.row, { gap: 8, marginBottom: 6 }]}>
          <Icon name="check" size={16} color={C.mint} />
          <Txt s={14}>{s}</Txt>
        </View>
      ))}
      <View style={[S.row, { gap: 10, marginTop: 12, flexWrap: 'wrap' }]}>
        <Txt s={24} w={8} c={C.yellow}>
          {c.price ? xaf(c.price) : 'Free'}
        </Txt>
        {c.old ? (
          <Txt s={14} c={C.muted} style={{ textDecorationLine: 'line-through' }}>
            {xaf(c.old)}
          </Txt>
        ) : null}
        {d ? <StatusPill kind="urg" text={`−${d}%`} /> : null}
      </View>
      {c.mo ? (
        <Txt s={12} c={C.muted}>
          or {xaf(c.mo)} per month
        </Txt>
      ) : null}
      {c.mine ? (
        <CourseOwner c={c} />
      ) : !isW() ? (
        <View style={{ marginTop: 16, gap: 8 }}>
          {c.emp ? <StatusPill kind="acc" text={`${c.emp} employee${c.emp > 1 ? 's' : ''} enrolled · ${bizName(curBiz())}`} /> : null}
          <Btn variant="yellow" icon="follow" title={c.emp ? 'Enrol more employees' : 'Enrol employees'} onPress={() => openEmpEnroll('course', c.id)} />
          <Txt s={12} c={C.muted} center>
            Businesses enrol their team, not the business itself.
          </Txt>
        </View>
      ) : e ? (
        <View style={{ marginTop: 16, padding: 14, borderRadius: 16, backgroundColor: 'rgba(47,179,109,.14)', flexDirection: 'row', gap: 8, alignItems: 'center' }}>
          <Icon name="check" size={18} color={C.mint} />
          <Txt s={14} w={7} c={C.mint} style={{ flex: 1 }}>
            You’re enrolled
          </Txt>
          <Txt s={13} w={8}>
            Starts next Monday
          </Txt>
        </View>
      ) : (
        <Btn
          variant="yellow"
          style={{ marginTop: 16 }}
          loading={busy}
          title={busy ? (c.price ? 'Waiting for Mobile Money approval…' : 'Enrolling…') : c.price ? 'Enroll · pay with Mobile Money' : 'Enroll for free'}
          onPress={() => {
            setBusy(true);
            enroll(id, () => setBusy(false));
          }}
        />
      )}
    </View>
  );
}
function CourseOwner({ c }: { c: Course }) {
  const L = c.people || [];
  const done = L.filter((p) => (c.prog || {})[p] >= 100).length;
  const rev = L.length * c.price;
  return (
    <View>
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 16 }}>
        {[
          [L.length, 'Students'],
          [done, 'Completed'],
          [rev ? Math.round(rev / 1000) + 'k' : '0', 'XAF earned'],
        ].map(([v, l]) => (
          <View key={l as string} style={{ flex: 1, padding: 12, borderRadius: 14, backgroundColor: C.s2, alignItems: 'center' }}>
            <Txt s={20} w={8}>
              {v}
            </Txt>
            <Txt s={11} c={C.muted}>
              {l}
            </Txt>
          </View>
        ))}
      </View>
      <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
        <Btn variant="yellow" icon="follow" title="Class group" disabled={!L.length} style={{ flex: 1 }} onPress={() => afterSheet(() => openChat(courseGroup(c)))} />
        <Btn variant="dark" icon="bell" title="Announce" disabled={!L.length} style={{ flex: 1 }} onPress={() => openAnnounce(c.id)} />
      </View>
      <H4 t="Students" n={L.length} />
      {L.length ? (
        <View style={{ gap: 8 }}>
          {L.map((pid) => {
            const pr = (c.prog || {})[pid] || 0;
            return (
              <View key={pid} style={[S.row, { gap: 12, padding: 10, borderRadius: 16, backgroundColor: C.s2 }]}>
                <Avatar pic={P(pid).photo} size={40} />
                <View style={{ flex: 1, gap: 4 }}>
                  <Txt s={14} w={8}>
                    {P(pid).name}
                  </Txt>
                  <View style={{ height: 4, borderRadius: 2, backgroundColor: C.s3, overflow: 'hidden' }}>
                    <View style={{ width: `${pr}%`, height: 4, backgroundColor: pr >= 100 ? C.mint : C.yellow }} />
                  </View>
                  <Txt s={11} c={C.muted}>
                    {pr >= 100 ? 'Completed ✓' : pr ? pr + '% done' : 'Not started'}
                  </Txt>
                </View>
                <Pressable accessibilityLabel="Student options" hitSlop={8} onPress={() => openStudentMenu(c.id, pid)}>
                  <Icon name="dots" size={20} color={C.muted} />
                </Pressable>
              </View>
            );
          })}
        </View>
      ) : (
        <Empty title="No students yet" text="People who enroll show up here and join your class group automatically." />
      )}
    </View>
  );
}
function openStudentMenu(cid: string, pid: string) {
  const c = db.COURSES.find((x) => x.id === cid)!;
  const pr = (c.prog || {})[pid] || 0;
  sheet.show(() => (
    <View>
      <View style={[S.row, { gap: 12, marginBottom: 8 }]}>
        <Avatar pic={P(pid).photo} size={44} />
        <View>
          <Txt s={15} w={8}>
            {P(pid).name}
          </Txt>
          <Txt s={12} c={C.muted}>
            {c.title} · {pr}%
          </Txt>
        </View>
      </View>
      <OptRow icon="chat" title="Message privately" onPress={() => afterSheet(() => openChat(pid))} />
      <OptRow icon="rocket" bg={C.lav} title="Mark progress +25%" chev={false} onPress={() => (setProgress(cid, pid, Math.min(100, pr + 25)), openCourse(cid))} />
      <OptRow icon="cert" bg={C.mint} title="Mark completed & send certificate" chev={false} onPress={() => (setProgress(cid, pid, 100), openCourse(cid))} />
      <OptRow icon="trash" bg={C.errSoft} title="Remove from course" danger chev={false} onPress={() => (removeStudent(cid, pid), openCourse(cid))} />
    </View>
  ));
}
function openAnnounce(cid: string) {
  const c = db.COURSES.find((x) => x.id === cid)!;
  let t = '';
  sheet.show(() => {
    const A = () => {
      const [v, setV] = useState('');
      t = v;
      return (
        <View style={{ gap: 12 }}>
          <SheetTitle sub={`Posted to the class group and sent to all ${(c.people || []).length} students.`}>Announcement</SheetTitle>
          <Input multiline value={v} onChangeText={setV} placeholder="e.g. Lesson 2 is tomorrow at 6pm, link below" autoFocus />
          <Btn
            variant="yellow"
            icon="send"
            title="Send"
            disabled={!v.trim()}
            onPress={() => {
              announce(cid, t.trim());
              sheet.close();
            }}
          />
        </View>
      );
    };
    return <A />;
  });
}

/* ======================= career tools ======================= */
export function openCV() {
  sheet.show(() => <CVSheet />, { full: true });
}
function CVSheet() {
  const [t, setT] = useState<string>(ui.cvT);
  const [busy, setBusy] = useState(false);
  return (
    <View style={{ gap: 12 }}>
      <SheetTitle sub="Built from your profile. Update your profile and the CV updates too.">My CV</SheetTitle>
      <Chips>
        {['Classic', 'Modern'].map((x) => (
          <Chip
            key={x}
            small
            label={x === 'Modern' && !db.user.pro.regular ? 'Modern · PRO' : x}
            on={t === x}
            onPress={() => {
              if (x === 'Modern' && !db.user.pro.regular) {
                openPro('regular', 'cv');
                return;
              }
              ui.cvT = x;
              setT(x);
            }}
          />
        ))}
      </Chips>
      <MyCV modern={t === 'Modern'} />
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Btn
          variant="dark"
          icon="edit"
          title="Edit CV"
          style={{ flex: 1 }}
          onPress={() =>
            afterSheet(() => {
              db.user.cvDone = false;
              router.push('/cvflow');
            })
          }
        />
        <Btn
          variant="yellow"
          icon="download"
          title="Save PDF"
          loading={busy}
          style={{ flex: 1 }}
          onPress={async () => {
            setBusy(true);
            try {
              const { uri } = await Print.printToFileAsync({ html: myCvHtml() });
              if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'Your CV', UTI: 'com.adobe.pdf' });
              else toast('CV saved');
            } catch {
              toast('Couldn’t create the PDF');
            }
            setBusy(false);
          }}
        />
      </View>
    </View>
  );
}
export function openSalaries() {
  sheet.show(() => (
    <View style={{ gap: 8 }}>
      <SheetTitle sub="Typical monthly pay in Buea, Douala and Yaoundé, in XAF. Estimates only, real offers vary by employer and experience.">Professions and salaries</SheetTitle>
      {SALARIES.map(([p, c, r]) => {
        const n = db.POSTS.filter((x) => x.kind === 'request' && x.cat === c && !x.mine).length;
        return (
          <Pressable
            key={p}
            onPress={() =>
              afterSheet(() => {
                    ui.cat = c;
                ui.feedView = 'jobs';
                resetTo('/feed');
              })
            }
            style={({ pressed }) => [S.row, { gap: 12, padding: 12, borderRadius: 14, backgroundColor: pressed ? C.s3 : C.s2 }]}
          >
            <View style={{ width: 38, height: 38, borderRadius: 10, backgroundColor: C.s3, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name={catIcon(c)} size={18} color={C.yellow} />
            </View>
            <View style={{ flex: 1 }}>
              <Txt s={14} w={7}>
                {p}
              </Txt>
              <Txt s={12} c={C.muted}>
                {n} open job{n === 1 ? '' : 's'} on bolo
              </Txt>
            </View>
            <Txt s={12} w={8} c={C.yellow}>
              {r}
            </Txt>
          </Pressable>
        );
      })}
    </View>
  ));
}
export function openArticles() {
  sheet.show(() => (
    <View style={{ gap: 8 }}>
      <SheetTitle>Career articles</SheetTitle>
      {ARTICLES.map(([t, m, tag], i) => (
        <Pressable key={t} onPress={() => openArticle(i)} style={({ pressed }) => ({ padding: 14, borderRadius: 16, backgroundColor: pressed ? C.s3 : C.s2, gap: 4 })}>
          <Txt s={11} w={8} c={C.lav}>
            {tag.toUpperCase()}
          </Txt>
          <Txt s={15} w={8}>
            {t}
          </Txt>
          <Txt s={12} c={C.muted}>
            {m} read
          </Txt>
        </Pressable>
      ))}
    </View>
  ));
}
function openArticle(i: number) {
  const [t, m, tag, ps] = ARTICLES[i];
  sheet.show(() => (
    <View style={{ gap: 10 }}>
      <Pressable onPress={openArticles}>
        <Txt s={13} w={7} c={C.lav}>
          ← All articles
        </Txt>
      </Pressable>
      <Txt s={11} w={8} c={C.lav}>
        {tag.toUpperCase()}
      </Txt>
      <Txt s={22} w={8} style={{ lineHeight: 26 }}>
        {t}
      </Txt>
      <Txt s={12} c={C.muted}>
        {m} read
      </Txt>
      {ps.map((p, j) => (
        <Txt key={j} s={15} c="#e3e3e6" style={{ lineHeight: 23 }}>
          {p}
        </Txt>
      ))}
    </View>
  ));
}
export function openPaths() {
  sheet.show(() => (
    <View style={{ gap: 8 }}>
      <SheetTitle sub="Pick a direction. We’ll show the steps, courses and programs to get there.">Career change</SheetTitle>
      {PATHS.map(([t, i], k) => (
        <Pressable key={t} onPress={() => openPath(k)} style={({ pressed }) => [S.row, { gap: 12, padding: 12, borderRadius: 14, backgroundColor: pressed ? C.s3 : C.s2 }]}>
          <View style={{ width: 38, height: 38, borderRadius: 10, backgroundColor: C.s3, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name={i} size={18} color={C.yellow} />
          </View>
          <Txt s={14} w={7} style={{ flex: 1 }}>
            {t}
          </Txt>
          <Icon name="chev" size={18} color={C.faint} />
        </Pressable>
      ))}
    </View>
  ));
}
function openPath(k: number) {
  const [t, , steps, cs, os] = PATHS[k];
  sheet.show(() => (
    <View style={{ gap: 10 }}>
      <Pressable onPress={openPaths}>
        <Txt s={13} w={7} c={C.lav}>
          ← All paths
        </Txt>
      </Pressable>
      <Txt s={20} w={8}>
        {t}
      </Txt>
      {steps.map((s, i) => (
        <View key={s} style={[S.row, { gap: 10, alignItems: 'flex-start' }]}>
          <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: C.yellow, alignItems: 'center', justifyContent: 'center' }}>
            <Txt s={12} w={8} c="#000">
              {i + 1}
            </Txt>
          </View>
          <Txt s={14} style={{ flex: 1 }}>
            {s}
          </Txt>
        </View>
      ))}
      <H4 t="Courses" />
      {cs.map((id) => {
        const c = db.COURSES.find((x) => x.id === id)!;
        return <ListRow key={id} pic={c.prov.logo} square title={c.title} sub={`${c.prov.n} · ${c.price ? xaf(c.price) : 'Free'}`} onPress={() => openCourse(id)} />;
      })}
      <H4 t="Internships & programs" />
      {os.map((id) => {
        const o = db.OPPS.find((x) => x.id === id)!;
        return <ListRow key={id} pic={oppBiz(o).logo} square title={o.title} sub={`${o.kind} · ${o.pay}`} onPress={() => openOpp(id)} />;
      })}
    </View>
  ));
}
export function openExperts() {
  router.push('/experts');
}
export { openCourses, Verified, AlertIll, postById, openJob, fname };
