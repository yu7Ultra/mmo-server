# Data Analytics Dashboard

Complete guide for the MMO Server Data Analytics Dashboard system.

## Overview

The Analytics Dashboard provides comprehensive insights into player behavior, game economy, and overall server health. It collects real-time metrics and provides historical data aggregation for business intelligence and operational decision-making.

## Features

### 1. User Metrics
- **DAU (Daily Active Users)**: Unique players active in the last 24 hours
- **MAU (Monthly Active Users)**: Unique players active in the last 30 days  
- **CCU (Current Concurrent Users)**: Players currently online
- **Peak CCU**: Maximum concurrent users in the tracking period
- **New Users**: First-time registrations
- **Returning Users**: Players who returned after absence

### 2. Retention Metrics
- **Day 1 Retention**: % of users who return after 1 day
- **Day 7 Retention**: % of users who return after 7 days
- **Day 30 Retention**: % of users who return after 30 days

### 3. Level Distribution
- Number of players at each level
- Helps identify progression bottlenecks
- Used for content difficulty balancing

### 4. Combat Statistics
- Total combat encounters (PvP + PvE)
- PvP vs PvE breakdown
- Total damage dealt
- Kill/death ratios
- Average combat duration
- Skill usage in combat

### 5. Economy Metrics
- Total currency in circulation
- Currency created (faucets)
- Currency destroyed (sinks)
- Average player wealth
- Gini coefficient (wealth inequality measure)

### 6. Quest Analytics
- Total quests started
- Total quests completed
- Completion rate
- Average completion time
- Most popular quests

### 7. Skill Analytics
- Total skill usage
- Most popular skills
- Average skills used per player
- Skill usage by combat type

### 8. Churn Analysis
- Monthly churn rate
- At-risk player count
- Churn reasons breakdown
- Inactive player detection

##API Endpoints

### Get Complete Analytics Dashboard

```http
GET /analytics
```

**Response:**
```json
{
  "userMetrics": {
    "dau": 150,
    "mau": 2500,
    "ccu": 45,
    "peakCCU": 120,
    "newUsers": 20,
    "returningUsers": 130
  },
  "retentionMetrics": {
    "day1": 0.65,
    "day7": 0.35,
    "day30": 0.15
  },
  "levelDistribution": {
    "1": 50,
    "2": 35,
    "3": 25,
    "5": 20,
    "10": 10
  },
  "combatStats": {
    "totalCombatEncounters": 1500,
    "pvpEncounters": 300,
    "pveEncounters": 1200,
    "totalDamageDealt": 250000,
    "totalKills": 450,
    "totalDeaths": 420,
    "averageCombatDuration": 45000
  },
  "economyMetrics": {
    "totalCurrency": 125000,
    "currencyCreated": 180000,
    "currencyDestroyed": 55000,
    "averagePlayerWealth": 833,
    "wealthGiniCoefficient": 0.42
  },
  "questMetrics": {
    "totalQuestsStarted": 850,
    "totalQuestsCompleted": 650,
    "completionRate": 0.76,
    "averageCompletionTime": 300000,
    "popularQuests": [
      { "questId": "defeat_5_enemies", "completions": 120 },
      { "questId": "explore_world", "completions": 95 }
    ]
  },
  "skillMetrics": {
    "totalSkillUsage": 5000,
    "popularSkills": [
      { "skillId": "fireball", "uses": 1500 },
      { "skillId": "heal", "uses": 1200 }
    ],
    "averageSkillsPerPlayer": 33.3
  },
  "churnMetrics": {
    "churnRate": 0.18,
    "atRiskPlayers": 5,
    "churnReasons": {
      "inactivity": 5,
      "other": 0
    }
  },
  "averageSessionDuration": 1800000,
  "timestamp": 1697000000000
}
```

### Get Event Log

```http
GET /analytics/events?limit=100
```

**Query Parameters:**
- `limit` (optional): Number of events to return (default: 100, max: 10000)

**Response:**
```json
{
  "events": [
    {
      "type": "player_join",
      "playerId": "session123",
      "timestamp": 1697000000000,
      "data": { "sessionId": "session123" }
    },
    {
      "type": "level_up",
      "playerId": "player456",
      "timestamp": 1697000010000,
      "data": { "oldLevel": 4, "newLevel": 5 }
    },
    {
      "type": "combat_encounter",
      "playerId": "player789",
      "timestamp": 1697000020000,
      "data": {
        "targetId": "goblin001",
        "isPvP": false,
        "duration": 12000
      }
    }
  ],
  "timestamp": 1697000100000
}
```

## Event Types

The analytics system tracks the following event types:

