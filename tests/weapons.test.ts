import { describe, expect, it } from 'vitest';
import { createCar } from '../src/sim/car';
import { createPlayer } from '../src/sim/player';
import { Simulation, type Pickup } from '../src/sim/Simulation';
import { DAMAGE, PICKUP } from '../src/sim/tuning';
import { NO_INPUT, type Input, type SolidQuery } from '../src/sim/types';
import { WEAPONS } from '../src/sim/weapons';

const DT = 1 / 120;
const open: SolidQuery = { solidAt: () => false };
const fire: Input = { ...NO_INPUT, fire: true };
const run = (sim: Simulation, seconds: number, input: Input = NO_INPUT) => { for (let t = 0; t < seconds; t += DT) sim.step(DT, input); };
const noSpread = () => 0.5;
const shots = (sim: Simulation) => sim.events.filter((e) => e.type === 'shot').length;

/** Player at the origin facing east (+x). */
const setup = (cars = [createCar(200, 0, Math.PI / 2, 0)], world = open, pickups: Pickup[] = []) =>
  new Simulation(world, createPlayer(0, 0, 0), cars, pickups, noSpread);

describe('weapons', () => {
  it('pistol fires once per trigger press', () => {
    const sim = setup([]);
    run(sim, 1, fire);
    expect(shots(sim)).toBe(1);
    run(sim, 0.1);
    run(sim, 0.1, fire);
    expect(shots(sim)).toBe(2);
  });

  it('SMG fires continuously and uses ammo, then falls back to the pistol', () => {
    const sim = setup([]);
    sim.arsenal.ammo.smg = 5;
    sim.cycleWeapon();
    expect(sim.arsenal.current).toBe('smg');
    run(sim, 1, fire);
    expect(shots(sim)).toBe(5);
    expect(sim.arsenal.ammo.smg).toBeUndefined();
    expect(sim.arsenal.current).toBe('pistol');
  });

  it('does not shoot while driving', () => {
    const car = createCar(0, 20, 0, 0);
    const sim = setup([car]);
    sim.player.y = 20 - car.hw - 10;
    expect(sim.toggleCar()).toBe(true);
    run(sim, 0.5, fire);
    expect(shots(sim)).toBe(0);
  });

  it('bullets stop at walls', () => {
    const wall: SolidQuery = { solidAt: (x) => x >= 100 };
    const sim = setup([], wall);
    run(sim, 0.5, fire);
    const impact = sim.events.find((e) => e.type === 'impact');
    expect(impact).toMatchObject({ on: 'wall' });
    expect(sim.bullets).toHaveLength(0);
  });

  it('bullets damage and nudge cars', () => {
    const car = createCar(200, 0, Math.PI / 2, 0);
    const sim = setup([car]);
    run(sim, 0.3, fire);
    expect(car.health).toBe(DAMAGE.carHealth - WEAPONS.pistol.damage);
    expect(car.vx).toBeGreaterThan(0);
  });

  it('a destroyed car burns, explodes and sets nearby cars burning', () => {
    const target = createCar(200, 0, Math.PI / 2, 0), neighbour = createCar(200, 50, 0, 0);
    const sim = setup([target, neighbour]);
    sim.damageCar(target, DAMAGE.carHealth);
    expect(target.burning).not.toBeNull();
    run(sim, DAMAGE.burnTime + 0.1);
    expect(target.wrecked).toBe(true);
    expect(sim.events.some((e) => e.type === 'explosion')).toBe(true);
    expect(neighbour.burning).not.toBeNull();
    run(sim, DAMAGE.burnTime + 0.1);
    expect(neighbour.wrecked).toBe(true);
  });

  it('wrecks and burning cars cannot be entered; an exploding car throws the driver out', () => {
    const car = createCar(0, 30, 0, 0);
    const sim = setup([car]);
    sim.player.y = 30 - car.hw - 10;
    expect(sim.toggleCar()).toBe(true);
    sim.damageCar(car, DAMAGE.carHealth);
    run(sim, DAMAGE.burnTime + 0.1);
    expect(car.wrecked).toBe(true);
    expect(sim.player.car).toBeNull();
    expect(sim.toggleCar()).toBe(false);
  });

  it('pickups give ammo, switch to a new weapon and respawn', () => {
    const pickup: Pickup = { x: 0, y: 0, weapon: 'smg', ammo: 60, respawn: 0 };
    const sim = setup([], open, [pickup]);
    run(sim, DT);
    expect(sim.arsenal.ammo.smg).toBe(60);
    expect(sim.arsenal.current).toBe('smg');
    expect(pickup.respawn).toBeGreaterThan(0);
    run(sim, PICKUP.respawn + 0.1);
    expect(sim.arsenal.ammo.smg).toBe(120);
  });
});
