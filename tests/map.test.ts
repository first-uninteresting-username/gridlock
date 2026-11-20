import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { carHitsWorld, createCar } from '../src/sim/car';
import { buildCityData, parseColor, type TiledObject } from '../src/world/tiled';

const map = JSON.parse(readFileSync(new URL('../public/maps/city.tmj', import.meta.url), 'utf8'));
const layer = (name: string): TiledObject[] => map.layers.find((l: { name: string }) => l.name === name)?.objects ?? [];
const data = buildCityData(map.width * map.tilewidth, map.height * map.tileheight, {
  buildings: layer('buildings'), spawns: layer('spawns'), cars: layer('cars'),
});

describe('city map', () => {
  it('has a tileset Phaser can bind by name', () => {
    expect(map.tilesets.map((t: { name: string }) => t.name)).toContain('city');
  });

  it('spawns the player on open ground', () => {
    expect(data.city.solidAt(data.player.x, data.player.y)).toBe(false);
  });

  it('places every car clear of buildings', () => {
    expect(data.cars.length).toBeGreaterThan(0);
    for (const s of data.cars) expect(carHitsWorld(createCar(s.x, s.y, s.a, 0), data.city)).toBe(false);
  });

  it('treats buildings and the map edge as solid', () => {
    const b = data.city.buildings[0];
    expect(data.city.solidAt(b.x + 1, b.y + 1)).toBe(true);
    expect(data.city.solidAt(-1, 10)).toBe(true);
  });

  it('reads Tiled colours', () => {
    expect(parseColor('#ff8a8f98')).toBe(0x8a8f98);
    expect(parseColor('#8a8f98')).toBe(0x8a8f98);
  });
});
