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
};
export type Offer = { by: string; price: string; when: string; msg: string; stage?: string; cv?: CvFile | null; seen?: number; pro?: number };
export type CvFile = { name: string; kb: number; src?: string };
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
  st?: 'sent' | 'read';
  k?: 'offer' | 'voice' | 'file' | 'img' | 'loc';
  job?: string;
  price?: string;
  when?: string;
  dur?: string;
  state?: 'acc' | 'dec';
  name?: string;
  size?: string;
  src?: string;
  fw?: number;
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
};
export type SkillEntry = { si: number; n: string; a: string; c: string | null; x: Record<string, any>; xo: Record<string, string[]>; lv: string; custom?: number; desc?: string };
export type MyOffer = { price: string; when: string; state: 'sent' | 'acc'; app?: number; stage?: string; cv?: CvFile | null };
export type Review = { stars: number; tags: string[]; text: string; name: string; photo: Pic; time: string };
export type Service = { id: string; skill: string; price: number | string; unit: string; where: string; desc: string; pub: boolean; boost: number; draft?: boolean };

/* ------------------------------ seed ------------------------------ */
const F = (id: string): Pic => `faces/${id}`;
const L = (t: string, bg: string, fg = '#000'): Pic => `logo:${t}|${bg}|${fg}`;

function people(): Record<string, Person> {
  const P: Record<string, Person> = {
    edward: { name: 'Edward Isle', handle: 'edward.isle', role: 'Plumber', tag: 'Licensed', years: 3, rate: 4.5, dist: '1km away', area: 'Molyko', photo: 'img/edward', verified: 1, jobs: 1240, reviews: '23k', followers: 18400 },
    yann: { name: 'Yann Kemche', handle: 'yann.k', role: 'Electrician', tag: 'Solar', years: 3, rate: 4.9, dist: '1km away', area: 'Great Soppo', photo: 'img/yann', pin: 'img/yann-pin', verified: 1, jobs: 860, reviews: '9.2k', followers: 12100 },
    njinda: { name: 'Njinda Salome', handle: 'njinda.cleans', role: 'Cleaner', tag: 'Deep cleans', years: 3, rate: 4.5, dist: '2km away', area: 'Bonduma', photo: 'img/njinda', pin: 'img/njinda-pin', verified: 1, jobs: 640, reviews: '5.4k', followers: 8900 },
    emmanuel: { name: 'Emmanuel .N', handle: 'emma.motors', role: 'Mechanic', tag: 'Engines', years: 4, rate: 4.5, dist: '3km away', area: 'Mile 17', photo: 'img/emmanuel', verified: 0, jobs: 410, reviews: '2.1k', followers: 3200 },
    fresh: { name: 'Dr Fresh Velocity', short: 'Dr Fresh', handle: 'drfresh', role: 'Designer', tag: 'UI/UX', years: 3, rate: 4.7, dist: '1km away', area: 'Checkpoint', photo: 'img/drfresh', pin: 'img/drfresh-pin', verified: 1, jobs: 300, reviews: '1.8k', followers: 21000 },
    samuel: { name: 'Samuel Fon', handle: 'samfon.plumbing', role: 'Plumber', tag: 'Emergency 24/7', years: 6, rate: 4.8, dist: '2km away', area: 'Molyko', photo: F('samuel'), verified: 1, jobs: 980, reviews: '7.6k', followers: 9800 },
    grace: { name: 'Grace Ewane', handle: 'grace.sparkle', role: 'Cleaner', tag: 'Deep cleans', years: 5, rate: 4.9, dist: '1.5km away', area: 'Bonduma', photo: F('grace'), verified: 1, jobs: 720, reviews: '6.1k', followers: 11300 },
    bertrand: { name: 'Bertrand Ako', handle: 'bert.delivers', role: 'Delivery', tag: 'Same-day', years: 2, rate: 4.6, dist: '0.5km away', area: 'Clerks Quarter', photo: F('bertrand'), verified: 1, jobs: 2100, reviews: '4.3k', followers: 5100 },
    paul: { name: 'Paul Nkeng', handle: 'paul.fixescars', role: 'Mechanic', tag: 'Engines', years: 8, rate: 4.7, dist: '3km away', area: 'Mile 16', photo: F('paul'), verified: 0, jobs: 530, reviews: '3.0k', followers: 4200 },
    marie: { name: 'Marie Tabi', handle: 'marie.wires', role: 'Electrician', tag: 'Solar', years: 4, rate: 4.8, dist: '2.5km away', area: 'Bomaka', photo: F('marie'), verified: 1, jobs: 470, reviews: '2.9k', followers: 6700 },
    linda: { name: 'Linda Achu', handle: 'linda.rides', role: 'Delivery', tag: 'Groceries', years: 3, rate: 4.5, dist: '1km away', area: 'Muea', photo: F('linda'), verified: 0, jobs: 1300, reviews: '2.2k', followers: 2600 },
    c_marie: { name: 'Marie T.', client: 1, role: 'Client', area: 'Great Soppo', dist: '1km away', rate: 4.9, years: 2, jobs: 14, hires: 9, reviews: '11', followers: 40, photo: F('c_marie') },
    c_paul: { name: 'Paul N.', client: 1, role: 'Client', area: 'Mile 17', dist: '3km away', rate: 4.7, years: 1, jobs: 6, hires: 4, reviews: '5', followers: 18, photo: F('c_paul') },
    c_ama: { name: 'Ama K.', client: 1, role: 'Client', area: 'Molyko', dist: '1km away', rate: 5.0, years: 3, jobs: 22, hires: 17, reviews: '19', followers: 63, photo: F('c_ama') },
    c_tabe: { name: 'Mr Tabe', client: 1, role: 'Client', area: 'Molyko', dist: '0.8km away', rate: 4.8, years: 4, jobs: 9, hires: 7, reviews: '8', followers: 21, photo: F('c_tabe') },
    c_ngo: { name: 'Ngozi E.', client: 1, role: 'Client', area: 'Bonduma', dist: '1.5km away', rate: 4.9, years: 2, jobs: 5, hires: 4, reviews: '4', followers: 12, photo: F('c_ngo') },
    kevin: { name: 'Kevin Ndip', handle: 'kevin.codes', role: 'Developer', tag: 'React · Flutter', years: 5, rate: 4.9, dist: '1.2km away', area: 'Molyko', photo: F('kevin'), verified: 1, jobs: 96, reviews: '210', followers: 3400 },
    brenda: { name: 'Brenda Ayuk', handle: 'brenda.tutors', role: 'Teacher', tag: 'GCE Maths', years: 6, rate: 4.9, dist: '0.8km away', area: 'Great Soppo', photo: F('brenda'), verified: 1, jobs: 140, reviews: '320', followers: 2100 },
    eric: { name: 'Eric Tanyi', handle: 'eric.books', role: 'Accountant', tag: 'Sage · OHADA', years: 7, rate: 4.8, dist: '2km away', area: 'Bonduma', photo: F('eric'), verified: 1, jobs: 64, reviews: '88', followers: 900 },
    joy: { name: 'Joy Mbah', handle: 'joy.braids', role: 'Hairdresser', tag: 'Braids', years: 4, rate: 4.8, dist: '1km away', area: 'Molyko', photo: F('joy'), verified: 1, jobs: 530, reviews: '1.1k', followers: 5200 },
    divine: { name: 'Divine Fru', handle: 'divine.drives', role: 'Driver', tag: 'Licence B', years: 9, rate: 4.7, dist: '2.5km away', area: 'Mile 17', photo: F('divine'), verified: 1, jobs: 410, reviews: '380', followers: 700 },
    clovis: { name: 'Clovis Ebai', handle: 'clovis.sells', role: 'Sales', tag: 'Social media', years: 3, rate: 4.6, dist: '1.5km away', area: 'Checkpoint', photo: F('clovis'), verified: 0, jobs: 75, reviews: '60', followers: 1800 },
    mercy: { name: 'Mercy Nana', handle: 'mercy.cares', role: 'Nurse', tag: 'Home care', years: 8, rate: 4.9, dist: '2km away', area: 'Bomaka', photo: F('mercy'), verified: 1, jobs: 220, reviews: '190', followers: 1300 },
    ruth: { name: 'Ruth Enow', handle: 'ruth.kitchen', role: 'Cook', tag: 'Catering', years: 10, rate: 4.8, dist: '3km away', area: 'Muea', photo: F('ruth'), verified: 1, jobs: 300, reviews: '270', followers: 3900 },
  };
  const MORE: [string, string, string, string, number, number, string, string][] = [
    ['esther', 'Esther Tanyi', 'Accountant', 'ACCA', 6, 4.8, '0.9km', 'Molyko'],
    ['franklin', 'Franklin Ewane', 'Developer', 'Flutter · Firebase', 4, 4.9, '1.4km', 'Bomaka'],
    ['patience', 'Patience Mbi', 'Nurse', 'Midwife', 9, 4.9, '2km', 'Great Soppo'],
    ['collins', 'Collins Fon', 'Driver', 'Licence C · trucks', 11, 4.6, '3km', 'Mile 17'],
    ['blessing', 'Blessing Ako', 'Designer', 'Logos & flyers', 3, 4.7, '1km', 'Checkpoint'],
    ['emile', 'Emile Nkwain', 'Electrician', 'Solar · inverters', 7, 4.8, '2.2km', 'Muea'],
    ['claudine', 'Claudine Ngo', 'Teacher', 'French & English', 8, 4.9, '1.1km', 'Molyko'],
    ['gilbert', 'Gilbert Tabe', 'Builder', 'Tiling · masonry', 12, 4.7, '2.8km', 'Bonduma'],
    ['vanessa', 'Vanessa Eyong', 'Sales', 'Field sales lead', 5, 4.6, '1.6km', 'Great Soppo'],
    ['ibrahim', 'Ibrahim Moussa', 'Mechanic', 'Engines · diesel', 10, 4.8, '3.4km', 'Mile 16'],
    ['sandrine', 'Sandrine Bih', 'Cook', 'Pastry & cakes', 6, 4.9, '1.3km', 'Clerks Quarter'],
    ['lionel', 'Lionel Ashu', 'Developer', 'Python · data', 2, 4.5, '0.7km', 'Molyko'],
    ['rita', 'Rita Nchang', 'Hairdresser', 'Wigs & make-up', 5, 4.8, '2.4km', 'Bomaka'],
    ['christian', 'Christian Elad', 'Security', 'Night guard', 7, 4.5, '1.9km', 'Muea'],
    ['nadege', 'Nadège Fotso', 'Admin', 'Office & data entry', 3, 4.6, '1.2km', 'Checkpoint'],
    ['ernest', 'Ernest Ngwa', 'Plumber', 'Boreholes · tanks', 9, 4.7, '2.6km', 'Bonduma'],
    ['marlyse', 'Marlyse Ekane', 'Cleaner', 'Offices', 4, 4.8, '0.6km', 'Great Soppo'],
    ['junior', 'Junior Mbah', 'Delivery', 'Express okada', 2, 4.6, '0.4km', 'Molyko'],
    ['aisha', 'Aïsha Bello', 'Writer', 'Translation EN·FR', 4, 4.9, '1.8km', 'Mile 17'],
    ['herve', 'Hervé Tchinda', 'Engineer', 'Civil · AutoCAD', 8, 4.7, '2.1km', 'Bomaka'],
    ['priscille', 'Priscille Ndi', 'Nanny', 'Childcare', 6, 4.9, '1.5km', 'Molyko'],
    ['dieudonne', 'Dieudonné Kuma', 'Farmer', 'Poultry', 10, 4.6, '4km', 'Muea'],
    ['stephanie', 'Stéphanie Atem', 'Events', 'Decor & planning', 5, 4.8, '2.3km', 'Checkpoint'],
    ['moses', 'Moses Achu', 'Coach', 'Football & fitness', 6, 4.7, '1.7km', 'Great Soppo'],
  ];
  const kf = (n: number) => (n >= 1000 ? (n / 1000).toFixed(n % 1000 >= 100 ? 1 : 0) + 'k' : String(n));
  MORE.forEach(([id, name, role, tag, years, rate, dist, area], i) => {
    P[id] = { name, handle: id + '.' + role.toLowerCase(), role, tag, years, rate, dist: dist + ' away', area, photo: F(id), verified: i % 4 !== 3 ? 1 : 0, jobs: 40 + ((i * 137) % 900), reviews: kf(20 + ((i * 311) % 2400)), followers: 300 + ((i * 977) % 9000) };
  });
  Object.values(P).forEach((p) => (p.pin = p.pin || p.photo));
  return P;
}

