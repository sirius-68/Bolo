import React, { useState } from 'react';
import { NativeScrollEvent, NativeSyntheticEvent, Pressable, ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Btn, Empty, IconBtn, Txt, goBack, tap } from '../src/ui/kit';
import { Icon } from '../src/ui/Icon';
import { C, S } from '../src/ui/theme';
import { db } from '../src/data/db';
import { bump, useLive } from '../src/logic/live';
import { isW } from '../src/logic/core';
import { STAGES, applying, criteria, isExpert, stageIndex } from '../src/logic/expert';
import { activeExBookings, clearExFilters, exF, exFilterCount, findExperts } from '../src/logic/experts';
import { SearchBar } from '../src/components/common';
import { ExpertCard, MatchPromo, SessionRow, openMatchQuiz } from '../src/components/ExpertUI';
import { sheet, SheetTitle } from '../src/ui/overlay';

/** Career experts: search, filter, see who fits and book a paid session. */
export default function Experts() {
  useLive();
  const ins = useSafeAreaInsets();
  const [q, setQ] = useState(exF.q);
  const [small, setSmall] = useState(false);
  const last = React.useRef(0);
  exF.q = q;
  const L = findExperts();
  const nf = exFilterCount();
  const mine = activeExBookings();
  const onScroll = (ev: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = ev.nativeEvent.contentOffset.y;
    const down = y > last.current + 4;
    const up = y < last.current - 4;
    if (down && y > 80 && !small) setSmall(true);
    if ((up || y < 40) && small) setSmall(false);
    last.current = y;
  };
  const chips: [string, () => void][] = [
    ...(exF.goal ? [[exF.goal, () => ((exF.goal = ''), bump())] as [string, () => void]] : []),
    ...(exF.fmt ? [[exF.fmt, () => ((exF.fmt = ''), bump())] as [string, () => void]] : []),
    ...exF.specs.map((s) => [s, () => ((exF.specs = exF.specs.filter((x) => x !== s)), bump())] as [string, () => void]),
  ];
  return (
    <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: ins.top }}>
      <View style={[S.row, { gap: 10, paddingHorizontal: 20, paddingTop: 6, paddingBottom: 8 }]}>
        <IconBtn name="back" label="Back" onPress={goBack} />
        <Txt s={22} w={8} style={{ flex: 1 }}>
          Career experts
        </Txt>
        <IconBtn name="help" label="How experts are checked" onPress={openHowChecked} />
      </View>
      <ScrollView onScroll={onScroll} scrollEventThrottle={32} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 120 + ins.bottom, gap: 12 }}>
        <SearchBar value={q} onChange={setQ} placeholder="Profession, field, task…" />
        {chips.length ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -20 }} contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}>
            {chips.map(([t, rm]) => (
              <Pressable key={t} accessibilityRole="button" accessibilityLabel={`Remove filter ${t}`} onPress={() => (tap(), rm())} style={[S.row, { gap: 6, height: 34, paddingHorizontal: 12, borderRadius: 17, backgroundColor: C.text }]}>
                <Txt s={12} w={7} c="#000" lines={1}>
                  {t}
                </Txt>
                <Icon name="x" size={12} color="#000" />
              </Pressable>
            ))}
            <Pressable accessibilityRole="button" onPress={() => (tap(), clearExFilters())} style={{ height: 34, paddingHorizontal: 12, justifyContent: 'center' }}>
              <Txt s={12} w={8} c={C.lav}>
                Clear all
              </Txt>
            </Pressable>
          </ScrollView>
        ) : null}

        {mine.length ? (
          <View style={{ gap: 8 }}>
            <Txt s={16} w={8} style={{ marginTop: 4 }}>
              Your sessions
            </Txt>
            {mine.map((b) => (
              <SessionRow key={b.id} b={b} />
            ))}
          </View>
        ) : null}

        <Txt testID="ex-count" s={13} c={C.muted} style={{ marginTop: 4 }}>
          {exF.match && nf ? `Best matches for you · ${L.length}` : `${L.length} expert${L.length === 1 ? '' : 's'}${q.trim() || nf ? ' found' : ' · checked and rated by mentees'}`}
        </Txt>

        {L.length ? (
          L.map((e, i) => (
            <React.Fragment key={e.id}>
              <ExpertCard e={e} />
              {i === Math.min(1, L.length - 1) && !exF.match ? <MatchPromo /> : null}
            </React.Fragment>
          ))
        ) : (
          <Empty title="No experts match" text="Try other words or fewer filters, or let us suggest someone.">
            <View style={{ gap: 8, alignSelf: 'stretch', marginTop: 16 }}>
              <Btn variant="yellow" icon="sparkle" title="Find a mentor for me" onPress={openMatchQuiz} />
              {nf ? <Btn variant="dark" title="Clear filters" onPress={() => (setQ(''), clearExFilters())} /> : null}
            </View>
          </Empty>
        )}

        {isW() ? <BecomeExpert /> : null}
      </ScrollView>

      {/* floating Filters pill: shrinks to an icon while scrolling down */}
      <View pointerEvents="box-none" style={{ position: 'absolute', left: 0, right: 0, bottom: 24 + ins.bottom, alignItems: 'center' }}>
        <Pressable
          testID="ex-filters"
          accessibilityRole="button"
          accessibilityLabel={`Filters${nf ? `, ${nf} on` : ''}`}
          onPress={() => (tap(), router.push('/expert-filters' as any))}
          style={({ pressed }) => [S.row, { gap: 8, height: 50, minWidth: 50, paddingHorizontal: small ? 0 : 20, justifyContent: 'center', borderRadius: 25, backgroundColor: C.text, transform: [{ scale: pressed ? 0.96 : 1 }], shadowColor: '#000', shadowOpacity: 0.5, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 8 }]}
        >
          <Icon name="filter" size={18} color="#000" />
          {small ? null : (
            <Txt s={14} w={8} c="#000">
              Filters
            </Txt>
          )}
          {nf ? (
            <View style={{ position: small ? 'absolute' : 'relative', top: small ? -2 : 0, right: small ? -2 : 0, minWidth: 20, height: 20, borderRadius: 10, paddingHorizontal: 5, backgroundColor: C.blue, alignItems: 'center', justifyContent: 'center' }}>
              <Txt s={11} w={8}>
                {nf}
              </Txt>
            </View>
          ) : null}
        </Pressable>
      </View>
    </View>
  );
}

