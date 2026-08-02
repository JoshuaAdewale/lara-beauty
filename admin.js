/* Lara Beauty Atelier — admin portal */
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
/* Staff accounts. Replace with a real server-side auth check in production. */
const STAFF = [
  { u: 'admin@larabeauty.ng', p: 'lara2026', name: 'Lara', role: 'owner' },
  { u: 'staff@larabeauty.ng', p: 'atelier26', name: 'Store staff', role: 'staff' }
];
const SESSION_MS = 60 * 60 * 1000;   // auto sign-out after 1 hour idle
const MAX_TRIES = 5;
let session = null;

/* -----------------------------------------------------------------------------
   Toast
   -------------------------------------------------------------------------- */
function toast(message) {
  const el = $('#toast');
  el.textContent = message;
  el.classList.add('on');
  clearTimeout(el._timer);
  el._timer = setTimeout(() => el.classList.remove('on'), 2400);
}

/* -----------------------------------------------------------------------------
   Authentication
   Client-side only — see README for the server-side upgrade path.
   -------------------------------------------------------------------------- */
function lockState() {
  return DB.read('lba_lock', { n: 0, until: 0 });
}

function handleLogin(event) {
  event.preventDefault();

  const lock = lockState();
  if (lock.until > Date.now()) {
    return showLockout(Math.ceil((lock.until - Date.now()) / 1000));
  }

  const email = $('#login-email').value.trim().toLowerCase();
  const password = $('#login-password').value;
  const account = STAFF.find(s => s.u === email && s.p === password);

  if (account) {
    DB.write('lba_lock', { n: 0, until: 0 });
    DB.write(DB.k.a, {
      at: Date.now(), u: account.u, name: account.name, role: account.role
    });
    showApp();
    return;
  }

  const attempts = lock.n + 1;
  const lockedUntil = attempts >= MAX_TRIES ? Date.now() + 60000 : 0;
  DB.write('lba_lock', {
    n: attempts >= MAX_TRIES ? 0 : attempts,
    until: lockedUntil
  });
  $('#login-password').value = '';

  if (lockedUntil) {
    showLockout(60);
  } else {
    const left = MAX_TRIES - attempts;
    toast(`Invalid credentials — ${left} attempt${left === 1 ? '' : 's'} left`);
  }
}

function showLockout(seconds) {
  const el = $('#lockout');
  el.hidden = false;
  (function tick() {
    if (seconds <= 0) { el.hidden = true; return; }
    el.textContent = `Too many failed attempts. Try again in ${seconds--}s.`;
    setTimeout(tick, 1000);
  })();
}

function logout() {
  localStorage.removeItem(DB.k.a);
  location.replace('index.html');
}

/** Returns true when a valid, unexpired session exists. */
function hasSession() {
  const saved = DB.read(DB.k.a);
  const valid = saved && saved.u
    && STAFF.some(s => s.u === saved.u)
    && Date.now() - saved.at <= SESSION_MS;

  if (!valid) {
    localStorage.removeItem(DB.k.a);
    $('#login').hidden = false;
    $('#app').hidden = true;
    return false;
  }
  session = saved;
  return true;
}

/** Extend the session on any interaction. */
function touchSession() {
  if (!session) return;
  session.at = Date.now();
  DB.write(DB.k.a, session);
}

['click', 'keydown'].forEach(evt =>
  addEventListener(evt, touchSession, { passive: true }));

setInterval(() => {
  if (session && !hasSession()) {
    toast('Session expired');
    location.reload();
  }
}, 30000);

function showApp() {
  if (!hasSession()) return;
  $('#login').hidden = true;
  $('#app').hidden = false;
  $('#who').textContent = `${session.name} · ${session.role}`;
  refreshMsgBadge();
  nav(location.hash.replace('#', '') || 'dash');
}

/* -----------------------------------------------------------------------------
   Modals — two layers so the media picker can stack over a form
   -------------------------------------------------------------------------- */
function openModal(html) {
  $('#modal-body').innerHTML = html;
  $('#modal').hidden = false;
  $('#modal').classList.add('on');
  document.body.classList.add('lock');
}

function closeModal() {
  $('#modal').classList.remove('on');
  $('#modal').hidden = true;
  document.body.classList.remove('lock');
}

function openModal2(html) {
  $('#modal2-body').innerHTML = html;
  $('#modal2').hidden = false;
  $('#modal2').classList.add('on');
}

function closeModal2() {
  $('#modal2').classList.remove('on');
  $('#modal2').hidden = true;
}

/* -----------------------------------------------------------------------------
   Global event delegation — replaces inline onclick attributes
   -------------------------------------------------------------------------- */
const ADMIN_ACTIONS = {
  'logout': logout,
  'export-csv': () => exportCSV(),
  'new-product': () => editProduct(),
  'close-modal': closeModal,
  'close-modal2': closeModal2,
  'toggle-sidebar': () => {
    const bar = $('#sidebar');
    const open = bar.classList.toggle('on');
    $('[data-action="toggle-sidebar"]').setAttribute('aria-expanded', String(open));
  }
};

/* -----------------------------------------------------------------------------
   Row-level command dispatcher

   Generated markup carries `data-cmd` plus optional `data-arg*` attributes
   instead of inline onclick handlers, e.g.

     <button data-cmd="order:view" data-arg="LB-10480">

   Commands receive the element's dataset, so arguments never need escaping
   into a JavaScript string.
   -------------------------------------------------------------------------- */
const COMMANDS = {
  /* navigation */
  'go': d => nav(d.arg),
  'tab': d => { ptab = d.arg; vPages(); },
  'preview-site': () => window.open('index.html', '_blank', 'noopener'),
  'print': () => window.print(),

  /* messages */
  'msg:filter': d => { msgFilter = d.arg; vMessages(); },
  'msg:toggle': d => toggleMsgRead(d.arg),
  'msg:delete': d => deleteMsg(d.arg),
  'msg:read-all': () => markAllRead(),
  'msg:export': () => exportMessages(),

  /* orders */
  'order:view': d => viewOrder(d.arg),
  'order:delete': d => delOrder(d.arg),
  'order:filter': d => { ofilter = d.arg; vOrders(); },
  'order:status': d => { setStatus(d.arg, d.arg2); closeModal(); },

  /* products */
  'product:new': () => editProduct(),
  'product:edit': d => editProduct(d.arg),
  'product:duplicate': d => dupProduct(d.arg),
  'product:delete': d => delProduct(d.arg),

  /* categories */
  'cat:new': () => editCat(),
  'cat:edit': d => editCat(d.arg),
  'cat:save': d => saveCat(d.arg || ''),
  'cat:delete': d => delCat(d.arg),
  'cat:move': d => moveCat(Number(d.arg), Number(d.arg2)),

  /* media */
  'media:upload': () => $('#media-input').click(),
  'media:url': () => addUrl(),
  'media:delete': d => delMedia(Number(d.arg)),
  'media:pick': d => pickMedia(d.arg),
  'media:choose': d => chooseMedia(MEDIA[Number(d.arg)]),
  'media:copy': d => {
    navigator.clipboard?.writeText(d.arg).then(
      () => toast('Path copied'),
      () => toast('Could not copy')
    );
  },

  /* reviews */
  'review:approve': d => approveRev(d.arg, Number(d.arg2)),
  'review:delete': d => delRev(d.arg, Number(d.arg2)),

  /* content editor */
  'content:save': d => SAVERS[d.arg]?.(),
  'content:reset': () => resetContent(),
  'col:save': d => saveCol(Number(d.arg)),
  'col:add': () => addCol(),
  'col:delete': d => delCol(Number(d.arg)),
  'val:save': d => saveVal(Number(d.arg)),
  'val:add': () => addVal(),
  'val:delete': d => delVal(Number(d.arg)),
  'announce:save': () => {
    SETTINGS.announce = $('#ann').value;
    saveSettings();
    toast('Announcement updated');
  },

  /* settings & data */
  'settings:save': () => saveSet(),
  'data:reset': () => resetAll(),
  'export:csv': () => exportCSV(),
  'export:json': () => exportJSON(),
  'export:subs': () => exportSubs()
};

/** Save handlers for the Pages editor, referenced by `content:save`. */
const SAVERS = {
  hero: () => saveHero(),
  marquee: () => saveMq(),
  colsHead: () => saveColsHead(),
  best: () => saveBest(),
  story: () => saveStory(),
  news: () => saveNews(),
  footer: () => saveFooter(),
  seo: () => saveSeo()
};

document.addEventListener('click', event => {
  const el = event.target.closest('[data-cmd]');
  if (!el) return;
  const run = COMMANDS[el.dataset.cmd];
  if (!run) return;
  event.preventDefault();
  run(el.dataset);
});

document.addEventListener('change', event => {
  if (event.target.id === 'media-input') uploadImgs(event.target);
  const sel = event.target.closest('[data-cmd-change]');
  if (sel) COMMANDS[sel.dataset.cmdChange]?.({ ...sel.dataset, value: sel.value });
});

