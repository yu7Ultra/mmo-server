import path from 'path';
import fs from 'fs';
import { parseTileMap } from '../utils/map/mapParser';
import { TiledMap } from '../utils/tmx/TiledMapUtils';

describe('mapParser', () => {
  let raw: TiledMap;
  beforeAll(() => {
    const file = path.resolve(process.cwd(), 'config/map/mmo.json');
    raw = JSON.parse(fs.readFileSync(file, 'utf8')) as TiledMap;
  });

  test('parses counts from mmo.json', () => {
    const { map, diag } = parseTileMap(raw);
    expect(map.territories.length).toBe(3);
    expect(map.crystals.length).toBe(3);
    expect(map.resources.length).toBe(18); // 9 gold + 9 trees
    expect(map.monsterSpawns.length).toBe(29); // monster objects
    expect(map.teleports.length).toBe(2);
    expect(map.obstacleTileLayers.length).toBe(1);
    expect(map.obstacleTileLayers[0].data.length).toBe(20 * 20); // full tile layer
    // Polygon vertex total equals sum of points lengths
    const pointSum = map.obstaclePolygons.reduce((a, p) => a + p.points.length, 0);
    expect(diag.polygonVertexTotal).toBe(pointSum);
    expect(diag.warnings.length).toBeGreaterThanOrEqual(0); // no strict requirement yet
  });
});
