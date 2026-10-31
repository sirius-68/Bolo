import React, { useEffect, useRef, useState } from 'react';
import { Animated, FlatList, Pressable, ScrollView, View, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { db, ui, REELS, Post } from '../../src/data/db';
import { Avatar, Btn, Empty, Txt, logoPic, tap } from '../../src/ui/kit';
import { showStories } from '../../src/components/Stories';
import { Icon } from '../../src/ui/Icon';
import { C, S } from '../../src/ui/theme';
import { P, cityLabel, curBiz, bizName, fCount, isW, listJobs, listPeople, matchJob, matchPerson, postVisible, sortJobs, sortPeople } from '../../src/logic/core';
import { bump, useLive } from '../../src/logic/live';
import { openBrowse, openProfile } from '../../src/logic/nav';
import { notchScale, Rail, SearchBar, Sec, TabHeader } from '../../src/components/common';
import { MentorCard, PersonRow, PostCard, RecCard, ReelThumb, ReqPost, JobCard } from '../../src/components/cards';
import { onScrollFab } from '../../src/components/NavBar';
import { openFilters, resetFilters } from '../../src/sheets/filters';
import { openService } from '../../src/sheets/profile';
import { services } from '../../src/logic/account';
import { toast } from '../../src/ui/overlay';

type FV = 'all' | 'jobs' | 'people' | 'mentors';
/** Height of the header row (avatar, name, icons) the bubble starts below. */
const HEADER_ROW = 60;
const BUBBLE_SPACE = 54;
type Item = { k: string; po?: Post; id?: string; pair?: string[] };

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
        ['jobs', 'Jobs'],
        ['people', 'People'],
        ['mentors', 'Mentors'],
      ]
    : [
        ['all', 'All'],
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
      <Txt s={28} w={8} style={{ marginTop: 14, lineHeight: 32 }}>
        {w ? (findOnly ? 'Find work and\nclients near you' : hireOnly ? 'What do you need\ndone today?' : 'Get hired. Get help.\nRight near you.') : `Find talent for\n${bizName(curBiz())}`}
      </Txt>
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
      <View style={{ marginTop: 16 }}>
        <SearchBar
          value={ui.q}
          onChange={(t) => {
            ui.q = t;
            bump();
          }}
          placeholder={v === 'jobs' ? 'Search jobs: title, company, area…' : v === 'people' ? 'Search people: name, skill, area…' : v === 'mentors' ? 'Search mentors or topics' : 'Search developers, tutors, plumbers…'}
          onFilter={v === 'mentors' ? undefined : () => openFilters(v === 'jobs' || (v === 'all' && findOnly) ? 'jobs' : 'people')}
          filters={nf}
        />
      </View>
      {w && v === 'all' && !q ? <QuickStart findFirst={!hireOnly} offerToo={!hireOnly} needToo={!findOnly} /> : null}
      <View style={{ flexDirection: 'row', gap: 6, marginTop: 14, padding: 4, borderRadius: 14, backgroundColor: C.s1 }}>
        {views.map(([k, l]) => (
          <Pressable key={k} accessibilityRole="tab" accessibilityState={{ selected: v === k }} onPress={() => (tap(), setV(k))} style={{ flex: 1, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: v === k ? C.blue : 'transparent' }}>
            <Txt s={13} w={v === k ? 8 : 6}>
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
      ) : (
        <Txt s={13} w={6} c={C.muted} style={{ marginTop: 16, marginBottom: 10 }}>
          {count} {noun[count === 1 ? 0 : 1]} {q ? `for “${ui.q.trim()}”` : v === 'mentors' ? 'on bolo' : 'near you'}
        </Txt>
      )}
    </View>
  );

  const render = ({ item }: { item: Item }) => {
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

type Ad = { id: string; who: string; title: string; text: string; cta: string; bg: string; fg: string; sub: string; go: () => void; grad: [string, string]; icon: string; skip: number };
const ADS: Ad[] = [
  { id: 'njei', who: '', title: 'Njeiforbi is hiring', text: 'Sales reps and delivery riders near you. Apply in minutes.', cta: 'See jobs', bg: C.blue, fg: '#fff', sub: '#e3e7ff', grad: ['#3d5af1', '#1b2a9b'], icon: 'job', skip: 5, go: () => ((ui.feedView = 'jobs'), (ui.q = ''), bump(), toast('Showing open jobs')) },
  { id: 'care', who: 'b_care', title: 'CarePlus Clinic needs nurses', text: 'Day shifts in Great Soppo. Interviews this week.', cta: 'Apply', bg: C.mint, fg: '#000', sub: '#1d3b2b', grad: ['#2fbf7a', '#0f6e45'], icon: 'cat-health', skip: 3, go: () => openProfile('b_care') },
  { id: 'sma', who: 'b_sma', title: 'Frontend bootcamp, 8 weeks', text: 'Free sponsored places at Silicon Mountain Academy.', cta: 'Join', bg: C.lav, fg: '#000', sub: '#26294a', grad: ['#7c5cff', '#3b1fa8'], icon: 'cap', skip: 0, go: () => openProfile('b_sma') },
  { id: 'sav', who: 'b_savanna', title: 'Drivers wanted', text: 'Savanna Logistics: licence C, regular routes, monthly pay.', cta: 'See role', bg: C.orange, fg: '#000', sub: '#3b1d0c', grad: ['#ff8a3d', '#c2410c'], icon: 'cat-driver', skip: 5, go: () => openProfile('b_savanna') },
  { id: 'volta', who: 'b_volta', title: 'Solar installers wanted', text: 'Volta Solar trains you on the job. Start next month.', cta: 'Apply', bg: C.yellow, fg: '#000', sub: '#3a3815', grad: ['#f6ee5c', '#e3c400'], icon: 'cat-electrician', skip: 3, go: () => openProfile('b_volta') },
];

/** Opens an ad full screen, story style. The close button appears after the seconds the business paid for. */
function openAd(a: Ad) {
  showStories([{ key: a.id, colors: a.grad, icon: a.icon, sponsor: a.who ? { name: P(a.who).name, pic: P(a.who).photo } : { name: 'Njeiforbi', pic: logoPic('NJ', '#3d5af1', '#fff') }, chip: 'Sponsored', title: a.title, text: a.text, cta: a.cta, onCta: a.go, dark: a.bg === C.yellow }], { closeAfter: a.skip });
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
                {a.who ? <Avatar pic={P(a.who).photo} square size={24} /> : null}
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
            <View style={{ paddingHorizontal: 16, height: 40, borderRadius: 20, backgroundColor: a.bg === C.yellow ? '#000' : a.bg === C.blue ? C.yellow : '#000', justifyContent: 'center' }}>
              <Txt s={13} w={8} c={a.bg === C.blue ? '#000' : '#fff'}>
                {a.cta}
              </Txt>
            </View>
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
