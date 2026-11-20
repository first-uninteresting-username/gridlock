import { collideCars, separateBodies } from './collide';
import { carContains, carSpeed, stepCar, type Car } from './car';
import { createPedestrian, killPedestrian, panic, resetPedestrian, sidewalkSpots, stepPedestrian, type Pedestrian } from './pedestrian';
import { findCarToEnter, findExitSpot, stepOnFoot, type Player } from './player';
import { DAMAGE, MELEE, MUZZLE, PED, PICKUP, PLAYER, POLICE, ROB } from './tuning';
import type { Input, World } from './types';
import { createArsenal, slotWeapon, WEAPONS, WEAPON_ORDER, type Arsenal, type Bullet, type MeleeDef, type WeaponId } from './weapons';

/** What a pickup gives you. */
export type PickupContents =
  | { readonly kind: 'weapon'; readonly weapon: WeaponId; readonly ammo: number }
  | { readonly kind: 'ammo'; readonly weapon: WeaponId; readonly amount: number }
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
  | { type: 'melee'; x: number; y: number; a: number; weapon: WeaponId }
  | { type: 'impact'; x: number; y: number; on: 'wall' | 'car' | 'ped' }
  | { type: 'ignite'; car: Car }
  | { type: 'explosion'; x: number; y: number }
  | { type: 'pickup'; x: number; y: number; kind: Pickup['kind'] }
  | { type: 'pedKilled'; ped: Pedestrian; by: 'bullet' | 'melee' | 'car' | 'explosion' }
  | { type: 'pickupDropped'; pickup: Pickup }
  | { type: 'playerHit'; x: number; y: number }
  | { type: 'busted'; x: number; y: number }
  | { type: 'playerDown'; x: number; y: number };

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
  /** Wanted level, 0..MAX_WANTED. Raised by crimes; police pursue and react to it. */
  wanted = 0;
  /** Money in dollars, a whole number. Earned from cash pickups. */
  cash = 0;
  /** Filled during step(); the consumer clears it after reading. */
  readonly events: SimEvent[] = [];

  /** Where pedestrians can be placed: the centre of every sidewalk tile. */
  private readonly spots: [number, number][];
  /** Where a busted or shot-down player returns to. */
  private readonly spawn: { readonly x: number; readonly y: number; readonly a: number };

  constructor(
    readonly world: World,
    readonly player: Player,
    readonly cars: Car[],
    readonly pickups: Pickup[] = [],
    /** Random source for weapon spread; injectable for tests. */
    private readonly random: () => number = Math.random,
  ) {
    this.spots = sidewalkSpots(world);
    this.spawn = { x: player.x, y: player.y, a: player.a };
  }

  /** Fill the city with `count` pedestrians on random sidewalks, none right next to the player. */
  populate(count: number): void {
    for (let i = 0; i < count; i++) {
      const spot = this.randomSpot(300);
      if (spot) this.pedestrians.push(createPedestrian(spot[0], spot[1], this.random, this.random() < POLICE.fraction));
    }
  }

  /** Add wanted stars, clamped to the legal range. Called for player crimes. */
  raiseWanted(amount: number): void {
    this.wanted = Math.max(0, Math.min(MAX_WANTED, this.wanted + amount));
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

  /** Drop ammo for the weapon in hand, or a carried finite-ammo one when the fists are out. */
  private ammoDropWeapon(): WeaponId {
    const ars = this.arsenal;
    const current = slotWeapon(ars.weapons, ars.weaponSlot);
    if (ars.ammo[current] !== Infinity) return current;
    const carried = ars.weapons.find((w) => w !== null && ars.ammo[w] !== Infinity);
    return carried ?? WEAPON_ORDER.find((w) => w !== current && w !== 'fists' && w !== 'knife') ?? current;
  }

  /** Witnesses report at most once each, a moment after spotting the crime. */
  private stepReports(dt: number): void {
    for (const p of this.pedestrians) {
      if (p.report < 0) continue;
      if (p.state === 'dead') { p.report = -1; continue; }
      p.report -= dt;
      if (p.report > 0) continue;
      p.report = -1;
      if (this.random() < ROB.reportChance) this.raiseWanted(1);
    }
  }

  /** Step a slot index in `dir`, wrapping at both ends. */
  private moveSlot(from: number, dir: -1 | 1, count: number): number {
    return (((from + dir) % count) + count) % count;
  }

  /** Selecting a slot always allows an immediate follow-up attack. */
  private resetTrigger(): void {
    this.arsenal.cooldown = 0;
    this.arsenal.triggerHeld = false;
  }

  /** Scroll through the weapon slots, including the empty (fists) ones. */
  cycleWeapon(dir: -1 | 1): void {
    const ars = this.arsenal;
    ars.weaponSlot = this.moveSlot(ars.weaponSlot, dir, ars.weapons.length);
    this.resetTrigger();
  }

  selectWeaponSlot(slot: number): void {
    if (slot < 0 || slot >= this.arsenal.weapons.length) return;
    this.arsenal.weaponSlot = slot;
    this.resetTrigger();
  }

  /** Ctrl + scroll. Gadget slots are all empty for now, so the selection just wraps around them. */
  cycleGadget(dir: -1 | 1): void {
    const ars = this.arsenal;
    ars.gadgetSlot = this.moveSlot(ars.gadgetSlot, dir, ars.gadgets.length);
  }

  selectGadgetSlot(slot: number): void {
    if (slot < 0 || slot >= this.arsenal.gadgets.length) return;
    this.arsenal.gadgetSlot = slot;
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
    this.stepReports(dt);
    this.resolveBodyCollisions();
    this.stepTrigger(dt, input);
    this.stepGadget(input);
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
  damagePedestrian(p: Pedestrian, amount: number, by: 'bullet' | 'melee' | 'car' | 'explosion', kx = 0, ky = 0): void {
    if (p.state === 'dead') return;
    p.health -= amount;
    if (p.health > 0) return;
    killPedestrian(p, kx, ky);
    this.events.push({ type: 'pedKilled', ped: p, by });
    this.raiseWanted(p.police ? 2 : 1);
    if (p.police) {
      const pickup: Pickup = {
        x: p.x, y: p.y, kind: 'ammo', weapon: POLICE.ammoWeapon, amount: POLICE.ammoAmount, respawn: 0, once: true,
      };
      this.pickups.push(pickup);
      this.events.push({ type: 'pickupDropped', pickup });
    }
  }

  /** Everyone alive within `range` of a point runs away from it. */
  private scarePedestrians(x: number, y: number, range: number): void {
    for (const p of this.pedestrians) {
      if (p.state !== 'dead' && !p.police && Math.hypot(p.x - x, p.y - y) < range) panic(p, x, y, this.random);
    }
  }

  private stepPedestrians(dt: number): void {
    for (const p of this.pedestrians) {
      if (p.state === 'dead') {
        stepPedestrian(p, dt, this.world, this.cars, this.random);
        if (p.deadFor > PED.corpseTime) { // replace the body with a fresh pedestrian, out of sight
          const spot = this.randomSpot(this.view ? 0 : PED.respawnFallbackDistance, true);
          if (spot) resetPedestrian(p, spot[0], spot[1], this.random, p.police);
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
      if (runOver) continue;
      if (p.police) {
        if (this.wanted > 0) {
          if (p.state !== 'chase') {
            p.state = 'chase';
            // Drop the half-walked tile so pursuit aims at the player's current position at once,
            // rather than finishing a long walk towards a tile picked before the crime happened.
            p.tx = p.x;
            p.ty = p.y;
            p.wait = 0;
          }
        } else if (p.state === 'chase') p.state = 'walk';
      }
      const target = p.police && this.wanted > 0 ? this.player : null;
      stepPedestrian(p, dt, this.world, this.cars, this.random, target);
      if (target) this.policeAct(p, dt);
    }
  }

  /** An officer's arrest or gunfire decision, after it has moved for this step. */
  private policeAct(p: Pedestrian, dt: number): void {
    p.arrestCooldown = Math.max(0, p.arrestCooldown - dt);
    p.shootCooldown = Math.max(0, p.shootCooldown - dt);
    const dx = this.player.x - p.x, dy = this.player.y - p.y;
    const dist = Math.hypot(dx, dy);
    if (this.wanted >= POLICE.shootWanted) {
      if (p.shootCooldown > 0 || dist >= POLICE.shootRange) return;
      if (!this.lineOfSight(p.x, p.y, this.player.x, this.player.y)) return;
      p.shootCooldown = POLICE.shootInterval;
      const a = Math.atan2(dy, dx) + (this.random() * 2 - 1) * POLICE.spread;
      const x = p.x + Math.cos(a) * 12, y = p.y + Math.sin(a) * 12;
      this.bullets.push({
        x, y, vx: Math.cos(a) * POLICE.bulletSpeed, vy: Math.sin(a) * POLICE.bulletSpeed,
        travelled: 0, range: POLICE.shootRange, damage: POLICE.damage, from: 'police',
      });
      this.events.push({ type: 'shot', x, y, a, weapon: 'pistol' });
    } else if (p.arrestCooldown === 0 && dist < POLICE.arrestRange) {
      p.arrestCooldown = POLICE.arrestCooldown;
      this.bookPlayer('busted');
    }
  }

  /** True when no solid tile blocks the straight line between two points. */
  private lineOfSight(x0: number, y0: number, x1: number, y1: number): boolean {
    const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 8));
    for (let i = 1; i < n; i++) {
      const t = i / n;
      if (this.world.solidAt(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t)) return false;
    }
    return true;
  }

  /** Busted or shot down: a fine, a clean record and a trip back to the starting spot. */
  private bookPlayer(type: 'busted' | 'playerDown'): void {
    const p = this.player;
    this.cash = Math.max(0, this.cash - POLICE.fine);
    this.wanted = 0;
    if (p.car) this.leaveCar(true);
    p.x = this.spawn.x;
    p.y = this.spawn.y;
    p.a = this.spawn.a;
    p.health = PLAYER.health;
    this.events.push({ type, x: p.x, y: p.y });
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
    const w = WEAPONS[slotWeapon(ars.weapons, ars.weaponSlot)];
    // Melee swings, like automatic guns, keep going while the button is held.
    const wantsAttack = input.fire && (w.kind === 'melee' || w.auto || !ars.triggerHeld);
    ars.triggerHeld = input.fire;
    // You can lean out of a car and shoot, but not punch or stab from one.
    if ((p.car !== null && w.kind === 'melee') || !wantsAttack || ars.cooldown > 0 || (ars.ammo[w.id] ?? 0) <= 0) return;

    ars.cooldown = w.interval;
    ars.ammo[w.id] = (ars.ammo[w.id] ?? 0) - 1;
    if (w.kind === 'melee') { this.meleeAttack(w); return; }

    // On foot you face where you shoot; from a car you aim with the mouse, or along the car's heading.
    const aim = p.car ? (input.aim ?? p.a) : p.a;
    const fx = Math.cos(aim), fy = Math.sin(aim);
    // A shot from a car starts outside its body so it cannot hit the car you are sitting in.
    const off = p.car ? Math.max(p.car.hl, p.car.hw) + MUZZLE.carMargin : 0;
    const x = p.car ? p.x + fx * off : p.x + fx * MUZZLE.footForward - fy * MUZZLE.footSide;
    const y = p.car ? p.y + fy * off : p.y + fy * MUZZLE.footForward + fx * MUZZLE.footSide;
    const a = aim + (this.random() * 2 - 1) * w.spread;
    this.bullets.push({
      x, y, vx: Math.cos(a) * w.bulletSpeed, vy: Math.sin(a) * w.bulletSpeed,
      travelled: 0, range: w.range, damage: w.damage, from: 'player',
    });
    this.events.push({ type: 'shot', x, y, a, weapon: w.id });
    if (this.wanted === 0) this.raiseWanted(1); // gunfire alone is enough to get the police's attention
    this.scarePedestrians(p.x, p.y, PED.gunScareRange);
  }

  /** A swing hits every living pedestrian inside a short arc in front of the player. */
  private meleeAttack(w: MeleeDef): void {
    const p = this.player;
    const fx = Math.cos(p.a), fy = Math.sin(p.a);
    this.events.push({ type: 'melee', x: p.x + fx * w.reach * 0.7, y: p.y + fy * w.reach * 0.7, a: p.a, weapon: w.id });
    for (const o of this.pedestrians) {
      if (o.state === 'dead') continue;
      const dx = o.x - p.x, dy = o.y - p.y, d = Math.hypot(dx, dy);
      if (d > w.reach + o.r) continue;
      let delta = Math.abs(Math.atan2(dy, dx) - p.a);
      if (delta > Math.PI) delta = Math.PI * 2 - delta;
      if (delta > w.arc) continue;
      this.damagePedestrian(o, w.damage, 'melee', fx * MELEE.knockback, fy * MELEE.knockback);
      panic(o, p.x - fx * 40, p.y - fy * 40, this.random); // run away from the attacker
    }
  }

  /** Right mouse button is reserved for gadget use; no gadget has behaviour yet. */
  private stepGadget(input: Input): void {
    this.arsenal.gadgetHeld = input.gadget;
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
        if (b.from === 'police') {
          const p = this.player;
          if (!p.car && Math.hypot(p.x - b.x, p.y - b.y) <= p.r) {
            p.health -= b.damage;
            this.events.push({ type: 'playerHit', x: b.x, y: b.y });
            if (p.health <= 0) this.bookPlayer('playerDown');
            hit = true;
            break;
          }
        } else {
          for (const o of this.pedestrians) {
            if (o.state === 'dead' || Math.hypot(o.x - b.x, o.y - b.y) > o.r) continue;
            this.events.push({ type: 'impact', x: b.x, y: b.y, on: 'ped' });
            this.damagePedestrian(o, b.damage, 'bullet', (b.vx / speed) * 40, (b.vy / speed) * 40);
            panic(o, b.x - b.vx, b.y - b.vy, this.random); // run along the line of fire, away from the shooter
            hit = true;
            break;
          }
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
      else if (k.kind === 'ammo') this.giveWeapon(k.weapon, k.amount);
      else this.cash += k.amount;
      k.respawn = k.once ? Infinity : PICKUP.respawn;
      this.events.push({ type: 'pickup', x: k.x, y: k.y, kind: k.kind });
    }
  }

  /** Put a picked-up weapon in a free slot (or replace the selected one when all are full). */
  private giveWeapon(weapon: WeaponId, ammo: number): void {
    const ars = this.arsenal;
    ars.ammo[weapon] = (ars.ammo[weapon] ?? 0) + ammo;
    let slot = ars.weapons.indexOf(weapon);
    if (slot < 0) {
      slot = ars.weapons.indexOf(null);
      if (slot < 0) slot = ars.weaponSlot;
      ars.weapons[slot] = weapon;
    }
    ars.weaponSlot = slot;
    this.resetTrigger();
  }
}
