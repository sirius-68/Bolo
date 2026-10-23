import React from 'react';
import { Pressable, View } from 'react-native';
import { db, Post, Opp, Mentorship, Reel } from '../data/db';
import { catIcon } from '../data/catalog';
import { Avatar, CoTag, Pict, Pill, Rate, StatusPill, Txt, Verified, Meta, tap } from '../ui/kit';
import { Icon } from '../ui/Icon';
import { C, R, S } from '../ui/theme';
import { P, isW, k, oppBiz, mOwner, has, WORKERS, fname, myPhoto, meAs } from '../logic/core';
import { follow, hireState, isSaved, likePost, saveToggle, toggleSave } from '../logic/work';
import { openProfile } from '../logic/nav';
import { openJob, openHire, openComments, sharePost, openMedia } from '../sheets/work';
import { openOpp, openMentor } from '../sheets/career';

const hireLabel = (id: string) => ({ none: 'Hire', requested: 'Requested', booked: 'Booked ✓' })[hireState(id)];

/* ------------------------- small worker card (home rail) ------------------------- */
export function WorkerCard({ id }: { id: string }) {
  const p = P(id);
  const st = hireState(id);
  return (
    <Pressable onPress={() => openProfile(id)} style={({ pressed }) => ({ width: 272, flexDirection: 'row', gap: 14, padding: 10, borderRadius: 20, backgroundColor: pressed ? C.s2 : C.s1, borderWidth: 1, borderColor: C.line })}>
      <Pict pic={p.photo} style={{ width: 92, height: 100, borderRadius: 14, backgroundColor: C.orange }} />
      <View style={{ flex: 1, justifyContent: 'center', gap: 2 }}>
        <View style={S.row}>
          <Txt s={15} w={8} lines={1} style={{ flexShrink: 1 }}>
            {p.name}
          </Txt>
          {p.verified ? <Verified /> : null}
        </View>
        <Meta parts={[p.role, `${p.years} years`]} />
        <Meta parts={[<Rate key="r" r={p.rate} />, p.dist]} />
        <Pill title={hireLabel(id)} on={st !== 'none'} onPress={() => openHire(id)} style={{ marginTop: 8, alignSelf: 'flex-start' }} />
      </View>
    </Pressable>
  );
}

/* ------------------------- big recommended card (person) ------------------------- */
export function RecCard({ id, i }: { id: string; i: number }) {
  const p = P(id);
  const alt = i % 2 === 1;
  const bg = alt ? C.lav : C.yellow;
  const others = WORKERS()
    .filter((x) => x !== id)
    .slice(i % 10, (i % 10) + 3);
  const saved = has(db.saved, id);
  const st = hireState(id);
  return (
    <Pressable onPress={() => openProfile(id)} style={({ pressed }) => ({ width: 280, padding: 16, borderRadius: 24, backgroundColor: bg, transform: [{ translateY: pressed ? 1 : 0 }] })}>
      <View style={[S.row, { gap: 10 }]}>
        <Avatar pic={p.pin} size={40} ring="#fff" />
        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={S.row}>
            <Txt s={13} w={8} c="#000" lines={1} style={{ flexShrink: 1 }}>
              {p.name}
            </Txt>
            {p.verified ? <Icon name="verified" size={15} color={C.blue} style={{ marginLeft: 4 }} /> : null}
          </View>
          <View style={[S.row, { gap: 3, opacity: 0.7 }]}>
            <Icon name="pin" size={12} color="#000" />
            <Txt s={11} w={6} c="#000" lines={1}>
              {p.area} · {p.dist}
            </Txt>
          </View>
        </View>
        <Pressable accessibilityLabel={saved ? `Unsave ${p.name}` : `Save ${p.name}`} hitSlop={6} onPress={() => toggleSave(id)} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: saved ? '#000' : 'rgba(0,0,0,.08)', alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="bookmark" size={18} color={saved ? bg : '#000'} />
        </Pressable>
      </View>
      <Txt s={22} w={8} c="#000" style={{ marginTop: 14, marginBottom: 10 }} lines={1}>
        {p.role}
      </Txt>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        {[`${p.years} years`, p.tag, p.rate >= 4.7 ? 'Top rated' : p.verified ? 'Verified' : null]
          .filter(Boolean)
          .map((t) => (
            <View key={t as string} style={{ height: 26, paddingHorizontal: 10, borderRadius: 999, backgroundColor: 'rgba(0,0,0,.08)', justifyContent: 'center' }}>
              <Txt s={11} w={7} c="#000">
                {t}
              </Txt>
            </View>
          ))}
      </View>
      <View style={{ height: 1.5, backgroundColor: 'rgba(0,0,0,.12)', marginTop: 14, marginBottom: 12 }} />
      <View style={[S.row, { gap: 8 }]}>
        <View style={[S.row, { flex: 1 }]}>
          {others.map((o, j) => (
            <Avatar key={o} pic={P(o).pin} size={26} ring={bg} style={{ marginLeft: j ? -8 : 0 }} />
          ))}
          <Txt s={10} w={7} c="#000" style={{ opacity: 0.7, marginLeft: 6, lineHeight: 12 }}>
            {p.reviews}
            {'\n'}reviews
          </Txt>
        </View>
        <View style={[S.row, { gap: 3 }]}>
          <Txt s={15} w={8} c="#000">
            {p.rate}
          </Txt>
          <Icon name="star" size={14} color="#000" />
        </View>
        <Pill title={hireLabel(id)} kind="black" on={st !== 'none'} onPress={() => openHire(id)} />
      </View>
    </Pressable>
  );
}

