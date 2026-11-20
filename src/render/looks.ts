/** Outfit colours indexed by a person's `look`, shared by pedestrians and drivers. */
const SHIRTS = [0xc0392b, 0x2e86de, 0xf1c40f, 0x27ae60, 0xecf0f1, 0x8e44ad, 0xe67e22, 0x7f8c8d];

export const shirtColor = (look: number): number => SHIRTS[look % SHIRTS.length];
