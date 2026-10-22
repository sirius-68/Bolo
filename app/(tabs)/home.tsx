import React, { useState } from 'react';
import { Pressable, ScrollView, View, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { db, ui } from '../../src/data/db';
import { CATS, STAGES, STAGE_COL, catIcon } from '../../src/data/catalog';
import { Avatar, Btn, Empty, Kpis, Pict, ProTag, Rich, StatusPill, Txt, tap } from '../../src/ui/kit';
import { Icon } from '../../src/ui/Icon';
import { C, S } from '../../src/ui/theme';
import { P, WORKERS, bizPct, budgetNum, curBiz, greet, bizName, isW, myOpps, myPhoto, openJobs, xaf, matchPerson, matchJob, nowT } from '../../src/logic/core';
import { useLive, bump } from '../../src/logic/live';
import { openBrowse, openProfile } from '../../src/logic/nav';
import { CatRail, LiveCards, Rail, Sec, TabHeader } from '../../src/components/common';
import { JobCard, OppCard, RecCard, WorkerCard } from '../../src/components/cards';
import { onScrollFab } from '../../src/components/NavBar';
import { openJob } from '../../src/sheets/work';
import { openAdCreate, openInvite, openStage, viewContract } from '../../src/sheets/business';
import { openBizSetup, openStatus } from '../../src/sheets/account';
import { openOppForm } from '../../src/sheets/career';
import { toast } from '../../src/ui/overlay';
import { adPct, adsOf } from '../../src/logic/career';
import { ST_C } from '../../src/data/catalog';

export default function Home() {
  useLive();
  return isW() || !curBiz() ? <MapHome /> : <BizHome />;
}

/* ---------------- Regular: map of jobs and people near you ---------------- */
const STAGE_W = 393;
const STAGE_H = 520;
const JOB_SLOTS = [
  [105, 165],
  [280, 135],
  [185, 238],
  [310, 300],
  [80, 335],
];
const PEOPLE = ['yann', 'njinda', 'emmanuel', 'fresh'];
const PEOPLE_SLOTS = [
  [70, 82],
  [227, 134],
  [323, 188],
  [38, 338],
];
function MapHome() {
  const ins = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const k = width / STAGE_W;
  const [mode, setMode] = useState<'jobs' | 'people'>(db.user.intents.includes('find') || !db.user.intents.includes('hire') ? 'jobs' : 'people');
  const cat = ui.cat;
  const jobs = openJobs().filter((p) => matchJob(p, '', cat));
  const people = WORKERS().filter((id) => matchPerson(id, '', cat));
  const match = jobs.filter((p) => db.user.skills.includes(p.cat!)).length;
  const pinPeople = PEOPLE.filter((id) => !cat || P(id).role === cat);
  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.bg }} onScroll={onScrollFab} scrollEventThrottle={32} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 + ins.bottom }}>
      <View style={{ height: STAGE_H * k + ins.top, overflow: 'hidden' }}>
        <Pict pic="img/map-bg" style={{ position: 'absolute', left: 0, top: 0, width, height: 612 * k + ins.top }} />
        <View style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 140 + ins.top, backgroundColor: 'rgba(0,0,0,.55)' }} />
        <Pict pic="img/radius" style={{ position: 'absolute', left: (229 - 130) * k, top: (322 - 130) * k + ins.top, width: 260 * k, height: 260 * k, opacity: 0.8 }} />
        {mode === 'jobs'
          ? jobs.slice(0, 5).map((po, i) => {
              const [x, y] = JOB_SLOTS[i];
              return (
                <Pressable
                  key={po.id}
                  accessibilityRole="button"
                  accessibilityLabel={`${po.title}, ${po.budget}`}
                  onPress={() => (tap(), openJob(po.id))}
                  style={{ position: 'absolute', left: x * k - 50, top: y * k + ins.top - 18, width: 100, alignItems: 'center' }}
                >
                  <View style={[S.row, { gap: 4, height: 30, paddingHorizontal: 8, borderRadius: 999, backgroundColor: po.urgent ? C.orange : C.yellow }]}>
                    <Icon name={catIcon(po.cat)} size={14} color="#000" />
                    <Txt s={12} w={8} c="#000">
                      {(po.budget || '').replace('XAF ', '').split(' · ')[0]}
                    </Txt>
                  </View>
                  <View style={{ marginTop: 3, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, backgroundColor: 'rgba(0,0,0,.7)' }}>
                    <Txt s={10} w={7} lines={1}>
                      {po.title}
                    </Txt>
                  </View>
                </Pressable>
              );
            })
          : pinPeople.map((id, i) => {
              const [x, y] = PEOPLE_SLOTS[i];
              const p = P(id);
              return (
                <Pressable key={id} accessibilityRole="button" accessibilityLabel={p.name} onPress={() => (tap(), openProfile(id))} style={{ position: 'absolute', left: x * k - 10, top: y * k + ins.top - 10, alignItems: 'center' }}>
                  <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, backgroundColor: 'rgba(0,0,0,.75)', marginBottom: 4 }}>
                    <Txt s={11} w={8}>
                      {p.short || p.name.split(' ')[0]} · {p.rate}★
                    </Txt>
                  </View>
                  <Avatar pic={p.pin || p.photo} size={44} ring={C.yellow} />
                </Pressable>
              );
            })}
        <View style={{ position: 'absolute', left: 229 * k - 24, top: 322 * k + ins.top - 24, alignItems: 'center' }} pointerEvents="none">
          <Avatar pic={myPhoto()} size={48} ring={C.blue} />
          <View style={{ marginTop: 3, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, backgroundColor: C.blue }}>
            <Txt s={10} w={8}>
              Me
            </Txt>
          </View>
        </View>
        <View style={{ position: 'absolute', left: 20, right: 20, top: ins.top }}>
          <TabHeader />
          <View style={{ flexDirection: 'row', marginTop: 8, padding: 4, borderRadius: 999, backgroundColor: 'rgba(20,20,22,.9)', alignSelf: 'flex-start' }}>
            {(
              [
                ['jobs', 'Jobs near me'],
                ['people', 'People to hire'],
              ] as const
            ).map(([m, l]) => (
              <Pressable key={m} accessibilityRole="tab" accessibilityState={{ selected: mode === m }} onPress={() => (tap(), setMode(m))} style={{ height: 36, paddingHorizontal: 16, borderRadius: 999, justifyContent: 'center', backgroundColor: mode === m ? C.yellow : 'transparent' }}>
                <Txt s={13} w={8} c={mode === m ? '#000' : C.text}>
                  {l}
                </Txt>
              </Pressable>
            ))}
          </View>
        </View>
        <View style={[S.row, { position: 'absolute', left: 20, bottom: 14, gap: 6, height: 34, paddingHorizontal: 12, borderRadius: 999, backgroundColor: 'rgba(20,20,22,.92)' }]}>
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: C.ok }} />
          <Txt s={12} w={7}>
            {mode === 'jobs' ? `${jobs.length} jobs near you${match ? ` · ${match} match you` : ''}` : `${people.length} people available near you`}
          </Txt>
        </View>
        <Pressable accessibilityLabel="Centre on me" onPress={() => toast('Location updated')} style={{ position: 'absolute', right: 20, bottom: 12, width: 40, height: 40, borderRadius: 20, backgroundColor: C.s1, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="gps" size={20} color={C.text} />
        </Pressable>
      </View>
      <View style={{ paddingHorizontal: 20 }}>
        <LiveCards />
        <CatRail
          value={cat}
          onChange={(c) => {
            ui.cat = c;
            bump();
          }}
        />
        <Sec title={mode === 'jobs' ? (cat ? `${cat} jobs` : 'Jobs for you') : cat ? `${cat}s near you` : 'Recommended people'} action="See all" onAction={() => openBrowse(mode)} />
        {mode === 'jobs' ? (
          jobs.length ? (
            <Rail>
              {jobs.slice(0, 10).map((po, i) => (
                <JobCard key={po.id} po={po} i={i} />
              ))}
            </Rail>
          ) : (
            <Empty title="No jobs in this category yet" text="Try another category, or turn on alerts from Settings → Notifications." />
          )
        ) : people.length ? (
          <View style={{ gap: 12 }}>
            <Rail>
              {people.slice(0, 8).map((id, i) => (
                <RecCard key={id} id={id} i={i} />
              ))}
            </Rail>
            <Rail>
              {people.slice(8, 16).map((id) => (
                <WorkerCard key={id} id={id} />
              ))}
            </Rail>
          </View>
        ) : (
          <Empty title="Nobody in this category yet" text="Post a job and people with that skill will send you offers." />
        )}
        {mode === 'people' ? (
          <Pressable onPress={() => router.push('/post-job')} style={[S.row, { gap: 12, marginTop: 18, padding: 16, borderRadius: 20, backgroundColor: C.lav }]}>
            <Icon name="job" size={22} color="#000" />
            <View style={{ flex: 1 }}>
              <Txt s={15} w={8} c="#000">
                Don’t want to search?
              </Txt>
              <Txt s={12} c="#222">
                Post a job — people nearby send you offers.
              </Txt>
            </View>
            <Icon name="chev" size={20} color="#000" />
          </Pressable>
        ) : null}
      </View>
    </ScrollView>
  );
}

