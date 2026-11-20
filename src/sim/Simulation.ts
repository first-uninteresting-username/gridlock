import { collideCars, separateBodies } from './collide';
import { carContains, carSpeed, stepCar, type Car } from './car';
import { createPedestrian, killPedestrian, panic, resetPedestrian, sidewalkSpots, stepPedestrian, type Pedestrian } from './pedestrian';
import { findCarToEnter, findExitSpot, stepOnFoot, type Player } from './player';
import { DAMAGE, MUZZLE, PED, PICKUP, ROB } from './tuning';
import { Traffic } from './traffic';
import { NO_INPUT, type Input, type World } from './types';
import { createArsenal, WEAPON_ORDER, WEAPONS, type Arsenal, type Bullet, type WeaponId } from './weapons';

/** What a pickup gives you. */
export type PickupContents =
  | { readonly kind: 'weapon'; readonly weapon: WeaponId; readonly ammo: number }
  | { readonly kind: 'cash'; readonly amount: number };

export type Pickup = PickupContents & {
  readonly x: number;
  readonly y: number;
  /** Seconds until it reappears; 0 = available. */
  respawn: number;
  /** Dropped loot is collected once and never comes back; map pickups respawn. */
  once?: boolean;
};

/** Things that happened during a step, for the renderer to turn into effects and sounds. */
export type SimEvent =
  | { type: 'shot'; x: number; y: number; a: number; weapon: WeaponId }
  | { type: 'impact'; x: number; y: number; on: 'wall' | 'car' | 'ped' }
  | { type: 'ignite'; car: Car }
  | { type: 'explosion'; x: number; y: number }
  | { type: 'pickup'; x: number; y: number; kind: Pickup['kind'] }
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
  /** Wanted level, 0..MAX_WANTED. Raised by witnesses of a robbery. */
  wanted = 0;
  /** Money in dollars, a whole number. Earned from cash pickups. */
  cash = 0;
  /** Filled during step(); the consumer clears it after reading. */
  readonly events: SimEvent[] = [];

  /** Where pedestrians can be placed: the centre of every sidewalk tile. */
  private readonly spots: [number, number][];
  /** Drives every car with a seated driver except the one the player is in. */
  private readonly traffic: Traffic;

  constructor(
    readonly world: World,
    readonly player: Player,
    readonly cars: Car[],
    readonly pickups: Pickup[] = [],
    /** Random source for weapon spread; injectable for tests. */
    private readonly random: () => number = Math.random,
  ) {
    this.spots = sidewalkSpots(world);
    this.traffic = new Traffic(world);
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
    car.driver = null; // the seat belongs to the player now; turning the old driver loose is separate work
    return true;
  }

  /** Nearest pedestrian the player could rob right now, for the prompt and for the action itself. */
  robTarget(): Pedestrian | null {
    const p = this.player;
    if (p.car) return null;
    let best: Pedestrian | null = null, bestDist: number = ROB.reach;
    for (const other of this.pedestrians) {
      if (other.state === 'dead' || other.robbed) continue;
      const d = Math.hypot(other.x - p.x, other.y - p.y);
      if (d < bestDist) { bestDist = d; best = other; }
    }
    return best;
  }

  /** Rob the pedestrian in reach, if any. Both query and action use `robTarget`, so the prompt never lies. */
  robNearest(): boolean {
    const victim = this.robTarget();
    if (!victim) return false;
    victim.robbed = true;
    panic(victim, this.player.x, this.player.y, this.random);
    // Anyone nearby may report it; the victim needs a moment to react before deciding.
    for (const p of this.pedestrians) {
      if (p.state === 'dead' || Math.hypot(p.x - victim.x, p.y - victim.y) > ROB.witnessRange) continue;
      const extra = p === victim ? ROB.victimDelay : 0;
      p.report = ROB.reportDelay + extra + this.random() * ROB.reportJitter;
    }
    this.dropLoot(victim.x, victim.y);
    return true;
  }

  /** Victims leave a small cash bundle and, now and then, ammo for a weapon the player can use. */
  private dropLoot(x: number, y: number): void {
    const jitter = () => (this.random() * 2 - 1) * 8;
    const amount = ROB.cashMin + Math.floor(this.random() * (ROB.cashMax - ROB.cashMin + 1));
    this.pickups.push({ kind: 'cash', amount, x: x + jitter(), y: y + jitter(), respawn: 0, once: true });
    if (this.random() < ROB.ammoChance) {
      this.pickups.push({ kind: 'weapon', weapon: this.ammoDropWeapon(), ammo: ROB.ammoAmount, x: x + jitter(), y: y + jitter(), respawn: 0, once: true });
    }
  }

  /** Drop ammo for the weapon in hand, or the other one when the current weapon has unlimited ammo. */
  private ammoDropWeapon(): WeaponId {
    const current = this.arsenal.current;
    if (this.arsenal.ammo[current] !== Infinity) return current;
    return WEAPON_ORDER.find((w) => w !== current) ?? current;
  }

  /** Witnesses report at most once each, a moment after spotting the crime. */
  private stepReports(dt: number): void {
    for (const p of this.pedestrians) {
      if (p.report < 0) continue;
      if (p.state === 'dead') { p.report = -1; continue; }
      p.report -= dt;
      if (p.report > 0) continue;
      p.report = -1;
      if (this.random() < ROB.reportChance) this.wanted = Math.min(MAX_WANTED, this.wanted + 1);
    }
  }

  /** Switch to the next weapon that has ammo. */
  cycleWeapon(): void {
    const owned = WEAPON_ORDER.filter((w) => (this.arsenal.ammo[w] ?? 0) > 0);
    if (owned.length === 0) return;
    const i = owned.indexOf(this.arsenal.current);
    this.arsenal.current = owned[(i + 1) % owned.length];
    this.arsenal.cooldown = 0;
  }

  step(dt: number, input: Input): void {
    const p = this.player;
    for (const c of this.cars) {
      let carInput: Input = NO_INPUT;
      if (c === p.car && !c.wrecked) carInput = input;
      else if (c.driver && !c.wrecked && c.burning === null) carInput = this.traffic.input(c, c.driver, dt, this.random);
      stepCar(c, dt, carInput, this.world);
      if (c.burning !== null && (c.burning -= dt) <= 0) this.explode(c);
    }
    for (let i = 0; i < this.cars.length; i++)
      for (let j = i + 1; j < this.cars.length; j++) collideCars(this.cars[i], this.cars[j], this.world);
    if (p.car) { p.x = p.car.x; p.y = p.car.y; p.a = p.car.a; }
    else stepOnFoot(p, dt, input, this.world, this.cars);

    this.stepPedestrians(dt);
    this.stepReports(dt);
    this.resolveBodyCollisions();
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
        const dx = p.x - c.x, dy = p.y - c.y;
        if (!carContains(c, p.x, p.y, PED.carScareRange)) continue;
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

  /** Keep living bodies from overlapping: pedestrians avoid each other and the player on foot. */
  private resolveBodyCollisions(): void {
    const peds = this.pedestrians, player = this.player;
    const onFoot = player.car === null;
    // A couple of relaxation passes settle clusters where several bodies overlap at once.
    for (let pass = 0; pass < 2; pass++) {
      for (let i = 0; i < peds.length; i++) {
        const a = peds[i];
        if (a.state === 'dead') continue;
        for (let j = i + 1; j < peds.length; j++) {
          const b = peds[j];
          if (b.state === 'dead') continue;
          separateBodies(a, b, this.world, 0.5);
        }
      }
      // The player has the right of way: pedestrians step aside rather than shoving them.
      // Doing this last keeps them clear of the player at the end of the frame.
      if (onFoot) for (const a of peds) if (a.state !== 'dead') separateBodies(player, a, this.world, 0);
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
    if (!wantsShot || ars.cooldown > 0 || (ars.ammo[w.id] ?? 0) <= 0) return;

    ars.cooldown = w.interval;
    ars.ammo[w.id] = (ars.ammo[w.id] ?? 0) - 1;
    // On foot you face where you shoot; from a car you aim with the mouse, or along the car's heading.
    const aim = p.car ? (input.aim ?? p.a) : p.a;
    const fx = Math.cos(aim), fy = Math.sin(aim);
    // A shot from a car starts outside its body so it cannot hit the car you are sitting in.
    const off = p.car ? Math.max(p.car.hl, p.car.hw) + MUZZLE.carMargin : 0;
    const x = p.car ? p.x + fx * off : p.x + fx * MUZZLE.footForward - fy * MUZZLE.footSide;
    const y = p.car ? p.y + fy * off : p.y + fy * MUZZLE.footForward + fx * MUZZLE.footSide;
    const a = aim + (this.random() * 2 - 1) * w.spread;
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
      if (k.kind === 'weapon') this.giveWeapon(k.weapon, k.ammo);
      else this.cash += k.amount;
      k.respawn = k.once ? Infinity : PICKUP.respawn;
      this.events.push({ type: 'pickup', x: k.x, y: k.y, kind: k.kind });
    }
  }

  private giveWeapon(weapon: WeaponId, ammo: number): void {
    const had = (this.arsenal.ammo[weapon] ?? 0) > 0;
    this.arsenal.ammo[weapon] = (this.arsenal.ammo[weapon] ?? 0) + ammo;
    if (!had) { this.arsenal.current = weapon; this.arsenal.cooldown = 0; }
  }
}
