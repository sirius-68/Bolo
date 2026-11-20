/* Jobs. Hiring: what is happening now (booked jobs and open requests), then what came before.
   Working: this week's earnings, then Active, Offers you sent, and Done. */
import React, { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { db, Booking } from '../../src/data/db';
import { useLive } from '../../src/logic/live';
import { P, fname, postById } from '../../src/logic/core';
import { myBookings, trOther } from '../../src/logic/work';
import { earnedThisWeek, money, myRequests, whenText, working } from '../../src/g/data';
import { GIcon, GIconName } from '../../src/g/icons';
import { Pull } from '../../src/g/parts';
import { openSignIn } from '../../src/g/signin';
import { TAB_SPACE } from '../../src/g/TabBar';
import { RED, useG } from '../../src/g/theme';
import { tap } from '../../src/g/touch';
import { Big, Face, Link, Screen, Seg, T } from '../../src/g/ui';

/** Where a job stands, in a few words, for the person looking at it. */
function standing(b: Booking): string {
  const mine = b.worker === 'me';
  switch (b.state) {
    case 'booked':
      return `Booked · ${whenText(b.when)}`;
    case 'onway':
      return mine ? 'You’re on the way' : `On the way${b.eta ? ` · ${b.eta} min` : ''}`;
    case 'working':
      return mine ? 'You’re working' : 'Working now';
    case 'done':
      return mine ? 'Waiting for them to confirm' : 'Done · please confirm';
    default:
      return [/\d/.test(b.price) ? money(b.price) : '', b.reviewed ? 'done' : 'done · rate it'].filter(Boolean).join(' · ');
  }
}

export default function Jobs() {
  useLive();
  const t = useG();
  const ins = useSafeAreaInsets();
  const signed = db.loggedIn;
  const work = working() && signed;
  const [tab, setTab] = useState<'active' | 'offers' | 'done'>('active');
  const all = signed ? myBookings() : [];
  const mine = work ? all.filter((b) => b.worker === 'me') : all.filter((b) => b.client === 'me');
  const now = mine.filter((b) => b.state !== 'confirmed');
  const before = mine.filter((b) => b.state === 'confirmed');
  const asked = signed && !work ? myRequests() : [];
  const sent = work ? Object.keys(db.myOffers).map((id) => ({ id, o: db.myOffers[id], po: postById(id) })).filter((x) => x.po) : [];
  const week = earnedThisWeek();

  const head = (text: string) => (
    <T s={13} w={7} c="muted" style={{ marginTop: 20, marginBottom: 2 }}>
      {text}
    </T>
  );
  const line = (key: string, left: React.ReactNode, title: string, time: string, sub: string, live: boolean, onPress: () => void, unread?: boolean) => (
    <Pressable key={key} testID={`job-${key}`} accessibilityRole="button" onPress={() => (tap(), onPress())} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 70, paddingVertical: 10, paddingHorizontal: 2, borderBottomWidth: 1, borderBottomColor: t.line, opacity: pressed ? 0.7 : 1 })}>
      {left}
      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
          <T s={15} w={8} lines={1} style={{ flexShrink: 1 }}>
            {title}
          </T>
          <T s={12} c="muted" lines={1}>
            {time}
          </T>
        </View>
        <T s={13} c={live ? t.accent : t.muted} lines={1}>
          {sub}
        </T>
      </View>
      {unread ? <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: RED }} /> : null}
    </Pressable>
  );
  const dot = (icon: GIconName) => (
    <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: t.tabOn, alignItems: 'center', justifyContent: 'center' }}>
      <GIcon name={icon} size={22} color={t.accent} />
    </View>
  );
  const job = (b: Booking, live: boolean) => {
    const other = P(trOther(b));
    const needsMe = b.state === 'done' && b.client === 'me';
    return line(b.id, <Face name={other?.name || '?'} photo={other?.photo} size={48} />, b.title, live ? '' : whenText(b.when), [other?.name ? (live ? other.name : fname(other.name)) : '', standing(b)].filter(Boolean).join(' · '), live, () => router.push(`/track/${b.id}` as any), needsMe);
  };
  const empty = (title: string, sub: string) => (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, paddingBottom: 60, paddingTop: 40 }}>
      <T s={20} w={8} lh={1.25} ls={0} center>
        {title}
      </T>
      <T s={15} lh={1.5} c="muted" center style={{ maxWidth: 280 }}>
        {sub}
      </T>
      <Big testID="jobs-empty" h={48} title={work ? 'Back to work' : 'Find a worker'} style={{ marginTop: 12 }} onPress={() => router.navigate('/find' as any)} />
      {!signed ? <Link testID="tab-signin" title="Sign in" onPress={() => openSignIn()} /> : null}
    </View>
  );

  let body: React.ReactNode;
  if (work) {
    body =
      tab === 'active' ? (
        <>
          {head('Now')}
          {now.length ? now.map((b) => job(b, true)) : line('none', <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: t.card2, alignItems: 'center', justifyContent: 'center' }}><T s={16} w={8} c="muted">·</T></View>, 'No job right now', '', 'Stay available to get jobs near you', false, () => router.navigate('/find' as any))}
        </>
      ) : tab === 'offers' ? (
        sent.length ? (
          <>
            {head('Offers you sent')}
            {sent.map(({ id, o, po }) => {
              const c = P(po!.client || '');
              const taken = po!.status === 'booked' || po!.status === 'closed' || !!po!.booked;
              return line(id, <Face name={c?.name || '?'} photo={c?.photo} size={48} />, po!.title || 'Job', po!.time, `Your price ${money(o.price)} · ${o.state === 'acc' ? 'accepted' : taken ? 'someone else was chosen' : `waiting for ${fname(c?.name || 'the client')}`}`, o.state === 'acc', () => router.push(`/wrequest/${id}` as any));
            })}
          </>
        ) : (
          empty('No offers yet', 'When you send your price for a job, it shows here until the client answers.')
        )
      ) : before.length ? (
        <>
          {head('Done')}
          {before.map((b) => job(b, false))}
        </>
      ) : (
        empty('No finished jobs yet', 'Jobs both of you closed show here, with what you earned.')
      );
  } else if (!now.length && !before.length && !asked.length) body = empty('No jobs yet', 'People you call, message or book show up here, so you can find them again.');
  else
    body = (
      <>
        {now.length || asked.length ? head('Now') : null}
        {now.map((b) => job(b, true))}
        {asked.map((po) => {
          const n = (po.offerList || []).length || po.offers || 0;
          return line(po.id, dot('bell'), po.title || po.cat || 'Request', po.time, n ? `${n} ${n === 1 ? 'offer' : 'offers'} · tap to choose` : 'Asking for prices · waiting for offers', true, () => router.push((n > 1 ? `/offers/${po.id}` : `/asked/${po.id}`) as any), n > 0);
        })}
        {before.length ? head('Before') : null}
        {before.map((b) => job(b, false))}
      </>
    );
  return (
    <Screen top={28} style={{ paddingHorizontal: 20 }}>
      <T s={34} w={8} lh={1.15} ls={-0.8}>
        Jobs
      </T>
      {work ? (
        <>
          <View style={{ marginTop: 16, paddingVertical: 16, paddingHorizontal: 18, borderRadius: 22, backgroundColor: RED }}>
            <T s={13} w={7} c="#ffffff">
              This week
            </T>
            <T s={30} w={8} ls={-0.6} c="#ffffff" style={{ marginTop: 2 }}>
              {week.total.toLocaleString('en-US')} FCFA
            </T>
            <T s={13} c="#ffffff" style={{ marginTop: 2 }}>
              {week.jobs} {week.jobs === 1 ? 'job' : 'jobs'} · paid to you directly
            </T>
          </View>
          <View style={{ marginTop: 16 }}>
            <Seg
              items={[
                ['active', 'Active'],
                ['offers', sent.length ? `Offers · ${sent.length}` : 'Offers'],
                ['done', 'Done'],
              ]}
              value={tab}
              onChange={setTab}
            />
          </View>
        </>
      ) : null}
      <ScrollView showsVerticalScrollIndicator={false} refreshControl={signed ? <Pull /> : undefined} contentContainerStyle={{ paddingBottom: TAB_SPACE + ins.bottom, flexGrow: 1 }}>
        {body}
      </ScrollView>
    </Screen>
  );
}
