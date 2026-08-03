#!/usr/bin/env node
/**
 * Full site diagnostic — local build vs production.
 * Asserts core site markers (Manifold, mint UI, banners, direct-load layout).
 *
 * Usage:
 *   node scripts/diagnose-site.mjs                 # checks local ./out against embedded prod URL
 *   node scripts/diagnose-site.mjs https://nikxart.xyz/
 *
 * Recommended before every deploy:  npm run validate
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
  { id: 'delay-auth', label: 'Delay auth until collect (delay-auth)', pattern: /data-delay-auth="true"/ },
  { id: 'fallback-provider', label: 'Mobile ETH fallback provider', pattern: /data-fallback-provider|ethereum-rpc\.publicnode/ },
  { id: 'm-connect', label: 'm-connect widget', pattern: /m-connect|data-widget/ },
  { id: 'm-claim', label: 'm-claim-buy-only widget', pattern: /m-claim-buy-only/ },
  { id: 'mint-count', label: 'm-claim-mint-count widget', pattern: /m-claim-mint-count/ },

  { id: 'rose-connect', label: 'Rose-gold nav connect CSS', pattern: /manifold-connect-host--visible[\s\S]{0,400}var\(--cta-border\)/ },
  { id: 'nav-chip', label: 'Connected wallet button CSS', pattern: /nav-connect-btn--linked/ },
  { id: 'collect-cta', label: 'Mint button CTA CSS', pattern: /\.mint-btn-wrap[\s\S]{0,400}var\(--cta-border\)/ },
  { id: 'wc-modal-z', label: 'WalletConnect modal z-index', pattern: /z-index:10050/ },
  { id: 'mobile-nav', label: 'Mobile connect button sizing (44px tap)', pattern: /min-height:44px!important/ },
  { id: 'mint-overflow', label: 'Mint card overflow visible', pattern: /\.mint-card[^}]*overflow:visible/ },

  { id: 'frag-24-instance', label: 'Fragment 24 Manifold instance', pattern: /4037478640/ },
  { id: 'frag-24-share', label: 'Fragment 24 share asset', pattern: /Fragment-24_1080P\.mp4/ },
  { id: 'frag-23-share', label: 'Fragment 23 share asset', pattern: /Fragment-23_1080P\.mp4/ },
  { id: 'frag-22-share', label: 'Fragment 22 share asset', pattern: /Fragment-22_1080P\.mp4/ },
  { id: 'frag-21-share', label: 'Fragment 21 share asset', pattern: /Fragment-21_1080P\.mp4/ },
  { id: 'frag-20-share', label: 'Fragment 20 share asset', pattern: /Fragment-20_1080P\.mp4/ },
  { id: 'frag-19-share', label: 'Fragment 19 share asset', pattern: /Fragment-19_1080P\.mp4/ },
  { id: 'frag-18-share', label: 'Fragment 18 share asset', pattern: /Fragment-18_1080P\.mp4/ },
  { id: 'frag-17-share', label: 'Fragment 17 share asset', pattern: /Fragment-17_1080P\.mp4/ },
  { id: 'frag-16-share', label: 'Fragment 16 share asset', pattern: /Fragment-16_1080P\.mp4/ },
  { id: 'frag-15-share', label: 'Fragment 15 share asset', pattern: /Fragment-15_1080P\.mp4/ },
  { id: 'frag-14-share', label: 'Fragment 14 share asset', pattern: /Fragment-14_1080P\.mp4/ },
  { id: 'frag-13-share', label: 'Fragment 13 share asset', pattern: /Fragment-13_1080P\.mp4/ },
  { id: 'frag-12-share', label: 'Fragment 12 share asset', pattern: /Fragment-12_1080P\.mp4/ },
  { id: 'frag-11-share', label: 'Fragment 11 share asset', pattern: /Fragment-11_1080P\.mp4/ },
  { id: 'frag-10-share', label: 'Fragment 10 share asset', pattern: /Fragment-10_1080P\.mp4/ },
  { id: 'frag-09-share', label: 'Fragment 09 share asset', pattern: /Fragment-09_1080P\.mp4/ },
  { id: 'frag-08-share', label: 'Fragment 08 share asset', pattern: /Fragment-08_1080P\.mp4/ },
  { id: 'frag-07-share', label: 'Fragment 07 share asset', pattern: /Fragment-07_1080P\.mp4/ },
  { id: 'frag-06-share', label: 'Fragment 06 share asset', pattern: /Fragment-06_1080p\.mp4/ },
  { id: 'released-covers', label: 'Released fragment covers (F1–5)', pattern: /stageii\/releasedfragment0[1-5]\.jpg/ },
  { id: 'released-cover-06', label: 'Released fragment 06 cover', pattern: /releasedfragment06\.jpg/ },
  { id: 'released-cover-07', label: 'Released fragment 07 cover', pattern: /releasedfragment07\.jpg/ },
  { id: 'released-cover-08', label: 'Released fragment 08 cover', pattern: /releasedfragment08\.jpg/ },
  { id: 'released-cover-09', label: 'Released fragment 09 cover', pattern: /releasedfragment09\.jpg/ },
  { id: 'released-cover-10', label: 'Released fragment 10 cover', pattern: /releasedfragment10\.jpg/ },
  { id: 'released-cover-11', label: 'Released fragment 11 cover', pattern: /releasedfragment11\.jpg/ },
  { id: 'released-cover-12', label: 'Released fragment 12 cover', pattern: /releasedfragment12\.jpg/ },
  { id: 'released-cover-13', label: 'Released fragment 13 cover', pattern: /releasedfragment13\.jpg/ },
  { id: 'released-cover-14', label: 'Released fragment 14 cover', pattern: /releasedfragment14\.jpg/ },
  { id: 'released-cover-15', label: 'Released fragment 15 cover', pattern: /releasedfragment15\.jpg/ },
  { id: 'released-cover-16', label: 'Released fragment 16 cover', pattern: /releasedfragment16\.jpg/ },
  { id: 'released-cover-17', label: 'Released fragment 17 cover', pattern: /releasedfragment17\.jpg/ },
  { id: 'released-cover-18', label: 'Released fragment 18 cover', pattern: /releasedfragment18\.jpg/ },
  { id: 'released-cover-19', label: 'Released fragment 19 cover', pattern: /releasedfragment19\.jpg/ },
  { id: 'released-cover-20', label: 'Released fragment 20 cover', pattern: /releasedfragment20\.jpg/ },
  { id: 'released-cover-21', label: 'Released fragment 21 cover', pattern: /releasedfragment21\.jpg/ },
  { id: 'released-cover-22', label: 'Released fragment 22 cover', pattern: /releasedfragment22\.jpg/ },
  { id: 'released-cover-23', label: 'Released fragment 23 cover', pattern: /releasedfragment23\.jpg/ },
  { id: 'banner-gif', label: 'Stage II banner GIFs', pattern: /BannerGridDark-24-web\.gif[\s\S]{0,200}BannerGridLight-24-web\.gif/ },
  { id: 'site-audio', label: 'Site audio loop', pattern: /TogetherItBloomsAudio\.mp3/ },
  { id: 'asset-version', label: 'Site asset cache version', pattern: /20260803f24a/ },
  { id: 'canvas-state-latest', label: 'Theatre canvas state stills (latest CDN)', pattern: /canvasstatedark-24\.jpg|canvasstatelight-24\.jpg/ },
  { id: 'f2-teaser', label: 'Fragment 02 coming-soon section', pattern: /piece-coming-soon/ },
  { id: 'released-gallery', label: 'Released fragments gallery', pattern: /released-section|Released fragments/ },

  { id: 'no-gate', label: 'No intro gate in build', pattern: /data-enter-gate|gate-safety/, negative: true },
  { id: 'site-shell', label: 'Main site shell present', pattern: /class="site|Together It Blooms/ },
  { id: 'hero-banner', label: 'Hero banner markup', pattern: /banner-inner/ },
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
    const ok =
      negative === true
        ? !pattern.test(corpus)
        : pattern.test(corpus) && !(negative && negative.test(corpus));
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