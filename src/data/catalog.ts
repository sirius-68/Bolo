/* Static reference data — ported from the bolo prototype. */
import { C } from '../ui/theme';

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
export const CATIMG: Record<string, string> = Object.fromEntries(CATS);
export const catIcon = (c?: string) => (c && CATIMG[c]) || 'job';

/** Services offered per category: [name, price, description, image?]. */
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
    ['Braids', 'XAF 8k – 25k', 'Knotless, cornrows and twists — at home or in the salon.'],
    ['Wig install', 'XAF 10k', 'Frontal and closure installs.'],
    ['Home visit', '+ XAF 2k', 'I come to you anywhere in Buea.'],
  ],
};
CATS.forEach(([c]) => {
  if (!SERVICES[c])
    SERVICES[c] = [
      [`${c} — one-off job`, 'Ask for a quote', 'Tell me what you need and I’ll send a price.'],
      [`${c} — hourly`, 'XAF 3k / hr', 'Flexible help, whenever you need it.'],
      [`${c} — monthly`, 'Ask for a price', 'Part-time or full-time work.'],
    ];
});

export const ABOUT_EDWARD = {
  bio: 'Professional plumber with over 15 years of experience in residential and commercial plumbing. Specialising in repairs, installations, and maintenance. Licensed and insured with a commitment to quality workmanship and customer satisfaction.',
  spec: ['Faucet and sink repairs/installations', 'Toilet repairs and replacements', 'Pipe leak detection and repair', 'Water heater installation and maintenance', 'Bathroom and kitchen remodeling'],
  cred: [
    ['Master Plumber Certificate', 'GTHS Buea • Issued 2010'],
    ['Certified Water Systems Technician', 'CAMWATER • Issued 2015'],
    ['Green Plumbing Certification', 'SkillUp CM • Issued 2018'],
  ] as [string, string][],
};

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

export const OB = [
  { t: 'Find work. Find people.', p: 'From developers, teachers and accountants to plumbers and drivers — jobs, gigs and skilled people near you.', art: 'house' },
  { t: 'Hire in a single tap.', p: 'Compare ratings, prices and past work, then hire the right person — with live job tracking.', art: 'phone' },
  { t: 'Show your work. Get paid.', p: 'Build a profile, share your work and get booked by people and businesses around you.', art: 'toolbox' },
  { t: 'Run your business hiring.', p: 'Create a business page, post vacancies, track applicants and hire under company contracts.', art: 'biz' },
  { t: 'Grow your career.', p: 'Internships, programs and courses from real businesses — plus a free CV builder.', art: 'career' },
  { t: 'Learn from mentors.', p: 'Join 1-to-1 or group mentorships from experienced people and companies — or become a mentor yourself.', art: 'mentor' },
];

