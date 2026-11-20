import Phaser from 'phaser';
import type { Pedestrian } from '../sim/pedestrian';
import { addSprite } from './art';
import { shirtColor } from './looks';

const DEPTH_ALIVE = 2.5; // above cars, below the player
const DEPTH_DEAD = 0.7; // lying on the ground, under everything that moves

/** A walking pedestrian, or a body and a pool of blood once dead. */
export class PedestrianView {
  private readonly root: Phaser.GameObjects.Container;
  private readonly footL: Phaser.GameObjects.Image;
  private readonly footR: Phaser.GameObjects.Image;
  private readonly body: Phaser.GameObjects.Image;
  private readonly blood: Phaser.GameObjects.Image;
  private look = -1;
  private dead = false;

  constructor(scene: Phaser.Scene, private readonly ped: Pedestrian) {
    this.blood = addSprite(scene, 'ped-blood').setDepth(DEPTH_DEAD - 0.1).setVisible(false);
    this.footL = addSprite(scene, 'player-foot');
    this.footR = addSprite(scene, 'player-foot');
    this.body = addSprite(scene, 'ped-body');
    const head = addSprite(scene, 'ped-head', 1, 0);
    this.root = scene.add.container(0, 0, [this.footL, this.footR, this.body, head]).setDepth(DEPTH_ALIVE);
    this.sync();
  }

  sync(): void {
    const p = this.ped;
    if (p.look !== this.look) { this.look = p.look; this.body.setTint(shirtColor(p.look)); }
    const dead = p.state === 'dead';
    if (dead !== this.dead) {
      this.dead = dead;
      this.root.setDepth(dead ? DEPTH_DEAD : DEPTH_ALIVE);
      this.footL.setVisible(!dead);
      this.footR.setVisible(!dead);
      this.blood.setVisible(dead).setRotation(p.x * 0.37 + p.y * 0.11); // any angle, but stable per spot
    }
    this.root.setPosition(p.x, p.y).setRotation(p.a);
    if (dead) {
      this.blood.setPosition(p.x, p.y).setScale(Math.min(1, 0.3 + p.deadFor * 0.7)); // the pool spreads
      return;
    }
    const s = Math.sin(p.stride) * (p.state === 'flee' ? 5 : 3.5);
    this.footL.setPosition(s, -3);
    this.footR.setPosition(-s, 3);
  }
}