| Event Type | Description | Data Fields |
|------------|-------------|-------------|
| `player_join` | Player connects to server | `sessionId` |
| `player_leave` | Player disconnects | `sessionId`, `duration` |
| `level_up` | Player gains a level | `oldLevel`, `newLevel` |
| `combat_encounter` | Combat initiated | `targetId`, `isPvP`, `duration` |
| `damage_dealt` | Damage inflicted | `damage`, `skillId` (optional) |
| `kill` | Player/monster killed | `victimId`, `isPvP` |
| `death` | Player died | `killerId` (optional) |
| `skill_use` | Skill activated | `skillId` |
| `quest_start` | Quest accepted | `questId` |
| `quest_complete` | Quest completed | `questId`, `duration` |
| `currency_gain` | Currency earned | `amount`, `source` |
| `currency_spend` | Currency spent | `amount`, `purpose` |
| `item_drop` | Item dropped | `itemId`, `quantity` |
| `item_pickup` | Item picked up | `itemId`, `quantity` |

## Integration with Game Systems

### Tracking Player Sessions

```typescript
import { getAnalyticsCollector } from '../analytics/analyticsCollector';

const analytics = getAnalyticsCollector();

// Track player join
room.onJoin((client) => {
  analytics.trackPlayerJoin(client.sessionId, client.sessionId);
});

// Track player leave
room.onLeave((client) => {
  analytics.trackPlayerLeave(client.sessionId);
});
```

### Tracking Combat

```typescript
// Combat encounter started
analytics.trackCombatEncounter(playerId, targetId, isPvP, duration);

// Damage dealt
analytics.trackDamageDealt(playerId, damage, skillId);

// Kill/death
analytics.trackKill(killerId, victimId, isPvP);
analytics.trackDeath(victimId, killerId);
```

### Tracking Player Progression

```typescript
// Level up
analytics.trackLevelUp(playerId, newLevel, oldLevel);

// Quest events
analytics.trackQuestStart(playerId, questId);
analytics.trackQuestComplete(playerId, questId, duration);

// Skill usage
analytics.trackSkillUse(playerId, skillId);
```

### Tracking Economy

```typescript
// Currency gains
analytics.trackCurrencyGain(playerId, amount, 'quest_reward');
analytics.trackCurrencyGain(playerId, amount, 'monster_drop');

// Currency spending
analytics.trackCurrencySpend(playerId, amount, 'item_purchase');
analytics.trackCurrencySpend(playerId, amount, 'skill_upgrade');

// Item tracking
analytics.trackItemDrop(playerId, itemId, quantity);
analytics.trackItemPickup(playerId, itemId, quantity);
```

## Grafana Integration

The analytics data can be visualized in Grafana dashboards using the `/analytics` endpoint.

### Example Grafana Dashboard Configuration

```json
{
  "dashboard": {
    "title": "MMO Server Analytics",
    "panels": [
      {
        "title": "Daily Active Users",
        "targets": [
          {
            "expr": "mmo_analytics_dau",
            "legendFormat": "DAU"
          }
        ]
      },
      {
        "title": "Combat Statistics",
        "targets": [
          {
            "expr": "rate(game_combat_encounters_total[5m])",
            "legendFormat": "Combat Rate"
          }
        ]
      },
      {
        "title": "Level Distribution",
        "type": "bargauge",
        "targets": [
          {
            "expr": "mmo_player_level_distribution",
            "legendFormat": "Level {{level}}"
          }
        ]
      }
    ]
  }
}
```

### Prometheus Metrics Export

Create additional Prometheus metrics from analytics data:

```typescript
import { Gauge } from 'prom-client';

const dauGauge = new Gauge({
  name: 'mmo_analytics_dau',
  help: 'Daily Active Users',
});

const mauGauge = new Gauge({
  name: 'mmo_analytics_mau',
  help: 'Monthly Active Users',
});

// Update metrics periodically
setInterval(() => {
  const metrics = analytics.getUserMetrics();
  dauGauge.set(metrics.dau);
  mauGauge.set(metrics.mau);
}, 60000); // Every minute
```

## Data Retention

The analytics system maintains the following data retention policies:

- **Active Sessions**: Kept in memory until player disconnect
- **Session History**: Last 30 days
- **Event Log**: Last 10,000 events
- **Daily Active Players**: Reset every 24 hours
- **Monthly Active Players**: Reset every 30 days
- **Metrics Caches**: Continuous accumulation with periodic cleanup

## Performance Considerations

### Memory Usage

- Active sessions: ~200 bytes per session
- Event log: ~500 bytes per event (max 5 MB for 10,000 events)
- Session history: ~300 bytes per session (max ~9 MB for 30,000 sessions)
- Total estimated memory: ~15-20 MB for typical workloads

### Cleanup Schedule

