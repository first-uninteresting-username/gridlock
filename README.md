# Gridlock

A top-down city driving game for the browser. Original project in the style of the late-90s
top-down crime games: walk around a city, get into any parked car and drive it.

Current scope is deliberately minimal: walking, entering and leaving cars, arcade driving with a
handbrake drift, car-to-car and wall collisions, fake-3D buildings, and guns and melee weapons. Shot cars smoke,
catch fire and explode, and the blast can set off nearby cars. Pedestrians (on foot only, there is
no AI traffic) wander the sidewalks and cross streets; they run from gunfire, explosions and fast
cars, and can be shot or run over. You can rob them at close range, except police officers, who
can't be robbed: victims drop cash (and occasionally ammo), and witnesses may raise the wanted level.
You can also lean out of a car window and shoot while driving. Gunfire and kills raise wanted too,
and some pedestrians are police. Once wanted, officers shoot on sight and only resort to an arrest
when they can't get a clear shot; they don't flinch at incoming fire. Being busted costs $100 and
sends you back to the start; being shot down returns you to your last save. Killed officers drop
SMG ammo.

## Controls

| Input | Action |
|---|---|
| Arrows / WASD | Drive; on foot, walk (with mouse aim: move in screen directions; without: up/down = forward/back, left/right = turn) |
| Shift | Sprint while walking forward (on foot) |
| Mouse | Aim on foot or out of a car window (turn off in the menu to rotate with A / D on foot) |
| Left click / Space | Shoot. In a car, left click shoots toward the mouse; Space is the handbrake |
| Mouse wheel / 1–4 | Cycle weapon slots, or select one directly |
| Ctrl + wheel / 1 2 | Cycle or select a gadget slot (gadgets have no behaviour yet) |
| Right click | Use the selected gadget (not implemented yet) |
| E / Enter | Get into the nearest car, or get out |
| F | General action: rob a nearby pedestrian (not police; a prompt appears when one is close enough), otherwise get in/out of the nearest car |
| Esc | Menu: controls, settings and Save game (pauses the game) |

## Saving

The game saves itself when it starts, and you can save again from the menu with **Save game**.
Saves live in the browser's local storage, so they survive a reload. Gunfire, blasts and fast cars
can kill you; when your health reaches zero you return to the last save with the cash, weapons,
wanted level and car damage you had when you saved. Being busted still costs $100 and sends you back
to the start. There is always a save to return to, even if you never saved manually.

The HUD strip at the top left shows the four weapon slots and two empty gadget slots; the selected
slot is gold. All weapon slots start empty, and an empty slot means fists. A weapon pickup fills
the first free slot and selects it (or replaces the selected slot when all four are full); SMG ammo
comes from pickups.

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
  sim/        Gameplay rules: car models and handling, collisions, player, pedestrians. No Phaser imports.
  world/      The tile grid (City) and the Tiled map loader.
  render/     Phaser views: cars, player, pedestrians, leaning buildings, follow camera. art.ts paints the pixel-art sprites (maps in render/pixelart/).
  scenes/     Phaser scenes: Boot (asset loading) and Game (fixed 120 Hz sim + rendering).
  story/      Ink story (main.ink) and StoryRunner wrapper. Not wired into gameplay yet.
  ui/         DOM overlay (HUD).
public/
  maps/city.tmj   The city, editable in Tiled.
  tiles/city.svg  The tileset image (generated pixel art; do not hand-edit).
tools/
  tiles.mjs       The tile catalogue (what each tile is).
  gen-tileset.mjs Draws the pixel-art tiles/city.svg from the catalogue. Never touches the map.
  ink-plugin.ts   Vite plugin that compiles .ink files at build time.
