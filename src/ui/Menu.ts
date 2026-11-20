import Phaser from 'phaser';
import { FONT_ADVANCE } from '../render/pixelart/font';
import { PixelText } from './PixelText';

/** Pause menu and menu button, drawn in the canvas with the same bitmap font as the HUD. */
const TEXT = 0xeeeeee;
const MUTED = 0x8a94a3;
const PANEL = 0x161a20;
const RAISED = 0x262c35;
const BUTTON = 0x2a3039;
const BUTTON_HOVER = 0x38414d;
const BORDER = 0x343b46;
const BORDER_STRONG = 0x4a5360;
const ACCENT = 0xffd23f;
const VOID = 0x0d0f12;

const PANEL_W = 336;
const PAD = 10;
const LINE_H = 8;
const CAP_H = 13;
const ROW_GAP = 3;
const KEY_COL = 132;
const BTN_H = 15;
const CHECK = 11;
const MAX_DESC_LINES = 5;
const MAX_AIM_LINES = 3;

const TITLE = 'Gridlock';
const SAVE_LABEL = 'Save game';
const RESUME = 'Resume';
const AIM_LABEL = 'Mouse aim (otherwise rotate with A / D)';
const MENU_LABEL = 'Menu (Esc)';

type Control = { keys: string[]; description: string };

const CONTROLS: Control[] = [
  { keys: ['WASD', 'Arrows'], description: 'Walk and drive. With mouse aim, on foot: move in screen directions.' },
  { keys: ['Shift'], description: 'Sprint while walking forward (on foot)' },
  { keys: ['Mouse'], description: 'Aim (on foot, or out of a car window)' },
  { keys: ['Left click', 'Space'], description: 'Shoot. Space also handbrakes in a car, so use left click to shoot while driving.' },
  { keys: ['E', 'Enter'], description: 'Get in or out of a car' },
  { keys: ['R'], description: 'Reload the current gun from reserve ammo' },
  { keys: ['F'], description: 'General action: rob someone in reach (not police), or get in/out of the nearest car' },
  { keys: ['Wheel', '1-4'], description: 'Cycle weapon slots, or select one directly' },
  { keys: ['Ctrl', 'Wheel', '1', '2'], description: 'Select a gadget slot (gadgets have no behaviour yet)' },
  { keys: ['Right click'], description: 'Use the selected gadget (not implemented yet)' },
  { keys: ['Esc'], description: 'Open or close this menu; save progress from here. Death returns you to the last save.' },
];

type ControlText = { caps: PixelText[]; separators: PixelText[]; lines: PixelText[] };
type Rect = { x: number; y: number; w: number; h: number };
type Hover = 'menu' | 'save' | 'resume' | 'check' | null;

/** Wraps on word boundaries; the bitmap font is monospaced so a line holds `maxChars` glyphs. */
function wrap(text: string, maxChars: number): string[] {
  const lines: string[] = [];
  let line = '';
  for (const word of text.toUpperCase().split(' ')) {
    if (line && line.length + 1 + word.length > maxChars) {
      lines.push(line);
      line = word;
    } else {
      line = line ? `${line} ${word}` : word;
    }
  }
  if (line) lines.push(line);
  return lines;
}

/** Draws a 1px border with 2px stepped corners and a flat fill; no anti-aliased rounding. */
function pixelBox(g: Phaser.GameObjects.Graphics, r: Rect, fill: number, border: number): void {
  const { x, y, w, h } = r;
  g.fillStyle(border, 1);
  g.fillRect(x + 2, y, w - 4, 1);
  g.fillRect(x + 1, y + 1, w - 2, 1);
  g.fillRect(x, y + 2, w, h - 4);
  g.fillRect(x + 1, y + h - 2, w - 2, 1);
  g.fillRect(x + 2, y + h - 1, w - 4, 1);
  g.fillStyle(fill, 1);
  g.fillRect(x + 2, y + 1, w - 4, 1);
  g.fillRect(x + 1, y + 2, w - 2, h - 4);
  g.fillRect(x + 2, y + h - 2, w - 4, 1);
}

