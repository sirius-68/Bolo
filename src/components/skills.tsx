import React, { useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { AREAMAP, AREAS, ALL_LANGS, CATIMG, EX, EXPLV, LANGP, POPULAR, PROF, SKILLS, SkillDef, detectCat, lvOf } from '../data/catalog';
import { db, SkillEntry } from '../data/db';
import { bump } from '../logic/live';
import { Btn, Chip, Chips, Field, Input, Label, SelectBox, Stepper, Txt, tap } from '../ui/kit';
import { Icon } from '../ui/Icon';
import { pick, sheet, SheetTitle, toast } from '../ui/overlay';
import { C, R, tx } from '../ui/theme';

/* ------------------------------------------------------------------ */
/* Draft state shared by the skills screen and the "add a skill" sheet */
/* ------------------------------------------------------------------ */
export type Draft = { main: SkillEntry | null; others: SkillEntry[]; level: string; years: number; langs: [string, string][]; edit: SkillEntry | null; editIndex: number };
export const SK: { d: Draft | null; mode: 'onboard' | 'edit' } = { d: null, mode: 'onboard' };
export function freshDraft(): Draft {
  return { main: null, others: [], level: db.user.level || 'Mid-level', years: db.user.years, langs: db.PR.langs.length ? db.PR.langs.map((x) => [...x] as [string, string]) : [['English', 'Fluent']], edit: null, editIndex: -1 };
}
export function draftFromUser(): Draft {
  const L = db.user.skillList || [];
  return { main: L[0] ? clone(L[0]) : null, others: L.slice(1).map(clone), level: db.user.level || lvOf(db.user.years), years: db.user.years, langs: db.PR.langs.map((x) => [...x] as [string, string]), edit: null, editIndex: -1 };
}
const clone = (e: SkillEntry): SkillEntry => JSON.parse(JSON.stringify(e));
export const entryOf = (s: SkillDef): SkillEntry => ({ si: s.i, n: s.n, a: s.a, c: s.c, x: {}, xo: {}, lv: 'Intermediate' });
export const skIcon = (e: SkillEntry) => (e.custom ? AREAMAP[e.a]?.i || 'sparkle' : (e.c && CATIMG[e.c]) || AREAMAP[e.a]?.i || 'job');
const skSpec = (e: SkillEntry) => (e.custom ? [] : SKILLS[e.si]?.x || []);
const skOpts = (e: SkillEntry, k: string) => [...EX[k].o, ...(e.xo[k] || [])];
export const skOK = (e: SkillEntry | null) => !!e && (!e.custom || (e.n.trim().length > 1 && !!e.a && (e.desc || '').trim().length >= 20));
export const skAll = (d: Draft) => [d.main, ...d.others].filter(Boolean) as SkillEntry[];
export function exSummary(e: SkillEntry) {
  if (e.custom) return e.desc ? e.desc.slice(0, 80) + (e.desc.length > 80 ? '…' : '') : '';
  return skSpec(e)
    .map((k) => {
      const v = e.x[k];
      if (!v) return '';
      if (typeof v === 'string') return v;
      return Array.isArray(v) ? v.join(', ') : Object.entries(v).map(([o, l]) => `${o} (${l})`).join(', ');
    })
    .filter(Boolean)
    .join(' · ');
}

/* ------------------------------------------------------------------ */
/* Searchable skill picker                                            */
/* ------------------------------------------------------------------ */
export function SkillCombo({ taken, onPick, placeholder, autoFocus }: { taken: string[]; onPick: (e: SkillEntry) => void; placeholder?: string; autoFocus?: boolean }) {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(!!autoFocus);
  const ql = q.trim().toLowerCase();
  const item = (s: SkillDef) => {
    const dis = taken.includes(s.n);
    return (
      <Pressable
        key={s.i}
        disabled={dis}
        onPress={() => {
          tap();
          onPick(entryOf(s));
          setQ('');
        }}
        style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, paddingHorizontal: 10, borderRadius: 12, backgroundColor: pressed ? C.s3 : 'transparent', opacity: dis ? 0.4 : 1 })}
      >
        <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: C.s3, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name={CATIMG[s.c] || AREAMAP[s.a].i} size={18} color={C.yellow} />
        </View>
        <View style={{ flex: 1 }}>
          <Txt s={14} w={7}>
            {s.n}
          </Txt>
          <Txt s={12} c={C.muted}>
            {s.a}
            {dis ? ' · already added' : ''}
          </Txt>
        </View>
      </Pressable>
    );
  };
  let groups: [string, SkillDef[]][] = [];
  if (!ql) {
    const sug = SKILLS.filter((s) => db.user.jobTypes.includes(s.a));
    if (sug.length) groups.push(['From the work you picked', sug.slice(0, 30)]);
    groups.push(['Popular on bolo', POPULAR.filter((s) => !db.user.jobTypes.includes(s.a))]);
  } else {
    const m = SKILLS.filter((s) => s.n.toLowerCase().includes(ql) || s.a.toLowerCase().includes(ql) || s.x.some((k) => EX[k].o.some((o) => o.toLowerCase().includes(ql)))).sort(
      (a, b) => +b.n.toLowerCase().startsWith(ql) - +a.n.toLowerCase().startsWith(ql) || +b.n.toLowerCase().includes(ql) - +a.n.toLowerCase().includes(ql),
    );
    const g: Record<string, SkillDef[]> = {};
    m.forEach((s) => (g[s.a] = g[s.a] || []).push(s));
    groups = Object.entries(g).slice(0, 8);
  }
  return (
    <View>
      <Input
        value={q}
        onChangeText={(v) => {
          setQ(v);
          setOpen(true);
        }}
        icon="search"
        placeholder={placeholder || 'Search skills: e.g. Plumbing, Python, Accounting'}
        autoFocus={autoFocus}
        autoCapitalize="none"
        right={
          !open ? (
            <Pressable onPress={() => setOpen(true)} hitSlop={8}>
              <Icon name="down" size={16} color={C.muted} />
            </Pressable>
          ) : null
        }
      />
      {open ? (
        <View style={{ marginTop: 8, borderRadius: R.md, backgroundColor: C.s2, padding: 6, maxHeight: 420 }}>
          {groups.map(([g, L]) => (
            <View key={g}>
              <Txt s={11} w={8} c={C.faint} style={{ marginTop: 8, marginBottom: 2, marginLeft: 10, letterSpacing: 0.6 }}>
                {g.toUpperCase()}
              </Txt>
              {L.map(item)}
            </View>
          ))}
          {ql && !groups.length ? (
            <Txt s={13} c={C.muted} style={{ padding: 10 }}>
              No skill called “{q.trim()}” yet.
            </Txt>
          ) : null}
          <Pressable
            onPress={() => {
              tap();
              onPick({ custom: 1, n: q.trim(), a: '', c: null, desc: '', x: {}, xo: {}, lv: 'Intermediate', si: -1 });
              setQ('');
            }}
            style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, paddingHorizontal: 10, borderRadius: 12, backgroundColor: pressed ? C.s3 : 'transparent', marginTop: 4, borderTopWidth: 1, borderTopColor: C.line })}
          >
            <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: C.yellow, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="plus" size={18} color="#000" />
            </View>
            <View style={{ flex: 1 }}>
              <Txt s={14} w={7}>
                {ql ? `Add “${q.trim()}”` : 'Other: not in the list'}
              </Txt>
              <Txt s={12} c={C.muted}>
                {ql ? 'Use it as your own skill and describe it' : 'Add your own skill and describe it'}
              </Txt>
            </View>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Follow-up questions a skill triggers                                */