function bizSample(): Record<string, BizSample> {
  const B: Record<string, [string, string, string, string, string, string, string, string, number, number, number, string, number, string]> = {
    b_nexa: ['Nexa Digital', 'IT & Software', '11–50', 'Molyko', 'NX', '#3d5af1', '#fff', 'A product studio building websites, mobile apps and payment tools for businesses across Cameroon.', 4.8, 6, 41, '62', 5200, 'nexadigital.cm'],
    b_crumbs: ['Sweet Crumbs Bakery', 'Hospitality & Food', '2–10', 'Bonduma', 'SC', '#f47b3b', '#000', 'Fresh bread, cakes and pastries baked daily in Bonduma. Opening our second shop this year.', 4.9, 2, 9, '31', 2100, ''],
    b_sima: ['SimaTel Agency', 'Marketing & Sales', '51–200', 'Checkpoint', 'ST', '#f6ee5c', '#000', 'Field sales and brand activation for telecom and FMCG brands in the South-West and Littoral.', 4.5, 5, 180, '95', 3900, 'simatel.cm'],
    b_care: ['CarePlus Clinic', 'Healthcare', '11–50', 'Great Soppo', 'C+', '#7be0a7', '#000', 'A family clinic offering general care, maternity and home nursing around Buea.', 4.8, 3, 27, '48', 1600, ''],
    b_mbuild: ['Mountain Build Ltd', 'Construction & Building', '51–200', 'Mile 17', 'MB', '#2a2a2e', '#f6ee5c', 'Residential and commercial construction. We train young masons, tilers and carpenters every year.', 4.6, 4, 120, '40', 2400, 'mountainbuild.cm'],
    b_sma: ['Silicon Mountain Academy', 'Education & Tutoring', '11–50', 'Molyko', 'SMA', '#a9b6ff', '#000', 'Short, practical tech courses and bootcamps for students and career changers in Buea.', 4.9, 1, 12, '210', 8800, 'smacademy.cm'],
    b_kfresh: ['Kilum Fresh Foods', 'Hospitality & Food', '51–200', 'Mile 17', 'KF', '#7be0a7', '#000', 'Juice and snack factory supplying shops across the South-West.', 4.6, 4, 75, '54', 3100, 'kilumfresh.cm'],
    b_bueafin: ['Buea Microfinance', 'Finance & Accounting', '51–200', 'Molyko', 'BM', '#3d5af1', '#f6ee5c', 'Savings, small loans and mobile money for traders and students.', 4.4, 3, 60, '120', 6200, 'bueamfi.cm'],
    b_volta: ['Volta Solar', 'Home repairs', '11–50', 'Bomaka', 'VS', '#f6ee5c', '#000', 'Solar kits and installation for homes, schools and clinics.', 4.8, 3, 38, '77', 2800, 'voltasolar.cm'],
    b_savanna: ['Savanna Logistics', 'Logistics & Warehouse', '200+', 'Mutengene', 'SL', '#f47b3b', '#000', 'Trucking and warehousing between Douala, Buea and Limbe.', 4.5, 5, 240, '88', 4100, 'savanna.cm'],
    b_mbonde: ['Mbonde Hotel & Suites', 'Hospitality & Food', '51–200', 'Great Soppo', 'MH', '#a9b6ff', '#000', 'A 60-room hotel with restaurant and conference hall at the foot of Mount Cameroon.', 4.7, 4, 92, '310', 7400, 'mbondehotel.cm'],
    b_ucode: ['UCode Africa', 'IT & Software', '11–50', 'Molyko', 'UC', '#2a2a2e', '#7be0a7', 'Software outsourcing for clients in Europe and Africa. Remote-friendly.', 4.9, 3, 30, '45', 9100, 'ucode.africa'],
  };
  const out: Record<string, BizSample> = {};
  Object.entries(B).forEach(([id, [name, sector, size, area, t, bg, fg, about, rate, jobs, hires, reviews, followers, web]]) => {
    out[id] = { name, sector, size, area, logo: L(t, bg, fg), about, rate, jobs, hires, reviews, followers, web };
  });
  return out;
}

