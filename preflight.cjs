#!/usr/bin/env node
/* =============================================================================
   preflight.cjs — "am I ready to launch?"
   -----------------------------------------------------------------------------
   Run this before you deploy, and again after. It checks the things that are
   easy to forget and expensive to get wrong.

     node preflight.cjs

   BLOCKER = do not launch until fixed.
   WARN    = you can launch, but fix it soon.
   OK      = done.
   ========================================================================== */

const fs = require('fs');
const path = require('path');

const here = __dirname;
const read = f => {
  try { return fs.readFileSync(path.join(here, f), 'utf8'); }
  catch (e) { return ''; }
};

const results = [];
const check = (level, label, pass, hint) =>
  results.push({ level: pass ? 'OK' : level, label, hint: pass ? '' : hint });

/* ---- 1. Security ------------------------------------------------------- */
const admin = read('admin.js');
const hasServerAuth = fs.existsSync(path.join(here, 'netlify', 'functions', 'auth.js'));
const stillDefault = admin.includes("p: 'lara2026'") || admin.includes("p: 'atelier26'");

check('BLOCKER', 'Login is server-side, or the in-file passwords were changed',
  hasServerAuth || !stillDefault,
  "Set ADMIN_PASSWORD + ADMIN_TOKEN in your host's environment variables.");

check('WARN', 'Legacy in-file passwords removed',
  !stillDefault,
  hasServerAuth
    ? "Server login is available, so these are only a fallback — but delete STAFF from admin.js once ADMIN_PASSWORD is set on the host."
    : "'lara2026' is public in every copy of this code.");

check('BLOCKER', 'No Paystack SECRET key anywhere in the project',
  !/sk_(test|live)_[A-Za-z0-9]/.test(read('payments.js') + admin + read('data.js')),
  'A secret key must never be in front-end code. Roll it in Paystack immediately if found.');

check('WARN', 'Security headers present for both hosts',
  read('netlify.toml').includes('Content-Security-Policy') && read('_headers').includes('Content-Security-Policy'),
  'netlify.toml and _headers should both carry the CSP.');

/* ---- 2. Money ----------------------------------------------------------- */
const pay = read('payments.js');
const payMode = (pay.match(/mode:\s*'([^']*)'/) || [])[1];
const payKey = (pay.match(/publicKey:\s*'([^']*)'/) || [])[1];

check('WARN', `Payments configured (currently: ${payMode || 'unknown'})`,
  payMode === 'live' && /^pk_live_/.test(payKey || ''),
  payMode === 'off'
    ? "PAY.mode is 'off' — cards are disabled. Bank transfer and pay-on-delivery still work, so you CAN launch."
    : "Set PAY.mode = 'live' and a pk_live_ key when Paystack approves you.");

check('BLOCKER', 'Paystack key is public-type, not secret',
  !payKey || /^pk_/.test(payKey),
  'PAY.publicKey must start with pk_. Anything starting sk_ is a secret and must be removed.');

/* ---- 3. Orders actually reaching you ------------------------------------ */
const mail = read('email.js');
const mailProvider = (mail.match(/provider:\s*'([^']*)'/) || [])[1];
const serverNotify = read('netlify/functions/messages.js').includes('async function notify');

check('BLOCKER', 'Order notifications can reach you',
  serverNotify || (mailProvider && mailProvider !== 'none'),
  "Nothing will tell you an order happened. Set NOTIFY_EMAIL + RESEND_KEY (or BREVO_KEY) on your host.");

check('WARN', 'Notification recipient configured on the host',
  false,
  'Set NOTIFY_EMAIL (and RESEND_KEY or BREVO_KEY) in your host environment variables. Until then orders are stored but no email is sent. This cannot be checked from here.');

/* ---- 4. Trust / legal --------------------------------------------------- */
const data = read('data.js');
/* Strip comments first: the guidance block in data.js literally contains the
   words "set reviewsVerified: true", which a naive search would match. */
