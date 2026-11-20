import type { PixelMap } from './pixelMap';

/** The player, pedestrians and weapons, facing right. Legend: palette.ts. */

export const PLAYER_FOOT_ART: PixelMap = [
  'FFF',
  'fff',
];

/** Seen from above: shoulders run top to bottom. */
export const PLAYER_BODY_ART: PixelMap = [
  '..qq..',
  '.qqpp.',
  'qppppp',
  'pppppp',
  'pppppp',
  'pppppp',
  'pppppP',
  'pppPPP',
  '.PPPP.',
  '..PP..',
];

export const PLAYER_HEAD_ART: PixelMap = [
  '.HHH.',
  'HjjHH',
  'HHHHH',
  'HHHHH',
  '.HHH.',
];

/** White so each pedestrian can be tinted to a shirt colour. */
export const PED_BODY_ART: PixelMap = [
  '.WWW.',
  'WWWWW',
  'WWWWW',
  'WWWWW',
  'WWWWS',
  'WWWWS',
  'SSSSS',
  '.SDS.',
];

/** Hair covers the back of the head (left), skin shows at the front. Also used for seated drivers. */
export const PED_HEAD_ART: PixelMap = [
  '.hs.',
  'hhss',
  'hhss',
  '.hs.',
];

/**
 * A pedestrian sprawled on the ground, seen from above. Replaces the upright body and head on death:
 * pale skin and dull, bloodstained clothes read as a corpse rather than a person who merely fell over.
 * Head to the right, feet to the left, arms flung out top and bottom. Legend: palette.ts.
 */
export const CORPSE_ART: PixelMap = [
  '...........',
  '.......z...',
  '.......C...',
  'ffCCCCCChhh',
  '..CCCwvChzz',
  'fCCCCxxxhZz',
  '.......C...',
  '.......z...',
  '...........',
];

/** A seated driver's shoulders, seen from above; tinted to the shirt colour. */
export const DRIVER_BODY_ART: PixelMap = [
  '.WWW.',
  'WWWWW',
  'WWWWW',
  '.SDS.',
];

export const GUN_PISTOL_ART: PixelMap = [
  'UUUUU',
  'uu...',
];

export const GUN_SMG_ART: PixelMap = [
  'UUUUUUU',
  'uuuuuuu',
  '..uu...',
];

/** Bare hand in the right-hand slot, small enough not to crowd the player sprite. */
export const FIST_ART: PixelMap = [
  'sss',
  'sss',
];

/** Held by the handle at the hand's position, blade pointing right. */
export const KNIFE_ART: PixelMap = [
  'uuUUUU',
  'uuUU..',
];
