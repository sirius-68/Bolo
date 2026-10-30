/* bolo Career Experts — who can apply, the application, and the review.
   Modelled on how established platforms vet experts:
   - Toptal: communication interview → skills review → live screening → test project (<3% accepted)
   - Upwork Expert-Vetted: live interview on expertise, soft skills and experience
   - MentorCruise: application + vetting (<15% approved), then ongoing review from mentee feedback
   - ICF coach credential: training + practice hours, assessed real session, ethics exam
   bolo keeps it proportionate for a local marketplace: automatic basics, a short ethics check,
   a real sample answer, a 15-minute interview, then a probation period judged by mentee ratings. */
import { router } from 'expo-router';
import { db, ui } from '../data/db';
import { openEdit } from '../sheets/account';
import { bump, later } from './live';
import { toast } from '../ui/overlay';
import { prPct } from './account';

export const EXPERT_AREAS = [
  'CV & cover letters',
  'Interview preparation',
  'Job search strategy',
  'First job & internships',
  'Career change',
  'Salary & negotiation',
  'Starting your own trade or business',
  'Promotion & leadership',
  'Studying abroad & scholarships',
];
export const EXPERT_FORMATS = ['30-min video call', '60-min video call', 'CV review (written)', 'Chat Q&A'];
export const EXPERT_LANGS = ['English', 'French', 'Pidgin', 'Spanish', 'Arabic', 'Russian'];

/** Things checked automatically before someone can apply. [key, title, why, met, fix] */
export type Crit = { k: string; t: string; why: string; ok: boolean; fix?: () => void; fixLabel?: string };
export function criteria(): Crit[] {
  const u = db.user;
  return [
    {
      k: 'id',
      t: db.PR.docs.id === 'review' ? 'Identity verification · being checked' : 'Identity verified',
      why: 'Mentees share their careers with you. They need to know who you are.',
      ok: db.PR.docs.id === 'verified' || db.PR.docs.id === 'review',
      fix: () => router.push('/id-verify'),
      fixLabel: 'Verify ID',
    },
    { k: 'photo', t: 'Real name and profile photo', why: 'Experts are people, not brands.', ok: !!u.name.trim() && !!u.avatar, fix: () => openEdit(), fixLabel: 'Add' },
    { k: 'years', t: '3+ years of work experience', why: 'Advice should come from experience in the field you advise on.', ok: u.years >= 3, fix: () => router.push({ pathname: '/skills', params: { mode: 'edit' } }), fixLabel: 'Update' },
    { k: 'history', t: 'Work history on your profile', why: 'At least one job in your experience, or a CV built on bolo.', ok: db.PR.exp.length > 0 || u.cvDone, fix: () => router.push('/cvflow'), fixLabel: 'Add' },
    { k: 'profile', t: 'Profile at least 70% complete', why: 'Mentees choose experts by reading their profiles.', ok: prPct() >= 70, fix: () => router.navigate('/(tabs)/me'), fixLabel: 'Finish' },
    { k: 'standing', t: 'Good standing on bolo', why: 'No upheld reports in the last 12 months.', ok: true },
  ];
}
export const qualifies = () => criteria().every((c) => c.ok);

/** Short ethics & judgement check (pass mark 4 of 5). [question, options, correct index] */
export const QUIZ: [string, string[], number][] = [
  [
    'A mentee asks you to add a job they never had to their CV “to stand out”. What do you do?',
    ['Add it, everyone does it', 'Help them describe their real experience in a stronger way', 'Refuse to work with them'],
    1,
  ],
  [
    'A mentee asks you to promise they’ll get hired at your company.',
    ['Promise it so they stay motivated', 'Explain you can’t promise a job, and say what you can help with', 'Ask for a bigger fee first'],
    1,
  ],
  [
    'A mentee offers to pay you directly by Mobile Money to avoid bolo fees.',
    ['Accept. It saves them money', 'Keep payments on bolo, where both of you are protected', 'Accept but only once'],
    1,
  ],
  [
    'During a session a mentee shares a health problem that affects their job search.',
    ['Keep it private and focus on how you can help', 'Mention it to their future employer', 'Post about it anonymously'],
    0,
  ],
  [
    'A mentee asks about a visa or a legal contract problem outside your expertise.',
    ['Guess an answer so they aren’t disappointed', 'Say it’s outside your area and point them to a qualified professional', 'Ignore the question'],
    1,
  ],
];
export const QUIZ_PASS = 4;

export const SAMPLE_Q = 'I finished my HND in accounting 8 months ago and have applied to more than 40 jobs without a single reply. What should I change?';
export const SAMPLE_MIN = 250;

export const CODE = [
  ['honest', 'I give honest, practical advice and never promise jobs or results'],
  ['private', 'I keep what mentees tell me private'],
  ['onbolo', 'I keep bookings and payments on bolo'],
  ['scope', 'I say when something is outside my expertise'],
  ['respect', 'I treat every mentee with respect, whatever their background'],
];

/** The review stages shown on the status screen. */
export const STAGES: [string, string, string][] = [
  ['submitted', 'Application received', 'We check your answers and documents.'],
  ['review', 'Expert review', 'A bolo reviewer reads your sample answer, usually 2–3 working days.'],
  ['interview', '15-minute video interview', 'A short call about your experience and how you’d help mentees.'],
  ['decision', 'Decision', 'We let you know by notification and email.'],
  ['approved', 'You’re a Career Expert', 'Your expert page goes live in Career.'],
];
export const stageIndex = (s: string) => Math.max(0, STAGES.findIndex((x) => x[0] === s));

export function submitApplication() {
  const E = db.EXPERT;
  E.status = 'submitted';
  E.submittedAt = new Date().toISOString();
  bump();
  // Demo: walk through the review so the flow can be seen end to end. Real accounts wait for a reviewer.
  if (db.demo) {
    later(6000, () => {
      if (db.EXPERT.status !== 'submitted') return;
      db.EXPERT.status = 'review';
      bump();
      later(6000, () => {
        if (db.EXPERT.status !== 'review') return;
        db.EXPERT.status = 'interview';
        bump();
        toast('Your expert application passed review. Pick an interview time');
      });
    });
  }
}
export function bookInterview(slot: string) {
  db.EXPERT.slot = slot;
  db.EXPERT.status = 'decision';
  bump();
  if (db.demo)
    later(8000, () => {
      if (db.EXPERT.status !== 'decision') return;
      db.EXPERT.status = 'approved';
      bump();
      toast('You’re now a bolo Career Expert 🎉');
    });
}
export const isExpert = () => db.EXPERT.status === 'approved';
export const applying = () => !['none', 'approved', 'declined'].includes(db.EXPERT.status);
