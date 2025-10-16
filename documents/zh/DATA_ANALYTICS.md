# 数据分析仪表板

MMO服务器数据分析仪表板系统的完整指南。

## 概述

分析仪表板提供对玩家行为、游戏经济和整体服务器健康的全面洞察。它收集实时指标并提供历史数据聚合，用于商业智能和运营决策。

## 功能特性

### 1. 用户指标
- **DAU (日活跃用户)**: 过去24小时内活跃的唯一玩家
- **MAU (月活跃用户)**: 过去30天内活跃的唯一玩家
- **CCU (当前并发用户)**: 当前在线玩家
- **峰值CCU**: 跟踪期间的最大并发用户
- **新用户**: 首次注册用户
- **回访用户**: 缺席后返回的玩家

### 2. 留存指标
- **1日留存**: 1天后返回的用户百分比
- **7日留存**: 7天后返回的用户百分比
- **30日留存**: 30天后返回的用户百分比

### 3. 等级分布
- 每个等级的玩家数量
- 帮助识别进度瓶颈
- 用于内容难度平衡

### 4. 战斗统计
- 总战斗遭遇 (PvP + PvE)
- PvP vs PvE细分
- 总伤害输出
- 击杀/死亡比率
- 平均战斗持续时间
- 战斗中的技能使用

### 5. 经济指标
- 流通中的总货币
- 货币创建 (来源)
- 货币销毁 (消耗)
- 平均玩家财富
- 吉尼系数 (财富不平等度量)

### 6. 任务分析
- 总任务开始数
- 总任务完成数
- 完成率
- 平均完成时间
- 最受欢迎的任务

### 7. 技能分析
- 总技能使用次数
- 最受欢迎的技能
- 每个玩家的平均技能使用数
- 按战斗类型划分的技能使用

### 8. 流失分析
- 月流失率
- 风险玩家数量
- 流失原因细分
- 非活跃玩家检测

## API端点

### 获取完整分析仪表板

```http
GET /analytics
```

**响应:**
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

### 获取事件日志

```http
GET /analytics/events?limit=100
```

**查询参数:**
- `limit` (可选): 返回的事件数量 (默认: 100, 最大: 10000)

**响应:**
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

## 事件类型

分析系统跟踪以下事件类型：

| 事件类型 | 描述 | 数据字段 |
|----------|------|----------|
| `player_join` | 玩家连接到服务器 | `sessionId` |
| `player_leave` | 玩家断开连接 | `sessionId`, `duration` |
| `level_up` | 玩家升级 | `oldLevel`, `newLevel` |
| `combat_encounter` | 战斗开始 | `targetId`, `isPvP`, `duration` |
| `damage_dealt` | 造成伤害 | `damage`, `skillId` (可选) |
| `kill` | 击杀玩家/怪物 | `victimId`, `isPvP` |
| `death` | 玩家死亡 | `killerId` (可选) |
| `skill_use` | 技能激活 | `skillId` |
| `quest_start` | 任务接受 | `questId` |
| `quest_complete` | 任务完成 | `questId`, `duration` |
| `currency_gain` | 获得货币 | `amount`, `source` |
| `currency_spend` | 花费货币 | `amount`, `purpose` |
| `item_drop` | 物品掉落 | `itemId`, `quantity` |
| `item_pickup` | 物品拾取 | `itemId`, `quantity` |

## 与游戏系统集成

### 跟踪玩家会话

```typescript
import { getAnalyticsCollector } from '../analytics/analyticsCollector';

const analytics = getAnalyticsCollector();

// 跟踪玩家加入
room.onJoin((client) => {
  analytics.trackPlayerJoin(client.sessionId, client.sessionId);
});

// 跟踪玩家离开
room.onLeave((client) => {
  analytics.trackPlayerLeave(client.sessionId);
});
```

### 跟踪战斗

```typescript
// 战斗遭遇开始
analytics.trackCombatEncounter(playerId, targetId, isPvP, duration);

// 造成伤害
analytics.trackDamageDealt(playerId, damage, skillId);

// 击杀/死亡
analytics.trackKill(killerId, victimId, isPvP);
analytics.trackDeath(victimId, killerId);
```

### 跟踪玩家进度

```typescript
// 升级
analytics.trackLevelUp(playerId, newLevel, oldLevel);

// 任务事件
analytics.trackQuestStart(playerId, questId);
analytics.trackQuestComplete(playerId, questId, duration);

// 技能使用
analytics.trackSkillUse(playerId, skillId);
```

### 跟踪经济

```typescript
// 货币收益
analytics.trackCurrencyGain(playerId, amount, 'quest_reward');
analytics.trackCurrencyGain(playerId, amount, 'monster_drop');

// 货币花费
analytics.trackCurrencySpend(playerId, amount, 'item_purchase');
analytics.trackCurrencySpend(playerId, amount, 'skill_upgrade');

// 物品跟踪
analytics.trackItemDrop(playerId, itemId, quantity);
analytics.trackItemPickup(playerId, itemId, quantity);
```

## Grafana集成

分析数据可以在Grafana仪表板中可视化，使用 `/analytics` 端点。

### Grafana仪表板配置示例

