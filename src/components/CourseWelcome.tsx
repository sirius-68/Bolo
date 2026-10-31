import React, { useEffect, useRef, useState } from 'react';
import { Animated, BackHandler, Modal, Pressable, ScrollView, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { db } from '../data/db';
import { Txt, tap } from '../ui/kit';
import { Icon } from '../ui/Icon';
import { C, S } from '../ui/theme';

/** Shown the first time someone opens Courses or a course page. */
export const needsCourseWelcome = () => !(db.PREF as any).coursesIntro;
const markSeen = () => ((db.PREF as any).coursesIntro = 1);

type Slide = { bg: string; kicker: string; a: string; b: string; text: string; tiles: [string, string, string][] };
const SLIDES: Slide[] = [
  {
    bg: C.yellow,
    kicker: 'Welcome to Courses',
    a: 'Learn the skills',
    b: 'that get you hired',
    text: 'Short, practical courses from trainers and companies near you. Many are free.',
    tiles: [
      ['cap', C.blue, '#fff'],
      ['cat-tailor', '#000', C.yellow],
      ['cat-dev', C.lav, '#000'],
    ],
  },
  {
    bg: C.lav,
    kicker: 'Live, with a real trainer',
    a: 'Join live classes',
    b: 'right in the app',
    text: 'We remind you when class starts. Your class group has the links, files and answers.',
    tiles: [
      ['video', '#e11d48', '#fff'],
      ['chat', '#000', C.lav],
      ['bell', C.yellow, '#000'],
    ],
  },
  {
    bg: C.mint,
    kicker: 'Finish and get noticed',
    a: 'Earn a certificate',
    b: 'employers can see',
    text: 'Finish every lesson and the certificate goes on your profile and CV.',
    tiles: [
      ['cert', '#000', C.mint],
      ['verified', C.blue, '#fff'],
      ['job', C.orange, '#000'],
    ],
  },
];

export function CourseWelcome({ onDone }: { onDone: () => void }) {
  const { width } = useWindowDimensions();
  const ins = useSafeAreaInsets();
  const ref = useRef<ScrollView>(null);
  const [i, setI] = useState(0);
  const pop = useRef(new Animated.Value(0)).current;
  const last = i === SLIDES.length - 1;
  const close = () => {
    markSeen();
    onDone();
  };
  useEffect(() => {
    pop.setValue(0);
    Animated.spring(pop, { toValue: 1, useNativeDriver: true, speed: 9, bounciness: 10 }).start();
  }, [i, pop]);
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => (close(), true));
    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const go = (n: number) => {
    tap();
    ref.current?.scrollTo({ x: n * width, animated: true });
    setI(n);
  };
  const s = SLIDES[i];
  const tile = 0.3 * width;

  return (
    <Modal visible transparent statusBarTranslucent animationType="fade" onRequestClose={close}>
      <View style={{ flex: 1, backgroundColor: s.bg }}>
        <View style={[S.rowB, { marginTop: ins.top + 10, paddingHorizontal: 20, height: 44 }]}>
          <View style={[S.row, { gap: 6 }]}>
            {SLIDES.map((x, k) => (
              <View key={k} style={{ width: k === i ? 22 : 8, height: 8, borderRadius: 4, backgroundColor: k === i ? '#000' : 'rgba(0,0,0,.2)' }} />
            ))}
          </View>
          {!last ? (
            <Pressable testID="cw-skip" accessibilityRole="button" onPress={close} hitSlop={10} style={{ paddingHorizontal: 14, height: 36, borderRadius: 18, borderWidth: 1.5, borderColor: '#000', justifyContent: 'center' }}>
              <Txt s={13} w={8} c="#000">
                Skip
              </Txt>
            </Pressable>
          ) : null}
        </View>
        <ScrollView
          ref={ref}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(e) => setI(Math.round(e.nativeEvent.contentOffset.x / width))}
          style={{ flex: 1 }}
        >
          {SLIDES.map((sl, k) => (
            <View key={k} style={{ width, paddingHorizontal: 24 }}>
              {/* illustration: three tilted tiles */}
              <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                <Animated.View style={{ width: tile * 2.4, height: tile * 2, opacity: k === i ? pop : 1, transform: [{ scale: k === i ? pop.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1] }) : 1 }] }}>
                  {sl.tiles.map(([icon, bg, fg], t) => (
                    <View
                      key={icon}
                      style={{
                        position: 'absolute',
                        left: [0, tile * 0.75, tile * 1.35][t],
                        top: [tile * 0.55, 0, tile * 0.8][t],
                        width: tile,
                        height: tile,
                        borderRadius: tile * 0.28,
                        backgroundColor: bg,
                        borderWidth: 2,
                        borderColor: '#000',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transform: [{ rotate: ['-10deg', '6deg', '-4deg'][t] }],
                      }}
                    >
                      <Icon name={icon} size={tile * 0.42} color={fg} />
                    </View>
                  ))}
                </Animated.View>
              </View>
              <Txt s={13} w={8} c="rgba(0,0,0,.6)">
                {sl.kicker}
              </Txt>
              <Txt s={38} w={5} c="#000" style={{ lineHeight: 42, marginTop: 6 }}>
                {sl.a}
              </Txt>
              <Txt s={38} w={8} c="#000" style={{ lineHeight: 42 }}>
                {sl.b}
              </Txt>
              <Txt s={15} c="rgba(0,0,0,.72)" style={{ marginTop: 12, lineHeight: 21 }}>
                {sl.text}
              </Txt>
            </View>
          ))}
        </ScrollView>
        <View style={{ paddingHorizontal: 24, paddingTop: 24, paddingBottom: ins.bottom + 20 }}>
          <Pressable
            testID="cw-next"
            accessibilityRole="button"
            onPress={() => (last ? (tap(), close()) : go(i + 1))}
            style={({ pressed }) => [S.rowB, { height: 60, paddingLeft: 22, paddingRight: 8, borderRadius: 30, backgroundColor: '#000', transform: [{ scale: pressed ? 0.98 : 1 }] }]}
          >
            <Txt s={16} w={8}>
              {last ? 'Start learning' : 'Next'}
            </Txt>
            <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: s.bg, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="arrow" size={20} color="#000" />
            </View>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
