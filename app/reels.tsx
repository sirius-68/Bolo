import React, { useEffect, useRef, useState } from 'react';
import { Animated, FlatList, Pressable, View, useWindowDimensions } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { db, REELS, Reel } from '../src/data/db';
import { Avatar, Btn, Empty, IconBtn, Pict, Txt, Verified, tap } from '../src/ui/kit';
import { Icon } from '../src/ui/Icon';
import { C, S } from '../src/ui/theme';
import { P, fname, has, isW, k, kmOf } from '../src/logic/core';
import { useLive } from '../src/logic/live';
import { follow, hireState, likeReel, saveToggle } from '../src/logic/work';
import { openProfile } from '../src/logic/nav';
import { openComments, openHire, sharePost } from '../src/sheets/work';
import { openChat } from '../src/sheets/chat';

type F = 'following' | 'near' | 'all';

export default function Reels() {
  useLive();
  const { i } = useLocalSearchParams<{ i?: string }>();
  const { height, width } = useWindowDimensions();
  const ins = useSafeAreaInsets();
  const [flt, setF] = useState<F>('all');
  const [cur, setCur] = useState(0);
  const list = REELS.map((r, n) => [r, n] as [Reel, number]).filter(([r]) => flt === 'all' || (flt === 'following' ? has(db.followed, r.by) : kmOf(P(r.by).dist) <= 2));
  const ref = useRef<FlatList>(null);
  const start = Math.max(0, list.findIndex(([, n]) => n === +(i || 0)));
  useEffect(() => {
    if (start > 0) setTimeout(() => ref.current?.scrollToIndex({ index: start, animated: false }), 0);
    setCur(start);
  }, []);
  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <StatusBar style="light" />
      {list.length ? (
        <FlatList
          ref={ref}
          data={list}
          keyExtractor={([, n]) => String(n)}
          pagingEnabled
          showsVerticalScrollIndicator={false}
          getItemLayout={(_, idx) => ({ length: height, offset: height * idx, index: idx })}
          onMomentumScrollEnd={(e) => setCur(Math.round(e.nativeEvent.contentOffset.y / height))}
          renderItem={({ item: [r, n], index }) => <ReelPage r={r} n={n} h={height} w={width} active={index === cur} bottom={ins.bottom} top={ins.top} />}
          windowSize={3}
          initialNumToRender={2}
          maxToRenderPerBatch={2}
        />
      ) : (
        <View style={{ flex: 1, justifyContent: 'center', padding: 20 }}>
          <Empty title={flt === 'following' ? 'Nobody you follow has posted yet' : 'No videos near you yet'} text="Try “For you” to see everything." />
        </View>
      )}
      <View style={[S.row, { position: 'absolute', top: ins.top + 6, left: 12, right: 12, gap: 8 }]}>
        <IconBtn name="back" label="Close" bg="rgba(0,0,0,.4)" onPress={() => router.back()} />
        <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'center', gap: 4 }}>
          {(
            [
              ['following', 'Following'],
              ['near', 'Near you'],
              ['all', 'For you'],
            ] as [F, string][]
          ).map(([f, l]) => (
            <Pressable key={f} accessibilityRole="tab" accessibilityState={{ selected: flt === f }} onPress={() => (tap(), setF(f), setCur(0))} style={{ paddingHorizontal: 10, height: 36, justifyContent: 'center', borderBottomWidth: 2, borderBottomColor: flt === f ? '#fff' : 'transparent' }}>
              <Txt s={14} w={flt === f ? 8 : 6} c={flt === f ? '#fff' : 'rgba(255,255,255,.7)'}>
                {l}
              </Txt>
            </Pressable>
          ))}
        </View>
        <View style={{ width: 44 }} />
      </View>
    </View>
  );
}