document.addEventListener('submit', event => {
  if (event.target.id === 'login-form') handleLogin(event);
});

document.addEventListener('click', event => {
  const viewBtn = event.target.closest('[data-view]');
  if (viewBtn) { nav(viewBtn.dataset.view); return; }

  const actionEl = event.target.closest('[data-action]');
  if (actionEl && ADMIN_ACTIONS[actionEl.dataset.action]) {
    event.preventDefault();
    ADMIN_ACTIONS[actionEl.dataset.action]();
    return;
  }

  // click the backdrop (not the panel) to dismiss
  if (event.target.id === 'modal') closeModal();
  if (event.target.id === 'modal2') closeModal2();
});

document.addEventListener('keydown', event => {
  if (event.key !== 'Escape') return;
  $('#modal2').hidden ? closeModal() : closeModal2();
});

/* ---------- helpers ---------- */
const fdate = d => new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', yyyy: undefined, year: 'numeric' });
const revenue = o => o.status === 'cancelled' ? 0 : o.total;
const paid = () => ORDERS.filter(o => o.status !== 'cancelled');
const daysAgo = n => Date.now() - n * 864e5;
const inRange = (o, n) => new Date(o.date).getTime() >= daysAgo(n);
const sum = a => a.reduce((s, x) => s + x, 0);
const pct = (a, b) => b === 0 ? (a > 0 ? 100 : 0) : Math.round((a - b) / b * 100);

function orderUnits(o) { return o.items.reduce((s, l) => s + l.q, 0); }
function productStats() {
  const m = {};
  paid().forEach(o => o.items.forEach(l => {
    const p = P(l.id); if (!p) return;
    m[l.id] = m[l.id] || { p, units: 0, rev: 0 };
    m[l.id].units += l.q; m[l.id].rev += p.price * l.q;
  }));
  return Object.values(m).sort((a, b) => b.rev - a.rev);
}
function customers() {
  const m = {};
  ORDERS.forEach(o => {
    m[o.email] = m[o.email] || { name: o.name, email: o.email, phone: o.phone, state: o.state, orders: 0, spend: 0, last: o.date };
    m[o.email].orders++; if (o.status !== 'cancelled') m[o.email].spend += o.total;
    if (new Date(o.date) > new Date(m[o.email].last)) m[o.email].last = o.date;
  });
  return Object.values(m).sort((a, b) => b.spend - a.spend);
}

/* ---------- nav ---------- */
const TITLES = { dash: ['Dashboard', 'Live overview of the atelier'], orders: ['Orders', 'Every order, filterable and editable'],
  messages: ['Messages', 'Enquiries, order alerts and subscribers'],
  pages: ['Pages & Content', 'Edit every section of the storefront'], categories: ['Categories', 'Collections shown in the menu and filters'],
  media: ['Media', 'Image library used across the site'],
  products: ['Products', 'Add, edit and publish your catalogue'], inventory: ['Inventory', 'Stock levels across variants'],
  customers: ['Customers', 'Who buys, how often and how much'], reviews: ['Reviews', 'Approve or reject customer reviews'],
  marketing: ['Marketing', 'Subscribers, discounts and the announcement bar'], analytics: ['Analytics', 'Revenue, categories and trends'],
  settings: ['Settings', 'Store details, shipping and data'] };
let view = 'dash';
function nav(v) {
  view = v; location.hash = v;
  $$('.side-nav [data-view]').forEach(btn =>
    btn.classList.toggle('on', btn.dataset.view === v));
  $('#view-title').textContent = TITLES[v][0];
  $('#view-sub').textContent = TITLES[v][1];
  $('#sidebar').classList.remove('on');
  ({ dash: vDash, orders: vOrders, messages: vMessages, pages: vPages, categories: vCategories, media: vMedia,
     products: vProducts, inventory: vInventory, customers: vCustomers,
     reviews: vReviews, marketing: vMarketing, analytics: vAnalytics, settings: vSettings })[v]();
  scrollTo(0, 0);
}

/* ---------- dashboard ---------- */
function vDash() {
  const r30 = sum(ORDERS.filter(o => inRange(o, 30)).map(revenue));
  const r60 = sum(ORDERS.filter(o => inRange(o, 60) && !inRange(o, 30)).map(revenue));
  const o30 = ORDERS.filter(o => inRange(o, 30)).length, o60 = ORDERS.filter(o => inRange(o, 60) && !inRange(o, 30)).length;
  const aov = o30 ? r30 / o30 : 0, aov60 = o60 ? r60 / o60 : 0;
  const cust = customers().length;
  const low = PRODUCTS.filter(p => totalStock(p) <= SETTINGS.lowStock);
  const pending = ORDERS.filter(o => o.status === 'pending' || o.status === 'processing');
  const pendRev = PRODUCTS.flatMap(p => p.reviews.filter(r => r.ok === false).map(r => ({ p, r })));

  $('#view').innerHTML = `
  <div class="kpis">
    ${kpi('Revenue · 30d', money(r30), pct(r30, r60), 'M4 19V5M4 19h16 M7 15l4-5 3 3 5-7')}
    ${kpi('Orders · 30d', o30, pct(o30, o60), 'M5 4h14v16H5z')}
    ${kpi('Avg. order value', money(aov), pct(aov, aov60), 'M12 3v18M8 7h6a3 3 0 0 1 0 6H9a3 3 0 0 0 0 6h6')}
    ${kpi('Customers', cust, null, 'M12 8a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z')}
  </div>

  ${(low.length || pending.length || pendRev.length) ? `<div class="pane attention-panel">
    <h3 class="attention-title">Needs your attention</h3>
    <div class="attention-list">
      ${pending.length ? `<button class="chip" data-cmd="go" data-arg="orders">${pending.length} order${pending.length > 1 ? 's' : ''} to fulfil</button>` : ''}
      ${low.length ? `<button class="chip" data-cmd="go" data-arg="inventory">${low.length} product${low.length > 1 ? 's' : ''} low on stock</button>` : ''}
      ${pendRev.length ? `<button class="chip" data-cmd="go" data-arg="reviews">${pendRev.length} review${pendRev.length > 1 ? 's' : ''} to approve</button>` : ''}
    </div></div>` : ''}

  <div class="panes">
    <div class="pane"><div class="ph"><div><h3>Revenue</h3><p>Last 12 weeks</p></div><span class="gold">${money(sum(paid().map(revenue)))} all time</span></div>
      <div class="chart-wrap"><div class="chart">${weekBars()}</div></div></div>
    <div class="pane"><div class="ph"><div><h3>Sales by category</h3><p>Share of revenue</p></div></div>
      <div class="donut">${donut()}</div></div>
  </div>

  <div class="panes cols-2">
    <div class="pane"><div class="ph"><h3>Recent orders</h3><button class="btn btn-ghost btn-sm" data-cmd="go" data-arg="orders">View all</button></div>
      <div class="tablewrap"><table><thead><tr><th>Ref</th><th>Customer</th><th>Total</th><th>Status</th></tr></thead><tbody>
        ${ORDERS.slice(0, 6).map(o => `<tr class="u-clickable" data-cmd="order:view" data-arg="${o.ref}">
          <td class="gold">${o.ref}</td><td>${o.name}<br><small class="muted">${fdate(o.date)}</small></td>
          <td>${money(o.total)}</td><td><span class="st ${o.status}">${o.status}</span></td></tr>`).join('')}
      </tbody></table></div></div>
    <div class="pane"><div class="ph"><h3>Top products</h3><button class="btn btn-ghost btn-sm" data-cmd="go" data-arg="analytics">Details</button></div>
      <div class="tablewrap"><table><thead><tr><th>Product</th><th>Units</th><th>Revenue</th></tr></thead><tbody>
        ${productStats().slice(0, 6).map(s => `<tr><td><div class="tprod"><img src="${s.p.images[0]}" alt=""><div><b>${s.p.name}</b><small>${s.p.sku || ''}</small></div></div></td>
          <td>${s.units}</td><td class="gold">${money(s.rev)}</td></tr>`).join('')}
      </tbody></table></div></div>
  </div>`;
}
function kpi(k, v, delta, path) {
  return `<div class="kpi"><div class="k"><svg viewBox="0 0 24 24"><path d="${path}"/></svg>${k}</div><b>${v}</b>
    ${delta === null ? '<div class="d muted">All time</div>' : `<div class="d ${delta >= 0 ? 'up' : 'dn'}">${delta >= 0 ? '▲' : '▼'} ${Math.abs(delta)}% vs prev. period</div>`}</div>`;
}
function weekBars() {
  const weeks = [];
  for (let i = 11; i >= 0; i--) {
    const a = daysAgo((i + 1) * 7), b = daysAgo(i * 7);
    const v = sum(ORDERS.filter(o => { const t = new Date(o.date).getTime(); return t >= a && t < b; }).map(revenue));
    weeks.push({ v, l: 'W' + (12 - i) });
  }
  const max = Math.max(...weeks.map(w => w.v), 1);
  return weeks.map(w => `<div class="cb" style="--bar-height:${Math.max(4, w.v / max * 100)}%"><em>${money(w.v)}</em><span>${w.l}</span></div>`).join('');
}
function donut() {
  const cols = ['#C9A227', '#E3C25C', '#9C7B1B', '#6E5A14'];
  const by = CATEGORIES.map((c, i) => {
    const rev = sum(paid().flatMap(o => o.items.filter(l => P(l.id)?.cat === c.id).map(l => P(l.id).price * l.q)));
    return { label: c.label, rev, col: cols[i % 4] };
  }).filter(x => x.rev > 0);
  const tot = sum(by.map(x => x.rev)) || 1;
  let acc = 0;
  const stops = by.map(x => { const a = acc / tot * 360, b = (acc + x.rev) / tot * 360; acc += x.rev; return `${x.col} ${a}deg ${b}deg`; }).join(',');
  return `<div class="donut-ring" style="--donut-stops:conic-gradient(${stops})">
      <div class="donut-hole">
        <div><b class="serif gold u-text-lg">${money(tot)}</b><br><small class="muted u-text-xs">revenue</small></div></div></div>
    <div class="dlegend">${by.map(x => `<div><i class="swatch" style="--swatch:${x.col}"></i>${x.label}<span>${Math.round(x.rev / tot * 100)}%</span></div>`).join('')}</div>`;
}

