/* =============================================================================
   /api/auth — server-side staff login
   -----------------------------------------------------------------------------
   THE PROBLEM THIS SOLVES

   Staff passwords used to live in admin.js as plain text. Anyone could open the
   file in a browser and read them. The only real protection was ADMIN_TOKEN,
   which staff had to copy and paste at every sign-in — awkward enough that
   people write it down, which is its own problem.

   Now the password is checked HERE, against environment variables that never
   reach the browser. A correct password returns the publishing token, so staff
   type one thing they can remember and the token is never handled by a human.

   SET THESE in your host's environment variables:

     ADMIN_PASSWORD    the owner's password        (required)
     STAFF_PASSWORD    a second, lower-trust login (optional)
     ADMIN_TOKEN       the publishing key          (required)

   If ADMIN_PASSWORD is unset this endpoint refuses every attempt, and the admin
   falls back to the legacy in-file check. Failing closed is deliberate.

   WHAT THIS IS NOT
   It is not a full identity system: there are no per-user accounts, sessions
   are still client-side, and a determined attacker who already has the password
   is in. It removes the "password is published in a public file" problem, which
   is the one that actually mattered.
   ========================================================================== */

import { getStore } from '@netlify/blobs';

const json = (body, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: {
    'content-type': 'application/json',
    'cache-control': 'no-store',
    'access-control-allow-origin': '*',
    'access-control-allow-headers': 'content-type',
    'access-control-allow-methods': 'POST, OPTIONS'
  }
});

const store = () => getStore({ name: 'lara-auth', consistency: 'strong' });

/* Constant-time-ish comparison. JS string === can leak length and position
   through timing; this always walks the full longer string. Not perfect in a
   JIT, but it removes the trivially measurable difference. */
function safeEqual(a, b) {
  const x = String(a || '');
  const y = String(b || '');
  const len = Math.max(x.length, y.length);
  let diff = x.length ^ y.length;
  for (let i = 0; i < len; i++) {
    diff |= (x.charCodeAt(i) || 0) ^ (y.charCodeAt(i) || 0);
  }
  return diff === 0;
}

export default async (req) => {
  if (req.method === 'OPTIONS') return json({});
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405);

  const ownerPw = process.env.ADMIN_PASSWORD;
  const staffPw = process.env.STAFF_PASSWORD;
  const token = process.env.ADMIN_TOKEN;

  /* Fail closed: with nothing configured, nobody gets in via this route. */
  if (!ownerPw || !token) {
    return json({ error: 'not-configured' }, 503);
  }

  let payload;
  try { payload = await req.json(); }
  catch { return json({ error: 'bad json' }, 400); }

  const ip = req.headers.get('x-nf-client-connection-ip')
    || req.headers.get('cf-connecting-ip')
    || req.headers.get('x-forwarded-for')
    || 'unknown';

  /* Server-side lockout. The old client-side counter was trivially bypassed by
     clearing localStorage, so brute force was effectively unlimited. */
  const s = store();
  const KEY = 'login-attempts';
  const now = Date.now();
  const WINDOW = 15 * 60 * 1000;   // 15 minutes
  const MAX = 8;

  const all = (await s.get(KEY, { type: 'json' })) || {};
  for (const [k, v] of Object.entries(all)) {
    const kept = (v || []).filter(t => now - t < WINDOW);
    if (kept.length) all[k] = kept; else delete all[k];
  }
  if ((all[ip] || []).length >= MAX) {
    return json({ error: 'Too many attempts. Try again in 15 minutes.' }, 429);
  }

  const pw = String(payload.password || '');
  let role = null;
  if (safeEqual(pw, ownerPw)) role = 'owner';
  else if (staffPw && safeEqual(pw, staffPw)) role = 'staff';

  if (!role) {
    all[ip] = [...(all[ip] || []), now];
    await s.setJSON(KEY, all);
    const left = MAX - all[ip].length;
    return json({
      error: left > 0
        ? `Incorrect password — ${left} attempt${left === 1 ? '' : 's'} left`
        : 'Too many attempts. Try again in 15 minutes.'
    }, 401);
  }

  /* Success clears the counter for this address. */
  delete all[ip];
  await s.setJSON(KEY, all);

  /* Staff get a working session but NOT the publishing token, so they can read
     the dashboard and answer messages without being able to change prices. */
  return json({
    ok: true,
    role,
    name: role === 'owner' ? 'Lara' : 'Store staff',
    token: role === 'owner' ? token : ''
  });
};

export const config = { path: '/api/auth' };
