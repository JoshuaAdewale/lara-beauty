/* Lara Beauty Atelier — seed catalogue (real product line) */
const SEED_CATEGORIES = [
  { id: 'skin',    label: 'Skin Care' },
  { id: 'cleanse', label: 'Cleansers' },
  { id: 'lips',    label: 'Lip Care' },
  { id: 'sets',    label: 'Gift Sets' }
];

const SEED_PRODUCTS = [
  {
    id: 'skin-glow-oil',
    name: 'Skin Glow Oil',
    tagline: 'Enhances skin tone, moisturises and glows',
    cat: 'skin', price: 15000, compare: 18500, rating: 4.9, badge: 'Bestseller',
    priceGBP: 10, compareGBP: 12, currency: '₦ / £',
    stock: 64, sku: 'LBA-SGO-100',
    tone: ['All skin tones', 'Dry & dull skin', 'All ages'],
    images: ['assets/skin-oil.jpg', 'assets/bag.jpg', 'assets/black-soap.jpg'],
    variants: [
      { label: '100ml', price: 15000, priceGBP: 10, stock: 30 },
      { label: '120ml', price: 18500, priceGBP: 12, stock: 12 }
    ],
    desc: 'Made with Carrot Oil, Almond Oil, Avocado Oil, Sunflower Oil, Tea Tree Extract, Vitamin E & natural glow-boosting extracts. Our signature featherlight body and face oil that locks in moisture, supports a smooth complexion, and delivers lightweight nourishment with zero harsh additives. Never greasy, never sticky.',
    details: ['Made with natural oils & vitamin E', 'Carrot Oil · Almond Oil · Avocado Oil · Sunflower Oil', 'Locks in moisture & prevents dryness', 'Supports smooth, even complexion', 'Lightweight & non-comedogenic', 'No harsh additives · fragrance light'],
    how: 'Pump 3–4 drops into palms and press into clean, slightly damp skin morning and night. For body, apply immediately after showering.',
    reviews: [
      { n: 'Amaka O.', r: 5, t: 'My skin drinks this up', b: 'Two weeks in and the dry patches around my nose are completely gone. Absorbs fast, no shine.', d: 'Jun 2026', v: true, ok: true },
      { n: 'Ifeoma B.', r: 5, t: 'Worth every naira', b: 'I am 52 and this is the first oil that did not sit on top of my skin. My daughter stole the 120ml.', d: 'May 2026', v: true, ok: true },
      { n: 'Zainab K.', r: 4, t: 'Lovely, wish it were bigger', b: 'A little goes far, but I would happily buy a 250ml size.', d: 'May 2026', v: true, ok: true }
    ]
  },
  {
    id: 'black-soap',
    name: 'Natural Fairness Black Soap',
    tagline: 'Skin balancing and detoxifying · 250ml',
    cat: 'cleanse', price: 15000, compare: null, rating: 4.8, badge: 'Heritage',
    priceGBP: 20, currency: '₦ / £',
    stock: 48, sku: 'LBA-NBS-250',
    tone: ['Oily skin', 'Acne-prone', 'Uneven tone'],
    images: ['assets/black-soap.jpg', 'assets/bag.jpg'],
    variants: [{ label: '250ml jar', price: 15000, priceGBP: 20, stock: 48 }],
    desc: 'Made with Cocoa Pod Ash, Shea Butter, Coconut Oil, Palm Kernel Oil, Honey, Aloe Vera & Essential Herbs. Traditionally made whipped black soap that deeply cleanses and exfoliates while balancing the skin. Lifts oil, sweat and buildup without stripping your barrier. Perfect for achieving a clearer complexion and maintaining balanced, fresh skin.',
    details: ['Made with natural botanicals & shea', 'Cocoa Pod Ash · Shea Butter · Coconut Oil · Palm Kernel Oil', 'Deep cleansing & exfoliation', 'Soothes irritated skin', 'Promotes clearer complexion', 'Balanced freshness · Face, body and scalp'],
    how: 'Scoop a small amount, lather between wet hands and massage over face or body for 30 seconds. Rinse with lukewarm water. Start twice weekly.',
    reviews: [
      { n: 'Tolu A.', r: 5, t: 'Cleared my back acne', b: 'One month of using this in the shower and my back is smooth. Twice a week is my sweet spot.', d: 'Jun 2026', v: true, ok: true },
      { n: 'Grace E.', r: 5, t: 'The real thing', b: 'Smells exactly like the soap my grandmother made. Cuts through sunscreen beautifully.', d: 'Apr 2026', v: true, ok: true }
    ]
  },
  {
    id: 'pink-lips-balm',
    name: 'Pink Lips Balm',
    tagline: 'Revives naturally rosy, soft lips',
    cat: 'lips', price: 8000, compare: 10000, rating: 4.9, badge: 'Cult favourite',
    priceGBP: 5, compareGBP: 6, currency: '₦ / £',
    stock: 90, sku: 'LBA-PLB-15',
    tone: ['Pigmented lips', 'Dry lips', 'All ages'],
    images: ['assets/pink-lips.jpg', 'assets/lip-balm-red.jpg'],
    variants: [{ label: '15g jar', price: 8000, priceGBP: 5, stock: 90 }],
    desc: 'A whipped butter balm with a soft rose tint and vitamin E. Gently lifts darkness caused by sun, smoking and dehydration while depositing the sheerest wash of pink. Revives natural lip color and delivers lasting softness and hydration.',
    details: ['Made with shea & kokum butter', 'Vitamin E · natural rose tint', 'Deep hydration & softness', 'Lifts darkness & evens tone', 'Natural lip enhancement', 'Safe for daily wear'],
    how: 'Apply a thin layer over clean lips morning and night. Exfoliate weekly with the Pink Lips Scrub for faster results.',
    reviews: [
      { n: 'Chidinma U.', r: 5, t: 'My lips look like me again', b: 'Years of dark lips from the sun. Six weeks with this and there is visible pink coming back.', d: 'Jul 2026', v: true, ok: true },
      { n: 'Halima S.', r: 5, t: 'Perfect everyday tint', b: 'I wear it alone to work. Soft, not sticky, and the jar lasts months.', d: 'Jun 2026', v: true, ok: true },
      { n: 'Bisi F.', r: 4, t: 'Great but subtle', b: 'If you want dramatic colour this is not it — it is a slow, natural change. I like that.', d: 'May 2026', v: false, ok: true }
    ]
  },
  {
    id: 'pink-lips-scrub',
    name: 'Pink Lips Scrub',
    tagline: 'Sugar polish that buffs away dullness',
    cat: 'lips', price: 5000, compare: null, rating: 4.8, badge: null,
    priceGBP: 3, currency: '₦ / £',
    stock: 72, sku: 'LBA-PLS-15',
    tone: ['Flaky lips', 'Dark lips', 'All ages'],
    images: ['assets/pink-lips.jpg', 'assets/lip-balm-red.jpg'],
    variants: [{ label: '15g jar', price: 5000, priceGBP: 3, stock: 72 }],
    desc: 'Fine sugar crystals suspended in nourishing oils. Sweeps away dead, flaky skin so your balm can actually work. Delivers deep hydration while buffing lips to natural softness and a healthy pink tone.',
    details: ['Made with natural oils & sugar', 'Food-grade edible sugar crystals', 'Gentle exfoliation & hydration', 'Use 1–2 times weekly', 'Pairs perfectly with Pink Lips Balm'],
    how: 'Massage a pea-sized amount over damp lips in small circles for 30 seconds. Wipe away and follow with Pink Lips Balm.',
    reviews: [
      { n: 'Ngozi C.', r: 5, t: 'Instant difference', b: 'My lips were peeling from harmattan. One scrub and they were smooth again.', d: 'Jul 2026', v: true, ok: true },
      { n: 'Rita M.', r: 4, t: 'Tastes sweet', b: 'Works well and does not sting. Wish the jar were slightly bigger.', d: 'Jun 2026', v: true, ok: true }
    ]
  },
  {
    id: 'lip-balm-tube',
    name: 'Lip Balm — Rose Tint',
    tagline: 'High-shine conditioning balm · 7ml',
    cat: 'lips', price: 5000, compare: null, rating: 4.8, badge: null,
    priceGBP: 3, currency: '₦ / £',
    stock: 85, sku: 'LBA-LBT-07',
    tone: ['All lip tones', 'Dry lips', 'All ages'],
    images: ['assets/lip-balm-red.jpg', 'assets/lip-gloss.jpg'],
    variants: [{ label: '7ml wand', price: 5000, priceGBP: 3, stock: 85 }],
    desc: 'A cushioned, rose-tinted balm in a slim doe-foot tube. Conditions like a treatment, wears like a gloss with natural enhancement, and slips into any handbag. Delivers lasting hydration while enhancing natural lip softness.',
    details: ['Made with nourishing butters', 'Sheer rose tint · natural enhancement', 'Non-sticky finish', 'Doe-foot applicator', 'Wear alone or over lipstick'],
    how: 'Sweep across bare or made-up lips. Reapply through the day as needed.',
    reviews: [
      { n: 'Nneka D.', r: 5, t: 'Zero stickiness', b: 'My hair does not glue to my mouth in Lagos wind. That alone earns five stars.', d: 'Jul 2026', v: true, ok: true },
      { n: 'Aisha M.', r: 4, t: 'Beautiful shade', b: 'The rose tint flatters my deep skin tone perfectly.', d: 'Jun 2026', v: true, ok: true }
    ]
  },
  {
    id: 'lip-balm-stick',
    name: 'Lip Balm Sticks',
    tagline: 'Protect + Smooth · Rejuvenate + Nourish',
    cat: 'lips', price: 5000, compare: null, rating: 4.7, badge: 'Two shades',
    priceGBP: 3, currency: '₦ / £',
    stock: 110, sku: 'LBA-LBS-45',
    tone: ['Very dry lips', 'Sensitive', 'All ages'],
    images: ['assets/lip-balm-sticks.jpg', 'assets/lip-balm-red.jpg'],
    variants: [
      { label: 'Protect + Smooth', price: 5000, priceGBP: 3, stock: 55 },
      { label: 'Rejuvenate + Nourish', price: 5000, priceGBP: 3, stock: 55 }
    ],
    desc: 'Classic twist-up balm sticks in two formulas for natural lip care. Protect + Smooth shields against sun and dry wind; Rejuvenate + Nourish repairs cracked, tired lips overnight. Both deliver deep hydration and softness.',
    details: ['Made with natural butters & oils', '4.5g twist-up stick', 'Two formulas available', 'Deep hydration & softness', 'Pocket and handbag friendly', 'Pregnancy safe'],
    how: 'Glide over lips as often as needed. Keep one in your bag and one by the bed.',
    reviews: [
      { n: 'Funke R.', r: 5, t: 'Survived harmattan', b: 'The only balm that held up in December. My children use it too.', d: 'Feb 2026', v: true, ok: true },
      { n: 'Ruth P.', r: 4, t: 'Simple and it works', b: 'No gimmicks, lips healed in three days. I prefer the purple one.', d: 'Jan 2026', v: true, ok: true }
    ]
  },
  {
    id: 'lip-gloss',
    name: 'Lip Gloss — Crystal Strawberry',
    tagline: 'Glass-clear high shine · 7ml',
    cat: 'lips', price: 8000, compare: 10000, rating: 4.7, badge: 'New',
    priceGBP: 5, compareGBP: 6, currency: '₦ / £',
    stock: 68, sku: 'LBA-LGL-07',
    tone: ['All lip tones', 'All ages'],
    images: ['assets/lip-gloss.jpg', 'assets/lip-balm-red.jpg'],
    variants: [{ label: '7ml wand', price: 8000, priceGBP: 5, stock: 68 }],
    desc: 'Crystal-clear, weightless shine with a soft strawberry scent. Layer it over any lipstick or wear it bare for that wet-glass finish. Delivers beautiful high-shine enhancement while keeping lips hydrated and soft.',
    details: ['Made with natural oils', '7ml doe-foot applicator', 'Crystal-clear & universally flattering', 'Light strawberry scent', 'Non-sticky formula', 'Natural lip enhancement'],
    how: 'Sweep across lips. Layer for a wetter, glassier finish.',
    reviews: [
      { n: 'Temi A.', r: 5, t: 'Glass lips', b: 'Genuinely does not feel tacky. The strawberry scent is subtle and lovely.', d: 'Jul 2026', v: true, ok: true },
      { n: 'Joy N.', r: 4, t: 'Pretty shine', b: 'Beautiful over my red lipstick. Needs a top-up after eating.', d: 'Jun 2026', v: true, ok: true }
    ]
  },
  {
    id: 'glow-ritual-set',
    name: 'The Glow Ritual Set',
    tagline: 'Glow Oil + Black Soap, boxed in gold',
    cat: 'sets', price: 23000, compare: 25500, rating: 5.0, badge: 'Save ₦2,500',
    priceGBP: 15, compareGBP: 18, currency: '₦ / £',
    stock: 25, sku: 'LBA-SET-GLW',
    tone: ['Gifting', 'All ages'],
    images: ['assets/bag.jpg', 'assets/skin-oil.jpg', 'assets/black-soap.jpg'],
    variants: [{ label: 'Gift box', price: 23000, priceGBP: 15, stock: 25 }],
    desc: 'Cleanse then glow. Our Natural Fairness Black Soap and 100ml Skin Glow Oil presented in the signature black and gold Lara Beauty Atelier gift bag with a handwritten card. Perfect for gifting to someone special.',
    details: ['Skin Glow Oil 100ml', 'Natural Fairness Black Soap 250ml', 'Black & gold gift bag + card', 'Free gift wrapping', 'Complete skin ritual'],
    how: 'Cleanse with the black soap, then press 3 drops of Skin Glow Oil into damp skin. Morning and night.',
    reviews: [
      { n: 'Yemi A.', r: 5, t: 'Gifted to my mum', b: 'The packaging made her cry. She has been using it religiously since.', d: 'Jul 2026', v: true, ok: true },
      { n: 'Chika E.', r: 5, t: 'Best value', b: 'Cheaper than buying both separately and the bag is gorgeous.', d: 'Jun 2026', v: true, ok: true }
    ]
  },
  {
    id: 'pout-set',
    name: 'Perfect Pout Set',
    tagline: 'Scrub + Balm + Gloss, the full lip ritual',
    cat: 'sets', price: 21000, compare: 23000, rating: 4.9, badge: 'Save ₦2,000',
    priceGBP: 14, compareGBP: 16, currency: '₦ / £',
    stock: 30, sku: 'LBA-SET-PPT',
    tone: ['Gifting', 'All ages'],
    images: ['assets/pink-lips.jpg', 'assets/lip-gloss.jpg', 'assets/bag.jpg'],
    variants: [{ label: 'Gift box', price: 21000, priceGBP: 14, stock: 30 }],
    desc: 'Buff, treat, shine. Pink Lips Scrub, Pink Lips Balm and our Crystal Strawberry Lip Gloss together in a black and gold pouch. The complete lip care ritual for hydrated, soft, naturally beautiful lips.',
    details: ['Pink Lips Scrub 15g', 'Pink Lips Balm 15g', 'Lip Gloss 7ml', 'Black & gold travel pouch', 'Complete lip ritual kit'],
    how: 'Scrub twice weekly, balm nightly, gloss by day.',
    reviews: [
      { n: 'Maryam I.', r: 5, t: 'My handbag trio', b: 'I bought three sets — one for me, two for my sisters.', d: 'Jul 2026', v: true, ok: true }
    ]
  }
];

