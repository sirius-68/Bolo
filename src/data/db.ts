/* The app's data model. Mutable (like the prototype); call bump() after changes. */
import type { Pic } from '../ui/kit';
import { CATS } from './catalog';

/* ------------------------------ types ------------------------------ */
export type Person = {
  name: string;
  short?: string;
  handle?: string;
  role: string;
  tag?: string;
  years: number;
  rate: number;
  dist: string;
  area: string;
  photo: Pic;
  pin?: Pic;
  verified?: number;
  jobs: number;
  reviews: string;
  followers: number;
  hires?: number;
  client?: number;
  biz?: number;
  group?: number;
  sector?: string;
  about?: string;
  mentorship?: string;
  self?: number;
  /** server ids: the account behind this person or business page */
  uid?: string;
  bizId?: string;
  /** [lng, lat], rounded to about 1 km */
  coord?: [number, number];
  skills?: string[];
};
export type Offer = { by: string; price: string; when: string; msg: string; stage?: string; cv?: CvFile | null; seen?: number; pro?: number; id?: string };
/** A CV attached to an offer: the person's bolo CV (src 'profile'), or a file they picked (sent in the chat; uri/mime only exist on the sender's phone). */
export type CvFile = { name: string; kb: number; src?: string; uri?: string; mime?: string };
export type Post = {
  id: string;
  kind: 'image' | 'request' | 'job' | 'avail' | 'art' | 'photo' | 'text';
  by?: string;
  client?: string;
  img?: string;
  src?: string;
  art?: string;
  text?: string;
  tags?: string[];
  time: string;
  likes?: number;
  comments?: number;
  job?: string;
  took?: string;
  paid?: string;
  stars?: number;
  slots?: string[];
  // requests / vacancies
  cat?: string;
  title?: string;
  budget?: string;
  when?: string;
  area?: string;
  offers?: number;
  urgent?: number | boolean;
  type?: string;
  openings?: number;
  biz?: number | string | null;
  mine?: number;
  as?: 'regular' | 'business';
  booked?: string;
  photos?: string[];
  offerList?: Offer[];
  status?: 'open' | 'booked' | 'closed';
  /** [lng, lat] of the job, rounded to about 500 m */
  coord?: [number, number];
  at?: number;
};
export type Reel = { by: string; scene: string; cap: string; tags: string[]; job: string; likes: number; comments: number; views: string; live?: number };
export type Msg = {
  d?: string;
  sys?: string;
  call?: number;
  missed?: boolean;
  f?: 'me' | 'them';
  t?: string;
  at?: string;
  st?: 'sent' | 'read' | 'sending' | 'failed';
  k?: 'offer' | 'voice' | 'file' | 'img' | 'loc' | 'ts';
  /** k='ts': a question asked at this second of recording `rec` */
  ts?: number;
  rec?: string;
  job?: string;
  price?: string;
  when?: string;
  dur?: string;
  state?: 'acc' | 'dec';
  name?: string;
  size?: string;
  src?: string;
  fw?: number;
  /** server message id */
  id?: string;
  /** offer: who does the work (the sender's quote, or the recipient of a hire request) */
  wk?: 'me' | 'them';
  /** group chats: who sent it */
  by?: string;
  lat?: number;
  lng?: number;
  ts0?: number;
};
export type Thread = {
  pinned?: number;
  on?: number;
  unread?: number;
  typing?: number;
  next?: string;
  job?: string;
  time: string;
  msgs: Msg[];
  group?: number;
  members?: string[];
  rulesOk?: number;
  course?: number;
  muted?: number;
  /** server conversation id */
  cid?: string;
  /** the people in this chat (server ids) */
  uids?: string[];
};
export type Notif = {
  id: string;
  g: string;
  type: string;
  who?: string | string[];
  time: string;
  read?: number;
  others?: number;
  snip?: string;
  text?: string;
  job?: string;
  price?: string;
  when?: string;
  stars?: number;
  amount?: string;
  booking?: string;
  state?: 'acc' | 'dec';
  /** where tapping it goes (see src/logic/notify.ts) */
  go?: import('../logic/notify').Go;
  /** event key: the same event is never notified twice */
  key?: string;
  cat?: string;
  /** how many events this one line stands for (missed calls from the same person) */
  count?: number;
};
export type Booking = {
  id: string;
  worker: string;
  client: string;
  title: string;
  when: string;
  price: string;
  area: string;
  state: 'booked' | 'onway' | 'working' | 'done' | 'confirmed';
  eta: number;
  eta0: number;
  log: Record<string, string>;
  as?: 'regular' | 'business';
  reviewed?: number;
  simRunning?: number;
  /** escrow: the client's money for this job. unfunded = booked but not paid in yet */
  escrow?: 'unfunded' | 'held' | 'released' | 'refunded';
  amt?: number;
  paidOut?: number;
  /** the chat this booking belongs to */
  cid?: string;
  /** where the job is [lng, lat] */
  dest?: [number, number];
  /** the worker's live position while on the way [lng, lat] and when it was updated */
  live?: [number, number];
  liveAt?: number;
};
export type Opp = {
  id: string;
  biz: string;
  kind: string;
  title: string;
  cat: string;
  dur: string;
  start: string;
  mode: string;
  pay: string;
  seats: number;
  joined: number;
  deadline: string;
  desc: string;
  skills: string[];
  mine?: number;
  applied?: number;
  people?: string[];
  st?: Record<string, 'acc' | 'dec'>;
  emp?: number;
};
export type Course = {
  id: string;
  title: string;
  prov: { n: string; logo: Pic };
  cat: string;
  lv: string;
  dur: string;
  type: string;
  fmt: string;
  reg: string;
  price: number;
  old: number;
  prof: string;
  skills: string[];
  mo: number;
  mine?: number;
  biz?: string;
  seats?: number;
  enrolled?: number;
  people?: string[];
  prog?: Record<string, number>;
  emp?: number;
  /** timestamp of the next live class for learners; quick = test course that starts 1 minute after enrolling */
  startAt?: number;
  quick?: number;
  /** demo course that is always live, for trying the live class */
  live?: number;
  /** lessons the learner has finished */
  done?: number;
  /** the course page on the school's or trainer's own website (courses are listings) */
  url?: string;
  /** short description written by whoever listed it */
  desc?: string;
  /** shown instead of the price when the site sets it (e.g. subscriptions) */
  priceText?: string;
  /** times people opened the site from bolo */
  views?: number;
};
export type Mentorship = {
  id: string;
  by?: string;
  title: string;
  field: string;
  format: '1-to-1' | 'Group';
  dur: string;
  price: string;
  seats: number;
  joined: number;
  desc: string;
  rules?: string[];
  mine?: number;
  asBiz?: string | null;
  people?: string[];
  joinedMe?: 'req' | 'yes' | null;
  st?: Record<string, 'acc' | 'dec' | 'pending'>;
  plain?: number;
  course?: string;
  color?: string;
  emp?: number;
};
export type BizSample = {
  name: string;
  sector: string;
  size: string;
  area: string;
  logo: Pic;
  about: string;
  rate: number;
  jobs: number;
  hires: number;
  reviews: string;
  followers: number;
  web: string;
};
export type Contract = {
  id: string;
  person: string;
  role: string;
  pay: string;
  start: string;
  dur: string;
  prob: string;
  hours: string;
  terms: string;
  status: 'sent' | 'active' | 'ended';
  vac: string;
  endedAt?: string;
  reviewed?: number;
};
export type Ad = {
  id: string;
  t: [string, string, string, string];
  head: string;
  text: string;
  areas: string[];
  fields: string[];
  reach: number;
  days: number;
  reached: number;
  clicks: number;
  apps: number;
  status: 'active' | 'paused' | 'done';
  paid: number;
  start: string;
  /** 'story' = full-screen ad; skip = seconds before it can be closed (0–10) */
  fmt?: 'card' | 'story';
  skip?: number;
};
export type MyBiz = {
  id: string;
  name: string;
  sector: string;
  size: string;
  city: string;
  area: string;
  address: string;
  phone: string;
  email: string;
  web: string;
  about: string;
  rccm: string;
  niu: string;
  logo: string | null;
  color: string;
  verified: 'none' | 'review' | 'verified';
  draft?: boolean;
  recruiters: { n: string; r: string; pending?: number }[];
  team: string[];
  contracts: Contract[];
  events: { icon: string; text: string; at: string }[];
  ads: Ad[];
  hires?: string[];
  hireTypes?: string[];
  /** id of this page in Supabase */
  remoteId?: string;
};
export type SkillEntry = { si: number; n: string; a: string; c: string | null; x: Record<string, any>; xo: Record<string, string[]>; lv: string; custom?: number; desc?: string };
export type MyOffer = { price: string; when: string; state: 'sent' | 'acc'; app?: number; stage?: string; cv?: CvFile | null };
export type Review = { stars: number; tags: string[]; text: string; name: string; photo: Pic; time: string };
export type Service = { id: string; skill: string; price: number | string; unit: string; where: string; desc: string; pub: boolean; boost: number; draft?: boolean };

