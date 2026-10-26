import React from 'react';
import { Pressable, ScrollView, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { db, ui } from '../data/db';
import { CATS } from '../data/catalog';
import { Avatar, IconBtn, Txt, tap, Verified } from '../ui/kit';
import { Icon } from '../ui/Icon';
import { C, R, S, tx } from '../ui/theme';
import { bizLogo, bizName, curBiz, fname, greet, isPro, isW, cityLabel, myPhoto, P, unreadMsgs, unreadNotifs, fCount } from '../logic/core';
import { liveInfo, myBookings, pctOf, trOther } from '../logic/work';
import { bump } from '../logic/live';
import { openTrack } from '../logic/nav';
import { openAccounts, openCities } from '../sheets/account';
import { openReview } from '../sheets/work';

/** Header used on the main tabs: who you are (tap to switch), messages and notifications. */
export function TabHeader({ hello = true, reels }: { hello?: boolean; reels?: boolean }) {
  const w = isW();
  const b = curBiz();
  const m = unreadMsgs();
  const n = unreadNotifs();
  const place = w || !b ? cityLabel() : b.city;
  return (
    <View style={[S.row, { gap: 10, paddingTop: 8, paddingBottom: 6 }]}>
      <Pressable accessibilityRole="button" accessibilityLabel="Switch profile" onPress={() => (tap(), openAccounts())} style={[S.row, { gap: 10, flex: 1, minWidth: 0 }]}>
        <Avatar pic={w || !b ? myPhoto() : bizLogo(b)} square={!w && !!b} size={46} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={[S.row, { gap: 4 }]}>
            <Txt s={15} w={8} lines={1} style={{ flexShrink: 1 }}>
              {w || !b ? (hello ? `Hi ${fname(db.user.name) || 'there'} 👋` : db.user.name || 'My profile') : bizName(b)}
            </Txt>
            {!w && b?.verified === 'verified' ? <Verified size={14} /> : null}
          </View>
          <View style={[S.row, { gap: 4 }]}>
            <Txt s={12} c={C.muted} lines={1}>
              {w ? 'Regular' : 'Business'}
              {isPro() ? ' · PRO' : ''}
            </Txt>
            <Icon name="down" size={12} color={C.muted} />
            <Pressable
              testID="hdr-city"
              accessibilityRole="button"
              accessibilityLabel={`Location: ${place || 'not set'}. Change`}
              hitSlop={8}
              onPress={() => (tap(), w || !b ? openCities() : openCities((c) => ((b.city = c), bump())))}
              style={[S.row, { gap: 2, marginLeft: 6, flexShrink: 1 }]}
            >
              <Icon name="pin" size={12} color={place ? C.muted : C.yellow} />
              <Txt s={12} c={place ? C.muted : C.yellow} lines={1} style={{ flexShrink: 1 }}>
                {place || 'Set location'}
              </Txt>
            </Pressable>
          </View>
        </View>
      </Pressable>
      {reels ? <IconBtn name="play" ring label="Reels — videos of work" onPress={() => router.push('/reels')} /> : null}
      <IconBtn name="chat" ring count={m} label="Messages" onPress={() => router.push('/inbox')} />
      <IconBtn name="bell" ring count={n} label="Notifications" onPress={() => router.push('/notifs')} />
    </View>
  );
}

/** Search field with a filter button. */
export function SearchBar({ value, onChange, placeholder, onFilter, filters }: { value: string; onChange: (v: string) => void; placeholder: string; onFilter?: () => void; filters?: number }) {
  return (
    <View style={[S.row, { gap: 10, height: 52, paddingLeft: 16, paddingRight: 6, borderRadius: 999, backgroundColor: C.s1, borderWidth: 1, borderColor: C.line }]}>
      <Icon name="search" size={20} color={C.muted} />
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={C.faint}
        returnKeyType="search"
        style={[tx(14, 6, C.text), { flex: 1, height: 50, paddingVertical: 0 }]}
        accessibilityLabel={placeholder}
        clearButtonMode="while-editing"
      />
      {value ? (
        <Pressable accessibilityLabel="Clear search" hitSlop={8} onPress={() => onChange('')}>
          <Icon name="x" size={18} color={C.muted} />
        </Pressable>
      ) : null}
      {onFilter ? (
        <Pressable accessibilityLabel={`Filters${filters ? `, ${filters} on` : ''}`} onPress={() => (tap(), onFilter())} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: filters ? C.yellow : C.s2, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="filter" size={18} color={filters ? '#000' : '#fff'} />
          {filters ? (
            <View style={{ position: 'absolute', top: -2, right: -2, minWidth: 16, height: 16, borderRadius: 8, backgroundColor: C.blue, alignItems: 'center', justifyContent: 'center' }}>
              <Txt s={10} w={8}>
                {filters}
              </Txt>
            </View>
          ) : null}
        </Pressable>
      ) : null}
    </View>
  );
}

/** Live booking cards: “Yann is on the way”, “Confirm the job”, “Rate Ama”. */
export function LiveCards() {
  const L = myBookings().filter((b) => b.state !== 'confirmed' || !b.reviewed);
  if (!L.length) return null;
  return (
    <View style={{ gap: 8, marginTop: 12 }}>
      {L.map((b) => {
        const [t, s, cls] = liveInfo(b);
        const o = P(trOther(b));
        const rate = b.state === 'confirmed';
        const moving = b.state === 'onway' || b.state === 'working';
        const bg = cls === 'done' ? C.mint : cls === 'sched' ? C.s1 : C.yellow;
        const fg = cls === 'sched' ? C.text : '#000';
        return (
          <Pressable
            key={b.id}
            accessibilityRole="button"
            accessibilityLabel={`${t}. ${s}`}
            onPress={() => (rate ? openReview(trOther(b), b.id) : openTrack(b.id))}
            style={{ overflow: 'hidden', flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 20, backgroundColor: bg, borderWidth: cls === 'sched' ? 1 : 0, borderColor: C.line }}
          >
            <Avatar pic={o.photo} size={42} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Txt s={14} w={8} c={fg} lines={1}>
                {t}
              </Txt>
              <Txt s={12} c={cls === 'sched' ? C.muted : '#222'} lines={1}>
                {s}
              </Txt>
            </View>
            {moving ? <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: C.ok }} /> : null}
            <Icon name="chev" size={20} color={fg} />
            <View style={{ position: 'absolute', left: 0, bottom: 0, height: 3, width: `${pctOf(b)}%`, backgroundColor: cls === 'sched' ? C.yellow : 'rgba(0,0,0,.35)' }} />
          </Pressable>
        );
      })}
    </View>
  );
}

