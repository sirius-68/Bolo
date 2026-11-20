/* First start, second and last step: where "near you" is. One tap uses the phone's location;
   typing a town works too, and it can wait. */
import React, { useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLive } from '../src/logic/live';
import { gpsCity } from '../src/logic/here';
import { areaLabel, hasArea } from '../src/g/data';
import { GIcon } from '../src/g/icons';
import { Halo, Hint } from '../src/g/parts';
import { openArea } from '../src/g/sheets';
import { useG } from '../src/g/theme';
import { Big, Ghost, Link, T } from '../src/g/ui';

export default function Where() {
  useLive();
  const t = useG();
  const ins = useSafeAreaInsets();
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');
  const go = () => router.replace('/find' as any);
  const here = async () => {
    setBusy(true);
    setNote('');
    const p = await gpsCity();
    setBusy(false);
    if (typeof p === 'string') return setNote(p === 'off' ? 'Location is off on this phone. Turn it on and try again, or type your town.' : 'No problem. Type your town instead.');
    setTimeout(go, 700);
  };
  const found = hasArea();
  return (
    <View style={{ flex: 1, backgroundColor: t.bg, paddingTop: ins.top + 16, paddingHorizontal: 24, paddingBottom: ins.bottom + 28 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', minHeight: 44 }}>
        <Link testID="where-skip" title="Not now" color="muted" onPress={go} />
      </View>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Halo size={200} core={96}>
          <GIcon name={found ? 'check' : 'pin'} size={44} color="#ffffff" sw={found ? 2.6 : 2} />
        </Halo>
        <T s={28} w={8} lh={1.15} ls={-0.6} center style={{ marginTop: 20, marginBottom: 8 }}>
          {found ? areaLabel() : 'Where are you?'}
        </T>
        <T s={15} lh={1.5} c="muted" center style={{ maxWidth: 300 }}>
          {found ? 'Got it. We’ll show you people near here.' : 'getit shows you good workers close by, so they can come quickly.'}
        </T>
        {note ? (
          <T s={14} w={7} lh={1.45} c="accent" center style={{ maxWidth: 300, marginTop: 14 }}>
            {note}
          </T>
        ) : null}
      </View>
      <Hint icon="lock" style={{ marginBottom: 18 }}>
        Others only ever see your area, like “Molyko, Buea”. Never your address, and never where you are right now.
      </Hint>
      {found ? <Big testID="where-continue" title="Continue" onPress={go} /> : <Big testID="where-here" icon="pin" title="Use my location" loading={busy} onPress={() => void here()} />}
      <Ghost testID="where-type" title={found ? 'Change it' : 'Type my town instead'} style={{ marginTop: 10 }} onPress={() => openArea(() => hasArea() && go())} />
    </View>
  );
}
