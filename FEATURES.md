# MMO Server Features

This document describes the features implemented in the MMO server.

## Core Systems

### 1. Combat System

**Location**: `src/systems/combatSystem.ts`

High-performance PvE and PvP combat system with:
- Damage calculation with defense mitigation
- Attack cooldown based on player speed
- Kill tracking and statistics
- Experience rewards on kills
- Automatic respawning
- Health and mana regeneration

**Usage**:
```typescript
// Set combat target
entity.combatTarget = targetEntity;
entity.player.inCombat = true;

// Combat system runs automatically in game loop
combatSystem(world, deltaTime);
regenerationSystem(world, deltaTime);
```

**Performance Features**:
- Uses ECS queries for efficient entity filtering
- Minimal state updates per tick
- Pre-calculated attack cooldowns

### 2. Skill System

**Location**: `src/systems/skillSystem.ts`

Flexible skill system with cooldown management:
- 4 default skills: Fireball, Heal, Shield, Dash
- Mana cost system
- Cooldown tracking
- Buff/debuff support
- Skill effects (damage, healing, buffs)

**Default Skills**:
- **Fireball**: Ranged damage skill (3s cooldown, 20 mana, 30 damage)
- **Heal**: Self-healing skill (5s cooldown, 30 mana, 40 heal)
- **Shield**: Defensive buff (10s cooldown, 25 mana, +10 defense for 5s)
- **Dash**: Speed boost (4s cooldown, 15 mana, 2x speed for 2s)

**Usage**:
```typescript
// Use a skill
useSkill(casterEntity, 'fireball', targetEntity);

// Systems run in game loop
skillSystem(world);
buffSystem(world);
```

### 3. Quest System

**Location**: `src/systems/questSystem.ts`

Quest tracking and completion:
- Progress tracking
- Auto-completion when target reached
- Experience rewards
- Starter quests for new players
- Quest abandonment

**Starter Quests**:
- Defeat 5 enemies (100 exp)
- Explore the world (50 exp)
- Reach Level 5 (200 exp)

**Usage**:
```typescript
// Grant a quest
grantQuest(player, {
  id: 'my_quest',
  name: 'My Quest',
  description: 'Complete this quest',
  target: 10,
  expReward: 100
});

// Update progress
updateQuestProgress(entity, 'questType', amount);

// System auto-completes quests
questSystem(world);
```

### 4. Achievement System

**Location**: `src/systems/achievementSystem.ts`

Achievement tracking with 9 default achievements:
- First Blood (1 kill)
- Killer (10 kills)
- Survivor (10 K/D ratio)
- Tank (1000 damage taken)
- Damage Dealer (1000 damage dealt)
- Leveling (level 5)
- Warrior (level 10)
- Quest Master (5 quests completed)
- Social Butterfly (5 friends)

**Usage**:
```typescript
// Initialize achievements for new player
initializeAchievements(player);

// System auto-updates and unlocks achievements
achievementSystem(world);
```

### 5. Leaderboard System

**Location**: `src/systems/leaderboardSystem.ts`

Top 10 player ranking by score:
- Score formula: (level × 100) + (kills × 50) - (deaths × 25)
- Updates every 5 seconds (configurable)
- Minimal performance overhead

**Usage**:
```typescript
const leaderboardManager = new LeaderboardManager();

// In game loop
leaderboardManager.update(world, state.leaderboard);
```

### 6. Chat System

**Location**: `src/systems/chatSystem.ts`

Secure chat with rate limiting:
- Message rate limiting (1 message/second)
- Profanity filter
- Message sanitization (XSS protection)
- Length validation (max 200 characters)
- Message history (last 50 messages)

**Usage**:
```typescript
const chatManager = new ChatManager();

chatManager.addMessage(
  chatMessages,
  sessionId,
  playerName,
  message,
  channel // 'global', 'team', 'whisper'
);
```

### 7. Security Utilities

**Location**: `src/utils/security.ts`

#### Rate Limiter
Token bucket algorithm for action throttling:
```typescript
const limiter = new RateLimiter(10, 1); // 10 tokens, 1/sec refill
if (limiter.checkLimit(userId)) {
  // Action allowed
}
```

#### Input Validator
Validates and sanitizes user input:
```typescript
InputValidator.validatePlayerName(name);
InputValidator.validateNumber(value, min, max);
InputValidator.validateStringLength(str, min, max);
InputValidator.sanitizeObject(obj);
```

#### Object Pool
Reduces GC pressure by reusing objects:
```typescript
const pool = new ObjectPool<MyObject>(
  () => new MyObject(),
  (obj) => obj.reset(),
  10 // initial size
);

const obj = pool.acquire();
// Use object
pool.release(obj);
```

## Player Schema

**Location**: `src/schemas/MyRoomState.ts`

Enhanced player properties:
- **Position**: x, y coordinates
- **Character**: name, level, experience
- **Combat Stats**: health, mana, attack, defense, speed
- **Status**: inCombat, targetId
- **Equipment**: Map of equipped items
- **Skills**: Array of available skills
- **Quests**: Array of active/completed quests
- **Achievements**: Array of unlocked achievements
- **Social**: Array of friend IDs
- **Statistics**: kills, deaths, damageDealt, damageTaken

## Message Handlers

The server supports the following client messages:

### move
```typescript
{ x: number, y: number } // Velocity vector
```

### attack
```typescript
{ targetId: string, skillId?: string }
```

### chat
```typescript
{ message: string, channel?: string }
```

### quest
```typescript
{ questId: string, action: 'accept' | 'complete' | 'abandon' }
```

### friend
```typescript
{ targetId: string, action: 'add' | 'remove' }
```

## Performance Optimizations

1. **ECS Architecture**: Using Miniplex for efficient entity querying
2. **Rate Limiting**: Prevents spam and reduces server load
3. **Object Pooling**: Reduces garbage collection overhead
4. **Periodic Updates**: Leaderboard updates only every 5 seconds
5. **Efficient Queries**: Pre-filtered entity sets for each system
6. **Minimal State Updates**: Only update changed properties
7. **Token Bucket**: Efficient rate limiting algorithm
8. **Cleanup Cycles**: Periodic cleanup of old data structures

## Testing

Comprehensive test coverage for all systems:
- Combat system (8 tests)
- Skill system (8 tests)
- Quest system (8 tests)
- Achievement system (7 tests)
- Chat system (8 tests)
- Security utilities (14 tests)

Run tests:
```bash
yarn test
```

## Configuration

Environment variables:
- `PERF_SLOW_TICK_MS`: Slow tick threshold (default: 20ms)
- `PERF_AUTO_PROFILE_COOLDOWN_MS`: Auto-profile cooldown (default: 60000ms)

## Metrics

All systems integrate with the existing metrics system:
- Message counts per type
- Tick performance tracking
- Slow tick detection
- Auto-profiling on performance issues

## Next Steps

Recommended enhancements:
1. Persistent storage (database integration)
2. Guild/clan system
3. Trading/marketplace system
4. Equipment crafting and upgrade
5. NPC/AI enemies
6. Map/zone system
7. PvP arenas and matchmaking
8. Event system
9. Admin commands
10. Anti-cheat measures
