import { createPost } from '../logic/work';
import React, { useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { db, ui } from '../data/db';
import { Btn, Chip, Chips, Label } from '../ui/kit';
import { sheet, SheetTitle, toast } from '../ui/overlay';
import { C } from '../ui/theme';
import { isW, mySkill, myCity } from '../logic/core';
import { bump } from '../logic/live';
import { resetTo } from '../logic/nav';
import { openOppForm, openMentorForm } from './career';
import { openService } from './profile';


/** The actions the floating + offers, ordered by what this person came for. */
export type CreateAction = { k: string; icon: string; bg: string; fg?: string; label: string; run: () => void };
export function createActions(): CreateAction[] {
  if (isW()) {
    const need: CreateAction = { k: 'need', icon: 'job', bg: C.yellow, label: 'I need something done', run: () => router.push('/post-job') };
    const offer: CreateAction = { k: 'offer', icon: 'wrench', bg: C.mint, label: 'Offer a service', run: () => openService() };
    return [
      ...(db.user.intents.includes('find') ? [offer, need] : [need, offer]),
      { k: 'work', icon: 'post', bg: C.orange, label: 'Share your work', run: () => router.push('/new-post') },
      { k: 'avail', icon: 'clock', bg: C.lav, label: 'Set availability', run: () => openAvailability() },
      { k: 'teach', icon: 'cap', bg: '#fff', label: 'List a course', run: () => router.push('/teach' as any) },
      { k: 'mentor', icon: 'follow', bg: C.pink, label: 'Offer a mentorship', run: () => openMentorForm() },
    ];
  }
  return [
    { k: 'vacancy', icon: 'job', bg: C.yellow, label: 'Post a vacancy', run: () => router.push('/post-job') },
    { k: 'intern', icon: 'cap', bg: C.lav, label: 'Create an internship', run: () => openOppForm('Internship') },
    { k: 'program', icon: 'sparkle', bg: C.orange, label: 'Create a program', run: () => openOppForm('Training program') },
    { k: 'course', icon: 'file', bg: C.mint, label: 'List a course', run: () => openOppForm('Course') },
    { k: 'mentor', icon: 'follow', bg: C.pink, label: 'Offer a mentorship', run: () => openMentorForm() },
    { k: 'update', icon: 'post', bg: '#fff', label: 'Company update', run: () => router.push('/new-post') },
  ];
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
      <SheetTitle sub="Your free slots show in the feed. People nearby can book one in a tap. You confirm in chat.">Set availability</SheetTitle>
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
          createPost({ kind: 'avail', text: `Available ${day.toLowerCase()} for ${mySkill() ? mySkill().toLowerCase() + ' ' : ''}jobs around ${myCity()}. Book a slot below.`, slots });
          ui.feedView = 'all';
          bump();
          sheet.close();
          toast('People near you can now book your free slots');
          resetTo('/find');
        }}
      />
    </View>
  );
}
