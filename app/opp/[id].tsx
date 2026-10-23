import React from 'react';
import { View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { db } from '../../src/data/db';
import { Page, TopBar, Txt } from '../../src/ui/kit';
import { useLive } from '../../src/logic/live';
import { OppSheet } from '../../src/sheets/career';
import { OppCard } from '../../src/components/cards';
import { Rail } from '../../src/components/common';

/** Internship / program / apprenticeship detail. */
export default function OppScreen() {
  useLive();
  const { id } = useLocalSearchParams<{ id: string }>();
  const o = db.OPPS.find((x) => x.id === id);
  const similar = o ? db.OPPS.filter((x) => x.id !== o.id && (x.kind === 'Internship') === (o.kind === 'Internship')) : [];
  return (
    <Page header={<TopBar title={o?.kind || 'Program'} />}>
      <View style={{ marginTop: 8 }}>
        <OppSheet id={id} />
      </View>
      {similar.length ? (
        <>
          <Txt s={18} w={8} style={{ marginTop: 28, marginBottom: 12 }}>
            {o?.kind === 'Internship' ? 'More internships' : 'More programs'}
          </Txt>
          <Rail>
            {similar.map((x) => (
              <OppCard key={x.id} o={x} />
            ))}
          </Rail>
        </>
      ) : null}
    </Page>
  );
}
