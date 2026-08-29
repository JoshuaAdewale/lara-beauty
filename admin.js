/* Lara Beauty Atelier — admin portal */
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
/* -----------------------------------------------------------------------------
   Staff accounts.

   READ THIS BEFORE YOU GO LIVE.

   These passwords are in a file the whole world can download. Anyone who opens
   admin.js sees them. They are NOT a security control — they only stop a casual
   passer-by clicking around, and you must change them from the defaults.

   The real boundary is the ADMIN_TOKEN publishing key, which lives only in your
   Netlify environment variables and is checked on the server. Someone who gets
   past this login can look at demo data in their own browser; they still cannot
   publish anything, change a price, or read your customer list, because every
   one of those goes through the server and is refused without the token.

   So: treat the password as the lock on a display cabinet and ADMIN_TOKEN as
   the lock on the safe. Change both, keep the token secret, and never reuse a
   password you use anywhere else.
   -------------------------------------------------------------------------- */
const STAFF = [
  { u: 'admin@larabeauty.ng', p: 'lara2026', name: 'Lara', role: 'owner' },
  { u: 'staff@larabeauty.ng', p: 'atelier26', name: 'Store staff', role: 'staff' }
];

/* Nag until the shipped defaults are changed. */
const DEFAULT_PASSWORDS = ['lara2026', 'atelier26'];
const usingDefaultPassword = () => STAFF.some(a => DEFAULT_PASSWORDS.includes(a.p));
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

