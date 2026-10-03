---
name: maison
description: >
  Extend the Explore Maison site builder — a KV-backed block CMS so rooms can be
  composed in Atelier without a coding session. Use when adding a Maison block
  kind, editing the room renderer, the Atelier Maison desk, /room pages, or when
  the user says site builder, Maison, compose a room, or /maison.
---

# Maison

Maison is the house’s self-contained site builder on Explore. Artists compose private rooms in Atelier → Maison. Guests open `/room/{slug}?k={guestKey}`. Rooms stay `noindex` and off public nav.

## Source of truth

Block kinds live in `explore/lib/maison/registry.ts` (`MAISON_REGISTRY`). Do not duplicate the kind list in the skill, the desk, or the renderer.

- Types: `explore/lib/maison/types.ts`
- Sanitize on write: `explore/lib/maison/schema.ts`
- API: `explore/functions/api/maison/pages.ts` (KV `maison:page:{slug}`, `maison:index:v1` on `GARDEN_EGG`)
- Desk: `explore/components/MaisonDesk.tsx`
- Renderer: `explore/components/MaisonStage.tsx` (desk preview and `/room`)
- Route: `explore/pages/room.tsx` + rewrite `/room/* /room 200` in `explore/public/_redirects`

Work IDs resolve through `exploreCatalogue()` in `explore/lib/gardenWorks.ts`.

## Add a block kind

1. Append one `MaisonKindDef` to `MAISON_REGISTRY` (kind, label, blurb, fields, defaults). Add the kind string to `MAISON_BLOCK_KINDS` in `types.ts`.
2. Teach `cleanBlock` only if the field needs a new `MaisonField.kind` (new input type). Existing `text` / `textarea` / `work` / `works` / `wallet` cover most cases.
3. Add one branch in `MaisonStage` `BlockView`. Keep chrome quiet — serif, rose-gold, wall cream. Hang rows are stills, not Arrange Wall.
4. If the desk needs a new field control, extend `Field` in `MaisonDesk.tsx`. Palette, reorder, and save already read the registry.
5. Deploy Explore only (`npm run deploy:explore`, unset `CF_API_TOKEN`).

Do not add Agents SDK, a third-party CMS, or public nav links. Guest reads require `?k=`. Writes are `verifyArtistSig` only.

## Looking Room

TV looking is a separate surface (`/looking`, `/looking/0x{wallet}`), not a Maison block renderer. The `looking` block only links into that room. Pairing, QR, and 10-foot UI live under `explore/pages/looking.tsx` and `explore/functions/api/looking/pair.ts`.
