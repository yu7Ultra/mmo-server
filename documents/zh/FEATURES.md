# MMO 服务器功能

本文档描述了 MMO 服务器中实现的功能。

## 核心系统

### 1. 战斗系统

**位置**: `src/systems/combatSystem.ts`

高性能 PvE 和 PvP 战斗系统，包含：
- 带防御减伤的伤害计算
- 基于玩家速度的攻击冷却
- 击杀追踪和统计
- 击杀经验奖励
- 自动重生
- 生命值和魔法值再生

**使用方法**:
```typescript
// 设置战斗目标
entity.combatTarget = targetEntity;
entity.player.inCombat = true;

// 战斗系统在游戏循环中自动运行
combatSystem(world, deltaTime);
regenerationSystem(world, deltaTime);
```

**性能特性**:
- 使用 ECS 查询进行高效的实体过滤
- 每次 tick 最小化状态更新
- 预计算攻击冷却时间

### 2. 技能系统

**位置**: `src/systems/skillSystem.ts`

灵活的技能系统，支持冷却管理：
- 4 个默认技能：火球术、治疗术、护盾、冲刺
- 魔法消耗系统
- 冷却时间追踪
- 增益/减益效果支持
- 技能效果（伤害、治疗、增益）

**默认技能**:
- **火球术 (Fireball)**: 远程伤害技能（3秒冷却，20魔法，30伤害）
- **治疗术 (Heal)**: 自我治疗技能（5秒冷却，30魔法，恢复40生命）
- **护盾 (Shield)**: 防御增益（10秒冷却，25魔法，持续5秒+10防御）
- **冲刺 (Dash)**: 速度提升（4秒冷却，15魔法，持续2秒2倍速度）

**使用方法**:
```typescript
// 使用技能
room.send('attack', { 
  targetId: playerId, 
  skillId: 'fireball' 
});
```

**性能优化**:
- 技能冷却在服务器端追踪
- 使用对象池减少垃圾回收
- 高效的增益效果过期检查

### 3. 任务系统

**位置**: `src/systems/questSystem.ts`

动态任务系统，支持进度追踪：
- 任务进度自动追踪
- 击杀计数
- 任务完成自动检测
- 经验奖励
- 可放弃任务

**默认任务**:
- **击败敌人**: 击败 5 个敌人（奖励 100 经验）
- **首次击杀**: 获得第一次击杀（奖励 50 经验）
- **生存者**: 存活 60 秒（奖励 75 经验）

**使用方法**:
```typescript
// 放弃任务
room.send('quest', { 
  questId: 'defeat_enemies', 
  action: 'abandon' 
});
```

### 4. 成就系统

**位置**: `src/systems/achievementSystem.ts`

自动成就解锁系统：
- 基于玩家统计的自动追踪
- 进度追踪
- 解锁通知
- 9 个默认成就

**默认成就**:
- **首次击杀**: 获得第一次击杀
- **杀手**: 击败 10 个敌人
- **大师级杀手**: 击败 50 个敌人
- **传奇杀手**: 击败 100 个敌人
- **幸存者**: 无死亡存活 60 秒
- **等级 5**: 达到 5 级
- **等级 10**: 达到 10 级
- **熟练战士**: 造成 1000 点伤害
- **坚不可摧**: 承受 1000 点伤害

### 5. 排行榜

**位置**: `src/systems/leaderboardSystem.ts`

实时玩家排名：
- 前 10 名玩家
- 按等级和击杀数排序
- 每 5 秒更新一次
- 自动排序

**显示信息**:
- 排名位置
- 玩家名称
- 等级
- 击杀数

### 6. 聊天系统

**位置**: `src/systems/chatSystem.ts`

带速率限制和内容过滤的安全聊天：
- 速率限制（每 10 秒 5 条消息）
- 亵渎内容过滤
- XSS 防护
- 消息历史记录（最多 50 条）
- 多频道支持（全局/团队/私聊）

**使用方法**:
```typescript
// 发送聊天消息
room.send('chat', { 
  message: '你好，世界！', 
  channel: 'global' 
});
```

**安全特性**:
- 基于令牌桶的速率限制
- HTML 标签清理
- 消息长度限制（200 字符）
- 亵渎词过滤

### 7. 社交系统

**位置**: `src/schemas/MyRoomState.ts`

好友管理功能：
- 添加/移除好友
- 好友列表追踪
- 玩家状态

**使用方法**:
```typescript
// 添加好友
room.send('friend', { 
  targetId: playerId, 
  action: 'add' 
});

// 移除好友
room.send('friend', { 
  targetId: playerId, 
  action: 'remove' 
});
```

### 8. 移动系统

**位置**: `src/systems/movementSystem.ts`

平滑的玩家移动：
- 基于速度的移动
- 碰撞检测
- 增益效果的速度修改器
- 客户端预测

**使用方法**:
```typescript
// 设置移动方向
room.send('move', { x: 1, y: 0 }); // 向右移动
room.send('move', { x: 0, y: 0 }); // 停止
```

## 9. 语音通讯系统

