import React, { useState } from 'react';
import { Pressable, Share, View } from 'react-native';
import { db, Post, CvFile } from '../data/db';
import { RV_TAGS_C, RV_TAGS_W, SERVICES, STAGES, STAGE_COL, catIcon } from '../data/catalog';
import { AlertIll, Avatar, Btn, Check, Chip, Chips, CoTag, Empty, Field, Input, Label, Meta, Note, Pict, Pill, ProTag, Rate, StatusPill, Txt, Verified, tap } from '../ui/kit';
import { Icon } from '../ui/Icon';
import { afterSheet, sheet, SheetTitle, toast } from '../ui/overlay';
import { C, R, S, tx } from '../ui/theme';
import { P, isW, me, curBiz, bizName, bizLogo, first, myName, myPhoto, mySkill, postById, digits, fname, myCity } from '../logic/core';
import {
  acceptOffer, applyVac, bk, closeJob, confirmDone, declineApp, reportIssue, sendHireRequest, sendOffer, setStage, stageLabel, submitReview, withdrawApplication, withdrawOffer, hireState, trOther,
} from '../logic/work';
import { openProfile, openTrack } from '../logic/nav';
import { pickDocument } from '../logic/media';
import { MyCV, PersonCV } from '../components/cv';
import { openChat } from './chat';
import { openContract } from './business';
import { openPro } from './account';

/* ====================================================================== */
/* Job / vacancy sheet                                                    */
/* ====================================================================== */
export function openJob(id: string, stage?: string) {
  sheet.show(() => <JobSheet id={id} initialStage={stage} />, { tag: 'job:' + id, full: true });
}

