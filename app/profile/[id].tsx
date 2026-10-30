import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { db, Review } from '../../src/data/db';
import { CO_POSTS, SERVICES, catIcon } from '../../src/data/catalog';
import { Avatar, Btn, Empty, IconBtn, PTabs, Page, Pict, Rate, Rich, StatusPill, TopBar, Txt, Verified, CoTag } from '../../src/ui/kit';
import { Icon } from '../../src/ui/Icon';
import { pick, toast } from '../../src/ui/overlay';
import { C, S } from '../../src/ui/theme';
import { P, aboutOf, fname, has, isW, k, myVacancies } from '../../src/logic/core';
import { useLive, bump } from '../../src/logic/live';
import { follow, hireState, reviewable, saveToggle, sendText } from '../../src/logic/work';
import { openHire, openReview, openMedia } from '../../src/sheets/work';
import { openChat } from '../../src/sheets/chat';
import { OppCard, ReqPost, ReelThumb } from '../../src/components/cards';
import { REELS } from '../../src/data/db';
import { router } from 'expo-router';
import { PersonCV } from '../../src/components/cv';
import { sheet } from '../../src/ui/overlay';

const SAMPLE_REV: [string, string, number, string][] = [
  ['c_ama', '2 days ago', 5, 'Fixed it in under an hour. Very professional and tidy.'],
  ['c_marie', '1 week ago', 4, 'Good work. Arrived a bit late but explained everything clearly.'],
  ['c_paul', '3 weeks ago', 5, 'Fair price, would hire again!'],
];

