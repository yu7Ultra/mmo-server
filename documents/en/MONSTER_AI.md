# Monster AI System

## Overview

The Monster AI system provides a configurable state machine-based AI for NPCs and monsters in the MMO server.

## Features

- **Configurable Monsters**: All monster types defined in `config/monsters.json`
- **State Machine**: Idle → Patrol → Chase → Attack → Flee → Return → Dead
- **Patrol Modes**: Random wander, waypoint-based, circular
- **Aggression Types**: Passive, aggressive, neutral
- **Respawn System**: Automatic respawn after death
- **Loot Tables**: Configurable drop rates and rewards

## Monster Configuration

### Example Monster

```json
{
  "goblin": {
    "id": "goblin",
    "name": "Goblin",
    "type": "aggressive",
    "level": 5,
    "stats": {
      "health": 100,
      "attack": 15,
      "defense": 5,
      "speed": 80,
      "attackRange": 50,
      "detectionRange": 200,
      "chaseRange": 300
    },
    "ai": {
      "behavior": "aggressive",
      "idleTime": 3000,
      "patrolSpeed": 0.5,
      "chaseSpeed": 1.2,
      "attackCooldown": 1500,
      "fleeHealthPercent": 0.2
    },
    "patrol": {
      "enabled": true,
      "type": "random",
      "radius": 100
    },
    "loot": {
      "experience": 50,
      "dropTable": [...]
    }
  }
}
```

## AI States

### 1. IDLE
- Monster waits at spawn point
- Detects nearby players
- Transitions to CHASE if aggressive and player in range
- Transitions to PATROL after idle timeout

### 2. PATROL
- Random wander within radius OR follow waypoints
- Continues detecting players
- Transitions to CHASE if player detected

### 3. CHASE
- Pursues target player
- Moves at chase speed
- Transitions to ATTACK when in attack range
- Transitions to RETURN if target out of range

### 4. ATTACK
- Attacks target at interval
- Checks flee condition (low health)
- Transitions to FLEE if health too low
- Transitions to RETURN if target dead/invalid

### 5. FLEE
- Runs away from danger at high speed
- Returns to spawn point
- Transitions to IDLE when safe

### 6. RETURN
- Returns to spawn point
- Transitions to IDLE when reached

### 7. DEAD
- Waits for respawn timer
- Respawns with full health at spawn point

## Usage

### Initialize System

```typescript
import { initializeMonsterSystem } from './systems/monsterAI';

// In room onCreate
initializeMonsterSystem();
```

### Spawn Monster

```typescript
import { spawnMonster } from './systems/monsterAI';

// Spawn a goblin at position (100, 200)
const monster = spawnMonster(world, 'goblin', { x: 100, y: 200 });
```

### Run AI System

```typescript
import { monsterAISystem } from './systems/monsterAI';

// In game loop (setInterval)
monsterAISystem(world, deltaTime);
```

## Monster Types

### Included Monsters

1. **Goblin** (Level 5)
   - Aggressive melee fighter
   - Random patrol
   - Flees at 20% health

2. **Wolf** (Level 8)
   - Fast aggressive predator
   - Waypoint patrol
   - Pack hunter behavior

3. **Skeleton** (Level 10)
   - Undead warrior
   - Never flees
   - Guard behavior

4. **Slime** (Level 3)
   - Passive creature
   - Slow movement
   - Flees at 30% health

## Integration

### Entity Structure

Monsters use the `monster` component in entities:

```typescript
entity.monster = {
  type: 'goblin',
  level: 5,
  health: 100,
  maxHealth: 100,
  state: MonsterState.IDLE,
  spawnPoint: { x: 100, y: 200 },
  // ... more fields
};
```

### Metrics

Monster actions are recorded in Prometheus:
- `game_combat_total{combatType="pve"}` - PvE combat encounters
- `game_damage_dealt_total{skillId="monster_*"}` - Monster damage

## Patrol Types

### Random Patrol

```json
{
  "patrol": {
    "enabled": true,
    "type": "random",
    "radius": 100,
    "waypoints": []
  }
}
```

Monster wanders randomly within radius of spawn point.

### Waypoint Patrol

```json
{
  "patrol": {
    "enabled": true,
    "type": "waypoint",
    "waypoints": [
      { "x": 0, "y": 0 },
      { "x": 100, "y": 0 },
      { "x": 100, "y": 100 }
    ]
  }
}
```

Monster follows waypoints in order (relative to spawn point).

## Loot System

### Drop Tables

```json
{
  "loot": {
    "experience": 50,
    "dropTable": [
      {
        "itemId": "coin",
        "chance": 0.8,
        "minAmount": 1,
        "maxAmount": 5
      }
    ]
  }
}
```

- `chance`: 0.0-1.0 probability of drop
- `minAmount`/`maxAmount`: Quantity range

## Respawn System

```json
{
  "respawn": {
    "enabled": true,
    "time": 30000
  }
}
```

- `enabled`: Whether monster respawns
- `time`: Milliseconds before respawn

## Future Enhancements

1. **Spawn Points**: Map-based spawn configuration
2. **Boss AI**: Special states for boss encounters
3. **Group Behavior**: Pack tactics and formations
4. **Skills**: Monster skill usage
5. **Targeting**: Smart target selection
6. **Leashing**: Return when pulled too far
7. **Cooldown Skills**: Ability rotation system

## Configuration Hot-Reload

Monster configurations support hot-reload via ConfigManager:

```bash
# Edit config/monsters.json
# System automatically reloads
```

Changes apply to new monster spawns immediately.

## Performance

- **ECS-based**: Efficient entity queries
- **Minimal Allocations**: Reuses entity components
- **State Machine**: O(1) state transitions
- **Spatial Queries**: Distance calculations optimized

## Debugging

Enable debug logging:

```typescript
// Spawns log to console
// State changes log in verbose mode
console.log(`[MonsterAI] Goblin transitioned to CHASE`);
```

## Testing

```typescript
// Test monster spawn
const monster = spawnMonster(world, 'slime', { x: 0, y: 0 });
expect(monster.monster?.type).toBe('slime');

// Test state machine
monsterAISystem(world, 16.67);
expect(monster.monster?.state).toBe(MonsterState.IDLE);
```
