import { describe, expect, it } from 'vitest';
import { carHitsWorld, carSpeed, createCar, stepCar } from '../src/sim/car';
import { collideCars } from '../src/sim/collide';
import { createPlayer } from '../src/sim/player';
import { Simulation } from '../src/sim/Simulation';
import { NO_INPUT, type Input, type SolidQuery } from '../src/sim/types';

const DT = 1 / 120;
const open: SolidQuery = { solidAt: () => false };
const wallAt500: SolidQuery = { solidAt: (x) => x >= 500 };
const gas: Input = { throttle: 1, steer: 0, handbrake: false };
const run = (seconds: number, f: () => void) => { for (let t = 0; t < seconds; t += DT) f(); };

describe('car', () => {
  it('accelerates forward and respects top speed', () => {
    const c = createCar(0, 0, 0, 0);
    run(1, () => stepCar(c, DT, gas, open));
    expect(c.vx).toBeGreaterThan(250);
    expect(Math.abs(c.vy)).toBeLessThan(1e-6);
    run(10, () => stepCar(c, DT, gas, open));
    expect(carSpeed(c)).toBeLessThanOrEqual(560 + 1e-6);
  });

  it('coasts to a stop without input', () => {
    const c = createCar(0, 0, 0, 0);
    c.vx = 300;
    run(4, () => stepCar(c, DT, null, open));
    expect(carSpeed(c)).toBeLessThan(1);
  });

  it('does not steer while stationary', () => {
    const c = createCar(0, 0, 0, 0);
    run(1, () => stepCar(c, DT, { throttle: 0, steer: 1, handbrake: false }, open));
    expect(c.a).toBe(0);
  });

  it('never ends up inside a wall at full speed', () => {
    const c = createCar(300, 0, 0, 0);
    run(3, () => {
      stepCar(c, DT, gas, wallAt500);
      expect(carHitsWorld(c, wallAt500)).toBe(false);
    });
    expect(c.x).toBeLessThan(500);
  });

  it('pushes overlapping cars apart and transfers momentum', () => {
    const a = createCar(0, 0, 0, 0), b = createCar(40, 0, 0, 0);
    a.vx = 200;
    expect(collideCars(a, b, open)).toBe(true);
    expect(collideCars(a, b, open)).toBe(false); // separated after one resolve
    expect(b.vx).toBeGreaterThan(0);
    expect(a.vx).toBeLessThan(200);
  });
});

describe('player', () => {
  it('gets into a nearby car and out beside it', () => {
    const car = createCar(100, 100, 0, 0);
    const sim = new Simulation(open, createPlayer(100, 100 - car.hw - 12, 0), [car]);
    expect(sim.toggleCar()).toBe(true);
    expect(sim.player.car).toBe(car);
    run(1, () => sim.step(DT, gas));
    expect(sim.player.x).toBe(car.x);
    run(5, () => sim.step(DT, NO_INPUT));
    expect(sim.toggleCar()).toBe(true);
    expect(sim.player.car).toBeNull();
    expect(Math.hypot(sim.player.x - car.x, sim.player.y - car.y)).toBeGreaterThan(car.hw);
  });

  it('cannot get into a car that is out of reach', () => {
    const sim = new Simulation(open, createPlayer(0, 0, 0), [createCar(200, 0, 0, 0)]);
    expect(sim.toggleCar()).toBe(false);
  });

  it('is shoved out of the way by a moving car', () => {
    const car = createCar(0, 0, 0, 0);
    car.vx = 300;
    const sim = new Simulation(open, createPlayer(60, 0, 0), [car]);
    run(0.5, () => sim.step(DT, NO_INPUT));
    const [p] = [sim.player];
    const inside = Math.abs(p.x - car.x) < car.hl && Math.abs(p.y - car.y) < car.hw;
    expect(inside).toBe(false);
  });
});
