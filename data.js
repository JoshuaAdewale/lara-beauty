/* Lara Beauty Atelier — seed catalogue (real product line) */
const SEED_CATEGORIES = [
  { id: 'skin',    label: 'Skin Care' },
  { id: 'cleanse', label: 'Cleansers' },
  { id: 'lips',    label: 'Lip Care' },
  { id: 'sets',    label: 'Gift Sets' }
];

const SEED_PRODUCTS = [
  {
    "id": "skin-glow-oil",
    "name": "Skin Glow Oil",
    "tagline": "Enhances skin tone, moisturises and glows",
    "cat": "skin",
    "price": 18500,
    "compare": 22000,
    "rating": 4.9,
    "badge": "Bestseller",
    "stock": 64,
    "sku": "LBA-SGO-100",
    "tone": [
      "All skin tones",
      "Dry & dull skin",
      "All ages"
    ],
    "images": [
      "assets/skin-oil.jpg",
      "assets/bag.jpg",
      "assets/black-soap.jpg"
    ],
    "variants": [
      {
        "label": "50ml",
        "price": 10000,
        "stock": 22,
        "eur": 8
      },
      {
        "label": "100ml",
        "price": 15000,
        "stock": 30,
        "eur": 10
      },
      {
        "label": "120ml",
        "price": 18500,
        "stock": 12,
        "eur": 15
      }
    ],
    "desc": "Our signature featherlight body and face oil. A blend of cold-pressed carrier oils that evens skin tone, locks in moisture and leaves a lit-from-within glow — never greasy, never sticky.",
    "details": [
      "Available in 50ml · 100ml · 120ml",
      "Pump dispenser, travel safe",
      "Enhances and evens skin tone",
      "Non-comedogenic · fragrance light"
    ],
    "how": "Pump 3–4 drops into palms and press into clean, slightly damp skin morning and night. For body, apply immediately after showering.",
    "reviews": [
      {
        "n": "Amaka O.",
        "r": 5,
        "t": "My skin drinks this up",
        "b": "Two weeks in and the dry patches around my nose are completely gone. Absorbs fast, no shine.",
        "d": "Jun 2026",
        "v": true,
        "ok": true
      },
      {
        "n": "Ifeoma B.",
        "r": 5,
        "t": "Worth every naira",
        "b": "I am 52 and this is the first oil that didn’t sit on top of my skin. My daughter stole the 120ml.",
        "d": "May 2026",
        "v": true,
        "ok": true
      },
      {
        "n": "Zainab K.",
        "r": 4,
        "t": "Lovely, wish it were bigger",
        "b": "A little goes far, but I would happily buy a 250ml size.",
        "d": "May 2026",
        "v": true,
        "ok": true
      }
    ],
    "eur": 15,
    "compareEur": 18,
    "ingredients": [
      "Cold-pressed marula oil",
      "Baobab seed oil",
      "Rosehip oil",
      "Sweet almond oil",
      "Vitamin E (tocopherol)"
    ],
    "benefits": [
      "Evens and brightens skin tone",
      "Locks in moisture for up to 24 hours",
      "Absorbs fast with no greasy film",
      "Softens dry patches and rough texture"
    ]
  },
  {
    "id": "black-soap",
    "name": "Natural Fairness Black Soap",
    "tagline": "Skin balancing and detoxifying · 250ml",
    "cat": "cleanse",
    "price": 15000,
    "compare": null,
    "rating": 4.8,
    "badge": "Heritage",
    "stock": 48,
    "sku": "LBA-NBS-250",
    "tone": [
      "Oily skin",
      "Acne-prone",
      "Uneven tone"
    ],
    "images": [
      "assets/black-soap.jpg",
      "assets/bag.jpg"
    ],
    "variants": [
      {
        "label": "250ml jar",
        "price": 15000,
        "stock": 48,
        "eur": 20
      }
    ],
    "desc": "Traditionally made whipped black soap with plantain ash, lime and natural botanicals. Deeply clarifying and detoxifying while balancing the skin — lifts oil, sweat and buildup without stripping your barrier.",
    "details": [
      "250ml jar with spatula",
      "Plantain ash · lime · shea",
      "Skin balancing & detoxifying",
      "Face, body and scalp"
    ],
    "how": "Scoop a small amount, lather between wet hands and massage over face or body for 30 seconds. Rinse with lukewarm water. Start twice weekly.",
    "reviews": [
      {
        "n": "Tolu A.",
        "r": 5,
        "t": "Cleared my back acne",
        "b": "One month of using this in the shower and my back is smooth. Twice a week is my sweet spot.",
        "d": "Jun 2026",
        "v": true,
        "ok": true
      },
      {
        "n": "Grace E.",
        "r": 5,
        "t": "The real thing",
        "b": "Smells exactly like the soap my grandmother made. Cuts through sunscreen beautifully.",
        "d": "Apr 2026",
        "v": true,
        "ok": true
      }
    ],
    "eur": 20,
    "ingredients": [
      "Plantain skin ash",
      "Cocoa pod ash",
      "Raw shea butter",
      "Virgin coconut oil",
      "Lime extract"
    ],
    "benefits": [
      "Lifts excess oil and daily buildup",
      "Calms and clears breakouts",
      "Balances without stripping the skin barrier",
      "Works on face, body and scalp"
    ]
  },
  {
    "id": "pink-lips-balm",
    "name": "Pink Lips Balm",
    "tagline": "Revives naturally rosy, soft lips",
    "cat": "lips",
    "price": 8000,
    "compare": 9500,
    "rating": 4.9,
    "badge": "Cult favourite",
    "stock": 90,
    "sku": "LBA-PLB-15",
    "tone": [
      "Pigmented lips",
      "Dry lips",
      "All ages"
    ],
    "images": [
      "assets/pink-lips.jpg",
      "assets/lip-balm-red.jpg"
    ],
    "variants": [
      {
        "label": "15g jar",
        "price": 8000,
        "stock": 90,
        "eur": 5
      }
    ],
    "desc": "A whipped butter balm with a soft rose tint and vitamin E. Gently lifts darkness caused by sun, smoking and dehydration while depositing the sheerest wash of pink. Best paired with our Pink Lips Scrub.",
    "details": [
      "15g jar",
      "Buildable rose tint",
      "Vitamin E · shea · kokum butter",
      "Safe for daily wear"
    ],
    "how": "Apply a thin layer over clean lips morning and night. Exfoliate weekly with the Pink Lips Scrub for faster results.",
    "reviews": [
      {
        "n": "Chidinma U.",
        "r": 5,
        "t": "My lips look like me again",
        "b": "Years of dark lips from the sun. Six weeks with this and there’s visible pink coming back.",
        "d": "Jul 2026",
        "v": true,
        "ok": true
      },
      {
        "n": "Halima S.",
        "r": 5,
        "t": "Perfect everyday tint",
        "b": "I wear it alone to work. Soft, not sticky, and the jar lasts months.",
        "d": "Jun 2026",
        "v": true,
        "ok": true
      },
      {
        "n": "Bisi F.",
        "r": 4,
        "t": "Great but subtle",
        "b": "If you want dramatic colour this isn’t it — it’s a slow, natural change. I like that.",
        "d": "May 2026",
        "v": false,
        "ok": true
      }
    ],
    "eur": 5,
    "compareEur": 6,
    "ingredients": [
      "Raw shea butter",
      "Kokum butter",
      "Beetroot extract",
      "Vitamin E",
      "Candelilla wax"
    ],
    "benefits": [
      "Gradually restores natural pink tone",
      "Deeply softens dry, cracked lips",
      "Sheer buildable tint for daily wear",
      "Protects against sun and wind"
    ]
  },
  {
    "id": "pink-lips-scrub",
    "name": "Pink Lips Scrub",
    "tagline": "Sugar polish that buffs away dullness",
    "cat": "lips",
    "price": 5000,
    "compare": null,
    "rating": 4.8,
    "badge": null,
    "stock": 72,
    "sku": "LBA-PLS-15",
    "tone": [
      "Flaky lips",
      "Dark lips",
      "All ages"
    ],
    "images": [
      "assets/pink-lips.jpg",
      "assets/lip-balm-red.jpg"
    ],
    "variants": [
      {
        "label": "15g jar",
        "price": 5000,
        "stock": 72,
        "eur": 3
      }
    ],
    "desc": "Fine sugar crystals suspended in nourishing oils. Sweeps away dead, flaky skin so your balm can actually work — and leaves lips instantly softer and pinker.",
    "details": [
      "15g jar",
      "Edible, food-grade sugar",
      "Use 1–2 times weekly",
      "Pairs with Pink Lips Balm"
    ],
    "how": "Massage a pea-sized amount over damp lips in small circles for 30 seconds. Wipe away and follow with Pink Lips Balm.",
    "reviews": [
      {
        "n": "Ngozi C.",
        "r": 5,
        "t": "Instant difference",
        "b": "My lips were peeling from harmattan. One scrub and they were smooth again.",
        "d": "Jul 2026",
        "v": true,
        "ok": true
      },
      {
        "n": "Rita M.",
        "r": 4,
        "t": "Tastes sweet",
        "b": "Works well and doesn’t sting. Wish the jar were slightly bigger.",
        "d": "Jun 2026",
        "v": true,
        "ok": true
      }
    ],
    "eur": 3,
    "ingredients": [
      "Fine cane sugar",
      "Sweet almond oil",
      "Raw honey",
      "Beetroot extract",
      "Vitamin E"
    ],
    "benefits": [
      "Buffs away dead, flaky skin",
      "Instantly smoother, softer lips",
      "Helps balm absorb properly",
      "Gentle enough for weekly use"
    ]
  },
  {
    "id": "lip-balm-tube",
    "name": "Lip Balm — Rose Tint",
    "tagline": "High-shine conditioning balm · 7ml",
    "cat": "lips",
    "price": 5000,
    "compare": null,
    "rating": 4.8,
    "badge": null,
    "stock": 85,
    "sku": "LBA-LBT-07",
    "tone": [
      "All lip tones",
      "Dry lips",
      "All ages"
    ],
    "images": [
      "assets/lip-balm-red.jpg",
      "assets/lip-gloss.jpg"
    ],
    "variants": [
      {
        "label": "7ml wand",
        "price": 5000,
        "stock": 85,
        "eur": 3
      }
    ],
    "desc": "A cushioned, rose-tinted balm in a slim doe-foot tube. Conditions like a treatment, wears like a gloss, and slips into any handbag.",
    "details": [
      "7ml doe-foot applicator",
      "Sheer rose tint",
      "Non-sticky finish",
      "Wear alone or over lipstick"
    ],
    "how": "Sweep across bare or made-up lips. Reapply through the day as needed.",
    "reviews": [
      {
        "n": "Nneka D.",
        "r": 5,
        "t": "Zero stickiness",
        "b": "My hair doesn’t glue to my mouth in Lagos wind. That alone earns five stars.",
        "d": "Jul 2026",
        "v": true,
        "ok": true
      },
      {
        "n": "Aisha M.",
        "r": 4,
        "t": "Beautiful shade",
        "b": "The rose tint flatters my deep skin tone perfectly.",
        "d": "Jun 2026",
        "v": true,
        "ok": true
      }
    ],
    "eur": 3,
    "ingredients": [
      "Shea butter",
      "Jojoba oil",
      "Candelilla wax",
      "Rose extract",
      "Vitamin E"
    ],
    "benefits": [
      "Cushioned, long-lasting hydration",
      "Sheer rose tint suits every skin tone",
      "Non-sticky, weightless finish",
      "Layers over or under lipstick"
    ]
  },
  {
    "id": "lip-balm-stick",
    "name": "Lip Balm Sticks",
    "tagline": "Protect + Smooth · Rejuvenate + Nourish",
    "cat": "lips",
    "price": 5000,
    "compare": null,
    "rating": 4.7,
    "badge": "Two shades",
    "stock": 110,
    "sku": "LBA-LBS-45",
    "tone": [
      "Very dry lips",
      "Sensitive",
      "All ages"
    ],
    "images": [
      "assets/lip-balm-sticks.jpg",
      "assets/lip-balm-red.jpg"
    ],
    "variants": [
      {
        "label": "Protect + Smooth",
        "price": 5000,
        "stock": 55,
        "eur": 3
      },
      {
        "label": "Rejuvenate + Nourish",
        "price": 5000,
        "stock": 55,
        "eur": 3
      }
    ],
    "desc": "Classic twist-up balm sticks in two formulas. Protect + Smooth shields against sun and dry wind; Rejuvenate + Nourish repairs cracked, tired lips overnight.",
    "details": [
      "4.5g twist-up stick",
      "Two formulas available",
      "Pocket and handbag friendly",
      "Pregnancy safe"
    ],
    "how": "Glide over lips as often as needed. Keep one in your bag and one by the bed.",
    "reviews": [
      {
        "n": "Funke R.",
        "r": 5,
        "t": "Survived harmattan",
        "b": "The only balm that held up in December. My children use it too.",
        "d": "Feb 2026",
        "v": true,
        "ok": true
      },
      {
        "n": "Ruth P.",
        "r": 4,
        "t": "Simple and it works",
        "b": "No gimmicks, lips healed in three days. I prefer the purple one.",
        "d": "Jan 2026",
        "v": true,
        "ok": true
      }
    ],
    "eur": 3,
    "ingredients": [
      "Shea butter",
      "Cocoa butter",
      "Candelilla wax",
      "Squalane",
      "Vitamin E"
    ],
    "benefits": [
      "Repairs cracked, chapped lips overnight",
      "Shields against sun and harmattan wind",
      "Fragrance-free and pregnancy safe",
      "Pocket-sized for anywhere"
    ]
  },
  {
    "id": "lip-gloss",
    "name": "Lip Gloss — Crystal Strawberry",
    "tagline": "Glass-clear high shine · 7ml",
    "cat": "lips",
    "price": 8000,
    "compare": 9500,
    "rating": 4.7,
    "badge": "New",
    "stock": 68,
    "sku": "LBA-LGL-07",
    "tone": [
      "All lip tones",
      "All ages"
    ],
    "images": [
      "assets/lip-gloss.jpg",
      "assets/lip-balm-red.jpg"
    ],
    "variants": [
      {
        "label": "7ml wand",
        "price": 8000,
        "stock": 68,
        "eur": 5
      }
    ],
    "desc": "Crystal-clear, weightless shine with a soft strawberry scent. Layer it over any lipstick or wear it bare for that wet-glass finish.",
    "details": [
      "7ml doe-foot applicator",
      "Clear, universally flattering",
      "Light strawberry scent",
      "Non-sticky formula"
    ],
    "how": "Sweep across lips. Layer for a wetter, glassier finish.",
    "reviews": [
      {
        "n": "Temi A.",
        "r": 5,
        "t": "Glass lips",
        "b": "Genuinely doesn’t feel tacky. The strawberry scent is subtle and lovely.",
        "d": "Jul 2026",
        "v": true,
        "ok": true
      },
      {
        "n": "Joy N.",
        "r": 4,
        "t": "Pretty shine",
        "b": "Beautiful over my red lipstick. Needs a top-up after eating.",
        "d": "Jun 2026",
        "v": true,
        "ok": true
      }
    ],
    "eur": 5,
    "compareEur": 6,
    "ingredients": [
      "Jojoba oil",
      "Vitamin E",
      "Pearl mica",
      "Natural strawberry extract"
    ],
    "benefits": [
      "Glass-like, high-shine finish",
      "Conditions while you wear it",
      "Genuinely non-sticky formula",
      "Flattering over any lipstick"
    ]
  },
  {
    "id": "glow-ritual-set",
    "name": "The Glow Ritual Set",
    "tagline": "Glow Oil + Black Soap, boxed in gold",
    "cat": "sets",
    "price": 30000,
    "compare": 33500,
    "rating": 5,
    "badge": "Gift set",
    "stock": 25,
    "sku": "LBA-SET-GLW",
    "tone": [
      "Gifting",
      "All ages"
    ],
    "images": [
      "assets/bag.jpg",
      "assets/skin-oil.jpg",
      "assets/black-soap.jpg"
    ],
    "variants": [
      {
        "label": "Gift box",
        "price": 30000,
        "stock": 25,
        "eur": 28
      }
    ],
    "desc": "Cleanse then glow. Our Natural Fairness Black Soap and 100ml Skin Glow Oil presented in the signature black and gold Lara Beauty Atelier gift bag with a handwritten card.",
    "details": [
      "Skin Glow Oil 100ml",
      "Natural Fairness Black Soap 250ml",
      "Black & gold gift bag + card",
      "Free gift wrapping"
    ],
    "how": "Cleanse with the black soap, then press 3 drops of Skin Glow Oil into damp skin. Morning and night.",
    "reviews": [
      {
        "n": "Yemi A.",
        "r": 5,
        "t": "Gifted to my mum",
        "b": "The packaging made her cry. She has been using it religiously since.",
        "d": "Jul 2026",
        "v": true,
        "ok": true
      },
      {
        "n": "Chika E.",
        "r": 5,
        "t": "Best value",
        "b": "Cheaper than buying both separately and the bag is gorgeous.",
        "d": "Jun 2026",
        "v": true,
        "ok": true
      }
    ],
    "eur": 28,
    "compareEur": 35,
    "ingredients": [
      "See Skin Glow Oil and Natural Fairness Black Soap"
    ],
    "benefits": [
      "Complete cleanse-and-glow routine",
      "Saves against buying separately",
      "Arrives gift-wrapped in black and gold",
      "Our most-gifted set"
    ]
  },
  {
    "id": "pout-set",
    "name": "Perfect Pout Set",
    "tagline": "Scrub + Balm + Gloss, the full lip ritual",
    "cat": "sets",
    "price": 15000,
    "compare": 18000,
    "rating": 4.9,
    "badge": "Gift set",
    "stock": 30,
    "sku": "LBA-SET-PPT",
    "tone": [
      "Gifting",
      "All ages"
    ],
    "images": [
      "assets/pink-lips.jpg",
      "assets/lip-gloss.jpg",
      "assets/bag.jpg"
    ],
    "variants": [
      {
        "label": "Gift box",
        "price": 15000,
        "stock": 30,
        "eur": 9
      }
    ],
    "desc": "Buff, treat, shine. Pink Lips Scrub, Pink Lips Balm and our Crystal Strawberry Lip Gloss together in a black and gold pouch — our most-gifted lip trio.",
    "details": [
      "Pink Lips Scrub 15g",
      "Pink Lips Balm 15g",
      "Lip Gloss 7ml",
      "Black & gold travel pouch"
    ],
    "how": "Scrub twice weekly, balm nightly, gloss by day.",
    "reviews": [
      {
        "n": "Maryam I.",
        "r": 5,
        "t": "My handbag trio",
        "b": "I bought three sets — one for me, two for my sisters.",
        "d": "Jul 2026",
        "v": true,
        "ok": true
      }
    ],
    "eur": 9,
    "compareEur": 11,
    "ingredients": [
      "See Pink Lips Scrub, Pink Lips Balm and Lip Gloss"
    ],
    "benefits": [
      "The full three-step lip ritual",
      "Scrub, treat and shine",
      "Slim pouch fits any handbag",
      "Saves against buying separately"
    ]
  }
];

