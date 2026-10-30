import React from 'react';
import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { Btn, Note, Page, Sub, Title, TopBar, Txt, tap } from '../src/ui/kit';
import { Icon } from '../src/ui/Icon';
import { C, S } from '../src/ui/theme';
import { db } from '../src/data/db';
import { useLive } from '../src/logic/live';
import { STAGES, bookInterview, stageIndex } from '../src/logic/expert';
import { toast } from '../src/ui/overlay';

const SLOTS = ['Tomorrow · 10:00', 'Tomorrow · 15:30', 'Thursday · 11:00', 'Friday · 17:00'];

/** Where an expert application stands: a timeline, the interview booking, then the welcome. */
export default function ExpertStatus() {
  useLive();
  const E = db.EXPERT;
  const at = stageIndex(E.status);
  const approved = E.status === 'approved';
  return (
    <Page>
      <TopBar title={approved ? 'Career Expert' : 'Your application'} />
      {approved ? (
        <View style={{ alignItems: 'center', marginTop: 10 }}>
          <View style={{ width: 84, height: 84, borderRadius: 42, backgroundColor: C.yellow, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="verified" size={44} color="#000" />
          </View>
          <Title center style={{ marginTop: 14 }}>
            You’re a bolo Career Expert
          </Title>
          <Sub center>Your expert page is live in Career. Job seekers can now book your sessions.</Sub>
        </View>
      ) : (
        <>
          <Title sm>{E.status === 'interview' ? 'Pick a time for your interview' : 'We’re reviewing your application'}</Title>
          <Sub>{E.status === 'interview' ? 'Your answers passed review. The last step is a 15-minute video call with a bolo reviewer.' : 'You’ll get a notification at each step. You can close the app — nothing else is needed from you right now.'}</Sub>
        </>
      )}

      <View style={{ marginTop: 22, padding: 16, borderRadius: 20, backgroundColor: C.s1, borderWidth: 1, borderColor: C.line }}>
        {STAGES.map(([k, t, s], i) => {
          const done = i < at || approved;
          const now = i === at && !approved;
          return (
            <View key={k} style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ alignItems: 'center' }}>
                <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: done ? C.mint : now ? C.yellow : C.s3, alignItems: 'center', justifyContent: 'center' }}>
                  {done ? <Icon name="check" size={14} color="#000" /> : now ? <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#000' }} /> : null}
                </View>
                {i < STAGES.length - 1 ? <View style={{ width: 2, flex: 1, minHeight: 22, backgroundColor: done ? C.mint : C.s3 }} /> : null}
              </View>
              <View style={{ flex: 1, paddingBottom: i < STAGES.length - 1 ? 16 : 0 }}>
                <Txt s={14} w={8} c={done || now ? C.text : C.muted}>
                  {t}
                </Txt>
                <Txt s={12} c={C.muted}>
                  {k === 'decision' && E.slot ? `Interview booked: ${E.slot}. ${s}` : s}
                </Txt>
              </View>
            </View>
          );
        })}
      </View>

      {E.status === 'interview' ? (
        <View style={{ marginTop: 18, gap: 10 }}>
          {SLOTS.map((sl) => (
            <Pressable
              key={sl}
              testID={`slot-${sl}`}
              accessibilityRole="button"
              onPress={() => {
                tap();
                bookInterview(sl);
                toast(`Interview booked · ${sl}`);
              }}
              style={[S.rowB, { padding: 16, borderRadius: 16, backgroundColor: C.s1, borderWidth: 1, borderColor: C.line }]}
            >
              <View style={[S.row, { gap: 10 }]}>
                <Icon name="video" size={18} color={C.yellow} />
                <Txt s={14} w={7}>
                  {sl}
                </Txt>
              </View>
              <Icon name="chev" size={18} color={C.muted} />
            </Pressable>
          ))}
        </View>
      ) : null}

      {approved ? (
        <View style={{ gap: 10, marginTop: 18 }}>
          <Note icon="star" color={C.yellow}>
            Your first 5 sessions are your probation: keep an average of 4.5★ or more and reply to booking requests within 24 hours to keep the badge.
          </Note>
          <Btn variant="yellow" title="See my expert listing" onPress={() => router.replace('/experts')} />
        </View>
      ) : (
        <View style={{ gap: 10, marginTop: 18 }}>
          {!db.demo && E.status === 'submitted' ? <Note icon="mail">Reviews start once bolo opens expert applications in your area. We’ll notify you when yours is picked up.</Note> : null}
          <Btn variant="dark" title="Back to Career" onPress={() => router.navigate('/(tabs)/career')} />
        </View>
      )}
    </Page>
  );
}
