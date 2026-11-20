import Phaser from 'phaser';
import { paintArt } from '../render/art';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('boot');
  }

  preload(): void {
    this.load.tilemapTiledJSON('city', 'maps/city.tmj');
    this.load.svg('city-tiles', 'tiles/city.svg'); // pixel-art tileset (tools/gen-tileset.mjs), natural size: tile frames must stay 1:1 with the map's tile size
  }

  create(): void {
    paintArt(this.textures);
    // Start the UI scene first so GameScene can pick up its Hud and Menu during create().
    this.scene.launch('hud');
    this.scene.start('game');
  }
}