export class Menu {
  private readonly root: Phaser.GameObjects.Container;
  private readonly buttonLayer: Phaser.GameObjects.Container;
  private readonly panelLayer: Phaser.GameObjects.Container;
  private readonly buttonGfx: Phaser.GameObjects.Graphics;
  private readonly panelGfx: Phaser.GameObjects.Graphics;

  private readonly title: PixelText;
  private readonly controlsLabel: PixelText;
  private readonly settingsLabel: PixelText;
  private readonly controlTexts: ControlText[] = [];
  private readonly aimLines: PixelText[] = [];
  private readonly saveText: PixelText;
  private readonly resumeText: PixelText;
  private readonly menuText: PixelText;

  private readonly menuRect = new Phaser.Geom.Rectangle();
  private readonly panelRect = new Phaser.Geom.Rectangle();
  private readonly saveRect = new Phaser.Geom.Rectangle();
  private readonly resumeRect = new Phaser.Geom.Rectangle();
  private readonly checkRect = new Phaser.Geom.Rectangle();
  private readonly capRects: Rect[] = [];
  private checkY = 0;
  private saveX = 0;
  private saveY = 0;
  private resumeX = 0;
  private resumeY = 0;
  private width = 0;
  private height = 0;
  private hover: Hover = null;
  private aim = true;
  private isOpen = false;

  /** Fired whenever the menu opens or closes. */
  onToggle: (open: boolean) => void = () => {};
  /** Fired when the player asks to save the current run. */
  onSave: () => void = () => {};

