// Draws the tileset image, public/tiles/city.svg, from the catalogue in tiles.mjs.
// This only makes the picture. The map itself (public/maps/city.tmj) is hand-edited in Tiled.
import { writeFileSync, mkdirSync } from 'node:fs';
import { COLUMNS, MARGIN, SPACING, TILE_COUNT, TILE_SIZE as T, TILE, TILES } from './tiles.mjs';

const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const shade = (h, k) => '#' + hex(h).map((c) => (c * k | 0).toString(16).padStart(2, '0')).join('');
const ROAD = '#3a3d42', DASH = '#d8c25a', WALK = '#9a968c', WALK_EDGE = '#8e8a81', GRASS = '#4f7a3a';

// Each tile is drawn in its own (T + 2 * MARGIN) cell: the tile at (MARGIN, MARGIN) plus a 1px
// extruded border that stops texture bleeding when zoomed. Cells sit SPACING - 2 * MARGIN apart
// (zero), so they butt together and tile (col, row) lands where the map's margin/spacing expect it.
const STRIDE = T + SPACING, CELL = T + 2 * MARGIN, ROWS = TILE_COUNT / COLUMNS;
const IW = MARGIN * 2 + COLUMNS * T + (COLUMNS - 1) * SPACING, IH = MARGIN * 2 + ROWS * T + (ROWS - 1) * SPACING;
const rect = (x, y, w, h, fill, extra = '') => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}"${extra}/>`;

function tileSvg(t) {
  const M = MARGIN;
  const bg = (fill) => rect(0, 0, CELL, CELL, fill);
  switch (t.id) {
    case TILE.ROAD: return bg(ROAD);
    // Centre lines run into the extruded border, so adjacent tiles join.
    case TILE.DASH_H: return bg(ROAD) + rect(M + 8, M + 60, 28, T - 60 + M, DASH);
    case TILE.DASH_V: return bg(ROAD) + rect(M + 60, M + 8, T - 60 + M, 28, DASH);
    case TILE.SIDEWALK: return bg(WALK) + `<rect x="${M + 2}" y="${M + 2}" width="${T - 4}" height="${T - 4}" fill="none" stroke="${WALK_EDGE}" stroke-width="2"/>`;
    case TILE.GRASS: return bg(GRASS);
    default: { // building: roof colour, darker rim, and one to three pips for low / mid / tall
      let s = bg(shade(t.roof, 0.8)) + rect(M + 4, M + 4, T - 8, T - 8, t.roof);
      for (let i = 0; i <= t.level; i++) s += rect(M + 10 + 12 * i, M + 10, 8, 8, '#000');
      return s;
    }
  }
}

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${IW}" height="${IH}" viewBox="0 0 ${IW} ${IH}" shape-rendering="crispEdges">\n`
  + TILES.map((t) => `  <g transform="translate(${(t.id % COLUMNS) * STRIDE} ${Math.floor(t.id / COLUMNS) * STRIDE})">${tileSvg(t)}</g>`).join('\n')
  + '\n</svg>\n';

const root = new URL('../public/', import.meta.url);
mkdirSync(new URL('tiles/', root), { recursive: true });
writeFileSync(new URL('tiles/city.svg', root), svg);
console.log(`tileset: ${IW}x${IH}px, ${TILES.length} tiles in ${COLUMNS} columns`);
