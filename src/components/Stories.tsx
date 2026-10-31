import React, { useEffect, useReducer, useRef, useState } from 'react';
import { Animated, BackHandler, Easing, Modal, Pressable, View, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar, Pict, Txt, tap } from '../ui/kit';
import { Icon } from '../ui/Icon';
import { C, S } from '../ui/theme';
import { holdSheets } from '../ui/overlay';

/** One full-screen story slide (used for "What's new" and for story ads). */
export type Story = {
  key: string;
  colors: [string, string]; // background gradient, top → bottom
  icon?: string; // big illustration made from an icon…
  pic?: any; // …or a picture
  chip?: string; // small pill above the text, e.g. "New for you" / "Sponsored"
  title: string;
  text: string;
  cta?: string;
  onCta?: () => void;
  sponsor?: { name: string; pic: any };
  dark?: boolean; // dark text on a light background
};
type Opts = { closeAfter?: number; onClose?: () => void; label?: string };

let state: { list: Story[]; opts: Opts } | null = null;
const subs = new Set<() => void>();
export function showStories(list: Story[], opts: Opts = {}) {
  if (!list.length) return;
  state = { list, opts };
  holdSheets(true);
  subs.forEach((f) => f());
}
function closeStories() {
  const o = state?.opts;
  state = null;
  holdSheets(false);
  subs.forEach((f) => f());
  o?.onClose?.();
}

const SLIDE_MS = 6500;

/** Mounted once at the root. Progress bars, tap left/right to move, hold to pause, close (after a countdown for ads). */
export function StoryHost() {
  const [, force] = useReducer((x: number) => x + 1, 0);
  useEffect(() => {
    subs.add(force);
    return () => {
      subs.delete(force);
    };
  }, []);
  if (!state) return null;
  return <Viewer key={state.list.map((s) => s.key).join('|')} list={state.list} opts={state.opts} />;
}

