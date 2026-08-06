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

```bash
# First time: create the Pages project (once)
npx wrangler pages project create nikxart-explore --production-branch=main

# Deploy
npm run deploy:explore
```

### Attach custom domain `explore.nikxart.xyz`

1. Cloudflare Dashboard → **Workers & Pages** → **nikxart-explore**
2. **Custom domains** → **Set up a custom domain** → `explore.nikxart.xyz`
3. Or DNS: CNAME `explore` → `nikxart-explore.pages.dev` (proxied)

Production drop site (`nikxart-puzzle` → `nikxart.xyz`) is unchanged.

## Catalog sources

- **Together It Blooms** — generated from live site `artist.ts` (claims + CDN media)
- **The Void** — on-chain ERC-721 `0xa4f73c…4730` (synced to `data/collections/the-void.json`)
- **Life Impressions / 1/1s / etc.** — Manifold series portals until their contracts are registered  
  https://manifold.xyz/@nikxnames-art
- **Portfolio & Secondary** — Raster  
  https://www.raster.art/artist/nikxname

### Add another on-chain collection

1. Add a row in `explore/config/collections.ts` **and** `scripts/sync-explore-collections.mjs`
2. Run `npm run sync:explore`
3. Import the new JSON in `explore/lib/chainWorks.ts`
4. Add the seriesId to `CHAIN_BACKED_SERIES` in `catalog.ts` (removes the placeholder portal)
5. Rebuild / redeploy explore

Fragment works update automatically when you evolve the main site config.

## Design

Matches nikxart visual language: Cormorant Garamond, cream/dark, Theatre-style stage, light/dark toggle.