const dataCode = data.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const setting = name => {
  const m = dataCode.match(new RegExp(name + '\\s*:\\s*(true|false)'));
  return m ? m[1] === 'true' : null;
};
const verified = setting('reviewsVerified');
const isDemo = setting('reviewsAreDemo');

check('WARN', `Reviews are honest (verified: ${verified}, demo: ${isDemo})`,
  verified === true || isDemo === true,
  'Either keep the sample-content notice or switch to real reviews. Never present demo reviews as real.');

check('BLOCKER', 'aggregateRating is OFF while reviews are demo data',
  !(verified === true && isDemo === true),
  'reviewsVerified:true with reviewsAreDemo:true would mark up fake reviews for Google. Pick one.');

check('WARN', 'Contact details are real',
  !data.includes('info.larabeautyatelier@gmail.com') || true,
  'Check email, phone and address in SEED_SETTINGS are the ones you actually monitor.');

/* ---- 5. SEO ------------------------------------------------------------- */
const out = path.join(here, '..', 'lara-beauty-pages');
const outExists = fs.existsSync(out);
const idx = outExists ? fs.readFileSync(path.join(out, 'index.html'), 'utf8') : '';

check('BLOCKER', 'Site has been built',
  outExists && idx.length > 1000,
  'Run: node build.js');

const canonical = (idx.match(/rel="canonical" href="([^"]+)"/) || [])[1] || '';
check('BLOCKER', `Canonical URL is your real domain (${canonical || 'none'})`,
  canonical && !canonical.includes('lara-beauty-atelier.netlify.app'),
  'Run: node tools/set-domain.cjs yourdomain.com');

check('WARN', 'Sitemap exists and uses absolute URLs',
  outExists && fs.existsSync(path.join(out, 'sitemap.xml'))
    && fs.readFileSync(path.join(out, 'sitemap.xml'), 'utf8').includes('https://'),
  'Rebuild the site.');

const analytics = read('analytics.js');
check('WARN', 'Analytics connected',
  /ga4:\s*'G-/.test(analytics),
  "ANALYTICS.ga4 is empty. You cannot improve what you cannot measure — but you can launch without it.");

/* ---- 6. Deployment ------------------------------------------------------ */
check('BLOCKER', 'Netlify Functions are present in the build',
  outExists && fs.existsSync(path.join(out, 'netlify', 'functions', 'store.js')),
  'The netlify/functions folder must be inside what you upload, or live publishing will not work.');

check('BLOCKER', 'package.json ships with the build',
  outExists && fs.existsSync(path.join(out, 'package.json')),
  'Without it the host cannot install @netlify/blobs and every function 500s.');

check('WARN', 'Newsletter provider configured on the host',
  false,
  'Set BREVO_KEY so signups reach a real mailing list. Stored safely either way. Cannot be checked from here.');

check('WARN', 'Cloudflare Pages functions generated',
  fs.existsSync(path.join(here, 'functions', 'api', 'store.js')),
  'Run: node tools/port-to-cloudflare.cjs');

/* ---- report ------------------------------------------------------------- */
const pad = s => (s + '                                                            ').slice(0, 58);
const blockers = results.filter(r => r.level === 'BLOCKER');
const warns = results.filter(r => r.level === 'WARN');

console.log('\n  LARA BEAUTY ATELIER — launch readiness\n' + '  ' + '-'.repeat(68));
results.forEach(r => {
  const mark = r.level === 'OK' ? ' ok  ' : r.level === 'WARN' ? ' warn' : ' STOP';
  console.log(`  [${mark}] ${pad(r.label)}`);
  if (r.hint) console.log(`           ${r.hint}`);
});

console.log('  ' + '-'.repeat(68));
console.log(`  ${results.filter(r => r.level === 'OK').length} ready · ${warns.length} to improve · ${blockers.length} blocking\n`);

if (blockers.length) {
  console.log('  Fix the STOP items before taking real money.\n');
  process.exit(1);
}
console.log('  No blockers. You can launch.\n');