/* seed orders so the admin dashboard has history on first run */
const SEED_ORDERS = (() => {
  const names = [
    ['Amara Okafor','amara.o@email.com','14 Bourdillon Road, Ikoyi','Lagos'],
    ['Halima Sule','halima.s@email.com','Lekki Phase 1, Lagos','Lagos'],
    ['Chidinma Uche','chidi.u@email.com','GRA, Port Harcourt','Rivers'],
    ['Funke Bello','funke.b@email.com','Bodija, Ibadan','Oyo'],
    ['Zainab Bala','zainab.b@email.com','Nassarawa, Kano','Kano'],
    ['Grace Eze','grace.e@email.com','8 Moseley Road, Birmingham','West Midlands'],
    ['Tolu Adeyemi','tolu.a@email.com','Ikeja, Lagos','Lagos'],
    ['Ngozi Chukwu','ngozi.c@email.com','22 Peckham Rye, London','Greater London'],
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
  address: 'Online only · Lagos, Nigeria & London, United Kingdom',
  freeShip: 25000,
  shipFee: 2500,
  currency: '₦',
  currencies: {
    NGN: { code: 'NGN', symbol: '₦', label: 'Nigeria (NGN)', freeShip: 25000, shipFee: 2500 },
    EUR: { code: 'EUR', symbol: '€',  label: 'International (EUR)', freeShip: 40, shipFee: 4 }
  },
  defaultCurrency: 'NGN',
  announce: 'Free delivery on orders over ₦25,000 · Nationwide · Pay on delivery available',
  announceByCurrency: {
    NGN: 'Free delivery on orders over ₦25,000 · Nationwide · Pay on delivery available',
    EUR: 'Free worldwide delivery on orders over €40 · Ships from London & Lagos'
  },
  lowStock: 20,

  /* --- Reviews -------------------------------------------------------------
     The reviews shipped in this seed data are DEMO CONTENT. Two rules follow
     from that, and both are enforced in build.js:

       1. `reviewsVerified: false` stops Product/aggregateRating schema being
          emitted. Marking up invented reviews is a Google structured-data
          violation and earns a manual action, which removes every rich result
          for the whole domain — not just the offending page.
       2. `reviewMultiplier: 1` stops the displayed count being inflated.
          Under the UK Digital Markets, Competition and Consumers Act 2024,
          publishing fake consumer reviews is a banned practice, and the
          Nigerian FCCPA takes a similar view of misleading representations.

     WHEN YOU HAVE TEN REAL, VERIFIABLE REVIEWS:
       - delete the demo entries from each product's `reviews` array
       - paste the real ones in (same shape: n, r, t, b, d, v, ok)
       - set reviewsVerified: true
       - run `node build.js`
     Rich-result stars will then appear, legitimately.
  ------------------------------------------------------------------------- */
  reviewsVerified: false,
  reviewMultiplier: 1,
  reviewsAreDemo: true
};

/* ---------- Site content (fully editable from admin → Pages) ---------- */
const SEED_CONTENT = {
  hero: {
    eyebrow: 'Small batch · Lagos & London',
    title: 'Skin that feels like ',
    titleEm: 'yours',
    titleEnd: ' again.',
    lede: 'Cold-pressed Skin Glow Oil, detoxifying black soap and lip care formulated for every shade and every decade. No ten-step promises — just a few things that truly work.',
    ctaPrimary: 'Shop Now', ctaPrimaryLink: '#/shop',
    ctaGhost: 'The Glow Ritual', ctaGhostLink: '#/product/glow-ritual-set',
    image: 'assets/hero-model.jpg',
    cardImage: 'assets/pink-lips.jpg', cardTitle: 'Pink Lips Balm', cardSub: 'Shea, honey & rose · 8g',
    /* Claims must be defensible. Anything you can’t evidence if asked is a
       misleading commercial practice under the UK DMCC Act 2024 and the
       Nigerian FCCPA. Replace these with real figures once you’ve them. */
    stats: [
      { b: '100%', s: 'Small batch' },
      { b: '30d',  s: 'Returns, even opened' },
      { b: '48h',  s: 'Nationwide dispatch' }
    ]
  },
  marquee: ['100% cold-pressed oils','Made in Lagos','Shipped from the UK','Cruelty free','For every shade','Small batch','30-day returns'],
  collections: {
    eyebrow: 'Featured collections', title: 'Rituals in ', titleEm: 'black & gold',
    sub: 'Start where your skin needs you most. Everything layers together.',
    items: [
      { cat: 'skin',    title: 'Glow & Nourish',  image: 'assets/skin-oil.jpg',   cta: 'Explore skin' },
      { cat: 'lips',    title: 'Lip Care',        image: 'assets/pink-lips.jpg',  cta: 'Explore lips' },
      { cat: 'cleanse', title: 'Cleanse & Detox', image: 'assets/black-soap.jpg', cta: 'Explore cleansers' }
    ]
  },
  best: { eyebrow: 'Small batch favourites', title: 'Bestsellers', cta: 'View all products', limit: 4 },
  story: {
    eyebrow: 'Our story', title: 'From a Lagos kitchen to a London shelf',
    image: 'assets/story-flatlay.jpg',
    body: [
      'Lara made her first batch of glow oil in a Lagos kitchen, for her mother, whose skin had turned dry and dull after years of harsh soaps. Friends asked. Then friends of friends. Then a queue formed outside the gate.',
      'When Lara moved to the UK, the orders followed her \u2014 first to friends in London, then to women across Britain who could not find anything like it on the high street. Rather than choose between the two, we kept both.',
      'Everything is still made in small batches in Lagos, from shea sourced through the same women\u2019s co-operative in Kwara. A share of every batch is flown to our London store room, so UK orders ship domestically instead of waiting weeks at customs. Same formulas, same hands, two front doors.'
    ],
    cta: 'Shop our range', ctaLink: '#/shop'
  },
  values: [
    { icon: 'leaf',  title: 'Naturally derived', text: 'Cold-pressed oils and raw butters, never diluted with cheap fillers.' },
    { icon: 'globe', title: 'For every shade',   text: 'Tested on skin from fair to deep, from twenty to seventy.' },
    { icon: 'truck', title: 'Fast delivery',     text: 'Free above ₦25,000 in Nigeria or €40 worldwide. Pay on delivery in Lagos and Abuja.' },
    { icon: 'check', title: '30-day promise',    text: 'If your skin doesn\u2019t agree, send it back — even opened.' }
  ],
  about: {
    eyebrow: 'About us',
    title: 'Natural skincare, made by hand',
    lede: 'Lara Beauty Atelier makes small-batch skincare from cold-pressed oils, raw butters and traditional West African botanicals — and ships it to women all over the world.',
    pillars: [
      { icon: 'leaf',   title: 'Naturally derived',
        text: 'Cold-pressed oils, raw shea and plantain-ash black soap. No cheap filler oils, no synthetic dyes, never tested on animals.' },
      { icon: 'globe',  title: 'Two homes, one bench',
        text: 'Dispatched from Lagos for Nigeria and from London for the UK and Europe — priced in Naira at home and Euros everywhere else.' },
      { icon: 'shield', title: 'Say it plainly',
        text: 'Full ingredient lists on every product, 30-day returns even if opened, and reviews published exactly as written — or not published at all.' },
      { icon: 'heart',  title: 'For every shade',
        text: 'Every formula is tested on skin from fair to deep and on women from their twenties to their seventies.' }
    ],
    stats: [
      { b: '2',    s: 'Cities we ship from' },
      { b: '9',    s: 'Products, no filler' },
      { b: '30d',  s: 'Returns window' },
      { b: '100%', s: 'Small batch' }
    ],
    cta: 'Shop now', ctaLink: '#/shop'
  },

  news: {
    eyebrow: 'Join the list', title: '10% off your first ritual',
    sub: 'Skincare notes, restock alerts and the occasional honest word about what doesn\u2019t work.',
    placeholder: 'you@email.com', cta: 'Subscribe',
    success: 'You\u2019re on the list — check your inbox for 10% off'
  },
  footer: {
    blurb: 'Small-batch skin glow oil, black soap and lip care. Made in Lagos, shipped from Lagos and London since 2020.',
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
    desc: 'Lara Beauty Atelier crafts small-batch Skin Glow Oil, Natural Fairness Black Soap, Pink Lips Balm and lip gloss. Made in Lagos, shipped from Lagos and London. Prices in ₦ and €.'
  }
};
