import React from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { db, Booking } from '../../src/data/db';
import { useLive } from '../../src/logic/live';
import { P, fname } from '../../src/logic/core';
import { openTrack } from '../../src/logic/nav';
import { myBookings, trOther } from '../../src/logic/work';
import { openJob } from '../../src/sheets/work';
import { tap } from '../../src/ui/kit';
import { Pull } from '../../src/components/common';
import { working } from '../../src/g/data';
import { GIcon } from '../../src/g/icons';
import { TAB_SPACE } from '../../src/g/TabBar';
import { useG } from '../../src/g/theme';
import { Big, Face, Link, Screen, T } from '../../src/g/ui';

/** Where a job stands, in a few words, for the person looking at it. */
function standing(b: Booking): string {
  const mine = b.worker === 'me';
  switch (b.state) {
    case 'booked':
      return 'Booked';
    case 'onway':
      return mine ? 'You’re on the way' : `On the way${b.eta ? ` · ${b.eta} min` : ''}`;
    case 'working':
      return mine ? 'You’re working' : 'Working';
    case 'done':
      return mine ? 'Waiting for them to confirm' : 'Done? Confirm it';
    default:
      return b.reviewed ? 'Done' : 'Done · rate it';
  }
}

/** Jobs: what is happening now on top, finished jobs below. */
export default function Jobs() {
  useLive();
  const t = useG();
  const ins = useSafeAreaInsets();
  const work = working();
  const all = db.loggedIn ? myBookings() : [];
  const now = all.filter((b) => b.state !== 'confirmed');
  const before = all.filter((b) => b.state === 'confirmed');
  // requests of mine that are still open for offers
  const asked = db.loggedIn ? db.POSTS.filter((p) => p.mine && p.kind === 'request' && p.as !== 'business' && p.status !== 'closed' && p.status !== 'booked') : [];
  const empty = !now.length && !before.length && !asked.length;
  const row = (b: Booking, live: boolean, last: boolean) => {
    const other = P(trOther(b));
    return (
      <Pressable key={b.id} testID={`job-${b.id}`} accessibilityRole="button" onPress={() => (tap(), openTrack(b.id))} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 70, paddingVertical: 10, paddingHorizontal: 2, borderBottomWidth: last ? 0 : 1, borderBottomColor: t.line, opacity: pressed ? 0.6 : 1 })}>
        <Face name={other?.name || '?'} photo={other?.photo} size={48} />
        <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
            <T s={15} w={8} lines={1} style={{ flexShrink: 1 }}>
              {b.title}
            </T>
            <T s={12} c={t.muted} lines={1}>
              {b.when}
            </T>
          </View>
          <T s={13} c={live ? t.accent : t.muted} lines={1}>
            {[other?.name ? fname(other.name) : '', standing(b)].filter(Boolean).join(' · ')}
          </T>
        </View>
      </Pressable>
    );
  };
  const head = (text: string) => (
    <T s={13} w={7} c={t.muted} style={{ marginTop: 20, marginBottom: 2 }}>
      {text}
    </T>
  );
  return (
    <Screen top={28} style={{ paddingHorizontal: 20 }}>
      <T s={34} w={8} lh={1.15} ls={-0.8}>
        Jobs
      </T>
      <ScrollView showsVerticalScrollIndicator={false} refreshControl={db.loggedIn ? <Pull /> : undefined} contentContainerStyle={{ paddingBottom: TAB_SPACE + ins.bottom, flexGrow: 1 }}>
        {now.length || asked.length ? head('Now') : null}
        {now.map((b, i) => row(b, true, i === now.length - 1 && !asked.length))}
        {asked.map((po, i) => (
          <Pressable key={po.id} testID={`asked-${po.id}`} accessibilityRole="button" onPress={() => (tap(), openJob(po.id))} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 70, paddingVertical: 10, paddingHorizontal: 2, borderBottomWidth: i === asked.length - 1 ? 0 : 1, borderBottomColor: t.line, opacity: pressed ? 0.6 : 1 })}>
            <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: t.tabOn, alignItems: 'center', justifyContent: 'center' }}>
              <GIcon name="bell" size={22} color={t.accent} />
            </View>
            <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
                <T s={15} w={8} lines={1} style={{ flexShrink: 1 }}>
                  {po.title || po.cat || 'Request'}
                </T>
                <T s={12} c={t.muted} lines={1}>
                  {po.time}
                </T>
              </View>
              <T s={13} c={t.accent} lines={1}>
                {po.offers ? `${po.offers} ${po.offers === 1 ? 'offer' : 'offers'} · tap to choose` : 'Asking for prices · waiting for offers'}
              </T>
            </View>
          </Pressable>
        ))}
        {before.length ? head('Before') : null}
        {before.map((b, i) => row(b, false, i === before.length - 1))}
        {empty ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, paddingBottom: 60 }}>
            <T s={20} w={8} lh={1.25} ls={0} center>
              No jobs yet
            </T>
            <T s={15} lh={1.5} c={t.muted} center style={{ maxWidth: 280 }}>
              {work ? 'Jobs you take show here, from booked to paid.' : 'Jobs you book show here, from start to finish.'}
            </T>
            <Big testID="jobs-empty" h={48} title={work ? 'See jobs near you' : 'Find a worker'} style={{ marginTop: 12 }} onPress={() => router.navigate('/find' as any)} />
            {!db.loggedIn ? <Link title="Sign in" onPress={() => router.push('/login')} /> : null}
          </View>
        ) : null}
      </ScrollView>
    </Screen>
  );
}
