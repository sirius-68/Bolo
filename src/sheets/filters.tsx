import React, { useState } from 'react';
import { View } from 'react-native';
import { ui } from '../data/db';
import { COURSE_CATS } from '../data/catalog';
import { Btn, Chip, Chips, Label, SwitchRow } from '../ui/kit';
import { sheet, SheetTitle, toast } from '../ui/overlay';
import { fCount, Filters } from '../logic/core';
import { bump } from '../logic/live';

const EMPTY: Filters = { dist: 0, rate: 0, ver: false, urgent: false, budget: 0, sort: 'best', type: '' };

/** Filters for jobs or people lists. Changes apply when the person taps “Show results”. */
export function openFilters(mode: 'jobs' | 'people') {
  const t: Filters = { ...ui.F };
  sheet.show(() => <FilterSheet mode={mode} t={t} />, {
    footer: undefined,
  });
}
function FilterSheet({ mode, t }: { mode: 'jobs' | 'people'; t: Filters }) {
  const [, f] = useState(0);
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
            ]
          : [
              ['best', 'Best match'],
              ['near', 'Nearest'],
              ['rate', 'Top rated'],
            ],
      )}
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Btn variant="ghost" title="Reset" style={{ flex: 1 }} onPress={() => (Object.assign(t, EMPTY), re())} />
        <Btn
          variant="yellow"
          title="Show results"
          style={{ flex: 2 }}
          onPress={() => {
            ui.F = { ...t };
            bump();
            sheet.close();
            const n = fCount();
            toast(n ? `${n} filter${n > 1 ? 's' : ''} applied` : 'Showing everything');
          }}
        />
      </View>
    </View>
  );
}
export function resetFilters() {
  ui.F = { ...EMPTY };
  bump();
}

/** Course filters (Courses screen). */
export type CourseF = { cat: string; lv: string; price: string; fmt: string };
export const courseF: CourseF = { cat: '', lv: '', price: '', fmt: '' };
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
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Btn variant="ghost" title="Reset" style={{ flex: 1 }} onPress={() => (Object.assign(t, { cat: '', lv: '', price: '', fmt: '' }), re())} />
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
