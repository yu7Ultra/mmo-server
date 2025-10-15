import { Client, Room } from '@colyseus/core';
import { World } from 'miniplex';
import { AttackCommand, ChatCommand, Command, Entity, QuestCommand } from '../entities';
import { recordMessage, recordPatch, recordSlowTick, recordTick, registerRoom, unregisterRoom, updateAutoProfile, updateClients } from '../instrumentation/metrics';
import { ENV } from '../config/env';
import { MyRoomState, Player } from '../schemas/MyRoomState';
import { achievementSystem, initializeAchievements } from '../systems/achievementSystem';
import { ChatManager } from '../systems/chatSystem';
import { combatSystem, regenerationSystem } from '../systems/combatSystem';
import { inputSystem } from '../systems/inputSystem';
import { LeaderboardManager } from '../systems/leaderboardSystem';
import { movementSystem } from '../systems/movementSystem';
import { abandonQuest, grantQuest, initializeStarterQuests, questSystem, updateQuestProgress } from '../systems/questSystem';
import { buffSystem, initializeDefaultSkills, skillSystem, useSkill } from '../systems/skillSystem';
import { syncSystem } from '../systems/syncSystem';
import { RateLimiter, InputValidator } from '../utils/security';


export class MyRoom extends Room<MyRoomState> {

  private world = new World<Entity>();

  private entityByClient = new Map<string, Entity>();

  private entityCommandMap: Map<string, Command> = new Map();
  
  // New systems
  private leaderboardManager = new LeaderboardManager();
  private chatManager = new ChatManager();
  private actionRateLimiter = new RateLimiter(20, 5); // 20 actions, 5 per second
  private chatRateLimiter = new RateLimiter(10, 1); // 10 messages, 1 per second