/* ------------------------- job card (rail) ------------------------- */
export function JobCard({ po, i }: { po: Post; i: number }) {
  const c = P(po.client!);
  const alt = i % 2 === 1;
  const bg = alt ? C.lav : C.yellow;
  const off = db.myOffers[po.id];
  const match = isW() && db.user.skills.includes(po.cat!);
  const saved = has(db.savedJobs, po.id);
  return (
    <Pressable onPress={() => openJob(po.id)} style={({ pressed }) => ({ width: 280, padding: 16, borderRadius: 24, backgroundColor: bg, transform: [{ translateY: pressed ? 1 : 0 }] })}>
      <View style={[S.row, { gap: 10 }]}>
        <Avatar pic={c.photo} size={40} ring="#fff" square={!!c.biz} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Txt s={13} w={8} c="#000" lines={1}>
            {c.name}
          </Txt>
          <View style={[S.row, { gap: 3, opacity: 0.7 }]}>
            <Icon name="pin" size={12} color="#000" />
            <Txt s={11} w={6} c="#000" lines={1}>
              {po.area} · {po.time}
            </Txt>
          </View>
        </View>
        <Pressable accessibilityLabel={saved ? 'Unsave job' : 'Save job'} hitSlop={6} onPress={() => saveToggle('savedJobs', po.id, 'Job')} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: saved ? '#000' : 'rgba(0,0,0,.08)', alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="bookmark" size={18} color={saved ? bg : '#000'} />
        </Pressable>
      </View>
      <Txt s={20} w={8} c="#000" style={{ marginTop: 14, marginBottom: 10, lineHeight: 24 }} lines={2}>
        {po.title}
      </Txt>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        {[po.cat, po.when, po.urgent ? 'Urgent' : match ? 'Matches you' : null].filter(Boolean).map((t) => (
          <View key={t as string} style={{ height: 26, paddingHorizontal: 10, borderRadius: 999, backgroundColor: t === 'Urgent' ? C.err : 'rgba(0,0,0,.08)', justifyContent: 'center' }}>
            <Txt s={11} w={7} c={t === 'Urgent' ? '#fff' : '#000'}>
              {t}
            </Txt>
          </View>
        ))}
      </View>
      <View style={{ height: 1.5, backgroundColor: 'rgba(0,0,0,.12)', marginTop: 14, marginBottom: 12 }} />
      <View style={[S.row, { gap: 8 }]}>
        <View style={{ flex: 1 }}>
          <Txt s={14} w={8} c="#000" lines={1}>
            {po.budget}
          </Txt>
          <Txt s={11} w={6} c="#000" style={{ opacity: 0.7 }}>
            {(po.offers || 0) + (off ? 1 : 0)} {po.biz ? 'applicants' : 'offers'} so far
          </Txt>
        </View>
        <Pill kind="black" on={!!off} title={off ? (off.state === 'acc' ? (po.biz ? 'Shortlisted ✓' : 'Booked ✓') : po.biz ? 'Applied ✓' : 'Offer sent ✓') : po.biz ? 'Apply' : 'Send offer'} onPress={() => openJob(po.id)} />
      </View>
    </Pressable>
  );
}

