/* Your price is on its way to the client. */
import React from 'react';
import { View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { db } from '../src/data/db';
import { useLive } from '../src/logic/live';
import { P, fname, postById } from '../src/logic/core';
import { money, whenText } from '../src/g/data';
import { GIcon } from '../src/g/icons';
import { Fact, Pulse } from '../src/g/parts';
import { RED, useG } from '../src/g/theme';
import { goHome } from '../src/g/touch';
import { Ghost, T } from '../src/g/ui';

export default function WSent() {
  useLive();
  const t = useG();
  const ins = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const po = postById(id);
  const f = fname(P(po?.client || '')?.name || 'the client');
  const o = db.myOffers[id];
  return (
    <View style={{ flex: 1, backgroundColor: t.bg, paddingTop: ins.top + 40, paddingHorizontal: 20, paddingBottom: ins.bottom + 28 }}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Pulse size={240} core={112} rings={2} period={2400}>
          <View style={{ width: 112, height: 112, borderRadius: 56, backgroundColor: RED, alignItems: 'center', justifyContent: 'center' }}>
            <GIcon name="send" size={48} color="#ffffff" sw={2.4} />
          </View>
        </Pulse>
        <T s={26} w={8} ls={-0.6} center style={{ marginTop: 12, marginBottom: 6 }}>
          Offer sent to {f}
        </T>
        <T s={15} lh={1.5} c="muted" center style={{ maxWidth: 290 }}>
          We’ll tell you as soon as {f} answers.
        </T>
        {o ? (
          <View style={{ alignSelf: 'stretch', marginTop: 22 }}>
            <Fact label={`Your offer · ${po?.title || 'the job'}`} value={`${money(o.price)} · ${whenText(o.when)}`} />
          </View>
        ) : null}
      </View>
      <Ghost testID="wsent-back" title="Back to work" onPress={goHome} />
    </View>
  );
}
