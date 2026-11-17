/* Career: internships & programs, courses, mentorships, groups, ads. */
import { router } from 'expo-router';
import { db, uid, Course, Mentorship, Opp } from '../data/db';
import { toast } from '../ui/overlay';
import { bump } from './live';
import { P, isW, curBiz, mOwner, THREADS, fname } from './core';
import { bizLog } from './work';
import { supabase } from '../lib/supabase';
import { friendly } from './remote';
import { R, groupKey, refreshCareer, refreshChats } from './server';

const fail = (e: any) => toast(friendly(e));

/* ---------------- internships & programs ---------------- */
export type OppForm = { kind: string; title: string; cat: string; desc: string; dur: string; start: string; mode: string; paid: string; amount: string; seats: number; deadline: string; lv?: string };
const fmtD = (d: string) => {
  const x = new Date(d);
  return d && !isNaN(+x) ? x.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '';
};
export function publishOpp(f: OppForm): 'opp' | 'course' {
  // courses are listings that link to the school's own site
  if (f.kind === 'Course') {
    router.push('/list-course' as any);
    return 'course';
  }
  const b = curBiz()!;
  const amt = +String(f.amount).replace(/\D/g, '') || 0;
  const o: Opp = {
    id: uid('tmp_op'),
    biz: db.BIZ.active!,
    mine: 1,
    kind: f.kind,
    title: f.title.trim(),
    cat: f.cat || 'Admin',
    dur: f.dur,
    start: fmtD(f.start) || 'Flexible',
    mode: f.mode === 'Online' ? 'Online' : `${f.mode} · ${b.area || b.city}`,
    pay: f.paid === 'Paid' ? (amt ? `XAF ${amt.toLocaleString('en-US')} / month stipend` : 'Paid · stipend on request') : f.paid === 'Fee' ? `XAF ${amt.toLocaleString('en-US')} fee` : f.paid === 'Free' ? 'Free' : 'Unpaid',
    seats: f.seats,
    joined: 0,
    deadline: fmtD(f.deadline) || 'Rolling',
    desc: f.desc.trim() || 'Details coming soon.',
    skills: [],
    people: [],
    st: {},
  };
  db.OPPS.unshift(o);
  bizLog('cap', `Published ${f.kind.toLowerCase()} <b>${o.title}</b>`);
  bump();
  (async () => {
    if (!b.remoteId) return fail('Your business page is still saving. Try again in a moment.');
    const { cat, dur, start, mode, pay, deadline, desc, skills } = o;
    const { data, error } = await supabase.from('opportunities').insert({ business_id: b.remoteId, kind: o.kind, title: o.title, seats: o.seats, data: { cat, dur, start, mode, pay, deadline, desc, skills } }).select('id').single();
    if (error) {
      db.OPPS = db.OPPS.filter((x) => x !== o);
      bump();
      return fail(error);
    }
    o.id = data.id;
    toast(`${f.kind} published in Career`);
    bump();
  })();
  return 'opp';
}
/** Change an internship or program I published. Dates stay as they were unless new ones are picked. */
export function updateOpp(id: string, f: OppForm) {
  const o = db.OPPS.find((x) => x.id === id && x.mine);
  if (!o || id.startsWith('tmp_')) return toast('This listing is still being published. Try again in a moment.');
  const before = { ...o };
  const b = db.BIZ.list.find((x) => x.id === o.biz) || curBiz();
  const amt = +String(f.amount).replace(/\D/g, '') || 0;
  Object.assign(o, {
    title: f.title.trim(),
    cat: f.cat || o.cat,
    dur: f.dur,
    start: fmtD(f.start) || o.start,
    mode: f.mode === 'Online' ? 'Online' : `${f.mode} · ${b?.area || b?.city || ''}`.replace(/ · $/, ''),
    pay: f.paid === 'Paid' ? (amt ? `XAF ${amt.toLocaleString('en-US')} / month stipend` : 'Paid · stipend on request') : f.paid === 'Fee' ? `XAF ${amt.toLocaleString('en-US')} fee` : f.paid === 'Free' ? 'Free' : 'Unpaid',
    seats: f.seats,
    deadline: fmtD(f.deadline) || o.deadline,
    desc: f.desc.trim() || o.desc,
  });
  bump();
  const { cat, dur, start, mode, pay, deadline, desc, skills } = o;
  supabase
    .from('opportunities')
    .update({ title: o.title, seats: o.seats, data: { cat, dur, start, mode, pay, deadline, desc, skills } })
    .eq('id', id)
    .then(({ error }) => {
      if (!error) return toast('Changes saved');
      Object.assign(o, before);
      bump();
      fail(error);
    });
}
export function joinOpp(id: string) {
  const o = db.OPPS.find((x) => x.id === id)!;
  o.applied = 1;
  o.joined++;
  bump();
  supabase
    .from('opportunity_applications')
    .insert({ opportunity_id: id })
    .then(({ error }) => {
      if (error) {
        o.applied = undefined;
        o.joined = Math.max(0, o.joined - 1);
        bump();
        return fail(error);
      }
      toast(o.kind === 'Training program' ? `You asked to join “${o.title}”` : `Application sent to ${db.BIZ_SAMPLE[o.biz]?.name || 'the business'}`);
    });
}
export function answerApplicant(oid: string, pid: string, st: 'acc' | 'dec') {
  const o = db.OPPS.find((x) => x.id === oid)!;
  (o.st = o.st || {})[pid] = st;
  if (st === 'dec') o.joined = Math.max(0, o.joined - 1);
  toast(st === 'acc' ? `${P(pid).name} accepted. We’ve let them know` : `${P(pid).name} declined`);
  if (!isW()) bizLog(st === 'acc' ? 'checkc' : 'x', `${st === 'acc' ? 'Accepted' : 'Declined'} <b>${P(pid).name}</b> for <b>${o.title}</b>`);
  bump();
  supabase.from('opportunity_applications').update({ status: st }).eq('opportunity_id', oid).eq('user_id', R(pid)).then(({ error }) => error && fail(error));
}

