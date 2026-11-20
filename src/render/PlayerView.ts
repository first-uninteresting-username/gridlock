import Phaser from 'phaser';
import type { Player } from '../sim/player';

export class PlayerView {
  private readonly g: Phaser.GameObjects.Graphics;
  private lastStride = NaN;

  constructor(scene: Phaser.Scene, private readonly player: Player) {
    this.g = scene.add.graphics().setDepth(3);
  }

  sync(): void {
    const p = this.player;
    this.g.setVisible(!p.car);
    if (p.car) return;
    this.g.setPosition(p.x, p.y).setRotation(p.a);
    if (p.stride === this.lastStride) return;
    this.lastStride = p.stride;
    const s = Math.sin(p.stride) * 5;
    this.g.clear();
    this.g.fillStyle(0x222222).fillRect(s - 3, -6, 6, 4).fillRect(-s - 3, 2, 6, 4); // feet
    this.g.fillStyle(0x2c5aa0).fillEllipse(0, 0, 12, 20); // shoulders
    this.g.fillStyle(0x5a3a22).fillCircle(1, 0, 5); // head
  }
}