/* -------------------- skills taxonomy -------------------- */
export const PROF = ['Beginner', 'Intermediate', 'Advanced', 'Expert'];
export const LANGP = ['Basic', 'Good', 'Fluent', 'Native'];
export type ExSpec = { l: string; t: 's' | 'm' | 'ml'; lv?: string[]; o: string[] };
export const EX: Record<string, ExSpec> = {
  dev: { l: 'Programming languages you know', t: 'ml', lv: PROF, o: ['JavaScript', 'TypeScript', 'Python', 'Java', 'PHP', 'C#', 'C++', 'C', 'Kotlin', 'Swift', 'Dart', 'Go', 'Ruby', 'Rust', 'SQL'] },
  web: { l: 'Frameworks & tools', t: 'm', o: ['React', 'Next.js', 'Vue', 'Angular', 'Node.js', 'Express', 'Laravel', 'Django', 'WordPress', 'Tailwind CSS', 'Bootstrap'] },
  mobile: { l: 'Mobile frameworks', t: 'm', o: ['Flutter', 'React Native', 'Android (Kotlin/Java)', 'iOS (Swift)', 'Ionic'] },
  data: { l: 'Tools you use', t: 'ml', lv: PROF, o: ['Excel', 'Google Sheets', 'SQL', 'Power BI', 'Tableau', 'Python (pandas)', 'R', 'SPSS'] },
  cloud: { l: 'Platforms & tools', t: 'm', o: ['AWS', 'Google Cloud', 'Azure', 'Docker', 'Kubernetes', 'Linux', 'Git', 'CI/CD'] },
  net: { l: 'What you can fix or set up', t: 'm', o: ['Networks & Wi-Fi', 'Computer repair', 'Phone repair', 'CCTV', 'Printers', 'Windows / Linux setup', 'Software installs'] },
  design: { l: 'Design tools', t: 'ml', lv: PROF, o: ['Figma', 'Photoshop', 'Illustrator', 'Canva', 'CorelDRAW', 'InDesign', 'After Effects', 'Blender'] },
  video: { l: 'Editing tools', t: 'm', o: ['Premiere Pro', 'CapCut', 'DaVinci Resolve', 'Final Cut', 'Lightroom', 'After Effects'] },
  mkt: { l: 'Channels', t: 'm', o: ['Facebook & Instagram', 'TikTok', 'WhatsApp Business', 'Google Ads', 'SEO', 'Email marketing', 'Content writing'] },
  sales: { l: 'Type of sales', t: 'm', o: ['Field sales', 'Telesales', 'Shop / retail', 'B2B', 'Real estate', 'Mobile money', 'Door-to-door'] },
  cs: { l: 'Channels you handle', t: 'm', o: ['Phone', 'WhatsApp / chat', 'Email', 'Front desk / walk-in', 'Social media'] },
  admin: { l: 'Office tools', t: 'ml', lv: PROF, o: ['Word', 'Excel', 'PowerPoint', 'Google Workspace', 'Typing', 'Filing & records'] },
  acct: { l: 'Accounting software', t: 'ml', lv: PROF, o: ['Excel', 'Sage', 'QuickBooks', 'Odoo', 'Tally', 'Xero'] },
  acctc: { l: 'Certifications', t: 'm', o: ['ACCA', 'CPA', 'CAT', 'OHADA (SYSCOHADA)', 'None yet'] },
  teach: { l: 'Subjects', t: 'm', o: ['Maths', 'Physics', 'Chemistry', 'Biology', 'English', 'French', 'Computer science', 'Economics', 'Accounting', 'Geography', 'History', 'Literature', 'Music'] },
  teachl: { l: 'Levels you teach', t: 'm', o: ['Nursery', 'Primary', 'Secondary', 'GCE O Level', 'GCE A Level', 'University', 'Adults'] },
  lang: { l: 'Languages you work in', t: 'ml', lv: LANGP, o: ['English', 'French', 'Pidgin', 'Spanish', 'German', 'Chinese', 'Arabic', 'Duala', 'Ewondo', 'Fulfulde'] },
  drive: { l: 'Licence categories', t: 'm', o: ['A — motorbike', 'B — car', 'C — truck', 'D — bus', 'E — trailer'] },
  veh: { l: 'Do you have a vehicle?', t: 's', o: ['Own motorbike', 'Own car', 'Own truck', 'No vehicle'] },
  deliv: { l: 'How you deliver', t: 's', o: ['Motorbike (okada)', 'Tricycle', 'Car', 'Bicycle', 'On foot'] },
  cook: { l: 'Cuisines', t: 'm', o: ['Cameroonian', 'Nigerian', 'West African', 'Continental', 'Pastry & baking', 'Grills (soya, fish)', 'Chinese', 'Fast food'] },
  health: { l: 'Areas of care', t: 'm', o: ['General care', 'Maternity', 'Children', 'Elderly care', 'First aid', 'Pharmacy', 'Lab work', 'Home visits'] },
  lic: { l: 'Licence or registration', t: 's', o: ['Licensed / registered', 'In training', 'Not licensed'] },
  beauty: { l: 'Services', t: 'm', o: ['Braiding', 'Barbering', 'Weaves & wigs', 'Natural hair', 'Nails', 'Make-up', 'Lashes', 'Massage'] },
  tailor: { l: 'What you make', t: 'm', o: ['Men’s wear', 'Women’s wear', 'Traditional / kaba', 'Children', 'Uniforms', 'Alterations', 'Embroidery'] },
  build: { l: 'Specialities', t: 'm', o: ['Masonry', 'Tiling', 'Plastering', 'Roofing', 'Painting', 'Carpentry', 'Welding', 'Steel fixing', 'POP ceilings'] },
  elec: { l: 'Specialities', t: 'm', o: ['House wiring', 'Solar installation', 'Industrial', 'Generators', 'CCTV & alarms', 'Appliance repair', 'AC & fridges'] },
  plumb: { l: 'Specialities', t: 'm', o: ['Leaks & repairs', 'New installations', 'Water tanks & boreholes', 'Water heaters', 'Drainage', 'Bathroom fitting'] },
  mechv: { l: 'Vehicles you work on', t: 'm', o: ['Cars', 'Motorbikes', 'Trucks & buses', 'Generators', 'Tricycles'] },
  mech: { l: 'Specialities', t: 'm', o: ['Engine', 'Diagnostics', 'Brakes & suspension', 'Auto electrical', 'AC', 'Body & paint', 'Tyres'] },
  clean: { l: 'What you clean', t: 'm', o: ['Homes', 'Offices', 'Deep cleaning', 'Laundry & ironing', 'After construction', 'Carpets & sofas', 'Cars'] },
  farm: { l: 'Type of farming', t: 'm', o: ['Crops', 'Poultry', 'Pigs & livestock', 'Fish farming', 'Agro-processing', 'Gardens & landscaping'] },
  care: { l: 'What you do', t: 'm', o: ['Babysitting', 'Live-in nanny', 'Elderly care', 'Housekeeping', 'Cooking for the family', 'School runs'] },
  sec: { l: 'Type of work', t: 'm', o: ['Day guard', 'Night guard', 'Events', 'CCTV monitoring', 'Bodyguard', 'Gate & access control'] },
  write: { l: 'Type of writing', t: 'm', o: ['Copywriting', 'Articles & blogs', 'Technical writing', 'Translation', 'Proofreading', 'Scripts', 'CVs & letters'] },
  event: { l: 'What you offer', t: 'm', o: ['Planning', 'Decoration', 'DJ', 'MC / host', 'Catering', 'Sound & lights', 'Photography'] },
  eng: { l: 'Engineering field', t: 'm', o: ['Civil', 'Electrical', 'Mechanical', 'Telecom', 'Petroleum', 'Agricultural', 'Software'] },
  engt: { l: 'Software you use', t: 'ml', lv: PROF, o: ['AutoCAD', 'Revit', 'ArchiCAD', 'SketchUp', 'MATLAB', 'SolidWorks'] },
  legal: { l: 'Areas of law', t: 'm', o: ['Contracts', 'Land & property', 'Business registration', 'Family', 'Labour', 'Court representation'] },
  logi: { l: 'What you can do', t: 'm', o: ['Forklift', 'Stock & inventory', 'Loading / offloading', 'Dispatch', 'Customs clearing', 'Cold chain'] },
  factory: { l: 'What you can do', t: 'm', o: ['Machine operation', 'Quality control', 'Packaging', 'Assembly', 'Maintenance', 'Safety'] },
  fit: { l: 'What you coach', t: 'm', o: ['Personal training', 'Gym', 'Football', 'Basketball', 'Dance', 'Yoga', 'Swimming'] },
  ngo: { l: 'Areas', t: 'm', o: ['Community outreach', 'Project management', 'Monitoring & evaluation', 'Fundraising', 'Social work', 'Research'] },
};

