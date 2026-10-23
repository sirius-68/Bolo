import React from 'react';
import { View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { db } from '../../src/data/db';
import { Page, TopBar, Txt } from '../../src/ui/kit';
import { useLive } from '../../src/logic/live';
import { MentorSheet } from '../../src/sheets/career';
import { MentorCard } from '../../src/components/cards';
import { Rail } from '../../src/components/common';

/** Mentorship detail. */
export default function MentorScreen() {
  useLive();
  const { id } = useLocalSearchParams<{ id: string }>();
  const m = db.MENTORSHIPS.find((x) => x.id === id);
  const more = m ? db.MENTORSHIPS.filter((x) => x.id !== m.id && !x.mine) : [];
  return (
    <Page header={<TopBar title="Mentorship" />}>
      <View style={{ marginTop: 8 }}>
        <MentorSheet id={id} />
      </View>
      {more.length ? (
        <>
          <Txt s={18} w={8} style={{ marginTop: 28, marginBottom: 12 }}>
            More mentors
          </Txt>
          <Rail>
            {more.map((x) => (
              <MentorCard key={x.id} m={x} />
            ))}
          </Rail>
        </>
      ) : null}
    </Page>
  );
}
