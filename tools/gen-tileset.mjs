// Draws the tileset image, public/tiles/city.svg, from the catalogue in tiles.mjs.
// This only makes the picture. The map itself (public/maps/city.tmj) is hand-edited in Tiled.
//
// The tiles are pixel art: each tile is a grid of art pixels (ART_PIXEL world px square) built in
// code, then written as an SVG of crisp rects so Tiled and Phaser can both load it at natural size.
import { writeFileSync, mkdirSync } from 'node:fs';
import { ART_PIXEL, COLUMNS, MARGIN, SPACING, TILE_COUNT, TILE_SIZE as T, TILE, TILES } from './tiles.mjs';

const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const shade = (h, k) => '#' + hex(h).map((c) => Math.min(255, c * k | 0).toString(16).padStart(2, '0')).join('');

const ROAD = '#3a3d42', ROAD_DARK = '#34373c', ROAD_LIGHT = '#404348', DASH = '#d8c25a';
const WALK = '#9a968c', WALK_EDGE = '#8e8a81', WALK_LIGHT = '#a39f95';
const GRASS = '#4f7a3a', GRASS_DARK = '#446c33', GRASS_LIGHT = '#5b8a45';
const PAINT = '#d8d3c4'; // muted white for crosswalks, bays and arrows
const WATER = '#39596c', WATER_DARK = '#2f4b5c', WATER_LIGHT = '#43677b';
const LEAF = '#365a2b', LEAF_DARK = '#2c4a24', LEAF_LIGHT = '#43693a';
const PIP = '#1b2430';

const N = T / ART_PIXEL; // art pixels per tile side

/** Deterministic noise in [0, 1) from a pixel position, so a tile looks the same every run and seams never show. */
const hash01 = (x, y, salt) => {
  let h = (Math.imul(x + 1, 374761393) + Math.imul(y + 1, 668265263) + Math.imul(salt + 1, 2246822519)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};

const grid = (fill) => Array.from({ length: N }, () => Array(N).fill(fill));
const rect = (g, x, y, w, h, c) => { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) if (g[j]?.[i] !== undefined) g[j][i] = c; };
/** Scatters single-pixel specks of `c` over roughly `share` of the pixels that are currently `over`. */
const speckle = (g, over, c, share, salt) => {
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (g[y][x] === over && hash01(x, y, salt) < share) g[y][x] = c;
};

function roadTile() {
  const g = grid(ROAD);
  speckle(g, ROAD, ROAD_DARK, 0.05, 1);
  speckle(g, ROAD, ROAD_LIGHT, 0.04, 2);
  return g;
}

function sidewalkTile() {
  const g = grid(WALK);
  speckle(g, WALK, WALK_LIGHT, 0.04, 3);
  // Slab joints: a cross through the middle, and the top and left edges (the neighbour supplies the rest).
  rect(g, 0, N / 2, N, 1, WALK_EDGE);
  rect(g, N / 2, 0, 1, N, WALK_EDGE);
  rect(g, 0, 0, N, 1, WALK_EDGE);
  rect(g, 0, 0, 1, N, WALK_EDGE);
  return g;
}

function grassTile() {
  const g = grid(GRASS);
  speckle(g, GRASS, GRASS_DARK, 0.09, 4);
  speckle(g, GRASS, GRASS_LIGHT, 0.06, 5);
  return g;
}

function waterTile() {
  const g = grid(WATER);
  // A few long ripples rather than speckle: a pond should read as calm water at a glance.
  rect(g, 2, 5, 10, 1, WATER_LIGHT);
  rect(g, 17, 8, 9, 1, WATER_DARK);
  rect(g, 6, 14, 11, 1, WATER_LIGHT);
  rect(g, 22, 18, 8, 1, WATER_DARK);
  rect(g, 1, 23, 9, 1, WATER_LIGHT);
  rect(g, 18, 27, 11, 1, WATER_DARK);
  return g;
}

/** Bars start on the tile edges so neighbouring crosswalk tiles join without a seam. */
function crosswalkTile(horizontal) {
  const g = roadTile();
  for (let i = 0; i < N; i += 5) {
    if (horizontal) rect(g, i, 0, 2, N, PAINT);
    else rect(g, 0, i, N, 2, PAINT);
  }
  return g;
}

function parkingTile() {
  const g = roadTile();
  rect(g, 0, 0, 1, N - 3, PAINT);
  rect(g, N - 1, 0, 1, N - 3, PAINT);
  rect(g, 0, N - 3, N, 1, PAINT);
  return g;
}

function arrowTile() {
  const g = roadTile();
  rect(g, 6, 14, 14, 4, PAINT);
  for (let d = 0; d <= 3; d++) rect(g, 28 - 3 * d, 16 - d, 2 + 3 * d, 1 + 2 * d, PAINT);
  return g;
}

/**
 * Woodland: four tree crowns per tile, each kept inside its own quarter so tiles join seamlessly into
 * a forest, with grass showing through the gaps. Lit from the top like everything else.
 */