/** Kinds of work: [area, icon, category, examples, skills[[name, extra-keys, category?]]] */
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
export const WORKSTYLE = ['Full-time', 'Part-time', 'One-off gigs', 'Remote', 'Contract', 'Internship', 'Weekends only'];
export const EXPLV: [string, string, number, number][] = [
  ['Entry level', '0–1 yr', 0, 1],
  ['Junior', '1–3 yrs', 1, 3],
  ['Mid-level', '3–5 yrs', 3, 5],
  ['Senior', '5–10 yrs', 5, 10],
  ['Expert', '10+ yrs', 10, 40],
];
export const lvOf = (y: number) => (EXPLV.slice().reverse().find((l) => y >= l[2]) || EXPLV[0])[0];
export const ALL_LANGS = ['English', 'French', 'Pidgin', 'Spanish', 'German', 'Portuguese', 'Italian', 'Chinese (Mandarin)', 'Arabic', 'Hausa', 'Duala', 'Bassa', 'Ewondo', 'Bulu', 'Fulfulde', 'Bakweri', 'Ghomala’ (Bamileke)', 'Medumba', 'Lamnso’', 'Kom', 'Mungaka', 'Yemba', 'Swahili', 'Yoruba', 'Igbo'];
export const SOFT = ['Communication', 'Teamwork', 'Time management', 'Problem solving', 'Customer service', 'Reliability', 'Attention to detail', 'Leadership', 'Negotiation', 'Adaptability'];

