import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { db } from '../data/db';
import { CATS } from '../data/catalog';
import { anchor, coordOf, kmBetween } from '../data/geo';
import { Avatar, Pict, Txt, Verified, tap } from '../ui/kit';
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

const HEADER_H = 150; // search + category tabs, below the status bar
const HOME = 58; // round Home button
const TIP_H = 40; // "2 jobs near you" tooltip incl. its pointer
const CARD_H = 128;

/** Full-screen map: search + filters on top, categories underneath, pins on the map, the nearest profile
    card picked automatically, a tooltip with the count and a round Home button. No tab bar. */
export function MapScreen() {
  useLive();
  const ins = useSafeAreaInsets();
  const [mode, setMode] = useState<'jobs' | 'people'>(db.user.intents.includes('find') || !db.user.intents.includes('hire') ? 'jobs' : 'people');
  const [q, setQ] = useState('');
  const [cat, setCat] = useState<string | null>(null);
  const [sel, setSel] = useState<string | null>(null);
  const [closed, setClosed] = useState(false);
  const ql = q.trim().toLowerCase();
  const jobs = openJobs().filter((p) => matchJob(p, ql, cat));
  const people = WORKERS().filter((id) => matchPerson(id, ql, cat));
  const nf = fCount();
  const n = mode === 'jobs' ? jobs.length : people.length;
  const count = mode === 'jobs' ? `${n} ${n === 1 ? 'job' : 'jobs'} near you` : `${n} ${n === 1 ? 'person' : 'people'} near you`;

  // Pick the closest listing automatically when the map opens or the list changes (unless the person closed the card).
  const ids = mode === 'jobs' ? jobs.map((p) => p.id) : people;
  const key = mode + ':' + ids.slice(0, 12).join(',') + ':' + anchor().join(',');
  useEffect(() => {
    if (closed) return;
    if (sel && ids.includes(sel)) return;
    const a = anchor();
    let best: string | null = null;
    let bd = Infinity;
    ids.slice(0, 12).forEach((id) => {
      const d = kmBetween(a, mode === 'jobs' ? coordOf(id, jobs.find((p) => p.id === id)?.area) : coordOf(id, P(id).area));
      if (d < bd) {
        bd = d;
        best = id;
      }
    });
    setSel(best);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, closed]);

  const homeBottom = ins.bottom + 16;
  const tipBottom = homeBottom + HOME + 10;
  const cardBottom = tipBottom + TIP_H + 10;
  const mapBottom = sel ? cardBottom + CARD_H : tipBottom + TIP_H;
  const choose = (id: string) => (setClosed(false), setSel(id));

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      {/* the map */}
      <View style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}>
        {hasMapbox ? (
          <LiveMap mode={mode} jobs={jobs} people={people} topInset={ins.top + HEADER_H} bottomInset={mapBottom} selected={sel} onSelect={choose} onBackground={() => (setSel(null), setClosed(true))} />
        ) : (
          <Pict pic="img/map-bg" style={{ flex: 1 }} />
        )}
      </View>

      {/* search, filters and categories */}
      <View style={{ position: 'absolute', left: 0, right: 0, top: 0, paddingTop: ins.top + 10, backgroundColor: C.bg, borderBottomLeftRadius: 24, borderBottomRightRadius: 24, shadowColor: '#000', shadowOpacity: 0.45, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 10 }}>
        <View style={[S.row, { marginHorizontal: 16, gap: 10 }]}>
          <View style={[S.row, { flex: 1, gap: 10, height: 52, paddingHorizontal: 16, borderRadius: 26, backgroundColor: C.s1, borderWidth: 1, borderColor: C.line }]}>
            <Icon name="search" size={20} color={C.muted} />
            <TextInput
              testID="map-search"
              value={q}
              onChangeText={(t) => (setQ(t), setClosed(false))}
              placeholder={mode === 'jobs' ? 'Search jobs' : 'Search people'}
              placeholderTextColor={C.faint}
              numberOfLines={1}
              returnKeyType="search"
              style={[tx(15, 6, C.text), { flex: 1, height: 50, paddingVertical: 0 }]}
            />
            {q ? (
              <Pressable accessibilityLabel="Clear search" hitSlop={8} onPress={() => setQ('')}>
                <Icon name="x" size={18} color={C.muted} />
              </Pressable>
            ) : null}
          </View>
          <Pressable
            testID="map-filters"
            accessibilityRole="button"
            accessibilityLabel={`Filters${nf ? `, ${nf} on` : ''}`}
            onPress={() => (tap(), openFilters(mode))}
            style={{ width: 52, height: 52, borderRadius: 16, borderWidth: 1.5, borderColor: nf ? C.yellow : C.line, backgroundColor: nf ? 'rgba(246,238,92,.12)' : C.s1, alignItems: 'center', justifyContent: 'center' }}
          >
            <Icon name="filter" size={20} color={nf ? C.yellow : C.text} />
            {nf ? (
              <View style={{ position: 'absolute', top: -5, right: -5, minWidth: 18, height: 18, borderRadius: 9, backgroundColor: C.yellow, alignItems: 'center', justifyContent: 'center' }}>
                <Txt s={10} w={8} c="#000">
                  {nf}
                </Txt>
              </View>
            ) : null}
          </Pressable>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 10, paddingTop: 12, alignItems: 'flex-end' }}>
          {(
            [
              ['jobs', 'job', 'Jobs'],
              ['people', 'follow', 'People'],
            ] as const
          ).map(([m, i, l]) => (
            <Tab key={m} icon={i} label={l} on={mode === m} onPress={() => (tap(), setMode(m), setSel(null), setClosed(false))} testID={`map-${m}`} />
          ))}
          <View style={{ width: 1, height: 34, backgroundColor: C.line, marginHorizontal: 6, marginBottom: 16 }} />
          {CATS.map(([c, i]) => (
            <Tab key={c} icon={i} label={c} on={cat === c} onPress={() => (tap(), setCat(cat === c ? null : c), setSel(null), setClosed(false))} />
          ))}
        </ScrollView>
      </View>

      {/* nearest (or tapped) listing as a profile card */}
      {sel ? <PinCard id={sel} mode={mode} bottom={cardBottom} onClose={() => (setSel(null), setClosed(true))} /> : null}

      {/* count tooltip + round Home button, centred */}
      <View pointerEvents="box-none" style={{ position: 'absolute', left: 0, right: 0, bottom: tipBottom, alignItems: 'center' }}>
        <Pressable testID="map-list" accessibilityRole="button" accessibilityLabel={`${count}. Show the list`} onPress={() => (tap(), openBrowse(mode))} style={{ alignItems: 'center' }}>
          <View style={[S.row, { gap: 6, height: 32, paddingHorizontal: 14, borderRadius: 16, backgroundColor: '#fff' }]}>
            <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: C.ok }} />
            <Txt s={13} w={8} c="#000">
              {count}
            </Txt>
            <Icon name="chev" size={14} color="#000" />
          </View>
          <View style={{ width: 12, height: 12, marginTop: -7, backgroundColor: '#fff', transform: [{ rotate: '45deg' }], borderRadius: 2 }} />
        </Pressable>
      </View>
      <Pressable
        testID="map-home"
        accessibilityRole="button"
        accessibilityLabel="Home"
        onPress={() => (tap(), router.navigate('/(tabs)/feed'))}
        style={({ pressed }) => ({
          position: 'absolute',
          bottom: homeBottom,
          alignSelf: 'center',
          width: HOME,
          height: HOME,
          borderRadius: HOME / 2,
          backgroundColor: C.yellow,
          alignItems: 'center',
          justifyContent: 'center',
          transform: [{ scale: pressed ? 0.92 : 1 }],
          shadowColor: '#000',
          shadowOpacity: 0.5,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 6 },
          elevation: 12,
        })}
      >
        <Icon name="home" size={24} color="#000" />
      </Pressable>
    </View>
  );
}

