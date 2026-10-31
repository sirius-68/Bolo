import React from 'react';
import { Pressable, ScrollView, View, useWindowDimensions } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';
import { Avatar, Btn, Empty, IconBtn, Note, Pict, Rate, Txt, Verified, goBack } from '../../src/ui/kit';
import { Icon } from '../../src/ui/Icon';
import { confirm } from '../../src/ui/overlay';
import { C, S } from '../../src/ui/theme';
import { P, fname, myPhoto, nowT, pinOf } from '../../src/logic/core';
import { useLive } from '../../src/logic/live';
import { bk, cancelBooking, confirmDone, pctOf, reportIssue, trOther, wArrive, wDone, wStart } from '../../src/logic/work';
import { openProfile } from '../../src/logic/nav';
import { openChat } from '../../src/sheets/chat';
import { openHire, openReview } from '../../src/sheets/work';
import { RouteMap } from '../../src/components/LiveMap';
import { hasMapbox } from '../../src/lib/mapbox';
import { coordOf } from '../../src/data/geo';
import { db, Booking } from '../../src/data/db';
import { bookingAmt } from '../../src/logic/wallet';
import { openEscrowInfo, openFund } from '../../src/sheets/wallet';
import { xaf } from '../../src/logic/core';

const STEPS: [string, string, string][] = [
  ['booked', 'Booked', 'calcheck'],
  ['onway', 'On the way', 'nav'],
  ['working', 'Working', 'wrench'],
  ['done', 'Done', 'flag'],
  ['confirmed', 'Paid', 'coins'],
];
/** Route as a polyline in a 390×330 box (start → home). */
const ROUTE: [number, number][] = [
  [58, 270],
  [90, 262],
  [118, 236],
  [140, 200],
  [170, 182],
  [212, 178],
  [250, 160],
  [268, 130],
  [290, 104],
  [330, 86],
];
function along(t: number): [number, number] {
  const seg: number[] = [];
  let tot = 0;
  for (let i = 1; i < ROUTE.length; i++) {
    const d = Math.hypot(ROUTE[i][0] - ROUTE[i - 1][0], ROUTE[i][1] - ROUTE[i - 1][1]);
    seg.push(d);
    tot += d;
  }
  let want = Math.max(0, Math.min(1, t)) * tot;
  for (let i = 0; i < seg.length; i++) {
    if (want <= seg[i]) {
      const k = want / seg[i];
      return [ROUTE[i][0] + (ROUTE[i + 1][0] - ROUTE[i][0]) * k, ROUTE[i][1] + (ROUTE[i + 1][1] - ROUTE[i][1]) * k];
    }
    want -= seg[i];
  }
  return ROUTE[ROUTE.length - 1];
}

