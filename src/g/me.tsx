/* The "you" sheet: hiring or working (the switch on top), your account, your area, notifications, dark mode. */
import React from 'react';
import { prefOn } from '../logic/notify';
import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { db } from '../data/db';
import { useLive } from '../logic/live';
import { logout } from '../logic/account';
import { fname } from '../logic/core';
import { openWhatsNew } from '../logic/whatsnew';
import { areaLabel, forgetStarted, hasArea, setMode, working } from './data';
import { confirm } from './notice';
import { openAccount, openArea, openHelp, openNotifs, openSaved } from './sheets';
import { openSignIn } from './signin';
import { getLook, setLook, useG } from './theme';
import { Switch } from './parts';
import { goHome, tap } from './touch';
import { MenuRow, Round, Seg, T, gsheet } from './ui';

/** What the notification switches say, in a word ("On" only when they all are). */
function notifState() {
  const on = (['jobs', 'messages', 'reminders', 'news'] as const).filter((c) => prefOn(c)).length;
  return on === 4 ? 'On' : on === 0 ? 'Off' : on === 3 && !prefOn('news') ? 'On, no news' : 'Some off';
}
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
  const saved = (db.saved as string[]).length;
  const dark = getLook() === 'dark';
  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <T s={24} w={8} ls={-0.5} lines={1} style={{ flex: 1 }}>
          {name}
        </T>
        <Round testID="me-close" icon="x" label="Close" bg={t.card2} onPress={() => gsheet.close()} />
      </View>
      {/* what you are here for: hiring or working. Each side has its own home, jobs and inbox. */}
      <T s={13} w={7} c="muted" style={{ marginTop: 12, marginBottom: 8 }}>
        You’re using getit to
      </T>
      <Seg
        h={44}
        ids="me-mode"
        items={[
          ['hire', 'Find a worker'],
          ['work', 'Get work'],
        ]}
        value={work ? 'work' : 'hire'}
        onChange={(m) => {
          if (m === (work ? 'work' : 'hire')) return;
          gsheet.close();
          setTimeout(() => {
            if (m === 'hire') {
              setMode('hire');
              goHome();
            } else if (signed && db.user.skills.length) {
              setMode('work');
              goHome();
            } else router.push('/wland' as any); // no skill yet: set up as a worker first
          }, 240);
        }}
      />
      {!work && !(signed && db.user.skills.length) ? (
        <T s={12} c="muted" style={{ marginTop: 6 }}>
          “Get work” sets you up as a worker: your skill, how you work, your number.
        </T>
      ) : null}
      <View style={{ marginTop: 8 }}>
        {signed ? (
          <MenuRow testID="me-account" label={db.user.name || 'Your account'} value={work ? 'Your profile' : 'Account'} onPress={then(() => (work ? router.push('/wprofile' as any) : openAccount()))} />
        ) : (
          <MenuRow testID="me-signin" label="Sign in" value="Keep your chats" onPress={then(() => openSignIn())} />
        )}
        {work ? <MenuRow testID="me-settings" label="Your account" value="Name, sign-in" onPress={then(() => openAccount())} /> : null}
        {signed && !work ? <MenuRow testID="me-saved" label="Saved workers" value={saved ? String(saved) : 'None yet'} onPress={then(() => openSaved())} /> : null}
        <MenuRow testID="me-area" label="Your area" value={hasArea() ? areaLabel() : 'Choose'} onPress={then(() => openArea())} />
        {signed ? <MenuRow testID="me-notifs" label="Notifications" value={notifState()} onPress={then(() => openNotifs())} /> : null}
        <Pressable testID="me-dark" accessibilityRole="switch" accessibilityState={{ checked: dark }} accessibilityLabel="Dark mode" onPress={() => (tap(), setLook(dark ? 'light' : 'dark'))} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56, paddingVertical: 6, paddingHorizontal: 2, borderBottomWidth: 1, borderBottomColor: t.line }}>
          <T s={15} w={8} style={{ flex: 1 }}>
            Dark mode
          </T>
          <Switch on={dark} />
        </Pressable>
        <MenuRow testID="me-new" label="What’s new" onPress={then(() => openWhatsNew())} />
        <MenuRow testID="me-help" label="Help and feedback" last={!signed} onPress={then(() => openHelp())} />
        {signed ? (
          <MenuRow
            testID="me-signout"
            label="Sign out"
            color={t.danger}
            last
            onPress={then(() =>
              confirm({
                title: 'Sign out?',
                text: 'Your chats and jobs stay in your account. Sign in again to see them.',
                ok: 'Sign out',
                cancel: 'Stay',
                danger: true,
                onOk: async () => {
                  await logout();
                  forgetStarted();
                  router.replace('/intro' as any);
                },
              }),
            )}
          />
        ) : null}
      </View>
    </View>
  );
}
