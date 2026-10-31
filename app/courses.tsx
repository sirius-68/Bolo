import React, { useEffect, useState } from 'react';
import { FlatList, Pressable, ScrollView, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { db, Course } from '../src/data/db';
import { COURSE_CATS } from '../src/data/catalog';
import { Avatar, Empty, IconBtn, StatusPill, Txt, goBack, tap } from '../src/ui/kit';
import { Icon } from '../src/ui/Icon';
import { C, S } from '../src/ui/theme';
import { isW, xaf } from '../src/logic/core';
import { bump, useLive } from '../src/logic/live';
import { SearchBar } from '../src/components/common';
import { openCourse, openOppForm } from '../src/sheets/career';
import { courseF, openCourseFilters } from '../src/sheets/filters';

const SORTS = ['Relevant', 'Cheapest', 'Biggest discount'] as const;

export default function Courses() {
  useLive();
  const { cat } = useLocalSearchParams<{ cat?: string }>();
  const ins = useSafeAreaInsets();
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<(typeof SORTS)[number]>('Relevant');
  useEffect(() => {
    courseF.cat = cat || '';
    bump();
  }, [cat]);
  const qq = q.trim().toLowerCase();
  let L = db.COURSES.filter(
    (c) =>
      (!courseF.cat || c.cat === courseF.cat) &&
      (!courseF.lv || c.lv === courseF.lv) &&
      (!courseF.price || (courseF.price === 'free' ? !c.price : !!c.price)) &&
      (!courseF.fmt || c.fmt === courseF.fmt) &&
      (!qq || (c.title + ' ' + c.prof + ' ' + c.skills.join(' ') + ' ' + c.prov.n).toLowerCase().includes(qq)),
  );
  if (sort === 'Cheapest') L = L.slice().sort((a, b) => a.price - b.price);
  if (sort === 'Biggest discount') L = L.slice().sort((a, b) => (b.old ? 1 - b.price / b.old : 0) - (a.old ? 1 - a.price / a.old : 0));
  const nf = (courseF.lv ? 1 : 0) + (courseF.price ? 1 : 0) + (courseF.fmt ? 1 : 0);
  return (
    <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: ins.top }}>
      <FlatList
        data={L}
        keyExtractor={(c) => c.id}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 + ins.bottom, gap: 10 }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        ListHeaderComponent={
          <View style={{ gap: 12, marginBottom: 4 }}>
            <View style={[S.row, { gap: 10, paddingTop: 6 }]}>
              <IconBtn name="back" label="Back" onPress={goBack} />
              <Txt s={22} w={8} style={{ flex: 1 }}>
                Courses
              </Txt>
              {!isW() ? <IconBtn name="plus" bg={C.yellow} color="#000" label="Create a course" onPress={() => openOppForm('Course')} /> : null}
            </View>
            <SearchBar value={q} onChange={setQ} placeholder="Course, profession or skill" onFilter={openCourseFilters} filters={nf} />
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
                    style={[S.row, { gap: 6, height: 36, paddingHorizontal: 12, borderRadius: 999, backgroundColor: on ? C.yellow : C.s1, borderWidth: 1, borderColor: on ? C.yellow : C.line }]}
                  >
                    {c ? <Icon name={i} size={14} color={on ? '#000' : C.yellow} /> : null}
                    <Txt s={12} w={7} c={on ? '#000' : C.text}>
                      {c || 'All'}
                    </Txt>
                  </Pressable>
                );
              })}
            </ScrollView>
            <View style={S.rowB}>
              <Txt s={13} c={C.muted}>
                {L.length} course{L.length === 1 ? '' : 's'}
              </Txt>
              <Pressable onPress={() => setSort(SORTS[(SORTS.indexOf(sort) + 1) % SORTS.length])} style={[S.row, { gap: 4 }]} accessibilityLabel={`Sort: ${sort}. Tap to change`}>
                <Icon name="filter" size={14} color={C.lav} />
                <Txt s={13} w={7} c={C.lav}>
                  {sort}
                </Txt>
              </Pressable>
            </View>
          </View>
        }
        renderItem={({ item }) => <CourseRow c={item} />}
        ListEmptyComponent={<Empty title="No courses match" text="Try another field or fewer filters." />}
        initialNumToRender={8}
      />
    </View>
  );
}
function CourseRow({ c }: { c: Course }) {
  const d = c.old ? Math.round((1 - c.price / c.old) * 100) : 0;
  const mine = db.myLearning.includes(c.id);
  return (
    <Pressable onPress={() => (mine ? router.push(`/course/${c.id}` as any) : openCourse(c.id))} style={({ pressed }) => ({ padding: 14, borderRadius: 20, backgroundColor: pressed ? C.s2 : C.s1, borderWidth: 1, borderColor: C.line, gap: 8 })}>
      <View style={[S.row, { gap: 10 }]}>
        <Avatar pic={c.prov.logo} square size={36} />
        <Txt s={12} c={C.muted} style={{ flex: 1 }} lines={1}>
          {c.prov.n} · {c.fmt === 'Offline' ? `In person${c.reg ? ' · ' + c.reg : ''}` : 'Online'}
        </Txt>
        {mine ? <StatusPill kind="acc" text="Enrolled" /> : c.mine ? <StatusPill kind="blue" text="Yours" /> : null}
      </View>
      <Txt s={16} w={8}>
        {c.title}
      </Txt>
      <Txt s={12} c={C.muted}>
        {c.type} · {c.lv === 'Beginner' ? 'From zero' : 'Advanced'} · {c.dur}
      </Txt>
      <View style={[S.row, { gap: 8 }]}>
        <Txt s={16} w={8} c={C.yellow}>
          {c.price ? xaf(c.price) : 'Free'}
        </Txt>
        {c.old ? (
          <Txt s={12} c={C.muted} style={{ textDecorationLine: 'line-through' }}>
            {xaf(c.old)}
          </Txt>
        ) : null}
        {d ? <StatusPill kind="urg" text={`−${d}%`} /> : null}
      </View>
    </Pressable>
  );
}