/* -------------------- profile -------------------- */
export const ST_W: [string, string, string, string][] = [
  ['open', 'Available for work', 'Clients nearby can find and hire you', '#7be0a7'],
  ['busy', 'Busy — open to offers', 'You still get offers, but show lower in search', '#ffb37a'],
  ['off', 'Not taking jobs', 'Your profile is hidden from search and the map', '#ff9b9b'],
];
export const ST_C: [string, string, string, string][] = [
  ['hiring', 'Hiring now', 'People see that you’re ready to book', '#7be0a7'],
  ['planning', 'Planning a job', 'Collect quotes now and hire later', '#ffb37a'],
  ['off', 'Not hiring right now', 'You won’t get talent suggestions', '#b9b9c0'],
];
export const WHERE = ['At the client’s place', 'At my workshop', 'Both'];
export const UNITS = ['per job', 'per hour', 'per day', 'per visit'];
export const LANGS = ['English', 'French', 'Pidgin', 'Duala', 'Bakweri', 'Fulfulde', 'Ewondo', 'Bamileke'];
export const LVL = ['Basic', 'Good', 'Fluent', 'Native'];
export const EDU = ['No formal education', 'Primary', 'Secondary', 'Technical / vocational', 'University'];
export const DOCS: Record<string, [string, string, string]> = {
  id: ['National ID card', 'idcard', 'Required to work on bolo'],
  biz: ['Business registration', 'storefront', 'Optional · shows clients you’re a registered business'],
  drive: ['Driving licence', 'steer', 'Needed for delivery and mechanic jobs'],
};
export const CT: [string, string, string, string, 'tel' | 'email' | 'text'][] = [
  ['phone', 'Phone number', 'phone', '6XX XX XX XX', 'tel'],
  ['email', 'Email', 'mail', 'you@example.com', 'email'],
  ['whatsapp', 'WhatsApp', 'wa', 'Same as phone, or another number', 'tel'],
  ['telegram', 'Telegram', 'tg', '@username', 'text'],
  ['facebook', 'Facebook', 'fb', 'facebook.com/yourpage', 'text'],
];
export const LANG_SETS = [
  ['English', 'Pidgin'],
  ['English', 'Pidgin', 'French'],
  ['English', 'French'],
  ['English', 'Pidgin', 'Bakweri'],
];

