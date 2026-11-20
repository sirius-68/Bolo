/* Photos of your work, shown on your profile. */
import React from 'react';
import { Pressable, ScrollView, View, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { db } from '../src/data/db';
import { supabase } from '../src/lib/supabase';
import { bump, useLive } from '../src/logic/live';
import { pickImage } from '../src/logic/media';
import { createPost } from '../src/logic/work';
import { GIcon } from '../src/g/icons';
import { confirm, toast } from '../src/g/notice';
import { Card, Top } from '../src/g/parts';
import { useG } from '../src/g/theme';
import { goBack, tap } from '../src/g/touch';
import { Big, T } from '../src/g/ui';

/** My own work photos (kept as picture posts on my profile). */
export const myWorkPhotos = () => db.POSTS.filter((p) => (p.by === 'me' || p.mine) && p.kind === 'photo' && typeof (p.src || p.photos?.[0]) === 'string');

export default function WPhotos() {
  useLive();
  const t = useG();
  const ins = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const size = Math.floor((width - 40 - 16) / 3);
  const photos = myWorkPhotos();
  const add = async () => {
    if (photos.length >= 12) return toast('12 photos is the most. Remove one to add another');
    const p = await pickImage();
    if (p) createPost({ kind: 'photo', text: '', src: p });
  };
  const remove = (id: string) =>
    confirm({
      title: 'Remove this photo?',
      ok: 'Remove',
      danger: true,
      onOk: () => {
        db.POSTS = db.POSTS.filter((p) => p.id !== id);
        bump();
        if (!id.startsWith('tmp_')) void supabase.from('posts').delete().eq('id', id);
      },
    });
  return (
    <View style={{ flex: 1, backgroundColor: t.bg, paddingTop: ins.top + 16, paddingBottom: ins.bottom + 28 }}>
      <Top />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 16 }}>
        <T s={28} w={8} ls={-0.6} style={{ marginTop: 22, marginBottom: 6 }}>
          Photos of your work
        </T>
        <T s={15} lh={1.5} c="muted" style={{ marginBottom: 16 }}>
          Clear photos of finished jobs help clients choose you.
        </T>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {photos.map((p) => (
            <Pressable key={p.id} accessibilityRole="imagebutton" accessibilityLabel="A photo of your work. Tap to remove" onPress={() => (tap(), remove(p.id))}>
              <Image source={{ uri: String(p.src || p.photos?.[0]).replace(/^uri:/, '') }} style={{ width: size, height: size, borderRadius: 16, backgroundColor: t.card2 }} contentFit="cover" />
            </Pressable>
          ))}
          <Pressable testID="wphoto-add" accessibilityRole="button" accessibilityLabel="Add a photo" onPress={() => (tap(), void add())} style={{ width: size, height: size, borderRadius: 16, borderWidth: 2, borderStyle: 'dashed', borderColor: t.line, alignItems: 'center', justifyContent: 'center', gap: 4 }}>
            <GIcon name="plus" size={22} color={t.accent} />
            <T s={13} w={8} c="accent">
              Add
            </T>
          </Pressable>
        </View>
        <Card pad={0} style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start', marginTop: 18, paddingVertical: 14, paddingHorizontal: 16 }}>
          <View style={{ marginTop: 1 }}>
            <GIcon name="camera" size={20} color={t.accent} />
          </View>
          <T s={14} lh={1.5} style={{ flex: 1 }}>
            Before-and-after photos work best. Don’t show clients’ faces or house numbers.
          </T>
        </Card>
      </ScrollView>
      <Big testID="wphoto-save" title={photos.length ? 'Save photos' : 'Done'} onPress={goBack} style={{ marginHorizontal: 20 }} />
    </View>
  );
}
