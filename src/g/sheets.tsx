/* The bottom sheets of the two journeys, as in the design canvas:
   hiring: get prices, book, after a call, rate, a problem, cancel;
   working: send your price;
   both: your area, help, notifications, saved workers, and the chat's menus. */
import React, { useEffect, useState } from 'react';
import { Keyboard, Linking, Pressable, View } from 'react-native';
import { router } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { Image } from 'expo-image';
import { db } from '../data/db';
import { countryByIso } from '../data/countries';
import { supabase } from '../lib/supabase';
import { bump, useLive } from '../logic/live';
import { P, THREADS, cityLabel, fname, postById } from '../logic/core';
import { Place, gpsCity, searchCities, setCityManually } from '../logic/here';
import { NCAT_PREF } from '../logic/notify';
import { pickImage, pickDocument } from '../logic/media';
import { friendly } from '../logic/remote';
import {
  JobForm,
  REPORT_REASONS,
  acceptOffer,
  blockPerson,
  cancelBooking,
  bk,
  deleteChat,
  deleteMsg,
  muteChat,
  postJob,
  report,
  reportIssue,
  sendFile,
  sendHireRequest,
  sendLocation,
  sendOffer,
  sendPhoto,
  sendQuote,
  sendText,
  submitReview,
  toggleSave,
  trOther,
  updateJob,
} from '../logic/work';
import { WHENS, WHERES, Where, amount, areaLabel, hasArea, money, plural, titleOf, whenText, whereFor } from './data';
import { GIcon, GIconName } from './icons';
import { openChat } from './nav';
import { confirm, toast } from './notice';
import { Details, Hint, RadioRow, SwitchCard } from './parts';
import { withAccount } from './signin';
import { RED, STAR, ft, useG } from './theme';
import { tap } from './touch';
import { Big, Face, Ghost, Input, Label, Link, MenuRow, Pill, Round, SheetFoot, T, gsheet } from './ui';

/** Close the sheet, then do something once it has slid away. */
const then = (f: () => void) => {
  gsheet.close();
  setTimeout(f, 240);
};
const H = ({ children }: { children: React.ReactNode }) => (
  <T s={24} w={8} lh={1.2} ls={-0.5}>
    {children}
  </T>
);
const Sub = ({ children, mb = 16 }: { children: React.ReactNode; mb?: number }) => (
  <T s={14} lh={1.5} c="muted" style={{ marginTop: 6, marginBottom: mb }}>
    {children}
  </T>
);
const Small = ({ children, mt = 16 }: { children: React.ReactNode; mt?: number }) => (
  <T s={13} w={7} c="muted" style={{ marginTop: mt, marginBottom: 8 }}>
    {children}
  </T>
);
const Wrap = ({ children }: { children: React.ReactNode }) => <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{children}</View>;
/** A 40-high choice chip, as on the sheets of the design. */
function Opt({ label, on, onPress, testID }: { label: string; on: boolean; onPress: () => void; testID?: string }) {
  const t = useG();
  return (
    <Pressable testID={testID} accessibilityRole="button" accessibilityState={{ selected: on }} onPress={() => (tap(), onPress())} style={{ height: 40, paddingHorizontal: 14, borderRadius: 20, borderWidth: 1, borderColor: on ? RED : t.line, backgroundColor: on ? RED : t.card, justifyContent: 'center' }}>
      <T s={14} w={7} c={on ? '#ffffff' : t.text}>
        {label}
      </T>
    </Pressable>
  );
}