function Tab({ icon, label, on, onPress, testID }: { icon: string; label: string; on: boolean; onPress: () => void; testID?: string }) {
  return (
    <Pressable testID={testID} accessibilityRole="tab" accessibilityState={{ selected: on }} onPress={onPress} style={{ alignItems: 'center', paddingHorizontal: 12 }}>
      <Icon name={icon} size={22} color={on ? C.text : C.muted} />
      <Txt s={12} w={on ? 8 : 6} c={on ? C.text : C.muted} style={{ marginTop: 5 }} lines={1}>
        {label}
      </Txt>
      <View style={{ height: 3, alignSelf: 'stretch', marginTop: 9, borderRadius: 2, backgroundColor: on ? C.yellow : 'transparent' }} />
    </Pressable>
  );
}

/** Profile card for the selected pin: the poster's (or person's) photo, who they are, then the job. */
function PinCard({ id, mode, bottom, onClose }: { id: string; mode: 'jobs' | 'people'; bottom: number; onClose: () => void }) {
  const po = mode === 'jobs' ? openJobs().find((p) => p.id === id) : null;
  const pe = mode === 'people' ? P(id) : null;
  if (!po && !pe) return null;
  const who = po ? P(po.client!) : pe!;
  const saved = po ? has(db.savedJobs, id) : has(db.saved, id);
  const offers = po?.offers || 0;
  const open = () => (tap(), po ? openJob(id) : openProfile(id));
  return (
    <Pressable
      testID="pin-card"
      accessibilityRole="button"
      onPress={open}
      style={{ position: 'absolute', left: 16, right: 16, bottom, height: CARD_H, flexDirection: 'row', borderRadius: 22, overflow: 'hidden', backgroundColor: C.s1, borderWidth: 1, borderColor: C.line, shadowColor: '#000', shadowOpacity: 0.5, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 14 }}
    >
      <View style={{ width: CARD_H - 8 }}>
        {String(who.photo || '').startsWith('logo:') ? <Avatar pic={who.photo} size={CARD_H} square style={{ borderRadius: 0 }} /> : <Pict pic={who.photo} style={{ width: '100%', height: '100%' }} />}
        <Pressable accessibilityLabel="Close" hitSlop={10} onPress={onClose} style={{ position: 'absolute', top: 8, left: 8, width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(0,0,0,.55)', alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="x" size={14} color="#fff" />
        </Pressable>
      </View>
      <View style={{ flex: 1, paddingVertical: 12, paddingHorizontal: 14, justifyContent: 'space-between' }}>
        <View>
          <View style={[S.row, { gap: 6 }]}>
            <Txt s={14} w={8} lines={1} style={{ flexShrink: 1 }}>
              {who.name}
            </Txt>
            {who.verified ? <Verified size={13} /> : null}
            <View style={{ flex: 1 }} />
            <Pressable accessibilityLabel={saved ? 'Unsave' : 'Save'} hitSlop={10} onPress={() => (po ? saveToggle('savedJobs', id, 'Job') : saveToggle('saved', id, pe!.name.split(' ')[0]))}>
              <Icon name="bookmark" size={18} color={saved ? C.yellow : C.muted} />
            </Pressable>
          </View>
          <View style={[S.row, { gap: 4, marginTop: 2 }]}>
            <Icon name="star" size={12} color={C.yellow} />
            <Txt s={12} c={C.muted} lines={1}>
              {who.rate} · {po ? po.area : `${pe!.area} · ${pe!.dist}`}
            </Txt>
          </View>
          <Txt s={15} w={8} lines={1} style={{ marginTop: 6 }}>
            {po ? po.title : `${pe!.role} · ${pe!.years} yrs`}
          </Txt>
        </View>
        <View style={S.rowB}>
          <Txt s={14} w={8} c={C.yellow} lines={1} style={{ flexShrink: 1 }}>
            {po ? po.budget : `${pe!.jobs} jobs done`}
          </Txt>
          <Txt s={12} c={C.muted}>
            {po ? `${offers} ${offers === 1 ? 'offer' : 'offers'} · ${po.time}` : `${pe!.reviews} reviews`}
          </Txt>
        </View>
      </View>
    </Pressable>
  );
}
