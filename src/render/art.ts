import type Phaser from 'phaser';

/** Every sprite is an SVG in public/art/, rasterised once at load. Sizes are in world pixels. */
const SPRITES = {
  'car-body': [48, 26],
  'car-trim': [48, 26],
  'car-wrecked': [48, 26],
  'car-shadow': [48, 26],
  'player-foot': [6, 4],
  'player-body': [12, 20],
  'player-head': [10, 10],
  'gun-pistol': [9, 3],
  'gun-smg': [13, 6],
  pickup: [40, 40],
} as const satisfies Record<string, readonly [number, number]>;

export type SpriteKey = keyof typeof SPRITES;

/** Textures are rasterised at this multiple of their world size so they stay sharp when the camera zooms in. */
const RASTER_SCALE = 4;

export function loadArt(load: Phaser.Loader.LoaderPlugin): void {
  for (const [key, [w, h]] of Object.entries(SPRITES)) {
    load.svg(key, `art/${key}.svg`, { width: w * RASTER_SCALE, height: h * RASTER_SCALE });
  }
}

/** Adds an art sprite displayed at its world size. */
export function addSprite(scene: Phaser.Scene, key: SpriteKey, x = 0, y = 0): Phaser.GameObjects.Image {
  const img = scene.add.image(x, y, key);
  return setSprite(img, key);
}

/** Points an existing sprite at another art texture, keeping the world-size scale. */
export function setSprite(img: Phaser.GameObjects.Image, key: SpriteKey): Phaser.GameObjects.Image {
  const [w, h] = SPRITES[key];
  return img.setTexture(key).setDisplaySize(w, h);
}