  onCreate(options: any) {
    this.state = new MyRoomState();
    registerRoom(this.roomId);
    let lastTickTime = Date.now();
    // Wrap broadcastPatch to record patch metrics
    const originalBroadcastPatch = (this as any).broadcastPatch;
    (this as any).broadcastPatch = (...args: any[]) => {
      try {
        const before = Date.now();
        const result = originalBroadcastPatch.apply(this, args);
        const after = Date.now();
        // We don't have direct patch bytes, approximate with duration * clients
        recordPatch(this.roomId, (after - before) * this.clients.length);
        return result;
      } catch (err) {
        return originalBroadcastPatch.apply(this, args);
      }
    };
  const slowThreshold = ENV.PERF_SLOW_TICK_MS; // ms
  const autoProfileCooldownMs = ENV.PERF_AUTO_PROFILE_COOLDOWN_MS; // ms
    let lastAutoProfileAt = 0;
    let tickCount = 0;
    
    this.setSimulationInterval(() => {
      const start = Date.now();
      const deltaTime = start - lastTickTime;

      // Core systems
      inputSystem(this.world, this.entityCommandMap, this.entityByClient);
      movementSystem(this.world);
      
      // Combat and skills
      combatSystem(this.world, deltaTime);
      regenerationSystem(this.world, deltaTime);
      skillSystem(this.world);
      buffSystem(this.world);
      
      // Quest and achievement systems
      questSystem(this.world);
      achievementSystem(this.world);
      
      // Update leaderboard periodically
      this.leaderboardManager.update(this.world, this.state.leaderboard);
      
      // Update server time
      this.state.serverTime = Date.now();
      
      // Sync to schema
      syncSystem(this.world);
      
      const end = Date.now();
      const duration = end - start;
      recordTick(this.roomId, duration);
      if (duration > slowThreshold) {
        recordSlowTick(this.roomId, duration, slowThreshold);
        const now = Date.now();
        if (now - lastAutoProfileAt > autoProfileCooldownMs) {
          // Fire and forget 1s CPU profile
          if (ENV.ENABLE_AUTO_PROFILE) {
            import('../instrumentation/profiler').then(mod => {
              mod.captureCPUProfile(ENV.AUTO_PROFILE_DURATION_MS).then(file => {
              updateAutoProfile(this.roomId, file);
              console.warn(`[perf] auto CPU profile captured for room ${this.roomId}: ${file}`);
              }).catch(err => console.error('[perf] auto profile error', err));
            }).catch(err => console.error('[perf] profiler import error', err));
          }
          lastAutoProfileAt = now;
        }
      }
      updateClients(this.roomId, this.clients.length);
      lastTickTime = end;
      tickCount++;
      
      // Periodic cleanup (every 100 ticks ~10 seconds at 10 TPS)
      if (tickCount % 100 === 0) {
        this.actionRateLimiter.cleanup();
        this.chatRateLimiter.cleanup();
        this.chatManager.cleanupRateLimits();
      }
    }, 1000 / 10); // 10 TPS

    // Message handlers
    this.setupMessageHandlers();
  }

  
  /**
   * Setup message handlers for client commands
   */
  private setupMessageHandlers() {
    // Movement
    this.onMessage("move", (client, message: { x: number; y: number }) => {
      if (!this.actionRateLimiter.checkLimit(client.sessionId)) return;
      
      recordMessage(this.roomId, 'move');
      
      // Validate input
      if (!InputValidator.validateNumber(message.x, -10, 10) ||
          !InputValidator.validateNumber(message.y, -10, 10)) {
        return;
      }
      
      this.entityCommandMap.set(client.sessionId, { 
        sessionId: client.sessionId, 
        x: message.x, 
        y: message.y 
      });
      
      // Update quest progress for movement
      const entity = this.entityByClient.get(client.sessionId);
      if (entity) {
        updateQuestProgress(entity, 'explore', 1);
      }
    });
    
    // Attack
    this.onMessage("attack", (client, message: { targetId: string; skillId?: string }) => {
      if (!this.actionRateLimiter.checkLimit(client.sessionId, 2)) return;
      
      recordMessage(this.roomId, 'attack');
      
      const attacker = this.entityByClient.get(client.sessionId);
      const target = this.entityByClient.get(message.targetId);
      
      if (!attacker || !target) return;
      
      // Set combat target
      attacker.combatTarget = target;
      attacker.player.inCombat = true;
      attacker.player.targetId = message.targetId;
      
      // Use skill if specified
      if (message.skillId) {
        useSkill(attacker, message.skillId, target);
      }
    });
    
    // Chat
    this.onMessage("chat", (client, message: { message: string; channel?: string }) => {
      if (!this.chatRateLimiter.checkLimit(client.sessionId)) return;
      
      recordMessage(this.roomId, 'chat');
      
      const entity = this.entityByClient.get(client.sessionId);
      if (!entity) return;
      
      this.chatManager.addMessage(
        this.state.chatMessages,
        client.sessionId,
        entity.player.name,
        message.message,
        message.channel || 'global'
      );
    });
    
    // Quest management
    this.onMessage("quest", (client, message: { questId: string; action: string }) => {
      if (!this.actionRateLimiter.checkLimit(client.sessionId)) return;
      
      recordMessage(this.roomId, 'quest');
      
      const entity = this.entityByClient.get(client.sessionId);
      if (!entity) return;
      
      if (message.action === 'abandon') {
        abandonQuest(entity.player, message.questId);
      }
    });
    
    // Friend management
    this.onMessage("friend", (client, message: { targetId: string; action: string }) => {
      if (!this.actionRateLimiter.checkLimit(client.sessionId)) return;
      
      recordMessage(this.roomId, 'friend');
      
      const entity = this.entityByClient.get(client.sessionId);
      if (!entity) return;
      
      if (message.action === 'add') {
        // Check if already friends
        if (!entity.player.friends.includes(message.targetId)) {
          entity.player.friends.push(message.targetId);
        }
      } else if (message.action === 'remove') {
        const index = entity.player.friends.indexOf(message.targetId);
        if (index !== -1) {
          entity.player.friends.splice(index, 1);
        }
      }
    });
  }

  onJoin(client: Client, options: any) {
    console.log(client.sessionId, 'joined!');

    const player = new Player();
    
    // Set player name from options if provided
    if (options.name && InputValidator.validatePlayerName(options.name)) {
      player.name = options.name;
    } else {
      player.name = `Player_${client.sessionId.substring(0, 6)}`;
    }
    
    // Initialize player systems
    initializeDefaultSkills(player);
    initializeStarterQuests(player);
    initializeAchievements(player);
    
    this.state.players.set(client.sessionId, player);

    let entity = this.world.add({
      sessionId: client.sessionId,
      player: player,
      position: { x: player.x, y: player.y },
      velocity: { x: 0, y: 0 },
    });

    this.entityByClient.set(client.sessionId, entity);
  }

  onLeave(client: Client, consented: boolean) {
    console.log(client.sessionId, 'left!');

    this.state.players.delete(client.sessionId);

    const entity = this.world.where((e) => e.sessionId === client.sessionId).first;
    if (entity) {
      this.world.remove(entity);
      console.log('Removed entity for', client.sessionId);
    }
    this.entityByClient.delete(client.sessionId);
  }

  onDispose() {
    console.log('room', this.roomId, 'disposing...');
    unregisterRoom(this.roomId);
  }
}
