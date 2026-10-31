import React, { useEffect, useRef, useState } from 'react';
import { Animated, BackHandler, Easing, Pressable, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { payOf } from '../src/data/payments';
import { Btn, IconBtn, Txt, goBack, tap } from '../src/ui/kit';
import { Icon } from '../src/ui/Icon';
import { C, S } from '../src/ui/theme';
import { P, fname, xaf } from '../src/logic/core';
import { useLive } from '../src/logic/live';
import { MAX_TOPUP, MIN_TOPUP, balance, bookingAmt, topUp } from '../src/logic/wallet';
import { bk, fundBooking } from '../src/logic/work';
import { methodByKey, methodLabel, pickMethod } from '../src/sheets/wallet';
import { PayBadge, openPayments } from '../src/sheets/account';

type Step = 'amount' | 'approve' | 'done';
const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '000', '0', 'del'];
const QUICK = [5000, 10000, 25000, 50000];

/** Add money to the bolo wallet. Opened from the Wallet, or from a booking that needs paying into escrow (fund=bookingId). */
export default function TopUp() {
  useLive();
  const ins = useSafeAreaInsets();
  const { amt: a0, fund } = useLocalSearchParams<{ amt?: string; fund?: string }>();
  const [amt, setAmt] = useState(a0 ? String(Math.min(MAX_TOPUP, +a0 || 0)) : '');
  const [key, setKey] = useState<string | undefined>();
  const [step, setStep] = useState<Step>('amount');
  const [funded, setFunded] = useState(false);
  const m = methodByKey(key);
  const n = +amt || 0;
  const job = fund ? bk(fund) : undefined;
  const err = n > MAX_TOPUP ? `Up to ${xaf(MAX_TOPUP)} at a time` : n && n < MIN_TOPUP ? `At least ${xaf(MIN_TOPUP)}` : '';
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => step === 'approve');
    return () => sub.remove();
  }, [step]);

  const press = (k: string) => {
    tap();
    if (k === 'del') return setAmt(amt.slice(0, -1));
    const next = (amt + k).replace(/^0+/, '');
    if (next.length <= 7) setAmt(next);
  };
  const go = () => {
    if (!m || !n || err) return;
    setStep('approve');
    topUp(n, m[0], () => {
      // Money in: pay the waiting job straight into escrow.
      if (job && job.escrow === 'unfunded') setFunded(fundBooking(job.id));
      setStep('done');
    });
  };

  if (step === 'approve') return <Approve method={m!} amt={n} ins={ins} />;
  if (step === 'done') return <Done amt={n} ins={ins} jobTitle={funded && job ? job.title : undefined} worker={funded && job ? fname(P(job.worker).name) : undefined} />;

  return (
    <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: ins.top }}>
      <View style={[S.rowB, { paddingHorizontal: 20, height: 56, marginTop: 8 }]}>
        <IconBtn name="back" label="Back" onPress={goBack} />
        <Txt s={15} w={8}>
          Add money
        </Txt>
        <View style={{ width: 44 }} />
      </View>
      {job ? (
        <View style={[S.row, { gap: 10, marginHorizontal: 20, padding: 12, borderRadius: 16, backgroundColor: 'rgba(169,182,255,.12)' }]}>
          <Icon name="lock" size={16} color={C.lav} />
          <Txt s={12} c={C.lav} style={{ flex: 1 }}>
            For “{job.title}” ({xaf(bookingAmt(job))}). It goes straight into escrow.
          </Txt>
        </View>
      ) : null}
      {/* amount */}
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 }}>
        <Txt s={13} c={C.muted}>
          Balance {xaf(balance())}
        </Txt>
        <View style={[S.row, { gap: 8, marginTop: 6 }]}>
          <Txt s={22} w={8} c={n ? C.text : C.faint}>
            XAF
          </Txt>
          <Txt testID="tu-amount" s={52} w={8} c={n ? C.text : C.faint} style={{ lineHeight: 60 }}>
            {n ? n.toLocaleString('en-US') : '0'}
          </Txt>
        </View>
        <Txt s={12} c={err ? C.err : C.muted} style={{ marginTop: 2, minHeight: 18 }}>
          {err || 'Free to add. No fees on bolo.'}
        </Txt>
        <View style={[S.row, { gap: 8, marginTop: 14, flexWrap: 'wrap', justifyContent: 'center' }]}>
          {QUICK.map((q) => (
            <Pressable key={q} testID={`tu-q-${q}`} onPress={() => (tap(), setAmt(String(q)))} style={{ paddingHorizontal: 14, height: 34, borderRadius: 17, backgroundColor: n === q ? C.text : C.s1, borderWidth: 1, borderColor: n === q ? C.text : C.line, justifyContent: 'center' }}>
              <Txt s={13} w={8} c={n === q ? '#000' : C.text}>
                {q / 1000}k
              </Txt>
            </Pressable>
          ))}
        </View>
      </View>
      {/* from */}
      <Pressable testID="tu-method" accessibilityRole="button" onPress={() => (m ? pickMethod(key || m[0] + m[1], setKey) : openPayments())} style={({ pressed }) => [S.row, { gap: 12, marginHorizontal: 20, padding: 12, borderRadius: 18, backgroundColor: pressed ? C.s2 : C.s1, borderWidth: 1, borderColor: C.line }]}>
        {m ? <PayBadge name={m[0]} /> : <Icon name="plus" size={20} color={C.yellow} />}
        <View style={{ flex: 1 }}>
          <Txt s={11} c={C.muted}>
            From
          </Txt>
          <Txt s={14} w={8} lines={1}>
            {methodLabel(m)}
          </Txt>
        </View>
        <Txt s={13} w={8} c={C.lav}>
          Change
        </Txt>
      </Pressable>
      {/* keypad */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 20, marginTop: 8 }}>
        {KEYS.map((k) => (
          <Pressable key={k} accessibilityRole="button" accessibilityLabel={k === 'del' ? 'Delete' : k} onPress={() => press(k)} style={({ pressed }) => ({ width: '33.33%', height: 58, alignItems: 'center', justifyContent: 'center', borderRadius: 18, backgroundColor: pressed ? C.s1 : 'transparent' })}>
            {k === 'del' ? (
              <Icon name="back" size={22} color={C.text} />
            ) : (
              <Txt s={24} w={7}>
                {k}
              </Txt>
            )}
          </Pressable>
        ))}
      </View>
      <View style={{ paddingHorizontal: 20, paddingBottom: ins.bottom + 16, paddingTop: 8 }}>
        <Btn testID="tu-go" variant="yellow" title={n && !err ? `Add ${xaf(n)}` : 'Enter an amount'} disabled={!n || !!err || !m} onPress={go} />
      </View>
    </View>
  );
}

