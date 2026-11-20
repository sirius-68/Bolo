import React, { useCallback } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { db } from '../../src/data/db';
import { bump, useLive } from '../../src/logic/live';
import { P, fname } from '../../src/logic/core';
import { myBookings, trOther } from '../../src/logic/work';
import { startCall } from '../../src/logic/calls';
import { loadAll } from '../../src/logic/server';
import { areaLabel, hasArea, jobsForMe, whenText, working } from '../../src/g/data';
import { toast } from '../../src/g/notice';
import { openArea } from '../../src/g/sheets';
import { tap } from '../../src/g/touch';
import { GIcon } from '../../src/g/icons';
import { openMe } from '../../src/g/me';
import { TAB_SPACE } from '../../src/g/TabBar';
import { RED, ft, useG } from '../../src/g/theme';
import { BigButton, Face, Link, Round, Screen, T } from '../../src/g/ui';
import { canListen } from '../../src/g/speech';

/** Home. Hiring: one big button to find a worker. Working: one big button to go available or pause, and jobs near you. */
export default function Find() {
  useLive();
  const t = useG();
  const ins = useSafeAreaInsets();
  const work = working() && db.loggedIn;
  useFocusEffect(
    useCallback(() => {
      // fresh jobs and chats whenever home comes back into view (quietly; what is on screen stays meanwhile)
      if (db.loggedIn) void loadAll();
    }, []),
  );
  const avail = db.PR.wst !== 'off';
  const toggleAvail = () => {
    db.PR.wst = avail ? 'off' : 'open';
    bump();
    toast(avail ? 'Paused. Clients can’t see you' : 'You’re available again');
  };
  // the last person hired: one tap to call them again
  const last = !work && db.loggedIn ? myBookings().filter((b) => b.client === 'me')[0] : undefined;
  const lastP = last ? P(trOther(last)) : undefined;
  const jobs = work ? jobsForMe().slice(0, 12) : [];
  const a = (db.PR.area || {}) as any;
  const onlineOnly = Array.isArray(a.ways) && a.ways.length === 1 && a.ways[0] === 'online';
  return (
    <Screen style={{ paddingBottom: TAB_SPACE + ins.bottom }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20 }}>
        <Pressable
          testID="home-area"
          accessibilityRole="button"
          accessibilityLabel={`Your area: ${areaLabel()}. Change`}
          onPress={() => (tap(), openArea())}
          style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 6, height: 44, paddingLeft: 12, paddingRight: 14, borderRadius: 22, borderWidth: 1, borderColor: t.line, backgroundColor: t.card, maxWidth: '75%', opacity: pressed ? 0.7 : 1 })}
        >
          <GIcon name="pin" size={18} color={t.accent} />
          <Text numberOfLines={1} maxFontSizeMultiplier={1.2} style={[ft(14, 7, t.text), { flexShrink: 1 }]}>
            {hasArea() ? areaLabel() : 'Choose your area'}
          </Text>
          <GIcon name="down" size={16} color={t.text} />
        </Pressable>
        <Round testID="home-me" icon="user" label="You and settings" onPress={openMe} />
      </View>

      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <T s={24} w={8} ls={-0.5} center style={{ marginBottom: 16 }}>
          {work ? (avail ? 'You’re available' : 'You’re paused') : 'Tap to find a worker'}
        </T>
        {work ? (
          <BigButton testID="home-big" label={avail ? 'Pause: stop new jobs and calls' : 'Go back online'} still={!avail} dim={!avail} onPress={toggleAvail} />
        ) : (
          <BigButton testID="home-big" label="Find a worker: tap and say what you need" still onPress={() => router.push((canListen() ? '/listen' : '/need') as any)} />
        )}
        {!work && canListen() ? <Link testID="home-type" icon="keyboard" title="Type instead" style={{ marginTop: 12, paddingHorizontal: 18 }} onPress={() => router.push('/need' as any)} /> : null}
        {work ? (
          <T s={14} lh={1.5} c={t.muted} center style={{ maxWidth: 270, marginTop: 14 }}>
            {!avail ? 'Nobody can see you right now. Tap the button to go back online.' : onlineOnly ? 'Clients can find you and message you. Tap the button to pause.' : 'Clients near you can see you and call you. Tap the button to pause.'}
          </T>
        ) : null}
      </View>

      {lastP && last ? (
        <View style={{ paddingHorizontal: 20 }}>
          <T s={13} w={7} c={t.muted} style={{ marginBottom: 10 }}>
            Recently
          </T>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 22, backgroundColor: t.card, borderWidth: 1, borderColor: t.line }}>
            <Pressable accessibilityRole="button" accessibilityLabel={`Open ${lastP.name}`} onPress={() => router.push(`/profile/${trOther(last)}` as any)} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
              <Face name={lastP.name} photo={lastP.photo} size={48} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <T s={15} w={8} lines={1}>
                  {lastP.name}
                </T>
                <T s={13} c={t.muted} lines={1} style={{ marginTop: 2 }}>
                  {[lastP.role !== 'Member' ? lastP.role : '', last.title].filter(Boolean).join(' · ')}
                </T>
              </View>
            </Pressable>
            <Round icon="phone" label={`Call ${fname(lastP.name)} again`} bg={RED} color="#ffffff" plain onPress={() => void startCall(trOther(last), 'voice')} />
          </View>
        </View>
      ) : null}

      {work ? (
        <View>
          <T s={13} w={7} c={t.muted} style={{ marginHorizontal: 20, marginBottom: 10 }}>
            {jobs.length ? (onlineOnly ? 'Jobs for you' : 'Jobs near you') : 'No jobs near you right now'}
          </T>
          {jobs.length ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 4, gap: 10 }}>
              {jobs.map((po) => (
                <Pressable key={po.id} testID={`home-job-${po.id}`} accessibilityRole="button" onPress={() => (tap(), router.push(`/wrequest/${po.id}` as any))} style={({ pressed }) => ({ width: 230, padding: 14, borderRadius: 22, backgroundColor: t.card, borderWidth: 1, borderColor: t.line, opacity: pressed ? 0.8 : 1 })}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                    <T s={12} w={8} c={t.accent} lines={1} style={{ flexShrink: 1 }}>
                      {po.urgent ? 'Now' : whenText(po.when) || 'Any time'}
                    </T>
                    <T s={12} c={t.muted} lines={1} style={{ flexShrink: 1 }}>
                      {po.area || ''}
                    </T>
                  </View>
                  <T s={15} w={8} lh={1.35} lines={2} style={{ marginTop: 8 }}>
                    {po.title || po.cat || 'Job'}
                  </T>
                </Pressable>
              ))}
            </ScrollView>
          ) : (
            <T s={13} lh={1.5} c={t.muted} style={{ marginHorizontal: 20 }}>
              New requests show here, and you get a notification for each one.
            </T>
          )}
        </View>
      ) : null}
    </Screen>
  );
}
