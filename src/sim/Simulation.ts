import { collideCars } from './collide';
import { carContains, carSpeed, stepCar, type Car } from './car';
import { createPedestrian, killPedestrian, panic, resetPedestrian, sidewalkSpots, stepPedestrian, type Pedestrian } from './pedestrian';
import { findCarToEnter, findExitSpot, stepOnFoot, type Player } from './player';
import { DAMAGE, PED, PICKUP } from './tuning';
import type { Input, World } from './types';
import { createArsenal, WEAPON_ORDER, WEAPONS, type Arsenal, type Bullet, type WeaponId } from './weapons';

export interface Pickup {
  readonly x: number;
  readonly y: number;
  readonly weapon: WeaponId;
  readonly ammo: number;
  /** Seconds until it reappears; 0 = available. */
  respawn: number;
}

/** Things that happened during a step, for the renderer to turn into effects and sounds. */
export type SimEvent =
  | { type: 'shot'; x: number; y: number; a: number; weapon: WeaponId }
  | { type: 'impact'; x: number; y: number; on: 'wall' | 'car' | 'ped' }
  | { type: 'ignite'; car: Car }
  | { type: 'explosion'; x: number; y: number }
  | { type: 'pickup'; x: number; y: number; weapon: WeaponId }
  | { type: 'pedKilled'; ped: Pedestrian; by: 'bullet' | 'car' | 'explosion' };

/** Highest wanted level. */
export const MAX_WANTED = 5;

/** All gameplay state and rules. Knows nothing about rendering or input devices. */
export class Simulation {
  readonly bullets: Bullet[] = [];
  readonly pedestrians: Pedestrian[] = [];
  readonly arsenal: Arsenal = createArsenal();
  /**
   * The world rectangle the camera shows, kept up to date by the renderer. Replacement pedestrians
   * only appear outside it. Until it is set, they just appear far from the player.
   */
  view: { x: number; y: number; width: number; height: number } | null = null;
  /** Wanted level, 0..MAX_WANTED. Displayed only; nothing raises it or reacts to it yet. */
  wanted = 0;
  /** Filled during step(); the consumer clears it after reading. */
  readonly events: SimEvent[] = [];

  /** Where pedestrians can be placed: the centre of every sidewalk tile. */
  private readonly spots: [number, number][];

  constructor(
    readonly world: World,
    readonly player: Player,
    readonly cars: Car[],
    readonly pickups: Pickup[] = [],
    /** Random source for weapon spread; injectable for tests. */
    private readonly random: () => number = Math.random,
  ) {
    this.spots = sidewalkSpots(world);
  }

  /** Fill the city with `count` pedestrians on random sidewalks, none right next to the player. */
  populate(count: number): void {
    for (let i = 0; i < count; i++) {
      const spot = this.randomSpot(300);
      if (spot) this.pedestrians.push(createPedestrian(spot[0], spot[1], this.random));
    }
  }

  /** A random sidewalk spot at least `minDist` from the player, or null if none turned up. */
  private randomSpot(minDist: number, outsideView = false): [number, number] | null {
    const p = this.player, v = this.view, m = PED.respawnMargin;
    for (let tries = 0; tries < 30 && this.spots.length > 0; tries++) {
      const s = this.spots[Math.floor(this.random() * this.spots.length)];
      if (Math.hypot(s[0] - p.x, s[1] - p.y) < minDist) continue;
      // The margin covers the camera catching up to a fast car and the pedestrian's own size.
      if (outsideView && v && s[0] > v.x - m && s[0] < v.x + v.width + m && s[1] > v.y - m && s[1] < v.y + v.height + m) continue;
      return s;
    }
    return null;
  }

  /** Get into the nearest car, or out of the current one. Returns false if nothing happened. */
  toggleCar(): boolean {
    const p = this.player;
    if (p.car) return this.leaveCar(false);
    const car = findCarToEnter(p, this.cars);
    if (!car) return false;
    p.car = car;
    return true;
  }

  /** Switch to the next weapon that has ammo. */
  cycleWeapon(): void {
    const owned = WEAPON_ORDER.filter((w) => (this.arsenal.ammo[w] ?? 0) > 0);
    const i = owned.indexOf(this.arsenal.current);
    this.arsenal.current = owned[(i + 1) % owned.length];
    this.arsenal.cooldown = 0;
  }

