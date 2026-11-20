/* A client booked you. */
import React from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { useLive } from '../src/logic/live';
import { P, fname } from '../src/logic/core';
import { bk } from '../src/logic/work';
import { money, whenText } from '../src/g/data';
import { openChat } from '../src/g/nav';
import { Details, Moment } from '../src/g/parts';
import { goHome } from '../src/g/touch';
import { Big, Link } from '../src/g/ui';

export default function WBooked() {
  useLive();
  const { b } = useLocalSearchParams<{ b: string }>();
  const job = bk(b);
  const f = fname(P(job?.client || '')?.name || 'A client');
  return (
    <Moment
      icon="check"
      title={`${f} booked you`}
      sub={job?.title}
      foot={
        <>
          <Big testID="wbooked-open" title="Open the job" onPress={() => (job ? router.replace(`/track/${job.id}` as any) : goHome())} />
          {job ? <Link testID="wbooked-chat" title={`Message ${f}`} color="text" h={48} style={{ marginTop: 8 }} onPress={() => openChat(job.client)} /> : null}
        </>
      }
    >
      {job ? (
        <Details
          rows={[
            ['What', job.title],
            ['When', whenText(job.when)],
            ['Where', job.area || 'Agree the place by chat or call'],
            ['Price', /\d/.test(job.price) ? `${money(job.price)} · ${f} pays you directly` : job.price],
          ]}
        />
      ) : null}
    </Moment>
  );
}
