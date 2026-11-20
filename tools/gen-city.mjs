// Generates the starter city: public/tiles/city.svg (tileset) and public/maps/city.tmj (Tiled map).
// After generation the .tmj is the source of truth: edit it in Tiled (https://www.mapeditor.org).
// Re-running this script overwrites any hand edits.
import { writeFileSync, mkdirSync } from 'node:fs';

const T = 64, P = 10, NB = 6, N = NB * P + 2; // tile px, block period, blocks per side, map tiles per side
const MARGIN = 1, SPACING = 2; // 1px extruded border around each tile stops texture bleeding when zoomed

// ---- tileset ----
// 0 road, 1 road + dash on bottom edge, 2 road + dash on right edge, 3 sidewalk, 4 grass, 5 lot (under buildings)
const TILE = { ROAD: 0, DASH_H: 1, DASH_V: 2, WALK: 3, GRASS: 4, LOT: 5 };
const ROAD = '#3a3d42', DASH = '#d8c25a', WALK = '#9a968c', WALK_EDGE = '#8e8a81', GRASS = '#4f7a3a', LOT = '#2a2a2e';

// Each tile is drawn in its own T+2 cell: the tile at (1, 1) plus a 1px extruded border that stops
// texture bleeding when zoomed. Tiles sit MARGIN px in and SPACING px apart, as the map declares.
const COUNT = 6, STRIDE = T + SPACING, CELL = T + 2 * MARGIN;
const IW = MARGIN * 2 + COUNT * T + (COUNT - 1) * SPACING, IH = CELL;
const tileSvg = (t) => {
  const base = [ROAD, ROAD, ROAD, WALK, GRASS, LOT][t];
  let s = `<rect width="${CELL}" height="${CELL}" fill="${base}"/>`;
  if (t === TILE.DASH_H) s += `<rect x="${MARGIN + 8}" y="${MARGIN + 60}" width="28" height="${T - 60 + MARGIN}" fill="${DASH}"/>`;
  if (t === TILE.DASH_V) s += `<rect x="${MARGIN + 60}" y="${MARGIN + 8}" width="${T - 60 + MARGIN}" height="28" fill="${DASH}"/>`;
  if (t === TILE.WALK) s += `<rect x="${MARGIN + 2}" y="${MARGIN + 2}" width="${T - 4}" height="${T - 4}" fill="none" stroke="${WALK_EDGE}" stroke-width="2"/>`;
  return `<g transform="translate(${t * STRIDE} 0)">${s}</g>`;
};
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${IW}" height="${IH}" viewBox="0 0 ${IW} ${IH}" shape-rendering="crispEdges">\n`
  + Array.from({ length: COUNT }, (_, t) => '  ' + tileSvg(t)).join('\n') + '\n</svg>\n';

// ---- city layout ----
let seed = 1337;
const rnd = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
const ground = new Array(N * N);
for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
  const mx = x % P, my = y % P;
  if (mx < 2 || my < 2) ground[y * N + x] = (my === 0 && mx >= 2) ? TILE.DASH_H : (mx === 0 && my >= 2) ? TILE.DASH_V : TILE.ROAD;
  else ground[y * N + x] = TILE.WALK;
}
const ROOFS = ['#8a8f98', '#9b8b7a', '#7d8a7a', '#a3a09a', '#8c7f8f', '#b09a80', '#7f8c9c'];
let nextId = 1;
const buildings = [];
function addBuilding(x0, y0, w, h) {
  for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) ground[y * N + x] = TILE.LOT;
  const height = +(0.12 + rnd() * 0.25).toFixed(3), roof = ROOFS[rnd() * ROOFS.length | 0];
  buildings.push({ id: nextId++, name: '', type: 'building', x: x0 * T, y: y0 * T, width: w * T, height: h * T,
    rotation: 0, visible: true,
    properties: [{ name: 'height', type: 'float', value: height }, { name: 'roof', type: 'color', value: '#ff' + roof.slice(1) }] });
}
for (let j = 0; j < NB; j++) for (let i = 0; i < NB; i++) {
  const x0 = i * P + 3, y0 = j * P + 3, r = rnd();
  if (r < 0.12) { for (let y = y0; y < y0 + 6; y++) for (let x = x0; x < x0 + 6; x++) ground[y * N + x] = TILE.GRASS; }
  else if (r < 0.45) addBuilding(x0, y0, 6, 6);
  else if (r < 0.7) { addBuilding(x0, y0, 3, 6); addBuilding(x0 + 4, y0, 2, 6); }
  else { addBuilding(x0, y0, 6, 3); addBuilding(x0, y0 + 4, 6, 2); }
}