/* ---------- orders ---------- */
let ofilter = 'all', oq = '';
function vOrders() {
  const sts = ['all', 'pending', 'processing', 'shipped', 'delivered', 'cancelled'];
  let list = ORDERS.filter(o => (ofilter === 'all' || o.status === ofilter) &&
    (!oq || (o.ref + o.name + o.email + o.state).toLowerCase().includes(oq.toLowerCase())));
  $('#view').innerHTML = `
  <div class="toolbar">
    <input type="search" placeholder="Search ref, name, email…" value="${oq}" oninput="oq=this.value;vOrders();this.focus()">
    ${sts.map(s => `<button class="chip ${ofilter === s ? 'on' : ''}" data-cmd="order:filter" data-arg="${s}">${s}${s !== 'all' ? ` (${ORDERS.filter(o => o.status === s).length})` : ''}</button>`).join('')}
  </div>
  <div class="pane"><div class="tablewrap"><table>
    <thead><tr><th>Ref</th><th>Date</th><th>Customer</th><th>Items</th><th>Total</th><th>Payment</th><th>Status</th><th></th></tr></thead>
    <tbody>${list.length ? list.map(o => `<tr>
      <td class="gold u-clickable" data-cmd="order:view" data-arg="${o.ref}">${o.ref}</td>
      <td class="muted">${fdate(o.date)}</td>
      <td><b class="u-medium">${o.name}</b><br><small class="muted">${o.state}</small></td>
      <td>${orderUnits(o)}</td><td>${money(o.total)}</td>
      <td class="muted u-capitalize">${o.pay}</td>
      <td><select class="mini" onchange="setStatus('${o.ref}',this.value)">
        ${['pending','processing','shipped','delivered','cancelled'].map(s => `<option ${o.status === s ? 'selected' : ''}>${s}</option>`).join('')}</select></td>
      <td><button class="ico" data-cmd="order:view" data-arg="${o.ref}" title="View"><svg viewBox="0 0 24 24"><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg></button>
          <button class="ico del" data-cmd="order:delete" data-arg="${o.ref}" title="Delete"><svg viewBox="0 0 24 24"><path d="M4 7h16M9 7V5h6v2M6 7l1 13h10l1-13"/></svg></button></td>
    </tr>`).join('') : '<tr><td colspan="8" class="muted table-empty">No orders match.</td></tr>'}</tbody>
  </table></div></div>`;
}
function setStatus(ref, s) { const o = ORDERS.find(x => x.ref === ref); o.status = s; saveOrders(); toast(`${ref} → ${s}`); vOrders(); }
function delOrder(ref) { if (!confirm('Delete order ' + ref + '?')) return; ORDERS = ORDERS.filter(o => o.ref !== ref); saveOrders(); vOrders(); toast('Order deleted'); }
function viewOrder(ref) {
  const o = ORDERS.find(x => x.ref === ref);
  openModal(`<div class="mhead"><h3>Order ${o.ref}</h3><button type="button" class="icon-btn" data-action="close-modal" aria-label="Close"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg></button></div>
    <div class="modal-order-meta"><span class="st ${o.status}">${o.status}</span><span class="muted">${fdate(o.date)}</span><span class="muted u-capitalize">${o.pay}</span></div>
    <div class="f-grid modal-grid">
      <div><small class="muted">Customer</small><p>${o.name}<br>${o.email}<br>${o.phone}</p></div>
      <div><small class="muted">Deliver to</small><p>${o.addr}<br>${o.state}${o.note ? '<br><em>' + o.note + '</em>' : ''}</p></div></div>
    ${o.items.map(l => { const p = P(l.id); return p ? `<div class="sum-item"><img src="${p.images[0]}" alt="">
      <div><b class="u-medium">${p.name}</b><div class="q">${l.v ? l.v + ' · ' : ''}Qty ${l.q}</div></div><span>${money(p.price * l.q)}</span></div>` : ''; }).join('')}
    <div class="u-mt-lg">
      <div class="row"><span>Subtotal</span><span>${money(o.sub)}</span></div>
      <div class="row"><span>Delivery</span><span>${o.ship ? money(o.ship) : 'Free'}</span></div>
      <div class="row total"><span>Total</span><span>${money(o.total)}</span></div></div>
    <div class="modal-actions">
      ${['processing','shipped','delivered'].map(s => `<button class="btn btn-ghost btn-sm" data-cmd="order:status" data-arg="${o.ref}" data-arg2="${s}">Mark ${s}</button>`).join('')}
      <button class="btn btn-dark btn-sm" data-cmd="print">Print invoice</button></div>`);
}

