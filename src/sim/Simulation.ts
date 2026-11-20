import { collideCars } from './collide';
import { stepCar, type Car } from './car';
import { findCarToEnter, findExitSpot, stepOnFoot, type Player } from './player';
import type { Input, SolidQuery } from './types';

/** All gameplay state and rules. Knows nothing about rendering or input devices. */
export class Simulation {
  constructor(
    readonly world: SolidQuery,
    readonly player: Player,
    readonly cars: Car[],
  ) {}

  /** Get into the nearest car, or out of the current one. Returns false if nothing happened. */
  toggleCar(): boolean {
    const p = this.player;
    if (p.car) {
      const spot = findExitSpot(p.car, p.r, this.world, this.cars);
      if (!spot) return false; // boxed in
      p.x = spot.x; p.y = spot.y; p.a = p.car.a; p.car = null;
      return true;
    }
    const car = findCarToEnter(p, this.cars);
    if (!car) return false;
    p.car = car;
    return true;
  }

  step(dt: number, input: Input): void {
    const p = this.player;
    for (const c of this.cars) stepCar(c, dt, c === p.car ? input : null, this.world);
    for (let i = 0; i < this.cars.length; i++)
      for (let j = i + 1; j < this.cars.length; j++) collideCars(this.cars[i], this.cars[j], this.world);
    if (p.car) { p.x = p.car.x; p.y = p.car.y; p.a = p.car.a; }
    else stepOnFoot(p, dt, input, this.world, this.cars);
  }
}
