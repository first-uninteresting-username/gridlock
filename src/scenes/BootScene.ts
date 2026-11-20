import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('boot');
  }

  preload(): void {
    this.load.tilemapTiledJSON('city', 'maps/city.tmj');
    this.load.image('city-tiles', 'tiles/city.png');
  }

  create(): void {
    this.scene.start('game');
  }
}
