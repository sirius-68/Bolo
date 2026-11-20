/* Your profile, as a worker: how full it is, and each part one tap away. */
import React from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { db } from '../src/data/db';
import { bump, useLive } from '../src/logic/live';
import { cityLabel } from '../src/logic/core';
import { pickImage } from '../src/logic/media';
import { myStats } from '../src/logic/server';
import { areaLabel, hasArea } from '../src/g/data';
import { GIcon } from '../src/g/icons';
import { Card, SwitchCard, Top } from '../src/g/parts';
import { openArea } from '../src/g/sheets';
import { RED, useG } from '../src/g/theme';
import { tap } from '../src/g/touch';
import { Face, Link, MenuRow, T } from '../src/g/ui';
import { Way, workLine } from '../src/g/worker';
import { myWorkPhotos } from './wphotos';

export default function WProfile() {
  useLive();
  const t = useG();
  const ins = useSafeAreaInsets();
  const a = (db.PR.area || {}) as any;
  const ways: Way[] = Array.isArray(a.ways) ? a.ways : [];
  const range = Number(a.radius) >= 50 ? 0 : Number(a.radius) || 5;
  const services = (db.PR.services || []).filter((s) => s && s.skill && !s.draft);
  const priced = services.filter((s) => +s.price > 0).length;
  const photos = myWorkPhotos().length;
  const id = db.PR.docs.id;
  const st: any = (myStats as any)?.() || {};
  const rating = Number(st.rating) || 0;
  const reviews = Number(st.reviews) || 0;
  const done = [!!db.user.avatar, priced > 0 || !!a.afterSee, photos > 0, id === 'verified' || id === 'review', ways.length > 0, hasArea()];
  const pct = Math.round((40 + (60 * done.filter(Boolean).length) / done.length) / 5) * 5;
  const how = [ways.includes('go') ? (range ? `Visits up to ${range} km` : `Visits across ${cityLabel() || 'the city'}`) : '', ways.includes('come') ? 'Own shop' : '', ways.includes('online') ? 'Online' : ''].filter(Boolean).join(' · ');
  const photo = async () => {
    const p = await pickImage({ square: true });
    if (p) {
      db.user.avatar = p;
      bump();
    }
  };
  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingTop: ins.top + 16, paddingHorizontal: 20, paddingBottom: ins.bottom + 28 }}>
        <Top pad={0} right={<Link testID="wprofile-edit" title="Edit work" onPress={() => router.push('/w1?edit=1' as any)} style={{ paddingHorizontal: 12 }} />} />
        <T s={28} w={8} ls={-0.6} style={{ marginTop: 18, marginBottom: 14 }}>
          Your profile
        </T>
        <Card r={22} style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <Pressable testID="wprofile-photo" accessibilityRole="button" accessibilityLabel={db.user.avatar ? 'Change your photo' : 'Add your photo'} onPress={() => (tap(), void photo())}>
            <Face name={db.user.name || 'You'} photo={db.user.avatar} size={64} />
            <View style={{ position: 'absolute', right: -4, bottom: -4, width: 26, height: 26, borderRadius: 13, backgroundColor: RED, borderWidth: 2, borderColor: t.card, alignItems: 'center', justifyContent: 'center' }}>
              <GIcon name="camera" size={13} color="#ffffff" />
            </View>
          </Pressable>
          <View style={{ flex: 1, minWidth: 0 }}>
            <T s={18} w={8} lines={1}>
              {db.user.name || 'You'}
            </T>
            <T s={13} c="muted" style={{ marginTop: 2 }}>
              {workLine({ skill: db.user.skills.join(', ') || 'No skill yet', ways, range }, hasArea() ? areaLabel() : '')}
            </T>
            <T s={13} w={7} c="accent" style={{ marginTop: 6 }}>
              {reviews ? `${rating.toFixed(1)} ★ from ${reviews} ${reviews === 1 ? 'review' : 'reviews'}` : 'New on getit · no ratings yet'}
            </T>
          </View>
        </Card>
        <Card pad={0} style={{ marginTop: 14, paddingVertical: 14, paddingHorizontal: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <T s={15} w={8}>
              Profile {pct}% done
            </T>
            <T s={13} c="muted">
              Clients trust full profiles
            </T>
          </View>
          <View style={{ height: 8, marginTop: 10, borderRadius: 4, backgroundColor: t.card2 }}>
            <View style={{ width: `${pct}%`, height: 8, borderRadius: 4, backgroundColor: RED }} />
          </View>
        </Card>
        <View style={{ marginTop: 8 }}>
          <MenuRow testID="wprofile-prices" label="Services and prices" value={a.afterSee && !priced ? 'Price after a look' : priced ? `${priced} ${priced === 1 ? 'service' : 'services'}` : 'Not set yet'} onPress={() => router.push('/wprices' as any)} />
          <MenuRow testID="wprofile-photos" label="Photos of your work" value={photos ? `${photos} ${photos === 1 ? 'photo' : 'photos'}` : 'None yet'} onPress={() => router.push('/wphotos' as any)} />
          <MenuRow testID="wprofile-id" label="ID check" value={id === 'verified' ? 'Checked' : id === 'review' ? 'Checking' : 'Not done yet'} onPress={() => router.push('/wid' as any)} />
          <MenuRow testID="wprofile-how" label="How you work" value={how || 'Not set yet'} onPress={() => router.push('/w2?edit=1' as any)} />
          <MenuRow testID="wprofile-area" label="Your area" value={hasArea() ? areaLabel() : 'Choose'} onPress={() => openArea()} />
        </View>
        <SwitchCard
          testID="wprofile-urgent"
          title="I take urgent jobs"
          sub="“As soon as possible” requests ring on your phone"
          on={a.urgent !== false}
          onChange={(v) => {
            db.PR.area = { ...db.PR.area, urgent: v } as any;
            bump();
          }}
          style={{ marginTop: 16 }}
        />
      </ScrollView>
    </View>
  );
}
