/* Static reference data — ported from the getit prototype. */

/** Job categories: [name, icon]. */
export const CATS: [string, string][] = [
  ['Delivery', 'cat-delivery'],
  ['Plumber', 'cat-plumber'],
  ['Electrician', 'cat-electrician'],
  ['Cleaner', 'cat-cleaner'],
  ['Mechanic', 'cat-mechanic'],
  ['Developer', 'cat-dev'],
  ['Designer', 'cat-design'],
  ['Teacher', 'cat-teach'],
  ['Driver', 'cat-driver'],
  ['Accountant', 'cat-acct'],
  ['Sales', 'cat-sales'],
  ['Admin', 'cat-admin'],
  ['Cook', 'cat-cook'],
  ['Nurse', 'cat-health'],
  ['Builder', 'cat-build'],
  ['Hairdresser', 'cat-hair'],
  ['Tailor', 'cat-tailor'],
  ['Security', 'cat-sec'],
  ['Writer', 'cat-writer'],
  ['Events', 'cat-events'],
  ['Nanny', 'cat-nanny'],
  ['Farmer', 'cat-farm'],
  ['Engineer', 'cat-eng'],
  ['Coach', 'cat-coach'],
];
export const SERVICES: Record<string, [string, string, string, string?][]> = {
  Plumber: [
    ['Faucet Repair', 'XAF 10k – 20k', 'Repair of leaky or malfunctioning faucets in kitchens, bathrooms, and utility areas.', 'img/svc-faucet'],
    ['Toilet Installation', 'XAF 25k – 45k', 'Removal of old toilet and installation of new toilet with all necessary fittings.', 'img/svc-toilet'],
    ['Water Heater Installation', 'XAF 60k – 150k', 'Removal of old water heater and installation of new unit with all connections.', 'img/svc-heater'],
    ['Drain Cleaning', 'XAF 12k – 30k', 'Clearing of clogged drains in sinks, tubs, showers, and floor drains.', 'img/svc-drain'],
  ],
  Electrician: [
    ['Wiring Repair', 'XAF 10k – 30k', 'Find and fix faulty wiring, sockets and switches safely.'],
    ['Lighting Installation', 'XAF 8k – 25k', 'Ceiling lights, fans and outdoor lighting fitted and tested.'],
    ['Solar Setup', 'XAF 120k+', 'Panels, inverter and battery installed for steady power.'],
  ],
  Cleaner: [
    ['Home Deep Clean', 'XAF 15k – 40k', 'Top-to-bottom cleaning of kitchens, bathrooms and living rooms.'],
    ['Move-in / Move-out', 'XAF 25k – 60k', 'Empty-home clean so it’s ready for the next people.'],
    ['Office Cleaning', 'XAF 20k / visit', 'Regular cleaning for shops and offices.'],
  ],
  Mechanic: [
    ['Diagnostics', 'XAF 5k', 'Find out exactly why the car won’t start or runs rough.'],
    ['Oil & Filter Change', 'XAF 12k – 20k', 'Engine oil, filter and a full fluid check.'],
    ['Brake Service', 'XAF 25k – 50k', 'Pads, discs and brake fluid done properly.'],
  ],
  Delivery: [
    ['Same-day Parcel', 'XAF 1k – 3k', 'Pick-up and drop-off anywhere in Buea within hours.'],
    ['Grocery Run', 'XAF 2k + items', 'Market or supermarket shopping brought to your door.'],
    ['Documents', 'XAF 1.5k', 'Fast, careful courier for important papers.'],
  ],
  Developer: [
    ['Business website', 'XAF 150k – 400k', 'A fast, mobile-friendly website with WhatsApp ordering and your products.'],
    ['Mobile app (MVP)', 'From XAF 600k', 'Android & iOS app, from idea to Play Store.'],
    ['Fix or update a site', 'XAF 15k / hr', 'Bugs, speed, new pages, hosting and domain setup.'],
  ],
  Designer: [
    ['Logo & brand kit', 'XAF 25k – 60k', 'Logo, colours and fonts, ready for print and social media.'],
    ['Flyers & posters', 'XAF 8k / design', 'Eye-catching flyers delivered in 24 hours.'],
    ['App / website UI', 'From XAF 120k', 'Clean screens designed in Figma, ready to build.'],
  ],
  Teacher: [
    ['Home lessons', 'XAF 40k / month', '3 sessions a week at your home, any level up to GCE A Level.'],
    ['Exam crash course', 'XAF 15k / week', 'Intensive revision with past questions before the exams.'],
    ['Online class', 'XAF 3k / hr', 'One-to-one lessons on WhatsApp video or Google Meet.'],
  ],
  Accountant: [
    ['Monthly bookkeeping', 'XAF 50k / month', 'Sales, expenses and stock recorded, with a monthly report.'],
    ['Tax filing', 'XAF 30k – 80k', 'Prepare and file your returns on time.'],
    ['Business set-up', 'XAF 60k', 'Accounts structure and OHADA-compliant books from day one.'],
  ],
  Driver: [
    ['Daily driver', 'XAF 90k / month', 'Monday–Friday driving for families or companies.'],
    ['Airport / city trip', 'XAF 25k / trip', 'Douala airport pick-ups and inter-city trips.'],
    ['Driver for a day', 'XAF 15k / day', 'Errands, events or visitors around Buea.'],
  ],
  Sales: [
    ['Social media management', 'XAF 60k / month', 'Posts, replies and ads on Facebook, Instagram and TikTok.'],
    ['Field promotion', 'XAF 10k / day', 'Flyering and product promotion around Buea.'],
    ['Sales agent', 'Commission', 'Sell your products on commission.'],
  ],
  Nurse: [
    ['Home nursing visit', 'XAF 10k / visit', 'Injections, dressings, blood pressure and checks at home.'],
    ['Elderly care', 'XAF 80k / month', 'Daily care and company for elderly family members.'],
    ['Night care', 'XAF 15k / night', 'Overnight care after surgery or illness.'],
  ],
  Cook: [
    ['Party catering', 'XAF 2k / guest', 'Cameroonian and continental dishes for events.'],
    ['Home cook', 'XAF 60k / month', 'Daily meals cooked in your home.'],
    ['Cooking class', 'XAF 10k', 'Learn ndolé, eru or pastries in one session.'],
  ],
  Hairdresser: [
    ['Braids', 'XAF 8k – 25k', 'Knotless, cornrows and twists, at home or in the salon.'],
    ['Wig install', 'XAF 10k', 'Frontal and closure installs.'],
    ['Home visit', '+ XAF 2k', 'I come to you anywhere in Buea.'],
  ],
};
CATS.forEach(([c]) => {
  if (!SERVICES[c])
    SERVICES[c] = [
      [`${c}: one-off job`, 'Ask for a quote', 'Tell me what you need and I’ll send a price.'],
      [`${c}: hourly`, 'XAF 3k / hr', 'Flexible help, whenever you need it.'],
      [`${c}: monthly`, 'Ask for a price', 'Part-time or full-time work.'],
    ];
});

