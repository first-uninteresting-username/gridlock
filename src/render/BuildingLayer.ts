import Phaser from 'phaser';
import type { City, TileDef } from '../world/City';
import { hash01 } from '../world/tiled';

// Wall shades for the north, east, south and west faces.
const WALLS = [0x4a4a52, 0x3c3c44, 0x5a5a62, 0x44444c];
// Where the neighbour sits for each face, in the same order.
const NEIGHBOURS = [[0, -1], [1, 0], [0, 1], [-1, 0]] as const;
const RIM = 6; // px of darker roof edge (3 art pixels), drawn only where the roof has an outside edge
const UNIT_CHANCE = 0.06; // share of roof tiles carrying a rooftop unit

const darken = (c: number, k: number) => (((c >> 16) & 255) * k << 16) | ((((c >> 8) & 255) * k) << 8) | ((c & 255) * k);

interface Visible {
  col: number;
  row: number;
  def: TileDef;
  dist: number;
}

/**
 * Draws the building tiles with a fake-3D lean: each tile's roof is its footprint scaled away from
 * the camera centre by (1 + height), and the walls fill the gap. Walls and roof rims are only drawn
 * where a tile borders something lower, so neighbouring building tiles read as one building.
 * Redrawn every frame.
 */
export class BuildingLayer {
  private readonly g: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene, private readonly city: City) {
    this.g = scene.add.graphics().setDepth(10);
  }

  draw(camX: number, camY: number, view: Phaser.Geom.Rectangle): void {
    const g = this.g, city = this.city, ts = city.tileSize, m = 200;
    g.clear();
    const c0 = Math.max(0, Math.floor((view.x - m) / ts)), c1 = Math.min(city.cols - 1, Math.floor((view.right + m) / ts));
    const r0 = Math.max(0, Math.floor((view.y - m) / ts)), r1 = Math.min(city.rows - 1, Math.floor((view.bottom + m) / ts));

    const visible: Visible[] = [];
    for (let row = r0; row <= r1; row++) {
      for (let col = c0; col <= c1; col++) {
        const def = city.tile(col, row);
        if (def?.kind === 'building') {
          visible.push({ col, row, def, dist: Math.hypot((col + 0.5) * ts - camX, (row + 0.5) * ts - camY) });
        }
      }
    }
    visible.sort((a, b) => b.dist - a.dist); // far first, so nearer (taller-looking) roofs overlap them

    const lean = (p: number, cam: number, k: number) => cam + (p - cam) * k;
    for (const { col, row, def } of visible) {
      const x = col * ts, y = row * ts, k = 1 + def.height;
      const base = [[x, y], [x + ts, y], [x + ts, y + ts], [x, y + ts]];
      const exposed = [false, false, false, false];
      for (let i = 0; i < 4; i++) {
        const j = (i + 1) % 4;
        const nb = city.tile(col + NEIGHBOURS[i][0], row + NEIGHBOURS[i][1]);
        const nbHeight = nb?.kind === 'building' ? nb.height : 0;
        exposed[i] = nbHeight !== def.height;
        if (nbHeight >= def.height) continue; // no wall to see here
        const ks = 1 + nbHeight; // the wall starts at the top of whatever is next to it
        g.fillStyle(WALLS[i]);
        g.beginPath();
        g.moveTo(lean(base[i][0], camX, ks), lean(base[i][1], camY, ks));
        g.lineTo(lean(base[j][0], camX, ks), lean(base[j][1], camY, ks));
        g.lineTo(lean(base[j][0], camX, k), lean(base[j][1], camY, k));
        g.lineTo(lean(base[i][0], camX, k), lean(base[i][1], camY, k));
        g.closePath();
        g.fillPath();
      }
      const rx = lean(x, camX, k), ry = lean(y, camY, k), rw = ts * k, rh = ts * k;
      g.fillStyle(def.roof).fillRect(rx - 0.5, ry - 0.5, rw + 1, rh + 1); // a hair of overlap hides seams between tiles
      g.fillStyle(darken(def.roof, 0.88)); // opaque, so rims of neighbouring tiles join without seams
      if (exposed[0]) g.fillRect(rx - 0.5, ry - 0.5, rw + 1, RIM);
      if (exposed[1]) g.fillRect(rx + rw - RIM + 0.5, ry - 0.5, RIM, rh + 1);
      if (exposed[2]) g.fillRect(rx - 0.5, ry + rh - RIM + 0.5, rw + 1, RIM);
      if (exposed[3]) g.fillRect(rx - 0.5, ry - 0.5, RIM, rh + 1);
      if (hash01(col, row, 3) < UNIT_CHANCE) { // rooftop unit
        g.fillStyle(0x000000, 0.15).fillRect(rx + rw * (0.1 + hash01(col, row, 1) * 0.3), ry + rh * (0.1 + hash01(col, row, 2) * 0.3), 40, 28);
      }
    }
  }
}
