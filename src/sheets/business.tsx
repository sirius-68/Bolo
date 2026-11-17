import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { STAGES } from '../data/catalog';
import { AlertIll, Avatar, Btn, Chip, Chips, Empty, Field, Input, Label, Note, StatusPill, Txt } from '../ui/kit';
import { Icon } from '../ui/Icon';
import { afterSheet, sheet, SheetTitle, toast, confirm } from '../ui/overlay';
import { C, S } from '../ui/theme';
import { P, curBiz, bizName, bizLogo, myVacancies, postById } from '../logic/core';
import { endContract, markSigned, sendContract, ContractDraft } from '../logic/work';
import { openChat } from './chat';
import { openJob } from './work';
import { openBizSetup } from './account';

/* ---------------- company contracts ---------------- */
export function openContract(pid: string, i: number) {
  const b = curBiz();
  if (!b || b.verified !== 'verified') {
    afterSheet(() =>
      sheet.show(() => (
        <View>
          <AlertIll icon="verified" bg={C.lav} />
          <SheetTitle center sub={b?.verified === 'review' ? 'A person at bolo is checking your documents. You’ll get a notification when it’s done.' : 'Company contracts are only for verified businesses. Add your RCCM and NIU, verification usually takes a few minutes.'}>
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
          <StatusPill kind={k.status === 'active' ? 'acc' : k.status === 'ended' ? 'urg' : 'wait'} text={k.status === 'active' ? 'Active' : k.status === 'ended' ? 'Ended' : 'Waiting for reply'} />
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
                {ok ? (j === 0 ? 'Offered by' : 'Accepted by') : 'Waiting for'}
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
      {k.status === 'sent' ? (
        <Btn variant="yellow" icon="checkc" title={`${w.name.split(' ')[0]} accepted: add to team`} style={{ marginTop: 10 }} onPress={() => (markSigned(id), sheet.close())} />
      ) : null}
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


