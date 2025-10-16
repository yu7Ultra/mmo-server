# 怪物AI系统

## 概述

怪物AI系统为MMO服务器中的NPC和怪物提供基于状态机的可配置AI。

## 功能特性

- **可配置怪物**: 所有怪物类型在 `config/monsters.json` 中定义
- **状态机**: 空闲 → 巡逻 → 追逐 → 攻击 → 逃跑 → 返回 → 死亡
- **巡逻模式**: 随机游荡、路径点巡逻、圆形巡逻
- **攻击类型**: 被动、主动、中性
- **重生系统**: 死亡后自动重生
- **掉落表**: 可配置掉落率和奖励

## 怪物配置

### 怪物示例

```json
{
  "goblin": {
    "id": "goblin",
    "name": "哥布林",
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

## AI状态

### 1. 空闲 (IDLE)
- 怪物在出生点等待
- 检测附近玩家
- 如果主动且玩家在范围内，转换到追逐状态
- 空闲超时后转换到巡逻状态

### 2. 巡逻 (PATROL)
- 在半径范围内随机游荡或跟随路径点
- 继续检测玩家
- 检测到玩家时转换到追逐状态

### 3. 追逐 (CHASE)
- 追逐目标玩家
- 以追逐速度移动
- 进入攻击范围时转换到攻击状态
- 目标超出范围时转换到返回状态

### 4. 攻击 (ATTACK)
- 以间隔攻击目标
- 检查逃跑条件（生命值过低）
- 生命值过低时转换到逃跑状态
- 目标死亡/无效时转换到返回状态

### 5. 逃跑 (FLEE)
- 以高速逃离危险
- 返回出生点
- 安全时转换到空闲状态

### 6. 返回 (RETURN)
- 返回出生点
- 到达后转换到空闲状态

### 7. 死亡 (DEAD)
- 等待重生计时器
- 在出生点满血重生

## 使用方法

### 初始化系统

```typescript
import { initializeMonsterSystem } from './systems/monsterAI';

// 在房间onCreate中
initializeMonsterSystem();
```

### 生成怪物

```typescript
import { spawnMonster } from './systems/monsterAI';

// 在位置(100, 200)生成哥布林
const monster = spawnMonster(world, 'goblin', { x: 100, y: 200 });
```

### 运行AI系统

```typescript
import { monsterAISystem } from './systems/monsterAI';

// 在游戏循环中(setInterval)
monsterAISystem(world, deltaTime);
```

## 怪物类型

### 包含的怪物

1. **哥布林** (等级5)
   - 主动近战战士
   - 随机巡逻
   - 生命值20%时逃跑

2. **狼** (等级8)
   - 快速主动捕食者
   - 路径点巡逻
   - 群体狩猎行为

3. **骷髅** (等级10)
   - 不死战士
   - 从不逃跑
   - 守卫行为

4. **史莱姆** (等级3)
   - 被动生物
   - 移动缓慢
   - 生命值30%时逃跑

## 集成

### 实体结构

怪物使用实体的 `monster` 组件：

```typescript
entity.monster = {
  type: 'goblin',
  level: 5,
  health: 100,
  maxHealth: 100,
  state: MonsterState.IDLE,
  spawnPoint: { x: 100, y: 200 },
  // ... 更多字段
};
```

### 指标

怪物行为记录在Prometheus中：
- `game_combat_total{combatType="pve"}` - PvE战斗遭遇
- `game_damage_dealt_total{skillId="monster_*"}` - 怪物伤害

## 巡逻类型

### 随机巡逻

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

怪物在出生点半径范围内随机游荡。

### 路径点巡逻

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

怪物按顺序跟随路径点（相对于出生点）。

## 掉落系统

### 掉落表

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

- `chance`: 0.0-1.0 掉落概率
- `minAmount`/`maxAmount`: 数量范围

## 重生系统

```json
{
  "respawn": {
    "enabled": true,
    "time": 30000
  }
}
```

- `enabled`: 怪物是否重生
- `time`: 重生前的毫秒数

## 未来增强功能

1. **出生点**: 基于地图的出生配置
2. **Boss AI**: Boss遭遇的特殊状态
3. **群体行为**: 群体战术和阵型
4. **技能**: 怪物技能使用
5. **目标选择**: 智能目标选择
6. **牵引**: 拉得太远时返回
7. **冷却技能**: 技能轮换系统

## 配置热重载

怪物配置支持通过ConfigManager热重载：

```bash
# 编辑 config/monsters.json
# 系统自动重载
```

更改立即应用于新的怪物生成。

## 性能

- **基于ECS**: 高效的实体查询
- **最小分配**: 重用实体组件
- **状态机**: O(1)状态转换
- **空间查询**: 距离计算优化

## 调试

启用调试日志：

```typescript
// 生成记录到控制台
// 详细模式下状态变化记录
console.log(`[MonsterAI] Goblin transitioned to CHASE`);
```

## 测试

```typescript
// 测试怪物生成
const monster = spawnMonster(world, 'slime', { x: 0, y: 0 });
expect(monster.monster?.type).toBe('slime');

// 测试状态机
monsterAISystem(world, 16.67);
expect(monster.monster?.state).toBe(MonsterState.IDLE);
```