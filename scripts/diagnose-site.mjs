#!/usr/bin/env node
/**
 * Full site diagnostic — local build vs production.
 * Usage: node scripts/diagnose-site.mjs [url]
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

const PROD_URL = process.argv[2] ?? 'https://nikxart.xyz/';
const OUT_DIR = resolve(process.cwd(), 'out');

const CHECKS = [
  { id: 'connect-sdk', label: 'Manifold Connect SDK', pattern: /connect\.manifoldxyz\.dev\/(6\.1\.0)/ },
  { id: 'claims-sdk', label: 'Manifold Claims SDK (buy-only)', pattern: /claims\.manifoldxyz\.dev\/(1\.16\.1)/ },
  { id: 'manifold-client', label: 'Manifold client ID', pattern: /e6f73b910ba04cb82818dd3b66829f6af38da06eb07b80aacc0490251178fda2/ },
  { id: 'wc-id', label: 'WalletConnect project ID', pattern: /001f1fbca842d394c7baa1638a2600c6/ },

  { id: 'wc-relay', label: 'WalletConnect relay preconnect', pattern: /relay\.walletconnect\.org/ },
  { id: 'delay-auth', label: 'delay-auth on m-connect', pattern: /delay-auth/ },
  { id: 'm-connect', label: 'm-connect widget', pattern: /m-connect|data-widget/ },
  { id: 'm-claim', label: 'm-claim-buy-only widget', pattern: /m-claim-buy-only/ },
  { id: 'mint-count', label: 'm-claim-mint-count widget', pattern: /m-claim-mint-count/ },

  { id: 'rose-connect', label: 'Rose-gold nav connect CSS', pattern: /manifold-connect-host--visible[\s\S]{0,400}var\(--cta-border\)/ },
  { id: 'nav-chip', label: 'Connected wallet chip CSS', pattern: /nav-connect-chip/ },
  { id: 'collect-cta', label: 'Mint button CTA CSS', pattern: /\.mint-btn-wrap[\s\S]{0,400}var\(--cta-border\)/ },
  { id: 'wc-modal-z', label: 'WalletConnect modal z-index', pattern: /z-index:10050/ },
  { id: 'mobile-nav', label: 'Mobile connect button sizing', pattern: /padding:7px 12px!important/ },
  { id: 'mint-overflow', label: 'Mint card overflow visible', pattern: /\.mint-card[^}]*overflow:visible/ },

  { id: 'frag-02-instance', label: 'Fragment 02 Manifold instance', pattern: /4058790128/ },
  { id: 'frag-02-share', label: 'Fragment 02 share asset', pattern: /Fragment-02-1080p\.mp4/ },
  { id: 'banner-evolved', label: 'Evolved banner assets (v2/v3)', pattern: /Banner-Main-Dark-2\.jpg[\s\S]{0,200}Banner-Main-Dark-3\.jpg/ },
  { id: 'phase-evolution', label: 'Phase evolution helpers', pattern: /isPhaseOneEnded|getSiteBanner/ },
  { id: 'f2-teaser', label: 'Fragment 02 coming-soon section', pattern: /piece-coming-soon/ },
];

function walk(dir, acc = []) {
  if (!existsSync(dir)) return acc;
  for (const name of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, name.name);
    if (name.isDirectory()) walk(p, acc);
    else if (/\.(html|js|css)$/.test(name.name)) acc.push(p);
  }
  return acc;
}

async function fetchText(url) {
  const res = await fetch(url, { redirect: 'follow' });
  if (!res.ok) throw new Error(`${url} → HTTP ${res.status}`);
  return res.text();
}

async function collectFromUrl(baseUrl) {
  const html = await fetchText(baseUrl);
  const assets = new Set([html]);
  const re = /(?:href|src)="(\/_next\/static\/[^"]+\.(?:js|css))"/g;
  let m;
  while ((m = re.exec(html))) {
    try {
      assets.add(await fetchText(new URL(m[1], baseUrl).href));
    } catch {
      /* skip missing chunk */
    }
  }
  return [...assets].join('\n');
}

function collectFromOut() {
  if (!existsSync(OUT_DIR)) return '';
  return walk(OUT_DIR)
    .map((p) => readFileSync(p, 'utf8'))
    .join('\n');
}

function runChecks(label, corpus) {
  const rows = CHECKS.map(({ id, label: name, pattern, negative }) => {
    const ok = pattern.test(corpus) && !(negative && negative.test(corpus));
    return { id, name, ok };
  });
  const pass = rows.filter((r) => r.ok).length;
  console.log(`\n## ${label}`);
  console.log(`Score: ${pass}/${rows.length}`);
  for (const r of rows) {
    console.log(`  ${r.ok ? '✓' : '✗'} ${r.name}`);
  }
  return { pass, total: rows.length, rows };
}

async function main() {
  console.log('Nikxart site diagnostic');
  console.log(`Production URL: ${PROD_URL}`);
  console.log(`Local out/: ${existsSync(OUT_DIR) ? 'present' : 'missing — run npm run build'}`);

  let prod = { pass: 0, total: CHECKS.length, rows: [] };
  let local = { pass: 0, total: CHECKS.length, rows: [] };

  try {
    const prodCorpus = await collectFromUrl(PROD_URL);
    prod = runChecks('Production (live)', prodCorpus);
    const ver = prodCorpus.match(/connect\.manifoldxyz\.dev\/([0-9.]+)/)?.[1] ?? '?';
    const claims = prodCorpus.match(/claims\.manifoldxyz\.dev\/([0-9.]+)/)?.[1] ?? '?';
    console.log(`  SDK versions on prod: Connect ${ver}, Claims ${claims}`);
  } catch (e) {
    console.error('\n## Production fetch failed:', e.message);
  }

  local = runChecks('Local build (out/)', collectFromOut());

  const gaps = CHECKS.filter((c) => {
    const l = local.rows.find((r) => r.id === c.id)?.ok;
    const p = prod.rows.find((r) => r.id === c.id)?.ok;
    return l && !p;
  });

  console.log('\n## Deploy gap (fixed locally, missing on prod)');
  if (!gaps.length) {
    console.log('  None — production matches local build markers.');
  } else {
    for (const g of gaps) console.log(`  • ${g.label}`);
    console.log('\n  → Cloudflare rebuild likely failed or env vars missing.');
    console.log('    Set NEXT_PUBLIC_MANIFOLD_CLIENT_ID and NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID');
    console.log('    in Cloudflare Pages, then Retry deployment.');
  }

  process.exit(prod.pass === prod.total ? 0 : 1);
}

main();