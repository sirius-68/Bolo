import React, { useState } from 'react';
import { Linking, Pressable, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Btn, Field, Input, Page, Seg, SelectBox, TopBar, Txt, tap } from '../src/ui/kit';
import { Icon } from '../src/ui/Icon';
import { C, S } from '../src/ui/theme';
import { confirm, pick } from '../src/ui/overlay';
import { db } from '../src/data/db';
import { COURSE_CATS } from '../src/data/catalog';
import { useLive } from '../src/logic/live';
import { WEB_TEACH, blankListing, domainOf, formOf, listingErrors, normUrl, openCourseSite, removeListing, saveListing } from '../src/logic/listings';

/** Quick setup for a course listing: the link to your course page and the basics.
    People open your site from bolo and sign up there. The web version has the full toolkit. */
export default function ListCourse() {
  useLive();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const existing = id ? db.COURSES.find((c) => c.id === id && c.mine) : undefined;
  const [f, setF] = useState(() => (existing ? formOf(existing) : blankListing()));
  const [tried, setTried] = useState(false);
  const set = (k: keyof typeof f, v: any) => setF({ ...f, [k]: v });
  const errs = listingErrors(f);
  const ok = !Object.keys(errs).length;
  const err = (k: keyof typeof f) => (tried ? errs[k] : undefined);
  const url = normUrl(f.url);
  const publish = () => {
    tap();
    setTried(true);
    if (!ok) return;
    saveListing(f, existing?.id);
    router.back();
  };
  return (
    <Page header={<TopBar title={existing ? 'Edit listing' : 'List your course'} />} keyboard bottom={28}>
      {existing ? (
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 14 }}>
          {(
            [
              [String(existing.views || 0), 'Site visits from bolo'],
              [String(db.savedCourses.includes(existing.id) ? 1 : 0), 'Saves'],
            ] as [string, string][]
          ).map(([v, l]) => (
            <View key={l} style={{ flex: 1, padding: 12, borderRadius: 18, backgroundColor: C.s1, borderWidth: 1, borderColor: C.line }}>
              <Txt s={18} w={8}>
                {v}
              </Txt>
              <Txt s={11} c={C.muted}>
                {l}
              </Txt>
            </View>
          ))}
        </View>
      ) : null}

      <View style={{ gap: 14, marginTop: 18 }}>
        <Field label="Link to the course page" error={err('url')} hint={url ? `People will open ${domainOf(url)}` : 'Your website, school page or the page where people sign up'}>
          <Input testID="lc-url" value={f.url} onChangeText={(v) => set('url', v)} placeholder="e.g. myschool.com/excel-course" icon="globe" keyboardType="url" autoCapitalize="none" invalid={!!err('url')} />
        </Field>
        <Field label="Course title" error={err('title')}>
          <Input testID="lc-title" value={f.title} onChangeText={(v) => set('title', v)} placeholder="e.g. Excel for small businesses" maxLength={70} invalid={!!err('title')} />
        </Field>
        <Field label="Who runs it" error={err('by')}>
          <Input testID="lc-by" value={f.by} onChangeText={(v) => set('by', v)} placeholder="Your name or your school" maxLength={50} invalid={!!err('by')} />
        </Field>
        <Field label="Field" error={err('cat')}>
          <SelectBox testID="lc-cat" value={f.cat} placeholder="Choose a field" invalid={!!err('cat')} onPress={() => pick('Field', COURSE_CATS.map(([c]) => c), f.cat, (v) => set('cat', v))} />
        </Field>
        <Field label="Level">
          <Seg
            items={[
              ['Beginner', 'From zero'],
              ['Advanced', 'Some experience'],
            ]}
            value={f.lv as 'Beginner' | 'Advanced'}
            onChange={(v) => set('lv', v)}
          />
        </Field>
        <Field label="Where">
          <Seg
            items={[
              ['Online', 'Online'],
              ['Offline', 'In person'],
            ]}
            value={f.fmt}
            onChange={(v) => setF({ ...f, fmt: v })}
          />
        </Field>
        {f.fmt === 'Offline' ? (
          <Field label="Town" error={err('reg')}>
            <Input value={f.reg} onChangeText={(v) => set('reg', v)} placeholder="e.g. Buea" maxLength={40} invalid={!!err('reg')} />
          </Field>
        ) : null}
        <Field label="Length">
          <Input value={f.dur} onChangeText={(v) => set('dur', v)} placeholder="e.g. 6 weeks · self-paced if empty" maxLength={30} />
        </Field>
        <Field label="Price" error={err('price')}>
          <Seg
            items={[
              ['paid', 'Paid'],
              ['free', 'Free'],
            ]}
            value={f.free ? 'free' : 'paid'}
            onChange={(v) => setF({ ...f, free: v === 'free' })}
          />
          {!f.free ? <Input testID="lc-price" value={f.price} onChangeText={(v) => set('price', v.replace(/[^\d]/g, ''))} placeholder="Price on your site" prefix="XAF" keyboardType="number-pad" maxLength={8} invalid={!!err('price')} style={{ marginTop: 8 }} /> : null}
        </Field>
        <Field label="Short description" hint="What people will be able to do after it. Optional">
          <Input value={f.desc} onChangeText={(v) => set('desc', v)} placeholder="e.g. Build budgets, invoices and stock sheets in Excel" multiline maxLength={240} />
        </Field>
      </View>

      <Txt s={12} c={C.faint} style={{ marginTop: 14 }}>
        People sign up and pay on your site. Listings with broken or misleading links are removed.
      </Txt>
      <Btn testID="lc-publish" variant="yellow" icon="check" title={existing ? 'Save changes' : 'Publish listing'} style={{ marginTop: 14 }} onPress={publish} />
      {existing ? (
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
          <Btn variant="dark" icon="globe" title="Open my page" style={{ flex: 1 }} onPress={() => openCourseSite(existing)} />
          <Btn
            variant="ghost"
            icon="trash"
            title="Remove"
            style={{ flex: 1 }}
            onPress={() => confirm({ title: 'Remove this listing?', text: 'It disappears from Courses for everyone. Your website isn’t affected.', ok: 'Remove', danger: true, icon: 'trash', onOk: () => (removeListing(existing.id), router.back()) })}
          />
        </View>
      ) : null}
    </Page>
  );
}
