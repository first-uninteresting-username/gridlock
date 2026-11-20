import type Phaser from 'phaser';
import { CAR_MODELS, CAR_MODEL_IDS, type CarModelId } from '../sim/models';

/** Every sprite is an SVG in public/art/, rasterised once at load. Sizes are in world pixels. */
const FIXED_SPRITES = {
  'car-shadow': [48, 26],
  'car-wheel': [10, 5],
  'player-foot': [6, 4],
  'player-body': [12, 20],
  'player-head': [10, 10],
  'gun-pistol': [9, 3],
  'gun-smg': [13, 6],
  'ped-body': [10, 16],
  'ped-head': [8, 8],
  'ped-blood': [30, 30],
  pickup: [40, 40],
} as const satisfies Record<string, readonly [number, number]>;

/** Each car model has its own body (tinted to the car's colour), trim and wreck, drawn at the size of its box. */
export type CarSpriteKey = `car-${CarModelId}-${'body' | 'trim' | 'wrecked'}`;

export type SpriteKey = keyof typeof FIXED_SPRITES | CarSpriteKey;

const SPRITES = { ...FIXED_SPRITES } as Record<SpriteKey, readonly [number, number]>;
for (const id of CAR_MODEL_IDS) {
  const m = CAR_MODELS[id];
  for (const part of ['body', 'trim', 'wrecked'] as const) SPRITES[`car-${id}-${part}`] = [m.halfLength * 2, m.halfWidth * 2];
}

export const carSprite = (id: CarModelId, part: 'body' | 'trim' | 'wrecked'): CarSpriteKey => `car-${id}-${part}`;

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
