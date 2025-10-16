import { World } from 'miniplex';
import { Entity } from '../entities';
import { Quest } from '../schemas/MyRoomState';
import * as prom from '../instrumentation/prometheusMetrics';

/**
 * Quest system - manages quest progress and completion
 * Performance optimized with minimal state updates
 */
export const questSystem = (world: World<Entity>) => {
  const entities = world.with('player');
  
  for (const entity of entities) {
    const { player } = entity;
    
    // Auto-complete quests when target is reached
    for (let i = 0; i < player.quests.length; i++) {
      const quest = player.quests[i];
      if (!quest.completed && quest.progress >= quest.target) {
        completeQuest(entity, quest);
      }
    }
  }
};

/**
 * Award quest to player
 */
export function grantQuest(player: any, questTemplate: {
  id: string;
  name: string;
  description: string;
  target: number;
  expReward: number;
}): void {
  // Check if player already has this quest
  const existing = player.quests.find((q: Quest) => q.id === questTemplate.id);
  if (existing) return;
  
  const quest = new Quest();
  quest.id = questTemplate.id;
  quest.name = questTemplate.name;
  quest.description = questTemplate.description;
  quest.progress = 0;
  quest.target = questTemplate.target;
  quest.completed = false;
  quest.expReward = questTemplate.expReward;
  
  player.quests.push(quest);
}

/**
 * Update quest progress
 */
export function updateQuestProgress(
  entity: Entity,
  questType: string,
  amount: number = 1
): void {
  const { player } = entity;
  
  for (let i = 0; i < player.quests.length; i++) {
    const quest = player.quests[i];
    
    // Match quest by type (simplified - in real game would use quest objectives)
    if (!quest.completed && quest.id.includes(questType)) {
      quest.progress = Math.min(quest.target, quest.progress + amount);
    }
  }
}

/**
 * Complete a quest and award rewards
 */
function completeQuest(entity: Entity, quest: Quest): void {
  quest.completed = true;
  
  // Award experience
  entity.player.experience += quest.expReward;
  
  // Record quest completion in Prometheus
  prom.recordQuestCompletion(quest.id);
  prom.recordExperience('quest', quest.expReward);
  
  // Check for level up
  while (entity.player.experience >= entity.player.experienceToNext) {
    entity.player.experience -= entity.player.experienceToNext;
    entity.player.level++;
    
    // Stat increases
    entity.player.maxHealth += 10;
    entity.player.health = entity.player.maxHealth;
    entity.player.maxMana += 5;
    entity.player.mana = entity.player.maxMana;
    entity.player.attack += 2;
    entity.player.defense += 1;
    
    entity.player.experienceToNext = Math.floor(100 * Math.pow(1.5, entity.player.level - 1));
  }
}

/**
 * Initialize starter quests for new players
 */
export function initializeStarterQuests(player: any): void {
  // Kill quest
  grantQuest(player, {
    id: 'kill_enemies_1',
    name: 'Defeat 5 enemies',
    description: 'Defeat 5 enemies to prove your strength',
    target: 5,
    expReward: 100
  });
  
  // Movement quest
  grantQuest(player, {
    id: 'explore_1',
    name: 'Explore the world',
    description: 'Move around to explore',
    target: 100,
    expReward: 50
  });
  
  // Level up quest
  grantQuest(player, {
    id: 'level_up_1',
    name: 'Reach Level 5',
    description: 'Gain experience and reach level 5',
    target: 5,
    expReward: 200
  });
}

/**
 * Remove/abandon a quest
 */
export function abandonQuest(player: any, questId: string): boolean {
  const index = player.quests.findIndex((q: Quest) => q.id === questId);
  if (index !== -1) {
    player.quests.splice(index, 1);
    return true;
  }
  return false;
}