export default function Profile() {
  useLive();
  const { id } = useLocalSearchParams<{ id: string }>();
  const p = P(id);
  const [tab, setTab] = useState('About');
  if (!p?.name)
    return (
      <Page header={<TopBar title="Profile" />}>
        <Empty title="Profile not found" text="This account may have been removed." />
      </Page>
    );
  const kind = p.biz ? 'company' : p.client ? 'client' : 'worker';
  const tabs: string[] = kind === 'company' ? ['About', 'Jobs', 'Posts', 'Activity'] : kind === 'client' ? ['About', 'Jobs', 'Reviews'] : ['About', 'Services', 'Posts', 'Reviews', 'Schedule', 'CV'];
  const t = tabs.includes(tab) ? tab : 'About';
  const f = fname(p.name);
  const following = has(db.followed, id);
  const st = hireState(id);
  const w = isW();
  const b = db.BIZ_SAMPLE[id];
  const openRoles = db.POSTS.filter((x) => x.kind === 'request' && x.client === id);
  const stats: [string | number, string][] =
    kind === 'company'
      ? [
          [openRoles.length, 'Open roles'],
          [p.hires || 0, 'Hired'],
          [k(p.followers + (following ? 1 : 0)), 'Followers'],
        ]
      : kind === 'client'
        ? [
            [p.jobs, 'Jobs posted'],
            [p.hires || 0, 'People hired'],
            [p.reviews, 'Reviews'],
          ]
        : [
            [k(p.jobs), 'Jobs done'],
            [p.reviews, 'Reviews'],
            [k(p.followers + (following ? 1 : 0)), 'Followers'],
          ];
  const inviteToVacancy = () => {
    const V = myVacancies();
    if (!V.length) {
      toast('Post a vacancy first, then invite people to apply');
      router.push('/post-job');
      return;
    }
    pick(
      `Invite ${f} to apply`,
      V.map((v) => v.title!),
      null as any,
      (title) => {
        sendText(id, `Hi ${f}! We’d love you to apply for our “${title}” vacancy on bolo.`);
        toast(`Invite sent to ${f}`);
      },
    );
  };
  const main =
    kind === 'worker' ? (
      w ? (
        <Btn variant="yellow" style={{ flex: 1 }} title={st === 'booked' ? 'Booked ✓' : st === 'requested' ? 'Requested ✓' : `Hire ${f}`} onPress={() => openHire(id)} testID="profile-hire" />
      ) : (
        <Btn variant="yellow" style={{ flex: 1 }} title="Invite to apply" onPress={inviteToVacancy} />
      )
    ) : (
      <Btn variant="yellow" style={{ flex: 1 }} title={`Message ${f}`} onPress={() => openChat(id)} />
    );
  const person = kind !== 'company';
  const wTabs = ['About', 'Services', ...(kind === 'client' || openRoles.length ? ['Jobs'] : []), 'Posts', 'Reviews', 'Schedule', 'CV'];
  const tabs2 = person ? wTabs : tabs;
  const t2 = tabs2.includes(tab) ? tab : 'About';
  return (
    <Page
      header={
        <TopBar
          title={p.name}
          right={
            <IconBtn
              name="bookmark"
              label={has(kind === 'company' ? db.savedCos : db.saved, id) ? 'Unsave' : 'Save'}
              bg={has(kind === 'company' ? db.savedCos : db.saved, id) ? C.yellow : undefined}
              color={has(kind === 'company' ? db.savedCos : db.saved, id) ? '#000' : C.text}
              onPress={() => saveToggle(kind === 'company' ? 'savedCos' : 'saved', id, kind === 'company' ? 'Company' : f)}
            />
          }
        />
      }
    >
      <View style={{ marginTop: 10, padding: 18, borderRadius: 26, backgroundColor: C.s1, borderWidth: 1, borderColor: C.line }}>
        <View style={[S.row, { gap: 14 }]}>
          <Avatar pic={p.photo} square={kind === 'company'} size={76} ring={person && (p as any).pro ? C.yellow : undefined} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <View style={[S.row, { gap: 6 }]}>
              <Txt s={21} w={8} lines={2} style={{ flexShrink: 1 }}>
                {p.name}
              </Txt>
              {p.verified ? <Verified /> : null}
            </View>
            <View style={[S.row, { gap: 6, flexWrap: 'wrap', marginTop: 3 }]}>
              {kind === 'company' ? <CoTag /> : null}
              <Txt s={13} c={C.muted}>
                {kind === 'company' ? `${b?.sector || p.sector || ''} · ${p.area}` : p.role && kind === 'worker' ? `${p.role} · ${p.years} years` : 'Hires on bolo'}
              </Txt>
              <Rate r={p.rate} />
            </View>
          </View>
        </View>
        <View style={{ flexDirection: 'row', marginTop: 18, paddingVertical: 12, borderRadius: 18, backgroundColor: C.s2 }}>
          {stats.map(([v, l], i) => (
            <View key={l} style={{ flex: 1, alignItems: 'center', borderLeftWidth: i ? 1 : 0, borderColor: C.line }}>
              <Txt s={18} w={8}>
                {v}
              </Txt>
              <Txt s={11} c={C.muted}>
                {l}
              </Txt>
            </View>
          ))}
        </View>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 14 }}>
          {main}
          <Btn variant="ghost" title={following ? 'Following' : 'Follow'} onPress={() => follow(id)} style={{ flex: 1, borderColor: C.s3 }} />
          {kind === 'worker' ? <IconBtn name="chat" bg={C.s2} label={`Message ${f}`} onPress={() => openChat(id)} /> : null}
        </View>
      </View>
      <View style={[S.row, { gap: 6, marginTop: 12, paddingHorizontal: 18 }]}>
        <Icon name="pin" size={15} color={C.muted} />
        <Txt s={13} c={C.muted}>
          {p.area} · {kind === 'company' ? `${b?.size || ''} people` : p.dist}
        </Txt>
      </View>
      <PTabs style={{ marginTop: 16 }} items={tabs2.map((x) => [x, x] as [string, string])} value={t2} onChange={setTab} />
      <View style={{ marginTop: 12, gap: 12 }}>{person ? <PersonTab id={id} t={t2} kind={kind} /> : <CompanyTab id={id} t={t2} />}</View>
    </Page>
  );
}

