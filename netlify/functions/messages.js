/* =============================================================================
   /api/messages — shared inbox
   -----------------------------------------------------------------------------
   Before this existed, an enquiry submitted on a customer's phone was written
   to THAT phone's localStorage. The admin never saw it. Orders had the same
   problem. This gives every message one shared home the staff portal can read
   from any device.

   Endpoints
     POST /api/messages          public  log a message (enquiry, order, etc.)
     GET  /api/messages          staff   read the inbox
     POST /api/messages  {action:'read'|'delete'|'read-all'}   staff
   ========================================================================== */

import { getStore } from '@netlify/blobs';

const KEY = 'messages-v1';
const LIMIT = 1000;

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

const clean = (v, max) => String(v ?? '').replace(/[<>]/g, '').trim().slice(0, max);
const store = () => getStore({ name: 'lara-messages', consistency: 'strong' });

/* ---------------------------------------------------------------------------
   Outbound notification.

   Previously a new order was only written to storage, so unless the owner
   happened to open the admin they never learned a sale had happened. Sending
   from the server means it works even if the buyer closes the tab immediately,
   which the old browser-side send did not.

   Configure ONE of these in your host's environment variables:
     RESEND_KEY  + NOTIFY_EMAIL     (resend.com, 3,000 emails/month free)
     BREVO_KEY   + NOTIFY_EMAIL     (brevo.com, 300/day free)
   With neither set, messages are still stored — you just are not pinged.
   Never throws: a notification failure must not fail the customer's order.
------------------------------------------------------------------------- */
async function notify(entry) {
  const to = process.env.NOTIFY_EMAIL;
  if (!to) return 'no-recipient';

  const subject = entry.type === 'order'
    ? `New order — ${entry.subject || entry.name}`
    : `${entry.type === 'enquiry' ? 'Enquiry' : 'Website'} from ${entry.name || 'a visitor'}`;

  const lines = [
    entry.name ? `From: ${entry.name}` : '',
    entry.email ? `Email: ${entry.email}` : '',
    entry.phone ? `Phone: ${entry.phone}` : '',
    '',
    entry.body || '',
    '',
    '— sent automatically by your website'
  ].filter(Boolean).join('\n');

  try {
    if (process.env.RESEND_KEY) {
      const r = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${process.env.RESEND_KEY}`
        },
        body: JSON.stringify({
          from: process.env.NOTIFY_FROM || 'orders@resend.dev',
          to: [to],
          subject,
          text: lines,
          reply_to: entry.email || undefined
        })
      });
      return r.ok ? 'resend' : `resend-failed-${r.status}`;
    }

    if (process.env.BREVO_KEY) {
      const r = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'api-key': process.env.BREVO_KEY },
        body: JSON.stringify({
          sender: { email: process.env.NOTIFY_FROM || to, name: 'Lara Beauty Atelier' },
          to: [{ email: to }],
          subject,
          textContent: lines,
          ...(entry.email ? { replyTo: { email: entry.email } } : {})
        })
      });
      return r.ok ? 'brevo' : `brevo-failed-${r.status}`;
    }
  } catch (err) {
    return 'notify-error';
  }
  return 'stored-only';
}

const isStaff = req => {
  const expected = process.env.ADMIN_TOKEN;
  return !!expected && req.headers.get('x-admin-token') === expected;
};

async function readAll() {
  const data = await store().get(KEY, { type: 'json' });
  return Array.isArray(data) ? data : [];
}

export default async (req) => {
  if (req.method === 'OPTIONS') return json({});

  if (req.method === 'GET') {
    if (!isStaff(req)) return json({ error: 'unauthorised' }, 401);
    return json({ messages: await readAll() });
  }

  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405);

  let payload;
  try { payload = await req.json(); }
  catch { return json({ error: 'bad json' }, 400); }

  const list = await readAll();

  /* Staff maintenance actions --------------------------------------------- */
  if (payload.action) {
    if (!isStaff(req)) return json({ error: 'unauthorised' }, 401);

    if (payload.action === 'read') {
      const m = list.find(x => x.id === payload.id);
      if (m) m.read = payload.read !== false;
    } else if (payload.action === 'read-all') {
      list.forEach(m => { m.read = true; });
    } else if (payload.action === 'delete') {
      const i = list.findIndex(x => x.id === payload.id);
      if (i >= 0) list.splice(i, 1);
    } else {
      return json({ error: 'unknown action' }, 400);
    }

    await store().setJSON(KEY, list);
    return json({ ok: true });
  }

  /* Public: log a new message ---------------------------------------------
     Same reasoning as reviews: the contact form is an open endpoint, so cap
     how often one connection can post to it. */
  const ip = req.headers.get('x-nf-client-connection-ip')
    || req.headers.get('x-forwarded-for') || 'unknown';
  const rlKey = 'ratelimit';
  const rl = (await store().get(rlKey, { type: 'json' })) || {};
  const now = Date.now();
  const WINDOW = 60 * 60 * 1000, MAX = 10;
  for (const [k, times] of Object.entries(rl)) {
    const kept = times.filter(t => now - t < WINDOW);
    if (kept.length) rl[k] = kept; else delete rl[k];
  }
  if ((rl[ip] || []).length >= MAX) {
    return json({ error: 'Too many messages from this connection. Try again later.' }, 429);
  }
  rl[ip] = [...(rl[ip] || []), now];
  await store().setJSON(rlKey, rl);

  const entry = {
    id: 'MSG-' + Date.now().toString(36).toUpperCase(),
    date: new Date().toISOString(),
    read: false,
    delivered: !!payload.delivered,
    type: clean(payload.type, 20) || 'enquiry',
    subject: clean(payload.subject, 200),
    name: clean(payload.name, 100),
    email: clean(payload.email, 160),
    phone: clean(payload.phone, 40),
    body: clean(payload.body, 5000),
    meta: payload.meta && typeof payload.meta === 'object' ? payload.meta : null
  };

  /* Orders and enquiries are worth an email; subscriber pings are not. */
  if (entry.type === 'order' || entry.type === 'enquiry') {
    const via = await notify(entry);
    entry.delivered = via === 'resend' || via === 'brevo';
    entry.via = via;
  }

  list.unshift(entry);
  await store().setJSON(KEY, list.slice(0, LIMIT));
  return json({ ok: true, id: entry.id, notified: entry.delivered === true });
};

export const config = { path: '/api/messages' };
