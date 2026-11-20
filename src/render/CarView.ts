import Phaser from 'phaser';
import type { Car } from '../sim/car';

/** Vector-drawn car (stays crisp at any zoom) plus an unrotated drop shadow. */
export class CarView {
  private readonly shadow: Phaser.GameObjects.Graphics;
  private readonly body: Phaser.GameObjects.Graphics;
  private drawnWrecked = false;

  constructor(scene: Phaser.Scene, private readonly car: Car) {
    const L = car.hl, W = car.hw;
    this.shadow = scene.add.graphics().setDepth(1);
    this.shadow.fillStyle(0x000000, 0.35).fillRect(-L, -W, L * 2, W * 2);

    this.body = scene.add.graphics().setDepth(2);
    this.drawBody();
    this.sync();
  }

  private drawBody(): void {
    const g = this.body, L = this.car.hl, W = this.car.hw;
    g.clear();
    if (this.car.wrecked) {
      g.fillStyle(0x1c1c1c).fillRoundedRect(-L, -W, L * 2, W * 2, 6);
      g.fillStyle(0x0c0c0c).fillRect(L * 0.1, -W + 3, L * 0.4, W * 2 - 6).fillRect(-L * 0.8, -W + 3, L * 0.3, W * 2 - 6);
      g.fillStyle(0x2c2622).fillRect(-L * 0.5, -W + 3, L * 0.6, W * 2 - 6);
      return;
    }
    g.fillStyle(this.car.color).fillRoundedRect(-L, -W, L * 2, W * 2, 6);
    g.fillStyle(0x1b2430);
    g.fillRect(L * 0.1, -W + 3, L * 0.4, W * 2 - 6); // windshield
    g.fillRect(-L * 0.8, -W + 3, L * 0.3, W * 2 - 6); // rear window
    g.fillStyle(0xffffff, 0.18).fillRect(-L * 0.5, -W + 3, L * 0.6, W * 2 - 6); // roof
    g.fillStyle(0xffe9a8).fillRect(L - 3, -W + 2, 3, 4).fillRect(L - 3, W - 6, 3, 4); // headlights
    g.fillStyle(0xb3201b).fillRect(-L, -W + 2, 2, 4).fillRect(-L, W - 6, 2, 4); // tail lights
  }

  sync(): void {
    const c = this.car;
    if (c.wrecked !== this.drawnWrecked) { this.drawnWrecked = c.wrecked; this.drawBody(); }
    this.shadow.setPosition(c.x + 4, c.y + 5).setRotation(c.a);
    this.body.setPosition(c.x, c.y).setRotation(c.a);
  }
}
