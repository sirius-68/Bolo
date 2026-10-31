import React from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { db } from '../../src/data/db';
import { COURSE_CATS, EXPERTS } from '../../src/data/catalog';
import { Course } from '../../src/data/db';
import { classWhen, coursePct, isLive, lessonsOf } from '../../src/logic/career';
import { Avatar, Bar, ProTag, Txt, tap } from '../../src/ui/kit';
import { Icon } from '../../src/ui/Icon';
import { C, S } from '../../src/ui/theme';
import { bizName, curBiz, isW } from '../../src/logic/core';
import { useLive } from '../../src/logic/live';
import { openCourses, openProfile } from '../../src/logic/nav';
import { Rail, Sec, TabHeader } from '../../src/components/common';
import { ListRow, MentorCard, OppCard } from '../../src/components/cards';
import { onScrollFab } from '../../src/components/NavBar';
import { openOpp, crSee, openArticles, openCourse, openExperts, openMentor, openMentorForm, openOppForm, openPaths, openSalaries, openCV } from '../../src/sheets/career';
import { openPro } from '../../src/sheets/account';
import { applying, isExpert } from '../../src/logic/expert';

export default function Career() {
  useLive();
  const ins = useSafeAreaInsets();
  const w = isW();
  const intern = db.OPPS.filter((o) => o.kind === 'Internship');
  const progs = db.OPPS.filter((o) => o.kind !== 'Internship');
  const cos = Object.keys(db.BIZ_SAMPLE).sort((a, b) => db.POSTS.filter((p) => p.client === b).length - db.POSTS.filter((p) => p.client === a).length);
  const mine = db.MENTORSHIPS.filter((m) => m.mine && !m.plain && (w ? !m.asBiz : m.asBiz === db.BIZ.active));
  const others = db.MENTORSHIPS.filter((m) => !m.mine);
  const joined = others.filter((m) => m.joinedMe === 'yes' || m.joinedMe === 'req');
  const learning = db.myLearning.map((id) => db.COURSES.find((c) => c.id === id)).filter(Boolean) as typeof db.COURSES;
  const courses = db.COURSES.filter((c) => !db.myLearning.includes(c.id) && (w ? !c.mine : true)).slice(0, 10);
  const myOpps = db.OPPS.filter((o) => (w ? o.applied : o.mine && o.biz === db.BIZ.active));

  const Promo = ({ title, text, cta, icon, alt, onPress, pro }: { title: string; text: string; cta: string; icon: string; alt?: boolean; onPress: () => void; pro?: boolean }) => (
    <Pressable accessibilityRole="button" onPress={() => (tap(), onPress())} style={{ flex: 1, padding: 14, borderRadius: 22, backgroundColor: alt ? C.lav : C.yellow, minHeight: 168 }}>
      <View style={[S.row, { gap: 6, flexWrap: 'wrap' }]}>
        <Txt s={15} w={8} c="#000">
          {title}
        </Txt>
        {pro ? <ProTag small /> : null}
      </View>
      <Txt s={12} c="#222" style={{ marginTop: 4, flex: 1 }}>
        {text}
      </Txt>
      <View style={[S.rowB, { marginTop: 10 }]}>
        <View style={{ paddingHorizontal: 12, height: 30, borderRadius: 999, backgroundColor: '#000', justifyContent: 'center' }}>
          <Txt s={12} w={8}>
            {cta}
          </Txt>
        </View>
        <Icon name={icon} size={26} color="#000" />
      </View>
    </Pressable>
  );
  const Tile = ({ icon, label, onPress, wide }: { icon: string; label: string; onPress: () => void; wide?: boolean }) => (
    <Pressable accessibilityRole="button" onPress={() => (tap(), onPress())} style={({ pressed }) => [S.row, { gap: 10, flexBasis: wide ? '100%' : '48%', flexGrow: 1, padding: 14, borderRadius: 18, backgroundColor: pressed ? C.s2 : C.s1, borderWidth: 1, borderColor: C.line }]}>
      <Icon name={icon} size={20} color={C.yellow} />
      <Txt s={13} w={7} style={{ flex: 1 }}>
        {label}
      </Txt>
    </Pressable>
  );
  const Sub = ({ t }: { t: string }) => (
    <Txt s={12} c={C.muted} style={{ marginTop: -6, marginBottom: 10 }}>
      {t}
    </Txt>
  );
  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.bg }} onScroll={onScrollFab} scrollEventThrottle={32} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingTop: ins.top, paddingHorizontal: 20, paddingBottom: 120 + ins.bottom }}>
      <TabHeader hello={false} />
      <Txt s={28} w={8} style={{ marginTop: 14 }}>
        Career
      </Txt>
      <Txt s={13} c={C.muted} style={{ marginTop: 2 }}>
        {w ? 'Internships, programs, courses and mentors to grow your skills.' : `Programs, courses and mentoring from ${bizName(curBiz())}, and talent to train.`}
      </Txt>
      <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
        {w ? (
          <>
            <Promo title={db.user.cvDone ? 'Your CV is ready' : 'Create your CV'} text={db.user.cvDone ? 'Update it any time or save it as a PDF' : 'Answer 5 quick steps. We build a professional CV for you'} cta={db.user.cvDone ? 'View my CV' : 'Create my CV'} icon="file" onPress={() => (db.user.cvDone ? openCV() : router.push('/cvflow'))} />
            <Promo alt title={db.user.pro.regular ? 'You’re on Pro' : 'Get hired faster'} text={db.user.pro.regular ? 'Priority applications are on' : 'Priority applications, boosts and more with bolo Pro'} cta={db.user.pro.regular ? 'Manage plan' : 'See Pro'} icon="rocket" onPress={() => openPro('regular')} />
          </>
        ) : (
          <>
            <Promo title="Create an internship" text="Find and train young talent. It shows here for everyone" cta="Create" icon="cap" onPress={() => openOppForm('Internship')} />
            <Promo alt title="Run a program or course" text="Apprenticeships, graduate programs, trainings and courses" cta="Create" icon="sparkle" onPress={() => openOppForm('Training program')} />
          </>
        )}
      </View>
      {w && learning.length ? <ContinueLearning list={learning} /> : null}
      {w ? (
        <Pressable accessibilityRole="button" onPress={openExperts} style={{ marginTop: 12, padding: 16, borderRadius: 22, backgroundColor: C.blue }}>
          <Txt s={16} w={8}>
            Career experts
          </Txt>
          <Txt s={12} c="#e3e7ff" style={{ marginTop: 2 }}>
            Help with your CV, interviews, job search and first job
          </Txt>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 }}>
            <View style={{ flexDirection: 'row' }}>
              {EXPERTS.map((e, i) => (
                <Avatar key={e[0]} pic={e[2]} size={34} style={{ marginLeft: i ? -8 : 0, borderWidth: 2, borderColor: C.blue }} />
              ))}
            </View>
            <View style={{ paddingHorizontal: 12, height: 30, borderRadius: 15, backgroundColor: 'rgba(255,255,255,.18)', justifyContent: 'center' }}>
              <Txt s={12} w={8}>
                {isExpert() ? 'You’re an expert ✓' : applying() ? 'Application in review' : 'Become an expert'}
              </Txt>
            </View>
          </View>
        </Pressable>
      ) : null}
      {myOpps.length || (w && joined.length) ? (
        <>
          <Sec title={w ? 'My applications & mentors' : 'Your programs'} />
          <View style={{ gap: 8 }}>
            {myOpps.map((o) => (
              <ListRow
                key={o.id}
                icon="cap"
                title={o.title}
                sub={`${o.kind} · starts ${o.start}`}
                pill={w ? (o.kind === 'Training program' ? 'Joined' : 'Applied') : `${o.joined}/${o.seats}`}
                pillKind={w ? 'acc' : 'wait'}
                onPress={() => openOpp(o.id)}
              />
            ))}
            {w
              ? joined.map((m) => (
                  <ListRow key={m.id} icon="follow" title={m.title} sub={`Mentorship · ${m.format} · ${m.dur}`} pill={m.joinedMe === 'yes' ? 'Mentee' : 'Requested'} pillKind={m.joinedMe === 'yes' ? 'acc' : 'wait'} onPress={() => openMentor(m.id)} />
                ))
              : null}
          </View>
        </>
      ) : null}
      <Sec title="Internships" action="All" onAction={() => crSee('Internship')} />
      <Sub t="Paid and unpaid internships from verified businesses" />
      <Rail>
        {intern.map((o) => (
          <OppCard key={o.id} o={o} />
        ))}
      </Rail>
      <Sec title="Programs you can join" action="All" onAction={() => crSee('program')} />
      <Sub t="Apprenticeships, graduate programs and trainings" />
      <Rail>
        {progs.map((o) => (
          <OppCard key={o.id} o={o} />
        ))}
      </Rail>
      <Sec testID="career-courses-all" title="Courses" action="All" onAction={() => openCourses(null, 'explore')} />
      <Sub t="Short courses with live classes and a certificate" />
      <Rail>
        {courses.map((c) => (
          <CourseCard key={c.id} c={c} />
        ))}
        {w ? (
          <Pressable testID="career-teach" accessibilityRole="button" onPress={() => (tap(), router.push('/teach' as any))} style={{ width: 168, height: 190, padding: 16, borderRadius: 22, borderWidth: 1, borderStyle: 'dashed', borderColor: C.s3, justifyContent: 'center', gap: 8 }}>
            <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: C.lav, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="cap" size={20} color="#000" />
            </View>
            <Txt s={15} w={8}>
              Teach a course
            </Txt>
            <Txt s={12} c={C.muted}>
              Share your skill and get paid
            </Txt>
          </Pressable>
        ) : null}
      </Rail>
      <Sec title="Mentorship" action="+ Offer" onAction={openMentorForm} />
      <Sub t="Learn from experienced people and companies, 1-to-1 or in groups" />
      {mine.length ? (
        <View style={{ gap: 8, marginBottom: 10 }}>
          {mine.map((m) => (
            <ListRow key={m.id} icon="follow" title={m.title} sub={`Your mentorship · ${m.format} · ${m.dur}`} pill={`${m.joined}/${m.seats}`} onPress={() => openMentor(m.id)} />
          ))}
        </View>
      ) : null}
      <Rail>
        {others.map((m) => (
          <MentorCard key={m.id} m={m} />
        ))}
        <Pressable accessibilityRole="button" onPress={openMentorForm} style={{ width: 180, padding: 16, borderRadius: 22, borderWidth: 1, borderStyle: 'dashed', borderColor: C.s3, justifyContent: 'center', gap: 8 }}>
          <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: C.yellow, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="plus" size={20} color="#000" />
          </View>
          <Txt s={15} w={8}>
            Become a mentor
          </Txt>
          <Txt s={12} c={C.muted}>
            {w ? 'Share your experience, free or paid' : 'Mentor young talent as ' + bizName(curBiz())}
          </Txt>
        </Pressable>
      </Rail>
      <Sec title="Companies hiring near you" />
      <Sub t="They describe their roles and benefits in detail" />
      <Rail>
        {cos.map((id) => {
          const b = db.BIZ_SAMPLE[id];
          const n = db.POSTS.filter((p) => p.client === id).length + db.OPPS.filter((o) => o.biz === id).length;
          return (
            <Pressable key={id} accessibilityRole="button" onPress={() => openProfile(id)} style={({ pressed }) => ({ width: 128, padding: 12, borderRadius: 18, alignItems: 'center', gap: 6, backgroundColor: pressed ? C.s2 : C.s1, borderWidth: 1, borderColor: C.line })}>
              <Avatar pic={b.logo} square size={52} />
              <Txt s={13} w={8} center lines={2}>
                {b.name}
              </Txt>
              <Txt s={11} c={C.muted}>
                {n} opening{n === 1 ? '' : 's'}
              </Txt>
            </Pressable>
          );
        })}
      </Rail>
      <Sec title="Career tools" />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        <Tile icon="mapt" label="Professions and salaries" onPress={openSalaries} />
        <Tile icon="file" label="Career articles" onPress={openArticles} />
        <Tile wide icon="arrow" label="Career change" onPress={openPaths} />
      </View>
    </ScrollView>
  );
}