function Facts({ items }: { items: [string, string | undefined][] }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 12 }}>
      {items
        .filter((x) => x[1])
        .map(([i, t]) => (
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

function JobSheet({ id, initialStage }: { id: string; initialStage?: string }) {
  const po = postById(id);
  if (!po) return <Empty title="This job is no longer available" text="It may have been closed or filled." />;
  const mine = !!po.mine;
  const c = mine ? me() : P(po.client!);
  const head = mine ? (po.as === 'business' ? bizName(curBiz()) : 'Your job') : c.name;
  return (
    <View>
      <View style={[S.row, { gap: 12 }]}>
        <Pressable disabled={mine} onPress={() => afterSheet(() => openProfile(po.client!))}>
          <Avatar pic={c.photo} size={46} square={!!c.biz} />
        </Pressable>
        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={S.row}>
            <Txt s={15} w={8} lines={1} style={{ flexShrink: 1 }}>
              {head}
            </Txt>
            {c.biz && c.verified ? <Verified /> : null}
            {c.biz && !mine ? <CoTag /> : null}
          </View>
          <Meta parts={[po.area, po.time]} />
        </View>
        {po.urgent ? <StatusPill kind="urg" text="Urgent" /> : null}
      </View>
      <View style={[S.row, { gap: 6, alignSelf: 'flex-start', marginTop: 16, height: 26, paddingHorizontal: 10, borderRadius: 999, backgroundColor: 'rgba(246,238,92,.14)' }]}>
        <Icon name={catIcon(po.cat)} size={14} color={C.yellow} />
        <Txt s={12} w={8} c={C.yellow}>
          {po.cat}
          {po.biz ? ` · ${po.type}` : ''}
        </Txt>
      </View>
      <Txt s={22} w={8} style={{ marginTop: 10, lineHeight: 26 }}>
        {po.title}
      </Txt>
      <Txt s={14} c="#d9d9de" style={{ marginTop: 6 }}>
        {po.text}
      </Txt>
      {(po.photos || []).length ? (
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
          {po.photos!.map((s) => (
            <Pict key={s} pic={s} style={{ flex: 1, aspectRatio: 1, borderRadius: 12 }} />
          ))}
        </View>
      ) : null}
      <Facts
        items={[
          ['money', po.budget],
          ['clock', po.when],
          ['pin', po.area],
          ...(po.biz || po.as === 'business' ? ([['follow', `${po.openings || 1} opening${(po.openings || 1) > 1 ? 's' : ''}`]] as [string, string][]) : []),
          ...(!po.biz && po.type ? ([['job', po.type]] as [string, string][]) : []),
        ]}
      />
      <View style={{ height: 8 }} />
      {mine && po.as === 'business' ? (
        <Applicants po={po} initialStage={initialStage} />
      ) : mine ? (
        <MyJobOffers po={po} />
      ) : !isW() ? (
        <View style={{ marginTop: 16, gap: 10 }}>
          <Note icon="storefront">{po.biz ? 'You’re viewing this as a business. Switch to your Regular profile to apply for roles.' : 'Personal jobs are for Regular profiles. Switch to your Regular profile to send an offer.'}</Note>
          <Btn variant="dark" icon="chat" title={`Message ${fname(c.name)}`} onPress={() => afterSheet(() => openChat(po.client!))} />
        </View>
      ) : po.biz ? (
        <ApplyForm po={po} />
      ) : (
        <OfferForm po={po} />
      )}
    </View>
  );
}

/* ---------- my personal job: offers ---------- */
function MyJobOffers({ po }: { po: Post }) {
  const L = po.offerList || [];
  const b = po.booked ? db.BOOKINGS.find((x) => x.worker === po.booked && x.title === po.title) : null;
  return (
    <View style={{ marginTop: 16 }}>
      <SecH title={po.booked ? 'Booked' : 'Offers'} n={L.length} />
      {L.length ? (
        <View style={{ gap: 10 }}>
          {L.map((o, i) => {
            const w = P(o.by);
            const isBooked = po.booked === o.by;
            return (
              <View key={o.by} style={{ flexDirection: 'row', gap: 12, padding: 12, borderRadius: 18, backgroundColor: C.s2, opacity: po.booked && !isBooked ? 0.45 : 1 }}>
                <Pressable onPress={() => afterSheet(() => openProfile(o.by))}>
                  <Avatar pic={w.photo} size={44} />
                </Pressable>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <View style={S.row}>
                    <Txt s={14} w={8} lines={1} style={{ flexShrink: 1 }}>
                      {w.name}
                    </Txt>
                    {w.verified ? <Verified /> : null}
                  </View>
                  <Meta parts={[<Rate key="r" r={w.rate} />, w.dist]} />
                  <Txt s={13} c="#d9d9de" style={{ marginTop: 4 }}>
                    {o.msg}
                  </Txt>
                  <Txt s={12} c={C.muted} style={{ marginTop: 4 }}>
                    🕑 {o.when}
                  </Txt>
                  <CvChip o={o} />
                </View>
                <View style={{ alignItems: 'flex-end', gap: 8 }}>
                  <Txt s={14} w={8} c={C.yellow}>
                    {o.price}
                  </Txt>
                  {isBooked ? <StatusPill kind="acc" text="Hired" /> : po.booked ? null : <Pill title="Accept" onPress={() => acceptOffer(po.id, i)} />}
                  <Pill kind="dim" title="Chat" onPress={() => afterSheet(() => openChat(o.by))} />
                </View>
              </View>
            );
          })}
        </View>
      ) : (
        <Empty title="Waiting for offers" text={`People near ${po.area} have been notified. Offers usually arrive within minutes.`} />
      )}
      {b ? <Btn variant="yellow" icon="nav" title="Track the job" style={{ marginTop: 14 }} onPress={() => afterSheet(() => openTrack(b.id))} /> : null}
      {!po.booked ? <Btn variant="ghost" title="Close this job" style={{ marginTop: 14 }} onPress={() => (closeJob(po.id), sheet.close())} /> : null}
    </View>
  );
}

/* ---------- my vacancy: applicant pipeline ---------- */
function Applicants({ po, initialStage }: { po: Post; initialStage?: string }) {
  const [f, setF] = useState(initialStage || 'all');
  const L = po.offerList || [];
  L.forEach((o) => (o.stage = o.stage || 'applied'));
  const cnt = (k: string) => L.filter((o) => o.stage === k).length;
  const list = L.map((o, i) => [o, i] as const).filter(([o]) => f === 'all' || o.stage === f);
  return (
    <View style={{ marginTop: 16 }}>
      <SecH title="Applicants" n={L.length} />
      <Chips scroll>
        <Chip small label={`All ${L.length}`} on={f === 'all'} onPress={() => setF('all')} />
        {STAGES.map(([k, l]) => (
          <Chip key={k} small label={`${l} ${cnt(k)}`} on={f === k} onPress={() => setF(k)} />
        ))}
      </Chips>
      <View style={{ gap: 10, marginTop: 12 }}>
        {list.length ? (
          list.map(([o, i]) => {
            const w = P(o.by);
            return (
              <View key={o.by} style={{ padding: 12, borderRadius: 18, backgroundColor: C.s2, gap: 8 }}>
                <View style={[S.row, { gap: 12 }]}>
                  <Pressable onPress={() => afterSheet(() => openProfile(o.by))}>
                    <Avatar pic={w.photo} size={44} />
                  </Pressable>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <View style={S.row}>
                      <Txt s={14} w={8} lines={1} style={{ flexShrink: 1 }}>
                        {w.name}
                      </Txt>
                      {w.verified ? <Verified /> : null}
                    </View>
                    <Meta parts={[w.role, <Rate key="r" r={w.rate} />, `${w.years} yrs`]} />
                  </View>
                  <View style={{ paddingHorizontal: 8, height: 22, borderRadius: 999, backgroundColor: STAGE_COL[o.stage!] + '33', justifyContent: 'center' }}>
                    <Txt s={10} w={8} c={STAGE_COL[o.stage!]}>
                      {stageLabel(o.stage!)}
                    </Txt>
                  </View>
                </View>
                <Txt s={13} c="#d9d9de">
                  {o.msg}
                </Txt>
                <CvChip o={o} />
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {o.stage === 'applied' ? (
                    <>
                      <Pill title="Shortlist" onPress={() => setStage(po.id, i, 'short')} />
                      <Pill kind="outline" title="Decline" onPress={() => declineApp(po.id, i)} />
                    </>
                  ) : o.stage === 'short' ? (
                    <Pill title="Invite to interview" onPress={() => setStage(po.id, i, 'interview')} />
                  ) : o.stage === 'interview' ? (
                    <Pill icon="file" title="Offer a contract" onPress={() => openContract(po.id, i)} />
                  ) : o.stage === 'offer' ? (
                    <StatusPill text="Waiting for signature" />
                  ) : (
                    <StatusPill kind="acc" text="Hired · on your team" />
                  )}
                  <Pill kind="dim" title="Chat" onPress={() => afterSheet(() => openChat(o.by))} />
                </View>
              </View>
            );
          })
        ) : (
          <Empty title={L.length ? 'Nobody at this stage' : 'Waiting for applicants'} text={L.length ? 'Move people along from the other tabs.' : 'Matching people near you are being notified.'} />
        )}
      </View>
      <Btn variant="ghost" title="Close vacancy" style={{ marginTop: 14 }} onPress={() => (closeJob(po.id), sheet.close())} />
    </View>
  );
}

/* ---------- CV attached to an offer/application ---------- */
function CvChip({ o }: { o: { by: string; price?: string; cv?: CvFile | null } }) {
  if (o.cv === undefined) o.cv = (o.by.length + (o.price || '').length) % 3 !== 0 ? { name: `${P(o.by).name.replace(/[^A-Za-z]+/g, '_').replace(/_$/, '')}_CV.pdf`, kb: 120 + ((o.by.length * 37) % 260) } : null;
  if (!o.cv) return <Txt s={12} c={C.faint} style={{ marginTop: 4 }}>No CV attached</Txt>;
  const cv = o.cv;
  return (
    <Pressable onPress={() => viewCV(o.by, cv)} style={[S.row, { gap: 8, alignSelf: 'flex-start', marginTop: 6, height: 30, paddingHorizontal: 10, borderRadius: 10, backgroundColor: C.s3 }]}>
      <Icon name="file" size={14} color={C.lav} />
      <Txt s={12} w={7} lines={1} style={{ maxWidth: 170 }}>
        {cv.name}
      </Txt>
      <Txt s={11} c={C.muted}>
        {cv.kb} KB
      </Txt>
    </Pressable>
  );
}
export function viewCV(id: string, cv: CvFile) {
  const self = id === 'me';
  sheet.show(() => (
    <View style={{ gap: 12 }}>
      <SheetTitle>{self ? 'Your CV' : `${fname(P(id).name)}’s CV`}</SheetTitle>
      <View style={[S.row, { gap: 12, padding: 12, borderRadius: 14, backgroundColor: C.s2 }]}>
        <View style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: C.err, alignItems: 'center', justifyContent: 'center' }}>
          <Txt s={10} w={8}>
            PDF
          </Txt>
        </View>
        <View style={{ flex: 1 }}>
          <Txt s={14} w={8} lines={1}>
            {cv.name}
          </Txt>
          <Txt s={12} c={C.muted}>
            {cv.kb} KB · attached to {self ? 'your application' : 'their application'}
          </Txt>
        </View>
      </View>
      {self ? <MyCV /> : <PersonCV id={id} />}
      {!self ? <Btn variant="yellow" icon="chat" title={`Message ${fname(P(id).name)}`} onPress={() => afterSheet(() => openChat(id))} /> : null}
    </View>
  ));
}

/* ---------- CV picker (optional) ---------- */
type CvMode = 'profile' | 'upload' | 'none';
function CvPicker({ mode, setMode, file, setFile }: { mode: CvMode; setMode: (m: CvMode) => void; file: CvFile | null; setFile: (f: CvFile | null) => void }) {
  return (
    <View>
      <Label>Attach a CV · optional</Label>
      <Chips>
        {(
          [
            ['profile', 'My bolo CV'],
            ['upload', 'Upload a file'],
            ['none', 'No CV'],
          ] as [CvMode, string][]
        ).map(([m, l]) => (
          <Chip key={m} small label={l} on={mode === m} onPress={() => setMode(m)} />
        ))}
      </Chips>
      {mode === 'upload' ? (
        <Pressable
          onPress={async () => {
            const d = await pickDocument();
            if (d) setFile({ name: d.name, kb: Math.max(1, Math.round(d.size / 1024)) });
          }}
          style={[S.row, { gap: 10, marginTop: 10, height: 50, paddingHorizontal: 14, borderRadius: R.md, borderWidth: 1.5, borderStyle: 'dashed', borderColor: C.s3 }]}
        >
          <Icon name="upload" size={18} color={C.muted} />
          <Txt s={13} w={6} c={file ? C.text : C.muted} lines={1}>
            {file ? file.name : 'Choose a PDF or Word file'}
          </Txt>
        </Pressable>
      ) : null}
    </View>
  );
}
const cvFor = (mode: CvMode, file: CvFile | null): CvFile | null => (mode === 'none' ? null : mode === 'upload' ? file : { name: `${myName().replace(/[^A-Za-z]+/g, '_').replace(/_$/, '')}_CV.pdf`, kb: 96, src: 'profile' });

/* ---------- send an offer on a personal job ---------- */
function OfferForm({ po }: { po: Post }) {
  const off = db.myOffers[po.id];
  const c = P(po.client!);
  const f = fname(c.name);
  const guess = ((po.budget!.match(/[\d.,]+k?/) || [''])[0] as string).replace('k', '000').replace(/[^\d]/g, '');
  const [price, setPrice] = useState(guess);
  const [when, setWhen] = useState('Tomorrow');
  const [msg, setMsg] = useState(`Hi ${f}! I’m a ${mySkill().toLowerCase()} with ${db.user.years} years of experience near ${po.area}. I can take care of this.`);
  const [mode, setMode] = useState<CvMode>('profile');
  const [file, setFile] = useState<CvFile | null>(null);
  if (off)
    return (
      <View style={{ marginTop: 16, gap: 10 }}>
        <View style={{ padding: 14, borderRadius: 16, backgroundColor: off.state === 'acc' ? 'rgba(47,179,109,.14)' : C.s2, gap: 4 }}>
          <View style={[S.row, { gap: 6 }]}>
            <Icon name={off.state === 'acc' ? 'check' : 'clock'} size={16} color={off.state === 'acc' ? C.mint : C.muted} />
            <Txt s={13} w={7} c={off.state === 'acc' ? C.mint : C.muted}>
              {off.state === 'acc' ? 'Offer accepted — job booked' : `Offer sent · waiting for ${f}`}
            </Txt>
          </View>
          <Txt s={15} w={8}>
            {off.price} · {off.when}
          </Txt>
        </View>
        <Btn icon="chat" title={`Message ${f}`} onPress={() => afterSheet(() => openChat(po.client!))} />
        {off.state === 'acc' ? (
          (() => {
            const b = db.BOOKINGS.find((x) => x.worker === 'me' && x.client === po.client && x.title === po.title);
            return b ? <Btn variant="yellow" icon="nav" title="Go to the job" onPress={() => afterSheet(() => openTrack(b.id))} /> : null;
          })()
        ) : (
          <Btn variant="ghost" title="Withdraw offer" onPress={() => withdrawOffer(po.id)} />
        )}
      </View>
    );
  const ok = +price > 0;
  return (
    <View style={{ marginTop: 16, gap: 14 }}>
      <SecH title="Send an offer" />
      <Field label="Your price">
        <Input value={price} onChangeText={(v) => setPrice(digits(v))} prefix="XAF" keyboardType="number-pad" placeholder="e.g. 12,000" />
      </Field>
      <View>
        <Label>When can you do it?</Label>
        <Chips>
          {['Today', 'Tomorrow', 'This week'].map((w) => (
            <Chip key={w} small label={w} on={when === w} onPress={() => setWhen(w)} />
          ))}
        </Chips>
      </View>
      <Field label={`Message to ${f}`}>
        <Input multiline value={msg} onChangeText={setMsg} maxLength={240} />
      </Field>
      <CvPicker mode={mode} setMode={setMode} file={file} setFile={setFile} />
      <Btn testID="send-offer" variant="yellow" title="Send offer" disabled={!ok} onPress={() => sendOffer(po.id, price, when, msg.trim(), cvFor(mode, file))} />
    </View>
  );
}

/* ---------- apply to a vacancy ---------- */
function ApplyForm({ po }: { po: Post }) {
  const off = db.myOffers[po.id];
  const c = P(po.client!);
  const [msg, setMsg] = useState(`Hello ${c.name} team, I’m interested in the ${po.title} role. I have ${db.user.years} years of experience as ${((db.user.skillList && db.user.skillList[0]?.n) || mySkill()).toLowerCase()}.`);
  const [mode, setMode] = useState<CvMode>('profile');
  const [file, setFile] = useState<CvFile | null>(null);
  if (off)
    return (
      <View style={{ marginTop: 16, gap: 10 }}>
        <View style={{ padding: 14, borderRadius: 16, backgroundColor: off.state === 'acc' ? 'rgba(47,179,109,.14)' : C.s2, gap: 4 }}>
          <View style={[S.row, { gap: 6 }]}>
            <Icon name={off.state === 'acc' ? 'check' : 'clock'} size={16} color={off.state === 'acc' ? C.mint : C.muted} />
            <Txt s={13} w={7} c={off.state === 'acc' ? C.mint : C.muted}>
              {off.stage || 'Application sent'}
            </Txt>
          </View>
          <Txt s={15} w={8}>
            {po.type} · {po.budget}
          </Txt>
        </View>
        {off.cv ? (
          <Pressable onPress={() => viewCV('me', off.cv!)} style={[S.row, { gap: 8, alignSelf: 'flex-start', height: 30, paddingHorizontal: 10, borderRadius: 10, backgroundColor: C.s3 }]}>
            <Icon name="file" size={14} color={C.lav} />
            <Txt s={12} w={7}>
              {off.cv.name}
            </Txt>
            <Txt s={11} c={C.muted}>
              sent
            </Txt>
          </Pressable>
        ) : null}
        <Btn icon="chat" title={`Message ${c.name}`} onPress={() => afterSheet(() => openChat(po.client!))} />
        <Btn variant="ghost" title="Withdraw application" onPress={() => withdrawApplication(po.id)} />
      </View>
    );
  return (
    <View style={{ marginTop: 16, gap: 14 }}>
      <SecH title={`Apply to ${c.name}`} />
      <Field label="Short message">
        <Input multiline value={msg} onChangeText={setMsg} maxLength={400} />
      </Field>
      <CvPicker mode={mode} setMode={setMode} file={file} setFile={setFile} />
      {db.user.pro.regular ? (
        <Note icon="rocket" color={C.yellow}>
          Priority application — you’ll show at the top of {c.name}’s list.
        </Note>
      ) : (
        <Pressable onPress={() => openPro('regular', 'priority')} style={[S.row, { gap: 10, padding: 12, borderRadius: 14, backgroundColor: 'rgba(246,238,92,.1)' }]}>
          <Icon name="rocket" size={18} color={C.yellow} />
          <Txt s={13} w={6} style={{ flex: 1 }}>
            Get to the top of the list with <Txt s={13} w={8}>Pro</Txt>
          </Txt>
          <Icon name="chev" size={16} color={C.muted} />
        </Pressable>
      )}
      <Btn testID="send-application" variant="yellow" title="Send application" disabled={!msg.trim()} onPress={() => applyVac(po.id, msg.trim(), cvFor(mode, file))} />
    </View>
  );
}

function SecH({ title, n }: { title: string; n?: number }) {
  return (
    <View style={[S.row, { gap: 8, marginBottom: 10 }]}>
      <Txt s={16} w={8}>
        {title}
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
}

/* ====================================================================== */
/* Hire someone directly                                                  */
/* ====================================================================== */
export function openHire(id: string, preset?: { when?: string }) {
  sheet.show(() => <HireSheet id={id} preset={preset} />, { tag: 'hire:' + id });
}
function HireSheet({ id, preset }: { id: string; preset?: { when?: string } }) {
  const p = P(id);
  const f = fname(p.name);
  const svcs = SERVICES[p.role] || SERVICES.Plumber;
  const [svc, setSvc] = useState(0);
  const [title, setTitle] = useState(svcs[0][0]);
  const guess = (s: string) => ((s.match(/[\d.,]+k?/) || [''])[0] as string).replace(/k$/, '000').replace(/[^\d]/g, '');
  const [price, setPrice] = useState(guess(svcs[0][1]));
  const [when, setWhen] = useState(preset?.when || 'Tomorrow, 10:00');
  const st = hireState(id);
  if (st !== 'none') {
    const b = db.BOOKINGS.find((x) => x.worker === id && x.client === 'me' && x.state !== 'confirmed');
    return (
      <View style={{ gap: 12 }}>
        <View style={[S.row, { gap: 12 }]}>
          <Avatar pic={p.photo} size={52} />
          <View style={{ flex: 1 }}>
            <Txt s={17} w={8}>
              {p.name}
            </Txt>
            <Txt s={13} c={C.muted}>
              {st === 'booked' ? 'Booked — you can follow the job live' : 'Request sent — waiting for an answer'}
            </Txt>
          </View>
        </View>
        {b ? <Btn variant="yellow" icon="nav" title="Track the job" onPress={() => afterSheet(() => openTrack(b.id))} /> : null}
        <Btn icon="chat" title={`Open chat with ${f}`} onPress={() => afterSheet(() => openChat(id))} />
      </View>
    );
  }
  return (
    <View style={{ gap: 14 }}>
      <View style={[S.row, { gap: 12 }]}>
        <Avatar pic={p.photo} size={52} />
        <View style={{ flex: 1 }}>
          <SheetTitle>Hire {f}</SheetTitle>
          <Meta parts={[p.role, <Rate key="r" r={p.rate} />, p.dist]} />
        </View>
      </View>
      <View>
        <Label>What do you need?</Label>
        <View style={{ gap: 8 }}>
          {svcs.map(([n, pr], i) => (
            <Pressable
              key={n}
              onPress={() => {
                tap();
                setSvc(i);
                setTitle(n);
                setPrice(guess(pr));
              }}
              style={[S.row, { gap: 10, padding: 12, borderRadius: 14, backgroundColor: svc === i ? 'rgba(61,90,241,.2)' : C.s2, borderWidth: 1.5, borderColor: svc === i ? C.blue : 'transparent' }]}
            >
              <View style={{ flex: 1 }}>
                <Txt s={14} w={7}>
                  {n}
                </Txt>
                <Txt s={12} c={C.muted}>
                  {pr}
                </Txt>
              </View>
              {svc === i ? <Icon name="checkc" size={20} color={C.lav} /> : null}
            </Pressable>
          ))}
        </View>
      </View>
      <Field label="Describe the job">
        <Input value={title} onChangeText={setTitle} icon="job" maxLength={60} />
      </Field>
      <View>
        <Label>When</Label>
        <Chips>
          {[preset?.when, 'Today, 15:00', 'Tomorrow, 10:00', 'This week']
            .filter((x, i, a) => x && a.indexOf(x) === i)
            .map((w) => (
              <Chip key={w} small label={w!} on={when === w} onPress={() => setWhen(w!)} />
            ))}
        </Chips>
      </View>
      <Field label="Your price" hint={`${f} can accept it or reply with their own quote.`}>
        <Input value={price} onChangeText={(v) => setPrice(digits(v))} prefix="XAF" keyboardType="number-pad" placeholder="e.g. 15,000" />
      </Field>
      <Btn
        testID="send-hire"
        variant="yellow"
        title={`Send request to ${f}`}
        disabled={!title.trim() || !(+price > 0)}
        onPress={() => {
          sendHireRequest(id, title.trim(), `XAF ${(+price).toLocaleString('en-US')}`, when);
          afterSheet(() => openChat(id), 250);
        }}
      />
    </View>
  );
}

/* ====================================================================== */
/* Job done → confirm & pay                                               */
/* ====================================================================== */
export function showDoneAlert(id: string) {
  const b = bk(id);
  if (!b || b.state !== 'done') return;
  sheet.show(() => <DoneAlert id={id} />, { tag: 'done:' + id });
}
function DoneAlert({ id }: { id: string }) {
  const b = bk(id);
  if (!b) return null;
  const f = fname(P(b.worker).name);
  return (
    <View style={{ gap: 10 }}>
      <AlertIll icon="flag" bg={C.ok} color="#fff" />
      <SheetTitle center sub={`Is everything okay with “${b.title}”? Confirming releases ${b.price} to ${f}.`}>
        {f} says the job is done
      </SheetTitle>
      <Btn
        variant="yellow"
        title="Yes, confirm & pay"
        style={{ marginTop: 8 }}
        onPress={() => {
          if (confirmDone(id)) afterSheet(() => openReview(b.worker, b.id), 500);
        }}
      />
      <Btn
        variant="ghost"
        title="Not yet — something’s wrong"
        onPress={() => {
          reportIssue(id);
          sheet.close();
        }}
      />
      <Pressable style={{ alignSelf: 'center', padding: 8 }} onPress={() => afterSheet(() => openTrack(id))}>
        <Txt s={13} w={7} c={C.lav}>
          View job
        </Txt>
      </Pressable>
    </View>
  );
}

/* ====================================================================== */
/* Reviews                                                                */
/* ====================================================================== */
export function openReview(target: string, bid: string | null) {
  sheet.show(() => <ReviewSheet target={target} bid={bid} />, { tag: 'review' });
}
function ReviewSheet({ target, bid }: { target: string; bid: string | null }) {
  const p = P(target);
  const b = bid ? bk(bid) : null;
  const [stars, setStars] = useState(0);
  const [tags, setTags] = useState<string[]>([]);
  const [text, setText] = useState('');
  const T = p.client ? RV_TAGS_C : RV_TAGS_W;
  return (
    <View style={{ gap: 12 }}>
      <View style={{ alignItems: 'center' }}>
        <Avatar pic={p.photo} size={64} square={!!p.biz} />
        <Txt s={20} w={8} style={{ marginTop: 10 }}>
          How was {fname(p.name)}?
        </Txt>
        <Txt s={13} c={C.muted}>
          {b ? b.title : 'Share your experience'}
        </Txt>
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6 }}>
        {[1, 2, 3, 4, 5].map((n) => (
          <Pressable key={n} accessibilityLabel={`${n} star${n > 1 ? 's' : ''}`} hitSlop={4} onPress={() => (tap(), setStars(n))}>
            <Icon name="star" size={38} color={n <= stars ? C.yellow : C.s3} />
          </Pressable>
        ))}
      </View>
      <Txt s={13} w={7} c={stars ? C.yellow : C.muted} center>
        {['Tap a star to rate', 'Poor', 'Fair', 'Good', 'Very good', 'Excellent!'][stars]}
      </Txt>
      <Chips style={{ justifyContent: 'center' }}>
        {T.map((t) => (
          <Chip key={t} small label={t} on={tags.includes(t)} onPress={() => setTags(tags.includes(t) ? tags.filter((x) => x !== t) : [...tags, t])} />
        ))}
      </Chips>
      <Field label="Your review · optional">
        <Input multiline value={text} onChangeText={setText} maxLength={300} placeholder="What went well? Anything others should know?" />
      </Field>
      <Btn
        variant="yellow"
        title="Post review"
        disabled={!stars}
        onPress={() => {
          submitReview(target, bid, stars, tags, text.trim());
          sheet.close();
        }}
      />
    </View>
  );
}