function posts(): Post[] {
  const POSTS: Post[] = [
    { id: 'p1', by: 'fresh', kind: 'image', img: 'img/post-portfolio', text: 'Shipped a new mobile app UI for a telecom client this week. Clean flows, fast top-ups.', tags: ['#UIUX', '#Buea'], time: '12mins ago', likes: 12000, comments: 240 },
    { id: 'p2', kind: 'request', client: 'c_marie', cat: 'Electrician', title: 'Install 4 sockets + fix a light', text: 'Looking for an electrician in Great Soppo tomorrow morning — 4 sockets to install and one ceiling light to fix.', budget: 'XAF 15k – 25k', when: 'Tomorrow, 9:00', area: 'Great Soppo', offers: 7, time: '25mins ago' },
    { id: 'p3', by: 'edward', kind: 'job', img: 'img/svc-faucet', job: 'Faucet Repair', took: '40 min', paid: 'XAF 15,000', stars: 5, text: 'Fixed a leaking kitchen faucet in Molyko today. 40 minutes, no mess. 💧', tags: ['#plumbing', '#Molyko'], time: '1h ago', likes: 860, comments: 41 },
    { id: 'p4', by: 'bertrand', kind: 'avail', text: 'Available for same-day deliveries around Buea until 6pm. Parcels, groceries, documents.', slots: ['Now', '2:00 pm', '4:30 pm'], time: '1h ago', likes: 120, comments: 8 },
    { id: 'p5', by: 'grace', kind: 'art', art: 'clean', text: 'Before & after: full deep clean of a 3-bedroom flat in Bonduma. Kitchen took the longest!', tags: ['#cleaning', '#beforeafter'], time: '3h ago', likes: 1300, comments: 64 },
    { id: 'p6', by: 'samuel', kind: 'job', img: 'img/svc-heater', job: 'Water Heater Installation', took: '3 h', paid: 'XAF 95,000', stars: 5, text: 'New water heater in, old one out. Hot showers are back for the Tabe family.', tags: ['#plumbing'], time: '4h ago', likes: 540, comments: 22 },
    { id: 'p7', kind: 'request', client: 'c_paul', cat: 'Mechanic', title: 'Car won’t start', text: 'Car won’t start this morning — need a mechanic around Mile 17 this afternoon.', budget: 'Negotiable', when: 'Today, 3:00 pm', area: 'Mile 17', offers: 3, time: '5h ago' },
    { id: 'p8', by: 'marie', kind: 'art', art: 'electric', text: 'Solar setup finished for a small shop in Bomaka — lights stay on through every power cut now. ⚡', tags: ['#solar', '#electrician'], time: '6h ago', likes: 980, comments: 37 },
    { id: 'p9', by: 'paul', kind: 'art', art: 'mech', text: 'Full brake service today. If your car squeals when you stop, don’t wait.', tags: ['#mechanic', '#safety'], time: 'Yesterday', likes: 410, comments: 19 },
    { id: 'p10', kind: 'request', client: 'c_ama', cat: 'Cleaner', title: 'End-of-tenancy clean', text: 'Moving out on Saturday. Need someone for an end-of-tenancy clean of a 2-bedroom in Molyko.', budget: 'XAF 30k', when: 'Sat, 10:00', area: 'Molyko', offers: 5, time: 'Yesterday' },
    { id: 'p11', by: 'samuel', kind: 'job', img: 'img/svc-drain', job: 'Drain Cleaning', took: '1 h 20 min', paid: 'XAF 20,000', stars: 4, text: 'Cleared a stubborn floor drain in a restaurant kitchen. Grease is not your friend.', tags: ['#plumbing', '#drains'], time: '2 days ago', likes: 310, comments: 12 },
  ];
  POSTS.splice(1, 0, { id: 'p12', kind: 'request', client: 'c_tabe', cat: 'Plumber', title: 'Kitchen sink leaking', text: 'Water is dripping under the kitchen sink and the cupboard is getting wet. Need someone today if possible.', budget: 'XAF 10k – 20k', when: 'Today, 4:00 pm', area: 'Molyko', offers: 2, time: '8mins ago', urgent: 1 });
  POSTS.splice(6, 0, { id: 'p13', kind: 'request', client: 'c_ngo', cat: 'Plumber', title: 'Weak shower pressure', text: 'Shower pressure has been very weak for a week. Probably a blocked shower head or pipe.', budget: 'XAF 8k – 15k', when: 'Tomorrow, 10:00', area: 'Bonduma', offers: 1, time: '50mins ago' });
  POSTS.splice(10, 0, { id: 'p14', kind: 'request', client: 'c_marie', cat: 'Delivery', title: 'Deliver a birthday cake to Mile 17', text: 'Pick up a cake in Molyko and deliver it to Mile 17 by 5pm. Handle with care! 🎂', budget: 'XAF 2k', when: 'Today, 5:00 pm', area: 'Molyko', offers: 4, time: '2h ago' });
  POSTS.push(
    { id: 'mj1', kind: 'request', client: 'me', mine: 1, as: 'regular', cat: 'Plumber', title: 'Kitchen sink leaking', text: 'Need a plumber in Molyko this weekend — kitchen sink leaking.', budget: 'XAF 15,000', when: 'Sat, 9:00', area: 'Molyko', time: '2 days ago', type: 'One-off gig', offerList: [
      { by: 'edward', price: 'XAF 15,000', when: 'Sat, 9:00', msg: 'I can fix it in about an hour, parts included.' },
      { by: 'samuel', price: 'XAF 12,000', when: 'Sat, 11:00', msg: 'Available Saturday morning. 6 years of experience.' },
    ] },
    { id: 'mj2', kind: 'request', client: 'me', mine: 1, as: 'regular', cat: 'Cleaner', title: 'Weekly cleaner for a 2-bedroom', text: 'Looking for a cleaner every Friday for a 2-bedroom flat.', budget: 'XAF 10,000 / visit', when: 'Every Friday', area: 'Molyko', time: '4 days ago', type: 'Part-time', offerList: [
      { by: 'grace', price: 'XAF 10,000', when: 'Fridays, 9:00', msg: 'I do weekly cleans for 4 families in Molyko.' },
      { by: 'njinda', price: 'XAF 9,000', when: 'Fridays, 14:00', msg: 'Happy to help every week!' },
      { by: 'linda', price: 'XAF 11,000', when: 'Fridays, 8:00', msg: 'I can start this Friday.' },
    ] },
  );
  const NEWJOBS: Post[] = [
    { id: 'r1', kind: 'request', client: 'c_ama', cat: 'Developer', title: 'Website for my clothing boutique', text: 'I need a simple website with a product catalogue and WhatsApp ordering for my shop in Molyko. Can be done remotely.', budget: 'XAF 150k – 300k', when: 'This month', area: 'Molyko', offers: 4, time: '30mins ago', type: 'Contract · Remote' },
    { id: 'r2', kind: 'request', client: 'c_tabe', cat: 'Teacher', title: 'Maths & Physics tutor for GCE A Level', text: 'Looking for a tutor for my son, 3 evenings a week at home in Molyko until the June exams.', budget: 'XAF 40k / month', when: 'Starts Monday', area: 'Molyko', offers: 6, time: '2h ago', type: 'Part-time' },
    { id: 'r3', kind: 'request', client: 'c_ngo', cat: 'Designer', title: 'Logo and flyers for a new bakery', text: 'Opening a bakery in Bonduma next month. Need a logo, 2 flyer designs and a Facebook cover.', budget: 'XAF 25k – 50k', when: 'Within 1 week', area: 'Bonduma', offers: 9, time: '3h ago', type: 'One-off gig' },
    { id: 'r4', kind: 'request', client: 'c_paul', cat: 'Accountant', title: 'Part-time bookkeeper for a small shop', text: 'Need someone 2 days a week to record sales and stock and prepare monthly reports. Sage or Excel.', budget: 'XAF 60k / month', when: 'Flexible days', area: 'Mile 17', offers: 3, time: '5h ago', type: 'Part-time' },
    { id: 'r5', kind: 'request', client: 'b_sima', biz: 1, openings: 5, cat: 'Sales', title: '5 sales reps for a telecom launch', text: 'Field sales agents to promote and sell SIM cards and data bundles around Buea. Training provided. Salary + commission.', budget: 'XAF 80k + commission', when: 'Starts 1 Nov', area: 'Buea', offers: 12, time: 'Yesterday', type: 'Full-time', urgent: 1 },
    { id: 'r6', kind: 'request', client: 'c_ama', cat: 'Driver', title: 'Family driver, Monday to Friday', text: 'Driver with licence B to take the kids to school and run errands, 7am – 5pm.', budget: 'XAF 90k / month', when: 'Starts next week', area: 'Molyko', offers: 5, time: 'Yesterday', type: 'Full-time' },
    { id: 'r7', kind: 'request', client: 'c_tabe', cat: 'Cook', title: 'Cook for a 60-guest birthday', text: 'Jollof, ndolé, grilled fish and small chops for 60 people on Saturday.', budget: 'XAF 120k', when: 'Sat, 2:00 pm', area: 'Great Soppo', offers: 4, time: '2 days ago', type: 'One-off gig' },
    { id: 'r8', kind: 'request', client: 'c_ngo', cat: 'Security', title: 'Night guard for a shop', text: 'Night watchman for a shop in Bonduma, 7pm – 6am, 6 nights a week.', budget: 'XAF 50k / month', when: 'Starts now', area: 'Bonduma', offers: 2, time: '2 days ago', type: 'Full-time' },
  ];
  [[1, 0], [3, 1], [5, 2], [8, 3], [10, 4], [12, 5], [15, 6], [18, 7]].forEach(([at, k]) => POSTS.splice(Math.min(at, POSTS.length), 0, NEWJOBS[k]));
  const VAC: Post[] = [
    { id: 'v1', kind: 'request', client: 'b_nexa', biz: 1, cat: 'Developer', title: 'Junior web developer', text: 'Build and maintain client websites with React and Laravel. 1+ year of experience or a strong portfolio. Training and a laptop provided.', budget: 'XAF 180k – 250k / month', when: 'Starts Nov', area: 'Molyko · Hybrid', offers: 14, time: '1h ago', type: 'Full-time', openings: 2 },
    { id: 'v2', kind: 'request', client: 'b_crumbs', biz: 1, cat: 'Cook', title: 'Baker & pastry assistant', text: 'Early mornings (5am – 1pm), bread and pastry production, keeping the kitchen clean. We train you on our recipes.', budget: 'XAF 70k / month', when: 'Starts now', area: 'Bonduma', offers: 6, time: '4h ago', type: 'Full-time', openings: 1 },
    { id: 'v3', kind: 'request', client: 'b_care', biz: 1, cat: 'Nurse', title: 'Registered nurse — day shifts', text: 'Registered nurse for our general ward and home visits. State diploma required.', budget: 'XAF 150k – 200k / month', when: 'Starts 15 Nov', area: 'Great Soppo', offers: 5, time: 'Yesterday', type: 'Full-time', openings: 2 },
    { id: 'v4', kind: 'request', client: 'b_mbuild', biz: 1, cat: 'Builder', title: 'Site supervisor (6-month contract)', text: 'Supervise masons and tilers on a 12-flat residential site. 3+ years on site, reading plans.', budget: 'XAF 220k / month', when: 'Starts Dec', area: 'Mile 17', offers: 3, time: '2 days ago', type: 'Contract', openings: 1 },
  ];
  [[2, 0], [7, 1], [13, 2], [20, 3]].forEach(([at, k]) => POSTS.splice(Math.min(at, POSTS.length), 0, VAC[k]));
  const VAC2: [string, string, string, string, string, string, string, number][] = [
    ['b_bueafin', 'Accountant', 'Credit officer', 'Assess small loans, visit clients and follow up repayments. Motorbike licence a plus.', 'XAF 150k / month', 'Full-time', 'Molyko', 2],
    ['b_mbonde', 'Cook', 'Restaurant chef', 'Lead a team of 4 in our hotel kitchen: Cameroonian and continental menu.', 'XAF 200k / month', 'Full-time', 'Great Soppo', 1],
    ['b_mbonde', 'Admin', 'Front desk receptionist', 'Bilingual (EN/FR) receptionist for check-ins, bookings and calls. Shifts.', 'XAF 110k / month', 'Full-time', 'Great Soppo', 2],
    ['b_volta', 'Electrician', 'Solar installer', 'Install solar kits in homes and clinics around Fako. Training provided.', 'XAF 130k / month', 'Full-time', 'Bomaka', 3],
    ['b_savanna', 'Driver', 'Truck driver (licence C)', 'Douala – Buea – Limbe routes. 3+ years driving trucks.', 'XAF 160k / month', 'Full-time', 'Mutengene', 4],
    ['b_ucode', 'Developer', 'Backend developer (remote)', 'Node.js / Laravel APIs for European clients. Good English.', 'XAF 350k – 500k / month', 'Remote', 'Molyko · Remote', 2],
    ['b_kfresh', 'Sales', 'Sales representative', 'Visit shops and supermarkets in Buea and Limbe. Commission on every order.', 'XAF 90k + commission', 'Full-time', 'Mile 17', 5],
    ['b_kfresh', 'Admin', 'Stock & warehouse clerk', 'Record stock in and out, prepare deliveries. Excel needed.', 'XAF 85k / month', 'Full-time', 'Mile 17', 1],
    ['b_ucode', 'Designer', 'UI/UX designer (contract)', 'Design mobile app screens in Figma for a fintech product. 4-month contract.', 'XAF 300k / month', 'Contract', 'Remote', 1],
    ['b_care', 'Admin', 'Clinic receptionist', 'Welcome patients, manage files and appointments.', 'XAF 80k / month', 'Part-time', 'Great Soppo', 1],
  ];
  VAC2.forEach(([client, cat, title, text, budget, type, area, openings], i) =>
    POSTS.splice(Math.min(3 + i * 3, POSTS.length), 0, {
      id: 'v2_' + i,
      kind: 'request',
      client,
      biz: 1,
      cat,
      title,
      text,
      budget,
      when: ['Starts now', 'Starts Nov', 'Starts 15 Nov', 'Starts Dec'][i % 4],
      area,
      offers: 3 + ((i * 7) % 15),
      time: ['2h ago', '5h ago', 'Yesterday', '2 days ago', '3 days ago'][i % 5],
      type,
      openings,
    }),
  );
  const areaOf: Record<string, string> = { c_marie: 'Great Soppo', c_paul: 'Mile 17', c_ngo: 'Bonduma', c_tabe: 'Molyko', c_ama: 'Molyko' };
  const MORE_REQ: [string, string, string, string, string, string][] = [
    ['c_marie', 'Teacher', 'French lessons for my daughter', 'Class 5 pupil, twice a week after school. Molyko.', 'XAF 25k / month', 'Part-time'],
    ['c_paul', 'Designer', 'Logo for my car wash', 'Simple logo and a banner for the front of the shop.', 'XAF 15k', 'One-off gig'],
    ['c_ngo', 'Electrician', 'Install 6 ceiling fans', 'New flat in Bonduma, wiring already there.', 'XAF 18k – 25k', 'One-off gig'],
    ['c_tabe', 'Driver', 'Driver for a family wedding', 'Saturday, 8am – 10pm, our car. Douala and back.', 'XAF 25k', 'One-off gig'],
    ['c_ama', 'Cleaner', 'Deep clean before moving in', '3-bedroom apartment, Great Soppo, this weekend.', 'XAF 35k', 'One-off gig'],
  ];
  MORE_REQ.forEach(([client, cat, title, text, budget, type], i) =>
    POSTS.splice(Math.min(6 + i * 5, POSTS.length), 0, {
      id: 'rq_' + i,
      kind: 'request',
      client,
      cat,
      title,
      text,
      budget,
      when: ['Today, 5:00 pm', 'Tomorrow', 'This week', 'Sat, 8:00', 'Sun, 9:00'][i],
      area: areaOf[client],
      offers: 1 + i * 2,
      time: ['15mins ago', '1h ago', '3h ago', 'Yesterday', 'Yesterday'][i],
      type,
    }),
  );
  POSTS.forEach((p) => {
    if (p.kind === 'request') {
      p.offerList = p.offerList || [];
      if (!p.type) p.type = 'One-off gig';
    }
  });
  return POSTS;
}

