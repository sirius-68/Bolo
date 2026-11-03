import React, { useState } from 'react';
import { View } from 'react-native';
import { ui } from '../data/db';
import { CATS, COURSE_CATS } from '../data/catalog';
import { Btn, Chip, Chips, Label, SelectBox, SwitchRow } from '../ui/kit';
import { pick, sheet, SheetTitle, toast } from '../ui/overlay';
import { fCount, Filters } from '../logic/core';
import { bump } from '../logic/live';

const EMPTY: Filters = { dist: 0, rate: 0, ver: false, urgent: false, budget: 0, sort: 'best', type: '', posted: 0, by: '', exp: 0 };

/** Filters for jobs or people lists. Changes apply when the person taps “Show results”. */
export function openFilters(mode: 'jobs' | 'people') {
  const t: Filters = { ...EMPTY, ...ui.F };
  sheet.show(() => <FilterSheet mode={mode} t={t} />, {
    footer: undefined,
  });
}
/** Same layout for jobs and people: Field and Distance first, the specific filters, then Sort. */
function FilterSheet({ mode, t }: { mode: 'jobs' | 'people'; t: Filters }) {
  const [, f] = useState(0);
  const [cat, setCat] = useState<string | null>(ui.cat);
  const re = () => f((x) => x + 1);
  const row = <K extends keyof Filters>(label: string, k: K, opts: [Filters[K], string][]) => (
    <View>
      <Label>{label}</Label>
      <Chips>
        {opts.map(([v, l]) => (
          <Chip key={String(v)} small label={l} on={t[k] === v} onPress={() => ((t[k] = v), re())} />
        ))}
      </Chips>
    </View>
  );
  const jobs = mode === 'jobs';
  return (
    <View style={{ gap: 16 }}>
      <SheetTitle>{jobs ? 'Filter jobs' : 'Filter people'}</SheetTitle>
      <View>
        <Label>Field</Label>
        <SelectBox testID="flt-field" icon="squares" value={cat || ''} placeholder="Any field" onPress={() => pick('Field', ['Any field', ...CATS.map((c) => c[0])], cat || 'Any field', (v) => setCat(v === 'Any field' ? null : v))} />
      </View>
      {row('Distance', 'dist', [
        [0, 'Any'],
        [1, '1 km'],
        [2, '2 km'],
        [3, '3 km'],
        [5, '5 km'],
      ])}
      {jobs ? (
        <>
          {row('Job type', 'type', [
            ['', 'Any'],
            ['One-off', 'Gigs'],
            ['Part-time', 'Part-time'],
            ['Full-time', 'Full-time'],
            ['Remote', 'Remote'],
            ['Contract', 'Contract'],
          ])}
          {row('Posted', 'posted', [
            [0, 'Any time'],
            [1, 'Today'],
            [3, 'Last 3 days'],
            [7, 'This week'],
          ])}
          {row('Posted by', 'by', [
            ['', 'Anyone'],
            ['company', 'Companies'],
            ['person', 'Individuals'],
          ])}
          {row('Minimum budget', 'budget', [
            [0, 'Any'],
            [5000, 'XAF 5k+'],
            [10000, 'XAF 10k+'],
            [20000, 'XAF 20k+'],
          ])}
          <SwitchRow title="Urgent jobs only" sub="People who need someone today" value={t.urgent} onChange={(v) => ((t.urgent = v), re())} />
        </>
      ) : (
        <>
          {row('Rating', 'rate', [
            [0, 'Any'],
            [4.5, '4.5+'],
            [4.7, '4.7+'],
            [4.8, '4.8+'],
          ])}
          {row('Experience', 'exp', [
            [0, 'Any'],
            [1, '1+ years'],
            [3, '3+ years'],
            [5, '5+ years'],
          ])}
          <SwitchRow title="Verified only" sub="ID and skills checked by bolo" value={t.ver} onChange={(v) => ((t.ver = v), re())} />
        </>
      )}
      {row(
        'Sort by',
        'sort',
        jobs
          ? [
              ['best', 'Best match'],
              ['near', 'Nearest'],
              ['budget', 'Highest budget'],
              ['new', 'Newest'],
            ]
          : [
              ['best', 'Best match'],
              ['near', 'Nearest'],
              ['rate', 'Top rated'],
              ['exp', 'Most experienced'],
            ],
      )}
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Btn variant="ghost" title="Reset" style={{ flex: 1 }} onPress={() => (Object.assign(t, EMPTY), setCat(null), re())} />
        <Btn
          variant="yellow"
          title="Show results"
          style={{ flex: 2 }}
          testID="flt-apply"
          onPress={() => {
            ui.F = { ...t };
            ui.cat = cat;
            bump();
            sheet.close();
            const n = fCount() + (cat ? 1 : 0);
            toast(n ? `${n} filter${n > 1 ? 's' : ''} applied` : 'Showing everything');
          }}
        />
      </View>
    </View>
  );
}
export function resetFilters() {
  ui.F = { ...EMPTY };
  ui.cat = null;
  bump();
}
/** Labels of the active filters, each with a way to remove just that one. */
export function activeFilters(mode: 'jobs' | 'people'): [string, () => void][] {
  const F = ui.F;
  const off = (k: keyof Filters) => () => (((ui.F as any)[k] = (EMPTY as any)[k]), bump());
  const L: [string, () => void][] = [];
  if (ui.cat) L.push([ui.cat, () => ((ui.cat = null), bump())]);
  if (F.dist) L.push([`Within ${F.dist} km`, off('dist')]);
  if (mode === 'jobs') {
    if (F.type) L.push([F.type === 'One-off' ? 'Gigs' : F.type, off('type')]);
    if (F.posted) L.push([F.posted === 1 ? 'Posted today' : F.posted === 3 ? 'Last 3 days' : 'This week', off('posted')]);
    if (F.by) L.push([F.by === 'company' ? 'Companies' : 'Individuals', off('by')]);
    if (F.budget) L.push([`XAF ${F.budget / 1000}k+`, off('budget')]);
    if (F.urgent) L.push(['Urgent', off('urgent')]);
  } else {
    if (F.rate) L.push([`${F.rate}★+`, off('rate')]);
    if (F.exp) L.push([`${F.exp}+ years`, off('exp')]);
    if (F.ver) L.push(['Verified', off('ver')]);
  }
  if (F.sort !== 'best') L.push([`Sort: ${({ near: 'Nearest', budget: 'Highest budget', new: 'Newest', rate: 'Top rated', exp: 'Most experienced' } as Record<string, string>)[F.sort] || F.sort}`, off('sort')]);
  return L;
}

