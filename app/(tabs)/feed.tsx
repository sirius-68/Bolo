import React, { useEffect, useRef, useState } from 'react';
import { Animated, FlatList, Pressable, ScrollView, View, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { db, ui, REELS, Post } from '../../src/data/db';
import { Avatar, Btn, Empty, Txt, tap } from '../../src/ui/kit';
import { showStories } from '../../src/components/Stories';
import { Icon } from '../../src/ui/Icon';
import { C, S } from '../../src/ui/theme';
import { P, has, fname, myPhoto, postById, cityLabel, curBiz, bizName, fCount, isW, listJobs, listPeople, matchJob, matchPerson, postVisible, sortJobs, sortPeople } from '../../src/logic/core';
import { bump, useLive } from '../../src/logic/live';
import { openBrowse, openProfile } from '../../src/logic/nav';
import { notchScale, Rail, SearchBar, Sec, TabHeader } from '../../src/components/common';
import { StatusRow } from '../../src/components/StatusRow';
import { follow } from '../../src/logic/work';
import { MentorCard, PersonRow, PostCard, RecCard, ReelThumb, ReqPost, JobCard } from '../../src/components/cards';
import { onScrollFab } from '../../src/components/NavBar';
import { openFilters, resetFilters } from '../../src/sheets/filters';
import { openService } from '../../src/sheets/profile';
import { openJob } from '../../src/sheets/work';
import { openOpp } from '../../src/sheets/career';
import { services } from '../../src/logic/account';
import { toast } from '../../src/ui/overlay';

type FV = 'all' | 'feed' | 'jobs' | 'people' | 'mentors';
/** Height of the header row (avatar, name, icons) the bubble starts below. */
const HEADER_ROW = 60;
const BUBBLE_SPACE = 54;
type Item = { k: string; po?: Post; id?: string; pair?: string[]; sp?: 'compose' | 'reels' | 'follow'; from?: number };

export default function Feed() {
  useLive();
  const ins = useSafeAreaInsets();
  const w = isW();
  const list = useRef<FlatList<Item>>(null);
  const scrollY = useRef(new Animated.Value(0)).current;
  const lastY = useRef(0);
  const small = useRef(false);
  // Businesses don't take jobs, so they get Talent / Mentors instead of Jobs.
  const views: [FV, string][] = w
    ? [
        ['all', 'All'],
        ['feed', 'Feed'],
        ['jobs', 'Jobs'],
        ['people', 'People'],
        ['mentors', 'Mentors'],
      ]
    : [
        ['all', 'All'],
        ['feed', 'Feed'],
        ['people', 'Talent'],
        ['mentors', 'Mentors'],
      ];
  if (!views.some((x) => x[0] === ui.feedView)) ui.feedView = 'all';
  const v = ui.feedView as FV;
  const q = ui.q.trim().toLowerCase();
  const cat = ui.cat;
  const setV = (k: FV) => {
    ui.feedView = k;
    bump();
    list.current?.scrollToOffset({ offset: 0, animated: false });
  };
  const mentors = db.MENTORSHIPS.filter((m) => (!q || (m.title + ' ' + m.field + ' ' + m.desc).toLowerCase().includes(q)) && (!cat || m.field === cat));

  let items: Item[];
  if (v === 'jobs') items = sortJobs(listJobs().filter((p) => matchJob(p, q, cat))).map((po) => ({ k: po.id, po }));
  else if (v === 'people') items = sortPeople(listPeople().filter((id) => matchPerson(id, q, cat))).map((id) => ({ k: id, id }));
  else if (v === 'mentors') {
    items = [];
    for (let i = 0; i < mentors.length; i += 2) items.push({ k: 'm' + mentors[i].id, pair: mentors.slice(i, i + 2).map((m) => m.id) });
  } else if (v === 'feed') {
    // Only work people share (no job requests), people you follow first, like a social feed.
    const W = db.POSTS.filter(postVisible)
      .filter((p) => p.kind !== 'request' && (!q || (p.text || '').toLowerCase().includes(q) || (P(p.by || '')?.name || '').toLowerCase().includes(q)) && (!cat || P(p.by || '')?.role === cat))
      .map((p, i) => ({ p, i, f: p.by === 'me' ? 2 : has(db.followed, p.by || '') ? 1 : 0 }))
      .sort((a, b) => b.f - a.f || a.i - b.i)
      .map((x) => x.p);
    items = [{ k: 'compose', sp: 'compose' }];
    W.forEach((po, i) => {
      items.push({ k: po.id, po });
      if (i === 2) items.push({ k: 'reels1', sp: 'reels', from: 0 });
      if (i === 6) items.push({ k: 'follow', sp: 'follow' });
      if (i === 11) items.push({ k: 'reels2', sp: 'reels', from: 3 });
    });
    if (W.length && W.length <= 2) items.push({ k: 'reels1', sp: 'reels', from: 0 });
  } else {
    let L = db.POSTS.filter(postVisible).filter((p) => (p.kind === 'request' ? matchJob(p, q, cat) : !q || (p.text || '').toLowerCase().includes(q) || (P(p.by || '')?.name || '').toLowerCase().includes(q)));
    if (cat) L = L.filter((p) => (p.kind === 'request' ? p.cat === cat : P(p.by || '')?.role === cat));
    if (!w) L = L.slice().sort((a, b) => (b.mine || 0) - (a.mine || 0));
    items = L.map((po) => ({ k: po.id, po }));
  }

  const people = listPeople().filter((id) => matchPerson(id, q, cat));
  const jobs = listJobs().filter((p) => matchJob(p, q, cat));
  const nf = fCount();
  const noun = v === 'jobs' ? ['job', 'jobs'] : v === 'people' ? (w ? ['person', 'people'] : ['candidate', 'candidates']) : ['mentorship', 'mentorships'];
  const count = v === 'mentors' ? mentors.length : items.length;
  const findOnly = w && db.user.intents.includes('find') && !db.user.intents.includes('hire');
  const hireOnly = w && db.user.intents.includes('hire') && !db.user.intents.includes('find');

  const header = (
    <View style={{ paddingTop: ins.top }}>
      <TabHeader />
      <StatusRow />
      {!db.demo && !(db.PREF as any).sampleSeen ? (
        <View testID="early-note" style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 14, padding: 12, borderRadius: 16, backgroundColor: C.s1, borderWidth: 1, borderColor: C.line }}>
          <Icon name="sparkle" size={18} color={C.lav} />
          <Txt s={12} c={C.muted} style={{ flex: 1 }}>
            Early access: the listings below are examples while bolo grows{cityLabel() ? ` in ${cityLabel()}` : ' near you'}. Your own posts and profile are real.
          </Txt>
          <Pressable accessibilityRole="button" accessibilityLabel="Dismiss" hitSlop={10} onPress={() => (((db.PREF as any).sampleSeen = true), bump())}>
            <Icon name="x" size={16} color={C.muted} />
          </Pressable>
        </View>
      ) : null}
      <View style={{ marginTop: 14 }}>
        <SearchBar
          value={ui.q}
          onChange={(t) => {
            ui.q = t;
            bump();
          }}
          placeholder={v === 'feed' ? 'Search posts and people' : v === 'jobs' ? 'Search jobs: title, company, area…' : v === 'people' ? 'Search people: name, skill, area…' : v === 'mentors' ? 'Search mentors or topics' : 'Search developers, tutors, plumbers…'}
          onFilter={v === 'mentors' || v === 'feed' ? undefined : () => openFilters(v === 'jobs' || (v === 'all' && findOnly) ? 'jobs' : 'people')}
          filters={nf}
        />
      </View>
      {w && v === 'all' && !q ? <QuickStart findFirst={!hireOnly} offerToo={!hireOnly} needToo={!findOnly} /> : null}
      <View style={{ flexDirection: 'row', gap: 6, marginTop: 14, padding: 4, borderRadius: 14, backgroundColor: C.s1 }}>
        {views.map(([k, l]) => (
          <Pressable key={k} accessibilityRole="tab" accessibilityState={{ selected: v === k }} onPress={() => (tap(), setV(k))} style={{ flex: 1, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: v === k ? C.blue : 'transparent' }}>
            <Txt s={views.length > 4 ? 12 : 13} w={v === k ? 8 : 6} lines={1}>
              {l}
            </Txt>
          </Pressable>
        ))}
      </View>
      {v === 'all' ? (
        <>
          <Promo />
          <Sec title={findOnly ? 'Jobs for you' : w ? 'Recommended for you' : 'Talent near you'} action="See all" onAction={() => openBrowse(findOnly ? 'jobs' : 'people')} />
          {findOnly ? (
            <Rail>
              {jobs.slice(0, 8).map((po, i) => (
                <JobCard key={po.id} po={po} i={i} />
              ))}
            </Rail>
          ) : (
            <Rail>
              {people.slice(0, 10).map((id, i) => (
                <RecCard key={id} id={id} i={i} />
              ))}
            </Rail>
          )}
          <Sec title="Work in action" action="Watch all" onAction={() => router.push('/reels?i=0' as any)} />
          <Rail>
            {REELS.map((r, i) => (
              <ReelThumb key={i} r={r} i={i} onPress={() => router.push(`/reels?i=${i}` as any)} />
            ))}
          </Rail>
          <Sec title={q || cat ? `${items.length} result${items.length === 1 ? '' : 's'}` : 'Recent posts'} />
        </>
      ) : v === 'feed' ? (
        <View style={{ height: 14 }} />
      ) : (
        <Txt s={13} w={6} c={C.muted} style={{ marginTop: 16, marginBottom: 10 }}>
          {count} {noun[count === 1 ? 0 : 1]} {q ? `for “${ui.q.trim()}”` : v === 'mentors' ? 'on bolo' : 'near you'}
        </Txt>
      )}
    </View>
  );

  const render = ({ item }: { item: Item }) => {
    if (item.sp === 'compose') return <Composer />;
    if (item.sp === 'reels')
      return (
        <View style={{ marginBottom: 18 }}>
          <Sec title={item.from ? 'More work in action' : 'Work in action'} action="Watch all" onAction={() => router.push(`/reels?i=${item.from || 0}` as any)} style={{ marginTop: 4 }} />
          <Rail>
            {[...REELS.slice(item.from || 0), ...REELS.slice(0, item.from || 0)].map((r) => {
              const i = REELS.indexOf(r);
              return <ReelThumb key={i} r={r} i={i} onPress={() => router.push(`/reels?i=${i}` as any)} />;
            })}
          </Rail>
        </View>
      );
    if (item.sp === 'follow') return <FollowSuggest />;
    if (item.pair)
      return (
        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 10 }}>
          {item.pair.map((id) => {
            const m = db.MENTORSHIPS.find((x) => x.id === id)!;
            return <MentorCard key={id} m={m} width="48%" />;
          })}
        </View>
      );
    if (item.id)
      return (
        <View style={{ marginBottom: 10 }}>
          <PersonRow id={item.id} />
        </View>
      );
    return <View style={{ marginBottom: 14 }}>{item.po!.kind === 'request' ? <ReqPost po={item.po!} /> : <PostCard po={item.po!} />}</View>;
  };

  const filtered = !!(q || cat || nf);
  const onScroll = (e: any) => {
    const y = e.nativeEvent.contentOffset.y;
    scrollY.setValue(y);
    // Shrink a little while scrolling down, back to full size when scrolling up.
    const down = y > lastY.current + 4 && y > 24;
    const up = y < lastY.current - 4 || y < 24;
    if (down && !small.current) {
      small.current = true;
      Animated.spring(notchScale, { toValue: 0.82, useNativeDriver: true, speed: 16, bounciness: 8 }).start();
    } else if (up && small.current) {
      small.current = false;
      Animated.spring(notchScale, { toValue: 1, useNativeDriver: true, speed: 14, bounciness: 12 }).start();
    }
    lastY.current = y;
  };
  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
    <FlatList
      ref={list}
      style={{ flex: 1, backgroundColor: C.bg }}
      contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 120 + ins.bottom }}
      data={items}
      keyExtractor={(i) => i.k}
      renderItem={render}
      ListHeaderComponent={header}
      ListEmptyComponent={
        <Empty title={filtered ? 'Nothing matches' : 'Nothing here yet'} text={filtered ? 'Try another word, category or fewer filters.' : undefined}>
          {filtered ? (
            <Btn
              small
              variant="dark"
              title="Clear search & filters"
              style={{ marginTop: 12, alignSelf: 'center' }}
              onPress={() => {
                ui.q = '';
                ui.cat = null;
                resetFilters();
              }}
            />
          ) : null}
        </Empty>
      }
      onScroll={onScroll}
      scrollEventThrottle={16}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      showsVerticalScrollIndicator={false}
      initialNumToRender={6}
      windowSize={7}
      maxToRenderPerBatch={6}
    />
    </View>
  );
}