async function handleLogin(event) {
  event.preventDefault();

  const lock = lockState();
  if (lock.until > Date.now()) {
    return showLockout(Math.ceil((lock.until - Date.now()) / 1000));
  }

  const email = $('#login-email').value.trim().toLowerCase();
  const password = $('#login-password').value;
  const btn = $('.login-submit');
  const label = btn ? btn.textContent : '';

  /* Preferred path: the server checks the password against an environment
     variable and hands back the publishing token. Nothing secret sits in this
     file, and staff no longer paste a long key by hand. */
  if (API.enabled) {
    if (btn) { btn.disabled = true; btn.textContent = 'Signing in…'; }
    try {
      const res = await API.login(password);
      if (btn) { btn.disabled = false; btn.textContent = label; }
      API.setToken(res.token || '');
      DB.write('lba_lock', { n: 0, until: 0 });
      DB.write(DB.k.a, { at: Date.now(), u: email || res.name, name: res.name, role: res.role });
      showApp();
      return;
    } catch (err) {
      if (btn) { btn.disabled = false; btn.textContent = label; }
      /* 'not-configured' means the owner has not set ADMIN_PASSWORD yet, so
         fall through to the legacy in-file check. Any other error is a genuine
         rejection and must stop here. */
      if (err.message !== 'not-configured' && err.message !== 'api-not-deployed'
          && err.message !== 'offline') {
        $('#login-password').value = '';
        return toast(err.message || 'Sign-in failed');
      }
    }
  }

  /* Legacy fallback: passwords in this file. Only reachable before the server
     side is configured, and the dashboard nags until it is. */
  const account = STAFF.find(s => s.u === email && s.p === password);

  if (account) {
    /* Keep the publishing key for this tab only. */
    const token = $('#login-token') ? $('#login-token').value.trim() : '';
    API.setToken(token);
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
  /* Warm the shared inbox so the unread badge is accurate straight away. */
  loadLiveMessages().then(refreshMsgBadge);
  /* Adopt the live catalogue before the first view renders, otherwise staff
     would briefly edit the build-time data and overwrite live prices. */
  loadLiveStore().then(() => { renderPublishBar(); nav(view); });
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
function applyTheme(theme) {
  const light = theme === 'light';
  document.documentElement.setAttribute('data-theme', light ? 'light' : 'dark');
  try { localStorage.setItem('lba_theme', light ? 'light' : 'dark'); } catch (e) {}
}

function toggleTheme() {
  const now = document.documentElement.getAttribute('data-theme') === 'light';
  applyTheme(now ? 'dark' : 'light');
  toast(now ? 'Dark theme' : 'Light theme');
}

const ADMIN_ACTIONS = {
  'theme': () => toggleTheme(),
  'logout': () => { API.setToken(''); logout(); },
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
  'subs:refresh': async () => { await loadLiveSubs(); vMarketing(); toast('Subscribers refreshed'); },
  'msg:refresh': async () => { await loadLiveMessages(); await vMessages(); toast('Inbox refreshed'); },
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
  'review:approve': d => approveRev(d.arg, d.arg2),
  'review:delete': d => delRev(d.arg, d.arg2),
  'review:new': () => editReview(),
  'review:edit': d => editReview(d.arg, d.arg2),
  'review:seed': () => seedLiveReviews(),
  'review:refresh': async () => { await loadLiveReviews(); await vReviews(); toast('Refreshed'); },
  'review:filter': d => { revFilter = d.arg; vReviews(); },
  'review:export': () => exportReviews(),

  /* live publishing */
  'live:publish': () => publishLive(),
  'live:discard': () => discardDraft(),
  'live:rollback': () => rollbackLive(),
  'live:review': () => reviewChanges(),

  /* outbound mail */
  'mail:compose': () => composeMail(),
  'mail:reply': d => replyTo(d.arg),
  'mail:template': d => applyTemplate(d.value),
  'mail:to': d => composeMail({ to: d.arg }),

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
  'data:backup': () => backupAll(),
  'data:restore': () => $('#restore-file').click(),
  'data:wipe': d => wipeData(d.arg),
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
  if (event.target.id === 'restore-file' && event.target.files[0]) {
    restoreFromFile(event.target.files[0]);
    event.target.value = '';
  }
  const statusSel = event.target.closest('[data-status-ref]');
  if (statusSel) setStatus(statusSel.dataset.statusRef, statusSel.value);
  if (event.target.hasAttribute && event.target.hasAttribute('data-append-img')) {
    appendImg(event.target.value);
  }
  const stockField = event.target.closest('[data-stock-pid]');
  if (stockField) {
    setStock(stockField.dataset.stockPid, Number(stockField.dataset.stockIdx), stockField.value);
  }
  const sel = event.target.closest('[data-cmd-change]');
  if (sel) COMMANDS[sel.dataset.cmdChange]?.({ ...sel.dataset, value: sel.value });
});

document.addEventListener('submit', event => {
  if (event.target.id === 'login-form') handleLogin(event);
  if (event.target.id === 'product-form') {
    saveProduct(event, event.target.dataset.productId || '');
  }
  if (event.target.id === 'review-form') saveReview(event);
  if (event.target.id === 'compose-form') submitCompose(event);
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
  renderBarActions(v);
  renderSecurityNotice();
  $('#sidebar').classList.remove('on');
  ({ dash: vDash, orders: vOrders, messages: vMessages, pages: vPages, categories: vCategories, media: vMedia,
     products: vProducts, inventory: vInventory, customers: vCustomers,
     reviews: vReviews, marketing: vMarketing, analytics: vAnalytics, settings: vSettings })[v]();
  scrollTo(0, 0);
}

/* The header buttons used to be fixed markup, so "＋ New product" showed up
   on the Reviews and Messages screens where it did nothing useful. */
const BAR_ACTIONS = {
  orders: `<button type="button" class="btn btn-ghost btn-sm" data-action="export-csv">Export CSV</button>`,
  products: `<button type="button" class="btn btn-primary btn-sm" data-action="new-product">+ New product</button>`,
  inventory: `<button type="button" class="btn btn-primary btn-sm" data-action="new-product">+ New product</button>`,
  reviews: `<button type="button" class="btn btn-ghost btn-sm" data-cmd="review:export">Export for data.js</button>
            <button type="button" class="btn btn-primary btn-sm" data-cmd="review:new">+ Write review</button>`,
  messages: `<button type="button" class="btn btn-ghost btn-sm" data-cmd="msg:export">Export CSV</button>
             <button type="button" class="btn btn-primary btn-sm" data-cmd="mail:compose">+ Compose email</button>`,
  customers: `<button type="button" class="btn btn-primary btn-sm" data-cmd="mail:compose">+ Compose email</button>`
};

function renderBarActions(v) {
  const bar = $('#abar-actions');
  if (bar) bar.innerHTML = BAR_ACTIONS[v] || '';
}

/* A banner staff cannot miss, rather than a line in a README nobody opens. */
function renderSecurityNotice() {
  const host = $('#security-notice');
  if (!host) return;
  const problems = [];
  if (usingDefaultPassword()) {
    problems.push('The staff password is still the one this site shipped with. Anyone who reads <code>admin.js</code> knows it. Change it in <code>admin.js</code> and redeploy.');
  }
  if (API.enabled && !API.token()) {
    problems.push('No publishing key entered, so nothing you change here can go live. Sign out and back in, and paste the key.');
  }
  host.hidden = problems.length === 0;
  host.innerHTML = problems.length
    ? `<div class="pane attention-panel"><h3 class="attention-title">Security</h3>
       ${problems.map(p => `<p class="muted">${p}</p>`).join('')}</div>`
    : '';
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
          <td class="gold">${esc(o.ref)}</td><td>${esc(o.name)}<br><small class="muted">${fdate(o.date)}</small></td>
          <td>${money(o.total)}</td><td><span class="st ${o.status}">${o.status}</span></td></tr>`).join('')}
      </tbody></table></div></div>
    <div class="pane"><div class="ph"><h3>Top products</h3><button class="btn btn-ghost btn-sm" data-cmd="go" data-arg="analytics">Details</button></div>
      <div class="tablewrap"><table><thead><tr><th>Product</th><th>Units</th><th>Revenue</th></tr></thead><tbody>
        ${productStats().slice(0, 6).map(s => `<tr><td><div class="tprod"><img src="${s.p.images[0]}" alt=""><div><b>${esc(s.p.name)}</b><small>${s.p.sku || ''}</small></div></div></td>
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
      <td><b class="u-medium">${esc(o.name)}</b><br><small class="muted">${esc(o.state)}</small></td>
      <td>${orderUnits(o)}</td><td>${money(o.total)}</td>
      <td class="muted u-capitalize">${esc(o.pay)}</td>
      <td><select class="mini" data-status-ref="${esc(o.ref)}">
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
      <div><small class="muted">Customer</small><p>${esc(o.name)}<br>${esc(o.email)}<br>${esc(o.phone)}</p></div>
      <div><small class="muted">Deliver to</small><p>${o.addr}<br>${o.state}${o.note ? '<br><em>' + o.note + '</em>' : ''}</p></div></div>
    ${o.items.map(l => { const p = P(l.id); return p ? `<div class="sum-item"><img src="${p.images[0]}" alt="">
      <div><b class="u-medium">${esc(p.name)}</b><div class="q">${l.v ? esc(l.v) + ' · ' : ''}Qty ${l.q}</div></div><span>${money(p.price * l.q)}</span></div>` : ''; }).join('')}
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
      <td><div class="tprod"><img src="${p.images[0]}" alt=""><div><b>${esc(p.name)}</b><small>${esc(p.sku || '')}</small></div></div></td>
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
  <form id="product-form" data-product-id="${id || ''}">
    <div class="f-grid">
      <div class="f"><label>Name</label><input name="name" value="${esc(p.name)}" required></div>
      <div class="f"><label>SKU</label><input name="sku" value="${esc(p.sku || '')}"></div>
      <div class="f full"><label>Tagline</label><input name="tagline" value="${esc(p.tagline)}"></div>
      <div class="f"><label>Category</label><select name="cat">${CATEGORIES.map(c => `<option value="${c.id}" ${p.cat === c.id ? 'selected' : ''}>${c.label}</option>`).join('')}</select></div>
      <div class="f"><label>Badge</label><input name="badge" value="${p.badge || ''}" placeholder="Bestseller"></div>
      <div class="f"><label>Price (₦)</label><input name="price" type="number" value="${p.price}" required></div>
      <div class="f"><label>Compare at (₦)</label><input name="compare" type="number" value="${p.compare || ''}"></div>
      <div class="f"><label>Stock</label><input name="stock" type="number" value="${p.stock || 0}"></div>
      <div class="f"><label>Rating</label><input name="rating" type="number" step="0.1" max="5" min="0" value="${p.rating}"></div>
      <div class="f full"><label>Images (comma-separated paths)</label>
        <div class="inline-field">
          <input name="images" id="pimgs" value="${esc(p.images.join(', '))}" class="u-grow">
          <button type="button" class="btn btn-ghost btn-sm" data-cmd="media:pick" data-arg="pimgs-add">+ Add</button>
        </div><input type="hidden" id="pimgs-add" data-append-img></div>
      <div class="f full"><label>Variants — one per line: <em>label | price | stock</em></label>
        <textarea name="variants" rows="3">${esc((p.variants || []).map(v => `${v.label} | ${v.price} | ${v.stock}`).join('\n'))}</textarea></div>
      <div class="f full"><label>Description</label><textarea name="desc" rows="3">${esc(p.desc)}</textarea></div>
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
  /* A single-variant product shows p.price on the card but charges the
     variant price at checkout. Letting them drift is how a shopper gets
     quoted one number and billed another, so keep them in step. */
  if (obj.variants.length === 1) {
    if (obj.variants[0].price !== obj.price) obj.variants[0].price = obj.price;
    if (obj.eur != null && obj.variants[0].eur == null) obj.variants[0].eur = obj.eur;
  }

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
      /* data-* + a delegated change handler, not inline onchange: a product id
         containing a quote would otherwise break out of the attribute. */
      return `<tr><td><div class="tprod"><img src="${esc(r.p.images[0])}" alt=""><div><b>${esc(r.p.name)}</b><small>${esc(r.p.sku || '')}</small></div></div></td>
        <td class="muted">${r.v ? esc(r.v.label) : 'Default'}</td><td class="gold">${money(r.v ? r.v.price : r.p.price)}</td>
        <td><input class="mini stock-input" type="number" value="${st}"
                   data-stock-pid="${esc(r.p.id)}" data-stock-idx="${r.i}"></td>
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
    <thead><tr><th>Customer</th><th>Location</th><th>Orders</th><th>Lifetime spend</th><th>Last order</th><th>Segment</th><th></th></tr></thead>
    <tbody>${cs.map(c => `<tr>
      <td><b class="u-medium">${esc(c.name)}</b><br><small class="muted">${esc(c.email)}</small></td>
      <td class="muted">${esc(c.state)}</td><td>${c.orders}</td><td class="gold">${money(c.spend)}</td>
      <td class="muted">${fdate(c.last)}</td>
      <td><span class="st ${c.spend > 40000 ? 'delivered' : c.orders > 1 ? 'shipped' : 'processing'}">${c.spend > 40000 ? 'VIP' : c.orders > 1 ? 'Repeat' : 'New'}</span></td>
      <td class="u-nowrap"><button class="ico" title="Email this customer" data-cmd="mail:to" data-arg="${esc(c.email)}">
        <svg viewBox="0 0 24 24"><path d="M3 6h18v12H3z"/><path d="m3 7 9 6 9-6"/></svg></button></td>
    </tr>`).join('')}</tbody></table></div></div>`;
}

/* ---------- reviews -----------------------------------------------------------
   Staff can write, edit, approve and delete reviews here.

   IMPORTANT — how a review reaches a real visitor:
   Product pages are static HTML generated by build.js from data.js. Anything
   saved here lives in THIS browser's localStorage only. To publish, use
   "Export for data.js" and paste the block into data.js, then rebuild. The
   banner at the top of this view says so, because forgetting is the single
   easiest way to think you have published something you have not.
   -------------------------------------------------------------------------- */
let revFilter = 'all';

/* Live reviews from /api/reviews. Null until the first load resolves, so the
   view can tell "not loaded yet" apart from "loaded and empty". */
let LIVE_REVIEWS = null;
let liveError = '';

function allReviews() {
  if (LIVE_REVIEWS) {
    return Object.entries(LIVE_REVIEWS).flatMap(([pid, list]) =>
      list.map(r => ({ p: P(pid) || { id: pid, name: pid, images: ['assets/logo-transparent.png'] }, r })));
  }
  /* Fallback: the seed reviews baked into data.js. */
  return PRODUCTS.flatMap(p => p.reviews.map((r, i) => ({ p, r, i })));
}

async function loadLiveReviews() {
  if (!API.enabled) { liveError = 'offline'; return; }
  try {
    const data = await API.getAllReviews();
    LIVE_REVIEWS = data.reviews || {};
    liveError = '';
  } catch (err) {
    LIVE_REVIEWS = null;
    liveError = err.message;
  }
}

async function vReviews() {
  if (LIVE_REVIEWS === null && !liveError) {
    $('#view').innerHTML = '<div class="pane"><p class="muted">Loading reviews…</p></div>';
    await loadLiveReviews();
  }
  const live = !!LIVE_REVIEWS;
  const all = allReviews();
  const pend = all.filter(x => x.r.ok === false);
  const staffWritten = all.filter(x => x.r.src === 'staff');
  const list = revFilter === 'all' ? all
    : revFilter === 'pending' ? pend
    : revFilter === 'published' ? all.filter(x => x.r.ok !== false)
    : all.filter(x => x.r.src === 'staff');

  $('#view').innerHTML = `
  ${live ? `<div class="pane live-panel">
    <h3 class="live-title">Live — publishing straight to the storefront</h3>
    <p class="muted">Reviews you approve here appear for real visitors within seconds. No
      rebuild, no export. Shoppers' own submissions land here as <b>Pending</b>.</p>
  </div>`
  : `<div class="pane attention-panel">
    <h3 class="attention-title">Not connected to the live store${liveError === 'offline' ? '' : ` (${esc(liveError)})`}</h3>
    <p class="muted">${liveError === 'offline'
      ? 'You are viewing this from a local file or a plain static server, so there are no functions behind it. Deploy to Netlify to publish reviews instantly.'
      : liveError === 'unauthorised'
        ? 'Your admin token was rejected. Sign out and back in, and check ADMIN_TOKEN in Netlify → Site settings → Environment variables.'
        : liveError === 'api-not-deployed'
          ? 'The /api/reviews function is not deployed yet. Push the netlify/functions folder and redeploy.'
          : 'Showing the reviews baked into data.js. Changes here will not reach visitors.'}</p>
    <p class="muted">See <code>LIVE-SETUP.md</code> for the five-minute fix.</p>
  </div>`}

  <div class="kpis cols-4">
    ${kpi('Total reviews', all.length, null, 'm12 3 2.6 5.6 6 .7-4.4 4 1.2 6L12 16.4')}
    ${kpi('Awaiting approval', pend.length, null, 'M12 7v5l3 3')}
    ${kpi('Average rating', (all.length ? sum(all.map(x => x.r.r)) / all.length : 0).toFixed(2) + ' ★', null, 'M12 3v18')}
    ${kpi('Added by staff', staffWritten.length, null, 'M12 5v14M5 12h14')}
  </div>

  <div class="toolbar">
    ${[['all', 'All'], ['pending', 'Pending'], ['published', 'Published'], ['staff', 'Staff-added']]
      .map(([k, label]) => `<button class="chip ${revFilter === k ? 'on' : ''}"
        data-cmd="review:filter" data-arg="${k}">${label}${k === 'all' ? '' : ` (${
          k === 'pending' ? pend.length
          : k === 'published' ? all.filter(x => x.r.ok !== false).length
          : staffWritten.length})`}</button>`).join('')}
    <span class="toolbar-right">
      ${live ? '<button class="btn btn-ghost btn-sm" data-cmd="review:refresh">Refresh</button>' : ''}
      ${live && !all.length ? '<button class="btn btn-ghost btn-sm" data-cmd="review:seed">Import from data.js</button>' : ''}
      <button class="btn btn-ghost btn-sm" data-cmd="review:export">Export for data.js</button>
      <button class="btn btn-primary btn-sm" data-cmd="review:new">+ Write review</button>
    </span>
  </div>

  <div class="pane"><div class="ph"><h3>All reviews</h3><p>Approve to publish on the storefront</p></div>
  <div class="tablewrap"><table><thead><tr><th>Product</th><th>Reviewer</th><th>Rating</th><th>Review</th><th>Status</th><th></th></tr></thead><tbody>
    ${list.length ? list.map(x => `<tr>
      <td><div class="tprod"><img src="${x.p.images[0]}" alt=""><div><b>${esc(x.p.name)}</b></div></div></td>
      <td>${esc(x.r.n)}<br><small class="muted">${esc(x.r.d)}${x.r.v ? ' · verified' : ''}</small></td>
      <td class="gold">${'★'.repeat(x.r.r)}</td>
      <td class="review-cell"><b class="u-medium">${esc(x.r.t)}</b><br><small class="muted">${esc(x.r.b)}</small></td>
      <td><span class="st ${x.r.ok === false ? 'pending' : 'delivered'}">${x.r.ok === false ? 'Pending' : 'Published'}</span>
          ${x.r.src === 'staff' ? '<br><small class="muted">added by staff</small>'
            : x.r.src === 'customer' ? '<br><small class="muted">from a shopper</small>' : ''}</td>
      <td class="u-nowrap">
        ${x.r.ok === false ? `<button class="ico" data-cmd="review:approve" data-arg="${x.p.id}" data-arg2="${esc(x.r.id ?? x.i)}" title="Approve"><svg viewBox="0 0 24 24"><path d="M20 7 9 18l-5-5"/></svg></button>` : ''}
        <button class="ico" data-cmd="review:edit" data-arg="${x.p.id}" data-arg2="${esc(x.r.id ?? x.i)}" title="Edit"><svg viewBox="0 0 24 24"><path d="M4 20h4L19 9l-4-4L4 16z"/></svg></button>
        <button class="ico del" data-cmd="review:delete" data-arg="${x.p.id}" data-arg2="${esc(x.r.id ?? x.i)}" title="Delete"><svg viewBox="0 0 24 24"><path d="M4 7h16M9 7V5h6v2M6 7l1 13h10l1-13"/></svg></button></td>
    </tr>`).join('') : '<tr><td colspan="6" class="muted table-empty">Nothing in this filter.</td></tr>'}
  </tbody></table></div></div>`;
}

/* Compose / edit ----------------------------------------------------------- */
function findReview(pid, ref) {
  if (LIVE_REVIEWS) return (LIVE_REVIEWS[pid] || []).find(r => String(r.id) === String(ref));
  const p = P(pid);
  return p ? p.reviews[Number(ref)] : null;
}

function editReview(id, ref) {
  const editing = id !== undefined && id !== '' && ref !== undefined && ref !== '';
  const r = (editing && findReview(id, ref))
    || { n: '', r: 5, t: '', b: '', d: monthLabel(new Date()), v: true, ok: true, src: 'staff' };

  openModal(`<div class="mhead"><h3>${editing ? 'Edit' : 'Write'} review</h3>
    <button type="button" class="icon-btn" data-action="close-modal" aria-label="Close"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg></button></div>

  <div class="pane attention-panel u-mb-md">
    <p class="muted">Only publish reviews a real customer actually gave you. Transcribe a
      WhatsApp reply or email <b>word for word</b> — do not tidy the wording, and do not
      invent one. Fake reviews are a Google penalty and, in the UK, illegal under the
      DMCC Act 2024.</p>
  </div>

  <form id="review-form" data-pid="${esc(id || '')}" data-ref="${editing ? esc(ref) : ''}" data-rid="${esc(r.id || '')}">
    <div class="f-grid">
      <div class="f full"><label for="rv-product">Product</label>
        <select name="pid" id="rv-product" ${editing ? 'disabled' : ''} required>
          ${PRODUCTS.map(p => `<option value="${p.id}" ${editing && p.id === id ? 'selected' : ''}>${esc(p.name)}</option>`).join('')}
        </select></div>

      <div class="f"><label for="rv-name">Reviewer name</label>
        <input name="n" id="rv-name" value="${esc(r.n)}" placeholder="Amaka O." required></div>

      <div class="f"><label for="rv-rating">Rating</label>
        <select name="r" id="rv-rating">
          ${[5, 4, 3, 2, 1].map(n => `<option value="${n}" ${r.r === n ? 'selected' : ''}>${'★'.repeat(n)} ${n}</option>`).join('')}
        </select></div>

      <div class="f"><label for="rv-date">Date shown</label>
        <input name="d" id="rv-date" value="${esc(r.d)}" placeholder="Aug 2026"></div>

      <div class="f"><label for="rv-verified">Verified purchase</label>
        <select name="v" id="rv-verified">
          <option value="yes" ${r.v ? 'selected' : ''}>Yes — matched to an order</option>
          <option value="no" ${r.v ? '' : 'selected'}>No</option>
        </select></div>

      <div class="f full"><label for="rv-title">Headline</label>
        <input name="t" id="rv-title" value="${esc(r.t)}" placeholder="My skin drinks this up" required></div>

      <div class="f full"><label for="rv-body">Review</label>
        <textarea name="b" id="rv-body" rows="4" required placeholder="Their words, exactly as they wrote them.">${esc(r.b)}</textarea></div>

      <div class="f full"><label for="rv-status">Status</label>
        <select name="ok" id="rv-status">
          <option value="yes" ${r.ok !== false ? 'selected' : ''}>Published</option>
          <option value="no" ${r.ok === false ? 'selected' : ''}>Pending approval</option>
        </select></div>
    </div>
    <div class="form-actions">
      <button class="btn btn-primary" type="submit">${editing ? 'Save changes' : 'Add review'}</button>
      <button class="btn btn-dark" type="button" data-action="close-modal">Cancel</button>
    </div>
  </form>`);
}

const monthLabel = d => d.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });

