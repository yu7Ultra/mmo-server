/**
 * Monster configuration interfaces
 */

export interface MonsterStats {
  health: number;
  maxHealth: number;
  mana: number;
  maxMana: number;
  attack: number;
  defense: number;
  speed: number;
  attackRange: number;
  detectionRange: number;
  chaseRange: number;
}

export interface MonsterAI {
  behavior: 'passive' | 'aggressive' | 'neutral';
  idleTime: number;
  patrolSpeed: number;
  chaseSpeed: number;
  returnSpeed: number;
  attackCooldown: number;
  fleeHealthPercent: number;
}

export interface PatrolConfig {
  enabled: boolean;
  type: 'random' | 'waypoint' | 'circular';
  radius: number;
  waypoints: Array<{ x: number; y: number }>;
}

export interface LootDrop {
  itemId: string;
  chance: number;
  minAmount: number;
  maxAmount: number;
}

export interface LootTable {
  experience: number;
  dropTable: LootDrop[];
}

export interface RespawnConfig {
  enabled: boolean;
  time: number;
}

export interface MonsterConfig {
  id: string;
  name: string;
  nameZh?: string;
  description: string;
  descriptionZh?: string;
  type: 'passive' | 'aggressive' | 'neutral' | 'boss';
  level: number;
  stats: MonsterStats;
  ai: MonsterAI;
  patrol: PatrolConfig;
  skills: string[];
  loot: LootTable;
  respawn: RespawnConfig;
}

export interface MonstersConfig {
  version: string;
  lastUpdated: string;
  monsters: {
    [monsterId: string]: MonsterConfig;
  };
}

/**
 * Monster AI states
 */
export enum MonsterState {
  IDLE = 'idle',
  PATROL = 'patrol',
  CHASE = 'chase',
  ATTACK = 'attack',
  FLEE = 'flee',
  RETURN = 'return',
  DEAD = 'dead'
}
