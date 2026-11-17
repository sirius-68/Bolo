import React, { useState } from 'react';
import { View } from 'react-native';
import { ui } from '../data/db';
import { CATS, COURSE_CATS } from '../data/catalog';
import { Btn, Chip, Chips, Label, Note, SelectBox, SwitchRow, Txt } from '../ui/kit';
import { C } from '../ui/theme';
import { openCities } from './account';
import { pick, sheet, SheetTitle, toast } from '../ui/overlay';
import { cityLabel, fCount, filterOrigin, Filters } from '../logic/core';
import { bump } from '../logic/live';

const EMPTY: Filters = { dist: 0, rate: 0, ver: false, urgent: false, budget: 0, sort: 'best', type: '', posted: 0, by: '', exp: 0, city: '', cityAt: null };

/** Filters for jobs or people lists. Changes apply when the person taps “Show results”. */
export function openFilters(mode: 'jobs' | 'people') {
  // the choices being made (applied on “Show results”) and what redraws the sheet when the buttons below change them
  const st: Draft = { t: { ...EMPTY, ...ui.F }, cat: ui.cat, redraw: () => {} };
  // Reset and Show results stay at the bottom of the sheet, in view however long the list of filters is
  sheet.show(() => <FilterSheet mode={mode} st={st} />, { footer: () => <FilterFoot st={st} /> });
}
type Draft = { t: Filters; cat: string | null; redraw: () => void };
function FilterFoot({ st }: { st: Draft }) {
  return (
    <View style={{ flexDirection: 'row', gap: 10 }}>
      <Btn
        testID="flt-reset"
        variant="ghost"
        title="Reset"
        style={{ flex: 1 }}
        onPress={() => {
          Object.assign(st.t, EMPTY);
          st.cat = null;
          st.redraw();
        }}
      />
      <Btn
        variant="yellow"
        title="Show results"
        style={{ flex: 2 }}
        testID="flt-apply"
        onPress={() => {
          ui.F = { ...st.t };
          ui.cat = st.cat;
          bump();
          sheet.close();
          const n = fCount() + (st.cat ? 1 : 0);
          toast(n ? `${n} filter${n > 1 ? 's' : ''} applied` : 'Showing everything');
        }}
      />
    </View>
  );
}
/** Same layout for jobs and people: Field and Distance first, the specific filters, then Sort. */
function FilterSheet({ mode, st }: { mode: 'jobs' | 'people'; st: Draft }) {
  const [, f] = useState(0);
  const re = () => f((x) => x + 1);
  st.redraw = re;
  const t = st.t;
  const cat = st.cat;
  const setCat = (c: string | null) => ((st.cat = c), re());
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
      <View>
        <Label>Location</Label>
        <SelectBox
          testID="flt-city"
          icon="pin"
          value={t.city}
          placeholder={cityLabel() ? `Around me (${cityLabel()})` : 'Anywhere'}
          onPress={() =>
            openCities((c, place) => {
              t.city = c;
              t.cityAt = place?.coord || null;
              re();
            }, t.city || cityLabel())
          }
        />
        {t.city ? (
          <Txt testID="flt-city-clear" s={12} w={7} c={C.lav} style={{ marginTop: 8 }} onPress={() => ((t.city = ''), (t.cityAt = null), re())}>
            Back to around me
          </Txt>
        ) : null}
      </View>
      {row('Distance', 'dist', [
        [0, 'Any'],
        [2, '2 km'],
        [5, '5 km'],
        [10, '10 km'],
        [25, '25 km'],
        [50, '50 km'],
      ])}
      {(t.dist || t.sort === 'near') && !filterOrigin(t) ? (
        <Note icon="pin">Distance needs to know where to measure from. Choose a city above, or set your own location on the home screen.</Note>
      ) : null}
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
  if (F.city) L.push([F.city, () => ((ui.F.city = ''), (ui.F.cityAt = null), bump())]);
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
  sheet.show(() => <CourseFilterSheet t={t} />);
}
function CourseFilterSheet({ t }: { t: CourseF }) {
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
}
