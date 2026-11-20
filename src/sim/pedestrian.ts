import { carContains, carSpeed, toCarLocal, type Car } from './car';
import { bodyHitsWorld, pushOutOfCars } from './player';
import { PED } from './tuning';
import type { World } from './types';

export type PedState = 'walk' | 'flee' | 'dead';

/** A bystander. Wanders the streets tile by tile, bolts when scared, and can be shot or run over. */
export interface Pedestrian {
  x: number;
  y: number;
  /** Facing, radians. */
  a: number;
  readonly r: number;
  state: PedState;
  health: number;
  /** Walk-cycle phase, advanced while moving. */
  stride: number;
  /** Centre of the tile being walked to. */
  tx: number;
  ty: number;
  /** Last step taken, as a unit grid direction (0,0 right after a scare). */
  dx: number;
  dy: number;
  /** Seconds of panic left while fleeing, and the direction being run in. */
  fear: number;
  fleeA: number;
  /** Seconds spent blocked while trying to walk; a long block makes the pedestrian turn around. */
  stuck: number;
  /** Seconds left standing at the kerb, waiting for a gap in traffic before crossing. */
  wait: number;
  /** Fling velocity after being hit; only used once dead. */
  vx: number;
  vy: number;
  /** Seconds since death. */
  deadFor: number;
  /** Picks the outfit; the renderer decides what it means. */
  look: number;
  /** Personal walking-speed multiplier. */
  pace: number;
}

export const PED_LOOKS = 8;

const DIRS: readonly (readonly [number, number])[] = [[1, 0], [0, 1], [-1, 0], [0, -1]];

const walkable = (k: string | null): boolean => k !== null && k !== 'building';

export function createPedestrian(x: number, y: number, random: () => number): Pedestrian {
  const p = { r: PED.radius } as Pedestrian;
  resetPedestrian(p, x, y, random);
  return p;
}

/** Puts a pedestrian (new or recycled) back on its feet at a spot, ready to walk. */
export function resetPedestrian(p: Pedestrian, x: number, y: number, random: () => number): void {
  Object.assign(p, {
    x, y, a: random() * Math.PI * 2, state: 'walk', health: PED.health, stride: random() * 6,
    tx: x, ty: y, dx: 0, dy: 0, fear: 0, fleeA: 0, stuck: 0, wait: 0, vx: 0, vy: 0, deadFor: 0,
    look: Math.floor(random() * PED_LOOKS), pace: 0.8 + random() * 0.4,
  });
}

/** Tile centres pedestrians may appear on: every sidewalk tile. */
export function sidewalkSpots(world: World): [number, number][] {
  const spots: [number, number][] = [];
  const ts = world.tileSize;
  for (let row = 0; row < world.rows; row++) for (let col = 0; col < world.cols; col++) {
    const x = (col + 0.5) * ts, y = (row + 0.5) * ts;
    if (world.kindAt(x, y) === 'sidewalk') spots.push([x, y]);
  }
  return spots;
}

/** Scare a pedestrian into running directly away from a point. */
export function panic(p: Pedestrian, fromX: number, fromY: number, random: () => number, duration: number = PED.fearTime): void {
  if (p.state === 'dead') return;
  // A car alongside a pedestrian re-panics it every step. Re-rolling the escape direction each
  // time makes it vibrate in place, so keep the first direction and only refresh the timer.
  if (p.state === 'flee') {
    p.fear = Math.max(p.fear, duration);
    return;
  }
  p.state = 'flee';
  p.fear = duration;
  p.fleeA = Math.atan2(p.y - fromY, p.x - fromX) + (random() - 0.5) * 0.8;
  p.wait = 0;
}

export function killPedestrian(p: Pedestrian, vx: number, vy: number): void {
  p.state = 'dead';
  p.health = 0;
  p.vx = vx;
  p.vy = vy;
  p.deadFor = 0;
}

/** Slide a body through the world one axis at a time so it glides along walls. */
function move(p: Pedestrian, dx: number, dy: number, world: World): void {
  if (!bodyHitsWorld(world, p.x + dx, p.y, p.r)) p.x += dx;
  if (!bodyHitsWorld(world, p.x, p.y + dy, p.r)) p.y += dy;
}

/**
 * True when a moving car will reach this road tile before a pedestrian could get clear of it.
 * Parked cars are ignored here; `chooseNext` rules out their tiles outright instead.
 */
function crossingBlocked(x: number, y: number, cars: readonly Car[]): boolean {
  for (const c of cars) {
    const speed = carSpeed(c);
    if (speed < PED.carScareSpeed) continue;
    const dx = x - c.x, dy = y - c.y, dist = Math.hypot(dx, dy);
    if (dist > c.hl + speed * PED.crossTime) continue; // still too far away to matter
    const [, ly] = toCarLocal(c, x, y);
    if (Math.abs(ly) > c.hw + PED.radius + 4) continue; // tile is outside the car's lane
    const closing = (dx * c.vx + dy * c.vy) / (dist || 1); // speed towards the tile, px/s
    if (closing <= speed * 0.25) continue; // not heading this way
    if ((dist - c.hl) / closing < PED.crossTime) return true;
  }
  return false;
}

/**
 * Picks the next tile to walk to. Sidewalks are preferred and a pedestrian tends to keep going the
 * way it was heading; now and then it steps off the kerb to cross a street, and once on the road it
 * keeps straight on until it reaches the other side. A pedestrian will not walk into a car, and it
 * waits at the kerb if traffic is coming. `turnBack` forces a U-turn (when blocked).
 */
