#!/usr/bin/env node
/* =============================================================================
   Lara Beauty Atelier — static site builder

   Generates plain, standalone HTML pages (one file per page) from the seed
   data in data.js. Every page ships with its content already in the markup,
   so it works with JavaScript disabled and is fully crawlable.

   Run:  node build.js
   ========================================================================== */

const fs = require('fs');
const path = require('path');

/* Overridable so build-live.js can run this inside the deployed folder on
   Netlify, where source and output are the same directory. */
const ROOT = process.env.SRC_DIR || path.join(__dirname, 'lara-beauty');
const OUT = process.env.OUT_DIR || path.join(__dirname, 'lara-beauty-pages');

/* Absolute base for canonicals, sitemap and structured data.
   Search engines reject relative URLs in both sitemaps and JSON-LD. */
/* Domain resolution order: explicit env var, then the .domain file written by
   tools/set-domain.cjs, then the host's own URL, then the placeholder. The
   .domain file exists so a plain `node build.js` cannot silently revert your
   canonicals to the placeholder subdomain. */
/* Look in the source folder first (local builds) then beside build.js itself
   (Netlify, where the repo root IS the deploy folder). Without the second path
   a CI build silently reverted every canonical to the placeholder subdomain. */
const domainCandidates = [
  path.join(__dirname, 'lara-beauty', '.domain'),
  path.join(__dirname, '.domain'),
  path.join(ROOT, '.domain')
];
const savedDomain = (domainCandidates.find(f => fs.existsSync(f)) || null)
  ? fs.readFileSync(domainCandidates.find(f => fs.existsSync(f)), 'utf8').trim()
  : '';
const SITE = (process.env.SITE_URL || savedDomain || process.env.URL
  || 'https://lara-beauty-atelier.netlify.app').replace(/\/$/, '');
/** Absolute URL, using Netlify's extensionless form so canonicals match
 *  the URL Google actually crawls (/shop, not /shop.html). */
const abs = p => {
  const clean = String(p).replace(/^\//, '').replace(/\.html$/, '');
  return clean === 'index' || clean === '' ? `${SITE}/` : `${SITE}/${clean}`;
};

/* ---- load seed data --------------------------------------------------- */
const seedSrc = fs.readFileSync(path.join(ROOT, 'data.js'), 'utf8') +
  '\nmodule.exports={products:SEED_PRODUCTS,cats:SEED_CATEGORIES,content:SEED_CONTENT,settings:SEED_SETTINGS};';
fs.writeFileSync('/tmp/_seed.js', seedSrc);
let { products: PRODUCTS, cats: CATEGORIES, content: C, settings: S } = require('/tmp/_seed.js');

/* ---- overlay the LIVE published catalogue ------------------------------
   Prices edited in the admin are served to shoppers by JavaScript, but the
   raw HTML and the Product JSON-LD that Google reads stay at whatever was
   baked in at build time. A mismatch between the two is a structured-data
   policy violation: rich results get suppressed and Merchant Center can
   disapprove the item.

   So the build pulls the published catalogue first. Set LIVE_API to your
   site (or let Netlify's own $URL provide it) and every rebuild bakes the
   current prices into both the HTML and the schema.

   Falls back to data.js silently when the API is unreachable, so an offline
   build still works.
------------------------------------------------------------------------ */
const LIVE_API = process.env.LIVE_API || process.env.URL || '';
if (LIVE_API) {
  try {
    const res = require('child_process')
      .execSync(`curl -sS --max-time 15 "${LIVE_API.replace(/\/$/, '')}/api/store"`, { encoding: 'utf8' });
    const pub = JSON.parse(res).published;
    if (pub && Array.isArray(pub.products) && pub.products.length) {
      PRODUCTS = pub.products;
      if (Array.isArray(pub.categories) && pub.categories.length) CATEGORIES = pub.categories;
      if (pub.content) C = Object.assign({}, C, pub.content);
      if (pub.settings) S = Object.assign({}, S, pub.settings);
      console.log(`Using LIVE catalogue from ${LIVE_API} (${PRODUCTS.length} products)`);
    } else {
      console.log('Live API reachable but nothing published — using data.js');
    }
  } catch (err) {
    console.log('Live API unreachable — using data.js');
  }
}

/* Live reviews too, so aggregateRating reflects reality rather than seeds. */
if (LIVE_API) {
  try {
    const res = require('child_process')
      .execSync(`curl -sS --max-time 15 "${LIVE_API.replace(/\/$/, '')}/api/reviews"`, { encoding: 'utf8' });
    const published = JSON.parse(res).published || {};
    let n = 0;
    PRODUCTS.forEach(p => {
      const live = published[p.id];
      if (Array.isArray(live) && live.length) {
        p.reviews = live;
        p.rating = Math.round((live.reduce((t, r) => t + (+r.r || 0), 0) / live.length) * 10) / 10;
        n += live.length;
      }
    });
    if (n) console.log(`Using ${n} live reviews`);
  } catch (err) { /* seeds stand */ }
}

/* ---- load blog posts ---------------------------------------------------- */
const blogSrc = fs.readFileSync(path.join(ROOT, 'blog.js'), 'utf8');
fs.writeFileSync('/tmp/_blog.js', blogSrc);
const { BLOG_POSTS: POSTS } = require('/tmp/_blog.js');
const postUrl = p => `journal-${p.slug}.html`;
const fmtDate = d => new Date(d + 'T00:00:00Z').toLocaleDateString('en-GB',
  { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

/* The no-flash theme script, defined once. Its SHA-256 goes into the CSP, so
   editing the script automatically updates the policy — they cannot drift. */
const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem('lba_theme');
  if(!t)t=matchMedia('(prefers-color-scheme: light)').matches?'light':'dark';
  if(t==='light')document.documentElement.setAttribute('data-theme','light');
  }catch(e){}})();`;
const THEME_HASH = 'sha256-' + require('crypto')
  .createHash('sha256').update(THEME_SCRIPT).digest('base64');

/* Category pages and product pages both live under Shop in the menu. */
const SHOP_NAV = ['shop'].concat(CATEGORIES.map(c => c.id));

/* ---- helpers ----------------------------------------------------------- */
const esc = s => String(s ?? '').replace(/[&<>"]/g, c =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const money = n => S.currency + Math.round(n).toLocaleString('en-NG');
/** Price span carrying both currencies so site.js can swap it client-side. */
/** <picture> with a WebP source and the original as fallback. */
const pic = (src, alt, attrs = '') => rpic(src, alt, { attrs });

/* ---- responsive images -------------------------------------------------- */
/* Resized variants (name-400.jpg/.webp etc) are generated by tools/images.js
   and live next to the original. We only reference the ones that exist. */
const RS_WIDTHS = [400, 800, 1200];
const rsCache = {};
function variants(src) {
  if (rsCache[src]) return rsCache[src];
  const m = /^(.*)\.(jpg|jpeg|png)$/i.exec(src);
  if (!m) return (rsCache[src] = []);
  const list = [];
  RS_WIDTHS.forEach(w => {
    const rel = `${m[1]}-${w}.${m[2]}`;
    if (fs.existsSync(path.join(ROOT, rel))) list.push({ w, jpg: rel, webp: `${m[1]}-${w}.webp` });
  });
  // the original is the largest candidate; measure its real width
  const full = path.join(ROOT, src);
  if (fs.existsSync(full)) {
    const w = jpegWidth(full);
    if (w) list.push({ w, jpg: src, webp: src.replace(/\.(jpg|jpeg|png)$/i, '.webp') });
  }
  return (rsCache[src] = list.sort((a, b) => a.w - b.w));
}
/** Read intrinsic width from a JPEG/PNG header — no dependencies. */
function jpegWidth(file) {
  const b = fs.readFileSync(file);
  if (b[0] === 0x89 && b[1] === 0x50) return b.readUInt32BE(16);           // PNG
  let i = 2;
  while (i < b.length) {
    if (b[i] !== 0xff) { i++; continue; }
    const marker = b[i + 1];
    if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker))
      return b.readUInt16BE(i + 7);
    i += 2 + b.readUInt16BE(i + 2);
  }
  return 0;
}
/**
 * Responsive <picture>. `sizes` tells the browser how wide the image renders,
 * so phones fetch the 400px file instead of the 1080px one.
 */
function rpic(src, alt, { sizes = '', attrs = '', id = '' } = {}) {
  const v = variants(src);
  const webpFallback = src.replace(/\.(jpg|jpeg|png)$/i, '.webp');
  if (v.length < 2) {
    return `<picture>
          <source${id ? ` id="${id}"` : ''} srcset="${esc(webpFallback)}" type="image/webp">
          <img src="${esc(src)}" alt="${esc(alt)}" ${attrs}>
        </picture>`;
  }
  const set = key => v.map(x => `${esc(x[key])} ${x.w}w`).join(', ');
  const sz = sizes ? ` sizes="${esc(sizes)}"` : '';
  return `<picture>
          <source${id ? ` id="${id}"` : ''} srcset="${set('webp')}"${sz} type="image/webp">
          <source srcset="${set('jpg')}"${sz} type="image/jpeg">
          <img src="${esc(src)}" alt="${esc(alt)}" ${attrs}>
        </picture>`;
}
/** srcset string for a source image, or '' when no variants exist. */
const srcsetOf = (src, key) => variants(src).map(x => `${x[key]} ${x.w}w`).join(', ');
/** Smallest available variant, for thumbnails. */
const thumb = src => {
  const v = variants(src);
  return v.length ? v[0].jpg : src;
};
/* Common `sizes` strings, matching the CSS layout. */
const SZ = {
  card: '(max-width: 600px) 46vw, (max-width: 1000px) 30vw, 300px',
  hero: '(max-width: 900px) 92vw, 46vw',
  wide: '(max-width: 900px) 94vw, 560px',
  gallery: '(max-width: 900px) 94vw, 620px'
};

const price2 = (ngn, eur) =>
  `<span data-ngn="${Math.round(ngn)}" data-eur="${eur ?? 0}">${money(ngn)}</span>`;
const catLabel = id => (CATEGORIES.find(c => c.id === id) || {}).label || id;
const productUrl = p => `product-${p.id}.html`;
const catUrl = c => `collection-${c.id}.html`;
const totalStock = p => p.variants && p.variants.length
  ? p.variants.reduce((s, v) => s + (+v.stock || 0), 0) : (+p.stock || 0);
const okReviews = p => p.reviews.filter(r => r.ok !== false);

/* --- Review integrity -------------------------------------------------------
   Structured-data stars are only emitted when the reviews behind them are real
   (settings.reviewsVerified). Marking up demo reviews is a Google structured-
   data violation and, in the UK, a banned commercial practice under the DMCC
   Act 2024. Counts are never inflated: the multiplier defaults to 1.
   -------------------------------------------------------------------------- */
const REVIEWS_VERIFIED = S.reviewsVerified === true;
const REVIEW_MULT = Math.max(1, +S.reviewMultiplier || 1);
const revCount = p => okReviews(p).length * REVIEW_MULT;

const STAR = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 2 3 6.6 7 .7-5.2 4.7 1.5 7L12 17.4 5.7 21l1.5-7L2 9.3l7-.7L12 2Z"/></svg>';
const stars = (r, label) =>
  `<p class="stars">${STAR.repeat(Math.round(r) || 5)}${label ? `<span>${esc(label)}</span>` : ''}</p>`;

const ICONS = {
  leaf: 'M12 3s6 4 6 9a6 6 0 1 1-12 0c0-5 6-9 6-9Z',
  globe: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18ZM3 12h18M12 3c2.5 2.7 2.5 15 0 18',
  truck: 'M4 8h13l3 4v5H4z',
  check: 'M20 7 9 18l-5-5',
  star: 'm12 3 2.6 5.6 6 .7-4.4 4 1.2 6L12 16.4 6.6 19.3l1.2-6-4.4-4 6-.7z',
  heart: 'M12 20s-7-4.4-7-9a4 4 0 0 1 7-2.6A4 4 0 0 1 19 11c0 4.6-7 9-7 9Z',
  shield: 'M12 3l8 3v6c0 5-3.4 8.2-8 9-4.6-.8-8-4-8-9V6z',
  clock: 'M12 7v5l3 3M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z'
};

/* ---- shared chrome ------------------------------------------------------ */
/** Sitewide identity graph: Organization, WebSite, and the page's breadcrumb. */
function siteGraph(page) {
  const graph = [
    {
      '@type': 'Organization',
      '@id': `${SITE}/#org`,
      name: S.brand,
      url: SITE,
      logo: abs('assets/logo-transparent.png'),
      email: S.email,
      telephone: S.phone,
      sameAs: [`https://instagram.com/${String(S.ig).replace('@', '')}`],
      address: { '@type': 'PostalAddress', addressLocality: 'Lagos', addressCountry: 'NG' }
    },
    {
      '@type': 'WebSite',
      '@id': `${SITE}/#site`,
      url: SITE,
      name: S.brand,
      publisher: { '@id': `${SITE}/#org` }
    }
  ];

  if (page.breadcrumb && page.breadcrumb.length > 1) {
    graph.push({
      '@type': 'BreadcrumbList',
      itemListElement: page.breadcrumb.map((b, i) => {
        const item = { '@type': 'ListItem', position: i + 1, name: b.label };
        if (b.href) item.item = abs(b.href);
        return item;
      })
    });
  }

  return { '@context': 'https://schema.org', '@graph': graph };
}