async function saveReview(event) {
  event.preventDefault();
  const form = event.target;
  const d = Object.fromEntries(new FormData(form));
  const editing = form.dataset.ref !== '';
  /* A disabled <select> is omitted from FormData, so fall back to the dataset. */
  const pid = d.pid || form.dataset.pid;
  const product = P(pid);
  if (!product) return toast('Pick a product');

  const entry = {
    n: d.n.trim(), r: +d.r, t: d.t.trim(), b: d.b.trim(),
    d: d.d.trim() || monthLabel(new Date()),
    v: d.v === 'yes',
    ok: d.ok === 'yes',
    src: 'staff'
  };

  const btn = form.querySelector('[type="submit"]');
  if (btn) { btn.disabled = true; btn.textContent = 'Saving…'; }

  if (LIVE_REVIEWS) {
    /* Live path — writes to the shared store, visible to shoppers at once. */
    const existing = editing ? findReview(pid, form.dataset.ref) : null;
    try {
      await API.saveReview({ pid, id: existing ? existing.id : undefined,
        ...entry, src: existing ? (existing.src || 'staff') : 'staff' });
      await loadLiveReviews();
      closeModal();
      await vReviews();
      toast(entry.ok ? 'Published — live on the storefront' : 'Saved as pending');
    } catch (err) {
      if (btn) { btn.disabled = false; btn.textContent = 'Save'; }
      toast('Could not save: ' + err.message);
    }
    return;
  }

  /* Offline path — local copy only. */
  if (editing) {
    const i = Number(form.dataset.ref);
    entry.src = product.reviews[i].src || 'staff';
    product.reviews[i] = entry;
  } else {
    product.reviews.unshift(entry);
  }
  syncRating(product);
  saveProducts();
  closeModal();
  vReviews();
  toast(editing ? 'Review updated' : 'Review added — remember to export');
}

