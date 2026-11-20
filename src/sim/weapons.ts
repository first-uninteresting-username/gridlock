export type WeaponId = 'fists' | 'knife' | 'pistol' | 'smg';

interface WeaponBase {
  readonly id: WeaponId;
  readonly name: string;
  readonly damage: number;
  /** Minimum seconds between attacks. */
  readonly interval: number;
}

export interface GunDef extends WeaponBase {
  readonly kind: 'gun';
  readonly bulletSpeed: number;
  /** Max random deviation from the aim direction, radians. */
  readonly spread: number;
  /** Fires continuously while the trigger is held; otherwise one shot per press. */
  readonly auto: boolean;
  readonly range: number;
}

export interface MeleeDef extends WeaponBase {
  readonly kind: 'melee';
  /** Distance from the player's centre to the far edge of the hit. */
  readonly reach: number;
  /** Half-angle of the swing arc, radians. */
  readonly arc: number;
}

export type WeaponDef = GunDef | MeleeDef;

export const WEAPONS: Record<WeaponId, WeaponDef> = {
  fists: { id: 'fists', name: 'Fists', damage: 9, interval: 0.4, kind: 'melee', reach: 26, arc: 0.9 },
  knife: { id: 'knife', name: 'Knife', damage: 20, interval: 0.3, kind: 'melee', reach: 32, arc: 0.7 },
  pistol: { id: 'pistol', name: 'Pistol', damage: 12, interval: 0.25, kind: 'gun', bulletSpeed: 1400, spread: 0.02, auto: false, range: 700 },
  smg: { id: 'smg', name: 'SMG', damage: 7, interval: 0.08, kind: 'gun', bulletSpeed: 1500, spread: 0.08, auto: true, range: 600 },
};

export const WEAPON_SLOT_COUNT = 4;
export const GADGET_SLOT_COUNT = 2;

/** No gadget types exist yet; this widens when they do, and until then both gadget slots stay empty. */
export type GadgetId = never;

export type WeaponSlots = [WeaponId | null, WeaponId | null, WeaponId | null, WeaponId | null];
export type GadgetSlots = [GadgetId | null, GadgetId | null];

export interface Arsenal {
  /** Rounds per weapon; a weapon cannot attack while this is 0. Infinity = unlimited. */
  ammo: Partial<Record<WeaponId, number>>;
  /** The four weapon slots, in the order shown by the HUD. Empty slots mean fists. */
  weapons: WeaponSlots;
  /** Index of the selected weapon slot. */
  weaponSlot: number;
  /** Reserved for gadgets: two empty slots, selectable now and fillable later. */
  gadgets: GadgetSlots;
  /** Index of the selected gadget slot. */
  gadgetSlot: number;
  /** Right mouse button, held while the active gadget is being used. */
  gadgetHeld: boolean;
  cooldown: number;
  triggerHeld: boolean;
}

export const createArsenal = (): Arsenal => ({
  ammo: { fists: Infinity },
  weapons: [null, null, null, null],
  weaponSlot: 0,
  gadgets: [null, null],
  gadgetSlot: 0,
  gadgetHeld: false,
  cooldown: 0,
  triggerHeld: false,
});

/** An empty slot is the unarmed fallback, so there is always a weapon to attack with. */
export const slotWeapon = (weapons: WeaponSlots, slot: number): WeaponId => weapons[slot] ?? 'fists';

export const isWeaponId = (v: unknown): v is WeaponId => typeof v === 'string' && v in WEAPONS;

export interface Bullet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  travelled: number;
  readonly range: number;
  readonly damage: number;
}
