/** One frame of player intent, already mapped from whatever input device is in use. */
export interface Input {
  /** +1 forward / accelerate, -1 back / brake-reverse, 0 none. */
  throttle: number;
  /** +1 turn clockwise (right), -1 anticlockwise (left). */
  steer: number;
  handbrake: boolean;
  /** Trigger held (on foot). */
  fire: boolean;
  /**
   * World angle the player should face on foot (mouse aim), or null for keyboard-only
   * rotate-and-walk. While set, on-foot movement uses `moveX`/`moveY` instead of throttle/steer.
   */
  aim: number | null;
  /** World-space walk direction while aiming: +x east, +y south. Each in -1..1. */
  moveX: number;
  moveY: number;
}

/** Anything that can answer "is this world point inside a wall?". */
export interface SolidQuery {
  solidAt(x: number, y: number): boolean;
}

export const NO_INPUT: Input = { throttle: 0, steer: 0, handbrake: false, fire: false, aim: null, moveX: 0, moveY: 0 };
