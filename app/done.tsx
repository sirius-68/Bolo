import React from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { Btn, Grow, Page, Pict, Sub, Title } from '../src/ui/kit';
import { db } from '../src/data/db';
import { startApp, wantsWork } from '../src/logic/account';
import { resetTo } from '../src/logic/nav';
import { afterSheet } from '../src/ui/overlay';
import { openBizPrompt } from '../src/sheets/account';
import { openService } from '../src/sheets/profile';
import { mySkill } from '../src/logic/core';

/** End of sign-up: lead straight into the first useful thing for this person (their "first win"). */
export default function Done() {
  const f = db.user.name.split(' ')[0];
  const work = wantsWork();
  const hire = db.user.intents.includes('hire');
  const enter = (then?: () => void) => {
    startApp();
    resetTo('/feed');
    if (then) setTimeout(then, 450);
    else if (db.user.intents.includes('biz') && !db.BIZ.list.length) setTimeout(openBizPrompt, 900);
  };
  return (
    <Page>
      <Grow />
      <Pict pic="art/done" style={{ width: 180, height: 180, alignSelf: 'center' }} fit="contain" />
      <View style={{ alignItems: 'center' }}>
        <Title center>You’re all set{f ? ', ' + f : ''}!</Title>
        <Sub center>
          {work
            ? `Your profile is live. Add your first service with a price so people nearby can book you straight away.`
            : 'Your account is ready. Tell us what you need and people nearby will send you offers.'}
        </Sub>
      </View>
      <Grow />
      <View style={{ gap: 12 }}>
        {work ? (
          <Btn testID="done-service" variant="yellow" icon="wrench" title={`Add my ${mySkill().toLowerCase()} service`} onPress={() => enter(() => afterSheet(() => openService(), 0))} />
        ) : (
          <Btn testID="done-post" variant="yellow" icon="job" title="Post what I need" onPress={() => enter(() => router.push('/post-job'))} />
        )}
        {work && hire ? <Btn testID="done-post" variant="dark" icon="job" title="I need something done" onPress={() => enter(() => router.push('/post-job'))} /> : null}
        <Btn testID="start-exploring" variant="ghost" title={work ? 'Show me jobs near me' : 'Browse people near me'} onPress={() => enter()} />
      </View>
    </Page>
  );
}
