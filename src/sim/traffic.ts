// AI driving for cars with someone in the driver's seat. The city's roads form a grid, so an AI
// driver just follows lane points to the next intersection, picks a turn there, and repeats. All of
// it lives outside the renderer; it only produces the same Input the player's keys would.
import { carSpeed, type Car } from './car';
import type { Driver } from './driver';
import { TRAFFIC } from './tuning';
import { NO_INPUT, type Input, type World } from './types';

/** Clockwise from east, matching the game's angle convention (PI/2 = south). */
const DIRS = [
  { dx: 1, dy: 0 },
  { dx: 0, dy: 1 },
  { dx: -1, dy: 0 },
  { dx: 0, dy: -1 },
] as const;
type Dir = 0 | 1 | 2 | 3;

interface Nav {
  /** Grid node (column index into xs, row index into ys) the car is at or leaving. */
  i: number;
  j: number;
  dir: Dir;
  /** Where the next waypoint is: out on the lane, or at the intersection centre. */
  phase: 'lane' | 'corner';
  /** Seconds spent barely moving, so a car wedged against a wall can pick a new route. */
  stuck: number;
  /** Seconds left of a reversing manoeuvre to back out of a corner. */
  reversing: number;
}

const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v);
const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));

/** Centre coordinate of each road band: a run of tile rows/columns that is mostly road. */
function roadCenters(world: World, axis: 'x' | 'y'): number[] {
  const across = axis === 'x' ? world.cols : world.rows;
  const along = axis === 'x' ? world.rows : world.cols;
  const centers: number[] = [];
  let run = -1;
  for (let k = 0; k <= along; k++) {
    let road = 0;
    if (k < along) for (let m = 0; m < across; m++) {
      const x = ((axis === 'x' ? k : m) + 0.5) * world.tileSize;
      const y = ((axis === 'x' ? m : k) + 0.5) * world.tileSize;
      if (world.kindAt(x, y) === 'road') road++;
    }
    const band = k < along && road / across > 0.8;
    if (band && run < 0) run = k;
    else if (!band && run >= 0) { centers.push(((run + k) / 2) * world.tileSize); run = -1; }
  }
  return centers;
}

function nearest(values: readonly number[], v: number): number {
  let best = 0, dist = Infinity;
  for (let i = 0; i < values.length; i++) {
    const d = Math.abs(values[i] - v);
    if (d < dist) { dist = d; best = i; }
  }
  return best;
}

function dirFromAngle(a: number): Dir {
  if (Math.abs(Math.cos(a)) >= Math.abs(Math.sin(a))) return Math.cos(a) >= 0 ? 0 : 2;
  return Math.sin(a) >= 0 ? 1 : 3;
}

/** Holds per-driver route state; the Driver itself only says who is in the seat. */
export class Traffic {
  private readonly xs: number[];
  private readonly ys: number[];
  private readonly lane: number;
  /** Keyed by seat, so the engine never has to know about driving. */
  private readonly nav = new WeakMap<Driver, Nav>();

  constructor(world: World) {
    this.xs = roadCenters(world, 'x');
    this.ys = roadCenters(world, 'y');
    this.lane = world.tileSize / 2;
  }