/* ====================================================================== get prices from several workers */
export type RequestFor = { trade: string; need: string; /** change a request already sent */ postId?: string };
/** "Get prices from plumbers near you": what, details, a photo, when and where. Sending needs an account. */
export function openRequest(o: RequestFor) {
  gsheet.show(() => <RequestSheet o={o} />);
}
function RequestSheet({ o }: { o: RequestFor }) {
  useLive();
  const t = useG();
  const old = o.postId ? postById(o.postId) : undefined;
  const [need, setNeed] = useState(old?.title || o.need);
  const [details, setDetails] = useState(old?.text || '');
  const [photo, setPhoto] = useState<string | null>(old?.photos?.[0] || null);
  const [when, setWhen] = useState(old ? WHENS.find(([k]) => whenText(old.when) === k || old.when === k)?.[0] || '' : 'As soon as possible');
  const [where, setWhere] = useState<Where>((old?.type as Where) && WHERES.some(([k]) => k === old?.type) ? (old!.type as Where) : whereFor(o.trade));
  const [busy, setBusy] = useState(false);
  const many = plural(o.trade);
  const place = hasArea() ? areaLabel() : '';
  const ok = need.trim().length >= 3 && (where === 'online' || !!place);
  const form = (): JobForm => ({
    title: titleOf(need),
    text: details.trim(),
    cat: o.trade,
    budget: '',
    neg: false,
    type: where,
    openings: 1,
    when: when || 'Flexible',
    time: '',
    area: where === 'online' ? 'Online' : place,
    urgent: when === 'As soon as possible',
    photos: photo ? [photo] : [],
    at: where === 'online' ? null : undefined,
  });
  const send = () => {
    if (!ok || busy) return;
    Keyboard.dismiss();
    if (old) {
      updateJob(old.id, form(), !when);
      return gsheet.close();
    }
    setBusy(true);
    gsheet.close();
    setTimeout(
      () =>
        withAccount('get prices', () => {
          const job = postJob(form());
          router.push(`/asked/${job.id}` as any);
        }),
      240,
    );
  };
  return (
    <View>
      <H>{old ? 'Change your request' : `Get prices from ${many} near you`}</H>
      <Sub>{old ? 'Workers who already have it see the new details.' : 'getit asks the closest ones first, then more if needed, and keeps you posted. You choose who to book.'}</Sub>
      <Label>What you need</Label>
      <Input testID="req-need" value={need} onChangeText={setNeed} maxLength={60} style={ft(16, 7, t.text)} />
      <View style={{ height: 14 }} />
      <Label>Details (optional)</Label>
      <Input testID="req-details" value={details} onChangeText={setDetails} placeholder="For example: water drips under the sink" maxLength={300} style={ft(15, 5, t.text)} />
      <Pressable
        testID="req-photo"
        accessibilityRole="button"
        onPress={async () => {
          tap();
          if (photo) return setPhoto(null);
          const p = await pickImage();
          if (p) setPhoto(p);
        }}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 12, paddingVertical: 12, paddingHorizontal: 14, borderRadius: 16, borderWidth: 2, borderStyle: 'dashed', borderColor: photo ? RED : t.line }}
      >
        {photo ? (
          <Image source={{ uri: photo.replace(/^uri:/, '') }} style={{ width: 40, height: 40, borderRadius: 12 }} contentFit="cover" />
        ) : (
          <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: t.tabOn, alignItems: 'center', justifyContent: 'center' }}>
            <GIcon name="camera" size={20} color={t.accent} />
          </View>
        )}
        <View style={{ flex: 1, gap: 2 }}>
          <T s={15} w={8}>
            {photo ? 'Photo added · tap to remove' : 'Add a photo'}
          </T>
          <T s={13} c="muted">
            A photo helps workers give the right price
          </T>
        </View>
      </Pressable>
      <Small>When?</Small>
      <Wrap>
        {WHENS.map(([k]) => (
          <Opt key={k} testID={`req-when-${k}`} label={k} on={when === k} onPress={() => setWhen(k)} />
        ))}
      </Wrap>
      {when ? (
        <T s={13} lh={1.45} c="muted" style={{ marginTop: 8 }}>
          {WHENS.find(([k]) => k === when)?.[1]}
        </T>
      ) : null}
      <Small>Where should it happen?</Small>
      <Wrap>
        {WHERES.map(([k, label]) => (
          <Opt key={k} testID={`req-where-${k}`} label={label} on={where === k} onPress={() => setWhere(k)} />
        ))}
      </Wrap>
      {where !== 'online' && !place ? (
        <Pressable testID="req-area" accessibilityRole="button" onPress={() => openArea(() => openRequest({ ...o, need }))} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12, paddingVertical: 12, paddingHorizontal: 14, borderRadius: 16, backgroundColor: t.tabOn }}>
          <GIcon name="pin" size={18} color={t.accent} />
          <T s={14} w={7} style={{ flex: 1 }}>
            Choose your area first, so we ask people near you
          </T>
          <GIcon name="chev" size={16} color={t.accent} />
        </Pressable>
      ) : (
        <Hint icon="pin" style={{ marginTop: 14 }}>
          {where === 'online' ? 'You work together by chat and calls on getit. Agree the price before any work starts.' : `Workers only see “${place}” until you book one of them. You give the exact place by chat or call.`}
        </Hint>
      )}
      <SheetFoot>
        <Big testID="req-send" title={old ? 'Save changes' : `Ask ${many} near you`} loading={busy} quiet={!ok} onPress={send} />
      </SheetFoot>
    </View>
  );
}

/* ====================================================================== book someone */
export type BookFor = {
  worker: string;
  /** what the job is */
  need: string;
  /** booking an offer they sent on my request: the request and the offer's place in its list */
  postId?: string;
  offer?: number;
};
/** "Book Emmanuel?": what, when and the price, then one button. An offer is booked at once;
    someone you agreed with by call or chat gets the booking to accept. */