/* ---------- products ---------- */
let pq = '';
function vProducts() {
  const list = PRODUCTS.filter(p => !pq || (p.name + p.cat + (p.sku || '')).toLowerCase().includes(pq.toLowerCase()));
  $('#view').innerHTML = `
  <div class="toolbar"><input type="search" placeholder="Search products…" value="${pq}" oninput="pq=this.value;vProducts();this.focus()">
    <span class="muted u-text-sm">${list.length} of ${PRODUCTS.length}</span></div>
  <div class="pane"><div class="tablewrap"><table>
    <thead><tr><th>Product</th><th>Category</th><th>Price</th><th>Compare</th><th>Stock</th><th>Rating</th><th></th></tr></thead>
    <tbody>${list.map(p => `<tr>
      <td><div class="tprod"><img src="${p.images[0]}" alt=""><div><b>${p.name}</b><small>${p.sku || ''}</small></div></div></td>
      <td class="muted">${CATEGORIES.find(c => c.id === p.cat)?.label || p.cat}</td>
      <td class="gold">${money(p.price)}</td><td class="muted">${p.compare ? money(p.compare) : '—'}</td>
      <td>${stockPill(p)}</td><td>${p.rating.toFixed(1)} ★</td>
      <td class="u-nowrap">
        <button class="ico" data-cmd="product:edit" data-arg="${p.id}" title="Edit"><svg viewBox="0 0 24 24"><path d="M4 20h4L19 9l-4-4L4 16z"/></svg></button>
        <button class="ico" data-cmd="product:duplicate" data-arg="${p.id}" title="Duplicate"><svg viewBox="0 0 24 24"><path d="M8 8h12v12H8z"/><path d="M4 16V4h12"/></svg></button>
        <button class="ico del" data-cmd="product:delete" data-arg="${p.id}" title="Delete"><svg viewBox="0 0 24 24"><path d="M4 7h16M9 7V5h6v2M6 7l1 13h10l1-13"/></svg></button></td>
    </tr>`).join('')}</tbody></table></div></div>`;
}
function stockPill(p) {
  const s = totalStock(p);
  const cls = s <= 0 ? 'cancelled' : s <= SETTINGS.lowStock ? 'pending' : 'delivered';
  return `<span class="st ${cls}">${s} in stock</span>`;
}
function editProduct(id) {
  const p = id ? P(id) : { id: '', name: '', tagline: '', cat: 'skin', price: 0, compare: null, rating: 5, badge: '', stock: 0, sku: '',
    tone: [], images: ['assets/logo-transparent.png'], variants: [], desc: '', details: [], how: '', reviews: [] };
  openModal(`<div class="mhead"><h3>${id ? 'Edit' : 'New'} product</h3>
    <button type="button" class="icon-btn" data-action="close-modal" aria-label="Close"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg></button></div>
  <form onsubmit="saveProduct(event,'${id || ''}')">
    <div class="f-grid">
      <div class="f"><label>Name</label><input name="name" value="${p.name}" required></div>
      <div class="f"><label>SKU</label><input name="sku" value="${p.sku || ''}"></div>
      <div class="f full"><label>Tagline</label><input name="tagline" value="${p.tagline}"></div>
      <div class="f"><label>Category</label><select name="cat">${CATEGORIES.map(c => `<option value="${c.id}" ${p.cat === c.id ? 'selected' : ''}>${c.label}</option>`).join('')}</select></div>
      <div class="f"><label>Badge</label><input name="badge" value="${p.badge || ''}" placeholder="Bestseller"></div>
      <div class="f"><label>Price (₦)</label><input name="price" type="number" value="${p.price}" required></div>
      <div class="f"><label>Compare at (₦)</label><input name="compare" type="number" value="${p.compare || ''}"></div>
      <div class="f"><label>Stock</label><input name="stock" type="number" value="${p.stock || 0}"></div>
      <div class="f"><label>Rating</label><input name="rating" type="number" step="0.1" max="5" min="0" value="${p.rating}"></div>
      <div class="f full"><label>Images (comma-separated paths)</label>
        <div class="inline-field">
          <input name="images" id="pimgs" value="${p.images.join(', ')}" class="u-grow">
          <button type="button" class="btn btn-ghost btn-sm" data-cmd="media:pick" data-arg="pimgs-add">+ Add</button>
        </div><input type="hidden" id="pimgs-add" onchange="appendImg(this.value)"></div>
      <div class="f full"><label>Variants — one per line: <em>label | price | stock</em></label>
        <textarea name="variants" rows="3">${(p.variants || []).map(v => `${v.label} | ${v.price} | ${v.stock}`).join('\n')}</textarea></div>
      <div class="f full"><label>Description</label><textarea name="desc" rows="3">${p.desc}</textarea></div>
      <div class="f full"><label>Key details (one per line)</label><textarea name="details" rows="3">${p.details.join('\n')}</textarea></div>
      <div class="f full"><label>How to use</label><textarea name="how" rows="2">${p.how}</textarea></div>
      <div class="f full"><label>Skin tags (comma-separated)</label><input name="tone" value="${p.tone.join(', ')}"></div>
    </div>
    <div class="form-actions">
      <button class="btn btn-primary" type="submit">Save product</button>
      <button class="btn btn-dark" type="button" data-action="close-modal">Cancel</button></div></form>`);
}
function saveProduct(e, id) {
  e.preventDefault();
  const d = Object.fromEntries(new FormData(e.target));
  const variants = d.variants.split('\n').map(l => l.trim()).filter(Boolean).map(l => {
    const [label, price, stock] = l.split('|').map(x => (x || '').trim());
    return { label, price: +price || 0, stock: +stock || 0 };
  });
  const obj = {
    name: d.name, sku: d.sku, tagline: d.tagline, cat: d.cat, badge: d.badge || null,
    price: +d.price, compare: d.compare ? +d.compare : null, stock: +d.stock, rating: +d.rating,
    images: d.images.split(',').map(x => x.trim()).filter(Boolean),
    variants, desc: d.desc, details: d.details.split('\n').filter(Boolean),
    how: d.how, tone: d.tone.split(',').map(x => x.trim()).filter(Boolean)
  };
  if (id) Object.assign(P(id), obj);
  else PRODUCTS.push(Object.assign({ id: d.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'p' + Date.now(), reviews: [] }, obj));
  saveProducts(); closeModal(); vProducts(); toast('Product saved');
}
function dupProduct(id) {
  const p = JSON.parse(JSON.stringify(P(id)));
  p.id = p.id + '-copy-' + Math.floor(Math.random() * 900 + 100); p.name += ' (copy)'; p.badge = null;
  PRODUCTS.push(p); saveProducts(); vProducts(); toast('Product duplicated');
}
function delProduct(id) { if (!confirm('Delete this product?')) return; PRODUCTS = PRODUCTS.filter(p => p.id !== id); saveProducts(); vProducts(); toast('Product deleted'); }

/* ---------- inventory ---------- */
function vInventory() {
  const rows = [];
  PRODUCTS.forEach(p => {
    if (p.variants && p.variants.length) p.variants.forEach((v, i) => rows.push({ p, v, i }));
    else rows.push({ p, v: null, i: -1 });
  });
  const low = rows.filter(r => (r.v ? r.v.stock : p_(r.p)) <= SETTINGS.lowStock);
  function p_(p) { return totalStock(p); }
  $('#view').innerHTML = `
  <div class="kpis cols-3">
    ${kpi('Total units', sum(PRODUCTS.map(totalStock)), null, 'M4 7h16v13H4z')}
    ${kpi('Low / out of stock', low.length, null, 'M12 9v4M12 17h.01M10.3 3.9 2 19h20L13.7 3.9a2 2 0 0 0-3.4 0Z')}
    ${kpi('Stock value', money(sum(rows.map(r => (r.v ? r.v.price * r.v.stock : r.p.price * (r.p.stock || 0))))), null, 'M12 3v18M8 7h6a3 3 0 0 1 0 6H9a3 3 0 0 0 0 6h6')}
  </div>
  <div class="pane"><div class="ph"><h3>Stock by variant</h3><p>Edit a number to update instantly</p></div>
  <div class="tablewrap"><table><thead><tr><th>Product</th><th>Variant</th><th>Price</th><th>Stock</th><th>Status</th></tr></thead><tbody>
    ${rows.map(r => { const st = r.v ? r.v.stock : (r.p.stock || 0);
      const cls = st <= 0 ? 'cancelled' : st <= SETTINGS.lowStock ? 'pending' : 'delivered';
      const lbl = st <= 0 ? 'Out of stock' : st <= SETTINGS.lowStock ? 'Low' : 'Healthy';
      return `<tr><td><div class="tprod"><img src="${r.p.images[0]}" alt=""><div><b>${r.p.name}</b><small>${r.p.sku || ''}</small></div></div></td>
        <td class="muted">${r.v ? r.v.label : 'Default'}</td><td class="gold">${money(r.v ? r.v.price : r.p.price)}</td>
        <td><input class="mini stock-input" type="number" value="${st}" onchange="setStock('${r.p.id}',${r.i},this.value)"></td>
        <td><span class="st ${cls}">${lbl}</span></td></tr>`; }).join('')}
  </tbody></table></div></div>`;
}
function setStock(id, i, val) {
  const p = P(id); const n = Math.max(0, +val || 0);
  if (i >= 0) p.variants[i].stock = n; else p.stock = n;
  saveProducts(); toast('Stock updated'); vInventory();
}

/* ---------- customers ---------- */
function vCustomers() {
  const cs = customers();
  $('#view').innerHTML = `
  <div class="kpis cols-3">
    ${kpi('Total customers', cs.length, null, 'M12 8a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z')}
    ${kpi('Repeat buyers', cs.filter(c => c.orders > 1).length, null, 'M4 12a8 8 0 1 1 3 6')}
    ${kpi('Avg. lifetime value', money(cs.length ? sum(cs.map(c => c.spend)) / cs.length : 0), null, 'M12 3v18M8 7h6a3 3 0 0 1 0 6H9a3 3 0 0 0 0 6h6')}
  </div>
  <div class="pane"><div class="tablewrap"><table>
    <thead><tr><th>Customer</th><th>Location</th><th>Orders</th><th>Lifetime spend</th><th>Last order</th><th>Segment</th></tr></thead>
    <tbody>${cs.map(c => `<tr>
      <td><b class="u-medium">${c.name}</b><br><small class="muted">${c.email}</small></td>
      <td class="muted">${c.state}</td><td>${c.orders}</td><td class="gold">${money(c.spend)}</td>
      <td class="muted">${fdate(c.last)}</td>
      <td><span class="st ${c.spend > 40000 ? 'delivered' : c.orders > 1 ? 'shipped' : 'processing'}">${c.spend > 40000 ? 'VIP' : c.orders > 1 ? 'Repeat' : 'New'}</span></td>
    </tr>`).join('')}</tbody></table></div></div>`;
}

