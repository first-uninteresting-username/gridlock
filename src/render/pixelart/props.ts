import type { PixelMap } from './pixelMap';

/** Ground props: weapon crate, cash bundle and the blood pool under a dead pedestrian. Legend: palette.ts. */

export const PICKUP_ART: PixelMap = [
    '....................',
    '......eeeeeeee......',
    '....eeeeeeeeeeee....',
    '...eeeeeeeeeeeeee...',
    '..eeeeeeeeeeeeeeee..',
    '..eeeeeeeeeeeeeeee..',
    '.eeeeaaaaaaaaaaeeee.',
    '.eeeaccccccccccaeee.',
    '.eeeacaaaaaaaacaeee.',
    '.eeeacaaaaaaaccaeee.',
    '.eeeacaacccccccaeee.',
    '.eeeacaacccccccaeee.',
    '.eeeaccccccccccaeee.',
    '.eeeeaaaaaaaaaaeeee.',
    '..eeeeeeeeeeeeeeee..',
    '..eeeeeeeeeeeeeeee..',
    '...eeeeeeeeeeeeee...',
    '....eeeeeeeeeeee....',
    '......eeeeeeee......',
    '....................',
];

export const CASH_ART: PixelMap = [
    '....................',
    '......kkkkkkkk......',
    '....kkkkkkkkkkkk....',
    '...kkkkkkkkkkkkkk...',
    '..kkkkkkkkkkkkkkkk..',
    '..kkkkkkkkkkkkkkkk..',
    '.kkmmmmmmmmmmmmmmkk.',
    '.kkmnnnnnnnnnnnnmkk.',
    '.kkmnmnnnmmnnnnnmkk.',
    '.kkmnnnnmnnmnnnnmkk.',
    '.kkmnnnnmnnmnnnnmkk.',
    '.kkmnnnnnmmnnnmnmkk.',
    '.kkmnnnnnnnnnnnnmkk.',
    '.kkmmmmmmmmmmmmmmkk.',
    '..kkkkkkkkkkkkkkkk..',
    '..kkkkkkkkkkkkkkkk..',
    '...kkkkkkkkkkkkkk...',
    '....kkkkkkkkkkkk....',
    '......kkkkkkkk......',
    '....................',
];

export const BLOOD_ART: PixelMap = [
    '...............',
    '.......v....v..',
    '.v..vvvvvvv....',
    '...vvvvvvvvv...',
    '..vvwwvvvvvvv..',
    '..vvwvvvvvvvv..',
    '.vvvvvvvvvvvv..',
    '.vvvvvvvvvvvvv.',
    '.vvvvvvvvvvvv..',
    '.vvvvvvvvvvvv..',
    '..vvvvvvvvvvv..',
    '...vvvvvvvvv.v.',
    '....vvvvvvv....',
    '..v....v.......',
    '...............',
];

/** A single tyre-black pixel, stretched by the car view to each wheel's size. */
export const WHEEL_ART: PixelMap = ['B'];
