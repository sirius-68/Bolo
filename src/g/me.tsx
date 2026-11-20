/* The "you" sheet: appearance, account, area, and switching between hiring and working. */
import React from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { db } from '../data/db';
import { useLive } from '../logic/live';
import { logout } from '../logic/account';
import { fname } from '../logic/core';
import { resetTo } from '../logic/nav';
import { confirm } from '../ui/overlay';
import { openCities, openFeedback, openNotifSettings } from '../sheets/account';
import { areaLabel, forgetStarted, setMode, working } from './data';
import { getLook, setLook, useG } from './theme';
import { MenuRow, Round, Seg, T, gsheet } from './ui';

export function openMe() {
  gsheet.show(() => <MeSheet />);
}

/** Close the sheet, then do something once it has slid away. */
const then = (f: () => void) => () => {
  gsheet.close();
  setTimeout(f, 240);
};

function MeSheet() {
  useLive();
  const t = useG();
  const signed = db.loggedIn;
  const work = working() && signed;
  const name = db.user.name ? fname(db.user.name) : 'You';
  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <T s={24} w={8} ls={-0.5} lines={1} style={{ flex: 1 }}>
          {name}
        </T>
        <Round icon="x" label="Close" bg={t.card2} onPress={() => gsheet.close()} />
      </View>
      <T s={13} w={7} c={t.muted} style={{ marginTop: 12, marginBottom: 8 }}>
        Appearance
      </T>
      <Seg
        h={44}
        items={[
          ['dark', 'Dark'],
          ['light', 'Light'],
        ]}
        value={getLook()}
        onChange={setLook}
      />
      <View style={{ marginTop: 8 }}>
        {signed ? (
          <MenuRow testID="me-account" label={db.user.name || 'Your account'} value={work ? 'Your profile' : 'Account'} onPress={then(() => (work ? router.push('/me' as any) : router.push('/settings' as any)))} />
        ) : (
          <MenuRow testID="me-signin" label="Sign in" value="Keep your chats" onPress={then(() => router.push('/login'))} />
        )}
        {work ? <MenuRow testID="me-settings" label="Settings" value="Account" onPress={then(() => router.push('/settings' as any))} /> : null}
        <MenuRow testID="me-area" label="Your area" value={areaLabel()} onPress={then(() => openCities())} />
        {signed ? <MenuRow testID="me-notifs" label="Notifications" value="Choose" onPress={then(() => openNotifSettings())} /> : null}
        <MenuRow
          testID="me-mode"
          label={work ? 'Find a worker' : 'Get work on getit'}
          value={work ? 'Hire someone' : 'Offer a skill'}
          onPress={then(() => {
            if (work) {
              setMode('hire');
              resetTo('/find');
            } else router.push('/wland' as any);
          })}
        />
        {signed ? <MenuRow testID="me-help" label="Help and feedback" onPress={then(() => openFeedback())} /> : null}
        {signed ? (
          <MenuRow
            testID="me-signout"
            label="Sign out"
            color={t.accent}
            last
            onPress={then(() =>
              confirm({
                title: 'Sign out?',
                text: 'Your chats and jobs stay in your account. Sign in again to see them.',
                ok: 'Sign out',
                cancel: 'Stay',
                danger: true,
                icon: 'logout',
                onOk: async () => {
                  await logout();
                  forgetStarted();
                  resetTo('/splash');
                },
              }),
            )}
          />
        ) : null}
      </View>
    </View>
  );
}
