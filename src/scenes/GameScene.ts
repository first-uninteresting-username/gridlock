import Phaser from 'phaser';
import { BuildingLayer } from '../render/BuildingLayer';
import { CameraRig } from '../render/CameraRig';
import { CarView } from '../render/CarView';
import { Effects } from '../render/Effects';
import { PedestrianView } from '../render/PedestrianView';
import { PickupView } from '../render/PickupView';
import { PlayerView } from '../render/PlayerView';
import { carSpeed, createCar } from '../sim/car';
import { createDriver } from '../sim/driver';
import { createPlayer } from '../sim/player';
import { MAX_WANTED, Simulation, type Pickup } from '../sim/Simulation';
import { WEAPONS } from '../sim/weapons';
import { CAR_MODELS } from '../sim/models';
import { CAR, KMH_PER_PX, PED } from '../sim/tuning';
import type { Input } from '../sim/types';
import { Hud } from '../ui/Hud';
import { InteractionTooltip } from '../ui/InteractionTooltip';
import { Menu } from '../ui/Menu';
import { buildCityData, type TiledMap } from '../world/tiled';

const STEP = 1 / 120; // fixed simulation step
const MAX_FRAME = 0.1; // ignore longer gaps (tab switch) instead of fast-forwarding

type Keys = Record<'W' | 'A' | 'S' | 'D' | 'UP' | 'DOWN' | 'LEFT' | 'RIGHT' | 'SPACE' | 'SHIFT', Phaser.Input.Keyboard.Key>;

export class GameScene extends Phaser.Scene {
  private sim!: Simulation;
  private carViews: CarView[] = [];
  private pickupViews: PickupView[] = [];
  private pedViews: PedestrianView[] = [];
  private playerView!: PlayerView;
  private effects!: Effects;
  private buildings!: BuildingLayer;
  private rig!: CameraRig;
  private hud!: Hud;
  private tooltip!: InteractionTooltip;
  private menu = new Menu();
  /** Mouse aim only takes over once the pointer has actually moved, so keyboard-only play still works. */
  private pointerSeen = false;
  private keys!: Keys;
  private wantToggle = false;
  private wantRob = false;
  private acc = 0;

  constructor() {
    super('game');
  }

  create(): void {
    // Phaser draws the tile layer; the game's own reading of the same map (kinds, buildings,
    // spawns) comes from the raw Tiled JSON, so Phaser never needs to know what a tile means.
    const map = this.make.tilemap({ key: 'city' });
    const tiles = map.addTilesetImage('city', 'city-tiles');
    if (!tiles) throw new Error('Tileset "city" missing from map');
    map.createLayer('tiles', tiles, 0, 0)?.setDepth(0);
    const data = buildCityData(this.cache.tilemap.get('city').data as TiledMap);

    const cars = data.cars.map((s) => createCar(
      s.x, s.y, s.a, s.color ?? 0xffffff, CAR_MODELS[s.model],
      s.driver === null ? null : createDriver(s.driver),
    ));
    const pickups: Pickup[] = data.pickups.map((k) => ({ ...k, respawn: 0 }));
    this.sim = new Simulation(data.city, createPlayer(data.player.x, data.player.y, data.player.a), cars, pickups);
    this.sim.populate(PED.count);
    this.pedViews = this.sim.pedestrians.map((p) => new PedestrianView(this, p));
    this.carViews = cars.map((c) => new CarView(this, c));
    this.pickupViews = pickups.map((k) => new PickupView(this, k));
    this.effects = new Effects(this);
    this.tooltip = new InteractionTooltip(this);
    // Dev builds only: lets the console and browser tests inspect and script the game.
    if (import.meta.env.DEV) Object.assign(window, { gridlock: { sim: this.sim, scene: this } });
    this.playerView = new PlayerView(this, this.sim.player);
    this.buildings = new BuildingLayer(this, data.city);

    const cam = this.cameras.main;
    cam.setBackgroundColor('#0d0f12');
    this.hud = new Hud(this);
    this.rig = new CameraRig(cam, data.player.x, data.player.y);
    this.scale.on('resize', (size: Phaser.Structs.Size) => cam.setSize(size.width, size.height));

    const kb = this.input.keyboard!;
    this.keys = kb.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT,SPACE,SHIFT') as Keys;
    const toggle = (e: KeyboardEvent) => { if (!e.repeat) this.wantToggle = true; };
    kb.on('keydown-E', toggle);
    kb.on('keydown-F', toggle);
    kb.on('keydown-ENTER', toggle);
    kb.on('keydown-Q', () => { if (!this.menu.open) this.sim.cycleWeapon(); });
    kb.on('keydown-R', (e: KeyboardEvent) => { if (!e.repeat && !this.menu.open) this.wantRob = true; });
    kb.on('keydown-ESC', () => this.menu.toggle());

    this.input.mouse?.disableContextMenu();
    this.input.on('pointermove', () => { this.pointerSeen = true; });
    this.input.on('pointerdown', () => { this.pointerSeen = true; });
    // Drop held buttons/keys when the menu opens so nothing is stuck on resume.
    this.menu.onToggle = (open) => { if (open) { this.wantToggle = false; this.wantRob = false; this.acc = 0; } };
  }

