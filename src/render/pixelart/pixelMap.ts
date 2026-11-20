import Phaser from 'phaser';
import { PALETTE } from './palette';

/** A sprite as text: one string per pixel row, one palette character per pixel, '.' for nothing. */
export type PixelMap = readonly string[];

export const mapWidth = (map: PixelMap): number => map[0].length;
export const mapHeight = (map: PixelMap): number => map.length;

/** Paints a map into a canvas texture at one texel per art pixel; the camera scales it up crisply. */
export function paintPixelMap(textures: Phaser.Textures.TextureManager, key: string, map: PixelMap): void {
  const w = mapWidth(map), h = mapHeight(map);
  const texture = textures.createCanvas(key, w, h);
  if (!texture) throw new Error(`Texture "${key}" already exists`);
  const ctx = texture.getContext();
  map.forEach((row, y) => {
    if (row.length !== w) throw new Error(`Pixel map "${key}": row ${y} is ${row.length} wide, expected ${w}`);
    for (let x = 0; x < w; x++) {
      const ch = row[x];
      if (ch === '.') continue;
      const colour = PALETTE[ch];
      if (colour === undefined) throw new Error(`Pixel map "${key}": no palette colour for "${ch}" at ${x},${y}`);
      ctx.fillStyle = colour;
      ctx.fillRect(x, y, 1, 1);
    }
  });
  texture.refresh();
  texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
}
