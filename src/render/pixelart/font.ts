import type { PixelMap } from './pixelMap';

/**
 * HUD art: a 5x7 bitmap font plus the few icons the status readouts need. Glyphs are painted in
 * white (`W`) so one texture per character can be tinted to any palette colour at runtime.
 */
export const FONT_ADVANCE = 6;

/** '#' is shorthand for a white pixel; the painter only understands palette characters. */
const glyph = (...rows: string[]): PixelMap => rows.map((row) => row.replaceAll('#', 'W'));

const GLYPHS: Record<string, PixelMap> = {
  A: glyph('.###.', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'),
  B: glyph('####.', '#...#', '#...#', '####.', '#...#', '#...#', '####.'),
  C: glyph('.####', '#....', '#....', '#....', '#....', '#....', '.####'),
  D: glyph('####.', '#...#', '#...#', '#...#', '#...#', '#...#', '####.'),
  E: glyph('#####', '#....', '#....', '####.', '#....', '#....', '#####'),
  F: glyph('#####', '#....', '#....', '####.', '#....', '#....', '#....'),
  G: glyph('.####', '#....', '#....', '#..##', '#...#', '#...#', '.###.'),
  H: glyph('#...#', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'),
  I: glyph('#####', '..#..', '..#..', '..#..', '..#..', '..#..', '#####'),
  J: glyph('..###', '...#.', '...#.', '...#.', '...#.', '#..#.', '.##..'),
  K: glyph('#...#', '#..#.', '#.#..', '##...', '#.#..', '#..#.', '#...#'),
  L: glyph('#....', '#....', '#....', '#....', '#....', '#....', '#####'),
  M: glyph('#...#', '##.##', '#.#.#', '#.#.#', '#...#', '#...#', '#...#'),
  N: glyph('#...#', '##..#', '#.#.#', '#..##', '#...#', '#...#', '#...#'),
  O: glyph('.###.', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'),
  P: glyph('####.', '#...#', '#...#', '####.', '#....', '#....', '#....'),
  Q: glyph('.###.', '#...#', '#...#', '#...#', '#.#.#', '#..#.', '.##.#'),
  R: glyph('####.', '#...#', '#...#', '####.', '#.#..', '#..#.', '#...#'),
  S: glyph('.####', '#....', '#....', '.###.', '....#', '....#', '####.'),
  T: glyph('#####', '..#..', '..#..', '..#..', '..#..', '..#..', '..#..'),
  U: glyph('#...#', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'),
  V: glyph('#...#', '#...#', '#...#', '#...#', '#...#', '.#.#.', '..#..'),
  W: glyph('#...#', '#...#', '#...#', '#.#.#', '#.#.#', '##.##', '#...#'),
  X: glyph('#...#', '#...#', '.#.#.', '..#..', '.#.#.', '#...#', '#...#'),
  Y: glyph('#...#', '#...#', '.#.#.', '..#..', '..#..', '..#..', '..#..'),
  Z: glyph('#####', '....#', '...#.', '..#..', '.#...', '#....', '#####'),
  '0': glyph('.###.', '#...#', '#..##', '#.#.#', '##..#', '#...#', '.###.'),
  '1': glyph('..#..', '.##..', '..#..', '..#..', '..#..', '..#..', '.###.'),
  '2': glyph('.###.', '#...#', '....#', '...#.', '..#..', '.#...', '#####'),
  '3': glyph('####.', '....#', '....#', '.###.', '....#', '....#', '####.'),
  '4': glyph('...#.', '..##.', '.#.#.', '#..#.', '#####', '...#.', '...#.'),
  '5': glyph('#####', '#....', '#....', '####.', '....#', '....#', '####.'),
  '6': glyph('.###.', '#....', '#....', '####.', '#...#', '#...#', '.###.'),
  '7': glyph('#####', '....#', '...#.', '..#..', '.#...', '.#...', '.#...'),
  '8': glyph('.###.', '#...#', '#...#', '.###.', '#...#', '#...#', '.###.'),
  '9': glyph('.###.', '#...#', '#...#', '.####', '....#', '....#', '.###.'),
  ' ': glyph('.....', '.....', '.....', '.....', '.....', '.....', '.....'),
  '.': glyph('.....', '.....', '.....', '.....', '.....', '.###.', '.###.'),
  ',': glyph('.....', '.....', '.....', '.....', '.###.', '.###.', '.#...'),
  '/': glyph('....#', '....#', '...#.', '..#..', '.#...', '#....', '#....'),
  '-': glyph('.....', '.....', '.....', '#####', '.....', '.....', '.....'),
  ':': glyph('.....', '.###.', '.###.', '.....', '.###.', '.###.', '.....'),
  $: glyph('..#..', '.####', '#.#..', '.###.', '..#.#', '####.', '..#..'),
  '!': glyph('..#..', '..#..', '..#..', '..#..', '..#..', '.....', '..#..'),
  '?': glyph('.###.', '#...#', '....#', '...#.', '..#..', '.....', '..#..'),
  "'": glyph('.#...', '.#...', '.....', '.....', '.....', '.....', '.....'),
  '·': glyph('.....', '.....', '.....', '.....', '.....', '.###.', '.###.'),
  '∞': glyph('.....', '.#.#.', '#...#', '#...#', '#...#', '.#.#.', '.....'),
};

/** Characters that cannot be used literally in a texture key. */
const KEY_NAMES: Record<string, string> = {
  ' ': 'space',
  '.': 'period',
  ',': 'comma',
  '/': 'slash',
  '-': 'dash',
  ':': 'colon',
  $: 'dollar',
  '!': 'bang',
  '?': 'question',
  "'": 'apostrophe',
  '·': 'dot',
  '∞': 'infinity',
};

/** Texture key for a character; anything outside the font falls back to '?'. */
export const glyphKey = (ch: string): string => `hud-glyph-${KEY_NAMES[ch] ?? (ch in GLYPHS ? ch : '?')}`;

/** All glyph textures, keyed for the boot-time painter. */
export const GLYPH_ART: Record<string, PixelMap> = Object.fromEntries(
  Object.entries(GLYPHS).map(([ch, map]) => [glyphKey(ch), map]),
);

/** Wanted stars and the cash icon. `D`/`K` keep the unlit states muted; `a`/`m`/`n` are palette accents. */
export const STAR_ON_ART: PixelMap = [
  '....a....',
  '....a....',
  '...aaa...',
  'aaaaaaaaa',
  '.aaaaaaa.',
  '..aaaaa..',
  '...aaa...',
  '..a...a..',
  '.a.....a.',
];

export const STAR_OFF_ART: PixelMap = [
  '....D....',
  '....D....',
  '...DDD...',
  'DDDDDDDDD',
  '.DDDDDDD.',
  '..DDDDD..',
  '...DDD...',
  '..D...D..',
  '.D.....D.',
];

export const COIN_ART: PixelMap = [
  '..nnn..',
  '.nmmmn.',
  'nmmmmmn',
  'nmmmmmn',
  'nmmmmmn',
  '.nmmmn.',
  '..nnn..',
];

/** Slot icons, all white so the HUD can tint the equipped and selected states. */
const FISTS_ICON_ART: PixelMap = [
  '.WW..WW.',
  'WWWWWWWW',
  'WWWWWWWW',
  '.WWWWWW.',
  '..WWWW..',
];

const KNIFE_ICON_ART: PixelMap = [
  '......WW',
  '.....WWW',
  '....WWW.',
  '.WWWWW..',
  'WWWWW...',
];

const PISTOL_ICON_ART: PixelMap = [
  '.WWWWWW.',
  'WW......',
  'WW......',
  '.WW.....',
  '..WW....',
];

const SMG_ICON_ART: PixelMap = [
  'WWWWWWWW',
  'WWWWWWW.',
  'WW..WW..',
  '.WW.....',
  '..WW....',
];

const EMPTY_SLOT_ICON_ART: PixelMap = [
  'WWWWWWWW',
  'W......W',
  'W......W',
  'W......W',
  'WWWWWWWW',
];

export const ICON_ART: Record<string, PixelMap> = {
  'hud-star-on': STAR_ON_ART,
  'hud-star-off': STAR_OFF_ART,
  'hud-coin': COIN_ART,
  'hud-fists': FISTS_ICON_ART,
  'hud-knife': KNIFE_ICON_ART,
  'hud-pistol': PISTOL_ICON_ART,
  'hud-smg': SMG_ICON_ART,
  'hud-slot-empty': EMPTY_SLOT_ICON_ART,
};
