/**
 * Spatial Partitioning System using Quadtree
 * 
 * This system provides efficient spatial queries for game entities using a quadtree data structure.
 * It significantly improves performance for collision detection, nearby entity searches,
 * and range queries by reducing the number of comparisons needed.
 * 
 * Features:
 * - Efficient collision detection
 * - Fast nearby entity queries
 * - Range-based searches
 * - Dynamic entity updates
 * - Support for both players and monsters
 */

import { Quadtree, Rectangle, Circle } from '@timohausmann/quadtree-ts';
import { Player } from '../schemas/MyRoomState';
import { Entity } from '../entities';
import { World } from 'miniplex';

/**
 * Custom data attached to each spatial entity
 */
interface EntityData {
  id: string;
  type: 'player' | 'monster' | 'projectile' | 'item';
  entity: Player | Entity | any;
}

/**
 * Global spatial partitioning instance
 */
let globalSpatial: SpatialPartitioningSystem | null = null;

/**
 * Spatial entity that extends Rectangle with custom data
 */
export class SpatialEntity extends Rectangle<EntityData> {
  constructor(x: number, y: number, width: number, height: number, data: EntityData) {
    super({ x, y, width, height, data });
  }

  get id(): string {
    return this.data!.id;
  }

  get type(): string {
    return this.data!.type;
  }

  get entity(): any {
    return this.data!.entity;
  }
}

/**
 * Query result containing entity and distance information
 */
export interface SpatialQueryResult {
  entity: SpatialEntity;
  distance: number;
}

/**
 * Configuration for the spatial partitioning system
 */
export interface SpatialConfig {
  worldWidth: number;
  worldHeight: number;
  maxObjects?: number;  // Maximum objects per node before split
  maxLevels?: number;   // Maximum depth of the quadtree
}

/**
 * Spatial Partitioning System
 * 
 * Manages a quadtree for efficient spatial queries in the game world.
 */
export class SpatialPartitioningSystem {
  private quadtree: Quadtree<SpatialEntity>;
  private config: Required<SpatialConfig>;
  private entityMap: Map<string, SpatialEntity>;

  constructor(config: SpatialConfig) {
    this.config = {
      worldWidth: config.worldWidth,
      worldHeight: config.worldHeight,
      maxObjects: config.maxObjects || 10,
      maxLevels: config.maxLevels || 5
    };

    // Initialize quadtree with world bounds
    this.quadtree = new Quadtree({
      width: this.config.worldWidth,
      height: this.config.worldHeight,
      x: 0,
      y: 0,
      maxObjects: this.config.maxObjects,
      maxLevels: this.config.maxLevels
    });

    this.entityMap = new Map();
  }

  /**
   * Add or update an entity in the spatial partitioning system
   */
  addEntity(entity: SpatialEntity): void {
    // Remove old entry if exists
    if (this.entityMap.has(entity.id)) {
      this.removeEntity(entity.id);
    }

    // Add to quadtree
    this.quadtree.insert(entity);
    this.entityMap.set(entity.id, entity);
  }

  /**
   * Remove an entity from the spatial partitioning system
   */
  removeEntity(entityId: string): void {
    const entity = this.entityMap.get(entityId);
    if (entity) {
      this.quadtree.remove(entity);
      this.entityMap.delete(entityId);
    }
  }

  /**
   * Update entity position in the quadtree
   */
  updateEntity(entityId: string, x: number, y: number): void {
    const entity = this.entityMap.get(entityId);
    if (entity) {
      // Remove from old position
      this.quadtree.remove(entity);
      
      // Update position
      entity.x = x;
      entity.y = y;
      
      // Re-insert at new position
      this.quadtree.insert(entity);
    }
  }

  /**
   * Find all entities within a rectangular area
   */
  queryArea(x: number, y: number, width: number, height: number): SpatialEntity[] {
    const rect = new Rectangle({ x, y, width, height });
    return this.quadtree.retrieve(rect) as SpatialEntity[];
  }

  /**
   * Find all entities within a circular radius
   */
  queryRadius(centerX: number, centerY: number, radius: number): SpatialQueryResult[] {
    // Use Circle for more accurate queries
    const circle = new Circle({ x: centerX, y: centerY, r: radius });
    const entities = this.quadtree.retrieve(circle) as SpatialEntity[];

    // Calculate exact distances
    const results: SpatialQueryResult[] = [];
    const radiusSquared = radius * radius;

    for (const entity of entities) {
      // Calculate distance from center to entity center
      const entityCenterX = entity.x + entity.width / 2;
      const entityCenterY = entity.y + entity.height / 2;
      const dx = entityCenterX - centerX;
      const dy = entityCenterY - centerY;
      const distanceSquared = dx * dx + dy * dy;

      if (distanceSquared <= radiusSquared) {
        results.push({
          entity,
          distance: Math.sqrt(distanceSquared)
        });
      }
    }

    return results;
  }

