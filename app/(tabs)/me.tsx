import React from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { db, ui, REELS } from '../../src/data/db';
import { DOCS, ST_C, ST_W, catIcon } from '../../src/data/catalog';
import { Avatar, Btn, Empty, IconBtn, PTabs, ProTag, Ring, StatusPill, Txt, Verified, tap } from '../../src/ui/kit';
import { Icon } from '../../src/ui/Icon';
import { C, S } from '../../src/ui/theme';
import { P, bizLogo, bizName, bizPct, curBiz, isPro, isW, myHandle, myCity, cityLabel, myPhoto, mySkill, myVacancies, myOpps, myCourses, xaf, postById, openJobs, has } from '../../src/logic/core';
import { bump, useLive } from '../../src/logic/live';
import { balance, heldTotal } from '../../src/logic/wallet';
import { followingCount, prItems, prPct, services } from '../../src/logic/account';
import { openProfile } from '../../src/logic/nav';
import { ListRow, ReelThumb } from '../../src/components/cards';
import { onScrollFab } from '../../src/components/NavBar';
import { openAccounts, openBizSetup, openEdit, openPro, openStatus, switchRole } from '../../src/sheets/account';
import { openArea, openBoost, openContacts, openDoc, openEdu, openExp, openFollows, openJobHistory, openLangs, openService, openSvcMenu, openTest, openVideo } from '../../src/sheets/profile';
import { openJob, sharePost } from '../../src/sheets/work';
import { openCourse, openOpp, openOppForm, openMentor } from '../../src/sheets/career';
import { openInvite, viewContract } from '../../src/sheets/business';
import { pickImage } from '../../src/logic/media';
import { toast } from '../../src/ui/overlay';
import { showPhone } from '../../src/data/countries';

export default function Me() {
  useLive();
  return isW() || !curBiz() ? <MeRegular /> : <MeBusiness />;
}