/** Course filters (Courses screen). */
export type CourseF = { cat: string; lv: string; price: string; fmt: string; rate: string };
export const courseF: CourseF = { cat: '', lv: '', price: '', fmt: '', rate: '' };
export function openCourseFilters() {
  const t = { ...courseF };
  sheet.show(() => {
    const S = () => {
      const [, f] = useState(0);
      const re = () => f((x) => x + 1);
      const row = (label: string, k: keyof CourseF, opts: [string, string][]) => (
        <View>
          <Label>{label}</Label>
          <Chips>
            {opts.map(([v, l]) => (
              <Chip key={v || 'any'} small label={l} on={t[k] === v} onPress={() => ((t[k] = v), re())} />
            ))}
          </Chips>
        </View>
      );
      return (
        <View style={{ gap: 16 }}>
          <SheetTitle>Filter courses</SheetTitle>
          {row('Field', 'cat', [['', 'All'], ...COURSE_CATS.map(([c]) => [c, c] as [string, string])])}
          {row('Level', 'lv', [
            ['', 'Any'],
            ['Beginner', 'From zero'],
            ['Advanced', 'Advanced'],
          ])}
          {row('Price', 'price', [
            ['', 'Any'],
            ['free', 'Free'],
            ['paid', 'Paid'],
          ])}
          {row('Format', 'fmt', [
            ['', 'Any'],
            ['Online', 'Online'],
            ['Offline', 'In person'],
          ])}
          {row('Rating', 'rate', [
            ['', 'Any'],
            ['4', '4★ & up'],
            ['4.5', '4.5★ & up'],
          ])}
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Btn variant="ghost" title="Reset" style={{ flex: 1 }} onPress={() => (Object.assign(t, { cat: '', lv: '', price: '', fmt: '', rate: '' }), re())} />
            <Btn
              variant="yellow"
              title="Show courses"
              style={{ flex: 2 }}
              onPress={() => {
                Object.assign(courseF, t);
                bump();
                sheet.close();
              }}
            />
          </View>
        </View>
      );
    };
    return <S />;
  });
}
