/* =============================================================================
   Lara Beauty Atelier — shared front-end behaviour for the static pages
   =============================================================================
   Every page ships its content in the HTML. This file only adds the parts that
   need to be dynamic: the bag, search, sorting, forms and order tracking.
   ========================================================================== */

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"]/g, c =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/* -----------------------------------------------------------------------------
   Bag state (shared across pages via localStorage)
   -------------------------------------------------------------------------- */
let cart = DB.read(DB.k.c, []).filter(l => P(l.id) && l.q > 0);

const saveCart = () => DB.write(DB.k.c, cart);
const countItems = () => cart.reduce((s, l) => s + l.q, 0);

function lineOf(l) {
  const p = P(l.id);
  if (!p) return null;
  const v = l.v && p.variants ? p.variants.find(x => x.label === l.v) : null;
  return { p, v, price: v ? v.price : p.price };
}

const subtotal = () => cart.reduce((s, l) => {
  const x = lineOf(l);
  return s + (x ? x.price * l.q : 0);
}, 0);

const shipping = () =>
  (!cart.length || subtotal() >= SETTINGS.freeShip) ? 0 : SETTINGS.shipFee;

function stockFor(id, label) {
  const p = P(id);
  if (!p) return 0;
  const v = label && p.variants ? p.variants.find(x => x.label === label) : null;
  return v ? v.stock : totalStock(p);
}

function addToCart(id, q = 1, v = null, silent) {
  const p = P(id);
  if (!p) return;

  const available = stockFor(id, v);
  if (available <= 0) { toast('Sorry — out of stock'); return; }

  const line = cart.find(x => x.id === id && x.v === v);
  const room = available - (line ? line.q : 0);
  if (room <= 0) { toast(`Only ${available} in stock`); return; }

  const qty = Math.min(q, room);
  line ? line.q += qty : cart.push({ id, q: qty, v });
  saveCart();
  syncCart(true);

  if (qty < q) toast(`Only ${available} in stock — bag updated`);
  else if (!silent) { toast(`${p.name} added to bag`); openCart(); }
}

function setQty(i, q) {
  const line = cart[i];
  if (!line) return;
  if (q < 1) { cart.splice(i, 1); saveCart(); syncCart(); return; }

  const available = stockFor(line.id, line.v);
  if (q > available) { toast(`Only ${available} in stock`); return; }

  line.q = q;
  saveCart();
  syncCart();
}

function removeItem(i) {
  cart.splice(i, 1);
  saveCart();
  syncCart();
  toast('Removed from bag');
}

/* -----------------------------------------------------------------------------
   Toast
   -------------------------------------------------------------------------- */
function toast(message) {
  const el = $('#toast');
  if (!el) return;
  el.textContent = message;
  el.classList.add('on');
  clearTimeout(el._timer);
  el._timer = setTimeout(() => el.classList.remove('on'), 2400);
}

/* -----------------------------------------------------------------------------
   Overlays
   -------------------------------------------------------------------------- */
function setScrim(on) {
  const s = $('#scrim');
  if (!s) return;
  s.hidden = !on;
  s.classList.toggle('on', on);
  document.body.classList.toggle('lock', on);
}

function toggleMenu(open) {
  const nav = $('#mobile-nav');
  nav.classList.toggle('on', open);
  nav.setAttribute('aria-hidden', String(!open));
  $('[data-action="menu-open"]')?.setAttribute('aria-expanded', String(open));
  setScrim(open);
}

function openCart() {
  const d = $('#cart-drawer');
  d.classList.add('on');
  d.setAttribute('aria-hidden', 'false');
  setScrim(true);
}

function closeAll() {
  $('#cart-drawer')?.classList.remove('on');
  $('#cart-drawer')?.setAttribute('aria-hidden', 'true');
  $('#mobile-nav')?.classList.remove('on');
  $('#mobile-nav')?.setAttribute('aria-hidden', 'true');
  $('[data-action="menu-open"]')?.setAttribute('aria-expanded', 'false');
  setScrim(false);
}