  /**
   * Find the N nearest entities to a point
   */
  queryNearest(x: number, y: number, count: number, maxDistance: number = Infinity): SpatialQueryResult[] {
    // Start with a reasonable search radius
    let searchRadius = 100;
    let results: SpatialQueryResult[] = [];

    // Expand search radius until we find enough entities or reach max distance
    while (results.length < count && searchRadius <= maxDistance) {
      results = this.queryRadius(x, y, searchRadius);
      
      // Sort by distance
      results.sort((a, b) => a.distance - b.distance);
      
      if (results.length < count) {
        searchRadius *= 2; // Double the search radius
      }
    }

    // Return only the requested count
    return results.slice(0, count);
  }

  /**
   * Check if two entities are colliding
   */
  checkCollision(entity1: SpatialEntity, entity2: SpatialEntity): boolean {
    return (
      entity1.x < entity2.x + entity2.width &&
      entity1.x + entity1.width > entity2.x &&
      entity1.y < entity2.y + entity2.height &&
      entity1.y + entity1.height > entity2.y
    );
  }

  /**
   * Find all entities colliding with the given entity
   */
  getCollisions(entity: SpatialEntity): SpatialEntity[] {
    const candidates = this.queryArea(entity.x, entity.y, entity.width, entity.height);
    const collisions: SpatialEntity[] = [];

    for (const candidate of candidates) {
      if (candidate.id !== entity.id && this.checkCollision(entity, candidate)) {
        collisions.push(candidate);
      }
    }

    return collisions;
  }

  /**
   * Find entities of a specific type within a radius
   */
  queryByType(
    centerX: number,
    centerY: number,
    radius: number,
    type: SpatialEntity['type']
  ): SpatialQueryResult[] {
    const results = this.queryRadius(centerX, centerY, radius);
    return results.filter(result => result.entity.type === type);
  }

  /**
   * Clear all entities from the quadtree
   */
  clear(): void {
    this.quadtree.clear();
    this.entityMap.clear();
  }

  /**
   * Rebuild the entire quadtree (useful after many updates)
   */
  rebuild(): void {
    const entities = Array.from(this.entityMap.values());
    this.quadtree.clear();
    
    for (const entity of entities) {
      this.quadtree.insert(entity);
    }
  }

  /**
   * Get total number of entities in the system
   */
  getEntityCount(): number {
    return this.entityMap.size;
  }

  /**
   * Get entity by ID
   */
  getEntity(entityId: string): SpatialEntity | undefined {
    return this.entityMap.get(entityId);
  }

  /**
   * Get all entities in the system
   */
  getAllEntities(): SpatialEntity[] {
    return Array.from(this.entityMap.values());
  }

  /**
   * Create a spatial entity from a player
   */
  static createPlayerEntity(playerId: string, player: Player): SpatialEntity {
    return new SpatialEntity(
      player.x - 16, // Adjust for center point
      player.y - 16,
      32, // width
      32, // height
      {
        id: playerId,
        type: 'player',
        entity: player
      }
    );
  }

  /**
   * Create a spatial entity from a monster/entity
   */
  static createMonsterEntity(monsterId: string, entity: Entity): SpatialEntity {
    return new SpatialEntity(
      entity.position.x - 16,
      entity.position.y - 16,
      32, // width
      32, // height
      {
        id: monsterId,
        type: 'monster',
        entity: entity
      }
    );
  }

  /**
   * Debug: Get quadtree statistics
   */
  getStats(): {
    totalEntities: number;
    treeDepth: number;
    nodeCount: number;
  } {
    return {
      totalEntities: this.entityMap.size,
      treeDepth: this.config.maxLevels,
      nodeCount: this.countNodes(this.quadtree)
    };
  }

  private countNodes(node: any): number {
    let count = 1;
    if (node.nodes && node.nodes.length > 0) {
      for (const childNode of node.nodes) {
        count += this.countNodes(childNode);
      }
    }
    return count;
  }
}

/**
 * Helper functions for common spatial queries
 */