/* ---------- reviews ---------- */
function vReviews() {
  const all = PRODUCTS.flatMap(p => p.reviews.map((r, i) => ({ p, r, i })));
  const pend = all.filter(x => x.r.ok === false);
  $('#view').innerHTML = `
  <div class="kpis cols-3">
    ${kpi('Total reviews', all.length, null, 'm12 3 2.6 5.6 6 .7-4.4 4 1.2 6L12 16.4')}
    ${kpi('Awaiting approval', pend.length, null, 'M12 7v5l3 3')}
    ${kpi('Average rating', (all.length ? sum(all.map(x => x.r.r)) / all.length : 0).toFixed(2) + ' ★', null, 'M12 3v18')}
  </div>
  <div class="pane"><div class="ph"><h3>All reviews</h3><p>Approve to publish on the storefront</p></div>
  <div class="tablewrap"><table><thead><tr><th>Product</th><th>Reviewer</th><th>Rating</th><th>Review</th><th>Status</th><th></th></tr></thead><tbody>
    ${all.map(x => `<tr>
      <td><div class="tprod"><img src="${x.p.images[0]}" alt=""><div><b>${x.p.name}</b></div></div></td>
      <td>${x.r.n}<br><small class="muted">${x.r.d}</small></td><td class="gold">${'★'.repeat(x.r.r)}</td>
      <td class="review-cell"><b class="u-medium">${x.r.t}</b><br><small class="muted">${x.r.b}</small></td>
      <td><span class="st ${x.r.ok === false ? 'pending' : 'delivered'}">${x.r.ok === false ? 'Pending' : 'Published'}</span></td>
      <td class="u-nowrap">
        ${x.r.ok === false ? `<button class="ico" data-cmd="review:approve" data-arg="${x.p.id}" data-arg2="${x.i}" title="Approve"><svg viewBox="0 0 24 24"><path d="M20 7 9 18l-5-5"/></svg></button>` : ''}
        <button class="ico del" data-cmd="review:delete" data-arg="${x.p.id}" data-arg2="${x.i}" title="Delete"><svg viewBox="0 0 24 24"><path d="M4 7h16M9 7V5h6v2M6 7l1 13h10l1-13"/></svg></button></td>
    </tr>`).join('')}</tbody></table></div></div>`;
}
function approveRev(id, i) { P(id).reviews[i].ok = true; saveProducts(); vReviews(); toast('Review published'); }
function delRev(id, i) { if (!confirm('Delete this review?')) return; P(id).reviews.splice(i, 1); saveProducts(); vReviews(); toast('Review deleted'); }

/* ---------- marketing ---------- */
function vMarketing() {
  $('#view').innerHTML = `
  <div class="kpis cols-3">
    ${kpi('Subscribers', SUBS.length, null, 'M3 6h18v12H3z')}
    ${kpi('Conversion rate', '3.4%', 12, 'm7 15 4-5 3 3 5-7')}
    ${kpi('Discount redemptions', 47, 8, 'M9 9h.01M15 15h.01M6 18 18 6')}
  </div>
  <div class="panes cols-2">
    <div class="pane"><div class="ph"><h3>Announcement bar</h3><p>Shows at the top of every page</p></div>
      <div class="f"><textarea id="ann" rows="3">${SETTINGS.announce}</textarea></div>
      <button class="btn btn-primary btn-sm u-mt-md" data-cmd="announce:save">Save</button></div>
    <div class="pane"><div class="ph"><h3>Newsletter subscribers</h3><button class="btn btn-ghost btn-sm" data-cmd="export:subs">Export</button></div>
      <div class="tablewrap scroll-panel"><table class="u-min0"><tbody>
        ${SUBS.length ? SUBS.slice().reverse().map(s => `<tr><td>${s.email}</td><td class="muted">${s.d}</td></tr>`).join('') : '<tr><td class="muted">No subscribers yet.</td></tr>'}
      </tbody></table></div></div>
  </div>
  <div class="pane"><div class="ph"><h3>Discount codes</h3><p>Demo data — wire to your payment provider in production</p></div>
    <div class="tablewrap"><table><thead><tr><th>Code</th><th>Type</th><th>Value</th><th>Used</th><th>Status</th></tr></thead><tbody>
      ${[['WELCOME10','Percentage','10%',312,'delivered'],['GLOW5000','Fixed','₦5,000',48,'delivered'],['FREESHIP','Shipping','Free delivery',129,'delivered'],['XMAS26','Percentage','20%',0,'pending']]
        .map(r => `<tr><td class="gold">${r[0]}</td><td class="muted">${r[1]}</td><td>${r[2]}</td><td>${r[3]}</td><td><span class="st ${r[4]}">${r[4] === 'delivered' ? 'Active' : 'Scheduled'}</span></td></tr>`).join('')}
    </tbody></table></div></div>`;
}
function exportSubs() { download('subscribers.csv', 'email,date\n' + SUBS.map(s => `${s.email},${s.d}`).join('\n')); }

/* ---------- analytics ---------- */
function vAnalytics() {
  const stats = productStats();
  const byState = {};
  paid().forEach(o => byState[o.state] = (byState[o.state] || 0) + o.total);
  const states = Object.entries(byState).sort((a, b) => b[1] - a[1]);
  const maxS = Math.max(...states.map(s => s[1]), 1);
  const payMix = {};
  paid().forEach(o => payMix[o.pay] = (payMix[o.pay] || 0) + 1);
  $('#view').innerHTML = `
  <div class="kpis">
    ${kpi('All-time revenue', money(sum(paid().map(revenue))), null, 'M4 19V5M4 19h16')}
    ${kpi('Units sold', sum(paid().map(orderUnits)), null, 'm12 3 8 4.5v9L12 21l-8-4.5v-9z')}
    ${kpi('Orders', paid().length, null, 'M5 4h14v16H5z')}
    ${kpi('Cancelled', ORDERS.filter(o => o.status === 'cancelled').length, null, 'M6 6l12 12M18 6 6 18')}
  </div>
  <div class="panes">
    <div class="pane"><div class="ph"><div><h3>Revenue trend</h3><p>Last 12 weeks</p></div></div>
      <div class="chart-wrap"><div class="chart">${weekBars()}</div></div></div>
    <div class="pane"><div class="ph"><div><h3>Payment mix</h3><p>By order count</p></div></div>
      <div class="dlegend u-mt-sm">${Object.entries(payMix).map(([k, v]) => `
        <div class="legend-block"><div class="stat-row u-capitalize"><span>${k}</span><span class="muted">${v} orders</span></div>
        <div class="bar"><i style="--bar-fill:${v / paid().length * 100}%"></i></div></div>`).join('')}</div></div>
  </div>
  <div class="panes cols-2">
    <div class="pane"><div class="ph"><h3>Product performance</h3></div><div class="tablewrap"><table>
      <thead><tr><th>Product</th><th>Units</th><th>Revenue</th><th>Share</th></tr></thead><tbody>
      ${stats.map(s => `<tr><td><div class="tprod"><img src="${s.p.images[0]}" alt=""><div><b>${s.p.name}</b></div></div></td>
        <td>${s.units}</td><td class="gold">${money(s.rev)}</td>
        <td class="share-cell"><div class="bar"><i style="--bar-fill:${s.rev / stats[0].rev * 100}%"></i></div></td></tr>`).join('')}
    </tbody></table></div></div>
    <div class="pane"><div class="ph"><h3>Revenue by state</h3></div><div class="dlegend u-mt-sm">
      ${states.map(([st, v]) => `<div class="legend-block"><div class="stat-row"><span>${st}</span><span class="muted">${money(v)}</span></div>
        <div class="bar"><i style="--bar-fill:${v / maxS * 100}%"></i></div></div>`).join('')}</div></div>
  </div>`;
}

/* ---------- settings ---------- */
function vSettings() {
  $('#view').innerHTML = `
  <div class="panes cols-2">
    <div class="pane"><div class="ph"><h3>Store details</h3></div>
      <div class="f-grid">
        ${sfield('brand','Brand name')}${sfield('email','Contact email')}
        ${sfield('phone','Phone')}${sfield('ig','Instagram')}
        ${sfield('address','Address', true)}
      </div></div>
    <div class="pane"><div class="ph"><h3>Shipping &amp; currency</h3></div>
      <div class="f-grid">
        ${sfield('currency','Currency symbol')}${sfield('freeShip','Free shipping over', false, 'number')}
        ${sfield('shipFee','Flat delivery fee', false, 'number')}${sfield('lowStock','Low-stock threshold', false, 'number')}
      </div></div>
  </div>
  <div class="pane u-mb-md"><button class="btn btn-primary" data-cmd="settings:save">Save settings</button></div>
  <div class="pane"><div class="ph"><div><h3>Data</h3><p>Everything is stored in your browser via localStorage</p></div></div>
    <div class="pane-actions">
      <button class="btn btn-ghost btn-sm" data-cmd="export:json">Export all data (JSON)</button>
      <button class="btn btn-ghost btn-sm" data-cmd="export:csv">Export orders (CSV)</button>
      <button class="btn btn-dark btn-sm" data-cmd="data:reset">Reset to demo data</button></div></div>`;
}
function sfield(k, label, full, type) {
  return `<div class="f ${full ? 'full' : ''}"><label>${label}</label><input id="set-${k}" type="${type || 'text'}" value="${SETTINGS[k]}"></div>`;
}
function saveSet() {
  ['brand','email','phone','ig','address','currency'].forEach(k => SETTINGS[k] = $('#set-' + k).value);
  ['freeShip','shipFee','lowStock'].forEach(k => SETTINGS[k] = +$('#set-' + k).value || 0);
  saveSettings(); toast('Settings saved');
}
function resetAll() {
  if (!confirm('Reset all products, orders and settings to demo data?')) return;
  [DB.k.p, DB.k.o, DB.k.s, DB.k.c, DB.k.n].forEach(k => localStorage.removeItem(k));
  location.reload();
}

