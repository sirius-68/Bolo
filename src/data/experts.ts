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

export const EXPERT_LIST: Expert[] = [
  {
    id: 'ex_linda',
    name: 'Linda Ebai',
    pic: 'faces/expert0',
    head: 'CV & interview coach · ex-recruiter at a telecom group',
    bio: ['9 years recruiting for telecoms, banks and NGOs in Cameroon and Nigeria', 'Read more than 6,000 CVs and ran 1,500+ interviews', 'Helped 300+ graduates land their first job', 'Bilingual interviews: English and French'],
    about: 'I spent nine years on the other side of the table, deciding who gets the interview. Now I help job seekers see their CV the way a recruiter does: in 20 seconds. We fix what gets you rejected, practise the questions that scare you and plan how to talk about money.',
    specs: ['HR and training', 'Sales and customer service', 'Administrative staff', 'Finance and accounting'],
    goals: ['Create a strong CV', 'Rehearse an interview', 'Develop a job search strategy', 'Get rid of imposter syndrome'],
    langs: ['English', 'French'],
    yrs: 9,
    sessions: 412,
    soon: 1,
    services: [cv(7500), mock(12000), { ...plan(15000), t: 'Job search strategy session', d: 'If you’ve applied a lot and heard nothing, we find out why. We check your CV, where you apply and how you follow up, and set a weekly routine that gets replies.' }, quick(3000)],
    reviews: [
      { n: 'Brenda T.', at: 'October 2026', r: 5, s: 'CV review', t: 'Linda rewrote my summary in front of me and showed me why my old CV was being skipped. Two interviews the next week.' },
      { n: 'Ernest M.', at: 'October 2026', r: 5, s: 'Mock interview', t: 'Very honest feedback. She asked the exact questions the bank asked me three days later. I got the job.' },
      { n: 'Grace A.', at: 'September 2026', r: 5, s: 'Job search strategy', t: 'I had sent 40 applications with no reply. We changed how I apply and follow up. It works.' },
      { n: 'Kevin N.', at: 'August 2026', r: 4, s: 'Quick question', t: 'Quick, clear answer about negotiating my offer. Would book again.' },
      { n: 'Marie L.', at: 'July 2026', r: 5, s: 'CV review', t: 'The report was detailed and kind. I finally have a CV I’m proud of.' },
    ],
  },
  {
    id: 'ex_patrick',
    name: 'Patrick Ngu',
    pic: 'faces/expert1',
    head: 'Senior software engineer · works remotely for a Berlin start-up',
    bio: ['11 years building web and mobile products', 'Hires engineers for an international team', 'Moved from support to engineering himself', 'Mentors developers starting remote careers'],
    about: 'I went from fixing printers to leading an engineering team, without a computer science degree. I help people break into tech or move up: what to learn, how to show it, and how to pass technical interviews with international companies.',
    specs: ['Information technology', 'Science and education'],
    goals: ['Move into a new profession', 'Find a job abroad', 'Rehearse an interview', 'Build a career plan'],
    langs: ['English', 'Pidgin'],
    yrs: 11,
    sessions: 268,
    soon: 2,
    services: [{ ...mock(18000), t: 'Technical interview practice' }, { ...plan(15000), t: 'Break into tech: your plan' }, { ...cv(9000), t: 'Developer CV & portfolio review' }],
    reviews: [
      { n: 'Franklin E.', at: 'October 2026', r: 5, s: 'Technical interview practice', t: 'The live coding practice was exactly like my real interview. Patrick explains things simply.' },
      { n: 'Collins F.', at: 'September 2026', r: 5, s: 'Break into tech', t: 'Clear plan, no nonsense. I know what to learn for the next 3 months.' },
      { n: 'Aisha B.', at: 'August 2026', r: 5, s: 'Portfolio review', t: 'He told me which projects to remove. Got my first remote contract a month later.' },
    ],
  },
  {
    id: 'ex_esther',
    name: 'Esther Mbong',
    pic: 'faces/expert2',
    head: 'HR manager, 12 years · career change and burnout coach',
    bio: ['HR manager in manufacturing and retail', 'Certified career coach', 'Specialist in career change after 30', 'Runs workshops on stress and burnout at work'],
    about: 'Most people I coach are good at their job and tired of it. Together we work out what’s really wrong, whether to stay or move, and how to make the change without losing your income.',
    specs: ['HR and training', 'Manufacturing and engineering', 'Retail', 'Senior management'],
    goals: ['Handle burnout', 'Move into a new profession', 'Build a career plan', 'Get rid of imposter syndrome'],
    langs: ['English', 'French'],
    yrs: 12,
    sessions: 351,
    soon: 3,
    services: [{ ...plan(20000), t: 'Career change session' }, { id: 'burn', t: 'Burnout: next steps', price: 12000, mins: 45, fmt: 'Video call', d: 'A calm, private conversation about what’s draining you at work and what you can change this month, from boundaries with your manager to planning an exit.', gets: ['45-minute video call', 'A short written plan', 'One check-in a week later'] }, quick(4000)],
    reviews: [
      { n: 'Sandrine B.', at: 'October 2026', r: 5, s: 'Career change session', t: 'After 8 years in a bank I’m moving into HR. Esther helped me plan it step by step.' },
      { n: 'Lionel K.', at: 'September 2026', r: 5, s: 'Burnout', t: 'She listened and gave practical steps. I feel more in control.' },
      { n: 'Rita O.', at: 'August 2026', r: 4, s: 'Quick question', t: 'Helpful answer about asking for a transfer.' },
    ],
  },
  {
    id: 'ex_herve',
    pid: 'herve',
    name: 'Hervé Tchinda',
    pic: 'faces/herve',
    head: 'Civil engineer · construction careers in Africa and abroad',
    bio: ['8 years on road and building sites', 'Worked on projects in Cameroon and Canada', 'Knows engineering registration abroad', 'AutoCAD and site management'],
    about: 'I help builders, technicians and engineers grow: from site work to supervision, and from local jobs to international ones. I’ll tell you honestly what employers abroad check and how long it takes.',
    specs: ['Construction and real estate', 'Manufacturing and engineering', 'Blue-collar workers'],
    goals: ['Find a job abroad', 'Build a career plan', 'Create a strong CV'],
    langs: ['French', 'English'],
    yrs: 8,
    sessions: 97,
    soon: 4,
    services: [{ ...plan(15000), t: 'Working abroad as an engineer' }, { ...cv(6000), t: 'Engineering CV review' }],
    reviews: [
      { n: 'Gilbert N.', at: 'October 2026', r: 5, s: 'Working abroad', t: 'Real experience, real advice. Now I know which papers to prepare first.' },
      { n: 'Junior T.', at: 'August 2026', r: 5, s: 'CV review', t: 'My CV now shows my site experience properly.' },
    ],
  },
  {
    id: 'ex_mercy',
    pid: 'mercy',
    name: 'Mercy Nana',
    pic: 'faces/mercy',
    head: 'Registered nurse, 8 years · healthcare jobs at home and abroad',
    bio: ['Ward nurse and home-care coordinator', 'Prepares nurses for licensing exams', 'Helped 40+ nurses move to the UK and Canada'],
    about: 'Nurses, midwives and care workers ask me the same things: how to get a better post, how to prepare for exams and how to work abroad safely without paying agents who disappear.',
    specs: ['Healthcare', 'Domestic staff'],
    goals: ['Find a job abroad', 'Rehearse an interview', 'Handle burnout'],
    langs: ['English', 'Pidgin'],
    yrs: 8,
    sessions: 143,
    soon: 2,
    services: [{ ...plan(12000), t: 'Nursing abroad: the honest guide' }, { ...mock(8000, 45), t: 'Healthcare interview practice' }],
    reviews: [
      { n: 'Patience M.', at: 'October 2026', r: 5, s: 'Nursing abroad', t: 'She saved me from a fake agency. Clear steps and timelines.' },
      { n: 'Joy E.', at: 'September 2026', r: 5, s: 'Interview practice', t: 'Very kind and very prepared.' },
    ],
  },
  {
    id: 'ex_ruth',
    pid: 'ruth',
    name: 'Ruth Enow',
    pic: 'faces/ruth',
    head: 'Chef and caterer, 10 years · hospitality careers',
    bio: ['Runs a catering business with 6 staff', 'Hires cooks, waiters and kitchen staff', 'Worked in hotel kitchens in Douala'],
    about: 'I help people get into hotels and restaurants, or start their own food business: what to learn, how to price and how to stand out when you have no certificate yet.',
    specs: ['Hotels, restaurants, catering', 'Retail', 'Domestic staff'],
    goals: ['Build a career plan', 'Move into a new profession', 'Develop a job search strategy'],
    langs: ['English', 'French', 'Pidgin'],
    yrs: 10,
    sessions: 76,
    soon: 5,
    services: [{ ...plan(8000), t: 'Hospitality career plan' }, quick(2000)],
    reviews: [{ n: 'Divine F.', at: 'September 2026', r: 5, s: 'Career plan', t: 'Practical and motivating. I start at a hotel kitchen next month.' }],
  },
];

/** Promo codes for expert sessions (demo until payments are live). */
export const EX_PROMOS: Record<string, { off: number; label: string }> = {
  BOLO10: { off: 0.1, label: '10% off' },
  FIRST20: { off: 0.2, label: '20% off your first session' },
};
