// Turns Tiled object layers into game data. Works on the raw Tiled JSON shape, which is also
// what Phaser's Tilemap#getObjectLayer() returns, so it can be tested without Phaser.
import { City, type Building } from './City';

export interface TiledProperty {
  name: string;
  type?: string;
  value: unknown;
}

export interface TiledObject {
  x: number;
  y: number;
  width?: number;
  height?: number;
  name?: string;
  properties?: TiledProperty[] | Record<string, unknown>;
}

export interface Spawn {
  x: number;
  y: number;
  /** Radians, 0 = east. Tiled stores degrees in the `heading` property. */
  a: number;
  color?: number;
}

export interface CityData {
  city: City;
  player: Spawn;
  cars: Spawn[];
}

export const CAR_COLORS = [0xc0392b, 0x2e86de, 0xf1c40f, 0x27ae60, 0xecf0f1, 0x8e44ad, 0xe67e22, 0x2c3e50, 0x16a085];

export function prop(o: TiledObject, name: string): unknown {
  const p = o.properties;
  if (!p) return undefined;
  if (Array.isArray(p)) return p.find((q) => q.name === name)?.value;
  return p[name];
}

/** Tiled colours are "#AARRGGBB" (or "#RRGGBB"); returns 0xRRGGBB. */
export function parseColor(v: unknown): number | undefined {
  if (typeof v !== 'string' || !v.startsWith('#')) return undefined;
  const hex = v.length === 9 ? v.slice(3) : v.slice(1);
  const n = parseInt(hex, 16);
  return Number.isNaN(n) ? undefined : n;
}

/** Small deterministic hash so the same building always looks the same. */
function hash01(x: number, y: number, salt: number): number {
  let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(salt, 2147483647)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

const toSpawn = (o: TiledObject, i: number): Spawn => {
  const heading = prop(o, 'heading');
  return {
    x: o.x,
    y: o.y,
    a: ((typeof heading === 'number' ? heading : 0) * Math.PI) / 180,
    color: parseColor(prop(o, 'color')) ?? CAR_COLORS[Math.floor(hash01(o.x, o.y, i) * CAR_COLORS.length)],
  };
};

export function buildCityData(
  widthPx: number,
  heightPx: number,
  layers: { buildings: TiledObject[]; spawns: TiledObject[]; cars: TiledObject[] },
): CityData {
  const buildings: Building[] = layers.buildings.map((o) => {
    const h = prop(o, 'height');
    return {
      x: o.x, y: o.y, w: o.width ?? 0, h: o.height ?? 0,
      height: typeof h === 'number' ? h : 0.2,
      roof: parseColor(prop(o, 'roof')) ?? 0x8a8f98,
      unitU: 0.2 + hash01(o.x, o.y, 1) * 0.5,
      unitV: 0.2 + hash01(o.x, o.y, 2) * 0.5,
    };
  });
  const player = layers.spawns.find((o) => o.name === 'player');
  if (!player) throw new Error('Map has no point named "player" in the "spawns" layer');
  return {
    city: new City(widthPx, heightPx, buildings),
    player: toSpawn(player, 0),
    cars: layers.cars.map(toSpawn),
  };
}
