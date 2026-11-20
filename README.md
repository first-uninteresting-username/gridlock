# Gridlock

A top-down city driving game for the browser. Original project in the style of the late-90s
top-down crime games: walk around a city, get into any parked car and drive it.

Current scope is deliberately minimal: walking, entering and leaving cars, arcade driving with a
handbrake drift, car-to-car and wall collisions, fake-3D buildings, and guns. Shot cars smoke,
catch fire and explode, and the blast can set off nearby cars. Pedestrians (on foot only, there is
no AI traffic) wander the sidewalks and cross streets; they run from gunfire, explosions and fast
cars, and can be shot or run over.

## Controls

| Input | Action |
|---|---|
| Arrows / WASD | Drive; on foot, walk (with mouse aim: move in screen directions; without: up/down = forward/back, left/right = turn) |
| Mouse | Aim on foot (turn off in the menu to rotate with A / D instead) |
| Left click / Space | Shoot (on foot); Space is also the handbrake in a car |
| E / F / Enter | Get into the nearest car, or get out |
| Q | Switch weapon |
| Esc | Menu: controls and settings (pauses the game) |

## Development

Node comes from the Nix dev shell (pinned to the same nixpkgs as NixOS-config):

```bash
nix develop            # or prefix commands: nix develop -c npm run dev
npm install
npm run dev            # http://localhost:5173 with hot reload
npm run check          # typecheck
npm run build          # static site in dist/ (open via any static file server)
```

In dev builds, `window.gridlock.sim` exposes the simulation in the browser console, for example
`gridlock.sim.arsenal.ammo.smg = 999`.

## Layout

```
src/
  sim/        Gameplay rules: car handling, collisions, player, pedestrians. No Phaser imports.
  world/      The tile grid (City) and the Tiled map loader.
  render/     Phaser views: cars, player, pedestrians, leaning buildings, follow camera. art.ts loads the SVG sprites.
  scenes/     Phaser scenes: Boot (asset loading) and Game (fixed 120 Hz sim + rendering).
  story/      Ink story (main.ink) and StoryRunner wrapper. Not wired into gameplay yet.
  ui/         DOM overlay (HUD).
public/
  maps/city.tmj   The city, editable in Tiled.
  tiles/city.svg  The tileset image.
  art/            SVG sprites: cars, player, pedestrians, weapons, pickup. Registered in src/render/art.ts.
tools/
  tiles.mjs       The tile catalogue (what each tile is).
  gen-tileset.mjs Draws tiles/city.svg from the catalogue. Never touches the map.
  ink-plugin.ts   Vite plugin that compiles .ink files at build time.
```

## Editing the city

Open `public/maps/city.tmj` in [Tiled](https://www.mapeditor.org) and paint. The map is entirely
hand-placed; nothing generates it.

**Terrain, streets and buildings are all tiles**, painted on one tile layer called `tiles`. What a
tile means comes from its custom properties in the tileset (select a tile in Tiled's Tileset panel):

| Property | Applies to | Meaning |
|---|---|---|
| `kind` | every tile | `road`, `sidewalk`, `grass` or `building`. Required. Buildings are solid; everything else can be driven and walked on. |
| `height` | buildings | Roof lean, about 0.1 (low) to 0.4 (tall). |
| `roof` | buildings | Roof colour. |

The tileset has plain road, road with a centre dash (two orientations), sidewalk and grass, plus
building tiles in seven roof colours and three heights (the pips on the tile show the height).
A building is just building tiles painted next to each other: tiles of equal height merge into one
roof, and walls appear wherever a tile borders something lower. An empty (unpainted) cell is
solid, like the edge of the map.

To add a tile type, add it to `tools/tiles.mjs` and run `npm run gen:tileset` to redraw the image,
then set the same properties on the new tile in Tiled. The map keeps its own copy of the tile
properties, so existing maps are not touched by `gen:tileset`.

**Things that are not tiles** live in object layers, since they move or are placed freely:

- **spawns**: a point named `player`, with optional `heading` in degrees (0 = east, 90 = south).
- **cars**: points with `heading` and an optional `color`.
- **pickups**: points with `weapon` (`smg`) and `ammo`. They respawn 30 s after being collected.

Pedestrians are not placed in the map: the game spawns them on random sidewalk tiles at start and
replaces the dead ones out of sight. Weapons, car health, explosion strength and pedestrian
behaviour (count, speeds, scare ranges) are tuned in `src/sim/weapons.ts` and `src/sim/tuning.ts`.

## Story

Write Ink in `src/story/*.ink` and import it: `import story from './story/main.ink'`. The build
fails on Ink errors. `StoryRunner` handles jumping to knots, choices, variables and save state.
