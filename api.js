/* =============================================================================
   Lara Beauty Atelier — API client
   -----------------------------------------------------------------------------
   The storefront is static HTML, but reviews and messages need to be SHARED:
   something posted in the admin has to appear for a shopper in Abuja on a
   different device. localStorage cannot do that. These helpers talk to the
   Netlify Functions in /netlify/functions, which persist to Netlify Blobs.

   Design rules:

   1. Never block the page. Static HTML renders first and always. Live data is
      fetched afterwards and patched in. If the API is down, slow, or the site
      is running from a file:// preview, the visitor still sees a complete page
      — just with build-time reviews instead of live ones.

   2. Fail quietly on the storefront, loudly in the admin. A shopper should
      never see an API error; a staff member must.

   3. The admin token is entered once at sign-in and kept in sessionStorage, so
      it is gone when the tab closes and is never written into the source.
   ========================================================================== */

const API = {
  base: '/api',
  timeout: 8000,

  /* Available only when the site is served over http(s) — a file:// preview or
     a plain `python -m http.server` has no functions behind it. */
  get enabled() {
    return location.protocol === 'http:' || location.protocol === 'https:';
  },

  token() {
    try { return sessionStorage.getItem('lba_admin_token') || ''; }
    catch (e) { return ''; }
  },

  setToken(value) {
    try {
      if (value) sessionStorage.setItem('lba_admin_token', value);
      else sessionStorage.removeItem('lba_admin_token');
    } catch (e) { /* private mode */ }
  },

  async call(path, { method = 'GET', body, staff = false } = {}) {
    if (!this.enabled) throw new Error('offline');

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeout);

    try {
      const res = await fetch(this.base + path, {
        method,
        headers: {
          ...(body ? { 'content-type': 'application/json' } : {}),
          ...(staff ? { 'x-admin-token': this.token() } : {})
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal
      });

      /* A missing function returns Netlify's HTML 404 page, not JSON. */
      const text = await res.text();
      let data;
      try { data = JSON.parse(text); }
      catch { throw new Error(res.status === 404 ? 'api-not-deployed' : 'bad-response'); }

      if (!res.ok) throw new Error(data.error || `http-${res.status}`);
      return data;

    } finally {
      clearTimeout(timer);
    }
  },

  /* ---- backup / restore / wipe ------------------------------------------- */
  exportAll() { return this.call('/data', { staff: true }); },
  importAll(data, mode) {
    return this.call('/data', { method: 'POST', staff: true,
      body: { action: 'import', data, mode } });
  },
  wipe(scope) {
    return this.call('/data', { method: 'POST', staff: true,
      body: { action: 'wipe', scope, confirm: 'DELETE' } });
  },

  /* ---- auth -------------------------------------------------------------- */
  login(password) {
    return this.call('/auth', { method: 'POST', body: { password } });
  },

  /* ---- reviews ---------------------------------------------------------- */
  getPublishedReviews() { return this.call('/reviews'); },
  getAllReviews() { return this.call('/reviews?all=1', { staff: true }); },
  submitReview(review) {
    return this.call('/reviews', { method: 'POST', body: { action: 'submit', ...review } });
  },
  saveReview(review) {
    return this.call('/reviews', { method: 'POST', staff: true, body: { action: 'add', ...review } });
  },
  approveReview(pid, id) {
    return this.call('/reviews', { method: 'POST', staff: true, body: { action: 'approve', pid, id } });
  },
  deleteReview(pid, id) {
    return this.call('/reviews', { method: 'POST', staff: true, body: { action: 'delete', pid, id } });
  },
  importReviews(reviews, force) {
    return this.call('/reviews', { method: 'POST', staff: true, body: { action: 'import', reviews, force } });
  },

  /* ---- catalogue (products, content, settings) --------------------------- */
  getPublished() { return this.call('/store'); },
  getDraft() { return this.call('/store?draft=1', { staff: true }); },
  saveDraft(data) {
    return this.call('/store', { method: 'POST', staff: true, body: { action: 'save', data } });
  },
  publish(data) {
    return this.call('/store', { method: 'POST', staff: true, body: { action: 'publish', data } });
  },
  recordOrder(items) {
    return this.call('/store', { method: 'POST', body: { action: 'order', items } });
  },
  rollback() {
    return this.call('/store', { method: 'POST', staff: true, body: { action: 'rollback' } });
  },
  discardDraft() {
    return this.call('/store', { method: 'POST', staff: true, body: { action: 'discard' } });
  },

  /* ---- newsletter -------------------------------------------------------- */
  subscribe(email, source) {
    return this.call('/subscribe', { method: 'POST', body: { email, source } });
  },
  getSubscribers() { return this.call('/subscribe', { staff: true }); },
  removeSubscriber(email) {
    return this.call('/subscribe', { method: 'POST', staff: true, body: { action: 'delete', email } });
  },

  /* ---- messages --------------------------------------------------------- */
  getMessages() { return this.call('/messages', { staff: true }); },
  logMessageRemote(entry) {
    return this.call('/messages', { method: 'POST', body: entry });
  },
  markMessage(id, read) {
    return this.call('/messages', { method: 'POST', staff: true, body: { action: 'read', id, read } });
  },
  markAllMessages() {
    return this.call('/messages', { method: 'POST', staff: true, body: { action: 'read-all' } });
  },
  deleteMessage(id) {
    return this.call('/messages', { method: 'POST', staff: true, body: { action: 'delete', id } });
  }
};

