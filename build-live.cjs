#!/usr/bin/env node
/* =============================================================================
   build-live.js — the build Netlify runs
   -----------------------------------------------------------------------------
   Regenerates the site in place, using the LIVE published catalogue and reviews
   rather than the seed data in data.js.

   Why this exists:
     Shoppers get live prices from /api/store via JavaScript. But the raw HTML
     and the Product JSON-LD that Google reads are baked in at build time. If a
     price is edited in the admin and never rebuilt, the schema disagrees with
     the page — which Google treats as a structured-data policy violation, and
     Merchant Center can disapprove the item over.

     So: publishing in the admin pings a Netlify build hook, Netlify runs this,
     and the HTML + schema catch up. The build takes well under a second.

   Safety:
     If the API is unreachable this falls back to data.js and still produces a
     complete site. A deploy can never hard-fail because the API had a bad
     moment.
   ========================================================================== */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

/* Netlify exposes the site's own URL as $URL (and $DEPLOY_PRIME_URL for
   branch deploys). Prefer an explicit LIVE_API if one is set. */
const site = process.env.LIVE_API || process.env.URL || process.env.DEPLOY_PRIME_URL || '';

console.log('--- Lara Beauty build ---');
console.log(site ? `Live data source: ${site}` : 'No live API configured — building from data.js');

/* build.js expects to run from the folder that holds data.js, styles.css etc,
   and writes into lara-beauty-pages/. On Netlify the deployed folder IS that
   output, so we build into a temp dir and copy the generated files back. */
const here = __dirname;
const isDeployedCopy = fs.existsSync(path.join(here, 'index.html'))
  && fs.existsSync(path.join(here, 'data.js'));

try {
  if (isDeployedCopy) {
    /* Running inside the published folder (Netlify). Build into ./_build then
       move the results up. */
    const src = path.join(here, '_src');
    const out = path.join(here, '_build');
    fs.rmSync(src, { recursive: true, force: true });
    fs.rmSync(out, { recursive: true, force: true });
    fs.mkdirSync(src, { recursive: true });

    /* build.js reads these from its own directory. */
    const needed = ['data.js', 'blog.js', 'store.js', 'site.js', 'api.js', 'email.js',
      'payments.js', 'analytics.js', 'styles.css', 'admin.html', 'admin.js',
      'robots.txt', 'netlify.toml', 'package.json',
      /* No .md files. Everything in the deployed folder is served at a public
         URL, and deployment notes once leaked the admin password that way. */
      '.domain',            // else CI reverts every canonical to the placeholder
      'build.cjs'];
    needed.forEach(f => {
      const from = path.join(here, f);
      if (fs.existsSync(from)) fs.copyFileSync(from, path.join(src, f));
    });
    if (fs.existsSync(path.join(here, 'assets'))) {
      fs.cpSync(path.join(here, 'assets'), path.join(src, 'assets'), { recursive: true });
    }
    if (fs.existsSync(path.join(here, 'netlify'))) {
      fs.cpSync(path.join(here, 'netlify'), path.join(src, 'netlify'), { recursive: true });
    }

    execSync(`node "${path.join(src, 'build.cjs')}"`, {
      stdio: 'inherit',
      cwd: here,
      env: { ...process.env, LIVE_API: site, SRC_DIR: src, OUT_DIR: out }
    });

    /* Copy generated output over the live folder. */
    for (const entry of fs.readdirSync(out)) {
      const from = path.join(out, entry);
      const to = path.join(here, entry);
      fs.rmSync(to, { recursive: true, force: true });
      fs.cpSync(from, to, { recursive: true });
    }
    fs.rmSync(src, { recursive: true, force: true });
    fs.rmSync(out, { recursive: true, force: true });

  } else {
    /* Running from the source folder locally. */
    execSync('node build.js', {
      stdio: 'inherit',
      cwd: here,
      env: { ...process.env, LIVE_API: site }
    });
  }
  console.log('--- build complete ---');

} catch (err) {
  console.error('Build failed:', err.message);
  process.exit(1);
}
