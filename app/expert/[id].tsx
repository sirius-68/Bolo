import React from 'react';
import { Pressable, Share, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Avatar, Btn, Empty, IconBtn, Page, TopBar, Txt, tap } from '../../src/ui/kit';
import { Icon } from '../../src/ui/Icon';
import { C, S } from '../../src/ui/theme';
import { useLive } from '../../src/logic/live';
import { xaf } from '../../src/logic/core';
import { exBookingsWith, expertById, exRating, nearestDate, reviewsOfEx } from '../../src/logic/experts';
import { Bullets, ExRating, ReviewItem, SessionRow, goBook, openAllReviews, openServicePicker } from '../../src/components/ExpertUI';

/** An expert's page: who they are, what they offer and what people say. */
export default function ExpertProfile() {
  useLive();
  const { id } = useLocalSearchParams<{ id: string }>();
  const e = expertById(id);
  if (!e)
    return (
      <Page header={<TopBar />}>
        <Empty title="Expert not found" text="They may no longer offer sessions on bolo." />
      </Page>
    );
  const { n } = exRating(e);
  const R = reviewsOfEx(e);
  const mine = exBookingsWith(e).filter((b) => b.state !== 'done' || !b.rated);
  const share = () => Share.share({ message: `${e.name}, ${e.head}. Book a session on bolo: https://bolo.app/experts/${e.id}` }).catch(() => {});
  return (
    <Page header={<TopBar right={<IconBtn name="share" label="Share expert" onPress={share} />} />} bottom={32}>
      {/* who */}
      <Avatar pic={e.pic} square size={128} style={{ borderRadius: 34, marginTop: 4 }} />
      <View style={[S.row, { gap: 8, marginTop: 16 }]}>
        <Txt s={26} w={8} style={{ flexShrink: 1, lineHeight: 30 }}>
          {e.name}
        </Txt>
        <Icon name="verified" size={20} color={C.blue} />
      </View>
      <Txt s={14} c={C.muted} style={{ marginTop: 4 }}>
        {e.head}
      </Txt>
      <View style={{ marginTop: 8 }}>
        <ExRating e={e} big onReviews={() => openAllReviews(e)} />
      </View>
      <Btn testID="ex-select" variant="yellow" title="Select service" style={{ marginTop: 16 }} onPress={() => openServicePicker(e)} />
      <View style={[S.row, { gap: 6, justifyContent: 'center', marginTop: 8 }]}>
        <Icon name="calcheck" size={14} color={C.mint} />
        <Txt s={12} w={7} c={C.mint}>
          Nearest date: {nearestDate(e)}
        </Txt>
      </View>

      {mine.length ? (
        <View style={{ gap: 8, marginTop: 18 }}>
          <Txt s={16} w={8}>
            Your sessions with {e.name.split(' ')[0]}
          </Txt>
          {mine.map((b) => (
            <SessionRow key={b.id} b={b} />
          ))}
        </View>
      ) : null}

      {/* quick facts */}
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 18 }}>
        {(
          [
            [`${e.yrs} yrs`, 'Experience'],
            [String(e.sessions), 'Sessions'],
            [e.langs.slice(0, 2).join(', '), 'Languages'],
          ] as [string, string][]
        ).map(([v, l]) => (
          <View key={l} style={{ flex: 1, padding: 12, borderRadius: 18, backgroundColor: C.s1, borderWidth: 1, borderColor: C.line }}>
            <Txt s={15} w={8} lines={1}>
              {v}
            </Txt>
            <Txt s={11} c={C.muted}>
              {l}
            </Txt>
          </View>
        ))}
      </View>

      {/* about */}
      <Head t="About the expert" />
      <View style={{ padding: 16, borderRadius: 22, backgroundColor: C.s1, borderWidth: 1, borderColor: C.line, gap: 14 }}>
        <Txt s={14} c="#d6d6dc" style={{ lineHeight: 21 }}>
          {e.about}
        </Txt>
        <Bullets items={e.bio} />
        <View style={{ gap: 8 }}>
          <Txt s={12} w={8} c={C.muted}>
            HELPS WITH
          </Txt>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {e.goals.map((g) => (
              <View key={g} style={{ paddingHorizontal: 10, height: 28, borderRadius: 14, backgroundColor: 'rgba(246,238,92,.14)', justifyContent: 'center' }}>
                <Txt s={12} w={7} c={C.yellow}>
                  {g}
                </Txt>
              </View>
            ))}
          </View>
          <Txt s={12} w={8} c={C.muted} style={{ marginTop: 4 }}>
            FIELDS
          </Txt>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {e.specs.map((g) => (
              <View key={g} style={{ paddingHorizontal: 10, height: 28, borderRadius: 14, backgroundColor: C.s2, justifyContent: 'center' }}>
                <Txt s={12} w={7}>
                  {g}
                </Txt>
              </View>
            ))}
          </View>
        </View>
      </View>

      {/* services */}
      <Head t="Services" n={e.services.length} />
      <View style={{ borderRadius: 22, backgroundColor: C.s1, borderWidth: 1, borderColor: C.line, overflow: 'hidden' }}>
        {e.services.map((s, i) => (
          <Pressable key={s.id} testID={`svc-${s.id}`} accessibilityRole="button" onPress={() => (tap(), goBook(e.id, s.id))} style={({ pressed }) => [S.row, { gap: 12, padding: 16, backgroundColor: pressed ? C.s2 : 'transparent', borderTopWidth: i ? 1 : 0, borderColor: C.line }]}>
            <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
              <Txt s={15} w={8} lines={2}>
                {s.t}
              </Txt>
              <Txt s={12} c={C.muted}>
                {s.fmt}
                {s.mins ? ` · ${s.mins} min` : ''}
              </Txt>
              <Txt s={14} w={8} c={C.yellow} style={{ marginTop: 2 }}>
                {xaf(s.price)}
              </Txt>
            </View>
            <Icon name="chev" size={18} color={C.muted} />
          </Pressable>
        ))}
      </View>

      {/* reviews */}
      <Head t="Reviews" n={n} />
      <View style={{ gap: 8 }}>
        {R.slice(0, 3).map((r, i) => (
          <ReviewItem key={i} r={r} />
        ))}
      </View>
      {R.length > 3 ? <Btn testID="ex-all-reviews" variant="dark" title="All reviews" style={{ marginTop: 10 }} onPress={() => openAllReviews(e)} /> : null}
    </Page>
  );
}
function Head({ t, n }: { t: string; n?: number }) {
  return (
    <View style={[S.row, { gap: 8, marginTop: 26, marginBottom: 10 }]}>
      <Txt s={18} w={8}>
        {t}
      </Txt>
      {n != null ? (
        <Txt s={15} w={7} c={C.muted}>
          {n}
        </Txt>
      ) : null}
    </View>
  );
}
