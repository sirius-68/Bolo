import React, { useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { db, ui, uid } from '../data/db';
import { Btn, Chip, Chips, Label, OptRow, ProTag, Txt } from '../ui/kit';
import { afterSheet, sheet, SheetTitle, toast } from '../ui/overlay';
import { C } from '../ui/theme';
import { bizName, curBiz, isW, mySkill, myCity } from '../logic/core';
import { bump } from '../logic/live';
import { resetTo } from '../logic/nav';
import { openOppForm, openMentorForm } from './career';
import { bizOnlyPrompt } from './account';
import { openService } from './profile';

/** The yellow “+” button. Regular and Business get different options. */
const need = (
  <OptRow key="need" testID="cr-job" icon="job" title="I need something done" sub="Post a job — a repair, a tailor, a tutor. People nearby send offers." onPress={() => afterSheet(() => router.push('/post-job'))} />
);
const offer = (
  <OptRow key="offer" testID="cr-service" icon="wrench" bg={C.mint} title="Offer a service" sub="List what you do with a price — people near you can book it" onPress={() => afterSheet(() => openService())} />
);

export function openCreate() {
  sheet.show(() => <CreateSheet />);
}
function CreateSheet() {
  const w = isW();
  const go = (fn: () => void) => afterSheet(fn);
  if (w)
    return (
      <View>
        <SheetTitle sub="What would you like to do?">Create</SheetTitle>
        {db.user.intents.includes("find") ? [offer, need] : [need, offer]}
        <OptRow icon="post" bg={C.orange} title="Share your work" sub="Photos of a job you’re proud of" onPress={() => go(() => router.push('/new-post'))} />
        <OptRow icon="clock" bg={C.lav} title="Set availability" sub="Let people book your free slots today" onPress={() => go(openAvailability)} />
        <OptRow icon="follow" bg={C.mint} title="Offer a mentorship" sub="Share what you know — free or paid" onPress={() => go(openMentorForm)} />
        <OptRow
          icon="cap"
          bg="#fff"
          title={
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Txt s={14} w={7}>
                Internship, program or course
              </Txt>
              <ProTag small text="BUSINESS" />
            </View>
          }
          sub="Only business pages can create these"
          onPress={() => go(() => bizOnlyPrompt('create internships, programs and courses'))}
        />
      </View>
    );
  return (
    <View>
      <SheetTitle sub="Everything you create shows with your company name and logo.">Create for {bizName(curBiz())}</SheetTitle>
      <OptRow icon="job" title="Post a vacancy" sub="Full-time, part-time or contract roles under your company" onPress={() => go(() => router.push('/post-job'))} />
      <OptRow icon="cap" bg={C.lav} title="Create an internship" sub="Train young talent — it shows in Career" onPress={() => go(() => openOppForm('Internship'))} />
      <OptRow icon="sparkle" bg={C.orange} title="Create a program" sub="Apprenticeship, graduate program or training people can join" onPress={() => go(() => openOppForm('Training program'))} />
      <OptRow icon="file" bg={C.mint} title="Create a course" sub="Teach a skill — free or paid, online or in person" onPress={() => go(() => openOppForm('Course'))} />
      <OptRow icon="follow" bg={C.pink} title="Offer a mentorship" sub="Group mentoring led by your company" onPress={() => go(openMentorForm)} />
      <OptRow icon="post" bg="#fff" title="Post a company update" sub="News, photos, events" onPress={() => go(() => router.push('/new-post'))} />
    </View>
  );
}

const SLOTS = ['Now', '9:00 am', '11:00 am', '2:00 pm', '5:00 pm', '7:00 pm'];
export function openAvailability() {
  sheet.show(() => <Availability />);
}
function Availability() {
  const [sel, setSel] = useState<string[]>(['Now', '2:00 pm', '5:00 pm']);
  const [day, setDay] = useState('Today');
  return (
    <View style={{ gap: 14 }}>
      <SheetTitle sub="Your free slots show in the feed. People nearby can book one in a tap — you confirm in chat.">Set availability</SheetTitle>
      <View>
        <Label>When</Label>
        <Chips>
          {['Today', 'Tomorrow'].map((d) => (
            <Chip key={d} label={d} on={day === d} onPress={() => setDay(d)} />
          ))}
        </Chips>
      </View>
      <View>
        <Label>Free slots</Label>
        <Chips>
          {SLOTS.filter((s) => day === 'Today' || s !== 'Now').map((s) => (
            <Chip key={s} small label={s} on={sel.includes(s)} onPress={() => setSel(sel.includes(s) ? sel.filter((x) => x !== s) : [...sel, s])} />
          ))}
        </Chips>
      </View>
      <Btn
        variant="yellow"
        title="Share my availability"
        disabled={!sel.length}
        onPress={() => {
          const slots = SLOTS.filter((s) => sel.includes(s) && (day === 'Today' || s !== 'Now'));
          db.POSTS.unshift({ id: uid('a'), by: 'me', kind: 'avail', text: `Available ${day.toLowerCase()} for ${mySkill().toLowerCase()} jobs around ${myCity()}. Book a slot below.`, slots, time: 'Just now', likes: 0, comments: 0 });
          ui.feedView = 'all';
          bump();
          sheet.close();
          toast('People near you can now book your free slots');
          resetTo('/feed');
        }}
      />
    </View>
  );
}
