import React, { useRef } from 'react';
import { FlatList, Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { db, ui, REELS, Post } from '../../src/data/db';
import { Btn, Empty, Txt, tap } from '../../src/ui/kit';
import { Icon } from '../../src/ui/Icon';
import { C, S } from '../../src/ui/theme';
import { P, cityLabel, curBiz, bizName, fCount, isW, listJobs, listPeople, matchJob, matchPerson, postVisible, sortJobs, sortPeople } from '../../src/logic/core';
import { bump, useLive } from '../../src/logic/live';
import { openBrowse } from '../../src/logic/nav';
import { CatRail, LiveCards, Rail, SearchBar, Sec, TabHeader } from '../../src/components/common';
import { MentorCard, PersonRow, PostCard, RecCard, ReelThumb, ReqPost, JobCard } from '../../src/components/cards';
import { onScrollFab } from '../../src/components/NavBar';
import { openFilters, resetFilters } from '../../src/sheets/filters';
import { toast } from '../../src/ui/overlay';

type FV = 'all' | 'jobs' | 'people' | 'mentors';
type Item = { k: string; po?: Post; id?: string; pair?: string[] };

export default function Feed() {
  useLive();
  const ins = useSafeAreaInsets();
  const w = isW();
  const list = useRef<FlatList<Item>>(null);
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

  const header = (
    <View style={{ paddingTop: ins.top }}>
      <TabHeader reels />
      <Txt s={28} w={8} style={{ marginTop: 14, lineHeight: 32 }}>
        {w ? 'Let’s find the right\nperson near you' : `Find talent for\n${bizName(curBiz())}`}
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
          placeholder={v === 'jobs' ? 'Search jobs — title, company, area…' : v === 'people' ? 'Search people — name, skill, area…' : v === 'mentors' ? 'Search mentors or topics' : 'Search developers, tutors, plumbers…'}
          onFilter={v === 'mentors' ? undefined : () => openFilters(v === 'jobs' || (v === 'all' && findOnly) ? 'jobs' : 'people')}
          filters={nf}
        />
      </View>
      <View style={{ flexDirection: 'row', gap: 6, marginTop: 14, padding: 4, borderRadius: 14, backgroundColor: C.s1 }}>
        {views.map(([k, l]) => (
          <Pressable key={k} accessibilityRole="tab" accessibilityState={{ selected: v === k }} onPress={() => (tap(), setV(k))} style={{ flex: 1, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: v === k ? C.blue : 'transparent' }}>
            <Txt s={13} w={v === k ? 8 : 6}>
              {l}
            </Txt>
          </Pressable>
        ))}
      </View>
      <CatRail
        value={cat}
        onChange={(c) => {
          ui.cat = c;
          bump();
        }}
      />
      {v === 'all' ? (
        <>
          <LiveCards />
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
  return (
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
      onScroll={onScrollFab}
      scrollEventThrottle={32}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      showsVerticalScrollIndicator={false}
      initialNumToRender={6}
      windowSize={7}
      maxToRenderPerBatch={6}
    />
  );
}

function Promo() {
  const w = isW();
  return (
    <View style={[S.row, { gap: 12, marginTop: 16, padding: 16, borderRadius: 22, backgroundColor: C.blue }]}>
      <View style={{ flex: 1 }}>
        {w ? (
          <View style={{ alignSelf: 'flex-start', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4, backgroundColor: 'rgba(255,255,255,.25)', marginBottom: 4 }}>
            <Txt s={10} w={8}>
              Sponsored
            </Txt>
          </View>
        ) : null}
        <Txt s={16} w={8}>
          {w ? 'Njeiforbi is hiring' : `Hiring for ${bizName(curBiz())}?`}
        </Txt>
        <Txt s={12} c="#e3e7ff">
          {w ? 'Sales reps and delivery riders near you — apply in minutes.' : 'Post a vacancy or create an internship — people near you apply in minutes.'}
        </Txt>
      </View>
      <Btn
        small
        variant="yellow"
        title={w ? 'See jobs' : 'Post'}
        onPress={() => {
          if (w) {
            ui.feedView = 'jobs';
            ui.q = '';
            bump();
            toast('Showing open jobs');
          } else router.push('/post-job');
        }}
      />
    </View>
  );
}
