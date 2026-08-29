/* Shared persistence layer — used by BOTH storefront and admin */
const DB = {
  k: { p: 'lba_products', o: 'lba_orders', s: 'lba_settings', c: 'lba_cart', a: 'lba_auth',
       n: 'lba_subs', t: 'lba_content', g: 'lba_categories', m: 'lba_media' },
  read(key, fallback) {
    try { const v = JSON.parse(localStorage.getItem(key)); return v == null ? fallback : v; }
    catch (e) { return fallback; }
  },
  write(key, val) { localStorage.setItem(key, JSON.stringify(val)); }
};

/* seed once */
if (!localStorage.getItem(DB.k.p)) DB.write(DB.k.p, SEED_PRODUCTS);
if (!localStorage.getItem(DB.k.o)) DB.write(DB.k.o, SEED_ORDERS);
if (!localStorage.getItem(DB.k.s)) DB.write(DB.k.s, SEED_SETTINGS);
if (!localStorage.getItem(DB.k.n)) DB.write(DB.k.n, [
  { email: 'amara.o@email.com', d: '2026-07-12' }, { email: 'halima.s@email.com', d: '2026-07-19' },
  { email: 'joy.n@email.com', d: '2026-07-24' }, { email: 'temi.a@email.com', d: '2026-07-29' }
]);

if (!localStorage.getItem(DB.k.t)) DB.write(DB.k.t, SEED_CONTENT);
if (!localStorage.getItem(DB.k.g)) DB.write(DB.k.g, SEED_CATEGORIES);
if (!localStorage.getItem(DB.k.m)) DB.write(DB.k.m, [
  'assets/skin-oil.jpg','assets/black-soap.jpg','assets/pink-lips.jpg','assets/lip-balm-red.jpg',
  'assets/lip-balm-sticks.jpg','assets/lip-gloss.jpg','assets/bag.jpg',
  'assets/hero-model.jpg','assets/story-flatlay.jpg',
  'assets/logo-transparent.png','assets/logo-light.png'
]);

/* deep-merge so new seed keys appear even on an existing install */
function merge(base, over) {
  if (Array.isArray(base)) return Array.isArray(over) ? over : base;
  if (base && typeof base === 'object') {
    const out = Object.assign({}, base);
    Object.keys(over || {}).forEach(k => out[k] = merge(base[k], over[k]));
    return out;
  }
  return over === undefined ? base : over;
}

let PRODUCTS   = DB.read(DB.k.p, SEED_PRODUCTS);
let ORDERS     = DB.read(DB.k.o, SEED_ORDERS);
let SETTINGS   = Object.assign({}, SEED_SETTINGS, DB.read(DB.k.s, {}));
let SUBS       = DB.read(DB.k.n, []);
let CONTENT    = merge(SEED_CONTENT, DB.read(DB.k.t, {}));
let CATEGORIES = DB.read(DB.k.g, SEED_CATEGORIES);
let MEDIA      = DB.read(DB.k.m, []);

/* Each save also announces itself, so the admin can queue a draft push to the
   live store without every call site having to remember to do it. `detail`
   names which slice changed. */
const announceSave = what => {
  if (typeof document !== 'undefined') {
    document.dispatchEvent(new CustomEvent('db:saved', { detail: what }));
  }
};

const saveProducts   = () => { DB.write(DB.k.p, PRODUCTS);   announceSave('products'); };
const saveOrders     = () => { DB.write(DB.k.o, ORDERS);     announceSave('orders'); };
const saveSettings   = () => { DB.write(DB.k.s, SETTINGS);   announceSave('settings'); };
const saveSubs       = () => { DB.write(DB.k.n, SUBS);       announceSave('subs'); };
const saveContent    = () => { DB.write(DB.k.t, CONTENT);    announceSave('content'); };
const saveCategories = () => { DB.write(DB.k.g, CATEGORIES); announceSave('categories'); };
const saveMedia      = () => { DB.write(DB.k.m, MEDIA);      announceSave('media'); };

/* -----------------------------------------------------------------------------
   Currency

   Prices are stored per product in BOTH currencies (p.price = NGN, p.eur = EUR)
   because the two lists are set per market, not converted — deriving one from
   the other would produce wrong figures.

   Detection: Nigerian visitors see Naira, everyone else sees Euros. We infer
   location from the browser's IANA timezone, which needs no third-party API,
   no IP lookup and no cookie banner. The switcher stays available and any
   manual choice is remembered, so detection is a default and never a cage.
   -------------------------------------------------------------------------- */
/* Nigeria reports Africa/Lagos, but phones bought abroad, reset devices and a
   few Android builds report a neighbouring West African zone instead. They all
   share UTC+1 with no DST, so treating the WAT cluster as Nigerian catches
   those users. A Nigerian shopper wrongly shown Euros is a lost sale; a
   traveller in Accra shown Naira is a minor oddity — so the bias is deliberate. */
