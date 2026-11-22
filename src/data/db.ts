/* The app's data model. Mutable; call bump() after changes. */
import type { Pic } from '../logic/pics';

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
  /** what workers said about them as a client: average and how many (kept apart from the rating of their work) */
  crate?: number;
  creviews?: number;
  /** the services they list under their skill */
  services?: string[];
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
  /** [lng, lat], rounded to about 1 km */
  coord?: [number, number];
  skills?: string[];
};
export type Offer = { by: string; price: string; when: string; msg: string; stage?: string; cv?: CvFile | null; seen?: number; pro?: number; id?: string };
/** A CV attached to an offer: the person's getit CV (src 'profile'), or a file they picked (sent in the chat; uri/mime only exist on the sender's phone). */
export type CvFile = { name: string; kb: number; src?: string; uri?: string; mime?: string };
export type Post = {
  /** a request: the service under the skill it is for, and whether the getit agent handles it */
  service?: string;
  agent?: string;
  /** changed after it was posted */
  edited?: number;
  id: string;
  kind: 'request' | 'avail' | 'photo' | 'text';
  by?: string;
  client?: string;
  src?: string;
  text?: string;
  tags?: string[];
  time: string;
  likes?: number;
  comments?: number;
  job?: string;
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
export type Msg = {
  d?: string;
  sys?: string;
  call?: number;
  missed?: boolean;
  f?: 'me' | 'them';
  t?: string;
  at?: string;
  /** sending → sent (one tick) → delivered (two ticks: their phone has it) → read (they opened the chat) */
  st?: 'sent' | 'delivered' | 'read' | 'sending' | 'failed';
  k?: 'offer' | 'voice' | 'file' | 'img' | 'loc' | 'ts';
  /** k='ts': a question asked at this second of recording `rec` */
  ts?: number;
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
  /** I marked this chat as not read (my own reminder; see markChatUnread) */
  marked?: number;
  typing?: number;
  next?: string;
  job?: string;
  time: string;
  msgs: Msg[];
  group?: number;
  members?: string[];
  rulesOk?: number;
  muted?: number;
  /** server conversation id */
  cid?: string;
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
  /** when it happened (server time) */
  at?: string;
  /** the business page it is for (app id); none = the Regular profile */
  biz?: string;
  /** from the getit team (no person behind it) */
  bolo?: number;
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
  amt?: number;
  /** the service the job is for ("House wiring"), when it named one */
  service?: string;
  /** the request it came from */
  post?: string;
  /** the chat this booking belongs to */
  cid?: string;
  /** when its latest step was taken (ms) */
  stepAt?: number;
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
  mine?: number;
  biz?: string;
  seats?: number;
  people?: string[];
  prog?: Record<string, number>;
  /** lessons the learner has finished */
  done?: number;
  /** the course page on the school's or trainer's own website (courses are listings) */
  url?: string;
  /** short description written by whoever listed it */
  desc?: string;
  /** shown instead of the price when the site sets it (e.g. subscriptions) */
  priceText?: string;
  /** times people opened the site from getit */
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
  color?: string;
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
  reviewed?: number;
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
  hires?: string[];
  hireTypes?: string[];
  /** id of this page in Supabase */
  remoteId?: string;
};
export type SkillEntry = { si: number; n: string; a: string; c: string | null; x: Record<string, any>; xo: Record<string, string[]>; lv: string; custom?: number; desc?: string };
/** `ask`: the getit agent asked whether this amount (the client's budget, in FCFA) works; waiting for my answer. */
export type MyOffer = { price: string; when: string; state: 'sent' | 'acc'; app?: number; stage?: string; cv?: CvFile | null; ask?: number };
/** `service`: what the rated job was for (when it named one). Only ratings of someone's WORK are kept here. */
export type Review = { stars: number; tags: string[]; text: string; name: string; photo: Pic; time: string; service?: string; what?: string };
export type Service = { id: string; skill: string; price: number | string; unit: string; where: string; desc: string; pub: boolean; boost: number; draft?: boolean };

/* ------------------------------ catalogue only: no sample people, posts or chats ------------------------------ */
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
      /** getit: what the app is being used for right now: hiring someone, or getting work */
      mode: 'hire' as 'hire' | 'work',
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
      years: 0,
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
    /** Application to become a getit Career Expert (see src/logic/expert.ts). */
    EXPERT: {
      status: 'none' as 'none' | 'submitted' | 'review' | 'interview' | 'decision' | 'approved' | 'declined',
      step: 0,
      areas: [] as string[],
      fields: [] as string[],
      headline: '',
      years: 0,
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
    PREF: { visible: true, /** show others when I'm online / was last here (undefined until the server says it has this) */ showSeen: undefined as boolean | undefined, phoneAfterHire: true, twoStep: false, lang: 'English', momo: [] as [string, string, number][], notif: [1, 1, 1, 1, 0, 1, 1, 1, 1] },
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
    myLearning: [] as string[],
    DMREQ: {} as Record<string, 'pending' | 'ok'>,
    /** server conversation id → where it shows in the app */
    CONV: {} as Record<string, { key: string; inbox: 'W' | 'C' }>,
    /** chats hidden on this phone ("Delete chat"): conversation id → hidden at (ms) */
    HIDDEN: {} as Record<string, number>,
    /** finished jobs and answered offers I removed from my lists ("b:<booking>" / "o:<request>"): key → when (ms).
        Only my own list changes: the other person keeps theirs, and earnings and ratings are not touched. */
    HIDE: {} as Record<string, number>,
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
  /** `city` + `cityAt`: look in a chosen city (its position when known) instead of around me */
  F: { dist: 0, rate: 0, ver: false, urgent: false, budget: 0, sort: 'best', type: '', posted: 0, by: '' as '' | 'company' | 'person', exp: 0, city: '', cityAt: null as null | [number, number] },
  appStarted: false,
  /** opened the app already logged in (an existing user, e.g. after an update) */
  returning: false,
  /** the start-up checks (saved copy, session) have finished, whether or not the app opened before them */
  bootDone: false,
};

export const uid = (p = 'x') => `${p}${Date.now().toString(36)}${Math.floor(Math.random() * 1e4).toString(36)}`;
