import { Client, Room } from '@colyseus/core';
import { World } from 'miniplex';
import { AttackCommand, ChatCommand, Command, Entity, QuestCommand } from '../entities';
import { recordMessage, recordPatch, recordSlowTick, recordTick, registerRoom, unregisterRoom, updateAutoProfile, updateClients } from '../instrumentation/metrics';
import { recordPlayerJoin, recordPlayerLeave } from '../instrumentation/prometheusMetrics';
import { ENV } from '../config/env';
import { MyRoomState, Player } from '../schemas/MyRoomState';
import { Monster } from '../schemas/Monster';
import { MonsterState } from '../config/monsterConfig';
import { achievementSystem, initializeAchievements } from '../systems/achievementSystem';
import { ChatManager } from '../systems/chatSystem';
import { combatSystem, regenerationSystem } from '../systems/combatSystem';
import { inputSystem } from '../systems/inputSystem';
import { LeaderboardManager } from '../systems/leaderboardSystem';
import { movementSystem, setWorldBounds } from '../systems/movementSystem';
import { abandonQuest, grantQuest, initializeStarterQuests, questSystem, updateQuestProgress } from '../systems/questSystem';
import { buffSystem, initializeDefaultSkills, initializeSkillSystem, skillSystem, useSkill } from '../systems/skillSystem';
import { syncSystem } from '../systems/syncSystem';
import { VoiceChannelManager } from '../systems/voiceChannelSystem';
import { RateLimiter, InputValidator } from '../utils/security';
import { monsterAISystem, initializeMonsterSystem } from '../systems/monsterAI';


export class MyRoom extends Room<MyRoomState> {

  private world = new World<Entity>();

  private entityByClient = new Map<string, Entity>();

  private entityCommandMap: Map<string, Command> = new Map();
  
  // New systems
  private leaderboardManager = new LeaderboardManager();
  private chatManager = new ChatManager();
  private voiceChannelManager = new VoiceChannelManager();
  private actionRateLimiter = new RateLimiter(20, 5); // 20 actions, 5 per second
  private chatRateLimiter = new RateLimiter(10, 1); // 10 messages, 1 per second