export function openBook(o: BookFor) {
  withAccount(`book ${fname(P(o.worker).name)}`, () => gsheet.show(() => <BookSheet o={o} />));
}
function BookSheet({ o }: { o: BookFor }) {
  const t = useG();
  const p = P(o.worker);
  const f = fname(p.name);
  const po = o.postId ? postById(o.postId) : undefined;
  const off = po && o.offer != null ? po.offerList?.[o.offer] : undefined;
  const [need, setNeed] = useState(po?.title || o.need || '');
  const [when, setWhen] = useState('Today');
  const [price, setPrice] = useState('');
  const [busy, setBusy] = useState(false);
  const book = () => {
    if (busy) return;
    if (off && po) {
      setBusy(true);
      acceptOffer(po.id, o.offer!);
      // the job opens as soon as the booking is back from the server
      let n = 0;
      const wait = setInterval(() => {
        const b = db.BOOKINGS.find((x) => x.worker === o.worker && x.client === 'me' && x.state === 'booked');
        if (b || ++n > 24) {
          clearInterval(wait);
          gsheet.close();
          setTimeout(() => (b ? router.replace(`/track/${b.id}` as any) : router.replace('/jobs' as any)), 240);
        }
      }, 250);
      return;
    }
    if (need.trim().length < 3) return toast('Say what the job is, in a few words');
    Keyboard.dismiss();
    sendHireRequest(o.worker, titleOf(need), price ? `XAF ${(+price).toLocaleString('en-US')}` : 'Agreed by call', when);
    then(() => openChat(o.worker));
  };
  return (
    <View>
      <H>Book {f}?</H>
      {off ? (
        <Details sheet style={{ marginTop: 14 }} rows={[['What', po?.title], ['When', whenText(off.when)], ['Price', money(off.price)]]} />
      ) : (
        <>
          <Sub>{f} gets the booking and accepts it. Then you can follow the job, chat and rate it.</Sub>
          <Label>What</Label>
          <Input testID="book-need" value={need} onChangeText={setNeed} placeholder="For example: fix a leaking sink" maxLength={60} />
          <Small>When</Small>
          <Wrap>
            {['Today', 'Tomorrow', 'This week'].map((k) => (
              <Opt key={k} testID={`book-when-${k}`} label={k} on={when === k} onPress={() => setWhen(k)} />
            ))}
          </Wrap>
          <Small>The price you agreed (optional)</Small>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Input testID="book-price" value={price} onChangeText={(v) => setPrice(v.replace(/[^\d]/g, ''))} placeholder="0" keyboardType="number-pad" maxLength={8} style={{ flex: 1 }} />
            <T s={14} w={7} c="muted">
              FCFA
            </T>
          </View>
        </>
      )}
      <Hint icon="wallet" style={{ marginTop: 14 }}>
        You pay {f} directly when the job is done, in cash or by Mobile Money. getit takes nothing.
      </Hint>
      <Big testID="book-ok" title={`Book ${f}`} loading={busy} onPress={book} style={{ marginTop: 18 }} />
      <Link testID="book-no" title="Not yet" color="text" h={48} style={{ marginTop: 6 }} onPress={() => gsheet.close()} />
    </View>
  );
}

/** After a call ends: "How did the call go?" If they agreed, booking is one tap away. */
export function openAfterCall(worker: string, need = '') {
  const p = P(worker);
  if (!p?.name) return;
  const f = fname(p.name);
  gsheet.show(() => (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Face name={p.name} photo={p.photo} size={52} />
        <T s={22} w={8} lh={1.25} ls={-0.4} style={{ flex: 1 }}>
          How did the call with {f} go?
        </T>
      </View>
      <T s={14} lh={1.5} c="muted" style={{ marginTop: 10, marginBottom: 18 }}>
        If you agreed on the job, book it here. You can follow it, chat and rate it afterwards.
      </T>
      <Big testID="aftercall-book" title={`We agreed · book ${f}`} onPress={() => then(() => openBook({ worker, need }))} />
      <Ghost testID="aftercall-no" title="Not this time" style={{ marginTop: 10 }} onPress={() => gsheet.close()} />
    </View>
  ));
}

/* ====================================================================== when the job is over */
const TAGS_WORKER = ['On time', 'Great quality', 'Friendly', 'Fair price', 'Clean work', 'Good communication'];
const TAGS_CLIENT = ['Clear instructions', 'Paid on time', 'Friendly', 'Easy to reach', 'Respectful'];
const WORDS = ['Tap a star', 'Bad', 'Not good', 'Okay', 'Good', 'Excellent'];
/** Rate the other person of a finished job. `after` runs once it is sent (the thank-you screen). */
export function openRate(bookingId: string, after?: (stars: number) => void) {
  gsheet.show(() => <RateSheet id={bookingId} after={after} />);
}
function RateSheet({ id, after }: { id: string; after?: (stars: number) => void }) {
  const t = useG();
  const b = bk(id);
  const [stars, setStars] = useState(0);
  const [tags, setTags] = useState<string[]>([]);
  const [text, setText] = useState('');
  if (!b) return <H>This job is no longer here</H>;
  const other = trOther(b);
  const p = P(other);
  const f = fname(p.name);
  const iWork = b.worker === 'me';
  return (
    <View>
      <View style={{ alignItems: 'center' }}>
        <Face name={p.name} photo={p.photo} size={64} />
        <T s={24} w={8} ls={-0.5} center style={{ marginTop: 12 }}>
          {iWork ? `How was ${f} as a client?` : `How did ${f} do?`}
        </T>
        <View style={{ flexDirection: 'row', gap: 6, marginTop: 14 }}>
          {[1, 2, 3, 4, 5].map((n) => (
            <Pressable key={n} testID={`rate-${n}`} accessibilityRole="button" accessibilityLabel={`${n} ${n === 1 ? 'star' : 'stars'}`} accessibilityState={{ selected: n <= stars }} onPress={() => (tap(), setStars(n))} style={{ width: 52, height: 52, alignItems: 'center', justifyContent: 'center' }}>
              <GIcon name="star" size={40} color={n <= stars ? STAR : t.line} />
            </Pressable>
          ))}
        </View>
        <T s={15} w={8} c="accent" style={{ marginTop: 4 }}>
          {WORDS[stars]}
        </T>
      </View>
      <Small mt={18}>{stars && stars < 3 ? 'What went wrong?' : 'What went well?'}</Small>
      <Wrap>
        {(iWork ? TAGS_CLIENT : TAGS_WORKER).map((n) => (
          <Opt key={n} label={n} on={tags.includes(n)} onPress={() => setTags(tags.includes(n) ? tags.filter((x) => x !== n) : [...tags, n])} />
        ))}
      </Wrap>
      <View style={{ height: 16 }} />
      <Label>Anything else? (optional)</Label>
      <Input testID="rate-text" value={text} onChangeText={setText} placeholder="A few words for others" maxLength={300} style={ft(15, 5, t.text)} />
      <Big
        testID="rate-send"
        title="Send"
        quiet={!stars}
        style={{ marginTop: 18 }}
        onPress={() => {
          Keyboard.dismiss();
          submitReview(other, b.id, stars, tags, text);
          then(() => after?.(stars));
        }}
      />
    </View>
  );
}

