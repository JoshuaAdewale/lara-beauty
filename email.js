/* =============================================================================
   Lara Beauty Atelier — outbound email
   =============================================================================
   One place to configure how the site sends mail. Nothing else in the codebase
   needs to change when you switch provider.

   Set MAIL.provider to one of:

     'none'      Nothing is sent. Messages are queued in the admin only.
                 (Default — safe for demos.)

     'formspree' Easiest. Free tier, no server, works on Netlify or GitHub Pages.
                 1. Sign up at https://formspree.io
                 2. Create a form, copy the endpoint ID (e.g. 'xzbqwxyz')
                 3. Put it in MAIL.formspree.id below

     'netlify'   Netlify Forms. Free, no third party, but only works once the
                 site is deployed to Netlify (not on localhost).

     'emailjs'   Sends from the browser via your own Gmail/Outlook account.
                 Needs the EmailJS SDK script added to index.html.

   Every send is also recorded in the admin Messages inbox, so the client never
   loses an enquiry even if the provider fails.
   ========================================================================== */

const MAIL = {
  provider: 'none',

  /* Where enquiries and order alerts are delivered. */
  to: 'info.larabeautyatelier@gmail.com',

  formspree: {
    id: ''                       // e.g. 'xzbqwxyz'  ->  formspree.io/f/xzbqwxyz
  },

  emailjs: {
    serviceId: '',
    templateId: '',
    publicKey: ''
  }
};

/* -----------------------------------------------------------------------------
   Message log — every submission is stored locally and shown in Admin → Messages
   -------------------------------------------------------------------------- */
function logMessage(entry) {
  const list = DB.read('lba_messages', []);
  list.unshift({
    id: 'MSG-' + Date.now().toString(36).toUpperCase(),
    date: new Date().toISOString(),
    read: false,
    delivered: false,
    ...entry
  });
  DB.write('lba_messages', list.slice(0, 500));
  return list[0].id;
}

function markDelivered(id, ok) {
  const list = DB.read('lba_messages', []);
  const hit = list.find(m => m.id === id);
  if (hit) { hit.delivered = ok; DB.write('lba_messages', list); }
}

/* -----------------------------------------------------------------------------
   sendMail — returns a promise that resolves true when the provider accepted it
   -------------------------------------------------------------------------- */
async function sendMail({ type, subject, name, email, phone, body, meta }) {
  const id = logMessage({ type, subject, name, email, phone, body, meta });

  const payload = {
    _subject: subject,
    type,
    name: name || '',
    email: email || '',
    phone: phone || '',
    message: body || '',
    details: meta ? JSON.stringify(meta, null, 2) : '',
    sentFrom: location.href
  };

  try {
    let ok = false;

    if (MAIL.provider === 'formspree' && MAIL.formspree.id) {
      const res = await fetch(`https://formspree.io/f/${MAIL.formspree.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(payload)
      });
      ok = res.ok;

    } else if (MAIL.provider === 'netlify') {
      const form = new URLSearchParams({ 'form-name': 'lara-contact', ...payload });
      const res = await fetch('/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: form.toString()
      });
      ok = res.ok;

    } else if (MAIL.provider === 'emailjs' && window.emailjs) {
      await emailjs.send(MAIL.emailjs.serviceId, MAIL.emailjs.templateId,
                         payload, MAIL.emailjs.publicKey);
      ok = true;
    }

    markDelivered(id, ok);
    return ok;

  } catch (err) {
    console.warn('[mail] send failed, message kept in admin inbox:', err);
    markDelivered(id, false);
    return false;
  }
}

/* -----------------------------------------------------------------------------
   Convenience wrappers
   -------------------------------------------------------------------------- */
function mailOrder(order) {
  const lines = order.items.map(l => {
    const p = P(l.id);
    return `  ${l.q} x ${p ? p.name : l.id}${l.v ? ` (${l.v})` : ''}`;
  }).join('\n');

  return sendMail({
    type: 'order',
    subject: `New order ${order.ref} — ${money(order.total)}`,
    name: order.name,
    email: order.email,
    phone: order.phone,
    body: `New order ${order.ref}\n\n${lines}\n\n`
        + `Subtotal: ${money(order.sub)}\n`
        + `Delivery: ${order.ship ? money(order.ship) : 'Free'}\n`
        + `Total: ${money(order.total)}\n`
        + `Payment: ${order.pay}\n\n`
        + `Deliver to:\n${order.addr}\n${order.state}\n`
        + (order.note ? `\nNote: ${order.note}` : ''),
    meta: order
  });
}

function mailEnquiry({ name, email, phone, message }) {
  return sendMail({
    type: 'enquiry',
    subject: `Website enquiry from ${name}`,
    name, email, phone, body: message
  });
}

function mailSubscriber(email) {
  return sendMail({
    type: 'subscriber',
    subject: `New newsletter subscriber: ${email}`,
    email,
    body: `${email} joined the mailing list from the website.`
  });
}