/* ------------------------- job post in the feed ------------------------- */
export function ReqPost({ po }: { po: Post }) {
  const mine = !!po.mine;
  const c = mine ? meAs(po.as, po.biz) : P(po.client!);
  const off = db.myOffers[po.id];
  const n = mine ? po.offerList!.length : (po.offers || 0) + (off ? 1 : 0);
  const saved = has(db.savedJobs, po.id);
  const isBizPost = !!c?.biz && !mine;
  const btn = mine
    ? po.booked
      ? 'View booking'
      : n
        ? po.as === 'business'
          ? 'View applicants'
          : 'View offers'
        : 'View job'
    : off
      ? off.state === 'acc'
        ? po.biz
          ? 'Shortlisted ✓'
          : 'Booked ✓'
        : po.biz
          ? 'Applied ✓'
          : 'Offer sent ✓'
      : !isW()
        ? 'View job'
        : po.biz
          ? 'Apply now'
          : 'Send an offer';
  return (
    <View style={{ borderRadius: 24, backgroundColor: C.s1, borderWidth: 1, borderColor: C.line, overflow: 'hidden' }}>
      <View style={[S.row, { gap: 12, padding: 14, paddingBottom: 10 }]}>
        <Pressable onPress={() => !mine && openProfile(po.client!)}>
          <Avatar pic={c.photo} size={42} square={!!c.biz} />
        </Pressable>
        <Pressable style={{ flex: 1, minWidth: 0 }} onPress={() => !mine && openProfile(po.client!)}>
          <View style={[S.row, { flexWrap: 'nowrap' }]}>
            <Txt s={14} w={8} lines={1} style={{ flexShrink: 1 }}>
              {mine ? (po.as === 'business' ? 'Your vacancy' : 'Your job') : c.name}
            </Txt>
            {isBizPost ? <Verified /> : null}
            {isBizPost ? <CoTag /> : null}
            <Txt s={12} c={C.muted} style={{ marginLeft: 6 }} lines={1}>
              {mine ? `· ${po.cat}` : isBizPost ? 'is hiring' : 'needs help'}
            </Txt>
          </View>
          <Meta parts={[po.area, po.time]} />
        </Pressable>
        {po.urgent && !mine ? <StatusPill kind="urg" text="Urgent" /> : null}
        {po.booked ? <StatusPill kind="acc" text="Booked" /> : null}
        {!mine ? (
          <Pressable accessibilityLabel={saved ? 'Unsave job' : 'Save job'} hitSlop={6} onPress={() => saveToggle('savedJobs', po.id, 'Job')} style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: saved ? C.yellow : C.s2, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="bookmark" size={16} color={saved ? '#000' : '#fff'} />
          </Pressable>
        ) : null}
      </View>
      <Pressable onPress={() => openJob(po.id)} style={{ marginHorizontal: 12, marginBottom: 12, borderRadius: 18, backgroundColor: C.s2, borderWidth: 1, borderColor: '#2c2c30', padding: 16 }}>
        <View style={{ flexDirection: 'row', alignSelf: 'flex-start', alignItems: 'center', gap: 6, height: 24, paddingHorizontal: 10, borderRadius: 999, backgroundColor: C.s3 }}>
          <Icon name={catIcon(po.cat)} size={13} color={C.lav} />
          <Txt s={11} w={8} c={C.lav}>
            {po.biz ? `${po.type} · ${po.cat}` : `${po.cat} needed`}
          </Txt>
        </View>
        <Txt s={18} w={8} c={C.text} style={{ marginTop: 10, lineHeight: 22 }}>
          {po.title}
        </Txt>
        {po.text && po.text !== po.title ? (
          <Txt s={14} w={5} c="#c9c9cf" style={{ marginTop: 6 }} lines={3}>
            {po.text}
          </Txt>
        ) : null}
        <View style={{ height: 12 }} />
        {(po.photos || []).length ? (
          <View style={{ flexDirection: 'row', gap: 6, marginBottom: 12 }}>
            {po.photos!.map((s) => (
              <Pict key={s} pic={s} style={{ flex: 1, aspectRatio: 1, borderRadius: 10 }} />
            ))}
          </View>
        ) : null}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          {(
            [
              po.type && !po.biz ? ['job', po.type] : null,
              ['money', po.budget],
              ['clock', po.when],
              ['pin', po.area],
            ].filter(Boolean) as [string, string][]
          ).map(([ic, t]) => (
            <View key={ic} style={[S.row, { gap: 5, height: 28, paddingHorizontal: 10, borderRadius: 999, backgroundColor: C.s3 }]}>
              <Icon name={ic} size={14} color="#b9b9c0" />
              <Txt s={12} w={7} c="#e6e6ea" lines={1}>
                {t}
              </Txt>
            </View>
          ))}
        </View>
        <View style={[S.rowB, { marginTop: 14, gap: 10 }]}>
          <Txt s={12} w={7} c={C.muted} style={{ flex: 1 }} lines={1}>
            {n} {po.biz ? (n === 1 ? 'applicant' : 'applicants') : n === 1 ? 'offer' : 'offers'}
            {isW() && !mine && db.user.skills.includes(po.cat!) ? ' · Matches your skills' : ''}
          </Txt>
          <Pill kind="white" on={!!off} title={btn} onPress={() => openJob(po.id)} />
        </View>
      </Pressable>
    </View>
  );
}