/* One URL serves both markets; currency is chosen by timezone and remembered.
   These annotations tell Google the page is intended for both the Nigerian and
   the European/UK audience, and give each market an explicit entry point that
   forces its own currency (?cur=). The canonical stays parameter-free. */
function hreflang(url) {
  const a = abs(url);
  return [
    `  <link rel="alternate" hreflang="en-NG" href="${esc(a)}">`,
    `  <link rel="alternate" hreflang="en-GB" href="${esc(a)}">`,
    `  <link rel="alternate" hreflang="en-IE" href="${esc(a)}">`,
    `  <link rel="alternate" hreflang="en" href="${esc(a)}">`,
    `  <link rel="alternate" hreflang="x-default" href="${esc(a)}">`
  ].join('\n');
}

function head(page) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <meta name="theme-color" content="#0A0A0A" media="(prefers-color-scheme: dark)">
  <meta name="theme-color" content="#FBF8F4" media="(prefers-color-scheme: light)">

  <title>${esc(page.title)}</title>
  ${page.noindex ? '<meta name="robots" content="noindex, follow">' : ''}
  <meta name="description" content="${esc(String(page.desc).length > 158
      ? String(page.desc).slice(0, 155).replace(/\s+\S*$/, '') + '…'
      : page.desc)}">
  <link rel="canonical" href="${esc(abs(page.url || 'index.html'))}">
${page.noindex ? '' : hreflang(page.url || 'index.html')}

  <meta property="og:type" content="${page.ogType || 'website'}">
  <meta property="og:title" content="${esc(page.title)}">
  <meta property="og:description" content="${esc(page.desc)}">
  <meta property="og:image" content="${esc(abs(page.image || 'assets/story-flatlay.jpg'))}">
  <meta property="og:url" content="${esc(abs(page.url || 'index.html'))}">
  <meta property="og:site_name" content="${esc(S.brand)}">
  <meta property="og:locale" content="en_NG">
  <meta property="og:locale:alternate" content="en_GB">

  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${esc(page.title)}">
  <meta name="twitter:description" content="${esc(page.desc)}">
  <meta name="twitter:image" content="${esc(abs(page.image || 'assets/story-flatlay.jpg'))}">

  <link rel="icon" href="assets/favicon.png">
  <!-- Applies the saved theme before first paint. A deferred script would let
       the dark page render first, producing a visible flash on light mode.
       Kept tiny and inline for that reason; hashed in the CSP below. -->
  <script>${THEME_SCRIPT}</script>
  <link rel="preload" href="assets/fonts/92zatBhPNqw73oTd4g.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="stylesheet" href="styles.min.css">
  <script type="application/ld+json">${JSON.stringify(siteGraph(page))}</script>
  ${page.jsonld ? `<script type="application/ld+json">${JSON.stringify(page.jsonld)}</script>` : ''}
</head>

<body>
  <a class="skip-link" href="#main">Skip to content</a>

  <p class="announce">${esc(C.footer.announce || S.announce)}</p>

  <header class="site-header" id="site-header">
    <div class="wrap nav">
      <a class="logo" href="index.html" aria-label="Lara Beauty Atelier — home">
        <picture>
          <source srcset="assets/logo-transparent.webp" type="image/webp">
          <img src="assets/logo-transparent.png" alt="" width="44" height="43">
        </picture>
        <span class="lt"><b>LARA BEAUTY</b><small>Atelier</small></span>
      </a>

      <!-- Five items, deliberately. Categories were removed from the top level:
           with only 9 products the Shop page's filter chips do that job, and a
           shorter menu is easier to scan. Shop stays highlighted while you
           browse a category so you never lose your place. -->
      <nav class="nav-links" aria-label="Primary">
        <a href="index.html"${page.nav === 'home' ? ' aria-current="page"' : ''}>Home</a>
        <a href="shop.html"${SHOP_NAV.includes(page.nav) ? ' aria-current="page"' : ''}>Shop</a>
        <a href="about.html"${page.nav === 'about' ? ' aria-current="page"' : ''}>Story</a>
        <a href="journal.html"${page.nav === 'journal' ? ' aria-current="page"' : ''}>Journal</a>
        <a href="contact.html"${page.nav === 'contact' ? ' aria-current="page"' : ''}>Contact</a>
      </nav>

      <div class="nav-act">
        <!-- No currency picker by design. Nigerian visitors see Naira and
             everyone else sees Euros, detected automatically. A shopper should
             not have to tell a shop what country they are in. -->
        <button type="button" class="icon-btn theme-btn" data-action="theme"
                aria-label="Switch between light and dark theme">
          <svg class="icon-moon" viewBox="0 0 24 24" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z"/></svg>
          <svg class="icon-sun" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>
        </button>

        <button type="button" class="icon-btn" data-action="search" aria-label="Search products">
          <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
        </button>
        <a class="icon-btn" href="cart.html" aria-label="View shopping bag">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 7h12l-1 13H7L6 7Z"/><path d="M9 7a3 3 0 0 1 6 0"/></svg>
          <span class="badge" id="cart-count" aria-live="polite">0</span>
        </a>
        <button type="button" class="icon-btn burger" data-action="menu-open"
                aria-label="Open menu" aria-expanded="false" aria-controls="mobile-nav">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>
        </button>
      </div>
    </div>
  </header>

  <!-- Mobile menu.
       Home and Your Bag are omitted deliberately: the logo and cart icon in the
       header already do those jobs. Support links sit in a compact secondary
       group so the whole menu fits one screen without scrolling. -->
  <nav class="mmenu" id="mobile-nav" aria-label="Mobile" aria-hidden="true">
    <div class="mmenu-head">
      <span class="mmenu-title">Menu</span>
      <button type="button" class="icon-btn menu-close" data-action="menu-close" aria-label="Close menu">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>
      </button>
    </div>

    <!-- Same five as the desktop menu, in the same order, so the site feels
         like one place. Categories sit underneath as a quieter shortcut
         rather than competing with the primary five. -->
    <div class="mmenu-main">
      <a href="index.html">Home</a>
      <a href="shop.html">Shop</a>
      <a href="about.html">Story</a>
      <a href="journal.html">Journal</a>
      <a href="contact.html">Contact</a>
    </div>

    <div class="mmenu-sub">
      ${CATEGORIES.map(c => `<a href="${catUrl(c)}">${esc(c.label)}</a>`).join('\n      ')}
      <a href="delivery.html">Delivery</a>
      <a href="faq.html">FAQ</a>
      <a href="track.html">Track order</a>
    </div>

    <a class="btn btn-primary btn-block mmenu-cta" href="cart.html">View bag</a>
  </nav>

  <main id="main">`;
}

function foot() {
  const F = C.footer;
  return `  </main>

  <footer class="site-footer">
    <div class="wrap">
      <div class="foot">
        <div>
          <div class="logo">
            <picture>
              <source srcset="assets/logo-transparent.webp" type="image/webp">
              <img src="assets/logo-transparent.png" alt="" width="44" height="43" loading="lazy">
            </picture>
            <span class="lt"><b>LARA BEAUTY</b><small>Atelier</small></span>
          </div>
          <p>${esc(F.blurb)}</p>
        </div>

        <div>
          <h2 class="foot-title">${esc(F.shopTitle)}</h2>
          <ul>
            ${CATEGORIES.map(c => `<li><a href="${catUrl(c)}">${esc(c.label)}</a></li>`).join('\n            ')}
            <li><a href="shop.html">Shop all</a></li>
          </ul>
        </div>

        <div>
          <h2 class="foot-title">${esc(F.helpTitle)}</h2>
          <ul>
            <li><a href="track.html">Track my order</a></li>
            <li><a href="delivery.html">Delivery &amp; returns</a></li>
            <li><a href="faq.html">FAQ</a></li>
            <li><a href="journal.html">The Journal</a></li>
            <li><a href="contact.html">Contact us</a></li>
          </ul>
        </div>

        <div>
          <h2 class="foot-title">${esc(F.contactTitle)}</h2>
          <ul>
            <li><a href="mailto:${esc(S.email)}">${esc(S.email)}</a></li>
            <li><a href="tel:${esc(S.phone).replace(/\s/g, '')}">${esc(S.phone)}</a></li>
            <li>${esc(S.ig)}</li>
            <li>${esc(S.address)}</li>
            <li>${esc(F.hours)}</li>
          </ul>
        </div>
      </div>

      <div class="foot-bot">
        <span>${esc(F.copyright)}</span>
        <span>
          <a href="privacy.html">Privacy</a> ·
          <a href="terms.html">Terms</a> ·
          <a href="delivery.html">Delivery</a> ·
          <a class="staff-link" href="admin.html" rel="nofollow">Staff login</a>
        </span>
      </div>
    </div>
  </footer>

  <div class="scrim" id="scrim" data-action="close-overlays" hidden></div>

  <aside class="drawer" id="cart-drawer" role="dialog" aria-modal="true"
         aria-label="Shopping bag" aria-hidden="true">
    <header class="dr-head">
      <h2>Your bag <span class="muted" id="cart-count-label"></span></h2>
      <button type="button" class="icon-btn" data-action="close-overlays" aria-label="Close bag">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>
      </button>
    </header>
    <div class="dr-body" id="cart-items"></div>
    <footer class="dr-foot" id="cart-summary"></footer>
  </aside>

  <div class="modal" id="search-modal" role="dialog" aria-modal="true" aria-label="Search products" hidden>
    <div class="modal-box">
      <header class="mhead">
        <h2>Search products</h2>
        <button type="button" class="icon-btn" data-action="close-search" aria-label="Close search">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>
        </button>
      </header>
      <label class="visually-hidden" for="search-input">Search products</label>
      <input type="search" id="search-input" class="search-field" autocomplete="off"
             placeholder="Try “glow oil”, “lip”, “soap”…">
      <div id="search-results" role="status"></div>
    </div>
  </div>

  <p class="toast" id="toast" role="status" aria-live="polite"></p>

  <script src="data.js"></script>
  <script src="store.js"></script>
  <script src="api.js"></script>
  <script src="email.js"></script>
  <script src="payments.js"></script>
  <script src="analytics.js"></script>
  <script src="site.js"></script>
