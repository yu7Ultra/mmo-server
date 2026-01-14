import { TiledMap } from '../tmx/TiledMapUtils';

export interface MapTerritory {
  id: string;
  seatCount?: number;
  displayName?: string;
  bounds: { x: number; y: number; w: number; h: number };
}

export interface MapCrystal {
  id: string;
  position: { x: number; y: number };
  hp?: number;
  shield?: number;
  regenPerTick?: number;
}

export interface MapResourceNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  resourceTypeId?: number;
  capacity?: number;
  respawnIntervalSec?: number;
  spawnBatchSize?: number;
  hp?: number;
}

export interface MapMonsterSpawn {
  spawnId: number;
  monsterConfigId: number;
  position: { x: number; y: number };
}

export interface MapTeleportZone {
  id: number;
  destinationRef?: string;
  channelTimeSec?: number;
  teleportGroupId?: number;
  bounds: { x: number; y: number; w: number; h: number };
}

export interface MapObstaclePolygon {
  id: number;
  collisionType?: string;
  elevation?: number;
  points: { x: number; y: number }[];
  aabb: { minX: number; minY: number; maxX: number; maxY: number };
}

export interface MapObstacleTileLayer {
  name: string;
  width: number;
  height: number;
  data: number[];
}

export interface ParsedMapData {
  world: { widthPx: number; heightPx: number; tileWidth: number; tileHeight: number };
  territories: MapTerritory[];
  crystals: MapCrystal[];
  resources: MapResourceNode[];
  monsterSpawns: MapMonsterSpawn[];
  teleports: MapTeleportZone[];
  obstaclePolygons: MapObstaclePolygon[];
  obstacleTileLayers: MapObstacleTileLayer[];
  raw: TiledMap;
}

export interface ParseOptions {
  strictLayerNames?: boolean;
  onWarn?: (msg: string, ctx?: any) => void;
}

export interface MapParserDiagnostics {
  warnings: string[];
  polygonVertexTotal: number;
}

export interface ParsedWithDiagnostics {
  map: ParsedMapData;
  diag: MapParserDiagnostics;
}