const REELS: Reel[] = [
  { by: 'edward', scene: 'plumb', cap: 'Leaky faucet fixed in 40 minutes 💧 Here’s the 3 things I always check first.', tags: ['#plumbing', '#Buea', '#DIYtips'], job: 'Faucet Repair · XAF 10k – 20k', likes: 12400, comments: 318, views: '86.4k', live: 1 },
  { by: 'grace', scene: 'clean', cap: 'Watch a 3-bedroom go from messy to spotless ✨', tags: ['#cleaning', '#satisfying'], job: 'Home Deep Clean · XAF 15k – 40k', likes: 30100, comments: 902, views: '210k' },
  { by: 'marie', scene: 'electric', cap: 'Solar install for a shop that kept losing power. No more cuts ⚡', tags: ['#solar', '#electrician'], job: 'Solar Setup · XAF 120k+', likes: 8700, comments: 204, views: '54k', live: 1 },
  { by: 'bertrand', scene: 'deliver', cap: 'Mile 17 to Molyko in 14 minutes. Same-day, every day 🛵', tags: ['#delivery', '#Buea'], job: 'Same-day Parcel · XAF 1k – 3k', likes: 4300, comments: 88, views: '31k' },
  { by: 'paul', scene: 'mech', cap: 'That squeal when you brake? This is why. Full brake service in under an hour.', tags: ['#mechanic', '#carcare'], job: 'Brake Service · XAF 25k – 50k', likes: 6100, comments: 142, views: '47k' },
  { by: 'fresh', scene: 'design', cap: 'From sketch to shipped: the telecom app I designed this month.', tags: ['#UIUX', '#portfolio'], job: 'App design · On request', likes: 15800, comments: 420, views: '120k' },
];
export { REELS };