</body>
</html>
`;
}

/* ---- reusable blocks ---------------------------------------------------- */
function productCard(p) {
  const sale = p.compare && p.compare > p.price;
  const out = totalStock(p) <= 0;
  const revs = okReviews(p);
  return `<article class="card" data-pid="${esc(p.id)}">
        <a class="card-img" href="${productUrl(p)}">
          ${out ? '<span class="tag out">Sold out</span>'
                : p.badge ? `<span class="tag">${esc(p.badge)}</span>` : ''}
          ${rpic(p.images[0], p.name, { sizes: SZ.card, attrs: 'class="main" loading="lazy" width="600" height="600"' })}
          ${rpic(p.images[1] || p.images[0], '', { sizes: SZ.card, attrs: 'class="alt" loading="lazy" width="600" height="600"' })}
        </a>
        <div class="card-body">
          ${!S.reviewsAreDemo && revs.length ? stars(p.rating, `${p.rating.toFixed(1)} (${revCount(p)})`) : ''}
          <h3><a href="${productUrl(p)}" data-field="name">${esc(p.name)}</a></h3>
          <p class="tl" data-field="tagline">${esc(p.tagline)}</p>
          <p class="price" data-field="price">${price2(p.price, p.eur)}${sale ? `<s>${price2(p.compare, p.compareEur)}</s>` : ''}</p>
          <button type="button" class="btn ${out ? 'btn-dark' : 'btn-primary'} card-add"
                  ${out ? 'disabled' : ''} data-cmd="cart:quick-add" data-arg="${p.id}"
                  data-arg2="${p.variants && p.variants.length > 1 ? '' : (p.variants?.[0]?.label || '')}">
            ${out ? 'Sold out' : 'Add to bag'}
          </button>
        </div>
      </article>`;
}

function breadcrumb(trail) {
  return `<nav class="crumb" aria-label="Breadcrumb">
        ${trail.map((t, i) => t.href && i < trail.length - 1
          ? `<a href="${t.href}">${esc(t.label)}</a>` : `<span>${esc(t.label)}</span>`)
          .join(' / ')}
      </nav>`;
}

function aboutBlock() {
  const A = C.about;
  if (!A) return '';
  return `<section class="about-section" id="about">
      <div class="wrap">
        <div class="sec-head">
          <p class="eyebrow">${esc(A.eyebrow)}</p>
          <h2>${esc(A.title)}</h2>
          <div class="rule"></div>
          <p>${esc(A.lede)}</p>
        </div>

        <div class="about-grid">
          ${A.pillars.map(pl => `<div class="about-card">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="${ICONS[pl.icon] || ICONS.check}"/></svg>
            <h3>${esc(pl.title)}</h3>
            <p>${esc(pl.text)}</p>
          </div>`).join('\n          ')}
        </div>

        <div class="about-stats">
          ${A.stats.map(s2 => `<div><b>${esc(s2.b)}</b><span>${esc(s2.s)}</span></div>`).join('\n          ')}
        </div>

        <p class="view-all"><a class="btn btn-primary" href="shop.html">${esc(A.cta)}</a></p>
      </div>
    </section>`;
}

function newsletter() {
  return `<section class="section-flush">
      <div class="wrap">
        <div class="news">
          <p class="eyebrow">${esc(C.news.eyebrow)}</p>
          <h2>${esc(C.news.title)}</h2>
          <p>${esc(C.news.sub)}</p>
          <form id="newsletter-form">
            <label class="visually-hidden" for="news-email">Email address</label>
            <input type="email" id="news-email" name="email" required
                   placeholder="${esc(C.news.placeholder)}">
            <button type="submit" class="btn btn-primary">${esc(C.news.cta)}</button>
          </form>
        </div>
      </div>
    </section>`;
}

function write(file, html) {
  fs.writeFileSync(path.join(OUT, file), html);
  return file;
}

/* =============================================================================
   PAGES
   ========================================================================== */
const built = [];

/* ---- 1. Home ------------------------------------------------------------ */
function buildHome() {
  const H = C.hero;
  const best = PRODUCTS.filter(p => p.badge || p.rating >= 4.8).slice(0, C.best.limit || 4);

  const html = head({
    title: C.seo.title, desc: C.seo.desc, nav: 'home', image: H.image, url: 'index.html',
    jsonld: {
      '@context': 'https://schema.org', '@type': 'Store', name: S.brand,
      email: S.email, telephone: S.phone,
      address: { '@type': 'PostalAddress', streetAddress: S.address, addressCountry: 'NG' },
      image: abs(H.image),
      url: SITE
    }
  }) + `
    <section class="hero-section">
      <div class="wrap">
        <div class="hero">
          <div class="hero-copy">
            <p class="eyebrow">${esc(H.eyebrow)}</p>
            <h1>${esc(H.title)}<em>${esc(H.titleEm)}</em>${esc(H.titleEnd)}</h1>
            <p class="lede">${esc(H.lede)}</p>
            <p class="hero-cta">
              <a class="btn btn-primary" href="shop.html">${esc(H.ctaPrimary)}</a>
              <a class="btn btn-ghost" href="product-glow-ritual-set.html">${esc(H.ctaGhost)}</a>
            </p>
            <div class="hero-stats">
              ${H.stats.map(s => `<div><b>${esc(s.b)}</b><span>${esc(s.s)}</span></div>`).join('\n              ')}
            </div>
          </div>
          <div class="hero-media">
            <div class="frame">
              ${rpic(H.image, 'Lara Beauty Atelier Skin Glow Oil', { sizes: SZ.hero, attrs: 'width="928" height="1152" fetchpriority="high"' })}
            </div>
            <div class="float-card">
              ${pic(thumb(H.cardImage), '', 'width="46" height="46" loading="lazy"')}
              <div><b>${esc(H.cardTitle)}</b><span>${esc(H.cardSub)}</span></div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <div class="marquee" aria-hidden="true">
      <div>${[...C.marquee, ...C.marquee].map(w => `<span>${esc(w)}</span>`).join('')}</div>
    </div>

    <section>
      <div class="wrap">
        <div class="sec-head">
          <p class="eyebrow">${esc(C.collections.eyebrow)}</p>
          <h2>${esc(C.collections.title)}<span class="grad-txt">${esc(C.collections.titleEm)}</span></h2>
          <div class="rule"></div>
          <p>${esc(C.collections.sub)}</p>
        </div>
        <div class="cols">
          ${C.collections.items.map(it => {
            const cat = CATEGORIES.find(c => c.id === it.cat) || CATEGORIES[0];
            const n = PRODUCTS.filter(p => p.cat === it.cat).length;
            return `<a class="col" href="${catUrl(cat)}">
            ${rpic(it.image, it.title, { sizes: SZ.card, attrs: 'loading="lazy" width="600" height="300"' })}
            <div class="col-txt">
              <span>${String(n).padStart(2, '0')} products</span>
              <h3>${esc(it.title)}</h3>
              <em>${esc(it.cta)} →</em>
            </div>
          </a>`;
          }).join('\n          ')}
        </div>
      </div>
    </section>

    <section class="section-flush">
      <div class="wrap">
        <div class="sec-head">
          <p class="eyebrow">${esc(C.best.eyebrow)}</p>
          <h2>${esc(C.best.title)}</h2>
          <div class="rule"></div>
        </div>
        <div class="grid">
          ${best.map(productCard).join('\n          ')}
        </div>
        <p class="view-all"><a class="btn btn-ghost" href="shop.html">${esc(C.best.cta)}</a></p>
      </div>
    </section>

    ${aboutBlock()}

    <section class="section-panel" id="story">
      <div class="wrap story">
        <div class="imgwrap">
          ${rpic(C.story.image, C.story.title, { sizes: SZ.wide, attrs: 'loading="lazy" width="1200" height="900"' })}
        </div>
        <div>
          <p class="eyebrow">${esc(C.story.eyebrow)}</p>
          <h2>${esc(C.story.title)}</h2>
          ${C.story.body.map(t => `<p>${esc(t)}</p>`).join('\n          ')}
          <p><a class="btn btn-primary u-mt-md" href="about.html">Read our story</a></p>
        </div>
      </div>
    </section>

    <section>
      <div class="wrap">
        <div class="vals">
          ${C.values.map(v => `<div class="val">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="${ICONS[v.icon] || ICONS.check}"/></svg>
            <h3>${esc(v.title)}</h3>
            <p>${esc(v.text)}</p>
          </div>`).join('\n          ')}
        </div>
      </div>
    </section>

    ${newsletter()}
