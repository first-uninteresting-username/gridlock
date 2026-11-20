import { PED_LOOKS } from './pedestrian';

/**
 * Someone sitting in a car. Kept separate from `Pedestrian` so a future car-theft rule can take the
 * driver out of the seat and turn them into a pedestrian on foot.
 */
export interface Driver {
  /** Picks the outfit; the renderer decides what it means (shared with pedestrians). */
  readonly look: number;
}

/** Drivers dress from the same outfits as pedestrians. */
export const DRIVER_LOOKS = PED_LOOKS;

export const createDriver = (look: number): Driver => ({ look });
