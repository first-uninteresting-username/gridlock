import type Phaser from 'phaser';
import { CAR_MODELS, CAR_MODEL_IDS, type CarModelId } from '../sim/models';
import { CAR_ART } from './pixelart/cars';
import { DRIVER_BODY_ART, GUN_PISTOL_ART, GUN_SMG_ART, PED_BODY_ART, PED_HEAD_ART, PLAYER_BODY_ART, PLAYER_FOOT_ART, PLAYER_HEAD_ART } from './pixelart/people';
import { mapHeight, mapWidth, paintPixelMap, type PixelMap } from './pixelart/pixelMap';
import { BLOOD_ART, CASH_ART, PICKUP_ART, WHEEL_ART } from './pixelart/props';

/**
 * World pixels per art pixel. Every sprite is a text pixel map (src/render/pixelart/), painted into a
 * texture once at boot with one texel per art pixel, and shown at this scale. The game canvas is
 * rendered at one canvas pixel per art pixel, so this is also the size of the chunky pixels you see.
 * Keep it in step with ART_PIXEL in tools/tiles.mjs.
 */
export const ART_PIXEL = 2;

const FIXED_SPRITES = {
  'car-wheel': WHEEL_ART,
  'player-foot': PLAYER_FOOT_ART,
  'player-body': PLAYER_BODY_ART,
  'player-head': PLAYER_HEAD_ART,
  'gun-pistol': GUN_PISTOL_ART,
  'gun-smg': GUN_SMG_ART,
  'ped-body': PED_BODY_ART,
  'ped-head': PED_HEAD_ART,
  'driver-body': DRIVER_BODY_ART,
  'ped-blood': BLOOD_ART,
  pickup: PICKUP_ART,
  cash: CASH_ART,
} as const satisfies Record<string, PixelMap>;

/** Each car model has its own body (tinted to the car's colour), trim and wreck, drawn at the size of its box. */
export type CarSpriteKey = `car-${CarModelId}-${'body' | 'trim' | 'wrecked'}`;

export type SpriteKey = keyof typeof FIXED_SPRITES | CarSpriteKey;

const SPRITES = { ...FIXED_SPRITES } as Record<SpriteKey, PixelMap>;
for (const id of CAR_MODEL_IDS) {
  for (const part of ['body', 'trim', 'wrecked'] as const) SPRITES[`car-${id}-${part}`] = CAR_ART[id][part];
}

export const carSprite = (id: CarModelId, part: 'body' | 'trim' | 'wrecked'): CarSpriteKey => `car-${id}-${part}`;

/** The size a sprite is displayed at, in world pixels. */
const worldSize = (map: PixelMap): [number, number] => [mapWidth(map) * ART_PIXEL, mapHeight(map) * ART_PIXEL];

/** Paints every sprite into a texture. Call once, from the boot scene's create(). */
export function paintArt(textures: Phaser.Textures.TextureManager): void {
  for (const id of CAR_MODEL_IDS) {
    const { halfLength, halfWidth } = CAR_MODELS[id];
    for (const part of ['body', 'trim', 'wrecked'] as const) {
      const [w, h] = worldSize(CAR_ART[id][part]);
      if (w !== halfLength * 2 || h !== halfWidth * 2) {
        throw new Error(`car-${id}-${part} is ${w}x${h} world px but the ${id} box is ${halfLength * 2}x${halfWidth * 2}`);
      }
    }
  }
  for (const [key, map] of Object.entries(SPRITES)) paintPixelMap(textures, key, map);
}

/** Adds an art sprite displayed at its world size. */
export function addSprite(scene: Phaser.Scene, key: SpriteKey, x = 0, y = 0): Phaser.GameObjects.Image {
  const img = scene.add.image(x, y, key);
  return setSprite(img, key);
}

/** Points an existing sprite at another art texture, keeping the world-size scale. */
export function setSprite(img: Phaser.GameObjects.Image, key: SpriteKey): Phaser.GameObjects.Image {
  const [w, h] = worldSize(SPRITES[key]);
  return img.setTexture(key).setDisplaySize(w, h);
}
