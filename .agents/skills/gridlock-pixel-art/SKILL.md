---
name: gridlock-pixel-art
description: Add or change Gridlock art (sprites, tiles, icons, HUD and menu styling) in the project's pixel-art house style. Covers where the pixel maps live, the shared palette legend, how sprites are painted and sized, how to regenerate the tileset, and the shape rules. Use for any visual change, including colors in the HUD, menu and Phaser-drawn effects.
---

# Gridlock art

All world art is **pixel art**, authored as **text pixel maps** (AGENTS.md). Never add or generate
PNG, JPG, GIF, WebP or SVG sprite files, and never anti-alias or smooth anything in the world.

## How the pixels work

- One **art pixel** is `ART_PIXEL` = 2 world pixels (`src/render/art.ts`; `tools/tiles.mjs` repeats it).
- Each sprite is painted once at boot into a canvas texture with **1 texel per art pixel**, and is
  displayed at `map size x ART_PIXEL`.
- The game canvas is rendered at 1 canvas pixel per art pixel and scaled up by a whole number of
  device pixels (`src/main.ts`, CSS `image-rendering: pixelated`, Phaser `render.pixelArt`). So every
  art pixel is the same size on screen, and rotated sprites stay on the pixel grid.
- Anything drawn with Phaser Graphics (particles, tracers, building lean) is drawn on that same
  low-res canvas, so it is pixelated automatically. Keep its sizes to whole art pixels where you can
  (2 world px = 1 pixel) and do not set line widths below 2.
- The camera sits at `1 / ART_PIXEL` zoom at rest, which is exactly 1:1. Speed zooms out up to 30%,
  which resamples pixels unevenly for a moment. That is accepted; do not add other zoom levels.

## House style: "dusk asphalt"

Chunky top-down pixel art on a dark city at dusk. Everything reads at a glance from above: big simple
shapes, a single warm accent that marks what the player should look at. The world, HUD and menu share
the palette.

### Shape rules

- Top-down, facing **right** (+x) for anything with a front: cars, the player, guns. Row 0 is the
  top of the sprite, which is the side light comes from.
- **No anti-aliasing and no partial pixels.** A pixel is one palette colour, or transparent. The only
  translucency is the palette's own alpha entries (glows, overlays), never blended edges.
- Cut corners with stepped pixels: a 2-pixel cut on the outer row and a 1-pixel cut on the next row
  gives a rounded corner on a car. Straight edges for buildings and tiles.
- Depth comes from **at most three tones** per object: a base, a shade on the lower rows and a light
  on the upper rows. No outlines.
- Keep detail proportional to size: a foot is 3x2 pixels, a head 4x4.
- Pickups and anything interactive get the accent yellow. Nothing else decorative does.
- Cars and pedestrians are tinted in code from a **white** body: draw `body` maps with only `W`, `S`
  and `D` (white, shade, deep shade). Glass, lights and overlays go in the separate `trim` map, which
  is not tinted.

### Palette

All pixel maps share the one legend in `src/render/pixelart/palette.ts`: a character is a colour,
`.` is transparent. Reuse a character; add a colour only when no entry fits, and add it to this table
too. Eight-digit hex is `rrggbbaa`.

| Role | Hex | Used for |
| --- | --- | --- |
| Void | `#0d0f12` | page and canvas background |
| Panel | `#161a20` | menu panel |
| Raised | `#262c35` | key caps, wells |
| Button | `#2a3039` (hover `#38414d`) | buttons |
| Border | `#343b46`, strong `#4a5360` | panel and button borders |
| Text | `#eeeeee`, muted `#8a94a3` | UI text, section labels |
| Ink | `#1b2430` (`K`) | glass, car trim, dark details |
| Tyre | `#101114` (`B`) | wheels |
| Wreck | `#1c1c1c` `x`, `#0c0c0c` `X`, glass `#2c2622` `g` | burnt-out cars |
| Asphalt | `#3a3d42` (speckles `#34373c`, `#404348`) | road |
| Lane paint | `#d8c25a` | road markings |
| Sidewalk | `#9a968c`, joints `#8e8a81`, speckle `#a39f95` | sidewalk |
| Grass | `#4f7a3a` (`#446c33`, `#5b8a45`) | grass |
| Roofs | `#8a8f98 #9b8b7a #7d8a7a #a3a09a #8c7f8f #b09a80 #7f8c9c` | muted building roofs, in `tools/tiles.mjs` |
| **Accent** | **`#ffd23f`** (`a`, glow `e`) | pickups, wanted stars, focus, anything to notice |
| Headlight | `#ffe9a8` (`Y`) | lights; muzzle flash `#fff1a8` |
| Danger | `#b3201b` (`R`) | tail lights, damage |
| Fire | `#ff7a1a`, `#ffc23a` | flames, explosions |
| Smoke | `#2e2e2e` to `#9a9a9a` at 40 to 60% alpha | smoke and dust |
| Cash | `#6fdc8c` `m`, `#2f7d46` `n` | money |

