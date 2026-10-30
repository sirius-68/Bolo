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
import { MapScreen } from '../../src/components/MapScreen';

export default function Home() {
  useLive();
  return isW() || !curBiz() ? <MapScreen /> : <BizHome />;
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
