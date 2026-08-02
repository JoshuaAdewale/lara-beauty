# Lara Beauty Atelier — page guide

This folder is the **multi-page version** of the site. Every page is a normal
`.html` file with its content written into the markup, so it loads without
JavaScript, and Google can read all of it.

Open `index.html` in a browser to start.

---

## The pages

### Main

| File | Page | What's on it |
|---|---|---|
| `index.html` | Home | Hero, brand marquee, three collections, bestsellers, story extract, four promises, newsletter |
| `shop.html` | Shop all | All 9 products, collection filter links, sort dropdown |
| `about.html` | Our Story | Full brand story, what we believe, how we make it, who it's for |
| `contact.html` | Contact | Contact details, WhatsApp button, message form |

### Collections — one page per category

| File | Page |
|---|---|
| `collection-skin.html` | Skin Care |
| `collection-cleanse.html` | Cleansers |
| `collection-lips.html` | Lip Care |
| `collection-sets.html` | Gift Sets |

### Products — one page per product

| File | Product |
|---|---|
| `product-skin-glow-oil.html` | Skin Glow Oil (50/100/120ml) |
| `product-black-soap.html` | Natural Fairness Black Soap |
| `product-pink-lips-balm.html` | Pink Lips Balm |
| `product-pink-lips-scrub.html` | Pink Lips Scrub |
| `product-lip-balm-tube.html` | Lip Balm — Rose Tint |
| `product-lip-balm-stick.html` | Lip Balm Sticks |
| `product-lip-gloss.html` | Lip Gloss — Crystal Strawberry |
| `product-glow-ritual-set.html` | The Glow Ritual Set |
| `product-pout-set.html` | Perfect Pout Set |

Each product page has: image gallery with thumbnails, size/shade picker with
live price and stock, quantity stepper, Add to bag and Buy it now, three
accordions (details, how to use, delivery), full customer reviews with a rating
breakdown, a review submission form, and four related products.

### Buying

| File | Page |
|---|---|
| `cart.html` | Full-page bag with quantity controls and totals |
| `checkout.html` | Contact, delivery address, payment method, order summary |
| `order-confirmed.html` | Thank-you page with the order reference |
| `track.html` | Order tracking with a status timeline |

### Information

| File | Page |
|---|---|
| `delivery.html` | Delivery times and costs table, pay-on-delivery, 30-day returns |
| `faq.html` | 13 questions across products, orders, returns and wholesale |
| `privacy.html` | Privacy policy |
| `terms.html` | Terms and conditions |
| `404.html` | Page-not-found |

### Behind the scenes

| File | Purpose |
|---|---|
| `admin.html` | Staff portal (unchanged — still a single app) |
| `styles.css` | All styling |
| `site.js` | Bag, search, sorting, forms, tracking |
| `data.js` | Product catalogue and site content |
| `store.js` | Saves data in the browser |
| `email.js` | Email delivery settings — see EMAIL-SETUP.md |
| `sitemap.xml` | List of pages for search engines |

---

## How the pages link together

```
index.html
├── shop.html ──────────► product-*.html ──► cart.html ──► checkout.html
├── collection-*.html ──►      ▲                              │
├── about.html                 │                              ▼
├── contact.html          (related products)          order-confirmed.html
├── delivery.html                                             │
├── faq.html                                                  ▼
└── track.html ◄──────────────────────────────────────── track.html
```

---

## Editing content

Two ways:

**1. Edit the HTML directly.** Everything is plain markup — change the text and
save. Good for one-off wording tweaks.

**2. Edit `data.js` and rebuild.** Better when you're changing products or
prices, because it updates every page at once. From the parent folder run:

```bash
node build.js
```

That regenerates all 26 pages from the catalogue in `data.js`.

> The admin portal at `admin.html` writes to browser storage, which the *single-page*
> version reads live. In this static version, admin edits show in the bag and
> product data, but page text is baked in at build time. Re-run `build.js` after
> changing content in the admin if you want it reflected in the HTML.

---

## Adding a new product

1. Open `data.js`
2. Copy an existing block inside `SEED_PRODUCTS` and change the values
3. Put its photo in `assets/`
4. Run `node build.js`

A new `product-your-id.html` appears and it is automatically added to the shop
page, the right collection page, and the related-products carousels.

---

## What still needs JavaScript

The pages read fine without it, but these need JS switched on:

- Adding to the bag and the bag itself
- The search overlay
- The sort dropdown
- Submitting the contact, review and newsletter forms
- Order tracking

This is normal — nearly every shop works this way. The important part is that
**all product information, prices, reviews and policy text are in the HTML**, so
customers and search engines see everything even if a script fails to load.

---

## SEO built in

- Unique `<title>` and meta description on every page
- Open Graph tags so links preview properly on WhatsApp and Instagram
- `Product` structured data on product pages (price, stock, rating) — this is
  what produces rich results in Google
- `Store` structured data on the home page
- Breadcrumb navigation
- `sitemap.xml` listing every page
- Semantic headings, one `<h1>` per page

---

## Publishing

Same as before — drag this whole folder onto
[app.netlify.com/drop](https://app.netlify.com/drop).

Netlify serves `index.html` automatically and uses `404.html` for bad URLs.

For clean URLs like `/shop` instead of `/shop.html`, add this to `netlify.toml`:

```toml
[[redirects]]
  from = "/:page"
  to = "/:page.html"
  status = 200
```