function notifsC(): Notif[] {
  return [
    { id: 'n1', g: 'Today', type: 'quote', who: 'edward', time: '5m', job: 'Faucet Repair', price: 'XAF 15,000', when: 'Tomorrow, 9:00' },
    { id: 'n2', g: 'Today', type: 'like', who: ['grace', 'marie', 'yann'], others: 47, time: '12m', snip: 'Need a plumber in Molyko this weekend — kitchen sink leaking.' },
    { id: 'n3', g: 'Today', type: 'follow', who: 'marie', time: '16m' },
    { id: 'n4', g: 'Today', type: 'accept', who: 'bertrand', time: '1h', text: 'accepted your delivery request and is on the way.' },
    { id: 'n5', g: 'Today', type: 'mention', who: 'samuel', time: '2h', read: 1, text: '“@you the new heater is in — check the photos before I leave.”' },
    { id: 'n6', g: 'Today', type: 'review', who: 'yann', time: '3h', read: 1, stars: 5, text: '“Great client, clear instructions and paid on time.”' },
    { id: 'n7', g: 'Yesterday', type: 'payment', who: 'grace', time: '1d', read: 1, amount: 'XAF 15,000' },
    { id: 'n8', g: 'Yesterday', type: 'reminder', who: 'edward', time: '1d', read: 1, text: 'arrives tomorrow at 9:00 for your Faucet Repair.' },
    { id: 'n9', g: 'Yesterday', type: 'follow', who: 'paul', time: '1d', read: 1 },
    { id: 'n10', g: 'Yesterday', type: 'like', who: ['linda', 'njinda', 'samuel'], others: 30, time: '1d', read: 1, snip: 'Your post “Looking for a cleaner every Friday”' },
    { id: 'n11', g: 'Earlier', type: 'offers', who: ['grace', 'njinda', 'linda'], time: '4d', read: 1, text: '3 workers offered to help with “Looking for a cleaner every Friday”.' },
    { id: 'n12', g: 'Earlier', type: 'verified', time: '5d', read: 1 },
  ];
}
function notifsW(): Notif[] {
  return [
    { id: 'w1', g: 'Today', type: 'newjob', job: 'p12', time: '3m' },
    { id: 'w2', g: 'Today', type: 'accept', who: 'c_ama', time: '40m', text: 'accepted your offer for “End-of-tenancy clean”. See you Saturday!' },
    { id: 'w3', g: 'Today', type: 'newjob', job: 'p13', time: '50m' },
    { id: 'w4', g: 'Today', type: 'like', who: ['c_marie', 'grace', 'yann'], others: 23, time: '1h', snip: 'Fixed a leaking kitchen faucet in Molyko today…' },
    { id: 'w5', g: 'Today', type: 'follow', who: 'c_paul', time: '2h' },
    { id: 'w6', g: 'Yesterday', type: 'payment_in', who: 'c_tabe', time: '1d', read: 1, amount: 'XAF 25,000' },
    { id: 'w7', g: 'Yesterday', type: 'review', who: 'c_tabe', time: '1d', read: 1, stars: 5, text: '“On time, tidy and fair price. Will hire again.”' },
    { id: 'w8', g: 'Yesterday', type: 'reminder', who: 'c_ama', time: '1d', read: 1, text: '— your job is on Saturday at 10:00 (End-of-tenancy clean, Molyko).' },
    { id: 'w9', g: 'Earlier', type: 'verified', time: '5d', read: 1 },
  ];
}
function threadsC(): Record<string, Thread> {
  return {
    edward: { pinned: 1, on: 1, job: 'Faucet Repair · Tomorrow, 9:00', time: '09:20', msgs: [
      { d: 'Yesterday' },
      { f: 'me', t: 'Hi Edward, my kitchen faucet keeps dripping. Are you free this week?', at: '18:40', st: 'read' },
      { f: 'them', t: 'Hey 👋 Yes, I can come by. Is it the tap itself or under the sink?', at: '18:42' },
      { f: 'me', t: 'The tap itself — it drips all night.', at: '18:45', st: 'read' },
      { d: 'Today' },
      { f: 'them', k: 'offer', job: 'Faucet Repair', price: 'XAF 15,000', when: 'Tomorrow, 9:00', dur: 'About 1 hour · parts included', at: '09:12' },
      { f: 'them', t: 'Let me know if that works for you.', at: '09:13' },
      { f: 'me', t: 'Ok, let me check', at: '09:20', st: 'read' },
    ] },
    grace: { on: 1, unread: 2, typing: 1, time: '09:05', next: 'And is there a balcony? I’ll bring the right kit.', msgs: [
      { d: 'Today' },
      { f: 'me', t: 'Hi Grace! Can you do a deep clean on Friday?', at: '08:58', st: 'read' },
      { f: 'them', t: 'Yes! Friday works 😊', at: '09:04' },
      { f: 'them', t: 'How many bedrooms is it?', at: '09:05' },
    ] },
    samuel: { unread: 1, time: '08:31', msgs: [{ d: 'Today' }, { f: 'me', t: 'Is the heater still working fine?', at: '08:10', st: 'read' }, { f: 'them', k: 'voice', dur: '0:24', at: '08:31' }] },
    bertrand: { on: 1, job: 'Same-day Parcel · Delivered', time: 'Yesterday', msgs: [
      { d: 'Yesterday' },
      { f: 'me', t: 'Please pick up from Clerks Quarter and drop at Molyko.', at: '11:02', st: 'read' },
      { f: 'them', t: 'On my way 🛵', at: '11:05' },
      { sys: 'Delivered at 11:42' },
      { f: 'them', t: 'Delivered! See you next time.', at: '11:43' },
    ] },
    marie: { time: 'Yesterday', msgs: [{ d: 'Yesterday' }, { f: 'them', t: 'Here’s the quote for the solar setup we talked about.', at: '16:20' }, { f: 'them', k: 'file', name: 'Quote_Solar_Shop.pdf', size: '248 KB', at: '16:20' }] },
    yann: { on: 1, time: 'Mon', job: 'Install 2 ceiling lights · Today, 15:00', msgs: [
      { d: 'Monday' },
      { f: 'me', t: 'Thanks for fixing the sockets!', at: '17:30', st: 'read' },
      { f: 'them', t: 'See you tomorrow, take care.', at: '17:34' },
      { sys: 'Job booked · Install 2 ceiling lights · Today, 15:00 · XAF 20,000' },
    ] },
    paul: { time: 'Sun', msgs: [{ d: 'Sunday' }, { f: 'them', t: 'Car’s ready for pickup 🚗', at: '14:02' }] },
    njinda: { time: '12 Jun', msgs: [{ d: '12 June' }, { f: 'me', t: 'Thanks for today!', at: '15:00', st: 'read' }, { f: 'them', t: 'Anytime 😊', at: '15:04' }] },
  };
}
function threadsW(): Record<string, Thread> {
  return {
    c_marie: { on: 1, unread: 1, job: 'Install 4 sockets · Offer sent', time: '10:02', msgs: [
      { d: 'Today' },
      { f: 'me', k: 'offer', job: 'Install 4 sockets + fix a light', price: 'XAF 18,000', when: 'Tomorrow, 9:00', dur: 'Parts included', at: '09:40' },
      { f: 'them', t: 'Hi! Saw your offer. Do you bring the sockets or should I buy them?', at: '09:58' },
      { f: 'me', t: 'I can bring them — they’re included in the price.', at: '10:00', st: 'read' },
      { f: 'them', t: 'Perfect 👍 Let me check with my husband and confirm.', at: '10:02' },
    ] },
    c_ama: { job: 'End-of-tenancy clean · Sat, 10:00', time: '09:40', msgs: [
      { d: 'Yesterday' },
      { f: 'me', k: 'offer', job: 'End-of-tenancy clean', price: 'XAF 30,000', when: 'Sat, 10:00', dur: 'About 4–5 hours', at: '17:12', state: 'acc' },
      { sys: 'Job booked · End-of-tenancy clean · Sat, 10:00' },
      { d: 'Today' },
      { f: 'them', t: 'Thank you! The keys will be with the caretaker downstairs.', at: '09:40' },
    ] },
    c_paul: { unread: 3, time: '08:16', msgs: [
      { d: 'Today' },
      { f: 'them', t: 'Hello, are you free this afternoon? My car won’t start.', at: '08:12' },
      { f: 'them', k: 'voice', dur: '0:12', at: '08:15' },
      { f: 'them', k: 'offer', job: 'Car won’t start — diagnosis & fix', price: 'XAF 10,000', when: 'Today, 15:00', dur: 'Price offered by Paul', at: '08:16' },
    ] },
    c_tabe: { time: 'Yesterday', msgs: [{ d: 'Yesterday' }, { f: 'them', t: 'Thanks again for fixing the toilet last week!', at: '19:20' }, { f: 'me', t: 'My pleasure, Mr Tabe 🙏', at: '19:31', st: 'read' }] },
    edward: { on: 1, time: 'Mon', msgs: [{ d: 'Monday' }, { f: 'them', t: 'Hey colleague! I have too many jobs this week — want me to pass you one in Molyko?', at: '12:10' }, { f: 'me', t: 'Yes please, thanks Edward!', at: '12:15', st: 'read' }] },
  };
}

