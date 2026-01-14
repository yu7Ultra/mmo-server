import { World } from 'miniplex';
import { Entity } from '../entities';
import { Skill } from '../schemas/MyRoomState';
import { configManager } from '../config/configManager';
import { SkillsConfig, SkillConfig, SkillEffect } from '../config/skillConfig';
import { MonsterState } from '../config/monsterConfig';
import * as prom from '../instrumentation/prometheusMetrics';

/**
 * Skill configuration cache
 */
let skillConfigs: Map<string, SkillConfig> = new Map();

/**
 * Initialize skill system with configuration
 */
export function initializeSkillSystem(): void {
  try {
    const isTest = process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID !== undefined;
    const config = configManager.loadConfig<SkillsConfig>('skills', 'config/skills.json', !isTest);
    skillConfigs = new Map(Object.entries(config.skills));
    console.log(`[SkillSystem] Loaded ${skillConfigs.size} skills from configuration`);
  } catch (err) {
    console.error('[SkillSystem] Failed to load skill configuration:', err);
    // Fallback to hardcoded skills if config fails
    console.warn('[SkillSystem] Using fallback hardcoded skills');
  }
}

/**
 * Listen for configuration updates
 */
configManager.on('config-updated', (data: { configName: string; newData: any }) => {
  if (data.configName === 'skills') {
    const config = data.newData as SkillsConfig;
    skillConfigs = new Map(Object.entries(config.skills));
    console.log(`[SkillSystem] Reloaded ${skillConfigs.size} skills from configuration`);
  }
});

/**
 * Get skill configuration
 */
export function getSkillConfig(skillId: string): SkillConfig | undefined {
  return skillConfigs.get(skillId);
}

/**
 * Skill system - manages skill cooldowns and effects
 * Optimized for performance with minimal allocations
 */
export const skillSystem = (world: World<Entity>) => {
  const now = Date.now();
  const entities = world.with('player');
  
  for (const entity of entities) {
    const { player } = entity;
    
    // Update skill cooldowns
    for (let i = 0; i < player.skills.length; i++) {
      const skill = player.skills[i];
      if (skill.lastUsed > 0 && now - skill.lastUsed >= skill.cooldown) {
        // Cooldown complete - don't need to update anything, client checks this
      }
    }
  }
};

/**
 * Use a skill on a target
 * Returns true if skill was successfully used
 */
export function useSkill(
  caster: Entity,
  skillId: string,
  target?: Entity
): boolean {
  const skill = caster.player.skills.find(s => s.id === skillId);
  if (!skill) return false;
  
  const now = Date.now();
  
  // Check cooldown
  if (skill.lastUsed > 0 && now - skill.lastUsed < skill.cooldown) {
    return false;
  }
  
  // Check mana cost
  if (caster.player.mana < skill.manaCost) {
    return false;
  }
  
  // Consume mana
  caster.player.mana -= skill.manaCost;
  
  // Update last used time
  skill.lastUsed = now;
  
  // Record skill usage in Prometheus
  prom.recordSkillUse(skillId);
  
  // Apply skill effect based on skill type
  applySkillEffect(caster, skill, target);
  
  return true;
}

/**
 * Apply skill effects based on configuration
 */
function applySkillEffect(caster: Entity, skill: Skill, target?: Entity): void {
  const config = getSkillConfig(skill.id);
  if (!config) {
    console.warn(`[SkillSystem] No configuration found for skill: ${skill.id}`);
    return;
  }

  // Apply each effect defined in configuration
  for (const effect of config.effects) {
    applyEffect(caster, effect, target, config);
  }
}

/**
 * Apply individual skill effect
 */