type Ad = { id: string; who: string; title: string; text: string; cta: string; bg: string; fg: string; sub: string; grad: [string, string]; icon: string; skip: number; job?: string; opp?: string };
/** Every ad leads to the real listing: a job you can apply to, or a program you can join. */
const ADS: Ad[] = [
  { id: 'njei', who: 'b_njei', job: 'v_njei', title: 'Njeiforbi is hiring', text: 'Sales reps and delivery riders near you. Apply in minutes.', cta: 'See job', bg: C.blue, fg: '#fff', sub: '#e3e7ff', grad: ['#3d5af1', '#1b2a9b'], icon: 'job', skip: 5 },
  { id: 'care', who: 'b_care', job: 'v3', title: 'CarePlus Clinic needs nurses', text: 'Day shifts in Great Soppo. Interviews this week.', cta: 'Apply', bg: C.mint, fg: '#000', sub: '#1d3b2b', grad: ['#2fbf7a', '#0f6e45'], icon: 'cat-health', skip: 3 },
  { id: 'sma', who: 'b_sma', opp: 'o4', title: 'Frontend bootcamp, 8 weeks', text: 'Free sponsored places at Silicon Mountain Academy.', cta: 'Join', bg: C.lav, fg: '#000', sub: '#26294a', grad: ['#7c5cff', '#3b1fa8'], icon: 'cap', skip: 0 },
  { id: 'sav', who: 'b_savanna', job: 'v2_4', title: 'Drivers wanted', text: 'Savanna Logistics: licence C, regular routes, monthly pay.', cta: 'See role', bg: C.orange, fg: '#000', sub: '#3b1d0c', grad: ['#ff8a3d', '#c2410c'], icon: 'cat-driver', skip: 5 },
  { id: 'volta', who: 'b_volta', job: 'v2_3', title: 'Solar installers wanted', text: 'Volta Solar trains you on the job. Start next month.', cta: 'Apply', bg: C.yellow, fg: '#000', sub: '#3a3815', grad: ['#f6ee5c', '#e3c400'], icon: 'cat-electrician', skip: 3 },
];
/** Opens the job (apply) or program (join) page behind an ad. */
function goAd(a: Ad) {
  if (a.opp) openOpp(a.opp);
  else if (a.job && postById(a.job)) openJob(a.job);
  else openProfile(a.who);
}
function openAd(a: Ad) {
  showStories([{ key: a.id, colors: a.grad, icon: a.icon, sponsor: { name: P(a.who).name, pic: P(a.who).photo }, chip: 'Sponsored', title: a.title, text: a.text, cta: a.cta, onCta: () => goAd(a), dark: a.bg === C.yellow }], { closeAfter: a.skip });
}