```

## Editing the city

Open `public/maps/city.tmj` in [Tiled](https://www.mapeditor.org) and paint. Nothing in the repo
generates the map, so edits made in Tiled are safe.

The city is modelled on [Nowiny](https://pl.wikipedia.org/wiki/Nowiny_(powiat_kielecki)), a village
near Kielce in Poland, at about 6 m per tile. Its streets, buildings, woods, ponds and the Bobrza river
were traced once from OpenStreetMap: the Białe Zagłębie housing estate in the middle, Krakowska
running diagonally along the west side, the Perła pool and GKS Nowiny stadium to the east, and the
Przemysłowa industrial area to the south-east. Map data © OpenStreetMap contributors, available under
the [Open Database License](https://www.openstreetmap.org/copyright).

**Terrain, streets and buildings are all tiles**, painted on one tile layer called `tiles`. What a
tile means comes from its custom properties in the tileset (select a tile in Tiled's Tileset panel):

| Property | Applies to | Meaning |
|---|---|---|
| `kind` | every tile | `road`, `sidewalk`, `grass`, `water`, `tree` or `building`. Required. Buildings, water and trees are solid; everything else can be driven and walked on. |
| `height` | buildings | Roof lean, about 0.1 (low) to 0.4 (tall). |
| `roof` | buildings | Roof colour. |

The tileset has plain road, road with a centre dash (two orientations), crosswalks, parking bays, lane
arrows, sidewalk, grass, water and woodland (tree crowns), plus building tiles in ten roof colours and
four heights (the pips on the tile show the height).
A building is just building tiles painted next to each other: tiles of equal height merge into one
roof, and walls appear wherever a tile borders something lower. An empty (unpainted) cell is
solid, like the edge of the map.

To add a tile type, add it to `tools/tiles.mjs` and run `npm run gen:tileset` to redraw the image,
then set the same properties on the new tile in Tiled. The map keeps its own copy of the tile
properties, so existing maps are not touched by `gen:tileset`.

**Things that are not tiles** live in object layers, since they move or are placed freely:

- **spawns**: a point named `player`, with optional `heading` in degrees (0 = east, 90 = south).
- **cars**: points with `heading`, an optional `color` and an optional `model` (see below). Cars with no `model` get a random one, the same every time for a given spot. A `driver` boolean forces someone into (or out of) the driver's seat; without it, most cars get a deterministic seated driver.
- **pickups**: points with either `weapon` (an id from `src/sim/weapons.ts`) and `ammo`, or `amount` (whole dollars of cash).
  They respawn 30 s after being collected. Cash adds to `sim.cash`, which the HUD shows.

## Car models

| `model` | Wheels | Health | Character |
|---|---|---|---|
| `sedan` | 4 | 100 | The baseline. |
| `compact` | 4 | 70 | Small and light: grippy, turns sharply, lower top speed. |
| `sports` | 4 | 80 | Fastest by far, but the tail steps out easily. |
| `van` | 4 | 150 | Tough, slow to accelerate and to turn. |
| `lorry` | 6 | 260 | Huge and heavy: slow, swings wide, shoves other cars aside. |
| `trike` | 3 | 40 | Tiny, twitchy and flimsy. |

Everything about a model (box size, health, mass, axles and so the wheel count, handling, how
common it is) is one entry in `src/sim/models.ts`. To add one, add the entry and a `CarModelId`,
then draw its `body`, `trim` and `wrecked` pixel maps in `src/render/pixelart/cars.ts` at the size of its box
(twice `halfLength` by twice `halfWidth` in world px, at 2 world px per art pixel; the body is white so it can be tinted).

Most parked cars start with a **driver** in the seat, visible through the windows and carried along
when the car moves. A car has a `driver: Driver | null`, where `Driver` is a separate occupant type so
a future car-theft rule can take that person out of the car. Which cars have one is decided
deterministically per spawn in `src/world/tiled.ts` (or forced with the map's `driver` property); the
share is tuned by `DRIVER.spawnChance` in `src/sim/tuning.ts`. Each model's `driverSeat` in
`src/sim/models.ts` lines the sprite up with its cabin glass.

Pedestrians are not placed in the map: the game spawns them on random sidewalk tiles at start and
replaces the dead ones outside the camera view. Weapons, explosion strength and pedestrian
behaviour (count, speeds, scare ranges) are tuned in `src/sim/weapons.ts` and `src/sim/tuning.ts`.

## Story

Write Ink in `src/story/*.ink` and import it: `import story from './story/main.ink'`. The build
fails on Ink errors. `StoryRunner` handles jumping to knots, choices, variables and save state.