/* ------------------------- social post (work, photos, availability) ------------------------- */
export function PostCard({ po }: { po: Post }) {
  if (po.kind === 'request') return <ReqPost po={po} />;
  const self = po.by === 'me';
  const p = self ? meAs(po.as, po.biz) : P(po.by!);
  if (!p) return null;
  const liked = has(db.liked, po.id);
  const saved = has(db.savedPosts, po.id);
  const following = has(db.followed, po.by!);
  const tags = (po.tags || []).join(' ');
  return (
    <View style={{ borderRadius: 24, backgroundColor: C.s1, borderWidth: 1, borderColor: C.line, overflow: 'hidden' }}>
      <View style={[S.row, { gap: 12, padding: 14, paddingBottom: 10 }]}>
        <Pressable onPress={() => openProfile(po.by!)}>
          <Avatar pic={p.photo} size={42} />
        </Pressable>
        <Pressable style={{ flex: 1, minWidth: 0 }} onPress={() => openProfile(po.by!)}>
          <View style={S.row}>
            <Txt s={14} w={8} lines={1} style={{ flexShrink: 1 }}>
              {p.name}
            </Txt>
            {p.verified ? <Verified /> : null}
            <Txt s={12} c={C.muted} style={{ marginLeft: 6 }} lines={1}>
              · {p.role}
            </Txt>
          </View>
          <Meta parts={self ? [p.area, po.time] : [<Rate key="r" r={p.rate} />, p.dist, po.time]} />
        </Pressable>
        {self ? (
          <StatusPill text="You" />
        ) : isW() ? (
          <Pill title={following ? 'Following' : 'Follow'} on={following} onPress={() => follow(po.by!)} />
        ) : (
          <Pill title={hireLabel(po.by!)} on={hireState(po.by!) !== 'none'} onPress={() => openHire(po.by!)} />
        )}
      </View>
      {po.text ? (
        <Txt s={14} w={5} c="#e3e3e6" style={{ paddingHorizontal: 16, paddingBottom: 12 }}>
          {po.text}
          {tags ? <Txt s={14} w={7} c={C.lav}>{' ' + tags}</Txt> : null}
        </Txt>
      ) : null}
      {po.kind === 'image' ? (
        <Pressable onPress={() => openMedia(po.img!)}>
          <Pict pic={po.img!} style={{ width: '100%', aspectRatio: po.img === 'img/post-portfolio' ? 399 / 185 : 16 / 10 }} />
        </Pressable>
      ) : null}
      {po.kind === 'photo' && po.src ? (
        <Pressable onPress={() => openMedia(po.src!)}>
          <Pict pic={po.src} style={{ width: '100%', aspectRatio: 16 / 10 }} />
        </Pressable>
      ) : null}
      {po.kind === 'art' ? (
        <Pressable onPress={() => openMedia(`scenes/${po.art}`)}>
          <Pict pic={`scenes/${po.art}`} style={{ width: '100%', aspectRatio: 4 / 3 }} />
        </Pressable>
      ) : null}
      {po.kind === 'job' ? (
        <View style={{ flexDirection: 'row', gap: 14, alignItems: 'center', marginHorizontal: 12, marginBottom: 12, padding: 12, borderRadius: 18, backgroundColor: C.s2 }}>
          <Pict pic={po.img!} style={{ width: 76, height: 76, borderRadius: 14 }} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <View style={[S.row, { gap: 5 }]}>
              <Icon name="check" size={14} color={C.ok} />
              <Txt s={11} w={8} c={C.ok}>
                Job completed
              </Txt>
            </View>
            <Txt s={15} w={8} lines={1} style={{ marginVertical: 2 }}>
              {po.job}
            </Txt>
            <Txt s={12} w={6} c={C.muted}>
              {po.took} · {po.paid} · Client gave <Txt s={12} w={8} c={C.yellow}>{'★'.repeat(po.stars || 5)}</Txt>
            </Txt>
          </View>
        </View>
      ) : null}
      {po.kind === 'avail' ? (
        <View style={{ marginHorizontal: 12, marginBottom: 12, borderRadius: 18, backgroundColor: C.blue, padding: 16, gap: 12 }}>
          <View style={[S.row, { gap: 6 }]}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: C.ok }} />
            <Txt s={12} w={8} c={C.yellow}>
              Available today
            </Txt>
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {(po.slots || []).map((s) => (
              <Pressable
                key={s}
                disabled={self}
                onPress={() => openHire(po.by!, { when: s === 'Now' ? 'Today, now' : `Today, ${s}` })}
                style={{ height: 34, paddingHorizontal: 14, borderRadius: 999, backgroundColor: 'rgba(255,255,255,.14)', justifyContent: 'center', opacity: self ? 0.75 : 1 }}
              >
                <Txt s={12} w={7}>
                  {s}
                </Txt>
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}
      <View style={[S.row, { gap: 8, paddingHorizontal: 12, paddingTop: 2, paddingBottom: 12 }]}>
        <Pressable
          accessibilityLabel={liked ? 'Unlike' : 'Like'}
          onPress={() => {
            tap();
            likePost(po.id);
          }}
          style={[S.row, { gap: 6, height: 36, paddingHorizontal: 12, borderRadius: 999, backgroundColor: liked ? C.blue : C.s2 }]}
        >
          <Icon name="like" size={18} color="#fff" />
          <Txt s={12} w={7}>
            {k((po.likes || 0) + (liked ? 1 : 0))}
          </Txt>
        </Pressable>
        <Pressable accessibilityLabel="Comments" onPress={() => openComments(po.id)} style={[S.row, { gap: 6, height: 36, paddingHorizontal: 12, borderRadius: 999, backgroundColor: C.s2 }]}>
          <Icon name="comment" size={18} color="#fff" />
          <Txt s={12} w={7}>
            {po.comments || 0}
          </Txt>
        </Pressable>
        <View style={{ flex: 1 }} />
        <Pressable accessibilityLabel={saved ? 'Unsave post' : 'Save post'} onPress={() => saveToggle('savedPosts', po.id, 'Post')} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: saved ? C.yellow : C.s2, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="bookmark" size={18} color={saved ? '#000' : '#fff'} />
        </Pressable>
        <Pressable accessibilityLabel="Share" onPress={() => sharePost(p.name)} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: C.s2, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="share" size={18} color="#fff" />
        </Pressable>
      </View>
    </View>
  );
}

/* ------------------------- reel thumbnail ------------------------- */
export function ReelThumb({ r, i, title, onPress, width = 150 }: { r: Reel; i: number; title?: string; onPress: () => void; width?: number }) {
  const p = P(r.by);
  return (
    <Pressable accessibilityLabel={`Watch ${p.name}’s video`} onPress={onPress} style={{ width, aspectRatio: 3 / 4.6, borderRadius: 22, overflow: 'hidden', backgroundColor: C.s2 }}>
      <Pict pic={`scenes/${r.scene}`} style={{ position: 'absolute', width: '100%', height: '100%' }} />
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '35%', backgroundColor: 'rgba(0,0,0,.18)' }} />
      <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '40%', backgroundColor: 'rgba(0,0,0,.45)' }} />
      <View style={[S.row, { position: 'absolute', left: 10, top: 10, height: 22, paddingHorizontal: 9, borderRadius: 999, backgroundColor: r.live ? C.orange : 'rgba(0,0,0,.55)', gap: 4 }]}>
        {!r.live ? <Icon name="playfill" size={11} color="#fff" /> : null}
        <Txt s={10} w={8}>
          {r.live ? 'LIVE' : 'Video'}
        </Txt>
      </View>
      <Txt s={11} w={7} style={{ position: 'absolute', right: 10, top: 13 }}>
        {r.views}
      </Txt>
      <View style={[S.row, { position: 'absolute', left: 10, right: 10, bottom: 10 }]}>
        <Txt s={13} w={8} lines={1} style={{ flexShrink: 1 }}>
          {title || p.name.split(' ')[0]}
        </Txt>
        {p.verified ? <Verified size={14} /> : null}
      </View>
    </Pressable>
  );
}

