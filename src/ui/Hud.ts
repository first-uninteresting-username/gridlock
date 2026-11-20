import Phaser from 'phaser';
import { FONT_ADVANCE, glyphKey } from '../render/pixelart/font';
import { GADGET_SLOT_COUNT, WEAPON_SLOT_COUNT, type WeaponId } from '../sim/weapons';

/** Screen-space pixel-art HUD: bitmap text, wanted stars and a cash icon, drawn by the game camera. */
const PAD = 8;
const STATUS_Y = 0;
const WANTED_Y = 12;
const CASH_Y = 24;
const STAR_SIZE = 9;
const STAR_GAP = 1;
const COIN_SIZE = 7;
const CASH_TEXT_X = COIN_SIZE + 2;
const SLOTS_Y = 38;
/** A slot is a 5x7 digit, an 8x5 icon, and a small gap. */
const SLOT_CELL = 16;
const SLOT_ICON_X = FONT_ADVANCE;
const GADGET_LABEL_GAP = 8;

const TEXT_COLOR = 0xeeeeee;
const CASH_COLOR = 0x6fdc8c;
const SHADOW_COLOR = 0x0d0f12;
const SLOT_ACTIVE_COLOR = 0xffd23f;
const SLOT_HELD_COLOR = 0xfff1a8;
const SLOT_IDLE_COLOR = 0x8a94a3;

const WEAPON_ICONS: Record<WeaponId, string> = {
  fists: 'hud-fists',
  knife: 'hud-knife',
  pistol: 'hud-pistol',
  smg: 'hud-smg',
};

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

/** One numbered slot in the loadout strip: a key-cap digit and a tinted weapon/gadget icon. */
class Slot {
  private readonly digitShadow: Phaser.GameObjects.Image;
  private readonly digit: Phaser.GameObjects.Image;
  private readonly iconShadow: Phaser.GameObjects.Image;
  private readonly icon: Phaser.GameObjects.Image;

  constructor(scene: Phaser.Scene, layer: Phaser.GameObjects.Container, x: number, y: number, label: string) {
    this.digitShadow = scene.add.image(x + 1, y + 1, glyphKey(label)).setTint(SHADOW_COLOR);
    this.iconShadow = scene.add.image(x + SLOT_ICON_X + 1, y + 1, 'hud-slot-empty').setTint(SHADOW_COLOR);
    this.digit = scene.add.image(x, y, glyphKey(label));
    this.icon = scene.add.image(x + SLOT_ICON_X, y, 'hud-slot-empty');
    layer.add([this.digitShadow, this.iconShadow, this.digit, this.icon]);
  }

  set(texture: string, tint: number): void {
    this.iconShadow.setTexture(texture);
    this.icon.setTexture(texture).setTint(tint);
    this.digit.setTint(tint);
  }
}

export class Hud {
  private readonly root: Phaser.GameObjects.Container;
  private readonly status: PixelText;
  private readonly cash: PixelText;
  private readonly weaponSlots: Slot[] = [];
  private readonly gadgetSlots: Slot[] = [];
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

    for (let i = 0; i < WEAPON_SLOT_COUNT; i++) {
      this.weaponSlots.push(new Slot(scene, this.root, i * SLOT_CELL, SLOTS_Y, String(i + 1)));
    }
    const gadgetX = WEAPON_SLOT_COUNT * SLOT_CELL + GADGET_LABEL_GAP;
    this.root.add(scene.add.image(1, SLOTS_Y + 1, glyphKey('G')).setTint(SHADOW_COLOR));
    this.root.add(scene.add.image(0, SLOTS_Y, glyphKey('G')).setTint(TEXT_COLOR));
    for (let i = 0; i < GADGET_SLOT_COUNT; i++) {
      this.gadgetSlots.push(new Slot(scene, this.root, gadgetX + FONT_ADVANCE + i * SLOT_CELL, SLOTS_Y, String(i + 1)));
    }
  }

  /** Highlights the selected weapon and gadget slots; a held right mouse button lights up the gadget. */
  setLoadout(weapons: readonly (WeaponId | null)[], weaponSlot: number, gadgetSlot: number, gadgetHeld: boolean): void {
    this.weaponSlots.forEach((slot, i) => {
      // An empty slot is fists, so show the same icon rather than a blank frame.
      const weapon = weapons[i] ?? 'fists';
      slot.set(WEAPON_ICONS[weapon], i === weaponSlot ? SLOT_ACTIVE_COLOR : SLOT_IDLE_COLOR);
    });
    this.gadgetSlots.forEach((slot, i) => {
      const tint = i !== gadgetSlot ? SLOT_IDLE_COLOR : gadgetHeld ? SLOT_HELD_COLOR : SLOT_ACTIVE_COLOR;
      slot.set('hud-slot-empty', tint);
    });
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
