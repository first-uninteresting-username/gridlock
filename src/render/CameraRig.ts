import type Phaser from 'phaser';
import { ART_PIXEL } from './art';

/** Smoothed follow camera that looks ahead of moving cars and zooms out with speed. */
export class CameraRig {
  x: number;
  y: number;
  private zoom = 0;

  constructor(private readonly cam: Phaser.Cameras.Scene2D.Camera, x: number, y: number) {
    this.x = x;
    this.y = y;
  }

  update(dt: number, targetX: number, targetY: number, vx: number, vy: number, speedFrac: number): void {
    const k = 1 - Math.exp(-5 * dt);
    this.x += (targetX + vx * 0.35 - this.x) * k;
    this.y += (targetY + vy * 0.35 - this.y) * k;
    // At rest one art pixel is exactly one canvas pixel, so the pixels are uniform; speed zooms out
    // by up to 30%, which resamples them unevenly for a moment.
    const target = (1 / ART_PIXEL) * (1 - 0.3 * speedFrac);
    this.zoom = this.zoom === 0 ? target : this.zoom + (target - this.zoom) * (1 - Math.exp(-2 * dt));
    this.cam.setZoom(this.zoom);
    this.cam.centerOn(this.x, this.y);
  }
}