/* ====================================================================== */
/* Comments, media, sharing                                               */
/* ====================================================================== */
const SAMPLE_CMT: [string, string, string, string][] = [
  ['faces/cl_ama', 'Ama K.', 'Great work, booking you next week!', '2m'],
  ['faces/cl_marie', 'Marie T.', 'How long did it take?', '10m'],
  ['faces/cl_pauln', 'Paul N.', 'Clean job 👏', '1h'],
];
const extra: Record<string, [string, string, string, string][]> = {};
export function openComments(id: string) {
  sheet.show(() => <Comments id={id} />, { tag: 'cmt:' + id });
}
function Comments({ id }: { id: string }) {
  const [v, setV] = useState('');
  const [, setN] = useState(0);
  const L = [...SAMPLE_CMT, ...(extra[id] || [])];
  const send = () => {
    const t = v.trim();
    if (!t) return;
    (extra[id] = extra[id] || []).push([myPhoto(), myName(), t, 'now']);
    setV('');
    setN((x) => x + 1);
  };
  return (
    <View style={{ gap: 14 }}>
      <SheetTitle>Comments</SheetTitle>
      {L.map(([ph, n, t, w], i) => (
        <View key={i} style={{ flexDirection: 'row', gap: 10 }}>
          <Avatar pic={ph} size={36} />
          <View style={{ flex: 1 }}>
            <Txt s={13} w={8}>
              {n} <Txt s={11} c={C.muted}>{w}</Txt>
            </Txt>
            <Txt s={14} c="#d9d9de">
              {t}
            </Txt>
          </View>
        </View>
      ))}
      <View style={[S.row, { gap: 8, marginTop: 4 }]}>
        <Input value={v} onChangeText={setV} placeholder="Add a comment…" style={{ flex: 1, height: 48, minHeight: 48 }} onSubmit={send} returnKeyType="send" />
        <Pressable accessibilityLabel="Send" onPress={send} style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: C.yellow, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="send" size={20} color="#000" />
        </Pressable>
      </View>
    </View>
  );
}
export function openMedia(pic: string) {
  sheet.show(() => <Pict pic={pic} style={{ width: '100%', aspectRatio: pic.startsWith('scenes/') ? 390 / 700 : 1, borderRadius: 18 }} fit="contain" />);
}
export async function sharePost(name?: string) {
  try {
    await Share.share({ message: `Check out ${name ? name + ' ' : ''}on bolo — jobs, talent and careers near you. https://bolo.app` });
  } catch {}
}
export { tx, myCity, ProTag, trOther, bizLogo, Check };