export default function Track() {
  useLive();
  const { id } = useLocalSearchParams<{ id: string }>();
  const ins = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const b = bk(id);
  if (!b)
    return (
      <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: ins.top, padding: 20 }}>
        <IconBtn name="back" label="Back" onPress={goBack} />
        <Empty title="Booking not found" text="It may have been cancelled." />
      </View>
    );
  const W = b.worker === 'me';
  const oid = trOther(b);
  const o = P(oid);
  const f = fname(o.name);
  const idx = STEPS.findIndex((s) => s[0] === b.state);
  const prog = b.state === 'booked' ? 0 : b.state === 'onway' ? Math.max(0.06, 1 - b.eta / (b.eta0 || 1)) : 1;
  const k = width / 390;
  const H = 330 * k;
  const [px, py] = along(prog);
  const ST: Record<string, [string, string]> = W
    ? {
        booked: [`Job with ${f}`, `${b.when} · Tap Start trip when you leave so ${f} can follow you.`],
        onway: [`Heading to ${f}`, `${b.eta} min · ${b.area}`],
        working: ['Job in progress', `Started at ${b.log.working || nowT()}. Tap Mark as done when you finish.`],
        done: [`Waiting for ${f}`, `${f} is checking the work. Payment is released when they confirm.`],
        confirmed: ['Job complete', `${b.price} has been added to your balance.`],
      }
    : {
        booked: [`${f} starts ${b.when}`, 'We’ll let you know when they’re on the way.'],
        onway: [`${f} is on the way`, `Arriving in about ${b.eta} min`],
        working: [`${f} is working`, `Started at ${b.log.working || nowT()}`],
        done: [`${f} says the job is done`, 'Check the work and confirm to release payment.'],
        confirmed: ['Job complete', `You paid ${b.price}`],
      };
  const [h, s] = ST[b.state];
  const eta: Record<string, [string, string]> = { booked: ['calcheck', b.when], onway: ['timer', `${b.eta} min away`], working: ['wrench', 'Working now'], done: ['flag', 'Job done'], confirmed: ['checkc', 'Paid'] };
  let act: React.ReactNode = null;
  if (W)
    act = {
      booked: <Btn variant="yellow" icon="nav" title="Start trip" onPress={() => wStart(b.id)} testID="tk-start" />,
      onway: (
        <>
          <Note icon="lock">Ask {f} for their 4-digit code when you arrive.</Note>
          <Btn variant="yellow" icon="flag" title="I’ve arrived, start job" onPress={() => wArrive(b.id)} />
        </>
      ),
      working: <Btn variant="yellow" icon="checkc" title="Mark job as done" onPress={() => wDone(b.id)} />,
      done: <Btn disabled icon="timer" title={`Waiting for ${f} to confirm…`} />,
      confirmed: (
        <>
          <Note icon="coins" color={C.mint}>
            {b.price} added to your wallet
          </Note>
          {!b.reviewed ? <Btn variant="yellow" icon="star" title={`Rate ${f}`} onPress={() => openReview(oid, b.id)} /> : null}
        </>
      ),
    }[b.state];
  else
    act = {
      booked: (
        <>
          <Note icon="calcheck">You can cancel for free until they’re on the way.</Note>
          <Btn
            variant="ghost"
            title="Cancel booking"
            onPress={() =>
              confirm({
                title: 'Cancel this booking?',
                text: `${f} will be told right away. It’s free to cancel before they leave.`,
                ok: 'Cancel booking',
                cancel: 'Keep it',
                danger: true,
                icon: 'calcheck',
                onOk: () => {
                  cancelBooking(b.id);
                  router.back();
                },
              })
            }
          />
        </>
      ),
      onway: (
        <Note icon="lock">
          Your job code is{' '}
          <Txt s={14} w={8} style={{ letterSpacing: 3 }}>
            {pinOf(b.id)}
          </Txt>{' '}
          Share it with {f} when they arrive.
        </Note>
      ),
      working: (
        <Note icon="wrench">
          {f} arrived at {b.log.working || nowT()}. You’ll be asked to confirm when they finish.
        </Note>
      ),
      done: (
        <>
          <Btn variant="yellow" icon="checkc" title="Confirm job is done" onPress={() => confirmDone(b.id)} testID="tk-confirm" />
          <Btn variant="ghost" title="Something’s wrong" onPress={() => reportIssue(b.id)} />
        </>
      ),
      confirmed: (
        <>
          {b.reviewed ? (
            <Note icon="star" color={C.yellow}>
              Thanks for your review!
            </Note>
          ) : (
            <Btn variant="yellow" icon="star" title={`Rate ${f}`} onPress={() => openReview(oid, b.id)} />
          )}
          <Btn variant="ghost" title={`Book ${f} again`} onPress={() => openHire(oid)} />
        </>
      ),
    }[b.state];
  const d = 'M' + ROUTE.map(([x, y]) => `${x * k} ${y * k}`).join(' L');
  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <View style={{ height: H + ins.top, overflow: 'hidden' }}>
        {hasMapbox ? (
          <View style={{ position: 'absolute', left: 0, right: 0, top: 0 }}>
            <RouteMap from={coordOf(b.worker, W ? db.PR.area.home : P(b.worker).area)} to={coordOf(b.id, b.area)} progress={prog} workerPic={W ? myPhoto() : P(b.worker).photo} height={H + ins.top} />
          </View>
        ) : (
          <>
        <Pict pic="img/map-bg" style={{ position: 'absolute', width, height: 612 * k, top: -60 * k }} />
        <Svg width={width} height={H} style={{ position: 'absolute', top: ins.top }}>
          <Path d={d} stroke={C.yellow} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" strokeDasharray="2 9" fill="none" opacity={0.9} />
          <Circle cx={330 * k} cy={86 * k} r={22} fill={C.yellow} stroke="#000" strokeWidth={3} />
        </Svg>
        <View style={{ position: 'absolute', left: 330 * k - 10, top: ins.top + 86 * k - 10 }}>
          <Icon name="house" size={20} color="#000" />
        </View>
        <View style={{ position: 'absolute', left: px * k - 24, top: ins.top + py * k - 24 }}>
          <Avatar pic={W ? myPhoto() : P(b.worker).photo} size={48} ring={C.blue} />
        </View>
          </>
        )}
        <View style={[S.rowB, { position: 'absolute', left: 16, right: 16, top: ins.top + 8 }]}>
          <IconBtn name="back" label="Back" bg="rgba(0,0,0,.6)" onPress={goBack} />
          <View style={[S.row, { gap: 6, height: 36, paddingHorizontal: 14, borderRadius: 999, backgroundColor: C.yellow }]}>
            <Icon name={eta[b.state][0]} size={16} color="#000" />
            <Txt s={13} w={8} c="#000">
              {eta[b.state][1]}
            </Txt>
          </View>
          <IconBtn name="chat" label={`Message ${f}`} bg="rgba(0,0,0,.6)" onPress={() => openChat(oid)} />
        </View>
      </View>
      <ScrollView style={{ flex: 1, marginTop: -24, borderTopLeftRadius: 28, borderTopRightRadius: 28, backgroundColor: C.bg }} contentContainerStyle={{ padding: 20, paddingBottom: 30 + ins.bottom, gap: 14 }}>
        <View>
          <Txt s={22} w={8}>
            {h}
          </Txt>
          <Txt s={14} c={C.muted} style={{ marginTop: 4 }}>
            {s}
          </Txt>
          <View style={{ height: 6, borderRadius: 3, backgroundColor: C.s3, marginTop: 12, overflow: 'hidden' }}>
            <View style={{ width: `${pctOf(b)}%`, height: 6, backgroundColor: C.yellow }} />
          </View>
        </View>
        <View style={{ flexDirection: 'row' }}>
          {STEPS.map(([key, l, i], j) => {
            const ok = b.state === 'confirmed' || j < idx;
            const cur = j === idx && b.state !== 'confirmed';
            return (
              <View key={key} style={{ flex: 1, alignItems: 'center', gap: 4 }} accessibilityLabel={`${l}${ok ? ', done' : cur ? ', now' : ''}`}>
                <View style={{ width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: ok ? C.ok : cur ? C.yellow : C.s2 }}>
                  <Icon name={ok ? 'check' : i} size={16} color={ok || cur ? '#000' : C.muted} />
                </View>
                <Txt s={10} w={cur ? 8 : 6} c={cur ? C.text : C.muted}>
                  {l}
                </Txt>
              </View>
            );
          })}
        </View>
        <View style={[S.row, { gap: 12, padding: 12, borderRadius: 20, backgroundColor: C.s1, borderWidth: 1, borderColor: C.line }]}>
          <Pressable onPress={() => openProfile(oid)}>
            <Avatar pic={o.photo} size={48} />
          </Pressable>
          <View style={{ flex: 1, minWidth: 0 }}>
            <View style={[S.row, { gap: 4 }]}>
              <Txt s={15} w={8} lines={1}>
                {o.name}
              </Txt>
              {o.verified ? <Verified size={13} /> : null}
            </View>
            <View style={[S.row, { gap: 6 }]}>
              <Txt s={12} c={C.muted}>
                {o.client ? 'Client' : o.role}
              </Txt>
              <Rate r={o.rate} />
            </View>
          </View>
          <IconBtn name="phone" label={`Call ${f}`} onPress={() => router.push(`/call?id=${oid}&type=voice` as any)} />
          <IconBtn name="chat" label={`Message ${f}`} onPress={() => openChat(oid)} />
        </View>
        <View style={{ padding: 14, borderRadius: 20, backgroundColor: C.s1, borderWidth: 1, borderColor: C.line, gap: 10 }}>
          <View style={[S.row, { gap: 8 }]}>
            <Icon name="job" size={16} color={C.yellow} />
            <Txt s={14} w={8}>
              {b.title}
            </Txt>
          </View>
          {(
            [
              ['clock', 'When', b.when],
              ['money', 'Price', b.price],
              ['pin', 'Where', b.area],
            ] as [string, string, string][]
          ).map(([i, l, v]) => (
            <View key={l} style={[S.row, { gap: 8 }]}>
              <Icon name={i} size={16} color={C.muted} />
              <Txt s={13} c={C.muted} style={{ flex: 1 }}>
                {l}
              </Txt>
              <Txt s={13} w={7}>
                {v}
              </Txt>
            </View>
          ))}
        </View>
        <EscrowCard b={b} W={W} f={f} />
        <View style={{ gap: 10 }}>{b.escrow === 'unfunded' && !W ? <Btn testID="tk-fund" variant="yellow" icon="lock" title={`Pay ${b.price} into escrow`} onPress={() => openFund(b.id)} /> : act}</View>
      </ScrollView>
    </View>
  );
}

