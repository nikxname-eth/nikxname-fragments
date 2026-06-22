# Nikxname Puzzle Art — Site Reliability & Operations Protocols

**Goal**: The gate ("Enter the experience") and the entire site must **never strand a visitor**. The artistic slow-burn concept only works if the first interaction is instant and bulletproof.

## Core Principles
- **Progressive gate**: The beautiful pulsing intro + mark must be tappable within <1s of first paint — even on slow 3G, even if the main React bundle is delayed or partially blocked.
- **Multiple escape hatches**: URL param, keyboard, background tap, global `window.NIKX_FORCE_ENTER()`, error recovery UI, sessionStorage.
- **Hybrid vanilla + React**: Vanilla script owns "get the user past the gate instantly". React owns the gorgeous animations and state when it catches up.
- **Fail open**: Any error after the gate must surface the work, not a broken overlay.
- **Static is sacred**: Everything is a static export. No server to fall back on. All resilience must be in the HTML + tiny inline script + client bundles.

## Pre-Deploy Checklist (run every time before pushing to Cloudflare Pages / hosting)

1. `npm run build`
2. `npm run validate` (or `node scripts/diagnose-site.mjs`)
   - All checks must pass locally.
   - Pay special attention to "Gate safety vanilla script", "Enter button present", "Generous tap target".
3. Manually open `out/index.html` in a browser (or `npx serve out`).
   - **Critical test**: The pulsing rings + "Enter" mark must appear.
   - Click / tap the mark **immediately** (before the page fully "loads" in dev tools sense). It must remove the overlay instantly.
   - Press Enter key while the intro is visible — must work.
   - Add `?enter` to the URL — must auto-enter.
   - Open DevTools → Network → Throttle to "Slow 3G". Reload. The gate must still be interactive quickly.
4. Check the built `out/index.html` source:
   - Look for the `<script id="gate-safety">` near the end.
   - The `.pz-btn` should be present with `data-enter-gate`.
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

- **Gate is frozen / can't click Enter**:
  1. Try adding `?enter` to the URL and reload.
  2. Open DevTools console and run `NIKS_FORCE_ENTER()` (or `window.NIKX_FORCE_ENTER()`).
  3. Hard refresh (Cmd/Ctrl + Shift + R).
  4. If still stuck: the safety script didn't ship. Roll back to the previous Cloudflare deployment (Pages keeps previous deploys).

- **White screen or React error after entering**:
  - The `<ErrorBoundary>` should show a minimal "Enter anyway" recovery button that forces sessionStorage + reloads. Use it.
  - As last resort: `sessionStorage.setItem('nikxart-entered','1'); location.reload();`

- **Assets not updating** (old banner / video):
  - You forgot to bump `SITE_ASSET_VERSION`.
  - Cloudflare edge cache: Purge the specific asset URLs, or bump the version again.

## Performance & "Never Heavy" Guidelines

- The gate itself must feel instant. The giant artistic SVG for the Enter mark is the main payload for first paint — keep it as small as practical.
- Expensive side effects (gas polling, heavy web3 observers) are now guarded behind `entered`.
- Manifold scripts are loaded `afterInteractive` — they should not block the gate.
- Target (aspirational):
  - Interactive gate < 800–1200 ms on mid-tier mobile on 4G.
  - Lighthouse Performance ≥ 85 on the landing experience (gate + first content).
- Run `npx next build` and look at the chunk sizes occasionally. The main culprits will be framer-motion + the web3 libs.

## Hosting Hardening (Cloudflare Pages recommended)

- Use the existing `public/_headers` (already copied to `out/`).
- Recommended additional CF settings:
  - Cache everything for the static assets (`/_next/static/*` = 1 year immutable).
  - "Always Online" / Edge Cache TTL high for the HTML (but short for `/index.html` because of the versioned banner preloads).
  - Polish + Mirage for images.
  - If you ever need a tiny amount of dynamic logic (e.g. A/B a new gate), a Cloudflare Worker in front is fine — keep the origin static.
- Keep at least one previous deployment around for instant rollback.

## Scripts & Tooling

- `npm run build` — standard (runs prebuild env check).
- `npm run validate` — **the command you should run before every deploy**. Runs build + diagnose + perf budget.
- `node scripts/diagnose-site.mjs [optional-prod-url]` — compares local `out/` vs live + gate safety assertions.
- `npm run perf-budget` — checks that index.html and chunks stay within reasonable limits.
- `npm run smoke` — runs the Playwright gate smoke test (real click simulation). First time: `npx playwright install`.

  The `tests/gate.spec.ts` is specifically designed to catch the exact failure mode you reported ("can't even click into the page"). It tests the vanilla safety net, keyboard, `?enter` bypass, and even simulates slow/chunk-blocked loading.

## Philosophy Reminder

The art *is* the act of showing up and waiting for the next window.

If the website itself makes people wait or fails at the first click, it betrays the piece.

These protocols exist so the technology gets out of the way and the experience stays sacred.

---

Maintained by the artist + team. Update this file when you add new safety nets or change the deployment process.

(Last major hardening: June 2026 — hybrid vanilla gate + ErrorBoundary + guarded effects.)