/** Sponsored ads from businesses, as a swipeable carousel that moves on by itself. */
function Promo() {
  const w = isW();
  const { width } = useWindowDimensions();
  const cardW = width - 40;
  const ref = useRef<ScrollView>(null);
  const [at, setAt] = useState(0);
  const held = useRef(false);
  useEffect(() => {
    if (!w) return;
    const t = setInterval(() => {
      if (held.current) return;
      setAt((i) => {
        const n = (i + 1) % ADS.length;
        ref.current?.scrollTo({ x: n * (cardW + 10), animated: true });
        return n;
      });
    }, 5000);
    return () => clearInterval(t);
  }, [w, cardW]);
  if (!w)
    return (
      <View style={[S.row, { gap: 12, marginTop: 16, padding: 16, borderRadius: 22, backgroundColor: C.blue }]}>
        <View style={{ flex: 1 }}>
          <Txt s={16} w={8}>
            {`Hiring for ${bizName(curBiz())}?`}
          </Txt>
          <Txt s={12} c="#e3e7ff">
            Post a vacancy or create an internship. People near you apply in minutes.
          </Txt>
        </View>
        <Btn small variant="yellow" title="Post" onPress={() => router.push('/post-job')} />
      </View>
    );
  return (
    <View style={{ marginTop: 16 }}>
      <ScrollView
        ref={ref}
        testID="ads-carousel"
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={cardW + 10}
        decelerationRate="fast"
        disableIntervalMomentum
        style={{ marginHorizontal: -20 }}
        contentContainerStyle={{ paddingHorizontal: 20, gap: 10 }}
        onScrollBeginDrag={() => (held.current = true)}
        onMomentumScrollEnd={(e) => {
          setAt(Math.round(e.nativeEvent.contentOffset.x / (cardW + 10)));
          held.current = false;
        }}
      >
        {ADS.map((a) => (
          <Pressable key={a.id} accessibilityRole="button" accessibilityLabel={`Sponsored. ${a.title}. ${a.text}`} onPress={() => (tap(), openAd(a))} style={[S.row, { width: cardW, minHeight: 116, gap: 12, padding: 16, borderRadius: 22, backgroundColor: a.bg }]}>
            <View style={{ flex: 1 }}>
              <View style={[S.row, { gap: 8, marginBottom: 6 }]}>
                <Avatar pic={P(a.who).photo} square size={24} />
                <View style={{ paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4, backgroundColor: a.fg === '#fff' ? 'rgba(255,255,255,.25)' : 'rgba(0,0,0,.12)' }}>
                  <Txt s={10} w={8} c={a.fg}>
                    Sponsored
                  </Txt>
                </View>
              </View>
              <Txt s={16} w={8} c={a.fg} lines={1}>
                {a.title}
              </Txt>
              <Txt s={12} c={a.sub} lines={2}>
                {a.text}
              </Txt>
            </View>
            <Pressable testID={`ad-cta-${a.id}`} accessibilityRole="button" accessibilityLabel={`${a.cta}: ${a.title}`} hitSlop={6} onPress={() => (tap(), goAd(a))} style={({ pressed }) => ({ paddingHorizontal: 16, height: 40, borderRadius: 20, backgroundColor: a.bg === C.blue ? C.yellow : '#000', justifyContent: 'center', transform: [{ scale: pressed ? 0.95 : 1 }] })}>
              <Txt s={13} w={8} c={a.bg === C.blue ? '#000' : '#fff'}>
                {a.cta}
              </Txt>
            </Pressable>
          </Pressable>
        ))}
      </ScrollView>
      <View style={[S.row, { justifyContent: 'center', gap: 5, marginTop: 10 }]}>
        {ADS.map((a, i) => (
          <View key={a.id} style={{ width: i === at ? 18 : 6, height: 6, borderRadius: 3, backgroundColor: i === at ? C.text : C.s3 }} />
        ))}
      </View>
    </View>
  );
}