const PROBLEMS = ['It’s still not fixed', 'The job isn’t finished', 'Something else got damaged', 'Something else'];
/** "Not yet, something's wrong": the worker is told at once and the job goes back to working. */
export function openProblem(bookingId: string) {
  gsheet.show(() => <ProblemSheet id={bookingId} />);
}
function ProblemSheet({ id }: { id: string }) {
  const b = bk(id);
  const [pick, setPick] = useState(PROBLEMS[0]);
  if (!b) return <H>This job is no longer here</H>;
  const f = fname(P(b.worker).name);
  return (
    <View>
      <H>What’s wrong?</H>
      <Sub mb={12}>{f} sees this straight away. Don’t pay until it’s sorted.</Sub>
      {PROBLEMS.map((n) => (
        <RadioRow key={n} testID={`problem-${n}`} label={n} on={pick === n} onPress={() => setPick(n)} />
      ))}
      <Big
        testID="problem-send"
        title={`Tell ${f}`}
        style={{ marginTop: 18 }}
        onPress={() => {
          reportIssue(b.id);
          void sendText(b.worker, `There’s a problem with the job: ${pick.charAt(0).toLowerCase() + pick.slice(1)}.`);
          gsheet.close();
        }}
      />
    </View>
  );
}

const WHY_CLIENT = ['I found someone else', 'I don’t need it any more', 'It’s taking too long', 'Something else'];
const WHY_WORKER = ['I can’t make it', 'It’s too far', 'An emergency', 'Something else'];
/** Cancel a booked job, with the reason. Free before the worker sets off. */
export function openCancel(bookingId: string) {
  gsheet.show(() => <CancelSheet id={bookingId} />);
}
function CancelSheet({ id }: { id: string }) {
  const b = bk(id);
  const [why, setWhy] = useState('');
  const [busy, setBusy] = useState(false);
  if (!b) return <H>This job is no longer here</H>;
  const iWork = b.worker === 'me';
  const other = trOther(b);
  const f = fname(P(other).name);
  return (
    <View>
      <H>Cancel this job?</H>
      <Sub mb={14}>{f} is told straight away. Why are you cancelling?</Sub>
      <Wrap>
        {(iWork ? WHY_WORKER : WHY_CLIENT).map((n) => (
          <Pill key={n} testID={`cancel-${n}`} label={n} on={why === n} onPress={() => setWhy(n)} />
        ))}
      </Wrap>
      <Big
        testID="cancel-ok"
        title="Cancel the job"
        danger
        loading={busy}
        style={{ marginTop: 20 }}
        onPress={async () => {
          setBusy(true);
          if (why) void sendText(other, `I had to cancel the job (${why.charAt(0).toLowerCase() + why.slice(1)}).`);
          await cancelBooking(b.id);
          gsheet.close();
          setTimeout(() => router.replace(`/cancelled?who=${encodeURIComponent(other)}&need=${encodeURIComponent(b.title)}&work=${iWork ? 1 : ''}` as any), 240);
        }}
      />
      <Link testID="cancel-keep" title="Keep the job" color="text" h={48} style={{ marginTop: 6 }} onPress={() => gsheet.close()} />
    </View>
  );
}

