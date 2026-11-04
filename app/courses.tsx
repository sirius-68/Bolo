import React, { useEffect, useState } from 'react';
import { FlatList, Pressable, ScrollView, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { db, Course } from '../src/data/db';
import { COURSE_CATS } from '../src/data/catalog';
import { Btn, Empty, IconBtn, PTabs, Txt, goBack, tap } from '../src/ui/kit';
import { Icon } from '../src/ui/Icon';
import { C, S } from '../src/ui/theme';
import { bump, useLive } from '../src/logic/live';
import { SearchBar } from '../src/components/common';
import { CourseWelcome, needsCourseWelcome } from '../src/components/CourseWelcome';
import { CourseRow, CourseTile } from '../src/components/CourseListing';
import { ratingOf } from '../src/logic/reviews';
import { isFree, recentCourses, savedCourses } from '../src/logic/listings';
import { courseF, openCourseFilters } from '../src/sheets/filters';

const SORTS = ['Relevant', 'Top rated', 'Free first', 'Cheapest'] as const;

/** Courses are listings: each opens on the school's own website. Explore, or see what you saved. */
export default function Courses() {
  useLive();
  const { cat, tab: t0 } = useLocalSearchParams<{ cat?: string; tab?: string }>();
  const ins = useSafeAreaInsets();
  const saved = savedCourses();
  const [tab, setTab] = useState<'explore' | 'saved'>(t0 === 'saved' || t0 === 'mine' ? 'saved' : 'explore');
  const [intro, setIntro] = useState(needsCourseWelcome());
  useEffect(() => {
    courseF.cat = cat || '';
    bump();
  }, [cat]);
  return (
    <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: ins.top }}>
      <View style={{ paddingHorizontal: 20, gap: 12, paddingBottom: 4 }}>
        <View style={[S.row, { gap: 10, paddingTop: 6 }]}>
          <IconBtn name="back" label="Back" onPress={goBack} />
          <Txt s={22} w={8} style={{ flex: 1 }}>
            Courses
          </Txt>
          <IconBtn testID="courses-create" name="plus" bg={C.yellow} color="#000" label="List your course" onPress={() => router.push('/teach' as any)} />
        </View>
        <PTabs
          items={[
            ['explore', 'Explore'],
            ['saved', 'Saved', saved.length],
          ]}
          value={tab}
          onChange={setTab}
        />
      </View>
      {tab === 'saved' ? <Saved list={saved} onExplore={() => setTab('explore')} bottom={ins.bottom} /> : <Explore bottom={ins.bottom} />}
      {intro ? <CourseWelcome onDone={() => setIntro(false)} /> : null}
    </View>
  );
}

function Saved({ list, onExplore, bottom }: { list: Course[]; onExplore: () => void; bottom: number }) {
  const recent = recentCourses().filter((c) => !list.includes(c)).slice(0, 6);
  if (!list.length && !recent.length)
    return (
      <View style={{ flex: 1, paddingHorizontal: 20, justifyContent: 'center', paddingBottom: 80 + bottom }}>
        <Empty title="Nothing saved yet" text="Tap the bookmark on any course to keep it here for later.">
          <Btn variant="yellow" icon="search" title="Explore courses" onPress={onExplore} style={{ marginTop: 16, alignSelf: 'stretch' }} />
        </Empty>
      </View>
    );
  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 40 + bottom, gap: 10 }}>
      {list.length ? <Head t="Saved" n={list.length} /> : null}
      {list.map((c) => (
        <CourseRow key={c.id} c={c} />
      ))}
      {recent.length ? <Head t="Recently opened" n={recent.length} /> : null}
      {recent.map((c) => (
        <CourseRow key={c.id} c={c} />
      ))}
    </ScrollView>
  );
}
function Head({ t, n }: { t: string; n: number }) {
  return (
    <View style={[S.row, { gap: 8, marginTop: 10 }]}>
      <Txt s={18} w={8}>
        {t}
      </Txt>
      <Txt s={14} w={7} c={C.muted}>
        {n}
      </Txt>
    </View>
  );
}

