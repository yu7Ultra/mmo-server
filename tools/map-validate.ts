import path from 'path';
import fs from 'fs';
import { parseTileMap } from '../src/utils/map/mapParser';
import { TiledMap } from '../src/utils/tmx/TiledMapUtils';

interface CliOptions {
  file: string;
  json: boolean;
}

function parseArgs(): CliOptions {
  const args = process.argv.slice(2);
  let file = 'config/map/mmo.json';
  let json = false;
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if ((a === '-f' || a === '--file') && args[i + 1]) {
      file = args[++i];
      continue;
    }
    if (a === '--json') json = true;
  }
  return { file, json };
}

function loadMap(file: string): TiledMap {
  const full = path.resolve(process.cwd(), file);
  const raw = fs.readFileSync(full, 'utf8');
  return JSON.parse(raw) as TiledMap;
}

function main() {
  const opts = parseArgs();
  let exitCode = 0;
  try {
    const raw = loadMap(opts.file);
    const { map, diag } = parseTileMap(raw, { onWarn: (m, ctx) => console.warn('[warn]', m, ctx) });
    const summary = {
      file: opts.file,
      world: map.world,
      counts: {
        territories: map.territories.length,
        crystals: map.crystals.length,
        resources: map.resources.length,
        monsterSpawns: map.monsterSpawns.length,
        teleports: map.teleports.length,
        obstaclePolygons: map.obstaclePolygons.length,
        obstacleTileLayers: map.obstacleTileLayers.length,
        obstacleTilesTotal: map.obstacleTileLayers.reduce((a, l) => a + l.data.length, 0),
        polygonVertexTotal: diag.polygonVertexTotal
      },
      warnings: diag.warnings
    };
    if (opts.json) {
      console.log(JSON.stringify(summary, null, 2));
    } else {
      console.log('Map Validation Summary');
      console.log('  File:', summary.file);
      console.log('  World Size (px):', summary.world.widthPx, 'x', summary.world.heightPx);
      Object.entries(summary.counts).forEach(([k, v]) => console.log(`  ${k}:`, v));
      if (summary.warnings.length) {
        console.log('Warnings:');
        summary.warnings.forEach(w => console.log('  -', w.message, w.context || ''));
      } else {
        console.log('No warnings.');
      }
    }
  } catch (err: any) {
    exitCode = 1;
    console.error('Map validation failed:', err?.message || err);
  } finally {
    process.exit(exitCode);
  }
}

if (require.main === module) {
  main();
}