/* ------------------------------------------------------------------ */
export function SkillQuestions({ e, onChange }: { e: SkillEntry; onChange: () => void }) {
  const [adds, setAdds] = useState<Record<string, string>>({});
  if (e.custom) {
    const n = (e.desc || '').trim().length;
    return (
      <View style={{ gap: 14 }}>
        <Field label="Skill name">
          <Input value={e.n} onChangeText={(v) => ((e.n = v), onChange())} placeholder="e.g. Drone piloting, Soap making" maxLength={50} />
        </Field>
        <Field label="Which field is it in?">
          <SelectBox
            value={e.a}
            placeholder="Choose a field"
            onPress={() =>
              pick('Field', AREAS.map((a) => a[0]), e.a, (v) => {
                e.a = v;
                e.c = AREAMAP[v]?.c || null;
                onChange();
              })
            }
          />
        </Field>
        <Field label="Describe your skill" hint={`${n < 20 ? 'At least 20 characters · ' : ''}${n}/300`}>
          <Input multiline value={e.desc || ''} onChangeText={(v) => ((e.desc = v), onChange())} maxLength={300} placeholder="What can you do? Tools you use, the kind of jobs you’ve done, any training." />
        </Field>
      </View>
    );
  }
  return (
    <View style={{ gap: 16 }}>
      {skSpec(e).map((k) => {
        const sp = EX[k];
        const opts = skOpts(e, k);
        if (sp.t === 's')
          return (
            <View key={k}>
              <Label>{sp.l}</Label>
              <Chips>
                {opts.map((o) => (
                  <Chip key={o} small label={o} on={e.x[k] === o} onPress={() => ((e.x[k] = e.x[k] === o ? null : o), onChange())} />
                ))}
              </Chips>
            </View>
          );
        const sel = e.x[k] || (sp.t === 'ml' ? {} : []);
        const has = (o: string) => (sp.t === 'ml' ? o in sel : sel.includes(o));
        const togg = (o: string) => {
          if (sp.t === 'ml') {
            const s = (e.x[k] = e.x[k] || {});
            if (o in s) delete s[o];
            else s[o] = sp.lv![1];
          } else {
            const s = (e.x[k] = e.x[k] || []);
            s.includes(o) ? s.splice(s.indexOf(o), 1) : s.push(o);
          }
          onChange();
        };
        const addOpt = () => {
          const v = (adds[k] || '').trim();
          if (!v) return;
          if (!opts.some((o) => o.toLowerCase() === v.toLowerCase())) (e.xo[k] = e.xo[k] || []).push(v);
          const o = skOpts(e, k).find((x) => x.toLowerCase() === v.toLowerCase())!;
          if (sp.t === 'ml') (e.x[k] = e.x[k] || {})[o] = e.x[k][o] || sp.lv![1];
          else {
            const s = (e.x[k] = e.x[k] || []);
            if (!s.includes(o)) s.push(o);
          }
          setAdds({ ...adds, [k]: '' });
          onChange();
        };
        return (
          <View key={k}>
            <Label>
              {sp.l}
              {sp.t === 'ml' ? ' · set your level for each' : ''}
            </Label>
            <Chips>
              {opts.map((o) => (
                <Chip key={o} small label={`${has(o) ? '✓ ' : ''}${o}`} on={has(o)} onPress={() => togg(o)} />
              ))}
            </Chips>
            {sp.t === 'ml' && Object.keys(sel).length ? (
              <View style={{ gap: 8, marginTop: 10 }}>
                {Object.keys(sel).map((o) => (
                  <View key={o} style={{ padding: 10, borderRadius: 12, backgroundColor: C.s1, gap: 8 }}>
                    <Txt s={13} w={7}>
                      {o}
                    </Txt>
                    <LevelSeg options={sp.lv!} value={sel[o]} onChange={(l) => ((sel[o] = l), onChange())} />
                  </View>
                ))}
              </View>
            ) : null}
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
              <TextInput
                value={adds[k] || ''}
                onChangeText={(v) => setAdds({ ...adds, [k]: v })}
                onSubmitEditing={addOpt}
                placeholder="Not listed? Add another"
                placeholderTextColor={C.faint}
                maxLength={30}
                style={[tx(14, 6), { flex: 1, height: 42, borderRadius: 12, backgroundColor: C.s1, paddingHorizontal: 12 }]}
              />
              <Pressable onPress={addOpt} style={{ height: 42, paddingHorizontal: 14, borderRadius: 12, backgroundColor: C.s3, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Icon name="plus" size={14} color="#fff" />
                <Txt s={13} w={7}>
                  Add
                </Txt>
              </Pressable>
            </View>
          </View>
        );
      })}
    </View>
  );
}

export function LevelSeg({ options, value, onChange }: { options: string[]; value: string; onChange: (v: string) => void }) {
  return (
    <View style={{ flexDirection: 'row', gap: 4, padding: 3, borderRadius: 10, backgroundColor: C.s2 }}>
      {options.map((l) => (
        <Pressable
          key={l}
          onPress={() => {
            tap();
            onChange(l);
          }}
          style={{ flex: 1, height: 30, borderRadius: 8, backgroundColor: value === l ? C.lav : 'transparent', alignItems: 'center', justifyContent: 'center' }}
        >
          <Txt s={11} w={7} c={value === l ? '#000' : C.muted} lines={1}>
            {l}
          </Txt>
        </Pressable>
      ))}
    </View>
  );
}

/** Experience level slider: five steps with a filled track. */
export function LevelSlider({ value, onChange }: { value: string; onChange: (i: number) => void }) {
  const i = Math.max(0, EXPLV.findIndex((x) => x[0] === value));
  return (
    <View style={{ padding: 16, borderRadius: R.md, backgroundColor: C.s2 }}>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <Txt s={18} w={8}>
          {EXPLV[i][0]}
        </Txt>
        <Txt s={13} w={6} c={C.muted}>
          {EXPLV[i][1]}
        </Txt>
      </View>
      <View style={{ height: 30, justifyContent: 'center', marginTop: 10 }}>
        <View style={{ height: 6, borderRadius: 3, backgroundColor: C.s3 }}>
          <View style={{ width: `${(i / (EXPLV.length - 1)) * 100}%`, height: 6, borderRadius: 3, backgroundColor: C.yellow }} />
        </View>
        <View style={{ position: 'absolute', left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-between' }}>
          {EXPLV.map((_, j) => (
            <Pressable
              key={j}
              hitSlop={12}
              accessibilityLabel={EXPLV[j][0]}
              onPress={() => {
                tap();
                onChange(j);
              }}
              style={{ width: j === i ? 26 : 16, height: j === i ? 26 : 16, borderRadius: 13, backgroundColor: j <= i ? C.yellow : C.s3, borderWidth: j === i ? 4 : 0, borderColor: '#000' }}
            />
          ))}
        </View>
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
        {EXPLV.map(([l], j) => (
          <Pressable key={l} onPress={() => onChange(j)} hitSlop={6} style={{ width: 56, alignItems: j === 0 ? 'flex-start' : j === EXPLV.length - 1 ? 'flex-end' : 'center' }}>
            <Txt s={10} w={7} c={j <= i ? C.text : C.faint} lines={1}>
              {l.replace(' level', '')}
            </Txt>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

/** Card showing a chosen skill with its follow-up questions. */
export function SkillCard({ e, onChange, onChangeSkill, main }: { e: SkillEntry; onChange: () => void; onChangeSkill: () => void; main?: boolean }) {
  return (
    <View style={{ borderRadius: R.lg, backgroundColor: C.s1, borderWidth: main ? 1.5 : 1, borderColor: main ? C.yellow : C.line, overflow: 'hidden' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 }}>
        <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: main ? C.yellow : C.s3, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name={skIcon(e)} size={20} color={main ? '#000' : C.yellow} />
        </View>
        <View style={{ flex: 1 }}>
          <Txt s={15} w={8}>
            {e.custom ? e.n || 'Your own skill' : e.n}
          </Txt>
          <Txt s={12} c={C.muted}>
            {e.custom ? e.a || 'Not in our list, tell us about it' : e.a}
          </Txt>
        </View>
        <Pressable onPress={onChangeSkill} hitSlop={8}>
          <Txt s={13} w={7} c={C.lav}>
            Change
          </Txt>
        </Pressable>
      </View>
      {e.custom || skSpec(e).length ? (
        <View style={{ padding: 14, paddingTop: 4 }}>
          <SkillQuestions e={e} onChange={onChange} />
        </View>
      ) : null}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Add / edit another skill (sheet)                                   */
/* ------------------------------------------------------------------ */
export function openSkillSheet(i: number) {
  const d = SK.d!;
  d.editIndex = i;
  d.edit = i >= 0 ? clone(d.others[i]) : null;
  bump();
  sheet.show(() => <SkillSheet />, { full: true, onClose: () => ((d.edit = null), bump()) });
}
function SkillSheet() {
  const d = SK.d;
  if (!d) return null;
  const e = d.edit;
  const ch = () => bump();
  const taken = skAll(d)
    .filter((x) => x !== d.others[d.editIndex])
    .map((x) => x.n);
  return (
    <View style={{ gap: 14 }}>
      <SheetTitle>{d.editIndex >= 0 ? 'Edit skill' : 'Add a skill'}</SheetTitle>
      {e ? (
        <>
          <SkillCard
            e={e}
            onChange={ch}
            onChangeSkill={() => {
              d.edit = null;
              bump();
            }}
          />
          <Label>Your level in {e.custom ? 'this skill' : e.n}</Label>
          <LevelSeg options={PROF} value={e.lv} onChange={(l) => ((e.lv = l), ch())} />
          <Btn
            variant="yellow"
            title={d.editIndex >= 0 ? 'Save skill' : 'Add skill'}
            disabled={!skOK(e)}
            onPress={() => {
              if (taken.some((n) => n.toLowerCase() === e.n.toLowerCase())) {
                toast(`${e.n} is already in your skills`);
                return;
              }
              if (d.editIndex >= 0) d.others[d.editIndex] = e;
              else d.others.push(e);
              const n = e.n;
              d.edit = null;
              sheet.close(`${n} ${d.editIndex >= 0 ? 'updated' : 'added'}`);
              bump();
            }}
          />
          {!skOK(e) ? (
            <Txt s={12} c={C.muted} center>
              Add a name, a field and a short description (20+ characters)
            </Txt>
          ) : null}
        </>
      ) : (
        <SkillCombo
          autoFocus
          taken={taken}
          placeholder="Search a skill to add"
          onPick={(x) => {
            x.lv = 'Intermediate';
            d.edit = x;
            bump();
          }}
        />
      )}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Languages                                                          */
/* ------------------------------------------------------------------ */
export function LanguagesEditor({ langs, onChange }: { langs: [string, string][]; onChange: () => void }) {
  const [v, setV] = useState('');
  const add = (x?: string) => {
    const raw = (x ?? v).trim();
    if (!raw) return;
    const name = ALL_LANGS.find((l) => l.toLowerCase() === raw.toLowerCase()) || raw.charAt(0).toUpperCase() + raw.slice(1);
    if (langs.some((l) => l[0].toLowerCase() === name.toLowerCase())) {
      toast(`${name} is already added`);
      return;
    }
    langs.push([name, 'Good']);
    setV('');
    onChange();
  };
  const sugg = v.trim() ? ALL_LANGS.filter((l) => l.toLowerCase().includes(v.trim().toLowerCase()) && !langs.some((x) => x[0] === l)).slice(0, 6) : ['English', 'French', 'Pidgin', 'Duala', 'Fulfulde', 'Spanish'].filter((l) => !langs.some((x) => x[0] === l));
  return (
    <View style={{ gap: 10 }}>
      {langs.map(([l, lv], i) => (
        <View key={l} style={{ padding: 12, borderRadius: 14, backgroundColor: C.s1, borderWidth: 1, borderColor: C.line, gap: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Txt s={14} w={8} style={{ flex: 1 }}>
              {l}
            </Txt>
            <Pressable
              accessibilityLabel={`Remove ${l}`}
              hitSlop={8}
              onPress={() => {
                langs.splice(i, 1);
                onChange();
              }}
            >
              <Icon name="x" size={18} color={C.muted} />
            </Pressable>
          </View>
          <LevelSeg options={LANGP} value={lv} onChange={(x) => ((langs[i][1] = x), onChange())} />
        </View>
      ))}
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <TextInput
          value={v}
          onChangeText={setV}
          onSubmitEditing={() => add()}
          placeholder="Add a language: type to search"
          placeholderTextColor={C.faint}
          style={[tx(14, 6), { flex: 1, height: 48, borderRadius: R.md, backgroundColor: C.s2, paddingHorizontal: 14 }]}
        />
        <Pressable onPress={() => add()} style={{ height: 48, paddingHorizontal: 16, borderRadius: R.md, backgroundColor: C.s3, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Icon name="plus" size={14} color="#fff" />
          <Txt s={13} w={7}>
            Add
          </Txt>
        </Pressable>
      </View>
      <Chips>
        {sugg.map((l) => (
          <Chip key={l} small label={`+ ${l}`} onPress={() => add(l)} />
        ))}
      </Chips>
    </View>
  );
}

export { Stepper, detectCat };
