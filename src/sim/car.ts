import { CAR, DAMAGE } from './tuning';
import type { Input, SolidQuery } from './types';

export interface Car {
  x: number;
  y: number;
  /** Heading in radians, 0 = east, PI/2 = south. */
  a: number;
  vx: number;
  vy: number;
  readonly hl: number;
  readonly hw: number;
  readonly color: number;
  health: number;
  /** Seconds until it explodes, or null if not on fire. */
  burning: number | null;
  /** Burnt-out shell: cannot be entered or driven. */
  wrecked: boolean;
}

export function createCar(x: number, y: number, a: number, color: number): Car {
  return { x, y, a, vx: 0, vy: 0, hl: CAR.halfLength, hw: CAR.halfWidth, color, health: DAMAGE.carHealth, burning: null, wrecked: false };
}

/** Corners plus the middle of each long side, used for wall checks and SAT. */
export function carPoints(x: number, y: number, a: number, hl: number, hw: number): [number, number][] {
  const fx = Math.cos(a), fy = Math.sin(a), rx = -fy, ry = fx;
  const pts: [number, number][] = [];
  for (const s of [1, 0, -1]) for (const t of [1, -1])
    pts.push([x + fx * hl * s + rx * hw * t, y + fy * hl * s + ry * hw * t]);
  return pts;
}

export function carHitsWorld(c: Car, world: SolidQuery, x = c.x, y = c.y, a = c.a): boolean {
  for (const [px, py] of carPoints(x, y, a, c.hl, c.hw)) if (world.solidAt(px, py)) return true;
  return false;
}

/** True if the point is inside the car's box (optionally grown by `pad`). */
export function carContains(c: Car, x: number, y: number, pad = 0): boolean {
  const [lx, ly] = toCarLocal(c, x, y);
  return Math.abs(lx) < c.hl + pad && Math.abs(ly) < c.hw + pad;
}

export const carSpeed = (c: Car): number => Math.hypot(c.vx, c.vy);

/** World point -> car-local coordinates (x along heading, y to the car's right). */
export function toCarLocal(c: Car, x: number, y: number): [number, number] {
  const dx = x - c.x, dy = y - c.y, fx = Math.cos(c.a), fy = Math.sin(c.a);
  return [dx * fx + dy * fy, -dx * fy + dy * fx];
}

const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v);

/** Advances one car. Pass `null` input for parked / driverless cars. */
export function stepCar(c: Car, dt: number, input: Input | null, world: SolidQuery): void {
  const fx = Math.cos(c.a), fy = Math.sin(c.a), rx = -fy, ry = fx;
  let vf = c.vx * fx + c.vy * fy; // forward speed
  let vr = c.vx * rx + c.vy * ry; // sideways (slip) speed
  const th = input?.throttle ?? 0, st = input?.steer ?? 0, hb = input?.handbrake ?? false;

  if (th > 0) vf += (vf < -5 ? CAR.brake : CAR.accel) * dt;
  else if (th < 0) vf -= (vf > 5 ? CAR.brake : CAR.reverseAccel) * dt;
  else vf -= Math.sign(vf) * Math.min(Math.abs(vf), CAR.coastDrag * dt);
  if (hb) vf -= Math.sign(vf) * Math.min(Math.abs(vf), CAR.handbrakeDrag * dt);
  vf = clamp(vf, -CAR.maxReverse, CAR.maxSpeed);
  vr *= Math.exp(-(hb ? CAR.handbrakeGrip : CAR.grip) * dt);

  // Steering scales with speed (no turning on the spot) and softens near top speed.
  const turn = st * CAR.steerRate * clamp(vf / 120, -1, 1)
    * (1 - 0.35 * Math.min(Math.abs(vf) / CAR.maxSpeed, 1))
    * (hb ? CAR.handbrakeSteerBoost : 1);
  c.vx = fx * vf + rx * vr;
  c.vy = fy * vf + ry * vr;

  const na = c.a + turn * dt;
  if (!carHitsWorld(c, world, c.x, c.y, na)) c.a = na;
  const nx = c.x + c.vx * dt;
  if (carHitsWorld(c, world, nx, c.y)) c.vx *= -CAR.wallBounce; else c.x = nx;
  const ny = c.y + c.vy * dt;
  if (carHitsWorld(c, world, c.x, ny)) c.vy *= -CAR.wallBounce; else c.y = ny;
}
