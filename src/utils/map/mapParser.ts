import { TiledMap } from '../tmx/TiledMapUtils';
import { ParsedMapData, ParseOptions, MapTerritory, MapCrystal, MapResourceNode, MapMonsterSpawn, MapTeleportZone, MapObstaclePolygon, MapObstacleTileLayer, ParsedWithDiagnostics, MapParserDiagnostics } from './MapTypes';

function smartCast(v: any): any {
    if (typeof v !== 'string') return v;
    if (v === 'true' || v === 'false') return v === 'true';
    if (/^-?\d+(\.\d+)?$/.test(v)) return Number(v);
    if ((v.startsWith('{') && v.endsWith('}')) || (v.startsWith('[') && v.endsWith(']'))) {
        try { return JSON.parse(v); } catch { return v; }
    }
    return v;
}

function prop(obj: any, key: string): any {
    const p = obj?.properties;
    if (!p) return undefined;
    return smartCast(p[key]);
}

export function parseTileMap(raw: TiledMap, options?: ParseOptions): ParsedWithDiagnostics {
    const warnings: string[] = [];
    const warn = (m: string, ctx?: any) => { warnings.push(m + (ctx ? ' ' + JSON.stringify(ctx) : '')); options?.onWarn?.(m, ctx); };


    let scaleX = (raw.properties?.scaleX as number) || 1;
    let scaleY = (raw.properties?.scaleY as number) || 1;
    const tileWidth = raw.tilewidth || 1;
    const tileHeight = raw.tileheight || 1;
    const widthPx = (raw.width || 0) * tileWidth * scaleX;
    const heightPx = (raw.height || 0) * tileHeight * scaleY;

    const territories: MapTerritory[] = [];
    const crystals: MapCrystal[] = [];
    const resources: MapResourceNode[] = [];
    const monsterSpawns: MapMonsterSpawn[] = [];
    const teleports: MapTeleportZone[] = [];
    const obstaclePolygons: MapObstaclePolygon[] = [];
    const obstacleTileLayers: MapObstacleTileLayer[] = [];
    let polygonVertexTotal = 0;

    for (const layer of raw.layers || []) {
        if (layer.type === 'objectgroup') {
            for (const obj of layer.objects || []) {
                const name = obj.name || '';
                if (name.startsWith('territory_')) {
                    territories.push({
                        id: name,
                        seatCount: prop(obj, 'seat'),
                        displayName: prop(obj, 'tname'),
                        bounds: {
                            x: (obj.x || 0) * scaleX,
                            y: (obj.y || 0) * scaleY,
                            w: (obj.width || 0) * scaleX,
                            h: (obj.height || 0) * scaleY
                        }
                    });
                    continue;
                }
                if (name.startsWith('crystal_')) {
                    crystals.push({
                        id: name,
                        position: { x: (obj.x || 0) * scaleX, y: (obj.y || 0) * scaleY },
                        hp: prop(obj, 'hp'),
                        shield: prop(obj, 'shield'),
                        regenPerTick: prop(obj, 'restore')
                    });
                    continue;
                }
                if (name === 'gold' || name === 'trees') {
                    resources.push({
                        id: String(obj.id || name + '_' + resources.length),
                        type: name,
                        position: { x: (obj.x || 0) * scaleX, y: (obj.y || 0) * scaleY },
                        resourceTypeId: prop(obj, 'rid'),
                        capacity: prop(obj, 'quantity_limit'),
                        respawnIntervalSec: prop(obj, 'interval'),
                        spawnBatchSize: prop(obj, 'nums'),
                        hp: prop(obj, 'hp')
                    });
                    continue;
                }
                if (name === 'monster') {
                    monsterSpawns.push({
                        spawnId: obj.id || monsterSpawns.length,
                        monsterConfigId: prop(obj, 'monster_id') || prop(layer as any, 'monster_id'),
                        position: { x: (obj.x || 0) * scaleX, y: (obj.y || 0) * scaleY }
                    });
                    continue;
                }
                if (name === 'teleport point') {
                    teleports.push({
                        id: obj.id || teleports.length,
                        destinationRef: prop(obj, 'destination'),
                        channelTimeSec: prop(obj, 'teleport time'),
                        teleportGroupId: prop(obj, 'teleport_id'),
                        bounds: {
                            x: (obj.x || 0) * scaleX,
                            y: (obj.y || 0) * scaleY,
                            w: (obj.width || 0) * scaleX,
                            h: (obj.height || 0) * scaleY
                        }
                    });
                    continue;
                }
                if (obj.points && obj.points.length) {
                    const baseX = (obj.x || 0) * scaleX;
                    const baseY = (obj.y || 0) * scaleY;
                    const pts = obj.points.map((p: any) => ({ x: baseX + p.x * scaleX, y: baseY + p.y * scaleY }));
                    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
                    for (const p of pts) { if (p.x < minX) minX = p.x; if (p.y < minY) minY = p.y; if (p.x > maxX) maxX = p.x; if (p.y > maxY) maxY = p.y; }
                    polygonVertexTotal += pts.length;
                    obstaclePolygons.push({
                        id: obj.id || obstaclePolygons.length,
                        collisionType: prop(obj, 'category'),
                        elevation: prop(obj, 'elevation'),
                        points: pts,
                        aabb: { minX, minY, maxX, maxY }
                    });
                    continue;
                }
                if (name) warn('Unknown object name', { name });
            }
        } else if (layer.type === 'tilelayer' && layer.name === 'obstacle_layer') {
            obstacleTileLayers.push({
                name: layer.name,
                width: layer.width || 0,
                height: layer.height || 0,
                data: layer.data || []
            });
        }
    }

    const map: ParsedMapData = {
        world: { widthPx, heightPx, tileWidth, tileHeight },
        territories,
        crystals,
        resources,
        monsterSpawns,
        teleports,
        obstaclePolygons,
        obstacleTileLayers,
        raw: raw
    };
    const diag: MapParserDiagnostics = { warnings, polygonVertexTotal };
    return { map, diag };
}
