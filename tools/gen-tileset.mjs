// Draws the tileset image, public/tiles/city.png, from the catalogue in tiles.mjs.
// This only makes the picture. The map itself (public/maps/city.tmj) is hand-edited in Tiled.
import { writeFileSync, mkdirSync } from 'node:fs';
import { deflateSync, crc32 } from 'node:zlib';
import { COLUMNS, MARGIN, SPACING, TILE_COUNT, TILE_SIZE as T, TILE, TILES } from './tiles.mjs';

const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16), 255];
const shade = (c, k) => [c[0] * k | 0, c[1] * k | 0, c[2] * k | 0, 255];
const ROAD = hex('#3a3d42'), DASH = hex('#d8c25a'), WALK = hex('#9a968c'), WALK_EDGE = hex('#8e8a81'), GRASS = hex('#4f7a3a');
const PIP = [0, 0, 0, 255];

function tilePixel(t, x, y) {
  switch (t.id) {
    case TILE.ROAD: return ROAD;
    case TILE.DASH_H: return y >= 60 && x >= 8 && x < 36 ? DASH : ROAD;
    case TILE.DASH_V: return x >= 60 && y >= 8 && y < 36 ? DASH : ROAD;
    case TILE.SIDEWALK: return (x < 3 || y < 3 || x > 60 || y > 60) && x > 0 && y > 0 && x < 63 && y < 63 ? WALK_EDGE : WALK;
    case TILE.GRASS: return GRASS;
    default: { // building: roof colour, darker rim, and one to three pips for low / mid / tall
      const edge = x < 4 || y < 4 || x >= T - 4 || y >= T - 4;
      const pip = y >= 10 && y < 18 && x >= 10 && x < 10 + 12 * (t.level + 1) - 4 && (x - 10) % 12 < 8;
      return pip ? PIP : edge ? shade(hex(t.roof), 0.8) : hex(t.roof);
    }
  }
}

const STRIDE = T + SPACING, ROWS = TILE_COUNT / COLUMNS;
const IW = MARGIN * 2 + COLUMNS * T + (COLUMNS - 1) * SPACING, IH = MARGIN * 2 + ROWS * T + (ROWS - 1) * SPACING;
const img = Buffer.alloc(IW * IH * 4);
for (const t of TILES) {
  const ox = MARGIN + (t.id % COLUMNS) * STRIDE, oy = MARGIN + Math.floor(t.id / COLUMNS) * STRIDE;
  for (let y = -1; y <= T; y++) for (let x = -1; x <= T; x++) {
    const px = ox + x, py = oy + y;
    if (px < 0 || py < 0 || px >= IW || py >= IH) continue;
    img.set(tilePixel(t, Math.min(Math.max(x, 0), T - 1), Math.min(Math.max(y, 0), T - 1)), (py * IW + px) * 4); // clamp = extrude
  }
}

function png(w, h, rgba) {
  const chunk = (type, data) => {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const td = Buffer.concat([Buffer.from(type), data]);
    const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
    return Buffer.concat([len, td, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 6;
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) rgba.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4);
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

const root = new URL('../public/', import.meta.url);
mkdirSync(new URL('tiles/', root), { recursive: true });
writeFileSync(new URL('tiles/city.png', root), png(IW, IH, img));
console.log(`tileset: ${IW}x${IH}px, ${TILES.length} tiles in ${COLUMNS} columns`);