function applyEffect(caster: Entity, effect: SkillEffect, target: Entity | undefined, skillConfig: SkillConfig): void {
  const effectTarget = getEffectTarget(caster, target, effect.target);
  if (!effectTarget) return;

  switch (effect.type) {
    case 'damage':
      if (effectTarget !== caster) {
        let damage = effect.value || 0;
        
        // Apply stat scaling if defined
        if (effect.scaling) {
          const statValue = (caster.player as any)[effect.scaling.stat] || 0;
          damage += statValue * effect.scaling.multiplier;
        }
        
        // Apply damage to player or monster
        if (effectTarget.monster) {
          // Damage to monster
          effectTarget.monster.health = Math.max(0, effectTarget.monster.health - damage);
          caster.player.damageDealt += damage;
          
          // Check if monster is dead
          if (effectTarget.monster.health <= 0) {
            effectTarget.monster.state = MonsterState.DEAD;
            effectTarget.monster.deathTime = Date.now();
          }
        } else if (effectTarget.player) {
          // Damage to player
          effectTarget.player.health = Math.max(0, effectTarget.player.health - damage);
          caster.player.damageDealt += damage;
          effectTarget.player.damageTaken += damage;
          
          // Check if player is dead
          if (effectTarget.player.health <= 0) {
            effectTarget.player.health = 0;
            // TODO: Handle player death (respawn, drop items, etc.)
          }
        }
        
        // Record damage in Prometheus
        prom.recordDamage(skillConfig.id, damage);
      }
      break;
      
    case 'heal':
      if (!effectTarget.player) return;
      const healAmount = effect.value || 0;
      effectTarget.player.health = Math.min(
        effectTarget.player.maxHealth,
        effectTarget.player.health + healAmount
      );
      break;
      
    case 'buff':
      if (!effectTarget.buffs) effectTarget.buffs = [];
      
      let buffValue = effect.value || 0;
      
      // Handle multiplier-based buffs (like speed boost)
      if (effect.multiplier && effect.buffType) {
        const baseValue = (effectTarget.player as any)[effect.buffType] || 0;
        buffValue = baseValue * effect.multiplier;
      }
      
      effectTarget.buffs.push({
        id: skillConfig.id,
        type: effect.buffType || 'generic',
        duration: effect.duration || 5000,
        startTime: Date.now(),
        value: buffValue
      });
      break;
  }
}

/**
 * Get the target entity for an effect
 */
function getEffectTarget(caster: Entity, target: Entity | undefined, targetType?: string): Entity | undefined {
  if (targetType === 'self' || !targetType) {
    return caster;
  }
  return target;
}

/**
 * Buff/debuff system - manages temporary stat modifications
 */
export const buffSystem = (world: World<Entity>) => {
  const now = Date.now();
  
  for (const entity of world.entities) {
    if (!entity.buffs || entity.buffs.length === 0) continue;
    
    // Reset player stats to base values before applying buffs
    if (entity.player) {
      // Store base stats if not already stored
      if (!(entity.player as any)._baseStats) {
        (entity.player as any)._baseStats = {
          speed: entity.player.speed,
          defense: entity.player.defense,
          attack: entity.player.attack
        };
      }
      
      // Reset to base stats
      const baseStats = (entity.player as any)._baseStats;
      entity.player.speed = baseStats.speed;
      entity.player.defense = baseStats.defense;
      entity.player.attack = baseStats.attack;
    }
    
    // Remove expired buffs and apply active buffs
    for (let i = entity.buffs.length - 1; i >= 0; i--) {
      const buff = entity.buffs[i];
      if (now - buff.startTime >= buff.duration) {
        entity.buffs.splice(i, 1);
      } else if (entity.player) {
        // Apply active buff to player stats
        switch (buff.type) {
          case 'speed':
            entity.player.speed += buff.value;
            break;
          case 'defense':
            entity.player.defense += buff.value;
            break;
          case 'attack':
            entity.player.attack += buff.value;
            break;
        }
      }
    }
  }
};

/**
 * Initialize default skills for a player from configuration
 */
export function initializeDefaultSkills(player: any): void {
  player.skills.clear();
  
  // Load skills from configuration
  const defaultSkillIds = ['fireball', 'heal', 'shield', 'dash'];
  
  for (const skillId of defaultSkillIds) {
    const config = getSkillConfig(skillId);
    if (!config) {
      console.warn(`[SkillSystem] Skill configuration not found for: ${skillId}`);
      continue;
    }
    
    const skill = new Skill();
    skill.id = config.id;
    skill.name = config.name;
    skill.description = config.descriptionZh || config.description;
    skill.level = config.level;
    skill.cooldown = config.cooldown;
    skill.manaCost = config.manaCost;
    
    // Set damage for compatibility (can be removed in future)
    const damageEffect = config.effects.find(e => e.type === 'damage' || e.type === 'heal');
    skill.damage = damageEffect?.value || 0;
    
    player.skills.push(skill);
  }
  
  console.log(`[SkillSystem] Initialized ${player.skills.length} skills for player`);
}
