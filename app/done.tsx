import React from 'react';
import { View } from 'react-native';
import { Btn, Grow, Page, Pict, Sub, Title } from '../src/ui/kit';
import { db } from '../src/data/db';
import { startApp, wantsWork } from '../src/logic/account';
import { resetTo } from '../src/logic/nav';
import { openBizPrompt } from '../src/sheets/account';

export default function Done() {
  const f = db.user.name.split(' ')[0];
  return (
    <Page>
      <Grow />
      <Pict pic="art/done" style={{ width: 180, height: 180, alignSelf: 'center' }} fit="contain" />
      <View style={{ alignItems: 'center' }}>
        <Title center>You’re all set{f ? ', ' + f : ''}!</Title>
        <Sub center>{wantsWork() ? 'Your profile is live. People and businesses around you can now find and hire you.' : 'Your bolo account is ready. Let’s find you the right person.'}</Sub>
      </View>
      <Grow />
      <Btn
        testID="start-exploring"
        variant="yellow"
        title="Start exploring"
        onPress={() => {
          startApp();
          resetTo('/feed');
          if (db.user.intents.includes('biz') && !db.BIZ.list.length) setTimeout(openBizPrompt, 900);
        }}
      />
    </Page>
  );
}
