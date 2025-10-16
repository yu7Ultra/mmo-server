import { World } from 'miniplex';
import { Entity } from '../entities';
import { Player, Skill } from '../schemas/MyRoomState';
import { buffSystem, initializeDefaultSkills, initializeSkillSystem, skillSystem, useSkill } from '../systems/skillSystem';

describe('Skill System', () => {
  let world: World<Entity>;
  let player: Player;
  let entity: Entity;

  beforeAll(() => {
    // Initialize skill system with configuration
    initializeSkillSystem();
  });

  beforeEach(() => {
    world = new World<Entity>();
    
    player = new Player();
    player.mana = 100;
    player.maxMana = 100;
    player.health = 80;
    player.maxHealth = 100;
    player.attack = 10;
    
    entity = world.add({
      sessionId: 'player1',
      player: player,
      position: { x: 0, y: 0 },
      velocity: { x: 0, y: 0 }
    });
    
    initializeDefaultSkills(player);
  });

  test('should initialize default skills', () => {
    expect(player.skills.length).toBe(4);
    expect(player.skills[0].id).toBe('fireball');
    expect(player.skills[1].id).toBe('heal');
    expect(player.skills[2].id).toBe('shield');
    expect(player.skills[3].id).toBe('dash');
  });

  test('should initialize skills with descriptions', () => {
    expect(player.skills[0].description).toBe('发射火球攻击敌人');
    expect(player.skills[1].description).toBe('恢复生命值');
    expect(player.skills[2].description).toBe('获得护盾防御加成');
    expect(player.skills[3].description).toBe('短暂提升移动速度');
  });

  test('should use skill when mana available and no cooldown', () => {
    const target = world.add({
      sessionId: 'target',
      player: new Player(),
      position: { x: 10, y: 10 },
      velocity: { x: 0, y: 0 }
    });
    
    const result = useSkill(entity, 'fireball', target);
    
    expect(result).toBe(true);
    expect(player.mana).toBeLessThan(100);
    expect(target.player.health).toBeLessThan(100);
  });

  test('should not use skill when on cooldown', () => {
    const initialMana = player.mana;
    const skill = player.skills.find(s => s.id === 'heal');
    
    if (skill) {
      skill.lastUsed = Date.now();
      const result = useSkill(entity, 'heal');
      
      expect(result).toBe(false);
      expect(player.mana).toBe(initialMana);
    }
  });

  test('should not use skill when insufficient mana', () => {
    player.mana = 5;
    
    const result = useSkill(entity, 'fireball');
    
    expect(result).toBe(false);
  });

  test('heal skill should restore health', () => {
    player.health = 50;
    
    const result = useSkill(entity, 'heal');
    
    expect(result).toBe(true);
    expect(player.health).toBeGreaterThan(50);
  });

  test('shield skill should add defensive buff', () => {
    useSkill(entity, 'shield');
    
    expect(entity.buffs).toBeDefined();
    expect(entity.buffs!.length).toBeGreaterThan(0);
    expect(entity.buffs![0].type).toBe('defense');
  });

  test('buff system should remove expired buffs', () => {
    entity.buffs = [{
      id: 'test',
      type: 'test',
      duration: 100,
      startTime: Date.now() - 200, // Expired
      value: 10
    }];
    
    buffSystem(world);
    
    expect(entity.buffs.length).toBe(0);
  });

  test('buff system should keep active buffs', () => {
    entity.buffs = [{
      id: 'test',
      type: 'test',
      duration: 5000,
      startTime: Date.now(),
      value: 10
    }];
    
    buffSystem(world);
    
    expect(entity.buffs.length).toBe(1);
  });

  afterAll(() => {
    // Clean up config manager
    const { configManager } = require('../config/configManager');
    configManager.dispose();
  });
});