  constructor(private readonly scene: Phaser.Scene) {
    this.root = scene.add.container().setScrollFactor(0).setDepth(1100);
    this.buttonGfx = scene.add.graphics();
    this.buttonLayer = scene.add.container();
    this.panelLayer = scene.add.container();
    this.root.add([this.buttonGfx, this.buttonLayer, this.panelLayer]);
    this.panelGfx = scene.add.graphics();
    this.panelLayer.add(this.panelGfx);
    this.panelLayer.setVisible(false);

    this.menuText = new PixelText(scene, this.buttonLayer, 0, 0, TEXT);
    this.menuText.set(MENU_LABEL);
    this.title = new PixelText(scene, this.panelLayer, 0, 0, TEXT, 2, false);
    this.title.set(TITLE);
    this.controlsLabel = new PixelText(scene, this.panelLayer, 0, 0, MUTED, 1, false);
    this.controlsLabel.set('Controls');
    this.settingsLabel = new PixelText(scene, this.panelLayer, 0, 0, MUTED, 1, false);
    this.settingsLabel.set('Settings');

    for (const control of CONTROLS) {
      const caps = control.keys.map(() => new PixelText(scene, this.panelLayer, 0, 0, TEXT, 1, false));
      const separators = control.keys.slice(1).map(() => new PixelText(scene, this.panelLayer, 0, 0, MUTED, 1, false));
      control.keys.forEach((key, i) => caps[i].set(key));
      separators.forEach((sep) => sep.set('/'));
      const lines = Array.from({ length: MAX_DESC_LINES }, () => new PixelText(scene, this.panelLayer, 0, 0, TEXT, 1, false));
      this.controlTexts.push({ caps, separators, lines });
    }
    for (let i = 0; i < MAX_AIM_LINES; i++) this.aimLines.push(new PixelText(scene, this.panelLayer, 0, 0, TEXT, 1, false));

    this.saveText = new PixelText(scene, this.panelLayer, 0, 0, TEXT, 1, false);
    this.saveText.set(SAVE_LABEL);
    this.resumeText = new PixelText(scene, this.panelLayer, 0, 0, TEXT, 1, false);
    this.resumeText.set(RESUME);

    // Handle input on the canvas rather than DOM buttons, so the menu pixels line up with the game.
    scene.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      const next = this.hitTest(p.x, p.y);
      if (next !== this.hover) {
        this.hover = next;
        scene.game.canvas.style.cursor = next ? 'pointer' : 'default';
        this.redraw();
      }
    });
    scene.input.on('pointerup', (p: Phaser.Input.Pointer) => {
      const hit = this.hitTest(p.x, p.y);
      if (!this.isOpen) {
        if (hit === 'menu') this.set(true);
      } else if (hit === 'save') {
        this.onSave();
        this.saveText.set('Saved!');
        this.scene.time.delayedCall(1000, () => this.saveText.set(SAVE_LABEL));
      } else if (hit === 'resume') {
        this.set(false);
      } else if (hit === 'check') {
        this.aim = !this.aim;
        this.redraw();
      } else if (!this.panelRect.contains(p.x, p.y)) {
        this.set(false); // clicking the dimmed backdrop also resumes
      }
    });
    this.sync();
  }

  get open(): boolean {
    return this.isOpen;
  }

  get mouseAim(): boolean {
    return this.aim;
  }

  toggle(): void {
    this.set(!this.isOpen);
  }

  set(open: boolean): void {
    if (open === this.isOpen) return;
    this.isOpen = open;
    this.panelLayer.setVisible(open);
    const pointer = this.scene.input.activePointer;
    this.hover = this.hitTest(pointer.x, pointer.y);
    this.scene.game.canvas.style.cursor = this.hover ? 'pointer' : 'default';
    this.redraw();
    this.onToggle(open);
  }

  /** Keeps the menu pinned to the screen at one texel per canvas pixel, like the HUD. */
  sync(): void {
    const cam = this.scene.cameras.main;
    const zoom = cam.zoom;
    const cx = cam.x + cam.width / 2;
    const cy = cam.y + cam.height / 2;
    this.root.setPosition(cx - cx / zoom, cy - cy / zoom).setScale(1 / zoom);
    if (cam.width !== this.width || cam.height !== this.height) {
      this.width = cam.width;
      this.height = cam.height;
      this.layout();
    }
  }

  private layout(): void {
    const pw = Math.min(PANEL_W, this.width - 16);
    const contentW = pw - 2 * PAD;
    const descW = Math.max(FONT_ADVANCE * 4, contentW - KEY_COL - 4);
    const descChars = Math.floor(descW / FONT_ADVANCE);
    const aimChars = Math.max(4, Math.floor((contentW - 16) / FONT_ADVANCE));

    let y = PAD;
    this.title.move(PAD, y);
    y += 14 + 9;
    this.controlsLabel.move(PAD, y);
    y += 7 + 6;

    this.capRects.length = 0;
    this.controlTexts.forEach((texts, row) => {
      const rowY = y;
      const lines = wrap(CONTROLS[row].description, descChars);
      let x = PAD;
      CONTROLS[row].keys.forEach((key, i) => {
        const cw = key.length * FONT_ADVANCE + 6;
        if (i > 0) {
          texts.separators[i - 1].move(x + 1, rowY + 3);
          x += FONT_ADVANCE + 2;
        }
        this.capRects.push({ x, y: rowY, w: cw, h: CAP_H });
        texts.caps[i].move(x + 3, rowY + 3);
        x += cw + 3;
      });
      lines.forEach((line, i) => {
        texts.lines[i].set(line);
        texts.lines[i].move(PAD + KEY_COL, rowY + 3 + i * LINE_H);
      });
      for (let i = lines.length; i < texts.lines.length; i++) texts.lines[i].set('');
      y += Math.max(CAP_H, lines.length * LINE_H + 4) + ROW_GAP;
    });

    this.settingsLabel.move(PAD, y);
    y += 7 + 6;
    this.checkY = y + 1;
    const aimLines = wrap(AIM_LABEL, aimChars);
    aimLines.forEach((line, i) => {
      this.aimLines[i].set(line);
      this.aimLines[i].move(PAD + 16, y + 2 + i * LINE_H);
    });
    for (let i = aimLines.length; i < this.aimLines.length; i++) this.aimLines[i].set('');
    y += Math.max(CHECK, aimLines.length * LINE_H + 3) + 7;

    const sw = SAVE_LABEL.length * FONT_ADVANCE + 12;
    const rw = RESUME.length * FONT_ADVANCE + 12;
    // Centre the two buttons as one group, like the single Resume button was.
    const firstX = Math.round((pw - (sw + 6 + rw)) / 2);
    this.saveX = firstX;
    this.saveY = y;
    this.resumeX = firstX + sw + 6;
    this.resumeY = y;
    this.saveText.move(this.saveX + 6, y + 4);
    this.resumeText.move(this.resumeX + 6, y + 4);
    y += BTN_H + PAD;

    const px = Math.round((this.width - pw) / 2);
    const py = Math.round((this.height - y) / 2);
    this.panelLayer.setPosition(px, py);
    this.panelRect.setTo(px, py, pw, y);
    this.saveRect.setTo(px + this.saveX, py + this.saveY, sw, BTN_H);
    this.resumeRect.setTo(px + this.resumeX, py + this.resumeY, rw, BTN_H);
    this.checkRect.setTo(px + PAD, py + this.checkY, CHECK, CHECK);

    const mw = MENU_LABEL.length * FONT_ADVANCE + 12;
    this.menuRect.setTo(Math.round((this.width - mw) / 2), 8, mw, BTN_H);
    this.menuText.move(this.menuRect.x + 6, this.menuRect.y + 4);
    this.redraw();
  }

  private hitTest(x: number, y: number): Hover {
    if (!this.isOpen) return this.menuRect.contains(x, y) ? 'menu' : null;
    if (this.saveRect.contains(x, y)) return 'save';
    if (this.resumeRect.contains(x, y)) return 'resume';
    if (this.checkRect.contains(x, y)) return 'check';
    return null;
  }

  private redraw(): void {
    this.buttonGfx.clear();
    pixelBox(
      this.buttonGfx,
      { x: this.menuRect.x, y: this.menuRect.y, w: this.menuRect.width, h: this.menuRect.height },
      this.hover === 'menu' ? BUTTON_HOVER : BUTTON,
      BORDER_STRONG,
    );
    if (!this.isOpen || this.width === 0) return;

    const g = this.panelGfx;
    g.clear();
    g.fillStyle(VOID, 0.72);
    g.fillRect(-this.panelRect.x, -this.panelRect.y, this.width, this.height);
    pixelBox(g, { x: 0, y: 0, w: this.panelRect.width, h: this.panelRect.height }, PANEL, BORDER);
    for (const cap of this.capRects) pixelBox(g, cap, RAISED, BORDER);
    pixelBox(g, { x: PAD, y: this.checkY, w: CHECK, h: CHECK }, RAISED, this.hover === 'check' ? BORDER_STRONG : BORDER);
    if (this.aim) {
      g.fillStyle(ACCENT, 1);
      g.fillRect(PAD + 3, this.checkY + 6, 2, 2);
      g.fillRect(PAD + 5, this.checkY + 4, 2, 2);
      g.fillRect(PAD + 7, this.checkY + 2, 2, 2);
    }
    pixelBox(g, { x: this.saveX, y: this.saveY, w: this.saveRect.width, h: BTN_H }, this.hover === 'save' ? BUTTON_HOVER : BUTTON, BORDER_STRONG);
    pixelBox(g, { x: this.resumeX, y: this.resumeY, w: this.resumeRect.width, h: BTN_H }, this.hover === 'resume' ? BUTTON_HOVER : BUTTON, BORDER_STRONG);
  }
}
