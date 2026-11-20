import type { SolidQuery } from '../sim/types';

export interface Building {
  x: number;
  y: number;
  w: number;
  h: number;
  /** Fake-3D height: how far the roof leans away from the camera (0.1 low .. 0.4 tall). */
  height: number;
  roof: number;
  /** Rooftop unit position as a fraction of the roof (0..1). */
  unitU: number;
  unitV: number;
}

/** Collision for the city: buildings are solid, as is everything outside the map. */
export class City implements SolidQuery {
  private readonly cells: number[][];
  private readonly cols: number;
  private readonly rows: number;

  constructor(
    readonly width: number,
    readonly height: number,
    readonly buildings: readonly Building[],
    private readonly cellSize = 256,
  ) {
    this.cols = Math.ceil(width / cellSize);
    this.rows = Math.ceil(height / cellSize);
    this.cells = Array.from({ length: this.cols * this.rows }, () => []);
    buildings.forEach((b, i) => {
      const c0 = Math.max(0, Math.floor(b.x / cellSize)), c1 = Math.min(this.cols - 1, Math.floor((b.x + b.w) / cellSize));
      const r0 = Math.max(0, Math.floor(b.y / cellSize)), r1 = Math.min(this.rows - 1, Math.floor((b.y + b.h) / cellSize));
      for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) this.cells[r * this.cols + c].push(i);
    });
  }

  solidAt(x: number, y: number): boolean {
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) return true;
    const cell = this.cells[Math.floor(y / this.cellSize) * this.cols + Math.floor(x / this.cellSize)];
    for (const i of cell) {
      const b = this.buildings[i];
      if (x >= b.x && x < b.x + b.w && y >= b.y && y < b.y + b.h) return true;
    }
    return false;
  }
}
