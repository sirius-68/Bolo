/* A job request, as a worker sees it: what, who, when, roughly where. Send a price, or ask a question first. */
import React, { useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { db } from '../../src/data/db';
import { useLive } from '../../src/logic/live';
import { P, fname, postById } from '../../src/logic/core';
import { kmFromMe, loadPost, refreshPosts } from '../../src/logic/server';
import { withdrawOffer } from '../../src/logic/work';
import { agentAnswer } from '../../src/g/agent';
import { amount, money, whenText } from '../../src/g/data';
import { openChat } from '../../src/g/nav';
import { confirm, toast } from '../../src/g/notice';
import { Card, Details, Hint, Kicker, Top } from '../../src/g/parts';
import { openOffer } from '../../src/g/sheets';
import { withAccount } from '../../src/g/signin';
import { useG } from '../../src/g/theme';
import { Big, Face, Ghost, Round, T } from '../../src/g/ui';

export default function WRequest() {
  useLive();
  const t = useG();
  const ins = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const po = postById(id);
  const [answering, setAnswering] = useState(false);
  useEffect(() => {
    if (id && !postById(id)) void loadPost(id);
    // fresh on opening: an offer of mine may have a question waiting ("can you do it for 5,000?")
    else void refreshPosts();
    // while it is open: the answer to my offer, or the agent's question, shows without leaving the screen
    const timer = setInterval(() => db.myOffers[id] && db.myOffers[id].state !== 'acc' && void refreshPosts(), 12000);
    return () => clearInterval(timer);
  }, [id]);
  if (!po)
    return (
      <View style={{ flex: 1, backgroundColor: t.bg, paddingTop: ins.top + 16 }}>
        <Top />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 8 }}>
          <T s={20} w={8} center>
            This job is no longer open
          </T>
          <T s={15} c="muted" center>
            Someone was booked, or the client cancelled it.
          </T>
        </View>
      </View>
    );
  const c = P(po.client || '');
  const f = fname(c?.name || 'The client');
  const online = po.type === 'online' || /online/i.test(po.area || '');
  const kmTxt = !online && po.coord ? kmFromMe(po.coord[0], po.coord[1]).replace(/(\d)km/, '$1 km') : '';
  const mine = db.myOffers[po.id];
  const photo = po.photos?.[0];
  const taken = po.status === 'booked' || po.status === 'closed' || !!po.booked;
  const viaAgent = po.agent === '1';
  // the getit agent asked whether the client's budget works (once; my price stays unless I say yes)
  const ask = mine && mine.state !== 'acc' && !taken ? mine.ask : undefined;
  const answer = async (yes: boolean) => {
    if (!mine?.id || answering) return;
    setAnswering(true);
    const err = await agentAnswer(mine.id, yes);
    await refreshPosts();
    setAnswering(false);
    toast(err || (yes ? `Your price is now ${money(ask!)}. ${f} is told.` : `You keep ${money(mine.price)}. ${f} still sees your offer.`));
  };
  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingTop: ins.top + 16, paddingBottom: 24 }}>
        <Top />
        <View style={{ paddingTop: 14, paddingHorizontal: 20 }}>
          <Kicker>{[po.urgent ? 'Urgent job' : 'New job', online ? 'online' : kmTxt].filter(Boolean).join(' · ')}</Kicker>
          <T s={28} w={8} lh={1.15} ls={-0.6} style={{ marginTop: 4, marginBottom: 2 }}>
            {po.title || po.cat || 'Job'}
          </T>
          <T s={14} c="muted">
            Posted {po.time === 'now' ? 'just now' : po.time}
            {po.offers ? ` · ${po.offers} ${po.offers === 1 ? 'offer' : 'offers'} so far` : ''}
          </T>
        </View>
        {c?.name ? (
          <Card pad={0} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginHorizontal: 16, marginTop: 16, paddingVertical: 12, paddingHorizontal: 14 }}>
            <Face name={c.name} photo={c.photo} size={48} />
            <View style={{ flex: 1, gap: 2 }}>
              <T s={15} w={8} lines={1}>
                {c.name}
              </T>
              <T s={13} c="muted" lines={1}>
                {[c.crate ? `${c.crate.toFixed(1)} ★ as a client (${c.creviews} ${c.creviews === 1 ? 'worker' : 'workers'})` : c.hires ? 'Not rated yet as a client' : 'New on getit', c.hires ? `${c.hires} ${c.hires === 1 ? 'job' : 'jobs'} booked` : ''].filter(Boolean).join(' · ')}
              </T>
            </View>
          </Card>
        ) : null}
        {po.text ? (
          <T s={15} lh={1.55} style={{ marginTop: 16, marginHorizontal: 20 }}>
            {po.text}
          </T>
        ) : null}
        {photo ? <Image source={{ uri: photo.replace(/^uri:/, '') }} style={{ height: 190, marginHorizontal: 16, marginTop: 14, borderRadius: 20, backgroundColor: t.card2 }} contentFit="cover" /> : null}
        <Details
          style={{ marginHorizontal: 16, marginTop: 12 }}
          rows={[
            ['When', whenText(po.when) || 'Any time'],
            ['Where', online ? `Online${c?.area ? ` · ${f} is in ${c.area}` : ''}` : [po.area, kmTxt].filter(Boolean).join(' · ') || 'Near you', online ? 'You work together by chat and calls on getit' : 'You get the exact place by chat or call once you’re booked'],
            // handled by the agent: a budget may exist, but workers name their own price first
            ['Budget', /^XAF\s*[1-9]/.test(po.budget || '') ? money(po.budget) : viaAgent ? 'Not shown. Name your own price' : `${f} hasn’t set a price`],
            ...(po.service ? ([['Kind of job', po.service]] as [string, string][]) : []),
          ]}
        />
        {viaAgent ? (
          <Hint icon="shield" style={{ marginHorizontal: 20, marginTop: 14 }}>
            getit is collecting offers for {f} and compares price, time and your record for this kind of job. If your price is above {f}’s budget, you are asked once whether the budget works.
          </Hint>
        ) : null}
      </ScrollView>
      <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: ins.bottom + 24, borderTopWidth: 1, borderTopColor: t.line, backgroundColor: t.bg }}>
        {ask ? (
          <View testID="wreq-ask" style={{ padding: 14, marginBottom: 12, borderRadius: 20, borderWidth: 1, borderColor: t.accent, backgroundColor: t.card }}>
            <T s={15} w={8} lh={1.35}>
              Can you do it for {money(ask)}?
            </T>
            <T s={13} lh={1.45} c="muted" style={{ marginTop: 4 }}>
              That is {f}’s budget. You offered {money(mine!.price)}{amount(mine!.price) > ask ? `, ${money(amount(mine!.price) - ask)} more` : ''}. Say yes and your price becomes {money(ask)}; say no and your offer stays as it is.
            </T>
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
              <Big testID="wreq-ask-yes" title={`Yes, ${money(ask)}`} h={48} loading={answering} style={{ flex: 1 }} onPress={() => void answer(true)} />
              <Ghost testID="wreq-ask-no" title="Keep my price" style={{ flex: 1, height: 48, borderRadius: 24 }} onPress={() => void answer(false)} />
            </View>
          </View>
        ) : null}
        {mine ? (
          <T s={14} w={7} c="accent" center style={{ marginBottom: 10 }}>
            Your offer: {money(mine.price)} · {whenText(mine.when)} · {mine.state === 'acc' ? 'accepted' : `waiting for ${f}`}
          </T>
        ) : null}
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {taken && !mine ? (
            <Ghost title="Someone else was chosen" style={{ flex: 1, height: 56, borderRadius: 28 }} />
          ) : mine ? (
            <Ghost testID="wreq-withdraw" title="Take back my offer" style={{ flex: 1, height: 56, borderRadius: 28 }} onPress={() => confirm({ title: 'Take back your offer?', text: `${f} will no longer see it.`, ok: 'Take it back', danger: true, onOk: () => withdrawOffer(po.id) })} />
          ) : (
            <Big testID="wreq-price" title="Send your price" style={{ flex: 1 }} onPress={() => withAccount('send your price', () => openOffer({ postId: po.id }))} />
          )}
          <Round testID="wreq-chat" icon="chat" label={`Message ${f}`} size={56} plain bg={t.card2} onPress={() => po.client && openChat(po.client)} />
        </View>
      </View>
    </View>
  );
}
