import React from 'react';
import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Bar, Txt, tap } from '../ui/kit';
import { Icon } from '../ui/Icon';
import { C, S } from '../ui/theme';
import { Rec, fmtTs, progressOf } from '../logic/classes';

/** A recording in a list: thumbnail, title, date, how much you watched. */
export function RecRow({ r, replace }: { r: Rec; replace?: boolean }) {
  const pr = progressOf(r.id);
  const pct = pr && pr.d ? Math.min(100, Math.round((pr.t / pr.d) * 100)) : 0;
  return (
    <Pressable testID={`rec-${r.id}`} accessibilityRole="button" accessibilityLabel={`Play ${r.title}`} onPress={() => (tap(), replace ? router.replace(`/watch/${r.id}` as any) : router.push(`/watch/${r.id}` as any))} style={({ pressed }) => [S.row, { gap: 12, padding: 10, borderRadius: 18, backgroundColor: pressed ? C.s2 : C.s1, borderWidth: 1, borderColor: C.line }]}>
      <View style={{ width: 104, height: 62, borderRadius: 12, overflow: 'hidden' }}>
        <LinearGradient colors={r.live ? ['#e11d48', '#7f1d3a'] : ['#3d5af1', '#1b2a9b']} style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(255,255,255,.9)', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="playfill" size={12} color="#000" />
          </View>
        </LinearGradient>
        <View style={{ position: 'absolute', right: 4, bottom: 4, paddingHorizontal: 5, height: 18, borderRadius: 5, backgroundColor: 'rgba(0,0,0,.65)', justifyContent: 'center' }}>
          <Txt s={10} w={8}>
            {fmtTs(r.dur)}
          </Txt>
        </View>
        {pct ? <Bar pct={pct} h={3} color={C.yellow} bg="rgba(0,0,0,.4)" style={{ position: 'absolute', left: 0, right: 0, bottom: 0, borderRadius: 0 }} /> : null}
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Txt s={14} w={8} lines={2}>
          {r.title}
        </Txt>
        <Txt s={12} c={C.muted}>
          {r.live ? 'Live class' : `Lesson ${r.lesson + 1}`} · {r.at}
          {pct ? ` · ${pct >= 95 ? 'watched' : pct + '%'}` : ''}
        </Txt>
      </View>
    </Pressable>
  );
}

