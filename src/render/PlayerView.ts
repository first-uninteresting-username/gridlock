import Phaser from 'phaser';
import type { Player } from '../sim/player';
import type { WeaponId } from '../sim/weapons';
import { addSprite, setSprite, type SpriteKey } from './art';

const GUNS: Record<WeaponId, SpriteKey> = { pistol: 'gun-pistol', smg: 'gun-smg' };

export class PlayerView {
  private readonly root: Phaser.GameObjects.Container;
  private readonly footL: Phaser.GameObjects.Image;
  private readonly footR: Phaser.GameObjects.Image;
  private readonly gun: Phaser.GameObjects.Image;

  constructor(scene: Phaser.Scene, private readonly player: Player) {
    this.footL = addSprite(scene, 'player-foot');
    this.footR = addSprite(scene, 'player-foot');
    const body = addSprite(scene, 'player-body');
    this.gun = addSprite(scene, 'gun-pistol').setOrigin(0, 0).setPosition(5, 2); // right hand
    const head = addSprite(scene, 'player-head', 1, 0);
    this.root = scene.add.container(0, 0, [this.footL, this.footR, body, this.gun, head]).setDepth(3);
  }

  sync(weapon: WeaponId): void {
    const p = this.player;
    this.root.setVisible(!p.car);
    if (p.car) return;
    this.root.setPosition(p.x, p.y).setRotation(p.a);
    const s = Math.sin(p.stride) * 5;
    this.footL.setPosition(s, -4);
    this.footR.setPosition(-s, 4);
    if (this.gun.texture.key !== GUNS[weapon]) setSprite(this.gun, GUNS[weapon]);
  }
}