```json
{
  "dashboard": {
    "title": "MMO服务器分析",
    "panels": [
      {
        "title": "日活跃用户",
        "targets": [
          {
            "expr": "mmo_analytics_dau",
            "legendFormat": "DAU"
          }
        ]
      },
      {
        "title": "战斗统计",
        "targets": [
          {
            "expr": "rate(game_combat_encounters_total[5m])",
            "legendFormat": "战斗率"
          }
        ]
      },
      {
        "title": "等级分布",
        "type": "bargauge",
        "targets": [
          {
            "expr": "mmo_player_level_distribution",
            "legendFormat": "等级 {{level}}"
          }
        ]
      }
    ]
  }
}
```

### Prometheus指标导出

从分析数据创建额外的Prometheus指标：

```typescript
import { Gauge } from 'prom-client';

const dauGauge = new Gauge({
  name: 'mmo_analytics_dau',
  help: '日活跃用户',
});

const mauGauge = new Gauge({
  name: 'mmo_analytics_mau',
  help: '月活跃用户',
});

// 定期更新指标
setInterval(() => {
  const metrics = analytics.getUserMetrics();
  dauGauge.set(metrics.dau);
  mauGauge.set(metrics.mau);
}, 60000); // 每分钟
```

## 数据保留

分析系统维护以下数据保留策略：

- **活跃会话**: 玩家断开连接前保存在内存中
- **会话历史**: 最近30天
- **事件日志**: 最近10,000个事件
- **日活跃玩家**: 每24小时重置
- **月活跃玩家**: 每30天重置
- **指标缓存**: 持续累积，定期清理

## 性能考虑

### 内存使用

- 活跃会话: 每个会话约200字节
- 事件日志: 每个事件约500字节 (10,000个事件最大5MB)
- 会话历史: 每个会话约300字节 (30,000个会话最大约9MB)
- 总预估内存: 典型工作负载15-20MB

### 清理计划

- 每小时清理旧数据
- 超过限制时自动修剪事件日志
- 会话历史清理超过30天的会话

### 优化提示

1. **批量事件写入**: 在高频场景中不要跟踪每个单独事件
2. **采样大事件**: 对于非常活跃的服务器，采样而不是跟踪所有事件
3. **卸载到数据库**: 对于生产环境，将历史数据存储在数据库中
4. **使用Prometheus**: 将关键指标导出到Prometheus进行长期存储

## 生产部署

### 数据库集成

对于生产部署，与数据库集成以实现持久存储：

```typescript
// 示例: PostgreSQL集成
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// 将事件存储在数据库中
async function persistEvent(event: AnalyticsEvent) {
  await pool.query(
    'INSERT INTO analytics_events (type, player_id, timestamp, data) VALUES ($1, $2, $3, $4)',
    [event.type, event.playerId, event.timestamp, JSON.stringify(event.data)]
  );
}

// 检索历史数据
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

### 推荐技术栈

- **时序数据**: InfluxDB 或 TimescaleDB
- **可视化**: Grafana
- **实时指标**: Prometheus
- **事件存储**: PostgreSQL 或 MongoDB
- **数据仓库**: BigQuery 或 Redshift (用于高级分析)

## 警报

基于分析阈值设置警报：

```typescript
// 示例: 当流失率超过阈值时发出警报
analytics.on('churn-rate-high', ({ churnRate }) => {
  if (churnRate > 0.3) {
    // 向运维团队发送警报
    console.warn(`⚠️ 检测到高流失率: ${(churnRate * 100).toFixed(1)}%`);
    // sendSlackNotification(`流失率为 ${churnRate * 100}%`);
  }
});

// 示例: 当CCU显著下降时发出警报
let lastCCU = 0;
setInterval(() => {
  const { ccu } = analytics.getUserMetrics();
  if (lastCCU > 0 && ccu < lastCCU * 0.5) {
    console.warn(`⚠️ CCU下降50%: ${lastCCU} → ${ccu}`);
  }
  lastCCU = ccu;
}, 300000); // 每5分钟检查一次
```

## 示例查询

### 查找高峰游戏时间

```typescript
// 分析会话开始时间以查找高峰时段
const sessionsByHour = new Map<number, number>();

analytics.getEventLog(10000)
  .filter(e => e.type === 'player_join')
  .forEach(event => {
    const hour = new Date(event.timestamp).getHours();
    sessionsByHour.set(hour, (sessionsByHour.get(hour) || 0) + 1);
  });

const peakHour = Array.from(sessionsByHour.entries())
  .sort((a, b) => b[1] - a[1])[0];

console.log(`高峰游戏时间: ${peakHour[0]}:00，加入数 ${peakHour[1]}`);
```

### 计算玩家终身价值 (LTV)

```typescript
// 示例: 计算平均玩家收入
function calculateLTV(): number {
  const events = analytics.getEventLog(10000);
  const purchases = events.filter(e => e.type === 'currency_spend');

  const totalSpent = purchases.reduce((sum, e) => sum + e.data.amount, 0);
  const uniquePlayers = new Set(purchases.map(e => e.playerId)).size;

  return uniquePlayers > 0 ? totalSpent / uniquePlayers : 0;
}
```

### 识别卡住的玩家

```typescript
// 查找在某个等级卡住太久的玩家
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

console.log(`${stuckPlayers.length} 个玩家在低等级卡住`);
```

## 总结

数据分析仪表板提供对以下方面的全面洞察：
- 玩家获取、留存和流失
- 游戏平衡和进度
- 经济健康和货币流动
- 内容受欢迎程度和参与度
- 服务器性能和容量规划

使用这些指标做出关于游戏设计、内容更新和运营改进的数据驱动决策。