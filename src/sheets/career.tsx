import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, View, useWindowDimensions } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { db, ui } from '../data/db';
import { router } from 'expo-router';
import { WebView } from 'react-native-webview';
import { openCourseSite } from '../logic/listings';
import { CV_TEMPLATES, CvKind, CvTpl, cvData, cvHtml, tplOf } from '../components/cvTemplates';
import { ARTICLES, CATS, OPP_KINDS, PATHS, RULES, SALARIES, catIcon } from '../data/catalog';
import { Avatar, Btn, Chip, Chips, Empty, Field, Input, Label, Meta, Note, PTabs, Pill, ProTag, Rate, Seg, SelectBox, StatusPill, Stepper, Steps, Txt, tap } from '../ui/kit';
import { Icon } from '../ui/Icon';
import { afterSheet, pick, sheet, SheetTitle, toast } from '../ui/overlay';
import { C, S } from '../ui/theme';
import { P, isW, xaf, oppBiz, mOwner, curBiz, bizName, has, digits } from '../logic/core';
import { saveToggle } from '../logic/work';
import { answerApplicant, answerMentee, joinMentor, joinOpp, publishMentor, publishOpp, updateMentor, updateOpp, OppForm } from '../logic/career';
import { useLive } from '../logic/live';
import { openProfile, resetTo } from '../logic/nav';
import { ListRow } from '../components/cards';
import { openChat, RulePicker } from './chat';
import { bizOnlyPrompt } from './account';

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
          <Btn testID="opp-edit" variant="dark" icon="edit" title={`Edit ${o.kind.toLowerCase()}`} style={{ marginTop: 14 }} onPress={() => openOppForm(o.kind, o.id)} />
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
        <Note icon="user" style={{ marginTop: 16 }}>
          Programs are joined from a Regular profile. Share this page with your team so they can join.
        </Note>
      )}
      {b.id ? <Btn variant="ghost" title={`About ${b.name}`} style={{ marginTop: 10 }} onPress={() => afterSheet(() => openProfile(b.id!))} /> : null}
    </View>
  );
}

