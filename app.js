/* Lara Beauty Atelier — storefront */
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];

let cart = DB.read(DB.k.c, []).filter(l => P(l.id) && l.q > 0);
const saveCart = () => DB.write(DB.k.c, cart);
const count = () => cart.reduce((s, l) => s + l.q, 0);
const lineOf = l => {
  const p = P(l.id); if (!p) return null;
  const v = l.v && p.variants ? p.variants.find(x => x.label === l.v) : null;
  return { p, v, price: v ? v.price : p.price };
};
const subtotal = () => cart.reduce((s, l) => { const x = lineOf(l); return s + (x ? x.price * l.q : 0); }, 0);
const shipping = () => (!cart.length || subtotal() >= SETTINGS.freeShip) ? 0 : SETTINGS.shipFee;

function addToCart(id, q = 1, v = null, silent) {
  const p = P(id); if (!p) return;
  if (totalStock(p) <= 0) { toast('Sorry — out of stock'); return; }
  const key = cart.find(x => x.id === id && x.v === v);
  key ? key.q += q : cart.push({ id, q, v });
  saveCart(); syncCart(true);
  if (!silent) { toast(`${p.name} added to bag`); openCart(); }
}
function setQty(i, q) { q < 1 ? cart.splice(i, 1) : cart[i].q = q; saveCart(); syncCart(); }
function removeItem(i) { cart.splice(i, 1); saveCart(); syncCart(); toast('Removed from bag'); }

function toast(m) { const t = $('#toast'); t.textContent = m; t.classList.add('on'); clearTimeout(t._t); t._t = setTimeout(() => t.classList.remove('on'), 2500); }
const starSvg = '<svg viewBox="0 0 24 24"><path d="m12 2 3 6.6 7 .7-5.2 4.7 1.5 7L12 17.4 5.7 21l1.5-7L2 9.3l7-.7L12 2Z"/></svg>';
const stars = (r, txt) => `<div class="stars">${starSvg.repeat(Math.round(r) || 5)}${txt !== '' ? `<span>${txt ?? r.toFixed(1)}</span>` : ''}</div>`;
const revCount = p => p.reviews.filter(r => r.ok !== false).length;
const okReviews = p => p.reviews.filter(r => r.ok !== false);

function toggleMenu(on) { $('#mmenu').classList.toggle('on', !!on); $('#scrim').classList.toggle('on', !!on); document.body.classList.toggle('lock', !!on); }
function openCart() { $('#drawer').classList.add('on'); $('#scrim').classList.add('on'); document.body.classList.add('lock'); }
function closeAll() { $('#drawer').classList.remove('on'); $('#mmenu').classList.remove('on'); $('#scrim').classList.remove('on'); document.body.classList.remove('lock'); }
function openSearch() { $('#searchModal').classList.add('on'); document.body.classList.add('lock'); setTimeout(() => $('#sq').focus(), 80); runSearch(); }
function closeSearch() { $('#searchModal').classList.remove('on'); document.body.classList.remove('lock'); }
function runSearch() {
  const q = ($('#sq').value || '').toLowerCase().trim();
  const list = (q ? PRODUCTS.filter(p => (p.name + p.tagline + p.cat + p.desc).toLowerCase().includes(q)) : PRODUCTS).slice(0, 8);
  $('#sres').innerHTML = list.length ? list.map(p => `
    <div class="tprod" style="cursor:pointer;padding:8px;border-radius:10px;border:1px solid var(--line)" onclick="closeSearch();go('#/product/${p.id}')">
      <img src="${p.images[0]}" alt=""><div><b>${p.name}</b><small>${p.tagline}</small></div>
      <span style="margin-left:auto;color:var(--gold)">${money(p.price)}</span></div>`).join('')
    : '<p class="muted" style="padding:14px">No products match that search.</p>';
}
document.addEventListener('keydown', e => { if (e.key === 'Escape') { closeAll(); closeSearch(); } });
addEventListener('scroll', () => $('#hdr').classList.toggle('stuck', scrollY > 12), { passive: true });