  /** Input for one AI car. `dt` and `random` come from the simulation's fixed step. */
  input(c: Car, driver: Driver, dt: number, random: () => number): Input {
    if (c.wrecked || c.burning !== null || this.xs.length === 0 || this.ys.length === 0) return NO_INPUT;
    let nav = this.nav.get(driver);
    if (!nav) {
      const start = this.start(c, random);
      if (!start) return NO_INPUT;
      nav = start;
      this.nav.set(driver, nav);
    }

    let [tx, ty] = this.waypoint(nav);
    if (Math.hypot(tx - c.x, ty - c.y) < TRAFFIC.waypointRadius) {
      if (nav.phase === 'lane') {
        const next = this.neighbour(nav.i, nav.j, nav.dir);
        if (!next) return this.backOut(nav, c, random);
        [nav.i, nav.j] = next;
        nav.phase = 'corner';
      } else {
        nav.dir = this.pickDirection(nav.i, nav.j, nav.dir, random);
        nav.phase = 'lane';
      }
      [tx, ty] = this.waypoint(nav);
    }

    if (nav.reversing > 0) {
      nav.reversing -= dt;
      return { ...NO_INPUT, throttle: -1 };
    }

    const diff = wrap(Math.atan2(ty - c.y, tx - c.x) - c.a);
    const speed = carSpeed(c);
    nav.stuck = speed < TRAFFIC.stuckSpeed ? nav.stuck + dt : 0;
    if (nav.stuck > TRAFFIC.stuckTime) return this.backOut(nav, c, random);
    // Keep rolling even when the waypoint is behind us: steering needs speed, so stopping on a
    // large heading error would leave the car unable to turn itself back toward the road.
    const throttle = speed > TRAFFIC.cruiseSpeed ? -0.5 : Math.abs(diff) > 1 ? 0.6 : 1;
    return {
      throttle,
      steer: clamp(diff / TRAFFIC.steerRange, -1, 1),
      handbrake: false,
      fire: false,
      sprint: false,
      aim: null,
      moveX: 0,
      moveY: 0,
    };
  }

  /** Mid-block lane point, or the centre of the junction being approached. */
  private waypoint(nav: Nav): [number, number] {
    const { i, j, dir } = nav;
    if (nav.phase === 'corner') return [this.xs[i], this.ys[j]];
    switch (dir) {
      case 0: return [(this.xs[i] + this.xs[i + 1]) / 2, this.ys[j] + this.lane];
      case 1: return [this.xs[i] - this.lane, (this.ys[j] + this.ys[j + 1]) / 2];
      case 2: return [(this.xs[i - 1] + this.xs[i]) / 2, this.ys[j] - this.lane];
      case 3: return [this.xs[i] + this.lane, (this.ys[j - 1] + this.ys[j]) / 2];
    }
  }

  /** The node one block away in `dir`, or null at the edge of the road grid. */
  private neighbour(i: number, j: number, dir: Dir): [number, number] | null {
    const { dx, dy } = DIRS[dir];
    const ni = i + dx, nj = j + dy;
    if (ni < 0 || ni >= this.xs.length || nj < 0 || nj >= this.ys.length) return null;
    return [ni, nj];
  }

  private canGo(i: number, j: number, dir: Dir): boolean {
    return this.neighbour(i, j, dir) !== null;
  }

  /** Straight most of the time, otherwise a possible left or right turn that stays on the map. */
  private pickDirection(i: number, j: number, dir: Dir, random: () => number): Dir {
    if (random() < TRAFFIC.turnChance) {
      const turns = ([((dir + 1) % 4), ((dir + 3) % 4)] as Dir[]).filter((d) => this.canGo(i, j, d));
      if (turns.length) return turns[Math.floor(random() * turns.length)];
    }
    if (this.canGo(i, j, dir)) return dir;
    const alternatives = ([0, 1, 2, 3] as Dir[]).filter((d) => d !== ((dir + 2) % 4) && this.canGo(i, j, d));
    return alternatives[Math.floor(random() * alternatives.length)] ?? dir;
  }

  private start(c: Car, random: () => number, keepHeading = true): Nav | null {
    const i = nearest(this.xs, c.x), j = nearest(this.ys, c.y);
    const heading = dirFromAngle(c.a);
    const options = ([0, 1, 2, 3] as Dir[]).filter((d) => this.canGo(i, j, d));
    if (!options.length) return null;
    const dir = keepHeading && this.canGo(i, j, heading)
      ? heading
      : options[Math.floor(random() * options.length)];
    return { i, j, dir, phase: 'lane', stuck: 0, reversing: 0 };
  }

  /** A wedged car forgets its route, then reverses briefly so it can clear whatever pinned it. */
  private backOut(nav: Nav, c: Car, random: () => number): Input {
    const fresh = this.start(c, random, false);
    if (fresh) Object.assign(nav, fresh);
    nav.reversing = TRAFFIC.reverseTime;
    nav.stuck = 0;
    return { ...NO_INPUT, throttle: -1 };
  }
}