const point = (name, type, x, y, properties) =>
  ({ id: nextId++, name, type, x, y, width: 0, height: 0, rotation: 0, visible: true, point: true, ...(properties ? { properties } : {}) });
const startX = (3 * P + 2) * T + T / 2, startY = (3 * P + 5) * T + T / 2;
const spawns = [point('player', 'spawn', startX, startY, [{ name: 'heading', type: 'float', value: -90 }])];

// Parked cars on the right-hand lane of each road; heading in degrees, 0 = east, 90 = south.
const isRoad = (tx, ty) => tx % P < 2 || ty % P < 2;
function laneHeading(tx, ty) {
  const h = ty % P < 2, v = tx % P < 2;
  if (h && !v) return ty % P === 0 ? 180 : 0;
  if (v && !h) return tx % P === 0 ? 90 : -90;
  return null;
}
const cars = [{ x: (3 * P + 1) * T + T / 2, y: startY, heading: -90 }];
for (let tries = 0; cars.length < 40 && tries < 5000; tries++) {
  const tx = rnd() * N | 0, ty = rnd() * N | 0;
  if (!isRoad(tx, ty)) continue;
  const heading = laneHeading(tx, ty);
  if (heading === null) continue;
  const x = tx * T + T / 2, y = ty * T + T / 2;
  if (cars.every((c) => Math.hypot(c.x - x, c.y - y) > 90)) cars.push({ x, y, heading });
}
// Weapon pickups on sidewalks: one next to the start, the rest scattered.
const pickupAt = (x, y) => point('', 'pickup', x, y, [{ name: 'weapon', type: 'string', value: 'smg' }, { name: 'ammo', type: 'int', value: 60 }]);
const pickupObjects = [pickupAt(startX, startY + 2 * T)];
for (let tries = 0; pickupObjects.length < 6 && tries < 5000; tries++) {
  const tx = rnd() * N | 0, ty = rnd() * N | 0;
  if (ground[ty * N + tx] !== TILE.WALK) continue;
  const x = tx * T + T / 2, y = ty * T + T / 2;
  if (pickupObjects.every((o) => Math.hypot(o.x - x, o.y - y) > 10 * T)) pickupObjects.push(pickupAt(x, y));
}
const carObjects = cars.map((c) => point('', 'car', c.x, c.y, [{ name: 'heading', type: 'float', value: c.heading }]));

const layer = (id, name, objects) => ({ id, name, type: 'objectgroup', draworder: 'topdown', objects, opacity: 1, visible: true, x: 0, y: 0 });
const map = {
  type: 'map', version: '1.10', tiledversion: '1.11.0', orientation: 'orthogonal', renderorder: 'right-down',
  width: N, height: N, tilewidth: T, tileheight: T, infinite: false, compressionlevel: -1,
  nextlayerid: 6, nextobjectid: nextId,
  layers: [
    { id: 1, name: 'ground', type: 'tilelayer', width: N, height: N, x: 0, y: 0, opacity: 1, visible: true, data: ground.map((t) => t + 1) },
    layer(2, 'buildings', buildings),
    layer(3, 'spawns', spawns),
    layer(4, 'cars', carObjects),
    layer(5, 'pickups', pickupObjects),
  ],
  tilesets: [{ firstgid: 1, name: 'city', image: '../tiles/city.svg', imagewidth: IW, imageheight: IH,
    tilewidth: T, tileheight: T, tilecount: COUNT, columns: COUNT, margin: MARGIN, spacing: SPACING }],
};

const root = new URL('../public/', import.meta.url);
mkdirSync(new URL('tiles/', root), { recursive: true });
mkdirSync(new URL('maps/', root), { recursive: true });
writeFileSync(new URL('tiles/city.svg', root), svg);
writeFileSync(new URL('maps/city.tmj', root), JSON.stringify(map, null, 1) + '\n');
console.log(`city: ${N}x${N} tiles, ${buildings.length} buildings, ${cars.length} cars`);
