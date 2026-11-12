/* Career experts: checked people who help with CVs, interviews, job search and career moves.
   A profile has a short headline, a bio, the fields they know, the career goals they help with,
   paid services (each with its own price) and reviews from people who booked them. */
import type { Pic } from '../ui/kit';

export type Service = { id: string; t: string; price: number; mins?: number; fmt: 'Video call' | 'Written review' | 'Chat'; d: string; gets: string[] };
export type ExReview = { n: string; at: string; r: number; t: string; s?: string };
export type Expert = {
  id: string;
  /** when the expert is also a bolo member, their profile id (chat goes there) */
  pid?: string;
  name: string;
  pic: Pic;
  head: string;
  bio: string[];
  about: string;
  specs: string[];
  goals: string[];
  langs: string[];
  yrs: number;
  sessions: number;
  services: Service[];
  reviews: ExReview[];
  /** days until their nearest free slot */
  soon: number;
};

/** What people want help with (one per search). */
export const EX_GOALS = [
  'Create a strong CV',
  'Build a career plan',
  'Develop a job search strategy',
  'Move into a new profession',
  'Find a job abroad',
  'Rehearse an interview',
  'Get rid of imposter syndrome',
  'Handle burnout',
];
/** The fields an expert knows well (several per search). */
export const EX_SPECS = [
  'Administrative staff',
  'Agriculture',
  'Art, entertainment, mass media',
  'Automotive business',
  'Blue-collar workers',
  'Construction and real estate',
  'Domestic staff',
  'Finance and accounting',
  'Fitness and beauty',
  'Healthcare',
  'Hotels, restaurants, catering',
  'HR and training',
  'Information technology',
  'Lawyers',
  'Manufacturing and engineering',
  'Marketing, advertising, PR',
  'Retail',
  'Sales and customer service',
  'Science and education',
  'Security',
  'Senior management',
  'Transport and logistics',
];

const cv = (price: number): Service => ({
  id: 'cv',
  t: 'CV review with a written report',
  price,
  fmt: 'Written review',
  d: 'Send your CV and the kind of job you want. Within 3 days you get a marked-up CV and a short report: what works, what to cut, and how to match it to job adverts.',
  gets: ['Comments right on your CV', 'A rewritten summary and top 3 achievements', 'One follow-up question in chat'],
});
const mock = (price: number, mins = 60): Service => ({
  id: 'mock',
  t: 'Mock interview with feedback',
  price,
  mins,
  fmt: 'Video call',
  d: 'A real interview for the job you’re going for, then honest feedback: how you came across, which answers to fix and how to talk about salary.',
  gets: [`${mins}-minute video call`, 'Questions for your target role', 'Written notes after the call'],
});
const plan = (price: number): Service => ({
  id: 'plan',
  t: 'Career plan session',
  price,
  mins: 60,
  fmt: 'Video call',
  d: 'We look at where you are, what you enjoy and what pays, and leave with a 3-month plan: skills to learn, roles to target and people to contact.',
  gets: ['60-minute video call', 'A written 3-month plan', 'Two weeks of chat check-ins'],
});
const quick = (price: number): Service => ({
  id: 'qa',
  t: 'Quick question in chat',
  price,
  fmt: 'Chat',
  d: 'One focused question answered in detail in chat within 24 hours. Good for an offer you need to answer, a tricky email or a salary figure.',
  gets: ['Answer within 24 hours', 'One follow-up'],
});

/** Experts are bolo members whose application was approved (loaded from the server). */
export const EXPERT_LIST: Expert[] = [];

export const EX_PROMOS: Record<string, { off: number; label: string }> = {
  BOLO10: { off: 0.1, label: '10% off' },
  FIRST20: { off: 0.2, label: '20% off your first session' },
};