/* ------------------------- person row (lists) ------------------------- */
export function PersonRow({ id }: { id: string }) {
  const p = P(id);
  const saved = has(db.saved, id);
  const st = hireState(id);
  return (
    <Pressable onPress={() => openProfile(id)} style={({ pressed }) => ({ flexDirection: 'row', gap: 12, padding: 10, borderRadius: 20, backgroundColor: pressed ? C.s2 : C.s1, borderWidth: 1, borderColor: C.line, alignItems: 'center' })}>
      <Pict pic={p.photo} style={{ width: 64, height: 72, borderRadius: 14, backgroundColor: C.orange }} />
      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
        <View style={S.row}>
          <Txt s={15} w={8} lines={1} style={{ flexShrink: 1 }}>
            {p.name}
          </Txt>
          {p.verified ? <Verified /> : null}
        </View>
        <Meta parts={[p.role, `${p.years} yrs`, p.tag]} />
        <Meta parts={[<Rate key="r" r={p.rate} />, `${p.area} · ${p.dist}`]} />
      </View>
      <View style={{ alignItems: 'flex-end', gap: 8 }}>
        <Pressable accessibilityLabel={saved ? `Unsave ${p.name}` : `Save ${p.name}`} hitSlop={6} onPress={() => toggleSave(id)} style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: saved ? C.yellow : C.s2, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="bookmark" size={16} color={saved ? '#000' : '#fff'} />
        </Pressable>
        <Pill title={hireLabel(id)} on={st !== 'none'} onPress={() => openHire(id)} style={{ height: 30, paddingHorizontal: 14 }} />
      </View>
    </Pressable>
  );
}

