import Phaser from 'phaser';
import { BuildingLayer } from '../render/BuildingLayer';
import { CameraRig } from '../render/CameraRig';
import { CarView } from '../render/CarView';
import { PlayerView } from '../render/PlayerView';
import { carSpeed, createCar } from '../sim/car';
import { createPlayer } from '../sim/player';
import { Simulation } from '../sim/Simulation';
import { CAR, KMH_PER_PX } from '../sim/tuning';
import type { Input } from '../sim/types';
import { Hud } from '../ui/Hud';
import { buildCityData, type TiledObject } from '../world/tiled';

const STEP = 1 / 120; // fixed simulation step
const MAX_FRAME = 0.1; // ignore longer gaps (tab switch) instead of fast-forwarding

type Keys = Record<'W' | 'A' | 'S' | 'D' | 'UP' | 'DOWN' | 'LEFT' | 'RIGHT' | 'SPACE', Phaser.Input.Keyboard.Key>;

export class GameScene extends Phaser.Scene {
  private sim!: Simulation;
  private carViews: CarView[] = [];
  private playerView!: PlayerView;
  private buildings!: BuildingLayer;
  private rig!: CameraRig;
  private hud = new Hud();
  private keys!: Keys;
  private wantToggle = false;
  private acc = 0;

  constructor() {
    super('game');
  }

  create(): void {
    const map = this.make.tilemap({ key: 'city' });
    const tiles = map.addTilesetImage('city', 'city-tiles');
    if (!tiles) throw new Error('Tileset "city" missing from map');
    map.createLayer('ground', tiles, 0, 0)?.setDepth(0);

    const objects = (name: string) => (map.getObjectLayer(name)?.objects ?? []) as TiledObject[];
    const data = buildCityData(map.widthInPixels, map.heightInPixels, {
      buildings: objects('buildings'),
      spawns: objects('spawns'),
      cars: objects('cars'),
    });

    const cars = data.cars.map((s) => createCar(s.x, s.y, s.a, s.color ?? 0xffffff));
    this.sim = new Simulation(data.city, createPlayer(data.player.x, data.player.y, data.player.a), cars);
    this.carViews = cars.map((c) => new CarView(this, c));
    this.playerView = new PlayerView(this, this.sim.player);
    this.buildings = new BuildingLayer(this, data.city.buildings);

    const cam = this.cameras.main;
    cam.setBackgroundColor('#0d0f12');
    this.rig = new CameraRig(cam, data.player.x, data.player.y);
    this.scale.on('resize', (size: Phaser.Structs.Size) => cam.setSize(size.width, size.height));

    const kb = this.input.keyboard!;
    this.keys = kb.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT,SPACE') as Keys;
    const toggle = (e: KeyboardEvent) => { if (!e.repeat) this.wantToggle = true; };
    kb.on('keydown-E', toggle);
    kb.on('keydown-F', toggle);
    kb.on('keydown-ENTER', toggle);
  }

  private readInput(): Input {
    const k = this.keys;
    return {
      throttle: (k.W.isDown || k.UP.isDown ? 1 : 0) - (k.S.isDown || k.DOWN.isDown ? 1 : 0),
      steer: (k.D.isDown || k.RIGHT.isDown ? 1 : 0) - (k.A.isDown || k.LEFT.isDown ? 1 : 0),
      handbrake: k.SPACE.isDown,
    };
  }

  update(_time: number, deltaMs: number): void {
    const frame = Math.min(deltaMs / 1000, MAX_FRAME);
    if (this.wantToggle) { this.wantToggle = false; this.sim.toggleCar(); }
    const input = this.readInput();
    this.acc += frame;
    while (this.acc >= STEP) { this.sim.step(STEP, input); this.acc -= STEP; }

    const p = this.sim.player, car = p.car;
    this.rig.update(frame, p.x, p.y, car?.vx ?? 0, car?.vy ?? 0, car ? Math.min(carSpeed(car) / CAR.maxSpeed, 1) : 0);
    for (const v of this.carViews) v.sync();
    this.playerView.sync();
    this.buildings.draw(this.rig.x, this.rig.y, this.cameras.main.worldView);
    this.hud.setStatus(car ? `Driving · ${Math.round(carSpeed(car) * KMH_PER_PX)} km/h` : 'On foot');
  }
}
