// The car catalogue: every model's size, health, wheels and handling. Units are world pixels and
// seconds. `sedan` is the baseline the others are tuned against.

export interface Axle {
  /** Distance from the car's centre, positive towards the front. */
  readonly x: number;
  /** One wheel on the centre line, or a pair either side. */
  readonly wheels: 1 | 2;
  /** Front-wheel steering: these wheels visibly turn with the steering input. */
  readonly steered?: boolean;
}

/** Where the driver sits, in car-local world px: x forward, y to the car's right (negative = left). */
export interface Seat {
  readonly x: number;
  readonly y: number;
}

export interface Handling {
  accel: number;
  brake: number;
  reverseAccel: number;
  coastDrag: number;
  handbrakeDrag: number;
  maxSpeed: number;
  maxReverse: number;
  /** How fast sideways velocity dies off (1/s). Lower = more drift. */
  grip: number;
  handbrakeGrip: number;
  /** Turn rate at full lock (rad/s) once the car is rolling. */
  steerRate: number;
  handbrakeSteerBoost: number;
}

export type CarModelId = 'sedan' | 'compact' | 'sports' | 'van' | 'lorry' | 'trike';

export interface CarModel {
  readonly id: CarModelId;
  readonly name: string;
  readonly halfLength: number;
  readonly halfWidth: number;
  readonly health: number;
  /** Relative weight: heavier cars shove lighter ones around in a crash. */
  readonly mass: number;
  readonly axles: readonly Axle[];
  /** Driver's seat, lined up with the cabin glass in this model's trim art. */
  readonly driverSeat: Seat;
  readonly handling: Readonly<Handling>;
  /** How common the model is among the map's cars that don't name one. */
  readonly spawnWeight: number;
}

const sedanHandling: Handling = {
  accel: 320,
  brake: 900,
  reverseAccel: 220,
  coastDrag: 120,
  handbrakeDrag: 450,
  maxSpeed: 560,
  maxReverse: 170,
  grip: 10,
  handbrakeGrip: 1.2,
  steerRate: 2.8,
  handbrakeSteerBoost: 1.5,
};

const handling = (o: Partial<Handling>): Handling => ({ ...sedanHandling, ...o });

export const CAR_MODELS: Readonly<Record<CarModelId, CarModel>> = {
  sedan: {
    id: 'sedan', name: 'Sedan',
    halfLength: 24, halfWidth: 13, health: 100, mass: 1, spawnWeight: 30,
    axles: [{ x: 15, wheels: 2, steered: true }, { x: -15, wheels: 2 }],
    driverSeat: { x: -8, y: -4 },
    handling: sedanHandling,
  },
  // Small and light: dies fast, but is nimble and grips well.
  compact: {
    id: 'compact', name: 'Compact',
    halfLength: 19, halfWidth: 11, health: 70, mass: 0.7, spawnWeight: 25,
    axles: [{ x: 12, wheels: 2, steered: true }, { x: -12, wheels: 2 }],
    driverSeat: { x: -6, y: -3 },
    handling: handling({ accel: 300, maxSpeed: 470, grip: 12.5, steerRate: 3.4, handbrakeGrip: 1.6 }),
  },
  // Fastest car, but the tail steps out easily.
  sports: {
    id: 'sports', name: 'Sports car',
    halfLength: 25, halfWidth: 12, health: 80, mass: 0.9, spawnWeight: 15,
    axles: [{ x: 16, wheels: 2, steered: true }, { x: -16, wheels: 2 }],
    driverSeat: { x: -8, y: -3 },
    handling: handling({ accel: 460, maxSpeed: 700, grip: 7, steerRate: 2.6, handbrakeGrip: 0.9, coastDrag: 90 }),
  },
  // Roomy and tough, slow to get going and to turn.
  van: {
    id: 'van', name: 'Van',
    halfLength: 29, halfWidth: 14, health: 150, mass: 1.7, spawnWeight: 12,
    axles: [{ x: 19, wheels: 2, steered: true }, { x: -18, wheels: 2 }],
    // Cab is at the front; the rest of the van is cargo.
    driverSeat: { x: 15, y: -4 },
    handling: handling({ accel: 220, brake: 700, maxSpeed: 420, maxReverse: 140, grip: 9, steerRate: 2.1, handbrakeDrag: 380 }),
  },
  // Six wheels and a lot of steel. Slow to get going and swings wide, but nothing pushes it around.
  lorry: {
    id: 'lorry', name: 'Lorry',
    halfLength: 40, halfWidth: 15, health: 260, mass: 3.5, spawnWeight: 8,
    axles: [{ x: 28, wheels: 2, steered: true }, { x: -12, wheels: 2 }, { x: -26, wheels: 2 }],
    driverSeat: { x: 21, y: -4 },
    handling: handling({ accel: 170, brake: 600, reverseAccel: 140, maxSpeed: 340, maxReverse: 110, grip: 8, steerRate: 1.6, handbrakeDrag: 300, handbrakeGrip: 1.8 }),
  },
  // Three wheels: tiny, twitchy and flimsy.
  trike: {
    id: 'trike', name: 'Trike',
    halfLength: 14, halfWidth: 9, health: 40, mass: 0.4, spawnWeight: 10,
    axles: [{ x: 10, wheels: 1, steered: true }, { x: -9, wheels: 2 }],
    driverSeat: { x: -5, y: -2 },
    handling: handling({ accel: 280, maxSpeed: 380, maxReverse: 130, grip: 6, steerRate: 4.2, handbrakeGrip: 1, handbrakeSteerBoost: 1.3 }),
  },
};

export const CAR_MODEL_IDS = Object.keys(CAR_MODELS) as CarModelId[];

export const isCarModelId = (v: unknown): v is CarModelId => typeof v === 'string' && v in CAR_MODELS;

export const wheelCount = (m: CarModel): number => m.axles.reduce((n, a) => n + a.wheels, 0);
