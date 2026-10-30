import React, { useState } from 'react';
import { Pressable, SectionList, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { db, ui, Notif } from '../src/data/db';
import { NT_ICON } from '../src/data/catalog';
import { Avatar, Btn, Empty, PTabs, Pill, TopBar, Txt, Verified, tap } from '../src/ui/kit';
import { Icon } from '../src/ui/Icon';
import { toast } from '../src/ui/overlay';
import { C, S } from '../src/ui/theme';
import { NOTIFS, P, fname, has, isW, postById } from '../src/logic/core';
import { bump, useLive } from '../src/logic/live';
import { answerQuoteNotif, bk, confirmDone, deleteNotifs, follow, markAllRead, NT_TABS, readNotif, removeNotif } from '../src/logic/work';
import { openMe, openProfile, openTrack } from '../src/logic/nav';
import { openComments, openJob } from '../src/sheets/work';
import { openChat } from '../src/sheets/chat';
import { openNotifSettings } from '../src/sheets/account';

export default function Notifs() {
  useLive();
  const ins = useSafeAreaInsets();
  const [sel, setSel] = useState<string[] | null>(null);
  const L = NOTIFS();
  const unread = L.filter((n) => !n.read).length;
  const tab = ui.ntTab in NT_TABS ? ui.ntTab : 'All';
  const list = L.filter(NT_TABS[tab]);
  const sections: { title: string; data: Notif[] }[] = [];
  list.forEach((n) => {
    const s = sections[sections.length - 1];
    if (s && s.title === n.g) s.data.push(n);
    else sections.push({ title: n.g, data: [n] });
  });
  const toggle = (id: string) => setSel((s) => (s!.includes(id) ? s!.filter((x) => x !== id) : [...s!, id]));
  const open = (n: Notif) => {
    if (sel) return toggle(n.id);
    readNotif(n.id);
    const who = typeof n.who === 'string' ? n.who : '';
    const go: Record<string, () => void> = {
      like: () => openMe(isW() ? 'Posts' : 'Company'),
      offers: () => openMe(isW() ? 'My jobs' : 'Vacancies'),
      verified: () => openMe(),
      review: () => openProfile(who),
      follow: () => openProfile(who),
      quote: () => openChat(who),
      newjob: () => n.job && openJob(n.job),
      newoffer: () => n.job && openJob(n.job),
      payment_in: () => toast(`${n.amount} added to your balance`),
      accept: () => openChat(who),
      reminder: () => openChat(who),
      mention: () => openComments('m'),
      onway: () => n.booking && openTrack(n.booking),
      arrived: () => n.booking && openTrack(n.booking),
      jobdone: () => n.booking && openTrack(n.booking),
      payment: () => toast(`Receipt: ${n.amount} paid to ${P(who).name}`),
    };
    go[n.type]?.();
  };
  return (
    <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: ins.top }}>
      <View style={{ paddingHorizontal: 20 }}>
        <TopBar
          title={sel ? `${sel.length} selected` : 'Notifications'}
          onBack={sel ? () => setSel(null) : undefined}
          right={
            sel ? (
              <Pressable
                accessibilityLabel="Delete selected"
                disabled={!sel.length}
                onPress={() => {
                  deleteNotifs(sel);
                  setSel(null);
                }}
                style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center', opacity: sel.length ? 1 : 0.4 }}
              >
                <Icon name="trash" size={22} color={C.errSoft} />
              </Pressable>
            ) : (
              <Pressable accessibilityLabel="Notification settings" onPress={openNotifSettings} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="gear" size={22} color={C.text} />
              </Pressable>
            )
          }
        />
        <View style={[S.rowB, { marginTop: 6 }]}>
          <Txt s={13} c={C.muted}>
            {unread ? `${unread} unread` : 'You’re all caught up'}
            {!sel && list.length ? ' · long-press to select' : ''}
          </Txt>
          <Pressable disabled={!unread} onPress={markAllRead} hitSlop={8}>
            <Txt s={13} w={7} c={unread ? C.lav : C.faint}>
              Mark all as read
            </Txt>
          </Pressable>
        </View>
        <PTabs
          style={{ marginTop: 12 }}
          items={Object.keys(NT_TABS).map((t) => [t, t, L.filter((n) => !n.read && NT_TABS[t](n)).length || null] as [string, string, number | null])}
          value={tab}
          onChange={(t) => {
            ui.ntTab = t;
            bump();
          }}
        />
      </View>
      <SectionList
        sections={sections}
        keyExtractor={(n) => n.id}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 + ins.bottom }}
        stickySectionHeadersEnabled={false}
        renderSectionHeader={({ section }) => (
          <Txt s={13} w={8} c={C.muted} style={{ marginTop: 18, marginBottom: 8 }}>
            {section.title}
          </Txt>
        )}
        renderItem={({ item }) => <Row n={item} sel={sel} onPress={() => open(item)} onLong={() => (tap(), setSel(sel ? sel : [item.id]))} />}
        ListEmptyComponent={<Empty style={{ marginTop: 30 }} title="Nothing here" text={tab === 'Mentions' ? 'When someone mentions or reviews you, it’ll show up here.' : tab === 'Jobs' ? 'No job updates yet.' : 'New activity will show up here.'} />}
        initialNumToRender={10}
      />
    </View>
  );
}

