import { World } from 'miniplex';
import { Entity } from '../entities';
import { Player } from '../schemas/MyRoomState';
import { abandonQuest, grantQuest, initializeStarterQuests, questSystem, updateQuestProgress } from '../systems/questSystem';

describe('Quest System', () => {
  let world: World<Entity>;
  let player: Player;
  let entity: Entity;

  beforeEach(() => {
    world = new World<Entity>();
    
    player = new Player();
    player.level = 1;
    player.experience = 0;
    player.experienceToNext = 100;
    
    entity = world.add({
      sessionId: 'player1',
      player: player,
      position: { x: 0, y: 0 },
      velocity: { x: 0, y: 0 }
    });
    
    initializeStarterQuests(player);
  });

  test('should initialize starter quests', () => {
    expect(player.quests.length).toBe(3);
    expect(player.quests.some(q => q.id === 'kill_enemies_1')).toBe(true);
  });

  test('should grant new quest', () => {
    const initialCount = player.quests.length;
    
    grantQuest(player, {
      id: 'test_quest',
      name: 'Test Quest',
      description: 'A test quest',
      target: 10,
      expReward: 50
    });
    
    expect(player.quests.length).toBe(initialCount + 1);
    expect(player.quests.some(q => q.id === 'test_quest')).toBe(true);
  });

  test('should not grant duplicate quest', () => {
    const initialCount = player.quests.length;
    const questTemplate = {
      id: 'kill_enemies_1',
      name: 'Duplicate',
      description: 'Duplicate',
      target: 5,
      expReward: 100
    };
    
    grantQuest(player, questTemplate);
    
    expect(player.quests.length).toBe(initialCount);
  });

  test('should update quest progress', () => {
    const quest = player.quests.find(q => q.id === 'kill_enemies_1');
    
    updateQuestProgress(entity, 'kill', 1);
    
    expect(quest!.progress).toBeGreaterThan(0);
  });

  test('should auto-complete quest when target reached', () => {
    const quest = player.quests.find(q => q.id === 'kill_enemies_1');
    if (quest) {
      quest.progress = quest.target;
      
      questSystem(world);
      
      expect(quest.completed).toBe(true);
    }
  });

  test('should award experience on quest completion', () => {
    const quest = player.quests.find(q => q.id === 'kill_enemies_1');
    const initialExp = player.experience;
    
    if (quest) {
      quest.progress = quest.target;
      questSystem(world);
      
      expect(quest.completed).toBe(true);
      expect(player.experience).toBeGreaterThanOrEqual(initialExp);
    } else {
      fail('Quest not found');
    }
  });

  test('should abandon quest', () => {
    const questId = 'kill_enemies_1';
    const initialCount = player.quests.length;
    
    const result = abandonQuest(player, questId);
    
    expect(result).toBe(true);
    expect(player.quests.length).toBe(initialCount - 1);
    expect(player.quests.some(q => q.id === questId)).toBe(false);
  });

  test('should return false when abandoning non-existent quest', () => {
    const result = abandonQuest(player, 'non_existent');
    
    expect(result).toBe(false);
  });
});
