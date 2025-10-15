import { World } from 'miniplex';
import { Entity } from '../entities';
import { configManager } from '../config/configManager';
import { MonstersConfig, MonsterConfig, MonsterState } from '../config/monsterConfig';
import * as prom from '../instrumentation/prometheusMetrics';

/**
 * Monster configuration cache
 */
let monsterConfigs: Map<string, MonsterConfig> = new Map();

/**
 * Initialize monster AI system with configuration
 */
export function initializeMonsterSystem(): void {
  try {
    const isTest = process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID !== undefined;
    const config = configManager.loadConfig<MonstersConfig>('monsters', 'config/monsters.json', !isTest);
    monsterConfigs = new Map(Object.entries(config.monsters));
    console.log(`[MonsterAI] Loaded ${monsterConfigs.size} monster types from configuration`);
  } catch (err) {
    console.error('[MonsterAI] Failed to load monster configuration:', err);
  }
}

/**
 * Listen for configuration updates
 */
configManager.on('config-updated', (data: { configName: string; newData: any }) => {
  if (data.configName === 'monsters') {
    const config = data.newData as MonstersConfig;
    monsterConfigs = new Map(Object.entries(config.monsters));
    console.log(`[MonsterAI] Reloaded ${monsterConfigs.size} monster types from configuration`);
  }
});

/**
 * Get monster configuration
 */
export function getMonsterConfig(monsterId: string): MonsterConfig | undefined {
  return monsterConfigs.get(monsterId);
}

/**
 * Monster AI system - controls monster behavior state machine
 */
export const monsterAISystem = (world: World<Entity>, deltaTime: number = 16.67) => {
  const monsters = world.where(e => e.monster !== undefined);
  
  for (const entity of monsters) {
    if (!entity.monster || !entity.position) continue;
    
    const config = getMonsterConfig(entity.monster.type);
    if (!config) continue;
    
    // Skip dead monsters
    if (entity.monster.state === MonsterState.DEAD) {
      handleRespawn(entity, config);
      continue;
    }
    
    // Update AI state machine
    updateMonsterAI(entity, config, world, deltaTime);
  }
};

/**
 * Update monster AI state machine
 */
function updateMonsterAI(
  entity: Entity,
  config: MonsterConfig,
  world: World<Entity>,
  deltaTime: number
): void {
  const monster = entity.monster!;
  const now = Date.now();
  
  // State machine
  switch (monster.state) {
    case MonsterState.IDLE:
      handleIdleState(entity, config, world, now);
      break;
      
    case MonsterState.PATROL:
      handlePatrolState(entity, config, world, deltaTime);
      break;
      
    case MonsterState.CHASE:
      handleChaseState(entity, config, world, deltaTime);
      break;
      
    case MonsterState.ATTACK:
      handleAttackState(entity, config, world, now);
      break;
      
    case MonsterState.FLEE:
      handleFleeState(entity, config, deltaTime);
      break;
      
    case MonsterState.RETURN:
      handleReturnState(entity, config, deltaTime);
      break;
  }
}

/**
 * Idle state - wait and look for targets
 */
function handleIdleState(
  entity: Entity,
  config: MonsterConfig,
  world: World<Entity>,
  now: number
): void {
  const monster = entity.monster!;
  
  // Check for nearby players
  const target = findNearestPlayer(entity, world, config.stats.detectionRange);
  
  if (target && config.ai.behavior === 'aggressive') {
    // Transition to chase
    monster.state = MonsterState.CHASE;
    monster.targetId = target.sessionId;
    return;
  }
  
  // Check if idle time expired
  if (now - (monster.stateStartTime || 0) > config.ai.idleTime) {
    // Transition to patrol if enabled
    if (config.patrol.enabled) {
      monster.state = MonsterState.PATROL;
      monster.stateStartTime = now;
    } else {
      monster.stateStartTime = now; // Reset idle timer
    }
  }
}

/**
 * Patrol state - move around spawn area
 */
function handlePatrolState(
  entity: Entity,
  config: MonsterConfig,
  world: World<Entity>,
  deltaTime: number
): void {
  const monster = entity.monster!;
  
  // Check for nearby players
  const target = findNearestPlayer(entity, world, config.stats.detectionRange);
  
  if (target && config.ai.behavior === 'aggressive') {
    // Transition to chase
    monster.state = MonsterState.CHASE;
    monster.targetId = target.sessionId;
    return;
  }
  
  // Move according to patrol type
  if (config.patrol.type === 'random') {
    moveRandomPatrol(entity, config, deltaTime);
  } else if (config.patrol.type === 'waypoint') {
    moveWaypointPatrol(entity, config, deltaTime);
  }
}

