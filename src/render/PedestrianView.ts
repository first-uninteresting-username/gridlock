import Phaser from 'phaser';
import type { Pedestrian } from '../sim/pedestrian';
import { addSprite, setSprite } from './art';
import { shirtColor } from './looks';

const DEPTH_ALIVE = 2.5; // above cars, below the player
const DEPTH_DEAD = 0.7; // lying on the ground, under everything that moves

/** A walking pedestrian, or a sprawled corpse and a pool of blood once dead. */
export class PedestrianView {
  private readonly root: Phaser.GameObjects.Container;
  private readonly footL: Phaser.GameObjects.Image;
  private readonly footR: Phaser.GameObjects.Image;
  private readonly body: Phaser.GameObjects.Image;
  private readonly head: Phaser.GameObjects.Image;
  private readonly corpse: Phaser.GameObjects.Image;
  private readonly blood: Phaser.GameObjects.Image;
  private look = -1;
  private police = false;
  private dead = false;

  constructor(scene: Phaser.Scene, private readonly ped: Pedestrian) {
    this.blood = addSprite(scene, 'ped-blood').setDepth(DEPTH_DEAD - 0.1).setVisible(false);
    this.footL = addSprite(scene, 'player-foot');
    this.footR = addSprite(scene, 'player-foot');
    this.body = addSprite(scene, 'ped-body');
    this.head = addSprite(scene, 'ped-head', 1, 0);
    this.corpse = addSprite(scene, 'ped-corpse').setVisible(false);
    this.root = scene.add.container(0, 0, [this.footL, this.footR, this.body, this.head, this.corpse]).setDepth(DEPTH_ALIVE);
    this.sync();
  }

  sync(): void {
    const p = this.ped;
    if (p.police !== this.police) {
      this.police = p.police;
      setSprite(this.body, p.police ? 'police-body' : 'ped-body');
      setSprite(this.head, p.police ? 'police-head' : 'ped-head');
      if (p.police) this.body.clearTint();
      else { this.look = -1; this.body.setTint(shirtColor(p.look)); }
    }
    if (!p.police && p.look !== this.look) { this.look = p.look; this.body.setTint(shirtColor(p.look)); }
    const dead = p.state === 'dead';
    if (dead !== this.dead) {
      this.dead = dead;
      this.root.setDepth(dead ? DEPTH_DEAD : DEPTH_ALIVE);
      this.footL.setVisible(!dead);
      this.footR.setVisible(!dead);
      this.body.setVisible(!dead);
      this.head.setVisible(!dead);
      this.corpse.setVisible(dead);
      // Fall at a stable angle for the spot, a little off the walking direction so bodies don't look posed.
      if (dead) this.corpse.setRotation(p.x * 0.53 + p.y * 0.29);
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
