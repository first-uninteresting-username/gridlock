import Phaser from 'phaser';
import { loadArt } from '../render/art';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('boot');
  }

  preload(): void {
    this.load.tilemapTiledJSON('city', 'maps/city.tmj');
    this.load.svg('city-tiles', 'tiles/city.svg'); // natural size: tile frames must stay 1:1 with the map's tile size
    loadArt(this.load);
  }

  create(): void {
    this.scene.start('game');
  }
}
