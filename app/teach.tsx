import React from 'react';
import { Linking, Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { Btn, Page, TopBar, Txt, tap } from '../src/ui/kit';
import { Icon } from '../src/ui/Icon';
import { C, S } from '../src/ui/theme';
import { useLive } from '../src/logic/live';
import { WEB_TEACH, domainOf, myListings, priceLabel } from '../src/logic/listings';
import { toneOf, catIcon } from '../src/components/CourseListing';

/** Offer a course: list it on bolo with a link to your own page. People sign up on your site. */
export default function Teach() {
  useLive();
  const mine = myListings();
  const visits = mine.reduce((n, c) => n + (c.views || 0), 0);
  const create = () => (tap(), router.push('/list-course' as any));
  return (
    <Page header={<TopBar title="Offer a course" />} bottom={32}>
      {/* hero */}
      <View style={{ marginTop: 6, padding: 20, borderRadius: 28, backgroundColor: C.lav }}>
        <View style={[S.row, { gap: 8 }]}>
          {(['cat-tailor', 'cat-plumber', 'cat-dev', 'cat-cook'] as const).map((i, k) => (
            <View key={i} style={{ width: 40, height: 40, borderRadius: 13, backgroundColor: ['#000', C.yellow, C.blue, C.orange][k], alignItems: 'center', justifyContent: 'center', transform: [{ rotate: `${(k - 1.5) * 6}deg` }] }}>
              <Icon name={i} size={20} color={k === 0 ? C.lav : k === 2 ? '#fff' : '#000'} />
            </View>
          ))}
        </View>
        <Txt s={28} w={8} c="#000" style={{ marginTop: 16, lineHeight: 32 }}>
          Teach it your way.{'\n'}We’ll send you learners.
        </Txt>
        <Txt s={14} c="#26294a" style={{ marginTop: 8 }}>
          List your course with a link to your website or school page. People find it in Career → Courses and sign up with you directly.
        </Txt>
        <Pressable testID="teach-create" accessibilityRole="button" onPress={create} style={({ pressed }) => [S.rowB, { marginTop: 18, height: 58, paddingLeft: 20, paddingRight: 7, borderRadius: 29, backgroundColor: '#000', transform: [{ scale: pressed ? 0.98 : 1 }] }]}>
          <Txt s={16} w={8}>
            {mine.length ? 'List another course' : 'List a course · 1 minute'}
          </Txt>
          <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: C.lav, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="arrow" size={20} color="#000" />
          </View>
        </Pressable>
      </View>

      {/* your listings */}
      {mine.length ? (
        <>
          <View style={[S.rowB, { marginTop: 24, marginBottom: 10 }]}>
            <Txt s={18} w={8}>
              Your listings
            </Txt>
            <Txt s={13} c={C.muted}>
              {visits} site visit{visits === 1 ? '' : 's'} from bolo
            </Txt>
          </View>
          <View style={{ gap: 8 }}>
            {mine.map((c) => {
              const [bg, fg] = toneOf(c);
              return (
                <Pressable key={c.id} testID={`my-listing-${c.id}`} accessibilityRole="button" onPress={() => (tap(), router.push(`/list-course?id=${c.id}` as any))} style={({ pressed }) => [S.row, { gap: 12, padding: 12, borderRadius: 20, backgroundColor: pressed ? C.s2 : C.s1, borderWidth: 1, borderColor: C.line }]}>
                  <View style={{ width: 46, height: 46, borderRadius: 15, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
                    <Icon name={catIcon(c.cat)} size={22} color={fg} />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Txt s={14} w={8} lines={1}>
                      {c.title}
                    </Txt>
                    <Txt s={12} c={c.url ? C.muted : C.orange} lines={1}>
                      {c.url ? `${domainOf(c.url)} · ${priceLabel(c)} · ${c.views || 0} visits` : 'Add a link to your course page'}
                    </Txt>
                  </View>
                  <Txt s={12} w={8} c={C.lav}>
                    Edit
                  </Txt>
                </Pressable>
              );
            })}
          </View>
        </>
      ) : null}

      {/* how it works */}
      <Txt s={18} w={8} style={{ marginTop: 24, marginBottom: 10 }}>
        How it works
      </Txt>
      <View style={{ gap: 10 }}>
        {(
          [
            ['edit', C.yellow, 'List your course', 'Paste the link to your course page, add a title, field and price. That’s it.'],
            ['search', C.mint, 'People find it', 'It shows in Career → Courses and in search, next to courses from well-known schools.'],
            ['globe', C.orange, 'They sign up with you', 'Tapping your course opens your page. Sign-up and payment happen on your site.'],
          ] as [string, string, string, string][]
        ).map(([i, bg, t, d], k) => (
          <View key={t} style={[S.row, { gap: 12, padding: 14, borderRadius: 20, backgroundColor: C.s1, borderWidth: 1, borderColor: C.line, alignItems: 'flex-start' }]}>
            <View style={{ width: 40, height: 40, borderRadius: 14, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name={i} size={19} color="#000" />
            </View>
            <View style={{ flex: 1 }}>
              <Txt s={15} w={8}>
                {k + 1}. {t}
              </Txt>
              <Txt s={13} c={C.muted}>
                {d}
              </Txt>
            </View>
          </View>
        ))}
      </View>
      <Txt s={12} c={C.faint} style={{ marginTop: 12 }}>
        Don’t have a website yet? A public page on your school’s site, a Google Form or a WhatsApp Business catalogue link works too.
      </Txt>
      <Btn variant="yellow" icon="plus" title={mine.length ? 'List another course' : 'List a course'} style={{ marginTop: 18 }} onPress={create} />
    </Page>
  );
}