function Row({ n, sel, onPress, onLong }: { n: Notif; sel: string[] | null; onPress: () => void; onLong: () => void }) {
  const [ic, col] = NT_ICON[n.type] || ['bell', C.yellow];
  const who = typeof n.who === 'string' ? n.who : null;
  const p = who ? P(who) : null;
  const on = sel?.includes(n.id);
  const B = ({ children }: { children: React.ReactNode }) => (
    <Txt s={14} w={8}>
      {children}
    </Txt>
  );
  const T = (
    <Txt s={12} c={C.faint}>
      {' '}
      · {n.time}
    </Txt>
  );
  let text: React.ReactNode = null;
  let extra: React.ReactNode = null;
  let side: React.ReactNode = null;
  let pics: React.ReactNode = p ? <Avatar pic={p.photo} square={!!p.biz} size={40} /> : null;
  const done = (icon: string, t: string) => (
    <View style={[S.row, { gap: 6, marginTop: 8 }]}>
      <Icon name={icon} size={14} color={C.mint} />
      <Txt s={12} w={7} c={C.mint}>
        {t}
      </Txt>
    </View>
  );
  const quote = (a: string, b: string) => (
    <View style={{ marginTop: 8, padding: 10, borderRadius: 12, backgroundColor: C.s2 }}>
      <Txt s={13} w={8}>
        {a}
      </Txt>
      <Txt s={12} c={C.muted}>
        {b}
      </Txt>
    </View>
  );
  const acts = (...b: React.ReactNode[]) => <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>{b}</View>;
  const name = p ? <B>{p.name}</B> : null;
  switch (n.type) {
    case 'like':
    case 'offers': {
      const ids = (n.who as string[]) || [];
      pics = (
        <View style={{ flexDirection: 'row' }}>
          {ids.slice(0, 2).map((id, i) => (
            <Avatar key={id} pic={P(id).photo} size={32} style={{ marginLeft: i ? -12 : 0, borderWidth: 2, borderColor: C.bg }} />
          ))}
        </View>
      );
      text =
        n.type === 'like' ? (
          <Txt s={14}>
            <B>{fname(P(ids[0])?.name)}</B> and {n.others} others liked your post{T}
          </Txt>
        ) : (
          <Txt s={14}>
            {n.text}
            {T}
          </Txt>
        );
      if (n.snip)
        extra = (
          <Txt s={12} c={C.muted} lines={1} style={{ marginTop: 4 }}>
            {n.snip}
          </Txt>
        );
      if (n.type === 'offers') extra = acts(<Pill key="v" kind="outline" title="View offers" onPress={onPress} />);
      break;
    }
    case 'newjob': {
      const jb = postById(n.job!);
      if (!jb) return null;
      const c = P(jb.client!);
      pics = <Avatar pic={c.photo} square={!!c.biz} size={40} />;
      text = (
        <Txt s={14}>
          New <B>{jb.cat}</B> job near you: <B>{jb.title}</B>
          {T}
        </Txt>
      );
      extra = (
        <>
          {quote(jb.budget!, `${jb.when} · ${jb.area}`)}
          {db.myOffers[jb.id] ? done('check', 'Offer sent') : isW() ? acts(<Pill key="o" title="Send offer" onPress={() => openJob(jb.id)} />) : null}
        </>
      );
      break;
    }
    case 'verified':
      text = (
        <Txt s={14}>
          <B>You’re verified!</B> Your profile now shows the badge <Verified size={13} />. People trust verified profiles more.{T}
        </Txt>
      );
      break;
    case 'follow': {
      const f = has(db.followed, who!);
      text = (
        <Txt s={14}>
          {name} started following you{T}
        </Txt>
      );
      side = <Pill kind={f ? 'outline' : 'y'} title={f ? 'Following' : 'Follow back'} onPress={() => follow(who!)} />;
      break;
    }
    case 'quote':
      text = (
        <Txt s={14}>
          {name} sent you a quote{T}
        </Txt>
      );
      extra = (
        <>
          {quote(`${n.job} · ${n.price}`, n.when || '')}
          {n.state
            ? done(n.state === 'acc' ? 'check' : 'x', n.state === 'acc' ? 'Quote accepted, job booked' : 'Quote declined')
            : acts(<Pill key="a" title="Accept" onPress={() => answerQuoteNotif(n.id, 'acc')} />, <Pill key="d" kind="outline" title="Decline" onPress={() => answerQuoteNotif(n.id, 'dec')} />, <Pill key="m" kind="dim" title="Message" onPress={() => openChat(who!)} />)}
        </>
      );
      break;
    case 'accept':
    case 'reminder':
      text = (
        <Txt s={14}>
          {n.type === 'reminder' ? 'Reminder: ' : ''}
          {name} {n.text}
          {T}
        </Txt>
      );
      break;
    case 'mention':
    case 'review':
      text = (
        <Txt s={14}>
          {name} {n.type === 'mention' ? 'mentioned you in a comment' : 'left you a review'}
          {T}
        </Txt>
      );
      extra = (
        <Txt s={13} c="#d9d9de" style={{ marginTop: 6 }}>
          {n.stars ? <Txt s={13} c={C.yellow}>{'★'.repeat(n.stars)} </Txt> : null}
          {n.text}
        </Txt>
      );
      break;
    case 'payment_in':
      text = (
        <Txt s={14}>
          You received <B>{n.amount}</B> from {name}
          {T}
        </Txt>
      );
      break;
    case 'payment':
      text = (
        <Txt s={14}>
          Payment of <B>{n.amount}</B> to {name} confirmed{T}
        </Txt>
      );
      break;
    case 'newoffer': {
      const jb = postById(n.job!);
      const o = jb?.offerList?.find((x) => x.by === who);
      text = (
        <Txt s={14}>
          {name} sent an offer on <B>“{jb ? jb.title : 'your job'}”</B>
          {T}
        </Txt>
      );
      if (o) extra = <>{quote(o.price, o.when)}{acts(<Pill key="v" title="View offers" onPress={() => openJob(n.job!)} />, <Pill key="m" kind="dim" title="Message" onPress={() => openChat(who!)} />)}</>;
      break;
    }
    case 'onway':
    case 'arrived':
    case 'jobdone': {
      const b = n.booking ? bk(n.booking) : null;
      text = (
        <Txt s={14}>
          {name} {n.text}
          {T}
        </Txt>
      );
      if (b && n.type !== 'jobdone' && ['onway', 'working'].includes(b.state)) extra = acts(<Pill key="t" icon="nav" title="Track job" onPress={() => openTrack(b.id)} />);
      if (b && n.type === 'jobdone')
        extra =
          b.state === 'done'
            ? acts(<Pill key="c" title="Confirm & pay" onPress={() => confirmDone(b.id)} />, <Pill key="v" kind="outline" title="View job" onPress={() => openTrack(b.id)} />)
            : b.state === 'confirmed'
              ? done('check', `Confirmed · ${b.price} paid`)
              : done('wrench', 'Issue reported · back in progress');
      break;
    }
    default:
      text = (
        <Txt s={14}>
          {name} {n.text}
          {T}
        </Txt>
      );
  }
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLong}
      delayLongPress={350}
      accessibilityHint="Long-press to select"
      style={({ pressed }) => [{ flexDirection: 'row', gap: 12, padding: 12, marginBottom: 8, borderRadius: 18, backgroundColor: on ? 'rgba(61,90,241,.18)' : n.read ? (pressed ? C.s2 : C.s1) : pressed ? C.s3 : C.s2, borderWidth: 1, borderColor: on ? C.blue : n.read ? C.line : 'rgba(246,238,92,.25)' }]}
    >
      {sel ? <Icon name={on ? 'checkc' : 'check2'} size={22} color={on ? C.yellow : C.faint} style={{ marginTop: 8 }} /> : null}
      <View style={{ alignItems: 'center' }}>
        {pics || (
          <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: C.s3, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name={ic} size={20} color={col} />
          </View>
        )}
        {pics ? (
          <View style={{ position: 'absolute', right: -4, bottom: -4, width: 20, height: 20, borderRadius: 10, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name={ic} size={12} color={col} />
          </View>
        ) : null}
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={[S.row, { gap: 8, alignItems: 'flex-start' }]}>
          <View style={{ flex: 1 }}>{text}</View>
          {side}
          {!n.read ? <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: C.yellow, marginTop: 6 }} /> : null}
        </View>
        {extra}
      </View>
      {!sel ? (
        <Pressable accessibilityLabel="Remove notification" hitSlop={8} onPress={() => removeNotif(n.id)} style={{ paddingTop: 2 }}>
          <Icon name="x" size={16} color={C.faint} />
        </Pressable>
      ) : null}
    </Pressable>
  );
}
export { router, Btn };