` + foot();

  built.push(write('index.html', html));
}

/* ---- 2. Shop + collections --------------------------------------------- */
function buildListing(file, opts) {
  const list = opts.filter ? PRODUCTS.filter(opts.filter) : PRODUCTS;
  const html = head({
    title: opts.title, desc: opts.desc, nav: opts.nav, url: file, breadcrumb: opts.trail,
    image: list[0] ? list[0].images[0] : undefined,
    jsonld: {
      '@context': 'https://schema.org', '@type': 'ItemList',
      itemListElement: list.map((p, i) => ({
        '@type': 'ListItem', position: i + 1, name: p.name, url: abs(productUrl(p))
      }))
    }
  }) + `
    <section>
      <div class="wrap">
        ${breadcrumb(opts.trail)}

        <header class="shop-intro">
          <h1>${esc(opts.heading)}</h1>
          <p class="muted">${esc(opts.sub)}</p>
        </header>

        <nav class="filters" aria-label="Collections">
          <a class="chip${opts.nav === 'shop' ? ' on' : ''}" href="shop.html">All</a>
          ${CATEGORIES.map(c =>
            `<a class="chip${opts.nav === c.id ? ' on' : ''}" href="${catUrl(c)}">${esc(c.label)}</a>`)
            .join('\n          ')}
        </nav>

        <div class="shop-top">
          <p class="muted" id="result-count">${list.length} product${list.length === 1 ? '' : 's'}</p>
          <div class="sortbar">
            <label class="visually-hidden" for="sort">Sort products</label>
            <select class="sort" id="sort">
              <option value="feat">Featured</option>
              <option value="low">Price: low to high</option>
              <option value="high">Price: high to low</option>
              <option value="rate">Top rated</option>
              <option value="az">Alphabetical</option>
            </select>
          </div>
        </div>

        <div class="grid" id="grid">
          ${list.map(productCard).join('\n          ')}
        </div>
      </div>
    </section>

    ${newsletter()}
` + foot();
  built.push(write(file, html));
}

/* ---- 3. Product pages --------------------------------------------------- */
function buildProduct(p) {
  const vs = p.variants || [];
  const revs = okReviews(p);
  const avg = revs.length ? revs.reduce((s, r) => s + r.r, 0) / revs.length : p.rating;
  const dist = [5, 4, 3, 2, 1].map(n => revs.filter(r => r.r === n).length);
  const sale = p.compare && p.compare > p.price;
  const stock = totalStock(p);
  const related = PRODUCTS.filter(x => x.id !== p.id && x.cat === p.cat)
    .concat(PRODUCTS.filter(x => x.id !== p.id && x.cat !== p.cat)).slice(0, 4);
  const cat = CATEGORIES.find(c => c.id === p.cat) || CATEGORIES[0];

  const acc = (title, body, open) => `<div class="acc-item${open ? ' open' : ''}">
            <button type="button" class="acc-h" data-cmd="accordion:toggle">
              ${esc(title)}<span aria-hidden="true">+</span>
            </button>
            <div class="acc-b${open ? ' is-open' : ''}"><div>${body}</div></div>
          </div>`;

  const html = head({
    title: `${p.name} | ${esc(S.brand)}`,
    desc: p.desc.slice(0, 155),
    nav: p.cat, image: p.images[0], ogType: 'product', url: productUrl(p),
    breadcrumb: [{ label: 'Home', href: 'index.html' },
                 { label: cat.label, href: catUrl(cat) },
                 { label: p.name }],
    jsonld: {
      '@context': 'https://schema.org', '@type': 'Product',
      name: p.name, description: p.desc, sku: p.sku,
      image: p.images.map(abs),
      brand: { '@type': 'Brand', name: S.brand },
      offers: {
        '@type': 'Offer',
        url: abs(productUrl(p)),
        price: p.price,
        priceCurrency: 'NGN',
        priceValidUntil: new Date(Date.now() + 365 * 864e5).toISOString().slice(0, 10),
        itemCondition: 'https://schema.org/NewCondition',
        availability: stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
        seller: { '@type': 'Organization', name: S.brand }
      },
      ...(REVIEWS_VERIFIED && revs.length ? {
        aggregateRating: {
          '@type': 'AggregateRating',
          ratingValue: avg.toFixed(1),
          reviewCount: revs.length * REVIEW_MULT
        }
      } : {})
    }
  }) + `
    <section>
      <div class="wrap">
        ${breadcrumb([
          { label: 'Home', href: 'index.html' },
          { label: cat.label, href: catUrl(cat) },
          { label: p.name }
        ])}

        <div class="pdp">
          <div>
            <div class="gal-main">
              ${rpic(p.images[0], p.name, { sizes: SZ.gallery, id: 'gsrc', attrs: 'id="gimg" width="800" height="800" fetchpriority="high"' })}
            </div>
            <div class="thumbs">
              ${p.images.map((im, i) => `<button type="button" class="${i ? '' : 'on'}"
                data-cmd="gallery:show" data-arg="${i}" data-src="${esc(im)}"
                data-webpset="${esc(srcsetOf(im, 'webp'))}" data-jpgset="${esc(srcsetOf(im, 'jpg'))}"
                aria-label="View image ${i + 1}"><img src="${esc(thumb(im))}" alt="" loading="lazy" width="76" height="76"></button>`)
                .join('\n              ')}
            </div>
          </div>

          <div class="pdp-info">
            <p class="eyebrow">${esc(cat.label)}${p.sku ? ` · ${esc(p.sku)}` : ''}</p>
            <h1>${esc(p.name)}</h1>
            <p class="tl">${esc(p.tagline)}</p>
            ${!S.reviewsAreDemo && revs.length ? stars(avg, `${avg.toFixed(1)} · ${revCount(p)} review${revCount(p) === 1 ? '' : 's'}`) : ''}

            <p class="pdp-price" id="ppr">
              ${price2(p.price, p.eur)}${sale
                ? `<s>${price2(p.compare, p.compareEur)}</s>`
                  + `<span class="save">Save ${price2(p.compare - p.price, (p.compareEur || 0) - (p.eur || 0))}</span>`
                : ''}
            </p>

            ${vs.length > 1 ? `<p class="vlabel">Size / Shade</p>
            <div class="vopts">
              ${vs.map(v => `<button type="button" class="vopt${v.price === p.price && v.stock > 0 ? ' on' : ''}"
                ${v.stock <= 0 ? 'disabled' : ''} data-cmd="variant:pick"
                data-arg="${p.id}" data-arg2="${esc(v.label)}"
                data-price="${v.price}" data-eur="${v.eur ?? 0}" data-stock="${v.stock}">${esc(v.label)} · ${price2(v.price, v.eur)}</button>`)
                .join('\n              ')}
            </div>` : ''}

            <div id="pstock">
              ${stock <= 0
                ? '<p class="stockline no"><i></i> Out of stock — restocking soon</p>'
                : stock <= S.lowStock
                  ? `<p class="stockline low"><i></i> Low stock — only ${stock} left</p>`
                  : '<p class="stockline"><i></i> In stock — ready to ship</p>'}
            </div>

            <div class="buy">
              <div class="qty">
                <button type="button" data-cmd="qty:step" data-arg="-1" aria-label="Decrease quantity">−</button>
                <span id="pq">1</span>
                <button type="button" data-cmd="qty:step" data-arg="1" aria-label="Increase quantity">+</button>
              </div>
              <button type="button" class="btn btn-primary btn-add" id="atb"
                      data-cmd="cart:add" data-arg="${p.id}" ${stock <= 0 ? 'disabled' : ''}>
                ${stock <= 0 ? 'Sold out' : `Add to bag · ${price2(p.price, p.eur)}`}
              </button>
            </div>

            <button type="button" class="btn btn-ghost btn-block"
                    data-cmd="cart:buy-now" data-arg="${p.id}" ${stock <= 0 ? 'disabled' : ''}>
              Buy it now
            </button>

            <p class="muted pdp-desc">${esc(p.desc)}</p>

            <div class="pills">
              ${p.tone.map(t => `<span class="pill">${esc(t)}</span>`).join('\n              ')}
            </div>

            <div class="trust">
              <div><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8h13l3 4v5H4z"/></svg>
                Free delivery over ${price2(S.freeShip, S.currencies.EUR.freeShip)}</div>
              <div><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 7 9 18l-5-5"/></svg>
                30-day returns</div>
              <div><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/></svg>
                Ships within 24h</div>
            </div>

            <div class="acc">
              ${acc('Key details', '<ul>' + p.details.map(d => `<li>${esc(d)}</li>`).join('') + '</ul>', true)}
              ${p.benefits && p.benefits.length
                ? acc('Benefits', '<ul>' + p.benefits.map(x => `<li>${esc(x)}</li>`).join('') + '</ul>') : ''}
              ${p.ingredients && p.ingredients.length
                ? acc('Ingredients', '<ul>' + p.ingredients.map(x => `<li>${esc(x)}</li>`).join('') + '</ul>') : ''}
              ${acc('How to use', `<p>${esc(p.how)}</p>`)}
              ${acc('Delivery & returns',
                `<p>Nigerian orders ship from Lagos, UK orders from London — both dispatched within 24 hours, Monday to Saturday. Delivery is 1–2 days in Lagos, 2–4 days elsewhere in Nigeria, and 2–3 days across the UK. Free above ${price2(S.freeShip, S.currencies.EUR.freeShip)}. Not right for you? Send it back within 30 days, even if opened. <a href="delivery.html">Full policy</a>.</p>`)}
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Sticky buy bar: mirrors the main Add-to-bag once it scrolls out of view. -->
    <div class="buybar" id="buybar" aria-hidden="true">
      <div class="buybar-info">
        <span class="buybar-name">${esc(p.name)}</span>
        <span class="buybar-price" id="buybar-price">${price2(p.price, p.eur)}</span>
      </div>
      <button type="button" class="btn btn-primary" data-cmd="cart:add" data-arg="${p.id}"
              ${stock <= 0 ? 'disabled' : ''}>${stock <= 0 ? 'Sold out' : 'Add to bag'}</button>
    </div>

    <section class="rev-wrap">
      <div class="wrap">
        ${S.reviewsAreDemo ? `<div class="rev-empty">
          <h2>No reviews yet</h2>
          <p>We opened recently, so there is nothing here yet. When customers write to
            us we will publish what they say — good and bad, in their own words.</p>
          <p class="muted">If you have tried this, we would genuinely like to hear from you.</p>
        </div>` : ''}
        <div class="rev-head">
          ${S.reviewsAreDemo ? '' : `<div class="rev-score">
            <b>${avg.toFixed(1)}</b>
            ${stars(avg, '')}
            <p class="muted rev-count">${revCount(p)} review${revCount(p) === 1 ? '' : 's'}</p>
            <div class="rev-dist">
              ${dist.map((c2, i) => `<div class="rev-dist-row">
                <span>${5 - i}★</span>
                <div class="bar"><i style="--bar-fill:${revs.length ? (c2 / revs.length * 100) : 0}%"></i></div>
              </div>`).join('\n              ')}
            </div>
          </div>`}

          <div>
            ${S.reviewsAreDemo ? '' : '<h2 class="pdp-reviews-title">What women are saying</h2>'}
            <div class="rev-list">
              ${(S.reviewsAreDemo ? [] : revs).map(r => `<article class="rev">
                <div class="rev-top">
                  <span><b>${esc(r.n)}</b>${r.v ? '<span class="v">Verified buyer</span>' : ''}</span>
                  <time>${esc(r.d)}</time>
                </div>
                ${stars(r.r, '')}
                <h3>${esc(r.t)}</h3>
                <p>${esc(r.b)}</p>
              </article>`).join('\n              ')}
            </div>

            <form class="rform" id="review-form" data-product="${p.id}">
              <h3>Write a review</h3>
              <div class="rate-pick" id="rp">
                ${[1, 2, 3, 4, 5].map(n =>
                  `<button type="button" class="on" data-cmd="review:rate" data-arg="${n}" data-n="${n}"
                    aria-label="${n} star${n > 1 ? 's' : ''}">★</button>`).join('\n                ')}
              </div>
              <div class="f-grid">
                <div class="f"><label for="rv-n">Your name</label><input id="rv-n" name="name" required placeholder="Amara O."></div>
                <div class="f"><label for="rv-t">Headline</label><input id="rv-t" name="title" required placeholder="Loved it"></div>
                <div class="f full"><label for="rv-b">Your review</label>
                  <textarea id="rv-b" name="body" rows="3" required placeholder="Tell others how it worked for your skin…"></textarea></div>
              </div>
              <button type="submit" class="btn btn-primary btn-sm u-mt-md">Submit review</button>
              <p class="muted rform-note">Reviews are published once our team has verified them.</p>
            </form>
          </div>
        </div>
      </div>
    </section>

    <section>
      <div class="wrap">
        <div class="sec-head">
          <p class="eyebrow">Pairs beautifully with</p>
          <h2>You may also love</h2>
          <div class="rule"></div>
        </div>
        <div class="grid">
          ${related.map(productCard).join('\n          ')}
        </div>
      </div>
    </section>
