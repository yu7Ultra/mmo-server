import { World } from 'miniplex';
import { Entity } from '../entities';
import { Skill } from '../schemas/MyRoomState';

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
  
  // Apply skill effect based on skill type
  applySkillEffect(caster, skill, target);
  
  return true;
}

/**
 * Apply skill effects
 */
function applySkillEffect(caster: Entity, skill: Skill, target?: Entity): void {
  switch (skill.id) {
    case 'fireball':
      if (target && target.player) {
        const damage = skill.damage + caster.player.attack * 0.5;
        target.player.health = Math.max(0, target.player.health - damage);
        caster.player.damageDealt += damage;
        target.player.damageTaken += damage;
      }
      break;
      
    case 'heal':
      const healAmount = skill.damage; // reuse damage field for heal amount
      caster.player.health = Math.min(
        caster.player.maxHealth,
        caster.player.health + healAmount
      );
      break;
      
    case 'shield':
      // Add defensive buff
      if (!caster.buffs) caster.buffs = [];
      caster.buffs.push({
        id: 'shield',
        type: 'defense',
        duration: 5000,
        startTime: Date.now(),
        value: 10
      });
      break;
      
    case 'dash':
      // Increase speed temporarily
      if (!caster.buffs) caster.buffs = [];
      caster.buffs.push({
        id: 'dash',
        type: 'speed',
        duration: 2000,
        startTime: Date.now(),
        value: caster.player.speed * 2
      });
      break;
  }
}

/**
 * Buff/debuff system - manages temporary stat modifications
 */
export const buffSystem = (world: World<Entity>) => {
  const now = Date.now();
  
  for (const entity of world.entities) {
    if (!entity.buffs || entity.buffs.length === 0) continue;
    
    // Remove expired buffs (iterate backwards for safe removal)
    for (let i = entity.buffs.length - 1; i >= 0; i--) {
      const buff = entity.buffs[i];
      if (now - buff.startTime >= buff.duration) {
        entity.buffs.splice(i, 1);
      }
    }
  }
};

/**
 * Initialize default skills for a player
 */
export function initializeDefaultSkills(player: any): void {
  player.skills.clear();
  
  // Add basic attack skills
  const fireball = new Skill();
  fireball.id = 'fireball';
  fireball.name = 'Fireball';
  fireball.level = 1;
  fireball.cooldown = 3000; // 3 seconds
  fireball.manaCost = 20;
  fireball.damage = 30;
  player.skills.push(fireball);
  
  const heal = new Skill();
  heal.id = 'heal';
  heal.name = 'Heal';
  heal.level = 1;
  heal.cooldown = 5000; // 5 seconds
  heal.manaCost = 30;
  heal.damage = 40; // heal amount
  player.skills.push(heal);
  
  const shield = new Skill();
  shield.id = 'shield';
  shield.name = 'Shield';
  shield.level = 1;
  shield.cooldown = 10000; // 10 seconds
  shield.manaCost = 25;
  shield.damage = 0;
  player.skills.push(shield);
  
  const dash = new Skill();
  dash.id = 'dash';
  dash.name = 'Dash';
  dash.level = 1;
  dash.cooldown = 4000; // 4 seconds
  dash.manaCost = 15;
  dash.damage = 0;
  player.skills.push(dash);
}
