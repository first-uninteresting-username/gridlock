import Phaser from 'phaser';
import type { Car } from '../sim/car';
import { addSprite, setSprite } from './art';

/** SVG car (tinted to the car's colour) plus an unrotated drop shadow. */
export class CarView {
  private readonly shadow: Phaser.GameObjects.Image;
  private readonly body: Phaser.GameObjects.Image;
  private readonly trim: Phaser.GameObjects.Image;
  private readonly root: Phaser.GameObjects.Container;
  private drawnWrecked = false;

  constructor(scene: Phaser.Scene, private readonly car: Car) {
    this.shadow = addSprite(scene, 'car-shadow').setDepth(1);
    this.body = addSprite(scene, 'car-body').setTint(car.color);
    this.trim = addSprite(scene, 'car-trim');
    this.root = scene.add.container(0, 0, [this.body, this.trim]).setDepth(2);
    this.sync();
  }

  private drawBody(): void {
    if (this.car.wrecked) {
      setSprite(this.body, 'car-wrecked').clearTint();
      this.trim.setVisible(false);
    } else {
      setSprite(this.body, 'car-body').setTint(this.car.color);
      this.trim.setVisible(true);
    }
  }

  sync(): void {
    const c = this.car;
    if (c.wrecked !== this.drawnWrecked) { this.drawnWrecked = c.wrecked; this.drawBody(); }
    this.shadow.setPosition(c.x + 4, c.y + 5).setRotation(c.a);
    this.root.setPosition(c.x, c.y).setRotation(c.a);
  }
}
