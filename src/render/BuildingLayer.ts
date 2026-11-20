import Phaser from 'phaser';
import type { Building } from '../world/City';

// Wall shades for the north, east, south and west faces.
const WALLS = [0x4a4a52, 0x3c3c44, 0x5a5a62, 0x44444c];

/**
 * Draws buildings with a fake-3D lean: each roof is the footprint scaled away from the camera
 * centre by (1 + height), and the walls fill the gap. Redrawn every frame.
 */
export class BuildingLayer {
  private readonly g: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene, private readonly buildings: readonly Building[]) {
    this.g = scene.add.graphics().setDepth(10);
  }

  draw(camX: number, camY: number, view: Phaser.Geom.Rectangle): void {
    const g = this.g, m = 200;
    g.clear();
    const dist = (b: Building) => Math.hypot(b.x + b.w / 2 - camX, b.y + b.h / 2 - camY);
    const visible = this.buildings
      .filter((b) => b.x < view.right + m && b.x + b.w > view.x - m && b.y < view.bottom + m && b.y + b.h > view.y - m)
      .sort((a, b) => dist(b) - dist(a)); // far first, so nearer (taller-looking) roofs overlap them

    for (const b of visible) {
      const k = 1 + b.height;
      const base = [[b.x, b.y], [b.x + b.w, b.y], [b.x + b.w, b.y + b.h], [b.x, b.y + b.h]];
      const roof = base.map(([x, y]) => [camX + (x - camX) * k, camY + (y - camY) * k]);
      for (let i = 0; i < 4; i++) {
        const j = (i + 1) % 4;
        g.fillStyle(WALLS[i]);
        g.beginPath();
        g.moveTo(base[i][0], base[i][1]);
        g.lineTo(base[j][0], base[j][1]);
        g.lineTo(roof[j][0], roof[j][1]);
        g.lineTo(roof[i][0], roof[i][1]);
        g.closePath();
        g.fillPath();
      }
      const rx = roof[0][0], ry = roof[0][1], rw = roof[1][0] - rx, rh = roof[3][1] - ry;
      g.fillStyle(b.roof).fillRect(rx, ry, rw, rh);
      g.lineStyle(6, 0x000000, 0.18).strokeRect(rx + 3, ry + 3, rw - 6, rh - 6);
      g.fillStyle(0x000000, 0.15).fillRect(rx + rw * b.unitU, ry + rh * b.unitV, 40, 28); // rooftop unit
    }
  }
}