function treesTile() {
  const g = grassTile();
  const Q = N / 2, R = Q / 2 - 1; // quarter size, crown radius in art pixels
  for (const [qx, qy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) {
    const cx = qx * Q + Q / 2 + (qx === qy ? -1 : 1), cy = qy * Q + Q / 2; // stagger so the rows don't look planted
    for (let y = -R; y <= R; y++) {
      for (let x = -R; x <= R; x++) {
        const d = x * x + y * y;
        if (d > R * R) continue;
        const c = y <= -R / 2 && x <= 0 ? LEAF_LIGHT : y >= R / 2 || (x >= R / 2 && y >= 0) ? LEAF_DARK : LEAF;
        g[cy + y][cx + x] = c;
      }
    }
    speckle(g, LEAF, LEAF_DARK, 0.08, 6 + qx + 2 * qy);
  }
  return g;
}

// A building tile only shows in Tiled: in the game its roof is drawn over it with a lean.
function buildingTile(t) {
  const g = grid(shade(t.roof, 0.8));
  rect(g, 2, 2, N - 4, N - 4, t.roof);
  rect(g, 2, 2, N - 4, 1, shade(t.roof, 1.1)); // lit top edge
  for (let i = 0; i <= t.level; i++) rect(g, 5 + 6 * i, 5, 4, 4, PIP); // one pip per height level, low to tower
  return g;
}

function tilePixels(t) {
  switch (t.id) {
    case TILE.ROAD: return roadTile();
    // Centre lines sit on the tile's edge and run into the extruded border, so adjacent tiles join.
    case TILE.DASH_H: { const g = roadTile(); rect(g, 4, N - 2, 14, 2, DASH); return g; }
    case TILE.DASH_V: { const g = roadTile(); rect(g, N - 2, 4, 2, 14, DASH); return g; }
    case TILE.SIDEWALK: return sidewalkTile();
    case TILE.GRASS: return grassTile();
    case TILE.CROSSWALK_H: return crosswalkTile(true);
    case TILE.CROSSWALK_V: return crosswalkTile(false);
    case TILE.PARKING: return parkingTile();
    case TILE.ARROW: return arrowTile();
    case TILE.WATER: return waterTile();
    case TILE.TREES: return treesTile();
    default: return buildingTile(t);
  }
}

// Each tile gets a (T + 2 * MARGIN) cell: the tile at (MARGIN, MARGIN) plus a 1px extruded border that
// stops texture bleeding when zoomed. Cells sit SPACING - 2 * MARGIN apart (zero), so they butt together
// and tile (col, row) lands where the map's margin/spacing expect it.
const STRIDE = T + SPACING, CELL = T + 2 * MARGIN, ROWS = TILE_COUNT / COLUMNS;
const IW = MARGIN * 2 + COLUMNS * T + (COLUMNS - 1) * SPACING, IH = MARGIN * 2 + ROWS * T + (ROWS - 1) * SPACING;

// Paint every tile into one image-sized grid of texels (1 texel = 1 SVG unit). Unused cells stay null
// and are left transparent.
const image = Array.from({ length: IH }, () => Array(IW).fill(null));
for (const t of TILES) {
  const px = tilePixels(t);
  const ox = (t.id % COLUMNS) * STRIDE, oy = Math.floor(t.id / COLUMNS) * STRIDE;
  const clamp = (v) => Math.min(T - 1, Math.max(0, v));
  for (let ty = 0; ty < CELL; ty++) {
    for (let tx = 0; tx < CELL; tx++) {
      image[oy + ty][ox + tx] = px[Math.floor(clamp(ty - MARGIN) / ART_PIXEL)][Math.floor(clamp(tx - MARGIN) / ART_PIXEL)];
    }
  }
}

/** Merges texels into as few rectangles as possible, grouped by colour: a run per row, then equal runs stacked. */
function rectsByColour() {
  const byColour = new Map();
  let open = new Map(); // "colour x w" -> the rect still growing downwards
  for (let y = 0; y <= IH; y++) {
    const next = new Map();
    for (let x = 0; y < IH && x < IW;) {
      const c = image[y][x];
      let w = 1;
      while (x + w < IW && image[y][x + w] === c) w++;
      const id = `${c} ${x} ${w}`;
      const r = open.get(id) ?? { x, y, w, h: 0 };
      r.h++;
      next.set(id, r);
      if (!open.has(id)) { if (!byColour.has(c)) byColour.set(c, []); byColour.get(c).push(r); }
      x += w;
    }
    open = next;
  }
  return byColour;
}

const paths = [...rectsByColour()].filter(([c]) => c !== null).map(([c, rs]) => `  <path fill="${c}" d="${rs.map((r) => `M${r.x} ${r.y}h${r.w}v${r.h}h-${r.w}z`).join('')}"/>`);
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${IW}" height="${IH}" viewBox="0 0 ${IW} ${IH}" shape-rendering="crispEdges">\n${paths.join('\n')}\n</svg>\n`;

const root = new URL('../public/', import.meta.url);
mkdirSync(new URL('tiles/', root), { recursive: true });
writeFileSync(new URL('tiles/city.svg', root), svg);
console.log(`tileset: ${IW}x${IH}px, ${TILES.length} tiles in ${COLUMNS} columns, ${(svg.length / 1024).toFixed(0)} KB`);
