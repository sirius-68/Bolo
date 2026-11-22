/* Ratings, per service. A worker's one number ("4.8 ★") is earned on different kinds of jobs; this says which:
   the combined rating is labelled with what it covers ("for all 3 services"), and each service has its own line. */
import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { db } from '../data/db';
import { R } from '../logic/server';
import { GIcon } from './icons';
import { ServiceRating, loadServiceRatings, serviceRatings } from './services';
import { useG } from './theme';
import { T } from './ui';

/** A worker's ratings per service, loaded once per profile ('me' for my own). */
export function useServiceRatings(id: string): ServiceRating[] {
  const uid = id === 'me' ? db.uid || '' : R(id) || '';
  const [rows, setRows] = useState<ServiceRating[]>(() => (uid ? serviceRatings(uid) : []));
  useEffect(() => {
    let live = true;
    if (uid) void loadServiceRatings(uid).then((r) => live && setRows(r));
    return () => {
      live = false;
    };
  }, [uid]);
  return rows;
}

/** What the combined rating covers, in a few words: "for all 3 services", "all for House wiring", "from 4 ratings". */
export function scopeOf(rows: ServiceRating[], total: number): string {
  const rated = rows.filter((r) => r.reviews > 0);
  const named = rated.filter((r) => r.service);
  const n = rated.reduce((a, r) => a + r.reviews, 0) || total;
  if (!n) return '';
  if (named.length >= 2) return `for all ${named.length} services`;
  if (named.length === 1 && rated.length === 1) return `all for ${named[0].service}`;
  if (named.length === 1) return `${named[0].service} and other jobs`;
  return n === 1 ? 'from 1 rating' : `from ${n} ratings`;
}
/** The rating to show for one service: their rating for it when they have one, else their combined rating, said as such. */
export function ratingFor(rows: ServiceRating[], service: string | undefined | null, overall: number, total: number): { stars: number; n: number; own: boolean } {
  const hit = service ? rows.find((r) => r.service.toLowerCase() === service.toLowerCase() && r.reviews > 0) : undefined;
  return hit && hit.rating ? { stars: hit.rating, n: hit.reviews, own: true } : { stars: overall, n: total, own: false };
}

/** One line per service: stars and how many ratings, or "Not rated yet" for a service they list but were never rated for. */
export function RatingsByService({ rows, listed, focus }: { rows: ServiceRating[]; listed: string[]; focus?: string | null }) {
  const t = useG();
  const low = (s: string) => s.toLowerCase();
  const rated = rows.filter((r) => r.reviews > 0 || r.jobs > 0);
  const lines: { name: string; r?: ServiceRating; listed: boolean }[] = [
    ...rated.filter((r) => r.service).map((r) => ({ name: r.service, r, listed: listed.some((x) => low(x) === low(r.service)) })),
    ...listed.filter((x) => !rated.some((r) => low(r.service) === low(x))).map((name) => ({ name, listed: true })),
    ...rated.filter((r) => !r.service).map((r) => ({ name: 'Other jobs', r, listed: true })),
  ];
  // the service this person is looking for comes first
  if (focus) lines.sort((a, b) => +(low(b.name) === low(focus)) - +(low(a.name) === low(focus)));
  if (!lines.length) return null;
  return (
    <View>
      {lines.map((x, i) => (
        <View key={x.name + i} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 48, borderBottomWidth: i === lines.length - 1 ? 0 : 1, borderBottomColor: t.line }}>
          <View style={{ flex: 1 }}>
            <T s={15} w={focus && low(x.name) === low(focus) ? 8 : 6}>
              {x.name}
            </T>
            {!x.listed ? (
              <T s={12} c="muted">
                No longer offered
              </T>
            ) : null}
          </View>
          {x.r && x.r.reviews > 0 && x.r.rating ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <T s={15} w={8}>
                {x.r.rating.toFixed(1)}
              </T>
              <GIcon name="star" size={14} />
              <T s={13} c="muted">
                {` · ${x.r.reviews} ${x.r.reviews === 1 ? 'rating' : 'ratings'}`}
              </T>
            </View>
          ) : (
            <T s={13} c="muted">
              {x.r && x.r.jobs > 0 ? `${x.r.jobs} ${x.r.jobs === 1 ? 'job' : 'jobs'} · not rated yet` : 'Not rated yet'}
            </T>
          )}
        </View>
      ))}
    </View>
  );
}
