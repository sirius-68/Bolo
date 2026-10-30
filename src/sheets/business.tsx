import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { db } from '../data/db';
import { CATS, STAGES } from '../data/catalog';
import { AlertIll, Avatar, Btn, Chip, Chips, Empty, Field, Input, Label, Note, StatusPill, Txt } from '../ui/kit';
import { Icon } from '../ui/Icon';
import { afterSheet, sheet, SheetTitle, toast, confirm } from '../ui/overlay';
import { C, S } from '../ui/theme';
import { P, cityLabel, curBiz, bizName, bizLogo, myVacancies, postById, isEmail, isPhone, xaf } from '../logic/core';
import { endContract, sendContract, ContractDraft } from '../logic/work';
import { invite } from '../logic/account';
import { adRate, adTargets, adHead, launchAd } from '../logic/career';
import { openChat } from './chat';
import { openJob } from './work';
import { openBizSetup, openPro } from './account';
import { router } from 'expo-router';

/* ---------------- company contracts ---------------- */
export function openContract(pid: string, i: number) {
  const b = curBiz();
  if (!b || b.verified !== 'verified') {
    afterSheet(() =>
      sheet.show(() => (
        <View>
          <AlertIll icon="verified" bg={C.lav} />
          <SheetTitle center sub={b?.verified === 'review' ? 'We’re checking your documents, usually a few minutes. You’ll get a notification when it’s done.' : 'Company contracts are only for verified businesses. Add your RCCM and NIU, verification usually takes a few minutes.'}>
            {b?.verified === 'review' ? 'Verification in progress' : 'Verify your business first'}
          </SheetTitle>
          {b?.verified !== 'review' ? <Btn variant="yellow" title="Add documents" style={{ marginTop: 16 }} onPress={() => afterSheet(() => openBizSetup('edit', 3))} /> : null}
          <Btn variant="ghost" title="Not now" style={{ marginTop: 10 }} onPress={() => sheet.close()} />
        </View>
      )),
    );
    return;
  }
  const po = postById(pid)!;
  const o = po.offerList![i];
  const d = new Date(Date.now() + 7 * 864e5);
  const c: ContractDraft = {
    pid,
    i,
    person: o.by,
    role: po.title || '',
    pay: (po.budget || '').split(' · ')[0],
    start: d.toISOString().slice(0, 10),
    dur: po.type === 'Contract' ? '6 months' : 'Permanent',
    prob: '3 months',
    hours: po.type === 'Part-time' ? 'Part-time (20 h/week)' : 'Full-time (40 h/week)',
    terms: '',
  };
  afterSheet(() => sheet.show(() => <ContractForm c={c} />, { full: true }));
}
function ContractForm({ c }: { c: ContractDraft }) {
  const [, f] = useState(0);
  const re = () => f((x) => x + 1);
  const w = P(c.person);
  const b = curBiz()!;
  const chips = (label: string, k: 'dur' | 'prob' | 'hours', opts: string[]) => (
    <View>
      <Label>{label}</Label>
      <Chips>
        {opts.map((x) => (
          <Chip key={x} small label={x} on={c[k] === x} onPress={() => ((c[k] = x), re())} />
        ))}
      </Chips>
    </View>
  );
  const dateOk = !isNaN(+new Date(c.start));
  return (
    <View style={{ gap: 14 }}>
      <SheetTitle>Company contract</SheetTitle>
      <View style={[S.row, { gap: 10, padding: 12, borderRadius: 16, backgroundColor: C.s2 }]}>
        <View style={{ flex: 1, alignItems: 'center', gap: 4 }}>
          <Avatar pic={bizLogo(b)} square size={42} />
          <Txt s={11} c={C.muted}>
            Employer
          </Txt>
          <Txt s={13} w={8} lines={1}>
            {bizName(b)}
          </Txt>
        </View>
        <Icon name="arrow" size={20} color={C.muted} />
        <View style={{ flex: 1, alignItems: 'center', gap: 4 }}>
          <Avatar pic={w.photo} size={42} />
          <Txt s={11} c={C.muted}>
            Employee
          </Txt>
          <Txt s={13} w={8} lines={1}>
            {w.name}
          </Txt>
        </View>
      </View>
      <Field label="Job title">
        <Input value={c.role} onChangeText={(v) => ((c.role = v), re())} />
      </Field>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Field label="Pay" style={{ flex: 1 }}>
          <Input value={c.pay} onChangeText={(v) => ((c.pay = v), re())} />
        </Field>
        <Field label="Start date" style={{ flex: 1 }} error={!dateOk && 'Use YYYY-MM-DD'}>
          <Input value={c.start} onChangeText={(v) => ((c.start = v), re())} keyboardType="numbers-and-punctuation" placeholder="YYYY-MM-DD" invalid={!dateOk} />
        </Field>
      </View>
      {chips('Duration', 'dur', ['1 month', '3 months', '6 months', '12 months', 'Permanent'])}
      {chips('Probation', 'prob', ['None', '1 month', '3 months'])}
      {chips('Hours', 'hours', ['Full-time (40 h/week)', 'Part-time (20 h/week)', 'Shifts'])}
      <Field label="Other terms · optional">
        <Input multiline value={c.terms} onChangeText={(v) => ((c.terms = v), re())} maxLength={300} placeholder="e.g. Transport allowance XAF 15k, uniform provided" />
      </Field>
      <Note icon="lock">Both sides sign in the app. The contract follows the Cameroon Labour Code; get legal advice for special cases.</Note>
      <Btn
        variant="yellow"
        icon="send"
        title="Send contract to sign"
        disabled={!c.role.trim() || !c.pay.trim() || !dateOk}
        onPress={() => {
          sendContract(c);
          sheet.close();
        }}
      />
    </View>
  );
}
function contractHtml(id: string) {
  const b = curBiz()!;
  const k = b.contracts.find((x) => x.id === id)!;
  const esc = (s: string) => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const rows: [string, string][] = [
    ['Employer', bizName(b)],
    ['Employee', P(k.person).name],
    ['Job title', k.role],
    ['Pay', k.pay],
    ['Start date', k.start],
    ['Duration', k.dur],
    ['Probation', k.prob],
    ['Hours', k.hours],
    ...(k.terms ? ([['Other terms', k.terms]] as [string, string][]) : []),
  ];
  return `<!doctype html><html><head><meta charset="utf-8"><style>body{font-family:Helvetica,Arial;max-width:680px;margin:32px auto;padding:0 20px;color:#111}h2{margin:0 0 4px}small{color:#666}table{width:100%;border-collapse:collapse;margin-top:18px}td{padding:10px 6px;border-bottom:1px solid #ddd;font-size:14px}td:first-child{color:#666;width:34%}.s{display:flex;gap:20px;margin-top:28px}.s div{flex:1;border-top:2px solid #111;padding-top:6px;font-size:13px}</style></head><body><h2>Employment contract</h2><small>No. ${id.slice(-6)} · ${esc(bizName(b))}</small><table>${rows.map(([a, v]) => `<tr><td>${a}</td><td>${esc(v)}</td></tr>`).join('')}</table><div class="s"><div>Signed by ${esc(bizName(b))}</div><div>${k.status === 'active' ? 'Signed by' : 'Waiting for'} ${esc(P(k.person).name)}</div></div><p style="font-size:11px;color:#888;margin-top:30px">Signed electronically on bolo. Governed by the Cameroon Labour Code.</p></body></html>`;
}
export function viewContract(id: string) {
  sheet.show(() => <ContractView id={id} />);
}
function ContractView({ id }: { id: string }) {
  const [busy, setBusy] = useState(false);
  const b = curBiz();
  const k = b?.contracts.find((x) => x.id === id);
  if (!b || !k) return <Empty title="Contract not found" />;
  const w = P(k.person);
  const rows: [string, string][] = [
    ['Employee', w.name],
    ['Job title', k.role],
    ['Pay', k.pay],
    ['Start date', k.start],
    ['Duration', k.dur],
    ['Probation', k.prob],
    ['Hours', k.hours],
    ...(k.terms ? ([['Other terms', k.terms]] as [string, string][]) : []),
  ];
  return (
    <View>
      <View style={{ backgroundColor: '#fff', borderRadius: 18, padding: 16 }}>
        <View style={[S.row, { gap: 10, borderBottomWidth: 1, borderBottomColor: '#e5e5e5', paddingBottom: 12 }]}>
          <Avatar pic={bizLogo(b)} square size={40} />
          <View style={{ flex: 1 }}>
            <Txt s={15} w={8} c="#111">
              Employment contract
            </Txt>
            <Txt s={12} c="#666">
              {bizName(b)} · No. {id.slice(-6)}
            </Txt>
          </View>
          <StatusPill kind={k.status === 'active' ? 'acc' : k.status === 'ended' ? 'urg' : 'wait'} text={k.status === 'active' ? 'Active' : k.status === 'ended' ? 'Ended' : 'Waiting to sign'} />
        </View>
        {rows.map(([a, v]) => (
          <View key={a} style={{ flexDirection: 'row', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' }}>
            <Txt s={13} c="#666" style={{ width: 110 }}>
              {a}
            </Txt>
            <Txt s={13} w={7} c="#111" style={{ flex: 1 }}>
              {v}
            </Txt>
          </View>
        ))}
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
          {[
            [true, bizName(b)],
            [k.status !== 'sent', w.name],
          ].map(([ok, n], j) => (
            <View key={j} style={[S.row, { flex: 1, gap: 6, padding: 10, borderRadius: 12, backgroundColor: ok ? '#e7f7ee' : '#f4f4f4' }]}>
              <Icon name={ok ? 'check' : 'timer'} size={16} color={ok ? '#1e9e5a' : '#888'} />
              <Txt s={11} c="#333" style={{ flex: 1 }}>
                {ok ? 'Signed by' : 'Waiting for'}
                {'\n'}
                <Txt s={12} w={8} c="#111">
                  {n as string}
                </Txt>
              </Txt>
            </View>
          ))}
        </View>
      </View>
      <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
        <Btn
          variant="dark"
          icon="download"
          title="PDF"
          loading={busy}
          style={{ flex: 1 }}
          onPress={async () => {
            setBusy(true);
            try {
              const { uri } = await Print.printToFileAsync({ html: contractHtml(id) });
              if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf' });
            } catch {
              toast('Couldn’t create the PDF');
            }
            setBusy(false);
          }}
        />
        <Btn variant="dark" icon="chat" title="Message" style={{ flex: 1 }} onPress={() => afterSheet(() => openChat(k.person))} />
      </View>
      {k.status === 'active' ? (
        <Btn
          variant="ghost"
          title="End contract"
          style={{ marginTop: 10 }}
          onPress={() =>
            confirm({
              title: `End ${w.name.split(' ')[0]}’s contract?`,
              text: 'They’ll be removed from your team. You can leave them a review afterwards.',
              ok: 'End contract',
              danger: true,
              icon: 'file',
              onOk: () => endContract(id),
            })
          }
        />
      ) : null}
    </View>
  );
}

/* ---------------- applicants by stage ---------------- */
export function openStage(k: string) {
  sheet.show(() => {
    const L = myVacancies().flatMap((po) => (po.offerList || []).map((o, i) => ({ o, po, i })).filter(({ o }) => (o.stage || 'applied') === k));
    return (
      <View style={{ gap: 8 }}>
        <SheetTitle>
          {STAGES.find((s) => s[0] === k)?.[1]} · {L.length}
        </SheetTitle>
        {L.length ? (
          L.map(({ o, po }) => (
            <Pressable key={po.id + o.by} onPress={() => afterSheet(() => openJob(po.id, k))} style={({ pressed }) => [S.row, { gap: 12, padding: 10, borderRadius: 14, backgroundColor: pressed ? C.s3 : C.s2 }]}>
              <Avatar pic={P(o.by).photo} size={40} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Txt s={14} w={8} lines={1}>
                  {P(o.by).name}
                </Txt>
                <Txt s={12} c={C.muted} lines={1}>
                  {po.title}
                </Txt>
              </View>
              {o.cv ? <StatusPill text="CV" /> : null}
              <Icon name="chev" size={18} color={C.faint} />
            </Pressable>
          ))
        ) : (
          <Empty title="Nobody here yet" text="Move applicants along from a vacancy." />
        )}
      </View>
    );
  });
}

/* ---------------- recruiters ---------------- */
export function openInvite() {
  sheet.show(() => <InviteForm />);
}
function InviteForm() {
  const [n, setN] = useState('');
  const [c, setC] = useState('');
  const [r, setR] = useState('Recruiter');
  const [tried, setTried] = useState(false);
  const cOk = isEmail(c) || isPhone(c);
  return (
    <View style={{ gap: 14 }}>
      <SheetTitle sub={`They can post vacancies and manage applicants for ${bizName(curBiz())}.`}>Invite a recruiter</SheetTitle>
      <Field label="Name" error={tried && !n.trim() && 'Enter their name'}>
        <Input value={n} onChangeText={setN} placeholder="Full name" autoCapitalize="words" invalid={tried && !n.trim()} />
      </Field>
      <Field label="Phone or email" error={tried && !cOk && 'Enter a valid phone or email'}>
        <Input value={c} onChangeText={setC} placeholder="6XX XX XX XX or name@email.cm" autoCapitalize="none" invalid={tried && !cOk} />
      </Field>
      <View>
        <Label>Role</Label>
        <Chips>
          {['Recruiter', 'Admin'].map((x) => (
            <Chip key={x} label={x} on={r === x} onPress={() => setR(x)} />
          ))}
        </Chips>
        <Txt s={12} c={C.muted} style={{ marginTop: 6 }}>
          {r === 'Admin' ? 'Admins can also edit the company page, contracts and payments.' : 'Recruiters manage vacancies and applicants only.'}
        </Txt>
      </View>
      <Btn
        variant="yellow"
        icon="send"
        title="Send invite"
        onPress={() => {
          setTried(true);
          if (!n.trim() || !cOk) return;
          invite(n.trim(), r);
          sheet.close();
        }}
      />
    </View>
  );
}

/* ---------------- ads ---------------- */
type AdDraft = { t: [string, string, string, string]; head: string; text: string; areas: string[]; fields: string[]; reach: number; days: number };
export function openAdCreate() {
  const T = adTargets();
  const a: AdDraft = { t: T[0], head: '', text: '', areas: [curBiz()?.city || cityLabel() || 'Near my business'], fields: [], reach: 1000, days: 7 };
  sheet.show(() => <AdForm a={a} />, { full: true });
}
const REACH = [500, 1000, 2000, 5000, 10000, 20000];
function AdForm({ a }: { a: AdDraft }) {
  const [, f] = useState(0);
  const [busy, setBusy] = useState(false);
  const re = () => f((x) => x + 1);
  const b = curBiz()!;
  const T = adTargets();
  const cost = (a.reach / 100) * adRate();
  const tog = (L: string[], v: string) => {
    const i = L.indexOf(v);
    i >= 0 ? L.splice(i, 1) : L.push(v);
    re();
  };
  return (
    <View style={{ gap: 14 }}>
      <SheetTitle
        sub={
          <Txt s={13} c={C.muted}>
            You pay only for people reached:{' '}
            <Txt s={13} w={8}>
              {xaf(adRate())} per 100 people
            </Txt>
            {db.user.pro.business ? ' · PRO −20%' : ''}
          </Txt>
        }
      >
        Create an ad
      </SheetTitle>
      <View>
        <Label>What do you want to promote?</Label>
        <View style={{ gap: 6 }}>
          {T.map((t) => {
            const on = a.t[1] === t[1];
            return (
              <Pressable key={t[1]} onPress={() => ((a.t = t), re())} style={[S.row, { gap: 10, padding: 12, borderRadius: 14, backgroundColor: on ? 'rgba(61,90,241,.18)' : C.s2, borderWidth: 1, borderColor: on ? C.blue : 'transparent' }]}>
                <View style={{ flex: 1 }}>
                  <Txt s={14} w={8} lines={1}>
                    {t[2]}
                  </Txt>
                  <Txt s={12} c={C.muted}>
                    {t[3]}
                  </Txt>
                </View>
                {on ? <Icon name="checkc" size={20} color={C.yellow} /> : null}
              </Pressable>
            );
          })}
        </View>
        {!myVacancies().length ? (
          <Txt s={12} c={C.muted} style={{ marginTop: 6 }}>
            Tip: post a vacancy or program first to promote it directly.
          </Txt>
        ) : null}
      </View>
      <Field label="Headline">
        <Input value={a.head} onChangeText={(v) => ((a.head = v), re())} maxLength={60} placeholder={adHead(a.t)} />
      </Field>
      <Field label="Text">
        <Input multiline value={a.text} onChangeText={(v) => ((a.text = v), re())} maxLength={150} placeholder="One or two lines that make people tap" />
      </Field>
      <View>
        <Label>Preview</Label>
        <View style={{ padding: 14, borderRadius: 16, backgroundColor: C.s1, borderWidth: 1, borderColor: C.line, gap: 6 }}>
          <View style={[S.row, { gap: 8 }]}>
            <Avatar pic={bizLogo(b)} square size={30} />
            <View>
              <Txt s={13} w={8}>
                {bizName(b)}
              </Txt>
              <Txt s={11} c={C.muted}>
                Sponsored
              </Txt>
            </View>
          </View>
          <Txt s={15} w={8}>
            {a.head || adHead(a.t)}
          </Txt>
          <Txt s={13} c="#d9d9de">
            {a.text || 'Tap to see details and apply on bolo.'}
          </Txt>
          <View style={{ alignSelf: 'flex-start', paddingHorizontal: 14, height: 32, borderRadius: 999, backgroundColor: C.yellow, justifyContent: 'center' }}>
            <Txt s={12} w={8} c="#000">
              {a.t[0] === 'page' ? 'Visit page' : a.t[0] === 'course' ? 'Enroll' : 'Apply now'}
            </Txt>
          </View>
        </View>
      </View>
      <View>
        <Label>Where</Label>
        <Chips>
          {[curBiz()?.city || cityLabel() || 'Near my business', 'Within 25 km', 'Within 100 km', 'Whole country'].map((c) => (
            <Chip key={c} small label={c} on={a.areas.includes(c)} onPress={() => tog(a.areas, c)} />
          ))}
        </Chips>
      </View>
      <View>
        <Label>Who · leave empty to reach everyone</Label>
        <Chips>
          {CATS.slice(0, 14).map(([c]) => (
            <Chip key={c} small label={c} on={a.fields.includes(c)} onPress={() => tog(a.fields, c)} />
          ))}
        </Chips>
      </View>
      <View>
        <Label right={<Txt s={14} w={8}>{a.reach.toLocaleString('en')}</Txt>}>People to reach</Label>
        <Chips>
          {REACH.map((r) => (
            <Chip key={r} small label={r.toLocaleString('en')} on={a.reach === r} onPress={() => ((a.reach = r), re())} />
          ))}
        </Chips>
        <Txt s={12} c={C.muted} style={{ marginTop: 6 }}>
          ≈ {Math.round(a.reach * 0.07)} clicks · {Math.max(1, Math.round(a.reach * 0.008))} applicants (estimate)
        </Txt>
      </View>
      <View>
        <Label>Run for</Label>
        <Chips>
          {[3, 7, 14, 30].map((d) => (
            <Chip key={d} small label={`${d} days`} on={a.days === d} onPress={() => ((a.days = d), re())} />
          ))}
        </Chips>
      </View>
      <View style={[S.row, { gap: 10, padding: 12, borderRadius: 14, backgroundColor: C.s2 }]}>
        <Icon name="coins" size={18} color={C.yellow} />
        <Txt s={13} style={{ flex: 1 }}>
          Total{' '}
          <Txt s={13} w={8}>
            {xaf(cost)}
          </Txt>{' '}
          · MTN MoMo or Orange Money · unused reach is refunded
        </Txt>
      </View>
      <Btn
        variant="yellow"
        loading={busy}
        title={busy ? 'Waiting for Mobile Money approval…' : `Pay ${xaf(cost)} & launch`}
        disabled={!a.areas.length}
        onPress={() => {
          setBusy(true);
          setTimeout(() => {
            launchAd({ t: a.t, head: a.head || adHead(a.t), text: a.text, areas: a.areas, fields: a.fields, reach: a.reach, days: a.days });
            sheet.close();
            router.push('/ads');
          }, 1300);
        }}
      />
      {!a.areas.length ? (
        <Txt s={12} c={C.err} center>
          Choose at least one place
        </Txt>
      ) : null}
    </View>
  );
}
export { openPro };
