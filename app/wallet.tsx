import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { db, Booking } from '../src/data/db';
import { Avatar, IconBtn, Page, TopBar, Txt, tap } from '../src/ui/kit';
import { Icon } from '../src/ui/Icon';
import { C, S } from '../src/ui/theme';
import { P, fname, xaf } from '../src/logic/core';
import { useLive } from '../src/logic/live';
import { openTrack } from '../src/logic/nav';
import { TX_LOOK, Tx, balance, bookingAmt, escrowed, heldTotal, incoming } from '../src/logic/wallet';
import { defaultMethod, methodLabel, openEscrowInfo, openFund, openWithdraw } from '../src/sheets/wallet';
import { PayBadge, openPayments } from '../src/sheets/account';

/** bolo wallet: balance first, then money that's protected in escrow, then the history. */
export default function Wallet() {
  useLive();
  const [hide, setHide] = useState(false);
  const bal = balance();
  const held = heldTotal();
  const esc = escrowed();
  const inc = incoming();
  const tx = db.WALLET.tx;
  const m = defaultMethod();
  const money = (n: number) => (hide ? 'XAF •••••' : xaf(n));
  return (
    <Page header={<TopBar title="Wallet" right={<IconBtn name="help" label="How escrow works" onPress={openEscrowInfo} />} />} bottom={32}>
      {/* balance */}
      <View testID="wallet-balance" style={{ marginTop: 6, padding: 20, borderRadius: 28, backgroundColor: C.yellow }}>
        <View style={S.rowB}>
          <Txt s={13} w={7} c="rgba(0,0,0,.65)">
            Available balance
          </Txt>
          <Pressable accessibilityRole="button" accessibilityLabel={hide ? 'Show balance' : 'Hide balance'} hitSlop={10} onPress={() => (tap(), setHide(!hide))}>
            <Icon name={hide ? 'eyeoff' : 'eye'} size={20} color="#000" />
          </Pressable>
        </View>
        <Txt s={38} w={8} c="#000" style={{ marginTop: 4, lineHeight: 44 }}>
          {money(bal)}
        </Txt>
        {held ? (
          <Pressable onPress={openEscrowInfo} style={[S.row, { gap: 6, alignSelf: 'flex-start', marginTop: 8, paddingHorizontal: 10, height: 28, borderRadius: 14, backgroundColor: 'rgba(0,0,0,.1)' }]}>
            <Icon name="lock" size={13} color="#000" />
            <Txt s={12} w={8} c="#000">
              {money(held)} in escrow
            </Txt>
          </Pressable>
        ) : null}
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 18 }}>
          <Pressable testID="wallet-add" accessibilityRole="button" onPress={() => (tap(), router.push('/topup' as any))} style={({ pressed }) => [S.row, { flex: 1, gap: 8, height: 52, borderRadius: 26, backgroundColor: '#000', justifyContent: 'center', transform: [{ scale: pressed ? 0.97 : 1 }] }]}>
            <Icon name="plus" size={18} color={C.yellow} />
            <Txt s={15} w={8}>
              Add money
            </Txt>
          </Pressable>
          <Pressable testID="wallet-withdraw" accessibilityRole="button" onPress={() => (tap(), openWithdraw())} style={({ pressed }) => [S.row, { flex: 1, gap: 8, height: 52, borderRadius: 26, borderWidth: 2, borderColor: '#000', justifyContent: 'center', transform: [{ scale: pressed ? 0.97 : 1 }] }]}>
            <Icon name="download" size={18} color="#000" />
            <Txt s={15} w={8} c="#000">
              Withdraw
            </Txt>
          </Pressable>
        </View>
      </View>

      {/* escrow promise */}
      <Pressable accessibilityRole="button" onPress={openEscrowInfo} style={({ pressed }) => [S.row, { gap: 12, marginTop: 10, padding: 14, borderRadius: 22, backgroundColor: pressed ? C.s2 : C.s1, borderWidth: 1, borderColor: C.line }]}>
        <View style={{ width: 42, height: 42, borderRadius: 14, backgroundColor: C.lav, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="shield" size={20} color="#000" />
        </View>
        <View style={{ flex: 1 }}>
          <Txt s={14} w={8}>
            Every job is paid through escrow
          </Txt>
          <Txt s={12} c={C.muted}>
            Money is released only when the job is confirmed done
          </Txt>
        </View>
        <Icon name="chev" size={18} color={C.muted} />
      </Pressable>

      {/* money held for jobs you hired */}
      {esc.length ? (
        <>
          <Head t="Held in escrow" n={esc.length} />
          <View style={{ gap: 8 }}>
            {esc.map((b) => (
              <EscrowRow key={b.id} b={b} hide={hide} />
            ))}
          </View>
        </>
      ) : null}
      {/* jobs you're doing, already paid in by the client */}
      {inc.length ? (
        <>
          <Head t="Coming to you" n={inc.length} />
          <View style={{ gap: 8 }}>
            {inc.map((b) => (
              <Pressable key={b.id} accessibilityRole="button" onPress={() => openTrack(b.id)} style={({ pressed }) => [S.row, { gap: 12, padding: 12, borderRadius: 20, backgroundColor: pressed ? C.s2 : C.s1, borderWidth: 1, borderColor: C.line }]}>
                <Avatar pic={P(b.client).photo} size={42} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Txt s={14} w={8} lines={1}>
                    {b.title}
                  </Txt>
                  <Txt s={12} c={C.mint} lines={1}>
                    Secured by {fname(P(b.client).name)} · paid when they confirm
                  </Txt>
                </View>
                <Txt s={14} w={8} c={C.mint}>
                  {hide ? '•••' : '+' + xaf(bookingAmt(b))}
                </Txt>
              </Pressable>
            ))}
          </View>
        </>
      ) : null}

      {/* history */}
      <Head t="Activity" />
      {tx.length ? (
        <View style={{ borderRadius: 22, backgroundColor: C.s1, borderWidth: 1, borderColor: C.line, overflow: 'hidden' }}>
          {tx.map((t, i) => (
            <TxRow key={t.id} t={t} last={i === tx.length - 1} hide={hide} />
          ))}
        </View>
      ) : (
        <Txt s={13} c={C.muted}>
          Nothing yet. Add money to hire and pay safely in the app.
        </Txt>
      )}

      {/* method */}
      <Head t="Payment method" />
      <Pressable accessibilityRole="button" onPress={openPayments} style={({ pressed }) => [S.row, { gap: 12, padding: 12, borderRadius: 20, backgroundColor: pressed ? C.s2 : C.s1, borderWidth: 1, borderColor: C.line }]}>
        {m ? <PayBadge name={m[0]} /> : <Icon name="plus" size={20} color={C.yellow} />}
        <View style={{ flex: 1 }}>
          <Txt s={14} w={8}>
            {methodLabel(m)}
          </Txt>
          <Txt s={12} c={C.muted}>
            {db.PREF.momo.length} saved · mobile money, cards, PayPal, bank
          </Txt>
        </View>
        <Icon name="chev" size={18} color={C.muted} />
      </Pressable>
    </Page>
  );
}

