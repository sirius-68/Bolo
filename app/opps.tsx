import React, { useState } from 'react';
import { FlatList, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { db } from '../src/data/db';
import { Chip, Chips, Empty, IconBtn, Txt, goBack } from '../src/ui/kit';
import { C, S } from '../src/ui/theme';
import { useLive } from '../src/logic/live';
import { OppCard } from '../src/components/cards';
import { SearchBar } from '../src/components/common';

/** All internships, or all programs (apprenticeships, graduate programs, trainings). */
export default function Opps() {
  useLive();
  const { kind } = useLocalSearchParams<{ kind?: string }>();
  const ins = useSafeAreaInsets();
  const intern = kind === 'Internship';
  const [q, setQ] = useState('');
  const [mode, setMode] = useState('All');
  const base = db.OPPS.filter((o) => (intern ? o.kind === 'Internship' : o.kind !== 'Internship'));
  const kinds = ['All', ...Array.from(new Set(base.map((o) => o.kind)))];
  const qq = q.trim().toLowerCase();
  const L = base.filter((o) => (mode === 'All' || o.kind === mode || o.mode === mode) && (!qq || (o.title + ' ' + o.cat + ' ' + o.desc).toLowerCase().includes(qq)));
  const pairs: (typeof L)[] = [];
  for (let i = 0; i < L.length; i += 2) pairs.push(L.slice(i, i + 2));
  return (
    <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: ins.top }}>
      <FlatList
        data={pairs}
        keyExtractor={(p) => p[0].id}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 + ins.bottom, gap: 10 }}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <View style={{ gap: 12, marginBottom: 4 }}>
            <View style={[S.row, { gap: 10, paddingTop: 6 }]}>
              <IconBtn name="back" label="Back" onPress={goBack} />
              <Txt s={22} w={8}>
                {intern ? 'Internships' : 'Programs you can join'}
              </Txt>
            </View>
            <SearchBar value={q} onChange={setQ} placeholder={intern ? 'Search internships' : 'Search programs'} />
            <Chips>
              {(intern ? ['All', 'On-site', 'Hybrid', 'Online'] : kinds).map((k) => (
                <Chip key={k} small label={k} on={mode === k} onPress={() => setMode(k)} />
              ))}
            </Chips>
            <Txt s={13} c={C.muted}>
              {L.length} result{L.length === 1 ? '' : 's'}
            </Txt>
          </View>
        }
        renderItem={({ item }) => (
          <View style={{ flexDirection: 'row', gap: 10 }}>
            {item.map((o) => (
              <OppCard key={o.id} o={o} width="48%" />
            ))}
          </View>
        )}
        ListEmptyComponent={<Empty title="Nothing matches" text="Try another word or filter." />}
      />
    </View>
  );
}