  private readInput(): Input {
    const k = this.keys, ptr = this.input.activePointer;
    const up = k.W.isDown || k.UP.isDown, down = k.S.isDown || k.DOWN.isDown;
    const left = k.A.isDown || k.LEFT.isDown, right = k.D.isDown || k.RIGHT.isDown;
    const p = this.sim.player;
    const inCar = p.car !== null;
    // Mouse aim works on foot and from a car, so you can aim out of a window while driving.
    let aim: number | null = null;
    if (this.pointerSeen && this.menu.mouseAim) {
      const w = this.cameras.main.getWorldPoint(ptr.x, ptr.y);
      aim = Math.atan2(w.y - p.y, w.x - p.x);
    }
    // Space fires on foot; in a car it is the handbrake, so only the mouse fires there.
    const firing = (k.SPACE.isDown && !inCar) || (ptr.leftButtonDown() && (inCar || aim !== null));
    return {
      throttle: (up ? 1 : 0) - (down ? 1 : 0),
      steer: (right ? 1 : 0) - (left ? 1 : 0),
      handbrake: k.SPACE.isDown,
      sprint: k.SHIFT.isDown,
      fire: firing,
      aim,
      moveX: (right ? 1 : 0) - (left ? 1 : 0),
      moveY: (down ? 1 : 0) - (up ? 1 : 0),
    };
  }

  update(time: number, deltaMs: number): void {
    const frame = Math.min(deltaMs / 1000, MAX_FRAME);
    if (!this.menu.open) {
      if (this.wantToggle) { this.wantToggle = false; this.sim.toggleCar(); }
      if (this.wantRob) { this.wantRob = false; this.sim.robNearest(); }
      const input = this.readInput();
      this.acc += frame;
      while (this.acc >= STEP) { this.sim.step(STEP, input); this.acc -= STEP; }
    }

    for (const e of this.sim.events) {
      this.effects.handle(e);
      if (e.type === 'explosion') {
        const d = Math.hypot(e.x - this.rig.x, e.y - this.rig.y);
        if (d < 900) this.cameras.main.shake(350, 0.012 * (1 - d / 900));
      }
      if (e.type === 'busted' || e.type === 'playerDown') this.cameras.main.shake(250, 0.008);
    }
    this.sim.events.length = 0;

    const p = this.sim.player, car = p.car;
    this.rig.update(frame, p.x, p.y, car?.vx ?? 0, car?.vy ?? 0, car ? Math.min(carSpeed(car) / CAR.cameraRefSpeed, 1) : 0);
    for (const v of this.carViews) v.sync();
    for (const v of this.pedViews) v.sync();
    while (this.pickupViews.length < this.sim.pickups.length) {
      this.pickupViews.push(new PickupView(this, this.sim.pickups[this.pickupViews.length]));
    }
    for (const v of this.pickupViews) v.sync(time / 1000);
    this.playerView.sync(this.sim.arsenal.current);
    this.tooltip.show(this.menu.open ? null : this.sim.robTarget());
    this.tooltip.sync();
    this.effects.update(frame, this.sim.cars, this.sim.bullets);
    this.sim.view = this.cameras.main.worldView; // replacement pedestrians appear outside this
    this.buildings.draw(this.rig.x, this.rig.y, this.cameras.main.worldView);
    const ars = this.sim.arsenal, ammo = ars.ammo[ars.current] ?? 0;
    this.hud.setWanted(this.sim.wanted, MAX_WANTED);
    this.hud.setCash(this.sim.cash);
    this.hud.setStatus(car
      ? `Driving a ${car.model.name} · ${Math.round(carSpeed(car) * KMH_PER_PX)} km/h${car.burning !== null ? ' · ON FIRE, get out!' : ''}`
      : `On foot · ${WEAPONS[ars.current].name} ${ammo === Infinity ? '∞' : ammo}`);
    this.hud.sync();
  }
}
