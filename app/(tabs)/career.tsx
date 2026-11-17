import React from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { db } from '../../src/data/db';
import { activeExBookings, expertById } from '../../src/logic/experts';
import { CourseTile } from '../../src/components/CourseListing';
import { openSession } from '../../src/components/ExpertUI';
import { Avatar, ProTag, Txt, tap } from '../../src/ui/kit';
import { Icon } from '../../src/ui/Icon';
import { C, S } from '../../src/ui/theme';
import { bizName, curBiz, isW } from '../../src/logic/core';
import { useLive } from '../../src/logic/live';
import { openCourses, openProfile } from '../../src/logic/nav';
import { Rail, Sec, TabHeader, Pull } from '../../src/components/common';
import { ListRow, MentorCard, OppCard } from '../../src/components/cards';
import { onScrollFab } from '../../src/components/NavBar';
import { openOpp, crSee, openArticles, openExperts, openMentor, openMentorForm, openOppForm, openPaths, openSalaries, openCV } from '../../src/sheets/career';

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
  const courses = db.COURSES.filter((c) => (w ? !c.mine : true)).slice(0, 10);
  const sessions = w ? activeExBookings() : [];
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
    <ScrollView style={{ flex: 1, backgroundColor: C.bg }} onScroll={onScrollFab} scrollEventThrottle={32} refreshControl={<Pull />} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingTop: ins.top, paddingHorizontal: 20, paddingBottom: 120 + ins.bottom }}>
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
            
          </>
        ) : (
          <>
            <Promo title="Create an internship" text="Find and train young talent. It shows here for everyone" cta="Create" icon="cap" onPress={() => openOppForm('Internship')} />
            <Promo alt title="Run a program or course" text="Apprenticeships, graduate programs, trainings and courses" cta="Create" icon="sparkle" onPress={() => openOppForm('Training program')} />
          </>
        )}
      </View>
      {w ? (
        <Pressable testID="career-experts" accessibilityRole="button" onPress={openExperts} style={({ pressed }) => ({ marginTop: 12, padding: 16, borderRadius: 22, backgroundColor: C.blue, transform: [{ scale: pressed ? 0.98 : 1 }] })}>
          <Txt s={16} w={8}>
            Career experts
          </Txt>
          <Txt s={12} c="#e3e7ff" style={{ marginTop: 2 }}>
            Book a CV review, a mock interview or a career plan with a checked expert
          </Txt>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 }}>
            <View style={{ flexDirection: 'row' }}>
              {db.EXPERTS.slice(0, 4).map((e, i) => (
                <Avatar key={e.id} pic={e.pic} size={34} style={{ marginLeft: i ? -8 : 0, borderWidth: 2, borderColor: C.blue }} />
              ))}
            </View>
            <View style={[S.row, { gap: 6, paddingHorizontal: 12, height: 30, borderRadius: 15, backgroundColor: '#fff' }]}>
              <Txt s={12} w={8} c={C.blue}>
                {sessions.length ? `${sessions.length} booked session${sessions.length === 1 ? '' : 's'}` : 'Find an expert'}
              </Txt>
              <Icon name="arrow" size={12} color={C.blue} />
            </View>
          </View>
        </Pressable>
      ) : null}
      {myOpps.length || (w && (joined.length || sessions.length)) ? (
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
            {sessions.map((b) => (
              <ListRow key={b.id} icon="calcheck" title={b.title} sub={`Expert session · ${expertById(b.ex)?.name || ''}${b.when ? ' · ' + b.when : ''}`} pill={b.state === 'scheduled' ? 'Time agreed' : 'Booked'} pillKind={b.state === 'scheduled' ? 'acc' : 'wait'} onPress={() => openSession(b)} />
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
      <Sub t="From schools and trainers. Tap one to open its website" />
      <Rail>
        {courses.map((c) => (
          <CourseTile key={c.id} c={c} />
        ))}
        {w ? (
          <Pressable testID="career-teach" accessibilityRole="button" onPress={() => (tap(), router.push('/teach' as any))} style={{ width: 168, height: 196, padding: 16, borderRadius: 22, borderWidth: 1, borderStyle: 'dashed', borderColor: C.s3, justifyContent: 'center', gap: 8 }}>
            <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: C.lav, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="cap" size={20} color="#000" />
            </View>
            <Txt s={15} w={8}>
              List your course
            </Txt>
            <Txt s={12} c={C.muted}>
              Add a link to your course page. We send you learners
            </Txt>
          </Pressable>
        ) : null}
      </Rail>
      <Sec testID="career-mentors-all" title="Mentorship" action="All" onAction={() => router.push('/mentors' as any)} />
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
        <Pressable accessibilityRole="button" onPress={() => openMentorForm()} style={{ width: 180, padding: 16, borderRadius: 22, borderWidth: 1, borderStyle: 'dashed', borderColor: C.s3, justifyContent: 'center', gap: 8 }}>
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