/* ---------------- Business: hiring dashboard ---------------- */
function BizHome() {
  const ins = useSafeAreaInsets();
  const b = curBiz()!;
  const vac = db.POSTS.filter((p) => p.mine && p.as === 'business' && p.biz === db.BIZ.active);
  const apps = vac.flatMap((po) => (po.offerList || []).map((o, i) => ({ o, po, i })));
  apps.forEach(({ o, po }) => {
    o.stage = o.stage || 'applied';
    if (!o.seen) {
      o.seen = 1;
      b.events.unshift({ icon: 'follow', text: `<b>${P(o.by).name}</b> applied for <b>${po.title}</b>${o.cv ? ' · CV attached' : ''}`, at: nowT() });
    }
  });
  const cnt = (k: string) => apps.filter((a) => a.o.stage === k).length;
  const act = b.contracts.filter((c) => c.status === 'active');
  const wait = b.contracts.filter((c) => c.status === 'sent');
  const opps = myOpps();
  const pct = bizPct(b);
  const payroll = act.reduce((a, c) => a + budgetNum(c.pay), 0);
  const st = ST_C.find((s) => s[0] === db.PR.cst) || ST_C[0];
  const todo: [string, string, () => void][] = [
    ...(b.verified !== 'verified'
      ? ([[b.verified === 'review' ? 'timer' : 'verified', b.verified === 'review' ? 'Business verification in progress' : 'Verify your business to unlock contracts', () => (b.verified === 'review' ? toast('Usually takes a few minutes') : openBizSetup('edit', 3))]] as [string, string, () => void][])
      : []),
    ...vac
      .filter((po) => (po.offerList || []).some((o) => o.stage === 'applied'))
      .map((po) => {
        const n = po.offerList!.filter((o) => o.stage === 'applied').length;
        return ['follow', `${n} new applicant${n > 1 ? 's' : ''} for ${po.title}`, () => openJob(po.id, 'applied')] as [string, string, () => void];
      }),
    ...apps.filter((a) => a.o.stage === 'interview').map((a) => ['calcheck', `Interview with ${P(a.o.by).name} · tomorrow 10:00`, () => openJob(a.po.id, 'interview')] as [string, string, () => void]),
    ...wait.map((c) => ['file', `Contract waiting for ${P(c.person).name}’s signature`, () => viewContract(c.id)] as [string, string, () => void]),
    ...(pct < 100 ? ([['edit', `Finish your business page (${pct}%)`, () => openBizSetup('edit', !b.name || !b.sector || !b.about ? 1 : !b.address || !b.phone || !b.email ? 2 : 3)]] as [string, string, () => void][]) : []),
  ];
  const ads = adsOf();
  const live = ads.filter((a) => a.status === 'active');
  const Card = ({ children, style }: { children: React.ReactNode; style?: any }) => <View style={[{ padding: 14, borderRadius: 20, backgroundColor: C.s1, borderWidth: 1, borderColor: C.line }, style]}>{children}</View>;
  const Row = ({ icon, title, sub, right, onPress }: { icon: string; title: string; sub?: string; right?: React.ReactNode; onPress?: () => void }) => (
    <Pressable onPress={onPress} style={({ pressed }) => [S.row, { gap: 12, paddingVertical: 10, paddingHorizontal: 4, borderRadius: 12, backgroundColor: pressed ? C.s2 : 'transparent' }]}>
      <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: C.s2, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={icon} size={18} color={C.yellow} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Txt s={14} w={7} lines={2}>
          {title}
        </Txt>
        {sub ? (
          <Txt s={12} c={C.muted} lines={1}>
            {sub}
          </Txt>
        ) : null}
      </View>
      {right}
      <Icon name="chev" size={18} color={C.faint} />
    </Pressable>
  );
  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.bg }} onScroll={onScrollFab} scrollEventThrottle={32} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingTop: ins.top, paddingHorizontal: 20, paddingBottom: 120 + ins.bottom }}>
      <TabHeader />
      <View style={[S.rowB, { marginTop: 12, alignItems: 'flex-end' }]}>
        <Txt s={26} w={8} style={{ flex: 1, lineHeight: 30 }}>
          {greet()},{'\n'}
          {bizName(b)}
        </Txt>
        <Pressable onPress={openStatus} style={[S.row, { gap: 6, height: 32, paddingHorizontal: 12, borderRadius: 999, backgroundColor: C.s1 }]}>
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: st[3] }} />
          <Txt s={12} w={7} c={st[3]}>
            {st[1]}
          </Txt>
          <Icon name="down" size={12} color={st[3]} />
        </Pressable>
      </View>
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 16 }}>
        {(
          [
            ['job', 'Vacancy', () => router.push('/post-job')],
            ['cap', 'Internship', () => openOppForm('Internship')],
            ['sparkle', 'Program', () => openOppForm('Training program')],
            ['follow', 'Recruiter', openInvite],
          ] as [string, string, () => void][]
        ).map(([i, t, f]) => (
          <Pressable key={t} accessibilityRole="button" accessibilityLabel={`New ${t.toLowerCase()}`} onPress={() => (tap(), f())} style={({ pressed }) => ({ flex: 1, alignItems: 'center', gap: 6, paddingVertical: 12, borderRadius: 16, backgroundColor: pressed ? C.s2 : C.s1, borderWidth: 1, borderColor: C.line })}>
            <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: C.yellow, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name={i} size={18} color="#000" />
            </View>
            <Txt s={11} w={7}>
              {t}
            </Txt>
          </Pressable>
        ))}
      </View>
      <View style={{ marginTop: 16 }}>
        <Kpis
          items={[
            [vac.length, 'Open roles', () => router.push('/me')],
            [cnt('applied'), 'New applicants', () => openStage('applied')],
            [cnt('interview'), 'Interviews', () => openStage('interview')],
            [act.length, 'Active contracts'],
            [opps.reduce((a, o) => a + o.joined, 0), 'In programs'],
            [payroll ? Math.round(payroll / 1000) + 'k' : '0', 'Monthly payroll'],
          ]}
        />
      </View>
      {todo.length ? (
        <>
          <Sec title={`Needs your attention · ${todo.length}`} />
          <Card style={{ paddingVertical: 4 }}>
            {todo.slice(0, 5).map(([i, t, f]) => (
              <Row key={t} icon={i} title={t} onPress={f} />
            ))}
          </Card>
        </>
      ) : null}
      <Sec title="Hiring pipeline" action={`${apps.length} candidate${apps.length === 1 ? '' : 's'}`} />
      <Card>
        <View style={{ flexDirection: 'row', height: 10, borderRadius: 5, overflow: 'hidden', backgroundColor: C.s3 }}>
          {STAGES.map(([k]) => (cnt(k) ? <View key={k} style={{ flex: cnt(k), backgroundColor: STAGE_COL[k] }} /> : null))}
        </View>
        <View style={{ flexDirection: 'row', marginTop: 12 }}>
          {STAGES.map(([k, l]) => (
            <Pressable key={k} accessibilityRole="button" accessibilityLabel={`${l}: ${cnt(k)}`} onPress={() => openStage(k)} style={{ flex: 1, alignItems: 'center', gap: 2 }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: STAGE_COL[k] }} />
              <Txt s={16} w={8}>
                {cnt(k)}
              </Txt>
              <Txt s={10} c={C.muted} lines={1}>
                {l}
              </Txt>
            </Pressable>
          ))}
        </View>
      </Card>
      <Sec title="Open vacancies" action="+ Post" onAction={() => router.push('/post-job')} />
      {vac.length ? (
        <Card style={{ paddingVertical: 4 }}>
          {vac.map((po) => {
            const n = (po.offerList || []).length;
            const nw = (po.offerList || []).filter((o) => o.stage === 'applied').length;
            return (
              <Row
                key={po.id}
                icon={catIcon(po.cat)}
                title={po.title!}
                sub={`${po.type} · ${po.openings || 1} opening${(po.openings || 1) > 1 ? 's' : ''} · ${n} applicant${n === 1 ? '' : 's'}`}
                right={nw ? <StatusPill kind="blue" text={`${nw} new`} /> : null}
                onPress={() => openJob(po.id)}
              />
            );
          })}
        </Card>
      ) : (
        <Empty title="No open vacancies" text="Post a role and applicants will show up here.">
          <Btn small variant="yellow" title="Post a vacancy" style={{ marginTop: 12, alignSelf: 'center' }} onPress={() => router.push('/post-job')} />
        </Empty>
      )}
      <Sec title="Ads" action={ads.length ? 'Manage' : undefined} onAction={() => router.push('/ads')} />
      <Card>
        <View style={[S.row, { gap: 8 }]}>
          <Icon name="rocket" size={18} color={C.yellow} />
          <Txt s={15} w={8} style={{ flex: 1 }}>
            {live.length ? `${live.length} ad${live.length > 1 ? 's' : ''} running` : 'Reach more candidates'}
          </Txt>
          {db.user.pro.business ? <ProTag small text="−20%" /> : null}
        </View>
        {live.length ? (
          live.slice(0, 2).map((a) => (
            <View key={a.id} style={{ marginTop: 10 }}>
              <Txt s={13} w={7} lines={1}>
                {a.head}
              </Txt>
              <View style={{ height: 6, borderRadius: 3, backgroundColor: C.s3, marginTop: 6, overflow: 'hidden' }}>
                <View style={{ width: `${adPct(a)}%`, height: 6, backgroundColor: C.yellow }} />
              </View>
              <Txt s={11} c={C.muted} style={{ marginTop: 4 }}>
                {a.reached.toLocaleString('en-US')} of {a.reach.toLocaleString('en-US')} reached · {a.clicks} clicks · {a.apps} applicants
              </Txt>
            </View>
          ))
        ) : (
          <Txt s={13} c={C.muted} style={{ marginTop: 6 }}>
            Show your vacancies, programs and courses first on the map, feed and Career. You pay only for people reached.
          </Txt>
        )}
        <Btn small variant={live.length ? 'dark' : 'yellow'} icon="plus" title="Create an ad" style={{ marginTop: 12, alignSelf: 'flex-start' }} onPress={openAdCreate} />
      </Card>
      <Sec title="Programs & internships" action="+ Create" onAction={() => openOppForm()} />
      {opps.length ? (
        <Rail>
          {opps.map((o) => (
            <OppCard key={o.id} o={o} />
          ))}
        </Rail>
      ) : (
        <Pressable onPress={() => openOppForm('Internship')} style={[S.row, { gap: 12, padding: 16, borderRadius: 20, backgroundColor: C.s1, borderWidth: 1, borderColor: C.line }]}>
          <View style={{ flex: 1 }}>
            <Txt s={14} w={8}>
              Create your first internship
            </Txt>
            <Txt s={12} c={C.muted}>
              Train young talent — it shows in Career for everyone
            </Txt>
          </View>
          <Icon name="chev" size={20} color={C.muted} />
        </Pressable>
      )}
      <Sec
        title="Team & contracts"
        action="See all"
        onAction={() => {
          ui.meTab = 'Team';
          router.push('/me');
        }}
      />
      <Card>
        <View style={{ flexDirection: 'row' }}>
          {b.team.length ? (
            b.team.slice(0, 6).map((id, i) => <Avatar key={id} pic={P(id).photo} size={36} style={{ marginLeft: i ? -10 : 0, borderWidth: 2, borderColor: C.s1 }} />)
          ) : (
            <Txt s={13} c={C.muted}>
              Nobody yet — hire from a vacancy with a company contract.
            </Txt>
          )}
        </View>
        <View style={{ flexDirection: 'row', marginTop: 12 }}>
          {[
            [b.team.length, 'Team'],
            [wait.length, 'Awaiting signature'],
            [payroll ? xaf(payroll) : '—', 'Payroll / month'],
          ].map(([v, l]) => (
            <View key={l as string} style={{ flex: 1 }}>
              <Txt s={15} w={8}>
                {v}
              </Txt>
              <Txt s={11} c={C.muted}>
                {l}
              </Txt>
            </View>
          ))}
        </View>
      </Card>
      <Sec title="Recent activity" />
      {b.events.length ? (
        <Card style={{ gap: 12 }}>
          {b.events.slice(0, 8).map((e, i) => (
            <View key={i} style={[S.row, { gap: 10, alignItems: 'flex-start' }]}>
              <Icon name={e.icon} size={16} color={C.lav} style={{ marginTop: 2 }} />
              <Rich text={e.text} style={{ flex: 1 }} c="#cfcfd4" />
              <Txt s={11} c={C.faint}>
                {e.at}
              </Txt>
            </View>
          ))}
        </Card>
      ) : (
        <Empty title="Nothing yet" text="Applications, contracts and program sign-ups will show here." />
      )}
    </ScrollView>
  );
}
