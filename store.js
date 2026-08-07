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

const saveProducts   = () => DB.write(DB.k.p, PRODUCTS);
const saveOrders     = () => DB.write(DB.k.o, ORDERS);
const saveSettings   = () => DB.write(DB.k.s, SETTINGS);
const saveSubs       = () => DB.write(DB.k.n, SUBS);
const saveContent    = () => DB.write(DB.k.t, CONTENT);
const saveCategories = () => DB.write(DB.k.g, CATEGORIES);
const saveMedia      = () => DB.write(DB.k.m, MEDIA);

const money = n => SETTINGS.currency + Math.round(n).toLocaleString('en-NG');

/* Display both NGN and GBP prices */
const moneyDual = (ngnPrice, gbpPrice) => {
  const ngn = Math.round(ngnPrice).toLocaleString('en-NG');
  const gbp = gbpPrice ? Math.round(gbpPrice).toLocaleString('en-GB') : '';
  return gbp ? `₦${ngn} / £${gbp}` : `₦${ngn}`;
};

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