/** Two big doors into the app's main intents: get something done, or get booked for what you do. */
function QuickStart({ findFirst, offerToo, needToo }: { findFirst: boolean; offerToo: boolean; needToo: boolean }) {
  const need = needToo ? (
    <Pressable key="need" testID="qs-need" accessibilityRole="button" onPress={() => (tap(), router.push('/post-job'))} style={{ flex: 1, minHeight: 84, padding: 14, borderRadius: 20, backgroundColor: C.yellow, justifyContent: 'space-between' }}>
      <Icon name="job" size={22} color="#000" />
      <View>
        <Txt s={15} w={8} c="#000">
          Need it done?
        </Txt>
        <Txt s={11} c="#000" style={{ opacity: 0.7 }} lines={2}>
          Post in a minute, get offers nearby
        </Txt>
      </View>
    </Pressable>
  ) : null;
  const offer = offerToo ? (
    <Pressable key="offer" testID="qs-offer" accessibilityRole="button" onPress={() => (tap(), services().some((x) => x.pub) ? setFeedJobs() : openService())} style={{ flex: 1, minHeight: 84, padding: 14, borderRadius: 20, backgroundColor: C.lav, justifyContent: 'space-between' }}>
      <Icon name="wrench" size={22} color="#000" />
      <View>
        <Txt s={15} w={8} c="#000">
          {services().some((x) => x.pub) ? 'Find gigs' : 'Get booked'}
        </Txt>
        <Txt s={11} c="#000" style={{ opacity: 0.7 }} lines={2}>
          {services().some((x) => x.pub) ? 'Open jobs that match your skills' : 'List your service and price'}
        </Txt>
      </View>
    </Pressable>
  ) : null;
  return <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>{findFirst ? [offer, need] : [need, offer]}</View>;
}
function setFeedJobs() {
  ui.feedView = 'jobs';
  ui.q = '';
  bump();
}