/**
 * Chase state - pursue target
 */
function handleChaseState(
  entity: Entity,
  config: MonsterConfig,
  world: World<Entity>,
  deltaTime: number
): void {
  const monster = entity.monster!;
  const target = world.entities.find(e => e.sessionId === monster.targetId);
  
  if (!target || !target.player) {
    // Lost target, return to spawn
    monster.state = MonsterState.RETURN;
    monster.targetId = undefined;
    return;
  }
  
  const distance = getDistance(entity.position!, target.position!);
  
  // Check if out of chase range
  if (distance > config.stats.chaseRange) {
    monster.state = MonsterState.RETURN;
    monster.targetId = undefined;
    return;
  }
  
  // Check if in attack range
  if (distance <= config.stats.attackRange) {
    monster.state = MonsterState.ATTACK;
    return;
  }
  
  // Move towards target
  moveTowards(entity, target.position!, config.ai.chaseSpeed, deltaTime);
}

/**
 * Attack state - attack target
 */
function handleAttackState(
  entity: Entity,
  config: MonsterConfig,
  world: World<Entity>,
  now: number
): void {
  const monster = entity.monster!;
  const target = world.entities.find(e => e.sessionId === monster.targetId);
  
  if (!target || !target.player) {
    monster.state = MonsterState.RETURN;
    monster.targetId = undefined;
    return;
  }
  
  const distance = getDistance(entity.position!, target.position!);
  
  // Check if target moved out of attack range
  if (distance > config.stats.attackRange) {
    monster.state = MonsterState.CHASE;
    return;
  }
  
  // Check attack cooldown
  if (now - (monster.lastAttackTime || 0) < config.ai.attackCooldown) {
    return;
  }
  
  // Perform attack
  const damage = calculateDamage(config.stats.attack, target.player.defense);
  target.player.health = Math.max(0, target.player.health - damage);
  target.player.damageTaken += damage;
  monster.lastAttackTime = now;
  
  // Record metrics
  prom.recordCombat('pve');
  prom.recordDamage('monster_' + config.id, damage);
  
  // Check if should flee
  const healthPercent = monster.health / config.stats.maxHealth;
  if (healthPercent <= config.ai.fleeHealthPercent && config.ai.fleeHealthPercent > 0) {
    monster.state = MonsterState.FLEE;
    return;
  }
  
  // Check if target is dead
  if (target.player.health <= 0) {
    monster.state = MonsterState.RETURN;
    monster.targetId = undefined;
  }
}

/**
 * Flee state - run away from danger
 */
function handleFleeState(
  entity: Entity,
  config: MonsterConfig,
  deltaTime: number
): void {
  const monster = entity.monster!;
  
  // Move towards spawn point
  moveTowards(entity, monster.spawnPoint!, config.ai.chaseSpeed * 1.5, deltaTime);
  
  const distance = getDistance(entity.position!, monster.spawnPoint!);
  
  // If reached spawn point, return to idle
  if (distance < 10) {
    monster.state = MonsterState.IDLE;
    monster.stateStartTime = Date.now();
  }
}

/**
 * Return state - return to spawn point
 */
function handleReturnState(
  entity: Entity,
  config: MonsterConfig,
  deltaTime: number
): void {
  const monster = entity.monster!;
  
  // Move towards spawn point
  moveTowards(entity, monster.spawnPoint!, config.ai.returnSpeed, deltaTime);
  
  const distance = getDistance(entity.position!, monster.spawnPoint!);
  
  // If reached spawn point, return to idle
  if (distance < 10) {
    monster.state = MonsterState.IDLE;
    monster.stateStartTime = Date.now();
  }
}

/**
 * Handle respawn logic
 */
function handleRespawn(entity: Entity, config: MonsterConfig): void {
  const monster = entity.monster!;
  
  if (!config.respawn.enabled) return;
  
  const now = Date.now();
  if (now - (monster.deathTime || 0) >= config.respawn.time) {
    // Respawn monster
    monster.health = config.stats.maxHealth;
    monster.mana = config.stats.maxMana;
    monster.state = MonsterState.IDLE;
    monster.stateStartTime = now;
    monster.targetId = undefined;
    
    // Reset position to spawn point
    entity.position!.x = monster.spawnPoint!.x;
    entity.position!.y = monster.spawnPoint!.y;
    
    console.log(`[MonsterAI] Respawned ${config.name} at spawn point`);
  }
}

/**
 * Find nearest player within range
 */
function findNearestPlayer(
  entity: Entity,
  world: World<Entity>,
  range: number
): Entity | undefined {
  const players = world.where(e => e.player !== undefined && !e.monster);
  
  let nearest: Entity | undefined;
  let nearestDistance = range;
  
  for (const player of players) {
    if (!player.position) continue;
    
    const distance = getDistance(entity.position!, player.position);
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearest = player;
    }
  }
  
  return nearest;
}