/* seed orders so the admin dashboard has history on first run */
const SEED_ORDERS = (() => {
  const names = [
    ['Amara Okafor','amara.o@email.com','Maitama, Abuja','FCT — Abuja'],
    ['Halima Sule','halima.s@email.com','Lekki Phase 1, Lagos','Lagos'],
    ['Chidinma Uche','chidi.u@email.com','GRA, Port Harcourt','Rivers'],
    ['Funke Bello','funke.b@email.com','Bodija, Ibadan','Oyo'],
    ['Zainab Bala','zainab.b@email.com','Nassarawa, Kano','Kano'],
    ['Grace Eze','grace.e@email.com','Independence Layout, Enugu','Enugu'],
    ['Tolu Adeyemi','tolu.a@email.com','Ikeja, Lagos','Lagos'],
    ['Ngozi Chukwu','ngozi.c@email.com','Wuse II, Abuja','FCT — Abuja'],
    ['Bisi Fashola','bisi.f@email.com','Yaba, Lagos','Lagos'],
    ['Rita Musa','rita.m@email.com','Barnawa, Kaduna','Kaduna'],
    ['Joy Nwosu','joy.n@email.com','Asaba, Delta','Delta'],
    ['Temi Ajayi','temi.a@email.com','Victoria Island, Lagos','Lagos']
  ];
  const status = ['delivered','delivered','delivered','shipped','shipped','processing','processing','pending','delivered','shipped','cancelled','processing'];
  const pays = ['card','transfer','cod'];
  const out = [];
  for (let i = 0; i < 12; i++) {
    const [n, e, addr, st] = names[i];
    const daysAgo = [1,2,3,4,6,8,11,14,18,22,27,33][i];
    const d = new Date(Date.now() - daysAgo * 864e5);
    const picks = [];
    const pool = SEED_PRODUCTS.map(p => p.id);
    const howMany = 1 + (i % 3);
    for (let k = 0; k < howMany; k++) {
      const id = pool[(i * 3 + k * 5) % pool.length];
      if (!picks.find(x => x.id === id)) picks.push({ id, q: 1 + ((i + k) % 2), v: null });
    }
    const sub = picks.reduce((s, l) => s + (SEED_PRODUCTS.find(p => p.id === l.id).price * l.q), 0);
    const ship = sub >= 25000 ? 0 : 2500;
    out.push({
      ref: 'LB-' + (10480 + i * 137),
      date: d.toISOString(),
      name: n, email: e, phone: '080' + (10000000 + i * 811731),
      addr, state: st, note: '',
      items: picks, sub, ship, total: sub + ship,
      pay: pays[i % 3], status: status[i]
    });
  }
  return out.reverse();
})();