/* ====================================================================== the worker's price */
/** "Your price for Grace": a number, when you can come, a short note. For a request, or as a quote in a chat. */
export function openOffer(o: { postId?: string; chat?: string }) {
  gsheet.show(() => <OfferSheet o={o} />);
}
function OfferSheet({ o }: { o: { postId?: string; chat?: string } }) {
  const t = useG();
  const po = o.postId ? postById(o.postId) : undefined;
  const who = po?.client || o.chat || '';
  const f = fname(P(who)?.name || '');
  // my own price for this kind of job, when I gave one
  const mine = (db.PR.services || []).find((s) => s && +s.price > 0);
  const [price, setPrice] = useState(mine ? String(mine.price) : '');
  const [when, setWhen] = useState(po?.urgent ? 'Now' : 'Today');
  const [note, setNote] = useState('');
  const [job, setJob] = useState(po?.title || THREADS()[who]?.job || '');
  const base = amount(price) || amount(mine?.price) || 5000;
  const chips = [...new Set([0.8, 1, 1.25, 1.5].map((k) => Math.max(500, Math.round((base * k) / 500) * 500)))];
  const n = amount(price);
  const send = () => {
    if (!n) return;
    Keyboard.dismiss();
    const key = when === 'Now' || when === 'In 1 hour' ? 'Today' : when;
    const time = when === 'Now' ? 'now' : when === 'In 1 hour' ? 'in 1 hour' : '';
    if (po) {
      sendOffer(po.id, String(n), time ? `Today, ${time}` : key, note, null);
      return then(() => router.replace(`/wsent?id=${po.id}` as any));
    }
    if (job.trim().length < 3) return toast('Say what the job is, in a few words');
    sendQuote(who, titleOf(job), String(n), time ? `Today, ${time}` : key, 'worker');
    gsheet.close();
  };
  return (
    <View>
      <H>Your price{f ? ` for ${f}` : ''}</H>
      {!po ? (
        <>
          <View style={{ height: 14 }} />
          <Label>The job</Label>
          <Input testID="offer-job" value={job} onChangeText={setJob} placeholder="For example: fix a leaking sink" maxLength={60} />
        </>
      ) : null}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 14, height: 64, paddingHorizontal: 18, borderRadius: 20, backgroundColor: t.card2, borderWidth: 2, borderColor: RED }}>
        <Input testID="offer-price" accessibilityLabel="Your price in FCFA" value={price ? (+price).toLocaleString('en-US') : ''} onChangeText={(v) => setPrice(v.replace(/[^\d]/g, '').slice(0, 8))} placeholder="0" keyboardType="number-pad" autoFocus={!price} style={[ft(28, 8, t.text), { flex: 1, height: 60, borderWidth: 0, backgroundColor: 'transparent', paddingHorizontal: 0 }]} />
        <T s={16} w={8} c="muted">
          FCFA
        </T>
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
        {chips.map((c) => (
          <Opt key={c} label={c.toLocaleString('en-US')} on={n === c} onPress={() => setPrice(String(c))} />
        ))}
      </View>
      <Small mt={18}>When can you come?</Small>
      <Wrap>
        {['Now', 'In 1 hour', 'Today', 'Tomorrow'].map((k) => (
          <Opt key={k} testID={`offer-when-${k}`} label={k} on={when === k} onPress={() => setWhen(k)} />
        ))}
      </Wrap>
      {po ? (
        <>
          <View style={{ height: 16 }} />
          <Label>A short note (optional)</Label>
          <Input testID="offer-note" value={note} onChangeText={setNote} placeholder="For example: I have the parts" maxLength={200} style={ft(15, 5, t.text)} />
        </>
      ) : null}
      <Big testID="offer-send" title="Send offer" quiet={!n} onPress={send} style={{ marginTop: 18 }} />
    </View>
  );
}

/* ====================================================================== your area */
/** Where you are: from the phone, or a town you type, plus your neighbourhood. `after` runs once it is saved. */
export function openArea(after?: () => void) {
  gsheet.show(() => <AreaSheet after={after} />);
}
function AreaSheet({ after }: { after?: () => void }) {
  useLive();
  const t = useG();
  const [q, setQ] = useState('');
  const [found, setFound] = useState<Place[]>([]);
  const [busy, setBusy] = useState(false);
  const [home, setHome] = useState(db.PR.area?.home || '');
  const [err, setErr] = useState('');
  const iso = (db.user.country || '').toUpperCase() || undefined;
  const typed = q.trim().replace(/\s+/g, ' ');
  useEffect(() => {
    if (typed.length < 2) return setFound([]);
    let live = true;
    const x = setTimeout(async () => {
      const r = await searchCities(typed);
      if (live) setFound(r);
    }, 280);
    return () => {
      live = false;
      clearTimeout(x);
    };
  }, [typed]);
  const city = cityLabel();
  const saveHome = () => {
    const h = home.trim().replace(/\s+/g, ' ');
    if (h !== (db.PR.area?.home || '')) {
      db.PR.area = { ...db.PR.area, home: h, areas: h ? [h] : [] };
      bump();
    }
  };
  const done = () => {
    saveHome();
    Keyboard.dismiss();
    gsheet.close();
    if (after) setTimeout(after, 260);
  };
  const here = async () => {
    setBusy(true);
    setErr('');
    const p = await gpsCity();
    setBusy(false);
    if (typeof p === 'string') return setErr(p === 'off' ? 'Location is off on this phone. Turn it on, or type your town below.' : p === 'unknown' ? 'We couldn’t find where you are. Type your town below.' : 'getit isn’t allowed to use your location. Type your town below, or allow it in your phone’s settings.');
    setQ('');
  };
  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <H>Your area</H>
        <Round icon="x" label="Close" bg={t.card2} onPress={() => (saveHome(), gsheet.close())} />
      </View>
      <Sub>getit shows people near you. Others only ever see your area, never your address.</Sub>
      <Pressable testID="area-here" accessibilityRole="button" onPress={() => (tap(), void here())} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 14, borderRadius: 18, backgroundColor: t.tabOn }}>
        <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: RED, alignItems: 'center', justifyContent: 'center' }}>
          <GIcon name="pin" size={20} color="#ffffff" />
        </View>
        <View style={{ flex: 1 }}>
          <T s={15} w={8}>
            {busy ? 'Finding you…' : 'Use where I am now'}
          </T>
          <T s={13} c="muted" lines={1}>
            {city ? `Now: ${city}${db.user.country && countryByIso(db.user.country) ? ', ' + countryByIso(db.user.country)!.name : ''}` : 'Found from your phone'}
          </T>
        </View>
      </Pressable>
      {err ? (
        <T s={13} w={7} c="accent" style={{ marginTop: 8 }}>
          {err}
        </T>
      ) : null}
      <View style={{ height: 16 }} />
      <Label>Or type your town or city</Label>
      <Input testID="area-city" value={q} onChangeText={setQ} placeholder={city || 'For example: Buea'} autoCapitalize="words" autoCorrect={false} returnKeyType="search" />
      {found.length ? (
        <View style={{ marginTop: 8, borderRadius: 16, backgroundColor: t.card2, overflow: 'hidden' }}>
          {found.map((p, i) => (
            <Pressable
              key={p.city + (p.region || '') + i}
              testID={`area-hit-${i}`}
              accessibilityRole="button"
              onPress={() => {
                tap();
                setCityManually(p.city, p.iso || iso, undefined, p.coord);
                setQ('');
                setFound([]);
                Keyboard.dismiss();
              }}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 48, paddingHorizontal: 14, borderTopWidth: i ? 1 : 0, borderTopColor: t.line }}
            >
              <GIcon name="pin" size={16} color={t.accent} />
              <T s={15} w={7} lines={1} style={{ flex: 1 }}>
                {p.city}
                {p.region && p.region !== p.city ? <T s={13} c="muted">{`  ${p.region}`}</T> : null}
              </T>
            </Pressable>
          ))}
        </View>
      ) : typed.length >= 2 ? (
        <Link testID="area-use-typed" title={`Use “${typed}”`} onPress={() => (setCityManually(typed, iso), setQ(''), Keyboard.dismiss())} style={{ alignSelf: 'flex-start', marginTop: 4 }} />
      ) : null}
      <View style={{ height: 16 }} />
      <Label>Your neighbourhood or postcode (optional)</Label>
      <Input testID="area-home" value={home} onChangeText={setHome} placeholder="For example: Molyko" autoCapitalize="words" maxLength={40} onBlur={saveHome} />
      <Big testID="area-done" title="Done" quiet={!cityLabel() && !home.trim()} onPress={done} style={{ marginTop: 18 }} />
    </View>
  );
}