  onCreate(options: any) {
    this.state = new MyRoomState();
    
    // Initialize configuration-based systems
    initializeSkillSystem();
    initializeMonsterSystem();
    
  // Configure world bounds (could be env-configurable later)
  setWorldBounds(this.state.worldWidth, this.state.worldHeight);
    
    // 怪物类型池（与manifest注册一致）
    const monsterTypes = ['slime', 'bat', 'ghost', 'snake'];
    const monsterCount = 20;
    for (let i = 0; i < monsterCount; i++) {
      const type = monsterTypes[Math.floor(Math.random() * monsterTypes.length)];
      const x = Math.random() * this.state.worldWidth;
      const y = Math.random() * this.state.worldHeight;
      const level = 1 + Math.floor(Math.random() * 3);
      this.world.add({
        position: { x, y },
        velocity: { x: 0, y: 0 },
  player: new Player(),
        sessionId: `monster_${i}`,
        monster: {
          type,
          level,
          health: 100,
          maxHealth: 100,
          mana: 0,
          maxMana: 0,
          state: MonsterState.IDLE,
          stateStartTime: Date.now(),
          spawnPoint: { x, y },
          lastAttackTime: 0,
          deathTime: 0
        }
      });
    }
    
    // Initialize voice channels
    this.voiceChannelManager.initializeDefaultChannels(this.state.voiceChannels);
    
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

    const tickFn = () => {
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

      // Monster AI
      monsterAISystem(this.world, deltaTime);

      // Quest and achievement systems
      questSystem(this.world);
      achievementSystem(this.world);

      // Update leaderboard periodically
      this.leaderboardManager.update(this.world, this.state.leaderboard);

      // Update server time
      this.state.serverTime = Date.now();

        // 怪物同步到 schema
        const monsters = this.world.where(e => e.monster !== undefined);
        const activeIds = new Set<string>();
        for (const entity of monsters) {
          const m = entity.monster;
          if (!m) continue;
          if (m.state === 'dead') continue;

          const id = String(entity.id ?? `${m.type}_${m.spawnPoint.x}_${m.spawnPoint.y}`);
          let monsterSchema = this.state.monsters.get(id);
          if (!monsterSchema) {
            monsterSchema = new Monster();
            monsterSchema.id = id;
            this.state.monsters.set(id, monsterSchema);
          }

          monsterSchema.type = m.type;
          monsterSchema.x = entity.position?.x ?? m.spawnPoint.x;
          monsterSchema.y = entity.position?.y ?? m.spawnPoint.y;
          monsterSchema.health = m.health;
          monsterSchema.maxHealth = m.maxHealth;
          monsterSchema.mana = m.mana;
          monsterSchema.maxMana = m.maxMana;
          monsterSchema.level = m.level;
          monsterSchema.state = m.state;
          monsterSchema.stateStartTime = m.stateStartTime;
          monsterSchema.targetId = m.targetId ?? '';

          activeIds.add(id);
        }

        // 移除客户端不再需要显示的怪物
        const removed: string[] = [];
        this.state.monsters.forEach((_value, key) => {
          if (!activeIds.has(key)) {
            removed.push(key);
          }
        });
        for (const key of removed) {
          this.state.monsters.delete(key);
        }
        // 其他状态同步
        syncSystem(this.world);

      const end = Date.now();
      const duration = end - start;
      recordTick(this.roomId, duration);
      if (duration > slowThreshold) {
        recordSlowTick(this.roomId, duration, slowThreshold);
        const now = Date.now();
        if (now - lastAutoProfileAt > autoProfileCooldownMs) {
          // Fire and forget CPU profile
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

      // Periodic cleanup (every 100 ticks ~10 seconds at ENV.TICK_RATE=10)
      if (tickCount % 100 === 0) {
        this.actionRateLimiter.cleanup();
        this.chatRateLimiter.cleanup();
        this.chatManager.cleanupRateLimits();
        this.voiceChannelManager.cleanup();
      }
    };

    // Use custom unref'ed interval in test environment to avoid Jest open-handle warning
    // Always use Colyseus setSimulationInterval (manages patches correctly).
    // Use unref() on internal timer when under Jest to avoid open handle warnings.
    this.setSimulationInterval(tickFn, 1000 / ENV.TICK_RATE);
    if (process.env.JEST_WORKER_ID) {
      // Colyseus stores the interval handle in this.clock, try to unref if available
      try {
        const anyThis: any = this as any;
        if (anyThis.clock && anyThis.clock._interval) {
          anyThis.clock._interval.unref?.();
        }
      } catch {}
    }

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
        const beforeTargetHealth = target.player.health;
        const beforeCasterHealth = attacker.player.health;
        const success = useSkill(attacker, message.skillId, target);
        if (success) {
          // Broadcast cast event (fire-and-forget visual hint for clients)
            this.broadcast('skill_cast', {
              casterId: client.sessionId,
              skillId: message.skillId,
              targetId: message.targetId,
              from: { x: attacker.player.x, y: attacker.player.y },
              to: { x: target.player.x, y: target.player.y },
              // simple delta hints (optional)
              targetHealthDelta: target.player.health - beforeTargetHealth,
              casterHealthDelta: attacker.player.health - beforeCasterHealth,
              serverTime: Date.now()
            });
        }
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
    
    // Voice channel management
    this.onMessage("voice:join", (client, message: { channelId: string }) => {
      if (!this.actionRateLimiter.checkLimit(client.sessionId, 2)) return;
      
      recordMessage(this.roomId, 'voice:join');
      
      const entity = this.entityByClient.get(client.sessionId);
      if (!entity) return;
      
      this.voiceChannelManager.joinChannel(
        this.state.voiceChannels,
        entity.player,
        client.sessionId,
        message.channelId
      );
    });
    
    this.onMessage("voice:leave", (client) => {
      if (!this.actionRateLimiter.checkLimit(client.sessionId)) return;
      
      recordMessage(this.roomId, 'voice:leave');
      
      const entity = this.entityByClient.get(client.sessionId);
      if (!entity) return;
      
      this.voiceChannelManager.leaveChannel(
        this.state.voiceChannels,
        entity.player,
        client.sessionId
      );
    });
    
    this.onMessage("voice:create", (client, message: { name: string; type: string; maxMembers?: number }) => {
      if (!this.actionRateLimiter.checkLimit(client.sessionId, 3)) return;
      
      recordMessage(this.roomId, 'voice:create');
      
      // Generate channel ID
      const channelId = `channel_${client.sessionId}_${Date.now()}`;
      
      this.voiceChannelManager.createChannel(
        this.state.voiceChannels,
        channelId,
        message.name,
        message.type as any,
        client.sessionId,
        message.maxMembers
      );
    });
    
    this.onMessage("voice:mute", (client, message: { muted: boolean }) => {
      if (!this.actionRateLimiter.checkLimit(client.sessionId)) return;
      
      recordMessage(this.roomId, 'voice:mute');
      
      const entity = this.entityByClient.get(client.sessionId);
      if (!entity) return;
      
      this.voiceChannelManager.toggleMute(
        this.state.voiceChannels,
        entity.player,
        client.sessionId,
        message.muted
      );
    });
    
    this.onMessage("voice:deafen", (client, message: { deafened: boolean }) => {
      if (!this.actionRateLimiter.checkLimit(client.sessionId)) return;
      
      recordMessage(this.roomId, 'voice:deafen');
      
      const entity = this.entityByClient.get(client.sessionId);
      if (!entity) return;
      
      this.voiceChannelManager.toggleDeafen(
        this.state.voiceChannels,
        entity.player,
        client.sessionId,
        message.deafened
      );
    });
    
    // WebRTC signaling
    this.onMessage("voice:signal", (client, message: { to: string; type: string; data: any }) => {
      // Use dedicated signaling rate limiter (more permissive)
      if (!this.voiceChannelManager.canSendSignal(client.sessionId)) return;
      
      recordMessage(this.roomId, 'voice:signal');
      
      const entity = this.entityByClient.get(client.sessionId);
      if (!entity || !entity.player.currentVoiceChannel) return;
      
      // Validate target is in same channel
      const targetEntity = this.entityByClient.get(message.to);
      if (!targetEntity || targetEntity.player.currentVoiceChannel !== entity.player.currentVoiceChannel) {
        return;
      }
      
      // Forward signaling message to target peer
      const targetClient = Array.from(this.clients).find(c => c.sessionId === message.to);
      if (targetClient) {
        targetClient.send('voice:signal', {
          from: client.sessionId,
          type: message.type,
          data: message.data
        });
      }
    });
  }

  onJoin(client: Client, options: any) {
    console.log(client.sessionId, 'joined!');

    const player = new Player();
    // Spawn within world bounds
    player.x = Math.random() * this.state.worldWidth;
    player.y = Math.random() * this.state.worldHeight;
    
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
    
    // Record player join in metrics
    recordPlayerJoin(this.roomId);
  }

  onLeave(client: Client, consented: boolean) {
    console.log(client.sessionId, 'left!');

    const entity = this.entityByClient.get(client.sessionId);
    
    // Clean up voice channel membership
    if (entity && entity.player) {
      this.voiceChannelManager.leaveChannel(
        this.state.voiceChannels,
        entity.player,
        client.sessionId
      );
    }

    this.state.players.delete(client.sessionId);

    if (entity) {
      this.world.remove(entity);
      console.log('Removed entity for', client.sessionId);
    }
    this.entityByClient.delete(client.sessionId);
    
    // Record player leave in metrics
    recordPlayerLeave(this.roomId);
  }

  onDispose() {
    console.log('room', this.roomId, 'disposing...');
    unregisterRoom(this.roomId);
  }
}