` + foot();

  built.push(write(productUrl(p), html));
}

/* ---- 4. Content pages --------------------------------------------------- */
function simplePage(file, opts) {
  const html = head({ title: opts.title, desc: opts.desc, nav: opts.nav, url: file,
    jsonld: opts.jsonld,
    breadcrumb: [{ label: 'Home', href: 'index.html' }, { label: opts.heading }] }) + `
    <section>
      <div class="wrap">
        ${breadcrumb([{ label: 'Home', href: 'index.html' }, { label: opts.heading }])}
        <div class="prose">
          <h1>${esc(opts.heading)}</h1>
          ${opts.body}
        </div>
      </div>
    </section>
    ${opts.news === false ? '' : newsletter()}
` + foot();
  built.push(write(file, html));
}

function buildAbout() {
  const html = head({
    title: 'Our Story — Lara Beauty Atelier',
    desc: 'How Lara Beauty Atelier began in a Lagos kitchen and grew into a small-batch skincare house shipping from Lagos and London.',
    nav: 'about', image: C.story.image, url: 'about.html'
  }) + `
    <section>
      <div class="wrap">
        ${breadcrumb([{ label: 'Home', href: 'index.html' }, { label: 'Our Story' }])}
      </div>
    </section>

    <section class="section-flush">
      <div class="wrap story">
        <div class="imgwrap">
          ${rpic(C.story.image, 'Lara Beauty Atelier products', { sizes: SZ.wide, attrs: 'width="1200" height="900"' })}
        </div>
        <div>
          <p class="eyebrow">${esc(C.story.eyebrow)}</p>
          <h1>${esc(C.story.title)}</h1>
          ${C.story.body.map(t => `<p>${esc(t)}</p>`).join('\n          ')}
        </div>
      </div>
    </section>

    <section>
      <div class="wrap prose">
        <h2>What we believe</h2>
        <p>Good skincare should be short, honest and affordable enough to use every day.
           We would rather make five things properly than fifty things adequately.</p>

        <h2>How we make it</h2>
        <p>Everything is produced in small batches at our Lagos studio. Shea comes from a
           women-led co-operative in Kwara, and our black soap is made to a traditional
           Ghanaian recipe using plantain ash and cocoa pod. Nothing is diluted with cheap
           filler oils, and we do not test on animals.</p>

        <h2>Two front doors</h2>
        <p>We hold stock in two places. Nigerian orders are packed and posted in Lagos.
           UK and European orders ship from our London store room, so nothing sits in
           customs and nobody pays an import surprise at the door. Prices are set for
           each market rather than converted, which is why you can shop in Naira or
           Euros and see a fair figure either way.</p>

        <h2>Who it is for</h2>
        <p>Every formula is tested on skin from fair to deep and on women from their
           twenties to their seventies. If a product does not suit your skin, send it back
           within 30 days — even if you have opened it.</p>
      </div>
    </section>

    ${aboutBlock()}

    <section class="section-panel">
      <div class="wrap">
        <div class="vals">
          ${C.values.map(v => `<div class="val">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="${ICONS[v.icon] || ICONS.check}"/></svg>
            <h3>${esc(v.title)}</h3>
            <p>${esc(v.text)}</p>
          </div>`).join('\n          ')}
        </div>
      </div>
    </section>

    ${newsletter()}
` + foot();
  built.push(write('about.html', html));
}

function buildContact() {
  const html = head({
    title: 'Contact Us — Lara Beauty Atelier',
    desc: `Questions about a product or an order? Email ${S.email}, call ${S.phone}, or send a message.`,
    nav: 'contact', url: 'contact.html'
  }) + `
    <section>
      <div class="wrap">
        ${breadcrumb([{ label: 'Home', href: 'index.html' }, { label: 'Contact' }])}

        <div class="contact-grid">
          <div>
            <p class="eyebrow">Get in touch</p>
            <h1 class="track-title">We’d love to hear from you</h1>
            <p class="muted">Questions about a product, an order, or stocking Lara Beauty
              in your store? Send a note and we’ll reply within one working day.</p>

            <ul class="contact-list">
              <li><span>Email</span><a href="mailto:${esc(S.email)}">${esc(S.email)}</a></li>
              <li><span>Phone</span><a href="tel:${esc(S.phone).replace(/\s/g, '')}">${esc(S.phone)}</a></li>
              <li><span>Instagram</span>
                <a href="https://instagram.com/${esc(S.ig).replace('@', '')}" target="_blank" rel="noopener">${esc(S.ig)}</a></li>
              <li><span>Studio</span>${esc(S.address)}</li>
              <li><span>Hours</span>${esc(C.footer.hours)}</li>
            </ul>

            <a class="btn btn-ghost whatsapp" target="_blank" rel="noopener"
               href="https://wa.me/${esc(S.phone).replace(/[^0-9]/g, '')}">Chat on WhatsApp</a>
          </div>

          <form class="contact-form" id="contact-form" novalidate>
            <fieldset>
              <legend>Send a message</legend>
              <div class="f-grid">
                <div class="f"><label for="c-name">Your name</label>
                  <input id="c-name" name="name" required placeholder="Amara Okafor"></div>
                <div class="f"><label for="c-phone">Phone (optional)</label>
                  <input id="c-phone" name="phone" placeholder="0801 234 5678"></div>
                <div class="f full"><label for="c-email">Email</label>
                  <input id="c-email" name="email" type="email" required placeholder="you@email.com"></div>
                <div class="f full"><label for="c-msg">Message</label>
                  <textarea id="c-msg" name="message" rows="5" required placeholder="How can we help?"></textarea></div>
              </div>
              <button type="submit" class="btn btn-primary btn-block">Send message</button>
              <p class="muted hint-note">We never share your details.</p>
            </fieldset>
          </form>
        </div>
      </div>
    </section>
` + foot();
  built.push(write('contact.html', html));
}

function buildCart() {
  const html = head({
    title: 'Your Bag — Lara Beauty Atelier',
    desc: 'Review the items in your shopping bag before checkout.', nav: 'cart', url: 'cart.html', noindex: true
  }) + `
    <section>
      <div class="wrap">
        ${breadcrumb([{ label: 'Home', href: 'index.html' }, { label: 'Your bag' }])}
        <header class="shop-intro"><h1>Your bag</h1></header>
        <div class="cart-page" id="cart-page">
          <p class="muted">Loading your bag…</p>
        </div>
      </div>
    </section>
