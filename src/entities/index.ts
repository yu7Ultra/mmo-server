import { Player } from '../schemas/MyRoomState';

export type Entity = {
  id?: number;
  // Core components
  position: { x: number; y: number };
  velocity: { x: number; y: number };
  player: Player;
  sessionId: string;
  
  // Combat components
  combatTarget?: Entity;
  lastAttackTime?: number;
  
  // AI components (for NPCs/enemies)
  ai?: {
    type: 'passive' | 'aggressive' | 'defensive';
    aggroRange: number;
    patrolPath?: { x: number; y: number }[];
    currentPathIndex?: number;
  };
  
  // Buff/Debuff components
  buffs?: Array<{
    id: string;
    type: string;
    duration: number;
    startTime: number;
    value: number;
  }>;
};

export type Command = {
  x: number;
  y: number;
  sessionId: string;
}

export type AttackCommand = {
  sessionId: string;
  targetId: string;
  skillId?: string;
}

export type ChatCommand = {
  sessionId: string;
  message: string;
  channel: string;
}

export type QuestCommand = {
  sessionId: string;
  questId: string;
  action: 'accept' | 'complete' | 'abandon';
}