import { World } from 'miniplex';
import { Entity } from '../entities';
import { Player } from '../schemas/MyRoomState';
import { combatSystem, regenerationSystem } from '../systems/combatSystem';

describe('Combat System', () => {
  let world: World<Entity>;
  let player1: Player;
  let player2: Player;
  let entity1: Entity;
  let entity2: Entity;

  beforeEach(() => {
    world = new World<Entity>();
    
    // Create player 1
    player1 = new Player();
    player1.health = 100;
    player1.maxHealth = 100;
    player1.attack = 10;
    player1.defense = 5;
    player1.speed = 5;
    
    entity1 = world.add({
      sessionId: 'player1',
      player: player1,
      position: { x: 0, y: 0 },
      velocity: { x: 0, y: 0 }
    });
    
    // Create player 2
    player2 = new Player();
    player2.health = 100;
    player2.maxHealth = 100;
    player2.attack = 10;
    player2.defense = 5;
    player2.speed = 5;
    
    entity2 = world.add({
      sessionId: 'player2',
      player: player2,
      position: { x: 10, y: 10 }, // In range
      velocity: { x: 0, y: 0 }
    });
  });

  test('should set combat target', () => {
    entity1.combatTarget = entity2;
    entity1.player.inCombat = true;
    
    expect(entity1.combatTarget).toBe(entity2);
    expect(entity1.player.inCombat).toBe(true);
  });

  test('should deal damage when in range and cooldown passed', () => {
    entity1.combatTarget = entity2;
    entity1.lastAttackTime = 0;
    
    const initialHealth = entity2.player.health;
    
    combatSystem(world, 1000); // Run combat system
    
    expect(entity2.player.health).toBeLessThan(initialHealth);
  });

  test('should not attack if out of range', () => {
    entity1.combatTarget = entity2;
    entity1.lastAttackTime = 0;
    entity2.position.x = 1000; // Move out of range
    entity2.position.y = 1000;
    
    const initialHealth = entity2.player.health;
    
    combatSystem(world, 1000);
    
    expect(entity2.player.health).toBe(initialHealth);
  });

  test('regeneration should restore health when not in combat', () => {
    player1.health = 50;
    player1.inCombat = false;
    
    regenerationSystem(world, 1000);
    
    expect(player1.health).toBeGreaterThan(50);
  });

  test('regeneration should not restore health when in combat', () => {
    player1.health = 50;
    player1.inCombat = true;
    
    regenerationSystem(world, 1000);
    
    expect(player1.health).toBe(50);
  });

  test('should regenerate mana always', () => {
    player1.mana = 50;
    
    regenerationSystem(world, 1000);
    
    expect(player1.mana).toBeGreaterThan(50);
  });

  test('should track damage stats', () => {
    entity1.combatTarget = entity2;
    entity1.lastAttackTime = 0;
    
    combatSystem(world, 1000);
    
    expect(player1.damageDealt).toBeGreaterThan(0);
    expect(player2.damageTaken).toBeGreaterThan(0);
  });
});