const Card = ({ title, children }: { title?: string; children: React.ReactNode }) => (
  <View style={{ padding: 16, borderRadius: 20, backgroundColor: C.s1, borderWidth: 1, borderColor: C.line, gap: 8 }}>
    {title ? (
      <Txt s={16} w={8}>
        {title}
      </Txt>
    ) : null}
    {children}
  </View>
);
function Cred({ icon, t, s }: { icon: string; t: string; s: string }) {
  return (
    <View style={[S.row, { gap: 12 }]}>
      <View style={{ width: 38, height: 38, borderRadius: 10, backgroundColor: C.s2, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={icon} size={18} color={C.yellow} />
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
  );
}
/** Friendly empty state used by every profile tab. */
function EmptyTab({ icon, title, text, action, onAction }: { icon: string; title: string; text: string; action?: string; onAction?: () => void }) {
  return (
    <View style={{ alignItems: 'center', paddingVertical: 28, paddingHorizontal: 20, borderRadius: 22, backgroundColor: C.s1, borderWidth: 1, borderColor: C.line }}>
      <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: C.s2, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={icon} size={24} color={C.yellow} />
      </View>
      <Txt s={16} w={8} center style={{ marginTop: 12 }}>
        {title}
      </Txt>
      <Txt s={13} c={C.muted} center style={{ marginTop: 4 }}>
        {text}
      </Txt>
      {action ? <Btn small variant="dark" title={action} onPress={onAction} style={{ marginTop: 14 }} /> : null}
    </View>
  );
}
function Stars({ n, size = 14 }: { n: number; size?: number }) {
  return (
    <View style={[S.row, { gap: 2 }]}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Icon key={i} name="star" size={size} color={i <= Math.round(n) ? C.yellow : C.s3} />
      ))}
    </View>
  );
}
function ReviewGate({ id }: { id: string }) {
  const r = reviewable(id);
  if (!r)
    return (
      <View style={[S.row, { gap: 10, padding: 12, borderRadius: 16, backgroundColor: C.s1, borderWidth: 1, borderColor: C.line }]}>
        <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: C.s2, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="lock" size={16} color={C.lav} />
        </View>
        <Txt s={12} c={C.muted} style={{ flex: 1 }}>
          Only people who completed a job with {fname(P(id).name)} on bolo can leave a review.
        </Txt>
      </View>
    );
  return (
    <Pressable onPress={() => openReview(id, r.bid.startsWith('k') ? null : r.bid)} style={[S.row, { gap: 12, padding: 14, borderRadius: 18, backgroundColor: C.yellow }]}>
      <Icon name="star" size={20} color="#000" />
      <View style={{ flex: 1 }}>
        <Txt s={14} w={8} c="#000">
          Rate {fname(P(id).name)}
        </Txt>
        <Txt s={12} c="#222">
          For “{r.what}”
        </Txt>
      </View>
      <Icon name="chev" size={18} color="#000" />
    </Pressable>
  );
}
type RV = { pic: any; name: string; time: string; stars: number; text: string; tags?: string[] };
function ReviewCard({ r }: { r: RV }) {
  return (
    <View style={{ padding: 16, borderRadius: 20, backgroundColor: C.s1, borderWidth: 1, borderColor: C.line, gap: 10 }}>
      <View style={[S.row, { gap: 10 }]}>
        <Avatar pic={r.pic} size={36} />
        <View style={{ flex: 1 }}>
          <Txt s={14} w={8}>
            {r.name}
          </Txt>
          <Txt s={11} c={C.faint}>
            {r.time}
          </Txt>
        </View>
        <Stars n={r.stars} size={13} />
      </View>
      {r.tags?.length ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          {r.tags.map((x) => (
            <View key={x} style={{ paddingHorizontal: 10, height: 26, borderRadius: 13, backgroundColor: C.s2, justifyContent: 'center' }}>
              <Txt s={11} w={7} c={C.lav}>
                {x}
              </Txt>
            </View>
          ))}
        </View>
      ) : null}
      {r.text ? (
        <Txt s={14} c="#d9d9de">
          {r.text}
        </Txt>
      ) : null}
    </View>
  );
}

