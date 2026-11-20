// Gameplay tuning in world pixels and seconds. One map tile is 64 px.

export const CAR = {
  halfLength: 24,
  halfWidth: 13,
  accel: 320,
  brake: 900,
  reverseAccel: 220,
  coastDrag: 120,
  handbrakeDrag: 450,
  maxSpeed: 560,
  maxReverse: 170,
  /** How fast sideways velocity dies off (1/s). Lower = more drift. */
  grip: 10,
  handbrakeGrip: 1.2,
  /** Turn rate at full lock (rad/s) once the car is rolling. */
  steerRate: 2.8,
  handbrakeSteerBoost: 1.5,
  /** Fraction of velocity kept (and reversed) when hitting a wall. */
  wallBounce: 0.3,
  /** Restitution of car-to-car hits. */
  carBounce: 0.3,
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
  carHealth: 100,
  /** Below this health a car smokes. */
  smokeBelow: 45,
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
  /** Gunshots scare pedestrians this close. */
  gunScareRange: 420,
  explosionScareRange: 600,
  /** How long a body lies there before that pedestrian is replaced by a fresh one. */
  corpseTime: 20,
  /** Replacements only appear at least this far from the player (just off screen). */
  respawnDistance: 900,
  /** Fraction of a car's velocity a run-over body is flung with. */
  knockback: 0.7,
} as const;
