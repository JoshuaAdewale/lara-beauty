/* =============================================================================
   /api/reviews — shared review storage
   -----------------------------------------------------------------------------
   This is what makes an admin post appear for real visitors. Everything the
   admin used to write into localStorage now goes here instead, into a Netlify
   Blobs store that every visitor reads from.

   Endpoints
     GET  /api/reviews                 -> { published: { [productId]: [...] } }
     GET  /api/reviews?all=1           -> everything incl. pending  (staff only)
     POST /api/reviews  { action, ... }                             (staff only,
                          except action:'submit' which is public)

   Actions
     submit   public   a shopper writes a review -> stored as pending
     add      staff    staff writes/transcribes one -> stored, ok as given
     update   staff    edit an existing review
     approve  staff    flip ok:true
     delete   staff    remove
     import   staff    bulk load the seed reviews on first run

   Auth
     Staff actions require the x-admin-token header to match ADMIN_TOKEN, set in
     Netlify -> Site settings -> Environment variables. There is no default: if
     ADMIN_TOKEN is unset, every staff action is refused. That is deliberate —
     a blank default would leave the store writable by anyone who found the URL.
   ========================================================================== */

import { getStore } from '@netlify/blobs';

const KEY = 'reviews-v1';
const MAX_LEN = { n: 60, t: 120, b: 2000 };

const json = (body, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: {
    'content-type': 'application/json',
    'cache-control': 'no-store',
    'access-control-allow-origin': '*',
    'access-control-allow-headers': 'content-type, x-admin-token',
    'access-control-allow-methods': 'GET, POST, OPTIONS'
  }
});

/* Strip anything that could execute if it were ever rendered as HTML, and cap
   the length so one submission cannot fill the store. */
const clean = (value, max) =>
  String(value ?? '').replace(/[<>]/g, '').trim().slice(0, max);

const store = () => getStore({ name: 'lara-reviews', consistency: 'strong' });

/* ---------------------------------------------------------------------------
   Rate limiting for the public submit endpoint.

   Without this a script can post thousands of reviews in a minute. They would
   all be pending and invisible to shoppers, but they would bury the real ones,
   burn your free-tier function quota and make the queue useless.

   Netlify gives the caller's IP in x-nf-client-connection-ip. We keep a small
   rolling window per IP in the same blob store. This is not bulletproof — an
   attacker with many IPs gets through — but it stops the trivial case, which
   is what actually happens to small shops.
   ------------------------------------------------------------------------ */
const RATE = { max: 5, windowMs: 60 * 60 * 1000 };   // 5 submissions per hour per IP

async function rateLimited(req) {
  const ip = req.headers.get('x-nf-client-connection-ip')
    || req.headers.get('x-forwarded-for')
    || 'unknown';
  const key = 'ratelimit';
  const s = store();
  const all = (await s.get(key, { type: 'json' })) || {};
  const now = Date.now();

  /* Drop expired entries so this never grows without bound. */
  for (const [k, times] of Object.entries(all)) {
    const kept = times.filter(t => now - t < RATE.windowMs);
    if (kept.length) all[k] = kept; else delete all[k];
  }

  const mine = all[ip] || [];
  if (mine.length >= RATE.max) return true;

  mine.push(now);
  all[ip] = mine;
  await s.setJSON(key, all);
  return false;
}

async function readAll() {
  const data = await store().get(KEY, { type: 'json' });
  return data && typeof data === 'object' ? data : {};
}

const isStaff = req => {
  const expected = process.env.ADMIN_TOKEN;
  if (!expected) return false;                       // unset => nobody is staff
  return req.headers.get('x-admin-token') === expected;
};

export default async (req) => {
  if (req.method === 'OPTIONS') return json({});

  /* ---- read ------------------------------------------------------------- */
  if (req.method === 'GET') {
    const all = await readAll();
    const wantAll = new URL(req.url).searchParams.get('all') === '1';

    if (wantAll) {
      if (!isStaff(req)) return json({ error: 'unauthorised' }, 401);
      return json({ reviews: all });
    }

    /* Public response carries approved reviews only. */
    const published = {};
    for (const [pid, list] of Object.entries(all)) {
      const live = list.filter(r => r.ok !== false);
      if (live.length) published[pid] = live;
    }
    return json({ published });
  }

  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405);

  let payload;
  try { payload = await req.json(); }
  catch { return json({ error: 'bad json' }, 400); }

  const { action } = payload;
  const all = await readAll();

  /* ---- public: a shopper submits a review -------------------------------- */
  if (action === 'submit') {
    if (await rateLimited(req)) {
      return json({ error: 'Too many reviews from this connection. Try again later.' }, 429);
    }
    const pid = clean(payload.pid, 60);
    const body = clean(payload.b, MAX_LEN.b);
    const name = clean(payload.n, MAX_LEN.n);
    if (!pid || !body || !name) return json({ error: 'missing fields' }, 400);

    const entry = {
      id: 'RV-' + Date.now().toString(36).toUpperCase(),
      n: name,
      r: Math.min(5, Math.max(1, Number(payload.r) || 5)),
      t: clean(payload.t, MAX_LEN.t) || 'Review',
      b: body,
      d: new Date().toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }),
      v: false,
      ok: false,                       // always pending — never auto-publish
      src: 'customer',
      at: new Date().toISOString()
    };
    all[pid] = [entry, ...(all[pid] || [])].slice(0, 500);
    await store().setJSON(KEY, all);
    return json({ ok: true, pending: true });
  }

  /* ---- everything below is staff-only ------------------------------------ */
  if (!isStaff(req)) return json({ error: 'unauthorised' }, 401);

  if (action === 'add' || action === 'update') {
    const pid = clean(payload.pid, 60);
    if (!pid) return json({ error: 'missing product' }, 400);

    const entry = {
      id: payload.id || 'RV-' + Date.now().toString(36).toUpperCase(),
      n: clean(payload.n, MAX_LEN.n),
      r: Math.min(5, Math.max(1, Number(payload.r) || 5)),
      t: clean(payload.t, MAX_LEN.t),
      b: clean(payload.b, MAX_LEN.b),
      d: clean(payload.d, 30) ||
         new Date().toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }),
      v: !!payload.v,
      ok: payload.ok !== false,
      src: payload.src || 'staff',
      at: payload.at || new Date().toISOString()
    };

    const list = all[pid] || [];
    const i = list.findIndex(r => r.id === entry.id);
    if (i >= 0) list[i] = entry; else list.unshift(entry);
    all[pid] = list;
    await store().setJSON(KEY, all);
    return json({ ok: true, review: entry });
  }

  if (action === 'approve' || action === 'delete') {
    const pid = clean(payload.pid, 60);
    const list = all[pid] || [];
    const i = list.findIndex(r => r.id === payload.id);
    if (i < 0) return json({ error: 'not found' }, 404);

    if (action === 'approve') list[i].ok = true;
    else list.splice(i, 1);

    all[pid] = list;
    await store().setJSON(KEY, all);
    return json({ ok: true });
  }

  /* One-time seeding so the store starts from whatever is in data.js. */
  if (action === 'import') {
    if (!payload.reviews || typeof payload.reviews !== 'object') {
      return json({ error: 'bad payload' }, 400);
    }
    if (Object.keys(all).length && !payload.force) {
      return json({ error: 'already seeded — pass force:true to overwrite' }, 409);
    }
    await store().setJSON(KEY, payload.reviews);
    return json({ ok: true, seeded: Object.keys(payload.reviews).length });
  }

  return json({ error: 'unknown action' }, 400);
};

export const config = { path: '/api/reviews' };
