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

/** Hair covers the back of the head (left), skin shows at the front. */
export const PED_HEAD_ART: PixelMap = [
  '.hs.',
  'hhss',
  'hhss',
  '.hs.',
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
