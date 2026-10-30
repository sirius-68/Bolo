import React, { useState } from 'react';
import { Pressable, Share, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';
import { db } from '../data/db';
import { RULES, SERVICES } from '../data/catalog';
import { AlertIll, Avatar, Btn, Chip, Chips, Field, Input, Label, OptRow, Txt, tap } from '../ui/kit';
import { Icon } from '../ui/Icon';
import { afterSheet, sheet, SheetTitle, toast } from '../ui/overlay';
import { C, R, S } from '../ui/theme';
import { P, ORDER, THREADS, WORKERS, thread, hiringSide, mySkill, fname, isW, digits } from '../logic/core';
import { deleteChat, deleteMsg, forwardMsg, msgPreview, openThread, sendLocation, sendQuote, sendText, shareContact, sendPhoto, sendFile } from '../logic/work';
import { createGroup, dmBlocked, requestDM, groupOf } from '../logic/career';
import { mOwner } from '../logic/core';
import { bump } from '../logic/live';
import { pickDocument, pickImage } from '../logic/media';
import { openMentorForm } from './career';

/** Open a conversation (respecting mentors who ask for permission first). */
export function openChat(id: string) {
  const m = dmBlocked(id);
  if (m) {
    const pend = db.DMREQ[m.id] === 'pending';
    sheet.show(() => (
      <View style={{ gap: 10 }}>
        <AlertIll icon="lock" bg={C.lav} />
        <SheetTitle center sub={`${mOwner(m).name} asks mentees to request permission before sending private messages.`}>
          Ask before messaging
        </SheetTitle>
        <Btn
          variant="yellow"
          title={pend ? 'Request sent' : 'Request to message'}
          disabled={pend}
          style={{ marginTop: 8 }}
          onPress={() => {
            requestDM(m.id);
            sheet.close();
          }}
        />
        <Btn variant="ghost" title="Not now" onPress={() => sheet.close()} />
      </View>
    ));
    return;
  }
  openThread(id);
  router.push(`/chat/${id}` as any);
}

/* ---------------- quotes ---------------- */
export function openQuote(id: string) {
  sheet.show(() => <QuoteSheet id={id} />);
}
function QuoteSheet({ id }: { id: string }) {
  const th = thread(id);
  const hiring = hiringSide(id);
  const def = (th.job || '').split(' · ')[0] || (hiring ? (SERVICES[P(id).role] || SERVICES.Plumber)[0][0] : (SERVICES[mySkill()] || SERVICES.Plumber)[0][0]);
  const [job, setJob] = useState(def);
  const [price, setPrice] = useState('');
  const [when, setWhen] = useState('Tomorrow');
  return (
    <View style={{ gap: 14 }}>
      <SheetTitle>{hiring ? `Offer your price to ${fname(P(id).name)}` : 'Send a quote'}</SheetTitle>
      <Field label="Job">
        <Input value={job} onChangeText={setJob} icon="job" />
      </Field>
      <Field label="Price">
        <Input value={price} onChangeText={(v) => setPrice(digits(v))} prefix="XAF" keyboardType="number-pad" placeholder="e.g. 12,000" autoFocus />
      </Field>
      <View>
        <Label>When</Label>
        <Chips>
          {['Today', 'Tomorrow', 'This week'].map((w) => (
            <Chip key={w} small label={w} on={when === w} onPress={() => setWhen(w)} />
          ))}
        </Chips>
      </View>
      <Btn
        variant="yellow"
        title={hiring ? 'Send price offer' : 'Send quote'}
        disabled={!(+price > 0)}
        onPress={() => {
          sendQuote(id, job.trim(), price, when);
          sheet.close();
        }}
      />
    </View>
  );
}

/* ---------------- attach ---------------- */
export function openAttach(id: string) {
  const group = !!P(id)?.group;
  const hiring = hiringSide(id);
  sheet.show(() => (
    <View>
      <SheetTitle>Send</SheetTitle>
      <OptRow
        icon="image"
        title="Photo"
        sub="Show the problem: a leak, a socket, a stain"
        onPress={() =>
          afterSheet(async () => {
            const p = await pickImage();
            if (p) sendPhoto(id, p);
          })
        }
      />
      <OptRow
        icon="cam"
        bg={C.blue}
        iconColor="#fff"
        title="Camera"
        sub="Take a photo now"
        onPress={() =>
          afterSheet(async () => {
            const p = await pickImage({ camera: true });
            if (p) sendPhoto(id, p);
          })
        }
      />
      <OptRow
        icon="file"
        bg={C.lav}
        title="Document"
        sub="Plans, receipts, a CV or a job brief"
        onPress={() =>
          afterSheet(async () => {
            const d = await pickDocument(['*/*']);
            if (d) sendFile(id, d.name, d.size);
          })
        }
      />
      <OptRow icon="pin" bg={C.orange} title="My location" sub="So they know exactly where to come" onPress={() => (sheet.close(), sendLocation(id))} />
      {!group ? <OptRow icon="coins" bg={C.ok} iconColor="#fff" title={hiring ? 'Offer a price' : 'Send a quote'} sub={hiring ? 'Offer your own price for the job' : 'Give your price for the job'} onPress={() => afterSheet(() => openQuote(id))} /> : null}
      {!group && hiring ? <OptRow icon="money" bg="#fff" title="Request a quote" sub="Ask them for a price" onPress={() => (sheet.close(), sendText(id, 'Could you send me a quote?'))} /> : null}
    </View>
  ));
}

/* ---------------- long-press on a message ---------------- */
export function openMsgMenu(id: string, i: number) {
  const m = thread(id).msgs[i];
  if (!m || m.sys || m.d) return;
  const mine = m.f === 'me';
  const txt = msgPreview(m);
  sheet.show(() => (
    <View>
      <View style={{ alignSelf: mine ? 'flex-end' : 'flex-start', maxWidth: '85%', padding: 12, borderRadius: 16, backgroundColor: mine ? C.blue : C.s2, marginBottom: 10 }}>
        <Txt s={14}>{txt.slice(0, 160)}</Txt>
      </View>
      {m.t ? (
        <OptRow
          icon="file"
          bg="#fff"
          title="Copy"
          chev={false}
          onPress={() => {
            Clipboard.setStringAsync(m.t || '').catch(() => {});
            sheet.close('Copied');
          }}
        />
      ) : null}
      <OptRow icon="share" bg={C.lav} title="Forward to a chat" chev={false} onPress={() => openForward(id, (to) => forwardMsg(id, i, to))} />
      <OptRow
        icon="send"
        title="Share outside bolo"
        chev={false}
        onPress={() => {
          sheet.close();
          Share.share({ message: txt }).catch(() => {});
        }}
      />
      <OptRow icon="trash" bg={C.errSoft} title="Delete for me" danger chev={false} onPress={() => (deleteMsg(id, i, false), sheet.close())} />
      {mine ? <OptRow icon="trash" bg={C.errSoft} title="Delete for everyone" danger chev={false} onPress={() => (deleteMsg(id, i, true), sheet.close())} /> : null}
    </View>
  ));
}
export function openForward(from: string, onPick: (to: string) => void) {
  const L = ORDER().filter((id) => P(id) && id !== from).slice(0, 14);
  sheet.show(() => (
    <View style={{ gap: 6 }}>
      <SheetTitle>Forward to…</SheetTitle>
      {L.map((id) => (
        <Pressable key={id} onPress={() => (onPick(id), sheet.close())} style={({ pressed }) => [S.row, { gap: 12, padding: 10, borderRadius: 14, backgroundColor: pressed ? C.s2 : 'transparent' }]}>
          <Avatar pic={P(id).photo} size={42} square={!!(P(id).group || P(id).biz)} />
          <View style={{ flex: 1 }}>
            <Txt s={14} w={8} lines={1}>
              {P(id).name}
            </Txt>
            <Txt s={12} c={C.muted}>
              {P(id).group ? 'Group' : P(id).role}
            </Txt>
          </View>
        </Pressable>
      ))}
    </View>
  ));
}

/* ---------------- long-press on a chat in the inbox ---------------- */
export function openChatMenu(id: string) {
  const th = THREADS()[id];
  const p = P(id);
  if (!th || !p) return;
  sheet.show(() => (
    <View>
      <View style={[S.row, { gap: 12, marginBottom: 8 }]}>
        <Avatar pic={p.photo} size={44} square={!!(p.group || p.biz)} />
        <Txt s={16} w={8} style={{ flex: 1 }} lines={1}>
          {p.name}
        </Txt>
      </View>
      <OptRow
        icon="pushpin"
        title={th.pinned ? 'Unpin chat' : 'Pin chat'}
        chev={false}
        onPress={() => {
          th.pinned = th.pinned ? 0 : 1;
          bump();
          sheet.close(th.pinned ? 'Chat pinned' : 'Chat unpinned');
        }}
      />
      <OptRow
        icon="check2"
        bg={C.lav}
        title={th.unread ? 'Mark as read' : 'Mark as unread'}
        chev={false}
        onPress={() => {
          th.unread = th.unread ? 0 : 1;
          bump();
          sheet.close();
        }}
      />
      <OptRow icon="share" bg="#fff" title={`Share ${p.group ? 'group' : 'contact'}`} chev={false} onPress={() => openForward(id, (to) => shareContact(id, to))} />
      <OptRow icon="trash" bg={C.errSoft} title="Delete chat" danger chev={false} onPress={() => (sheet.close(), deleteChat(id))} />
    </View>
  ));
}

/* ---------------- new message / new group ---------------- */
export function openNewChat() {
  sheet.show(() => <NewChat />, { full: true });
}
function NewChat() {
  const [q, setQ] = useState('');
  const ql = q.toLowerCase();
  const L = Object.keys(db.P)
    .filter((id) => !db.P[id].group && (!ql || db.P[id].name.toLowerCase().includes(ql) || db.P[id].role.toLowerCase().includes(ql)))
    .slice(0, 40);
  return (
    <View style={{ gap: 8 }}>
      <SheetTitle>New message</SheetTitle>
      <Input value={q} onChangeText={setQ} icon="search" placeholder="Search people and businesses" autoCapitalize="none" style={{ height: 48, minHeight: 48 }} />
      {L.map((id) => (
        <Pressable key={id} onPress={() => afterSheet(() => openChat(id))} style={({ pressed }) => [S.row, { gap: 12, padding: 10, borderRadius: 14, backgroundColor: pressed ? C.s2 : 'transparent' }]}>
          <Avatar pic={P(id).photo} size={42} square={!!P(id).biz} />
          <View style={{ flex: 1 }}>
            <Txt s={14} w={8} lines={1}>
              {P(id).name}
            </Txt>
            <Txt s={12} c={C.muted}>
              {P(id).biz ? P(id).sector : `${P(id).role} · ${P(id).dist}`}
            </Txt>
          </View>
          <Icon name="chev" size={18} color={C.faint} />
        </Pressable>
      ))}
    </View>
  );
}
export function openCompose() {
  sheet.show(() => (
    <View>
      <SheetTitle>Start something new</SheetTitle>
      <OptRow icon="chat" title="New message" sub="Chat privately with someone" onPress={() => afterSheet(openNewChat)} />
      <OptRow icon="follow" bg={C.lav} title="New group" sub="Bring people together: a team, a class, a crew" onPress={() => openNewGroup()} />
      <OptRow icon="cap" bg={C.orange} title="New mentorship group" sub="Teach or mentor, free or paid" onPress={() => afterSheet(openMentorForm)} />
    </View>
  ));
}
type NG = { step: number; sel: string[]; title: string; desc: string; rules: string[]; color: string; q: string };
export function openNewGroup() {
  const g: NG = { step: 0, sel: [], title: '', desc: '', rules: ['respect'], color: '#f47b3b', q: '' };
  sheet.show(() => <NewGroup g={g} />, { full: true });
}
function NewGroup({ g }: { g: NG }) {
  const [, force] = useState(0);
  const re = () => force((x) => x + 1);
  if (g.step === 0) {
    const L = [...new Set([...ORDER().filter((id) => P(id) && !P(id).group && !P(id).biz && id !== 'me'), ...WORKERS()])].filter((id) => !g.q || P(id).name.toLowerCase().includes(g.q));
    return (
      <View style={{ gap: 8 }}>
        <SheetTitle sub={`Add members · ${g.sel.length} selected`}>New group</SheetTitle>
        {g.sel.length ? (
          <Chips scroll>
            {g.sel.map((id) => (
              <Pressable key={id} onPress={() => ((g.sel = g.sel.filter((x) => x !== id)), re())} style={{ alignItems: 'center', width: 56 }}>
                <Avatar pic={P(id).photo} size={44} />
                <Txt s={11} lines={1}>
                  {P(id).name.split(' ')[0]}
                </Txt>
              </Pressable>
            ))}
          </Chips>
        ) : null}
        <Input value={g.q} onChangeText={(v) => ((g.q = v.toLowerCase()), re())} icon="search" placeholder="Search people" style={{ height: 48, minHeight: 48 }} />
        {L.slice(0, 30).map((id) => {
          const on = g.sel.includes(id);
          return (
            <Pressable key={id} onPress={() => (tap(), (g.sel = on ? g.sel.filter((x) => x !== id) : [...g.sel, id]), re())} style={[S.row, { gap: 12, padding: 10, borderRadius: 14, backgroundColor: on ? 'rgba(61,90,241,.18)' : 'transparent' }]}>
              <Avatar pic={P(id).photo} size={40} />
              <View style={{ flex: 1 }}>
                <Txt s={14} w={7}>
                  {P(id).name}
                </Txt>
                <Txt s={12} c={C.muted}>
                  {P(id).role}
                </Txt>
              </View>
              <View style={{ width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: on ? C.yellow : C.s3, backgroundColor: on ? C.yellow : 'transparent', alignItems: 'center', justifyContent: 'center' }}>{on ? <Icon name="check" size={14} color="#000" /> : null}</View>
            </Pressable>
          );
        })}
        <Btn variant="yellow" title={`Next · ${g.sel.length} member${g.sel.length === 1 ? '' : 's'}`} disabled={!g.sel.length} onPress={() => ((g.step = 1), re())} style={{ marginTop: 8 }} />
      </View>
    );
  }
  const ini = (g.title || 'G').trim().split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase();
  return (
    <View style={{ gap: 14 }}>
      <Pressable onPress={() => ((g.step = 0), re())}>
        <Txt s={13} w={7} c={C.lav}>
          ← Members
        </Txt>
      </Pressable>
      <SheetTitle>Group details</SheetTitle>
      <View style={[S.row, { gap: 14 }]}>
        <View style={{ width: 64, height: 64, borderRadius: 18, backgroundColor: g.color, alignItems: 'center', justifyContent: 'center' }}>
          <Txt s={22} w={8} c="#000">
            {ini}
          </Txt>
        </View>
        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', flex: 1 }}>
          {['#f47b3b', '#f6ee5c', '#3d5af1', '#a9b6ff', '#7be0a7', '#f6a4b4'].map((c) => (
            <Pressable key={c} accessibilityLabel={`Colour ${c}`} onPress={() => ((g.color = c), re())} style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: c, borderWidth: g.color === c ? 3 : 0, borderColor: '#fff' }} />
          ))}
        </View>
      </View>
      <Field label="Group name">
        <Input value={g.title} onChangeText={(v) => ((g.title = v), re())} maxLength={50} placeholder="e.g. Molyko plumbers crew" />
      </Field>
      <Field label="Description · optional">
        <Input multiline value={g.desc} onChangeText={(v) => ((g.desc = v), re())} maxLength={600} placeholder="What’s this group about?" />
      </Field>
      <RulePicker rules={g.rules} onChange={(r) => ((g.rules = r), re())} />
      <Btn
        variant="yellow"
        title="Create group"
        disabled={!g.title.trim()}
        onPress={() => {
          const gid = createGroup({ title: g.title, desc: g.desc, rules: g.rules, color: g.color, members: g.sel });
          afterSheet(() => openChat(gid), 250);
        }}
      />
    </View>
  );
}
export function RulePicker({ rules, onChange }: { rules: string[]; onChange: (r: string[]) => void }) {
  return (
    <View>
      <Label>Group rules · members see these on the group page</Label>
      <View style={{ gap: 6 }}>
        {Object.entries(RULES).map(([k, [t, i]]) => {
          const on = rules.includes(k);
          return (
            <Pressable key={k} onPress={() => (tap(), onChange(on ? rules.filter((x) => x !== k) : [...rules, k]))} style={[S.row, { gap: 12, padding: 10, borderRadius: 14, backgroundColor: on ? 'rgba(61,90,241,.16)' : C.s2 }]}>
              <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: C.s3, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name={i} size={16} color="#fff" />
              </View>
              <Txt s={13} w={6} style={{ flex: 1 }}>
                {t}
              </Txt>
              <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: on ? C.yellow : C.s3, backgroundColor: on ? C.yellow : 'transparent', alignItems: 'center', justifyContent: 'center' }}>{on ? <Icon name="check" size={13} color="#000" /> : null}</View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

/* ---------------- group rules dialog ---------------- */
export function openRules(gid: string, fromMenu = false) {
  const m = groupOf(gid);
  if (!m) return;
  sheet.show(() => (
    <View style={{ gap: 10 }}>
      <AlertIll icon="shield" bg={C.lav} />
      <SheetTitle center sub={`${mOwner(m).name} asks everyone in “${m.title}” to follow these rules.`}>
        Group rules
      </SheetTitle>
      <View style={{ padding: 12, borderRadius: 16, backgroundColor: C.s2, gap: 10 }}>
        {(m.rules || []).length ? (
          m.rules!.map((k) =>
            RULES[k] ? (
              <View key={k} style={[S.row, { gap: 10 }]}>
                <Icon name={RULES[k][1]} size={18} color={C.lav} />
                <Txt s={14} style={{ flex: 1 }}>
                  {RULES[k][0]}
                </Txt>
              </View>
            ) : null,
          )
        ) : (
          <Txt s={14}>No special rules. Be kind.</Txt>
        )}
      </View>
      <Btn
        variant="yellow"
        title={fromMenu ? 'Close' : 'I understand'}
        style={{ marginTop: 6 }}
        onPress={() => {
          const th = THREADS()[gid];
          if (th) th.rulesOk = 1;
          bump();
          sheet.close();
        }}
      />
    </View>
  ));
}
export { isW, R };