/** Lessons shown on the course page, made from what the course teaches. */
export const lessonsOf = (c: Course) => [...c.skills, 'Final project and certificate'];

export function joinMentor(id: string) {
  const m = db.MENTORSHIPS.find((x) => x.id === id)!;
  m.joinedMe = 'req';
  bump();
  supabase
    .from('mentorship_members')
    .insert({ mentorship_id: id })
    .then(({ error }) => {
      if (error) {
        m.joinedMe = null;
        bump();
        return fail(error);
      }
      toast(`Request sent to ${fname(mOwner(m).name)}. You’ll join the group when they accept`);
    });
}
export type MentorForm = { title: string; field: string; format: '1-to-1' | 'Group'; dur: string; price: 'Free' | 'Paid'; amount: string; seats: number; desc: string; rules: string[] };
export function publishMentor(f: MentorForm) {
  const amt = +String(f.amount).replace(/\D/g, '');
  const biz = isW() ? null : curBiz();
  const m: Mentorship = {
    id: uid('tmp_mm'),
    mine: 1,
    asBiz: biz ? biz.id : null,
    title: f.title.trim(),
    field: f.field || db.user.skills[0] || 'Admin',
    format: f.format,
    dur: f.dur,
    price: f.price === 'Free' || !amt ? 'Free' : `XAF ${amt.toLocaleString('en-US')} / month`,
    seats: f.seats,
    joined: 0,
    people: [],
    st: {},
    desc: f.desc.trim() || 'Details coming soon.',
    rules: [...f.rules],
  };
  db.MENTORSHIPS.unshift(m);
  if (biz) bizLog('follow', `Published mentorship <b>${m.title}</b>`);
  bump();
  (async () => {
    const { field, format, dur, price, desc, rules } = m;
    const { error } = await supabase.from('mentorships').insert({ business_id: biz?.remoteId || null, title: m.title, seats: m.seats, data: { field, format, dur, price, desc, rules, color: m.color } });
    if (error) {
      db.MENTORSHIPS = db.MENTORSHIPS.filter((x) => x !== m);
      bump();
      return fail(error);
    }
    toast('Mentorship published in Career. Its group chat is in your messages');
    await refreshCareer();
    await refreshChats();
  })();
}
/** Change a mentorship I run. */
export function updateMentor(id: string, f: MentorForm) {
  const m = db.MENTORSHIPS.find((x) => x.id === id && x.mine);
  if (!m || id.startsWith('tmp_')) return toast('This mentorship is still being published. Try again in a moment.');
  const before = { ...m };
  const amt = +String(f.amount).replace(/\D/g, '');
  Object.assign(m, {
    title: f.title.trim(),
    field: f.field || m.field,
    format: f.format,
    dur: f.dur,
    price: f.price === 'Free' || !amt ? 'Free' : `XAF ${amt.toLocaleString('en-US')} / month`,
    seats: Math.max(f.seats, m.joined || 0),
    desc: f.desc.trim() || m.desc,
    rules: [...f.rules],
  });
  bump();
  const { field, format, dur, price, desc, rules } = m;
  supabase
    .from('mentorships')
    .update({ title: m.title, seats: m.seats, data: { field, format, dur, price, desc, rules, color: m.color } })
    .eq('id', id)
    .then(({ error }) => {
      if (!error) return toast('Changes saved');
      Object.assign(m, before);
      bump();
      fail(error);
    });
}
export function answerMentee(mid: string, pid: string, st: 'acc' | 'dec') {
  const m = db.MENTORSHIPS.find((x) => x.id === mid)!;
  (m.st = m.st || {})[pid] = st;
  if (st === 'acc') m.joined++;
  toast(st === 'acc' ? `${P(pid).name} accepted. They’re in the group now` : `${P(pid).name} declined`);
  bump();
  supabase
    .from('mentorship_members')
    .update({ status: st === 'acc' ? 'yes' : 'dec' })
    .eq('mentorship_id', mid)
    .eq('user_id', R(pid))
    .then(({ error }) => (error ? fail(error) : refreshChats()));
}
/** A new group chat with the people picked. Returns its chat key. */
export async function createGroup(o: { title: string; desc: string; rules: string[]; color: string; members: string[] }): Promise<string | null> {
  const { data, error } = await supabase.rpc('create_group', { p_title: o.title.trim(), p_about: o.desc.trim(), p_color: o.color, p_rules: o.rules, p_members: o.members.map(R).filter(Boolean) });
  if (error) {
    fail(error);
    return null;
  }
  await refreshChats();
  toast('Group created');
  return groupKey(data as string);
}
export const groupOf = (gid: string) => db.MENTORSHIPS.find((x) => x.id === db.P[gid]?.mentorship);
/** Groups with the "no private messages" rule: you can still message the mentor; please keep to the rules. */
export function requestDM(mid: string) {
  db.DMREQ[mid] = 'ok';
  bump();
}
/** Is messaging this person blocked by a group rule? */
export function dmBlocked(id: string) {
  const m = db.MENTORSHIPS.find((x) => x.by === id && x.joinedMe && (x.rules || []).includes('noDM') && !x.mine);
  if (m && db.DMREQ[m.id] !== 'ok' && !THREADS()[id]?.msgs?.some((x) => x.f === 'me')) return m;
  return null;
}