  step(dt: number, input: Input): void {
    const p = this.player;
    for (const c of this.cars) {
      stepCar(c, dt, c === p.car && !c.wrecked ? input : null, this.world);
      if (c.burning !== null && (c.burning -= dt) <= 0) this.explode(c);
    }
    for (let i = 0; i < this.cars.length; i++)
      for (let j = i + 1; j < this.cars.length; j++) collideCars(this.cars[i], this.cars[j], this.world);
    if (p.car) { p.x = p.car.x; p.y = p.car.y; p.a = p.car.a; }
    else stepOnFoot(p, dt, input, this.world, this.cars);

    this.stepPedestrians(dt);
    this.stepTrigger(dt, input);
    this.stepBullets(dt);
    this.stepPickups(dt);
  }

  damageCar(c: Car, amount: number): void {
    if (c.wrecked) return;
    c.health -= amount;
    if (c.health <= 0 && c.burning === null) {
      c.health = 0;
      c.burning = DAMAGE.burnTime;
      this.events.push({ type: 'ignite', car: c });
    }
  }

  /** Hurt a pedestrian; at zero health they die and get flung along (`kx`, `ky`). */
  damagePedestrian(p: Pedestrian, amount: number, by: 'bullet' | 'car' | 'explosion', kx = 0, ky = 0): void {
    if (p.state === 'dead') return;
    p.health -= amount;
    if (p.health > 0) return;
    killPedestrian(p, kx, ky);
    this.events.push({ type: 'pedKilled', ped: p, by });
  }

  /** Everyone alive within `range` of a point runs away from it. */
  private scarePedestrians(x: number, y: number, range: number): void {
    for (const p of this.pedestrians) {
      if (p.state !== 'dead' && Math.hypot(p.x - x, p.y - y) < range) panic(p, x, y, this.random);
    }
  }

  private stepPedestrians(dt: number): void {
    for (const p of this.pedestrians) {
      if (p.state === 'dead') {
        stepPedestrian(p, dt, this.world, this.cars, this.random);
        if (p.deadFor > PED.corpseTime) { // replace the body with a fresh pedestrian, out of sight
          const spot = this.randomSpot(this.view ? 0 : PED.respawnFallbackDistance, true);
          if (spot) resetPedestrian(p, spot[0], spot[1], this.random);
        }
        continue;
      }
      let runOver = false;
      for (const c of this.cars) {
        const speed = carSpeed(c);
        if (speed < PED.carScareSpeed) continue;
        const dx = p.x - c.x, dy = p.y - c.y, reach = c.hl + PED.carScareRange;
        if (dx * dx + dy * dy > reach * reach) continue;
        if (speed >= PED.carKillSpeed && carContains(c, p.x, p.y, p.r)) {
          this.damagePedestrian(p, Infinity, 'car', c.vx * PED.knockback, c.vy * PED.knockback);
          runOver = true;
          break;
        }
        // Dodge sideways, to whichever side of the car's path they are on.
        const nx = -c.vy / speed, ny = c.vx / speed, side = Math.sign(dx * nx + dy * ny) || 1;
        panic(p, p.x - nx * side, p.y - ny * side, this.random);
      }
      if (!runOver) stepPedestrian(p, dt, this.world, this.cars, this.random);
    }
  }

  private leaveCar(force: boolean): boolean {
    const p = this.player, c = p.car;
    if (!c) return false;
    const spot = findExitSpot(c, p.r, this.world, this.cars);
    if (!spot && !force) return false; // boxed in
    if (spot) { p.x = spot.x; p.y = spot.y; }
    p.a = c.a;
    p.car = null;
    return true;
  }

  private explode(c: Car): void {
    c.burning = null;
    c.wrecked = true;
    c.health = 0;
    this.events.push({ type: 'explosion', x: c.x, y: c.y });
    if (this.player.car === c) this.leaveCar(true);
    const R = DAMAGE.explosionRadius;
    for (const o of this.cars) {
      if (o === c) continue;
      const dx = o.x - c.x, dy = o.y - c.y, d = Math.hypot(dx, dy);
      if (d >= R) continue;
      const f = 1 - d / R, nx = d > 0 ? dx / d : 1, ny = d > 0 ? dy / d : 0;
      o.vx += nx * DAMAGE.explosionImpulse * f;
      o.vy += ny * DAMAGE.explosionImpulse * f;
      this.damageCar(o, DAMAGE.explosionDamage * f);
    }
    this.scarePedestrians(c.x, c.y, PED.explosionScareRange);
    for (const p of this.pedestrians) {
      const dx = p.x - c.x, dy = p.y - c.y, d = Math.hypot(dx, dy);
      if (d >= R) continue;
      const f = 1 - d / R, k = DAMAGE.explosionImpulse * f * PED.knockback;
      this.damagePedestrian(p, DAMAGE.explosionDamage * f, 'explosion', (dx / (d || 1)) * k, (dy / (d || 1)) * k);
    }
  }