/* -------------------- places -------------------- */
export const NB = ['Molyko', 'Great Soppo', 'Bonduma', 'Mile 17', 'Checkpoint', 'Bomaka', 'Muea', 'Clerks Quarter', 'Buea Town'];
export const CITIES: [string, string][] = [
  ['Buea', 'South-West'],
  ['Limbe', 'South-West'],
  ['Kumba', 'South-West'],
  ['Tiko', 'South-West'],
  ['Mutengene', 'South-West'],
  ['Douala', 'Littoral'],
  ['Edéa', 'Littoral'],
  ['Nkongsamba', 'Littoral'],
  ['Yaoundé', 'Centre'],
  ['Mbalmayo', 'Centre'],
  ['Bamenda', 'North-West'],
  ['Kumbo', 'North-West'],
  ['Bafoussam', 'West'],
  ['Dschang', 'West'],
  ['Foumban', 'West'],
  ['Kribi', 'South'],
  ['Ebolowa', 'South'],
  ['Bertoua', 'East'],
  ['Ngaoundéré', 'Adamawa'],
  ['Garoua', 'North'],
  ['Maroua', 'Far North'],
];
export const PJ_AREAS = ['Molyko', 'Great Soppo', 'Bonduma', 'Mile 17', 'Checkpoint', 'Bomaka', 'Muea', 'Remote / online'];

/* -------------------- skill tests -------------------- */
export const QUIZ: Record<string, [string, string[], number][]> = {
  Plumber: [
    ['A tap keeps dripping after it’s closed. What usually fixes it?', ['Replace the washer or cartridge', 'Tighten it as hard as possible', 'Paint the pipe', 'Switch off the electricity'], 0],
    ['What do you do first before repairing a pipe?', ['Open every tap fully', 'Shut off the water supply', 'Heat the pipe', 'Call the neighbour'], 1],
    ['Which tape seals threaded pipe joints?', ['Electrical tape', 'Masking tape', 'PTFE (thread seal) tape', 'Duct tape'], 2],
  ],
  Electrician: [
    ['Before working on a socket you should…', ['Work quickly', 'Switch off the breaker and test it’s dead', 'Wear slippers', 'Unplug the fridge'], 1],
    ['Which wire colour is usually earth?', ['Green/yellow', 'Red', 'Blue', 'Brown'], 0],
    ['A breaker keeps tripping. The most likely cause is…', ['A very bright bulb', 'Low water pressure', 'An overload or short circuit', 'A loose door'], 2],
  ],
  Cleaner: [
    ['Which two products must never be mixed?', ['Soap and water', 'Bleach and ammonia', 'Vinegar and water', 'Baking soda and water'], 1],
    ['What’s the best order to clean a room?', ['Top to bottom', 'Floor first, then shelves', 'Any order', 'Windows only'], 0],
    ['What removes streaks from glass best?', ['A rough sponge', 'Cooking oil', 'Sandpaper', 'A clean microfibre cloth'], 3],
  ],
  Mechanic: [
    ['The engine cranks but won’t start. What do you check first?', ['Tyre pressure', 'Fuel and spark', 'The radio fuse', 'Wiper blades'], 1],
    ['Squealing when braking usually means…', ['Worn brake pads', 'Low coolant', 'A flat battery', 'A loose mirror'], 0],
    ['How often is engine oil typically changed?', ['Every 500 km', 'Every 5 years', 'Every 5,000–10,000 km', 'Never'], 2],
  ],
  Delivery: [
    ['The client isn’t home when you arrive. You should…', ['Leave it on the road', 'Call or message them first', 'Take it home for good', 'Give it to anyone nearby'], 1],
    ['Fragile items should be…', ['Packed upright and secured', 'Put under heavy bags', 'Carried loose', 'Thrown in the top box'], 0],
    ['Before you set off, check…', ['Only the price', 'Nothing', 'The address, contact and package', 'Next week’s weather'], 2],
  ],
  Developer: [
    ['What does HTTP status 404 mean?', ['Server crashed', 'Page not found', 'Login required', 'Request was successful'], 1],
    ['Which is used to store code history?', ['Git', 'Photoshop', 'Excel', 'FTP only'], 0],
    ['A user’s password should be stored…', ['In plain text', 'In a cookie', 'As a salted hash', 'In the URL'], 2],
  ],
  Designer: [
    ['Which format keeps a logo sharp at any size?', ['JPG', 'SVG (vector)', 'GIF', 'BMP'], 1],
    ['Colour mode for printing flyers?', ['RGB', 'CMYK', 'HSL', 'Hex only'], 1],
    ['Good contrast mainly helps with…', ['Readability & accessibility', 'File size', 'Printing speed', 'Nothing'], 0],
  ],
  Teacher: [
    ['A student keeps failing a topic. Best first step?', ['Give more homework', 'Find out where they get stuck', 'Move to the next topic', 'Tell the parents only'], 1],
    ['What does a lesson objective describe?', ['What students will be able to do', 'The classroom rules', 'The exam date', 'The textbook price'], 0],
    ['A good way to check understanding is to…', ['Ask open questions', 'Only lecture', 'Skip practice', 'Avoid questions'], 0],
  ],
  Accountant: [
    ['Assets = Liabilities + …', ['Revenue', 'Equity', 'Expenses', 'Cash'], 1],
    ['Which system is used for accounts in Cameroon (OHADA)?', ['IFRS only', 'SYSCOHADA', 'US GAAP', 'None'], 1],
    ['A bank reconciliation compares…', ['Sales and stock', 'Your records and the bank statement', 'Budget and forecast', 'Payroll and tax'], 1],
  ],
  Driver: [
    ['What does a solid white line on the road mean?', ['Overtaking allowed', 'Do not cross', 'Parking zone', 'Pedestrians only'], 1],
    ['Before a long trip you should check…', ['Tyres, oil, water and brakes', 'Only fuel', 'Only the radio', 'Nothing'], 0],
    ['Safe following distance in good weather is about…', ['0.5 seconds', '2–3 seconds', '10 seconds', '1 metre'], 1],
  ],
  Sales: [
    ['A customer says “it’s too expensive”. Best reply?', ['Ignore it', 'Explain the value and options', 'Argue', 'Walk away'], 1],
    ['What’s a lead?', ['A possible customer', 'A product', 'A discount', 'A competitor'], 0],
    ['After a sale, you should…', ['Follow up with the customer', 'Block their number', 'Forget them', 'Raise the price'], 0],
  ],
  General: [
    ['A client changes the job after agreeing a price. You should…', ['Agree a new price before continuing', 'Do it for free', 'Leave without saying', 'Charge double later'], 0],
    ['You’ll be 20 minutes late. What do you do?', ['Say nothing', 'Call or message before the start time', 'Cancel the job', 'Blame traffic later'], 1],
    ['When the job is done you should…', ['Check the work with the client', 'Leave quickly', 'Ask for a tip first', 'Skip payment'], 0],
  ],
};

