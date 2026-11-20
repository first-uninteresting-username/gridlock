import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { GameScene } from './scenes/GameScene';
import { HudScene } from './scenes/HudScene';

// The canvas is rendered at one pixel per art pixel and scaled up by a whole number of device pixels
// (CSS `image-rendering: pixelated`), so every art pixel is the same size on screen. The scale grows
// with the screen so the view always shows about this many art pixels across its short side.
const VIEW_ART_PIXELS = 375;

const dpr = () => window.devicePixelRatio || 1;

/** Whole device pixels per art pixel. */
function pixelScale(): number {
  const shortSide = Math.min(window.innerWidth, window.innerHeight) * dpr();
  return Math.max(1, Math.round(shortSide / VIEW_ART_PIXELS));
}

const canvasSize = () => {
  const scale = pixelScale();
  return { width: Math.floor((window.innerWidth * dpr()) / scale), height: Math.floor((window.innerHeight * dpr()) / scale), zoom: scale / dpr() };
};

const initial = canvasSize();

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#0d0f12',
  // Nearest-neighbour textures, no antialiasing, sprites snapped to whole canvas pixels.
  render: { pixelArt: true },
  scale: { mode: Phaser.Scale.NONE, ...initial },
  // HudScene renders after GameScene so the UI sits on top of the world.
  scene: [BootScene, GameScene, HudScene],
});

window.addEventListener('resize', () => {
  const { width, height, zoom } = canvasSize();
  game.scale.resize(width, height);
  game.scale.setZoom(zoom);
});
