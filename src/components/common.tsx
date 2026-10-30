import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, ScrollView, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { db, ui } from '../data/db';
import { CATS } from '../data/catalog';
import { Avatar, IconBtn, Txt, tap, Verified } from '../ui/kit';
import { Icon } from '../ui/Icon';
import { C, R, S, tx } from '../ui/theme';
import { bizLogo, bizName, curBiz, fname, greet, isPro, isW, cityLabel, myPhoto, P, unreadMsgs, unreadNotifs, fCount } from '../logic/core';
import { liveInfo, myBookings, pctOf, trOther } from '../logic/work';
import { bump, useTick } from '../logic/live';
import { afterSheet, sheet, SheetTitle } from '../ui/overlay';
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
                {place || 'Set city'}
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
        numberOfLines={1}
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

const liveList = () => myBookings().filter((b) => b.state !== 'confirmed' || !b.reviewed);
const openLive = (b: any, fromSheet?: boolean) => {
  const go = () => (b.state === 'confirmed' ? openReview(trOther(b), b.id) : openTrack(b.id));
  if (fromSheet) afterSheet(go);
  else go();
};
const liveBg = (cls: string) => (cls === 'done' ? C.mint : cls === 'sched' ? C.s3 : C.yellow);

/** Small bubble of faces at the top of the screen — one per live job. Tap to see them all. */
export function LiveBubble({ style }: { style?: any }) {
  const L = liveList();
  if (!L.length) return null;
  const shown = L.slice(0, 3);
  const label = L.map((b) => liveInfo(b)[0]).join('. ');
  return (
    <Pressable
      testID="live-bubble"
      accessibilityRole="button"
      accessibilityLabel={`${L.length} live ${L.length === 1 ? 'job' : 'jobs'}: ${label}. Open`}
      onPress={() => (tap(), openLiveSheet())}
      style={[{ alignSelf: 'center', flexDirection: 'row', alignItems: 'center', padding: 4, paddingRight: L.length > 3 ? 10 : 4, borderRadius: 999, backgroundColor: C.s1, borderWidth: 1, borderColor: C.line }, style]}
    >
      {shown.map((b, i) => {
        const cls = liveInfo(b)[2];
        return (
          <View key={b.id} style={{ marginLeft: i ? -10 : 0, borderRadius: 22, borderWidth: 2.5, borderColor: liveBg(cls) }}>
            <Avatar pic={P(trOther(b)).photo} size={36} />
          </View>
        );
      })}
      {L.length > 3 ? (
        <Txt s={12} w={8} style={{ marginLeft: 6 }}>
          +{L.length - 3}
        </Txt>
      ) : null}
    </Pressable>
  );
}
export function openLiveSheet() {
  sheet.show(() => (
    <View>
      <SheetTitle sub="Jobs happening now — tap one to follow it.">Live now</SheetTitle>
      <LiveCards fromSheet />
    </View>
  ));
}

/** When a job changes (on the way, arrived, done…), a card pops in at the top, then shrinks back into the bubble. */
export function LivePop() {
  useTick();
  const ins = useSafeAreaInsets();
  const [cur, setCur] = useState<{ id: string; key: string } | null>(null);
  const a = useRef(new Animated.Value(0)).current;
  const seen = useRef<Set<string> | null>(null);
  const timer = useRef<any>(null);
  const keys = liveList().map((b) => b.id + ':' + b.state);
  useEffect(() => {
    if (!ui.appStarted) return;
    if (!seen.current) {
      seen.current = new Set(keys);
      return;
    }
    const fresh = keys.filter((k) => !seen.current!.has(k));
    keys.forEach((k) => seen.current!.add(k));
    if (!fresh.length) return;
    const k = fresh[fresh.length - 1];
    setCur({ id: k.split(':')[0], key: k });
    a.setValue(0);
    Animated.spring(a, { toValue: 1, useNativeDriver: true, speed: 14, bounciness: 7 }).start();
    clearTimeout(timer.current);
    timer.current = setTimeout(() => Animated.timing(a, { toValue: 2, duration: 420, easing: Easing.in(Easing.cubic), useNativeDriver: true }).start(() => setCur(null)), 3600);
  }, [keys.join('|')]);
  useEffect(() => () => clearTimeout(timer.current), []);
  const b = cur ? db.BOOKINGS.find((x) => x.id === cur.id) : null;
  if (!b) return null;
  const [t, s2, cls] = liveInfo(b);
  const bg = liveBg(cls);
  const fg = cls === 'sched' ? C.text : '#000';
  return (
    <Animated.View
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        top: ins.top + 6,
        left: 14,
        right: 14,
        alignItems: 'center',
        opacity: a.interpolate({ inputRange: [0, 0.6, 1, 1.7, 2], outputRange: [0, 1, 1, 0.6, 0] }),
        transform: [
          { translateY: a.interpolate({ inputRange: [0, 1, 2], outputRange: [-40, 0, -6] }) },
          { scaleX: a.interpolate({ inputRange: [0, 1, 2], outputRange: [0.4, 1, 0.18] }) },
          { scaleY: a.interpolate({ inputRange: [0, 1, 2], outputRange: [0.6, 1, 0.5] }) },
        ],
      }}
    >
      <Pressable
        testID="live-pop"
        accessibilityRole="alert"
        accessibilityLabel={`${t}. ${s2}`}
        onPress={() => {
          clearTimeout(timer.current);
          setCur(null);
          openLive(b);
        }}
        style={{ width: '100%', maxWidth: 420, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10, paddingRight: 14, borderRadius: 26, backgroundColor: bg, shadowColor: '#000', shadowOpacity: 0.5, shadowRadius: 18, shadowOffset: { width: 0, height: 10 }, elevation: 20 }}
      >
        <Avatar pic={P(trOther(b)).photo} size={40} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Txt s={14} w={8} c={fg} lines={1}>
            {t}
          </Txt>
          <Txt s={12} c={cls === 'sched' ? C.muted : '#222'} lines={1}>
            {s2}
          </Txt>
        </View>
        <Icon name="chev" size={18} color={fg} />
      </Pressable>
    </Animated.View>
  );
}

/** Live booking cards: “Yann is on the way”, “Confirm the job”, “Rate Ama”. */
export function LiveCards({ fromSheet }: { fromSheet?: boolean } = {}) {
  const L = liveList();
  if (!L.length) return null;
  return (
    <View style={{ gap: 8, marginTop: 12 }}>
      {L.map((b) => {
        const [t, s, cls] = liveInfo(b);
        const o = P(trOther(b));
        const moving = b.state === 'onway' || b.state === 'working';
        const bg = cls === 'done' ? C.mint : cls === 'sched' ? C.s1 : C.yellow;
        const fg = cls === 'sched' ? C.text : '#000';
        return (
          <Pressable
            key={b.id}
            accessibilityRole="button"
            accessibilityLabel={`${t}. ${s}`}
            onPress={() => openLive(b, fromSheet)}
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
