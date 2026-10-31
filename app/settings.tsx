import React from 'react';
import { Pressable, View } from 'react-native';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import { db } from '../src/data/db';
import { Avatar, OptRow, Page, TopBar, Txt } from '../src/ui/kit';
import { Icon } from '../src/ui/Icon';
import { confirm, toast } from '../src/ui/overlay';
import { C, S } from '../src/ui/theme';
import { bizLogo, bizName, curBiz, isPro, isW, cityLabel, myPhoto, xaf } from '../src/logic/core';
import { balance } from '../src/logic/wallet';
import { useLive } from '../src/logic/live';
import { logout } from '../src/logic/account';
import { openWhatsNew } from '../src/logic/whatsnew';
import { defaultPay, openAccounts, openBizSetup, openCities, openEdit, openHelp, openLang, openNotifSettings, openPayments, openPrivacy, openPro } from '../src/sheets/account';
import { openDoc } from '../src/sheets/profile';

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
            {b ? 'Business' : 'Regular'} profile{isPro() ? ' · PRO' : ''}{db.demo ? ' · demo' : ''} · tap to switch
          </Txt>
        </View>
        <Icon name="chev" size={20} color={C.faint} />
      </Pressable>
      <G t="Account" />
      <Box>
        <OptRow icon="rocket" bg={C.lav} title={isPro() ? `bolo ${w ? 'Pro' : 'Business Pro'} · active` : `Upgrade to ${w ? 'Pro' : 'Business Pro'}`} sub={w ? 'Get jobs faster, premium CV, profile boosts' : 'Cheaper ads, more businesses, featured company'} onPress={() => openPro()} />
        <OptRow icon="sparkle" bg={C.lav} title="What’s new" sub="The latest updates to bolo" onPress={openWhatsNew} />
        <OptRow icon="coins" bg={C.yellow} title="Wallet" sub={`${xaf(balance())} available · escrow`} onPress={() => router.push('/wallet' as any)} />
        <OptRow icon="money" title="Payment methods" sub={defaultPay()} onPress={openPayments} />
        {b ? <OptRow icon="storefront" bg="#fff" title="Business page" sub="Details, logo, RCCM & NIU" onPress={() => openBizSetup('edit', 1)} /> : <OptRow icon="edit" bg="#fff" title="Edit profile" sub="Name, bio, contact" onPress={openEdit} />}
        {b ? <OptRow icon="rocket" bg={C.orange} title="Ads manager" sub="Promote vacancies, programs and courses" onPress={() => router.push('/ads')} /> : null}
      </Box>
      <G t="Preferences" />
      <Box>
        <OptRow icon="bell" bg={C.lav} title="Notifications" sub="Hires, messages and reminders" onPress={openNotifSettings} />
        <OptRow icon="translate" bg={C.orange} title="Language" sub={db.PREF.lang} onPress={openLang} />
        <OptRow icon="pin" title="Location" sub={cityLabel() || 'Not set'} onPress={() => openCities()} />
      </Box>
      <G t="Privacy & safety" />
      <Box>
        <OptRow icon="shield" bg={C.orange} title="Privacy & security" sub="Visibility, phone number, two-step login" onPress={openPrivacy} />
        <OptRow icon="idcard" bg={C.mint} title="Verification" sub={b ? 'RCCM and NIU' : 'ID, documents and badges'} onPress={() => (b ? openBizSetup('edit', 3) : openDoc('id'))} />
      </Box>
      <G t="Support" />
      <Box>
        <OptRow icon="help" bg="#fff" title="Help & support" sub="FAQs and chat with bolo" onPress={openHelp} />
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
                title: 'Log out of bolo?',
                text: db.demo ? 'Demo data on this phone will be reset.' : 'Your account stays saved. Log back in any time.',
                ok: 'Log out',
                danger: true,
                icon: 'logout',
                onOk: async () => {
                  await logout();
                  try {
                    if (router.canDismiss()) router.dismissAll();
                  } catch {}
                  router.replace('/welcome');
                },
              })
            }
          />
        </Box>
      </View>
      <Txt s={12} c={C.faint} center style={{ marginTop: 18 }}>
        bolo · version {Constants.expoConfig?.version || '1.0.0'} · Powered by igne-industries
      </Txt>
    </Page>
  );
}
