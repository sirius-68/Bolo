import React from 'react';
import { Pressable, View } from 'react-native';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import { db } from '../src/data/db';
import { Avatar, OptRow, Page, TopBar, Txt } from '../src/ui/kit';
import { Icon } from '../src/ui/Icon';
import { confirm, toast } from '../src/ui/overlay';
import { C, S } from '../src/ui/theme';
import { bizLogo, bizName, curBiz, isPro, isW, cityLabel, myPhoto } from '../src/logic/core';
import { useLive } from '../src/logic/live';
import * as Sharing from 'expo-sharing';
import { logout } from '../src/logic/account';
import { deleteAccount, exportMyData } from '../src/logic/remote';
import { openWhatsNew } from '../src/logic/whatsnew';
import { openAccounts, openBizSetup, openCities, openEdit, openHelp, openLang, openNotifSettings, openPrivacy } from '../src/sheets/account';
import { openDoc } from '../src/sheets/profile';

async function downloadData() {
  toast('Preparing your data…');
  const r = await exportMyData();
  if (r.error || !r.uri) return toast(r.error || 'Couldn’t prepare your data. Try again');
  try {
    if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(r.uri, { mimeType: 'application/json', dialogTitle: 'Your getit data', UTI: 'public.json' });
    else toast('Saved on this phone');
  } catch {}
}

function askDelete() {
  confirm({
    title: 'Delete your account?',
    text: 'Your profile, business pages, posts and photos are removed for good. This can’t be undone. To use getit again you’ll need a new account.',
    ok: 'Delete account',
    danger: true,
    icon: 'trash',
    onOk: async () => {
      toast('Deleting your account…');
      const err = await deleteAccount();
      if (err) return toast(err);
      await logout();
      try {
        if (router.canDismiss()) router.dismissAll();
      } catch {}
      router.replace('/splash');
      toast('Your account has been deleted');
    },
  });
}

export default function Settings() {
  useLive();
  const w = isW();
  const b = !w ? curBiz() : null;
  const G = ({ t }: { t: string }) => (
    <Txt s={12} w={8} c={C.muted} style={{ marginTop: 22, marginBottom: 6, marginLeft: 4, letterSpacing: 0.6 }}>
      {t.toUpperCase()}
    </Txt>
  );
  const Box = ({ children }: { children: React.ReactNode }) => <View style={{ borderRadius: 20, backgroundColor: C.s1, borderWidth: 1, borderColor: C.line, paddingHorizontal: 8 }}>{children}</View>;
  return (
    <Page header={<TopBar title="Settings" />}>
      <Pressable accessibilityRole="button" onPress={openAccounts} style={[S.row, { gap: 12, marginTop: 10, padding: 14, borderRadius: 20, backgroundColor: C.s1, borderWidth: 1, borderColor: C.line }]}>
        <Avatar pic={b ? bizLogo(b) : myPhoto()} square={!!b} size={52} />
        <View style={{ flex: 1 }}>
          <Txt s={16} w={8} lines={1}>
            {b ? bizName(b) : db.user.name || 'Your name'}
          </Txt>
          <Txt s={12} c={C.muted}>
            {b ? 'Business' : 'Regular'} profile{isPro() ? ' · PRO' : ''} · tap to switch
          </Txt>
        </View>
        <Icon name="chev" size={20} color={C.faint} />
      </Pressable>
      <G t="Account" />
      <Box>
        
        <OptRow icon="sparkle" bg={C.lav} title="What’s new" sub="The latest updates to getit" onPress={openWhatsNew} />
        
        
        {b ? <OptRow icon="storefront" bg="#fff" title="Business page" sub="Details, logo, RCCM & NIU" onPress={() => openBizSetup('edit', 1)} /> : <OptRow icon="edit" bg="#fff" title="Edit profile" sub="Name, bio, contact" onPress={openEdit} />}
        
      </Box>
      <G t="Preferences" />
      <Box>
        <OptRow icon="bell" bg={C.lav} title="Notifications" sub="Hires, messages and reminders" onPress={openNotifSettings} />
        <OptRow icon="translate" bg={C.orange} title="Language" sub={db.PREF.lang} onPress={openLang} />
        <OptRow icon="pin" title="Location" sub={cityLabel() || 'Not set'} onPress={() => openCities()} />
      </Box>
      <G t="Privacy & safety" />
      <Box>
        <OptRow icon="shield" bg={C.orange} title="Privacy & security" sub="Who can find you, password, blocked people" onPress={openPrivacy} />
        <OptRow icon="idcard" bg={C.mint} title="Verification" sub={b ? 'RCCM and NIU' : 'ID, documents and badges'} onPress={() => (b ? openBizSetup('edit', 3) : openDoc('id'))} />
        <OptRow testID="set-export" icon="download" bg={C.s3} iconColor="#fff" title="Download my data" sub="Everything getit stores about you" onPress={downloadData} />
        <OptRow testID="set-delete" icon="trash" bg="#3a1a1a" iconColor={C.err} title="Delete account" sub="Remove your account and data for good" onPress={askDelete} />
      </Box>
      <G t="Support" />
      <Box>
        <OptRow icon="help" bg="#fff" title="Help & support" sub="Common questions, write to getit" onPress={openHelp} />
        <OptRow icon="file" bg={C.s3} iconColor="#fff" title="Terms & privacy policy" sub="How we use your data" onPress={() => toast('Terms open in your browser on the live app')} />
      </Box>
      <View style={{ marginTop: 22 }}>
        <Box>
          <OptRow
            icon="logout"
            bg="#3a1a1a"
            iconColor={C.err}
            danger
            chev={false}
            title="Log out"
            onPress={() =>
              confirm({
                title: 'Log out of getit?',
                text: 'Your account stays saved. Log back in any time.',
                ok: 'Log out',
                danger: true,
                icon: 'logout',
                onOk: async () => {
                  await logout();
                  try {
                    if (router.canDismiss()) router.dismissAll();
                  } catch {}
                  router.replace('/splash');
                },
              })
            }
          />
        </Box>
      </View>
      <Txt s={12} c={C.faint} center style={{ marginTop: 18 }}>
        getit · version {Constants.expoConfig?.version || '1.0.0'} · Powered by igne-industries
      </Txt>
    </Page>
  );
}
