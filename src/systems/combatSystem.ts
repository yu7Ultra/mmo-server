import { World } from 'miniplex';
import { Entity } from '../entities';

/**
 * Combat system - handles PvE and PvP combat
 * High-performance: uses pre-filtered queries and minimizes state updates
 */
export const combatSystem = (world: World<Entity>, deltaTime: number = 16.67) => {
  const combatEntities = world.where(e => e.combatTarget !== undefined);
  
  for (const entity of combatEntities) {
    const { combatTarget, lastAttackTime = 0, player, position } = entity;
    
    if (!combatTarget || !combatTarget.player) {
      // Target no longer valid
      entity.combatTarget = undefined;
      entity.player.inCombat = false;
      entity.player.targetId = '';
      continue;
    }
    
    // Check if target is in range (simplified distance check)
    const dx = position.x - combatTarget.position.x;
    const dy = position.y - combatTarget.position.y;
    const distanceSquared = dx * dx + dy * dy;
    const attackRangeSquared = 50 * 50; // 50 pixel attack range
    
    if (distanceSquared > attackRangeSquared) {
      // Target out of range, move closer
      continue;
    }
    
    // Check attack cooldown (attack speed based system)
    const attackCooldown = 1000 / (player.speed / 10); // attacks per second
    const now = Date.now();
    
    if (now - lastAttackTime < attackCooldown) {
      continue;
    }
    
    // Perform attack
    const damage = calculateDamage(player.attack, combatTarget.player.defense);
    
    // Apply damage
    combatTarget.player.health = Math.max(0, combatTarget.player.health - damage);
    
    // Track stats
    player.damageDealt += damage;
    combatTarget.player.damageTaken += damage;
    
    // Update attack time
    entity.lastAttackTime = now;
    
    // Check if target is dead
    if (combatTarget.player.health <= 0) {
      handleKill(entity, combatTarget);
    }
  }
};

/**
 * Calculate damage with defense mitigation
 * Formula: damage = attack * (100 / (100 + defense))
 */
function calculateDamage(attack: number, defense: number): number {
  const baseDamage = attack * (100 / (100 + defense));
  // Add variance ±10%
  const variance = 0.9 + Math.random() * 0.2;
  return Math.floor(baseDamage * variance);
}

/**
 * Handle kill event - award experience and update stats
 */
function handleKill(attacker: Entity, victim: Entity): void {
  // Clear combat state
  attacker.combatTarget = undefined;
  attacker.player.inCombat = false;
  attacker.player.targetId = '';
  
  // Update kill stats
  attacker.player.kills++;
  victim.player.deaths++;
  
  // Award experience (level-based)
  const expGain = Math.floor(victim.player.level * 50 * (1 + Math.random() * 0.2));
  grantExperience(attacker.player, expGain);
  
  // Respawn victim
  victim.player.health = victim.player.maxHealth;
  victim.player.mana = victim.player.maxMana;
  victim.player.inCombat = false;
  victim.player.targetId = '';
  victim.combatTarget = undefined;
  
  // Random respawn position
  victim.position.x = Math.random() * 800;
  victim.position.y = Math.random() * 600;
}

/**
 * Grant experience and handle leveling
 */
function grantExperience(player: any, exp: number): void {
  player.experience += exp;
  
  // Check for level up
  while (player.experience >= player.experienceToNext) {
    player.experience -= player.experienceToNext;
    player.level++;
    
    // Increase stats on level up
    player.maxHealth += 10;
    player.health = player.maxHealth;
    player.maxMana += 5;
    player.mana = player.maxMana;
    player.attack += 2;
    player.defense += 1;
    player.speed += 0.5;
    
    // Calculate next level exp requirement
    player.experienceToNext = Math.floor(100 * Math.pow(1.5, player.level - 1));
  }
}

/**
 * Regeneration system - regenerate health and mana over time
 */
export const regenerationSystem = (world: World<Entity>, deltaTime: number = 16.67) => {
  const entities = world.with('player');
  const regenRate = 0.5; // points per second
  const regenAmount = (regenRate * deltaTime) / 1000;
  
  for (const entity of entities) {
    const { player } = entity;
    
    // Regenerate health when not in combat
    if (!player.inCombat && player.health < player.maxHealth) {
      player.health = Math.min(player.maxHealth, player.health + regenAmount);
    }
    
    // Always regenerate mana
    if (player.mana < player.maxMana) {
      player.mana = Math.min(player.maxMana, player.mana + regenAmount * 2);
    }
  }
};
