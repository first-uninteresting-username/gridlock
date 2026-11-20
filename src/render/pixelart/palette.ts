/**
 * The one legend shared by every pixel map. A character in a map is a key here; '.' is transparent.
 * Add a colour only when no row fits, and add it to the palette table in the gridlock-pixel-art skill too.
 * Colours with eight hex digits carry an alpha (rrggbbaa).
 */
export const PALETTE: Readonly<Record<string, string>> = {
  // Tintable body tones: the game multiplies these by a car's (or pedestrian's) colour.
  W: '#ffffff', // base
  S: '#bdbdbd', // shade
  D: '#8c8c8c', // deep shade
  // Overlays on top of a tinted body.
  O: '#ffffff2e', // light
  o: '#0000002e', // dark
  // Cars
  K: '#1b2430', // ink: glass, trim
  G: '#34465c', // glass glint
  B: '#101114', // tyre
  Y: '#ffe9a8', // headlight
  R: '#b3201b', // tail light
  // Wreck
  x: '#1c1c1c',
  X: '#0c0c0c',
  g: '#2c2622',
  // People
  p: '#2c5aa0', // player shirt
  q: '#3a6cb8', // player shirt light
  P: '#1f4178', // player shirt shade
  H: '#5a3a22', // player hair
  j: '#6e4a2e', // player hair light
  s: '#d9a877', // skin
  h: '#3b2a1e', // pedestrian hair
  f: '#222222', // shoe
  F: '#3a3a3a', // shoe light
  u: '#111111', // gun
  U: '#2c2c2c', // gun light
  // Ground props
  v: '#7a0f12', // blood
  w: '#96161a', // wet blood
  a: '#ffd23f', // accent
  e: '#ffd23f40', // accent glow
  c: '#1e1e22', // crate
  m: '#6fdc8c', // cash light
  n: '#2f7d46', // cash
  k: '#6fdc8c40', // cash glow
};
