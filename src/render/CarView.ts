import Phaser from 'phaser';
import type { Car } from '../sim/car';
import { CAR } from '../sim/tuning';
import { ART_PIXEL, addSprite, carSprite, setSprite } from './art';

const SHADOW_OFFSET = { x: 4, y: 5 };
const SHADOW_ALPHA = 0.35;
/** Wheels are plain blocks a whole number of art pixels long and wide, so they stay on the pixel grid. */
const WHEEL_LENGTH_PER_HALF_WIDTH = 0.35; // art pixels of length per world px of the car's half width
const WHEEL_WIDTH = 2; // art pixels
const WHEEL_STICK_OUT = 1; // art pixels beyond the body's side

/** Pixel-art car (tinted to the car's colour), its wheels, and a drop shadow cast by its own silhouette. */
export class CarView {
  private readonly shadow: Phaser.GameObjects.Image;
  private readonly body: Phaser.GameObjects.Image;
  private readonly trim: Phaser.GameObjects.Image;
  private readonly root: Phaser.GameObjects.Container;
  private readonly frontWheels: Phaser.GameObjects.Image[] = [];
  private drawnWrecked = false;

  constructor(scene: Phaser.Scene, private readonly car: Car) {
    const m = car.model;
    this.shadow = addSprite(scene, carSprite(car.model.id, 'body')).setTint(0x000000).setAlpha(SHADOW_ALPHA).setDepth(1);
    this.body = addSprite(scene, carSprite(this.car.model.id, 'body')).setTint(car.color);
    this.trim = addSprite(scene, carSprite(this.car.model.id, 'trim'));

    // Wheels sit under the body and stick out a little at the sides.
    const wheelLen = Math.max(3, Math.round(car.hw * WHEEL_LENGTH_PER_HALF_WIDTH)) * ART_PIXEL, wheelWid = WHEEL_WIDTH * ART_PIXEL;
    const wheelY = car.hw - wheelWid / 2 + WHEEL_STICK_OUT * ART_PIXEL;
    const wheels: Phaser.GameObjects.Image[] = [];
    for (const axle of m.axles) {
      const ys = axle.wheels === 2 ? [-wheelY, wheelY] : [0];
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
    this.shadow.setPosition(c.x + SHADOW_OFFSET.x, c.y + SHADOW_OFFSET.y).setRotation(c.a);
    this.root.setPosition(c.x, c.y).setRotation(c.a);
    for (const w of this.frontWheels) w.setRotation(c.steer * CAR.wheelLock);
  }
}