/* ------------------------- internship / program card ------------------------- */
export function OppCard({ o, width = 220 }: { o: Opp; width?: number | `${number}%` }) {
  const b = oppBiz(o);
  return (
    <Pressable onPress={() => openOpp(o.id)} style={({ pressed }) => ({ width: width as any, padding: 14, borderRadius: 20, backgroundColor: pressed ? C.s2 : C.s1, borderWidth: 1, borderColor: C.line, gap: 6 })}>
      <View style={S.rowB}>
        <Avatar pic={b.logo} size={38} square />
        <View style={{ paddingHorizontal: 8, height: 22, borderRadius: 999, backgroundColor: 'rgba(169,182,255,.14)', justifyContent: 'center' }}>
          <Txt s={10} w={8} c={C.lav}>
            {o.kind}
          </Txt>
        </View>
      </View>
      <Txt s={14} w={8} lines={2} style={{ marginTop: 4 }}>
        {o.title}
      </Txt>
      <Txt s={12} c={C.muted} lines={1}>
        {b.name}
      </Txt>
      <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
        {[o.dur, o.mode.split(' · ')[0]].map((t) => (
          <View key={t} style={{ height: 22, paddingHorizontal: 8, borderRadius: 999, backgroundColor: C.s2, justifyContent: 'center' }}>
            <Txt s={10} w={7} c={C.muted}>
              {t}
            </Txt>
          </View>
        ))}
      </View>
      <Txt s={12} w={8} c={C.yellow} lines={1}>
        {o.pay}
      </Txt>
      {o.applied ? (
        <View style={[S.row, { gap: 4 }]}>
          <Icon name="check" size={14} color={C.mint} />
          <Txt s={12} w={7} c={C.mint}>
            {o.kind === 'Training program' ? 'Joined' : 'Applied'}
          </Txt>
        </View>
      ) : null}
    </Pressable>
  );
}