function openSearch() {
  const m = $('#search-modal');
  m.hidden = false;
  m.classList.add('on');
  document.body.classList.add('lock');
  runSearch();
  setTimeout(() => $('#search-input').focus(), 80);
}

function closeSearch() {
  const m = $('#search-modal');
  m.classList.remove('on');
  m.hidden = true;
  document.body.classList.remove('lock');
}

function runSearch() {
  const term = ($('#search-input').value || '').toLowerCase().trim();
  const hits = (term
    ? PRODUCTS.filter(p => `${p.name} ${p.tagline} ${p.cat} ${p.desc}`.toLowerCase().includes(term))
    : PRODUCTS).slice(0, 8);

  $('#search-results').innerHTML = hits.length
    ? hits.map(p => `<a class="search-hit" href="product-${p.id}.html">
        <img src="${esc(p.images[0])}" alt="">
        <span><b>${esc(p.name)}</b><small>${esc(p.tagline)}</small></span>
        <em>${money(p.price)}</em></a>`).join('')
    : '<p class="muted no-hits">No products match that search.</p>';
}

/* -----------------------------------------------------------------------------
   Cart drawer + badge
   -------------------------------------------------------------------------- */
function syncCart(pop) {
  const n = countItems();
  const badge = $('#cart-count');
  if (badge) {
    badge.textContent = n;
    badge.classList.toggle('on', n > 0);
    if (pop) { badge.classList.remove('pop'); void badge.offsetWidth; badge.classList.add('pop'); }
  }
  const label = $('#cart-count-label');
  if (label) label.textContent = n ? `(${n})` : '';

  const body = $('#cart-items');
  const foot = $('#cart-summary');
  if (!body || !foot) return;

  if (!cart.length) {
    body.innerHTML = `<div class="dr-empty">
      <svg viewBox="0 0 24 24"><path d="M6 7h12l-1 13H7L6 7Z"/><path d="M9 7a3 3 0 0 1 6 0"/></svg>
      <p>Your bag is empty.</p></div>`;
    foot.innerHTML = `<a class="btn btn-primary btn-block" href="shop.html">Start shopping</a>`;
  } else {
    body.innerHTML = cart.map((l, i) => {
      const x = lineOf(l);
      if (!x) return '';
      return `<div class="ci">
        <a href="product-${x.p.id}.html"><img src="${esc(x.p.images[0])}" alt="${esc(x.p.name)}"></a>
        <div class="cart-line-body">
          <h3><a href="product-${x.p.id}.html">${esc(x.p.name)}</a></h3>
          <p class="sm">${l.v ? esc(l.v) + ' · ' : ''}${money(x.price)} each</p>
          <div class="ci-row">
            <div class="qty">
              <button type="button" data-cmd="cart:qty" data-arg="${i}" data-arg2="${l.q - 1}" aria-label="Decrease">−</button>
              <span>${l.q}</span>
              <button type="button" data-cmd="cart:qty" data-arg="${i}" data-arg2="${l.q + 1}" aria-label="Increase">+</button>
            </div>
            <b>${money(x.price * l.q)}</b>
          </div>
          <button type="button" class="rm" data-cmd="cart:remove" data-arg="${i}">Remove</button>
        </div></div>`;
    }).join('');

    const s = subtotal();
    const left = SETTINGS.freeShip - s;
    foot.innerHTML = `
      ${left > 0
        ? `<div class="row"><span>Add ${money(left)} for free delivery</span></div>
           <div class="bar u-mb-md"><i style="--bar-fill:${Math.min(100, s / SETTINGS.freeShip * 100)}%"></i></div>`
        : `<div class="row"><span class="gold">✦ You've unlocked free delivery</span></div>`}
      <div class="row"><span>Subtotal</span><span>${money(s)}</span></div>
      <div class="row"><span>Delivery</span><span>${shipping() ? money(shipping()) : 'Free'}</span></div>
      <div class="row total"><span>Total</span><span>${money(s + shipping())}</span></div>
      <a class="btn btn-primary btn-block" href="checkout.html">Checkout · ${money(s + shipping())}</a>
      <button type="button" class="btn btn-block continue-shopping" data-action="close-overlays">Continue shopping</button>`;
  }

  renderCartPage();
  renderCheckoutSummary();
}

/* -----------------------------------------------------------------------------
   cart.html
   -------------------------------------------------------------------------- */
function renderCartPage() {
  const root = $('#cart-page');
  if (!root) return;

  if (!cart.length) {
    root.innerHTML = `<div class="done">
      <h2>Your bag is empty</h2>
      <p class="muted">Add a ritual or two and come back.</p>
      <p class="done-actions"><a class="btn btn-primary" href="shop.html">Shop products</a></p>
    </div>`;
    return;
  }

  const s = subtotal();
  const sh = shipping();
  root.innerHTML = `
    <div class="cart-layout">
      <div class="cart-lines">
        ${cart.map((l, i) => {
          const x = lineOf(l);
          return `<div class="cart-row">
            <a href="product-${x.p.id}.html"><img src="${esc(x.p.images[0])}" alt="${esc(x.p.name)}"></a>
            <div>
              <h3><a href="product-${x.p.id}.html">${esc(x.p.name)}</a></h3>
              <p class="muted">${l.v ? esc(l.v) + ' · ' : ''}${money(x.price)} each</p>
              <div class="qty">
                <button type="button" data-cmd="cart:qty" data-arg="${i}" data-arg2="${l.q - 1}" aria-label="Decrease">−</button>
                <span>${l.q}</span>
                <button type="button" data-cmd="cart:qty" data-arg="${i}" data-arg2="${l.q + 1}" aria-label="Increase">+</button>
              </div>
              <button type="button" class="rm" data-cmd="cart:remove" data-arg="${i}">Remove</button>
            </div>
            <b class="cart-row-total">${money(x.price * l.q)}</b>
          </div>`;
        }).join('')}
      </div>

      <aside class="summary">
        <h2>Order summary</h2>
        <div class="totals-block">
          <div class="row"><span>Subtotal</span><span>${money(s)}</span></div>
          <div class="row"><span>Delivery</span><span>${sh ? money(sh) : 'Free'}</span></div>
          <div class="row total"><span>Total</span><span>${money(s + sh)}</span></div>
        </div>
        <a class="btn btn-primary btn-block" href="checkout.html">Proceed to checkout</a>
        <p class="muted summary-note">Free delivery over ${money(SETTINGS.freeShip)} · 30-day returns</p>
      </aside>
    </div>`;
}

/* -----------------------------------------------------------------------------
   checkout.html
   -------------------------------------------------------------------------- */
function renderCheckoutSummary() {
  const items = $('#summary-items');
  if (!items) return;

  if (!cart.length) {
    $('#checkout-root').innerHTML = `<div class="done">
      <h2>Your bag is empty</h2>
      <p class="muted">Add something before checking out.</p>
      <p class="done-actions"><a class="btn btn-primary" href="shop.html">Shop products</a></p>
    </div>`;
    return;
  }

  const s = subtotal();
  const sh = shipping();
  items.innerHTML = cart.map(l => {
    const x = lineOf(l);
    return `<div class="sum-item">
      <img src="${esc(x.p.images[0])}" alt="">
      <div><b class="u-medium">${esc(x.p.name)}</b>
        <div class="q">${l.v ? esc(l.v) + ' · ' : ''}Qty ${l.q}</div></div>
      <span>${money(x.price * l.q)}</span></div>`;
  }).join('');

  $('#summary-totals').innerHTML = `
    <div class="row"><span>Subtotal</span><span>${money(s)}</span></div>
    <div class="row"><span>Delivery</span><span>${sh ? money(sh) : 'Free'}</span></div>
    <div class="row total"><span>Total</span><span>${money(s + sh)}</span></div>`;

  const btn = $('#place-order');
  if (btn) btn.textContent = `Place order · ${money(s + sh)}`;
}

function placeOrder(event) {
  event.preventDefault();
  const form = event.target;
  if (!form.checkValidity()) return form.reportValidity();
  if (!cart.length) { toast('Your bag is empty'); return; }

  const d = Object.fromEntries(new FormData(form));
  const s = subtotal();
  const sh = shipping();
  const ref = 'LB-' + Math.floor(10000 + Math.random() * 89999);

  cart.forEach(l => {
    const p = P(l.id);
    if (!p) return;
    const v = l.v && p.variants ? p.variants.find(x => x.label === l.v) : null;
    if (v) v.stock = Math.max(0, v.stock - l.q);
    else p.stock = Math.max(0, (p.stock || 0) - l.q);
  });
  saveProducts();

  const order = {
    ref, date: new Date().toISOString(),
    name: `${d.first} ${d.last}`, email: d.email, phone: d.phone,
    addr: `${d.addr}, ${d.city}`, state: d.state, note: d.note || '',
    items: cart.map(l => ({ id: l.id, q: l.q, v: l.v })),
    sub: s, ship: sh, total: s + sh, pay: d.pay, status: 'pending'
  };
  ORDERS.unshift(order);
  saveOrders();
  mailOrder(order);

  sessionStorage.setItem('lba_last_order', JSON.stringify(order));
  cart = [];
  saveCart();
  location.href = 'order-confirmed.html';
}

/* -----------------------------------------------------------------------------
   order-confirmed.html
   -------------------------------------------------------------------------- */
function renderConfirmation() {
  if (!$('#done-ref')) return;
  let order = null;
  try { order = JSON.parse(sessionStorage.getItem('lba_last_order')); } catch (e) { /* ignore */ }
  if (!order) { $('#done-ref').textContent = 'No recent order found'; return; }
  $('#done-name').textContent = order.name.split(' ')[0];
  $('#done-email').textContent = order.email;
  $('#done-ref').textContent = 'ORDER #' + order.ref;
}

/* -----------------------------------------------------------------------------
   track.html
   -------------------------------------------------------------------------- */
function doTrack(event) {
  if (event) event.preventDefault();
  const ref = ($('#tref').value || '').trim().toUpperCase();
  const order = ORDERS.find(o => o.ref.toUpperCase() === ref);
  const out = $('#tout');

  if (!order) {
    out.innerHTML = `<div class="pane"><p class="muted">No order found with reference
      <b>${esc(ref || '—')}</b>. Check the reference and try again.</p></div>`;
    return;
  }

  const steps = ['pending', 'processing', 'shipped', 'delivered'];
  const at = steps.indexOf(order.status);
  out.innerHTML = `<div class="pane">
    <div class="ph"><h2>Order ${esc(order.ref)}</h2>
      <span class="st ${order.status}">${order.status}</span></div>
    <div class="steps track-steps">
      ${steps.map((s, i) => `<b class="${i <= at && order.status !== 'cancelled' ? 'on' : ''}">
        <i>${i + 1}</i>${s}</b>${i < 3 ? '<span class="sep"></span>' : ''}`).join('')}
    </div>
    ${order.items.map(l => {
      const p = P(l.id);
      return p ? `<div class="sum-item"><img src="${esc(p.images[0])}" alt="">
        <div><b class="u-medium">${esc(p.name)}</b>
          <div class="q">${l.v ? esc(l.v) + ' · ' : ''}Qty ${l.q}</div></div>
        <span>${money(p.price * l.q)}</span></div>` : '';
    }).join('')}
    <div class="row total totals-block"><span>Total</span><span>${money(order.total)}</span></div>
    <p class="muted track-meta">Placed ${new Date(order.date).toLocaleDateString('en-GB',
      { day: 'numeric', month: 'long', year: 'numeric' })} · Delivering to ${esc(order.addr)}, ${esc(order.state)}</p>
  </div>`;
}

/* -----------------------------------------------------------------------------
   Product page interactions
   -------------------------------------------------------------------------- */
const sel = { v: null, rate: 5 };

function initProductPage() {
  const btn = $('#atb');
  if (!btn) return;
  const active = $('.vopt.on');
  sel.v = active ? active.dataset.arg2 : null;
}

function pickVar(id, label) {
  sel.v = label;
  const chosen = $$('.vopt').find(b => b.dataset.arg2 === label);
  $$('.vopt').forEach(b => b.classList.toggle('on', b === chosen));
  if (!chosen) return;

  const price = Number(chosen.dataset.price);
  const stock = Number(chosen.dataset.stock);
  const p = P(id);
  const sale = p.compare && p.compare > price;

  $('#ppr').innerHTML = money(price) +
    (sale ? `<s>${money(p.compare)}</s><span class="save">Save ${money(p.compare - price)}</span>` : '');

  const box = $('#pstock');
  const add = $('#atb');
  if (stock <= 0) {
    box.innerHTML = '<p class="stockline no"><i></i> Out of stock — restocking soon</p>';
    add.disabled = true; add.textContent = 'Sold out';
  } else if (stock <= SETTINGS.lowStock) {
    box.innerHTML = `<p class="stockline low"><i></i> Low stock — only ${stock} left</p>`;
    add.disabled = false; add.textContent = `Add to bag · ${money(price)}`;
  } else {
    box.innerHTML = '<p class="stockline"><i></i> In stock — ready to ship</p>';
    add.disabled = false; add.textContent = `Add to bag · ${money(price)}`;
  }
}

function showImage(i, src) {
  const img = $('#gimg');
  if (!img) return;
  img.src = src;
  img.style.animation = 'none';
  void img.offsetWidth;
  img.style.animation = '';
  $$('.thumbs button').forEach((b, k) => b.classList.toggle('on', k === i));
}

function bump(step) {
  const el = $('#pq');
  el.textContent = Math.max(1, Number(el.textContent) + step);
}

function pickRate(n) {
  sel.rate = n;
  $$('#rp button').forEach(b => b.classList.toggle('on', Number(b.dataset.n) <= n));
}

function submitReview(event) {
  event.preventDefault();
  const form = event.target;
  if (!form.checkValidity()) return form.reportValidity();

  const p = P(form.dataset.product);
  const d = Object.fromEntries(new FormData(form));
  p.reviews.push({
    n: d.name, r: sel.rate, t: d.title, b: d.body,
    d: new Date().toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }),
    v: false, ok: false
  });
  saveProducts();
  form.reset();
  toast('Thank you — your review is awaiting approval');
}

function toggleAccordion(header) {
  const item = header.parentElement;
  const body = item.querySelector('.acc-b');
  body.style.maxHeight = item.classList.toggle('open') ? `${body.scrollHeight}px` : 0;
}

/* -----------------------------------------------------------------------------
   Listing sort
   -------------------------------------------------------------------------- */
function sortGrid() {
  const grid = $('#grid');
  const mode = $('#sort').value;
  const cards = $$('#grid .card');

  const priceOf = c => {
    const t = c.querySelector('.price').firstChild.textContent.replace(/[^\d]/g, '');
    return Number(t);
  };
  const rateOf = c => parseFloat(c.querySelector('.stars span').textContent) || 0;
  const nameOf = c => c.querySelector('h3').textContent.trim();

  const sorted = [...cards];
  if (mode === 'low') sorted.sort((a, b) => priceOf(a) - priceOf(b));
  if (mode === 'high') sorted.sort((a, b) => priceOf(b) - priceOf(a));
  if (mode === 'rate') sorted.sort((a, b) => rateOf(b) - rateOf(a));
  if (mode === 'az') sorted.sort((a, b) => nameOf(a).localeCompare(nameOf(b)));
  if (mode === 'feat') sorted.sort((a, b) => cards.indexOf(a) - cards.indexOf(b));

  sorted.forEach(c => grid.appendChild(c));
}

/* -----------------------------------------------------------------------------
   Newsletter + contact
   -------------------------------------------------------------------------- */
function subscribe(event) {
  event.preventDefault();
  const input = event.target.querySelector('input');
  const email = input.value.trim();
  if (!SUBS.find(s => s.email === email)) {
    SUBS.push({ email, d: new Date().toISOString().slice(0, 10) });
    saveSubs();
    mailSubscriber(email);
  }
  event.target.reset();
  toast(CONTENT.news.success);
}

function sendEnquiry(event) {
  event.preventDefault();
  const form = event.target;
  if (!form.checkValidity()) return form.reportValidity();

  const d = Object.fromEntries(new FormData(form));
  const btn = form.querySelector('button[type="submit"]');
  btn.disabled = true;
  btn.textContent = 'Sending…';

  mailEnquiry(d).finally(() => {
    form.reset();
    btn.disabled = false;
    btn.textContent = 'Send message';
    toast('Thank you — we’ll reply within one working day.');
  });
}

/* -----------------------------------------------------------------------------
   Event delegation
   -------------------------------------------------------------------------- */
const ACTIONS = {
  'search': openSearch,
  'menu-open': () => toggleMenu(true),
  'menu-close': () => toggleMenu(false),
  'close-overlays': closeAll,
  'close-search': closeSearch
};

const COMMANDS = {
  'cart:add': d => addToCart(d.arg, Number($('#pq').textContent), sel.v),
  'cart:buy-now': d => { addToCart(d.arg, Number($('#pq').textContent), sel.v, true); location.href = 'checkout.html'; },
  'cart:quick-add': d => addToCart(d.arg, 1, d.arg2 || null),
  'cart:qty': d => setQty(Number(d.arg), Number(d.arg2)),
  'cart:remove': d => removeItem(Number(d.arg)),
  'qty:step': d => bump(Number(d.arg)),
  'gallery:show': d => showImage(Number(d.arg), d.src),
  'variant:pick': d => pickVar(d.arg, d.arg2),
  'review:rate': d => pickRate(Number(d.arg)),
  'accordion:toggle': (d, e) => toggleAccordion(e.target.closest('.acc-h'))
};

document.addEventListener('click', event => {
  const cmdEl = event.target.closest('[data-cmd]');
  if (cmdEl && COMMANDS[cmdEl.dataset.cmd]) {
    event.preventDefault();
    COMMANDS[cmdEl.dataset.cmd](cmdEl.dataset, event);
    return;
  }
  const actEl = event.target.closest('[data-action]');
  if (actEl && ACTIONS[actEl.dataset.action]) {
    event.preventDefault();
    ACTIONS[actEl.dataset.action]();
  }
});

document.addEventListener('submit', event => {
  const id = event.target.id;
  if (id === 'newsletter-form') subscribe(event);
  if (id === 'contact-form') sendEnquiry(event);
  if (id === 'cform') placeOrder(event);
  if (id === 'review-form') submitReview(event);
  if (id === 'track-form') doTrack(event);
});

document.addEventListener('input', event => {
  if (event.target.id === 'search-input') runSearch();
});

document.addEventListener('change', event => {
  if (event.target.id === 'sort') sortGrid();
});

document.addEventListener('keydown', event => {
  if (event.key !== 'Escape') return;
  $('#search-modal')?.hidden ? closeAll() : closeSearch();
});

addEventListener('scroll',
  () => $('#site-header')?.classList.toggle('stuck', scrollY > 12),
  { passive: true });

/* Keep tabs in sync */
document.addEventListener('db:products', () => location.reload());

/* -----------------------------------------------------------------------------
   Boot
   -------------------------------------------------------------------------- */
initProductPage();
syncCart();
renderConfirmation();

// deep link: track.html?ref=LB-10480
const refParam = new URLSearchParams(location.search).get('ref');
if (refParam && $('#tref')) { $('#tref').value = refParam; doTrack(); }