  private stepTrigger(dt: number, input: Input): void {
    const ars = this.arsenal, p = this.player;
    ars.cooldown = Math.max(0, ars.cooldown - dt);
    const w = WEAPONS[ars.current];
    const wantsShot = input.fire && (w.auto || !ars.triggerHeld);
    ars.triggerHeld = input.fire;
    if (p.car || !wantsShot || ars.cooldown > 0 || (ars.ammo[w.id] ?? 0) <= 0) return;

    ars.cooldown = w.interval;
    ars.ammo[w.id] = (ars.ammo[w.id] ?? 0) - 1;
    const fx = Math.cos(p.a), fy = Math.sin(p.a);
    // Muzzle: in front of the player, on the right hand.
    const x = p.x + fx * 14 - fy * 4, y = p.y + fy * 14 + fx * 4;
    const a = p.a + (this.random() * 2 - 1) * w.spread;
    this.bullets.push({ x, y, vx: Math.cos(a) * w.bulletSpeed, vy: Math.sin(a) * w.bulletSpeed, travelled: 0, range: w.range, damage: w.damage });
    this.events.push({ type: 'shot', x, y, a, weapon: w.id });
    this.scarePedestrians(p.x, p.y, PED.gunScareRange);
    if (ars.ammo[w.id] === 0) { delete ars.ammo[w.id]; this.cycleWeapon(); }
  }

  private stepBullets(dt: number): void {
    const SUB = 8; // px per collision sample, so fast bullets can't skip through thin things
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      const speed = Math.hypot(b.vx, b.vy), n = Math.max(1, Math.ceil((speed * dt) / SUB));
      const sx = (b.vx * dt) / n, sy = (b.vy * dt) / n;
      let hit = false;
      for (let s = 0; s < n && !hit; s++) {
        b.x += sx; b.y += sy;
        if (this.world.solidAt(b.x, b.y)) {
          this.events.push({ type: 'impact', x: b.x, y: b.y, on: 'wall' });
          hit = true;
          break;
        }
        for (const o of this.pedestrians) {
          if (o.state === 'dead' || Math.hypot(o.x - b.x, o.y - b.y) > o.r) continue;
          this.events.push({ type: 'impact', x: b.x, y: b.y, on: 'ped' });
          this.damagePedestrian(o, b.damage, 'bullet', (b.vx / speed) * 40, (b.vy / speed) * 40);
          panic(o, b.x - b.vx, b.y - b.vy, this.random); // run along the line of fire, away from the shooter
          hit = true;
          break;
        }
        if (hit) break;
        for (const c of this.cars) {
          if (!carContains(c, b.x, b.y)) continue;
          this.damageCar(c, b.damage);
          c.vx += (b.vx / speed) * DAMAGE.bulletImpulse;
          c.vy += (b.vy / speed) * DAMAGE.bulletImpulse;
          this.events.push({ type: 'impact', x: b.x, y: b.y, on: 'car' });
          hit = true;
          break;
        }
      }
      b.travelled += speed * dt;
      if (hit || b.travelled >= b.range) this.bullets.splice(i, 1);
    }
  }

  private stepPickups(dt: number): void {
    const p = this.player;
    for (const k of this.pickups) {
      if (k.respawn > 0) { k.respawn = Math.max(0, k.respawn - dt); continue; }
      if (Math.hypot(p.x - k.x, p.y - k.y) > PICKUP.radius) continue;
      const had = (this.arsenal.ammo[k.weapon] ?? 0) > 0;
      this.arsenal.ammo[k.weapon] = (this.arsenal.ammo[k.weapon] ?? 0) + k.ammo;
      if (!had) { this.arsenal.current = k.weapon; this.arsenal.cooldown = 0; }
      k.respawn = PICKUP.respawn;
      this.events.push({ type: 'pickup', x: k.x, y: k.y, weapon: k.weapon });
    }
  }
}