/* ---------- cart drawer ---------- */
function syncCart(pop) {
  const n = count(), b = $('#badge');
  b.textContent = n; b.classList.toggle('on', n > 0);
  if (pop) { b.classList.remove('pop'); void b.offsetWidth; b.classList.add('pop'); }
  $('#dr-count').textContent = n ? `(${n})` : '';
  const body = $('#dr-body'), foot = $('#dr-foot');

  if (!cart.length) {
    body.innerHTML = `<div class="dr-empty"><svg viewBox="0 0 24 24"><path d="M6 7h12l-1 13H7L6 7Z"/><path d="M9 7a3 3 0 0 1 6 0"/></svg><p>Your bag is empty.</p></div>`;
    foot.innerHTML = `<button class="btn btn-primary btn-block" onclick="closeAll();go('#/shop')">Start shopping</button>`;
  } else {
    body.innerHTML = cart.map((l, i) => { const x = lineOf(l); if (!x) return '';
      return `<div class="ci">
        <img src="${x.p.images[0]}" alt="" onclick="closeAll();go('#/product/${x.p.id}')">
        <div style="display:flex;flex-direction:column;min-width:0">
          <h4>${x.p.name}</h4>
          <div class="sm">${l.v ? l.v + ' · ' : ''}${money(x.price)} each</div>
          <div class="ci-row">
            <div class="qty"><button onclick="setQty(${i},${l.q - 1})" aria-label="Less">−</button><span>${l.q}</span><button onclick="setQty(${i},${l.q + 1})" aria-label="More">+</button></div>
            <b>${money(x.price * l.q)}</b></div>
          <a class="rm" onclick="removeItem(${i})">Remove</a>
        </div></div>`; }).join('');

    const s = subtotal(), left = SETTINGS.freeShip - s;
    foot.innerHTML = `
      ${left > 0 ? `<div class="row"><span>Add ${money(left)} for free delivery</span></div>
        <div class="bar" style="margin-bottom:14px"><i style="width:${Math.min(100, s / SETTINGS.freeShip * 100)}%"></i></div>`
        : `<div class="row"><span class="gold">✦ You've unlocked free delivery</span></div>`}
      <div class="row"><span>Subtotal</span><span>${money(s)}</span></div>
      <div class="row"><span>Delivery</span><span>${shipping() ? money(shipping()) : 'Free'}</span></div>
      <div class="row total"><span>Total</span><span>${money(s + shipping())}</span></div>
      <button class="btn btn-primary btn-block" onclick="closeAll();go('#/checkout')">Checkout · ${money(s + shipping())}</button>
      <button class="btn btn-block" style="color:var(--mut);font-size:11.5px;margin-top:4px" onclick="closeAll()">Continue shopping</button>`;
  }
  if ($('#page-checkout').classList.contains('active')) renderCheckout();
}

/* ---------- cards ---------- */
function card(p, i = 0) {
  const sale = p.compare && p.compare > p.price, out = totalStock(p) <= 0;
  return `<article class="card" style="animation-delay:${Math.min(i, 8) * 55}ms" onclick="go('#/product/${p.id}')">
    <div class="card-img">
      ${out ? '<span class="tag out">Sold out</span>' : p.badge ? `<span class="tag">${p.badge}</span>` : ''}
      <img class="main" src="${p.images[0]}" alt="${p.name}" loading="lazy">
      <img class="alt" src="${p.images[1] || p.images[0]}" alt="" loading="lazy">
      <div class="quick"><button class="btn ${out ? 'btn-dark' : 'btn-primary'}" ${out ? 'disabled' : ''} onclick="event.stopPropagation();addToCart('${p.id}',1,${p.variants && p.variants.length > 1 ? 'null' : `'${p.variants?.[0]?.label || ''}'`})">${out ? 'Sold out' : 'Add to bag'}</button></div>
    </div>
    <div class="card-body">
      ${stars(p.rating, `${p.rating.toFixed(1)} (${revCount(p) * 137})`)}
      <h3>${p.name}</h3><p class="tl">${p.tagline}</p>
      <div class="price">${money(p.price)}${sale ? `<s>${money(p.compare)}</s>` : ''}</div>
    </div></article>`;
}

/* ---------- shop ---------- */
let activeCat = 'all';
function renderShop() {
  $('#filters').innerHTML = [{ id: 'all', label: 'All' }, ...CATEGORIES]
    .map(c => `<button class="chip ${activeCat === c.id ? 'on' : ''}" onclick="location.hash='${c.id === 'all' ? '#/shop' : '#/shop/' + c.id}'">${c.label}</button>`).join('');
  let list = activeCat === 'all' ? [...PRODUCTS] : PRODUCTS.filter(p => p.cat === activeCat);
  const s = $('#sort').value;
  if (s === 'low') list.sort((a, b) => a.price - b.price);
  if (s === 'high') list.sort((a, b) => b.price - a.price);
  if (s === 'rate') list.sort((a, b) => b.rating - a.rating);
  if (s === 'az') list.sort((a, b) => a.name.localeCompare(b.name));
  $('#count').textContent = `${list.length} product${list.length === 1 ? '' : 's'}`;
  $('#grid').innerHTML = list.length ? list.map(card).join('') : `<div class="empty" style="grid-column:1/-1">Nothing here yet — try another collection.</div>`;
  const cat = CATEGORIES.find(c => c.id === activeCat);
  const subs = { skin: 'Cold-pressed oils that sink in and glow.', cleanse: 'Detoxifying without stripping.', lips: 'Scrub, repair, tint and shine.', sets: 'Curated rituals, boxed in black and gold.' };
  $('#shop-title').textContent = cat ? cat.label : 'Shop all';
  $('#shop-crumb').textContent = cat ? cat.label : 'Shop all';
  $('#shop-sub').textContent = cat ? subs[cat.id] : 'Every formula we make, in one place.';
}

/* ---------- PDP ---------- */
let sel = { v: null };
function renderPDP(id) {
  const p = P(id); if (!p) return go('#/shop');
  const vs = p.variants || [];
  sel.v = vs.length ? (vs.find(v => v.stock > 0) || vs[0]).label : null;
  const revs = okReviews(p);
  const avg = revs.length ? revs.reduce((s, r) => s + r.r, 0) / revs.length : p.rating;
  const dist = [5, 4, 3, 2, 1].map(n => revs.filter(r => r.r === n).length);
  const rel = PRODUCTS.filter(x => x.id !== p.id && x.cat === p.cat).concat(PRODUCTS.filter(x => x.id !== p.id && x.cat !== p.cat)).slice(0, 4);
  const catL = CATEGORIES.find(c => c.id === p.cat)?.label || '';

  $('#pdp').innerHTML = `
  <div class="wrap">
    <div class="crumb"><a href="#/">Home</a> / <a href="#/shop/${p.cat}">${catL}</a> / ${p.name}</div>
    <div class="pdp">
      <div>
        <div class="gal-main"><img id="gimg" src="${p.images[0]}" alt="${p.name}"></div>
        <div class="thumbs">${p.images.map((im, i) => `<button class="${i ? '' : 'on'}" onclick="setImg(${i})"><img src="${im}" alt="View ${i + 1}"></button>`).join('')}</div>
      </div>
      <div class="pdp-info">
        <p class="eyebrow">${catL} · ${p.sku || ''}</p>
        <h1>${p.name}</h1><p class="tl">${p.tagline}</p>
        ${stars(avg, `${avg.toFixed(1)} · ${revs.length * 137} reviews`)}
        <div class="pdp-price" id="ppr"></div>
        <p class="muted">${p.desc}</p>
        ${vs.length > 1 ? `<div class="vlabel">Size / Shade</div><div class="vopts">${vs.map(v =>
          `<button class="vopt ${v.label === sel.v ? 'on' : ''}" ${v.stock <= 0 ? 'disabled' : ''} onclick="pickVar('${p.id}','${v.label}')">${v.label} · ${money(v.price)}</button>`).join('')}</div>` : ''}
        <div class="pills">${p.tone.map(t => `<span class="pill">${t}</span>`).join('')}</div>
        <div id="pstock"></div>
        <div class="buy">
          <div class="qty"><button onclick="bump(-1)" aria-label="Less">−</button><span id="pq">1</span><button onclick="bump(1)" aria-label="More">+</button></div>
          <button class="btn btn-primary" style="flex:1;min-width:180px" id="atb" onclick="addToCart('${p.id}',+$('#pq').textContent,sel.v)">Add to bag</button>
        </div>
        <button class="btn btn-ghost btn-block" onclick="addToCart('${p.id}',+$('#pq').textContent,sel.v,true);go('#/checkout')">Buy it now</button>
        <div class="trust">
          <div><svg viewBox="0 0 24 24"><path d="M4 8h13l3 4v5H4z"/></svg> Free delivery over ${money(SETTINGS.freeShip)}</div>
          <div><svg viewBox="0 0 24 24"><path d="M20 7 9 18l-5-5"/></svg> 30-day returns</div>
          <div><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/></svg> Ships within 24h</div>
        </div>
        <div class="acc">
          ${accItem('Key details', '<ul>' + p.details.map(d => `<li>${d}</li>`).join('') + '</ul>', true)}
          ${accItem('How to use', `<p>${p.how}</p>`)}
          ${accItem('Delivery & returns', `<p>Dispatched from Abuja within 24 hours, Monday to Saturday. Delivery is 1–2 days in Abuja and Lagos, 2–4 days elsewhere in Nigeria. Free above ${money(SETTINGS.freeShip)}. Not right for you? Send it back within 30 days, even if opened.</p>`)}
        </div>
      </div>
    </div>
  </div>

  <div class="rev-wrap"><div class="wrap"><div class="rev-head">
    <div class="rev-score">
      <b>${avg.toFixed(1)}</b>${stars(avg, '')}
      <p class="muted" style="font-size:12.5px">${revs.length * 137} verified reviews</p>
      <div style="margin-top:14px;text-align:left">${dist.map((c, i) => `
        <div style="display:flex;align-items:center;gap:8px;font-size:11.5px;color:var(--mut);margin-bottom:5px">
          <span>${5 - i}★</span><div class="bar" style="flex:1"><i style="width:${revs.length ? c / revs.length * 100 : 0}%"></i></div></div>`).join('')}</div>
    </div>
    <div>
      <h2 style="font-size:clamp(26px,3.6vw,38px);margin-bottom:16px">What women are saying</h2>
      <div class="rev-list">${revs.map(r => `<div class="rev">
        <div class="rev-top"><span><b>${r.n}</b>${r.v ? '<span class="v">Verified buyer</span>' : ''}</span><time>${r.d}</time></div>
        ${stars(r.r, '')}<h4>${r.t}</h4><p>${r.b}</p></div>`).join('')}</div>
      <div class="rform">
        <h4>Write a review</h4>
        <div class="rate-pick" id="rp">${[1,2,3,4,5].map(n => `<button onclick="pickRate(${n})" class="${n <= 5 ? 'on' : ''}" data-n="${n}">★</button>`).join('')}</div>
        <div class="f-grid">
          <div class="f"><label>Your name</label><input id="rv-n" placeholder="Amara O."></div>
          <div class="f"><label>Headline</label><input id="rv-t" placeholder="Loved it"></div>
          <div class="f full"><label>Your review</label><textarea id="rv-b" rows="3" placeholder="Tell others how it worked for your skin…"></textarea></div>
        </div>
        <button class="btn btn-primary btn-sm" style="margin-top:12px" onclick="submitReview('${p.id}')">Submit review</button>
        <p class="muted" style="font-size:11.5px;margin-top:8px">Reviews are published once our team has verified them.</p>
      </div>
    </div>
  </div></div></div>

  <section><div class="wrap">
    <div class="sec-head"><p class="eyebrow">Pairs beautifully with</p><h2>You may also love</h2><div class="rule"></div></div>
    <div class="grid">${rel.map(card).join('')}</div></div></section>`;
  paintPrice(p);
}
function paintPrice(p) {
  const vs = p.variants || [];
  const v = vs.find(x => x.label === sel.v);
  const price = v ? v.price : p.price;
  const sale = p.compare && p.compare > price;
  $('#ppr').innerHTML = `${money(price)}${sale ? `<s>${money(p.compare)}</s><span class="save">Save ${money(p.compare - price)}</span>` : ''}`;
  const st = v ? v.stock : totalStock(p);
  const el = $('#pstock'), atb = $('#atb');
  if (st <= 0) { el.innerHTML = `<div class="stockline no"><i></i> Out of stock — restocking soon</div>`; atb.disabled = true; atb.textContent = 'Sold out'; }
  else if (st <= SETTINGS.lowStock) { el.innerHTML = `<div class="stockline low"><i></i> Low stock — only ${st} left</div>`; atb.disabled = false; atb.textContent = `Add to bag · ${money(price)}`; }
  else { el.innerHTML = `<div class="stockline"><i></i> In stock — ready to ship</div>`; atb.disabled = false; atb.textContent = `Add to bag · ${money(price)}`; }
}
function pickVar(id, label) { sel.v = label; $$('.vopt').forEach(b => b.classList.toggle('on', b.textContent.startsWith(label))); paintPrice(P(id)); }
let rate = 5;
function pickRate(n) { rate = n; $$('#rp button').forEach(b => b.classList.toggle('on', +b.dataset.n <= n)); }
function submitReview(id) {
  const p = P(id), n = $('#rv-n').value.trim(), t = $('#rv-t').value.trim(), b = $('#rv-b').value.trim();
  if (!n || !t || !b) return toast('Please fill in all review fields');
  p.reviews.push({ n, r: rate, t, b, d: new Date().toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }), v: false, ok: false });
  saveProducts(); $('#rv-n').value = $('#rv-t').value = $('#rv-b').value = '';
  toast('Thank you — your review is awaiting approval');
}
function accItem(title, body, open) {
  return `<div class="acc-item ${open ? 'open' : ''}"><button class="acc-h" onclick="acc(this)">${title}<span>+</span></button>
    <div class="acc-b" ${open ? 'style="max-height:500px"' : ''}><div>${body}</div></div></div>`;
}
function acc(el) { const it = el.parentElement, b = it.querySelector('.acc-b'); b.style.maxHeight = it.classList.toggle('open') ? b.scrollHeight + 'px' : 0; }
function setImg(i) {
  const p = P(location.hash.split('/')[2]); const img = $('#gimg');
  img.src = p.images[i]; img.style.animation = 'none'; void img.offsetWidth; img.style.animation = '';
  $$('.thumbs button').forEach((b, k) => b.classList.toggle('on', k === i));
}
function bump(d) { const e = $('#pq'); e.textContent = Math.max(1, +e.textContent + d); }

/* ---------- checkout ---------- */
function renderCheckout() {
  const el = $('#co');
  if (!cart.length) {
    el.innerHTML = `<div class="done"><h1>Your bag is empty</h1><p>Add a ritual or two and come back.</p>
      <button class="btn btn-primary" style="margin-top:18px" onclick="go('#/shop')">Shop products</button></div>`; return;
  }
  const s = subtotal(), sh = shipping();
  el.innerHTML = `
  <div class="crumb"><a href="#/">Home</a> / Checkout</div>
  <div class="co">
    <form id="cform" onsubmit="placeOrder(event)" novalidate>
      <div class="steps"><b class="on"><i>1</i>Bag</b><span class="sep"></span><b class="on"><i>2</i>Details</b><span class="sep"></span><b><i>3</i>Confirmation</b></div>
      <fieldset><legend>Contact</legend><div class="f-grid">
        <div class="f full"><label>Email address</label><input type="email" name="email" placeholder="you@email.com" required></div>
        <div class="f"><label>First name</label><input name="first" placeholder="Amara" required></div>
        <div class="f"><label>Last name</label><input name="last" placeholder="Okafor" required></div>
        <div class="f full"><label>Phone</label><input name="phone" placeholder="0801 234 5678" required></div></div></fieldset>
      <fieldset><legend>Delivery address</legend><div class="f-grid">
        <div class="f full"><label>Street address</label><input name="addr" placeholder="14 Gana Street, Maitama" required></div>
        <div class="f"><label>City</label><input name="city" placeholder="Abuja" required></div>
        <div class="f"><label>State</label><select name="state" required>${['FCT — Abuja','Lagos','Rivers','Kano','Oyo','Enugu','Kaduna','Delta','Other'].map(x => `<option>${x}</option>`).join('')}</select></div>
        <div class="f full"><label>Delivery note (optional)</label><input name="note" placeholder="Gate code, landmark, best time to call"></div></div></fieldset>
      <fieldset><legend>Payment</legend><div class="pay">
        <label><input type="radio" name="pay" value="card" checked> Debit / credit card <small>Visa · Mastercard · Verve</small></label>
        <label><input type="radio" name="pay" value="transfer"> Bank transfer <small>Details sent by email</small></label>
        <label><input type="radio" name="pay" value="cod"> Pay on delivery <small>Abuja &amp; Lagos only</small></label></div>
        <p class="muted" style="font-size:11.5px;margin-top:11px">Demo storefront — no payment is taken and no card details are stored.</p></fieldset>
      <button class="btn btn-primary btn-block" type="submit" style="padding:17px">Place order · ${money(s + sh)}</button>
    </form>
    <aside class="summary"><h3>Order summary</h3>
      ${cart.map(l => { const x = lineOf(l); return `<div class="sum-item"><img src="${x.p.images[0]}" alt="">
        <div><b style="font-weight:500">${x.p.name}</b><div class="q">${l.v ? l.v + ' · ' : ''}Qty ${l.q}</div></div>
        <span>${money(x.price * l.q)}</span></div>`; }).join('')}
      <div style="margin-top:16px">
        <div class="row"><span>Subtotal</span><span>${money(s)}</span></div>
        <div class="row"><span>Delivery</span><span>${sh ? money(sh) : 'Free'}</span></div>
        <div class="row total"><span>Total</span><span>${money(s + sh)}</span></div></div>
      <p class="muted" style="font-size:11.5px">Secure checkout · 30-day returns · Dispatched within 24 hours</p>
    </aside></div>`;
}
function placeOrder(e) {
  e.preventDefault(); const f = e.target;
  if (!f.checkValidity()) return f.reportValidity();
  const d = Object.fromEntries(new FormData(f));
  const s = subtotal(), sh = shipping();
  const ref = 'LB-' + Math.floor(10000 + Math.random() * 89999);

  /* decrement stock */
  cart.forEach(l => { const p = P(l.id); if (!p) return;
    const v = l.v && p.variants ? p.variants.find(x => x.label === l.v) : null;
    if (v) v.stock = Math.max(0, v.stock - l.q); else p.stock = Math.max(0, (p.stock || 0) - l.q); });
  saveProducts();

  ORDERS.unshift({ ref, date: new Date().toISOString(), name: `${d.first} ${d.last}`, email: d.email, phone: d.phone,
    addr: `${d.addr}, ${d.city}`, state: d.state, note: d.note || '',
    items: cart.map(l => ({ id: l.id, q: l.q, v: l.v })), sub: s, ship: sh, total: s + sh, pay: d.pay, status: 'pending' });
  saveOrders();

  $('#done-name').textContent = d.first; $('#done-mail').textContent = d.email; $('#done-ord').textContent = 'ORDER #' + ref;
  cart = []; saveCart(); syncCart(); go('#/done');
}
function subscribe(e) {
  e.preventDefault();
  const em = e.target.querySelector('input').value.trim();
  if (!SUBS.find(s => s.email === em)) { SUBS.push({ email: em, d: new Date().toISOString().slice(0, 10) }); saveSubs(); }
  e.target.reset(); toast(CONTENT.news.success);
}

/* ---------- order tracking ---------- */
function renderTrack(ref) {
  $('#trk').innerHTML = `
  <div class="crumb"><a href="#/">Home</a> / Track order</div>
  <div style="max-width:620px;margin:0 auto;padding:24px 0 80px">
    <h1 style="font-size:clamp(30px,4.4vw,44px);margin-bottom:8px">Track your order</h1>
    <p class="muted" style="margin-bottom:22px">Enter the reference from your confirmation email, e.g. <span class="gold">LB-10480</span>.</p>
    <div style="display:flex;gap:10px;flex-wrap:wrap">
      <input id="tref" class="mini" style="flex:1;min-width:200px;padding:14px 18px;border-radius:100px" placeholder="LB-00000" value="${ref || ''}">
      <button class="btn btn-primary" onclick="doTrack()">Track</button></div>
    <div id="tout" style="margin-top:22px"></div></div>`;
  if (ref) doTrack();
}
function doTrack() {
  const r = ($('#tref').value || '').trim().toUpperCase();
  const o = ORDERS.find(x => x.ref.toUpperCase() === r);
  const out = $('#tout');
  if (!o) { out.innerHTML = `<div class="pane"><p class="muted">No order found with reference <b>${r || '—'}</b>. Check the reference and try again.</p></div>`; return; }
  const steps = ['pending', 'processing', 'shipped', 'delivered'];
  const at = steps.indexOf(o.status);
  out.innerHTML = `<div class="pane">
    <div class="ph"><h3>Order ${o.ref}</h3><span class="st ${o.status}">${o.status}</span></div>
    <div class="steps" style="margin-bottom:18px">${steps.map((s, i) =>
      `<b class="${i <= at && o.status !== 'cancelled' ? 'on' : ''}"><i>${i + 1}</i>${s}</b>${i < 3 ? '<span class="sep"></span>' : ''}`).join('')}</div>
    ${o.items.map(l => { const p = P(l.id); return p ? `<div class="sum-item"><img src="${p.images[0]}" alt="">
      <div><b style="font-weight:500">${p.name}</b><div class="q">${l.v ? l.v + ' · ' : ''}Qty ${l.q}</div></div>
      <span>${money(p.price * l.q)}</span></div>` : ''; }).join('')}
    <div class="row total" style="margin-top:14px"><span>Total</span><span>${money(o.total)}</span></div>
    <p class="muted" style="font-size:12.5px">Placed ${new Date(o.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })} · Delivering to ${o.addr}, ${o.state}</p></div>`;
}

/* ---------- router ---------- */
function go(h) { location.hash = h; }
function route() {
  const parts = (location.hash || '#/').replace('#/', '').split('/');
  const map = { '': 'home', home: 'home', shop: 'shop', product: 'product', checkout: 'checkout', done: 'done', track: 'track', story: 'home' };
  const key = map[parts[0]] || 'home';
  $$('.page').forEach(p => p.classList.remove('active'));
  $('#page-' + key).classList.add('active');
  closeAll(); closeSearch();
  if (key === 'shop') { activeCat = parts[1] || 'all'; $('#sort').value = 'feat'; renderShop(); }
  if (key === 'product') renderPDP(parts[1]);
  if (key === 'checkout') renderCheckout();
  if (key === 'track') renderTrack(parts[1]);
  if (parts[0] === 'story') setTimeout(() => document.getElementById('story-sec')?.scrollIntoView({ behavior: 'smooth' }), 80);
  else scrollTo(0, 0);
  observe();
}
addEventListener('hashchange', route);

const io = new IntersectionObserver(es => es.forEach(x => { if (x.isIntersecting) { x.target.classList.add('in'); io.unobserve(x.target); } }), { threshold: .1 });
function observe() { $$('.rv:not(.in)').forEach(e => io.observe(e)); }

/* ---------- CMS-driven rendering ---------- */
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const ICONS = {
  leaf:  'M12 3s6 4 6 9a6 6 0 1 1-12 0c0-5 6-9 6-9Z',
  globe: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18ZM3 12h18M12 3c2.5 2.7 2.5 15 0 18',
  truck: 'M4 8h13l3 4v5H4z',
  check: 'M20 7 9 18l-5-5',
  star:  'm12 3 2.6 5.6 6 .7-4.4 4 1.2 6L12 16.4 6.6 19.3l1.2-6-4.4-4 6-.7z',
  heart: 'M12 20s-7-4.4-7-9a4 4 0 0 1 7-2.6A4 4 0 0 1 19 11c0 4.6-7 9-7 9Z',
  shield:'M12 3l8 3v6c0 5-3.4 8.2-8 9-4.6-.8-8-4-8-9V6z',
  clock: 'M12 7v5l3 3M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z'
};

function renderNav() {
  const links = [{ t: 'Home', h: '#/' }, { t: 'Shop All', h: '#/shop' },
    ...CATEGORIES.slice(0, 3).map(c => ({ t: c.label, h: '#/shop/' + c.id })),
    { t: 'Our Story', h: '#/story' }];
  $('#navlinks').innerHTML = links.map(l => `<a href="${l.h}">${esc(l.t)}</a>`).join('');
  $('#mmenu').innerHTML = `<button class="icon-btn" style="align-self:flex-end" onclick="toggleMenu(0)" aria-label="Close">
      <svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg></button>
    <a href="#/" onclick="toggleMenu(0)">Home</a><a href="#/shop" onclick="toggleMenu(0)">Shop All</a>
    ${CATEGORIES.map(c => `<a href="#/shop/${c.id}" onclick="toggleMenu(0)">${esc(c.label)}</a>`).join('')}
    <a href="#/story" onclick="toggleMenu(0)">Our Story</a><a href="#/track" onclick="toggleMenu(0)">Track Order</a>`;
}

function renderHome() {
  const C = CONTENT, H = C.hero;
  const best = PRODUCTS.filter(p => p.badge || p.rating >= 4.8).slice(0, C.best.limit || 4);
  $('#page-home').innerHTML = `
  <div class="wrap"><div class="hero">
    <div class="hero-copy">
      <p class="eyebrow">${esc(H.eyebrow)}</p>
      <h1>${esc(H.title)}<em>${esc(H.titleEm)}</em>${esc(H.titleEnd)}</h1>
      <p class="lede">${esc(H.lede)}</p>
      <div class="hero-cta">
        ${H.ctaPrimary ? `<button class="btn btn-primary" onclick="go('${H.ctaPrimaryLink}')">${esc(H.ctaPrimary)}</button>` : ''}
        ${H.ctaGhost ? `<button class="btn btn-ghost" onclick="go('${H.ctaGhostLink}')">${esc(H.ctaGhost)}</button>` : ''}
      </div>
      ${H.stats?.length ? `<div class="hero-stats">${H.stats.map(s => `<div><b>${esc(s.b)}</b><span>${esc(s.s)}</span></div>`).join('')}</div>` : ''}
    </div>
    <div class="hero-media">
      <div class="frame"><img src="${esc(H.image)}" alt="${esc(H.title)}${esc(H.titleEm)}" width="928" height="1152" fetchpriority="high" decoding="async"></div>
      ${H.cardTitle ? `<div class="float-card"><img src="${esc(H.cardImage)}" alt="">
        <div><b>${esc(H.cardTitle)}</b><span>${esc(H.cardSub)}</span></div></div>` : ''}
    </div>
  </div></div>

  ${C.marquee?.length ? `<div class="marquee"><div>${[...C.marquee, ...C.marquee].map(w => `<span>${esc(w)}</span>`).join('')}</div></div>` : ''}

  ${C.collections?.items?.length ? `<section><div class="wrap">
    <div class="sec-head rv"><p class="eyebrow">${esc(C.collections.eyebrow)}</p>
      <h2>${esc(C.collections.title)}<span class="grad-txt">${esc(C.collections.titleEm)}</span></h2>
      <div class="rule"></div><p>${esc(C.collections.sub)}</p></div>
    <div class="cols rv">${C.collections.items.map(it => `
      <div class="col" onclick="go('#/shop/${it.cat}')"><img src="${esc(it.image)}" alt="${esc(it.title)}">
        <div class="col-txt"><span>${String(PRODUCTS.filter(p => p.cat === it.cat).length).padStart(2, '0')} products</span>
        <h3>${esc(it.title)}</h3><em>${esc(it.cta)} →</em></div></div>`).join('')}</div>
  </div></section>` : ''}

  <section style="padding-top:0"><div class="wrap">
    <div class="sec-head rv"><p class="eyebrow">${esc(C.best.eyebrow)}</p><h2>${esc(C.best.title)}</h2><div class="rule"></div></div>
    <div class="grid">${best.map(card).join('')}</div>
    <div style="text-align:center;margin-top:40px"><button class="btn btn-ghost" onclick="go('#/shop')">${esc(C.best.cta)}</button></div>
  </div></section>

  <section id="story-sec" style="background:var(--panel);border-block:1px solid var(--line)"><div class="wrap story">
    <div class="imgwrap rv"><img src="${esc(C.story.image)}" alt="${esc(C.story.title)}"></div>
    <div class="rv"><p class="eyebrow">${esc(C.story.eyebrow)}</p><h2>${esc(C.story.title)}</h2>
      ${C.story.body.map(p => `<p>${esc(p)}</p>`).join('')}
      ${C.story.cta ? `<button class="btn btn-primary" style="margin-top:12px" onclick="go('${C.story.ctaLink}')">${esc(C.story.cta)}</button>` : ''}
    </div></div></section>

  ${C.values?.length ? `<section><div class="wrap"><div class="vals rv">${C.values.map(v => `
    <div class="val"><svg viewBox="0 0 24 24"><path d="${ICONS[v.icon] || ICONS.check}"/></svg>
      <h4>${esc(v.title)}</h4><p>${esc(v.text)}</p></div>`).join('')}</div></div></section>` : ''}

  <section style="padding-top:0"><div class="wrap"><div class="news rv">
    <p class="eyebrow">${esc(C.news.eyebrow)}</p><h2>${esc(C.news.title)}</h2><p>${esc(C.news.sub)}</p>
    <form onsubmit="subscribe(event)"><input type="email" required placeholder="${esc(C.news.placeholder)}" aria-label="Email">
      <button class="btn btn-primary" type="submit">${esc(C.news.cta)}</button></form>
  </div></div></section>`;
}

function renderFooter() {
  const F = CONTENT.footer;
  $('#foot').innerHTML = `<div class="wrap">
    <div class="foot">
      <div><div class="logo"><img src="assets/logo-transparent.png" alt=""><span class="lt"><b>LARA BEAUTY</b><small>Atelier</small></span></div>
        <p>${esc(F.blurb)}</p></div>
      <div><h5>${esc(F.shopTitle)}</h5><ul>${CATEGORIES.map(c => `<li><a href="#/shop/${c.id}">${esc(c.label)}</a></li>`).join('')}</ul></div>
      <div><h5>${esc(F.helpTitle)}</h5><ul>${F.help.map((h, i) => `<li>${i === 0 ? `<a href="#/track">${esc(h)}</a>` : esc(h)}</li>`).join('')}</ul></div>
      <div><h5>${esc(F.contactTitle)}</h5><ul>${[SETTINGS.email, SETTINGS.phone, SETTINGS.ig, SETTINGS.address, F.hours].map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>
    </div>
    <div class="foot-bot"><span>${esc(F.copyright)}</span>
      <span>${esc(F.legal)}${F.adminLink ? ` · <a href="admin.html" class="staff-link" rel="nofollow">${esc(F.adminLabel || 'Staff login')}</a>` : ''}</span>
    </div></div>`;
}

/* ---------- init ---------- */
function boot() {
  document.title = CONTENT.seo.title;
  document.querySelector('meta[name=description]')?.setAttribute('content', CONTENT.seo.desc);
  $('#announce').textContent = SETTINGS.announce;
  $('#announce').style.display = SETTINGS.announce ? '' : 'none';
  renderNav(); renderHome(); renderFooter(); syncCart();
}
document.addEventListener('db:products', () => { boot(); route(); });
document.addEventListener('db:settings', boot);
document.addEventListener('db:content', () => { boot(); route(); });
boot(); route();