/* ---------------- shared pieces ---------------- */
function Card({ children, style }: { children: React.ReactNode; style?: any }) {
  return <View style={[{ padding: 14, borderRadius: 20, backgroundColor: C.s1, borderWidth: 1, borderColor: C.line, gap: 10 }, style]}>{children}</View>;
}
function H({ t, action, onAction }: { t: string; action?: string; onAction?: () => void }) {
  return (
    <View style={[S.rowB, { marginTop: 22, marginBottom: 10 }]}>
      <Txt s={17} w={8}>
        {t}
      </Txt>
      {action ? (
        <Pressable hitSlop={8} onPress={onAction} style={[S.row, { gap: 4 }]}>
          <Txt s={13} w={7} c={C.lav}>
            {action}
          </Txt>
        </Pressable>
      ) : null}
    </View>
  );
}
function KV({ k, v, mute }: { k: string; v: string; mute?: boolean }) {
  return (
    <View>
      <Txt s={11} c={C.muted}>
        {k}
      </Txt>
      <Txt s={14} w={7} c={mute ? C.faint : C.text}>
        {v}
      </Txt>
    </View>
  );
}
function AddTile({ t, onPress }: { t: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={[S.row, { gap: 10, padding: 14, borderRadius: 18, borderWidth: 1, borderStyle: 'dashed', borderColor: C.s3 }]}>
      <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: C.yellow, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name="plus" size={18} color="#000" />
      </View>
      <Txt s={14} w={7}>
        {t}
      </Txt>
    </Pressable>
  );
}
function Head({ pic, sq, name, handle, role, roleColor, bio, contact, stats, verified, onAvatar }: { pic: any; sq?: boolean; name: string; handle: string; role: string; roleColor: string; bio: string; contact: string; stats: [string | number, string, (() => void)?][]; verified?: boolean; onAvatar?: () => void }) {
  return (
    <View>
      <View style={[S.row, { gap: 14, marginTop: 10 }]}>
        <Pressable accessibilityLabel="Change photo" disabled={!onAvatar} onPress={onAvatar}>
          <Avatar pic={pic} square={sq} size={78} />
          {onAvatar ? (
            <View style={{ position: 'absolute', right: -2, bottom: -2, width: 26, height: 26, borderRadius: 13, backgroundColor: C.yellow, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: C.bg }}>
              <Icon name="camera" size={13} color="#000" />
            </View>
          ) : null}
        </Pressable>
        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={[S.row, { gap: 6 }]}>
            <Txt s={22} w={8} lines={1} style={{ flexShrink: 1 }}>
              {name}
            </Txt>
            {verified ? <Verified /> : null}
          </View>
          <Txt s={13} c={C.muted}>
            {handle}
          </Txt>
          <Pressable onPress={openStatus} accessibilityRole="button" accessibilityLabel={`Status: ${role}. Change`} style={[S.row, { gap: 6, alignSelf: 'flex-start', marginTop: 6, height: 28, paddingHorizontal: 10, borderRadius: 999, backgroundColor: C.s1 }]}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: roleColor }} />
            <Txt s={12} w={7} c={roleColor}>
              {role}
            </Txt>
            <Icon name="down" size={12} color={roleColor} />
          </Pressable>
        </View>
      </View>
      <Txt s={14} c="#d9d9de" style={{ marginTop: 12 }}>
        {bio}
      </Txt>
      <Txt s={12} c={C.muted} style={{ marginTop: 4 }}>
        {contact}
      </Txt>
      <View style={{ flexDirection: 'row', marginTop: 14, paddingVertical: 12, borderRadius: 18, backgroundColor: C.s1 }}>
        {stats.map(([v, l, f], i) => (
          <Pressable key={l} disabled={!f} onPress={f} style={{ flex: 1, alignItems: 'center', borderLeftWidth: i ? 1 : 0, borderLeftColor: C.line }}>
            <Txt s={18} w={8}>
              {v}
            </Txt>
            <Txt s={11} c={C.muted}>
              {l}
            </Txt>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
function TopRow() {
  const w = isW();
  const b = curBiz();
  return (
    <View style={[S.row, { gap: 10, paddingTop: 8 }]}>
      <Pressable accessibilityRole="button" accessibilityLabel="Switch profile" onPress={openAccounts} style={[S.row, { gap: 8, flex: 1, minWidth: 0, height: 44, paddingLeft: 4, paddingRight: 12, borderRadius: 999, backgroundColor: C.s1, alignSelf: 'flex-start' }]}>
        <Avatar pic={w || !b ? myPhoto() : bizLogo(b)} square={!w} size={36} />
        <View style={{ flexShrink: 1 }}>
          <Txt s={13} w={8} lines={1}>
            {w || !b ? db.user.name || 'My profile' : bizName(b)}
          </Txt>
          <Txt s={11} c={C.muted}>
            {w ? 'Regular' : 'Business'}
            {isPro() ? ' · PRO' : ''}
          </Txt>
        </View>
        <Icon name="down" size={14} color={C.muted} />
      </Pressable>
      <View style={{ flex: 1 }} />
      <IconBtn name="gear" ring label="Settings" onPress={() => router.push('/settings')} />
    </View>
  );
}
function SwitchAndPro() {
  const w = isW();
  const bo = db.user.bizOnly;
  const firstBiz = db.BIZ.list[0];
  return (
    <View style={{ gap: 8, marginTop: 14 }}>
      {!bo ? (
        <Pressable accessibilityRole="button" onPress={() => (tap(), w ? (firstBiz ? openAccounts() : openBizSetup('prompt')) : switchRole('worker'))} style={({ pressed }) => [S.row, { gap: 12, padding: 12, borderRadius: 18, backgroundColor: pressed ? C.s2 : C.s1, borderWidth: 1, borderColor: C.line }]}>
          <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: C.lav, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name={w ? 'storefront' : 'user'} size={20} color="#000" />
          </View>
          <View style={{ flex: 1 }}>
            <Txt s={14} w={8}>
              {w ? (firstBiz ? 'Switch to a business page' : 'Hiring for a company?') : 'Back to your Regular profile'}
            </Txt>
            <Txt s={12} c={C.muted}>
              {w ? (firstBiz ? `${db.BIZ.list.length} business page${db.BIZ.list.length > 1 ? 's' : ''} · post vacancies, internships, courses` : 'Set up a free business page. You keep this profile too') : 'Find work and hire for personal jobs'}
            </Txt>
          </View>
          <Icon name="chev" size={18} color={C.faint} />
        </Pressable>
      ) : null}
      <Pressable testID="me-wallet" accessibilityRole="button" onPress={() => (tap(), router.push('/wallet' as any))} style={({ pressed }) => [S.row, { gap: 12, padding: 12, borderRadius: 18, backgroundColor: pressed ? C.s2 : C.s1, borderWidth: 1, borderColor: C.line }]}>
        <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: C.mint, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="coins" size={20} color="#000" />
        </View>
        <View style={{ flex: 1 }}>
          <Txt s={14} w={8}>
            Wallet · {xaf(balance())}
          </Txt>
          <Txt s={12} c={C.muted}>
            {heldTotal() ? `${xaf(heldTotal())} held in escrow · add money or withdraw` : 'Add money, withdraw, pay safely with escrow'}
          </Txt>
        </View>
        <Icon name="chev" size={18} color={C.faint} />
      </Pressable>
      <Pressable accessibilityRole="button" onPress={() => openPro()} style={({ pressed }) => [S.row, { gap: 12, padding: 12, borderRadius: 18, backgroundColor: pressed ? C.s2 : C.s1, borderWidth: 1, borderColor: C.line }]}>
        <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: C.yellow, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="rocket" size={20} color="#000" />
        </View>
        <View style={{ flex: 1 }}>
          <Txt s={14} w={8}>
            {isPro() ? `bolo ${w ? 'Pro' : 'Business Pro'} · active` : `Upgrade to ${w ? 'Pro' : 'Business Pro'}`}
          </Txt>
          <Txt s={12} c={C.muted}>
            {isPro() ? 'Manage your plan' : w ? 'Get jobs faster, premium CV, profile boosts' : 'Cheaper ads, more businesses, featured company'}
          </Txt>
        </View>
        <Icon name="chev" size={18} color={C.faint} />
      </Pressable>
    </View>
  );
}
const PR_ACT: Record<string, () => void> = {
  photo: async () => {
    const p = await pickImage({ square: true });
    if (p) {
      db.user.avatar = p;
      bump();
      toast('Profile photo updated');
    }
  },
  edit: openEdit,
  contacts: () => openContacts('phone'),
  service: () => openService(services().find((s) => s.draft)?.id),
  test: () => openTest(),
  exp: () => openExp(),
  video: openVideo,
  langs: openLangs,
  doc: () => openDoc('id'),
};

/* ---------------- Regular ---------------- */
function MeRegular() {
  const ins = useSafeAreaInsets();
  const st = ST_W.find((s) => s[0] === db.PR.wst) || ST_W[0];
  const mj = db.POSTS.filter((p) => p.mine && p.as !== 'business');
  const mw = db.POSTS.filter((p) => p.by === 'me');
  const offers = Object.keys(db.myOffers);
  const hired = db.hired.filter((id) => P(id) && !P(id).client);
  const savedN = db.saved.length + db.savedPosts.length + db.savedJobs.length + db.savedOpps.length + db.savedCourses.length + db.savedMentors.length + db.savedCos.length;
  const acc = Object.values(db.myOffers).filter((o) => o.state === 'acc').length;
  const tabs: [string, string, number | null][] = [
    ['Profile', 'Profile', null],
    ['My jobs', 'My jobs', mj.length],
    ['Posts', 'Posts', mw.length + 4],
    ['Applications', 'Offers sent', offers.length],
    ...(hired.length ? ([['Hired', 'Hired', hired.length]] as [string, string, number][]) : []),
    ['Saved', 'Saved', savedN],
  ];
  if (!tabs.some((t) => t[0] === ui.meTab)) ui.meTab = 'Profile';
  const tab = ui.meTab;
  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.bg }} onScroll={onScrollFab} scrollEventThrottle={32} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingTop: ins.top, paddingHorizontal: 20, paddingBottom: 120 + ins.bottom }}>
      <TopRow />
      <Head
        pic={myPhoto()}
        name={db.user.name || 'Add your name'}
        handle={myHandle()}
        role={st[1]}
        roleColor={st[3]}
        verified={db.PR.docs.id === 'verified'}
        bio={db.user.bio || `${mySkill()} in ${myCity()} · ${db.user.years} years experience.`}
        contact={db.user.contact ? (db.user.contact.includes('@') ? db.user.contact : showPhone(db.user.contact)) : 'Add your email or phone'}
        onAvatar={PR_ACT.photo}
        stats={[
          [12 + acc, 'Jobs done', openJobHistory],
          ['1.2k', 'Followers', () => openFollows('Followers')],
          [followingCount(), 'Following', () => openFollows('Following')],
        ]}
      />
      <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
        <Btn variant="white" icon="edit" title="Edit profile" style={{ flex: 1 }} onPress={openEdit} />
        <Btn variant="dark" icon="share" title="Share" style={{ flex: 1 }} onPress={() => sharePost(db.user.name || 'my profile')} />
      </View>
      <SwitchAndPro />
      <PTabs
        style={{ marginTop: 18 }}
        items={tabs.map(([k, l, n]) => [k, l, n] as [string, string, number | null])}
        value={tab}
        onChange={(t) => {
          ui.meTab = t;
          bump();
        }}
      />
      <View style={{ marginTop: 6 }}>
        {tab === 'Profile' ? <ProfilePanel /> : null}
        {tab === 'My jobs' ? (
          <View style={{ gap: 10, marginTop: 10 }}>
            <AddTile t="Post a job" onPress={() => router.push('/post-job')} />
            {mj.map((po) => (
              <ListRow key={po.id} icon={catIcon(po.cat)} title={po.title!} sub={`${po.when} · ${po.area} · ${(po.offerList || []).length} offer${(po.offerList || []).length === 1 ? '' : 's'}`} pill={po.booked ? 'Booked' : 'Open'} pillKind={po.booked ? 'acc' : 'wait'} onPress={() => openJob(po.id)} />
            ))}
            {!mj.length ? <Empty title="No jobs posted yet" text="Post a personal job: a fix, a tutor, a driver. People near you send offers." /> : null}
          </View>
        ) : null}
        {tab === 'Posts' ? (
          <View style={{ marginTop: 10, gap: 10 }}>
            <AddTile t="Share your work" onPress={() => router.push('/new-post')} />
            {mw.map((x) => (
              <ListRow key={x.id} icon={x.kind === 'avail' ? 'clock' : 'post'} title={x.kind === 'avail' ? 'Availability' : 'Post'} sub={(x.text || '').slice(0, 90)} onPress={() => router.push('/feed')} />
            ))}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
              {(
                [
                  [0, 'Faucet repair'],
                  [1, 'Deep clean'],
                  [4, 'Brake service'],
                  [2, 'Solar install'],
                ] as [number, string][]
              ).map(([r, t]) => (REELS[r] ? <ReelThumb key={r} r={REELS[r]} i={r} title={t} width={'48%' as any} onPress={() => router.push(`/reels?i=${r}` as any)} /> : null))}
            </View>
          </View>
        ) : null}
        {tab === 'Applications' ? (
          offers.length ? (
            <View style={{ gap: 10, marginTop: 10 }}>
              {offers.map((id) => {
                const o = db.myOffers[id];
                const po = postById(id);
                if (!po) return null;
                const c = P(po.client!);
                return <ListRow key={id} pic={c.photo} square={!!c.biz} title={po.title!} sub={`${c.name} · ${o.price} · ${o.when}`} pill={o.state === 'acc' ? (po.biz ? 'Accepted' : 'Booked') : o.stage === 'interview' ? 'Interview' : o.stage === 'short' ? 'Shortlisted' : 'Waiting'} pillKind={o.state === 'acc' ? 'acc' : 'wait'} onPress={() => openJob(id)} />;
              })}
            </View>
          ) : (
            <Empty title="No offers yet" text="Open a job near you and send your first offer.">
              <Btn small variant="yellow" title="Browse jobs" style={{ marginTop: 12, alignSelf: 'center' }} onPress={() => ((ui.feedView = 'jobs'), router.push('/feed'))} />
            </Empty>
          )
        ) : null}
        {tab === 'Hired' ? (
          <View style={{ gap: 10, marginTop: 10 }}>
            {hired.map((id) => (
              <ListRow key={id} pic={P(id).photo} title={P(id).name} sub={`${P(id).role} · ${P(id).area}`} pill="Hired" pillKind="acc" onPress={() => openProfile(id)} />
            ))}
          </View>
        ) : null}
        {tab === 'Saved' ? <SavedPanel /> : null}
      </View>
    </ScrollView>
  );
}

