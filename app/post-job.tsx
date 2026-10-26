import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { db } from '../src/data/db';
import { CATS, PJ_AREAS, detectCat, catIcon } from '../src/data/catalog';
import { Btn, Check, Chip, Chips, Field, Fine, Input, Label, Page, Pict, SelectBox, Stepper, Sub, SwitchRow, Title, TopBar, Txt } from '../src/ui/kit';
import { Icon } from '../src/ui/Icon';
import { pick, toast } from '../src/ui/overlay';
import { C, R, S } from '../src/ui/theme';
import { bizName, cityLabel, curBiz, digits, isW } from '../src/logic/core';
import { postJob } from '../src/logic/work';
import { pickImages } from '../src/logic/media';
import { later } from '../src/logic/live';
import { back, resetTo } from '../src/logic/nav';
import { openJob } from '../src/sheets/work';

const TIMES = ['07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00'];

export default function PostJob() {
  const w = isW();
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [cat, setCat] = useState<string | null>(null);
  const [photos, setPhotos] = useState<string[]>([]);
  const [budget, setBudget] = useState('');
  const [neg, setNeg] = useState(false);
  const [type, setType] = useState(w ? 'One-off' : 'Full-time');
  const [openings, setOpenings] = useState(1);
  const [when, setWhen] = useState(w ? 'Today' : 'Flexible');
  const [time, setTime] = useState('09:00');
  const [area, setArea] = useState(db.PR.area.home || cityLabel());
  const [urgent, setUrgent] = useState(false);
  const [tried, setTried] = useState(false);
  const auto = detectCat(title + ' ' + text);
  const finalCat = cat || auto;
  const b = digits(budget);
  const types = w ? ['One-off', 'Part-time', 'Full-time', 'Remote'] : ['Full-time', 'Part-time', 'Contract', 'Internship', 'Remote'];
  const whens = w ? ['Today', 'Tomorrow', 'This week', 'Flexible'] : ['As soon as possible', 'Next month', 'Flexible'];
  const ok = title.trim().length >= 3;
  const submit = () => {
    setTried(true);
    if (!ok) return;
    const job = postJob({ title, text, cat: finalCat || 'Handyman', budget: b, neg, type, openings, when, time, area, urgent, photos });
    toast(w ? 'Job posted — people nearby will send offers' : `Vacancy published for ${bizName(curBiz())}`);
    if (w) back();
    else resetTo('/home');
    later(450, () => openJob(job.id));
  };
  return (
    <Page keyboard header={<TopBar title={w ? 'Post a job' : 'Post a vacancy'} />}>
      <Title sm>{w ? 'What do you need help with?' : `Who are you hiring at ${bizName(curBiz())}?`}</Title>
      <Sub>{w ? 'Any personal job — a quick fix, a tutor, a driver. People near you send offers; you choose.' : 'Your vacancy shows with your company name and logo. Applicants land in your dashboard.'}</Sub>
      <View style={{ gap: 18, marginTop: 20 }}>
        <Field label="Job title" error={tried && !ok && 'Give your job a short title (3+ letters)'}>
          <Input icon="job" value={title} onChangeText={setTitle} maxLength={60} placeholder={w ? 'e.g. Kitchen sink is leaking' : 'e.g. Sales representative'} invalid={tried && !ok} testID="pj-title" />
        </Field>
        <Field label="Details">
          <Input multiline value={text} onChangeText={setText} maxLength={400} placeholder={w ? 'What’s wrong, how big is the job, anything people should bring…' : 'Responsibilities, requirements, benefits…'} />
        </Field>
        <View>
          <Label>Category · optional</Label>
          {!cat && auto ? (
            <View style={[S.row, { gap: 6, marginBottom: 8 }]}>
              <Icon name="sparkle" size={14} color={C.lav} />
              <Txt s={12} c={C.lav}>
                Looks like <Txt s={12} w={8} c={C.lav}>{auto}</Txt> — tap another to change
              </Txt>
            </View>
          ) : null}
          <Chips scroll>
            {CATS.map(([c]) => (
              <Chip key={c} small icon={catIcon(c)} label={c} on={finalCat === c} onPress={() => setCat(cat === c ? null : c)} />
            ))}
          </Chips>
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
                onPress={async () => {
                  const L = await pickImages(3 - photos.length);
                  if (L.length) setPhotos([...photos, ...L].slice(0, 3));
                }}
                style={{ width: 84, height: 84, borderRadius: 14, borderWidth: 1.5, borderStyle: 'dashed', borderColor: C.s3, alignItems: 'center', justifyContent: 'center' }}
              >
                <Icon name="camera" size={22} color={C.muted} />
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
            <Stepper text={`${openings} opening${openings > 1 ? 's' : ''}`} onMinus={() => setOpenings(Math.max(1, openings - 1))} onPlus={() => setOpenings(Math.min(50, openings + 1))} />
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
            <Chip key={c} small label={c} on={area === c} onPress={() => setArea(c)} />
          ))}
        </Chips>
        {w ? <SwitchRow title="Urgent" sub="Show it first to people nearby" value={urgent} onChange={setUrgent} /> : null}
        <Btn variant="yellow" title={w ? 'Post job' : 'Publish vacancy'} onPress={submit} testID="pj-submit" />
        <Fine style={{ marginTop: -6 }}>{w ? 'People see your phone number only after you hire them.' : 'Applicants can message you through bolo; your phone stays private.'}</Fine>
      </View>
    </Page>
  );
}
export { R };