/* -------------------- career -------------------- */
export const PROVIDERS = [
  ['Silicon Mountain Academy', 'SMA', '#a9b6ff', '#000'],
  ['Buea Tech School', 'BTS', '#3d5af1', '#fff'],
  ['Learnly Africa', 'LA', '#f6ee5c', '#000'],
  ['SkillUp CM', 'SU', '#f47b3b', '#000'],
  ['Mboa Academy', 'MA', '#7be0a7', '#000'],
  ['GreenField Institute', 'GF', '#2a2a2e', '#7be0a7'],
].map(([n, t, b, f]) => ({ n, logo: `logo:${t}|${b}|${f}` }));
export const COURSE_CATS: [string, string][] = [
  ['Business', 'job'],
  ['Finance', 'cat-acct'],
  ['AI & data', 'sparkle'],
  ['Development', 'cat-dev'],
  ['Marketing', 'cat-sales'],
  ['Design', 'cat-design'],
  ['Trades', 'wrench'],
  ['Languages', 'translate'],
  ['Health', 'cat-health'],
  ['Teaching', 'cat-teach'],
];
export const SALARIES: [string, string, string][] = [
  ['Web developer', 'Developer', '150k – 450k'],
  ['Data analyst', 'Developer', '180k – 400k'],
  ['Graphic designer', 'Designer', '80k – 250k'],
  ['Accountant', 'Accountant', '150k – 350k'],
  ['Sales representative', 'Sales', '70k – 150k + commission'],
  ['Customer service agent', 'Admin', '80k – 150k'],
  ['Teacher (secondary)', 'Teacher', '90k – 200k'],
  ['Registered nurse', 'Nurse', '120k – 250k'],
  ['Driver', 'Driver', '70k – 120k'],
  ['Electrician', 'Electrician', '80k – 200k'],
  ['Plumber', 'Plumber', '70k – 180k'],
  ['Mason', 'Builder', '60k – 150k'],
  ['Cook / chef', 'Cook', '60k – 180k'],
  ['Hairdresser', 'Hairdresser', '50k – 150k'],
  ['Security guard', 'Security', '45k – 80k'],
];
export const ARTICLES: [string, string, string, string[]][] = [
  ['How to write a CV that gets calls back', '5 min', 'CV', ['Keep it to one page if you have less than 5 years of experience. Put your strongest skill and your phone number at the top.', 'For every job, write what you achieved, not just what you did: “Fixed plumbing in 40+ homes” beats “Plumber”.', 'Add your languages and any certificates — employers in Cameroon value English–French bilingualism highly.']],
  ['10 interview questions and how to answer them', '7 min', 'Interviews', ['“Tell me about yourself” — answer in 60 seconds: who you are, what you do best, and why this job.', '“Why should we hire you?” — link one of your achievements to their need.', 'Always prepare one question for them, like “What does success look like in the first 3 months?”']],
  ['Freelancing on the side: how to start', '6 min', 'Gigs', ['Start with people who already trust you: friends, former colleagues, your church or quarter.', 'Set a clear starting price and stick to it. Use bolo quotes so both sides agree before the work starts.', 'Collect reviews from your first five jobs — they bring the next twenty.']],
  ['Internship or first job? Getting your foot in the door', '4 min', 'Early career', ['Internships are a real way in: many companies hire their best interns.', 'Treat it like a job — be on time, ask questions, and keep a list of what you learned.', 'Ask for a reference letter before you finish.']],
  ['Negotiating your salary without fear', '5 min', 'Pay', ['Check typical pay for your role in Professions & salaries before the conversation.', 'Give a range, not a single number, and start a little above what you want.', 'If the salary is fixed, negotiate transport, training or a review date instead.']],
];
export const PATHS: [string, string, string[], string[], string[]][] = [
  ['From shop or sales work into marketing', 'cat-sales', ['Learn social media and WhatsApp Business selling', 'Run ads for one small business (even for free)', 'Build a portfolio of 3 results'], ['c1'], ['o5']],
  ['Into tech: become a web developer', 'cat-dev', ['Learn HTML, CSS and JavaScript', 'Build 3 small projects for real businesses', 'Apply for an internship or junior role'], ['c3', 'c4'], ['o4', 'o1']],
  ['From helper to certified tradesperson', 'wrench', ['Join an apprenticeship', 'Get a recognised certificate', 'Start taking your own jobs on bolo'], ['c9', 'c10'], ['o3']],
  ['Into care work and nursing', 'cat-health', ['Take a home care course', 'Get first aid certified', 'Apply for a clinical internship'], ['c13'], ['o2']],
];
export const EXPERTS: [string, string, string][] = [
  ['Linda Ebai', 'CV & interview coach', 'faces/expert0'],
  ['Patrick Ngu', 'Tech careers mentor', 'faces/expert1'],
  ['Esther Mbong', 'HR manager, 12 yrs', 'faces/expert2'],
];
export const OPP_KINDS = ['Internship', 'Graduate program', 'Apprenticeship', 'Training program', 'Course'];

