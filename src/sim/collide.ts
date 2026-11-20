import { carHitsWorld, carPoints, type Car } from './car';
import { CAR } from './tuning';
import type { SolidQuery } from './types';

function tryPush(c: Car, ox: number, oy: number, world: SolidQuery): boolean {
  if (carHitsWorld(c, world, c.x + ox, c.y + oy)) return false;
  c.x += ox;
  c.y += oy;
  return true;
}

/** Separating-axis test between two car boxes; pushes them apart and exchanges momentum. */
export function collideCars(a: Car, b: Car, world: SolidQuery): boolean {
  const dx = b.x - a.x, dy = b.y - a.y;
  const reach = a.hl + b.hl + 10;
  if (dx * dx + dy * dy > reach * reach) return false;

  const pa = carPoints(a.x, a.y, a.a, a.hl, a.hw), pb = carPoints(b.x, b.y, b.a, b.hl, b.hw);
  const axes: [number, number][] = [
    [Math.cos(a.a), Math.sin(a.a)], [-Math.sin(a.a), Math.cos(a.a)],
    [Math.cos(b.a), Math.sin(b.a)], [-Math.sin(b.a), Math.cos(b.a)],
  ];
  let best = Infinity, nx = 0, ny = 0;
  for (const [ax, ay] of axes) {
    let amin = Infinity, amax = -Infinity, bmin = Infinity, bmax = -Infinity;
    for (const [px, py] of pa) { const d = px * ax + py * ay; if (d < amin) amin = d; if (d > amax) amax = d; }
    for (const [px, py] of pb) { const d = px * ax + py * ay; if (d < bmin) bmin = d; if (d > bmax) bmax = d; }
    const overlap = Math.min(amax - bmin, bmax - amin);
    if (overlap <= 0) return false;
    if (overlap < best) { best = overlap; nx = ax; ny = ay; }
  }
  if (dx * nx + dy * ny < 0) { nx = -nx; ny = -ny; } // normal points from a to b

  // Split the push by weight (the lighter car moves more); if one car is against a wall the
  // other takes all of it.
  const ia = 1 / a.model.mass, ib = 1 / b.model.mass, share = ia + ib;
  const pushA = (best * ia) / share, pushB = (best * ib) / share;
  const okA = tryPush(a, -nx * pushA, -ny * pushA, world);
  const okB = tryPush(b, nx * pushB, ny * pushB, world);
  if (!okA) tryPush(b, nx * (best - pushB), ny * (best - pushB), world);
  if (!okB) tryPush(a, -nx * (best - pushA), -ny * (best - pushA), world);

  const closing = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
  if (closing < 0) {
    const j = (-(1 + CAR.carBounce) * closing) / share;
    a.vx -= j * ia * nx; a.vy -= j * ia * ny;
    b.vx += j * ib * nx; b.vy += j * ib * ny;
  }
  return true;
}
