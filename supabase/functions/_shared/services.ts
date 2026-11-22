// The services under each main skill: what a worker with that skill actually does.
// One list for the app (src/g/services.ts) and for the server's AI (the "understand" function), so a
// request and a worker always mean the same thing by "House wiring".
// Each service: [name, words that point to it (a pattern; English, French and Pidgin as people say them)].
// Rules: every service belongs to exactly one skill; names are short and plain; "General …" is never listed
// (a worker who ticks nothing does general work of the skill).
export const SERVICE_LIST: Record<string, [string, string][]> = {
  Plumber: [
    ['Leak repair', 'leak|drip|fuite|dey leak|burst|pipe'],
    ['Tap and sink', 'tap|faucet|sink|robinet|basin|lavabo|évier|evier'],
    ['Toilet and bathroom', 'toilet|wc|flush|bathroom|shower|douche|bath'],
    ['Blocked drain', 'block|clog|drain|bouch|soak ?away|septic|gutter'],
    ['Water heater', 'heater|chauffe|boiler|geyser|hot water'],
    ['Water tank and pump', 'tank|pump|pompe|citerne|borehole|forage|reservoir'],
    ['New pipe installation', 'install|plumbing for|new house|piping|tuyau'],
  ],
  Electrician: [
    ['Power cut or fault', 'no power|no light|power cut|short|trip|fuse|breaker|disjonct|panne|light no dey|no dey|current|blackout|coupure'],
    ['House wiring', 'wiring|wire|rewire|câbl|cabl|new house|conduit'],
    ['Sockets and switches', 'socket|switch|plug|prise|interrupteur|outlet'],
    ['Lights and fans', 'light|bulb|lamp|fan|ampoule|lumi|chandelier'],
    ['Meter and fuse box', 'meter|compteur|fuse box|board|tableau|eneo'],
    ['Solar and inverter', 'solar|solaire|panel|inverter|onduleur|battery'],
    ['Generator', 'generator|groupe|gen ?set'],
    ['AC and fridge repair', '\\bac\\b|air ?con|clim|fridge|frigo|freezer|cooling'],
  ],
  Cleaner: [
    ['Home cleaning', 'house|home|maison|apartment|room|clean my|ménage|menage'],
    ['Deep cleaning', 'deep|thorough|top to bottom|grand ménage|scrub'],
    ['Move-in or move-out cleaning', 'move|moving|déménag|demenag|new tenant|empty house'],
    ['Office and shop cleaning', 'office|shop|bureau|boutique|store'],
    ['Laundry and ironing', 'laundry|wash clothes|iron|lessive|repass|clothes'],
    ['Sofa and carpet cleaning', 'sofa|carpet|couch|tapis|canapé|canape|mattress|matelas|upholst'],
    ['After-building cleaning', 'construction|after building|chantier|paint stain|cement'],
  ],
  Mechanic: [
    ['Diagnosis', 'diagnos|won.?t start|no start|check engine|noise|problem with (my )?car|ne démarre'],
    ['Oil change and service', 'oil|vidange|service|filter|filtre'],
    ['Brakes', 'brake|frein'],
    ['Engine repair', 'engine|moteur|overheat|smoke|gearbox|clutch|embrayage'],
    ['Tyres and wheels', 'tyre|tire|pneu|wheel|puncture|crevaison|alignment'],
    ['Car electrics and battery', 'battery|batterie|alternator|starter|car light|wiring of (my )?car|electri'],
    ['Motorbike repair', 'bike|moto|okada|bensikin'],
    ['Body work and painting', 'dent|body ?work|tôlerie|tolerie|scratch|spray|carrosserie'],
  ],
  Delivery: [
    ['Parcel delivery', 'parcel|package|colis|deliver|livr|send (a|this)|drop'],
    ['Food and grocery run', 'food|grocer|market|marché|marche|supermarket|shopping|buy me'],
    ['Document delivery', 'document|paper|dossier|letter|envelope|file'],
    ['Moving small items', 'move|chair|table|box|carton|small load|déménag'],
    ['Errands', 'errand|queue|pay (a |my )?bill|collect|pick ?up|course'],
  ],
  Developer: [
    ['Website', 'website|web ?site|site web|landing|wordpress|e-?commerce|online shop|boutique en ligne'],
    ['Mobile app', 'mobile app|android|ios|iphone app|application|\\bapp\\b|play store'],
    ['Fix or update a site or app', 'fix|bug|update|slow|broken|error|maintenance|corrig'],
    ['Online payments', 'payment|momo|mobile money|orange money|checkout|paiement'],
    ['Business software', 'software|system|logiciel|database|inventory|stock|point of sale|\\bpos\\b|dashboard'],
    ['Hosting and domain', 'host|domain|domaine|server|email setup|dns'],
    ['Automation and AI', 'automat|bot|chatbot|\\bai\\b|script|scrap|whatsapp bot'],
  ],
  Designer: [
    ['Logo and brand', 'logo|brand|identité|identite|charte'],
    ['Flyers and posters', 'flyer|poster|affiche|banner|banderole|invitation card'],
    ['Social media designs', 'social|instagram|facebook|post design|tiktok|visuel'],
    ['App and website design', '\\bui\\b|\\bux\\b|app design|website design|figma|maquette|mockup'],
    ['Printing and packaging', 'print|packag|label|étiquette|etiquette|t-?shirt|business card|carte de visite'],
    ['Photo and video editing', 'edit|retouch|photoshop|video|montage|photo'],
  ],
  Teacher: [
    ['Home lessons', 'home lesson|private|répétiteur|repetiteur|repetition|tutor|at home|à domicile'],
    ['Exam preparation', 'exam|gce|bac\\b|bepc|probatoire|concours|revision|past question'],
    ['Maths and sciences', 'math|physic|chem|biolog|science'],
    ['Languages', 'english|french|français|francais|anglais|german|spanish|chinese|language|langue'],
    ['Primary school help', 'primary|primaire|class [1-6]|homework|devoir|reading|nursery'],
    ['Online lessons', 'online|zoom|meet|video call|en ligne'],
    ['Computer lessons', 'computer|excel|word|typing|informatique|coding lesson'],
  ],
  Driver: [
    ['Driver for a day', 'for (a|the) day|day driver|journée|journee|wedding car|event'],
    ['Airport and city trips', 'airport|aéroport|aeroport|douala|yaound|trip|travel|voyage|inter-?city'],
    ['Daily or monthly driver', 'monthly|daily|full ?time|chauffeur|family driver|school run|company'],
    ['Truck and goods transport', 'truck|camion|goods|marchandise|pick-?up|load|sand|cement'],
    ['Moving house', 'moving house|move house|déménag|demenag|relocat'],
    ['Driving lessons', 'learn to drive|driving lesson|permis|auto-?école|auto-?ecole'],
  ],
  Accountant: [
    ['Bookkeeping', 'book ?keep|comptab|records|accounts|ledger|monthly report'],
    ['Tax filing', 'tax|impôt|impot|dgi|déclar|declar|niu|patente'],
    ['Business registration', 'regist|rccm|create (a |my )?(business|company)|créer|creer|ohada'],
    ['Payroll and CNPS', 'payroll|salary|salaire|cnps|paie'],
    ['Audit and financial statements', 'audit|financial statement|bilan|états financiers'],
    ['Business plan and budget', 'business plan|budget|forecast|projection|loan file'],
  ],
  Sales: [
    ['Social media management', 'social media|facebook|instagram|tiktok|community|page'],
    ['Online adverts', 'advert|ads|sponsor|boost|pub\\b|publicité|publicite|campaign'],
    ['Field promotion', 'promot|flyering|street|activation|door to door|terrain'],
    ['Sales agent', 'sell|sales agent|commission|vendeur|vendre|resell'],
    ['Customer service', 'customer|client service|call cent|whatsapp repl|support'],
  ],
  Admin: [
    ['Typing and documents', 'typ|saisie|document|letter|cv\\b|word'],
    ['Data entry', 'data entry|excel|spreadsheet|saisie de données|tableur'],
    ['Virtual assistant', 'virtual|assistant|schedule|email|agenda|book appointment'],
    ['Translation', 'translat|traduc|interpret'],
    ['Printing and photocopy', 'print|photocop|scan|binding|reliure|imprim'],
    ['Official papers and files', 'passport|visa|birth certificate|acte|dossier|legaliz|légalis|id card'],
  ],
  Cook: [
    ['Cakes and pastries', 'cake|gâteau|gateau|pastr|cupcake|bread|pâtiss|patiss'],
    ['Party and event catering', 'party|event|wedding|cater|traiteur|birthday|funeral|baptême|bapteme|guest'],
    ['Home cook', 'home cook|daily meal|cook for (my )?family|monthly|cuisinière|cuisiniere'],
    ['Traditional dishes', 'ndol|eru|achu|koki|ekwang|fufu|kwacoco|traditional|jollof'],
    ['Snacks and small chops', 'snack|small chop|puff|meat pie|finger food|samosa'],
    ['Cooking lessons', 'learn to cook|cooking class|cours de cuisine|teach me'],
  ],
  Nurse: [
    ['Home nursing visit', 'injection|piqûre|piqure|dressing|pansement|drip|perfusion|blood pressure|tension|wound'],
    ['Elderly care', 'elder|old (man|woman|person)|grand ?(mother|father|ma|pa)|âgé|age\\b|vieux'],
    ['Night care', 'night|nuit|overnight'],
    ['Mother and baby care', 'baby|newborn|bébé|bebe|mother|maman|post-?natal|after birth'],
    ['Care after surgery or illness', 'surgery|operation|opéra|recover|convalesc|sick|malade|stroke|avc'],
    ['Physiotherapy and massage', 'physio|kiné|kine|massage|rehab'],
  ],
  Builder: [
    ['Building and blockwork', 'build|block|brick|maçon|macon|wall|foundation|fondation|house plan'],
    ['Tiling', 'tile|carrel|carreaux'],
    ['Painting', 'paint|peint'],
    ['Roofing', 'roof|toit|zinc|leak in (the )?roof|ceiling|plafond'],
    ['Plastering and finishing', 'plaster|crépi|crepi|enduit|finish|screed|chape'],
    ['Carpentry and doors', 'carpent|menuis|door|porte|window|fenêtre|fenetre|wood|cupboard|furniture'],
    ['Welding and gates', 'weld|soud|gate|portail|burglar|iron|metal'],
    ['Repairs and small works', 'repair|crack|fissure|fix (the |my )?(wall|floor)|small work'],
  ],
  Hairdresser: [
    ['Braids and twists', 'braid|tresse|twist|cornrow|knotless|box braid|plait'],
    ['Wigs and weaves', 'wig|perruque|weave|frontal|closure|tissage|install'],
    ['Haircut and barbing', 'cut|barb|coupe|shave|trim|fade|coiffeur homme'],
    ['Natural hair and locs', 'natural|loc|dread|retwist|afro'],
    ['Relaxing and colouring', 'relax|défris|defris|colou?r|dye|teint|treatment'],
    ['Makeup and gele', 'makeup|make-?up|maquill|gele|bridal'],
    ['Nails and lashes', 'nail|ongle|manicure|pedicure|lash|cils'],
  ],
  Tailor: [
    ['Dresses and women’s wear', 'dress|robe|gown|kaba|skirt|jupe|blouse|women|ladies'],
    ['Men’s wear', 'suit|costume|trouser|pantalon|shirt|chemise|men|agbada|senator'],
    ['Traditional and occasion wear', 'toghu|traditional|wedding|asoebi|ashuabi|uniform for (the )?(wedding|funeral)|pagne|boubou'],
    ['School and work uniforms', 'uniform|school|tenue|overall|apron'],
    ['Alterations and repairs', 'alter|adjust|repair|mend|zip|hem|ourlet|retouch|tight|loose|torn'],
    ['Curtains and home sewing', 'curtain|rideau|bedsheet|drap|cushion|coussin|chair cover'],
  ],
  Security: [
    ['Night guard', 'night|nuit|gardien de nuit|watch ?man'],
    ['Day guard', 'day guard|gate ?man|jour|gardien'],
    ['Event security', 'event|party|bouncer|concert|wedding'],
    ['CCTV and alarms', 'cctv|camera|caméra|alarm|alarme|surveillance'],
    ['Escort and bodyguard', 'escort|bodyguard|garde du corps|protect'],
  ],
  Writer: [
    ['CV and cover letter', '\\bcv\\b|resume|cover letter|lettre de motivation|linkedin'],
    ['Articles and web content', 'article|blog|content|website text|rédaction|redaction|copywrit|seo'],
    ['School and research work', 'thesis|mémoire|memoire|research|project report|proposal|dissertation|rapport de stage'],
    ['Editing and proofreading', 'edit|proofread|correct|relire|relecture'],
    ['Speeches and letters', 'speech|discours|letter|lettre|toast|tribute|biography|hommage'],
    ['Translation', 'translat|traduc'],
  ],
  Events: [
    ['Event planning', 'plan|organi[sz]|coordinat|wedding planner'],
    ['Decoration', 'decor|déco|deco|balloon|flower|chair cover'],
    ['Sound and DJ', '\\bdj\\b|sound|sono|music|speaker|animation'],
    ['MC and hosting', '\\bmc\\b|host|animateur|maître de cérémonie|master of ceremon'],
    ['Photography and video', 'photo|video|camera ?man|drone|shoot'],
    ['Canopies, chairs and hire', 'canop|tent|bâche|bache|chair|table|rent|hire|location'],
  ],
  Nanny: [
    ['Babysitting', 'babysit|baby ?sit|look after|watch (my )?(child|kids|baby)|few hours|evening|garder'],
    ['Full-time nanny', 'full ?time|live-?in|monthly|every day|nounou'],
    ['Newborn care', 'newborn|new born|nouveau-?né|infant|0-?[36] month'],
    ['School pick-up and homework', 'school|pick ?up|homework|devoir|école|ecole'],
    ['Housekeeping with childcare', 'house ?keep|house ?help|ménagère|menagere|clean and|cook and'],
  ],
  Farmer: [
    ['Farm labour', 'labou?r|clear|weed|plant|harvest|récolte|recolte|défrich|defrich|cutlass'],
    ['Fresh produce supply', 'supply|buy|plantain|cocoyam|vegetable|légume|legume|tomato|maize|cassava|produce'],
    ['Poultry and livestock', 'poultry|chicken|poulet|fowl|pig|porc|goat|rabbit|livestock|élevage|elevage|egg'],
    ['Garden and lawn care', 'garden|jardin|lawn|gazon|flower|hedge|tree|arbre|compound'],
    ['Farm advice and set-up', 'advice|conseil|start a farm|set ?up|agronom|soil|irrigation|greenhouse'],
  ],
  Engineer: [
    ['Building plans and design', 'plan|design|drawing|architect|dessin|autocad'],
    ['Site supervision', 'supervis|site|chantier|control|suivi'],
    ['Costing and bills of quantity', 'cost|estimate|devis|quantity|\\bboq\\b|métré|metre'],
    ['Land survey', 'survey|topograph|bornage|land|terrain|géomètre|geometre'],
    ['Structural checks', 'structur|crack|beam|poutre|slab|dalle|stability|expert'],
    ['Machines and equipment repair', 'machine|equipment|motor|industrial|maintenance|mill'],
  ],
  Coach: [
    ['Fitness training', 'fitness|gym|workout|lose weight|maigrir|muscle|personal train|sport'],
    ['Football and sports coaching', 'football|soccer|basket|tennis|swim|natation|boxing|karate'],
    ['Life and career coaching', 'life|career|carrière|carriere|interview|confidence|orientation|mentor'],
    ['Business coaching', 'business|entrepreneur|startup|start-?up|sales coach'],
    ['Music and dance lessons', 'music|piano|guitar|sing|chant|dance|danse|drum'],
  ],
};

/** The services of a skill, by name ([] for a skill getit has no list for). */
export const servicesOf = (trade: string): string[] => (SERVICE_LIST[trade] || []).map((s) => s[0]);

/** The service of this skill that someone's words point to (the first one that fits), or null. */
export function serviceFor(trade: string, text: string): string | null {
  const q = ' ' + String(text || '').toLowerCase() + ' ';
  for (const [name, words] of SERVICE_LIST[trade] || []) {
    try {
      if (new RegExp(words, 'i').test(q)) return name;
    } catch {
      /* a broken pattern never stops the others */
    }
  }
  return null;
}
