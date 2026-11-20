import type { SolidQuery } from '../sim/types';

export type TileKind = 'road' | 'sidewalk' | 'grass' | 'building';
export const TILE_KINDS: readonly TileKind[] = ['road', 'sidewalk', 'grass', 'building'];

/** What a tile type means to the game; read from the tile's custom properties in Tiled. */
export interface TileDef {
  kind: TileKind;
  /** Buildings only. Fake-3D height: how far the roof leans away from the camera (0.1 low .. 0.4 tall). */
  height: number;
  /** Buildings only. Roof colour, 0xRRGGBB. */
  roof: number;
}

/**
 * The city as a grid of tiles. Each cell holds an index into `defs` (0 = nothing painted), so
 * terrain, streets and buildings all come from the same map layer. Buildings are solid, and so is
 * everything outside the map and every unpainted cell.
 */
export class City implements SolidQuery {
  readonly width: number;
  readonly height: number;

  /**
   * @param cells row-major, cols * rows entries; 0 = empty, n = defs[n - 1]
   */
  constructor(
    readonly cols: number,
    readonly rows: number,
    readonly tileSize: number,
    private readonly cells: Uint16Array,
    private readonly defs: readonly TileDef[],
  ) {
    this.width = cols * tileSize;
    this.height = rows * tileSize;
  }

  /** The tile at a tile coordinate, or null for empty cells and anywhere off the map. */
  tile(col: number, row: number): TileDef | null {
    if (col < 0 || row < 0 || col >= this.cols || row >= this.rows) return null;
    const n = this.cells[row * this.cols + col];
    return n === 0 ? null : this.defs[n - 1];
  }

  /** The tile under a world position, or null off the map / on an empty cell. */
  tileAt(x: number, y: number): TileDef | null {
    return this.tile(Math.floor(x / this.tileSize), Math.floor(y / this.tileSize));
  }

  /** What kind of ground is at a world position (null off the map or on an empty cell). */
  kindAt(x: number, y: number): TileKind | null {
    return this.tileAt(x, y)?.kind ?? null;
  }

  solidAt(x: number, y: number): boolean {
    const t = this.tileAt(x, y);
    return t === null || t.kind === 'building';
  }
}
