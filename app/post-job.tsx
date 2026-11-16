import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { db } from '../src/data/db';
import { CATS, PJ_AREAS, detectCat, catIcon } from '../src/data/catalog';
import { Btn, Check, Chip, Chips, Field, Fine, Input, Label, OptRow, Page, Pict, SelectBox, Stepper, Sub, SwitchRow, Title, TopBar, Txt } from '../src/ui/kit';
import { Icon } from '../src/ui/Icon';
import { pick, toast } from '../src/ui/overlay';
import { C, R, S } from '../src/ui/theme';
import { bizName, cityLabel, curBiz, digits, isW, postById } from '../src/logic/core';
import { postJob, updateJob } from '../src/logic/work';
import { MAX_PHOTO_MB, pickImages, takePhoto } from '../src/logic/media';
import { afterSheet, sheet, SheetTitle } from '../src/ui/overlay';
import { later } from '../src/logic/live';
import { back, resetTo } from '../src/logic/nav';
import { openJob } from '../src/sheets/work';
import { openCities } from '../src/sheets/account';

const TIMES = ['07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00'];

export default function PostJob() {
  // edit=<job id>: change a job or vacancy that is already posted
  const { edit } = useLocalSearchParams<{ edit?: string }>();
  const old = edit ? postById(edit) : undefined;
  const editing = !!old && !!old.mine;
  const w = editing ? old!.as !== 'business' : isW();
  const [title, setTitle] = useState(old?.title || '');
  const [text, setText] = useState(old?.text && old.text !== old.title ? old.text : '');
  const [cat, setCat] = useState<string | null>(old?.cat || null);
  const [photos, setPhotos] = useState<string[]>(old?.photos ? [...old.photos] : []);
  const [budget, setBudget] = useState(old ? digits(String(old.budget || '').split('/')[0]) : '');
  const [neg, setNeg] = useState(/negotiable/i.test(old?.budget || ''));
  const [type, setType] = useState(old?.type || (w ? 'One-off' : 'Full-time'));
  const [openings, setOpenings] = useState(old?.openings || 1);
  // an edited job keeps its date unless another one is picked
  const KEEP = old?.when ? `Keep: ${old.when}` : '';
  const [when, setWhen] = useState(KEEP || (w ? 'Today' : 'Flexible'));
  const [time, setTime] = useState('09:00');
  const [area, setArea] = useState(old ? old.area || '' : db.PR.area.home || cityLabel());
  // set when another city is chosen for the job (undefined = where I am, null = nowhere: remote)
  const [at, setAt] = useState<[number, number] | null | undefined>(undefined);
  const [urgent, setUrgent] = useState(!!old?.urgent);
  const [tried, setTried] = useState(false);
  const auto = detectCat(title + ' ' + text);
  const finalCat = cat || auto;
  const b = digits(budget);
  const types = w ? ['One-off', 'Part-time', 'Full-time', 'Remote'] : ['Full-time', 'Part-time', 'Contract', 'Internship', 'Remote'];
  const whens = [...(KEEP ? [KEEP] : []), ...(w ? ['Today', 'Tomorrow', 'This week', 'Flexible'] : ['As soon as possible', 'Next month', 'Flexible'])];
  const ok = title.trim().length >= 3;
  const submit = () => {
    setTried(true);
    if (!ok) return;
    const form = { title, text, cat: finalCat || 'Other', budget: b, neg, type, openings, when, time, area, urgent, photos, at };
    if (editing) {
      updateJob(old!.id, form, when === KEEP);
      toast(w ? 'Job updated' : 'Vacancy updated');
      return back();
    }
    const job = postJob(form);
    toast(w ? 'Job posted. People nearby will send offers' : `Vacancy published for ${bizName(curBiz())}`);
    if (w) back();
    else resetTo('/home');
    later(450, () => openJob(job.id));
  };
  // the full list, searchable; a job that fits none of them can use its own word
  const allCats = () =>
    pick('Category', CATS.map(([c]) => c), finalCat || undefined, (v) => setCat(v), {
      search: true,
      hint: 'No category with that name.',
      other: (typed) => setCat(typed.charAt(0).toUpperCase() + typed.slice(1, 40)),
      otherLabel: (typed) => `Use “${typed}” as the category`,
    });
  const shown = [...new Set([finalCat, ...CATS.map(([c]) => c)].filter(Boolean) as string[])].slice(0, 9);
  return (
    <Page keyboard header={<TopBar title={editing ? (w ? 'Edit job' : 'Edit vacancy') : w ? 'Post a job' : 'Post a vacancy'} />}>
      <Title sm>{w ? 'What do you need help with?' : `Who are you hiring at ${bizName(curBiz())}?`}</Title>
      <Sub>{w ? 'Any personal job: a quick fix, a tutor, a driver. People near you send offers; you choose.' : 'Your vacancy shows with your company name and logo. Applicants land in your dashboard.'}</Sub>
      <View style={{ gap: 18, marginTop: 20 }}>
        <Field label="Job title" error={tried && !ok && 'Give your job a short title (3+ letters)'}>
          <Input icon="job" value={title} onChangeText={setTitle} maxLength={120} placeholder={w ? 'e.g. Kitchen sink is leaking' : 'e.g. Sales representative'} invalid={tried && !ok} testID="pj-title" />
        </Field>
        <Field label="Details">
          {/* no length limit: a pasted job description keeps its line breaks, blank lines and lists exactly as they are */}
          <Input testID="pj-text" multiline minHeight={150} maxHeight={360} value={text} onChangeText={setText} placeholder={w ? 'What’s wrong, how big is the job, anything people should bring…' : 'Responsibilities, requirements, benefits… Paste a full description if you have one.'} />
        </Field>
        <View>
          <Label>Category · optional</Label>
          {!cat && auto ? (
            <View style={[S.row, { gap: 6, marginBottom: 8 }]}>
              <Icon name="sparkle" size={14} color={C.lav} />
              <Txt s={12} c={C.lav}>
                Looks like <Txt s={12} w={8} c={C.lav}>{auto}</Txt>. Tap another to change
              </Txt>
            </View>
          ) : null}
          <Chips scroll>
            {shown.map((c) => (
              <Chip key={c} small icon={catIcon(c)} label={c} on={finalCat === c} onPress={() => setCat(cat === c ? null : c)} />
            ))}
            <Chip small icon="search" label="All categories" onPress={allCats} />
          </Chips>
          {!finalCat ? (
            <Txt s={12} c={C.muted} style={{ marginTop: 8 }}>
              No category chosen. It will be listed under “Other”, or tap All categories to search.
            </Txt>
          ) : null}
        </View>
        <View>
          <Label>Photos · optional, up to 3</Label>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            {photos.map((p, i) => (
              <View key={p}>
                <Pict pic={p} style={{ width: 84, height: 84, borderRadius: 14 }} />
                <Pressable accessibilityLabel="Remove photo" onPress={() => setPhotos(photos.filter((_, j) => j !== i))} style={{ position: 'absolute', top: 4, right: 4, width: 24, height: 24, borderRadius: 12, backgroundColor: 'rgba(0,0,0,.7)', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name="x" size={14} color="#fff" />
                </Pressable>
              </View>
            ))}
            {photos.length < 3 ? (
              <Pressable
                accessibilityLabel="Add photos"
                testID="pj-add-photo"
                onPress={() => addPhotos(3 - photos.length, (L) => setPhotos((cur) => [...cur, ...L].slice(0, 3)))}
                style={{ width: 84, height: 84, borderRadius: 14, borderWidth: 1.5, borderStyle: 'dashed', borderColor: C.s3, alignItems: 'center', justifyContent: 'center' }}
              >
                <Icon name="camera" size={22} color={C.muted} />
                <Txt s={10} c={C.muted} style={{ marginTop: 4 }}>
                  Add
                </Txt>
              </Pressable>
            ) : null}
          </View>
        </View>
        <Field label={w ? 'Budget' : 'Salary or pay (per month)'}>
          <Input prefix="XAF" keyboardType="number-pad" value={b ? (+b).toLocaleString('en-US') : ''} onChangeText={(v) => setBudget(digits(v))} placeholder={w ? 'e.g. 15,000' : 'e.g. 120,000'} />
          <View style={{ marginTop: 10 }}>
            <Check on={neg} onPress={() => setNeg(!neg)}>
              {w ? 'I’m open to offers (negotiable)' : 'Negotiable'}
            </Check>
          </View>
        </Field>
        <View>
          <Label>Job type</Label>
          <Chips>
            {types.map((t) => (
              <Chip key={t} label={t} on={type === t} onPress={() => setType(t)} />
            ))}
          </Chips>
        </View>
        {!w ? (
          <View>
            <Label>Openings</Label>
            <Stepper testID="pj-openings" label="Openings" value={openings} min={1} max={50} unit={(n) => `${n} opening${n > 1 ? 's' : ''}`} onChange={setOpenings} />
          </View>
        ) : null}
        <View>
          <Label>{w ? 'When' : 'Start'}</Label>
          <Chips>
            {whens.map((t) => (
              <Chip key={t} label={t} on={when === t} onPress={() => setWhen(t)} />
            ))}
          </Chips>
          {w && when !== 'Flexible' ? (
            <View style={{ marginTop: 10 }}>
              <SelectBox icon="clock" value={time} onPress={() => pick('Time', TIMES, time, setTime)} />
            </View>
          ) : null}
        </View>
        <Field label="Where">
          <Input testID="pj-where" icon="pin" value={area} onChangeText={setArea} placeholder="Neighbourhood, street or landmark" autoCapitalize="words" />
        </Field>
        <Chips>
          {[cityLabel(), 'Remote / online'].filter(Boolean).map((c) => (
            <Chip key={c} small label={c} on={area === c} onPress={() => (setArea(c), setAt(c === cityLabel() ? db.user.coord || undefined : null))} />
          ))}
          <Chip
            testID="pj-city"
            small
            icon="search"
            label="Another city"
            onPress={() =>
              openCities((c, place) => {
                setArea(c);
                setAt(place?.coord || null);
              }, area)
            }
          />
        </Chips>
        {w ? <SwitchRow title="Urgent" sub="Show it first to people nearby" value={urgent} onChange={setUrgent} /> : null}
        <Btn variant="yellow" title={editing ? 'Save changes' : w ? 'Post job' : 'Publish vacancy'} onPress={submit} testID="pj-submit" />
        <Fine style={{ marginTop: -6 }}>{w ? 'People see your phone number only after you hire them.' : 'Applicants can message you through bolo; your phone stays private.'}</Fine>
      </View>
    </Page>
  );
}
export { R };

/** Add photos: take one with the camera (preview, then use or retake) or choose from the gallery. */
function addPhotos(room: number, add: (L: string[]) => void) {
  sheet.show(() => (
    <View style={{ gap: 6 }}>
      <SheetTitle sub={`Up to ${room} more · JPG, PNG, WebP or HEIC · max ${MAX_PHOTO_MB} MB each`}>Add photos</SheetTitle>
      <OptRow testID="ph-camera" icon="camera" bg={C.yellow} title="Take a photo" sub="Use your camera now" onPress={() => afterSheet(() => shoot(add))} />
      <OptRow testID="ph-gallery" icon="image" bg={C.lav} title="Choose from gallery" sub="Pick photos you already have" onPress={() => afterSheet(async () => { const L = await pickImages(room); if (L.length) add(L); })} />
    </View>
  ));
}
async function shoot(add: (L: string[]) => void) {
  const p = await takePhoto();
  if (!p) return;
  sheet.show(() => (
    <View style={{ gap: 12 }}>
      <SheetTitle>Use this photo?</SheetTitle>
      <Pict pic={p} style={{ width: '100%', aspectRatio: 1, borderRadius: 18 }} />
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Btn variant="dark" icon="camera" title="Retake" style={{ flex: 1 }} onPress={() => afterSheet(() => shoot(add))} />
        <Btn testID="ph-use" variant="yellow" icon="check" title="Use photo" style={{ flex: 1 }} onPress={() => (add([p]), sheet.close())} />
      </View>
    </View>
  ));
}