**位置**: `src/systems/voiceChannelSystem.ts`

基于 WebRTC 的对等语音聊天系统：
- 4 种频道类型：全局、分组、私密、邻近
- WebRTC 信令中继
- 静音/屏蔽控制
- 频道成员管理
- 低服务器开销（对等流）

**频道类型**:

#### 1. 全局频道
所有玩家共享的单一语音频道。
- 用例：开放世界游戏、社交中心
- 成员限制：无限制

#### 2. 分组频道
私有群组频道，仅限受邀成员。
- 用例：队伍语音、公会频道、私人聚会
- 成员限制：可配置（默认 10 人）

#### 3. 私密频道
一对一语音通话。
- 用例：私人对话、交易讨论
- 成员限制：正好 2 人

#### 4. 邻近频道
基于玩家位置的动态语音。
- 用例：空间音频、真实的世界互动
- 成员限制：可配置，基于范围

**使用方法**:
```typescript
// 创建语音频道
room.send('voice:create', {
  name: 'My Team',
  type: 'group',
  maxMembers: 10
});

// 加入频道
room.send('voice:join', { channelId: 'channel_id' });

// 离开频道
room.send('voice:leave', {});

// 切换静音
room.send('voice:mute', { muted: true });

// 切换屏蔽
room.send('voice:deafen', { deafened: true });

// WebRTC 信令（自动处理）
room.send('voice:signal', {
  to: 'session_id',
  type: 'offer',
  data: sdp
});
```

**文档**:
- 完整集成指南：[VOICE_INTEGRATION.md](./VOICE_INTEGRATION.md)
- 客户端示例：[USAGE_EXAMPLES.md](./USAGE_EXAMPLES.md)

## 玩家状态架构

**位置**: `src/schemas/MyRoomState.ts`

增强的玩家属性：
- **位置**: x, y 坐标
- **角色**: 名称、等级、经验
- **战斗属性**: 生命值、魔法值、攻击、防御、速度
- **状态**: 战斗中、目标ID
- **装备**: 已装备物品的映射
- **技能**: 可用技能数组
- **任务**: 活动/完成任务数组
- **成就**: 已解锁成就数组
- **社交**: 好友ID数组
- **语音**: 当前语音频道、语音静音、语音屏蔽
- **统计**: 击杀、死亡、造成伤害、承受伤害

## 消息处理器

服务器接受以下客户端消息：

| 消息 | 数据 | 描述 |
|------|------|------|
| `move` | `{ x: number, y: number }` | 设置玩家速度 |
| `attack` | `{ targetId: string, skillId?: string }` | 攻击目标，可选使用技能 |
| `chat` | `{ message: string, channel?: string }` | 发送聊天消息 |
| `quest` | `{ questId: string, action: 'abandon' }` | 管理任务 |
| `friend` | `{ targetId: string, action: 'add'\|'remove' }` | 管理好友 |
| `voice:join` | `{ channelId: string }` | 加入语音频道 |
| `voice:leave` | `{}` | 离开当前语音频道 |
| `voice:create` | `{ name: string, type: string, maxMembers?: number }` | 创建新语音频道 |
| `voice:mute` | `{ muted: boolean }` | 切换静音状态 |
| `voice:deafen` | `{ deafened: boolean }` | 切换屏蔽状态 |
| `voice:signal` | `{ to: string, type: string, data: any }` | WebRTC 信令中继 |

所有消息都有速率限制以确保安全。

## 性能优化

1. **ECS 架构**: 使用 Miniplex 进行高效的实体查询
2. **速率限制**: 防止垃圾消息并减少服务器负载
3. **对象池**: 减少垃圾回收开销
4. **周期性更新**: 排行榜每 5 秒更新一次
5. **高效查询**: 为每个系统预过滤实体集
6. **最小化状态更新**: 仅更新改变的属性
7. **令牌桶**: 高效的速率限制算法
8. **清理周期**: 定期清理旧数据结构

## 测试

所有系统都有全面的测试覆盖：
- 战斗系统（8 个测试）
- 技能系统（8 个测试）
- 任务系统（8 个测试）
- 成就系统（7 个测试）
- 聊天系统（8 个测试）
- 安全工具（14 个测试）
- 语音频道系统（28 个测试）

运行测试：
```bash
yarn test
```

## 配置

环境变量：
- `PERF_SLOW_TICK_MS`: 慢 tick 阈值（默认：20ms）
- `PERF_AUTO_PROFILE_COOLDOWN_MS`: 自动性能分析冷却时间（默认：60000ms）

## 指标

所有系统与现有的指标系统集成：
- 按类型统计消息数
- Tick 性能追踪
- 慢 tick 检测
- 性能问题的自动性能分析

## 下一步

推荐的增强功能：
1. 持久化存储（数据库集成）
2. 公会/氏族系统
3. 交易/市场系统
4. 装备制作和升级
5. NPC/AI 敌人
6. 地图/区域系统
7. PvP 竞技场和匹配
8. 事件系统
9. 管理员命令
10. 反作弊措施
