import { Schema, MapSchema, ArraySchema, type } from '@colyseus/schema';

// Equipment item
export class EquipmentItem extends Schema {
  @type('string') id: string = '';
  @type('string') name: string = '';
  @type('string') slot: string = ''; // weapon, armor, helmet, etc.
  @type('number') attack: number = 0;
  @type('number') defense: number = 0;
}

// Skill definition
export class Skill extends Schema {
  @type('string') id: string = '';
  @type('string') name: string = '';
  @type('number') level: number = 1;
  @type('number') cooldown: number = 0; // milliseconds
  @type('number') lastUsed: number = 0; // timestamp
  @type('number') manaCost: number = 0;
  @type('number') damage: number = 0;
}

// Quest/Task
export class Quest extends Schema {
  @type('string') id: string = '';
  @type('string') name: string = '';
  @type('string') description: string = '';
  @type('number') progress: number = 0;
  @type('number') target: number = 0;
  @type('boolean') completed: boolean = false;
  @type('number') expReward: number = 0;
}

// Achievement
export class Achievement extends Schema {
  @type('string') id: string = '';
  @type('string') name: string = '';
  @type('string') description: string = '';
  @type('number') progress: number = 0;
  @type('number') target: number = 100;
  @type('boolean') unlocked: boolean = false;
  @type('number') unlockedAt: number = 0;
}

export class Player extends Schema {
  // Position
  @type('number') x: number = Math.random() * 800;
  @type('number') y: number = Math.random() * 600;
  
  // Character attributes
  @type('string') name: string = 'Player';
  @type('number') level: number = 1;
  @type('number') experience: number = 0;
  @type('number') experienceToNext: number = 100;
  
  // Combat stats
  @type('number') health: number = 100;
  @type('number') maxHealth: number = 100;
  @type('number') mana: number = 100;
  @type('number') maxMana: number = 100;
  @type('number') attack: number = 10;
  @type('number') defense: number = 5;
  @type('number') speed: number = 5;
  
  // Status
  @type('boolean') inCombat: boolean = false;
  @type('string') targetId: string = '';
  
  // Equipment and skills
  @type({ map: EquipmentItem }) equipment = new MapSchema<EquipmentItem>();
  @type([Skill]) skills = new ArraySchema<Skill>();
  
  // Quests and achievements
  @type([Quest]) quests = new ArraySchema<Quest>();
  @type([Achievement]) achievements = new ArraySchema<Achievement>();
  
  // Social
  @type(['string']) friends = new ArraySchema<string>();
  
  // Stats tracking
  @type('number') kills: number = 0;
  @type('number') deaths: number = 0;
  @type('number') damageDealt: number = 0;
  @type('number') damageTaken: number = 0;
}

// Chat message
export class ChatMessage extends Schema {
  @type('string') sender: string = '';
  @type('string') message: string = '';
  @type('number') timestamp: number = 0;
  @type('string') channel: string = 'global'; // global, team, whisper
}

// Leaderboard entry
export class LeaderboardEntry extends Schema {
  @type('string') playerId: string = '';
  @type('string') playerName: string = '';
  @type('number') score: number = 0;
  @type('number') level: number = 0;
  @type('number') rank: number = 0;
}

export class MyRoomState extends Schema {
  @type({ map: Player }) players = new MapSchema<Player>();
  @type([ChatMessage]) chatMessages = new ArraySchema<ChatMessage>();
  @type([LeaderboardEntry]) leaderboard = new ArraySchema<LeaderboardEntry>();
  @type('number') serverTime: number = Date.now();
}