/** Every person's profile has the same tabs; tabs with nothing yet show a helpful empty state. */
function PersonTab({ id, t, kind }: { id: string; t: string; kind: string }) {
  const p = P(id);
  const f = fname(p.name);
  const worker = kind === 'worker';
  const [day, setDay] = useState(0);
  const [slot, setSlot] = useState<string | null>(null);

  if (t === 'About') {
    const a = worker ? aboutOf(id) : null;
    return (
      <>
        <Card title="About">
          <Txt s={14} c="#d9d9de">
            {a ? a.bio : `${p.name} has posted ${p.jobs} jobs on bolo and hired ${p.hires || 0} people around ${p.area}. Usually replies within an hour.`}
          </Txt>
        </Card>
        {a ? (
          <Card title="Specialties">
            {a.spec.map((x) => (
              <View key={x} style={[S.row, { gap: 10 }]}>
                <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: 'rgba(123,224,167,.15)', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name="check" size={13} color={C.mint} />
                </View>
                <Txt s={14} style={{ flex: 1 }}>
                  {x}
                </Txt>
              </View>
            ))}
          </Card>
        ) : null}
        <Card title="Trust and verification">
          {p.verified ? <Cred icon="idcard" t="Identity verified" s="Checked by bolo" /> : null}
          <Cred icon="phone" t="Phone verified" s="Confirmed when they joined" />
          {worker ? <Cred icon="checkc" t={`${p.jobs} jobs completed`} s="Paid and confirmed on bolo" /> : <Cred icon="money" t="Pays on time" s={`${p.hires || 0} completed payments`} />}
          <Cred icon="calcheck" t={`Member for ${p.years} year${p.years > 1 ? 's' : ''}`} s="Active on bolo" />
        </Card>
      </>
    );
  }

  if (t === 'Services') {
    const L = worker ? SERVICES[p.role] || SERVICES.Plumber : [];
    if (!L.length) return <EmptyTab icon="wrench" title="No services listed" text={`${f} hasn’t listed any services with prices yet.`} action={`Message ${f}`} onAction={() => openChat(id)} />;
    return (
      <>
        {L.map(([n, pr, d, img]) => (
          <View key={n} style={{ borderRadius: 22, overflow: 'hidden', backgroundColor: C.s1, borderWidth: 1, borderColor: C.line }}>
            {img ? (
              <Pict pic={img} style={{ width: '100%', height: 132 }} />
            ) : (
              <View style={{ height: 84, backgroundColor: C.s2, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name={catIcon(p.role)} size={30} color={C.yellow} />
              </View>
            )}
            <View style={{ padding: 14, gap: 4 }}>
              <Txt s={16} w={8}>
                {n}
              </Txt>
              <Txt s={13} c={C.muted}>
                {d}
              </Txt>
              <View style={[S.rowB, { marginTop: 10 }]}>
                <View>
                  <Txt s={11} c={C.faint}>
                    Price
                  </Txt>
                  <Txt s={17} w={8} c={C.yellow}>
                    {pr}
                  </Txt>
                </View>
                {isW() ? <Btn small variant="yellow" title="Request" onPress={() => openHire(id)} /> : null}
              </View>
            </View>
          </View>
        ))}
      </>
    );
  }

  if (t === 'Jobs') {
    const js = db.POSTS.filter((x) => x.kind === 'request' && x.client === id);
    return js.length ? (
      <>
        {js.map((po) => (
          <ReqPost key={po.id} po={po} />
        ))}
      </>
    ) : (
      <EmptyTab icon="job" title="No open jobs" text={`${f} doesn’t have any open jobs right now.`} />
    );
  }

  if (t === 'Posts') {
    const reels = REELS.map((r, i) => [r, i] as const).filter(([r]) => r.by === id);
    const posts = db.POSTS.filter((x) => x.by === id && x.kind !== 'request');
    if (!reels.length && !posts.length) return <EmptyTab icon="image" title="No posts yet" text={`When ${f} shares photos or videos of their work, they’ll show here.`} />;
    return (
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        {reels.map(([r, i]) => (
          <ReelThumb key={'r' + i} r={r} i={i} width={'48.5%' as any} onPress={() => router.push(`/reels?i=${i}` as any)} />
        ))}
        {posts.map((x) => (
          <Pressable key={x.id} style={{ width: '48.5%', aspectRatio: 3 / 4, borderRadius: 20, overflow: 'hidden', backgroundColor: C.s2, padding: 12, justifyContent: 'flex-end' }} onPress={() => (x.img || x.src ? openMedia((x.img || x.src)!) : null)}>
            {x.img || x.src ? <Pict pic={(x.img || x.src)!} style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0 }} /> : null}
            {x.img || x.src ? <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 80, backgroundColor: 'rgba(0,0,0,.45)' }} /> : null}
            <Txt s={12} w={7} lines={3}>
              {x.text}
            </Txt>
          </Pressable>
        ))}
      </View>
    );
  }

  if (t === 'Reviews') {
    const mine: Review[] = db.REVIEWS[id] || [];
    const sample: [string, string, number, string][] = worker
      ? SAMPLE_REV
      : [
          ['edward', '1 week ago', 5, 'Clear instructions and paid right away.'],
          ['grace', '3 weeks ago', 5, 'Lovely to work with. Everything was ready when I arrived.'],
        ];
    const all: RV[] = [...mine.map((r) => ({ pic: r.photo, name: r.name, time: r.time, stars: r.stars, text: r.text, tags: r.tags })), ...sample.map(([c, tm, n, x]) => ({ pic: P(c).photo, name: P(c).name, time: tm, stars: n, text: x }))];
    const dist = [0.82, 0.12, 0.04, 0.01, 0.01];
    return (
      <>
        <View style={[S.row, { gap: 18, padding: 18, borderRadius: 22, backgroundColor: C.s1, borderWidth: 1, borderColor: C.line }]}>
          <View style={{ alignItems: 'center', minWidth: 84 }}>
            <Txt s={42} w={8}>
              {p.rate}
            </Txt>
            <Stars n={Number(p.rate)} size={12} />
            <Txt s={11} c={C.muted} style={{ marginTop: 4 }}>
              {p.reviews} reviews
            </Txt>
          </View>
          <View style={{ flex: 1, gap: 5 }}>
            {dist.map((d, i) => (
              <View key={i} style={[S.row, { gap: 8 }]}>
                <Txt s={11} c={C.muted} style={{ width: 8 }}>
                  {5 - i}
                </Txt>
                <View style={{ flex: 1, height: 6, borderRadius: 3, backgroundColor: C.s3 }}>
                  <View style={{ width: `${d * 100}%`, height: 6, borderRadius: 3, backgroundColor: C.yellow }} />
                </View>
              </View>
            ))}
          </View>
        </View>
        <ReviewGate id={id} />
        {all.map((r, i) => (
          <ReviewCard key={i} r={r} />
        ))}
      </>
    );
  }

  if (t === 'CV') {
    if (!worker) return <EmptyTab icon="file" title="No CV yet" text={`${f} hasn’t added work history to bolo yet.`} />;
    return (
      <>
        <PersonCV id={id} />
        <View style={[S.row, { gap: 8, justifyContent: 'center' }]}>
          <Icon name="sparkle" size={14} color={C.muted} />
          <Txt s={12} c={C.muted}>
            Built from {f}’s bolo profile and job history
          </Txt>
        </View>
      </>
    );
  }

  // Schedule
  if (!worker) return <EmptyTab icon="calplus" title="No booking times" text={`${f} doesn’t take bookings on bolo yet. Send a message to arrange a time.`} action={`Message ${f}`} onAction={() => openChat(id)} />;
  const d0 = new Date();
  const N = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const SL = ['8:00', '9:30', '11:00', '12:30', '14:00', '15:30', '17:00', '18:30'];
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(d0);
    d.setDate(d0.getDate() + i);
    return d;
  });
  const label = (i: number) => (i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : `${N[days[i].getDay()]} ${days[i].getDate()}`);
  return (
    <>
      <View style={{ padding: 14, borderRadius: 22, backgroundColor: C.s1, borderWidth: 1, borderColor: C.line, gap: 14 }}>
        <View style={S.rowB}>
          <Txt s={16} w={8}>
            Pick a day
          </Txt>
          <Txt s={12} c={C.muted}>
            {days[0].toLocaleString('en', { month: 'long' })}
          </Txt>
        </View>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          {days.map((d, i) => {
            const off = d.getDay() === 0;
            const on = i === day;
            return (
              <Pressable key={i} disabled={off} accessibilityState={{ selected: on, disabled: off }} onPress={() => (setDay(i), setSlot(null))} style={{ flex: 1, paddingVertical: 10, borderRadius: 14, alignItems: 'center', backgroundColor: on ? C.yellow : C.s2, opacity: off ? 0.35 : 1 }}>
                <Txt s={11} c={on ? '#000' : C.muted}>
                  {N[d.getDay()]}
                </Txt>
                <Txt s={16} w={8} c={on ? '#000' : C.text}>
                  {d.getDate()}
                </Txt>
              </Pressable>
            );
          })}
        </View>
        <Txt s={16} w={8}>
          Available times
        </Txt>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {SL.map((x, i) => {
            const busy = (i + day) % 3 === 0;
            const on = slot === x;
            return (
              <Pressable key={x} disabled={busy} onPress={() => setSlot(x)} style={{ width: '23%', flexGrow: 1, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? C.blue : C.s2, borderWidth: 1, borderColor: on ? C.lav : 'transparent', opacity: busy ? 0.35 : 1 }}>
                <Txt s={13} w={7} style={busy ? { textDecorationLine: 'line-through' } : undefined}>
                  {x}
                </Txt>
              </Pressable>
            );
          })}
        </View>
        <View style={[S.row, { gap: 14 }]}>
          <View style={[S.row, { gap: 6 }]}>
            <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: C.s2, borderWidth: 1, borderColor: C.s3 }} />
            <Txt s={11} c={C.muted}>
              Free
            </Txt>
          </View>
          <View style={[S.row, { gap: 6, opacity: 0.5 }]}>
            <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: C.s3 }} />
            <Txt s={11} c={C.muted}>
              Booked
            </Txt>
          </View>
        </View>
      </View>
      {isW() ? (
        <Btn variant="yellow" disabled={!slot} title={slot ? `Book ${label(day)} at ${slot}` : 'Select a time'} onPress={() => openHire(id, { when: `${label(day)}, ${slot}` })} />
      ) : (
        <Txt s={12} c={C.muted} center>
          To book {f} for your company, invite them to apply to a vacancy.
        </Txt>
      )}
    </>
  );
}
function CompanyTab({ id, t }: { id: string; t: string }) {
  const p = P(id);
  const b = db.BIZ_SAMPLE[id];
  const f = fname(p.name);
  const soc: [string, string, string][] = [
    ['globe', 'Website', b?.web || 'bolo.app'],
    ['mail', 'Email', `jobs@${(b?.web || 'company.cm').replace(/^www\./, '')}`],
    ['fb', 'Facebook', p.name],
    ['linkedin', 'LinkedIn', p.name],
  ];
  if (t === 'About')
    return (
      <>
        <Card title={`About ${p.name}`}>
          <Txt s={14} c="#d9d9de">
            {b?.about || p.about}
          </Txt>
        </Card>
        <Card title="Details">
          <Cred icon="storefront" t={b?.sector || p.sector || 'Company'} s="Sector" />
          <Cred icon="follow" t={`${b?.size || ''} people`} s="Company size" />
          <Cred icon="pin" t={p.area} s="Location" />
          <Cred icon="verified" t="Verified business" s="RCCM checked by bolo" />
        </Card>
        <Card title="Find us online">
          {soc.map(([i, l, v]) => (
            <Pressable
              key={l}
              onPress={async () => {
                await Clipboard.setStringAsync(v);
                toast(`${l} copied`);
              }}
              style={[S.row, { gap: 12 }]}
            >
              <Icon name={i} size={18} color={C.yellow} />
              <View style={{ flex: 1 }}>
                <Txt s={11} c={C.muted}>
                  {l}
                </Txt>
                <Txt s={14} w={7}>
                  {v}
                </Txt>
              </View>
              <Icon name="copy" size={16} color={C.faint} />
            </Pressable>
          ))}
        </Card>
      </>
    );
  if (t === 'Jobs') {
    const js = db.POSTS.filter((x) => x.kind === 'request' && x.client === id);
    const ops = db.OPPS.filter((o) => o.biz === id);
    if (!js.length && !ops.length) return <Empty title="No open roles" text={`${f} isn’t hiring right now.`} />;
    return (
      <>
        {js.map((po) => (
          <ReqPost key={po.id} po={po} />
        ))}
        {ops.length ? (
          <Txt s={16} w={8} style={{ marginTop: 6 }}>
            Internships & programs
          </Txt>
        ) : null}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {ops.map((o) => (
            <OppCard key={o.id} o={o} width="48%" />
          ))}
        </View>
      </>
    );
  }
  if (t === 'Posts') {
    const i = Object.keys(db.BIZ_SAMPLE).indexOf(id);
    return (
      <>
        {CO_POSTS.map(([tt, scene], j) => (
          <View key={j} style={{ padding: 14, borderRadius: 22, backgroundColor: C.s1, borderWidth: 1, borderColor: C.line, gap: 10 }}>
            <View style={[S.row, { gap: 10 }]}>
              <Avatar pic={p.photo} square size={36} />
              <View style={{ flex: 1 }}>
                <Txt s={14} w={8}>
                  {p.name}
                </Txt>
                <Txt s={11} c={C.muted}>
                  {['2h ago', 'Yesterday', '3 days ago', '1 week ago'][j % 4]}
                </Txt>
              </View>
            </View>
            <Txt s={14}>{tt}</Txt>
            <Pict pic={'scenes/' + scene} style={{ width: '100%', aspectRatio: 16 / 10, borderRadius: 16 }} />
            <View style={[S.row, { gap: 16 }]}>
              <View style={[S.row, { gap: 4 }]}>
                <Icon name="like" size={16} color={C.muted} />
                <Txt s={12} c={C.muted}>
                  {40 + j * 23 + i * 7}
                </Txt>
              </View>
              <View style={[S.row, { gap: 4 }]}>
                <Icon name="comment" size={16} color={C.muted} />
                <Txt s={12} c={C.muted}>
                  {3 + j * 2}
                </Txt>
              </View>
            </View>
          </View>
        ))}
      </>
    );
  }
  const js = db.POSTS.filter((x) => x.client === id);
  const ops = db.OPPS.filter((o) => o.biz === id);
  const ms = db.MENTORSHIPS.filter((m) => m.by === id);
  const A: [string, string, string][] = [
    ...js.map((j) => ['job', `Posted a vacancy: <b>${j.title}</b>`, j.time] as [string, string, string]),
    ...ops.map((o) => ['cap', `Published ${o.kind.toLowerCase()}: <b>${o.title}</b>`, 'This week'] as [string, string, string]),
    ...ms.map((m) => ['follow', `Started a mentorship: <b>${m.title}</b>`, 'This month'] as [string, string, string]),
    ['checkc', `Hired <b>${Math.max(2, Math.round((p.hires || 24) / 12))} people</b> through bolo`, 'This month'],
    ['star', `Received <b>${p.reviews} reviews</b> · ${p.rate} average`, 'All time'],
    ['verified', 'Became a <b>verified business</b>', '2025'],
  ];
  return (
    <Card>
      {A.map(([ic, tt, wh], n) => (
        <View key={n} style={[S.row, { gap: 10, alignItems: 'flex-start' }]}>
          <Icon name={ic} size={16} color={C.lav} style={{ marginTop: 2 }} />
          <Rich text={tt} style={{ flex: 1 }} c="#cfcfd4" />
          <Txt s={11} c={C.faint}>
            {wh}
          </Txt>
        </View>
      ))}
    </Card>
  );
}
export { StatusPill, sheet, bump };