/** Waiting for the provider: approve on the phone (mobile money), bank check (card), or finish the transfer. */
function Approve({ method, amt, ins }: { method: [string, string, number]; amt: number; ins: { top: number; bottom: number } }) {
  const kind = payOf(method[0]).kind;
  const pulse = useRef(new Animated.Value(0)).current;
  const [sec, setSec] = useState(0);
  useEffect(() => {
    const loop = Animated.loop(Animated.timing(pulse, { toValue: 1, duration: 1400, easing: Easing.out(Easing.quad), useNativeDriver: true }));
    loop.start();
    const t = setInterval(() => setSec((x) => x + 1), 1000);
    return () => (loop.stop(), clearInterval(t));
  }, [pulse]);
  const [title, text, icon] =
    kind === 'mobile'
      ? [`Approve on your phone`, `We sent a request to ${methodLabel(method)}. Enter your ${method[0]} PIN to approve ${xaf(amt)}.`, 'phone']
      : kind === 'card'
        ? ['Checking with your bank', `Your bank may ask you to confirm ${xaf(amt)} (3-D Secure).`, 'shield']
        : kind === 'bank'
          ? ['Waiting for your transfer', `Send ${xaf(amt)} with the reference BOLO-${String(amt).slice(0, 3)}${method[1].slice(-2)}. It shows here as soon as it arrives.`, 'receipt']
          : [`Finish in ${method[0]}`, `Confirm ${xaf(amt)} in ${method[0]}, then come back here.`, 'globe'];
  return (
    <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: ins.top + 40, paddingBottom: ins.bottom + 24, paddingHorizontal: 24, alignItems: 'center' }}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <View style={{ width: 160, height: 160, alignItems: 'center', justifyContent: 'center' }}>
          <Animated.View style={{ position: 'absolute', width: 160, height: 160, borderRadius: 80, backgroundColor: C.yellow, opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0] }), transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1.2] }) }] }} />
          <View style={{ width: 96, height: 96, borderRadius: 32, backgroundColor: C.yellow, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name={icon} size={40} color="#000" />
          </View>
        </View>
        <Txt s={26} w={8} center style={{ marginTop: 24 }}>
          {title}
        </Txt>
        <Txt s={14} c={C.muted} center style={{ marginTop: 8, lineHeight: 20 }}>
          {text}
        </Txt>
        <View style={[S.row, { gap: 8, marginTop: 20, paddingHorizontal: 14, height: 36, borderRadius: 18, backgroundColor: C.s1 }]}>
          <PayBadge name={method[0]} size={22} />
          <Txt s={13} w={7}>
            Waiting… {sec}s
          </Txt>
        </View>
      </View>
      <Txt s={12} c={C.faint} center>
        Keep this screen open. You won’t be charged twice.
      </Txt>
    </View>
  );
}

function Done({ amt, ins, jobTitle, worker }: { amt: number; ins: { top: number; bottom: number }; jobTitle?: string; worker?: string }) {
  const pop = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(pop, { toValue: 1, useNativeDriver: true, speed: 8, bounciness: 14 }).start();
  }, [pop]);
  return (
    <View style={{ flex: 1, backgroundColor: C.mint, paddingTop: ins.top + 40, paddingBottom: ins.bottom + 24, paddingHorizontal: 24 }}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Animated.View style={{ width: 110, height: 110, borderRadius: 55, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center', transform: [{ scale: pop }] }}>
          <Icon name="check" size={52} color={C.mint} />
        </Animated.View>
        <Txt testID="tu-done" s={34} w={8} c="#000" center style={{ marginTop: 24 }}>
          {xaf(amt)} added
        </Txt>
        <Txt s={15} c="#1d3b2b" center style={{ marginTop: 8, lineHeight: 21 }}>
          {jobTitle ? `And paid into escrow for “${jobTitle}”. ${worker} can set off now.` : `Your balance is now ${xaf(balance())}.`}
        </Txt>
      </View>
      <Pressable testID="tu-close" accessibilityRole="button" onPress={() => (tap(), router.back())} style={({ pressed }) => ({ height: 58, borderRadius: 29, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center', transform: [{ scale: pressed ? 0.98 : 1 }] })}>
        <Txt s={16} w={8}>
          {jobTitle ? 'Back to the job' : 'Done'}
        </Txt>
      </Pressable>
    </View>
  );
}
