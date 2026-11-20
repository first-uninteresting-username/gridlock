import type Phaser from 'phaser';
import { ART_PIXEL } from '../render/art';
import { FONT_ADVANCE, glyphKey } from '../render/pixelart/font';
import type { GeneralAction } from '../sim/Simulation';

const SHADOW = 0x0d0f12;
const TEXT = 0xeeeeee;
const KEY_COLOR = 0xffd23f;
const KEY = 'F';
const VERBS: Record<GeneralAction['kind'], string> = { exit: 'EXIT', rob: 'ROB', enter: 'DRIVE' };
/** Padding keeps the label (and its backing box) a fixed width as the verb changes. */
const VERB_WIDTH = Math.max(...Object.values(VERBS).map((v) => v.length));
const LABEL_LENGTH = KEY.length + 2 + VERB_WIDTH;

/**
 * A small pixel-font prompt that hangs over whatever the general action key would act on — a
 * pedestrian you can rob, or a car you can enter/leave. Glyph textures are one texel per art pixel;
 * the container is scaled by ART_PIXEL and the world camera zooms to 1/ART_PIXEL at rest, so every
 * texel lands on one canvas pixel.
 */
export class InteractionTooltip {
  private readonly root: Phaser.GameObjects.Container;
  private readonly glyphs: Phaser.GameObjects.Image[] = [];
  private action: GeneralAction | null = null;
  private label = '';

  constructor(scene: Phaser.Scene) {
    const width = LABEL_LENGTH * FONT_ADVANCE - 1; // every glyph but the last advances a full step
    const left = -Math.floor(width / 2);
    const backing = scene.add.graphics();
    backing.fillStyle(SHADOW, 0.85).fillRect(left - 1, -6, width + 2, 12);
    backing.lineStyle(1, 0xffffff, 0.4).strokeRect(left - 1, -6, width + 2, 12);

    for (let i = 0; i < LABEL_LENGTH; i++) {
      const color = i < KEY.length ? KEY_COLOR : TEXT;
      this.glyphs.push(scene.add.image(left + i * FONT_ADVANCE, -3, glyphKey(' ')).setTint(color));
    }
    this.root = scene.add.container(0, 0, [backing, ...this.glyphs]).setDepth(20).setScale(ART_PIXEL);
    this.root.setVisible(false);
  }

  /** Point the tooltip at the current action, or pass null to hide it. */
  show(action: GeneralAction | null): void {
    this.action = action;
    this.root.setVisible(action !== null);
    if (!action) return;
    // The bitmap font has capitals only; the key is coloured differently from the verb.
    const label = `${KEY}  ${VERBS[action.kind].padEnd(VERB_WIDTH, ' ')}`;
    if (label !== this.label) {
      this.label = label;
      this.glyphs.forEach((glyph, i) => glyph.setTexture(glyphKey(label[i])));
    }
  }

  sync(): void {
    if (this.action) this.root.setPosition(this.action.target.x, this.action.target.y - 14 * ART_PIXEL);
  }
}