/** Words that suggest a category when someone writes a job. */
export const CAT_KW: Record<string, string[]> = {
  Plumber: ['sink', 'tap', 'faucet', 'pipe', 'leak', 'drip', 'toilet', 'shower', 'drain', 'water heater', 'plumb', 'bathroom', 'blocked', 'tank', 'borehole'],
  Electrician: ['socket', 'light', 'bulb', 'wire', 'wiring', 'power', 'electric', 'switch', 'fan', 'solar', 'generator', 'inverter', 'fuse', 'meter', 'cable'],
  Cleaner: ['clean', 'wash', 'laundry', 'dust', 'mop', 'tidy', 'maid', 'house help', 'sweep', 'ironing', 'compound'],
  Mechanic: ['car', 'engine', 'brake', 'tyre', 'tire', 'mechanic', 'oil change', 'vehicle', 'motor', 'won’t start', "won't start", 'gearbox', 'clutch', 'okada', 'bike'],
  Delivery: ['deliver', 'pick up', 'pickup', 'parcel', 'package', 'courier', 'groceries', 'errand', 'drop off', 'bring'],
  Developer: ['website', 'web site', 'mobile app', 'web app', 'developer', 'software', 'programm', 'coding', 'wordpress', 'e-commerce', 'ecommerce', 'react', 'flutter', 'database'],
  Designer: ['logo', 'flyer', 'poster', 'graphic', 'branding', 'design', 'video edit', 'photograph', 'banner', 'ui/ux', 'illustrat'],
  Teacher: ['tutor', 'lesson', 'teacher', 'classes', 'maths', 'math ', 'physics', 'chemistry', 'gce', 'exam prep', 'homework'],
  Accountant: ['accounting', 'bookkeep', 'accountant', 'tax', 'audit', 'payroll', 'financial statement'],
  Sales: ['sales', 'marketing', 'social media', 'promoter', 'promote', 'ambassador', 'telesales'],
  Driver: ['driver', 'chauffeur', 'drive my', 'school run', 'taxi'],
  Cook: ['cook', 'chef', 'catering', 'caterer', 'meals', 'small chops', 'party food'],
  Nurse: ['nurse', 'caregiver', 'patient', 'injection', 'home care'],
  Security: ['guard', 'security', 'watchman', 'night watch'],
  Hairdresser: ['hair', 'braid', 'barber', 'makeup', 'make-up', 'nails', 'wig'],
  Tailor: ['tailor', 'sew', 'dress', 'kaba', 'uniform', 'alteration'],
  Builder: ['mason', 'build', 'tiles', 'tiling', 'paint', 'carpent', 'weld', 'roof', 'plaster', 'handyman'],
  Admin: ['secretary', 'receptionist', 'data entry', 'assistant', 'typing', 'office'],
  Writer: ['writer', 'article', 'content', 'translat', 'proofread', 'transcri'],
  Events: ['event', 'dj', 'decoration', 'mc ', 'wedding'],
  Nanny: ['nanny', 'babysit', 'house help', 'housemaid', 'elderly'],
  Farmer: ['farm', 'poultry', 'garden', 'landscap', 'pig'],
  Engineer: ['engineer', 'autocad', 'survey', 'structural'],
  Coach: ['coach', 'trainer', 'fitness', 'gym', 'dance'],
};
export function detectCat(t: string): string | null {
  t = (t || '').toLowerCase();
  let best: string | null = null;
  let sc = 0;
  for (const [c, ks] of Object.entries(CAT_KW)) {
    const s = ks.reduce((a, k) => a + (new RegExp('\\b' + k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).test(t) ? 1 : 0), 0);
    if (s > sc) {
      sc = s;
      best = c;
    }
  }
  return best;
}

