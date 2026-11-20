import Phaser from 'phaser';
import { FONT_ADVANCE, glyphKey } from '../render/pixelart/font';

/** Screen-space pixel-art HUD: bitmap text, wanted stars and a cash icon, drawn by the game camera. */
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
const SHADOW_COLOR = 0x0d0f12;

type Star = { shadow: Phaser.GameObjects.Image; on: Phaser.GameObjects.Image; off: Phaser.GameObjects.Image };

/** One line of tinted bitmap glyphs with a 1px dark shadow, so text reads over the busy street. */
class PixelText {
  private readonly shadow: Phaser.GameObjects.Image[] = [];
  private readonly main: Phaser.GameObjects.Image[] = [];
  private value = '';

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly layer: Phaser.GameObjects.Container,
    private readonly x: number,
    private readonly y: number,
    private readonly color: number,
  ) {}

  set(text: string): void {
    const next = text.toUpperCase();
    if (next === this.value) return;
    this.value = next;
    for (let i = 0; i < next.length; i++) {
      if (!this.main[i]) {
        const s = this.scene.add.image(0, 0, glyphKey(' ')).setTint(SHADOW_COLOR);
        const m = this.scene.add.image(0, 0, glyphKey(' ')).setTint(this.color);
        this.shadow[i] = s;
        this.main[i] = m;
        this.layer.add([s, m]);
      }
      const key = glyphKey(next[i]);
      const x = this.x + i * FONT_ADVANCE;
      this.shadow[i].setTexture(key).setPosition(x + 1, this.y + 1).setVisible(true);
      this.main[i].setTexture(key).setPosition(x, this.y).setVisible(true);
    }
    for (let i = next.length; i < this.main.length; i++) {
      this.shadow[i].setVisible(false);
      this.main[i].setVisible(false);
    }
  }
}

export class Hud {
  private readonly root: Phaser.GameObjects.Container;
  private readonly status: PixelText;
  private readonly cash: PixelText;
  private readonly stars: Star[] = [];
  private lastWanted = -1;
  private lastMax = -1;

  constructor(private readonly scene: Phaser.Scene) {
    // scrollFactor(0) multiplies with each child's factor, so everything in this container stays
    // pinned to the screen; sync() undoes the world camera's zoom to keep one texel one canvas pixel.
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

  /** Re-anchors the HUD after the world camera changes zoom or the canvas resizes. */
  sync(): void {
    const cam = this.scene.cameras.main;
    const zoom = cam.zoom;
    const cx = cam.x + cam.width / 2;
    const cy = cam.y + cam.height / 2;
    this.root.setPosition(cx + (PAD - cx) / zoom, cy + (PAD - cy) / zoom).setScale(1 / zoom);
  }
}
