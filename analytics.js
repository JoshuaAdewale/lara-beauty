/* =============================================================================
   Lara Beauty Atelier — analytics & cookie consent
   =============================================================================
   Nothing loads until the visitor agrees. That is a legal requirement for EU
   and UK shoppers under GDPR/PECR, and you now price in Euros, so it applies.

   ---------------------------------------------------------------------------
   SETUP (about 10 minutes)
   ---------------------------------------------------------------------------
   1. Create a GA4 property at https://analytics.google.com
      Admin → Create property → Web → enter your URL
   2. Copy the Measurement ID (looks like G-XXXXXXXXXX)
   3. Paste it below as ANALYTICS.ga4
   4. Verify at https://search.google.com/search-console and submit
      https://lara-beauty-atelier.netlify.app/sitemap.xml

   Optional: Meta Pixel for Instagram ads — paste the numeric ID as `pixel`.

   Leave either blank and it simply won't load.
   ========================================================================== */

const ANALYTICS = {
  ga4: '',        // G-XXXXXXXXXX
  pixel: '',      // Meta Pixel ID, numeric
  debug: false
};

const CONSENT_KEY = 'lba_consent';

const consentGiven = () => localStorage.getItem(CONSENT_KEY) === 'granted';
const consentAnswered = () => localStorage.getItem(CONSENT_KEY) !== null;

/* -----------------------------------------------------------------------------
   Loading — only ever called after consent
   -------------------------------------------------------------------------- */
let loaded = false;

function loadAnalytics() {
  if (loaded) return;
  loaded = true;

  if (ANALYTICS.ga4) {
    const s = document.createElement('script');
    s.async = true;
    s.src = `https://www.googletagmanager.com/gtag/js?id=${ANALYTICS.ga4}`;
    document.head.appendChild(s);

    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    gtag('js', new Date());
    gtag('config', ANALYTICS.ga4, { anonymize_ip: true });
  }

  if (ANALYTICS.pixel) {
    /* eslint-disable */
    !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
    n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
    n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
    t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}
    (window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
    /* eslint-enable */
    fbq('init', ANALYTICS.pixel);
    fbq('track', 'PageView');
  }
}

/* -----------------------------------------------------------------------------
   Event tracking
   Call track('add_to_cart', {...}) from anywhere. Silently does nothing when
   consent is absent or no IDs are configured.
   -------------------------------------------------------------------------- */
function track(event, data = {}) {
  if (ANALYTICS.debug) console.log('[track]', event, data);
  if (!consentGiven()) return;

  const currency = (typeof CURRENCY !== 'undefined' ? CURRENCY : 'NGN');

  if (window.gtag) {
    switch (event) {
      case 'view_item':
        gtag('event', 'view_item', {
          currency, value: data.price,
          items: [{ item_id: data.id, item_name: data.name, price: data.price }]
        });
        break;
      case 'add_to_cart':
        gtag('event', 'add_to_cart', {
          currency, value: data.price * (data.qty || 1),
          items: [{ item_id: data.id, item_name: data.name,
                    price: data.price, quantity: data.qty || 1 }]
        });
        break;
      case 'begin_checkout':
        gtag('event', 'begin_checkout', { currency, value: data.total });
        break;
      case 'purchase':
        gtag('event', 'purchase', {
          transaction_id: data.ref, currency: data.currency,
          value: data.total, shipping: data.ship,
          items: data.items.map(l => ({ item_id: l.id, quantity: l.q }))
        });
        break;
      default:
        gtag('event', event, data);
    }
  }

  if (window.fbq) {
    const map = { add_to_cart: 'AddToCart', begin_checkout: 'InitiateCheckout',
                  purchase: 'Purchase', view_item: 'ViewContent' };
    if (map[event]) {
      fbq('track', map[event], {
        currency: data.currency || currency,
        value: data.total || data.price
      });
    }
  }
}

/* -----------------------------------------------------------------------------
   Consent banner
   -------------------------------------------------------------------------- */
function showConsentBanner() {
  if (consentAnswered()) {
    if (consentGiven()) loadAnalytics();
    return;
  }
  // Nothing to consent to if no IDs are configured.
  if (!ANALYTICS.ga4 && !ANALYTICS.pixel) return;

  const bar = document.createElement('div');
  bar.className = 'consent';
  bar.setAttribute('role', 'dialog');
  bar.setAttribute('aria-label', 'Cookie choices');
  bar.innerHTML = `
    <p class="consent-text">
      We use cookies to understand how the shop is used. Nothing is loaded until
      you choose. <a href="privacy.html">Privacy policy</a>.
    </p>
    <div class="consent-actions">
      <button type="button" class="btn btn-dark btn-sm" data-consent="denied">Decline</button>
      <button type="button" class="btn btn-primary btn-sm" data-consent="granted">Accept</button>
    </div>`;
  document.body.appendChild(bar);
  requestAnimationFrame(() => bar.classList.add('on'));

  bar.addEventListener('click', e => {
    const btn = e.target.closest('[data-consent]');
    if (!btn) return;
    localStorage.setItem(CONSENT_KEY, btn.dataset.consent);
    if (btn.dataset.consent === 'granted') loadAnalytics();
    bar.classList.remove('on');
    setTimeout(() => bar.remove(), 400);
  });
}

document.addEventListener('DOMContentLoaded', showConsentBanner);
