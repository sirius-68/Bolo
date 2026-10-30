import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { Btn, Check, Chip, Chips, Field, Input, Label, Note, Page, Steps, Stepper, Sub, Title, TopBar, Txt, tap } from '../src/ui/kit';
import { Icon } from '../src/ui/Icon';
import { C, R, S } from '../src/ui/theme';
import { db } from '../src/data/db';
import { CATS } from '../src/data/catalog';
import { bump, useLive } from '../src/logic/live';
import { digits, toggle } from '../src/logic/core';
import { pick, toast } from '../src/ui/overlay';
import { CODE, EXPERT_AREAS, EXPERT_FORMATS, EXPERT_LANGS, QUIZ, QUIZ_PASS, SAMPLE_MIN, SAMPLE_Q, criteria, qualifies, submitApplication } from '../src/logic/expert';

const STEPS = ['Check you qualify', 'What you can help with', 'Experience and proof', 'Your sessions', 'Ethics check', 'Answer a real question', 'Expert code'];

/** Apply to become a bolo Career Expert — 7 short steps, saved as you go. */
export default function ExpertApply() {
  useLive();
  const E = db.EXPERT;
  const [tried, setTried] = useState(false);
  const [cred, setCred] = useState('');
  const step = Math.min(E.step, STEPS.length - 1);
  const go = (s: number) => {
    E.step = s;
    setTried(false);
    bump();
  };
  const score = QUIZ.filter((q, i) => E.quiz[i] === q[2]).length;
  const quizDone = E.quiz.filter((x) => x != null).length === QUIZ.length;
  const ok = [
    qualifies(),
    E.areas.length >= 1 && E.fields.length >= 1 && E.headline.trim().length >= 8,
    E.role.trim().length >= 2 && E.creds.length >= 1,
    E.formats.length >= 1 && E.langs.length >= 1 && (E.price === 'Free' || Number(E.amount) > 0),
    quizDone && score >= QUIZ_PASS,
    E.sample.trim().length >= SAMPLE_MIN,
    E.code.length === CODE.length,
  ][step];
  const hint = [
    'Meet every requirement above to continue',
    'Pick at least one topic and one field, and add a short headline',
    'Add your role and at least one proof of experience',
    'Choose a session type and language',
    quizDone ? `You need ${QUIZ_PASS} of ${QUIZ.length} — check your answers and try again` : 'Answer every question',
    `Write at least ${SAMPLE_MIN} characters`,
    'Agree to every point of the code',
  ][step];
  const next = () => {
    setTried(true);
    if (!ok) return;
    if (step < STEPS.length - 1) return go(step + 1);
    submitApplication();
    router.replace('/expert-status');
  };
  const sec = (t: string, children: React.ReactNode, sub?: string) => (
    <View style={{ marginTop: 18 }}>
      <Label>{t}</Label>
      {sub ? (
        <Txt s={12} c={C.muted} style={{ marginTop: -4, marginBottom: 8, marginLeft: 4 }}>
          {sub}
        </Txt>
      ) : null}
      {children}
    </View>
  );

  let body: React.ReactNode = null;
  if (step === 0)
    body = (
      <View style={{ gap: 10, marginTop: 18 }}>
        {criteria().map((c) => (
          <View key={c.k} style={[S.row, { gap: 12, padding: 14, borderRadius: 18, backgroundColor: C.s1, borderWidth: 1, borderColor: c.ok ? C.line : 'rgba(246,238,92,.4)', alignItems: 'flex-start' }]}>
            <View style={{ width: 26, height: 26, borderRadius: 13, marginTop: 1, backgroundColor: c.ok ? C.mint : C.s3, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name={c.ok ? 'check' : 'x'} size={14} color={c.ok ? '#000' : C.muted} />
            </View>
            <View style={{ flex: 1 }}>
              <Txt s={14} w={8}>
                {c.t}
              </Txt>
              <Txt s={12} c={C.muted}>
                {c.why}
              </Txt>
            </View>
            {!c.ok && c.fix ? (
              <Pressable accessibilityRole="button" onPress={() => (tap(), c.fix!())} style={{ paddingHorizontal: 12, height: 32, borderRadius: 16, backgroundColor: C.yellow, justifyContent: 'center' }}>
                <Txt s={12} w={8} c="#000">
                  {c.fixLabel}
                </Txt>
              </Pressable>
            ) : null}
          </View>
        ))}
        <Note icon="shield">After you apply: a bolo reviewer reads your answers (2–3 working days), then a 15-minute video interview. New experts keep the badge while their first 5 sessions average 4.5★ or more.</Note>
      </View>
    );
  if (step === 1)
    body = (
      <>
        {sec(
          'Topics you can help with · up to 3',
          <Chips>
            {EXPERT_AREAS.map((a) => (
              <Chip key={a} small label={a} on={E.areas.includes(a)} onPress={() => (E.areas.includes(a) || E.areas.length < 3 ? (toggle(E.areas, a), bump()) : toast('Pick up to 3 — the ones you’re strongest at'))} />
            ))}
          </Chips>,
        )}
        {sec(
          'Fields you know from the inside · up to 2',
          <View style={{ gap: 8 }}>
            <Chips>
              {E.fields.map((f) => (
                <Chip key={f} small label={f} on onPress={() => (toggle(E.fields, f), bump())} />
              ))}
              {E.fields.length < 2 ? <Chip small label="+ Add a field" onPress={() => pick('Field', CATS.map((c) => c[0]).filter((c) => !E.fields.includes(c)), undefined, (v) => (E.fields.push(v), bump()), true)} /> : null}
            </Chips>
          </View>,
          'e.g. Accounting, Electrician, Developer, Sales',
        )}
        <View style={{ marginTop: 18 }}>
          <Field label="Your headline" error={tried && E.headline.trim().length < 8 && 'Add a short headline'}>
            <Input testID="ex-headline" value={E.headline} onChangeText={(v) => ((E.headline = v), bump())} maxLength={60} placeholder="e.g. HR manager · 10 years hiring in banking" />
          </Field>
        </View>
      </>
    );
  if (step === 2)
    body = (
      <>
        {sec('Years of experience in this field', <Stepper text={`${E.years} years`} onMinus={() => ((E.years = Math.max(3, E.years - 1)), bump())} onPlus={() => ((E.years = Math.min(45, E.years + 1)), bump())} />)}
        <View style={{ marginTop: 18 }}>
          <Field label="Current or last role" error={tried && E.role.trim().length < 2 && 'Add your role'}>
            <Input testID="ex-role" value={E.role} onChangeText={(v) => ((E.role = v), bump())} placeholder="e.g. Senior accountant at …" autoCapitalize="words" />
          </Field>
        </View>
        {sec(
          'Proof of experience · at least 1',
          <View style={{ gap: 8 }}>
            {E.creds.map((c, i) => (
              <View key={c + i} style={[S.row, { gap: 10, padding: 12, borderRadius: R.md, backgroundColor: C.s1 }]}>
                <Icon name="cert" size={18} color={C.yellow} />
                <Txt s={13} style={{ flex: 1 }}>
                  {c}
                </Txt>
                <Pressable accessibilityLabel={`Remove ${c}`} hitSlop={8} onPress={() => (E.creds.splice(i, 1), bump())}>
                  <Icon name="x" size={16} color={C.muted} />
                </Pressable>
              </View>
            ))}
            <View style={[S.row, { gap: 8 }]}>
              <Input testID="ex-cred" style={{ flex: 1 }} value={cred} onChangeText={setCred} placeholder="Degree, certificate or employer reference" onSubmit={() => cred.trim() && (E.creds.push(cred.trim()), setCred(''), bump())} />
              <Pressable accessibilityLabel="Add proof" onPress={() => cred.trim() && (E.creds.push(cred.trim()), setCred(''), bump())} style={{ width: 54, height: 54, borderRadius: R.md, backgroundColor: C.yellow, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="plus" size={22} color="#000" />
              </Pressable>
            </View>
          </View>,
          'We may ask for a copy or contact a referee during review.',
        )}
        <View style={{ marginTop: 18 }}>
          <Field label="LinkedIn or portfolio · optional">
            <Input value={E.link} onChangeText={(v) => ((E.link = v.trim()), bump())} icon="linkedin" placeholder="https://…" autoCapitalize="none" keyboardType="url" />
          </Field>
        </View>
      </>
    );
  if (step === 3)
    body = (
      <>
        {sec(
          'Session types',
          <Chips>
            {EXPERT_FORMATS.map((f) => (
              <Chip key={f} small label={f} on={E.formats.includes(f)} onPress={() => (toggle(E.formats, f), bump())} />
            ))}
          </Chips>,
        )}
        {sec(
          'Price per session',
          <>
            <Chips>
              {(['Free', 'Paid'] as const).map((x) => (
                <Chip key={x} small label={x} on={E.price === x} onPress={() => ((E.price = x), bump())} />
              ))}
            </Chips>
            {E.price === 'Paid' ? <Input style={{ marginTop: 10 }} value={E.amount} onChangeText={(v) => ((E.amount = digits(v)), bump())} prefix="XAF" keyboardType="number-pad" placeholder="e.g. 5,000" /> : null}
          </>,
          'Most experts start at XAF 3,000–10,000 for 30 minutes. bolo keeps 10%.',
        )}
        {sec(
          'Languages you’ll mentor in',
          <Chips>
            {EXPERT_LANGS.map((l) => (
              <Chip key={l} small label={l} on={E.langs.includes(l)} onPress={() => (toggle(E.langs, l), bump())} />
            ))}
          </Chips>,
        )}
      </>
    );
  if (step === 4)
    body = (
      <View style={{ gap: 14, marginTop: 18 }}>
        <Note icon="exam">Five situations every expert meets. Choose what you’d do — you need {QUIZ_PASS} of {QUIZ.length}.</Note>
        {QUIZ.map(([q, opts, right], i) => (
          <View key={i} style={{ padding: 14, borderRadius: 18, backgroundColor: C.s1, borderWidth: 1, borderColor: C.line, gap: 8 }}>
            <Txt s={14} w={8}>
              {i + 1}. {q}
            </Txt>
            {opts.map((o, j) => {
              const on = E.quiz[i] === j;
              const show = tried && quizDone && on;
              return (
                <Pressable
                  key={j}
                  testID={`q${i}-${j}`}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: on }}
                  onPress={() => ((E.quiz[i] = j), bump())}
                  style={[S.row, { gap: 10, padding: 12, borderRadius: 14, backgroundColor: show ? (j === right ? 'rgba(123,224,167,.18)' : 'rgba(255,107,107,.15)') : on ? 'rgba(61,90,241,.22)' : C.s2, borderWidth: 1.5, borderColor: on ? C.lav : 'transparent' }]}
                >
                  <View style={{ width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: on ? C.lav : C.s3, alignItems: 'center', justifyContent: 'center' }}>
                    {on ? <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: C.lav }} /> : null}
                  </View>
                  <Txt s={13} style={{ flex: 1 }}>
                    {o}
                  </Txt>
                </Pressable>
              );
            })}
          </View>
        ))}
        {quizDone ? (
          <Txt s={13} w={8} c={score >= QUIZ_PASS ? C.mint : C.yellow} center>
            {score >= QUIZ_PASS ? `${score} of ${QUIZ.length} — passed` : `${score} of ${QUIZ.length} — not yet`}
          </Txt>
        ) : null}
      </View>
    );
  if (step === 5)
    body = (
      <View style={{ gap: 14, marginTop: 18 }}>
        <View style={{ padding: 16, borderRadius: 18, backgroundColor: C.blue }}>
          <Txt s={12} w={8} c="#e3e7ff">
            A JOB SEEKER ASKS
          </Txt>
          <Txt s={15} w={7} style={{ marginTop: 6 }}>
            “{SAMPLE_Q}”
          </Txt>
        </View>
        <Field label={`Your answer · ${E.sample.trim().length}/${SAMPLE_MIN}+ characters`} error={tried && E.sample.trim().length < SAMPLE_MIN && `Write at least ${SAMPLE_MIN} characters`}>
          <Input testID="ex-sample" multiline minHeight={180} value={E.sample} onChangeText={(v) => ((E.sample = v), bump())} maxLength={1500} placeholder="Answer as you would in a real session — specific, kind and practical." />
        </Field>
        <Note icon="sparkle">Reviewers look for: questions you’d ask first, 2–3 concrete changes, and an honest next step. No promises of a job.</Note>
      </View>
    );
  if (step === 6)
    body = (
      <View style={{ gap: 12, marginTop: 18 }}>
        {CODE.map(([k, t]) => (
          <Check key={k} on={E.code.includes(k)} onPress={() => (toggle(E.code, k), bump())}>
            {t}
          </Check>
        ))}
        <View style={{ padding: 14, borderRadius: 18, backgroundColor: C.s1, borderWidth: 1, borderColor: C.line, gap: 4, marginTop: 6 }}>
          <Txt s={15} w={8}>
            {E.headline || 'Your headline'}
          </Txt>
          <Txt s={12} c={C.muted}>
            {[E.areas.join(', '), E.fields.join(', '), `${E.years} years`].filter(Boolean).join(' · ')}
          </Txt>
          <Txt s={12} c={C.muted}>
            {[E.formats.join(', '), E.price === 'Free' ? 'Free' : `XAF ${Number(E.amount || 0).toLocaleString('en')} per session`, E.langs.join(', ')].join(' · ')}
          </Txt>
        </View>
      </View>
    );

  return (
    <Page keyboard>
      <TopBar title="Become an expert" onBack={() => (step > 0 ? go(step - 1) : router.back())} />
      <Steps total={STEPS.length} on={step + 1} />
      <Txt s={12} w={7} c={C.muted} style={{ marginTop: 14 }}>
        Step {step + 1} of {STEPS.length}
      </Txt>
      <Title sm style={{ marginTop: 2 }}>
        {STEPS[step]}
      </Title>
      {step === 0 ? <Sub>Every bolo Career Expert meets these. Fix anything missing here — your answers are saved.</Sub> : null}
      {body}
      <View style={{ flex: 1, minHeight: 20 }} />
      <Btn testID="ex-next" variant="yellow" title={step < STEPS.length - 1 ? 'Continue' : 'Submit application'} onPress={next} style={{ marginTop: 20 }} />
      {tried && !ok ? (
        <Txt s={12} c={C.muted} center style={{ marginTop: 8 }}>
          {hint}
        </Txt>
      ) : null}
    </Page>
  );
}
