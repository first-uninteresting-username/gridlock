// Turns a Tiled map (the raw .tmj JSON) into game data: the tile layer becomes the City, and the
// object layers become spawns. Works on plain JSON, with no Phaser involved.
import { isWeaponId, type WeaponId } from '../sim/weapons';
import { City, TILE_KINDS, type TileDef, type TileKind } from './City';

export interface TiledProperty {
  name: string;
  type?: string;
  value: unknown;
}

export type TiledProps = TiledProperty[] | Record<string, unknown>;

export interface TiledObject {
  x: number;
  y: number;
  width?: number;
  height?: number;
  name?: string;
  properties?: TiledProps;
}

export interface TiledLayer {
  name: string;
  type: string;
  data?: unknown;
  objects?: TiledObject[];
}

export interface TiledTileset {
  firstgid: number;
  tiles?: { id: number; properties?: TiledProps }[];
}

export interface TiledMap {
  width: number;
  height: number;
  tilewidth: number;
  tileheight: number;
  layers: TiledLayer[];
  tilesets: TiledTileset[];
}

export interface Spawn {
  x: number;
  y: number;
  /** Radians, 0 = east. Tiled stores degrees in the `heading` property. */
  a: number;
  color?: number;
}

export interface PickupSpawn {
  x: number;
  y: number;
  weapon: WeaponId;
  ammo: number;
}

export interface CityData {
  city: City;
  player: Spawn;
  cars: Spawn[];
  pickups: PickupSpawn[];
}

export const CAR_COLORS = [0xc0392b, 0x2e86de, 0xf1c40f, 0x27ae60, 0xecf0f1, 0x8e44ad, 0xe67e22, 0x2c3e50, 0x16a085];

export function prop(o: { properties?: TiledProps }, name: string): unknown {
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
export function hash01(x: number, y: number, salt: number): number {
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

/** Tiled stores flip/rotate flags in the top bits of a tile id; the id itself is the low 29 bits. */
const GID_MASK = 0x1fffffff;
const TILE_LAYER = 'tiles';
const DEFAULT_HEIGHT = 0.2;
const DEFAULT_ROOF = 0x8a8f98;

/** Looks up a tile's meaning from the custom properties of its tileset entry. */
function tileDef(map: TiledMap, gid: number, col: number, row: number): TileDef {
  const set = map.tilesets.filter((t) => t.firstgid <= gid).sort((a, b) => b.firstgid - a.firstgid)[0];
  const entry = set?.tiles?.find((t) => t.id === gid - set.firstgid);
  const where = `Tile ${gid} at column ${col}, row ${row}`;
  const kind = entry ? prop(entry, 'kind') : undefined;
  if (!entry || typeof kind !== 'string') {
    throw new Error(`${where} has no "kind" property (set it on the tile in the tileset: ${TILE_KINDS.join(', ')})`);
  }
  if (!TILE_KINDS.includes(kind as TileKind)) {
    throw new Error(`${where} has unknown kind "${kind}" (expected ${TILE_KINDS.join(', ')})`);
  }
  const height = prop(entry, 'height');
  return {
    kind: kind as TileKind,
    height: typeof height === 'number' ? height : DEFAULT_HEIGHT,
    roof: parseColor(prop(entry, 'roof')) ?? DEFAULT_ROOF,
  };
}

export function buildCityData(map: TiledMap): CityData {
  const layer = map.layers.find((l) => l.type === 'tilelayer' && l.name === TILE_LAYER);
  if (!layer) throw new Error(`Map has no tile layer named "${TILE_LAYER}"`);
  if (!Array.isArray(layer.data)) throw new Error(`Tile layer "${TILE_LAYER}" must use CSV encoding, with no compression`);
  const gids = layer.data as number[];
  if (gids.length !== map.width * map.height) throw new Error(`Tile layer "${TILE_LAYER}" does not match the map size`);

  // One TileDef per distinct tile type; cells hold the def's index + 1, 0 for an empty cell.
  const defs: TileDef[] = [];
  const indexByGid = new Map<number, number>();
  const cells = new Uint16Array(gids.length);
  gids.forEach((raw, i) => {
    const gid = raw & GID_MASK;
    if (gid === 0) return;
    let n = indexByGid.get(gid);
    if (n === undefined) {
      defs.push(tileDef(map, gid, i % map.width, Math.floor(i / map.width)));
      n = defs.length;
      indexByGid.set(gid, n);
    }
    cells[i] = n;
  });

  const objects = (name: string) => map.layers.find((l) => l.type === 'objectgroup' && l.name === name)?.objects ?? [];
  const player = objects('spawns').find((o) => o.name === 'player');
  if (!player) throw new Error('Map has no point named "player" in the "spawns" layer');
  return {
    city: new City(map.width, map.height, map.tilewidth, cells, defs),
    player: toSpawn(player, 0),
    cars: objects('cars').map(toSpawn),
    pickups: objects('pickups').map((o) => {
      const weapon = prop(o, 'weapon'), ammo = prop(o, 'ammo');
      if (!isWeaponId(weapon)) throw new Error(`Pickup at ${o.x},${o.y} has unknown weapon "${String(weapon)}"`);
      return { x: o.x, y: o.y, weapon, ammo: typeof ammo === 'number' ? ammo : 30 };
    }),
  };
}
