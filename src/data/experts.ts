/* Career experts: checked people who help with CVs, interviews, job search and career moves.
   A profile has a short headline, a bio, the fields they know, the career goals they help with,
   paid services (each with its own price) and reviews from people who booked them. */
import type { Pic } from '../ui/kit';

export type Service = { id: string; t: string; price: number; mins?: number; fmt: 'Video call' | 'Written review' | 'Chat'; d: string; gets: string[] };
export type ExReview = { n: string; at: string; r: number; t: string; s?: string };
export type Expert = {
  id: string;
  /** when the expert is also a getit member, their profile id (chat goes there) */
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



