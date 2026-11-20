// The tile catalogue: what each tile in public/tiles/city.svg is. Used to draw the (pixel-art) tileset image
// (gen-tileset.mjs). The game reads the same information from the tile properties embedded in the
// map (public/maps/city.tmj), so keep the two in step when you add tiles.
//
// Properties a tile can carry (set them in Tiled: Tileset > select tile > Custom Properties):
//   kind    "road" | "sidewalk" | "grass" | "water" | "tree" | "building"  (required)
//   height  float, buildings only: roof lean, about 0.1 (low) to 0.5 (tower)
//   roof    color,  buildings only: roof colour

export const TILE_SIZE = 64;
export const ART_PIXEL = 2; // world px per art pixel; keep in step with ART_PIXEL in src/render/art.ts
export const COLUMNS = 10; // one column per roof colour; also the number of cells in the ground row
export const MARGIN = 1, SPACING = 2; // 1px extruded border around each tile stops bleeding when zoomed

export const ROOFS = ['#8a8f98', '#9b8b7a', '#7d8a7a', '#a3a09a', '#8c7f8f', '#b09a80', '#7f8c9c', '#6e8078', '#a08a7c', '#9a9a86'];
export const HEIGHTS = [0.12, 0.24, 0.36, 0.48]; // low, mid, tall, tower

// Ids (0-based, as Tiled shows them). Row 0 is ground; the following rows are buildings, one row per
// height and one column per roof colour; the last row holds ground added later (so existing ids never
// move). Painted map cells store id + 1 (Tiled's "gid").
const NATURE_ROW = 1 + HEIGHTS.length;
export const TILE = {
  ROAD: 0, DASH_H: 1, DASH_V: 2, SIDEWALK: 3, GRASS: 4,
  CROSSWALK_H: 5, CROSSWALK_V: 6, PARKING: 7, ARROW: 8, WATER: 9,
  TREES: COLUMNS * NATURE_ROW,
};
export const buildingId = (level, colour) => COLUMNS * (1 + level) + colour;

export const TILES = [
  { id: TILE.ROAD, kind: 'road' },
  { id: TILE.DASH_H, kind: 'road' }, // centre line along the bottom edge: use on the top lane's lower edge
  { id: TILE.DASH_V, kind: 'road' }, // centre line along the right edge
  { id: TILE.SIDEWALK, kind: 'sidewalk' },
  { id: TILE.GRASS, kind: 'grass' },
  { id: TILE.CROSSWALK_H, kind: 'road' }, // zebra stripes across a horizontal road
  { id: TILE.CROSSWALK_V, kind: 'road' }, // zebra stripes across a vertical road
  { id: TILE.PARKING, kind: 'road' }, // a kerbside parking bay
  { id: TILE.ARROW, kind: 'road' }, // right-pointing lane arrow
  { id: TILE.WATER, kind: 'water' }, // impassable pond or canal
  ...HEIGHTS.flatMap((height, level) =>
    ROOFS.map((roof, colour) => ({ id: buildingId(level, colour), kind: 'building', height, roof, level }))),
  { id: TILE.TREES, kind: 'tree' }, // solid woodland canopy
];
export const TILE_COUNT = COLUMNS * (NATURE_ROW + 1);

/** Tiled "tiles" entries (per-tile custom properties) for the tileset embedded in the map. */
export function tiledTiles() {
  return TILES.map((t) => ({
    id: t.id,
    properties: [
      { name: 'kind', type: 'string', value: t.kind },
      ...(t.kind === 'building'
        ? [{ name: 'height', type: 'float', value: t.height }, { name: 'roof', type: 'color', value: '#ff' + t.roof.slice(1) }]
        : []),
    ],
  }));
}