function opps(): Opp[] {
  return [
    { id: 'o1', biz: 'b_nexa', kind: 'Internship', title: 'Software engineering internship', cat: 'Developer', dur: '3 months', start: '1 Nov', mode: 'Hybrid · Molyko', pay: 'XAF 50k / month stipend', seats: 4, joined: 2, deadline: '31 Oct', desc: 'Work in a real product team: build features, review code and ship to production. Mentorship every week.', skills: ['JavaScript', 'React', 'Git'] },
    { id: 'o2', biz: 'b_care', kind: 'Internship', title: 'Clinical nursing internship', cat: 'Nurse', dur: '6 months', start: '15 Nov', mode: 'On-site · Great Soppo', pay: 'XAF 40k / month stipend', seats: 5, joined: 3, deadline: '5 Nov', desc: 'Rotations in general ward, maternity and home visits, supervised by senior nurses.', skills: ['Patient care', 'First aid'] },
    { id: 'o3', biz: 'b_mbuild', kind: 'Apprenticeship', title: 'Masonry & tiling apprenticeship', cat: 'Builder', dur: '12 months', start: 'Jan', mode: 'On-site · Mile 17', pay: 'XAF 30k / month', seats: 8, joined: 5, deadline: '15 Dec', desc: 'Learn masonry, tiling and plastering on real sites with certified craftsmen. Certificate at the end.', skills: ['Masonry', 'Tiling'] },
    { id: 'o4', biz: 'b_sma', kind: 'Training program', title: 'Frontend developer bootcamp', cat: 'Developer', dur: '8 weeks', start: '4 Nov', mode: 'Online', pay: 'Free · sponsored', seats: 30, joined: 24, deadline: '1 Nov', desc: 'HTML, CSS, JavaScript and React from zero to your first portfolio project. Evening classes.', skills: ['HTML', 'CSS', 'JavaScript'] },
    { id: 'o5', biz: 'b_sima', kind: 'Graduate program', title: 'Sales graduate program', cat: 'Sales', dur: '6 months', start: '1 Dec', mode: 'On-site · Buea & Douala', pay: 'XAF 90k / month', seats: 10, joined: 4, deadline: '20 Nov', desc: 'For recent graduates: field sales, key accounts and team leading. Top performers are hired full-time.', skills: ['Sales', 'Communication'] },
    { id: 'o6', biz: 'b_crumbs', kind: 'Training program', title: 'Pastry & cake decorating course', cat: 'Cook', dur: '4 weeks', start: 'Every month', mode: 'On-site · Bonduma', pay: 'XAF 25,000 fee', seats: 12, joined: 9, deadline: 'Rolling', desc: 'Hands-on classes: croissants, cakes, icing and pricing your products to sell.', skills: ['Baking', 'Pastry'] },
    { id: 'o7', biz: 'b_ucode', kind: 'Internship', title: 'Remote developer internship', cat: 'Developer', dur: '4 months', start: '1 Dec', mode: 'Online', pay: 'XAF 60k / month stipend', seats: 6, joined: 3, deadline: '20 Nov', desc: 'Ship real features with a distributed team. Weekly 1-to-1 with a senior engineer.', skills: ['Git', 'JavaScript', 'APIs'] },
    { id: 'o8', biz: 'b_mbonde', kind: 'Apprenticeship', title: 'Hotel & hospitality apprenticeship', cat: 'Cook', dur: '6 months', start: 'Jan', mode: 'On-site · Great Soppo', pay: 'XAF 35k / month', seats: 10, joined: 6, deadline: '15 Dec', desc: 'Rotate through reception, kitchen and housekeeping. Best apprentices are hired.', skills: ['Customer service', 'Cooking'] },
    { id: 'o9', biz: 'b_volta', kind: 'Training program', title: 'Solar installer certification', cat: 'Electrician', dur: '3 weeks', start: '18 Nov', mode: 'On-site · Bomaka', pay: 'XAF 40,000 fee', seats: 16, joined: 11, deadline: '15 Nov', desc: 'Panels, batteries, inverters and safety. Certificate + chance to join our team.', skills: ['Solar', 'Wiring'] },
    { id: 'o10', biz: 'b_bueafin', kind: 'Graduate program', title: 'Banking graduate program', cat: 'Accountant', dur: '12 months', start: 'Jan', mode: 'On-site · Molyko', pay: 'XAF 120k / month', seats: 8, joined: 2, deadline: '30 Nov', desc: 'Credit, operations and customer service rotations for new graduates.', skills: ['Finance', 'Excel'] },
  ];
}

