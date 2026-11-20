import Phaser from 'phaser';
import { PixelText, SHADOW_COLOR } from './PixelText';

/** Screen-space pixel-art HUD: bitmap text, wanted stars and a cash icon, drawn by the UI scene. */
const PAD = 8;
const STATUS_Y = 0;
const WANTED_Y = 12;
const CASH_Y = 24;
const STAR_SIZE = 9;
const STAR_GAP = 1;
const COIN_SIZE = 7;
const CASH_TEXT_X = COIN_SIZE + 2;

const TEXT_COLOR = 0xeeeeee;
const CASH_COLOR = 0x6fdc8c;

type Star = { shadow: Phaser.GameObjects.Image; on: Phaser.GameObjects.Image; off: Phaser.GameObjects.Image };

export class Hud {
  private readonly root: Phaser.GameObjects.Container;
  private readonly status: PixelText;
  private readonly cash: PixelText;
  private readonly stars: Star[] = [];
  private lastWanted = -1;
  private lastMax = -1;

  constructor(private readonly scene: Phaser.Scene) {
    // scrollFactor(0) multiplies with each child's factor, so everything in this container stays
    // pinned to its camera; sync() keeps one texel one canvas pixel.
    this.root = scene.add.container().setScrollFactor(0).setDepth(1000);
    this.status = new PixelText(scene, this.root, 0, STATUS_Y, TEXT_COLOR);
    this.cash = new PixelText(scene, this.root, CASH_TEXT_X, CASH_Y, CASH_COLOR);

    this.root.add(scene.add.image(1, CASH_Y + 1, 'hud-coin').setTint(SHADOW_COLOR));
    this.root.add(scene.add.image(0, CASH_Y, 'hud-coin'));
  }

  setStatus(text: string): void {
    this.status.set(text);
  }

  /** Wanted stars: `level` filled out of `max`. */
  setWanted(level: number, max: number): void {
    if (level === this.lastWanted && max === this.lastMax) return;
    this.lastWanted = level;
    this.lastMax = max;
    while (this.stars.length < max) {
      const x = this.stars.length * (STAR_SIZE + STAR_GAP);
      const shadow = this.scene.add.image(x + 1, WANTED_Y + 1, 'hud-star-on').setTint(SHADOW_COLOR);
      const on = this.scene.add.image(x, WANTED_Y, 'hud-star-on');
      const off = this.scene.add.image(x, WANTED_Y, 'hud-star-off');
      this.stars.push({ shadow, on, off });
      this.root.add([shadow, on, off]);
    }
    this.stars.forEach((s, i) => {
      const filled = i < level;
      s.shadow.setVisible(filled);
      s.on.setVisible(filled);
      s.off.setVisible(i < max && !filled);
    });
  }

  setCash(dollars: number): void {
    this.cash.set(`$${dollars.toLocaleString('en-US')}`);
  }

  /** Re-anchors the HUD to the UI camera's top-left corner. */
  sync(): void {
    const cam = this.scene.cameras.main;
    const zoom = cam.zoom;
    const cx = cam.x + cam.width / 2;
    const cy = cam.y + cam.height / 2;
    this.root.setPosition(cx + (PAD - cx) / zoom, cy + (PAD - cy) / zoom).setScale(1 / zoom);
  }
}
