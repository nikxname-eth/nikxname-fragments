# Site State — Development Baseline

**Date:** 2026-06-22  
**Branch:** `nikxart-live-base`  
**Commit:** `d0835e9` — backup current state before reviewing live code  
**Repo:** `/Users/nicholasvanniekerk/nikxart-puzzle`  
**Remote:** `https://github.com/nikxname-eth/nikxname-fragments.git`

## What this is

This is the working baseline for rebuilding and cleaning up **nikxart.xyz** in VS Code. The live production site is the reference; this repo captures that state so changes can be made locally, validated, and deployed.

## Stack

- Next.js 16 (static export → `out/`)
- TypeScript + Framer Motion
- Manifold Connect + Claims (mint on-site)
- viem for on-chain ownership scanning
- Cloudflare Pages deploy via Wrangler

## Open in VS Code

```bash
cd /Users/nicholasvanniekerk/nikxart-puzzle
code .
npm install
npm run dev
```

Open http://localhost:3000

## Required env (`.env.local`)

Copy from `.env.example`:

```
NEXT_PUBLIC_MANIFOLD_CLIENT_ID=...
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=32-char-hex
```

Build will fail without these (`scripts/check-build-env.mjs`).

## Current live schedule (as of baseline)

Configured in `src/config/artist.ts`:

- **Fragments 01–05** — released gallery
- **Fragment 06** — live mint window (instance `4030679280`, closes Wed 11 am Eastern)
- **27-fragment cadence** — Mon→Wed, Wed→Fri, Fri→Mon (11 am Eastern)
- **Asset version:** `20260622f06`

## Key files

| File | Purpose |
|------|---------|
| `src/config/artist.ts` | Schedule, claims, banners, media URLs, copy |
| `src/pages/index.tsx` | Main page (hero, countdown, mint, gallery) |
| `src/components/` | Mint UI, wallet, media players |
| `src/hooks/` | Wallet, ownership, countdown, mint watchers |
| `src/lib/` | Manifold bridge, contract scan, metadata |
| `src/styles/site.css` | All site styling |

## Scripts

| Command | What it does |
|---------|--------------|
| `npm run dev` | Local dev server |
| `npm run build` | Static export to `out/` |
| `npm run validate` | Build + diagnose + perf budget |
| `npm run deploy` | Build + deploy to CF Pages (`nikxart-live-base` branch) |
| `npm run deploy:prod` | Build + deploy to CF Pages (`main` branch) |
| `npm run preview` | Build + local CF Pages preview |

## Architecture (after cleanup)

```
pages/index.tsx     ~180 lines — composes sections only
providers/          WalletProvider (single wallet sync)
hooks/              useDropSchedule, useExclusiveDrawer, useGasPrice, useOwnedFragments
components/         SiteNav, drawers, countdown, mint, wallet modal
config/artist.ts    schedule + assets + claims (getDropState centralizes page logic)
```

## Changes from live baseline (this session)

1. **Removed intro gate** — direct site load
2. **Header** — Light + Sound + Connect Wallet modal (Manifold-backed)
3. **Stage II GIF banners** — dark/light theme only
4. **Architecture cleanup** — deleted dead code, single wallet provider, extracted sections

## Cleanup still to consider

- Review animation delays (originally staggered for post-enter reveal)
- Trim Framer Motion usage if bundle size matters
- Confirm Fragment 02 mint flow after gate removal
- ~~`public/enter-symbol.svg`~~ removed (gate deleted)

## Deploy checklist

1. `npm run validate`
2. `npm run deploy` (preview branch) or `npm run deploy:prod` (production)
3. Spot-check https://nikxart.xyz after prod deploy