/* ---------- export ---------- */
function download(name, text) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type: 'text/plain' }));
  a.download = name; a.click(); URL.revokeObjectURL(a.href);
}
function exportCSV() {
  const rows = [['Ref','Date','Customer','Email','Phone','State','Items','Subtotal','Shipping','Total','Payment','Status']];
  ORDERS.forEach(o => rows.push([o.ref, new Date(o.date).toISOString().slice(0,10), o.name, o.email, o.phone, o.state,
    orderUnits(o), o.sub, o.ship, o.total, o.pay, o.status]));
  download('lara-beauty-orders.csv', rows.map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n'));
  toast('Orders exported');
}
function exportJSON() {
  download('lara-beauty-data.json', JSON.stringify({ products: PRODUCTS, orders: ORDERS, settings: SETTINGS, subscribers: SUBS }, null, 2));
  toast('Data exported');
}

/* ---------- boot ---------- */
/* -----------------------------------------------------------------------------
   Boot
   -------------------------------------------------------------------------- */
addEventListener('hashchange', () => {
  if (hasSession()) nav(location.hash.replace('#', '') || 'dash');
});

if (hasSession()) {
  showApp();
} else {
  $('#login').hidden = false;
}


/* ===================== MESSAGES ===================== */
function messages() { return DB.read('lba_messages', []); }
function saveMessages(list) { DB.write('lba_messages', list); }

function unreadCount() { return messages().filter(m => !m.read).length; }

function refreshMsgBadge() {
  const el = $('#msg-badge');
  if (!el) return;
  const n = unreadCount();
  el.textContent = n;
  el.hidden = n === 0;
}

let msgFilter = 'all';

function vMessages() {
  const all = messages();
  const list = msgFilter === 'all' ? all : all.filter(m => m.type === msgFilter);
  const types = ['all', 'enquiry', 'order', 'subscriber'];
  const configured = MAIL.provider !== 'none';

  $('#view').innerHTML = `
  ${configured ? '' : `<div class="pane attention-panel">
    <h3 class="attention-title">Email delivery is not switched on yet</h3>
    <p class="muted">Messages are being saved here, but nothing is emailed out.
      Open <code>email.js</code> and set <code>MAIL.provider</code> — see EMAIL-SETUP.md
      for the five-minute Formspree walkthrough.</p></div>`}

  <div class="kpis cols-3">
    ${kpi('Total messages', all.length, null, 'M3 6h18v12H3z')}
    ${kpi('Unread', unreadCount(), null, 'M12 7v5l3 3')}
    ${kpi('Delivered by email', all.filter(m => m.delivered).length, null, 'M20 7 9 18l-5-5')}
  </div>

  <div class="toolbar">
    ${types.map(t => `<button class="chip ${msgFilter === t ? 'on' : ''}"
      data-cmd="msg:filter" data-arg="${t}">${t}${t !== 'all' ? ` (${all.filter(m => m.type === t).length})` : ''}</button>`).join('')}
    <span class="toolbar-right">
      <button class="btn btn-ghost btn-sm" data-cmd="msg:read-all">Mark all read</button>
      <button class="btn btn-ghost btn-sm" data-cmd="msg:export">Export CSV</button>
    </span>
  </div>

  <div class="pane"><div class="tablewrap"><table>
    <thead><tr><th>Received</th><th>Type</th><th>From</th><th>Message</th><th>Email sent</th><th></th></tr></thead>
    <tbody>${list.length ? list.map(m => `
      <tr class="${m.read ? '' : 'msg-unread'}">
        <td class="muted u-nowrap">${fdate(m.date)}</td>
        <td><span class="st ${m.type === 'order' ? 'shipped' : m.type === 'enquiry' ? 'processing' : 'delivered'}">${m.type}</span></td>
        <td>${m.name ? `<b class="u-medium">${esc(m.name)}</b><br>` : ''}
            <small class="muted">${esc(m.email || '')}${m.phone ? '<br>' + esc(m.phone) : ''}</small></td>
        <td class="msg-body">${esc((m.body || '').slice(0, 240))}${(m.body || '').length > 240 ? '…' : ''}</td>
        <td class="${m.delivered ? 'delivery-ok' : 'delivery-pending'}">${m.delivered ? 'Sent' : 'Saved only'}</td>
        <td class="u-nowrap">
          ${m.email ? `<a class="ico" title="Reply" href="mailto:${esc(m.email)}?subject=${encodeURIComponent('Re: ' + (m.subject || 'Your message'))}">
            <svg viewBox="0 0 24 24"><path d="M3 6h18v12H3z"/><path d="m3 7 9 6 9-6"/></svg></a>` : ''}
          <button class="ico" title="Toggle read" data-cmd="msg:toggle" data-arg="${m.id}">
            <svg viewBox="0 0 24 24"><path d="M20 7 9 18l-5-5"/></svg></button>
          <button class="ico del" title="Delete" data-cmd="msg:delete" data-arg="${m.id}">
            <svg viewBox="0 0 24 24"><path d="M4 7h16M9 7V5h6v2M6 7l1 13h10l1-13"/></svg></button>
        </td>
      </tr>`).join('') : '<tr><td colspan="6" class="muted table-empty">No messages yet.</td></tr>'}
    </tbody></table></div></div>`;
  refreshMsgBadge();
}

function toggleMsgRead(id) {
  const list = messages();
  const m = list.find(x => x.id === id);
  if (m) { m.read = !m.read; saveMessages(list); }
  vMessages();
}

function deleteMsg(id) {
  if (!confirm('Delete this message?')) return;
  saveMessages(messages().filter(m => m.id !== id));
  vMessages();
  toast('Message deleted');
}

function markAllRead() {
  const list = messages();
  list.forEach(m => m.read = true);
  saveMessages(list);
  vMessages();
  toast('All marked read');
}

function exportMessages() {
  const rows = [['Received', 'Type', 'Name', 'Email', 'Phone', 'Subject', 'Message', 'Emailed']];
  messages().forEach(m => rows.push([
    new Date(m.date).toISOString(), m.type, m.name || '', m.email || '',
    m.phone || '', m.subject || '', (m.body || '').replace(/\n/g, ' '), m.delivered ? 'yes' : 'no'
  ]));
  download('lara-beauty-messages.csv',
    rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n'));
  toast('Messages exported');
}

/* ===================== PAGES & CONTENT ===================== */
let ptab = 'hero';
const PTABS = [['hero','Hero'],['marquee','Marquee'],['collections','Collections'],['best','Bestsellers'],
  ['story','Story'],['values','Value props'],['news','Newsletter'],['footer','Footer'],['seo','SEO']];

function vPages() {
  $('#view').innerHTML = `
  <div class="toolbar">
    ${PTABS.map(t => `<button class="chip ${ptab === t[0] ? 'on' : ''}" data-cmd="tab" data-arg="${t[0]}">${t[1]}</button>`).join('')}
    <span class="toolbar-right">
      <button class="btn btn-ghost btn-sm" data-cmd="preview-site">Preview site</button>
      <button class="btn btn-dark btn-sm" data-cmd="content:reset">Reset content</button></span>
  </div>
  <div id="ptab"></div>`;
  ({ hero: pHero, marquee: pMarquee, collections: pCols, best: pBest, story: pStory,
     values: pValues, news: pNews, footer: pFooter, seo: pSeo })[ptab]();
}
function fld(id, label, val, opt = {}) {
  const t = opt.type || 'text';
  if (t === 'textarea') return `<div class="f ${opt.full !== false ? 'full' : ''}"><label>${label}</label><textarea id="${id}" rows="${opt.rows || 3}">${esc(val)}</textarea></div>`;
  if (t === 'image') return `<div class="f ${opt.full ? 'full' : ''}"><label>${label}</label>
    <div class="inline-field">
      <img src="${esc(val)}" id="${id}-pv" class="thumb-preview">
      <input id="${id}" value="${esc(val)}" oninput="document.getElementById('${id}-pv').src=this.value" class="u-grow">
      <button type="button" class="btn btn-ghost btn-sm" data-cmd="media:pick" data-arg="${id}">Pick</button></div></div>`;
  return `<div class="f ${opt.full ? 'full' : ''}"><label>${label}</label><input id="${id}" type="${t}" value="${esc(val)}"></div>`;
}
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const V = id => document.getElementById(id).value;
function savedToast() { saveContent(); toast('Saved — storefront updated'); }
/**
 * Render an editor panel with a Save button top and bottom.
 * @param {string} title   Panel heading
 * @param {string} sub     Short description
 * @param {string} inner   Field markup
 * @param {string} saver   Key into SAVERS, e.g. 'hero'
 */
function pane(title, sub, inner, saver) {
  const save = `<button type="button" class="btn btn-primary btn-sm"
    data-cmd="content:save" data-arg="${saver}">Save changes</button>`;
  return `<div class="pane">
    <div class="ph"><div><h3>${title}</h3><p>${sub}</p></div>${save}</div>
    <div class="f-grid">${inner}</div>
    <div class="u-mt-lg">${save}</div>
  </div>`;
}

function pHero() {
  const H = CONTENT.hero;
  $('#ptab').innerHTML = pane('Hero section', 'The first thing every visitor sees', `
    ${fld('h-eyebrow','Eyebrow', H.eyebrow, { full: true })}
    ${fld('h-title','Headline start', H.title)}
    ${fld('h-em','Highlighted word (gold italic)', H.titleEm)}
    ${fld('h-end','Headline end', H.titleEnd)}
    ${fld('h-lede','Lede paragraph', H.lede, { type: 'textarea' })}
    ${fld('h-cta1','Primary button text', H.ctaPrimary)}
    ${fld('h-cta1l','Primary button link', H.ctaPrimaryLink)}
    ${fld('h-cta2','Secondary button text', H.ctaGhost)}
    ${fld('h-cta2l','Secondary button link', H.ctaGhostLink)}
    ${fld('h-img','Hero image', H.image, { type: 'image', full: true })}
    ${fld('h-cimg','Floating card image', H.cardImage, { type: 'image' })}
    ${fld('h-ctitle','Floating card title', H.cardTitle)}
    ${fld('h-csub','Floating card subtitle', H.cardSub, { full: true })}
    <div class="f full"><label>Stats — one per line: <em>value | label</em></label>
      <textarea id="h-stats" rows="3">${H.stats.map(s => `${s.b} | ${s.s}`).join('\n')}</textarea></div>`, 'hero');
}
function saveHero() {
  Object.assign(CONTENT.hero, {
    eyebrow: V('h-eyebrow'), title: V('h-title'), titleEm: V('h-em'), titleEnd: V('h-end'), lede: V('h-lede'),
    ctaPrimary: V('h-cta1'), ctaPrimaryLink: V('h-cta1l'), ctaGhost: V('h-cta2'), ctaGhostLink: V('h-cta2l'),
    image: V('h-img'), cardImage: V('h-cimg'), cardTitle: V('h-ctitle'), cardSub: V('h-csub'),
    stats: V('h-stats').split('\n').filter(Boolean).map(l => { const [b, s] = l.split('|'); return { b: (b || '').trim(), s: (s || '').trim() }; })
  });
  savedToast();
}

function pMarquee() {
  $('#ptab').innerHTML = pane('Scrolling marquee', 'One phrase per line. Leave empty to hide the strip.',
    `<div class="f full"><label>Phrases</label><textarea id="mq" rows="7">${CONTENT.marquee.join('\n')}</textarea></div>`, 'marquee');
}
function saveMq() { CONTENT.marquee = V('mq').split('\n').map(x => x.trim()).filter(Boolean); savedToast(); }

function pCols() {
  const C = CONTENT.collections;
  $('#ptab').innerHTML = `
  ${pane('Collections heading', 'Section title above the three tiles', `
    ${fld('c-eyebrow','Eyebrow', C.eyebrow)}${fld('c-title','Title start', C.title)}
    ${fld('c-em','Highlighted words', C.titleEm)}${fld('c-sub','Subtitle', C.sub)}`, 'colsHead')}
  <div class="pane"><div class="ph"><div><h3>Collection tiles</h3><p>Each links to a category</p></div>
    <button class="btn btn-primary btn-sm" data-cmd="col:add">+ Add tile</button></div>
    ${C.items.map((it, i) => `<div class="edit-row">
      <div class="f-grid">
        ${fld('ci-t' + i,'Title', it.title)}
        <div class="f"><label>Category</label><select id="ci-c${i}">${CATEGORIES.map(c => `<option value="${c.id}" ${it.cat === c.id ? 'selected' : ''}>${esc(c.label)}</option>`).join('')}</select></div>
        ${fld('ci-l' + i,'Link text', it.cta)}
        ${fld('ci-i' + i,'Image', it.image, { type: 'image' })}
      </div>
      <div class="pane-actions-tight">
        <button class="btn btn-ghost btn-sm" data-cmd="col:save" data-arg="${i}">Save tile</button>
        <button class="btn btn-dark btn-sm" data-cmd="col:delete" data-arg="${i}">Delete</button></div></div>`).join('')}
  </div>`;
}
function saveColsHead() { Object.assign(CONTENT.collections, { eyebrow: V('c-eyebrow'), title: V('c-title'), titleEm: V('c-em'), sub: V('c-sub') }); savedToast(); }
function saveCol(i) { Object.assign(CONTENT.collections.items[i], { title: V('ci-t' + i), cat: V('ci-c' + i), cta: V('ci-l' + i), image: V('ci-i' + i) }); savedToast(); vPages(); }
function addCol() { CONTENT.collections.items.push({ cat: CATEGORIES[0].id, title: 'New collection', image: MEDIA[0] || '', cta: 'Explore' }); saveContent(); vPages(); }
function delCol(i) { if (!confirm('Delete this tile?')) return; CONTENT.collections.items.splice(i, 1); saveContent(); vPages(); }

function pBest() {
  const B = CONTENT.best;
  $('#ptab').innerHTML = pane('Bestsellers section', 'Auto-populated from products with a badge or 4.8★+', `
    ${fld('b-eyebrow','Eyebrow', B.eyebrow)}${fld('b-title','Title', B.title)}
    ${fld('b-cta','Button text', B.cta)}${fld('b-limit','How many products', B.limit, { type: 'number' })}`, 'best');
}
function saveBest() { Object.assign(CONTENT.best, { eyebrow: V('b-eyebrow'), title: V('b-title'), cta: V('b-cta'), limit: +V('b-limit') || 4 }); savedToast(); }

function pStory() {
  const S = CONTENT.story;
  $('#ptab').innerHTML = pane('Our story', 'Brand narrative section', `
    ${fld('s-eyebrow','Eyebrow', S.eyebrow)}${fld('s-title','Title', S.title)}
    ${fld('s-img','Image', S.image, { type: 'image', full: true })}
    <div class="f full"><label>Paragraphs — one per line</label><textarea id="s-body" rows="6">${S.body.join('\n')}</textarea></div>
    ${fld('s-cta','Button text', S.cta)}${fld('s-ctal','Button link', S.ctaLink)}`, 'story');
}
function saveStory() {
  Object.assign(CONTENT.story, { eyebrow: V('s-eyebrow'), title: V('s-title'), image: V('s-img'),
    body: V('s-body').split('\n').map(x => x.trim()).filter(Boolean), cta: V('s-cta'), ctaLink: V('s-ctal') });
  savedToast();
}

function pValues() {
  const icons = ['leaf','globe','truck','check','star','heart','shield','clock'];
  $('#ptab').innerHTML = `<div class="pane"><div class="ph"><div><h3>Value propositions</h3><p>The four-across trust row</p></div>
    <button class="btn btn-primary btn-sm" data-cmd="val:add">+ Add</button></div>
    ${CONTENT.values.map((v, i) => `<div class="edit-row">
      <div class="f-grid">
        <div class="f"><label>Icon</label><select id="v-i${i}">${icons.map(ic => `<option ${v.icon === ic ? 'selected' : ''}>${ic}</option>`).join('')}</select></div>
        ${fld('v-t' + i,'Title', v.title)}
        ${fld('v-x' + i,'Text', v.text, { type: 'textarea', rows: 2 })}
      </div>
      <div class="pane-actions-tight">
        <button class="btn btn-ghost btn-sm" data-cmd="val:save" data-arg="${i}">Save</button>
        <button class="btn btn-dark btn-sm" data-cmd="val:delete" data-arg="${i}">Delete</button></div></div>`).join('')}</div>`;
}
function saveVal(i) { Object.assign(CONTENT.values[i], { icon: V('v-i' + i), title: V('v-t' + i), text: V('v-x' + i) }); savedToast(); }
function addVal() { CONTENT.values.push({ icon: 'star', title: 'New promise', text: 'Describe it here.' }); saveContent(); vPages(); }
function delVal(i) { if (!confirm('Delete?')) return; CONTENT.values.splice(i, 1); saveContent(); vPages(); }

function pNews() {
  const N = CONTENT.news;
  $('#ptab').innerHTML = pane('Newsletter block', 'Sign-up section near the footer', `
    ${fld('n-eyebrow','Eyebrow', N.eyebrow)}${fld('n-title','Title', N.title)}
    ${fld('n-sub','Subtitle', N.sub, { type: 'textarea', rows: 2 })}
    ${fld('n-ph','Input placeholder', N.placeholder)}${fld('n-cta','Button text', N.cta)}
    ${fld('n-ok','Success message', N.success, { full: true })}`, 'news');
}
function saveNews() {
  Object.assign(CONTENT.news, { eyebrow: V('n-eyebrow'), title: V('n-title'), sub: V('n-sub'),
    placeholder: V('n-ph'), cta: V('n-cta'), success: V('n-ok') }); savedToast();
}

function pFooter() {
  const F = CONTENT.footer;
  $('#ptab').innerHTML = pane('Footer', 'Contact details come from Settings', `
    ${fld('f-blurb','Brand blurb', F.blurb, { type: 'textarea', rows: 2 })}
    ${fld('f-shop','Shop column title', F.shopTitle)}${fld('f-help','Help column title', F.helpTitle)}
    ${fld('f-contact','Contact column title', F.contactTitle)}${fld('f-hours','Opening hours', F.hours)}
    <div class="f full"><label>Help links — one per line</label><textarea id="f-links" rows="4">${F.help.join('\n')}</textarea></div>
    ${fld('f-copy','Copyright line', F.copyright)}${fld('f-legal','Legal line', F.legal)}
    <div class="f"><label>Show staff login link</label>
      <select id="f-adm"><option value="1" ${F.adminLink ? 'selected' : ''}>Visible in footer</option>
        <option value="0" ${!F.adminLink ? 'selected' : ''}>Hidden (direct URL only)</option></select></div>
    ${fld('f-admlbl','Staff link label', F.adminLabel || 'Staff login')}`, 'footer');
}
function saveFooter() {
  Object.assign(CONTENT.footer, { blurb: V('f-blurb'), shopTitle: V('f-shop'), helpTitle: V('f-help'),
    contactTitle: V('f-contact'), hours: V('f-hours'), help: V('f-links').split('\n').map(x => x.trim()).filter(Boolean),
    copyright: V('f-copy'), legal: V('f-legal'),
    adminLink: V('f-adm') === '1', adminLabel: V('f-admlbl') }); savedToast();
}

function pSeo() {
  $('#ptab').innerHTML = pane('SEO & browser tab', 'Page title and meta description', `
    ${fld('seo-t','Page title', CONTENT.seo.title, { full: true })}
    ${fld('seo-d','Meta description', CONTENT.seo.desc, { type: 'textarea' })}`, 'seo');
}
function saveSeo() { Object.assign(CONTENT.seo, { title: V('seo-t'), desc: V('seo-d') }); savedToast(); }

function resetContent() {
  if (!confirm('Reset ALL homepage content to defaults?')) return;
  localStorage.removeItem(DB.k.t); location.reload();
}

/* ===================== CATEGORIES ===================== */
function vCategories() {
  $('#view').innerHTML = `
  <div class="toolbar"><button class="btn btn-primary btn-sm" data-cmd="cat:new">+ New category</button>
    <span class="muted u-text-sm">Shown in the nav, filters and footer</span></div>
  <div class="pane"><div class="tablewrap"><table>
    <thead><tr><th>Order</th><th>Label</th><th>Slug</th><th>Products</th><th></th></tr></thead><tbody>
    ${CATEGORIES.map((c, i) => `<tr>
      <td><button class="ico" data-cmd="cat:move" data-arg="${i}" data-arg2="-1" ${i === 0 ? 'disabled' : ''}><svg viewBox="0 0 24 24"><path d="m6 15 6-6 6 6"/></svg></button>
          <button class="ico" data-cmd="cat:move" data-arg="${i}" data-arg2="1" ${i === CATEGORIES.length - 1 ? 'disabled' : ''}><svg viewBox="0 0 24 24"><path d="m6 9 6 6 6-6"/></svg></button></td>
      <td><b class="u-medium">${esc(c.label)}</b></td><td class="muted">${esc(c.id)}</td>
      <td>${PRODUCTS.filter(p => p.cat === c.id).length}</td>
      <td><button class="ico" data-cmd="cat:edit" data-arg="${c.id}"><svg viewBox="0 0 24 24"><path d="M4 20h4L19 9l-4-4L4 16z"/></svg></button>
          <button class="ico del" data-cmd="cat:delete" data-arg="${c.id}"><svg viewBox="0 0 24 24"><path d="M4 7h16M9 7V5h6v2M6 7l1 13h10l1-13"/></svg></button></td>
    </tr>`).join('')}</tbody></table></div></div>`;
}
function editCat(id) {
  const c = id ? CATEGORIES.find(x => x.id === id) : { id: '', label: '' };
  openModal(`<div class="mhead"><h3>${id ? 'Edit' : 'New'} category</h3>
    <button type="button" class="icon-btn" data-action="close-modal" aria-label="Close"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg></button></div>
    <div class="f-grid">${fld('cat-l','Label', c.label)}${fld('cat-s','Slug (URL)', c.id)}</div>
    <div class="form-actions">
      <button class="btn btn-primary" data-cmd="cat:save" data-arg="${id || ''}">Save</button>
      <button class="btn btn-dark" data-action="close-modal">Cancel</button></div>`);
}
function saveCat(id) {
  const label = V('cat-l').trim();
  const slug = (V('cat-s').trim() || label).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  if (!label || !slug) return toast('Label and slug are required');
  if (id) { const c = CATEGORIES.find(x => x.id === id);
    if (slug !== id) PRODUCTS.forEach(p => { if (p.cat === id) p.cat = slug; }), saveProducts();
    c.id = slug; c.label = label;
  } else {
    if (CATEGORIES.find(x => x.id === slug)) return toast('That slug already exists');
    CATEGORIES.push({ id: slug, label });
  }
  saveCategories(); closeModal(); vCategories(); toast('Category saved');
}
function delCat(id) {
  const n = PRODUCTS.filter(p => p.cat === id).length;
  if (!confirm(n ? `${n} product(s) use this category. Delete anyway?` : 'Delete this category?')) return;
  CATEGORIES = CATEGORIES.filter(c => c.id !== id); saveCategories(); vCategories(); toast('Category deleted');
}
function moveCat(i, d) {
  const j = i + d; if (j < 0 || j >= CATEGORIES.length) return;
  [CATEGORIES[i], CATEGORIES[j]] = [CATEGORIES[j], CATEGORIES[i]];
  saveCategories(); vCategories();
}

/* ===================== MEDIA ===================== */
let mediaTarget = null;
function vMedia() {
  $('#view').innerHTML = `
  <div class="toolbar">
    <button class="btn btn-primary btn-sm" data-cmd="media:upload">+ Upload image</button>
    <input type="file" id="media-input" accept="image/*" multiple hidden>
    <button class="btn btn-ghost btn-sm" data-cmd="media:url">Add by URL</button>
    <span class="muted u-text-sm">${MEDIA.length} images · uploads are stored in this browser</span></div>
  <div class="pane"><div class="media-grid">
    ${MEDIA.map((m, i) => `<div class="media-item">
      <img src="${esc(m)}" alt="">
      <div class="media-meta">
        <small>${esc(m.startsWith('data:') ? 'uploaded image' : m)}</small>
        <button type="button" class="ico" title="Copy path" data-cmd="media:copy" data-arg="${m.startsWith('data:') ? '' : esc(m)}"><svg viewBox="0 0 24 24"><path d="M8 8h12v12H8z"/><path d="M4 16V4h12"/></svg></button>
        <button class="ico del" data-cmd="media:delete" data-arg="${i}"><svg viewBox="0 0 24 24"><path d="M4 7h16M9 7V5h6v2M6 7l1 13h10l1-13"/></svg></button>
      </div></div>`).join('')}
  </div></div>`;
}
function uploadImgs(input) {
  const files = [...input.files]; let done = 0;
  files.forEach(f => {
    const r = new FileReader();
    r.onload = e => {
      MEDIA.unshift(e.target.result); done++;
      if (done === files.length) { try { saveMedia(); } catch (err) { toast('Storage full — try smaller images'); } vMedia(); toast(`${files.length} image(s) added`); }
    };
    r.readAsDataURL(f);
  });
  input.value = '';
}
function addUrl() {
  const u = prompt('Image path or URL (e.g. assets/new.jpg)');
  if (!u) return; MEDIA.unshift(u.trim()); saveMedia(); vMedia(); toast('Image added');
}
function delMedia(i) { if (!confirm('Remove from library? (files on disk are not deleted)')) return; MEDIA.splice(i, 1); saveMedia(); vMedia(); }
function pickMedia(targetId) {
  mediaTarget = targetId;
  openModal2(`<div class="mhead"><h3>Choose an image</h3>
    <button type="button" class="icon-btn" data-action="close-modal2" aria-label="Close"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg></button></div>
    <div class="media-picker">
      ${MEDIA.map((m, i) => `<button type="button" class="media-choice"
        data-cmd="media:choose" data-arg="${i}"><img src="${esc(m)}" alt=""></button>`).join('')}</div>`);
}
function chooseMedia(src) {
  const el = document.getElementById(mediaTarget);
  if (el) {
    el.value = src;
    const pv = document.getElementById(mediaTarget + '-pv'); if (pv) pv.src = src;
    el.dispatchEvent(new Event('change'));
  }
  closeModal2();
}
function appendImg(src) {
  const el = document.getElementById('pimgs'); if (!el || !src) return;
  el.value = el.value.trim() ? el.value.trim().replace(/,$/, '') + ', ' + src : src;
  toast('Image added to product');
}
