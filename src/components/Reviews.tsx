import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Course } from '../data/db';
import { Avatar, Btn, Input, Txt, tap } from '../ui/kit';
import { Icon } from '../ui/Icon';
import { C, S } from '../ui/theme';
import { P, fname, myPhoto } from '../logic/core';
import { useLive } from '../logic/live';
import { canReview, deleteReview, myReview, ratingOf, reviewsOf, submitReview } from '../logic/reviews';

/** ★ 4.6 (23) — for course cards. Nothing when a course has no ratings yet. */
export function RatingBadge({ c, color = C.yellow, text = C.text }: { c: Course; color?: string; text?: string }) {
  const { avg, n } = ratingOf(c);
  if (!n) return null;
  return (
    <View style={[S.row, { gap: 3 }]} accessibilityLabel={`Rated ${avg} out of 5 by ${n} students`}>
      <Icon name="star" size={12} color={color} />
      <Txt s={12} w={8} c={text}>
        {avg.toFixed(1)}
      </Txt>
      <Txt s={11} c={text} style={{ opacity: 0.65 }}>
        ({n})
      </Txt>
    </View>
  );
}

export function Stars({ value, size = 14, onPick }: { value: number; size?: number; onPick?: (n: number) => void }) {
  return (
    <View style={[S.row, { gap: onPick ? 8 : 2 }]}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Pressable key={i} testID={onPick ? `star-${i}` : undefined} disabled={!onPick} accessibilityRole={onPick ? 'button' : undefined} accessibilityLabel={onPick ? `${i} star${i > 1 ? 's' : ''}` : undefined} hitSlop={4} onPress={() => (tap(), onPick?.(i))}>
          <Icon name="star" size={size} color={i <= value ? C.yellow : C.s3} />
        </Pressable>
      ))}
    </View>
  );
}

/** Summary, your rating (if you can rate), and every review. Creators see the same list with the breakdown. */
export function CourseReviews({ c }: { c: Course }) {
  useLive();
  const r = ratingOf(c);
  const mine = myReview(c);
  const can = canReview(c);
  const [editing, setEditing] = useState(!mine);
  const [stars, setStars] = useState(mine?.stars || 0);
  const [text, setText] = useState(mine?.text || '');
  const [err, setErr] = useState('');
  const L = reviewsOf(c).filter((x) => x.by !== 'me');
  return (
    <View style={{ gap: 12 }}>
      {/* summary */}
      <View style={[S.row, { gap: 16, padding: 16, borderRadius: 20, backgroundColor: C.s1, borderWidth: 1, borderColor: C.line }]}>
        <View style={{ alignItems: 'center', width: 86 }}>
          <Txt s={36} w={8}>
            {r.n ? r.avg.toFixed(1) : '–'}
          </Txt>
          <Stars value={Math.round(r.avg)} size={12} />
          <Txt s={11} c={C.muted} style={{ marginTop: 4 }}>
            {r.n} rating{r.n === 1 ? '' : 's'}
          </Txt>
        </View>
        <View style={{ flex: 1, gap: 4 }}>
          {r.dist.map((n, i) => (
            <View key={i} style={[S.row, { gap: 6 }]}>
              <Txt s={11} c={C.muted} style={{ width: 10 }}>
                {5 - i}
              </Txt>
              <View style={{ flex: 1, height: 6, borderRadius: 3, backgroundColor: C.s3, overflow: 'hidden' }}>
                <View style={{ width: `${r.n ? (n / r.n) * 100 : 0}%`, height: 6, backgroundColor: C.yellow }} />
              </View>
            </View>
          ))}
        </View>
      </View>

      {/* your rating */}
      {can ? (
        editing ? (
          <View testID="review-form" style={{ padding: 16, borderRadius: 20, backgroundColor: C.s1, borderWidth: 1, borderColor: C.blue, gap: 10 }}>
            <Txt s={15} w={8}>
              {mine ? 'Edit your review' : 'Rate this course'}
            </Txt>
            <Stars value={stars} size={30} onPick={(n) => (setStars(n), setErr(''))} />
            <Input testID="review-text" multiline value={text} onChangeText={setText} maxLength={600} placeholder="What did you like? What could be better? (optional)" />
            {err ? (
              <Txt s={12} c={C.err}>
                {err}
              </Txt>
            ) : null}
            <View style={{ flexDirection: 'row', gap: 10 }}>
              {mine ? <Btn variant="ghost" title="Cancel" style={{ flex: 1 }} onPress={() => (setEditing(false), setStars(mine.stars), setText(mine.text))} /> : null}
              <Btn
                testID="review-submit"
                variant="yellow"
                title={mine ? 'Save' : 'Submit rating'}
                disabled={!stars}
                style={{ flex: 2 }}
                onPress={() => {
                  const e = submitReview(c, stars, text);
                  if (e) setErr(e);
                  else setEditing(false);
                }}
              />
            </View>
          </View>
        ) : mine ? (
          <ReviewRow by="me" stars={mine.stars} text={mine.text} at={mine.at + (mine.edited ? ' · edited' : '')} right={
            <View style={[S.row, { gap: 12 }]}>
              <Pressable testID="review-edit" accessibilityLabel="Edit your review" hitSlop={8} onPress={() => setEditing(true)}>
                <Icon name="edit" size={16} color={C.lav} />
              </Pressable>
              <Pressable accessibilityLabel="Delete your review" hitSlop={8} onPress={() => (deleteReview(c), setStars(0), setText(''), setEditing(true))}>
                <Icon name="trash" size={16} color={C.muted} />
              </Pressable>
            </View>
          } />
        ) : null
      ) : !c.mine ? (
        <Txt s={12} c={C.muted}>
          Students enrolled in this course can rate it.
        </Txt>
      ) : null}

      {L.map((x) => (
        <ReviewRow key={x.id} by={x.by} stars={x.stars} text={x.text} at={x.at} />
      ))}
      {!L.length && !mine ? (
        <Txt s={13} c={C.muted}>
          No reviews yet.
        </Txt>
      ) : null}
    </View>
  );
}
function ReviewRow({ by, stars, text, at, right }: { by: string; stars: number; text: string; at: string; right?: React.ReactNode }) {
  return (
    <View style={[S.row, { gap: 10, alignItems: 'flex-start', padding: 12, borderRadius: 18, backgroundColor: C.s1, borderWidth: 1, borderColor: C.line }]}>
      <Avatar pic={by === 'me' ? myPhoto() : P(by)?.photo || ''} size={36} />
      <View style={{ flex: 1, gap: 3 }}>
        <View style={S.rowB}>
          <Txt s={13} w={8}>
            {by === 'me' ? 'You' : fname(P(by)?.name || 'Student')}
          </Txt>
          {right}
        </View>
        <View style={[S.row, { gap: 8 }]}>
          <Stars value={stars} size={12} />
          <Txt s={11} c={C.muted}>
            {at}
          </Txt>
        </View>
        {text ? <Txt s={13} c="#d9d9de">{text}</Txt> : null}
      </View>
    </View>
  );
}
