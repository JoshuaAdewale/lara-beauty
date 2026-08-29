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

  /* Also push it to the shared inbox, otherwise an enquiry typed on a
     customer's phone stays on that phone and the admin never sees it.
     Fire-and-forget: the local copy above is the safety net. */
  if (typeof API !== 'undefined' && API.enabled) {
    API.logMessageRemote(entry).catch(() => { /* kept locally */ });
  }

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

/* -----------------------------------------------------------------------------
   Outbound staff mail — Admin → Messages → Compose

   A static site cannot send mail to an arbitrary recipient on its own: there is
   no server to hold a credential. So there are exactly two honest options, and
   sendStaffMail picks whichever the store is configured for:

     'emailjs'  Real send, straight from the browser, to whoever you type.
                This is the ONLY provider that can do that, because EmailJS
                holds your Gmail/Outlook credential on their side.

     anything   Falls back to opening the staff member's own mail client with
     else       the message pre-filled (mailto:). They press send. Slower, but
                it works everywhere and the reply lands in their real inbox.

   Formspree and Netlify Forms are deliberately NOT used here: both deliver only
   to the site owner's fixed address, so a "reply to the customer" that silently
   went to yourself would be worse than no feature at all.
   -------------------------------------------------------------------------- */
function canSendDirect() {
  return MAIL.provider === 'emailjs'
    && !!(MAIL.emailjs.serviceId && MAIL.emailjs.templateId && MAIL.emailjs.publicKey)
    && !!window.emailjs;
}

async function sendStaffMail({ to, subject, body, replyTo }) {
  const id = logMessage({
    type: 'outbound', subject, name: to, email: to, body,
    meta: { direction: 'outbound', to }
  });

  if (canSendDirect()) {
    try {
      await emailjs.send(MAIL.emailjs.serviceId, MAIL.emailjs.templateId, {
        to_email: to,
        _subject: subject,
        subject,
        message: body,
        reply_to: replyTo || MAIL.to,
        name: 'Lara Beauty Atelier',
        email: MAIL.to,
        sentFrom: location.href
      }, MAIL.emailjs.publicKey);
      markDelivered(id, true);
      return { ok: true, method: 'emailjs' };
    } catch (err) {
      console.warn('[mail] EmailJS send failed:', err);
      markDelivered(id, false);
      return { ok: false, method: 'emailjs', error: err };
    }
  }

  /* Fallback: hand it to the staff member's own mail client. */
  const href = `mailto:${encodeURIComponent(to)}`
    + `?subject=${encodeURIComponent(subject)}`
    + `&body=${encodeURIComponent(body)}`;
  window.location.href = href;
  return { ok: true, method: 'mailto' };
}

function mailSubscriber(email) {
  return sendMail({
    type: 'subscriber',
    subject: `New newsletter subscriber: ${email}`,
    email,
    body: `${email} joined the mailing list from the website.`
  });
}
