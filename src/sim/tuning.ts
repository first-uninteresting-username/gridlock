// Gameplay tuning in world pixels and seconds. One map tile is 64 px.

// Per-model size, health and handling live in models.ts; these apply to every car.
export const CAR = {
  /** Fraction of velocity kept (and reversed) when hitting a wall. */
  wallBounce: 0.3,
  /** Restitution of car-to-car hits. */
  carBounce: 0.3,
  /** Speed at which the camera is fully zoomed out. */
  cameraRefSpeed: 560,
  /** Front wheels turn this far (rad) at full steering lock, for looks only. */
  wheelLock: 0.5,
} as const;

export const PLAYER = {
  radius: 9,
  walkSpeed: 160,
  backSpeed: 90,
  turnRate: 4,
  /** How far from a car's body you can be and still get in. */
  enterReach: 22,
} as const;

/** px/s to the km/h shown on the HUD. */
export const KMH_PER_PX = 0.25;

export const DAMAGE = {
  /** Below this fraction of its full health a car smokes. */
  smokeBelow: 0.45,
  /** Seconds a car burns before it explodes. */
  burnTime: 2.2,
  explosionRadius: 130,
  /** Damage at the centre of a blast, falling off linearly to 0 at the radius. */
  explosionDamage: 180,
  explosionImpulse: 420,
  /** Speed added to a car per bullet hit, in the bullet's direction. */
  bulletImpulse: 18,
} as const;

export const PICKUP = {
  radius: 22,
  respawn: 30,
} as const;
