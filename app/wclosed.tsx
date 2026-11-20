/* The job is closed and paid: what you earned, and your week so far. */
import React from 'react';
import { useLocalSearchParams } from 'expo-router';
import { useLive } from '../src/logic/live';
import { P } from '../src/logic/core';
import { bk } from '../src/logic/work';
import { amount, earnedThisWeek } from '../src/g/data';
import { Fact, Moment } from '../src/g/parts';
import { goHome } from '../src/g/touch';
import { Big, T } from '../src/g/ui';

export default function WClosed() {
  useLive();
  const { b } = useLocalSearchParams<{ b: string }>();
  const job = bk(b);
  const n = job ? job.amt || amount(job.price) : 0;
  const week = earnedThisWeek();
  const client = P(job?.client || '')?.name || '';
  return (
    <Moment
      halo={200}
      core={100}
      icon="check"
      big={
        n ? (
          <>
            <T s={n >= 100000 ? 18 : 22} w={8} ls={-0.5} c="#ffffff">
              +{n.toLocaleString('en-US')}
            </T>
            <T s={12} w={7} c="#ffffff">
              FCFA
            </T>
          </>
        ) : undefined
      }
      title="Job closed"
      sub={[job?.title, client].filter(Boolean).join(' · ')}
      foot={<Big testID="wclosed-back" title="Back to work" onPress={goHome} />}
    >
      <Fact label="This week" value={`${week.total.toLocaleString('en-US')} FCFA · ${week.jobs} ${week.jobs === 1 ? 'job' : 'jobs'}`} sub="Paid to you directly. getit takes nothing." />
    </Moment>
  );
}