/* ====================================================================== help, notifications, saved */
/** Write to getit. */
export function openHelp() {
  gsheet.show(() => <HelpSheet />);
}
function HelpSheet() {
  const t = useG();
  const [topic, setTopic] = useState('Question');
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const send = async () => {
    if (body.trim().length < 5 || busy) return;
    if (!db.loggedIn) return toast('Sign in first, so we can answer you');
    setBusy(true);
    const { error } = await supabase.from('feedback').insert({ topic, body: body.trim(), app_version: `${process.env.EXPO_PUBLIC_BUILD || 'dev'}` });
    setBusy(false);
    if (error) return toast(friendly(error));
    Keyboard.dismiss();
    gsheet.close();
    toast('Sent. We answer in your Inbox, under Updates');
  };
  return (
    <View>
      <H>Help and feedback</H>
      <Sub>Tell us what went wrong or what you’d like. A person at getit reads every message.</Sub>
      <Wrap>
        {['Question', 'Problem', 'Idea'].map((k) => (
          <Opt key={k} label={k} on={topic === k} onPress={() => setTopic(k)} />
        ))}
      </Wrap>
      <View style={{ height: 14 }} />
      <Input testID="help-text" value={body} onChangeText={setBody} placeholder="Write here" multiline maxLength={1000} h={120} style={[ft(15, 5, t.text), { paddingTop: 14, textAlignVertical: 'top' }]} />
      <Big testID="help-send" title="Send to getit" loading={busy} quiet={body.trim().length < 5} onPress={send} style={{ marginTop: 16 }} />
    </View>
  );
}

const NOTIF_SETS: [keyof typeof NCAT_PREF, string, string][] = [
  ['jobs', 'Jobs', 'Offers, bookings and each step of a job'],
  ['messages', 'Messages', 'New messages and missed calls'],
  ['reminders', 'Reminders', 'Before a job starts, and when one needs you'],
  ['news', 'News from getit', 'What’s new, a few times a year'],
];
/** Which notifications reach this phone. */
export function openNotifs() {
  gsheet.show(() => <NotifSheet />);
}
function NotifSheet() {
  useLive();
  return (
    <View>
      <H>Notifications</H>
      <Sub>Calls always ring. Choose what else reaches you.</Sub>
      <View style={{ gap: 10 }}>
        {NOTIF_SETS.map(([cat, title, sub]) => {
          const i = NCAT_PREF[cat];
          const on = (db.PREF.notif as number[])[i] !== 0;
          return (
            <SwitchCard
              key={cat}
              testID={`notif-${cat}`}
              title={title}
              sub={sub}
              on={on}
              onChange={(v) => {
                (db.PREF.notif as number[])[i] = v ? 1 : 0;
                bump();
                if (db.uid) void supabase.from('notification_prefs').upsert({ user_id: db.uid, category: cat, enabled: v });
              }}
            />
          );
        })}
      </View>
      <Link title="Phone settings for getit" onPress={() => void Linking.openSettings().catch(() => {})} style={{ marginTop: 8 }} />
    </View>
  );
}