function courses(): Course[] {
  const PROV = [
    ['Silicon Mountain Academy', 'logo:SMA|#a9b6ff|#000'],
    ['Buea Tech School', 'logo:BTS|#3d5af1|#fff'],
    ['Learnly Africa', 'logo:LA|#f6ee5c|#000'],
    ['SkillUp CM', 'logo:SU|#f47b3b|#000'],
    ['Mboa Academy', 'logo:MA|#7be0a7|#000'],
    ['GreenField Institute', 'logo:GF|#2a2a2e|#7be0a7'],
  ].map(([n, logo]) => ({ n, logo }));
  const raw: [string, number, string, string, string, string, string, string, number, number, string, string[]][] = [
    ['Project management', 0, 'Business', 'Advanced', '9 months', 'Profession', 'Online', '', 286000, 519999, 'Project manager', ['Agile', 'Planning', 'Budgeting']],
    ['Marketplace & social selling with AI', 2, 'Marketing', 'Beginner', '36 hours', 'Skill', 'Online', '', 24900, 41500, 'Sales manager', ['Facebook ads', 'WhatsApp Business', 'AI tools']],
    ['Data analyst', 1, 'AI & data', 'Beginner', '12 months', 'Profession', 'Online', '', 67650, 225500, 'Data analyst', ['Excel', 'SQL', 'Power BI']],
    ['Web developer from zero', 0, 'Development', 'Beginner', '6 months', 'Profession', 'Offline', 'Buea', 120000, 180000, 'Web developer', ['HTML', 'CSS', 'JavaScript', 'React']],
    ['Flutter mobile apps', 1, 'Development', 'Advanced', '10 weeks', 'Skill', 'Online', '', 45000, 60000, 'Mobile developer', ['Flutter', 'Dart']],
    ['Accounting with Sage & SYSCOHADA', 4, 'Finance', 'Beginner', '8 weeks', 'Skill', 'Offline', 'Douala', 55000, 70000, 'Accountant', ['Sage', 'SYSCOHADA', 'Excel']],
    ['Bookkeeping for small businesses', 4, 'Finance', 'Beginner', '4 weeks', 'Skill', 'Online', '', 0, 0, 'Accountant', ['Excel', 'Bookkeeping']],
    ['Graphic design with Canva & Photoshop', 3, 'Design', 'Beginner', '6 weeks', 'Skill', 'Offline', 'Buea', 35000, 50000, 'Graphic designer', ['Canva', 'Photoshop']],
    ['UI/UX designer', 2, 'Design', 'Advanced', '5 months', 'Profession', 'Online', '', 98000, 140000, 'UI/UX designer', ['Figma', 'User research']],
    ['Solar installation technician', 5, 'Trades', 'Beginner', '6 weeks', 'Profession', 'Offline', 'Buea', 60000, 75000, 'Solar technician', ['Solar installation', 'Wiring']],
    ['Professional plumbing', 5, 'Trades', 'Beginner', '8 weeks', 'Profession', 'Offline', 'Limbe', 50000, 0, 'Plumber', ['Pipe fitting', 'Water heaters']],
    ['Business English for work', 2, 'Languages', 'Beginner', '10 weeks', 'Skill', 'Online', '', 0, 0, '', ['Speaking', 'Emails', 'Interviews']],
    ['French for the workplace (DELF prep)', 3, 'Languages', 'Advanced', '12 weeks', 'Skill', 'Offline', 'Yaoundé', 40000, 55000, '', ['French', 'DELF']],
    ['Home care assistant', 4, 'Health', 'Beginner', '6 weeks', 'Profession', 'Offline', 'Buea', 45000, 0, 'Caregiver', ['Patient care', 'First aid']],
    ['Start & grow your small business', 1, 'Business', 'Beginner', '4 weeks', 'Skill', 'Online', '', 0, 0, 'Entrepreneur', ['Pricing', 'Marketing', 'Bookkeeping']],
    ['Prompting & AI tools for work', 0, 'AI & data', 'Beginner', '2 weeks', 'Skill', 'Online', '', 15000, 25000, '', ['AI tools', 'Productivity']],
    ['Teaching skills for home tutors', 2, 'Teaching', 'Beginner', '3 weeks', 'Skill', 'Online', '', 12000, 20000, 'Tutor', ['Lesson planning', 'Exam prep']],
  ];
  return raw.map(([title, pv, cat, lv, dur, type, fmt, reg, price, old, prof, skills], i) => ({
    id: 'c' + i,
    title,
    prov: PROV[pv],
    cat,
    lv,
    dur,
    type,
    fmt,
    reg,
    price,
    old,
    prof,
    skills,
    mo: /month|weeks|hours/.test(dur) && price > 60000 ? Math.round(price / 12 / 100) * 100 : 0,
  }));
}

