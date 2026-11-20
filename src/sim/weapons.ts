export type WeaponId = 'pistol' | 'smg';

export interface WeaponDef {
  readonly id: WeaponId;
  readonly name: string;
  readonly damage: number;
  /** Minimum seconds between shots. */
  readonly interval: number;
  readonly bulletSpeed: number;
  /** Max random deviation from the aim direction, radians. */
  readonly spread: number;
  /** Fires continuously while the trigger is held; otherwise one shot per press. */
  readonly auto: boolean;
  readonly range: number;
}

/** Rounds the player starts with. The pistol is resupplied by weapon pickups and robbery loot. */
export const PISTOL_STARTING_AMMO = 24;

/** In cycling order. */
export const WEAPONS: Record<WeaponId, WeaponDef> = {
  pistol: { id: 'pistol', name: 'Pistol', damage: 12, interval: 0.25, bulletSpeed: 1400, spread: 0.02, auto: false, range: 700 },
  smg: { id: 'smg', name: 'SMG', damage: 7, interval: 0.08, bulletSpeed: 1500, spread: 0.08, auto: true, range: 600 },
};
export const WEAPON_ORDER = Object.keys(WEAPONS) as WeaponId[];

export const isWeaponId = (v: unknown): v is WeaponId => typeof v === 'string' && v in WEAPONS;

export interface Arsenal {
  /** Rounds per weapon; a weapon is owned while it has ammo. Infinity = unlimited. */
  ammo: Partial<Record<WeaponId, number>>;
  current: WeaponId;
  cooldown: number;
  triggerHeld: boolean;
}

export const createArsenal = (): Arsenal => ({ ammo: { pistol: PISTOL_STARTING_AMMO }, current: 'pistol', cooldown: 0, triggerHeld: false });

export interface Bullet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  travelled: number;
  readonly range: number;
  readonly damage: number;
  /** Who fired it: police rounds hurt the player, player rounds hurt everyone else. */
  readonly from: 'player' | 'police';
}
