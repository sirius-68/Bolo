/* Reviews people left about someone after a job: the average, how the stars are spread, and each review.
   The same panel shows on anyone's profile and on my own (Me → Reviews). */
import React from 'react';
import { View } from 'react-native';
import { db, Review } from '../data/db';
import { Avatar, Btn, Txt } from '../ui/kit';
import { Icon } from '../ui/Icon';
import { C, S } from '../ui/theme';

export function EmptyTab({ icon, title, text, action, onAction }: { icon: string; title: string; text: string; action?: string; onAction?: () => void }) {
  return (
    <View style={{ alignItems: 'center', paddingVertical: 28, paddingHorizontal: 20, borderRadius: 22, backgroundColor: C.s1, borderWidth: 1, borderColor: C.line }}>
      <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: C.s2, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={icon} size={24} color={C.yellow} />
      </View>
      <Txt s={16} w={8} center style={{ marginTop: 12 }}>
        {title}
      </Txt>
      <Txt s={13} c={C.muted} center style={{ marginTop: 4 }}>
        {text}
      </Txt>
      {action ? <Btn small variant="dark" title={action} onPress={onAction} style={{ marginTop: 14 }} /> : null}
    </View>
  );
}
export function Stars({ n, size = 14 }: { n: number; size?: number }) {
  return (
    <View style={[S.row, { gap: 2 }]}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Icon key={i} name="star" size={size} color={i <= Math.round(n) ? C.yellow : C.s3} />
      ))}
    </View>
  );
}
type RV = { pic: any; name: string; time: string; stars: number; text: string; tags?: string[] };
function ReviewCard({ r }: { r: RV }) {
  return (
    <View style={{ padding: 16, borderRadius: 20, backgroundColor: C.s1, borderWidth: 1, borderColor: C.line, gap: 10 }}>
      <View style={[S.row, { gap: 10 }]}>
        <Avatar pic={r.pic} size={36} />
        <View style={{ flex: 1 }}>
          <Txt s={14} w={8}>
            {r.name}
          </Txt>
          <Txt s={11} c={C.faint}>
            {r.time}
          </Txt>
        </View>
        <Stars n={r.stars} size={13} />
      </View>
      {r.tags?.length ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          {r.tags.map((x) => (
            <View key={x} style={{ paddingHorizontal: 10, height: 26, borderRadius: 13, backgroundColor: C.s2, justifyContent: 'center' }}>
              <Txt s={11} w={7} c={C.lav}>
                {x}
              </Txt>
            </View>
          ))}
        </View>
      ) : null}
      {r.text ? (
        <Txt s={14} c="#d9d9de">
          {r.text}
        </Txt>
      ) : null}
    </View>
  );
}


/** `gate`: what goes above the list on someone else's profile (the "Rate …" button, or who may review). */
export function ReviewsPanel({ id, rate, count, gate, empty }: { id: string; rate: number; count: number; gate?: React.ReactNode; empty: string }) {
  const list: Review[] = db.REVIEWS[id] || [];
  if (!list.length)
    return (
      <>
        {gate}
        <EmptyTab icon="star" title="No reviews yet" text={empty} />
      </>
    );
  // the server's average when it has one; otherwise worked out from the reviews on screen
  const avg = rate || list.reduce((n, r) => n + r.stars, 0) / list.length;
  const dist = [5, 4, 3, 2, 1].map((n) => list.filter((r) => r.stars === n).length / list.length);
  return (
    <>
      <View testID="reviews-summary" style={[S.row, { gap: 18, padding: 18, borderRadius: 22, backgroundColor: C.s1, borderWidth: 1, borderColor: C.line }]}>
        <View style={{ alignItems: 'center', minWidth: 84 }}>
          <Txt s={42} w={8}>
            {avg.toFixed(1)}
          </Txt>
          <Stars n={avg} size={12} />
          <Txt s={11} c={C.muted} style={{ marginTop: 4 }}>
            {Math.max(count, list.length)} review{Math.max(count, list.length) === 1 ? '' : 's'}
          </Txt>
        </View>
        <View style={{ flex: 1, gap: 5 }}>
          {dist.map((d, i) => (
            <View key={i} style={[S.row, { gap: 8 }]}>
              <Txt s={11} c={C.muted} style={{ width: 8 }}>
                {5 - i}
              </Txt>
              <View style={{ flex: 1, height: 6, borderRadius: 3, backgroundColor: C.s3 }}>
                <View style={{ width: `${d * 100}%`, height: 6, borderRadius: 3, backgroundColor: C.yellow }} />
              </View>
            </View>
          ))}
        </View>
      </View>
      {gate}
      {list.map((r, i) => (
        <ReviewCard key={i} r={{ pic: r.photo, name: r.name, time: r.time, stars: r.stars, text: r.text, tags: r.tags }} />
      ))}
    </>
  );
}