/* ------------------------------ catalogue only: no sample people, posts or chats ------------------------------ */
/** Short work videos. Filled from people's video posts once video upload is live. */
export const REELS: Reel[] = [];
export function makeDb() {
  const P: Record<string, Person> = {};
  const BIZ_SAMPLE: Record<string, BizSample> = {};
  const THREADS_C: Record<string, Thread> = {};
  const THREADS_W: Record<string, Thread> = {};
  const ORDER_C: string[] = [];
  const ORDER_W: string[] = [];
  return {
    /** 4 = real accounts only (no sample data). Older saved copies are dropped on start. */
    v: 4,
    loggedIn: false,
    /** Supabase user id of the signed-in account */
    uid: null as string | null,
    user: {
      name: '',
      role: 'worker' as 'worker' | 'client',
      contact: '',
      avatar: null as string | null,
      city: '',
      /** true = city follows GPS; false = picked by hand */
      cityAuto: true as boolean,
      /** last known position [lng, lat] */
      coord: null as [number, number] | null,
      country: '' as string,
      bio: '',
      skills: [] as string[],
      years: 3,
      level: 'Mid-level',
      jobTypes: [] as string[],
      workTypes: [] as string[],
      skillList: null as SkillEntry[] | null,
      intents: ['find', 'hire'] as string[],
      pro: { regular: false, business: false },
      bizOnly: false,
      cvDone: false,
      cv: null as null | { prof: string; gender: string; dob: string; cit: string; permit: string; skills: string[]; noExp: boolean },
      verified: false,
    },
    PR: {
      wst: 'open',
      cst: 'hiring',
      services: null as Service[] | null,
      area: { home: '', areas: [] as string[], radius: 10 },
      ct: { phone: '', email: '', whatsapp: '', telegram: '', facebook: '' } as Record<string, string>,
      exp: [] as { role: string; org: string; from: number; to: number | null; desc: string }[],
      edu: { level: 'Secondary', courses: [] as { name: string; org: string; year: string }[] },
      docs: { id: null, biz: null, drive: null } as Record<string, string | null>,
      video: null as null | { dur: string; at: string },
      vidHide: false,
      langs: [['English', 'Fluent']] as [string, string][],
      tests: {} as Record<string, string>,
    },
    BIZ: { list: [] as MyBiz[], active: null as string | null },
    /** Application to become a bolo Career Expert (see src/logic/expert.ts). */
    EXPERT: {
      status: 'none' as 'none' | 'submitted' | 'review' | 'interview' | 'decision' | 'approved' | 'declined',
      step: 0,
      areas: [] as string[],
      fields: [] as string[],
      headline: '',
      years: 3,
      role: '',
      creds: [] as string[],
      link: '',
      formats: ['30-min video call'] as string[],
      price: 'Paid' as 'Free' | 'Paid',
      amount: '5000',
      langs: ['English'] as string[],
      quiz: [] as number[],
      quizScore: null as number | null,
      sample: '',
      code: [] as string[],
      slot: '',
      submittedAt: '',
      sessions: 0,
    },
    PREF: { visible: true, phoneAfterHire: true, twoStep: false, lang: 'English', momo: [] as [string, string, number][], notif: [1, 1, 1, 1, 0, 1, 1, 1, 1] },
    P,
    BIZ_SAMPLE,
    POSTS: [] as Post[],
    NOTIFS_C: [] as Notif[],
    NOTIFS_W: [] as Notif[],
    THREADS_C,
    THREADS_W,
    ORDER_C,
    ORDER_W,
    BOOKINGS: [] as Booking[],
    OPPS: [] as Opp[],
    COURSES: [] as Course[],
    MENTORSHIPS: [] as Mentorship[],
    REVIEWS: {} as Record<string, Review[]>,
    myOffers: {} as Record<string, MyOffer & { id?: string }>,
    hired: [] as string[],
    saved: [] as string[],
    followed: [] as string[],
    liked: [] as string[],
    savedPosts: [] as string[],
    savedJobs: [] as string[],
    savedOpps: [] as string[],
    savedCourses: [] as string[],
    savedCos: [] as string[],
    savedMentors: [] as string[],
    reelLiked: [] as number[],
    myLearning: [] as string[],
    DMREQ: {} as Record<string, 'pending' | 'ok'>,
    mutedG: [] as string[],
    stats: { nextId: 1 },
    /** bolo wallet. Hidden until mobile money is connected (see src/logic/money.ts). */
    WALLET: { bal: 0, tx: [] as import('../logic/wallet').Tx[] },
    /** server conversation id → where it shows in the app */
    CONV: {} as Record<string, { key: string; inbox: 'W' | 'C' }>,
    /** comments per post, loaded when a post is opened */
    CMTS: {} as Record<string, { id: string; by: string; t: string; at: string }[]>,
    /** approved career experts (server) */
    EXPERTS: [] as import('./experts').Expert[],
    /** chats hidden on this phone ("Delete chat"): conversation id → hidden at (ms) */
    HIDDEN: {} as Record<string, number>,
    /** when everything was last loaded from the server */
    syncedAt: 0,
  };
}
export type DB = ReturnType<typeof makeDb>;

