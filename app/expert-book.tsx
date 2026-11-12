import React, { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AlertIll, Avatar, Btn, Empty, Input, Page, TopBar, Txt, goBack, tap } from '../src/ui/kit';
import { Icon } from '../src/ui/Icon';
import { C, S } from '../src/ui/theme';
import { sheet, SheetTitle } from '../src/ui/overlay';
import { db } from '../src/data/db';
import { useLive } from '../src/logic/live';
import { MONEY_LIVE } from '../src/logic/money';
import { xaf } from '../src/logic/core';
import { ExBooking, bookService, expertById, expertContact, nearestDate, priceAfter, promoFor, serviceOf } from '../src/logic/experts';
import { ExRating } from '../src/components/ExpertUI';
import { openChat } from '../src/sheets/chat';

/** Booking a service: what you get, the nearest date, promo code, and pay into escrow. */
export default function ExpertBook() {
  useLive();
  const { e: eid, s: sid } = useLocalSearchParams<{ e: string; s: string }>();
  const ins = useSafeAreaInsets();
  const e = expertById(eid);
  const s = e ? serviceOf(e, sid) : undefined;
  const [code, setCode] = useState('');
  const [done, setDone] = useState<ExBooking | null>(null);
  const [busy, setBusy] = useState(false);
  if (!e || !s)
    return (
      <Page header={<TopBar title="Booking a service" />}>
        <Empty title="Service not available" text="The expert may have changed their services." />
      </Page>
    );
  if (done) return <Booked b={done} />;
  const due = priceAfter(s.price, code);
  const bal = db.WALLET.bal;
  const short = MONEY_LIVE && due > bal;
  const pay = () => {
    tap();
    if (short) return router.push(`/topup?amt=${Math.max(500, Math.ceil((due - bal) / 100) * 100)}` as any);
    const r = bookService(e, s, code || undefined);
    if (!('need' in r)) setDone(r);
  };
  return (
    <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: ins.top }}>
      <View style={{ paddingHorizontal: 20 }}>
        <TopBar title="Booking a service" />
      </View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24, gap: 14 }}>
        <View style={[S.row, { gap: 6, alignSelf: 'flex-start', paddingHorizontal: 12, height: 32, borderRadius: 16, backgroundColor: 'rgba(123,224,167,.14)' }]}>
          <Icon name="calcheck" size={14} color={C.mint} />
          <Txt testID="book-date" s={13} w={8} c={C.mint}>
            Nearest date: {nearestDate(e)}
          </Txt>
        </View>
        <Txt s={24} w={8} style={{ lineHeight: 29 }}>
          {s.t}
        </Txt>
        <View style={[S.row, { gap: 12, padding: 12, borderRadius: 20, backgroundColor: C.s1, borderWidth: 1, borderColor: C.line }]}>
          <Avatar pic={e.pic} size={44} />
          <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
            <Txt s={14} w={8} lines={1}>
              {e.name}
            </Txt>
            <ExRating e={e} />
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Txt s={12} w={7}>
              {s.fmt}
            </Txt>
            {s.mins ? (
              <Txt s={12} c={C.muted}>
                {s.mins} min
              </Txt>
            ) : null}
          </View>
        </View>
        <Txt s={14} c="#d6d6dc" style={{ lineHeight: 21 }}>
          {s.d}
        </Txt>
        <View style={{ gap: 8 }}>
          <Txt s={16} w={8}>
            What you get
          </Txt>
          {s.gets.map((g) => (
            <View key={g} style={[S.row, { gap: 10 }]}>
              <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: C.mint, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="check" size={12} color="#000" />
              </View>
              <Txt s={14} style={{ flex: 1 }}>
                {g}
              </Txt>
            </View>
          ))}
        </View>
        <View style={[S.row, { gap: 12, padding: 14, borderRadius: 18, backgroundColor: C.s1, borderWidth: 1, borderColor: C.line, alignItems: 'flex-start' }]}>
          <Icon name="lock" size={18} color={C.lav} />
          <View style={{ flex: 1, gap: 2 }}>
            <Txt s={14} w={8}>
              How it works
            </Txt>
            <Txt s={12} c={C.muted}>
              Your request goes to {e.name.split(' ')[0]} in chat. When they accept, the session is booked and you agree the time there. Pay {e.name.split(' ')[0]} directly as agreed: payments through bolo are coming soon.
            </Txt>
          </View>
        </View>
      </ScrollView>

      {/* pay panel */}
      <View style={{ paddingHorizontal: 20, paddingTop: 14, paddingBottom: 14 + ins.bottom, gap: 10, backgroundColor: C.s1, borderTopLeftRadius: 26, borderTopRightRadius: 26, borderTopWidth: 1, borderColor: C.line }}>
        <View style={S.rowB}>
          <Txt s={14} c={C.muted}>
            Price
          </Txt>
          <View style={[S.row, { gap: 8 }]}>
            {due < s.price ? (
              <Txt s={13} c={C.muted} style={{ textDecorationLine: 'line-through' }}>
                {xaf(s.price)}
              </Txt>
            ) : null}
            <Txt testID="book-due" s={20} w={8}>
              {xaf(due)}
            </Txt>
          </View>
        </View>
        <Btn testID="book-pay" variant="yellow" icon="send" loading={busy} title="Send request" onPress={pay} />
        <Txt s={11} c={C.faint} center>
          By booking you agree to bolo’s terms for expert sessions.
        </Txt>
      </View>
    </View>
  );
}

function openPromo(apply: (c: string) => void) {
  sheet.show(() => <Promo apply={apply} />);
}
function Promo({ apply }: { apply: (c: string) => void }) {
  const [v, setV] = useState('');
  const [err, setErr] = useState('');
  return (
    <View style={{ gap: 12 }}>
      <SheetTitle sub="First session with an expert? FIRST20 gives you 20% off.">Promo code</SheetTitle>
      <Input testID="promo-input" value={v} onChangeText={(t) => (setV(t.toUpperCase()), setErr(''))} placeholder="Enter code" autoCapitalize="characters" autoFocus invalid={!!err} maxLength={20} />
      {err ? (
        <Txt s={12} c={C.err}>
          {err}
        </Txt>
      ) : null}
      <Btn
        testID="promo-apply"
        variant="yellow"
        title="Apply"
        disabled={!v.trim()}
        onPress={() => {
          const p = promoFor(v);
          if (!p) return setErr('This code isn’t valid or was already used.');
          apply(p.code);
          sheet.close(`${p.label} applied`);
        }}
      />
    </View>
  );
}

function Booked({ b }: { b: ExBooking }) {
  const e = expertById(b.ex)!;
  return (
    <Page header={<TopBar noBack />} bottom={28}>
      <View style={{ flex: 1, justifyContent: 'center', gap: 12 }}>
        <AlertIll icon="checkc" bg={C.mint} />
        <Txt testID="booked-title" s={26} w={8} center>
          Request sent
        </Txt>
        <Txt s={14} c={C.muted} center>
          {b.title} with {e.name}. When {e.name.split(' ')[0]} accepts in chat, the session is booked and shows in Career experts → Your sessions.
        </Txt>
      </View>
      <Btn testID="booked-chat" variant="yellow" icon="chat" title={`Message ${e.name.split(' ')[0]}`} onPress={() => (router.back(), setTimeout(() => openChat(expertContact(e)), 50))} />
      <Btn testID="booked-done" variant="dark" title="Done" style={{ marginTop: 10 }} onPress={goBack} />
    </Page>
  );
}
