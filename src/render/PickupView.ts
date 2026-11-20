import Phaser from 'phaser';
import type { Pickup } from '../sim/Simulation';

/** A pulsing weapon crate on the ground; hidden while it waits to respawn. */
export class PickupView {
  private readonly g: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene, private readonly pickup: Pickup) {
    const g = (this.g = scene.add.graphics().setDepth(1.5).setPosition(pickup.x, pickup.y));
    g.fillStyle(0xffd34d, 0.25).fillCircle(0, 0, 18);
    g.fillStyle(0x1e1e22).fillRoundedRect(-12, -8, 24, 16, 3);
    g.lineStyle(2, 0xffd34d).strokeRoundedRect(-12, -8, 24, 16, 3);
    g.fillStyle(0xffd34d).fillRect(-7, -3, 12, 3).fillRect(-3, 0, 3, 4); // gun silhouette
  }

  sync(time: number): void {
    this.g.setVisible(this.pickup.respawn === 0);
    this.g.setScale(1 + Math.sin(time * 5) * 0.08);
  }
}