/** The live model. Replaced wholesale on log out / restore. */
export let db: DB = makeDb();
export function setDb(d: DB) {
  db = d;
}

/** UI state that should not be persisted. */
export const ui = {
  feedView: 'all' as 'all' | 'feed' | 'jobs' | 'people' | 'mentors',
  meTab: 'Profile',
  ntTab: 'All',
  ibTab: 'All',
  cat: null as string | null,
  q: '',
  F: { dist: 0, rate: 0, ver: false, urgent: false, budget: 0, sort: 'best', type: '', posted: 0, by: '' as '' | 'company' | 'person', exp: 0 },
  openChat: null as string | null,
  current: '' as string,
  reelFilter: 'all' as 'all' | 'following' | 'near',
  stFilter: 'all',
  svF: 'All',
  appStarted: false,
  /** set when ID verification was opened from inside the app (not sign-up): finish returns there */
  verifyReturn: '' as string,
  /** opened the app already logged in (an existing user, e.g. after an update) */
  returning: false,
  cvT: 'Classic',
  proBill: 'month' as 'month' | 'year',
  justJoined: false,
};

export const uid = (p = 'x') => `${p}${Date.now().toString(36)}${Math.floor(Math.random() * 1e4).toString(36)}`;
export const CAT_NAMES = CATS.map((c) => c[0]);
