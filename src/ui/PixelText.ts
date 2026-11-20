import Phaser from 'phaser';
import { FONT_ADVANCE, glyphKey } from '../render/pixelart/font';

/** 1px drop shadow under UI glyphs, tinted from the palette's void colour. */
export const SHADOW_COLOR = 0x0d0f12;

type Cell = { main: Phaser.GameObjects.Image; shadow?: Phaser.GameObjects.Image };

/** A line of tinted bitmap glyphs for screen-space UI layers (HUD, menu). */
export class PixelText {
  private readonly cells: Cell[] = [];
  private value = '';

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly layer: Phaser.GameObjects.Container,
    private x: number,
    private y: number,
    private readonly color: number,
    private readonly scale = 1,
    private readonly shadow = true,
  ) {}

  set(text: string): void {
    const next = text.toUpperCase();
    if (next === this.value) return;
    this.value = next;
    for (let i = 0; i < next.length; i++) {
      if (!this.cells[i]) {
        const main = this.scene.add.image(0, 0, glyphKey(' ')).setTint(this.color).setScale(this.scale);
        const shadow = this.shadow
          ? this.scene.add.image(0, 0, glyphKey(' ')).setTint(SHADOW_COLOR).setScale(this.scale)
          : undefined;
        if (shadow) this.layer.add(shadow);
        this.layer.add(main);
        this.cells[i] = { main, shadow };
      }
      const key = glyphKey(next[i]);
      const x = this.x + i * FONT_ADVANCE * this.scale;
      const blank = next[i] === ' ';
      const { main, shadow } = this.cells[i];
      main.setTexture(key).setPosition(x, this.y).setVisible(!blank);
      shadow?.setTexture(key).setPosition(x + 1, this.y + 1).setVisible(!blank);
    }
    for (let i = next.length; i < this.cells.length; i++) {
      this.cells[i].main.setVisible(false);
      this.cells[i].shadow?.setVisible(false);
    }
  }

  /** Repositions an existing line when the panel is re-laid out (no texture work). */
  move(x: number, y: number): void {
    this.x = x;
    this.y = y;
    for (let i = 0; i < this.cells.length; i++) {
      const xPos = x + i * FONT_ADVANCE * this.scale;
      this.cells[i].main.setPosition(xPos, y);
      this.cells[i].shadow?.setPosition(xPos + 1, y + 1);
    }
  }
}
