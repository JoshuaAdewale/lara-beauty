/* =============================================================================
   Lara Beauty Atelier — payments
   =============================================================================
   Paystack Inline. No server required: the public key is designed to be public
   and can safely live in this file. Money settles straight to the client's
   Paystack account.

   Paystack charges 1.5% + ₦100 per Nigerian transaction (the ₦100 is waived
   under ₦2,500), and 3.9% on international cards. No monthly fee, no setup fee.

   ---------------------------------------------------------------------------
   SETUP (about 15 minutes)
   ---------------------------------------------------------------------------
   1. Sign up at https://paystack.com  →  Nigerian business account
   2. Dashboard → Settings → API Keys & Webhooks
   3. Copy the PUBLIC key (starts pk_test_ while testing, pk_live_ when ready)
   4. Paste it below as PAY.publicKey
   5. Keep PAY.mode = 'test' until you've made a successful test payment,
      then switch to 'live' and swap in the pk_live_ key.

   ⚠️  Only ever put the PUBLIC key here. The SECRET key (sk_...) must never
       appear in front-end code — anyone could refund or read your transactions.
   ========================================================================== */

const PAY = {
  /* 'off'   — no payment, order is recorded only (current behaviour)
     'test'  — Paystack test mode, use card 4084 0840 8408 4081, any CVV/expiry
     'live'  — real money                                                    */
  mode: 'off',

  publicKey: '',                 // pk_test_xxxx or pk_live_xxxx

  /* Paystack settles in NGN. International cards are accepted and converted,
     so EUR orders are charged their NGN equivalent at this rate. Update it
     when your pricing changes — see AUDIT.md on the NGN/EUR spread. */
  eurToNgn: 1750,

  /* Shown on the Paystack modal */
  businessName: 'Lara Beauty Atelier'
};

/** Paystack works in kobo (NGN) — the smallest unit. */
function toKobo(amount, currency) {
  const ngn = currency === 'EUR' ? amount * PAY.eurToNgn : amount;
  return Math.round(ngn * 100);
}

/** Load the Paystack script once, on demand. */
let paystackReady = null;
function loadPaystack() {
  if (paystackReady) return paystackReady;
  paystackReady = new Promise((resolve, reject) => {
    if (window.PaystackPop) return resolve();
    const s = document.createElement('script');
    s.src = 'https://js.paystack.co/v1/inline.js';
    s.onload = resolve;
    s.onerror = () => reject(new Error('Paystack failed to load'));
    document.head.appendChild(s);
  });
  return paystackReady;
}

/**
 * Take payment for an order.
 * Resolves { paid: true, reference } on success,
 *          { paid: false, skipped: true } when payments are switched off,
 *          rejects if the shopper cancels or the charge fails.
 */
async function takePayment(order) {
  if (PAY.mode === 'off' || !PAY.publicKey) {
    return { paid: false, skipped: true };
  }

  await loadPaystack();

  return new Promise((resolve, reject) => {
    const handler = window.PaystackPop.setup({
      key: PAY.publicKey,
      email: order.email,
      amount: toKobo(order.total, order.currency),
      currency: 'NGN',
      ref: order.ref,
      firstname: order.name.split(' ')[0] || '',
      lastname: order.name.split(' ').slice(1).join(' ') || '',
      metadata: {
        custom_fields: [
          { display_name: 'Phone', variable_name: 'phone', value: order.phone },
          { display_name: 'Deliver to', variable_name: 'address',
            value: `${order.addr}, ${order.state}` },
          { display_name: 'Items', variable_name: 'items',
            value: order.items.map(l => `${l.q}x ${l.id}${l.v ? ' (' + l.v + ')' : ''}`).join(', ') },
          { display_name: 'Shown in', variable_name: 'currency', value: order.currency }
        ]
      },
      callback: response => resolve({ paid: true, reference: response.reference }),
      onClose: () => reject(new Error('Payment window closed'))
    });
    handler.openIframe();
  });
}
