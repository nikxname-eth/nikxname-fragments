# Explore · Nikxname

Elevated portfolio experience for the full body of work — separate from the live drop site.

| Surface | Domain | Purpose |
|---------|--------|---------|
| Live drop | https://nikxart.xyz | Time-bound fragments + mint |
| **Explore** | https://explore.nikxart.xyz | Full catalog / art experience |

## Local development

From the **repo root** (uses root `node_modules`):

```bash
npm run dev:explore
# → http://localhost:3001
```

## Build

```bash
npm run build:explore
# output: explore/out
```

## Deploy (Cloudflare Pages — does **not** touch nikxart.xyz)

**Project:** `nikxart-explore` · **production branch:** `main`  
**Live:** https://nikxart-explore.pages.dev · https://explore.nikxart.xyz

```bash
# Manual production deploy (from monorepo root)
npm run deploy:explore
```

### GitHub → production (CI)

Explore is a **Direct Upload** Pages project (same monorepo as the drop site; CF cannot attach a second Git `source`). Production deploys run via:

`.github/workflows/deploy-explore.yml` → on push to `main` (paths under `explore/**`)

**Repo secrets required:**

| Secret | Value |
|--------|--------|
| `CLOUDFLARE_API_TOKEN` | Token with **Account · Cloudflare Pages · Edit** |
| `CLOUDFLARE_ACCOUNT_ID` | `808a563ceb13fcffd322db706da169e1` |

Also runnable from Actions → **Deploy Explore** → Run workflow.

### Custom domain `explore.nikxart.xyz`

1. Cloudflare Dashboard → **nikxart.xyz** zone → **DNS**
2. Add record:
   - **Type:** CNAME  
   - **Name:** `explore`  
   - **Target:** `nikxart-explore.pages.dev`  
   - **Proxy:** Proxied (orange cloud)
3. Dashboard → **Workers & Pages** → **nikxart-explore** → **Custom domains**  
   Ensure `explore.nikxart.xyz` is listed (status Active). If pending, click retry after DNS propagates.

Production drop site (`nikxart-puzzle` → `nikxart.xyz`) is unchanged.

## Catalog sources

- **Together It Blooms** — generated from live site `artist.ts` (claims + CDN media)
- **The Void** — on-chain ERC-721 `0xa4f73c…4730` (synced to `data/collections/the-void.json`)
- **Life Impressions / 1/1s / etc.** — Manifold series portals until their contracts are registered  
  https://manifold.xyz/@nikxnames-art
- **Portfolio & Secondary** — Raster  
  https://www.raster.art/artist/nikxname

### Tabs

A Familiar Burn · The Void · Life Impressions · For Her.. · For You.. · 1/1s · Market

- **A Familiar Burn** = Fragments 1–27 only (released + live), one card each — no mint doubles
- Other series = on-chain dumps; numbers omitted except fragment titles
- Multiples show **xN** only
- **Market** = OpenSea / Raster / Manifold hubs + per-collection OpenSea entries (Ethereum + Base)
- Grid **S / M / L** density toggle (localStorage)
- Subtext is light; fragment numbers live in titles only

### Catalogue previews (R2)

```bash
npm run sync:explore:previews          # generate + upload to r2://nikxname-assets/explore/previews/
npm run sync:explore:previews -- --dry-run --limit=10
npm run sync:explore:market            # refresh market gateways (+ listings if OPENSEA_API_KEY)
```

Public URLs: `https://assets.nikxart.xyz/explore/previews/<series>/<workId>.jpg`  
Theatre still loads **full media from origin** (Arweave/IPFS) on open.

### Add another on-chain collection

1. Add a row in `explore/config/collections.ts` **and** `scripts/sync-explore-collections.mjs` (`chain: 'base' | 'ethereum'`)
2. Run `npm run sync:explore [seriesId]`
3. Import JSON in `explore/lib/chainWorks.ts`
4. Add series tab in `catalog.ts` SERIES
5. `npm run sync:explore:previews` then `npm run deploy:explore`


## Design

Matches nikxart visual language: Cormorant Garamond, cream/dark, light/dark toggle.

### Collection Theatre

Opening a work enters an art-first viewer:

- **Catalogue grid** only holds light covers / thumbs
- **Full media** is requested from origin (Arweave / IPFS / CDN) when Theatre opens
- Optional **Info** panel (metadata, contract, storage) — press `I`
- **Prev / Next**, zoom (+ / − / scroll), pan when zoomed, **Catalogue** to exit
- Shortcuts: `←` `→` navigate · `I` info · `Esc` close
