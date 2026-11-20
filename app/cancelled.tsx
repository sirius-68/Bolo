/* A job was cancelled: say so plainly, and offer the way forward. */
import React from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { P, fname } from '../src/logic/core';
import { tradeFor } from '../src/g/data';
import { Moment } from '../src/g/parts';
import { goHome } from '../src/g/touch';
import { Big, Link } from '../src/g/ui';

export default function Cancelled() {
  const { who, need, work } = useLocalSearchParams<{ who?: string; need?: string; work?: string }>();
  const f = who ? fname(P(who)?.name || '') : '';
  const trade = need ? tradeFor(need) : null;
  return (
    <Moment
      quiet
      icon="x"
      title="Job cancelled"
      sub={work ? `We told ${f || 'your client'}. You’re free for other jobs.` : `We told ${f || 'the worker'}. Nobody is coming, and you owe nothing.`}
      foot={
        work ? (
          <Big testID="cancelled-home" title="Back to work" onPress={goHome} />
        ) : (
          <>
            <Big
              testID="cancelled-again"
              title="Find someone else"
              onPress={() => {
                goHome();
                setTimeout(() => router.push((trade ? `/workers?trade=${encodeURIComponent(trade)}&need=${encodeURIComponent(need || '')}` : '/need') as any), 60);
              }}
            />
            <Link testID="cancelled-home" title="Back to home" color="text" h={48} style={{ marginTop: 8 }} onPress={goHome} />
          </>
        )
      }
    />
  );
}