function chooseNext(p: Pedestrian, world: World, cars: readonly Car[], random: () => number, turnBack: boolean): void {
  const ts = world.tileSize;
  const col = Math.floor(p.x / ts), row = Math.floor(p.y / ts);
  const here = world.kindAt(p.x, p.y);
  const onRoad = here === 'road', onSidewalk = here === 'sidewalk';
  const options: { dx: number; dy: number; w: number; unsafe: boolean }[] = [];
  let total = 0;
  for (const [dx, dy] of DIRS) {
    const kind = world.kindAt((col + dx + 0.5) * ts, (row + dy + 0.5) * ts);
    if (!walkable(kind)) continue;
    const nx = (col + dx + 0.5) * ts, ny = (row + dy + 0.5) * ts;
    if (cars.some((c) => carContains(c, nx, ny, p.r))) continue; // never step into a car's body
    const straight = dx === p.dx && dy === p.dy, back = dx === -p.dx && dy === -p.dy;
    let w = kind === 'sidewalk' ? 1 : kind === 'grass' ? 0.6 : 0.4;
    if (straight) w *= onRoad ? 8 : kind === 'sidewalk' ? 4 : 1;
    if (back) w *= 0.02;
    if (turnBack) w = back ? 1 : 0;
    const unsafe = !turnBack && onSidewalk && kind === 'road' && crossingBlocked(nx, ny, cars);
    if (w <= 0) continue;
    options.push({ dx, dy, w, unsafe });
    total += w;
  }
  if (options.length === 0) { // boxed in (or turning back into a wall): any open neighbour will do
    for (const [dx, dy] of DIRS) {
      const nx = (col + dx + 0.5) * ts, ny = (row + dy + 0.5) * ts;
      if (walkable(world.kindAt(nx, ny)) && !cars.some((c) => carContains(c, nx, ny, p.r))) options.push({ dx, dy, w: 1, unsafe: false }), total++;
    }
    if (options.length === 0) { p.tx = p.x; p.ty = p.y; return; } // surrounded by cars: hold still
  }
  let r = random() * total;
  const pick = options.find((o) => (r -= o.w) < 0) ?? options[options.length - 1];
  p.dx = pick.dx;
  p.dy = pick.dy;
  if (pick.unsafe) { // traffic is coming: stay on the kerb, face the road and look again shortly
    p.wait = PED.kerbWait * (0.6 + random() * 0.8);
    p.tx = p.x; p.ty = p.y;
    p.a = Math.atan2(pick.dy, pick.dx);
  } else {
    p.wait = 0;
    p.tx = (col + pick.dx + 0.5) * ts;
    p.ty = (row + pick.dy + 0.5) * ts;
  }
}

function turnToward(p: Pedestrian, a: number, dt: number): void {
  const d = Math.atan2(Math.sin(a - p.a), Math.cos(a - p.a));
  p.a += d * Math.min(1, 12 * dt);
}

/** Advances one pedestrian. Cars shove it aside; deciding what hurts or scares it is the simulation's job. */
export function stepPedestrian(p: Pedestrian, dt: number, world: World, cars: readonly Car[], random: () => number): void {
  if (p.state === 'dead') {
    p.deadFor += dt;
    move(p, p.vx * dt, p.vy * dt, world);
    const k = Math.exp(-6 * dt);
    p.vx *= k;
    p.vy *= k;
    return;
  }

  const fromX = p.x, fromY = p.y;
  let want = 0; // distance we tried to cover this step
  if (p.state === 'flee') {
    p.fear -= dt;
    if (p.fear <= 0) { // calm down and carry on from the middle of whatever tile this is
      p.state = 'walk';
      p.tx = (Math.floor(p.x / world.tileSize) + 0.5) * world.tileSize;
      p.ty = (Math.floor(p.y / world.tileSize) + 0.5) * world.tileSize;
      p.dx = p.dy = 0;
      p.wait = 0;
    } else {
      want = PED.runSpeed * dt;
      move(p, Math.cos(p.fleeA) * want, Math.sin(p.fleeA) * want, world);
      turnToward(p, p.fleeA, dt);
      p.stride += dt * 20;
    }
  }
  if (p.state === 'walk') {
    if (p.wait > 0) {
      p.wait -= dt; // waiting at the kerb for traffic to clear
    } else {
      const ddx = p.tx - p.x, ddy = p.ty - p.y, d = Math.hypot(ddx, ddy);
      want = Math.min(PED.walkSpeed * p.pace * dt, d);
      if (d > 1e-6) {
        move(p, (ddx / d) * want, (ddy / d) * want, world);
        turnToward(p, Math.atan2(ddy, ddx), dt);
        p.stride += dt * 9 * p.pace;
      }
      if (d - want < 0.5) chooseNext(p, world, cars, random, false); // arrived
    }
  }

  pushOutOfCars(p, world, cars);

  // Blocked (a parked car in the way, say): after a moment, turn around instead of pushing forever.
  if (want > 0 && Math.hypot(p.x - fromX, p.y - fromY) < want * 0.3) {
    p.stuck += dt;
    if (p.stuck > 0.5) {
      p.stuck = 0;
      if (p.state === 'walk') chooseNext(p, world, cars, random, true);
      else p.fleeA += Math.PI / 2 + random() * Math.PI / 2;
    }
  } else p.stuck = 0;
}
