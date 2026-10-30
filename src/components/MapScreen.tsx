import React, { useState } from 'react';
import { Pressable, ScrollView, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { db } from '../data/db';
import { CATS, catIcon } from '../data/catalog';
import { Avatar, Pict, Txt, tap } from '../ui/kit';
import { Icon } from '../ui/Icon';
import { C, S, tx } from '../ui/theme';
import { P, WORKERS, fCount, has, matchJob, matchPerson, openJobs } from '../logic/core';
import { useLive } from '../logic/live';
import { openBrowse, openProfile } from '../logic/nav';
import { openJob } from '../sheets/work';
import { openFilters } from '../sheets/filters';
import { saveToggle } from '../logic/work';
import { LiveMap } from './LiveMap';
import { hasMapbox } from '../lib/mapbox';

const HEADER_H = 128;
const STRIP_H = 64;

/** Full-screen map: search + filters on top, categories underneath, pins on the map,
    the tapped pin's card at the bottom and a strip that opens the full list. No tab bar — just Home. */
export function MapScreen() {
  useLive();
  const ins = useSafeAreaInsets();
  const [mode, setMode] = useState<'jobs' | 'people'>(db.user.intents.includes('find') || !db.user.intents.includes('hire') ? 'jobs' : 'people');
  const [q, setQ] = useState('');
  const [cat, setCat] = useState<string | null>(null);
  const [sel, setSel] = useState<string | null>(null);
  const jobs = openJobs().filter((p) => matchJob(p, q.trim().toLowerCase(), cat));
  const people = WORKERS().filter((id) => matchPerson(id, q.trim().toLowerCase(), cat));
  const match = jobs.filter((p) => db.user.skills.includes(p.cat!)).length;
  const nf = fCount();
  const top = ins.top + HEADER_H;
  const bottom = STRIP_H + ins.bottom;
  const setM = (m: 'jobs' | 'people') => (tap(), setMode(m), setSel(null));
  const count = mode === 'jobs' ? `${jobs.length} ${jobs.length === 1 ? 'job' : 'jobs'} near you${match ? ` · ${match} match you` : ''}` : `${people.length} ${people.length === 1 ? 'person' : 'people'} available near you`;

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      {/* the map */}
      <View style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}>
        {hasMapbox ? (
          <LiveMap mode={mode} jobs={jobs} people={people} topInset={top} bottomInset={bottom + (sel ? 150 : 16)} selected={sel} onSelect={setSel} onBackground={() => setSel(null)} />
        ) : (
          <Pict pic="img/map-bg" style={{ flex: 1 }} />
        )}
      </View>

      {/* search, filters and categories */}
      <View style={{ position: 'absolute', left: 0, right: 0, top: 0, paddingTop: ins.top + 8, backgroundColor: C.bg, borderBottomLeftRadius: 22, borderBottomRightRadius: 22, borderBottomWidth: 1, borderColor: C.line, shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 10 }}>
        <View style={[S.row, { marginHorizontal: 16, gap: 10, height: 56, paddingLeft: 16, paddingRight: 6, borderRadius: 28, backgroundColor: C.s1, borderWidth: 1, borderColor: C.line }]}>
          <Icon name="search" size={20} color={C.text} />
          <View style={{ flex: 1 }}>
            <TextInput
              testID="map-search"
              value={q}
              onChangeText={(t) => (setQ(t), setSel(null))}
              placeholder={mode === 'jobs' ? 'Search jobs near you' : 'Search people — plumber, tailor…'}
              placeholderTextColor={C.text}
              numberOfLines={1}
              returnKeyType="search"
              style={[tx(15, 7, C.text), { paddingVertical: 0, height: 24 }]}
            />
            <Txt s={12} c={C.muted} lines={1}>
              {[db.user.city || 'Near you', cat || (mode === 'jobs' ? 'All jobs' : 'Everyone')].join(' · ')}
            </Txt>
          </View>
          <Pressable
            testID="map-filters"
            accessibilityRole="button"
            accessibilityLabel={`Filters${nf ? `, ${nf} on` : ''}`}
            onPress={() => (tap(), openFilters(mode))}
            style={{ width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: C.line, backgroundColor: nf ? C.yellow : C.s2, alignItems: 'center', justifyContent: 'center' }}
          >
            <Icon name="filter" size={18} color={nf ? '#000' : C.text} />
          </Pressable>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 12, paddingTop: 10, gap: 4, alignItems: 'flex-end' }}>
          {(
            [
              ['jobs', 'job', 'Jobs'],
              ['people', 'follow', 'People'],
            ] as const
          ).map(([m, i, l]) => (
            <Tab key={m} icon={i} label={l} on={mode === m} onPress={() => setM(m)} testID={`map-${m}`} />
          ))}
          <View style={{ width: 1, height: 36, backgroundColor: C.line, marginHorizontal: 6, marginBottom: 14 }} />
          {CATS.map(([c, i]) => (
            <Tab key={c} icon={i} label={c} on={cat === c} onPress={() => (tap(), setCat(cat === c ? null : c), setSel(null))} />
          ))}
        </ScrollView>
      </View>

      {/* the tapped pin */}
      {sel ? <PinCard id={sel} mode={mode} bottom={bottom + 12} onClose={() => setSel(null)} /> : null}

      {/* bottom strip: Home + the list */}
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: bottom, paddingBottom: ins.bottom, paddingHorizontal: 16, backgroundColor: C.bg, borderTopLeftRadius: 22, borderTopRightRadius: 22, borderTopWidth: 1, borderColor: C.line, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Pressable
          testID="map-home"
          accessibilityRole="button"
          accessibilityLabel="Home"
          onPress={() => (tap(), router.navigate('/(tabs)/feed'))}
          style={({ pressed }) => [S.row, { gap: 6, height: 44, paddingHorizontal: 16, borderRadius: 22, backgroundColor: C.yellow, transform: [{ scale: pressed ? 0.95 : 1 }] }]}
        >
          <Icon name="home" size={18} color="#000" />
          <Txt s={14} w={8} c="#000">
            Home
          </Txt>
        </Pressable>
        <Pressable testID="map-list" accessibilityRole="button" onPress={() => (tap(), openBrowse(mode))} style={{ flex: 1, height: 44, justifyContent: 'center' }}>
          <View style={{ position: 'absolute', top: -6, alignSelf: 'center', width: 36, height: 4, borderRadius: 2, backgroundColor: C.s3 }} />
          <Txt s={14} w={8} center lines={1}>
            {count}
          </Txt>
        </Pressable>
      </View>
    </View>
  );
}