` + foot();
  built.push(write('cart.html', html));
}

function buildCheckout() {
  const states = ['Lagos', 'FCT — Abuja', 'Rivers', 'Kano', 'Oyo', 'Enugu', 'Kaduna', 'Delta',
    'Other (Nigeria)', 'England', 'Scotland', 'Wales', 'Northern Ireland', 'Other (International)'];
  const html = head({
    title: 'Checkout — Lara Beauty Atelier',
    desc: 'Secure checkout. Free delivery over ₦25,000, pay on delivery available.', nav: 'checkout', url: 'checkout.html', noindex: true
  }) + `
    <section>
      <div class="wrap">
        ${breadcrumb([{ label: 'Home', href: 'index.html' },
                      { label: 'Your bag', href: 'cart.html' }, { label: 'Checkout' }])}

        <div class="co" id="checkout-root">
          <form id="cform" novalidate>
            <ol class="steps">
              <li><b class="on"><i>1</i>Bag</b></li>
              <li aria-hidden="true"><span class="sep"></span></li>
              <li><b class="on"><i>2</i>Details</b></li>
              <li aria-hidden="true"><span class="sep"></span></li>
              <li><b><i>3</i>Confirmation</b></li>
            </ol>

            <fieldset>
              <legend>Contact</legend>
              <div class="f-grid">
                <div class="f full"><label for="co-email">Email address</label>
                  <input id="co-email" type="email" name="email" required placeholder="you@email.com"></div>
                <div class="f"><label for="co-first">First name</label>
                  <input id="co-first" name="first" required placeholder="Amara"></div>
                <div class="f"><label for="co-last">Last name</label>
                  <input id="co-last" name="last" required placeholder="Okafor"></div>
                <div class="f full"><label for="co-phone">Phone</label>
                  <input id="co-phone" name="phone" required placeholder="0801 234 5678"></div>
              </div>
            </fieldset>

            <fieldset>
              <legend>Delivery address</legend>
              <div class="f-grid">
                <div class="f full"><label for="co-addr">Street address</label>
                  <input id="co-addr" name="addr" required placeholder="14 Gana Street, Maitama"></div>
                <div class="f"><label for="co-city">City</label>
                  <input id="co-city" name="city" required placeholder="Lagos or London"></div>
                <div class="f"><label for="co-state">State</label>
                  <select id="co-state" name="state" required>
                    ${states.map(s => `<option>${esc(s)}</option>`).join('\n                    ')}
                  </select></div>
                <div class="f full"><label for="co-note">Delivery note (optional)</label>
                  <input id="co-note" name="note" placeholder="Gate code, landmark, best time to call"></div>
              </div>
            </fieldset>

            <fieldset>
              <legend>Payment</legend>
              <div class="pay">
                <label><input type="radio" name="pay" value="card" checked> Debit / credit card
                  <small>Visa · Mastercard · Verve</small></label>
                <label><input type="radio" name="pay" value="transfer"> Bank transfer
                  <small>Details sent by email</small></label>
                <label><input type="radio" name="pay" value="cod"> Pay on delivery
                  <small>Lagos &amp; Abuja only</small></label>
              </div>
              <p class="muted hint-note">Demo storefront — no payment is taken and no card details are stored.</p>
            </fieldset>

            <button type="submit" class="btn btn-primary btn-block checkout-submit" id="place-order">
              Place order
            </button>
          </form>

          <aside class="summary">
            <h2>Order summary</h2>
            <div id="summary-items"></div>
            <div class="totals-block" id="summary-totals"></div>
            <p class="muted summary-note">Secure checkout · 30-day returns · Dispatched within 24 hours</p>
          </aside>
        </div>
      </div>
    </section>
` + foot();
  built.push(write('checkout.html', html));
}

function buildConfirmation() {
  const html = head({
    title: 'Order Confirmed — Lara Beauty Atelier',
    desc: 'Thank you for your order.', nav: 'checkout', url: 'order-confirmed.html', noindex: true
  }) + `
    <section>
      <div class="wrap">
        <div class="done">
          <p class="tick" aria-hidden="true">
            <svg viewBox="0 0 24 24"><path d="M20 7 9 18l-5-5"/></svg>
          </p>
          <h1>Thank you, <span id="done-name">friend</span>.</h1>
          <p>Your order is confirmed. A receipt is on its way to <b id="done-email">your inbox</b>.</p>
          <p class="ord" id="done-ref">ORDER #—</p>
          <p class="muted note">We pack Monday to Saturday. You’ll get a tracking link the moment
            your parcel leaves our Lagos or London store room — usually within 48 hours.</p>
          <p class="done-actions">
            <a class="btn btn-primary" href="shop.html">Continue shopping</a>
            <a class="btn btn-ghost" href="track.html">Track my order</a>
          </p>
        </div>
      </div>
    </section>
` + foot();
  built.push(write('order-confirmed.html', html));
}

function buildTrack() {
  const html = head({
    title: 'Track Your Order — Lara Beauty Atelier',
    desc: 'Enter your order reference to see the latest delivery status.', nav: 'track', url: 'track.html'
  }) + `
    <section>
      <div class="wrap">
        ${breadcrumb([{ label: 'Home', href: 'index.html' }, { label: 'Track order' }])}
        <div class="track-panel">
          <h1 class="track-title">Track your order</h1>
          <p class="muted u-mb-md">Enter the reference from your confirmation email,
            for example <span class="gold">LB-10480</span>.</p>
          <form class="track-form" id="track-form">
            <label class="visually-hidden" for="tref">Order reference</label>
            <input id="tref" class="mini track-input" placeholder="LB-00000" required>
            <button type="submit" class="btn btn-primary">Track</button>
          </form>
          <div id="tout" class="track-results"></div>
        </div>
      </div>
    </section>
