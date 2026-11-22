/* Photos of your work, shown on your profile. Tap one to see it full screen; the ✕ removes it. */
import React, { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, View, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { db, Post } from '../src/data/db';
import { useLive } from '../src/logic/live';
import { pickImage } from '../src/logic/media';
import { createPost, removePost } from '../src/logic/work';
import { GIcon } from '../src/g/icons';
import { confirm, openPhoto, toast } from '../src/g/notice';
import { Card, Top } from '../src/g/parts';
import { useG } from '../src/g/theme';
import { goBack, tap } from '../src/g/touch';
import { Big, T } from '../src/g/ui';

/** The picture of a work photo, as an address the phone can show ('' when there is none). */
export const photoUri = (p: Post) => {
  const u = String(p.src || p.photos?.[0] || '').replace(/^uri:/, '');
  return /^(https?:|file:|content:)/.test(u) ? u : '';
};
/** My own work photos (kept as picture posts on my profile). One without a usable picture is not a photo. */
export const myWorkPhotos = () => db.POSTS.filter((p) => (p.by === 'me' || p.mine) && p.kind === 'photo' && !!photoUri(p));
/** Old picture posts of mine whose picture is missing (left over from an upload that failed): removed quietly. */
function dropEmpty() {
  db.POSTS.filter((p) => (p.by === 'me' || p.mine) && p.kind === 'photo' && !photoUri(p) && !String(p.id).startsWith('tmp_')).forEach((p) => void removePost(p.id));
}

export default function WPhotos() {
  useLive();
  const t = useG();
  const ins = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const size = Math.floor((width - 40 - 16) / 3);
  const photos = myWorkPhotos();
  const [busy, setBusy] = useState(false);
  const [broken, setBroken] = useState<Record<string, boolean>>({});
  React.useEffect(dropEmpty, []);
  const add = async () => {
    if (busy) return;
    if (photos.length >= 12) return toast('12 photos is the most. Remove one to add another');
    setBusy(true);
    const p = await pickImage();
    setBusy(false);
    if (p) createPost({ kind: 'photo', text: '', src: p });
  };
  const remove = (id: string) =>
    confirm({
      title: 'Remove this photo?',
      text: 'It leaves your profile at once.',
      ok: 'Remove',
      danger: true,
      onOk: () => void removePost(id).then((ok) => ok && toast('Photo removed')),
    });
  return (
    <View style={{ flex: 1, backgroundColor: t.bg, paddingTop: ins.top + 16, paddingBottom: ins.bottom + 28 }}>
      <Top />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 16 }}>
        <T s={28} w={8} ls={-0.6} style={{ marginTop: 22, marginBottom: 6 }}>
          Photos of your work
        </T>
        <T s={15} lh={1.5} c="muted" style={{ marginBottom: 16 }}>
          Clear photos of finished jobs help clients choose you. Tap a photo to see it; ✕ removes it.
        </T>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {photos.map((p, i) => {
            const uri = photoUri(p);
            const sending = String(p.id).startsWith('tmp_');
            return (
              <View key={p.id} style={{ width: size, height: size }}>
                <Pressable testID={`wphoto-${i}`} accessibilityRole="imagebutton" accessibilityLabel="A photo of your work. Tap to see it" onPress={() => (tap(), broken[p.id] ? remove(p.id) : openPhoto(uri))} style={{ width: size, height: size, borderRadius: 16, overflow: 'hidden', backgroundColor: t.card2, alignItems: 'center', justifyContent: 'center' }}>
                  {broken[p.id] ? (
                    <View style={{ alignItems: 'center', gap: 4, padding: 6 }}>
                      <GIcon name="warn" size={20} color={t.muted} />
                      <T s={11} w={7} c="muted" center>
                        Can’t show this photo
                      </T>
                    </View>
                  ) : (
                    <Image source={{ uri }} style={{ width: size, height: size }} contentFit="cover" onError={() => setBroken((b) => ({ ...b, [p.id]: true }))} />
                  )}
                  {sending ? (
                    <View style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.45)', alignItems: 'center', justifyContent: 'center' }}>
                      <ActivityIndicator color="#ffffff" />
                    </View>
                  ) : null}
                </Pressable>
                <Pressable testID={`wphoto-x-${i}`} accessibilityRole="button" accessibilityLabel="Remove this photo" hitSlop={8} onPress={() => (tap(), remove(p.id))} style={{ position: 'absolute', right: 6, top: 6, width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(0, 0, 0, 0.6)', alignItems: 'center', justifyContent: 'center' }}>
                  <GIcon name="x" size={14} color="#ffffff" sw={2.6} />
                </Pressable>
              </View>
            );
          })}
          <Pressable testID="wphoto-add" accessibilityRole="button" accessibilityLabel="Add a photo" onPress={() => (tap(), void add())} style={{ width: size, height: size, borderRadius: 16, borderWidth: 2, borderStyle: 'dashed', borderColor: t.line, alignItems: 'center', justifyContent: 'center', gap: 4 }}>
            {busy ? <ActivityIndicator color={t.accent} /> : <GIcon name="plus" size={22} color={t.accent} />}
            <T s={13} w={8} c="accent">
              {busy ? 'Opening…' : 'Add'}
            </T>
          </Pressable>
        </View>
        <Card pad={0} style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start', marginTop: 18, paddingVertical: 14, paddingHorizontal: 16 }}>
          <View style={{ marginTop: 1 }}>
            <GIcon name="info" size={20} color={t.accent} />
          </View>
          <T s={14} lh={1.5} style={{ flex: 1 }}>
            Before-and-after photos work best. Don’t show clients’ faces or house numbers.
          </T>
        </Card>
      </ScrollView>
      {/* photos save as you add them: this only goes back */}
      <Big testID="wphoto-save" title="Done" onPress={goBack} style={{ marginHorizontal: 20 }} />
    </View>
  );
}