function ProfilePanel() {
  const it = prItems();
  const miss = it.filter((x) => !x[1]);
  const pct = prPct();
  const c = db.PR.ct;
  const sv = services();
  const A = db.PR.area;
  const matchN = (s: string) => openJobs().filter((p) => p.cat === s).length;
  const Y = new Date().getFullYear();
  return (
    <View style={{ marginTop: 10 }}>
      <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        <Ring pct={pct} />
        <View style={{ flex: 1 }}>
          <Txt s={15} w={8}>
            {pct === 100 ? 'Your profile is complete 🎉' : 'Complete your profile'}
          </Txt>
          <Txt s={12} c={C.muted}>
            {pct === 100 ? 'People see you as a top, trusted profile.' : 'Complete profiles get up to 3× more job offers.'}
          </Txt>
        </View>
      </Card>
      {miss.length ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
          {miss.slice(0, 4).map(([t, , k]) => (
            <Pressable key={t} accessibilityRole="button" onPress={() => PR_ACT[k]?.()} style={[S.row, { gap: 6, height: 34, paddingHorizontal: 12, borderRadius: 999, backgroundColor: C.s2 }]}>
              <Icon name="plus" size={14} color={C.yellow} />
              <Txt s={12} w={7}>
                {t}
              </Txt>
            </Pressable>
          ))}
        </View>
      ) : null}
      <H t="Skill verification" />
      <Card>
        <Txt s={13} c={C.muted}>
          Pass a short test, verified skills get a badge and rank higher.
        </Txt>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          {db.user.skills.map((s) => (
            <View key={s} style={[S.row, { gap: 4, height: 30, paddingHorizontal: 10, borderRadius: 999, backgroundColor: db.PR.tests[s] === 'passed' ? 'rgba(47,179,109,.18)' : C.s2 }]}>
              {db.PR.tests[s] === 'passed' ? <Icon name="verified" size={14} color={C.mint} /> : null}
              <Txt s={12} w={7}>
                {s}
              </Txt>
            </View>
          ))}
          <Pressable accessibilityLabel="Edit skills" onPress={() => router.push('/skills?mode=edit' as any)} style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: C.s3, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="plus" size={14} color="#fff" />
          </Pressable>
        </View>
        <Btn variant="yellow" icon="exam" title="Take a skill test" onPress={() => openTest()} />
      </Card>
      <H t="My services" action="+ Add service" onAction={() => openService()} />
      <View style={{ gap: 10 }}>
        {sv.map((s) =>
          s.draft ? (
            <Card key={s.id}>
              <Pressable onPress={() => openService(s.id)}>
                <Txt s={12} c={C.muted}>
                  {s.skill}
                </Txt>
                <View style={[S.row, { gap: 6 }]}>
                  <Txt s={15} w={8} c={C.orange}>
                    Not published
                  </Txt>
                  <Icon name="warn" size={16} color={C.orange} />
                </View>
                <Txt s={12} c={C.muted}>
                  Add a price to start getting jobs
                </Txt>
              </Pressable>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Btn small variant="yellow" title="Complete" onPress={() => openService(s.id)} />
                <Btn small variant="ghost" title="Options" onPress={() => openSvcMenu(s.id)} />
              </View>
            </Card>
          ) : (
            <Card key={s.id} style={{ opacity: s.pub ? 1 : 0.7 }}>
              <Pressable onPress={() => openService(s.id)} style={[S.row, { gap: 10 }]}>
                <View style={{ flex: 1 }}>
                  <Txt s={12} c={C.muted}>
                    {s.pub ? 'Service' : 'Hidden from search'} · {s.where}
                  </Txt>
                  <View style={[S.row, { gap: 6 }]}>
                    <Txt s={16} w={8}>
                      {s.skill}
                    </Txt>
                    {s.boost ? <StatusPill kind="blue" text="Boosted" /> : null}
                  </View>
                  <Txt s={13}>
                    {s.price ? xaf(+s.price) : 'Price on request'} · {s.unit}
                  </Txt>
                </View>
                <Pressable accessibilityLabel="Service options" hitSlop={8} onPress={() => openSvcMenu(s.id)}>
                  <Icon name="dots" size={20} color={C.muted} />
                </Pressable>
              </Pressable>
              <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                <Btn small variant="dark" icon="rocket" title={s.boost ? `${s.boost} day${s.boost > 1 ? 's' : ''} of boost left` : 'Boost'} onPress={() => openBoost(s.id)} />
                <Btn
                  small
                  variant="dark"
                  title={`${matchN(s.skill)} matching job${matchN(s.skill) === 1 ? '' : 's'}`}
                  onPress={() => {
                    ui.cat = s.skill;
                    ui.feedView = 'jobs';
                    router.push('/feed');
                  }}
                />
              </View>
            </Card>
          ),
        )}
      </View>
      <H t="Work area" />
      <Card>
        <KV k="Lives in" v={[A.home, cityLabel()].filter(Boolean).join(', ') || 'Not set'} />
        <KV k="Travels up to" v={`${A.radius} km from where you are`} />
        <Btn small variant="dark" title="Edit" style={{ alignSelf: 'flex-start' }} onPress={openArea} />
      </Card>
      <H t="Contact info" action="Edit" onAction={() => openContacts()} />
      <Card>
        {(
          [
            ['phone', 'phone', 'Phone number', c.phone ? showPhone(c.phone) : 'Add your number'],
            ['email', 'mail', 'Email', c.email || 'Add your email'],
            ['whatsapp', 'wa', 'WhatsApp', c.whatsapp ? showPhone(c.whatsapp) : 'Not added'],
          ] as [string, string, string, string][]
        ).map(([k, i, l, v]) => (
          <Pressable key={k} onPress={() => openContacts(k)} style={[S.row, { gap: 12 }]}>
            <Icon name={i} size={18} color={c[k] ? C.yellow : C.faint} />
            <View style={{ flex: 1 }}>
              <Txt s={11} c={C.muted}>
                {l}
              </Txt>
              <Txt s={14} w={7} c={c[k] ? C.text : C.faint}>
                {v}
              </Txt>
            </View>
            <Icon name="chev" size={16} color={C.faint} />
          </Pressable>
        ))}
        <Txt s={12} c={C.muted}>
          🔒 People see your contacts only after you agree to work together.
        </Txt>
      </Card>
      <H t="Work experience" action={db.PR.exp.length ? '+ Add' : undefined} onAction={() => openExp()} />
      {db.PR.exp.length ? (
        <Card>
          {db.PR.exp.map((e, i) => (
            <Pressable key={i} onPress={() => openExp(i)} style={[S.row, { gap: 12, alignItems: 'flex-start' }]}>
              <Icon name="job" size={18} color={C.yellow} style={{ marginTop: 2 }} />
              <View style={{ flex: 1 }}>
                <Txt s={14} w={8}>
                  {e.role}
                </Txt>
                <Txt s={12} c={C.muted}>
                  {e.org} · {e.from} – {e.to || 'now'} · {Math.max(1, (e.to || Y) - e.from)} yr{(e.to || Y) - e.from > 1 ? 's' : ''}
                </Txt>
                {e.desc ? (
                  <Txt s={13} c="#d9d9de" style={{ marginTop: 2 }}>
                    {e.desc}
                  </Txt>
                ) : null}
              </View>
              <Icon name="edit" size={16} color={C.faint} />
            </Pressable>
          ))}
        </Card>
      ) : (
        <Card>
          <Txt s={14} w={7}>
            Add your experience and achievements. People will see what you can do
          </Txt>
          <Btn small variant="yellow" title="Add" style={{ alignSelf: 'flex-start' }} onPress={() => openExp()} />
        </Card>
      )}
      <H t="Education & courses" action="Edit" onAction={openEdu} />
      <Card>
        <KV k="Level" v={db.PR.edu.level} />
        {db.PR.edu.courses.length ? db.PR.edu.courses.map((x, i) => <KV key={i} k="Course / certificate" v={`${x.name} · ${x.org}${x.year ? ' · ' + x.year : ''}`} />) : <KV k="Courses & certificates" v="Add a training or certificate to stand out" mute />}
      </Card>
      <H t="Documents" />
      <View style={{ gap: 8 }}>
        {Object.entries(DOCS)
          .filter(([k]) => k !== 'biz')
          .map(([k, [t, i, s]]) => {
            const st = db.PR.docs[k];
            return <ListRow key={k} icon={i} title={t} sub={s} pill={st === 'verified' ? 'Verified' : st === 'review' ? 'In review' : 'Add'} pillKind={st === 'verified' ? 'acc' : st === 'review' ? 'wait' : 'blue'} onPress={() => openDoc(k)} />;
          })}
      </View>
      {db.PR.video ? (
        <>
          <H t="Intro video" />
          <Card style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
            <Avatar pic={myPhoto()} size={60} square />
            <View style={{ flex: 1 }}>
              <Txt s={14} w={8}>
                Your intro video · {db.PR.video.dur}
              </Txt>
              <Txt s={12} c={C.muted}>
                Shown on your profile. Recorded {db.PR.video.at}.
              </Txt>
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                <Btn small variant="dark" title="Re-record" onPress={openVideo} />
                <Btn
                  small
                  variant="ghost"
                  title="Delete"
                  onPress={() => {
                    db.PR.video = null;
                    bump();
                    toast('Intro video deleted');
                  }}
                />
              </View>
            </View>
          </Card>
        </>
      ) : !db.PR.vidHide ? (
        <Card style={{ marginTop: 22 }}>
          <View style={S.rowB}>
            <Txt s={15} w={8}>
              Self-introduction video
            </Txt>
            <Pressable
              accessibilityLabel="Hide"
              hitSlop={8}
              onPress={() => {
                db.PR.vidHide = true;
                bump();
              }}
            >
              <Icon name="x" size={18} color={C.muted} />
            </Pressable>
          </View>
          <Txt s={13} c={C.muted}>
            Record a short video about your experience and skills
          </Txt>
          <Btn small variant="dark" icon="record" title="Record" style={{ alignSelf: 'flex-start' }} onPress={openVideo} />
        </Card>
      ) : null}
      <H t="Languages" action="Edit" onAction={openLangs} />
      <Card style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        {db.PR.langs.length ? (
          db.PR.langs.map(([l, v]) => (
            <View key={l} style={{ height: 30, paddingHorizontal: 10, borderRadius: 999, backgroundColor: C.s2, justifyContent: 'center' }}>
              <Txt s={12} w={7}>
                {l}, {v.toLowerCase()}
              </Txt>
            </View>
          ))
        ) : (
          <Txt s={13} c={C.faint}>
            Not specified
          </Txt>
        )}
      </Card>
    </View>
  );
}