const SEED_SETTINGS = {
  brand: 'Lara Beauty Atelier',
  email: 'info.larabeautyatelier@gmail.com',
  phone: '+44 7527 574282',
  ig: '@larabeautyatelier',
  address: 'Wuse II, Abuja, Nigeria',
  freeShip: 25000,
  shipFee: 2500,
  currency: '₦',
  currencies: { ngn: '₦', gbp: '£' },
  announce: 'Free delivery on orders over ₦25,000 · Nationwide · Pay on delivery available',
  lowStock: 20,
  global: true,
  storeType: 'Online store',
  targetAudience: 'Global customers'
};

/* ---------- Site content (fully editable from admin → Pages) ---------- */
const SEED_CONTENT = {
  hero: {
    eyebrow: 'Small batch · Handmade in Abuja',
    title: 'Skin that feels like ',
    titleEm: 'yours',
    titleEnd: ' again.',
    lede: 'Cold-pressed Skin Glow Oil, detoxifying black soap and lip care formulated for every shade and every decade. No ten-step promises — just a few things that truly work.',
    ctaPrimary: 'Shop the collection', ctaPrimaryLink: '#/shop',
    ctaGhost: 'The Glow Ritual', ctaGhostLink: '#/product/glow-ritual-set',
    image: 'assets/hero-model.jpg',
    cardImage: 'assets/pink-lips.jpg', cardTitle: 'Pink Lips Balm', cardSub: '★★★★★ 1,204 reviews',
    stats: [
      { b: '12k+', s: 'Happy customers' },
      { b: '4.8★', s: 'Average rating' },
      { b: '48h',  s: 'Nationwide delivery' }
    ]
  },
  marquee: ['100% cold-pressed oils','Handmade in Abuja','Cruelty free','For every shade','Small batch','30-day returns'],
  collections: {
    eyebrow: 'Featured collections', title: 'Rituals in ', titleEm: 'black & gold',
    sub: 'Start where your skin needs you most. Everything layers together.',
    items: [
      { cat: 'skin',    title: 'Glow & Nourish',  image: 'assets/skin-oil.jpg',   cta: 'Explore skin' },
      { cat: 'lips',    title: 'Lip Care',        image: 'assets/pink-lips.jpg',  cta: 'Explore lips' },
      { cat: 'cleanse', title: 'Cleanse & Detox', image: 'assets/black-soap.jpg', cta: 'Explore cleansers' }
    ]
  },
  best: { eyebrow: 'Loved by thousands', title: 'Bestsellers', cta: 'View all products', limit: 4 },
  story: {
    eyebrow: 'Our story', title: 'Beauty with purpose, crafted with care',
    image: 'assets/story-flatlay.jpg',
    body: [
      'Lara Beauty Atelier was born from a simple act of love. In 2020, Lara created her first batch of Skin Glow Oil for her mother, whose skin had turned dry and dull after years of harsh soaps and environmental stress. Within weeks, her mother\u2019s skin transformed. Friends noticed. Then colleagues. Then a waiting list formed outside the gate in Abuja.',
      'Today, we remain exactly what we started: a small-batch, handmade beauty house dedicated to creating formulas that truly work. Every product is crafted with natural, cold-pressed oils and botanicals sourced directly from women-led cooperatives across Nigeria and West Africa. We believe that beauty should nourish rather than harm, enhance rather than mask, and last a lifetime rather than a season.',
      'Our global reach spans from Lagos to London, from customers in their twenties to women in their seventies. Each person who trusts us with their skin becomes part of our story. That trust is sacred. That\u2019s why we test every formula on multiple skin tones, every age group, and every climate condition. That\u2019s why we offer a 30-day promise with no questions asked. That\u2019s why we wrap every order by hand in our signature black and gold bag.',
      'This is not just skincare. This is a ritual. This is trust. This is Lara Beauty Atelier.'
    ],
    cta: 'Shop our range', ctaLink: '#/shop'
  },
  values: [
    { icon: 'leaf',  title: 'Naturally derived', text: 'Cold-pressed oils and raw butters, never diluted with cheap fillers.' },
    { icon: 'globe', title: 'For every shade',   text: 'Tested on skin from fair to deep, from twenty to seventy.' },
    { icon: 'truck', title: '48-hour delivery',  text: 'Free above ₦25,000. Pay on delivery in major cities.' },
    { icon: 'check', title: '30-day promise',    text: 'If your skin doesn\u2019t agree, send it back — even opened.' }
  ],
  news: {
    eyebrow: 'Join the list', title: '10% off your first ritual',
    sub: 'Skincare notes, restock alerts and the occasional honest word about what doesn\u2019t work.',
    placeholder: 'you@email.com', cta: 'Subscribe',
    success: 'You\u2019re on the list — check your inbox for 10% off'
  },
  footer: {
    blurb: 'Small-batch natural skincare and lip care, handmade in Abuja and trusted by customers worldwide. For every shade, every age, and every climate.',
    shopTitle: 'Shop', helpTitle: 'Help', contactTitle: 'Contact',
    help: ['Track my order','Delivery & returns','Ingredient glossary','Contact us'],
    hours: 'Mon–Sat, 9am–6pm',
    copyright: '© 2026 Lara Beauty Atelier. All rights reserved.',
    legal: 'Privacy · Terms · Delivery',
    adminLink: true,
    adminLabel: 'Staff login'
  },
  seo: {
    title: 'Lara Beauty Atelier — Skin Glow Oil, Black Soap & Lip Care',
    desc: 'Lara Beauty Atelier crafts small-batch natural skincare and lip care in Abuja. Trusted by customers worldwide. Skin Glow Oil, Black Soap, Lip Balms & more. Prices in NGN and GBP. For every shade, every age, every climate.'
  }
};