const NIGERIA_ZONES = [
  'Africa/Lagos', 'Africa/Abidjan', 'Africa/Accra', 'Africa/Porto-Novo',
  'Africa/Douala', 'Africa/Niamey', 'Africa/Lome', 'Africa/Ouagadougou',
  'Africa/Bangui', 'Africa/Brazzaville', 'Africa/Kinshasa', 'Africa/Malabo',
  'Africa/Libreville', 'Africa/Ndjamena'
];

function detectCurrency() {
  try {
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    if (NIGERIA_ZONES.includes(zone)) return 'NGN';

    /* Second signal: browser language. A device set to Nigerian English or a
       Nigerian language is almost certainly a Nigerian shopper, whatever its
       clock says. */
    const langs = (navigator.languages || [navigator.language || ''])
      .join(',').toLowerCase();
    if (/\b(en-ng|ig|yo|ha)\b/.test(langs)) return 'NGN';

    /* Last resort for browsers that report no zone at all: WAT is UTC+1 with
       no daylight saving, so an offset of -60 all year is a strong hint. */
    if (!zone) {
      const jan = new Date(new Date().getFullYear(), 0, 1).getTimezoneOffset();
      const jul = new Date(new Date().getFullYear(), 6, 1).getTimezoneOffset();
      if (jan === -60 && jul === -60) return 'NGN';
    }

    return 'EUR';
  } catch (e) {
    /* If detection throws, default to the home market rather than guessing. */
    return 'NGN';
  }
}

/* ?cur=EUR in the URL wins over everything and is remembered. This is what the
   hreflang market entry points and any UK ad link use, so a London shopper who
   arrives from search never sees Naira pricing first. */
function currencyFromUrl() {
  try {
    const q = new URLSearchParams(location.search).get('cur');
    return q ? q.toUpperCase() : '';
  } catch (e) { return ''; }
}

const urlCurrency = currencyFromUrl();
if (urlCurrency) {
  try { localStorage.setItem('lba_currency', urlCurrency); } catch (e) {}
}

let CURRENCY = urlCurrency || localStorage.getItem('lba_currency') || detectCurrency();
if (!SETTINGS.currencies || !SETTINGS.currencies[CURRENCY]) {
  CURRENCY = SETTINGS.defaultCurrency || 'NGN';
}

const cur = () => (SETTINGS.currencies && SETTINGS.currencies[CURRENCY])
  || { code: 'NGN', symbol: '₦', freeShip: SETTINGS.freeShip, shipFee: SETTINGS.shipFee };

function setCurrency(code) {
  if (!SETTINGS.currencies || !SETTINGS.currencies[code]) return;
  CURRENCY = code;
  localStorage.setItem('lba_currency', code);   // explicit choice wins from now on
  document.dispatchEvent(new Event('db:currency'));
}

/** Format an amount already expressed in the active currency. */
const money = n => {
  const c = cur();
  const v = Number(n) || 0;
  const locale = c.code === 'EUR' ? 'en-IE' : 'en-NG';
  // Euro amounts can carry decimals; Naira never does.
  const frac = c.code === 'EUR' && v % 1 !== 0 ? 2 : 0;
  return c.symbol + v.toLocaleString(locale, {
    minimumFractionDigits: frac, maximumFractionDigits: frac
  });
};

/** Read the correct stored price off a product or variant. */
const priceOf = obj => {
  if (!obj) return 0;
  return CURRENCY === 'EUR' ? (obj.eur ?? 0) : (obj.price ?? 0);
};

/** Read the correct 'was' price, or null. */
const compareOf = obj => {
  if (!obj) return null;
  const v = CURRENCY === 'EUR' ? obj.compareEur : obj.compare;
  return v || null;
};

const freeShipThreshold = () => cur().freeShip;
const shipFeeAmount = () => cur().shipFee;
const P = id => PRODUCTS.find(p => p.id === id);
const totalStock = p => p.variants && p.variants.length
  ? p.variants.reduce((s, v) => s + (+v.stock || 0), 0) : (+p.stock || 0);

/* cross-tab + cross-page live sync */
addEventListener('storage', e => {
  if (e.key === DB.k.p) { PRODUCTS = DB.read(DB.k.p, []); document.dispatchEvent(new Event('db:products')); }
  if (e.key === DB.k.o) { ORDERS = DB.read(DB.k.o, []); document.dispatchEvent(new Event('db:orders')); }
  if (e.key === DB.k.s) { SETTINGS = DB.read(DB.k.s, SEED_SETTINGS); document.dispatchEvent(new Event('db:settings')); }
  if (e.key === DB.k.t) { CONTENT = merge(SEED_CONTENT, DB.read(DB.k.t, {})); document.dispatchEvent(new Event('db:content')); }
  if (e.key === DB.k.g) { CATEGORIES = DB.read(DB.k.g, SEED_CATEGORIES); document.dispatchEvent(new Event('db:content')); }
});
