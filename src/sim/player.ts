import { carContains, toCarLocal, type Car } from './car';
import { PLAYER } from './tuning';
import type { Input, SolidQuery } from './types';

export interface Player {
  x: number;
  y: number;
  a: number;
  readonly r: number;
  /** The car being driven, or null on foot. */
  car: Car | null;
  /** Walk-cycle phase, advanced while moving. */
  stride: number;
}

export function createPlayer(x: number, y: number, a: number): Player {
  return { x, y, a, r: PLAYER.radius, car: null, stride: 0 };
}

export const bodyHitsWorld = (world: SolidQuery, x: number, y: number, r: number) =>
  world.solidAt(x - r, y - r) || world.solidAt(x + r, y - r) || world.solidAt(x - r, y + r) || world.solidAt(x + r, y + r);

function overlapsCar(cars: readonly Car[], x: number, y: number, pad: number): boolean {
  return cars.some((c) => carContains(c, x, y, pad));
}

/**
 * On-foot movement. With `input.aim` set the player faces that angle and walks in a world-space
 * direction (twin-stick); otherwise it is rotate-and-walk ("tank"). Cars push the player out of the way.
 */
export function stepOnFoot(p: Player, dt: number, input: Input, world: SolidQuery, cars: readonly Car[]): void {
  let vx: number, vy: number;
  if (input.aim !== null) {
    p.a = input.aim;
    const len = Math.hypot(input.moveX, input.moveY);
    const k = len > 0 ? PLAYER.walkSpeed / Math.max(len, 1) : 0;
    vx = input.moveX * k;
    vy = input.moveY * k;
  } else {
    p.a += input.steer * PLAYER.turnRate * dt;
    const speed = input.throttle > 0 ? PLAYER.walkSpeed : input.throttle < 0 ? -PLAYER.backSpeed : 0;
    vx = Math.cos(p.a) * speed;
    vy = Math.sin(p.a) * speed;
  }
  if (vx || vy) p.stride += dt * 12;
  const nx = p.x + vx * dt, ny = p.y + vy * dt;
  if (!bodyHitsWorld(world, nx, p.y, p.r)) p.x = nx;
  if (!bodyHitsWorld(world, p.x, ny, p.r)) p.y = ny;

  pushOutOfCars(p, world, cars);
}

/** Cars shove a round body (player or pedestrian) out of the way, unless that would push it into a wall. */
export function pushOutOfCars(p: { x: number; y: number; readonly r: number }, world: SolidQuery, cars: readonly Car[]): void {
  for (const c of cars) {
    const [lx, ly] = toCarLocal(c, p.x, p.y);
    const px = c.hl + p.r - Math.abs(lx), py = c.hw + p.r - Math.abs(ly);
    if (px <= 0 || py <= 0) continue;
    const fx = Math.cos(c.a), fy = Math.sin(c.a);
    let ox: number, oy: number;
    if (px < py) { const s = Math.sign(lx) || 1; ox = fx * px * s; oy = fy * px * s; }
    else { const s = Math.sign(ly) || 1; ox = -fy * py * s; oy = fx * py * s; }
    if (!bodyHitsWorld(world, p.x + ox, p.y + oy, p.r)) { p.x += ox; p.y += oy; }
  }
}

/** Nearest car whose body is within reach of the player, if any. */
export function findCarToEnter(p: Player, cars: readonly Car[]): Car | null {
  let best: Car | null = null, bestDist: number = PLAYER.enterReach;
  for (const c of cars) {
    if (c.wrecked || c.burning !== null) continue;
    const [lx, ly] = toCarLocal(c, p.x, p.y);
    const d = Math.hypot(Math.max(Math.abs(lx) - c.hl, 0), Math.max(Math.abs(ly) - c.hw, 0));
    if (d < bestDist) { bestDist = d; best = c; }
  }
  return best;
}

/** Where to stand after leaving `c`: driver side, passenger side, behind, then in front. */
export function findExitSpot(c: Car, r: number, world: SolidQuery, cars: readonly Car[]): { x: number; y: number } | null {
  const fx = Math.cos(c.a), fy = Math.sin(c.a), rx = -fy, ry = fx;
  const side = c.hw + r + 4, end = c.hl + r + 4;
  const offsets: [number, number][] = [[-rx * side, -ry * side], [rx * side, ry * side], [-fx * end, -fy * end], [fx * end, fy * end]];
  for (const [ox, oy] of offsets) {
    const x = c.x + ox, y = c.y + oy;
    if (!bodyHitsWorld(world, x, y, r) && !overlapsCar(cars, x, y, r)) return { x, y };
  }
  return null;
}