type OF = OppForm & { lv: string; edit?: string; was?: { start: string; deadline: string } };
export function openOppForm(kind?: string, editId?: string) {
  // Courses are listings with a link to the course's own page (quick setup screen).
  if (kind === 'Course') return router.push('/list-course' as any);
  // Anyone can list a course; internships and programs come from business pages.
  if (isW() && kind !== 'Course') {
    bizOnlyPrompt('create internships and programs');
    return;
  }
  const old = editId ? db.OPPS.find((x) => x.id === editId && x.mine) : undefined;
  const f: OF = old
    ? {
        // editing: everything as it is now; the dates stay unless new ones are picked
        kind: old.kind,
        title: old.title,
        cat: old.cat,
        desc: old.desc === 'Details coming soon.' ? '' : old.desc,
        dur: old.dur,
        start: '',
        mode: old.mode.split(' · ')[0] || 'On-site',
        paid: /stipend/i.test(old.pay) ? 'Paid' : /fee/i.test(old.pay) ? 'Fee' : /^free/i.test(old.pay) ? 'Free' : 'Unpaid',
        amount: digits(old.pay),
        seats: old.seats,
        deadline: '',
        lv: 'Beginner',
        edit: old.id,
        was: { start: old.start, deadline: old.deadline },
      }
    : { kind: kind || 'Internship', title: '', cat: '', desc: '', dur: '3 months', start: '', mode: 'On-site', paid: kind === 'Training program' ? 'Free' : kind === 'Course' ? 'Fee' : 'Paid', amount: '', seats: 5, deadline: '', lv: 'Beginner' };
  sheet.show(() => <OppFormSheet f={f} />, { full: true });
}
function OppFormSheet({ f }: { f: OF }) {
  const [, force] = useState(0);
  const re = () => force((x) => x + 1);
  const course = f.kind === 'Course';
  const fee = /Training|Course/.test(f.kind);
  const tutor = isW();
  const by = tutor ? db.user.name || 'you' : bizName(curBiz());
  const paidOpts = fee ? ['Free', 'Fee'] : ['Paid', 'Unpaid'];
  if (!paidOpts.includes(f.paid)) f.paid = paidOpts[fee ? 1 : 0];
  const set = (k: keyof OF, v: any) => ((f as any)[k] = v);
  return (
    <View style={{ gap: 14 }}>
      <SheetTitle sub={course ? `Published by ${by} in Career → Courses. Students enrol and join your class group; fees go to your wallet.` : `Published by ${by} in Career, where anyone can apply or join.`}>
        {f.edit ? 'Edit' : 'New'} {f.kind.toLowerCase()}
      </SheetTitle>
      {tutor || f.edit ? null : <View>
        <Label>Type</Label>
        <Chips>
          {OPP_KINDS.map((k) => (
            <Chip key={k} small label={k} on={f.kind === k} onPress={() => (k === 'Course' ? (sheet.close(), afterSheet(() => router.push('/list-course' as any))) : (set('kind', k), re()))} />
          ))}
        </Chips>
      </View>}
      <Field label="Title">
        <Input value={f.title} onChangeText={(v) => (set('title', v), re())} maxLength={60} placeholder={course ? 'e.g. Excel for small businesses' : f.kind === 'Internship' ? 'e.g. Marketing internship' : 'e.g. Customer service training'} />
      </Field>
      <Field label="Field">
        <SelectBox value={f.cat} placeholder="Choose a field" onPress={() => pick('Field', CATS.map((c) => c[0]), f.cat, (v) => (set('cat', v), re()))} />
      </Field>
      <Field label="What will people do and learn?">
        <Input multiline maxHeight={300} value={f.desc} onChangeText={(v) => (set('desc', v), re())} />
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
      <LengthPicker label="Duration" value={f.dur === '12 months' ? '1 year' : f.dur} onChange={(v) => (set('dur', v), re())} />
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
          <SelectBox value={f.start} placeholder={f.was?.start || 'Pick a date'} onPress={() => pick('Starts', nextDates(), f.start, (v) => (set('start', v), re()))} />
        </Field>
        <Field label="Apply by" style={{ flex: 1 }}>
          <SelectBox value={f.deadline} placeholder={f.was?.deadline || 'Rolling'} onPress={() => pick('Apply by', nextDates(), f.deadline, (v) => (set('deadline', v), re()))} />
        </Field>
      </View>
      <View>
        <Label>{course ? 'Places per intake' : 'Places'}</Label>
        <Stepper testID="of-seats" label="Places" value={f.seats} min={1} max={500} unit={(n) => `${n} place${n > 1 ? 's' : ''}`} onChange={(n) => (set('seats', n), re())} />
      </View>
      <Btn
        variant="yellow"
        testID="of-submit"
        title={f.edit ? 'Save changes' : `Publish ${f.kind.toLowerCase()}`}
        disabled={!f.title.trim()}
        onPress={() => {
          if (f.edit) {
            updateOpp(f.edit, { ...f, start: toISO(f.start), deadline: toISO(f.deadline) });
            return sheet.close();
          }
          const kind = publishOpp({ ...f, start: toISO(f.start), deadline: toISO(f.deadline) });
          sheet.close();
          if (tutor) setTimeout(() => router.push('/teach' as any), 300);
          else if (kind) {
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
          <Btn testID="mentor-edit" variant="dark" icon="edit" title="Edit mentorship" style={{ marginTop: 14 }} onPress={() => openMentorForm(m.id)} />
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
      ) : !isW() ? (
        <Note icon="user" style={{ marginTop: 16 }}>
          Mentorships are for individuals. Switch to your Regular profile to request one.
        </Note>
      ) : (
        <Btn variant="yellow" style={{ marginTop: 18 }} disabled={m.joined >= m.seats} title={m.joined >= m.seats ? 'Full' : m.format === '1-to-1' ? 'Request a mentor' : 'Join mentorship'} onPress={() => joinMentor(m.id)} />
      )}
      {o.id ? <Btn variant="ghost" title={`About ${o.name}`} style={{ marginTop: 10 }} onPress={() => afterSheet(() => openProfile(o.id!))} /> : null}
    </View>
  );
}
/* How long something runs: common lengths in one tap, or any length (a number of weeks, months or years), or no end date. */
const LENGTHS = ['2 weeks', '1 month', '3 months', '6 months', '1 year'];
type LUnit = 'week' | 'month' | 'year';
const LMAX: Record<LUnit, number> = { week: 52, month: 36, year: 5 };
export function LengthPicker({ value, onChange, label = 'Length' }: { value: string; onChange: (v: string) => void; label?: string }) {
  const m = /^(\d+)\s+(week|month|year)s?$/.exec(value);
  const [custom, setCustom] = useState(!LENGTHS.includes(value) && value !== 'Ongoing');
  const n = m ? +m[1] : 1;
  const unit: LUnit = m ? (m[2] as LUnit) : 'month';
  const put = (k: number, u: LUnit) => onChange(`${Math.min(Math.max(1, k), LMAX[u])} ${u}${k === 1 ? '' : 's'}`);
  const weeks = unit === 'week' ? n : unit === 'month' ? Math.round(n * 4.35) : n * 52;
  return (
    <View>
      <Label>{label}</Label>
      <Chips>
        {LENGTHS.map((x) => (
          <Chip key={x} small label={x} on={!custom && value === x} onPress={() => (setCustom(false), onChange(x))} />
        ))}
        <Chip small label="Ongoing" on={!custom && value === 'Ongoing'} onPress={() => (setCustom(false), onChange('Ongoing'))} />
        <Chip
          small
          label="Custom"
          on={custom}
          onPress={() => {
            setCustom(true);
            if (!m) put(2, 'month');
          }}
        />
      </Chips>
      {custom ? (
        <View style={{ marginTop: 10, padding: 12, borderRadius: 18, backgroundColor: C.s1, borderWidth: 1, borderColor: C.line, gap: 10 }}>
          <Seg<LUnit>
            items={[
              ['week', 'Weeks'],
              ['month', 'Months'],
              ['year', 'Years'],
            ]}
            value={unit}
            onChange={(u) => put(Math.min(n, LMAX[u]), u)}
          />
          <Stepper testID="len-n" label={`Number of ${unit}s`} value={n} min={1} max={LMAX[unit]} unit={(k) => `${k} ${unit}${k === 1 ? '' : 's'}`} onChange={(k) => put(k, unit)} />
          <Txt s={12} c={C.muted} center>
            {unit === 'week' ? `Runs for ${n} week${n === 1 ? '' : 's'}` : `About ${weeks} weeks`} · tap the number to type it
          </Txt>
        </View>
      ) : value === 'Ongoing' ? (
        <Txt s={12} c={C.muted} style={{ marginTop: 8 }}>
          No end date: it runs until you close it.
        </Txt>
      ) : null}
    </View>
  );
}
type MF = { title: string; field: string; format: '1-to-1' | 'Group'; dur: string; price: 'Free' | 'Paid'; amount: string; seats: number; desc: string; rules: string[]; edit?: string };
export function openMentorForm(editId?: string) {
  const old = editId ? db.MENTORSHIPS.find((x) => x.id === editId && x.mine) : undefined;
  const f: MF = old
    ? { title: old.title, field: old.field, format: old.format, dur: old.dur, price: /^free/i.test(old.price) ? 'Free' : 'Paid', amount: digits(old.price), seats: old.seats, desc: old.desc === 'Details coming soon.' ? '' : old.desc, rules: [...(old.rules || [])], edit: old.id }
    : { title: '', field: '', format: '1-to-1', dur: '1 month', price: 'Free', amount: '', seats: 3, desc: '', rules: ['noDM', 'respect'] };
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
    if (f.edit) updateMentor(f.edit, f);
    else publishMentor(f);
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
          <LengthPicker value={f.dur} onChange={(v) => ((f.dur = v), re())} />
          <View>
            <Label>{f.format === 'Group' ? 'Places in the group' : 'Mentees at a time'}</Label>
            <Stepper testID="mf-seats" label={f.format === 'Group' ? 'Places in the group' : 'Mentees at a time'} value={f.seats} min={1} max={100} unit={(n) => `${n} ${f.format === 'Group' ? (n > 1 ? 'places' : 'place') : n > 1 ? 'mentees' : 'mentee'}`} onChange={(n) => ((f.seats = n), re())} />
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
            <Input multiline maxHeight={300} value={f.desc} onChangeText={(v) => ((f.desc = v), re())} placeholder="e.g. Weekly calls, CV feedback, help with your first applications" />
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
        <Btn testID="mf-next" variant="yellow" style={{ flex: 2 }} title={step < MSTEPS.length - 1 ? 'Continue' : f.edit ? 'Save changes' : 'Publish mentorship'} onPress={next} />
      </View>
    </View>
  );
}


