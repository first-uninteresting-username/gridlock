import Phaser from 'phaser';
import type { Car } from '../sim/car';
import type { SimEvent } from '../sim/Simulation';
import { DAMAGE } from '../sim/tuning';
import type { Bullet } from '../sim/weapons';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  age: number;
  life: number;
  r: number;
  /** Radius growth per second. */
  grow: number;
  color: number;
  alpha: number;
}

/** Bullets, flashes, sparks, smoke, fire and explosions, all drawn into one Graphics layer. */
export class Effects {
  private readonly g: Phaser.GameObjects.Graphics;
  private parts: Particle[] = [];

  constructor(scene: Phaser.Scene) {
    this.g = scene.add.graphics().setDepth(5);
  }

  private add(x: number, y: number, o: Partial<Particle> & { life: number; r: number; color: number }): void {
    this.parts.push({ x, y, vx: 0, vy: 0, age: 0, grow: 0, alpha: 1, ...o });
  }

  private burst(x: number, y: number, n: number, speed: number, o: { life: number; r: number; color: number; grow?: number; alpha?: number }): void {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, s = speed * (0.4 + Math.random() * 0.6);
      this.add(x, y, { ...o, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: o.life * (0.6 + Math.random() * 0.6) });
    }
  }

  handle(e: SimEvent): void {
    switch (e.type) {
      case 'shot':
        this.add(e.x + Math.cos(e.a) * 4, e.y + Math.sin(e.a) * 4, { life: 0.05, r: 6, color: 0xfff1a8 });
        break;
      case 'melee':
        this.add(e.x, e.y, { life: 0.07, r: 4, color: 0xffffff, alpha: 0.8 });
        break;
      case 'impact':
        if (e.on === 'ped') { this.burst(e.x, e.y, 6, 150, { life: 0.3, r: 1.8, color: 0xa3151a }); break; }
        this.burst(e.x, e.y, 4, 220, { life: 0.15, r: 1.6, color: e.on === 'car' ? 0xffb347 : 0xfff1a8 });
        if (e.on === 'wall') this.add(e.x, e.y, { life: 0.4, r: 3, grow: 14, color: 0xb0aaa0, alpha: 0.5 });
        break;
      case 'ignite':
        this.burst(e.car.x, e.car.y, 8, 90, { life: 0.4, r: 4, color: 0xff7a1a });
        break;
      case 'explosion':
        this.add(e.x, e.y, { life: 0.3, r: 20, grow: 320, color: 0xfff1a8, alpha: 0.9 });
        this.burst(e.x, e.y, 18, 260, { life: 0.5, r: 7, grow: 20, color: 0xff7a1a });
        this.burst(e.x, e.y, 14, 70, { life: 1.6, r: 10, grow: 30, color: 0x3a3a3a, alpha: 0.6 });
        break;
      case 'pedKilled':
        this.burst(e.ped.x, e.ped.y, e.by === 'explosion' ? 14 : 10, 170, { life: 0.4, r: 2.4, color: 0xa3151a });
        break;
      case 'pickup':
        this.burst(e.x, e.y, 10, 120, { life: 0.3, r: 2.5, color: 0xffd23f });
        break;
    }
  }

  /** Ages particles, emits smoke/fire from damaged cars, and draws everything. */
  update(dt: number, cars: readonly Car[], bullets: readonly Bullet[]): void {
    for (const c of cars) {
      if (c.burning !== null) {
        if (Math.random() < 40 * dt) this.add(c.x + rand(10), c.y + rand(8), { life: 0.45, r: 5, grow: 12, color: Math.random() < 0.5 ? 0xff7a1a : 0xffc23a, vx: rand(20), vy: rand(20) });
        if (Math.random() < 14 * dt) this.add(c.x + rand(8), c.y + rand(8), { life: 1.4, r: 6, grow: 22, color: 0x2e2e2e, alpha: 0.55, vx: rand(15), vy: rand(15) });
      } else if (c.wrecked) {
        if (Math.random() < 5 * dt) this.add(c.x + rand(8), c.y + rand(6), { life: 1.8, r: 4, grow: 16, color: 0x2e2e2e, alpha: 0.4, vx: rand(10), vy: rand(10) });
      } else if (c.health < c.maxHealth * DAMAGE.smokeBelow) {
        const heavy = c.health < (c.maxHealth * DAMAGE.smokeBelow) / 2;
        if (Math.random() < (heavy ? 14 : 6) * dt) {
          const fx = Math.cos(c.a) * c.hl * 0.7, fy = Math.sin(c.a) * c.hl * 0.7; // smoke from the bonnet
          this.add(c.x + fx, c.y + fy, { life: 1.2, r: 4, grow: 18, color: heavy ? 0x555555 : 0x9a9a9a, alpha: 0.45, vx: rand(12), vy: rand(12) });
        }
      }
    }

    const g = this.g;
    g.clear();
    this.parts = this.parts.filter((p) => (p.age += dt) < p.life);
    for (const p of this.parts) {
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.vx *= 1 - 3 * dt; p.vy *= 1 - 3 * dt;
      const t = p.age / p.life;
      g.fillStyle(p.color, p.alpha * (1 - t)).fillCircle(p.x, p.y, p.r + p.grow * p.age);
    }
    g.lineStyle(2, 0xfff1a8, 0.9);
    for (const b of bullets) g.lineBetween(b.x - b.vx * 0.015, b.y - b.vy * 0.015, b.x, b.y);
  }
}

const rand = (n: number) => (Math.random() * 2 - 1) * n;
