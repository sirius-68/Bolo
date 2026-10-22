import React, { useState } from 'react';
import { FlatList, Pressable, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { db, ui } from '../src/data/db';
import { Avatar, Empty, IconBtn, Rate, Seg, Txt, Verified, goBack } from '../src/ui/kit';
import { Icon } from '../src/ui/Icon';
import { C, S } from '../src/ui/theme';
import { P, fCount, isW, listJobs, listPeople, matchJob, matchPerson, sortJobs, sortPeople, has } from '../src/logic/core';
import { useLive } from '../src/logic/live';
import { openProfile } from '../src/logic/nav';
import { CatRail, SearchBar } from '../src/components/common';
import { PersonRow, ReqPost } from '../src/components/cards';
import { openFilters } from '../src/sheets/filters';
import { saveToggle } from '../src/logic/work';

type M = 'people' | 'jobs' | 'companies';

export default function Browse() {
  useLive();
  const p = useLocalSearchParams<{ mode?: M }>();
  const ins = useSafeAreaInsets();
  const w = isW();
  const modes: [M, string][] = w
    ? [
        ['jobs', 'Jobs'],
        ['people', 'People'],
        ['companies', 'Companies'],
      ]
    : [
        ['people', 'Talent'],
        ['companies', 'Companies'],
      ];
  const [mode, setMode] = useState<M>(modes.some((x) => x[0] === p.mode) ? (p.mode as M) : modes[0][0]);
  const [q, setQ] = useState('');
  const [cat, setCat] = useState<string | null>(ui.cat);
  const qq = q.trim().toLowerCase();
  const nf = fCount();
  type Item = { k: string; id?: string; job?: string };
  let data: Item[] = [];
  if (mode === 'jobs') data = sortJobs(listJobs().filter((x) => matchJob(x, qq, cat))).map((x) => ({ k: x.id, job: x.id }));
  if (mode === 'people') data = sortPeople(listPeople().filter((id) => matchPerson(id, qq, cat))).map((id) => ({ k: id, id }));
  if (mode === 'companies')
    data = Object.keys(db.BIZ_SAMPLE)
      .filter((id) => !qq || (db.BIZ_SAMPLE[id].name + ' ' + db.BIZ_SAMPLE[id].sector).toLowerCase().includes(qq))
      .map((id) => ({ k: id, id }));
  return (
    <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: ins.top }}>
      <FlatList
        data={data}
        keyExtractor={(i) => i.k}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 + ins.bottom, gap: 10 }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        initialNumToRender={8}
        windowSize={7}
        ListHeaderComponent={
          <View style={{ gap: 12 }}>
            <View style={[S.row, { gap: 10, paddingTop: 6 }]}>
              <IconBtn name="back" label="Back" onPress={goBack} />
              <Txt s={22} w={8}>
                {mode === 'jobs' ? 'Jobs near you' : mode === 'people' ? (w ? 'People near you' : 'Talent near you') : 'Companies'}
              </Txt>
            </View>
            <Seg items={modes} value={mode} onChange={setMode} />
            <SearchBar value={q} onChange={setQ} placeholder={mode === 'jobs' ? 'Search jobs — title, company, area…' : mode === 'people' ? 'Search name, skill or area' : 'Search companies or sectors'} onFilter={mode === 'companies' ? undefined : () => openFilters(mode === 'jobs' ? 'jobs' : 'people')} filters={nf} />
            {mode !== 'companies' ? <CatRail value={cat} onChange={setCat} /> : null}
            <Txt s={13} c={C.muted}>
              {data.length} result{data.length === 1 ? '' : 's'}
            </Txt>
          </View>
        }
        renderItem={({ item }) => {
          if (item.job) {
            const po = db.POSTS.find((x) => x.id === item.job)!;
            return <ReqPost po={po} />;
          }
          if (mode === 'people') return <PersonRow id={item.id!} />;
          const b = db.BIZ_SAMPLE[item.id!];
          const n = db.POSTS.filter((x) => x.client === item.id).length + db.OPPS.filter((o) => o.biz === item.id).length;
          const saved = has(db.savedCos, item.id!);
          return (
            <Pressable onPress={() => openProfile(item.id!)} style={({ pressed }) => [S.row, { gap: 12, padding: 12, borderRadius: 20, backgroundColor: pressed ? C.s2 : C.s1, borderWidth: 1, borderColor: C.line }]}>
              <Avatar pic={b.logo} square size={52} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <View style={[S.row, { gap: 4 }]}>
                  <Txt s={15} w={8} lines={1} style={{ flexShrink: 1 }}>
                    {b.name}
                  </Txt>
                  <Verified size={13} />
                </View>
                <Txt s={12} c={C.muted} lines={1}>
                  {b.sector} · {b.area}
                </Txt>
                <View style={[S.row, { gap: 8 }]}>
                  <Rate r={b.rate} />
                  <Txt s={12} w={7} c={n ? C.mint : C.muted}>
                    {n} opening{n === 1 ? '' : 's'}
                  </Txt>
                </View>
              </View>
              <Pressable accessibilityLabel={saved ? 'Unsave company' : 'Save company'} hitSlop={8} onPress={() => saveToggle('savedCos', item.id!, 'Company')}>
                <Icon name="bookmark" size={20} color={saved ? C.yellow : C.muted} />
              </Pressable>
            </Pressable>
          );
        }}
        ListEmptyComponent={<Empty title="Nothing matches" text="Try another word, category or fewer filters." />}
      />
    </View>
  );
}
export { P };