/* ======================= courses ======================= */
export function openCourse(id: string) {
  const c = db.COURSES.find((x) => x.id === id);
  if (!c) return toast('This course is no longer listed');
  // Your own listing: edit it. Any other listing: open the course's website.
  if (c.mine) return router.push(`/list-course?id=${id}` as any);
  openCourseSite(c);
}

/* ======================= career tools ======================= */
export function openCV() {
  sheet.show(() => <CVSheet />, { full: true });
}
function CVSheet() {
  useLive();
  const { width } = useWindowDimensions();
  const pro = !!db.user.pro.regular;
  const [kind, setKind] = useState<CvKind>(tplOf((db.user as any).cvTpl).kind);
  const [id, setId] = useState<string>(tplOf((db.user as any).cvTpl).id);
  const [html, setHtml] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let on = true;
    setHtml(null);
    cvData().then((d) => on && setHtml(cvHtml(id, d)));
    return () => {
      on = false;
    };
  }, [id]);
  const choose = (x: CvTpl) => {
    tap();
    setId(x.id);
    // Free users can preview every design; saving a Pro design asks for Pro.
    if (!x.pro || pro) (db.user as any).cvTpl = x.id;
  };
  const W = width - 40;
  return (
    <View style={{ gap: 12 }}>
      <SheetTitle sub="Built from your profile. Pick a design; your information stays the same in every one.">My CV</SheetTitle>
      <PTabs items={(['Classic', 'Modern'] as CvKind[]).map((k) => [k, k] as [CvKind, string])} value={kind} onChange={(k) => setKind(k)} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -20 }} contentContainerStyle={{ paddingHorizontal: 20, gap: 10 }}>
        {CV_TEMPLATES.filter((x) => x.kind === kind).map((x) => {
          const on = x.id === id;
          return (
            <Pressable key={x.id} testID={`cv-tpl-${x.id}`} accessibilityRole="radio" accessibilityState={{ checked: on }} accessibilityLabel={`${x.name} template${x.pro && !pro ? ', Pro' : ''}`} onPress={() => choose(x)} style={{ width: 118, padding: 8, borderRadius: 16, backgroundColor: on ? 'rgba(61,90,241,.18)' : C.s2, borderWidth: 1.5, borderColor: on ? C.blue : 'transparent' }}>
              <View style={{ height: 120, borderRadius: 8, backgroundColor: x.swatch[0], overflow: 'hidden', flexDirection: x.id === 'slate' ? 'row' : 'column', padding: x.id === 'slate' ? 0 : 8, gap: 5 }}>
                {x.id === 'slate' ? (
                  <>
                    <View style={{ width: '38%', backgroundColor: x.swatch[1] }} />
                    <View style={{ flex: 1, padding: 6, gap: 4 }}>
                      {[70, 90, 60, 85, 50].map((w2, i) => (
                        <View key={i} style={{ width: `${w2}%`, height: 4, borderRadius: 2, backgroundColor: x.swatch[2] }} />
                      ))}
                    </View>
                  </>
                ) : (
                  <>
                    <View style={{ width: x.id === 'centered' ? '70%' : '60%', alignSelf: x.id === 'centered' ? 'center' : 'flex-start', height: 9, borderRadius: 3, backgroundColor: x.swatch[1] }} />
                    {x.id === 'aura' ? <View style={{ position: 'absolute', right: 8, top: 8, width: 28, height: 28, borderRadius: 14, backgroundColor: x.swatch[2] }} /> : null}
                    {x.id === 'accent' ? <View style={{ position: 'absolute', left: 8, top: 4, width: 14, height: 5, backgroundColor: x.swatch[1], transform: [{ skewX: '-30deg' }] }} /> : null}
                    {[90, 70, 95, 60, 80, 50].map((w2, i) => (
                      <View key={i} style={{ width: `${w2}%`, height: 4, borderRadius: 2, backgroundColor: x.swatch[2], opacity: 0.7, alignSelf: x.id === 'centered' ? 'center' : 'flex-start' }} />
                    ))}
                  </>
                )}
              </View>
              <View style={[S.rowB, { marginTop: 6 }]}>
                <Txt s={12} w={8} lines={1}>
                  {x.name}
                </Txt>
                {x.pro ? <ProTag small /> : null}
              </View>
              <Txt s={10} c={C.muted} lines={1}>
                {x.blurb}
              </Txt>
            </Pressable>
          );
        })}
      </ScrollView>
      {/* exact A4 preview: the same page that becomes the PDF */}
      <View testID="cv-preview" style={{ width: W, height: W * 1.414, borderRadius: 12, overflow: 'hidden', backgroundColor: '#fff' }}>
        {html ? (
          <WebView originWhitelist={['*']} source={{ html }} scalesPageToFit setBuiltInZoomControls={false} showsVerticalScrollIndicator={false} style={{ flex: 1, backgroundColor: '#fff' }} nestedScrollEnabled />
        ) : (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <Txt s={13} c="#666">
              Preparing your CV…
            </Txt>
          </View>
        )}
      </View>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Btn variant="dark" icon="edit" title="Edit CV" style={{ flex: 1 }} testID="cv-edit" onPress={() => afterSheet(() => router.push('/cvflow?edit=1' as any))} />
        <Btn
          testID="cv-pdf"
          variant="yellow"
          icon="download"
          title="Save PDF"
          loading={busy}
          style={{ flex: 1 }}
          onPress={async () => {
            if (!html) return;
            setBusy(true);
            try {
              const { uri } = await Print.printToFileAsync({ html, width: 595, height: 842 });
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
      {(() => {
        // only listings that really exist (the picks are refreshed by bolo)
        const courses = cs.map((id) => db.COURSES.find((x) => x.id === id)).filter(Boolean) as typeof db.COURSES;
        const opps = os.map((id) => db.OPPS.find((x) => x.id === id)).filter(Boolean) as typeof db.OPPS;
        return (
          <>
            {courses.length ? <H4 t="Courses" /> : null}
            {courses.map((c) => (
              <ListRow key={c.id} pic={c.prov.logo} square title={c.title} sub={`${c.prov.n} · ${c.price ? xaf(c.price) : 'Free'}`} onPress={() => openCourse(c.id)} />
            ))}
            {opps.length ? <H4 t="Internships & programs" /> : null}
            {opps.map((o) => (
              <ListRow key={o.id} pic={oppBiz(o).logo} square title={o.title} sub={`${o.kind} · ${o.pay}`} onPress={() => openOpp(o.id)} />
            ))}
            {!courses.length ? <Btn variant="ghost" title="Explore courses" style={{ marginTop: 10 }} onPress={() => afterSheet(() => router.push('/courses' as any))} /> : null}
          </>
        );
      })()}
    </View>
  ));
}
export function openExperts() {
  router.push('/experts');
}
