import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { Avatar, Btn, Page, Pill, Rate, Sub, Title, TopBar, Txt, tap } from '../src/ui/kit';
import { Icon } from '../src/ui/Icon';
import { C, S } from '../src/ui/theme';
import { db } from '../src/data/db';
import { EXPERTS } from '../src/data/catalog';
import { useLive } from '../src/logic/live';
import { isW, myPhoto } from '../src/logic/core';
import { STAGES, applying, criteria, isExpert, stageIndex } from '../src/logic/expert';
import { toast } from '../src/ui/overlay';

/** Career experts: book one, see how they're chosen, or apply to become one. */
export default function Experts() {
  useLive();
  const [booked, setBooked] = useState<string[]>([]);
  const E = db.EXPERT;
  const met = criteria().filter((c) => c.ok).length;
  const list: [string, string, any, boolean?][] = [...(isExpert() ? [[db.user.name || 'You', E.headline || 'Career expert', myPhoto(), true] as [string, string, any, boolean]] : []), ...EXPERTS];
  return (
    <Page>
      <TopBar title="Career experts" />
      <Title sm>Advice from people who’ve done it</Title>
      <Sub>CV reviews, interview practice, job search and career change — 1-to-1 with checked, rated experts.</Sub>

      <View style={{ gap: 8, marginTop: 20 }}>
        {list.map(([n, r, ph, me]) => (
          <View key={n} style={[S.row, { gap: 12, padding: 12, borderRadius: 18, backgroundColor: C.s1, borderWidth: 1, borderColor: C.line }]}>
            <Avatar pic={ph} size={46} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <View style={[S.row, { gap: 6 }]}>
                <Txt s={15} w={8} lines={1} style={{ flexShrink: 1 }}>
                  {n}
                </Txt>
                <Icon name="verified" size={14} color={C.blue} />
              </View>
              <View style={[S.row, { gap: 8, marginTop: 2 }]}>
                <Txt s={12} c={C.muted} lines={1} style={{ flexShrink: 1 }}>
                  {r}
                </Txt>
                {me ? null : <Rate r={4.9} />}
              </View>
            </View>
            {me ? (
              <Pill title="You" on />
            ) : (
              <Pill
                title={booked.includes(n) ? 'Booked ✓' : 'Book'}
                on={booked.includes(n)}
                onPress={() => {
                  if (booked.includes(n)) return;
                  setBooked([...booked, n]);
                  toast(`Session requested with ${n.split(' ')[0]} — they’ll confirm a time`);
                }}
              />
            )}
          </View>
        ))}
      </View>
      <Txt s={12} c={C.muted} style={{ marginTop: 8, marginLeft: 4 }}>
        30-minute video call · from XAF 5,000{db.user.pro.regular ? ' · 1 free a month with Pro' : ''}
      </Txt>

      <Txt s={18} w={8} style={{ marginTop: 28, marginBottom: 12 }}>
        How experts are chosen
      </Txt>
      <View style={{ padding: 16, borderRadius: 20, backgroundColor: C.s1, borderWidth: 1, borderColor: C.line, gap: 14 }}>
        {[
          ['idcard', 'Identity and experience checked', '3+ years in their field, ID verified, work history on bolo'],
          ['exam', 'Ethics check and a real sample answer', 'We read how they’d actually help a job seeker'],
          ['video', '15-minute interview', 'A bolo reviewer talks with every applicant'],
          ['star', 'Rated by mentees', 'Experts keep their badge only while ratings stay at 4.5★ or above'],
        ].map(([i, t, s]) => (
          <View key={t} style={[S.row, { gap: 12, alignItems: 'flex-start' }]}>
            <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: C.s2, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name={i} size={18} color={C.yellow} />
            </View>
            <View style={{ flex: 1 }}>
              <Txt s={14} w={8}>
                {t}
              </Txt>
              <Txt s={12} c={C.muted}>
                {s}
              </Txt>
            </View>
          </View>
        ))}
      </View>

      {isW() ? (
        <Pressable
          testID="become-expert"
          accessibilityRole="button"
          onPress={() => (tap(), router.push(applying() || isExpert() ? '/expert-status' : '/expert-apply'))}
          style={{ marginTop: 20, padding: 18, borderRadius: 22, backgroundColor: C.yellow }}
        >
          <View style={[S.rowB]}>
            <Txt s={18} w={8} c="#000">
              {isExpert() ? 'You’re a Career Expert' : applying() ? 'Your expert application' : 'Become a career expert'}
            </Txt>
            <Icon name="chev" size={20} color="#000" />
          </View>
          <Txt s={13} c="#222" style={{ marginTop: 4 }}>
            {isExpert()
              ? 'Manage your sessions, price and availability.'
              : applying()
                ? `${STAGES[stageIndex(E.status)][1]} · step ${stageIndex(E.status) + 1} of ${STAGES.length}`
                : 'Share what you know, help people get hired and earn from your sessions.'}
          </Txt>
          {!isExpert() && !applying() ? (
            <View style={{ marginTop: 12, height: 6, borderRadius: 3, backgroundColor: 'rgba(0,0,0,.15)' }}>
              <View style={{ width: `${(met / criteria().length) * 100}%`, height: 6, borderRadius: 3, backgroundColor: '#000' }} />
            </View>
          ) : null}
          {!isExpert() && !applying() ? (
            <Txt s={12} w={7} c="#000" style={{ marginTop: 6 }}>
              You meet {met} of {criteria().length} requirements
            </Txt>
          ) : null}
        </Pressable>
      ) : null}
      <View style={{ height: 12 }} />
      {isW() && !isExpert() && !applying() ? <Btn variant="dark" title="See the requirements" onPress={() => router.push('/expert-apply')} /> : null}
    </Page>
  );
}