/** Where the money is: held by bolo until the client confirms. */
function EscrowCard({ b, W, f }: { b: Booking; W: boolean; f: string }) {
  const amt = xaf(bookingAmt(b));
  const [bg, icon, title, sub] =
    b.escrow === 'unfunded'
      ? [C.yellow, 'warn', 'Waiting for payment', W ? `${f} still has to pay ${amt} into escrow.` : `${f} starts once you pay ${amt} into escrow.`]
      : b.escrow === 'released' || b.state === 'confirmed'
        ? [C.mint, 'checkc', W ? `${amt} paid to you` : `${amt} paid to ${f}`, W ? 'Released from escrow to your wallet.' : 'Released from escrow when you confirmed.']
        : b.escrow === 'refunded'
          ? [C.s3, 'back', 'Refunded', `${amt} went back to the wallet.`]
          : [C.lav, 'lock', `${amt} held in escrow`, W ? `Paid in by ${f}. It’s yours when they confirm the job is done.` : `${f} is paid only after you confirm the job is done.`];
  return (
    <Pressable accessibilityRole="button" onPress={openEscrowInfo} style={[S.row, { gap: 12, marginBottom: 12, padding: 14, borderRadius: 20, backgroundColor: C.s1, borderWidth: 1, borderColor: b.escrow === 'unfunded' ? C.yellow : C.line }]}>
      <View style={{ width: 40, height: 40, borderRadius: 14, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={icon} size={18} color="#000" />
      </View>
      <View style={{ flex: 1 }}>
        <Txt s={14} w={8}>
          {title}
        </Txt>
        <Txt s={12} c={C.muted}>
          {sub}
        </Txt>
      </View>
      <Icon name="help" size={18} color={C.faint} />
    </Pressable>
  );
}