function Tab({ icon, label, on, onPress, testID }: { icon: string; label: string; on: boolean; onPress: () => void; testID?: string }) {
  return (
    <Pressable testID={testID} accessibilityRole="tab" accessibilityState={{ selected: on }} onPress={onPress} style={{ alignItems: 'center', paddingHorizontal: 10, paddingTop: 2, minWidth: 64 }}>
      <Icon name={icon} size={22} color={on ? C.text : C.muted} />
      <Txt s={12} w={on ? 8 : 6} c={on ? C.text : C.muted} style={{ marginTop: 4 }} lines={1}>
        {label}
      </Txt>
      <View style={{ height: 3, alignSelf: 'stretch', marginTop: 8, borderRadius: 2, backgroundColor: on ? C.yellow : 'transparent' }} />
    </Pressable>
  );
}

/** Airbnb-style card for the selected pin. */
function PinCard({ id, mode, bottom, onClose }: { id: string; mode: 'jobs' | 'people'; bottom: number; onClose: () => void }) {
  const po = mode === 'jobs' ? openJobs().find((p) => p.id === id) : null;
  const pe = mode === 'people' ? P(id) : null;
  if (!po && !pe) return null;
  const who = po ? P(po.client!) : pe!;
  const saved = po ? has(db.savedJobs, id) : has(db.saved, id);
  const open = () => (tap(), po ? openJob(id) : openProfile(id));
  return (
    <Pressable testID="pin-card" accessibilityRole="button" onPress={open} style={{ position: 'absolute', left: 16, right: 16, bottom, height: 132, flexDirection: 'row', borderRadius: 22, overflow: 'hidden', backgroundColor: C.s1, borderWidth: 1, borderColor: C.line, shadowColor: '#000', shadowOpacity: 0.5, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 14 }}>
      <View style={{ width: 118, backgroundColor: po ? (po.urgent ? C.orange : C.yellow) : C.lav, alignItems: 'center', justifyContent: 'center' }}>
        {po ? (
          <>
            <Icon name={catIcon(po.cat)} size={40} color="#000" />
            <Txt s={11} w={8} c="#000" style={{ marginTop: 6 }} lines={1}>
              {po.cat}
            </Txt>
          </>
        ) : (
          <Avatar pic={pe!.photo} size={92} />
        )}
        <Pressable accessibilityLabel="Close" hitSlop={8} onPress={onClose} style={{ position: 'absolute', top: 8, left: 8, width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(0,0,0,.45)', alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="x" size={14} color="#fff" />
        </Pressable>
      </View>
      <View style={{ flex: 1, padding: 14, justifyContent: 'space-between' }}>
        <View>
          <View style={[S.row, { gap: 8 }]}>
            <Txt s={15} w={8} lines={1} style={{ flex: 1 }}>
              {po ? po.title : pe!.name}
            </Txt>
            <Pressable accessibilityLabel={saved ? 'Unsave' : 'Save'} hitSlop={8} onPress={() => (po ? saveToggle('savedJobs', id, 'Job') : saveToggle('saved', id, pe!.name.split(' ')[0]))}>
              <Icon name="bookmark" size={18} color={saved ? C.yellow : C.muted} />
            </Pressable>
          </View>
          <Txt s={12} c={C.muted} lines={1} style={{ marginTop: 3 }}>
            {po ? `${who.name} · ${po.area}` : `${pe!.role} · ${pe!.years} yrs`}
          </Txt>
          <Txt s={12} c={C.muted} lines={1}>
            {po ? `${po.type || 'One-off'} · ${po.time}` : `${pe!.area} · ${pe!.dist}`}
          </Txt>
        </View>
        <View style={S.rowB}>
          <Txt s={14} w={8} lines={1} style={{ flexShrink: 1 }}>
            {po ? po.budget : pe!.jobs ? `${pe!.jobs} jobs done` : ''}
          </Txt>
          <View style={[S.row, { gap: 3 }]}>
            <Icon name={po ? 'follow' : 'star'} size={13} color={po ? C.muted : C.yellow} />
            <Txt s={13} w={7}>
              {po ? `${po.offers || 0} offers` : `${pe!.rate} (${pe!.reviews})`}
            </Txt>
          </View>
        </View>
      </View>
    </Pressable>
  );
}
