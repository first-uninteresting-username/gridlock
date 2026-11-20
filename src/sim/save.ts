import { isWeaponId, type WeaponId } from './weapons';

const STORAGE_KEY = 'gridlock.save';
const VERSION = 1;

type SavedPickupBase = { x: number; y: number; respawn: number | null; once?: boolean };

/** Pickup data as stored: Infinity cannot be written to JSON, so it becomes null. */
export type SavedPickup =
  | (SavedPickupBase & { kind: 'weapon'; weapon: WeaponId; ammo: number })
  | (SavedPickupBase & { kind: 'ammo'; weapon: WeaponId; amount: number })
  | (SavedPickupBase & { kind: 'cash'; amount: number });

/** A point-in-time copy of everything a dead player should come back to. */
export interface SaveData {
  version: number;
  player: {
    x: number;
    y: number;
    a: number;
    health: number;
    stride: number;
    /** Index into the car list, or null when on foot. */
    car: number | null;
  };
  cars: {
    x: number;
    y: number;
    a: number;
    vx: number;
    vy: number;
    health: number;
    steer: number;
    /** Seconds until the car blows up, or null when it is not burning. */
    burning: number | null;
    wrecked: boolean;
  }[];
  /** Map pickups plus any loot dropped during play; the extra ones are recreated on load. */
  pickups: SavedPickup[];
  /** null means unlimited ammo: JSON turns Infinity into null. */
  ammo: Partial<Record<WeaponId, number | null>>;
  current: WeaponId;
  wanted: number;
  cash: number;
}

export const newSave = (data: Omit<SaveData, 'version'>): SaveData => ({ version: VERSION, ...data });

const finite = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

/** Read the saved game, ignoring anything from another version or a differently-built city. */
export function loadSave(carCount: number, pickupCount: number): SaveData | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const save = JSON.parse(raw) as SaveData;
    // Loot dropped during the saved run can leave more pickups than the map has.
    if (save.version !== VERSION || save.cars?.length !== carCount || save.pickups?.length < pickupCount) return null;
    if (!save.ammo || typeof save.ammo !== 'object' || !isWeaponId(save.current)) return null;
    const p = save.player;
    if (!p || !finite(p.x) || !finite(p.y) || !finite(p.a) || !finite(p.health) || !finite(p.stride)) return null;
    if (p.car !== null && (!Number.isInteger(p.car) || p.car < 0 || p.car >= carCount)) return null;
    if (!save.cars.every((c) => c && finite(c.x) && finite(c.y) && finite(c.a))) return null;
    if (!save.pickups.every((k) => k && finite(k.x) && finite(k.y))) return null;
    return save;
  } catch {
    return null; // storage disabled, or the JSON is junk
  }
}

/** Storage can be unavailable (private mode, full quota); a failed save must not break the game. */
export function storeSave(save: SaveData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(save));
  } catch {
    // ignore
  }
}
