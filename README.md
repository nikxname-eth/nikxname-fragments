# Nikxname Puzzle Art — Together It Blooms

**A Familiar Burn** — an on-chain art discovery experience.

27 fragments of a living puzzle released one at a time over timed windows. Collectors mint directly on the site. The hero banner evolves personally for holders (the grid reveals the pieces you own). Presence is rewarded.

Site: https://nikxart.xyz  
Artist: [Nikxname](https://x.com/Nikxname)  
Primary marketplace: [Manifold @nikxnames-art](https://manifold.xyz/@nikxnames-art)

## Stack

- Next.js 16 (static export for Cloudflare Pages / any static host)
- TypeScript + Framer Motion
- Manifold Claims (m-claim-buy-only widgets) with custom "delay auth" UX + post-mint optimistic updates
- Custom on-chain metadata + multicall ownership scanning for evolving UI
- Elegant dark / light theme, dramatic intro gate (remembered in session), countdowns, lightbox players

Assets are versioned on https://assets.nikxart.xyz (Cloudflare) and referenced with cache-busting via `SITE_ASSET_VERSION`.

## Development

```bash
cd nikxart-puzzle
npm install
npm run dev
```

Open http://localhost:3000. The intro "Enter" gate uses sessionStorage so refreshes stay inside after first pass.

**Required env (baked at build time for static export):**

```bash
NEXT_PUBLIC_MANIFOLD_CLIENT_ID=...
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=32-char-hex
```

See `.env.example` and `scripts/check-build-env.mjs`. The prebuild step blocks builds without valid values (critical for mobile wallet support).

## Build & Deploy

```bash
npm run build
# Output: ./out/ (static site)
```

- `out/` is ready for Cloudflare Pages, Netlify, Vercel, or any static host.
- `_headers` (public/_headers) sets appropriate cache headers for the static export.
- Update `src/config/artist.ts`:
  - `SITE_ASSET_VERSION` when banners / media change
  - `CLAIM_INSTANCES`, `FRAGMENT_SITE_MEDIA`, `FRAGMENT_SHARE_URLS` as new fragments drop
  - `DROP_SCHEDULE` is generated from launch date + rules (no manual editing needed for the 27-piece cadence)

The site is currently configured for the live schedule (F1 closed, F2 live as of 2026-06-12).

## Project Structure

- `src/config/artist.ts` — single source of truth for schedule, claims, media, banners, copy
- `src/components/` — mint UI, media players, galleries, Manifold widgets
- `src/hooks/` — wallet, owned fragments, countdown, mint watchers, etc.
- `src/lib/` — manifold session/auth bridge, contract scanning, site enter persistence

## Asset Pipeline (for artist / team)

Master files live in Desktop/PUZZLE WEBSITE + PUZZLE-PIECES (high-res banners, 4K masters, etc.).

Optimized + versioned delivery assets are pushed to the assets.nikxart.xyz origin (R2 / CDN).

After uploading new media:
1. Bump `SITE_ASSET_VERSION` in `artist.ts`
2. Add entries to `FRAGMENT_SITE_MEDIA` / `FRAGMENT_SHARE_URLS` / `CLAIM_INSTANCES` / `EVOLVED_BANNERS` as appropriate
3. Rebuild + deploy

## Philosophy

The journey — showing up for each window, discovering the next piece — is the art. The site is intentionally minimal, slow, and immersive to match the "slow burn" concept.

## License / Credits

© 2026 Nikxname. All rights reserved. Custom frontend built for the Together It Blooms collection.
