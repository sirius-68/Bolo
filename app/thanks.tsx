/* After rating: the job is closed. Save the worker, book again, done. */
import React from 'react';
import { View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { db } from '../src/data/db';
import { useLive } from '../src/logic/live';
import { P, fname, has } from '../src/logic/core';
import { bk, toggleSave } from '../src/logic/work';
import { money } from '../src/g/data';
import { Fact, Moment } from '../src/g/parts';
import { openBook } from '../src/g/sheets';
import { goHome } from '../src/g/touch';
import { Big, Ghost } from '../src/g/ui';

export default function Thanks() {
  useLive();
  const { b } = useLocalSearchParams<{ b: string }>();
  const job = bk(b);
  const worker = job?.worker || '';
  const p = worker ? P(worker) : null;
  const f = p ? fname(p.name) : 'them';
  const saved = has(db.saved, worker);
  return (
    <Moment
      icon="check"
      title={`Thanks for rating ${f}`}
      sub="Your rating helps people near you find good workers."
      foot={
        <>
          {p ? (
            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 10 }}>
              <Ghost testID="thanks-save" title={saved ? 'Saved' : `Save ${f}`} style={{ flex: 1 }} onPress={() => toggleSave(worker)} />
              <Ghost testID="thanks-again" title="Book again" style={{ flex: 1 }} onPress={() => openBook({ worker, need: job?.title || '' })} />
            </View>
          ) : null}
          <Big testID="thanks-done" title="Done" onPress={goHome} />
        </>
      }
    >
      {job ? <Fact label="Job closed today" value={job.title} sub={[p?.name, money(job.price)].filter(Boolean).join(' · ')} /> : null}
    </Moment>
  );
}