- Hourly cleanup of old data
- Automatic trimming of event log when exceeding limits
- Session history cleanup for sessions older than 30 days

### Optimization Tips

1. **Batch Event Writes**: Don't track every individual event in high-frequency scenarios
2. **Sample Large Events**: For very active servers, sample instead of tracking all events
3. **Offload to Database**: For production, store historical data in a database
4. **Use Prometheus**: Export key metrics to Prometheus for long-term storage

## Production Deployment

### Database Integration

For production deployments, integrate with a database for persistent storage:

```typescript
// Example: PostgreSQL integration
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Store events in database
async function persistEvent(event: AnalyticsEvent) {
  await pool.query(
    'INSERT INTO analytics_events (type, player_id, timestamp, data) VALUES ($1, $2, $3, $4)',
    [event.type, event.playerId, event.timestamp, JSON.stringify(event.data)]
  );
}

// Retrieve historical data
async function getHistoricalDAU(days: number) {
  const result = await pool.query(`
    SELECT DATE(to_timestamp(timestamp / 1000)) as date,
           COUNT(DISTINCT player_id) as dau
    FROM analytics_events
    WHERE type = 'player_join'
      AND timestamp > $1
    GROUP BY date
    ORDER BY date DESC
  `, [Date.now() - days * 24 * 60 * 60 * 1000]);
  
  return result.rows;
}
```

### Recommended Tech Stack

- **Time-Series Data**: InfluxDB or TimescaleDB
- **Visualization**: Grafana
- **Real-time Metrics**: Prometheus
- **Event Storage**: PostgreSQL or MongoDB
- **Data Warehouse**: BigQuery or Redshift (for advanced analytics)

## Alerting

Set up alerts based on analytics thresholds:

```typescript
// Example: Alert when churn rate exceeds threshold
analytics.on('churn-rate-high', ({ churnRate }) => {
  if (churnRate > 0.3) {
    // Send alert to ops team
    console.warn(`⚠️ High churn rate detected: ${(churnRate * 100).toFixed(1)}%`);
    // sendSlackNotification(`Churn rate is ${churnRate * 100}%`);
  }
});

// Example: Alert when CCU drops significantly
let lastCCU = 0;
setInterval(() => {
  const { ccu } = analytics.getUserMetrics();
  if (lastCCU > 0 && ccu < lastCCU * 0.5) {
    console.warn(`⚠️ CCU dropped by 50%: ${lastCCU} → ${ccu}`);
  }
  lastCCU = ccu;
}, 300000); // Check every 5 minutes
```

## Example Queries

### Find Peak Play Times

```typescript
// Analyze session start times to find peak hours
const sessionsByHour = new Map<number, number>();

analytics.getEventLog(10000)
  .filter(e => e.type === 'player_join')
  .forEach(event => {
    const hour = new Date(event.timestamp).getHours();
    sessionsByHour.set(hour, (sessionsByHour.get(hour) || 0) + 1);
  });

const peakHour = Array.from(sessionsByHour.entries())
  .sort((a, b) => b[1] - a[1])[0];

console.log(`Peak play time: ${peakHour[0]}:00 with ${peakHour[1]} joins`);
```

### Calculate Player Lifetime Value (LTV)

```typescript
// Example: Calculate average revenue per player
function calculateLTV(): number {
  const events = analytics.getEventLog(10000);
  const purchases = events.filter(e => e.type === 'currency_spend');
  
  const totalSpent = purchases.reduce((sum, e) => sum + e.data.amount, 0);
  const uniquePlayers = new Set(purchases.map(e => e.playerId)).size;
  
  return uniquePlayers > 0 ? totalSpent / uniquePlayers : 0;
}
```

### Identify Stuck Players

```typescript
// Find players stuck at certain level for too long
const levelUpEvents = analytics.getEventLog(10000)
  .filter(e => e.type === 'level_up');

const playerLevels = new Map<string, { level: number, timestamp: number }>();

levelUpEvents.forEach(event => {
  playerLevels.set(event.playerId, {
    level: event.data.newLevel,
    timestamp: event.timestamp,
  });
});

const stuckPlayers = Array.from(playerLevels.entries())
  .filter(([_, data]) => {
    const daysSinceLevel = (Date.now() - data.timestamp) / (24 * 60 * 60 * 1000);
    return daysSinceLevel > 7 && data.level < 10;
  });

console.log(`${stuckPlayers.length} players stuck at low levels`);
```

## Summary

The Data Analytics Dashboard provides comprehensive insights into:
- Player acquisition, retention, and churn
- Game balance and progression
- Economy health and currency flow
- Content popularity and engagement
- Server performance and capacity planning

Use these metrics to make data-driven decisions about game design, content updates, and operational improvements.