/* Keep the headline rating in step with the reviews behind it. Otherwise the
   card advertises 4.9 while the reviews average 4.2, which shoppers notice. */
function syncRating(product) {
  const live = product.reviews.filter(r => r.ok !== false);
  if (!live.length) return;
  product.rating = Math.round((live.reduce((s, r) => s + r.r, 0) / live.length) * 10) / 10;
}

async function approveRev(id, ref) {
  if (LIVE_REVIEWS) {
    try {
      await API.approveReview(id, ref);
      await loadLiveReviews();
      await vReviews();
      toast('Approved — now live on the storefront');
    } catch (err) { toast('Could not approve: ' + err.message); }
    return;
  }
  P(id).reviews[Number(ref)].ok = true; syncRating(P(id)); saveProducts(); vReviews();
  toast('Approved — export to publish');
}

async function delRev(id, ref) {
  if (!confirm('Delete this review?')) return;
  if (LIVE_REVIEWS) {
    try {
      await API.deleteReview(id, ref);
      await loadLiveReviews();
      await vReviews();
      toast('Review deleted');
    } catch (err) { toast('Could not delete: ' + err.message); }
    return;
  }
  P(id).reviews.splice(Number(ref), 1); syncRating(P(id)); saveProducts(); vReviews(); toast('Review deleted');
}

/* One-time seeding: push the reviews from data.js into the live store so the
   storefront does not go from "19 reviews" to "none" the moment it goes live. */
async function seedLiveReviews() {
  if (!API.enabled) return toast('Only works on the deployed site');
  const payload = {};
  PRODUCTS.forEach(p => {
    const list = p.reviews.map((r, i) => ({
      id: `SEED-${p.id}-${i}`,
      n: r.n, r: r.r, t: r.t, b: r.b, d: r.d,
      v: !!r.v, ok: r.ok !== false, src: r.src || 'seed',
      at: new Date().toISOString()
    }));
    if (list.length) payload[p.id] = list;
  });

  const force = LIVE_REVIEWS && Object.keys(LIVE_REVIEWS).length;
  if (force && !confirm('The live store already has reviews. Overwrite them all with the ones from data.js?')) return;

  try {
    const res = await API.importReviews(payload, !!force);
    await loadLiveReviews();
    await vReviews();
    toast(`Seeded ${res.seeded} products`);
  } catch (err) {
    toast('Seed failed: ' + err.message);
  }
}

