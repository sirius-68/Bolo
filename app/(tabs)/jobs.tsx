/* Jobs. Hiring: what is happening now (booked jobs and open requests), then what came before.
   Working: this week's earnings, then Active, Offers you sent, and Done. */
import React, { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { db, Booking } from '../../src/data/db';
import { useLive } from '../../src/logic/live';
import { P, fname, postById } from '../../src/logic/core';
import { closeJob, hideFromJobs, myBookings, trOther, withdrawOffer } from '../../src/logic/work';
import { earnedThisWeek, money, myRequests, whenText, working } from '../../src/g/data';
import { GIcon, GIconName } from '../../src/g/icons';
import { confirm, toast } from '../../src/g/notice';
import { Pull } from '../../src/g/parts';
import { SelAction, SelectActions, SelectHead, SelectMark, useSelect } from '../../src/g/select';
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
  const before = mine.filter((b) => b.state === 'confirmed' && !db.HIDE['b:' + b.id]);
  const asked = signed && !work ? myRequests() : [];
  const sent = work ? Object.keys(db.myOffers).filter((id) => !db.HIDE['o:' + id]).map((id) => ({ id, o: db.myOffers[id], po: postById(id) })).filter((x) => x.po) : [];
  const week = earnedThisWeek();

  const head = (text: string) => (
    <T s={13} w={7} c="muted" style={{ marginTop: 20, marginBottom: 2 }}>
      {text}
    </T>
  );
  /* Hold a row to select it; then cancel requests, withdraw offers or take finished jobs off the list, several at once.
     Keys: "b:<booking>", "r:<request>", "o:<request I sent a price for>". */
  const sel = useSelect();
  const offerTaken = (id: string) => {
    const po = postById(id);
    return !po || po.status === 'booked' || po.status === 'closed' || !!po.booked;
  };
  const shown: string[] = work
    ? tab === 'active'
      ? now.map((b) => 'b:' + b.id)
      : tab === 'offers'
        ? sent.map((x) => 'o:' + x.id)
        : before.map((b) => 'b:' + b.id)
    : [...now.map((b) => 'b:' + b.id), ...asked.map((po) => 'r:' + po.id), ...before.map((b) => 'b:' + b.id)];
  React.useEffect(() => sel.keep(shown));
  const removeSel = () => {
    const ids = (pre: string) => sel.ids.filter((k) => k.startsWith(pre)).map((k) => k.slice(2));
    const reqs = ids('r:');
    const offs = ids('o:');
    const waiting = offs.filter((id) => db.myOffers[id]?.state !== 'acc' && !offerTaken(id));
    const answered = offs.filter((id) => !waiting.includes(id));
    const bks = ids('b:').map((id) => all.find((b) => b.id === id)).filter(Boolean) as Booking[];
    const live = bks.filter((b) => b.state !== 'confirmed');
    const done = bks.filter((b) => b.state === 'confirmed');
    const n = reqs.length + offs.length + done.length;
    const liveNote = live.length ? (live.length === 1 ? 'The job in progress stays: open it to cancel it, so the other person is told why.' : `The ${live.length} jobs in progress stay: open one to cancel it, so the other person is told why.`) : '';
    if (!n) return toast(liveNote || 'Nothing to remove');
    const parts = [
      reqs.length ? (reqs.length === 1 ? 'Your request is cancelled: workers stop seeing it.' : `${reqs.length} requests are cancelled: workers stop seeing them.`) : '',
      waiting.length ? (waiting.length === 1 ? 'Your offer is withdrawn: the client no longer sees your price.' : `${waiting.length} offers are withdrawn: the clients no longer see your prices.`) : '',
      answered.length + done.length ? `${answered.length + done.length === 1 ? 'The finished one leaves' : 'The finished ones leave'} your list only. ${work ? 'Your earnings and ratings don’t change.' : 'The worker keeps it, and ratings don’t change.'}` : '',
      liveNote,
    ].filter(Boolean);
    confirm({
      title: n === 1 ? (reqs.length ? 'Cancel this request?' : waiting.length ? 'Withdraw this offer?' : 'Remove from your list?') : `Remove ${n} from your list?`,
      text: parts.join(' '),
      ok: n === 1 && reqs.length ? 'Cancel request' : n === 1 && waiting.length ? 'Withdraw offer' : 'Remove',
      cancel: 'Keep',
      danger: true,
      onOk: () => {
        reqs.forEach(closeJob);
        waiting.forEach(withdrawOffer);
        hideFromJobs([...answered.map((id) => 'o:' + id), ...done.map((b) => 'b:' + b.id)]);
        sel.clear();
        if (n > 1) toast(`${n} removed`);
      },
    });
  };
  const actions: SelAction[] = [{ id: 'delete', icon: 'trash', label: sel.ids.length === 1 && sel.ids[0].startsWith('r:') ? 'Cancel request' : sel.ids.length === 1 && sel.ids[0].startsWith('o:') && !offerTaken(sel.ids[0].slice(2)) && db.myOffers[sel.ids[0].slice(2)]?.state !== 'acc' ? 'Withdraw offer' : 'Remove', danger: true, run: removeSel }];

  const line = (key: string, left: React.ReactNode, title: string, time: string, sub: string, live: boolean, onPress: () => void, unread?: boolean, sk?: string) => (
    <Pressable
      key={key}
      testID={`job-${key}`}
      accessibilityRole="button"
      accessibilityHint={sk ? 'Press and hold to select' : undefined}
      accessibilityState={sk ? { selected: sel.has(sk) } : undefined}
      onPress={() => (sk ? sel.press(sk, onPress) : sel.on ? undefined : (tap(), onPress()))}
      onLongPress={sk ? () => sel.hold(sk) : undefined}
      delayLongPress={350}
      style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 70, paddingVertical: 10, paddingHorizontal: 2, borderBottomWidth: 1, borderBottomColor: t.line, opacity: pressed ? 0.6 : 1 })}
    >
      {sk && sel.on ? <SelectMark on={sel.has(sk)} /> : left}
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
    return line(b.id, <Face name={other?.name || '?'} photo={other?.photo} size={48} />, b.title, live ? '' : whenText(b.when), [other?.name ? (live ? other.name : fname(other.name)) : '', standing(b)].filter(Boolean).join(' · '), live, () => router.push(`/track/${b.id}` as any), needsMe, 'b:' + b.id);
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
              return line(id, <Face name={c?.name || '?'} photo={c?.photo} size={48} />, po!.title || 'Job', po!.time, o.ask && !taken && o.state !== 'acc' ? `Can you do it for ${money(o.ask)}? · tap to answer` : `Your price ${money(o.price)} · ${o.state === 'acc' ? 'accepted' : taken ? 'someone else was chosen' : `waiting for ${fname(c?.name || 'the client')}`}`, o.state === 'acc' || (!!o.ask && !taken), () => router.push(`/wrequest/${id}` as any), !!o.ask && !taken && o.state !== 'acc', 'o:' + id);
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
          // handled by the getit agent: its screen says where it stands (and whether it needs me)
          if (po.agent === '1' && !String(po.id).startsWith('tmp_')) return line(po.id, dot('bell'), po.title || po.cat || 'Request', po.time, n ? `getit is handling it · ${n} ${n === 1 ? 'offer' : 'offers'} so far` : 'getit is handling it · asking workers', true, () => router.push(`/agent/${po.id}` as any), false, 'r:' + po.id);
          return line(po.id, dot('bell'), po.title || po.cat || 'Request', po.time, n ? `${n} ${n === 1 ? 'offer' : 'offers'} · tap to choose` : 'Asking for prices · waiting for offers', true, () => router.push((n > 1 ? `/offers/${po.id}` : `/asked/${po.id}`) as any), n > 0, 'r:' + po.id);
        })}
        {before.length ? head('Before') : null}
        {before.map((b) => job(b, false))}
      </>
    );
  return (
    <Screen top={28} style={{ paddingHorizontal: 20 }}>
      {sel.on ? (
        <>
          <SelectHead sel={sel} all={shown} />
          <View style={{ marginTop: 16 }}>
            <SelectActions actions={actions} />
          </View>
        </>
      ) : (
        <T s={34} w={8} lh={1.15} ls={-0.8}>
          Jobs
        </T>
      )}
      {work && !sel.on ? (
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
              ids="jobs"
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