function Explore({ bottom }: { bottom: number }) {
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<(typeof SORTS)[number]>('Relevant');
  const qq = q.trim().toLowerCase();
  let L = db.COURSES.filter(
    (c) =>
      !c.live &&
      !c.quick &&
      (!courseF.cat || c.cat === courseF.cat) &&
      (!courseF.lv || c.lv === courseF.lv) &&
      (!courseF.price || (courseF.price === 'free' ? isFree(c) : !isFree(c))) &&
      (!courseF.fmt || c.fmt === courseF.fmt) &&
      (!courseF.rate || ratingOf(c).avg >= +courseF.rate) &&
      (!qq || (c.title + ' ' + c.prof + ' ' + c.skills.join(' ') + ' ' + c.prov.n + ' ' + (c.desc || '')).toLowerCase().includes(qq)),
  );
  if (sort === 'Top rated') L = L.slice().sort((a, b) => ratingOf(b).avg - ratingOf(a).avg || ratingOf(b).n - ratingOf(a).n);
  if (sort === 'Free first') L = L.slice().sort((a, b) => +isFree(b) - +isFree(a));
  if (sort === 'Cheapest') L = L.slice().sort((a, b) => a.price - b.price);
  const nf = (courseF.lv ? 1 : 0) + (courseF.price ? 1 : 0) + (courseF.fmt ? 1 : 0) + (courseF.rate ? 1 : 0);
  const plain = !qq && !courseF.cat && !nf;
  const free = db.COURSES.filter((c) => isFree(c) && !c.mine && !c.live && !c.quick).slice(0, 8);
  return (
    <FlatList
      data={L}
      keyExtractor={(c) => c.id}
      contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 40 + bottom, gap: 10 }}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      ListHeaderComponent={
        <View style={{ gap: 12, marginBottom: 4 }}>
          <SearchBar value={q} onChange={setQ} placeholder="Course, profession, skill or school" onFilter={openCourseFilters} filters={nf} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -20 }} contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}>
            {[['', 'job'] as [string, string], ...COURSE_CATS].map(([c, i]) => {
              const on = courseF.cat === c;
              return (
                <Pressable
                  key={c || 'all'}
                  accessibilityState={{ selected: on }}
                  onPress={() => {
                    tap();
                    courseF.cat = c;
                    bump();
                  }}
                  style={[S.row, { gap: 6, height: 36, paddingHorizontal: 14, borderRadius: 999, backgroundColor: on ? C.text : C.s1, borderWidth: 1, borderColor: on ? C.text : C.line }]}
                >
                  {c ? <Icon name={i} size={14} color={on ? '#000' : C.yellow} /> : null}
                  <Txt s={12} w={7} c={on ? '#000' : C.text}>
                    {c || 'All'}
                  </Txt>
                </Pressable>
              );
            })}
          </ScrollView>
          {plain && free.length ? (
            <>
              <Txt s={18} w={8} style={{ marginTop: 6 }}>
                Free to start
              </Txt>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -20 }} contentContainerStyle={{ paddingHorizontal: 20, gap: 10 }}>
                {free.map((c) => (
                  <CourseTile key={c.id} c={c} />
                ))}
              </ScrollView>
            </>
          ) : null}
          <View style={[S.rowB, { marginTop: plain ? 8 : 0 }]}>
            <Txt s={plain ? 18 : 13} w={plain ? 8 : 5} c={plain ? C.text : C.muted}>
              {plain ? 'All courses' : `${L.length} course${L.length === 1 ? '' : 's'}`}
            </Txt>
            <Pressable onPress={() => setSort(SORTS[(SORTS.indexOf(sort) + 1) % SORTS.length])} style={[S.row, { gap: 4 }]} accessibilityLabel={`Sort: ${sort}. Tap to change`}>
              <Icon name="filter" size={14} color={C.lav} />
              <Txt s={13} w={7} c={C.lav}>
                {sort}
              </Txt>
            </Pressable>
          </View>
          <Txt s={12} c={C.faint} style={{ marginTop: -6 }}>
            Courses open on the school’s own website, where you sign up.
          </Txt>
        </View>
      }
      renderItem={({ item }) => <CourseRow c={item} />}
      ListEmptyComponent={<Empty title="No courses match" text="Try another field or fewer filters." />}
      ListFooterComponent={
        <Pressable testID="courses-list-own" accessibilityRole="button" onPress={() => (tap(), router.push('/teach' as any))} style={[S.row, { gap: 10, marginTop: 6, padding: 14, borderRadius: 20, borderWidth: 1, borderStyle: 'dashed', borderColor: C.s3, justifyContent: 'center' }]}>
          <Icon name="plus" size={18} color={C.yellow} />
          <Txt s={14} w={8}>
            Teach a course? List it here
          </Txt>
        </Pressable>
      }
      initialNumToRender={8}
    />
  );
}
