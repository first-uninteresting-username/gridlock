import type Phaser from 'phaser';
import { ART_PIXEL } from '../render/art';
import { FONT_ADVANCE, glyphKey } from '../render/pixelart/font';
import type { Pedestrian } from '../sim/pedestrian';

const SHADOW = 0x0d0f12;
const TEXT = 0xeeeeee;
const KEY_COLOR = 0xffd23f;
/** Key first, then the action: the bitmap font has capitals only. */
const KEY = 'R';
const LABEL = `${KEY}  ROB`;

/**
 * A small pixel-font prompt that hangs above a pedestrian while they can be robbed. Glyph textures
 * are one texel per art pixel; the container is scaled by ART_PIXEL and the world camera zooms to
 * 1/ART_PIXEL at rest, so every texel lands on one canvas pixel.
 */
export class InteractionTooltip {
  private readonly root: Phaser.GameObjects.Container;
  private target: Pedestrian | null = null;

  constructor(scene: Phaser.Scene) {
    const width = LABEL.length * FONT_ADVANCE - 1; // every glyph but the last advances a full step
    const left = -Math.floor(width / 2);
    const backing = scene.add.graphics();
    backing.fillStyle(SHADOW, 0.85).fillRect(left - 1, -6, width + 2, 12);
    backing.lineStyle(1, 0xffffff, 0.4).strokeRect(left - 1, -6, width + 2, 12);

    const glyphs: Phaser.GameObjects.Image[] = [];
    for (let i = 0; i < LABEL.length; i++) {
      const color = i < KEY.length ? KEY_COLOR : TEXT;
      glyphs.push(scene.add.image(left + i * FONT_ADVANCE, -3, glyphKey(LABEL[i])).setTint(color));
    }
    this.root = scene.add.container(0, 0, [backing, ...glyphs]).setDepth(20).setScale(ART_PIXEL);
    this.root.setVisible(false);
  }

  /** Point the tooltip at a pedestrian, or pass null to hide it. */
  show(target: Pedestrian | null): void {
    this.target = target;
    this.root.setVisible(target !== null);
  }

  sync(): void {
    if (this.target) this.root.setPosition(this.target.x, this.target.y - 14 * ART_PIXEL);
  }
}