/** "Share your work" bar at the top of the Feed, like a social app's composer. */
function Composer() {
  return (
    <Pressable testID="feed-compose" accessibilityRole="button" accessibilityLabel="Share your work" onPress={() => (tap(), router.push('/new-post'))} style={({ pressed }) => [S.row, { gap: 12, marginBottom: 16, padding: 10, borderRadius: 22, backgroundColor: pressed ? C.s2 : C.s1, borderWidth: 1, borderColor: C.line }]}>
      <Avatar pic={myPhoto()} size={40} />
      <Txt s={14} c={C.muted} style={{ flex: 1 }}>
        {isW() ? 'Share your work…' : 'Share a company update…'}
      </Txt>
      <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: C.s2, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name="image" size={18} color={C.yellow} />
      </View>
    </Pressable>
  );
}
/** People worth following, shown between posts. */
function FollowSuggest() {
  const L = listPeople().filter((id) => !has(db.followed, id)).slice(0, 8);
  if (!L.length) return null;
  return (
    <View style={{ marginBottom: 18 }}>
      <Sec title="People to follow" action="See all" onAction={() => openBrowse('people')} style={{ marginTop: 4 }} />
      <Rail>
        {L.map((id) => {
          const p = P(id);
          return (
            <View key={id} style={{ width: 140, padding: 12, borderRadius: 20, backgroundColor: C.s1, borderWidth: 1, borderColor: C.line, alignItems: 'center', gap: 4 }}>
              <Pressable accessibilityRole="button" onPress={() => openProfile(id)} style={{ alignItems: 'center', gap: 4 }}>
                <Avatar pic={p.photo} size={56} />
                <Txt s={14} w={8} lines={1}>
                  {fname(p.name)}
                </Txt>
                <Txt s={11} c={C.muted} lines={1}>
                  {p.role}
                </Txt>
              </Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel={`Follow ${p.name}`} onPress={() => (tap(), follow(id))} style={{ marginTop: 6, alignSelf: 'stretch', height: 34, borderRadius: 17, backgroundColor: C.yellow, alignItems: 'center', justifyContent: 'center' }}>
                <Txt s={13} w={8} c="#000">
                  Follow
                </Txt>
              </Pressable>
            </View>
          );
        })}
      </Rail>
    </View>
  );
}