function mentorships(): Mentorship[] {
  const M: Mentorship[] = [
    { id: 'm1', by: 'kevin', title: 'Break into web development', field: 'Developer', format: '1-to-1', dur: '4 sessions · 1 month', price: 'Free', seats: 3, joined: 2, desc: 'Weekly video calls: what to learn first, building your portfolio and getting your first client or job.' },
    { id: 'm2', by: 'b_nexa', title: 'Nexa Women in Tech mentorship', field: 'Developer', format: 'Group', dur: '3 months · bi-weekly', price: 'Free', seats: 12, joined: 9, desc: 'Senior engineers at Nexa mentor women starting a tech career. Code reviews, career talks and interview practice.' },
    { id: 'm3', by: 'eric', title: 'Accounting career coaching', field: 'Accountant', format: '1-to-1', dur: '6 sessions', price: 'XAF 10,000 / month', seats: 4, joined: 1, desc: 'From your first bookkeeping job to ACCA: study plan, Sage practice and interview prep.' },
    { id: 'm4', by: 'b_mbuild', title: 'Start your own building trade', field: 'Builder', format: 'Group', dur: '2 months · Saturdays', price: 'Free', seats: 15, joined: 11, desc: 'Our site managers show you how to price jobs, buy materials and win your first contracts.' },
    { id: 'm5', by: 'joy', title: 'Grow your salon business', field: 'Hairdresser', format: '1-to-1', dur: '4 sessions', price: 'XAF 5,000 / session', seats: 5, joined: 3, desc: 'Pricing, Instagram and TikTok marketing, and keeping clients coming back.' },
    { id: 'm6', by: 'brenda', title: 'Becoming a great home tutor', field: 'Teacher', format: 'Group', dur: '1 month · evenings', price: 'Free', seats: 20, joined: 13, desc: 'Lesson planning, managing parents and preparing students for GCE.' },
    { id: 'm7', by: 'b_ucode', title: 'Remote work readiness', field: 'Developer', format: 'Group', dur: '6 weeks · Thursdays', price: 'Free', seats: 25, joined: 18, desc: 'How to work with international clients: communication, tools, time zones and getting paid.' },
    { id: 'm8', by: 'esther', title: 'ACCA study buddy & mentor', field: 'Accountant', format: 'Group', dur: '3 months', price: 'XAF 5,000 / month', seats: 10, joined: 6, desc: 'Weekly study sessions and exam tips from a qualified accountant.' },
    { id: 'm9', by: 'gilbert', title: 'Tiling like a pro', field: 'Builder', format: '1-to-1', dur: '4 site visits', price: 'XAF 15,000', seats: 2, joined: 1, desc: 'Come with me to real sites and learn layout, cutting and finishing.' },
  ];
  M.forEach((m) => (m.rules = m.format === 'Group' ? ['noDM', 'intro', 'respect'] : ['respect', 'onTime']));
  return M;
}

/* ------------------------------ the model ------------------------------ */
export function makeDb() {
  const P = people();
  const BIZ_SAMPLE = bizSample();
  Object.entries(BIZ_SAMPLE).forEach(([id, b]) => {
    P[id] = { name: b.name, client: 1, biz: 1, role: 'Business', area: b.area, dist: ['b_kfresh', 'b_bueafin', 'b_volta', 'b_savanna', 'b_mbonde', 'b_ucode'].includes(id) ? '2km away' : '1km away', rate: b.rate, years: 4, jobs: b.jobs, hires: b.hires, reviews: b.reviews, followers: b.followers, photo: b.logo, pin: b.logo, verified: 1, sector: b.sector, about: b.about };
  });
  const THREADS_C = threadsC();
  const THREADS_W = threadsW();
  const ORDER_C = ['edward', 'grace', 'samuel', 'bertrand', 'marie', 'yann', 'paul', 'njinda'];
  const ORDER_W = ['c_marie', 'c_ama', 'c_paul', 'c_tabe', 'edward'];
  // personal (Regular) chats with workers are shared between both inboxes
  ORDER_C.forEach((id) => {
    if (!P[id]?.client && THREADS_C[id] && !THREADS_W[id]) {
      THREADS_W[id] = THREADS_C[id];
      if (!ORDER_W.includes(id)) ORDER_W.push(id);
    }
  });
  return {
    v: 3,
    loggedIn: false,
    user: {
      name: '',
      role: 'worker' as 'worker' | 'client',
      contact: '',
      avatar: null as string | null,
      city: 'Buea CM',
      bio: '',
      skills: ['Plumber'] as string[],
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
      area: { home: 'Molyko', areas: ['Molyko', 'Great Soppo', 'Bonduma', 'Mile 17'], radius: 5 },
      ct: { phone: '', email: '', whatsapp: '', telegram: '', facebook: '' } as Record<string, string>,
      exp: [] as { role: string; org: string; from: number; to: number | null; desc: string }[],
      edu: { level: 'Secondary', courses: [] as { name: string; org: string; year: string }[] },
      docs: { id: 'verified', biz: null, drive: null } as Record<string, string | null>,
      video: null as null | { dur: string; at: string },
      vidHide: false,
      langs: [['English', 'Fluent'], ['Pidgin', 'Native']] as [string, string][],
      tests: {} as Record<string, string>,
    },
    BIZ: { list: [] as MyBiz[], active: null as string | null },
    PREF: { visible: true, phoneAfterHire: true, twoStep: false, lang: 'English', momo: [['MTN MoMo', '677 ••• 456', 1]] as [string, string, number][], notif: [1, 1, 1, 1, 0] },
    P,
    BIZ_SAMPLE,
    POSTS: posts(),
    NOTIFS_C: notifsC(),
    NOTIFS_W: notifsW(),
    THREADS_C,
    THREADS_W,
    ORDER_C,
    ORDER_W,
    BOOKINGS: [
      { id: 'b1', worker: 'yann', client: 'me', title: 'Install 2 ceiling lights', when: 'Today, 15:00', price: 'XAF 20,000', area: 'Molyko', state: 'onway', eta: 7, eta0: 12, log: { booked: 'Mon 17:40', onway: '' }, as: 'regular' },
      { id: 'b2', worker: 'me', client: 'c_ama', title: 'End-of-tenancy clean', when: 'Sat, 10:00', price: 'XAF 30,000', area: 'Molyko', state: 'booked', eta: 8, eta0: 8, log: { booked: 'Yesterday' }, as: 'regular' },
    ] as Booking[],
    OPPS: opps(),
    COURSES: courses(),
    MENTORSHIPS: mentorships(),
    REVIEWS: {} as Record<string, Review[]>,
    myOffers: {
      p2: { price: 'XAF 18,000', when: 'Tomorrow, 9:00', state: 'sent' },
      p10: { price: 'XAF 30,000', when: 'Sat, 10:00', state: 'acc' },
    } as Record<string, MyOffer>,
    hired: [] as string[],
    saved: [] as string[],
    followed: ['edward', 'grace', 'kevin'] as string[],
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
  feedView: 'all' as 'all' | 'jobs' | 'people' | 'mentors',
  meTab: 'Profile',
  ntTab: 'All',
  ibTab: 'All',
  cat: null as string | null,
  q: '',
  F: { dist: 0, rate: 0, ver: false, urgent: false, budget: 0, sort: 'best', type: '' },
  openChat: null as string | null,
  current: '' as string,
  reelFilter: 'all' as 'all' | 'following' | 'near',
  stFilter: 'all',
  svF: 'All',
  appStarted: false,
  cvT: 'Classic',
  proBill: 'month' as 'month' | 'year',
  justJoined: false,
};

export const uid = (p = 'x') => `${p}${Date.now().toString(36)}${Math.floor(Math.random() * 1e4).toString(36)}`;
export const CAT_NAMES = CATS.map((c) => c[0]);