export const AREAS: [string, string, string, string, [string, string, string?][]][] = [
  ['IT & Software', 'cat-dev', 'Developer', 'Developers, IT support, data', [['Web development', 'dev web'], ['Mobile app development', 'dev mobile'], ['Software engineering', 'dev cloud'], ['Frontend development', 'dev web'], ['Backend development', 'dev cloud'], ['Data analysis', 'data'], ['Data science / AI', 'dev data'], ['DevOps & cloud', 'cloud'], ['Cybersecurity', 'cloud net'], ['IT support & networking', 'net'], ['Computer & phone repair', 'net'], ['Software testing / QA', 'dev'], ['Database administration', 'dev']]],
  ['Design & Creative', 'cat-design', 'Designer', 'Graphics, video, photos, UI', [['Graphic design', 'design'], ['UI/UX design', 'design'], ['Logo & branding', 'design'], ['Video editing', 'video'], ['Photography', 'video'], ['Videography', 'video'], ['Animation & motion', 'design video'], ['Illustration', 'design'], ['Interior design', 'design']]],
  ['Marketing & Sales', 'cat-sales', 'Sales', 'Social media, sales, ads', [['Social media management', 'mkt'], ['Digital marketing', 'mkt'], ['Sales representative', 'sales'], ['Telesales', 'sales cs'], ['Brand ambassador', 'sales'], ['Content creation', 'mkt video'], ['SEO', 'mkt'], ['Real estate agent', 'sales'], ['Market research', 'data']]],
  ['Customer service', 'a-headset', 'Admin', 'Call centre, reception, support', [['Customer support', 'cs'], ['Call centre agent', 'cs lang'], ['Receptionist', 'cs admin'], ['Front desk / hotel reception', 'cs lang']]],
  ['Admin & Office', 'cat-admin', 'Admin', 'Assistant, data entry, HR', [['Office assistant / secretary', 'admin'], ['Data entry', 'admin'], ['Virtual assistant', 'admin cs'], ['HR & recruitment', 'admin'], ['Project management', 'ngo admin'], ['Typing & printing', 'admin']]],
  ['Finance & Accounting', 'cat-acct', 'Accountant', 'Accounting, tax, banking', [['Accounting & bookkeeping', 'acct acctc'], ['Auditing', 'acct acctc'], ['Tax filing', 'acct'], ['Payroll', 'acct'], ['Financial analysis', 'data'], ['Banking & microfinance', 'sales cs'], ['Mobile money agent', 'sales']]],
  ['Education & Tutoring', 'cat-teach', 'Teacher', 'Home tutors, teachers, trainers', [['Home tutoring', 'teach teachl'], ['Teaching (schools)', 'teach teachl'], ['Exam coaching (GCE)', 'teach teachl'], ['Language teaching', 'lang teachl'], ['Computer training', 'dev teachl'], ['Music lessons', 'teachl']]],
  ['Healthcare', 'cat-health', 'Nurse', 'Nurses, carers, pharmacy', [['Nursing', 'health lic'], ['Caregiving', 'health'], ['Midwifery', 'health lic'], ['Pharmacy assistant', 'health lic'], ['Lab technician', 'health lic'], ['Physiotherapy', 'health lic']]],
  ['Hospitality & Food', 'cat-cook', 'Cook', 'Cooks, waiters, catering', [['Cooking / chef', 'cook'], ['Baking & pastry', 'cook'], ['Catering', 'cook event'], ['Waiter / waitress', 'cs'], ['Bartending', 'cs'], ['Kitchen assistant', 'cook'], ['Hotel housekeeping', 'clean']]],
  ['Retail & Shops', 'storefront', 'Sales', 'Shop attendants, cashiers', [['Shop attendant', 'sales'], ['Cashier', 'sales'], ['Stock keeping', 'logi'], ['Merchandising', 'sales']]],
  ['Driving & Delivery', 'cat-driver', 'Driver', 'Drivers, riders, couriers', [['Delivery rider', 'deliv', 'Delivery'], ['Errands & courier', 'deliv', 'Delivery'], ['Car / family driver', 'drive veh'], ['Taxi driver', 'drive veh'], ['Truck driver', 'drive veh'], ['Bus driver', 'drive veh']]],
  ['Logistics & Warehouse', 'a-pkg', 'Delivery', 'Warehouse, dispatch, loading', [['Warehouse worker', 'logi'], ['Forklift operator', 'logi'], ['Dispatcher', 'logi'], ['Customs clearing', 'logi'], ['Loader / carrier', 'logi']]],
  ['Construction & Building', 'cat-build', 'Builder', 'Masons, carpenters, painters', [['Masonry', 'build'], ['Carpentry', 'build'], ['Painting', 'build'], ['Welding', 'build'], ['Tiling', 'build'], ['Roofing', 'build'], ['Plastering', 'build'], ['Site supervisor', 'build eng']]],
  ['Home repairs', 'wrench', 'Builder', 'Plumbing, electrical, appliances', [['Plumbing', 'plumb', 'Plumber'], ['Electrical work', 'elec', 'Electrician'], ['Solar installation', 'elec', 'Electrician'], ['AC & fridge repair', 'elec', 'Electrician'], ['Appliance repair', 'elec', 'Electrician'], ['General handyman', 'build'], ['Locksmith', 'build']]],
  ['Cleaning', 'cat-cleaner', 'Cleaner', 'Homes, offices, laundry', [['House cleaning', 'clean'], ['Office cleaning', 'clean'], ['Deep cleaning', 'clean'], ['Laundry & ironing', 'clean'], ['Pest control', 'clean'], ['Car wash', 'clean']]],
  ['Auto & Mechanics', 'cat-mechanic', 'Mechanic', 'Mechanics, auto electrics, tyres', [['Car mechanic', 'mechv mech'], ['Motorbike mechanic', 'mechv mech'], ['Auto electrician', 'mechv mech'], ['Panel beating & spraying', 'mech'], ['Vulcanizer (tyres)', 'mechv']]],
  ['Beauty & Hair', 'cat-hair', 'Hairdresser', 'Hair, barbering, nails, make-up', [['Hairdressing', 'beauty'], ['Barbering', 'beauty'], ['Braiding', 'beauty'], ['Nail technician', 'beauty'], ['Make-up artist', 'beauty'], ['Massage therapy', 'beauty']]],
  ['Fashion & Tailoring', 'cat-tailor', 'Tailor', 'Tailors, designers, shoes', [['Tailoring', 'tailor'], ['Fashion design', 'tailor design'], ['Shoe making & repair', 'tailor'], ['Embroidery', 'tailor']]],
  ['Security', 'cat-sec', 'Security', 'Guards, watchmen, CCTV', [['Security guard', 'sec lic'], ['Watchman', 'sec'], ['CCTV operator', 'sec net'], ['Bodyguard', 'sec lic']]],
  ['Agriculture', 'cat-farm', 'Farmer', 'Farming, poultry, gardens', [['Farming', 'farm'], ['Poultry farming', 'farm'], ['Fish farming', 'farm'], ['Agronomy', 'farm'], ['Gardening & landscaping', 'farm']]],
  ['Manufacturing', 'a-factory', 'Engineer', 'Factory, production, QC', [['Machine operator', 'factory'], ['Quality control', 'factory'], ['Production worker', 'factory'], ['Packaging', 'factory']]],
  ['Media & Writing', 'cat-writer', 'Writer', 'Writing, translation, journalism', [['Content writing', 'write'], ['Copywriting', 'write mkt'], ['Translation', 'lang write'], ['Journalism', 'write'], ['Transcription', 'write lang'], ['Voice-over', 'lang']]],
  ['Events & Entertainment', 'cat-events', 'Events', 'Planners, DJs, MCs, decor', [['Event planning', 'event'], ['Decoration', 'event'], ['DJ', 'event'], ['MC / host', 'event lang'], ['Music & band', 'event']]],
  ['Childcare & Domestic', 'cat-nanny', 'Nanny', 'Nannies, house help, elderly care', [['Babysitting', 'care'], ['Nanny', 'care'], ['House help', 'care clean'], ['Elderly care', 'care health']]],
  ['Engineering', 'cat-eng', 'Engineer', 'Civil, electrical, telecom', [['Civil engineering', 'eng engt'], ['Electrical engineering', 'eng engt'], ['Mechanical engineering', 'eng engt'], ['Telecom engineering', 'eng'], ['Surveying', 'eng engt'], ['Draughtsman (AutoCAD)', 'engt']]],
  ['Legal', 'a-scales', 'Admin', 'Lawyers, legal assistants', [['Legal assistant', 'legal admin'], ['Lawyer', 'legal'], ['Notary clerk', 'legal admin']]],
  ['NGO & Social work', 'a-heart', 'Admin', 'Outreach, projects, M&E', [['Community outreach', 'ngo lang'], ['Social work', 'ngo'], ['Project officer', 'ngo'], ['M&E officer', 'ngo data']]],
  ['Sports & Fitness', 'cat-coach', 'Coach', 'Trainers, coaches, dance', [['Personal trainer', 'fit'], ['Football coach', 'fit'], ['Dance instructor', 'fit'], ['Yoga instructor', 'fit']]],
];
export const AREAMAP: Record<string, { i: string; c: string; ex: string }> = {};
export type SkillDef = { i: number; n: string; a: string; c: string; x: string[] };
export const SKILLS: SkillDef[] = [];
AREAS.forEach(([a, i, c, ex, list]) => {
  AREAMAP[a] = { i, c, ex };
  list.forEach(([n, x, co]) => SKILLS.push({ i: SKILLS.length, n, a, c: co || c, x: x ? x.split(' ') : [] }));
});
export const POPULAR = ['Web development', 'Graphic design', 'Home tutoring', 'Plumbing', 'Electrical work', 'Delivery rider', 'Accounting & bookkeeping', 'Sales representative', 'House cleaning', 'Car mechanic', 'Social media management', 'Cooking / chef', 'Hairdressing', 'Car / family driver'].map(
  (n) => SKILLS.find((s) => s.n === n)!,
);
export const EXPLV: [string, string, number, number][] = [
  ['Entry level', '0–1 yr', 0, 1],
  ['Junior', '1–3 yrs', 1, 3],
  ['Mid-level', '3–5 yrs', 3, 5],
  ['Senior', '5–10 yrs', 5, 10],
  ['Expert', '10+ yrs', 10, 40],
];
export const lvOf = (y: number) => (EXPLV.slice().reverse().find((l) => y >= l[2]) || EXPLV[0])[0];


export const STAGES: [string, string][] = [
  ['applied', 'Applied'],
  ['short', 'Shortlisted'],
  ['interview', 'Interview'],
  ['offer', 'Contract sent'],
  ['hired', 'Hired'],
];



