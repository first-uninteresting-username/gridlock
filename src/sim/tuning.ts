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
