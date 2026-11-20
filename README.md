# Gridlock

A top-down city driving game for the browser. Original project in the style of the late-90s
top-down crime games: walk around a city, get into any parked car and drive it.

Current scope is deliberately minimal: walking, entering and leaving cars, arcade driving with a
handbrake drift, car-to-car and wall collisions, and fake-3D buildings.

## Controls

| Key | Action |
|---|---|
| Arrows / WASD | Walk or drive (up/down = forward/back, left/right = turn) |
| E / F / Enter | Get into the nearest car, or get out |
| Space | Handbrake |

## Development

Node comes from the Nix dev shell (pinned to the same nixpkgs as NixOS-config):

```bash
nix develop            # or prefix commands: nix develop -c npm run dev
npm install
npm run dev            # http://localhost:5173 with hot reload
npm run check          # typecheck + tests
npm run build          # static site in dist/ (open via any static file server)
```

## Layout

```
src/
  sim/        Gameplay rules: car handling, collisions, player. No Phaser imports; unit-tested.
  world/      City collision and the Tiled map loader.
  render/     Phaser views: cars, player, leaning buildings, follow camera.
  scenes/     Phaser scenes: Boot (asset loading) and Game (fixed 120 Hz sim + rendering).
  story/      Ink story (main.ink) and StoryRunner wrapper. Not wired into gameplay yet.
  ui/         DOM overlay (HUD).
public/
  maps/city.tmj   The city, editable in Tiled.
  tiles/city.png  Ground tileset.
tools/
  gen-city.mjs    Generates the starter city map and tileset.
  ink-plugin.ts   Vite plugin that compiles .ink files at build time.
tests/            Vitest: simulation, map sanity, story compilation.
```

## Editing the city

Open `public/maps/city.tmj` in [Tiled](https://www.mapeditor.org).

- **ground** (tile layer): roads, sidewalks, grass. Purely visual.
- **buildings** (object layer): rectangles are solid. Properties: `height` (float, roof lean, about
  0.1 to 0.4) and `roof` (colour).
- **spawns** (object layer): a point named `player`, with optional `heading` in degrees
  (0 = east, 90 = south).
- **cars** (object layer): points with `heading` and an optional `color`.

`npm run gen:city` rebuilds the starter map from scratch and overwrites hand edits.

## Story

Write Ink in `src/story/*.ink` and import it: `import story from './story/main.ink'`. The build
fails on Ink errors. `StoryRunner` handles jumping to knots, choices, variables and save state.