function SavedPanel() {
  const sj = db.savedJobs.map((id) => postById(id)).filter(Boolean) as NonNullable<ReturnType<typeof postById>>[];
  const so = db.savedOpps.map((id) => db.OPPS.find((o) => o.id === id)).filter(Boolean) as typeof db.OPPS;
  const sc = db.savedCourses.map((id) => db.COURSES.find((o) => o.id === id)).filter(Boolean) as typeof db.COURSES;
  const sm = db.savedMentors.map((id) => db.MENTORSHIPS.find((o) => o.id === id)).filter(Boolean) as typeof db.MENTORSHIPS;
  const any = sj.length + so.length + sc.length + sm.length + db.saved.length + db.savedCos.length + db.savedPosts.length;
  if (!any) return <Empty title="Nothing saved yet" text="Tap the bookmark on a job, person, course or program to keep it here." />;
  return (
    <View style={{ gap: 10, marginTop: 10 }}>
      {sj.map((po) => (
        <ListRow key={po.id} pic={P(po.client!).photo} title={po.title!} sub={`${po.cat} · ${po.budget}`} pill="Job" onPress={() => openJob(po.id)} />
      ))}
      {db.saved.map((id) => (
        <ListRow key={id} pic={P(id).photo} title={P(id).name} sub={`${P(id).role} · ${P(id).area}`} pill="Person" pillKind="blue" onPress={() => openProfile(id)} />
      ))}
      {db.savedCos.map((id) => (
        <ListRow key={id} pic={P(id).photo} square title={P(id).name} sub={db.BIZ_SAMPLE[id]?.sector || 'Company'} pill="Company" pillKind="blue" onPress={() => openProfile(id)} />
      ))}
      {so.map((o) => (
        <ListRow key={o.id} icon="cap" title={o.title} sub={`${o.kind} · ${o.pay}`} pill={o.kind} onPress={() => openOpp(o.id)} />
      ))}
      {sc.map((c) => (
        <ListRow key={c.id} pic={c.prov.logo} square title={c.title} sub={`${c.prov.n} · ${c.price ? xaf(c.price) : 'Free'}`} pill="Course" onPress={() => openCourse(c.id)} />
      ))}
      {sm.map((m) => (
        <ListRow key={m.id} icon="follow" title={m.title} sub={`${m.format} · ${m.price}`} pill="Mentorship" onPress={() => openMentor(m.id)} />
      ))}
      {db.savedPosts.length ? (
        <Txt s={13} c={C.muted}>
          {db.savedPosts.length} saved post{db.savedPosts.length > 1 ? 's' : ''}. Find them in the feed with the bookmark on.
        </Txt>
      ) : null}
    </View>
  );
}

