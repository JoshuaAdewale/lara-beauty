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

const ROOT = path.join(__dirname, 'lara-beauty');
const OUT = path.join(__dirname, 'lara-beauty-pages');

/* ---- load seed data --------------------------------------------------- */
const seedSrc = fs.readFileSync(path.join(ROOT, 'data.js'), 'utf8') +
  '\nmodule.exports={products:SEED_PRODUCTS,cats:SEED_CATEGORIES,content:SEED_CONTENT,settings:SEED_SETTINGS};';
fs.writeFileSync('/tmp/_seed.js', seedSrc);
const { products: PRODUCTS, cats: CATEGORIES, content: C, settings: S } = require('/tmp/_seed.js');

/* ---- helpers ----------------------------------------------------------- */
const esc = s => String(s ?? '').replace(/[&<>"]/g, c =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const money = n => S.currency + Math.round(n).toLocaleString('en-NG');
const catLabel = id => (CATEGORIES.find(c => c.id === id) || {}).label || id;
const productUrl = p => `product-${p.id}.html`;
const catUrl = c => `collection-${c.id}.html`;
const totalStock = p => p.variants && p.variants.length
  ? p.variants.reduce((s, v) => s + (+v.stock || 0), 0) : (+p.stock || 0);
const okReviews = p => p.reviews.filter(r => r.ok !== false);

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
function head(page) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <meta name="theme-color" content="#0A0A0A">

  <title>${esc(page.title)}</title>
  <meta name="description" content="${esc(page.desc)}">
  ${page.canonical ? `<link rel="canonical" href="${esc(page.canonical)}">` : ''}

  <meta property="og:type" content="${page.ogType || 'website'}">
  <meta property="og:title" content="${esc(page.title)}">
  <meta property="og:description" content="${esc(page.desc)}">
  <meta property="og:image" content="${esc(page.image || 'assets/story-flatlay.jpg')}">

  <link rel="icon" href="assets/favicon.png">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400;1,500&family=Jost:wght@300;400;500;600;700&display=swap">
  <link rel="stylesheet" href="styles.css">
  ${page.jsonld ? `<script type="application/ld+json">${JSON.stringify(page.jsonld)}</script>` : ''}
</head>

<body>
  <a class="skip-link" href="#main">Skip to content</a>

  <p class="announce">${esc(C.footer.announce || S.announce)}</p>

  <header class="site-header" id="site-header">
    <div class="wrap nav">
      <a class="logo" href="index.html" aria-label="Lara Beauty Atelier — home">
        <img src="assets/logo-transparent.png" alt="" width="44" height="43">
        <span class="lt"><b>LARA BEAUTY</b><small>Atelier</small></span>
      </a>

      <nav class="nav-links" aria-label="Primary">
        <a href="index.html"${page.nav === 'home' ? ' aria-current="page"' : ''}>Home</a>
        <a href="shop.html"${page.nav === 'shop' ? ' aria-current="page"' : ''}>Shop All</a>
        ${CATEGORIES.slice(0, 3).map(c =>
          `<a href="${catUrl(c)}"${page.nav === c.id ? ' aria-current="page"' : ''}>${esc(c.label)}</a>`).join('\n        ')}
        <a href="about.html"${page.nav === 'about' ? ' aria-current="page"' : ''}>Our Story</a>
        <a href="contact.html"${page.nav === 'contact' ? ' aria-current="page"' : ''}>Contact</a>
      </nav>

      <div class="nav-act">
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

  <nav class="mmenu" id="mobile-nav" aria-label="Mobile" aria-hidden="true">
    <button type="button" class="icon-btn menu-close" data-action="menu-close" aria-label="Close menu">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>
    </button>
    <a href="index.html">Home</a>
    <a href="shop.html">Shop All</a>
    ${CATEGORIES.map(c => `<a href="${catUrl(c)}">${esc(c.label)}</a>`).join('\n    ')}
    <a href="about.html">Our Story</a>
    <a href="contact.html">Contact</a>
    <a href="delivery.html">Delivery &amp; Returns</a>
    <a href="faq.html">FAQ</a>
    <a href="track.html">Track Order</a>
    <a href="cart.html">Your Bag</a>
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
            <img src="assets/logo-transparent.png" alt="" width="44" height="43">
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
  <script src="email.js"></script>
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
  return `<article class="card">
        <a class="card-img" href="${productUrl(p)}">
          ${out ? '<span class="tag out">Sold out</span>'
                : p.badge ? `<span class="tag">${esc(p.badge)}</span>` : ''}
          <img class="main" src="${esc(p.images[0])}" alt="${esc(p.name)}" loading="lazy" width="600" height="600">
          <img class="alt" src="${esc(p.images[1] || p.images[0])}" alt="" loading="lazy" width="600" height="600">
        </a>
        <div class="card-body">
          ${stars(p.rating, `${p.rating.toFixed(1)} (${revs.length * 137})`)}
          <h3><a href="${productUrl(p)}">${esc(p.name)}</a></h3>
          <p class="tl">${esc(p.tagline)}</p>
          <p class="price">${money(p.price)}${sale ? `<s>${money(p.compare)}</s>` : ''}</p>
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
    title: C.seo.title, desc: C.seo.desc, nav: 'home', image: H.image,
    jsonld: {
      '@context': 'https://schema.org', '@type': 'Store', name: S.brand,
      email: S.email, telephone: S.phone,
      address: { '@type': 'PostalAddress', streetAddress: S.address, addressCountry: 'NG' },
      image: H.image
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
              <img src="${esc(H.image)}" alt="Lara Beauty Atelier Skin Glow Oil"
                   width="928" height="1152" fetchpriority="high">
            </div>
            <div class="float-card">
              <img src="${esc(H.cardImage)}" alt="" width="46" height="46">
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
            <img src="${esc(it.image)}" alt="${esc(it.title)}" loading="lazy" width="600" height="300">
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

    <section class="section-panel" id="story">
      <div class="wrap story">
        <div class="imgwrap">
          <img src="${esc(C.story.image)}" alt="${esc(C.story.title)}" loading="lazy" width="1200" height="900">
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
    title: opts.title, desc: opts.desc, nav: opts.nav,
    image: list[0] ? list[0].images[0] : undefined,
    jsonld: {
      '@context': 'https://schema.org', '@type': 'ItemList',
      itemListElement: list.map((p, i) => ({
        '@type': 'ListItem', position: i + 1, name: p.name, url: productUrl(p)
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
    title: `${p.name} — ${money(p.price)} | Lara Beauty Atelier`,
    desc: p.desc.slice(0, 155),
    nav: p.cat, image: p.images[0], ogType: 'product',
    jsonld: {
      '@context': 'https://schema.org', '@type': 'Product',
      name: p.name, description: p.desc, sku: p.sku, image: p.images,
      brand: { '@type': 'Brand', name: S.brand },
      offers: {
        '@type': 'Offer', price: p.price, priceCurrency: 'NGN',
        availability: stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock'
      },
      aggregateRating: {
        '@type': 'AggregateRating', ratingValue: avg.toFixed(1), reviewCount: revs.length * 137
      }
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
              <img id="gimg" src="${esc(p.images[0])}" alt="${esc(p.name)}" width="800" height="800">
            </div>
            <div class="thumbs">
              ${p.images.map((im, i) => `<button type="button" class="${i ? '' : 'on'}"
                data-cmd="gallery:show" data-arg="${i}" data-src="${esc(im)}"
                aria-label="View image ${i + 1}"><img src="${esc(im)}" alt="" width="76" height="76"></button>`)
                .join('\n              ')}
            </div>
          </div>

          <div class="pdp-info">
            <p class="eyebrow">${esc(cat.label)}${p.sku ? ` · ${esc(p.sku)}` : ''}</p>
            <h1>${esc(p.name)}</h1>
            <p class="tl">${esc(p.tagline)}</p>
            ${stars(avg, `${avg.toFixed(1)} · ${revs.length * 137} reviews`)}

            <p class="pdp-price" id="ppr">
              ${money(p.price)}${sale
                ? `<s>${money(p.compare)}</s><span class="save">Save ${money(p.compare - p.price)}</span>`
                : ''}
            </p>

            <p class="muted">${esc(p.desc)}</p>

            ${vs.length > 1 ? `<p class="vlabel">Size / Shade</p>
            <div class="vopts">
              ${vs.map(v => `<button type="button" class="vopt${v.price === p.price && v.stock > 0 ? ' on' : ''}"
                ${v.stock <= 0 ? 'disabled' : ''} data-cmd="variant:pick"
                data-arg="${p.id}" data-arg2="${esc(v.label)}"
                data-price="${v.price}" data-stock="${v.stock}">${esc(v.label)} · ${money(v.price)}</button>`)
                .join('\n              ')}
            </div>` : ''}

            <div class="pills">
              ${p.tone.map(t => `<span class="pill">${esc(t)}</span>`).join('\n              ')}
            </div>

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
                ${stock <= 0 ? 'Sold out' : `Add to bag · ${money(p.price)}`}
              </button>
            </div>

            <button type="button" class="btn btn-ghost btn-block"
                    data-cmd="cart:buy-now" data-arg="${p.id}" ${stock <= 0 ? 'disabled' : ''}>
              Buy it now
            </button>

            <div class="trust">
              <div><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8h13l3 4v5H4z"/></svg>
                Free delivery over ${money(S.freeShip)}</div>
              <div><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 7 9 18l-5-5"/></svg>
                30-day returns</div>
              <div><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/></svg>
                Ships within 24h</div>
            </div>

            <div class="acc">
              ${acc('Key details', '<ul>' + p.details.map(d => `<li>${esc(d)}</li>`).join('') + '</ul>', true)}
              ${acc('How to use', `<p>${esc(p.how)}</p>`)}
              ${acc('Delivery &amp; returns',
                `<p>Dispatched from Abuja within 24 hours, Monday to Saturday. Delivery is 1–2 days in Abuja and Lagos, 2–4 days elsewhere in Nigeria. Free above ${money(S.freeShip)}. Not right for you? Send it back within 30 days, even if opened. <a href="delivery.html">Full policy</a>.</p>`)}
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="rev-wrap">
      <div class="wrap">
        <div class="rev-head">
          <div class="rev-score">
            <b>${avg.toFixed(1)}</b>
            ${stars(avg, '')}
            <p class="muted rev-count">${revs.length * 137} verified reviews</p>
            <div class="rev-dist">
              ${dist.map((c2, i) => `<div class="rev-dist-row">
                <span>${5 - i}★</span>
                <div class="bar"><i style="--bar-fill:${revs.length ? (c2 / revs.length * 100) : 0}%"></i></div>
              </div>`).join('\n              ')}
            </div>
          </div>

          <div>
            <h2 class="pdp-reviews-title">What women are saying</h2>
            <div class="rev-list">
              ${revs.map(r => `<article class="rev">
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
  const html = head({ title: opts.title, desc: opts.desc, nav: opts.nav }) + `
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
    desc: 'How Lara Beauty Atelier began in an Abuja kitchen and grew into a small-batch skincare house.',
    nav: 'about', image: C.story.image
  }) + `
    <section>
      <div class="wrap">
        ${breadcrumb([{ label: 'Home', href: 'index.html' }, { label: 'Our Story' }])}
      </div>
    </section>

    <section class="section-flush">
      <div class="wrap story">
        <div class="imgwrap">
          <img src="${esc(C.story.image)}" alt="Lara Beauty Atelier products" width="1200" height="900">
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
        <p>Everything is produced in small batches at our Abuja studio. Shea comes from a
           women-led co-operative in Kwara, and our black soap is made to a traditional
           Ghanaian recipe using plantain ash and cocoa pod. Nothing is diluted with cheap
           filler oils, and we do not test on animals.</p>

        <h2>Who it is for</h2>
        <p>Every formula is tested on skin from fair to deep and on women from their
           twenties to their seventies. If a product does not suit your skin, send it back
           within 30 days — even if you have opened it.</p>
      </div>
    </section>

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
    nav: 'contact'
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
    desc: 'Review the items in your shopping bag before checkout.', nav: 'cart'
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
  const states = ['FCT — Abuja', 'Lagos', 'Rivers', 'Kano', 'Oyo', 'Enugu', 'Kaduna', 'Delta', 'Other'];
  const html = head({
    title: 'Checkout — Lara Beauty Atelier',
    desc: 'Secure checkout. Free delivery over ₦25,000, pay on delivery available.', nav: 'checkout'
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
                  <input id="co-city" name="city" required placeholder="Abuja"></div>
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
                  <small>Abuja &amp; Lagos only</small></label>
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
    desc: 'Thank you for your order.', nav: 'checkout'
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
            your parcel leaves Abuja — usually within 48 hours.</p>
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
    desc: 'Enter your order reference to see the latest delivery status.', nav: 'track'
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
          <table class="policy-table">
            <thead><tr><th>Destination</th><th>Time</th><th>Cost</th></tr></thead>
            <tbody>
              <tr><td>Abuja</td><td>1–2 working days</td><td>${money(S.shipFee)}</td></tr>
              <tr><td>Lagos</td><td>1–2 working days</td><td>${money(S.shipFee)}</td></tr>
              <tr><td>Other states</td><td>2–4 working days</td><td>${money(S.shipFee)}</td></tr>
              <tr><td>Orders over ${money(S.freeShip)}</td><td>As above</td><td><b class="gold">Free</b></td></tr>
            </tbody>
          </table>
          <p>Orders are dispatched from our Abuja studio within 24 hours, Monday to Saturday.
             Orders placed on Sunday or a public holiday are sent the next working day.</p>

          <h2>Pay on delivery</h2>
          <p>Available in Abuja and Lagos. Choose <em>Pay on delivery</em> at checkout and settle
             with the courier in cash or by transfer when your parcel arrives.</p>

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

  simplePage('faq.html', {
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
          <p>1–2 working days in Abuja and Lagos, 2–4 days elsewhere in Nigeria. See our
             <a href="delivery.html">delivery page</a> for full details.</p>

          <h3>Can I pay on delivery?</h3>
          <p>Yes, in Abuja and Lagos. Select it at checkout.</p>

          <h3>Do you ship outside Nigeria?</h3>
          <p>Not through the website yet. Email <a href="mailto:${esc(S.email)}">${esc(S.email)}</a>
             and we will arrange a quote.</p>

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
function buildSitemap() {
  const urls = built.filter(f => f !== '404.html');
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemap.org/schemas/sitemap/0.9">
${urls.map(u => `  <url><loc>${u}</loc></url>`).join('\n')}
</urlset>
`;
  fs.writeFileSync(path.join(OUT, 'sitemap.xml'), xml);
}

/* =============================================================================
   RUN
   ========================================================================== */
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

// copy shared assets
fs.cpSync(path.join(ROOT, 'assets'), path.join(OUT, 'assets'), { recursive: true });
['styles.css', 'data.js', 'store.js', 'email.js', 'admin.html', 'admin.js',
 'robots.txt', 'netlify.toml'].forEach(f => {
  const from = path.join(ROOT, f);
  if (fs.existsSync(from)) fs.copyFileSync(from, path.join(OUT, f));
});

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
buildSitemap();

console.log(`Built ${built.length} pages into ${path.relative(process.cwd(), OUT)}/\n`);
built.forEach(f => console.log('  ' + f));