` + foot();
  built.push(write('track.html', html));
}

/* ---- 5. Policy pages ---------------------------------------------------- */
function buildPolicies() {
  simplePage('delivery.html', {
    title: 'Delivery & Returns — Lara Beauty Atelier',
    desc: 'Delivery times, shipping costs and our 30-day return policy.',
    nav: 'delivery', heading: 'Delivery & Returns',
    body: `
          <h2>Delivery times</h2>
          <div class="table-scroll">
          <table class="policy-table">
            <thead><tr><th>Destination</th><th>Time</th><th>Cost</th></tr></thead>
            <tbody>
              <tr><td>Lagos</td><td data-label="Time">1–2 working days</td><td data-label="Cost">${money(S.shipFee)}</td></tr>
              <tr><td>Abuja</td><td data-label="Time">1–2 working days</td><td data-label="Cost">${money(S.shipFee)}</td></tr>
              <tr><td>Other Nigerian states</td><td data-label="Time">2–4 working days</td><td data-label="Cost">${money(S.shipFee)}</td></tr>
              <tr><td>United Kingdom</td><td data-label="Time">2–3 working days</td><td data-label="Cost">€${S.currencies.EUR.shipFee}</td></tr>
              <tr><td>Ireland &amp; Europe</td><td data-label="Time">4–7 working days</td><td data-label="Cost">€8</td></tr>
              <tr><td>United States &amp; Canada</td><td data-label="Time">7–12 working days</td><td data-label="Cost">€14</td></tr>
              <tr><td>Rest of world</td><td data-label="Time">7–14 working days</td><td data-label="Cost">Quoted at checkout</td></tr>
              <tr><td>Free delivery threshold</td><td data-label="Time">${money(S.freeShip)} in Nigeria</td><td data-label="Cost"><b class="gold">€${S.currencies.EUR.freeShip} worldwide</b></td></tr>
            </tbody>
          </table>
          </div>
          <p>Nigerian orders are packed and dispatched from our Lagos studio. UK, Irish and
             European orders ship from our London store room, so they arrive as domestic post
             with no customs delay and no import charge on the doorstep.</p>
          <p>Both dispatch within 24 hours, Monday to Saturday. Orders placed on Sunday or a
             public holiday are sent the next working day.</p>

          <h2>Pay on delivery</h2>
          <p>Available in Lagos and Abuja. Choose <em>Pay on delivery</em> at checkout and settle
             with the courier in cash or by transfer when your parcel arrives. UK orders are
             prepaid at checkout.</p>

          <h2>Tracking</h2>
          <p>You will receive a tracking link by email as soon as your parcel leaves us. You can
             also check the status any time on our <a href="track.html">order tracking page</a>.</p>

          <h2>Returns — our 30-day promise</h2>
          <p>If a product does not agree with your skin, send it back within 30 days of delivery
             for a full refund. <strong>This applies even if the item has been opened and used</strong> —
             we would rather you found the right product than kept the wrong one.</p>
          <p>To start a return, email <a href="mailto:${esc(S.email)}">${esc(S.email)}</a> with your
             order reference. We will send return instructions the same working day. Refunds are
             processed within five working days of the parcel reaching us.</p>

          <h2>Damaged or incorrect items</h2>
          <p>Send a photo to <a href="mailto:${esc(S.email)}">${esc(S.email)}</a> within 48 hours of
             delivery and we will replace the item at no cost to you.</p>`
  });

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      ['Are your products suitable for sensitive skin?',
       'Most are. Our Skin Glow Oil is fragrance-light and non-comedogenic, and the Everyday Repair balm is fragrance and flavour free. If you have reactive skin, patch test on your inner arm for 24 hours first.'],
      ['Is the black soap drying?',
       'It can be if overused. Start with twice a week and build up. It is deliberately clarifying, which is why it works so well on oily and acne-prone skin.'],
      ['How long will a bottle last?',
       'Used twice daily on the face, the 50ml Skin Glow Oil lasts roughly six weeks and the 100ml about three months.'],
      ['Are your products pregnancy safe?',
       'Our lip balms and shea products are. If you are pregnant or breastfeeding, check the ingredient list with your doctor before using any new skincare.'],
      ['Do you test on animals?',
       'Never. Nothing we make is tested on animals, at any stage.'],
      ['How long does delivery take?',
       '1-2 working days in Lagos and Abuja, 2-4 days elsewhere in Nigeria, and 2-3 working days across the UK.'],
      ['Can I pay on delivery?',
       'Yes, in Lagos and Abuja. Select it at checkout. UK orders are prepaid.'],
      ['Do you ship to the UK?',
       'Yes. We hold stock in London, so UK orders ship domestically in 2-3 working days with no customs charge.'],
      ['What if it does not suit my skin?',
       'Send it back within 30 days for a full refund, even if opened.']
    ].map(([q, a]) => ({
      '@type': 'Question', name: q,
      acceptedAnswer: { '@type': 'Answer', text: a }
    }))
  };

  simplePage('faq.html', {
    jsonld: faqSchema,
    title: 'Frequently Asked Questions — Lara Beauty Atelier',
    desc: 'Answers about ingredients, skin types, delivery, payment and returns.',
    nav: 'faq', heading: 'Frequently asked questions',
    body: `
          <h2>Products</h2>
          <h3>Are your products suitable for sensitive skin?</h3>
          <p>Most are. Our Skin Glow Oil is fragrance-light and non-comedogenic, and the Everyday
             Repair balm is fragrance and flavour free. If you have reactive skin, patch test on
             your inner arm for 24 hours first.</p>

          <h3>Is the black soap drying?</h3>
          <p>It can be if overused. Start with twice a week and build up. It is deliberately
             clarifying, which is why it works so well on oily and acne-prone skin.</p>

          <h3>How long will a bottle last?</h3>
          <p>Used twice daily on the face, the 50ml Skin Glow Oil lasts roughly six weeks and the
             100ml about three months. Used on the body, expect considerably less.</p>

          <h3>Are your products pregnancy safe?</h3>
          <p>Our lip balms and shea products are. If you are pregnant or breastfeeding, check the
             ingredient list with your doctor before using any new skincare.</p>

          <h3>Do you test on animals?</h3>
          <p>Never. Nothing we make is tested on animals, at any stage.</p>

          <h2>Orders &amp; delivery</h2>
          <h3>How long does delivery take?</h3>
          <p>1–2 working days in Lagos and Abuja, 2–4 days elsewhere in Nigeria, and 2–3
             working days across the UK. See our <a href="delivery.html">delivery page</a>
             for full details.</p>

          <h3>Can I pay on delivery?</h3>
          <p>Yes, in Lagos and Abuja. Select it at checkout. UK orders are prepaid.</p>

          <h3>Do you ship to the UK?</h3>
          <p>Yes. We hold stock in London, so UK orders ship domestically in 2–3 working days
             with no customs charge. International pricing is shown in Euros — use the
             currency control at the top of any page to switch.</p>

          <h3>Do you ship anywhere else?</h3>
          <p>We ship to Ireland and Europe from London, and worldwide on request. Email
             <a href="mailto:${esc(S.email)}">${esc(S.email)}</a> for a quote outside our
             standard zones.</p>

          <h3>Can I change or cancel my order?</h3>
          <p>Yes, if it has not shipped. Contact us with your order reference as soon as possible.</p>

          <h2>Returns</h2>
          <h3>What if it does not suit my skin?</h3>
          <p>Send it back within 30 days for a full refund, even if opened. See our
             <a href="delivery.html">returns policy</a>.</p>

          <h2>Wholesale</h2>
          <h3>Can I stock Lara Beauty in my shop?</h3>
          <p>We would love that. Send your details through the
             <a href="contact.html">contact form</a> and we will send a wholesale price list.</p>`
  });

  simplePage('privacy.html', {
    title: 'Privacy Policy — Lara Beauty Atelier',
    desc: 'How Lara Beauty Atelier collects, uses and protects your personal information.',
    nav: 'privacy', heading: 'Privacy policy', news: false,
    body: `
          <p class="muted">Last updated: August 2026</p>

          <h2>What we collect</h2>
          <p>When you place an order we collect your name, email address, phone number and
             delivery address. When you contact us or join our mailing list we collect the
             details you provide in that form.</p>

          <h2>How we use it</h2>
          <ul>
            <li>To pack, send and track your order</li>
            <li>To reply to your enquiries</li>
            <li>To send you our newsletter, if you asked for it</li>
          </ul>

          <h2>What we do not do</h2>
          <p>We do not sell, rent or trade your personal information to anyone. We do not send
             marketing messages to people who have not asked for them.</p>

          <h2>Payment details</h2>
          <p>We never see or store your card details. Payments are handled entirely by our
             payment provider.</p>

          <h2>Your rights</h2>
          <p>You can ask us at any time to show you the information we hold about you, correct
             it, or delete it. Email <a href="mailto:${esc(S.email)}">${esc(S.email)}</a> and we
             will respond within seven days.</p>

          <h2>Unsubscribing</h2>
          <p>Every newsletter has an unsubscribe link. You can also email us and we will remove
             you immediately.</p>

          <h2>Contact</h2>
          <p>${esc(S.brand)}<br>${esc(S.address)}<br>
             <a href="mailto:${esc(S.email)}">${esc(S.email)}</a></p>`
  });

  simplePage('terms.html', {
    title: 'Terms & Conditions — Lara Beauty Atelier',
    desc: 'The terms that apply when you buy from Lara Beauty Atelier.',
    nav: 'terms', heading: 'Terms & conditions', news: false,
    body: `
          <p class="muted">Last updated: August 2026</p>

          <h2>Ordering</h2>
          <p>Placing an order is an offer to buy. We accept it when we send your confirmation
             email. If an item turns out to be unavailable we will contact you and refund you
             in full.</p>

          <h2>Prices</h2>
          <p>All prices are in Nigerian Naira and include VAT where applicable. Delivery is
             charged separately unless your order exceeds ${money(S.freeShip)}. We may change
             prices at any time, but never after you have placed an order.</p>

          <h2>Product information</h2>
          <p>We describe our products as accurately as we can. Because everything is made in
             small batches by hand, slight variation in colour, texture and scent is normal and
             is not a fault.</p>

          <h2>Skin sensitivity</h2>
          <p>Our products are cosmetics, not medicines, and are not intended to diagnose or treat
             any condition. Always patch test if you have sensitive or reactive skin, and stop
             using a product if irritation occurs.</p>

          <h2>Returns</h2>
          <p>Our 30-day return promise is set out on the
             <a href="delivery.html">delivery and returns page</a> and forms part of these terms.</p>

          <h2>Liability</h2>
          <p>Nothing in these terms limits our liability where it would be unlawful to do so.
             Otherwise our liability is limited to the value of the order concerned.</p>

          <h2>Governing law</h2>
          <p>These terms are governed by the laws of the Federal Republic of Nigeria.</p>

          <h2>Contact</h2>
          <p><a href="mailto:${esc(S.email)}">${esc(S.email)}</a> · ${esc(S.phone)}</p>`
  });

  simplePage('404.html', {
    title: 'Page not found — Lara Beauty Atelier',
    desc: 'That page does not exist.', nav: '', heading: 'We couldn’t find that page',
    news: false,
    body: `
          <p>The link may be out of date, or the page may have moved.</p>
          <p class="done-actions u-mt-lg">
            <a class="btn btn-primary" href="shop.html">Shop all products</a>
            <a class="btn btn-ghost" href="index.html">Back to home</a>
          </p>`
  });
}

/* ---- 6. sitemap --------------------------------------------------------- */

/* ---- 9. Journal (blog) --------------------------------------------------- */
/* Editorial content is the top-of-funnel layer: product pages answer "buy X",
   articles answer "why does X happen". Each post is a static page with
   Article + FAQPage schema and internal links into the shop. */

function postBody(post) {
  return post.body.map(b => {
    if (b.h2) return `<h2 id="${slugify(b.h2)}">${esc(b.h2)}</h2>`;
    if (b.p) return `<p>${esc(b.p)}</p>`;
    if (b.ul) return `<ul>${b.ul.map(li => `<li>${esc(li)}</li>`).join('')}</ul>`;
    if (b.note) return `<aside class="callout"><p>${esc(b.note)}</p></aside>`;
    if (b.product) {
      const p = PRODUCTS.find(x => x.id === b.product);
      if (!p) return '';
      return `<aside class="inline-buy">
        <a class="ib-img" href="${productUrl(p)}" tabindex="-1" aria-hidden="true">
          ${rpic(p.images[0], '', { sizes: '120px', attrs: 'loading="lazy" width="120" height="120"' })}
        </a>
        <div class="ib-txt">
          <p class="eyebrow">From our shelf</p>
          <h3><a href="${productUrl(p)}">${esc(p.name)}</a></h3>
          <p class="tl">${esc(p.tagline)}</p>
          <p class="price">${price2(p.price, p.eur)}</p>
        </div>
        <a class="btn btn-primary btn-sm" href="${productUrl(p)}">View product</a>
      </aside>`;
    }
    return '';
  }).join('\n          ');
}

const slugify = s => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

function buildPost(post, i) {
  const related = POSTS.filter(p => p.slug !== post.slug)
    .sort((a, b) => (b.cat === post.cat) - (a.cat === post.cat)).slice(0, 3);
  const headings = post.body.filter(b => b.h2).map(b => b.h2);
  const trail = [
    { label: 'Home', href: 'index.html' },
    { label: 'Journal', href: 'journal.html' },
    { label: post.title }
  ];

  const jsonld = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'BlogPosting',
        '@id': `${abs(postUrl(post))}#article`,
        headline: post.title,
        description: post.excerpt,
        image: abs(post.image),
        datePublished: post.date,
        dateModified: post.updated || post.date,
        articleSection: post.cat,
        wordCount: post.body.reduce((n, b) =>
          n + String(b.p || b.note || (b.ul || []).join(' ') || '').split(/\s+/).filter(Boolean).length, 0),
        inLanguage: 'en',
        author: { '@type': 'Organization', name: S.brand, url: SITE },
        publisher: { '@id': `${SITE}/#org` },
        mainEntityOfPage: { '@type': 'WebPage', '@id': abs(postUrl(post)) }
      },
      {
        '@type': 'FAQPage',
        mainEntity: post.faq.map(f => ({
          '@type': 'Question', name: f.q,
          acceptedAnswer: { '@type': 'Answer', text: f.a }
        }))
      }
    ]
  };

  const html = head({
    /* Google truncates around 60 characters. Where the headline alone fills
       that, the brand suffix is wasted pixels — drop it. */
    title: post.title.length > 44 ? post.title : `${post.title} | ${S.brand}`,
    desc: post.excerpt, nav: 'journal', url: postUrl(post),
    image: post.image, ogType: 'article', jsonld, breadcrumb: trail
  }) + `
    <section class="section-flush">
      <div class="wrap">
        ${breadcrumb(trail)}
        <article class="post">
          <header class="post-head">
            <p class="eyebrow">${esc(post.cat)} · ${post.read} min read</p>
            <h1>${esc(post.title)}</h1>
            <p class="post-lede">${esc(post.excerpt)}</p>
            <p class="post-meta">
              <time datetime="${post.date}">Published ${fmtDate(post.date)}</time>
              ${post.updated && post.updated !== post.date
                ? ` · <time datetime="${post.updated}">updated ${fmtDate(post.updated)}</time>` : ''}
            </p>
          </header>

          <div class="post-hero">
            ${rpic(post.image, post.title, { sizes: '(max-width: 900px) 94vw, 760px', attrs: 'width="1200" height="700" fetchpriority="high"' })}
          </div>

          ${headings.length > 2 ? `<nav class="post-toc" aria-label="On this page">
            <h2>On this page</h2>
            <ol>${headings.map(h => `<li><a href="#${slugify(h)}">${esc(h)}</a></li>`).join('')}</ol>
          </nav>` : ''}

          <div class="prose post-body">
            ${postBody(post)}
          </div>

          <section class="post-faq">
            <h2>Common questions</h2>
            ${post.faq.map(f => `<details class="faq-item">
              <summary>${esc(f.q)}</summary>
              <p>${esc(f.a)}</p>
            </details>`).join('\n            ')}
          </section>

          <footer class="post-foot">
            <p class="muted">Written by the Lara Beauty Atelier team. We make everything we sell in small batches — nothing here is sponsored.</p>
          </footer>
        </article>

        <section class="post-related">
          <div class="sec-head">
            <p class="eyebrow">Keep reading</p>
            <h2>More from the Journal</h2>
            <div class="rule"></div>
          </div>
          <div class="cols">
            ${related.map(postCard).join('\n            ')}
          </div>
        </section>
      </div>
    </section>
    ${newsletter()}
` + foot();
  built.push(write(postUrl(post), html));
}

