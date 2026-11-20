---
name: gridlock-svg-art
description: Add or change Gridlock art (sprites, tiles, icons, HUD and menu styling) in the project's house style. Covers where SVGs live, how they are registered and loaded, how to regenerate the tileset, and the shared palette and shape rules. Use for any visual change, including colors in the HUD, menu and Phaser-drawn effects.
---

# Gridlock art

All art is SVG (AGENTS.md). Never add or generate PNG, JPG, GIF or WebP.

## House style: "dusk asphalt"

Flat, top-down vector art on a dark city at dusk. Everything reads at a glance from above:
big simple shapes, no outlines, and a single warm accent that marks what the player should look
at. The game world, the HUD and the menu all use the same palette and the same flatness.

### Shape rules

- Top-down, facing **right** (+x) for anything that has a front: cars, the player, guns.
- Flat fills. No gradients, blurs, filters, strokes on world sprites, or text in sprites.
- Depth comes from stacking **at most three tones** per object: a base, a shade
  (`#000` at 12 to 30% opacity) and a highlight (`#fff` at 14 to 30% opacity). Use
  `fill-opacity` overlays rather than new hex values, so tinting still works.
- Rounded corners on man-made objects (`rx` about 25% of the short side for cars, 3 for
  crates). Straight edges for buildings and tiles.
- Light comes from the top. Shadows are one flat `#000` at 35%.
- Keep detail proportional to size: a 6 px foot is one rectangle.
- Pickups and anything interactive get the accent yellow. Nothing else decorative does.

### Palette

Use these exact values. Add a new color only when no row fits, and add it here too.

| Role | Hex | Used for |
| --- | --- | --- |
| Void | `#0d0f12` | page and canvas background |
| Panel | `#161a20` | menu panel |
| Raised | `#262c35` | key caps, wells |
| Button | `#2a3039` (hover `#38414d`) | buttons |
| Border | `#343b46`, strong `#4a5360` | panel and button borders |
| Text | `#eeeeee`, muted `#8a94a3` | UI text, section labels |
| Ink | `#1b2430` | glass, car trim, dark details |
| Tyre | `#101114` | wheels |
| Wreck | `#1c1c1c` (dark parts `#0c0c0c`, glass `#2c2622`) | burnt-out cars |
| Asphalt | `#3a3d42` | road |
| Lane paint | `#d8c25a` | road markings |
| Sidewalk | `#9a968c`, edge `#8e8a81` | sidewalk |
| Grass | `#4f7a3a` | grass |
| Roofs | `#8a8f98 #9b8b7a #7d8a7a #a3a09a #8c7f8f #b09a80 #7f8c9c` | muted building roofs, defined in `tools/tiles.mjs` |
| **Accent** | **`#ffd23f`** | pickups, wanted stars, focus, anything to notice |
| Headlight | `#ffe9a8` | lights, muzzle flash `#fff1a8` |
| Danger | `#b3201b` | tail lights, damage |
| Fire | `#ff7a1a`, `#ffc23a` | flames, explosions |
| Smoke | `#2e2e2e` to `#9a9a9a` at 40 to 60% alpha | smoke and dust |

Cars are tinted in code from a white body, so draw `*-body.svg` in pure `#fff`.
Saturated colors belong to cars and the accent. Buildings, ground and UI stay muted.

### HUD and menu (DOM, in `index.html`)

- Same palette, same flatness: dark translucent panels, 1 px borders, `border-radius` 6 to 10 px,
  no gradients. `system-ui` for text, `ui-monospace` for key caps.
- Text is white or `#eee` with a `0 1px 3px #000` shadow when it sits over the game.
  Section labels are 12 px uppercase, letter-spaced, `#8a94a3`.
- The wanted stars and other "pay attention" readouts use the accent `#ffd23f`.
  Danger readouts (low health) use `#b3201b`.
- Icons are inline SVG, 16 px or 24 px, one flat color from the palette.
- Take colors from the table above, not from memory of a neighbouring file. Known drift to fix
  when touching the file: `pickup.svg` and `Effects.ts` use `#ffd34d` / `0xffd34d`, one digit off
  the accent.

## Where things live

| Kind | Where |
| --- | --- |
| Sprite SVGs | `public/art/<key>.svg` |
| Registration | `src/render/art.ts`: `FIXED_SPRITES` (key to `[width, height]` in **world pixels**), or generated for car models from `src/sim/models.ts` |
| Loading | `load.svg(key, ..., { width: w * 4, height: h * 4 })`; the 4x raster keeps it sharp when zoomed |
| Use in a scene | `addSprite(scene, key, x, y)` / `setSprite(img, key)`; both set the world-size display scale |
| Tileset | `public/tiles/city.svg`, generated: edit `tools/tiles.mjs` and `tools/gen-tileset.mjs`, then `nix develop -c npm run gen:tileset` |
| Map | `public/maps/city.tmj`, hand-placed in Tiled; keep tile properties in step with `tools/tiles.mjs` |
| Per-frame shapes | Phaser Graphics in code (`src/render/Effects.ts`, `BuildingLayer.ts`): building lean, tracers, particles. Not assets, but use the palette above |

## Adding a sprite

1. Draw `public/art/<key>.svg` with `width`, `height` and a `viewBox` equal to its world size
   (so 1 unit is 1 world pixel). Origin at the top-left, except centered sprites such as
   `pickup.svg` which use a centered viewBox. Match the key's naming: `car-<model>-body`,
   `-trim`, `-wrecked`; `gun-<name>`; `player-<part>`.
2. Register it in `src/render/art.ts` with the same size. The size in the table and the SVG
   must agree, or the sprite renders squashed.
3. Use it through `addSprite` / `setSprite`. Do not `load.image` an SVG or reference
   `public/art` paths from other code.
4. A new car model needs `body` (white), `trim` and `wrecked` at `halfLength*2` by
   `halfWidth*2` from `src/sim/models.ts`, and wheel positions come from the model's `axles`, not from the art.
5. Check it in the running game at default zoom and zoomed in, with `gridlock-verify`.

Look at a sibling file of the same kind and match its structure before drawing a new one.