export function MentorCard({ m, width = 220 }: { m: Mentorship; width?: number | `${number}%` }) {
  const o = mOwner(m);
  return (
    <Pressable onPress={() => openMentor(m.id)} style={({ pressed }) => ({ width: width as any, padding: 14, borderRadius: 20, backgroundColor: pressed ? C.s2 : C.s1, borderWidth: 1, borderColor: C.line, gap: 6 })}>
      <View style={S.rowB}>
        <Avatar pic={o.photo} size={38} square={!!o.sq} />
        {!m.joinedMe ? (
          <View style={{ paddingHorizontal: 8, height: 22, borderRadius: 999, backgroundColor: 'rgba(255,179,122,.14)', justifyContent: 'center' }}>
            <Txt s={10} w={8} c={C.peach}>
              {m.format}
            </Txt>
          </View>
        ) : null}
      </View>
      <Txt s={14} w={8} lines={2} style={{ marginTop: 4 }}>
        {m.title}
      </Txt>
      <Txt s={12} c={C.muted} lines={1}>
        {o.name} · {o.sub}
      </Txt>
      <View style={{ flexDirection: 'row', gap: 6 }}>
        {[m.dur.split(' · ')[0], `${m.joined}/${m.seats}`].map((t) => (
          <View key={t} style={{ height: 22, paddingHorizontal: 8, borderRadius: 999, backgroundColor: C.s2, justifyContent: 'center' }}>
            <Txt s={10} w={7} c={C.muted}>
              {t}
            </Txt>
          </View>
        ))}
      </View>
      <Txt s={12} w={8} c={C.yellow}>
        {m.price}
      </Txt>
      {m.joinedMe ? (
        <View style={[S.row, { gap: 4 }]}>
          <Icon name={m.joinedMe === 'req' ? 'clock' : 'check'} size={14} color={C.mint} />
          <Txt s={12} w={7} c={C.mint}>
            {m.joinedMe === 'req' ? 'Requested' : 'Joined'}
          </Txt>
        </View>
      ) : null}
    </Pressable>
  );
}

/** Simple list row used for saved items, jobs, etc. */
export function ListRow({ pic, square, icon, title, sub, pill, pillKind = 'wait', onPress, right }: { pic?: string; square?: boolean; icon?: string; title: string; sub?: string; pill?: string; pillKind?: 'acc' | 'wait' | 'urg' | 'blue'; onPress?: () => void; right?: React.ReactNode }) {
  return (
    <Pressable onPress={onPress} disabled={!onPress} style={({ pressed }) => [S.row, { gap: 12, padding: 12, borderRadius: 18, backgroundColor: pressed ? C.s2 : C.s1, borderWidth: 1, borderColor: C.line }]}>
      {icon ? (
        <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: C.s2, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name={icon} size={20} color={C.yellow} />
        </View>
      ) : (
        <Avatar pic={pic} size={44} square={square} />
      )}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Txt s={14} w={8} lines={1}>
          {title}
        </Txt>
        {sub ? (
          <Txt s={12} c={C.muted} lines={2}>
            {sub}
          </Txt>
        ) : null}
      </View>
      {pill ? <StatusPill text={pill} kind={pillKind} /> : null}
      {right}
    </Pressable>
  );
}

export { fname, myPhoto };
