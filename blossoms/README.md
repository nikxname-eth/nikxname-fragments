# Blossoms

Sibling Next.js app for [blossoms.nikxart.xyz](https://blossoms.nikxart.xyz).

This folder must **not** touch `nikxart.xyz` or the Together It Blooms mint path.
Same pattern as `explore/`: static export, independent Cloudflare Pages project.

Design: `docs/blossoms-design.md`.

## Season 1 (locked)

- 128 canvases
- Grids 1×1 through 4×4
- Public systems: Hirst, Albers, Mondrian
- Unlockable: Pigment (27/27 Together It Blooms complete-set wallets)
- Ethereum L1

## Develop

From the repo root (shares parent `node_modules`):

```bash
npm run dev:blossoms
```

http://localhost:3002 — landing, theme toggle, empty theatres at `/t/1`…`/t/128` and `/live/1`…`/live/128`.

```bash
npm run build:blossoms
npm run preview:blossoms
```

## Studio (local preview)

Hidden page, not linked from the landing, not for nikxart.xyz:

```bash
# once, after new LRG plates land
node blossoms/scripts/prepare-studio-library.mjs

npm run dev:blossoms
```

Open http://localhost:3002/studio

Click the square to grow a study. Lock Mode / Color / Ground in the bar to tweak. This is a preview, not a mint.
