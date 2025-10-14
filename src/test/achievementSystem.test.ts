import { World } from 'miniplex';
import { Entity } from '../entities';
import { Player } from '../schemas/MyRoomState';
import { achievementSystem, initializeAchievements } from '../systems/achievementSystem';

describe('Achievement System', () => {
  let world: World<Entity>;
  let player: Player;
  let entity: Entity;

  beforeEach(() => {
    world = new World<Entity>();
    
    player = new Player();
    player.level = 1;
    player.kills = 0;
    player.deaths = 0;
    player.damageDealt = 0;
    player.damageTaken = 0;
    
    entity = world.add({
      sessionId: 'player1',
      player: player,
      position: { x: 0, y: 0 },
      velocity: { x: 0, y: 0 }
    });
    
    initializeAchievements(player);
  });

  test('should initialize achievements', () => {
    expect(player.achievements.length).toBeGreaterThan(0);
    expect(player.achievements.some(a => a.id === 'first_blood')).toBe(true);
    expect(player.achievements.some(a => a.id === 'killer')).toBe(true);
  });

  test('should update achievement progress based on kills', () => {
    player.kills = 1;
    
    achievementSystem(world);
    
    const achievement = player.achievements.find(a => a.id === 'first_blood');
    expect(achievement!.progress).toBe(1);
  });

  test('should unlock achievement when target reached', () => {
    const achievement = player.achievements.find(a => a.id === 'first_blood');
    player.kills = 1;
    
    achievementSystem(world);
    
    expect(achievement!.unlocked).toBe(true);
    expect(achievement!.unlockedAt).toBeGreaterThan(0);
  });

  test('should track damage dealt achievement', () => {
    player.damageDealt = 500;
    
    achievementSystem(world);
    
    const achievement = player.achievements.find(a => a.id === 'damage_dealer');
    expect(achievement!.progress).toBe(500);
  });

  test('should track level achievement', () => {
    player.level = 5;
    
    achievementSystem(world);
    
    const achievement = player.achievements.find(a => a.id === 'leveling');
    expect(achievement!.progress).toBe(5);
    expect(achievement!.unlocked).toBe(true);
  });

  test('should not unlock achievement before target', () => {
    player.kills = 5;
    
    achievementSystem(world);
    
    const achievement = player.achievements.find(a => a.id === 'killer');
    expect(achievement!.unlocked).toBe(false);
  });

  test('should track friend count achievement', () => {
    player.friends.push('friend1');
    player.friends.push('friend2');
    
    achievementSystem(world);
    
    const achievement = player.achievements.find(a => a.id === 'social');
    expect(achievement!.progress).toBe(2);
  });
});
