/* =============================================================================
   BLOG CONTENT — Lara Beauty Atelier
   -----------------------------------------------------------------------------
   Plain data. build.js turns each entry into a static article page plus an
   index at journal.html. Body is an array of blocks:
     { h2: '...' }                 section heading
     { p: '...' }                  paragraph (plain text, escaped)
     { ul: ['...', '...'] }        bullet list
     { note: '...' }               callout box
     { product: 'skin-glow-oil' }  inline product card, pulled from data.js

   Rules of thumb for anything added here:
     - Answer the question in the first 60 words. That is what Google lifts
       into a featured snippet.
     - No medical claims. "May help", "many people find", never "cures".
     - One product mention per article, at most two. Editorial first.
   ========================================================================== */

const BLOG_POSTS = [
  {
    slug: 'why-black-soap-dries-some-skin-types',
    title: 'Why Black Soap Dries Some Skin Types (And How to Fix It)',
    date: '2026-02-14',
    updated: '2026-07-28',
    cat: 'Ingredients',
    read: 7,
    image: 'assets/black-soap.jpg',
    excerpt: 'African black soap leaves some people glowing and others tight and flaking. The reason is pH and saponified ash — not a bad batch. Here is what’s actually happening on your skin.',
    body: [
      { p: 'African black soap dries some skin types because it’s a true soap with a pH of roughly 9 to 10, while healthy skin sits at about 4.7 to 5.5. That alkalinity temporarily swells the outer skin layer and strips more oil than a syndet cleanser would. Oily and combination skin usually tolerates it well. Dry, mature or eczema-prone skin often doesn’t — unless you change how you use it.' },

      { h2: 'What black soap actually is' },
      { p: 'Traditional West African black soap is made by burning plantain skins, cocoa pods and palm leaves into ash, then boiling that ash with oils — palm kernel, coconut, shea butter. The ash provides the alkali. There is no lye added from a bottle; the potash comes from the plants themselves. That is also why no two batches are identical, and why the colour ranges from caramel to near-black.' },
      { p: 'Because the alkali is plant-derived and imprecise, artisanal soap can be more alkaline than industrial soap. A batch that a friend swears by can sting on your face. That is chemistry, not a scam.' },

      { h2: 'The three reasons it dries you out' },
      { ul: [
        'pH shock. Cleansing at pH 9 lifts the acid mantle. Skin rebuilds it in a few hours, but if you cleanse twice a day the mantle never fully recovers, and you get that tight, squeaky feeling that people mistake for "clean".',
        'Over-saponification. If a batch has more ash than oil, the excess alkali has nothing to bond with and goes straight for the lipids in your skin. Well-cured soap has been left to sit for weeks, which lets this finish reacting. Fresh, wet, sticky soap is more aggressive.',
        'Frequency and water. Hard water, hot showers and twice-daily use compound everything above. Most people who say black soap "destroyed" their skin were using it morning and night with hot water.'
      ]},

      { h2: 'Who should be careful' },
      { p: 'If you’ve visibly dry patches, rosacea, active eczema, or you’re already using retinoids, acids or benzoyl peroxide, treat black soap as a body cleanser and use something gentler on your face. If you’ve oily skin, back or chest breakouts, or you wear heavy sunscreen and makeup daily, it’s likely to suit you.' },

      { h2: 'How to use it without the tightness' },
      { ul: [
        'Lather in your hands first. Never rub the bar directly on your face — that deposits far more soap than you need and any grit in the bar is abrasive.',
        'Keep contact under 30 seconds. Cleansing isn’t a treatment. Lather, sweep, rinse.',
        'Use lukewarm water. Hot water alone raises transepidermal water loss.',
        'Start at three times a week. Increase only if your skin stays comfortable for two weeks.',
        'Follow with an oil or cream within three minutes, on damp skin, while the barrier is still permeable.',
        'Store it dry. A wet bar sitting in a puddle keeps reacting and gets harsher. A draining dish doubles its life.'
      ]},
      { note: 'If your skin feels tight ten minutes after rinsing, that’s a signal you’ve over-cleansed — not a sign the product is working.' },

      { h2: 'The pairing that fixes most of it' },
      { p: 'The classic mistake is cleansing well and moisturising badly. An alkaline cleanse followed by nothing leaves the barrier exposed for hours. Following it with a lightweight oil on damp skin restores the lipids the soap removed and traps the water still on the surface. In practice, that single change resolves the dryness for most people who were ready to give up on black soap entirely.' },
      { product: 'skin-glow-oil' },

      { h2: 'When to stop' },
      { p: 'Persistent redness, stinging that lasts beyond the rinse, flaking around the nose and mouth, or new small bumps after two weeks all mean your barrier is compromised. Stop, use a bland cream cleanser for a fortnight, and reintroduce black soap on the body only. Skin that has been over-cleansed for months can take six weeks to settle.' },

      { h2: 'The short version' },
      { p: 'Black soap is not too harsh — it is too alkaline for some people at the frequency they are using it. Lower the frequency, shorten the contact time, and always follow with oil on damp skin. Most "black soap ruined my face" stories are really "I washed twice a day with hot water and moisturised nothing" stories.' }
    ],
    faq: [
      { q: 'Can I use African black soap every day?', a: 'On the body, yes for most people. On the face, start at three times a week and only increase if your skin stays comfortable for two full weeks.' },
      { q: 'Why does my black soap feel gritty?', a: 'Unfiltered plant ash leaves fine particles. Lather in your hands and let the grit settle out rather than scrubbing the bar on your skin.' },
      { q: 'Does black soap lighten skin?', a: 'No. It cleanses and can improve clarity by reducing congestion, but it doesn’t bleach or lighten pigment, and any product claiming to do so should be treated with suspicion.' }
    ]
  },

  {
    slug: 'how-to-use-face-oil-without-looking-greasy',
    title: 'How to Use Face Oil Without Looking Greasy',
    date: '2026-03-02',
    updated: '2026-07-28',
    cat: 'Routines',
    read: 6,
    image: 'assets/skin-oil.jpg',
    excerpt: 'Three drops, damp skin, pressed not rubbed. The difference between a glow and a shine is almost entirely technique — and the order you apply things.',
    body: [
      { p: 'Face oil looks greasy when you use too much, apply it to dry skin, or put it on before your water-based products. Use three to four drops, press it into skin that’s still damp, and apply it last. That is 90% of the fix. The remaining 10% is choosing an oil weight that matches your skin.' },

      { h2: 'Oil goes last. Always.' },
      { p: 'Oils are occlusive: they form a film. Anything you apply after an oil has to fight through that film, so your serum does less. The rule is thinnest to thickest — water-based essence or serum, then cream if you use one, then oil to seal. The only exception is sunscreen, which always goes on top in the morning, and which many people prefer to apply over a lighter layer of oil or skip oil entirely before.' },

      { h2: 'Damp skin, not dry' },
      { p: 'Oil doesn’t hydrate. It has no water in it. What it does is slow the water already in your skin from evaporating. Applying it to bone-dry skin seals in nothing, and because dry skin absorbs slowly, the oil sits on the surface — which is exactly the shine you’re trying to avoid. Apply within about a minute of cleansing or after a spritz of water.' },

      { h2: 'Press, do not rub' },
      { p: 'Warm the drops between your palms, then press your hands flat against your cheeks, forehead and jaw for a few seconds each. Rubbing spreads oil across the surface and drags at the skin; pressing pushes it in. You will use noticeably less product this way.' },

      { h2: 'How much is actually enough' },
      { ul: [
        'Oily or combination skin: 2–3 drops, focused on cheeks and anywhere that feels tight. Skip the T-zone.',
        'Normal skin: 3–4 drops for the whole face.',
        'Dry or mature skin: 4–6 drops, and consider a second layer at night rather than one heavy application.',
        'Body: a 10p-sized pool per limb, on damp skin straight out of the shower.'
      ]},
      { note: 'If your face is shiny 20 minutes later, you used roughly twice what you needed. Halve it tomorrow rather than switching products.' },

      { h2: 'Match the weight to your skin' },
      { p: 'Lighter oils — jojoba, grapeseed, squalane — sink fast and suit oily and acne-prone skin. Jojoba in particular is structurally close to human sebum, which is why it rarely feels heavy. Heavier oils — avocado, marula, shea-based blends — sit longer and suit dry or textured skin, and work better at night than under makeup.' },
      { product: 'skin-glow-oil' },

      { h2: 'Under makeup' },
      { p: 'Oil and silicone-heavy foundation separate. If you wear a full base, either use one or two drops mixed into your moisturiser rather than layered on top, or save the oil for evenings. Give it a full five minutes to absorb before anything else touches your face.' },

      { h2: 'Will it break me out?' },
      { p: 'Some oils are more likely to clog than others — coconut oil is the usual culprit on facial skin, though it’s fine on the body for most people. Being oily isn’t a reason to skip oil; stripped skin often overproduces sebum in response. If you’re prone to congestion, patch test on the jawline for a week before committing to the whole face.' },

      { h2: 'The short version' },
      { p: 'Last step, damp skin, three drops, pressed in. Adjust the number of drops before you change products.' }
    ],
    faq: [
      { q: 'Should I use face oil in the morning or at night?', a: 'Both work. Mornings suit lighter oils under sunscreen; nights suit heavier ones. If you only do it once a day, night gives you the fewest compatibility problems.' },
      { q: 'Can oily skin use face oil?', a: 'Yes. Use a lighter oil like jojoba or squalane, two to three drops, and avoid the T-zone. Over-stripped skin frequently produces more oil, not less.' },
      { q: 'Does face oil replace moisturiser?', a: 'Not usually. Oil seals moisture in but adds none. If your skin is comfortable with oil alone on damp skin, that’s fine — otherwise keep a hydrating layer underneath.' }
    ]
  },

  {
    slug: 'dark-lips-causes-and-what-actually-helps',
    title: 'Dark Lips: The Real Causes and What Actually Helps',
    date: '2026-04-08',
    updated: '2026-07-28',
    cat: 'Lips',
    read: 6,
    image: 'assets/pink-lips.jpg',
    excerpt: 'Most lip darkening is friction, sun and dehydration — not something wrong with you. Here is what changes it and what’s marketing.',
    body: [
      { p: 'Lip darkening is usually caused by chronic dryness, sun exposure, friction, smoking, certain medications, or simply your natural melanin distribution. Genuine improvement comes from consistent hydration, gentle exfoliation, daily SPF and removing the irritant — not from bleaching products, which are unsafe on mucosal skin and often illegal.' },

      { h2: 'Why lips darken' },
      { ul: [
        'Dehydration and licking. Saliva evaporates and takes moisture with it, and the digestive enzymes in it irritate the thin lip skin. Chronic lip-licking is one of the most common causes of a dark ring around the mouth.',
        'Sun. Lips have almost no melanin protection on the vermilion and thin skin overall. Repeated UV exposure triggers pigmentation exactly as it does elsewhere.',
        'Friction. Rubbing off long-wear matte lipstick, aggressive scrubbing, and habitually biting all provoke post-inflammatory pigmentation.',
        'Smoking. Both heat and nicotine contribute; smoker\'s melanosis is well documented.',
        'Medication and health. Some antibiotics, chemotherapy agents and iron deficiency can change lip colour. Sudden, unexplained darkening is worth a doctor\'s opinion.',
        'Genetics. Plenty of people have naturally deeper-pigmented lips. There is nothing to fix.'
      ]},

      { h2: 'What actually works' },
      { p: 'The routine that produces visible change is unglamorous and takes about six weeks. Exfoliate gently once or twice a week — a sugar-based scrub, thirty seconds, no pressure. Hydrate constantly with an occlusive balm, especially overnight when water loss peaks. Wear SPF on your lips during the day; an SPF lip balm is the single most underused product in most routines. And stop the specific behaviour causing it, whether that’s licking, biting or a lipstick you scrub off every night.' },
      { product: 'pink-lips-scrub' },

      { h2: 'Exfoliation, done properly' },
      { p: 'Scrubbing harder doesn’t speed anything up — it creates the inflammation that darkens lips in the first place. Apply with a fingertip, move in small circles for no more than thirty seconds, rinse with lukewarm water and apply balm immediately while lips are damp. Twice a week is a ceiling, not a target. If your lips are cracked or split, skip exfoliation entirely until they have healed.' },
      { note: 'Never exfoliate lips that are chapped, bleeding or peeling in sheets. Heal first with balm alone for a week.' },

      { h2: 'What to be sceptical of' },
      { p: 'Any product promising to "lighten" or "pink" your lips in days is either a temporary tint or something you should not be putting on a mucous membrane. Hydroquinone and mercury-based lighteners are banned or restricted in most markets for good reason, and the lips deliver anything applied to them almost directly into the body. Tinted balms that give the appearance of colour are fine — they are cosmetics, and honest about it.' },
      { product: 'pink-lips-balm' },

      { h2: 'A realistic timeline' },
      { p: 'Texture improves within a week of consistent balm use. Colour is slower: pigmentation that took years of sun and friction to build takes two to three months of daily SPF and no irritation to fade, and it may not return fully to a lighter shade. Anyone promising a week is selling you a tint.' }
    ],
    faq: [
      { q: 'How long does it take to lighten dark lips naturally?', a: 'Expect texture changes in a week and gradual colour change over two to three months, provided you remove the cause and wear SPF daily. Genetic pigmentation won’t change.' },
      { q: 'Is lip scrub safe to use every day?', a: 'No. Once or twice weekly is enough. Daily exfoliation causes the inflammation that darkens lips.' },
      { q: 'Do lips need sunscreen?', a: 'Yes. Lip skin is thin and poorly protected by melanin, and UV is a leading cause of lip pigmentation and dryness.' }
    ]
  },

  {
    slug: 'skincare-in-harmattan-lagos-abuja',
    title: 'Skincare in Harmattan: A Practical Guide for Nigerian Skin',
    date: '2026-05-19',
    updated: '2026-07-28',
    cat: 'Climate',
    read: 7,
    image: 'assets/story-flatlay.jpg',
    excerpt: 'Between November and February the air pulls water straight out of your skin. What worked in July won’t work in December. Here is what to change.',
    body: [
      { p: 'Harmattan skincare comes down to three changes: swap foaming cleansers for cream ones, add an occlusive layer over your moisturiser, and moisturise on damp skin within three minutes of washing. Relative humidity in Abuja and Kano can drop below 15% during the season, and dry air draws water out of the skin faster than any product can replace it.' },

      { h2: 'Why your usual routine stops working' },
      { p: 'Skin loses water to the air continuously — transepidermal water loss. The drier the air, the steeper the gradient and the faster the loss. In the humid months your barrier keeps up. In harmattan it can’t, and the first signs are ashiness on the shins and forearms, tightness after washing, and flaking around the nose. Oily skin isn’t exempt: it gets dehydrated while still being oily, which is why people break out and flake at the same time in December.' },

      { h2: 'What to change, in order of impact' },
      { ul: [
        'Cleanse less and gentler. Once a day with a cream or oil cleanser on the face. Foaming gel cleansers that were perfect in the rainy season will strip you now.',
        'Moisturise on damp skin. Within three minutes of a shower, before the water has evaporated. This single habit outperforms an expensive cream applied dry.',
        'Add an occlusive. A body oil or shea-based balm over your lotion. Lotion holds water; the oil layer stops it leaving.',
        'Lower the shower temperature. Hot water feels wonderful in the harmattan chill and is the fastest way to strip your lipids.',
        'Keep balm on your lips constantly. Lips have no oil glands and crack first.',
        'Do not stop sunscreen. Harmattan haze scatters light but UV still gets through.'
      ]},
      { product: 'skin-glow-oil' },

      { h2: 'Dust, not just dryness' },
      { p: 'The Saharan dust that comes with the wind is an irritant in its own right. It settles on skin and in pores and, combined with a compromised barrier, provokes both congestion and sensitivity. Rinse your face when you come in from outside — a plain water rinse is fine and is far better than reaching for a stronger cleanser. Change pillowcases more often through the season.' },

      { h2: 'The ashiness question' },
      { p: 'Ashiness is dead surface cells becoming visible because there’s no moisture holding them flat and no oil giving them light reflection. Deeper-toned skin shows it more clearly, which is a matter of contrast rather than a different underlying problem. Gentle exfoliation once a week helps, but the real answer is the damp-skin oil habit above — scrubbing dry, dehydrated skin just makes it angry.' },

      { h2: 'A harmattan routine that fits in five minutes' },
      { p: 'Morning: rinse with lukewarm water, moisturiser on damp skin, sunscreen. Evening: cream cleanse, moisturiser, then a layer of oil pressed over the top. Body: oil on damp skin straight out of the shower, every time, no exceptions. Lips: balm at night and whenever you think of it.' },
      { note: 'If you only adopt one thing this season, make it the three-minute rule — anything you apply to damp skin works harder than the same product applied dry.' }
    ],
    faq: [
      { q: 'Should I change my skincare in harmattan?', a: 'Yes. Move to a gentler cleanser, apply products to damp skin, and add an oil or balm layer over your moisturiser to slow water loss in the dry air.' },
      { q: 'Why is my skin oily and flaky at the same time?', a: 'That is dehydration, not oiliness. The barrier is losing water while the oil glands keep working. Hydrate rather than strip.' },
      { q: 'Do I need sunscreen during harmattan?', a: 'Yes. Haze reduces glare but doesn’t block UV, and the season is long enough for cumulative damage to matter.' }
    ]
  },

  {
    slug: 'how-to-read-a-skincare-ingredient-list',
    title: 'How to Read a Skincare Ingredient List (Without a Chemistry Degree)',
    date: '2026-06-11',
    updated: '2026-07-28',
    cat: 'Ingredients',
    read: 8,
    image: 'assets/bag.jpg',
    excerpt: 'The first five ingredients are most of the product. Everything after the 1% line is in whatever order the brand fancies. Learn where that line is and the label stops lying to you.',
    body: [
      { p: 'Ingredient lists are ordered by concentration, highest first, until you reach ingredients present below 1% — after which the order is arbitrary. So the first five ingredients tell you what the product actually is, and anything listed after the preservative is usually a trace. That one rule exposes most "hero ingredient" marketing.' },

      { h2: 'Finding the 1% line' },
      { p: 'You can’t see it marked, but you can infer it. Preservatives (phenoxyethanol, sodium benzoate), chelators (disodium EDTA), and pH adjusters (sodium hydroxide, citric acid) are almost always used below 1%. Find the first of those in the list and treat everything from there on as trace amounts. If the marula oil the whole bottle is named after appears three lines below phenoxyethanol, there’s very little marula oil in there.' },

      { h2: 'What the first five tell you' },
      { ul: [
        'Aqua (water) first: a lotion, serum, or gel. Normal, not a cheat.',
        'An oil or butter first: a balm, oil or rich cream. Expect occlusion.',
        'Alcohol denat. in the first three: a fast-drying, potentially stripping formula. Fine in some products, harsh for dry skin.',
        'Glycerin high up: a good sign for hydration; it’s cheap, well studied and genuinely effective.',
        'A long chain of silicones (anything ending in -cone or -siloxane) high up: good slip and finish, no active benefit.'
      ]},

      { h2: 'Names that sound alarming and aren’t' },
      { p: 'INCI naming is Latinate and clinical by law, which makes harmless things sound synthetic. Tocopherol is vitamin E. Ascorbic acid is vitamin C. Butyrospermum parkii butter is shea. Cocos nucifera oil is coconut. "Chemical-free" is not a thing that exists — water is a chemical. Judge formulas on what they do, not how the words look.' },

      { h2: 'Claims worth ignoring' },
      { ul: [
        '"Dermatologically tested" — means a dermatologist was involved somewhere. It sets no standard for the result.',
        '"Natural" and "clean" — unregulated in most markets, including the UK and Nigeria.',
        '"Hypoallergenic" — no legal definition. Reassuring, meaningless.',
        '"Non-comedogenic" — based on tests that are decades old and were often done on rabbit ears. Useful directionally, not a guarantee.',
        'Percentages without context — 10% of a weak active does less than 2% of a strong one.'
      ]},
      { note: 'A short ingredient list isn’t automatically better. It is just shorter. Some of the most reliable formulas run to thirty lines because emulsions need emulsifiers, stabilisers and preservatives to stay safe on your shelf.' },

      { h2: 'Preservatives are a feature' },
      { p: 'Any product containing water will grow bacteria and mould without a preservative system. "Preservative-free" water-based products are either lying, using a preservative under a friendlier name, or genuinely unsafe after opening. Anhydrous products — pure oils, balms, sugar scrubs — do not need one, which is why you will often see none in an oil.' },
      { product: 'skin-glow-oil' },

      { h2: 'The PAO symbol' },
      { p: 'The small open jar with "12M" or "6M" on the back is the period after opening: how long the product stays stable once air hits it. Natural, low-preservative and oil-heavy products tend towards shorter windows. Buying a giant jar to save money is a false economy if you cannot finish it in time.' },

      { h2: 'A 30-second label check' },
      { p: 'Read the first five ingredients. Find the first preservative and mentally cut the list there. Check whether the ingredient the marketing is about sits above or below that cut. Look at the PAO. That is enough to sort honest products from decorated ones without knowing any chemistry at all.' }
    ],
    faq: [
      { q: 'Are ingredients listed in order of quantity?', a: 'Yes, from highest to lowest, but only down to 1%. Below that threshold brands may list in any order.' },
      { q: 'Is a shorter ingredient list better?', a: 'Not necessarily. Emulsions legitimately need emulsifiers and preservatives. Judge the first five ingredients and the function of the rest.' },
      { q: 'What does "non-comedogenic" actually mean?', a: 'It is an unregulated marketing term based on dated testing. Treat it as a hint, not a promise, and patch test if you’re prone to congestion.' }
    ]
  },

  {
    slug: 'building-a-five-minute-skincare-routine',
    title: 'A Five-Minute Skincare Routine That Actually Holds Up',
    date: '2026-07-21',
    updated: '2026-07-28',
    cat: 'Routines',
    read: 5,
    image: 'assets/hero-model.jpg',
    excerpt: 'Four products, twice a day, done consistently, beats a twelve-step routine you abandon in March. Here is the minimum that works.',
    body: [
      { p: 'A routine that works needs four things: a gentle cleanser, a moisturiser, sunscreen in the morning, and one active you use consistently. Everything else is optimisation. Consistency over eighteen months does more for your skin than any single product, and the shorter the routine, the more likely you’re to keep it.' },

      { h2: 'Morning: three steps, ninety seconds' },
      { ul: [
        'Rinse with lukewarm water, or use a gentle cleanser if you applied heavy products overnight. You don’t need to strip skin that has been on a clean pillowcase for eight hours.',
        'Moisturiser on damp skin. If you use a vitamin C serum, it goes before this.',
        'Sunscreen, generously. Two fingers\' length for face and neck. This is the step with the most evidence behind it and the one people skip.'
      ]},

      { h2: 'Evening: three steps, two minutes' },
      { ul: [
        'Cleanse properly. If you wore sunscreen or makeup, cleanse twice — an oil or balm first, then a gentle wash.',
        'Your active, on dry skin. Retinoid two or three nights a week to start, or an exfoliating acid on alternate nights. Never both on the same night when you’re beginning.',
        'Moisturiser, then oil if your skin is dry or the weather is.'
      ]},
      { product: 'skin-glow-oil' },

      { h2: 'Pick one active and stay with it' },
      { p: 'The most common mistake is stacking a retinoid, an acid, a vitamin C and a niacinamide in the same week and then wondering why the skin is irritated. Choose based on your main concern: retinoid for texture, lines and congestion; vitamin C for dullness and pigmentation; azelaic acid for redness and post-acne marks. Give it twelve weeks before you judge it. Skin turnover means nothing meaningful happens in a fortnight.' },
      { note: 'Buy the smallest size of any new active. If it doesn’t suit you, you’ve lost very little — and you’ll find out within three weeks.' },

      { h2: 'What you can safely drop' },
      { p: 'Toners in the astringent sense do nothing your cleanser hasn’t done. Separate eye creams are usually moisturiser in a smaller jar at a higher price, though a dedicated one is worth it if you use retinoid elsewhere and your eye area can’t tolerate it. Weekly sheet masks are pleasant and briefly hydrating; they aren’t a routine. Anything with a strong fragrance is a common source of irritation you’ll never trace.' },

      { h2: 'The lips people forget' },
      { p: 'Lips have no sebaceous glands and the thinnest skin on the face. A balm at night and an SPF balm during the day costs you five seconds and prevents most chapping and pigmentation before it starts.' },
      { product: 'lip-balm-tube' },

      { h2: 'How to know it’s working' },
      { p: 'Take a photograph in the same light on the first of each month. Skin changes slowly enough that daily mirror checks tell you nothing except how you slept. Twelve weeks of photographs will tell you more than any review.' }
    ],
    faq: [
      { q: 'What is the minimum effective skincare routine?', a: 'A gentle cleanser, a moisturiser, daily sunscreen, and one active used consistently. Four products cover the great majority of the benefit.' },
      { q: 'Can I use retinol and vitamin C together?', a: 'Not when starting out. Use vitamin C in the morning and a retinoid at night, and introduce them weeks apart so you can tell which one your skin reacts to.' },
      { q: 'How long before I see results from a new product?', a: 'Hydration shows within days, texture in four to six weeks, and pigmentation in twelve weeks or more. Judge nothing at two weeks.' }
    ]
  }
];

if (typeof module !== 'undefined') module.exports = { BLOG_POSTS };
