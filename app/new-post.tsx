import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { db, ui, uid } from '../src/data/db';
import { Btn, Chip, Chips, Field, Input, Label, Page, Pict, SelectBox, Sub, Title, TopBar, Txt } from '../src/ui/kit';
import { Icon } from '../src/ui/Icon';
import { pick, toast } from '../src/ui/overlay';
import { C, R } from '../src/ui/theme';
import { bizName, curBiz, isW, mySkill, cityLabel } from '../src/logic/core';
import { services } from '../src/logic/account';
import { bump } from '../src/logic/live';
import { pickImage } from '../src/logic/media';
import { resetTo } from '../src/logic/nav';

export default function NewPost() {
  const w = isW();
  const [src, setSrc] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const svc = w ? services().filter((s) => !s.draft) : [];
  const [link, setLink] = useState(svc[0]?.skill || '');
  const TAGS = w ? [mySkill(), 'Before & after', 'Same-day', 'Guaranteed', cityLabel()].filter(Boolean) : ['Hiring', 'Team', 'Event', 'News', cityLabel()].filter(Boolean);
  const ok = !!src || text.trim().length >= 5;
  const choose = async (camera: boolean) => {
    const p = await pickImage({ camera });
    if (p) setSrc(p);
  };
  return (
    <Page keyboard header={<TopBar title={w ? 'Share your work' : 'Company update'} />}>
      <Title sm>{w ? 'Show people what you can do' : `News from ${bizName(curBiz())}`}</Title>
      <Sub>{w ? 'Posts with a photo get up to 4× more hires.' : 'Updates show in the feed with your logo. Photos get more views.'}</Sub>
      <View style={{ gap: 18, marginTop: 20 }}>
        {src ? (
          <View>
            <Pict pic={src} style={{ width: '100%', aspectRatio: 4 / 3, borderRadius: R.lg }} />
            <Pressable accessibilityLabel="Remove photo" onPress={() => setSrc(null)} style={{ position: 'absolute', top: 10, right: 10, width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(0,0,0,.7)', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="x" size={16} color="#fff" />
            </Pressable>
          </View>
        ) : (
          <View style={{ flexDirection: 'row', gap: 10 }}>
            {(
              [
                ['camera', 'Take a photo', true],
                ['image', 'From gallery', false],
              ] as const
            ).map(([i, l, cam]) => (
              <Pressable key={l} accessibilityRole="button" onPress={() => choose(cam)} style={{ flex: 1, aspectRatio: 1.2, borderRadius: R.lg, borderWidth: 1.5, borderStyle: 'dashed', borderColor: C.s3, alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <Icon name={i} size={26} color={C.yellow} />
                <Txt s={13} w={7}>
                  {l}
                </Txt>
              </Pressable>
            ))}
          </View>
        )}
        <Field label="Caption">
          <Input multiline value={text} onChangeText={setText} maxLength={300} placeholder={w ? 'e.g. Fixed a leaking kitchen faucet today — 40 minutes, no mess.' : 'e.g. We’re hiring 3 sales reps — apply on bolo!'} />
        </Field>
        <View>
          <Label>Tags</Label>
          <Chips>
            {TAGS.map((t) => (
              <Chip key={t} small label={t} on={tags.includes(t)} onPress={() => setTags(tags.includes(t) ? tags.filter((x) => x !== t) : [...tags, t])} />
            ))}
          </Chips>
        </View>
        {w && svc.length ? (
          <Field label="Link one of your services">
            <SelectBox icon="tools" value={link} onPress={() => pick('Service', ['None', ...svc.map((s) => s.skill)], link || 'None', (v) => setLink(v === 'None' ? '' : v))} />
          </Field>
        ) : null}
        <Btn
          variant="yellow"
          title="Post"
          disabled={!ok}
          onPress={() => {
            db.POSTS.unshift({
              id: uid('np'),
              by: w ? 'me' : 'me',
              kind: src ? 'photo' : 'text',
              src: src || undefined,
              text: text.trim() || (w ? `Another ${mySkill().toLowerCase()} job done ✅` : 'Update'),
              tags,
              job: link || undefined,
              time: 'Just now',
              likes: 0,
              comments: 0,
              as: w ? 'regular' : 'business',
              biz: w ? null : db.BIZ.active,
            });
            ui.feedView = 'all';
            bump();
            toast('Posted to the feed');
            resetTo('/feed');
          }}
        />
        {!ok ? (
          <Txt s={12} c={C.muted} center>
            Add a photo or write a caption to post.
          </Txt>
        ) : null}
      </View>
    </Page>
  );
}
