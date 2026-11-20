import Phaser from 'phaser';
import type { Car } from '../sim/car';
import { CAR } from '../sim/tuning';
import { addSprite, carSprite, setSprite } from './art';

/** SVG car (tinted to the car's colour), its wheels, and an unrotated drop shadow. */
export class CarView {
  private readonly shadow: Phaser.GameObjects.Image;
  private readonly body: Phaser.GameObjects.Image;
  private readonly trim: Phaser.GameObjects.Image;
  private readonly root: Phaser.GameObjects.Container;
  private readonly frontWheels: Phaser.GameObjects.Image[] = [];
  private drawnWrecked = false;

  constructor(scene: Phaser.Scene, private readonly car: Car) {
    const m = car.model;
    this.shadow = addSprite(scene, 'car-shadow').setDisplaySize(car.hl * 2, car.hw * 2).setDepth(1);
    this.body = addSprite(scene, carSprite(this.car.model.id, 'body')).setTint(car.color);
    this.trim = addSprite(scene, carSprite(this.car.model.id, 'trim'));

    // Wheels sit under the body and stick out a little at the sides.
    const wheelLen = car.hw * 0.7, wheelWid = 3 + car.hw / 10;
    const wheels: Phaser.GameObjects.Image[] = [];
    for (const axle of m.axles) {
      const ys = axle.wheels === 2 ? [-(car.hw - wheelWid / 2 + 1.8), car.hw - wheelWid / 2 + 1.8] : [0];
      for (const y of ys) {
        const w = addSprite(scene, 'car-wheel', axle.x, y).setDisplaySize(wheelLen, wheelWid);
        wheels.push(w);
        if (axle.steered) this.frontWheels.push(w);
      }
    }
    this.root = scene.add.container(0, 0, [...wheels, this.body, this.trim]).setDepth(2);
    this.sync();
  }

  private drawBody(): void {
    if (this.car.wrecked) {
      setSprite(this.body, carSprite(this.car.model.id, 'wrecked')).clearTint();
      this.trim.setVisible(false);
    } else {
      setSprite(this.body, carSprite(this.car.model.id, 'body')).setTint(this.car.color);
      this.trim.setVisible(true);
    }
  }

  sync(): void {
    const c = this.car;
    if (c.wrecked !== this.drawnWrecked) { this.drawnWrecked = c.wrecked; this.drawBody(); }
    this.shadow.setPosition(c.x + 4, c.y + 5).setRotation(c.a);
    this.root.setPosition(c.x, c.y).setRotation(c.a);
    for (const w of this.frontWheels) w.setRotation(c.steer * CAR.wheelLock);
  }
}