/** Apply or follow your application to become an expert. */
function BecomeExpert() {
  const E = db.EXPERT;
  const met = criteria().filter((c) => c.ok).length;
  return (
    <Pressable
      testID="become-expert"
      accessibilityRole="button"
      onPress={() => (tap(), router.push(applying() || isExpert() ? '/expert-status' : '/expert-apply'))}
      style={{ marginTop: 16, padding: 18, borderRadius: 24, backgroundColor: C.yellow }}
    >
      <View style={S.rowB}>
        <Txt s={18} w={8} c="#000">
          {isExpert() ? 'You’re a Career Expert' : applying() ? 'Your expert application' : 'Become a career expert'}
        </Txt>
        <Icon name="chev" size={20} color="#000" />
      </View>
      <Txt s={13} c="#222" style={{ marginTop: 4 }}>
        {isExpert()
          ? 'Manage your services, prices and availability.'
          : applying()
            ? `${STAGES[stageIndex(E.status)][1]} · step ${stageIndex(E.status) + 1} of ${STAGES.length}`
            : 'Share what you know, help people get hired and earn from your sessions.'}
      </Txt>
      {!isExpert() && !applying() ? (
        <>
          <View style={{ marginTop: 12, height: 6, borderRadius: 3, backgroundColor: 'rgba(0,0,0,.15)' }}>
            <View style={{ width: `${(met / criteria().length) * 100}%`, height: 6, borderRadius: 3, backgroundColor: '#000' }} />
          </View>
          <Txt s={12} w={7} c="#000" style={{ marginTop: 6 }}>
            You meet {met} of {criteria().length} requirements
          </Txt>
        </>
      ) : null}
    </Pressable>
  );
}

function openHowChecked() {
  sheet.show(() => (
    <View style={{ gap: 14 }}>
      <SheetTitle sub="Every expert on bolo goes through the same checks, and keeps the badge only while mentees rate them well.">How experts are checked</SheetTitle>
      {[
        ['idcard', 'Identity and experience checked', '3+ years in their field, ID verified, work history on bolo'],
        ['exam', 'Ethics check and a real sample answer', 'We read how they’d actually help a job seeker'],
        ['video', '15-minute interview', 'A bolo reviewer talks with every applicant'],
        ['star', 'Rated after every session', 'Experts keep their badge only while ratings stay at 4.5★ or above'],
        ['lock', 'Your payment is protected', 'bolo holds the money until you confirm the session happened'],
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
  ));
}