/** Horizontal category chips (filters the lists on the screen). */
export function CatRail({ value, onChange }: { value: string | null; onChange: (c: string | null) => void }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -20, marginTop: 14 }} contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}>
      {[null, ...CATS.map((c) => c[0])].map((c) => {
        const on = value === c;
        return (
          <Pressable
            key={c || 'all'}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            onPress={() => (tap(), onChange(on && c ? null : c))}
            style={[S.row, { gap: 6, height: 38, paddingHorizontal: 14, borderRadius: 999, backgroundColor: on ? C.yellow : C.s1, borderWidth: 1, borderColor: on ? C.yellow : C.line }]}
          >
            {c ? <Icon name={CATS.find((x) => x[0] === c)![1]} size={16} color={on ? '#000' : C.yellow} /> : null}
            <Txt s={13} w={7} c={on ? '#000' : C.text}>
              {c || 'All'}
            </Txt>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

/** “Recommended  See all” section header. */
export function Sec({ title, action, onAction, style }: { title: string; action?: string; onAction?: () => void; style?: any }) {
  return (
    <View style={[S.rowB, { marginTop: 22, marginBottom: 10 }, style]}>
      <Txt s={18} w={8}>
        {title}
      </Txt>
      {action ? (
        <Pressable hitSlop={8} onPress={onAction}>
          <Txt s={13} w={7} c={C.lav}>
            {action}
          </Txt>
        </Pressable>
      ) : null}
    </View>
  );
}
export function Rail({ children }: { children: React.ReactNode }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -20 }} contentContainerStyle={{ paddingHorizontal: 20, gap: 12 }}>
      {children}
    </ScrollView>
  );
}
export { openCities, greet, fCount, ui, bump, R };
