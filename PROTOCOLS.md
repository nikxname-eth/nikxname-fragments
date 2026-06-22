# Nikxname Puzzle Art — Site Reliability & Operations Protocols

**Goal**: The site must load directly and **never strand a visitor**. First paint should show the work immediately.

## Core Principles
- **Direct load**: No intro gate — hero, banner, and countdown render on first visit.
- **Fail open**: Any React error must surface a minimal reload recovery UI, not a blank screen.
- **Static is sacred**: Everything is a static export. No server to fall back on. All resilience must be in the HTML + client bundles.

## Pre-Deploy Checklist (run every time before pushing to Cloudflare Pages / hosting)

1. `npm run build`
2. `npm run validate` (or `node scripts/diagnose-site.mjs`)
   - All checks must pass locally.
   - Pay special attention to "No intro gate in build", "Main site shell present".
3. Manually open `out/index.html` in a browser (or `npx serve out`).
   - **Critical test**: Hero title "Together It Blooms" and nav must appear immediately.
   - No intro overlay or "Enter" button.
   - Banner and countdown sections visible after hydration.
4. Check the built `out/index.html` source:
   - No `gate-safety` script or `data-enter-gate` attributes.
   - `.site` shell and `.hero-title` present.
5. Spot-check the first fragment media + mint card (if a window is open).
6. Run `npm run build` again after any change to artist.ts (banners, new fragments, schedule).
7. If you touched any Manifold instance IDs, asset URLs, or the schedule, update the corresponding test patterns in `scripts/diagnose-site.mjs`.

## Adding a New Fragment (safe order)

1. Export the final 1080p (or square) master + poster to the asset origin (assets.nikxart.xyz).
2. In `src/config/artist.ts`:
   - Add the new piece number to `FRAGMENT_SITE_MEDIA`, `FRAGMENT_SHARE_URLS`, `CLAIM_INSTANCES`, `FRAGMENT_CLAIM_URI_MARKERS` (if applicable), `PIECE_NAMES`, `EVOLVED_BANNERS` (if this piece should evolve the personal banner).
   - The `DROP_SCHEDULE` is generated automatically from the launch date — you normally do **not** edit it.
3. Bump `SITE_ASSET_VERSION` (date + letter, e.g. `20260613a`).
4. Run the full pre-deploy checklist above.
5. Deploy.
6. After deploy, run the diagnose script against the live URL: `node scripts/diagnose-site.mjs https://nikxart.xyz/`

## When Something Feels Broken (on-call / artist recovery)

- **White screen or React error**:
  - The `<ErrorBoundary>` should show a minimal "Reload" recovery button. Use it.
  - Hard refresh (Cmd/Ctrl + Shift + R).
  - Roll back to the previous Cloudflare deployment if a bad build shipped.

- **Assets not updating** (old banner / video):
  - You forgot to bump `SITE_ASSET_VERSION`.
  - Cloudflare edge cache: Purge the specific asset URLs, or bump the version again.

## Performance & "Never Heavy" Guidelines

- First paint should show hero + nav quickly; defer heavy web3 work until after interactive.
- Manifold scripts are loaded `afterInteractive` — they should not block initial render.
- Target (aspirational):
  - LCP < 2.5s on mid-tier mobile on 4G.
  - Lighthouse Performance ≥ 85 on the landing experience.
- Run `npx next build` and look at the chunk sizes occasionally. The main culprits will be framer-motion + the web3 libs.

## Hosting Hardening (Cloudflare Pages recommended)

- Use the existing `public/_headers` (already copied to `out/`).
- Recommended additional CF settings:
  - Cache everything for the static assets (`/_next/static/*` = 1 year immutable).
  - "Always Online" / Edge Cache TTL high for the HTML (but short for `/index.html` because of the versioned banner preloads).
  - Polish + Mirage for images.
  - If you ever need a tiny amount of dynamic logic, a Cloudflare Worker in front is fine — keep the origin static.
- Keep at least one previous deployment around for instant rollback.

## Scripts & Tooling

- `npm run build` — standard (runs prebuild env check).
- `npm run validate` — **the command you should run before every deploy**. Runs build + diagnose + perf budget.
- `node scripts/diagnose-site.mjs [optional-prod-url]` — compares local `out/` vs live + core site assertions.
- `npm run perf-budget` — checks that index.html and chunks stay within reasonable limits.
- `npm run smoke` — runs the Playwright direct-load smoke test. First time: `npx playwright install`.

## Philosophy Reminder

The art *is* the act of showing up and waiting for the next window.

If the website itself fails to load or strands visitors, it betrays the piece.

These protocols exist so the technology gets out of the way and the experience stays sacred.

---

Maintained by the artist + team. Update this file when you add new safety nets or change the deployment process.

(Last major change: June 2026 — removed intro gate, direct-load site + ErrorBoundary.)