import type Phaser from 'phaser';
import type { Pickup } from '../sim/Simulation';
import { addSprite } from './art';

/** A pulsing weapon crate or cash bundle on the ground; hidden while it waits to respawn. */
export class PickupView {
  /** The pulse scales the container, so the sprite keeps its own world-size scale. */
  private readonly root: Phaser.GameObjects.Container;

  constructor(scene: Phaser.Scene, private readonly pickup: Pickup) {
    const sprite = pickup.kind === 'cash' ? 'cash' : pickup.kind === 'ammo' ? 'ammo' : 'pickup';
    this.root = scene.add.container(pickup.x, pickup.y, [addSprite(scene, sprite)]).setDepth(1.5);
  }

  sync(time: number): void {
    this.root.setVisible(this.pickup.respawn === 0).setScale(1 + Math.sin(time * 5) * 0.08);
  }
}
