import { World } from 'miniplex';
import { Entity } from '../entities';
import { Achievement } from '../schemas/MyRoomState';
import * as prom from '../instrumentation/prometheusMetrics';

/**
 * Achievement system - tracks and unlocks achievements
 * Optimized for minimal overhead
 */
export const achievementSystem = (world: World<Entity>) => {
  const entities = world.with('player');
  
  for (const entity of entities) {
    const { player } = entity;
    
    // Check each achievement condition
    for (let i = 0; i < player.achievements.length; i++) {
      const achievement = player.achievements[i];
      
      if (achievement.unlocked) continue;
      
      // Update progress based on achievement type
      updateAchievementProgress(entity, achievement);
      
      // Check if achievement is complete
      if (achievement.progress >= achievement.target && !achievement.unlocked) {
        unlockAchievement(achievement);
      }
    }
  }
};

/**
 * Update achievement progress based on player stats
 */
function updateAchievementProgress(entity: Entity, achievement: Achievement): void {
  const { player } = entity;
  
  switch (achievement.id) {
    case 'first_blood':
      achievement.progress = player.kills;
      break;
    case 'killer':
      achievement.progress = player.kills;
      break;
    case 'survivor':
      achievement.progress = Math.max(0, player.kills - player.deaths);
      break;
    case 'tank':
      achievement.progress = Math.floor(player.damageTaken);
      break;
    case 'damage_dealer':
      achievement.progress = Math.floor(player.damageDealt);
      break;
    case 'leveling':
      achievement.progress = player.level;
      break;
    case 'warrior':
      achievement.progress = player.level;
      break;
    case 'quest_master':
      achievement.progress = player.quests.filter((q: any) => q.completed).length;
      break;
    case 'social':
      achievement.progress = player.friends.length;
      break;
  }
}

/**
 * Unlock an achievement
 */
function unlockAchievement(achievement: Achievement): void {
  achievement.unlocked = true;
  achievement.unlockedAt = Date.now();
  
  // Record achievement unlock in Prometheus
  prom.recordAchievementUnlock(achievement.id);
}

/**
 * Initialize achievements for a new player
 */
export function initializeAchievements(player: any): void {
  player.achievements.clear();
  
  // Combat achievements
  const firstBlood = new Achievement();
  firstBlood.id = 'first_blood';
  firstBlood.name = 'First Blood';
  firstBlood.description = 'Get your first kill';
  firstBlood.target = 1;
  firstBlood.progress = 0;
  firstBlood.unlocked = false;
  player.achievements.push(firstBlood);
  
  const killer = new Achievement();
  killer.id = 'killer';
  killer.name = 'Killer';
  killer.description = 'Get 10 kills';
  killer.target = 10;
  killer.progress = 0;
  killer.unlocked = false;
  player.achievements.push(killer);
  
  const survivor = new Achievement();
  survivor.id = 'survivor';
  survivor.name = 'Survivor';
  survivor.description = 'Have a positive K/D ratio of 10';
  survivor.target = 10;
  survivor.progress = 0;
  survivor.unlocked = false;
  player.achievements.push(survivor);
  
  // Damage achievements
  const tank = new Achievement();
  tank.id = 'tank';
  tank.name = 'Tank';
  tank.description = 'Take 1000 damage';
  tank.target = 1000;
  tank.progress = 0;
  tank.unlocked = false;
  player.achievements.push(tank);
  
  const damageDealer = new Achievement();
  damageDealer.id = 'damage_dealer';
  damageDealer.name = 'Damage Dealer';
  damageDealer.description = 'Deal 1000 damage';
  damageDealer.target = 1000;
  damageDealer.progress = 0;
  damageDealer.unlocked = false;
  player.achievements.push(damageDealer);
  
  // Level achievements
  const leveling = new Achievement();
  leveling.id = 'leveling';
  leveling.name = 'Leveling';
  leveling.description = 'Reach level 5';
  leveling.target = 5;
  leveling.progress = 0;
  leveling.unlocked = false;
  player.achievements.push(leveling);
  
  const warrior = new Achievement();
  warrior.id = 'warrior';
  warrior.name = 'Warrior';
  warrior.description = 'Reach level 10';
  warrior.target = 10;
  warrior.progress = 0;
  warrior.unlocked = false;
  player.achievements.push(warrior);
  
  // Quest achievement
  const questMaster = new Achievement();
  questMaster.id = 'quest_master';
  questMaster.name = 'Quest Master';
  questMaster.description = 'Complete 5 quests';
  questMaster.target = 5;
  questMaster.progress = 0;
  questMaster.unlocked = false;
  player.achievements.push(questMaster);
  
  // Social achievement
  const social = new Achievement();
  social.id = 'social';
  social.name = 'Social Butterfly';
  social.description = 'Make 5 friends';
  social.target = 5;
  social.progress = 0;
  social.unlocked = false;
  player.achievements.push(social);
}