Saturated colors belong to cars and the accent. Buildings, ground and UI stay muted.

### Screen-space UI: HUD and menu (canvas)

The HUD, pause menu and menu button are pixel art drawn in the canvas by `src/ui/Hud.ts` and
`src/ui/Menu.ts`, sharing `src/ui/PixelText.ts`. The 5x7 bitmap font and the star and coin icons live in
`src/render/pixelart/font.ts`, are painted with the other textures at boot, and are tinted from the
palette. Keep glyph maps white (`W`) so one texture can be tinted to any palette colour; one texel is one
canvas pixel. Both layers cancel the world camera's zoom in `sync()` so the UI stays pinned to the screen
instead of drifting or resampling; keep any new screen-space UI doing the same.

Keep UI flat: dark translucent backdrop, 1 px borders with 2 px stepped corners, no gradients or curves,
and colours from the table above. Section labels and muted text use `#8a94a3`; wanted stars, focus and
other "pay attention" readouts use the accent `#ffd23f`; danger readouts use `#b3201b`.

## Where things live

| Kind | Where |
| --- | --- |
| Pixel maps | `src/render/pixelart/`: `cars.ts` (per model: body, trim, wrecked), `people.ts` (player, pedestrians, guns), `props.ts` (pickup, cash, blood, wheel), `font.ts` (UI glyphs, stars, coin) |
| Legend | `src/render/pixelart/palette.ts` |
| Painter | `src/render/pixelart/pixelMap.ts`: validates rows and characters, paints a canvas texture |
| Registration | `src/render/art.ts`: `FIXED_SPRITES` (key to map), the car maps and the HUD art; `paintArt` runs in `BootScene.create()` |
| Use in a scene | `addSprite(scene, key, x, y)` / `setSprite(img, key)`; both set the world-size scale. UI art is screen-space: create images directly and let the layer's `sync()` handle the camera |
| HUD and menu | `src/ui/Hud.ts` (text, stars, cash icon), `src/ui/Menu.ts` (pause panel, menu button, key caps, checkbox and buttons), both built from `src/ui/PixelText.ts`; glyph maps in `font.ts` |
| Tileset | `public/tiles/city.svg`, generated pixel art: edit `tools/gen-tileset.mjs` and `tools/tiles.mjs`, then `nix develop -c npm run gen:tileset`. It is an SVG of crisp rects only because Tiled needs an image file; do not hand-edit it |
| Map | `public/maps/city.tmj`, hand-placed in Tiled; keep tile properties in step with `tools/tiles.mjs` |
| Per-frame shapes | Phaser Graphics in code (`src/render/Effects.ts`, `BuildingLayer.ts`). Use the palette above |

## Adding a sprite

1. Write the map as an exported `PixelMap` (array of equal-length strings) in the file for its kind.
   Use only legend characters. Look at a sibling map and match its shape language first.
2. Register it in `FIXED_SPRITES` in `src/render/art.ts`. Its display size is its map size times
   `ART_PIXEL`, so design at the size you want on screen divided by 2.
3. Use it through `addSprite` / `setSprite`. Do not `load.image` anything or reference files by path.
4. A new car model needs `body` (only `W`/`S`/`D`), `trim` and `wrecked` maps that are
   `halfLength * 2 / ART_PIXEL` wide and `halfWidth * 2 / ART_PIXEL` tall, so the model's box sizes
   must be even numbers of world pixels. `paintArt` throws if a size is wrong, naming the sprite.
   Wheel positions come from the model's `axles`, not from the art.
5. Check it in the running game at default zoom, driving at speed and rotated, with `gridlock-verify`.