function ReelPage({ r, n, h, w, active, bottom, top }: { r: Reel; n: number; h: number; w: number; active: boolean; bottom: number; top: number }) {
  const p = P(r.by);
  const f = fname(p.name);
  const liked = db.reelLiked.includes(n);
  const saved = has(db.saved, r.by);
  const following = has(db.followed, r.by);
  const st = hireState(r.by);
  const zoom = useRef(new Animated.Value(1)).current;
  const heart = useRef(new Animated.Value(0)).current;
  const lastTap = useRef(0);
  useEffect(() => {
    if (!active) return;
    const a = Animated.loop(Animated.sequence([Animated.timing(zoom, { toValue: 1.08, duration: 6000, useNativeDriver: true }), Animated.timing(zoom, { toValue: 1, duration: 6000, useNativeDriver: true })]));
    a.start();
    return () => a.stop();
  }, [active]);
  const onTap = () => {
    const now = Date.now();
    if (now - lastTap.current < 280) {
      if (!liked) likeReel(n);
      heart.setValue(1);
      Animated.timing(heart, { toValue: 0, duration: 700, delay: 200, useNativeDriver: true }).start();
    }
    lastTap.current = now;
  };
  const Side = ({ icon, label, on, onPress, a11y }: { icon: string; label: string; on?: boolean; onPress: () => void; a11y: string }) => (
    <Pressable accessibilityLabel={a11y} accessibilityState={{ selected: !!on }} onPress={() => (tap(), onPress())} style={{ alignItems: 'center', gap: 2 }}>
      <View style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: 'rgba(0,0,0,.35)', alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={icon} size={24} color={on ? (icon === 'heart' ? C.pink : C.yellow) : '#fff'} />
      </View>
      <Txt s={11} w={7}>
        {label}
      </Txt>
    </Pressable>
  );
  return (
    <View style={{ width: w, height: h, overflow: 'hidden', backgroundColor: '#111' }}>
      <Pressable style={{ flex: 1 }} onPress={onTap} accessibilityLabel="Double-tap to like">
        <Animated.View style={{ flex: 1, transform: [{ scale: zoom }] }}>
          <Pict pic={'scenes/' + r.scene} style={{ width: w, height: h }} />
        </Animated.View>
        <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: h * 0.5, backgroundColor: 'rgba(0,0,0,.35)' }} />
        <Animated.View pointerEvents="none" style={{ position: 'absolute', top: h / 2 - 50, left: w / 2 - 50, opacity: heart, transform: [{ scale: heart.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1.2] }) }] }}>
          <Icon name="heart" size={100} color={C.pink} />
        </Animated.View>
      </Pressable>
      {r.live ? (
        <View style={[S.row, { position: 'absolute', top: top + 62, left: 16, gap: 6, paddingHorizontal: 8, height: 24, borderRadius: 6, backgroundColor: C.err }]}>
          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#fff' }} />
          <Txt s={11} w={8}>
            LIVE · {r.views}
          </Txt>
        </View>
      ) : null}
      <View style={{ position: 'absolute', right: 12, bottom: 150 + bottom, gap: 16, alignItems: 'center' }}>
        <Pressable accessibilityLabel={`Open ${p.name}’s profile`} onPress={() => openProfile(r.by)}>
          <Avatar pic={p.photo} size={48} ring="#fff" />
          <Pressable accessibilityLabel={following ? 'Unfollow' : 'Follow'} onPress={() => follow(r.by)} style={{ position: 'absolute', bottom: -8, left: 14, width: 22, height: 22, borderRadius: 11, backgroundColor: following ? C.ok : C.pink, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name={following ? 'check' : 'plus'} size={13} color="#fff" />
          </Pressable>
        </Pressable>
        <Side icon="heart" a11y="Like" on={liked} label={k(r.likes + (liked ? 1 : 0))} onPress={() => likeReel(n)} />
        <Side icon="comment" a11y="Comments" label={k(r.comments)} onPress={() => openComments('r' + n)} />
        <Side icon="bookmark" a11y="Save" on={saved} label="Save" onPress={() => saveToggle('saved', r.by, f)} />
        <Side icon="share" a11y="Share" label="Share" onPress={() => sharePost(p.name)} />
      </View>
      <View style={{ position: 'absolute', left: 16, right: 80, bottom: 24 + bottom, gap: 6 }}>
        <Pressable onPress={() => openProfile(r.by)} style={[S.row, { gap: 6 }]}>
          <Txt s={16} w={8}>
            {p.name}
          </Txt>
          {p.verified ? <Verified size={15} /> : null}
        </Pressable>
        <Txt s={12} c="rgba(255,255,255,.8)">
          {p.role} · {p.area} · {p.dist} · ★ {p.rate}
        </Txt>
        <Txt s={14} lines={3}>
          {r.cap}
        </Txt>
        <Txt s={12} w={7} c={C.lav}>
          {r.tags.join(' ')}
        </Txt>
        <View style={[S.row, { gap: 6, alignSelf: 'flex-start', paddingHorizontal: 10, height: 28, borderRadius: 999, backgroundColor: 'rgba(0,0,0,.5)' }]}>
          <Icon name="wrench" size={14} color={C.yellow} />
          <Txt s={12} w={7}>
            {r.job}
          </Txt>
        </View>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 6 }}>
          {isW() ? (
            <Btn small variant="yellow" title={st === 'booked' ? 'Booked ✓' : st === 'requested' ? 'Requested ✓' : `Hire ${f}`} onPress={() => openHire(r.by)} style={{ flex: 1 }} />
          ) : (
            <Btn small variant="yellow" title={`View ${f}’s profile`} onPress={() => openProfile(r.by)} style={{ flex: 1 }} />
          )}
          <Btn small variant="dark" title="Message" onPress={() => openChat(r.by)} style={{ flex: 1 }} />
        </View>
      </View>
    </View>
  );
}