/* Export ------------------------------------------------------------------- */
/* Emits just the reviews + rating for each product, in the exact shape data.js
   expects, so the client can paste without hand-editing JSON. */
function exportReviews() {
  const blocks = PRODUCTS.map(p => {
    const source = LIVE_REVIEWS ? (LIVE_REVIEWS[p.id] || []) : p.reviews;
    const live = source.filter(r => r.ok !== false)
      .map(({ src, id, at, ...rest }) => rest);   // strip internal fields
    const avg = live.length
      ? Math.round((live.reduce((t, r) => t + (+r.r || 0), 0) / live.length) * 10) / 10
      : p.rating;
    return `  /* ${p.name} — rating ${avg}, ${live.length} review(s) */\n`
      + `  "${p.id}": {\n    "rating": ${avg},\n    "reviews": ${
        JSON.stringify(live, null, 4).split('\n').join('\n    ')}\n  }`;
  }).join(',\n\n');

  const out = `/* Reviews exported from the admin portal on ${new Date().toISOString().slice(0, 10)}.

   HOW TO PUBLISH THESE
   1. Open lara-beauty/data.js
   2. For each product below, replace that product's "rating" and "reviews"
      values with the ones here.
   3. If every review is now genuine, set  reviewsVerified: true  in
      SEED_SETTINGS and delete  reviewsAreDemo.
   4. Run:  node build.js
   5. Redeploy the lara-beauty-pages folder.

   Only published (approved) reviews are included.
*/

const EXPORTED_REVIEWS = {
${blocks}
};
`;
  download('lara-beauty-reviews.js', out);
  toast('Exported — paste into data.js, then rebuild');
}

/* ---------- marketing ---------- */
/* Subscribers now live in the shared store, not one visitor's browser. */
let LIVE_SUBS = null;
const subsList = () => (LIVE_SUBS !== null ? LIVE_SUBS : SUBS.slice().reverse());

async function loadLiveSubs() {
  if (!API.enabled) return;
  try { LIVE_SUBS = (await API.getSubscribers()).subscribers || []; }
  catch (err) { LIVE_SUBS = null; }
}