/** Workers you saved, one tap from calling them again. */
export function openSaved() {
  gsheet.show(() => <SavedSheet />);
}
function SavedSheet() {
  useLive();
  const t = useG();
  const ids = (db.saved as string[]).filter((id) => P(id)?.name);
  return (
    <View>
      <H>Saved workers</H>
      {ids.length ? (
        <View style={{ marginTop: 8 }}>
          {ids.map((id) => {
            const p = P(id);
            return (
              <Pressable key={id} accessibilityRole="button" onPress={() => then(() => router.push(`/profile/${id}` as any))} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 68, borderBottomWidth: 1, borderBottomColor: t.line }}>
                <Face name={p.name} photo={p.photo} size={48} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <T s={15} w={8} lines={1}>
                    {p.name}
                  </T>
                  <T s={13} c="muted" lines={1}>
                    {[p.role !== 'Member' ? p.role : '', p.rate ? `${p.rate.toFixed(1)} ★` : 'New on getit'].filter(Boolean).join(' · ')}
                  </T>
                </View>
                <Round icon="heart" label={`Remove ${p.name} from saved`} plain bg={t.card2} color={RED} onPress={() => toggleSave(id)} />
              </Pressable>
            );
          })}
        </View>
      ) : (
        <Sub>Tap the heart on a worker’s profile to keep them here.</Sub>
      )}
    </View>
  );
}

/* ====================================================================== chat */
const Row = ({ icon, label, sub, onPress, color, testID }: { icon: GIconName; label: string; sub?: string; onPress: () => void; color?: string; testID?: string }) => {
  const t = useG();
  return (
    <Pressable testID={testID} accessibilityRole="button" onPress={() => (tap(), onPress())} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 60, borderBottomWidth: 1, borderBottomColor: t.line, opacity: pressed ? 0.7 : 1 })}>
      <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: t.tabOn, alignItems: 'center', justifyContent: 'center' }}>
        <GIcon name={icon} size={20} color={color || t.accent} />
      </View>
      <View style={{ flex: 1 }}>
        <T s={15} w={8} c={color}>
          {label}
        </T>
        {sub ? (
          <T s={13} c="muted">
            {sub}
          </T>
        ) : null}
      </View>
    </Pressable>
  );
};
/** The plus in a chat: a photo, the camera, a file, where I am. */
export function openAttach(id: string) {
  gsheet.show(() => (
    <View>
      <H>Send to {fname(P(id).name)}</H>
      <View style={{ marginTop: 8 }}>
        <Row testID="attach-photo" icon="image" label="A photo" sub="From your gallery" onPress={() => then(async () => { const p = await pickImage(); if (p) void sendPhoto(id, p); })} />
        <Row testID="attach-camera" icon="camera" label="Take a photo" onPress={() => then(async () => { const p = await pickImage({ camera: true }); if (p) void sendPhoto(id, p); })} />
        <Row testID="attach-file" icon="download" label="A file" sub="A PDF or a document" onPress={() => then(async () => { const f = await pickDocument(); if (f) void sendFile(id, f.name, f.size, f.uri, f.mime); })} />
        <Row testID="attach-place" icon="pin" label="Where I am" sub="Shares your position once, in this chat only" onPress={() => then(() => void sendLocation(id))} />
      </View>
    </View>
  ));
}
/** The three dots in a chat: book, mute, report, block, delete. */
export function openChatMenu(id: string) {
  gsheet.show(() => <ChatMenu id={id} />);
}
function ChatMenu({ id }: { id: string }) {
  useLive();
  const t = useG();
  const p = P(id);
  const f = fname(p.name);
  const th = THREADS()[id];
  const [reporting, setReporting] = useState(false);
  if (reporting)
    return (
      <View>
        <H>Report {f}</H>
        <Sub mb={8}>Only getit’s team sees this. {f} isn’t told who reported.</Sub>
        {REPORT_REASONS.map(([k, label]) => (
          <MenuRow key={k} label={label} onPress={() => (gsheet.close(), void report('profile', id, k))} />
        ))}
      </View>
    );
  return (
    <View>
      <H>{p.name}</H>
      <View style={{ marginTop: 8 }}>
        <Row testID="chat-menu-profile" icon="user" label="See profile" onPress={() => then(() => router.push(`/profile/${id}` as any))} />
        <Row testID="chat-menu-mute" icon="bell" label={th?.muted ? 'Turn notifications back on' : 'Mute this chat'} onPress={() => (muteChat(id, !th?.muted), gsheet.close())} />
        <Row testID="chat-menu-report" icon="warn" label="Report" sub="Scam, spam, or something that isn’t right" onPress={() => setReporting(true)} />
        <Row testID="chat-menu-block" icon="x" label={`Block ${f}`} sub="They can no longer call or message you" color={t.danger} onPress={() => then(() => confirm({ title: `Block ${f}?`, text: 'They won’t be told. You can unblock them later from Help.', ok: 'Block', danger: true, onOk: () => (blockPerson(id), router.back()) }))} />
        <Row testID="chat-menu-delete" icon="x" label="Delete this chat" color={t.danger} onPress={() => then(() => confirm({ title: 'Delete this chat?', text: 'It disappears from your Inbox. The other person keeps their copy.', ok: 'Delete', danger: true, onOk: () => (deleteChat(id), router.back()) }))} />
      </View>
    </View>
  );
}
/** Press and hold a message: copy it or delete it. */
export function openMsgMenu(id: string, i: number) {
  const m = THREADS()[id]?.msgs[i];
  if (!m || m.d || m.sys) return;
  const mine = m.f === 'me';
  gsheet.show(() => (
    <View>
      <H>Message</H>
      <View style={{ marginTop: 8 }}>
        {m.t ? <Row icon="check" label="Copy the text" onPress={() => (void Clipboard.setStringAsync(m.t || ''), gsheet.close(), toast('Copied'))} /> : null}
        <Row icon="x" label="Delete for me" onPress={() => (deleteMsg(id, i, false), gsheet.close())} />
        {mine && m.id ? <Row icon="x" label="Delete for everyone" onPress={() => (deleteMsg(id, i, true), gsheet.close())} /> : null}
      </View>
    </View>
  ));
}