/**
 * Move randomly within patrol radius
 */
function moveRandomPatrol(
  entity: Entity,
  config: MonsterConfig,
  deltaTime: number
): void {
  const monster = entity.monster!;
  
  // Check if we need a new patrol target
  if (!monster.patrolTarget) {
    const angle = Math.random() * Math.PI * 2;
    const distance = Math.random() * config.patrol.radius;
    monster.patrolTarget = {
      x: monster.spawnPoint!.x + Math.cos(angle) * distance,
      y: monster.spawnPoint!.y + Math.sin(angle) * distance
    };
  }
  
  // Move towards patrol target
  moveTowards(entity, monster.patrolTarget, config.ai.patrolSpeed, deltaTime);
  
  // If reached target, clear it
  const distance = getDistance(entity.position!, monster.patrolTarget);
  if (distance < 5) {
    monster.patrolTarget = undefined;
    monster.state = MonsterState.IDLE;
    monster.stateStartTime = Date.now();
  }
}

/**
 * Move along waypoint path
 */
function moveWaypointPatrol(
  entity: Entity,
  config: MonsterConfig,
  deltaTime: number
): void {
  const monster = entity.monster!;
  
  if (config.patrol.waypoints.length === 0) {
    monster.state = MonsterState.IDLE;
    return;
  }
  
  // Initialize waypoint index
  if (monster.waypointIndex === undefined) {
    monster.waypointIndex = 0;
  }
  
  const currentWaypoint = config.patrol.waypoints[monster.waypointIndex];
  const target = {
    x: monster.spawnPoint!.x + currentWaypoint.x,
    y: monster.spawnPoint!.y + currentWaypoint.y
  };
  
  // Move towards waypoint
  moveTowards(entity, target, config.ai.patrolSpeed, deltaTime);
  
  // If reached waypoint, move to next
  const distance = getDistance(entity.position!, target);
  if (distance < 5) {
    monster.waypointIndex = (monster.waypointIndex + 1) % config.patrol.waypoints.length;
  }
}

/**
 * Move towards a target position
 */
function moveTowards(
  entity: Entity,
  target: { x: number; y: number },
  speed: number,
  deltaTime: number
): void {
  const dx = target.x - entity.position!.x;
  const dy = target.y - entity.position!.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  
  if (distance > 0) {
    const moveDistance = speed * (deltaTime / 16.67);
    const ratio = Math.min(moveDistance / distance, 1);
    
    entity.position!.x += dx * ratio;
    entity.position!.y += dy * ratio;
  }
}

/**
 * Get distance between two positions
 */
function getDistance(pos1: { x: number; y: number }, pos2: { x: number; y: number }): number {
  const dx = pos2.x - pos1.x;
  const dy = pos2.y - pos1.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Calculate damage with defense mitigation
 */
function calculateDamage(attack: number, defense: number): number {
  const baseDamage = attack * (100 / (100 + defense));
  const variance = 0.9 + Math.random() * 0.2;
  return Math.floor(baseDamage * variance);
}

/**
 * Spawn a monster at a specific location
 */
export function spawnMonster(
  world: World<Entity>,
  monsterId: string,
  position: { x: number; y: number }
): Entity | undefined {
  const config = getMonsterConfig(monsterId);
  if (!config) {
    console.warn(`[MonsterAI] Unknown monster type: ${monsterId}`);
    return undefined;
  }
  
  // Import Player dynamically to create dummy player for monsters
  const { Player } = require('../schemas/MyRoomState');
  const dummyPlayer = new Player();
  dummyPlayer.name = config.name;
  dummyPlayer.level = config.level;
  dummyPlayer.health = 0; // Monster stats are in monster component
  dummyPlayer.maxHealth = 0;
  
  const entity = world.add({
    sessionId: `monster_${Date.now()}_${Math.random()}`,
    player: dummyPlayer,
    monster: {
      type: monsterId,
      level: config.level,
      health: config.stats.maxHealth,
      maxHealth: config.stats.maxHealth,
      mana: config.stats.maxMana,
      maxMana: config.stats.maxMana,
      state: MonsterState.IDLE,
      stateStartTime: Date.now(),
      spawnPoint: { ...position },
      targetId: undefined,
      lastAttackTime: 0,
      deathTime: 0,
      patrolTarget: undefined,
      waypointIndex: 0
    },
    position: { ...position },
    velocity: { x: 0, y: 0 }
  });
  
  console.log(`[MonsterAI] Spawned ${config.name} at (${position.x}, ${position.y})`);
  return entity;
}