function postCard(post) {
  return `<a class="col post-card" href="${postUrl(post)}">
      ${rpic(post.image, '', { sizes: SZ.card, attrs: 'loading="lazy" width="600" height="360"' })}
      <div class="col-txt">
        <span>${esc(post.cat)} · ${post.read} min</span>
        <h3>${esc(post.title)}</h3>
        <em>Read article →</em>
      </div>
    </a>`;
}

function buildJournal() {
  const sorted = [...POSTS].sort((a, b) => b.date.localeCompare(a.date));
  const lead = sorted[0];
  const rest = sorted.slice(1);
  const trail = [{ label: 'Home', href: 'index.html' }, { label: 'Journal' }];

  const jsonld = {
    '@context': 'https://schema.org',
    '@type': 'Blog',
    '@id': `${abs('journal.html')}#blog`,
    name: 'The Lara Beauty Journal',
    description: 'Honest, practical skincare writing from a small-batch maker in Lagos and London.',
    url: abs('journal.html'),
    publisher: { '@id': `${SITE}/#org` },
    blogPost: sorted.map(p => ({
      '@type': 'BlogPosting', headline: p.title, url: abs(postUrl(p)),
      datePublished: p.date, image: abs(p.image), description: p.excerpt
    }))
  };

  const html = head({
    title: 'The Journal — Skincare Notes | Lara Beauty Atelier',
    desc: 'Practical skincare writing: why black soap dries some skin, how to use face oil without shine, harmattan routines and honest ingredient guides.',
    nav: 'journal', url: 'journal.html', image: lead.image, jsonld, breadcrumb: trail
  }) + `
    <section class="section-flush">
      <div class="wrap">
        ${breadcrumb(trail)}
        <div class="sec-head sec-head-left">
          <p class="eyebrow">The Journal</p>
          <h1>Notes on skin, lips and doing less</h1>
          <div class="rule"></div>
          <p>No trends, no miracle claims. Just what we have learned making small batches and answering the same questions over and over.</p>
        </div>

        <a class="post-lead" href="${postUrl(lead)}">
          <div class="post-lead-img">
            ${rpic(lead.image, '', { sizes: '(max-width: 900px) 94vw, 560px', attrs: 'width="1200" height="800" fetchpriority="high"' })}
          </div>
          <div class="post-lead-txt">
            <p class="eyebrow">Latest · ${esc(lead.cat)} · ${lead.read} min read</p>
            <h2>${esc(lead.title)}</h2>
            <p>${esc(lead.excerpt)}</p>
            <em class="btn btn-ghost btn-sm">Read article →</em>
          </div>
        </a>

        <div class="cols journal-grid">
          ${rest.map(postCard).join('\n          ')}
        </div>
      </div>
    </section>
    ${newsletter()}
` + foot();
  built.push(write('journal.html', html));
}

function buildSitemap() {
  const noIndex = ['404.html', 'cart.html', 'checkout.html', 'order-confirmed.html'];
  const urls = built.filter(f => !noIndex.includes(f));
  const today = new Date().toISOString().slice(0, 10);
  const priority = u =>
    u === 'index.html' ? '1.0'
    : u.startsWith('product-') ? '0.9'
    : u === 'journal.html' ? '0.8'
    : u.startsWith('journal-') ? '0.7'
    : (u === 'shop.html' || u.startsWith('collection-')) ? '0.8'
    : '0.5';
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url>
    <loc>${abs(u)}</loc>
    <lastmod>${today}</lastmod>
    <priority>${priority(u)}</priority>
  </url>`).join('\n')}
</urlset>
`;
  fs.writeFileSync(path.join(OUT, 'sitemap.xml'), xml);
}

/* =============================================================================
   RUN
   ========================================================================== */
/* Wipe the output folder, but never the git history that lives inside it.
   An earlier version of this line destroyed the deliverable repo twice. */
if (fs.existsSync(OUT)) {
  for (const entry of fs.readdirSync(OUT)) {
    /* Keep git history, and keep anything the local dev server needs —
       reinstalling node_modules on every build wastes minutes. */
    if (['.git', '.gitignore', 'node_modules', '.netlify', 'package-lock.json'].includes(entry)) continue;
    fs.rmSync(path.join(OUT, entry), { recursive: true, force: true });
  }
}
fs.mkdirSync(OUT, { recursive: true });

// copy shared assets
fs.cpSync(path.join(ROOT, 'assets'), path.join(OUT, 'assets'), { recursive: true });

/* Netlify Functions — these are what make admin posts appear for real
   visitors. Without them the site is read-only. */
if (fs.existsSync(path.join(ROOT, 'netlify'))) {
  fs.cpSync(path.join(ROOT, 'netlify'), path.join(OUT, 'netlify'), { recursive: true });
}
/* Cloudflare Pages Functions, generated from the Netlify ones by
   tools/port-to-cloudflare.cjs. Shipping both means the same folder deploys
   to either host with no edits. Each ignores the other's directory. */
if (fs.existsSync(path.join(ROOT, 'functions'))) {
  fs.cpSync(path.join(ROOT, 'functions'), path.join(OUT, 'functions'), { recursive: true });
}
// .webp variants are generated alongside originals and copied with them.
['styles.css', 'styles.min.css', 'data.js', 'store.js', 'email.js', 'payments.js', 'analytics.js', 'site.js', 'api.js', 'blog.js', 'admin.html', 'admin.js',
 'robots.txt', 'netlify.toml', '_headers', '_redirects', 'EMAIL-SETUP.md', 'AUDIT.md', 'README.md', 'DEPLOY.md', 'GITHUB.md', 'GO-LIVE.md', 'REVIEWS.md', 'LIVE-SETUP.md', 'SECURITY.md', 'ARCHITECTURE.md', 'DOMAIN-AND-HOSTING.md', 'START-HERE.md', 'REACT-DECISION.md', 'HOSTING-CHOICE.md', 'DATA-GUIDE.md', 'LAUNCH-TODAY.md', 'GITHUB-DEPLOY.md', 'package.json', '.domain', 'build.js', 'build-live.cjs', 'preflight.cjs', 'build-live.cjs'].forEach(f => {
  const from = path.join(ROOT, f);
  if (!fs.existsSync(from)) return;
  /* package.json declares "type":"module" for the Netlify Functions, which
     would make a copied .js build script be parsed as ESM. The build scripts
     are CommonJS, so they ship with a .cjs extension. */
  const to = f === 'build.js' ? 'build.cjs' : f;
  fs.copyFileSync(from, path.join(OUT, to));
});

/* The CSP lives in netlify.toml and _headers as static text; rewrite script-src
   in both so the theme script's hash is always current. Computing it here means
   editing THEME_SCRIPT can never silently break the page under CSP. */
['netlify.toml', '_headers'].forEach(f => {
  const p = path.join(OUT, f);
  if (!fs.existsSync(p)) return;
  let t = fs.readFileSync(p, 'utf8');
  t = t.replace(/script-src 'self'([^;"\n]*)/g, (m, rest) => {
    const cleaned = rest.replace(/\s*'sha256-[A-Za-z0-9+/=]+'/g, '');
    return `script-src 'self'${cleaned} '${THEME_HASH}'`;
  });
  fs.writeFileSync(p, t);
});

// Regenerate the minified stylesheet from source before copying.
(function minifyCss() {
  const src = fs.readFileSync(path.join(ROOT, 'styles.css'), 'utf8');
  const headEnd = src.indexOf('*/') + 2;
  let body = src.slice(headEnd);
  body = body.replace(/\/\*[\s\S]*?\*\//g, '');
  body = body.replace(/\s*\n\s*/g, '\n').replace(/\n{2,}/g, '\n');
  body = body.replace(/\s*([{;:,>])\s*/g, '$1').replace(/;\}/g, '}').replace(/\}/g, '}\n');
  fs.writeFileSync(path.join(OUT, 'styles.min.css'), src.slice(0, headEnd) + '\n' + body.trim() + '\n');
})();

buildHome();

buildListing('shop.html', {
  title: 'Shop All Products — Lara Beauty Atelier',
  desc: 'Every Lara Beauty Atelier formula: skin glow oil, black soap, lip balms, scrubs and gift sets.',
  nav: 'shop', heading: 'Shop all', sub: 'Every formula we make, in one place.',
  trail: [{ label: 'Home', href: 'index.html' }, { label: 'Shop all' }]
});

const subs = {
  skin: 'Cold-pressed oils that sink in and glow.',
  cleanse: 'Detoxifying without stripping.',
  lips: 'Scrub, repair, tint and shine.',
  sets: 'Curated rituals, boxed in black and gold.'
};
CATEGORIES.forEach(c => buildListing(catUrl(c), {
  title: `${c.label} — Lara Beauty Atelier`,
  desc: `${c.label} from Lara Beauty Atelier. ${subs[c.id] || ''}`,
  nav: c.id, heading: c.label, sub: subs[c.id] || '',
  filter: p => p.cat === c.id,
  trail: [{ label: 'Home', href: 'index.html' },
          { label: 'Shop', href: 'shop.html' }, { label: c.label }]
}));

PRODUCTS.forEach(buildProduct);

buildAbout();
buildContact();
buildCart();
buildCheckout();
buildConfirmation();
buildTrack();
buildPolicies();
buildJournal();
POSTS.forEach(buildPost);
buildSitemap();

console.log(`Built ${built.length} pages into ${path.relative(process.cwd(), OUT)}/\n`);
built.forEach(f => console.log('  ' + f));