export class SpatialHelpers {
  /**
   * Find all players near a position
   */
  static findNearbyPlayers(
    spatial: SpatialPartitioningSystem,
    x: number,
    y: number,
    radius: number
  ): Player[] {
    const results = spatial.queryByType(x, y, radius, 'player');
    return results.map(r => r.entity.entity as Player);
  }

  /**
   * Find all monsters near a position
   */
  static findNearbyMonsters(
    spatial: SpatialPartitioningSystem,
    x: number,
    y: number,
    radius: number
  ): Entity[] {
    const results = spatial.queryByType(x, y, radius, 'monster');
    return results.map(r => r.entity.entity as Entity);
  }

  /**
   * Find the closest player to a position
   */
  static findClosestPlayer(
    spatial: SpatialPartitioningSystem,
    x: number,
    y: number,
    maxDistance: number = Infinity
  ): Player | null {
    const results = spatial.queryByType(x, y, maxDistance, 'player');
    if (results.length === 0) return null;

    results.sort((a, b) => a.distance - b.distance);
    return results[0].entity.entity as Player;
  }

  /**
   * Find the closest monster to a position
   */
  static findClosestMonster(
    spatial: SpatialPartitioningSystem,
    x: number,
    y: number,
    maxDistance: number = Infinity
  ): Entity | null {
    const results = spatial.queryByType(x, y, maxDistance, 'monster');
    if (results.length === 0) return null;

    results.sort((a, b) => a.distance - b.distance);
    return results[0].entity.entity as Entity;
  }

  /**
   * Check if a position is near any entity of a specific type
   */
  static isNearEntityType(
    spatial: SpatialPartitioningSystem,
    x: number,
    y: number,
    radius: number,
    type: SpatialEntity['type']
  ): boolean {
    const results = spatial.queryByType(x, y, radius, type);
    return results.length > 0;
  }

  /**
   * Count entities of a specific type in a radius
   */
  static countEntitiesInRadius(
    spatial: SpatialPartitioningSystem,
    x: number,
    y: number,
    radius: number,
    type?: SpatialEntity['type']
  ): number {
    if (type) {
      return spatial.queryByType(x, y, radius, type).length;
    } else {
      return spatial.queryRadius(x, y, radius).length;
    }
  }
}

/**
 * Initialize the global spatial partitioning system
 */
export function initializeSpatialSystem(config: {
  worldWidth: number;
  worldHeight: number;
  maxObjects?: number;
  maxLevels?: number;
}): void {
  globalSpatial = new SpatialPartitioningSystem(config);
  console.log(`[SpatialSystem] Initialized with ${config.worldWidth}x${config.worldHeight}`);
}

/**
 * Get the global spatial partitioning instance
 */
export function getSpatialSystem(): SpatialPartitioningSystem | null {
  return globalSpatial;
}

/**
 * Spatial partitioning system - updates entity positions in quadtree
 * Called after movement system to keep spatial index synchronized
 */
export function spatialSystem(world: World<Entity>): void {
  if (!globalSpatial) {
    console.warn('[SpatialSystem] Not initialized, skipping update');
    return;
  }

  // Update all entities with position components
  const entities = world.entities;
  
  for (const entity of entities) {
    if (!entity.sessionId || !entity.position) continue;
    
    // Skip dead monsters
    if (entity.monster?.state === 'dead') continue;
    
    // Update entity position in quadtree
    globalSpatial.updateEntity(
      entity.sessionId,
      entity.position.x,
      entity.position.y
    );
  }
}

/**
 * Add an entity to the spatial partitioning system
 */
export function addToSpatialSystem(
  entityId: string,
  entity: Entity,
  type: 'player' | 'monster' | 'projectile' | 'item'
): void {
  if (!globalSpatial) return;

  if (!entity.position) {
    console.warn(`[SpatialSystem] Entity ${entityId} has no position, skipping`);
    return;
  }

  const spatialEntity = new SpatialEntity(
    entity.position.x - 16,
    entity.position.y - 16,
    32,
    32,
    {
      id: entityId,
      type: type,
      entity: entity
    }
  );

  globalSpatial.addEntity(spatialEntity);
}

/**
 * Remove an entity from the spatial partitioning system
 */
export function removeFromSpatialSystem(entityId: string): void {
  if (!globalSpatial) return;
  globalSpatial.removeEntity(entityId);
}

/**
 * Dispose the global spatial system
 */
export function disposeSpatialSystem(): void {
  if (globalSpatial) {
    globalSpatial.clear();
    globalSpatial = null;
    console.log('[SpatialSystem] Disposed');
  }
}