async function vMarketing() {
  if (LIVE_SUBS === null && API.enabled) await loadLiveSubs();
  $('#view').innerHTML = `
  <div class="kpis cols-3">
    ${kpi('Subscribers', subsList().length, null, 'M3 6h18v12H3z')}
    ${kpi('Conversion rate', '3.4%', 12, 'm7 15 4-5 3 3 5-7')}
    ${kpi('Discount redemptions', 47, 8, 'M9 9h.01M15 15h.01M6 18 18 6')}
  </div>
  <div class="panes cols-2">
    <div class="pane"><div class="ph"><h3>Announcement bar</h3><p>Shows at the top of every page</p></div>
      <div class="f"><textarea id="ann" rows="3">${SETTINGS.announce}</textarea></div>
      <button class="btn btn-primary btn-sm u-mt-md" data-cmd="announce:save">Save</button></div>
    <div class="pane"><div class="ph"><h3>Newsletter subscribers</h3>
      <span><button class="btn btn-ghost btn-sm" data-cmd="subs:refresh">Refresh</button>
      <button class="btn btn-ghost btn-sm" data-cmd="export:subs">Export</button></span></div>
      ${LIVE_SUBS === null ? '<p class="muted">Showing this browser\'s copy only — the shared list loads on the deployed site.</p>' : ''}
      <div class="tablewrap scroll-panel"><table class="u-min0"><tbody>
        ${subsList().length ? subsList().map(s => `<tr><td>${esc(s.email)}</td><td class="muted">${esc(s.d)}</td>
          <td class="muted">${esc(s.provider || 'local')}</td></tr>`).join('') : '<tr><td class="muted">No subscribers yet.</td></tr>'}
      </tbody></table></div></div>
  </div>
  <div class="pane"><div class="ph"><h3>Discount codes</h3><p>Demo data — wire to your payment provider in production</p></div>
    <div class="tablewrap"><table><thead><tr><th>Code</th><th>Type</th><th>Value</th><th>Used</th><th>Status</th></tr></thead><tbody>
      ${[['WELCOME10','Percentage','10%',312,'delivered'],['GLOW5000','Fixed','₦5,000',48,'delivered'],['FREESHIP','Shipping','Free delivery',129,'delivered'],['XMAS26','Percentage','20%',0,'pending']]
        .map(r => `<tr><td class="gold">${r[0]}</td><td class="muted">${r[1]}</td><td>${r[2]}</td><td>${r[3]}</td><td><span class="st ${r[4]}">${r[4] === 'delivered' ? 'Active' : 'Scheduled'}</span></td></tr>`).join('')}
    </tbody></table></div></div>`;
}
function exportSubs() {
  const rows = subsList();
  download('subscribers.csv',
    'email,date,source\n' + rows.map(s => `${s.email},${s.d},${s.provider || 'local'}`).join('\n'));
  toast(`Exported ${rows.length} subscribers`);
}

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
      ${stats.map(s => `<tr><td><div class="tprod"><img src="${s.p.images[0]}" alt=""><div><b>${esc(s.p.name)}</b></div></div></td>
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
  <div class="pane u-mb-md"><div class="ph"><div><h3>Backup &amp; restore</h3>
      <p>${API.enabled
        ? 'Works on the live store — what every visitor sees.'
        : 'Not connected to the live store; these act on this browser only.'}</p></div></div>
    <p class="muted u-mb-md">Download a full backup before any big change. The file
      contains your catalogue, reviews, orders, enquiries and subscribers.</p>
    <div class="pane-actions">
      <button class="btn btn-primary btn-sm" data-cmd="data:backup">Download full backup</button>
      <button class="btn btn-ghost btn-sm" data-cmd="data:restore">Restore from backup…</button>
      <button class="btn btn-ghost btn-sm" data-cmd="export:csv">Orders as CSV</button>
      <button class="btn btn-ghost btn-sm" data-cmd="export:subs">Subscribers as CSV</button>
      <button class="btn btn-ghost btn-sm" data-cmd="review:export">Reviews for data.js</button>
    </div>
    <input type="file" id="restore-file" accept="application/json" hidden>
  </div>

  <div class="pane"><div class="ph"><div><h3 class="danger-title">Clear data</h3>
      <p>Permanent. Take a backup first.</p></div></div>
    <p class="muted u-mb-md"><b>Before you launch</b>, use <em>Remove demo content</em>.
      It deletes the sample reviews and demo orders but keeps your products, so the
      shop opens honestly instead of with invented social proof.</p>
    <div class="pane-actions">
      <button class="btn btn-ghost btn-sm" data-cmd="data:wipe" data-arg="demo">Remove demo content</button>
      <button class="btn btn-ghost btn-sm" data-cmd="data:wipe" data-arg="orders">Clear orders</button>
      <button class="btn btn-ghost btn-sm" data-cmd="data:wipe" data-arg="reviews">Clear all reviews</button>
      <button class="btn btn-ghost btn-sm" data-cmd="data:wipe" data-arg="subscribers">Clear subscribers</button>
      <button class="btn btn-dark btn-sm" data-cmd="data:wipe" data-arg="everything">Erase everything</button>
    </div>
    <p class="muted u-mt-md">“Reset this browser” only clears your local copy and is
      useful if the admin looks out of step with the live site.
      <button class="linkish" data-cmd="data:reset">Reset this browser</button></p>
  </div>`;
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
/* --- live backup / restore / wipe ---------------------------------------- */
async function backupAll() {
  if (!API.enabled) return exportJSON();          // offline: local copy only
  try {
    const data = await API.exportAll();
    const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-');
    download(`lara-beauty-backup-${stamp}.json`, JSON.stringify(data, null, 2));
    const s = data._summary || {};
    toast(`Backed up ${s.products || 0} products, ${s.reviews || 0} reviews, ${s.messages || 0} messages`);
  } catch (err) {
    toast('Backup failed: ' + err.message);
  }
}

async function restoreFromFile(file) {
  let parsed;
  try { parsed = JSON.parse(await file.text()); }
  catch { return toast('That file is not valid JSON'); }

  const s = parsed._summary || {};
  const what = parsed._exportedAt
    ? `Backup from ${fdate(parsed._exportedAt)} — ${s.products || 0} products, ${s.reviews || 0} reviews.`
    : 'This file has no backup header; it may not be a Lara backup.';

  const replace = confirm(`${what}\n\nOK = REPLACE current data with the file.\nCancel = merge (keep both, file wins on conflicts).`);
  if (!confirm(replace ? 'Replace everything? This cannot be undone.' : 'Merge this backup in?')) return;

  try {
    const res = await API.importAll(parsed, replace ? 'replace' : 'merge');
    await loadLiveStore(); await loadLiveReviews(); await loadLiveMessages();
    toast(`Restored (${res.mode})`);
    nav(view);
  } catch (err) {
    toast('Restore failed: ' + err.message);
  }
}

const WIPE_LABELS = {
  demo: 'sample reviews and demo orders',
  orders: 'every order',
  reviews: 'every review, including real ones',
  subscribers: 'your whole mailing list',
  everything: 'ALL products, reviews, orders and subscribers'
};

async function wipeData(scope) {
  if (!API.enabled) return toast('Only available on the live site');
  const what = WIPE_LABELS[scope] || scope;

  if (!confirm(`Permanently delete ${what}?\n\nTake a backup first if you have not.`)) return;
  /* A second, typed confirmation for the irreversible ones. */
  if (scope === 'everything' || scope === 'reviews' || scope === 'subscribers') {
    const typed = prompt(`This cannot be undone.\n\nType DELETE to confirm:`);
    if (typed !== 'DELETE') return toast('Cancelled');
  }

  try {
    const res = await API.wipe(scope);
    await loadLiveStore(); await loadLiveReviews(); await loadLiveMessages();
    LIVE_SUBS = null;
    toast(res.seedReviewsRemoved !== undefined
      ? `Removed ${res.seedReviewsRemoved} sample reviews`
      : `Cleared: ${(res.cleared || []).join(', ') || scope}`);
    nav(view);
  } catch (err) {
    toast('Could not clear: ' + err.message);
  }
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


/* ===================== LIVE PUBLISHING =====================
   Admin edits go into a DRAFT. Shoppers keep seeing the last PUBLISHED version
   until someone presses Publish. Prices are the reason: an unreviewed keystroke
   should never be what a customer is charged.
   ========================================================================= */
let LIVE_STORE = null;      // { draft, published, hasRollback, version }
let storeError = '';

/* store.js fires db:saved on every write, so one listener covers all ~20 admin
   save paths. adoptSnapshot suppresses it: applying live data is not an edit.
   (The save helpers are `const`, so they are not on `window` and cannot be
   monkey-patched — the event is the reliable hook.) */
let adopting = false;
const PUBLISHABLE = ['products', 'categories', 'content', 'settings'];
document.addEventListener('db:saved', e => {
  if (adopting || !PUBLISHABLE.includes(e.detail)) return;
  queueDraftSave();
});

/* The slice of admin state that gets published. Orders, messages and reviews
   are deliberately excluded — they are transactional, not editorial. */
function currentSnapshot() {
  return {
    products: PRODUCTS,
    categories: CATEGORIES,
    content: CONTENT,
    settings: SETTINGS
  };
}

async function loadLiveStore() {
  if (!API.enabled) { storeError = 'offline'; return; }
  try {
    LIVE_STORE = await API.getDraft();
    storeError = '';
    /* Adopt whatever is already live so the admin is editing reality, not the
       seed data baked into data.js at build time. */
    const source = LIVE_STORE.draft || LIVE_STORE.published;
    if (source) adoptSnapshot(source);
  } catch (err) {
    LIVE_STORE = null;
    storeError = err.message;
  }
}

function adoptSnapshot(snap) {
  adopting = true;
  try { applySnapshot(snap); } finally { adopting = false; }
}

function applySnapshot(snap) {
  if (Array.isArray(snap.products)) { PRODUCTS = snap.products; saveProducts(); }
  if (Array.isArray(snap.categories)) { CATEGORIES = snap.categories; saveCategories(); }
  if (snap.content) { CONTENT = merge(SEED_CONTENT, snap.content); saveContent(); }
  if (snap.settings) { SETTINGS = Object.assign({}, SEED_SETTINGS, snap.settings); saveSettings(); }
}

/* Compare draft to published so the bar can say what is actually pending. */
function pendingChanges() {
  if (!LIVE_STORE) return [];
  const pub = LIVE_STORE.published;
  const cur = currentSnapshot();
  if (!pub) return ['Nothing has been published yet'];

  const out = [];
  const byId = list => Object.fromEntries((list || []).map(p => [p.id, p]));
  const a = byId(pub.products), b = byId(cur.products);

  Object.keys(b).forEach(id => {
    if (!a[id]) return out.push(`New product: ${b[id].name}`);
    if (a[id].price !== b[id].price) {
      /* Admin price fields are Naira. money() follows the storefront currency
         switch, which would print a Naira figure with a euro sign. */
      out.push(`${b[id].name}: price ₦${Number(a[id].price).toLocaleString('en-NG')} → ₦${Number(b[id].price).toLocaleString('en-NG')}`);
    }
    if (a[id].name !== b[id].name) out.push(`Renamed: ${a[id].name} → ${b[id].name}`);
    if (JSON.stringify(a[id].variants || []) !== JSON.stringify(b[id].variants || [])) {
      out.push(`${b[id].name}: variants or stock changed`);
    }
  });
  Object.keys(a).forEach(id => {
    if (!b[id]) out.push(`Removed: ${a[id].name}`);
  });

  if (JSON.stringify(pub.content) !== JSON.stringify(cur.content)) out.push('Page content edited');
  if (JSON.stringify(pub.settings) !== JSON.stringify(cur.settings)) out.push('Settings changed');
  if (JSON.stringify(pub.categories) !== JSON.stringify(cur.categories)) out.push('Categories changed');

  return out;
}

/* Autosave the draft after any admin change, debounced. Losing an afternoon of
   edits to a closed tab is a worse failure than a few extra requests. */
let draftTimer = null;
function queueDraftSave() {
  if (!LIVE_STORE) return;
  clearTimeout(draftTimer);
  draftTimer = setTimeout(async () => {
    try {
      await API.saveDraft(currentSnapshot());
      LIVE_STORE.draft = currentSnapshot();
      renderPublishBar();
    } catch (err) {
      if (err.message !== 'validation failed') return;
      toast('Draft not saved: ' + err.message);
    }
  }, 900);
}

function renderPublishBar() {
  const bar = $('#publish-bar');
  if (!bar) return;

  if (!LIVE_STORE) {
    bar.hidden = true;
    return;
  }

  const changes = pendingChanges();
  bar.hidden = false;
  bar.classList.toggle('has-changes', changes.length > 0);
  bar.innerHTML = changes.length
    ? `<div class="pb-txt">
         <b>${changes.length} unpublished change${changes.length === 1 ? '' : 's'}</b>
         <span class="muted">${esc(changes.slice(0, 2).join(' · '))}${changes.length > 2 ? ` · +${changes.length - 2} more` : ''}</span>
       </div>
       <div class="pb-actions">
         <button class="btn btn-ghost btn-sm" data-cmd="live:review">Review</button>
         <button class="btn btn-ghost btn-sm" data-cmd="live:discard">Discard</button>
         <button class="btn btn-primary btn-sm" data-cmd="live:publish">Publish changes</button>
       </div>`
    : `<div class="pb-txt">
         <b class="pb-live">Everything is live</b>
         <span class="muted">${LIVE_STORE.publishedAt ? 'Last published ' + fdate(LIVE_STORE.publishedAt) : 'Nothing published yet'}</span>
       </div>
       <div class="pb-actions">
         ${LIVE_STORE.hasRollback ? '<button class="btn btn-ghost btn-sm" data-cmd="live:rollback">Undo last publish</button>' : ''}
         ${!LIVE_STORE.published ? '<button class="btn btn-primary btn-sm" data-cmd="live:publish">Publish site</button>' : ''}
       </div>`;
}

function reviewChanges() {
  const changes = pendingChanges();
  openModal(`<div class="mhead"><h3>Unpublished changes</h3>
    <button type="button" class="icon-btn" data-action="close-modal" aria-label="Close"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg></button></div>
    <p class="muted">These go live the moment you publish. Check the prices.</p>
    <ul class="change-list">${changes.map(c => `<li>${esc(c)}</li>`).join('') || '<li class="muted">No differences.</li>'}</ul>
    <div class="form-actions">
      <button class="btn btn-primary" data-cmd="live:publish">Publish these changes</button>
      <button class="btn btn-dark" type="button" data-action="close-modal">Keep editing</button>
    </div>`);
}

async function publishLive() {
  const changes = pendingChanges();
  if (!confirm(`Publish ${changes.length} change${changes.length === 1 ? '' : 's'} to the live site now?`)) return;
  try {
    const res = await API.publish(currentSnapshot());
    await loadLiveStore();
    closeModal();
    renderPublishBar();
    toast(res.rebuild === 'triggered'
      ? `Published — live now (v${res.version}), search data rebuilding`
      : `Published — live now (v${res.version})`);
  } catch (err) {
    closeModal();
    if (err.message === 'validation failed') {
      return toast('Publish blocked — check prices');
    }
    toast('Publish failed: ' + err.message);
  }
}

async function discardDraft() {
  if (!confirm('Throw away every unpublished change and go back to what is live?')) return;
  try {
    await API.discardDraft();
    await loadLiveStore();
    renderPublishBar();
    nav(view);
    toast('Draft discarded');
  } catch (err) { toast('Could not discard: ' + err.message); }
}

async function rollbackLive() {
  if (!confirm('Roll the live site back to the previous published version?')) return;
  try {
    await API.rollback();
    await loadLiveStore();
    renderPublishBar();
    nav(view);
    toast('Rolled back — live site restored');
  } catch (err) { toast('Rollback failed: ' + err.message); }
}

/* ===================== MESSAGES =====================
   Messages live in the shared store when the API is reachable, so an enquiry
   sent from a customer's phone shows up here. LIVE_MESSAGES is null until the
   first load resolves; until then we fall back to this browser's copy. */
let LIVE_MESSAGES = null;
let msgError = '';

function messages() {
  return LIVE_MESSAGES !== null ? LIVE_MESSAGES : DB.read('lba_messages', []);
}
function saveMessages(list) { DB.write('lba_messages', list); }

async function loadLiveMessages() {
  if (!API.enabled) { msgError = 'offline'; return; }
  try {
    const data = await API.getMessages();
    LIVE_MESSAGES = data.messages || [];
    msgError = '';
  } catch (err) {
    LIVE_MESSAGES = null;
    msgError = err.message;
  }
}

function unreadCount() { return messages().filter(m => !m.read).length; }

function refreshMsgBadge() {
  const el = $('#msg-badge');
  if (!el) return;
  const n = unreadCount();
  el.textContent = n;
  el.hidden = n === 0;
}

let msgFilter = 'all';

async function vMessages() {
  if (LIVE_MESSAGES === null && !msgError) {
    $('#view').innerHTML = '<div class="pane"><p class="muted">Loading inbox…</p></div>';
    await loadLiveMessages();
  }
  const all = messages();
  const liveInbox = LIVE_MESSAGES !== null;
  const list = msgFilter === 'all' ? all : all.filter(m => m.type === msgFilter);
  const types = ['all', 'enquiry', 'order', 'subscriber', 'outbound'];
  const configured = MAIL.provider !== 'none';

  $('#view').innerHTML = `
  ${liveInbox ? `<div class="pane live-panel">
    <h3 class="live-title">Shared inbox — live</h3>
    <p class="muted">Enquiries and orders from every device land here, not just this one.</p>
  </div>` : `<div class="pane attention-panel">
    <h3 class="attention-title">Local inbox only</h3>
    <p class="muted">${msgError === 'offline'
      ? 'Not running on the deployed site, so only messages sent from this browser are shown.'
      : 'Could not reach the shared inbox — showing this browser\'s copy. ' + esc(msgError)}</p>
  </div>`}

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
      ${liveInbox ? '<button class="btn btn-ghost btn-sm" data-cmd="msg:refresh">Refresh</button>' : ''}
      <button class="btn btn-ghost btn-sm" data-cmd="msg:read-all">Mark all read</button>
      <button class="btn btn-ghost btn-sm" data-cmd="msg:export">Export CSV</button>
      <button class="btn btn-primary btn-sm" data-cmd="mail:compose">+ Compose email</button>
    </span>
  </div>

  <div class="pane"><div class="tablewrap"><table>
    <thead><tr><th>Date</th><th>Type</th><th>From / To</th><th>Message</th><th>Email sent</th><th></th></tr></thead>
    <tbody>${list.length ? list.map(m => `
      <tr class="${m.read ? '' : 'msg-unread'}">
        <td class="muted u-nowrap">${fdate(m.date)}</td>
        <td><span class="st ${m.type === 'order' ? 'shipped' : m.type === 'enquiry' ? 'processing'
            : m.type === 'outbound' ? 'pending' : 'delivered'}">${m.type === 'outbound' ? 'sent by us' : m.type}</span></td>
        <td>${m.name ? `<b class="u-medium">${esc(m.name)}</b><br>` : ''}
            <small class="muted">${esc(m.email || '')}${m.phone ? '<br>' + esc(m.phone) : ''}</small></td>
        <td class="msg-body">${esc((m.body || '').slice(0, 240))}${(m.body || '').length > 240 ? '…' : ''}</td>
        <td class="${m.delivered ? 'delivery-ok' : 'delivery-pending'}">${
          m.delivered ? 'Sent' : m.type === 'outbound' ? 'Handed to mail app' : 'Saved only'}</td>
        <td class="u-nowrap">
          ${m.email ? `<button class="ico" title="Reply" data-cmd="mail:reply" data-arg="${m.id}">
            <svg viewBox="0 0 24 24"><path d="M3 6h18v12H3z"/><path d="m3 7 9 6 9-6"/></svg></button>` : ''}
          <button class="ico" title="Toggle read" data-cmd="msg:toggle" data-arg="${m.id}">
            <svg viewBox="0 0 24 24"><path d="M20 7 9 18l-5-5"/></svg></button>
          <button class="ico del" title="Delete" data-cmd="msg:delete" data-arg="${m.id}">
            <svg viewBox="0 0 24 24"><path d="M4 7h16M9 7V5h6v2M6 7l1 13h10l1-13"/></svg></button>
        </td>
      </tr>`).join('') : '<tr><td colspan="6" class="muted table-empty">No messages yet.</td></tr>'}
    </tbody></table></div></div>`;
  refreshMsgBadge();
}

async function toggleMsgRead(id) {
  const list = messages();
  const m = list.find(x => x.id === id);
  if (!m) return;
  m.read = !m.read;
  if (LIVE_MESSAGES !== null) {
    try { await API.markMessage(id, m.read); } catch (e) { toast('Sync failed: ' + e.message); }
  } else saveMessages(list);
  vMessages();
}

async function deleteMsg(id) {
  if (!confirm('Delete this message?')) return;
  if (LIVE_MESSAGES !== null) {
    try { await API.deleteMessage(id); await loadLiveMessages(); }
    catch (e) { return toast('Delete failed: ' + e.message); }
  } else {
    saveMessages(messages().filter(m => m.id !== id));
  }
  vMessages();
  toast('Message deleted');
}

async function markAllRead() {
  const list = messages();
  list.forEach(m => m.read = true);
  if (LIVE_MESSAGES !== null) {
    try { await API.markAllMessages(); } catch (e) { toast('Sync failed: ' + e.message); }
  } else saveMessages(list);
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


/* ---------- compose outbound mail -------------------------------------------
   Staff can write to a customer, a subscriber, or paste any address. Where the
   message actually goes depends on MAIL.provider — see the note in email.js.
   Everything sent is logged in this inbox as type "outbound".
   -------------------------------------------------------------------------- */
const MAIL_TEMPLATES = {
  blank: { subject: '', body: '' },

  reply: {
    subject: 'Re: your message',
    body: `Hi {name},\n\nThank you for getting in touch.\n\n\n\nWarm regards,\nLara Beauty Atelier\n${''}`
  },

  dispatched: {
    subject: 'Your order is on its way',
    body: `Hi {name},\n\nGood news — your order has left us and is on its way.\n\n`
        + `Tracking: \n\nDelivery is usually 1–2 days in Lagos, 2–4 days elsewhere in Nigeria, `
        + `and 2–3 days across the UK.\n\nIf anything is not right when it arrives, reply to this `
        + `email and we will sort it.\n\nWarm regards,\nLara Beauty Atelier`
  },

  askReview: {
    subject: 'How are you finding it?',
    body: `Hi {name},\n\nYou ordered from us a couple of weeks ago. If you have a minute, we would `
        + `genuinely like to know how you are finding it — good or bad. Two lines is plenty.\n\n`
        + `You can reply straight to this email.\n\nIf something is wrong, tell us and we will `
        + `put it right.\n\nWarm regards,\nLara Beauty Atelier`
  },

  restock: {
    subject: 'Back in stock',
    body: `Hi {name},\n\nThe piece you were waiting for is back in stock. We make in small batches, `
        + `so it tends to go quickly.\n\nShop: https://lara-beauty-atelier.netlify.app/shop\n\n`
        + `Warm regards,\nLara Beauty Atelier`
  },

  apology: {
    subject: 'About your order',
    body: `Hi {name},\n\nI am sorry — we got this wrong.\n\n\n\nHere is what we are doing about it:\n\n\n`
        + `\nThank you for your patience.\n\nWarm regards,\nLara Beauty Atelier`
  }
};

function composeMail(prefill = {}) {
  const direct = canSendDirect();
  const recipients = [...new Set([
    ...ORDERS.map(o => o.email),
    ...SUBS.map(s => s.email),
    ...messages().map(m => m.email)
  ].filter(Boolean))].sort();

  openModal(`<div class="mhead"><h3>Compose email</h3>
    <button type="button" class="icon-btn" data-action="close-modal" aria-label="Close"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg></button></div>

  <div class="pane attention-panel u-mb-md">
    ${direct
      ? `<p class="muted"><b>Sending directly via EmailJS.</b> The customer receives this from
           your connected mailbox. A copy is kept in Messages.</p>`
      : `<p class="muted"><b>This will open your own email app</b> with the message ready to send —
           you press send there, so the reply comes back to your normal inbox. A copy is logged here.</p>
         <p class="muted">To send straight from this screen instead, set
           <code>MAIL.provider = 'emailjs'</code> in <code>email.js</code>. See EMAIL-SETUP.md.</p>`}
  </div>

  <form id="compose-form">
    <div class="f-grid">
      <div class="f full"><label for="cm-to">To</label>
        <input name="to" id="cm-to" type="email" required value="${esc(prefill.to || '')}"
               placeholder="customer@email.com" list="cm-contacts" autocomplete="off">
        <datalist id="cm-contacts">${recipients.map(e => `<option value="${esc(e)}">`).join('')}</datalist>
      </div>

      <div class="f full"><label for="cm-template">Template</label>
        <select id="cm-template" data-cmd-change="mail:template">
          <option value="blank">Blank</option>
          <option value="reply">Reply to an enquiry</option>
          <option value="dispatched">Order dispatched</option>
          <option value="askReview">Ask for a review</option>
          <option value="restock">Back in stock</option>
          <option value="apology">Apology / something went wrong</option>
        </select>
        <small class="muted">Templates use <code>{name}</code>, replaced with the part of the address before the @.</small>
      </div>

      <div class="f full"><label for="cm-subject">Subject</label>
        <input name="subject" id="cm-subject" required value="${esc(prefill.subject || '')}"></div>

      <div class="f full"><label for="cm-body">Message</label>
        <textarea name="body" id="cm-body" rows="12" required>${esc(prefill.body || '')}</textarea></div>
    </div>
    <div class="form-actions">
      <button class="btn btn-primary" type="submit">${direct ? 'Send email' : 'Open in mail app'}</button>
      <button class="btn btn-dark" type="button" data-action="close-modal">Cancel</button>
    </div>
  </form>`);
}

function applyTemplate(key) {
  const t = MAIL_TEMPLATES[key];
  if (!t) return;
  const to = $('#cm-to').value.trim();
  const name = to ? to.split('@')[0].replace(/[._-]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : 'there';
  const body = $('#cm-body');
  const subject = $('#cm-subject');

  if (body.value.trim() && !confirm('Replace what you have written?')) return;
  subject.value = t.subject;
  body.value = t.body.replace(/\{name\}/g, name);
}

async function submitCompose(event) {
  event.preventDefault();
  const d = Object.fromEntries(new FormData(event.target));
  const btn = event.target.querySelector('[type="submit"]');
  btn.disabled = true;
  btn.textContent = 'Sending…';

  const res = await sendStaffMail({
    to: d.to.trim(), subject: d.subject.trim(), body: d.body, replyTo: MAIL.to
  });

  closeModal();
  vMessages();
  toast(res.ok
    ? (res.method === 'emailjs' ? 'Email sent' : 'Opened in your mail app — press send there')
    : 'Send failed — the draft is saved in Messages');
}

/* Reply to an existing message, with the thread quoted underneath. */
function replyTo(id) {
  const m = messages().find(x => x.id === id);
  if (!m || !m.email) return toast('No address on that message');
  const quoted = (m.body || '').split('\n').map(l => '> ' + l).join('\n');
  composeMail({
    to: m.email,
    subject: 'Re: ' + (m.subject || 'your message'),
    body: `Hi ${(m.name || '').split(' ')[0] || 'there'},\n\nThank you for getting in touch.\n\n\n\n`
        + `Warm regards,\nLara Beauty Atelier\n\n---\nOn ${fdate(m.date)} you wrote:\n${quoted}`
  });
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