/* -------------------- business -------------------- */
export const SIZES = ['Just me', '2–10', '11–50', '51–200', '200+'];
export const BZCOLORS = ['#f6ee5c', '#3d5af1', '#f47b3b', '#a9b6ff', '#7be0a7', '#ffffff'];
export const BO_HIRE = ['Full-time staff', 'Part-time staff', 'Internships', 'Contract workers', 'One-off gigs', 'Apprentices'];
export const STAGES: [string, string][] = [
  ['applied', 'Applied'],
  ['short', 'Shortlisted'],
  ['interview', 'Interview'],
  ['offer', 'Contract sent'],
  ['hired', 'Hired'],
];
export const STAGE_COL: Record<string, string> = { applied: '#8d8d95', short: '#a9b6ff', interview: '#ffb37a', offer: '#f6ee5c', hired: '#7be0a7' };

/* -------------------- groups -------------------- */
export const RULES: Record<string, [string, string]> = {
  noDM: ['No direct messages to the mentor without permission', 'lock'],
  intro: ['Introduce yourself when you join', 'follow'],
  respect: ['Be respectful — no spam or selling', 'shield'],
  noLinks: ['No sharing outside links', 'x'],
  camera: ['Cameras on during live sessions', 'video2'],
  onTime: ['Join sessions on time', 'clock'],
};

