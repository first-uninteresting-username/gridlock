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
  /** Forward speed while sprinting (Shift held). */
  sprintSpeed: 280,
  backSpeed: 90,
  turnRate: 4,
  /** How far from a car's body you can be and still get in. */
  enterReach: 22,
} as const;

/** px/s to the km/h shown on the HUD. */
export const KMH_PER_PX = 0.25;

/** Where a shot starts, relative to the shooter's centre. */
export const MUZZLE = {
  /** On foot: forward and to the right, where the gun is held. */
  footForward: 14,
  footSide: 4,
  /** In a car: how far past its outer edge, along the aim direction, the shot begins. */
  carMargin: 6,
} as const;

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

export const DRIVER = {
  /** Share of parked cars that start with someone in the driver's seat. */
  spawnChance: 0.6,
} as const;

export const PED = {
  radius: 7,
  /** How many pedestrians the city keeps alive. */
  count: 120,
  health: 24,
  walkSpeed: 52,
  runSpeed: 150,
  /** Seconds a pedestrian stays panicked after a scare. */
  fearTime: 3,
  /** A car faster than this scares pedestrians within `carScareRange` of its body. */
  carScareSpeed: 90,
  carScareRange: 70,
  /** A car faster than this kills pedestrians it touches; slower ones just shove them. */
  carKillSpeed: 120,
  /** Seconds a pedestrian needs to get clear of a road tile; the headway used when checking for traffic. */
  crossTime: 1.2,
  /** Base seconds a pedestrian waits at the kerb before trying a blocked crossing again. */
  kerbWait: 0.7,
  /** Gunshots scare pedestrians this close. */
  gunScareRange: 420,
  explosionScareRange: 600,
  /** How long a body lies there before that pedestrian is replaced by a fresh one. */
  corpseTime: 6,
  /** Replacements appear at least this far outside the camera view. */
  respawnMargin: 200,
  /** Stand-in for the view when none is known: how far from the player replacements appear. */
  respawnFallbackDistance: 1200,
  /** Fraction of a car's velocity a run-over body is flung with. */
  knockback: 0.7,
} as const;
