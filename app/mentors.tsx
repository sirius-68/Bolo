import React, { useState } from 'react';
import { FlatList, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { db } from '../src/data/db';
import { Btn, Empty, IconBtn, Txt, goBack, tap } from '../src/ui/kit';
import { C, S } from '../src/ui/theme';
import { useLive } from '../src/logic/live';
import { SearchBar } from '../src/components/common';
import { MentorCard } from '../src/components/cards';
import { openMentorForm } from '../src/sheets/career';

/** Every mentorship in one list (moved here from Home so mentorship has one place: Career). */
export default function Mentors() {
  useLive();
  const ins = useSafeAreaInsets();
  const [q, setQ] = useState('');
  const [field, setField] = useState('');
  const qq = q.trim().toLowerCase();
  const all = db.MENTORSHIPS.filter((m) => !m.mine);
  const fields = [...new Set(all.map((m) => m.field))];
  const L = all.filter((m) => (!field || m.field === field) && (!qq || (m.title + ' ' + m.field + ' ' + m.desc).toLowerCase().includes(qq)));
  const pairs: string[][] = [];
  for (let i = 0; i < L.length; i += 2) pairs.push(L.slice(i, i + 2).map((m) => m.id));
  return (
    <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: ins.top }}>
      <FlatList
        data={pairs}
        keyExtractor={(p) => p.join('-')}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 + ins.bottom, gap: 10 }}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <View style={{ gap: 12, marginBottom: 4 }}>
            <View style={[S.row, { gap: 10, paddingTop: 6 }]}>
              <IconBtn name="back" label="Back" onPress={goBack} />
              <Txt s={22} w={8} style={{ flex: 1 }}>
                Mentorship
              </Txt>
              <IconBtn testID="mentors-offer" name="plus" bg={C.yellow} color="#000" label="Offer a mentorship" onPress={openMentorForm} />
            </View>
            <Txt s={13} c={C.muted}>
              Learn from experienced people and companies, 1-to-1 or in groups.
            </Txt>
            <SearchBar value={q} onChange={setQ} placeholder="Search mentors or topics" />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -20 }} contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}>
              {['', ...fields].map((f) => {
                const on = field === f;
                return (
                  <Pressable key={f || 'all'} accessibilityState={{ selected: on }} onPress={() => (tap(), setField(f))} style={{ height: 36, paddingHorizontal: 14, borderRadius: 999, justifyContent: 'center', backgroundColor: on ? C.text : C.s1, borderWidth: 1, borderColor: on ? C.text : C.line }}>
                    <Txt s={12} w={7} c={on ? '#000' : C.text}>
                      {f || 'All'}
                    </Txt>
                  </Pressable>
                );
              })}
            </ScrollView>
            <Txt s={13} c={C.muted}>
              {L.length} mentorship{L.length === 1 ? '' : 's'}
            </Txt>
          </View>
        }
        renderItem={({ item }) => (
          <View style={{ flexDirection: 'row', gap: 10 }}>
            {item.map((id) => (
              <MentorCard key={id} m={db.MENTORSHIPS.find((x) => x.id === id)!} width="48%" />
            ))}
          </View>
        )}
        ListEmptyComponent={
          <Empty title="No mentorships match" text="Try another topic.">
            <Btn small variant="yellow" title="Offer one yourself" style={{ marginTop: 12, alignSelf: 'center' }} onPress={openMentorForm} />
          </Empty>
        }
      />
    </View>
  );
}