/* -------------------- reviews -------------------- */
export const RV_TAGS_W = ['On time', 'Great quality', 'Friendly', 'Fair price', 'Clean work', 'Good communication'];
export const RV_TAGS_C = ['Clear instructions', 'Paid on time', 'Friendly', 'Easy to reach', 'Respectful'];

/* -------------------- notifications -------------------- */
export const NT_ICON: Record<string, [string, string]> = {
  like: ['heart', '#ff4d6d'],
  follow: ['follow', C.yellow],
  quote: ['job', C.lav],
  accept: ['check', C.ok],
  mention: ['at', C.lav],
  review: ['star', C.yellow],
  payment: ['receipt', C.ok],
  reminder: ['clock', C.orange],
  offers: ['job', C.yellow],
  verified: ['shield', C.yellow],
  newjob: ['job', C.yellow],
  payment_in: ['coins', C.ok],
  newoffer: ['coins', C.yellow],
  onway: ['nav', C.lav],
  arrived: ['wrench', C.yellow],
  jobdone: ['flag', C.ok],
};
export const NT_JOBS = ['quote', 'accept', 'reminder', 'offers', 'payment', 'newjob', 'payment_in', 'newoffer', 'onway', 'arrived', 'jobdone'];

/** Job history shown on a Regular profile (sample). */
export const JOB_HIST: [string, string, string, string, number][] = [
  ['Kitchen sink repair', 'c_tabe', '3 days ago', 'XAF 15,000', 5],
  ['Bathroom tap replacement', 'c_marie', '1 week ago', 'XAF 12,000', 5],
  ['Water heater installation', 'c_ngo', '2 weeks ago', 'XAF 45,000', 4],
  ['Blocked drain', 'c_ama', '3 weeks ago', 'XAF 10,000', 5],
  ['Toilet flush repair', 'c_paul', '1 month ago', 'XAF 8,000', 5],
  ['New water tank connection', 'c_tabe', '1 month ago', 'XAF 35,000', 5],
  ['Shower pressure fix', 'c_ngo', '2 months ago', 'XAF 12,000', 4],
  ['Pipe leak under sink', 'c_marie', '2 months ago', 'XAF 9,000', 5],
  ['Kitchen sink install', 'c_ama', '3 months ago', 'XAF 25,000', 5],
  ['Outdoor tap', 'c_paul', '3 months ago', 'XAF 7,000', 4],
];
export const FOLLOWERS = ['grace', 'kevin', 'joy', 'b_nexa', 'brenda', 'franklin', 'marie', 'claudine', 'b_sma', 'esther', 'lionel', 'sandrine', 'junior', 'vanessa', 'rita', 'moses'];
export const CO_POSTS: [string, string][] = [
  ['We’re hiring! 🎉 Check our open roles on bolo and apply in minutes.', 'clean'],
  ['Our team at work this week — proud of everyone who made this project happen.', 'electric'],
  ['Thank you to our new interns for a great first month 🙏', 'mech'],
  ['Open day this Saturday: come meet the team and learn about our programs.', 'plumb'],
];
export const SCENES = ['plumb', 'clean', 'electric', 'deliver', 'mech', 'design'];
