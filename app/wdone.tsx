/* Joined: you can be found now. A few optional things that bring more calls, then into the app. */
import React from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { db } from '../src/data/db';
import { tap } from '../src/ui/kit';
import { bump, useLive } from '../src/logic/live';
import { cityLabel, mySkill } from '../src/logic/core';
import { resetTo } from '../src/logic/nav';
import { pickImage } from '../src/logic/media';
import { openService } from '../src/sheets/profile';
import { GIcon, GIconName } from '../src/g/icons';
import { RED, useG } from '../src/g/theme';
import { Big, Face, T } from '../src/g/ui';
import { areaLabel, hasArea } from '../src/g/data';
import { Way, workLine } from '../src/g/worker';

export default function WDone() {
  useLive();
  const t = useG();
  const ins = useSafeAreaInsets();
  const skill = mySkill() || db.user.skills[0] || 'your skill';
  const a = db.PR.area as any;
  const ways: Way[] = Array.isArray(a?.ways) ? a.ways : ['go'];
  const place = hasArea() ? areaLabel() : '';
  const near = cityLabel() ? `near ${(db.PR.area?.home || '').trim() || cityLabel()}` : 'near you';
  const who = `${/^[aeiou]/i.test(skill) ? 'an' : 'a'} ${skill.toLowerCase()}`;
  const line =
    ways.length === 1 && ways[0] === 'online'
      ? `People looking for ${who} can now find you and message you.`
      : ways.includes('online')
        ? `People ${near} looking for ${who} can call you, and others can hire you online.`
        : ways.includes('come') && !ways.includes('go')
          ? `People ${near} looking for ${who} can now find your shop and call you.`
          : `People ${near} looking for ${who} can now find you and call you.`;
  const boosts: [string, GIconName, () => void, string][] = [
    ['Set your prices', 'jobs', () => openService(), 'wdone-prices'],
    [
      db.user.avatar ? 'Change your photo' : 'Add your photo',
      'camera',
      async () => {
        const p = await pickImage({ square: true });
        if (p) {
          db.user.avatar = p;
          bump();
        }
      },
      'wdone-photo',
    ],
    ['Check your ID for a blue tick', 'shield', () => router.push('/id-verify' as any), 'wdone-id'],
  ];
  return (
    <View style={{ flex: 1, backgroundColor: t.bg, paddingTop: ins.top + 40, paddingHorizontal: 20 }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 16 }}>
        <View style={{ alignItems: 'center' }}>
          <View style={{ width: 150, height: 150, borderRadius: 75, backgroundColor: t.ringB, alignItems: 'center', justifyContent: 'center' }}>
            <View style={{ width: 106, height: 106, borderRadius: 53, backgroundColor: t.ringA, alignItems: 'center', justifyContent: 'center' }}>
              <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: RED, alignItems: 'center', justifyContent: 'center' }}>
                <GIcon name="check" size={34} color="#ffffff" sw={2.6} />
              </View>
            </View>
          </View>
          <T s={30} w={8} ls={-0.7} center style={{ marginTop: 14, marginBottom: 6 }}>
            You’re on getit
          </T>
          <T s={15} lh={1.5} c={t.muted} center style={{ maxWidth: 300 }}>
            {line}
          </T>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 22, padding: 14, borderRadius: 22, backgroundColor: t.card, borderWidth: 1, borderColor: t.line }}>
          <Face name={db.user.name || 'You'} photo={db.user.avatar} size={52} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <T s={16} w={8} lines={1}>
              {db.user.name || 'You'}
            </T>
            <T s={13} c={t.muted} style={{ marginTop: 2 }}>
              {workLine({ skill, ways, range: Number(a?.radius) >= 50 ? 0 : Number(a?.radius) || 5 }, place)}
            </T>
          </View>
        </View>
        <T s={13} w={7} c={t.muted} style={{ marginTop: 22, marginBottom: 4 }}>
          Get more calls · optional
        </T>
        {boosts.map(([label, icon, run, id]) => (
          <Pressable key={id} testID={id} accessibilityRole="button" onPress={() => (tap(), run())} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56, paddingVertical: 6, paddingHorizontal: 2, borderBottomWidth: 1, borderBottomColor: t.line, opacity: pressed ? 0.7 : 1 })}>
            <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: t.tabOn, alignItems: 'center', justifyContent: 'center' }}>
              <GIcon name={icon} size={18} color={t.accent} />
            </View>
            <T s={15} w={7} style={{ flex: 1 }}>
              {label}
            </T>
            <GIcon name="chev" size={18} color={t.muted} />
          </Pressable>
        ))}
      </ScrollView>
      <Big testID="wdone-start" title="Start getting work" onPress={() => resetTo('/find')} style={{ marginTop: 8, marginBottom: ins.bottom + 28 }} />
    </View>
  );
}