/* ====================================================================== your account */
/** Your name, how you sign in, and the way out for good. */
export function openAccount() {
  gsheet.show(() => <AccountSheet />);
}
function AccountSheet() {
  useLive();
  const [name, setName] = useState(db.user.name || '');
  const [busy, setBusy] = useState(false);
  const save = () => {
    const n = name.trim().replace(/\s+/g, ' ');
    if (n.length >= 2 && n !== db.user.name) {
      db.user.name = n;
      bump();
      toast('Name saved');
    }
    Keyboard.dismiss();
    gsheet.close();
  };
  const remove = () =>
    then(() =>
      confirm({
        title: 'Delete your account?',
        text: 'Your profile, chats, jobs and reviews are removed for good. This can’t be undone.',
        ok: 'Delete my account',
        cancel: 'Keep my account',
        danger: true,
        onOk: async () => {
          setBusy(true);
          const { deleteAccount } = require('../logic/remote');
          const e = await deleteAccount();
          if (e) return toast(e);
          await require('../logic/account').logout();
          require('./data').forgetStarted();
          router.replace('/intro' as any);
        },
      }),
    );
  return (
    <View>
      <H>Your account</H>
      <View style={{ height: 14 }} />
      <Label>Your name</Label>
      <Input testID="account-name" value={name} onChangeText={setName} autoCapitalize="words" maxLength={40} />
      {db.user.contact ? (
        <>
          <View style={{ height: 14 }} />
          <Label>You sign in with</Label>
          <T s={16} w={7}>
            {db.user.contact}
          </T>
        </>
      ) : null}
      <Big testID="account-save" title="Save" loading={busy} quiet={name.trim().length < 2} onPress={save} style={{ marginTop: 18 }} />
      <Link testID="account-delete" title="Delete my account" color="danger" h={48} style={{ marginTop: 6 }} onPress={remove} />
    </View>
  );
}
/** A message from the getit team, read in full. */
export function openTeamNote(title: string, body: string) {
  gsheet.show(() => (
    <View>
      <H>{title}</H>
      <T s={15} lh={1.55} style={{ marginTop: 10 }}>
        {body}
      </T>
      <Ghost title="Reply to getit" style={{ marginTop: 18 }} onPress={() => then(openHelp)} />
    </View>
  ));
}

/* ====================================================================== a new job, while the app is open */
/** "New job near you": what, roughly where, when and who, with one button to see it. */
export function openJobAlert(postId: string) {
  const po = postById(postId);
  if (!po || po.mine) return;
  const c = P(po.client || '');
  gsheet.show(() => <JobAlert id={postId} />);
  void c;
}
function JobAlert({ id }: { id: string }) {
  const t = useG();
  const po = postById(id);
  if (!po) return null;
  const c = P(po.client || '');
  const chips = [po.area, po.urgent ? 'As soon as possible' : whenText(po.when), c?.name ? `${c.name}${c.rate ? ` · ${c.rate.toFixed(1)} ★` : ''}` : ''].filter(Boolean) as string[];
  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: RED }} />
        <T s={13} w={8} c="accent">
          New job near you
        </T>
      </View>
      <T s={26} w={8} lh={1.2} ls={-0.6} style={{ marginTop: 8 }}>
        {po.title || po.cat}
      </T>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
        {chips.map((x) => (
          <View key={x} style={{ height: 34, paddingHorizontal: 12, borderRadius: 17, backgroundColor: t.card2, justifyContent: 'center' }}>
            <T s={13} w={7}>
              {x}
            </T>
          </View>
        ))}
      </View>
      <T s={14} lh={1.5} c="muted" style={{ marginTop: 12 }}>
        {po.text ? `“${po.text}” ` : ''}Other {plural(po.cat || 'worker')} nearby can see this too.
      </T>
      <Big testID="alert-see" title="See the job" style={{ marginTop: 16 }} onPress={() => then(() => router.push(`/wrequest/${id}` as any))} />
      <Link testID="alert-later" title="Not now" color="text" h={48} style={{ marginTop: 6 }} onPress={() => gsheet.close()} />
    </View>
  );
}