function Viewer({ list, opts }: { list: Story[]; opts: Opts }) {
  const ins = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [i, setI] = useState(0);
  const [left, setLeft] = useState(opts.closeAfter || 0);
  const prog = useRef(new Animated.Value(0)).current;
  const pop = useRef(new Animated.Value(0)).current;
  const run = useRef<Animated.CompositeAnimation | null>(null);
  const held = useRef(false);
  const s = list[i];

  const next = () => (i < list.length - 1 ? setI(i + 1) : left > 0 ? null : closeStories());
  const prev = () => (i > 0 ? setI(i - 1) : null);
  const start = (from = 0) => {
    run.current?.stop();
    prog.setValue(from);
    run.current = Animated.timing(prog, { toValue: 1, duration: SLIDE_MS * (1 - from), easing: Easing.linear, useNativeDriver: false });
    run.current.start(({ finished }) => finished && next());
  };
  useEffect(() => {
    pop.setValue(0);
    Animated.spring(pop, { toValue: 1, useNativeDriver: true, speed: 10, bounciness: 9 }).start();
    start();
    return () => run.current?.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i]);
  // Ads: the close button appears only after the paid seconds.
  useEffect(() => {
    if (left <= 0) return;
    const t = setTimeout(() => setLeft(left - 1), 1000);
    return () => clearTimeout(t);
  }, [left]);
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (left <= 0) closeStories();
      return true;
    });
    return () => sub.remove();
  }, [left]);
  const hold = (on: boolean) => {
    held.current = on;
    if (on) run.current?.stop();
    else prog.stopAnimation((v) => start(v));
  };
  const fg = s.dark ? '#000' : '#fff';
  const sub = s.dark ? 'rgba(0,0,0,.72)' : 'rgba(255,255,255,.86)';

  return (
    <Modal visible transparent statusBarTranslucent animationType="slide" onRequestClose={() => left <= 0 && closeStories()}>
      <View style={{ flex: 1, backgroundColor: '#000' }}>
        <View style={{ flex: 1, marginBottom: 70 + ins.bottom, borderBottomLeftRadius: 28, borderBottomRightRadius: 28, overflow: 'hidden' }}>
          <LinearGradient colors={s.colors} style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }} />
          {/* tap zones: left = back, right = next, hold = pause */}
          <View style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, flexDirection: 'row' }}>
            <Pressable style={{ flex: 1 }} onPress={prev} onLongPress={() => hold(true)} onPressOut={() => held.current && hold(false)} accessibilityLabel="Previous" />
            <Pressable style={{ flex: 2 }} onPress={next} onLongPress={() => hold(true)} onPressOut={() => held.current && hold(false)} accessibilityLabel="Next" />
          </View>
          {/* progress */}
          <View pointerEvents="none" style={{ flexDirection: 'row', gap: 5, marginTop: ins.top + 12, marginHorizontal: 16 }}>
            {list.map((x, k) => (
              <View key={x.key} style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,.3)', overflow: 'hidden' }}>
                <Animated.View style={{ height: 4, backgroundColor: '#fff', width: k < i ? '100%' : k > i ? '0%' : prog.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }} />
              </View>
            ))}
          </View>
          <View style={[S.rowB, { marginTop: 14, marginHorizontal: 16 }]} pointerEvents="box-none">
            {s.sponsor ? (
              <View style={[S.row, { gap: 8 }]} pointerEvents="none">
                <Avatar pic={s.sponsor.pic} square size={30} />
                <View>
                  <Txt s={13} w={8} c={fg}>
                    {s.sponsor.name}
                  </Txt>
                  <Txt s={11} c={sub}>
                    Sponsored
                  </Txt>
                </View>
              </View>
            ) : (
              <Txt s={13} w={8} c={fg}>
                {opts.label || 'What’s new on bolo'}
              </Txt>
            )}
            {left > 0 ? (
              <View style={{ height: 40, paddingHorizontal: 14, borderRadius: 20, backgroundColor: 'rgba(0,0,0,.35)', justifyContent: 'center' }}>
                <Txt s={13} w={8} c="#fff">
                  Close in {left}s
                </Txt>
              </View>
            ) : (
              <Pressable testID="story-close" accessibilityRole="button" accessibilityLabel="Close" onPress={() => (tap(), closeStories())} style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="x" size={20} color="#000" />
              </Pressable>
            )}
          </View>
          {/* illustration */}
          <View pointerEvents="none" style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <Animated.View style={{ transform: [{ scale: pop.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] }) }, { rotate: pop.interpolate({ inputRange: [0, 1], outputRange: ['-8deg', '-4deg'] }) }], opacity: pop }}>
              {s.pic ? (
                <Pict pic={s.pic} style={{ width: width * 0.62, height: width * 0.62, borderRadius: 36 }} />
              ) : (
                <View style={{ width: width * 0.5, height: width * 0.5, borderRadius: 44, backgroundColor: 'rgba(255,255,255,.18)', borderWidth: 1.5, borderColor: 'rgba(255,255,255,.35)', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 30, shadowOffset: { width: 0, height: 20 } }}>
                  <View style={{ width: '62%', height: '62%', borderRadius: 34, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon name={s.icon || 'sparkle'} size={width * 0.15} color={s.colors[0]} />
                  </View>
                </View>
              )}
            </Animated.View>
          </View>
          {/* text */}
          <View pointerEvents="box-none" style={{ paddingHorizontal: 22, paddingBottom: 22 }}>
            <Txt s={34} w={8} c={fg} style={{ lineHeight: 38 }}>
              {s.title}
            </Txt>
            {s.chip ? (
              <View pointerEvents="none" style={{ alignSelf: 'flex-start', marginTop: 14, paddingHorizontal: 14, height: 30, borderRadius: 15, backgroundColor: s.dark ? 'rgba(0,0,0,.12)' : 'rgba(0,0,0,.25)', justifyContent: 'center' }}>
                <Txt s={13} w={8} c={fg}>
                  {s.chip}
                </Txt>
              </View>
            ) : null}
            <Txt s={16} w={6} c={sub} style={{ marginTop: 12, lineHeight: 22 }}>
              {s.text}
            </Txt>
            {s.cta ? (
              <Pressable
                testID="story-cta"
                accessibilityRole="button"
                onPress={() => {
                  tap();
                  const go = s.onCta;
                  closeStories();
                  setTimeout(() => go?.(), 250);
                }}
                style={({ pressed }) => ({ marginTop: 20, height: 56, borderRadius: 28, backgroundColor: s.dark ? '#000' : C.yellow, alignItems: 'center', justifyContent: 'center', transform: [{ scale: pressed ? 0.97 : 1 }] })}
              >
                <Txt s={16} w={8} c={s.dark ? '#fff' : '#000'}>
                  {s.cta}
                </Txt>
              </Pressable>
            ) : null}
          </View>
        </View>
        {/* bottom strip */}
        <View style={[S.rowB, { position: 'absolute', left: 22, right: 22, bottom: ins.bottom + 14, height: 44 }]}>
          <Txt s={13} c="rgba(255,255,255,.6)">
            {i + 1} of {list.length}
          </Txt>
          <View style={[S.row, { gap: 6 }]}>
            {list.slice(0, 3).map((x, k) => (
              <View key={x.key} style={{ width: 28, height: 36, marginLeft: k ? -14 : 0, borderRadius: 8, borderWidth: 1.5, borderColor: '#000', overflow: 'hidden', transform: [{ rotate: `${(k - 1) * 8}deg` }] }}>
                <LinearGradient colors={x.colors} style={{ flex: 1 }} />
              </View>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
}