function Head({ t, n }: { t: string; n?: number }) {
  return (
    <View style={[S.row, { gap: 8, marginTop: 24, marginBottom: 10 }]}>
      <Txt s={18} w={8}>
        {t}
      </Txt>
      {n ? (
        <Txt s={14} w={7} c={C.muted}>
          {n}
        </Txt>
      ) : null}
    </View>
  );
}
function EscrowRow({ b, hide }: { b: Booking; hide: boolean }) {
  const w = P(b.worker);
  const unfunded = b.escrow === 'unfunded';
  const st = unfunded ? 'Waiting for your payment' : b.state === 'done' ? `${fname(w.name)} finished · confirm to release` : `Held until you confirm · ${fname(w.name)}`;
  return (
    <Pressable testID={`esc-${b.id}`} accessibilityRole="button" onPress={() => (tap(), unfunded ? openFund(b.id) : openTrack(b.id))} style={({ pressed }) => [S.row, { gap: 12, padding: 12, borderRadius: 20, backgroundColor: pressed ? C.s2 : C.s1, borderWidth: 1, borderColor: unfunded || b.state === 'done' ? C.yellow : C.line }]}>
      <View>
        <Avatar pic={w.photo} size={42} />
        <View style={{ position: 'absolute', right: -4, bottom: -4, width: 20, height: 20, borderRadius: 10, backgroundColor: unfunded ? C.yellow : C.lav, borderWidth: 2, borderColor: C.s1, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name={unfunded ? 'warn' : 'lock'} size={10} color="#000" />
        </View>
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Txt s={14} w={8} lines={1}>
          {b.title}
        </Txt>
        <Txt s={12} c={unfunded || b.state === 'done' ? C.yellow : C.muted} lines={1}>
          {st}
        </Txt>
      </View>
      {unfunded ? (
        <View style={{ paddingHorizontal: 12, height: 32, borderRadius: 16, backgroundColor: C.yellow, justifyContent: 'center' }}>
          <Txt s={12} w={8} c="#000">
            Pay {hide ? '' : xaf(bookingAmt(b))}
          </Txt>
        </View>
      ) : (
        <Txt s={14} w={8}>
          {hide ? '•••' : xaf(bookingAmt(b))}
        </Txt>
      )}
    </Pressable>
  );
}
function TxRow({ t, last, hide }: { t: Tx; last: boolean; hide: boolean }) {
  const L = TX_LOOK[t.kind];
  const who = t.who ? P(t.who) : null;
  const plus = L.sign === '+';
  return (
    <View style={[S.row, { gap: 12, padding: 12, borderBottomWidth: last ? 0 : 1, borderColor: C.line }]}>
      {who && (t.kind === 'earn' || t.kind === 'release') ? (
        <Avatar pic={who.photo} size={40} />
      ) : (
        <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: L.bg, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name={L.icon} size={18} color={L.fg} />
        </View>
      )}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Txt s={14} w={7} lines={1}>
          {t.title}
        </Txt>
        <Txt s={12} c={t.pending ? C.yellow : C.muted} lines={1}>
          {t.pending ? 'Processing…' : L.label} · {t.at}
        </Txt>
      </View>
      <Txt s={14} w={8} c={plus ? C.mint : C.text}>
        {hide ? '•••' : `${L.sign}${xaf(t.amt)}`}
      </Txt>
    </View>
  );
}
