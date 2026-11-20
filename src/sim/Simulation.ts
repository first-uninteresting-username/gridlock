import { collideCars } from './collide';
import { carContains, stepCar, type Car } from './car';
import { findCarToEnter, findExitSpot, stepOnFoot, type Player } from './player';
import { DAMAGE, PICKUP } from './tuning';
import type { Input, SolidQuery } from './types';
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
  | { type: 'impact'; x: number; y: number; on: 'wall' | 'car' }
  | { type: 'ignite'; car: Car }
  | { type: 'explosion'; x: number; y: number }
  | { type: 'pickup'; x: number; y: number; weapon: WeaponId };

/** All gameplay state and rules. Knows nothing about rendering or input devices. */
export class Simulation {
  readonly bullets: Bullet[] = [];
  readonly arsenal: Arsenal = createArsenal();
  /** Filled during step(); the consumer clears it after reading. */
  readonly events: SimEvent[] = [];

  constructor(
    readonly world: SolidQuery,
    readonly player: Player,
    readonly cars: Car[],
    readonly pickups: Pickup[] = [],
    /** Random source for weapon spread; injectable for tests. */
    private readonly random: () => number = Math.random,
  ) {}

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