/* =============================================================================
   Storefront hydration
   -----------------------------------------------------------------------------
   Replaces the build-time review block on a product page with whatever is live,
   then updates the rating, the count and the histogram to match. Runs after
   first paint so it costs nothing in LCP.
   ========================================================================== */

const escHtml = s => String(s ?? '').replace(/[&<>"]/g, c =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const STAR_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 2 3 6.6 7 .7-5.2 4.7 1.5 7L12 17.4 5.7 21l1.5-7L2 9.3l7-.7L12 2Z"/></svg>';

function renderStars(n) {
  return `<p class="stars">${STAR_SVG.repeat(Math.round(n) || 5)}</p>`;
}

function reviewCard(r) {
  return `<article class="rev">
    <div class="rev-top">
      <span><b>${escHtml(r.n)}</b>${r.v ? '<span class="v">Verified buyer</span>' : ''}</span>
      <time>${escHtml(r.d)}</time>
    </div>
    ${renderStars(r.r)}
    <h3>${escHtml(r.t)}</h3>
    <p>${escHtml(r.b)}</p>
  </article>`;
}

async function hydrateReviews() {
  const form = document.querySelector('#review-form');
  const list = document.querySelector('.rev-list');
  if (!form || !list || !API.enabled) return;

  const pid = form.dataset.product;

  let data;
  try { data = await API.getPublishedReviews(); }
  catch (e) { return; }                       // silent: static content stands

  const live = (data.published || {})[pid];
  if (!Array.isArray(live) || !live.length) return;

  /* Replace the list */
  list.innerHTML = live.map(reviewCard).join('');

  /* Headline average + count */
  const avg = live.reduce((s, r) => s + (+r.r || 0), 0) / live.length;
  const score = document.querySelector('.rev-score b');
  if (score) score.textContent = avg.toFixed(1);

  const scoreStars = document.querySelector('.rev-score .stars');
  if (scoreStars) scoreStars.innerHTML = STAR_SVG.repeat(Math.round(avg) || 5);

  const count = document.querySelector('.rev-count');
  if (count) count.textContent = `${live.length} review${live.length === 1 ? '' : 's'}`;

  /* Histogram */
  const rows = document.querySelectorAll('.rev-dist-row .bar i');
  [5, 4, 3, 2, 1].forEach((star, i) => {
    if (!rows[i]) return;
    const n = live.filter(r => Math.round(r.r) === star).length;
    rows[i].style.setProperty('--bar-fill', `${(n / live.length) * 100}%`);
  });

  /* The sample-content notice is no longer true once real reviews are live. */
  const note = document.querySelector('.rev-demo-note');
  if (note) note.remove();

  /* Card rating near the top of the page */
  document.querySelectorAll('[data-live-rating]').forEach(el => {
    el.textContent = avg.toFixed(1);
  });
}

/* =============================================================================
   Catalogue hydration — live prices, names, stock
   -----------------------------------------------------------------------------
   Reviews can arrive late without consequence. PRICES cannot: if a shopper adds
   to the bag before the live price lands, they are transacting on a stale
   number. So this runs as early as possible, patches the in-memory PRODUCTS
   array that the cart reads from, and only then patches the visible DOM.

   The published payload is the whole catalogue, so a single fetch covers every
   page. If it fails, the build-time prices stand — which are correct, just
   possibly out of date.
   ========================================================================== */

let LIVE_VERSION = null;

async function hydrateCatalogue() {
  if (!API.enabled) return;

  let data;
  try { data = await API.getPublished(); }
  catch (e) { return; }

  const pub = data && data.published;
  if (!pub) return;                        // nothing published yet — static wins
  LIVE_VERSION = data.version;

  /* 1. Patch the data the cart and checkout actually read. */
  if (Array.isArray(pub.products) && typeof PRODUCTS !== 'undefined') {
    pub.products.forEach(live => {
      const i = PRODUCTS.findIndex(p => p.id === live.id);
      if (i >= 0) PRODUCTS[i] = { ...PRODUCTS[i], ...live };
      else PRODUCTS.push(live);
    });
    /* A product removed in the admin should stop being purchasable. */
    const liveIds = new Set(pub.products.map(p => p.id));
    for (let i = PRODUCTS.length - 1; i >= 0; i--) {
      if (!liveIds.has(PRODUCTS[i].id)) PRODUCTS.splice(i, 1);
    }
    if (typeof saveProducts === 'function') saveProducts();
  }

  if (pub.settings && typeof SETTINGS !== 'undefined') {
    Object.assign(SETTINGS, pub.settings);
    if (typeof saveSettings === 'function') saveSettings();
  }

  /* 2. Patch what the shopper can see. */
  patchProductCards(pub);
  patchProductPage(pub);

  /* 3. Anything already in a bag may now be priced differently. */
  if (typeof syncCart === 'function') { try { syncCart(); } catch (e) {} }
  document.dispatchEvent(new Event('db:live'));
}

/** Format an amount in the active currency, reusing the storefront's own money(). */
function liveMoney(ngn, eur) {
  const useEur = typeof CURRENCY !== 'undefined' && CURRENCY === 'EUR';
  const value = useEur ? (eur ?? 0) : ngn;
  return typeof money === 'function' ? money(value) : String(value);
}

function priceMarkup(p) {
  const sale = p.compare && p.compare > p.price;
  const main = `<span data-ngn="${Math.round(p.price)}" data-eur="${p.eur ?? 0}">${liveMoney(p.price, p.eur)}</span>`;
  const was = sale
    ? `<s><span data-ngn="${Math.round(p.compare)}" data-eur="${p.compareEur ?? 0}">${liveMoney(p.compare, p.compareEur)}</span></s>`
    : '';
  return main + was;
}

function totalStockOf(p) {
  return p.variants && p.variants.length
    ? p.variants.reduce((s, v) => s + (+v.stock || 0), 0)
    : (+p.stock || 0);
}

function patchProductCards(pub) {
  if (!Array.isArray(pub.products)) return;
  const byId = Object.fromEntries(pub.products.map(p => [p.id, p]));

  document.querySelectorAll('.card[data-pid]').forEach(card => {
    const p = byId[card.dataset.pid];
    if (!p) { card.remove(); return; }        // withdrawn product

    const name = card.querySelector('[data-field="name"]');
    if (name && name.textContent !== p.name) name.textContent = p.name;

    const tag = card.querySelector('[data-field="tagline"]');
    if (tag && p.tagline != null && tag.textContent !== p.tagline) tag.textContent = p.tagline;

    const price = card.querySelector('[data-field="price"]');
    if (price) price.innerHTML = priceMarkup(p);

    const out = totalStockOf(p) <= 0;
    const btn = card.querySelector('.card-add');
    if (btn) {
      btn.disabled = out;
      btn.textContent = out ? 'Sold out' : 'Add to bag';
      btn.classList.toggle('btn-dark', out);
      btn.classList.toggle('btn-primary', !out);
    }
  });
}

function patchProductPage(pub) {
  const form = document.querySelector('#review-form');
  const pid = form && form.dataset.product;
  if (!pid || !Array.isArray(pub.products)) return;

  const p = pub.products.find(x => x.id === pid);
  if (!p) return;

  const h1 = document.querySelector('.pdp h1');
  if (h1 && h1.textContent !== p.name) h1.textContent = p.name;

  const tl = document.querySelector('.pdp .tl');
  if (tl && p.tagline != null && tl.textContent !== p.tagline) tl.textContent = p.tagline;

  /* Headline price block (#ppr) — rebuild it including any sale markup. */
  const ppr = document.querySelector('#ppr');
  if (ppr) {
    const sale = p.compare && p.compare > p.price;
    let html = priceMarkup(p);
    if (sale) {
      const saveN = p.compare - p.price;
      const saveE = (p.compareEur || 0) - (p.eur || 0);
      html += `<span class="save">Save <span data-ngn="${Math.round(saveN)}" data-eur="${saveE}">${liveMoney(saveN, saveE)}</span></span>`;
    }
    ppr.innerHTML = html;
  }

  /* Variant buttons carry their own price and stock in data attributes; the
     page's own pickVar() reads these, so they must be right before we call it. */
  document.querySelectorAll('.vopt').forEach(btn => {
    const label = btn.dataset.arg2;
    const v = (p.variants || []).find(x => x.label === label);
    if (!v) { btn.remove(); return; }
    btn.dataset.price = v.price;
    btn.dataset.eur = v.eur ?? 0;
    btn.dataset.stock = v.stock;
    btn.disabled = v.stock <= 0;
    const span = btn.querySelector('[data-ngn]');
    if (span) {
      span.dataset.ngn = Math.round(v.price);
      span.dataset.eur = v.eur ?? 0;
      span.textContent = liveMoney(v.price, v.eur);
    }
  });

  /* Re-run the page's own logic so the buy button, stock line and sticky bar
     all agree with the new numbers.

     Only when the page actually rendered variant buttons. build.js omits them
     for a single-variant product (`vs.length > 1`), so pickVar() would find no
     `.vopt`, return early, and leave the buy button showing the OLD price while
     the headline showed the new one. Checking the DOM rather than the data is
     what makes this correct. */
  const vopts = document.querySelectorAll('.vopt');
  const active = document.querySelector('.vopt.on');
  if (typeof pickVar === 'function' && vopts.length) {
    try { pickVar(p.id, active ? active.dataset.arg2 : null); } catch (e) {}
  } else {
    /* No variants: pickVar() never runs, so the buy button and sticky bar have
       to be updated here. #atb is the main Add to bag. */
    /* A single-variant product carries its stock and price on the variant. */
    const only = (p.variants || []).length === 1 ? p.variants[0] : null;
    const price = only ? only.price : p.price;
    const eur = only ? (only.eur ?? p.eur) : p.eur;
    const out = (only ? +only.stock : +p.stock || 0) <= 0;

    const add = document.querySelector('#atb');
    if (add) {
      add.disabled = out;
      add.textContent = out ? 'Sold out' : `Add to bag · ${liveMoney(price, eur)}`;
    }
    document.querySelectorAll('[data-cmd="cart:buy-now"]').forEach(b => { b.disabled = out; });

    const bb = document.querySelector('#buybar-price');
    if (bb) {
      bb.dataset.ngn = Math.round(price);
      bb.dataset.eur = eur ?? 0;
      bb.textContent = liveMoney(price, eur);
    }
    const bbAdd = document.querySelector('#buybar [data-cmd="cart:add"]');
    if (bbAdd) {
      bbAdd.disabled = out;
      bbAdd.textContent = out ? 'Sold out' : 'Add to bag';
    }
  }
}

if (typeof document !== 'undefined') {
  const boot = () => {
    /* Catalogue first — it affects money. Reviews are cosmetic, so they queue
       behind it rather than competing for the connection. */
    hydrateCatalogue().finally(() => hydrateReviews());
  };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
}
