import Phaser from 'phaser';
import { Hud } from '../ui/Hud';
import { Menu } from '../ui/Menu';

/**
 * Screen-space UI lives in its own scene so it gets an independent camera. The world camera's
 * shake is a render-time matrix translation that `scrollFactor(0)` does not cancel, so sharing a
 * camera would drag the HUD and menu along with the world.
 */
export class HudScene extends Phaser.Scene {
  hud!: Hud;
  menu!: Menu;

  constructor() {
    super('hud');
  }

  create(): void {
    this.hud = new Hud(this);
    this.menu = new Menu(this);
    this.scale.on('resize', (size: Phaser.Structs.Size) => this.cameras.main.setSize(size.width, size.height));
  }
}