const TONES: [string, string][] = [
  [C.blue, '#fff'],
  [C.orange, '#000'],
  [C.lav, '#000'],
  [C.mint, '#000'],
  [C.yellow, '#000'],
  [C.pink, '#000'],
];
const toneOf = (c: Course) => TONES[Math.max(0, COURSE_CATS.findIndex((x) => x[0] === c.cat)) % TONES.length];
const catIcon = (cat: string) => COURSE_CATS.find((x) => x[0] === cat)?.[1] || 'cap';

/** The course you're in the middle of, one tap from your next lesson. */
function ContinueLearning({ list }: { list: Course[] }) {
  const c = list.find((x) => coursePct(x) < 100) || list[0];
  const L = lessonsOf(c);
  const d = Math.min(c.done || 0, L.length);
  const pct = coursePct(c);
  const live = isLive(c);
  return (
    <View style={{ marginTop: 12 }}>
      <Pressable testID="career-continue" accessibilityRole="button" onPress={() => (tap(), router.push(`/course/${c.id}` as any))} style={({ pressed }) => ({ padding: 16, borderRadius: 24, backgroundColor: C.blue, transform: [{ scale: pressed ? 0.98 : 1 }] })}>
        <View style={S.rowB}>
          <Txt s={12} w={8} c="#e3e7ff">
            {live ? '🔴 LIVE CLASS NOW' : pct >= 100 ? 'COMPLETED' : 'CONTINUE LEARNING'}
          </Txt>
          <Txt s={12} w={8} c="#e3e7ff">
            {pct}%
          </Txt>
        </View>
        <View style={[S.row, { gap: 12, marginTop: 8 }]}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Txt s={17} w={8} lines={2}>
              {c.title}
            </Txt>
            <Txt s={12} c="#e3e7ff" lines={1} style={{ marginTop: 2 }}>
              {pct >= 100 ? 'Certificate earned' : `Lesson ${Math.min(d + 1, L.length)} of ${L.length}: ${L[Math.min(d, L.length - 1)]}`}
            </Txt>
          </View>
          <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name={live ? 'video' : 'playfill'} size={20} color="#000" />
          </View>
        </View>
        <Bar pct={pct} h={5} color={C.yellow} bg="rgba(255,255,255,.22)" style={{ marginTop: 12 }} />
        {!live && c.startAt && pct < 100 ? (
          <Txt s={11} c="#e3e7ff" style={{ marginTop: 8 }}>
            Next live class · {classWhen(c.startAt)}
          </Txt>
        ) : null}
      </Pressable>
      {list.length > 1 ? (
        <Pressable accessibilityRole="button" onPress={() => (tap(), openCourses(null, 'mine'))} style={[S.rowB, { marginTop: 8, paddingHorizontal: 14, height: 44, borderRadius: 16, backgroundColor: C.s1, borderWidth: 1, borderColor: C.line }]}>
          <Txt s={13} w={7}>
            My learning · {list.length} courses
          </Txt>
          <Icon name="chev" size={16} color={C.muted} />
        </Pressable>
      ) : null}
    </View>
  );
}
function CourseCard({ c }: { c: Course }) {
  const [bg, fg] = toneOf(c);
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={c.title} onPress={() => (tap(), openCourse(c.id))} style={({ pressed }) => ({ width: 168, height: 190, padding: 14, borderRadius: 22, backgroundColor: bg, justifyContent: 'space-between', transform: [{ scale: pressed ? 0.97 : 1 }] })}>
      <View style={S.rowB}>
        <View style={{ width: 38, height: 38, borderRadius: 13, backgroundColor: fg === '#fff' ? 'rgba(255,255,255,.2)' : 'rgba(0,0,0,.1)', alignItems: 'center', justifyContent: 'center' }}>
          <Icon name={catIcon(c.cat)} size={19} color={fg} />
        </View>
        <View style={{ paddingHorizontal: 8, height: 24, borderRadius: 12, backgroundColor: fg === '#fff' ? '#fff' : '#000', justifyContent: 'center' }}>
          <Txt s={11} w={8} c={fg === '#fff' ? '#000' : '#fff'}>
            {c.price ? 'XAF ' + Math.round(c.price / 1000) + 'k' : 'Free'}
          </Txt>
        </View>
      </View>
      <View>
        <Txt s={15} w={8} c={fg} lines={3}>
          {c.title}
        </Txt>
        <Txt s={11} w={7} c={fg} style={{ opacity: 0.7, marginTop: 4 }} lines={1}>
          {c.prov.n}
        </Txt>
      </View>
    </Pressable>
  );
}
