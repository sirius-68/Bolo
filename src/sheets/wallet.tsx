import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { db } from '../data/db';
import { payOf } from '../data/payments';
import { AlertIll, Avatar, Btn, Field, Input, Txt, tap } from '../ui/kit';
import { Icon } from '../ui/Icon';
import { afterSheet, sheet, SheetTitle } from '../ui/overlay';
import { C, S } from '../ui/theme';
import { P, fname, xaf } from '../logic/core';
import { useLive } from '../logic/live';
import { balance, bookingAmt, withdraw } from '../logic/wallet';
import { bk, fundBooking } from '../logic/work';
import { PayBadge, openPayments } from './account';

const digits = (v: string) => v.replace(/[^\d]/g, '');
/** Saved methods: [name, masked number, default]. */
export const methods = () => db.PREF.momo;
export const defaultMethod = () => (db.PREF.momo.find((m) => m[2]) || db.PREF.momo[0]) as [string, string, number] | undefined;
export const methodLabel = (m?: [string, string, number]) => (m ? `${m[0]}${m[1] ? ' · ' + m[1] : ''}` : 'Add a payment method');

/* ---------------- how escrow works ---------------- */
export function openEscrowInfo() {
  sheet.show(() => (
    <View style={{ gap: 14 }}>
      <AlertIll icon="shield" bg={C.lav} />
      <SheetTitle center sub="Every job on bolo is paid through escrow, so both sides are protected.">
        How escrow works
      </SheetTitle>
      {(
        [
          ['lock', C.lav, 'You pay when you book', 'The price moves from your wallet into escrow. bolo holds it; the worker can see it’s secured.'],
          ['wrench', C.yellow, 'The work gets done', 'Follow the job live. If something isn’t right, say so: the money stays held.'],
          ['checkc', C.mint, 'You confirm, they get paid', 'Only when you confirm the job is done does the money go to the worker. Cancel before they set off and it comes back to your wallet.'],
        ] as [string, string, string, string][]
      ).map(([i, bg, t, d], k) => (
        <View key={t} style={[S.row, { gap: 12, alignItems: 'flex-start' }]}>
          <View style={{ width: 40, height: 40, borderRadius: 14, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name={i} size={19} color="#000" />
          </View>
          <View style={{ flex: 1 }}>
            <Txt s={15} w={8}>
              {k + 1}. {t}
            </Txt>
            <Txt s={13} c={C.muted}>
              {d}
            </Txt>
          </View>
        </View>
      ))}
      <Btn variant="yellow" title="Got it" onPress={() => sheet.close()} />
    </View>
  ));
}

/* ---------------- pay a booked job into escrow ---------------- */
export function openFund(id: string) {
  sheet.show(() => <Fund id={id} />, { tag: 'fund:' + id });
}
function Fund({ id }: { id: string }) {
  useLive();
  const b = bk(id);
  if (!b) return null;
  if (b.escrow !== 'unfunded')
    return (
      <View style={{ gap: 12 }}>
        <AlertIll icon="checkc" bg={C.mint} />
        <SheetTitle center sub={`${xaf(bookingAmt(b))} is held in escrow for “${b.title}”.`}>
          Paid into escrow
        </SheetTitle>
        <Btn variant="yellow" title="Done" onPress={() => sheet.close()} />
      </View>
    );
  const amt = bookingAmt(b);
  const bal = balance();
  const short = Math.max(0, amt - bal);
  const w = P(b.worker);
  return (
    <View style={{ gap: 14 }}>
      <View style={[S.row, { gap: 12 }]}>
        <Avatar pic={w.photo} size={48} />
        <View style={{ flex: 1 }}>
          <Txt s={13} c={C.muted}>
            {fname(w.name)} accepted · {b.when}
          </Txt>
          <Txt s={18} w={8} lines={2}>
            {b.title}
          </Txt>
        </View>
      </View>
      <View style={{ padding: 14, borderRadius: 18, backgroundColor: C.s2, gap: 10 }}>
        <Line k="Job price" v={xaf(amt)} />
        <Line k="Service fee" v="Free" />
        <Line k="From your wallet" v={xaf(Math.min(bal, amt))} />
        {short ? <Line k="Add now" v={xaf(short)} strong /> : null}
      </View>
      <View style={[S.row, { gap: 10, padding: 12, borderRadius: 16, backgroundColor: 'rgba(169,182,255,.12)' }]}>
        <Icon name="shield" size={18} color={C.lav} />
        <Txt s={12} c={C.lav} style={{ flex: 1 }}>
          Held safely by bolo. {fname(w.name)} is paid only after you confirm the job is done.
        </Txt>
      </View>
      {short ? (
        <Btn testID="fund-topup" variant="yellow" icon="plus" title={`Add ${xaf(short)} and pay`} onPress={() => afterSheet(() => router.push(`/topup?amt=${Math.max(short, 500)}&fund=${b.id}` as any))} />
      ) : (
        <Btn testID="fund-pay" variant="yellow" icon="lock" title={`Pay ${xaf(amt)} into escrow`} onPress={() => fundBooking(b.id)} />
      )}
      <Pressable accessibilityRole="button" onPress={openEscrowInfo} style={{ alignSelf: 'center', padding: 6 }}>
        <Txt s={13} w={7} c={C.lav}>
          How escrow works
        </Txt>
      </Pressable>
    </View>
  );
}
function Line({ k, v, strong }: { k: string; v: string; strong?: boolean }) {
  return (
    <View style={S.rowB}>
      <Txt s={13} c={strong ? C.text : C.muted} w={strong ? 8 : 5}>
        {k}
      </Txt>
      <Txt s={14} w={8} c={strong ? C.yellow : C.text}>
        {v}
      </Txt>
    </View>
  );
}

/* ---------------- choose a method ---------------- */
export function pickMethod(value: string | undefined, onPick: (name: string) => void, filter?: (name: string) => boolean) {
  sheet.show(() => {
    const L = methods().filter((m) => !filter || filter(m[0]));
    return (
      <View style={{ gap: 8 }}>
        <SheetTitle sub="Saved in Settings → Payments">Choose how</SheetTitle>
        {L.map((m, i) => {
          const on = value === m[0] + m[1];
          return (
            <Pressable
              key={m[0] + m[1] + i}
              accessibilityRole="radio"
              accessibilityState={{ checked: on }}
              onPress={() => {
                tap();
                onPick(m[0] + m[1]);
                sheet.close();
              }}
              style={[S.row, { gap: 12, padding: 12, borderRadius: 16, backgroundColor: on ? 'rgba(61,90,241,.18)' : C.s2, borderWidth: 1.5, borderColor: on ? C.blue : 'transparent' }]}
            >
              <PayBadge name={m[0]} />
              <View style={{ flex: 1 }}>
                <Txt s={14} w={8}>
                  {m[0]}
                </Txt>
                <Txt s={12} c={C.muted}>
                  {m[1]}
                </Txt>
              </View>
              {on ? <Icon name="checkc" size={20} color={C.lav} /> : null}
            </Pressable>
          );
        })}
        <Btn variant="dark" icon="plus" title="Add a payment method" onPress={() => afterSheet(openPayments)} />
      </View>
    );
  });
}
export const methodByKey = (k?: string) => methods().find((m) => m[0] + m[1] === k) || defaultMethod();

/* ---------------- withdraw ---------------- */
export function openWithdraw() {
  sheet.show(() => <Withdraw />);
}
function Withdraw() {
  useLive();
  const bal = balance();
  const payout = (n: string) => ['mobile', 'bank'].includes(payOf(n).kind);
  const first = methods().find((m) => payout(m[0]));
  const [amt, setAmt] = useState('');
  const [key, setKey] = useState(first ? first[0] + first[1] : undefined);
  const m = methodByKey(key);
  const n = +amt || 0;
  const err = n > bal ? 'More than your balance' : n && n < 500 ? 'At least XAF 500' : '';
  return (
    <View style={{ gap: 14 }}>
      <SheetTitle sub={`Available: ${xaf(bal)}`}>Withdraw</SheetTitle>
      <Field label="Amount" error={err || undefined}>
        <Input testID="wd-amount" value={amt} onChangeText={(v) => setAmt(digits(v))} prefix="XAF" keyboardType="number-pad" placeholder="e.g. 10,000" />
      </Field>
      <View style={[S.row, { gap: 8 }]}>
        {[5000, 10000, bal].filter((x, i, a) => x > 0 && x <= bal && a.indexOf(x) === i).map((x) => (
          <Pressable key={x} onPress={() => (tap(), setAmt(String(x)))} style={{ paddingHorizontal: 12, height: 32, borderRadius: 16, backgroundColor: C.s2, justifyContent: 'center' }}>
            <Txt s={12} w={8}>
              {x === bal ? 'All' : xaf(x)}
            </Txt>
          </Pressable>
        ))}
      </View>
      <View>
        <Txt s={13} w={7} c={C.muted} style={{ marginBottom: 6 }}>
          To
        </Txt>
        <Pressable accessibilityRole="button" onPress={() => pickMethod(key, setKey, payout)} style={[S.row, { gap: 12, padding: 12, borderRadius: 16, backgroundColor: C.s2 }]}>
          {m && payout(m[0]) ? <PayBadge name={m[0]} /> : <Icon name="plus" size={20} color={C.yellow} />}
          <Txt s={14} w={8} style={{ flex: 1 }}>
            {m && payout(m[0]) ? methodLabel(m) : 'Choose mobile money or bank'}
          </Txt>
          <Icon name="chev" size={18} color={C.muted} />
        </Pressable>
        <Txt s={12} c={C.muted} style={{ marginTop: 6 }}>
          Mobile money arrives in minutes. Banks take 1–2 working days.
        </Txt>
      </View>
      <Btn
        testID="wd-go"
        variant="yellow"
        icon="download"
        disabled={!n || !!err || !m || !payout(m[0])}
        title={n ? `Withdraw ${xaf(n)}` : 'Withdraw'}
        onPress={() => m && withdraw(n, m[0]) && sheet.close()}
      />
    </View>
  );
}
