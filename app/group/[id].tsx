import React, { useRef, useState } from 'react';
import { shareTail } from '../../src/logic/links';
import { Animated, Easing, Modal, Pressable, ScrollView, Share, Text, View, useWindowDimensions } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import { db } from '../../src/data/db';
import { Avatar, Empty, Pict, Txt, tap, Missing } from '../../src/ui/kit';
import { Icon } from '../../src/ui/Icon';
import { C, S, tx } from '../../src/ui/theme';
import { P, THREADS, myPhoto } from '../../src/logic/core';
import { bump, useLive } from '../../src/logic/live';
import { groupOf } from '../../src/logic/career';
import { deleteChat } from '../../src/logic/work';
import { confirm, toast } from '../../src/ui/overlay';
import { openRules } from '../../src/sheets/chat';
import { openProfile } from '../../src/logic/nav';
import { RULES } from '../../src/data/catalog';

const TABS = ['Members', 'Media', 'Files', 'Links', 'Voice'] as const;
type Tab = (typeof TABS)[number];

/** Group info: tap the group's name in a chat. Pull down (or tap the picture) and it grows into a full-width photo;
    scroll up and it shrinks back. Then actions, description, invite link, members and shared content. */
export default function GroupInfo() {
  useLive();
  const ins = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const th = THREADS()[id];
  const p = P(id);
  const m = groupOf(id);
  const { width: W } = useWindowDimensions();
  const [big, setBig] = useState(false);
  // 0 = small round picture with the name under it, 1 = full-width photo with the name on it
  const grow = useRef(new Animated.Value(0)).current;
  const bigRef = useRef(false);
  const scrollY = useRef(0);
  const touch = useRef<{ y: number; atTop: boolean } | null>(null);
  const setGrown = (on: boolean) => {
    if (bigRef.current === on) return;
    bigRef.current = on;
    setBig(on);
    Animated.timing(grow, { toValue: on ? 1 : 0, duration: 280, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
  };
  const [tab, setTab] = useState<Tab>('Members');
  const [menu, setMenu] = useState(false);
  if (!th || !p) return <Missing bar="Group" title="Group not found" text="It may have been deleted, or you’re no longer a member." />;
  const owner = m ? (m.by ? m.by : m.mine ? 'me' : null) : null;
  const members = ['me', ...(th.members || []).filter((x) => x !== 'me')];
  // Groups are joined by being added by a member (there is no join-by-link yet): the invite brings people to bolo.
  const invite = `Join me in “${p.name}” on bolo. Get the app, then tell me your name there and I’ll add you.\n${shareTail()}`;
  const desc = m?.desc || `${p.name} on bolo. Share updates, files and questions with everyone in the group.`;
  const rules = (m?.rules || []).map((r) => RULES[r]?.[0]).filter(Boolean);
  const toggleBig = () => {
    tap();
    setGrown(!bigRef.current);
  };
  const count = `${members.length} member${members.length === 1 ? '' : 's'}`;
  // sizes of the picture in its two states
  const SMALL = 112;
  const HERO = Math.min(W, 440);
  const topSmall = ins.top + 56;
  const headSmall = topSmall + SMALL + 14 + 62; // picture, gap, name and count
  const lerp = (a: number, b: number) => grow.interpolate({ inputRange: [0, 1], outputRange: [a, b] });
  const logo = typeof p.photo === 'string' && p.photo.startsWith('logo:') ? p.photo.slice(5).split('|') : null;
  const mute = () => {
    th.muted = th.muted ? 0 : 1;
    bump();
    toast(th.muted ? 'Notifications off for this group' : 'Notifications on');
  };
  const leave = () =>
    confirm({
      title: `Leave ${p.name}?`,
      text: 'You’ll stop getting messages from this group. You can join again from its invite link.',
      ok: 'Leave group',
      danger: true,
      icon: 'logout',
      onOk: () => {
        deleteChat(id);
        router.dismissTo('/inbox' as any);
      },
    });
  const msgs = th.msgs.filter((x) => x.f);
  const media = msgs.filter((x) => x.k === 'img' && x.src);
  const files = msgs.filter((x) => x.k === 'file');
  const links = msgs.filter((x) => /https?:\/\/|\b[a-z0-9-]+\.(com|app|cm|org|net|io)\b/i.test(x.t || ''));
  const voice = msgs.filter((x) => x.k === 'voice');
  const counts: Record<Tab, number> = { Members: members.length, Media: media.length, Files: files.length, Links: links.length, Voice: voice.length };

  const Action = ({ icon, label, onPress, testID }: { icon: string; label: string; onPress: () => void; testID?: string }) => (
    <Pressable testID={testID} accessibilityRole="button" onPress={() => (tap(), onPress())} style={({ pressed }) => ({ flex: 1, height: 64, borderRadius: 18, alignItems: 'center', justifyContent: 'center', gap: 4, backgroundColor: big ? 'rgba(0,0,0,.28)' : C.s1, borderWidth: big ? 0 : 1, borderColor: C.line, transform: [{ scale: pressed ? 0.96 : 1 }] })}>
      <Icon name={icon} size={22} color={C.text} />
      <Txt s={12} w={7}>
        {label}
      </Txt>
    </Pressable>
  );

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 40 + ins.bottom }}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={(e) => {
          scrollY.current = e.nativeEvent.contentOffset.y;
          // reading on: the photo gets out of the way
          if (bigRef.current && scrollY.current > 36) setGrown(false);
        }}
        // a pull down while already at the top opens the photo (Android gives no scroll event for that, so the finger is followed)
        onTouchStart={(e) => (touch.current = { y: e.nativeEvent.pageY, atTop: scrollY.current <= 0 })}
        onTouchMove={(e) => {
          const t = touch.current;
          if (!t || !t.atTop || bigRef.current) return;
          if (e.nativeEvent.pageY - t.y > 48 && scrollY.current <= 0) {
            touch.current = null;
            tap();
            setGrown(true);
          }
        }}
        onTouchEnd={() => (touch.current = null)}
      >
        {/* hero: one picture that changes size, so there is no jump between two layouts */}
        <Animated.View style={{ height: lerp(headSmall, HERO), backgroundColor: C.bg }}>
          <Pressable onPress={toggleBig} accessibilityRole="imagebutton" accessibilityLabel={big ? 'Make the picture smaller' : 'Show the picture full size'} style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}>
            <Animated.View
              style={{
                position: 'absolute',
                top: lerp(topSmall, 0),
                left: lerp((W - SMALL) / 2, (W - HERO) / 2),
                width: lerp(SMALL, HERO),
                height: lerp(SMALL, HERO),
                borderRadius: lerp(SMALL / 2, 0),
                overflow: 'hidden',
                backgroundColor: logo ? logo[1] || C.lav : C.s2,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {logo ? (
                <Animated.Text style={[tx(40, 8, logo[2] || '#000'), { fontSize: lerp(40, 120) }]} numberOfLines={1}>
                  {logo[0]}
                </Animated.Text>
              ) : (
                <Pict pic={p.photo} style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0 }} />
              )}
              {/* shade under the name when the photo is open */}
              <Animated.View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 130, backgroundColor: 'rgba(0,0,0,.38)', opacity: grow }} />
            </Animated.View>
            {/* name under the small picture */}
            <Animated.View pointerEvents="none" style={{ position: 'absolute', left: 16, right: 16, top: topSmall + SMALL + 14, alignItems: 'center', opacity: grow.interpolate({ inputRange: [0, 0.5], outputRange: [1, 0], extrapolate: 'clamp' }) }}>
              <Text style={tx(24, 8, C.text, { textAlign: 'center' })} numberOfLines={1}>
                {p.name}
              </Text>
              <Text style={tx(14, 5, C.muted, { marginTop: 2 })}>{count}</Text>
            </Animated.View>
            {/* name on the open photo */}
            <Animated.View pointerEvents="none" style={{ position: 'absolute', left: 16, right: 16, bottom: 14, opacity: grow.interpolate({ inputRange: [0.5, 1], outputRange: [0, 1], extrapolate: 'clamp' }) }}>
              <Text style={tx(28, 8, '#fff')} numberOfLines={2}>
                {p.name}
              </Text>
              <Text style={tx(14, 5, '#e3e7ff')}>{count}</Text>
            </Animated.View>
          </Pressable>
        </Animated.View>
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 14, marginBottom: 18, paddingHorizontal: 16 }}>
          <Action testID="grp-message" icon="chat" label="Message" onPress={() => router.back()} />
          <Action testID="grp-mute" icon={th.muted ? 'bell' : 'speaker'} label={th.muted ? 'Unmute' : 'Mute'} onPress={mute} />
          <Action testID="grp-leave" icon="logout" label="Leave" onPress={leave} />
        </View>

        <View style={{ paddingHorizontal: 16, gap: 14 }}>
          {/* description + invite link */}
          <View style={{ borderRadius: 22, backgroundColor: C.s1, borderWidth: 1, borderColor: C.line, overflow: 'hidden' }}>
            <View style={{ padding: 16 }}>
              <Txt s={15}>{desc}</Txt>
              {rules.length ? (
                <Pressable onPress={() => openRules(id, true)} style={{ marginTop: 6 }}>
                  <Txt s={14} c={C.lav} w={7}>
                    Group rules: {rules.slice(0, 2).join(' · ')}
                    {rules.length > 2 ? ' …' : ''}
                  </Txt>
                </Pressable>
              ) : null}
              <Txt s={12} c={C.faint} style={{ marginTop: 6 }}>
                Description
              </Txt>
            </View>
            <View style={{ height: 1, backgroundColor: C.line, marginLeft: 16 }} />
            <Pressable
              accessibilityRole="button"
              onPress={async () => {
                await Clipboard.setStringAsync(invite);
                toast('Invite copied. Paste it to your friends');
              }}
              style={[S.rowB, { padding: 16 }]}
            >
              <View style={{ flex: 1 }}>
                <Txt s={15} lines={1}>
                  Invite people to this group
                </Txt>
                <Txt s={12} c={C.faint} style={{ marginTop: 2 }}>
                  Tap to copy an invite · add them under Members once they’ve joined bolo
                </Txt>
              </View>
              <Pressable accessibilityLabel="Share invite link" hitSlop={10} onPress={() => Share.share({ message: invite }).catch(() => {})} style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: C.s2, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="share" size={18} color={C.text} />
              </Pressable>
            </Pressable>
          </View>

          {/* tabs */}
          <View style={{ borderRadius: 999, backgroundColor: C.s1, borderWidth: 1, borderColor: C.line, overflow: 'hidden' }}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ padding: 4, gap: 4, flexGrow: 1 }}>
              {TABS.map((t) => {
                const on = t === tab;
                return (
                  <Pressable key={t} testID={`grp-tab-${t}`} accessibilityRole="tab" accessibilityState={{ selected: on }} onPress={() => (tap(), setTab(t))} style={{ flexGrow: 1, height: 38, paddingHorizontal: 14, borderRadius: 999, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 5, backgroundColor: on ? 'rgba(169,182,255,.18)' : 'transparent' }}>
                    <Txt s={14} w={on ? 8 : 6} c={on ? C.lav : C.muted}>
                      {t}
                    </Txt>
                    {counts[t] ? (
                      <Txt s={11} c={C.faint}>
                        {counts[t]}
                      </Txt>
                    ) : null}
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          {/* tab content */}
          {tab === 'Members' ? (
            <View style={{ borderRadius: 22, backgroundColor: C.s1, borderWidth: 1, borderColor: C.line, overflow: 'hidden' }}>
              {members.map((mid, i) => {
                const me = mid === 'me';
                const who = me ? { name: db.user.name || 'You', photo: myPhoto() } : P(mid);
                const badge = mid === owner ? (m?.plain ? 'Owner' : 'Mentor') : me ? 'You' : i === 1 && !owner ? 'Admin' : null;
                return (
                  <Pressable key={mid} onPress={() => (me ? null : openProfile(mid))} style={({ pressed }) => [S.row, { gap: 12, paddingVertical: 10, paddingHorizontal: 14, backgroundColor: pressed ? C.s2 : 'transparent' }]}>
                    <Avatar pic={who.photo} size={44} />
                    <View style={{ flex: 1, minWidth: 0, borderBottomWidth: i < members.length - 1 ? 1 : 0, borderColor: C.line, paddingBottom: 10, marginBottom: -10 }}>
                      <View style={S.rowB}>
                        <Txt s={15} w={8} lines={1} style={{ flexShrink: 1 }}>
                          {who.name}
                        </Txt>
                        {badge ? (
                          <View style={{ paddingHorizontal: 10, height: 24, borderRadius: 12, backgroundColor: 'rgba(123,224,167,.14)', justifyContent: 'center' }}>
                            <Txt s={11} w={8} c={C.mint}>
                              {badge}
                            </Txt>
                          </View>
                        ) : null}
                      </View>
                      {!me && (P(mid) as any).role ? (
                        <Txt s={12} c={C.muted} lines={1}>
                          {(P(mid) as any).role}
                        </Txt>
                      ) : null}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          ) : tab === 'Media' ? (
            media.length ? (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
                {media.map((x, i) => (
                  <Pict key={i} pic={x.src!} style={{ width: '32.6%', aspectRatio: 1, borderRadius: 10 }} />
                ))}
              </View>
            ) : (
              <EmptyBox icon="image" title="No photos yet" text="Photos and videos shared in the group show here." />
            )
          ) : tab === 'Files' ? (
            files.length ? (
              <List items={files.map((x) => [x.name || 'File', x.size || '', 'file'])} />
            ) : (
              <EmptyBox icon="file" title="No files yet" text="Documents shared in the group show here." />
            )
          ) : tab === 'Links' ? (
            links.length ? (
              <List items={links.map((x) => [x.t || '', x.at || '', 'globe'])} />
            ) : (
              <EmptyBox icon="globe" title="No links yet" text="Links shared in the group show here." />
            )
          ) : voice.length ? (
            <List items={voice.map((x) => ['Voice message', x.dur || '', 'mic'])} />
          ) : (
            <EmptyBox icon="mic" title="No voice messages yet" text="Voice messages sent in the group show here." />
          )}
        </View>
      </ScrollView>

      {/* top bar floats over the hero */}
      <View style={[S.rowB, { position: 'absolute', top: ins.top + 6, left: 8, right: 8 }]}>
        <Pressable accessibilityLabel="Back" hitSlop={8} onPress={() => router.back()} style={{ width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: big ? 'rgba(0,0,0,.3)' : 'transparent' }}>
          <Icon name="back" size={24} color={C.text} />
        </Pressable>
        <Pressable testID="grp-menu" accessibilityLabel="More" hitSlop={8} onPress={() => (tap(), setMenu(true))} style={{ width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: big ? 'rgba(0,0,0,.3)' : 'transparent' }}>
          <Icon name="dots" size={24} color={C.text} />
        </Pressable>
      </View>

      {/* ⋮ menu */}
      <Modal visible={menu} transparent animationType="fade" onRequestClose={() => setMenu(false)}>
        <Pressable style={{ flex: 1 }} onPress={() => setMenu(false)}>
          <View style={{ position: 'absolute', top: ins.top + 52, right: 12, minWidth: 230, paddingVertical: 6, borderRadius: 18, backgroundColor: C.s2, borderWidth: 1, borderColor: C.line, shadowColor: '#000', shadowOpacity: 0.5, shadowRadius: 16, elevation: 16 }}>
            {(
              [
                ['pushpin', th.pinned ? 'Unpin chat' : 'Pin chat', () => ((th.pinned = th.pinned ? 0 : 1), bump(), toast(th.pinned ? 'Chat pinned' : 'Chat unpinned'))],
                ['share', 'Share group', () => Share.share({ message: invite }).catch(() => {})],
                ...(rules.length ? ([['shield', 'Group rules', () => openRules(id, true)]] as [string, string, () => void][]) : []),
                ['logout', 'Leave group', leave],
              ] as [string, string, () => void][]
            ).map(([i, t, fn]) => (
              <Pressable key={t} onPress={() => (setMenu(false), setTimeout(fn, 120))} style={({ pressed }) => [S.row, { gap: 14, paddingHorizontal: 16, height: 50, backgroundColor: pressed ? C.s3 : 'transparent' }]}>
                <Icon name={i} size={20} color={t === 'Leave group' ? C.errSoft : C.text} />
                <Txt s={15} c={t === 'Leave group' ? C.errSoft : C.text}>
                  {t}
                </Txt>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

function EmptyBox({ icon, title, text }: { icon: string; title: string; text: string }) {
  return (
    <View style={{ alignItems: 'center', paddingVertical: 30, paddingHorizontal: 20, borderRadius: 22, backgroundColor: C.s1, borderWidth: 1, borderColor: C.line }}>
      <View style={{ width: 54, height: 54, borderRadius: 27, backgroundColor: C.s2, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={icon} size={24} color={C.yellow} />
      </View>
      <Txt s={15} w={8} center style={{ marginTop: 12 }}>
        {title}
      </Txt>
      <Txt s={13} c={C.muted} center style={{ marginTop: 4 }}>
        {text}
      </Txt>
    </View>
  );
}
function List({ items }: { items: [string, string, string][] }) {
  return (
    <View style={{ borderRadius: 22, backgroundColor: C.s1, borderWidth: 1, borderColor: C.line, overflow: 'hidden' }}>
      {items.map(([t, s, i], k) => (
        <View key={k} style={[S.row, { gap: 12, padding: 14, borderBottomWidth: k < items.length - 1 ? 1 : 0, borderColor: C.line }]}>
          <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: C.s2, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name={i} size={18} color={C.lav} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Txt s={14} w={7} lines={1}>
              {t}
            </Txt>
            {s ? (
              <Txt s={12} c={C.muted}>
                {s}
              </Txt>
            ) : null}
          </View>
        </View>
      ))}
    </View>
  );
}
