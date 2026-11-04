import React, { useState } from 'react';
import { Dimensions, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Btn, TopBar, Txt, goBack, tap } from '../src/ui/kit';
import { Icon } from '../src/ui/Icon';
import { C, S } from '../src/ui/theme';
import { sheet, SheetTitle } from '../src/ui/overlay';
import { EX_GOALS, EX_SPECS } from '../src/data/experts';
import { bump, useLive } from '../src/logic/live';
import { clearExFilters, exF, exFilterCount, findExperts } from '../src/logic/experts';

const FORMATS = ['Video call', 'Written review', 'Chat'];

/** Filters for Career experts: one career goal, several fields, and how you want to work. */
export default function ExpertFilters() {
  useLive();
  const ins = useSafeAreaInsets();
  const n = findExperts().length;
  return (
    <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: ins.top }}>
      <View style={{ paddingHorizontal: 20 }}>
        <TopBar
          title="Filters"
          right={
            exFilterCount() ? (
              <Txt testID="exf-clear" s={14} w={8} c={C.lav} onPress={() => (tap(), clearExFilters())}>
                Clear
              </Txt>
            ) : null
          }
        />
      </View>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 10 }}>
        <Row testID="exf-goal" label="Career goal" value={exF.goal || 'Any goal'} on={!!exF.goal} onPress={() => openRadio('Career goal', EX_GOALS, exF.goal, (v) => ((exF.goal = v), bump()))} />
        <Row
          testID="exf-spec"
          label="Specialisation"
          value={exF.specs.length ? (exF.specs.length === 1 ? exF.specs[0] : `${exF.specs.length} selected`) : 'Any field'}
          on={!!exF.specs.length}
          onPress={() => openMulti('Specialisation', EX_SPECS, exF.specs, (v) => ((exF.specs = v), bump()))}
        />
        <Row testID="exf-fmt" label="Format" value={exF.fmt || 'Any format'} on={!!exF.fmt} onPress={() => openRadio('Format', FORMATS, exF.fmt, (v) => ((exF.fmt = v), bump()))} />
      </ScrollView>
      <View style={{ paddingHorizontal: 20, paddingBottom: 16 + ins.bottom, paddingTop: 10 }}>
        <Btn testID="exf-show" variant="yellow" title={n ? `Show ${n} expert${n === 1 ? '' : 's'}` : 'No experts match'} disabled={!n} onPress={goBack} />
      </View>
    </View>
  );
}

function Row({ label, value, on, onPress, testID }: { label: string; value: string; on: boolean; onPress: () => void; testID?: string }) {
  return (
    <Pressable testID={testID} accessibilityRole="button" accessibilityLabel={`${label}: ${value}`} onPress={() => (tap(), onPress())} style={({ pressed }) => [S.row, { gap: 12, minHeight: 68, paddingHorizontal: 16, borderRadius: 20, backgroundColor: pressed ? C.s2 : C.s1, borderWidth: 1, borderColor: on ? C.yellow : C.line }]}>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Txt s={12} c={C.muted}>
          {label}
        </Txt>
        <Txt s={15} w={8} lines={1} c={on ? C.text : '#d6d6dc'}>
          {value}
        </Txt>
      </View>
      <Icon name="chev" size={18} color={C.muted} />
    </Pressable>
  );
}

const Radio = ({ on }: { on: boolean }) => (
  <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: on ? C.yellow : C.s3, alignItems: 'center', justifyContent: 'center' }}>{on ? <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: C.yellow }} /> : null}</View>
);
const Box = ({ on }: { on: boolean }) => (
  <View style={{ width: 22, height: 22, borderRadius: 7, borderWidth: 2, borderColor: on ? C.yellow : C.s3, backgroundColor: on ? C.yellow : 'transparent', alignItems: 'center', justifyContent: 'center' }}>{on ? <Icon name="check" size={13} color="#000" /> : null}</View>
);

/** Single choice: tapping picks and closes. */
function openRadio(title: string, opts: string[], value: string, set: (v: string) => void) {
  sheet.show(() => (
    <View style={{ gap: 4, flex: 1 }}>
      <View style={S.rowB}>
        <SheetTitle>{title}</SheetTitle>
        {value ? (
          <Txt s={14} w={8} c={C.lav} onPress={() => (set(''), sheet.close())}>
            Clear
          </Txt>
        ) : null}
      </View>
      <ScrollView style={{ maxHeight: 520 }} showsVerticalScrollIndicator={false}>
        {opts.map((o, i) => (
          <Pressable key={o} testID={`radio-${i}`} accessibilityRole="radio" accessibilityState={{ checked: value === o }} onPress={() => (tap(), set(o), sheet.close())} style={[S.row, { gap: 14, minHeight: 54, borderBottomWidth: i < opts.length - 1 ? 1 : 0, borderColor: C.line }]}>
            <Radio on={value === o} />
            <Txt s={15} w={value === o ? 8 : 5} style={{ flex: 1 }}>
              {o}
            </Txt>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  ));
}

/** Several choices: tick, then Select. */
function openMulti(title: string, opts: string[], value: string[], set: (v: string[]) => void) {
  sheet.show(() => <Multi title={title} opts={opts} value={value} set={set} />, { full: true });
}
function Multi({ title, opts, value, set }: { title: string; opts: string[]; value: string[]; set: (v: string[]) => void }) {
  const [sel, setSel] = useState<string[]>(value);
  const flip = (o: string) => (tap(), setSel(sel.includes(o) ? sel.filter((x) => x !== o) : [...sel, o]));
  return (
    <View style={{ gap: 4, flex: 1 }}>
      <SheetTitle sub={sel.length ? `${sel.length} selected` : 'Pick one or more'}>{title}</SheetTitle>
      <ScrollView style={{ maxHeight: Dimensions.get('window').height * 0.58 }} showsVerticalScrollIndicator={false}>
        {opts.map((o, i) => (
          <Pressable key={o} testID={`multi-${i}`} accessibilityRole="checkbox" accessibilityState={{ checked: sel.includes(o) }} onPress={() => flip(o)} style={[S.row, { gap: 14, minHeight: 52, borderBottomWidth: i < opts.length - 1 ? 1 : 0, borderColor: C.line }]}>
            <Box on={sel.includes(o)} />
            <Txt s={15} w={sel.includes(o) ? 8 : 5} style={{ flex: 1 }}>
              {o}
            </Txt>
          </Pressable>
        ))}
      </ScrollView>
      <View style={{ flexDirection: 'row', gap: 10, paddingTop: 10 }}>
        <Btn variant="dark" title="Clear" style={{ flex: 1 }} disabled={!sel.length} onPress={() => setSel([])} />
        <Btn testID="multi-select" variant="yellow" title="Select" style={{ flex: 1 }} onPress={() => (set(sel), sheet.close())} />
      </View>
    </View>
  );
}