/* ---------------- Business ---------------- */
function MeBusiness() {
  const ins = useSafeAreaInsets();
  const b = curBiz()!;
  const v = myVacancies();
  const o = myOpps();
  const cs = myCourses();
  const st = ST_C.find((s) => s[0] === db.PR.cst) || ST_C[0];
  const savedN = db.saved.length + db.savedCos.length + db.savedMentors.length + db.savedCourses.length;
  const tabs: [string, string, number | null][] = [
    ['Company', 'Company', null],
    ['Vacancies', 'Vacancies', v.length],
    ['Programs', 'Programs', o.length + cs.length],
    ['Team', 'Team', b.team.length],
    ['Saved', 'Saved', savedN],
  ];
  if (!tabs.some((t) => t[0] === ui.meTab)) ui.meTab = 'Company';
  const tab = ui.meTab;
  const pct = bizPct(b);
  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.bg }} onScroll={onScrollFab} scrollEventThrottle={32} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingTop: ins.top, paddingHorizontal: 20, paddingBottom: 120 + ins.bottom }}>
      <TopRow />
      <Head
        pic={bizLogo(b)}
        sq
        name={bizName(b)}
        handle={'@' + (b.name ? b.name.toLowerCase().replace(/[^a-z0-9]+/g, '.').replace(/^\.|\.$/g, '') : 'yourbusiness')}
        role={st[1]}
        roleColor={st[3]}
        verified={b.verified === 'verified'}
        bio={b.about || 'Add a short description of your business'}
        contact={[b.sector, b.area && b.area + ', ' + b.city].filter(Boolean).join(' · ') || 'Add your sector and location'}
        stats={[
          [v.length, 'Open roles', () => ((ui.meTab = 'Vacancies'), bump())],
          [b.team.length, 'Team', () => ((ui.meTab = 'Team'), bump())],
          [o.length + cs.length, 'Programs', () => ((ui.meTab = 'Programs'), bump())],
        ]}
      />
      <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
        <Btn variant="white" icon="edit" title="Edit page" style={{ flex: 1 }} onPress={() => openBizSetup('edit', 1)} />
        <Btn variant="yellow" icon="job" title="Post a vacancy" style={{ flex: 1 }} onPress={() => router.push('/post-job')} />
      </View>
      <SwitchAndPro />
      <PTabs
        style={{ marginTop: 18 }}
        items={tabs}
        value={tab}
        onChange={(t) => {
          ui.meTab = t;
          bump();
        }}
      />
      <View style={{ marginTop: 10, gap: 10 }}>
        {tab === 'Company' ? (
          <>
            {pct < 100 ? (
              <Pressable onPress={() => openBizSetup('edit', !b.name || !b.sector || !b.about ? 1 : !b.address || !b.phone || !b.email ? 2 : 3)} style={[S.row, { gap: 12, padding: 14, borderRadius: 20, backgroundColor: C.s1, borderWidth: 1, borderColor: C.line }]}>
                <Ring pct={pct} size={52} />
                <View style={{ flex: 1 }}>
                  <Txt s={14} w={8}>
                    Finish your business page
                  </Txt>
                  <Txt s={12} c={C.muted}>
                    Complete pages get up to 5× more applicants
                  </Txt>
                </View>
                <Icon name="chev" size={18} color={C.faint} />
              </Pressable>
            ) : null}
            {b.verified !== 'verified' ? (
              <Pressable onPress={() => (b.verified === 'review' ? toast('We’re checking your documents, usually a few minutes') : openBizSetup('edit', 3))} style={[S.row, { gap: 12, padding: 14, borderRadius: 20, backgroundColor: 'rgba(255,179,122,.12)', borderWidth: 1, borderColor: 'rgba(255,179,122,.4)' }]}>
                <Icon name={b.verified === 'review' ? 'timer' : 'verified'} size={22} color={C.orange} />
                <View style={{ flex: 1 }}>
                  <Txt s={14} w={8}>
                    {b.verified === 'review' ? 'Verification in progress' : 'Verify your business'}
                  </Txt>
                  <Txt s={12} c={C.muted}>
                    {b.verified === 'review' ? 'You’ll be able to send company contracts once it’s done' : 'Add your RCCM and NIU to unlock company contracts and the verified badge'}
                  </Txt>
                </View>
                <Icon name="chev" size={18} color={C.faint} />
              </Pressable>
            ) : null}
            <H t="Company page" action="Edit" onAction={() => openBizSetup('edit', 1)} />
            <Card>
              <KV k="Sector · size" v={`${b.sector || 'Add a sector'} · ${b.size || 'Team size'}`} mute={!b.sector} />
              <KV k="About" v={b.about || 'Tell candidates what you do'} mute={!b.about} />
              <KV k="Location" v={`${b.address ? b.address + ', ' : ''}${b.area ? b.area + ', ' : ''}${b.city}`} />
              <KV k="Contact" v={[b.phone ? showPhone(b.phone) : '', b.email, b.web].filter(Boolean).join(' · ') || 'Add a phone or email'} mute={!b.phone && !b.email} />
              <KV k="Registration" v={b.rccm ? `RCCM ${b.rccm} · NIU ${b.niu.replace(/.(?=.{4})/g, '•')}` : 'Not added yet'} mute={!b.rccm} />
            </Card>
            <H t="Recruiters" action="+ Invite" onAction={openInvite} />
            <Card>
              {[{ n: db.user.name || 'You', r: 'Owner', pending: 0 }, ...b.recruiters].map((m, i) => (
                <View key={i} style={[S.row, { gap: 12 }]}>
                  <Avatar pic={i === 0 ? myPhoto() : null} size={38} />
                  <View style={{ flex: 1 }}>
                    <Txt s={14} w={8}>
                      {m.n}
                    </Txt>
                    <Txt s={12} c={C.muted}>
                      {m.r}
                      {m.pending ? ' · invite pending' : ''}
                    </Txt>
                  </View>
                </View>
              ))}
            </Card>
          </>
        ) : null}
        {tab === 'Vacancies' ? (
          <>
            <AddTile t="Post a vacancy" onPress={() => router.push('/post-job')} />
            {v.map((po) => {
              const n = (po.offerList || []).length;
              const h = (po.offerList || []).filter((x) => x.stage === 'hired').length;
              return <ListRow key={po.id} icon={catIcon(po.cat)} title={po.title!} sub={`${po.type} · ${po.openings || 1} opening${(po.openings || 1) > 1 ? 's' : ''} · ${po.area}`} pill={h ? `${h} hired` : `${n} applicant${n === 1 ? '' : 's'}`} pillKind={h ? 'acc' : 'wait'} onPress={() => openJob(po.id)} />;
            })}
            {!v.length ? <Empty title="No vacancies yet" text="Post your first role, applicants land here." /> : null}
          </>
        ) : null}
        {tab === 'Programs' ? (
          <>
            <AddTile t="Create an internship, program or course" onPress={() => openOppForm()} />
            {o.map((x) => (
              <ListRow key={x.id} icon="cap" title={x.title} sub={`${x.kind} · ${x.dur} · ${x.mode}`} pill={`${x.joined}/${x.seats} joined`} onPress={() => openOpp(x.id)} />
            ))}
            {cs.map((c) => (
              <ListRow key={c.id} icon="file" title={c.title} sub={`Course · ${c.dur} · ${c.price ? xaf(c.price) : 'Free'}`} pill={`${(c.people || []).length} student${(c.people || []).length === 1 ? '' : 's'}`} onPress={() => openCourse(c.id)} />
            ))}
            {!o.length && !cs.length ? <Empty title="No programs yet" text="Internships, apprenticeships, trainings and courses you create show in Career for everyone." /> : null}
          </>
        ) : null}
        {tab === 'Team' ? (
          <>
            {b.contracts.length ? (
              <>
                <Txt s={13} w={7} c={C.muted}>
                  Contracts
                </Txt>
                {b.contracts.map((k) => (
                  <ListRow key={k.id} pic={P(k.person).photo} title={`${P(k.person).name} · ${k.role}`} sub={`${k.pay} · ${k.dur} · starts ${k.start}`} pill={k.status === 'active' ? 'Active' : k.status === 'ended' ? 'Ended' : 'Waiting to sign'} pillKind={k.status === 'active' ? 'acc' : k.status === 'ended' ? 'urg' : 'wait'} onPress={() => viewContract(k.id)} />
                ))}
              </>
            ) : null}
            <Txt s={13} w={7} c={C.muted}>
              Team · {b.team.length}
            </Txt>
            {b.team.length ? (
              b.team.map((id) => <ListRow key={id} pic={P(id).photo} title={P(id).name} sub={`${P(id).role} · under contract`} onPress={() => openProfile(id)} />)
            ) : (
              <Empty title="Nobody on your team yet" text="Hire from a vacancy with a company contract and they’ll appear here." />
            )}
          </>
        ) : null}
        {tab === 'Saved' ? <SavedPanel /> : null}
      </View>
    </ScrollView>
  );
}
export { has, ProTag };
