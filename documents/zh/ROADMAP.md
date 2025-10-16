# MMO 服务器成熟化路线图

本文档规划了将 mmo-server 项目演化为成熟 MMO 游戏产品所需的核心功能与运营工具体系。

## 目录

- [1. 游戏核心扩展](#1-游戏核心扩展)
  - [1.1 怪物 AI 系统](#11-怪物-ai-系统)
  - [1.2 背包与物品系统](#12-背包与物品系统)
  - [1.3 技能系统配置化](#13-技能系统配置化)
  - [1.4 怪物/NPC 生成点配置](#14-怪物npc-生成点配置)
- [2. 内容生产工具](#2-内容生产工具)
  - [2.1 地图编辑器集成](#21-地图编辑器集成)
  - [2.2 服务器数据解析器](#22-服务器数据解析器)
- [3. 运营支持体系](#3-运营支持体系)
  - [3.1 GM 后台系统](#31-gm-后台系统)
  - [3.2 数据分析仪表盘](#32-数据分析仪表盘)
  - [3.3 客服工单系统](#33-客服工单系统)
  - [3.4 安全与反作弊](#34-安全与反作弊)
- [4. 技术与性能工具](#4-技术与性能工具)
  - [4.1 Prometheus 监控集成](#41-prometheus-监控集成)
  - [4.2 OpenTelemetry 链路追踪](#42-opentelemetry-链路追踪)
  - [4.3 Redis 集群与横向扩展](#43-redis-集群与横向扩展)
  - [4.4 配置热更新机制](#44-配置热更新机制)
- [5. 配置管理与版本控制](#5-配置管理与版本控制)
- [6. 实施优先级建议](#6-实施优先级建议)

---

## 1. 游戏核心扩展

### 1.1 怪物 AI 系统

**目标**: 引入可配置的怪物状态机，支持多种行为模式和智能决策。

**核心功能**:

- **状态机设计**
  - **Idle（待机）**: 怪物站立不动或播放待机动画
  - **Patrol（巡逻）**: 沿预定义路径或随机区域巡逻
  - **Chase（追逐）**: 发现玩家后追击目标
  - **Attack（攻击）**: 进入攻击范围后执行攻击行为
  - **Flee（逃跑）**: 生命值低于阈值时逃离战斗
  - **Return（回归）**: 返回初始生成点并恢复生命值

- **配置化参数**（JSON/YAML）
  ```json
  {
    "monsterId": "goblin_warrior",
    "name": "哥布林战士",
    "level": 5,
    "stats": {
      "health": 200,
      "attack": 15,
      "defense": 10,
      "speed": 80,
      "detectRange": 150,
      "attackRange": 30,
      "fleeHealthPercent": 0.2
    },
    "ai": {
      "behavior": "aggressive",
      "patrolRadius": 100,
      "chaseDistance": 200,
      "returnDistance": 300
    },
    "skills": ["slash", "roar"],
    "lootTable": "goblin_drops"
  }
  ```

- **巡逻系统**
  - 支持路径点巡逻（Waypoint-based）
  - 支持随机区域巡逻（Random wander）
  - 可配置巡逻速度和停留时间

- **技能使用**
  - 怪物可使用配置的技能列表
  - 支持技能优先级和冷却管理
  - AI 决策何时使用何种技能

**技术实现**:

```typescript
// src/systems/monsterAISystem.ts
export interface MonsterAIConfig {
  monsterId: string;
  stats: MonsterStats;
  ai: AIBehavior;
  skills: string[];
  lootTable: string;
}

export enum AIState {
  IDLE = 'idle',
  PATROL = 'patrol',
  CHASE = 'chase',
  ATTACK = 'attack',
  FLEE = 'flee',
  RETURN = 'return'
}

export class MonsterAI {
  currentState: AIState;
  
  updateState(monster: Entity, nearbyPlayers: Entity[]): void {
    // 状态转换逻辑
  }
  
  executeState(monster: Entity, deltaTime: number): void {
    // 执行当前状态的行为
  }
}
```

**集成点**:
- 在 `src/systems/` 新增 `monsterAISystem.ts`
- 在 `src/schemas/MyRoomState.ts` 添加怪物实体类型
- 在 `src/config/` 创建怪物配置文件目录
- 使用现有 ECS 架构（Miniplex）管理怪物实体

---

### 1.2 背包与物品系统

**目标**: 实现完整的物品管理系统，支持拾取、使用、装备、交易等功能。

**核心功能**:

- **物品数据结构**
  ```json
  {
    "itemId": "iron_sword",
    "name": "铁剑",
    "type": "weapon",
    "rarity": "common",
    "level": 10,
    "stats": {
      "attack": 25,
      "durability": 100
    },
    "stackable": false,
    "maxStack": 1,
    "sellPrice": 50,
    "icon": "items/iron_sword.png"
  }
  ```

- **背包系统**
  - 可配置背包容量（初始/最大槽位数）
  - 支持背包扩展道具
  - 物品堆叠逻辑
  - 排序和筛选功能

- **装备系统**
  - 装备槽位：武器、头盔、胸甲、腿甲、靴子、饰品等
  - 装备属性加成自动计算
  - 装备耐久度系统
  - 装备等级/职业限制

- **掉落系统**
  - 掉落表配置化
  ```json
  {
    "lootTableId": "goblin_drops",
    "items": [
      { "itemId": "gold_coin", "chance": 0.8, "minCount": 5, "maxCount": 15 },
      { "itemId": "goblin_ear", "chance": 0.5, "minCount": 1, "maxCount": 1 },
      { "itemId": "iron_sword", "chance": 0.1, "minCount": 1, "maxCount": 1 }
    ]
  }
  ```
  - 支持随机掉落、保底掉落、稀有掉落
  - 掉落物品在地图上显示，玩家可拾取

- **物品使用**
  - 消耗品使用（血瓶、魔法瓶）
  - 任务道具
  - 可交易/不可交易标记

**Schema 扩展**:

```typescript
// src/schemas/MyRoomState.ts
export class Item extends Schema {
  @type("string") itemId: string;
  @type("number") count: number;
  @type("number") durability: number;
}

export class Inventory extends Schema {
  @type([Item]) items = new ArraySchema<Item>();
  @type("number") capacity: number = 20;
  @type("number") gold: number = 0;
}

// 在 Player 中添加
@type(Inventory) inventory = new Inventory();
```

**客户端集成**:
- 在 `client/src/` 开发背包 UI 组件
- 支持拖拽物品
- 显示物品 Tooltip（名称、属性、描述）
- 右键菜单（使用、装备、丢弃、拆分）

---

### 1.3 技能系统配置化

**目标**: 将现有硬编码技能改为配置文件驱动，支持热更新和快速扩展。

**当前状态**: 
- 技能在 `src/systems/skillSystem.ts` 中硬编码
- 默认 4 个技能：Fireball, Heal, Shield, Dash

**改进方案**:

- **技能配置文件**（`src/config/skills.json`）
  ```json
  {
    "fireball": {
      "id": "fireball",
      "name": "火球术",
      "description": "发射一个火球对目标造成伤害",
      "type": "damage",
      "cooldown": 3000,
      "manaCost": 20,
      "range": 200,
      "effects": [
        {
          "type": "damage",
          "value": 30,
          "element": "fire"
        }
      ],
      "icon": "skills/fireball.png",
      "animation": "cast_fireball"
    },
    "heal": {
      "id": "heal",
      "name": "治疗术",
      "type": "heal",
      "cooldown": 5000,
      "manaCost": 30,
      "effects": [
        { "type": "heal", "value": 40 }
      ]
    }
  }
  ```

- **技能效果系统**
  - 支持多种效果类型：伤害、治疗、增益、减益、位移
  - 效果可叠加（如火球术同时造成伤害和燃烧 DOT）
  - 支持条件触发（如暴击、概率触发）

- **配置加载器**
  ```typescript
  // src/config/skillLoader.ts
  export class SkillLoader {
    private skills: Map<string, SkillConfig>;
    
    loadSkills(configPath: string): void {
      const data = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      // 解析并验证配置
    }
    
    getSkill(skillId: string): SkillConfig | undefined {
      return this.skills.get(skillId);
    }
  }
  ```

- **热更新支持**
  - 监听配置文件变化
  - 重新加载技能配置而不重启服务器
  - 通过 GM 命令触发热更新

**技能学习系统**:
- 玩家等级解锁新技能
- 技能书道具学习技能
- 技能树/天赋系统（高级扩展）

---

### 1.4 怪物/NPC 生成点配置

**目标**: 支持通过配置文件定义怪物和 NPC 的生成位置、数量、刷新规则。

**功能需求**:

- **生成点配置**
  ```json
  {
    "spawnPoints": [
      {
        "id": "sp_001",
        "type": "monster",
        "monsterId": "goblin_warrior",
        "position": { "x": 500, "y": 300 },
        "spawnRadius": 50,
        "maxCount": 5,
        "respawnTime": 30000,
        "roamRadius": 100
      },
      {
        "id": "sp_002",
        "type": "npc",
        "npcId": "merchant_john",
        "position": { "x": 1000, "y": 500 },
        "rotation": 90
      }
    ]
  }
  ```

- **生成管理器**
  ```typescript
  // src/systems/spawnSystem.ts
  export class SpawnManager {
    private spawnPoints: SpawnPoint[];
    
    initialize(config: SpawnConfig): void {
      // 加载生成点配置
    }
    
    tick(world: World<Entity>, deltaTime: number): void {
      // 检查是否需要刷新怪物
      // 管理怪物数量
    }
    
    respawnMonster(spawnPoint: SpawnPoint): void {
      // 在生成点刷新怪物
    }
  }
  ```

- **刷新规则**
  - 定时刷新
  - 死亡后延迟刷新
  - 最大数量限制
  - 区域密度控制

- **NPC 系统**
  - 静态 NPC（商人、任务发布者）
  - NPC 对话系统
  - NPC 商店功能

**地图集成**:
- 生成点与地图绑定
- 支持多地图/多房间场景
- 地图切换时加载对应生成点配置

---

## 2. 内容生产工具

### 2.1 地图编辑器集成

**目标**: 集成 Tiled 等成熟 2D 地图编辑器，让策划可视化设计游戏内容。

**推荐工具**: [Tiled Map Editor](https://www.mapeditor.org/)
- 免费开源
- 支持 TMX/JSON 导出
- 丰富的图层和对象功能
- 活跃的社区支持

**工作流程**:

1. **策划在 Tiled 中设计地图**
   - 绘制地形和背景图层
   - 标记碰撞层（Collision Layer）
   - 放置怪物生成点（Object Layer）
   - 放置 NPC（Object Layer）
   - 定义区域触发器（Region/Trigger Objects）
   - 添加传送点（Portal Objects）

2. **导出地图数据**
   - 导出为 JSON 格式
   - 包含图层、对象、自定义属性

3. **服务器加载地图**
   ```typescript
   // src/systems/worldLoader.ts
   export class WorldLoader {
     loadMap(mapPath: string): MapData {
       const mapJson = JSON.parse(fs.readFileSync(mapPath, 'utf8'));
       return this.parseMap(mapJson);
     }
     
     parseMap(mapJson: any): MapData {
       // 解析图层、碰撞、对象
     }
   }
   ```

**Tiled 自定义属性映射**:

| Tiled 对象类型 | 自定义属性 | 游戏功能 |
|---------------|-----------|---------|
| MonsterSpawn | monsterId, maxCount, respawnTime | 怪物生成点 |
| NPC | npcId, dialogue, shop | NPC |
| Portal | targetMap, targetX, targetY | 传送点 |
| Region | regionType, triggerAction | 区域触发 |
| Chest | lootTable, respawnTime | 宝箱 |

**示例配置**:
```json
{
  "name": "monster_spawn_01",
  "type": "MonsterSpawn",
  "x": 500,
  "y": 300,
  "properties": [
    { "name": "monsterId", "value": "goblin_warrior" },
    { "name": "maxCount", "value": 5 },
    { "name": "respawnTime", "value": 30000 }
  ]
}
```

**碰撞检测**:
- 从 Tiled 的 Collision Layer 提取碰撞数据
- 服务器端碰撞检测（防作弊）
- 客户端同步碰撞信息优化体验

---

### 2.2 服务器数据解析器

**目标**: 开发 WorldLoader 解析 Tiled 导出的地图数据，自动加载游戏内容。

**核心组件**:

```typescript
// src/systems/worldLoader.ts
export interface MapData {
  width: number;
  height: number;
  tilewidth: number;
  tileheight: number;
  layers: Layer[];
  objects: MapObject[];
}

export class WorldLoader {
  private collisionMap: CollisionMap;
  private spawnPoints: SpawnPoint[] = [];
  private npcs: NPC[] = [];
  private regions: Region[] = [];
  
  loadWorld(mapPath: string, room: MyRoom): void {
    const mapData = this.loadMap(mapPath);
    
    // 加载碰撞数据
    this.parseCollisionLayer(mapData);
    
    // 加载生成点
    this.parseSpawnPoints(mapData, room);
    
    // 加载 NPC
    this.parseNPCs(mapData, room);
    
    // 加载区域触发器
    this.parseRegions(mapData, room);
  }
  
  parseCollisionLayer(mapData: MapData): void {
    const collisionLayer = mapData.layers.find(l => l.name === 'Collision');
    // 构建碰撞地图
  }
  
  parseSpawnPoints(mapData: MapData, room: MyRoom): void {
    const objectLayer = mapData.layers.find(l => l.type === 'objectgroup');
    objectLayer?.objects.forEach(obj => {
      if (obj.type === 'MonsterSpawn') {
        // 创建怪物生成点
      }
    });
  }
  
  isColliding(x: number, y: number): boolean {
    // 检查坐标是否碰撞
  }
}
```

**支持的内容类型**:

1. **碰撞检测**
   - 地形碰撞（墙壁、障碍物）
   - 服务器端验证移动合法性

2. **生成点系统**
   - 怪物生成点自动管理
   - NPC 自动部署

3. **区域触发器**
   - 进入区域触发事件（如任务推进）
   - PvP/PvE 区域标记
   - 安全区/危险区

4. **传送点**
   - 地图间传送
   - 场景切换

5. **宝箱/采集点**
   - 可交互对象
   - 掉落奖励

**配置验证**:
- 启动时验证所有地图配置
- 检查引用完整性（如 monsterId 是否存在）
- 生成配置报告和错误日志

---

## 3. 运营支持体系

### 3.1 GM 后台系统

**目标**: 提供 Web 界面的游戏管理（GM）后台，支持玩家管理、游戏配置、实时监控。

**核心功能模块**:

#### 3.1.1 玩家管理

- **查询玩家**
  - 按昵称/ID/等级/在线状态查询
  - 查看玩家详细信息（等级、装备、背包、任务、成就）
  - 查看玩家登录历史和行为日志

- **玩家操作**
  - **禁言**: 禁止玩家发送聊天消息（时间可配置）
  - **封禁**: 封禁玩家账号（永久/临时）
  - **踢下线**: 强制玩家下线
  - **发放奖励**: 发送物品/金币/经验到玩家背包
  - **发送邮件**: 给玩家发送系统邮件

#### 3.1.2 游戏公告

- 发布全服公告
- 滚动公告
- 弹窗公告
- 定时公告

#### 3.1.3 活动配置

- 创建/编辑活动
- 活动时间配置
- 活动奖励配置
- 活动开启/关闭

#### 3.1.4 实时监控

- 在线玩家数（实时）
- 服务器负载（CPU、内存、网络）
- 房间状态（玩家分布、tick 性能）
- 错误日志监控

#### 3.1.5 配置管理

- 在线修改游戏配置参数
- 查看配置历史和回滚
- 热更新配置（无需重启）

**技术实现**:

```typescript
// src/api/gmRoutes.ts
export function setupGMRoutes(app: Express, gameServer: Server) {
  // 认证中间件
  app.use('/gm', gmAuthMiddleware);
  
  // 玩家管理
  app.get('/gm/players', getPlayers);
  app.get('/gm/players/:id', getPlayerDetails);
  app.post('/gm/players/:id/ban', banPlayer);
  app.post('/gm/players/:id/mute', mutePlayer);
  app.post('/gm/players/:id/kick', kickPlayer);
  app.post('/gm/players/:id/reward', giveReward);
  app.post('/gm/players/:id/mail', sendMail);
  
  // 公告管理
  app.post('/gm/announcements', createAnnouncement);
  app.get('/gm/announcements', getAnnouncements);
  
  // 活动管理
  app.get('/gm/events', getEvents);
  app.post('/gm/events', createEvent);
  app.put('/gm/events/:id', updateEvent);
  
  // 监控
  app.get('/gm/monitor/realtime', getRealtimeStats);
  app.get('/gm/monitor/rooms', getRoomsStatus);
}
```

**前端界面**:
- 使用 React/Vue 开发管理界面
- 部署在 `/client/gm/` 目录
- 通过 `/gm` 路径访问
- 支持权限分级（超级管理员、普通 GM、客服）

**权限系统**:
```typescript
export enum GMPermission {
  VIEW_PLAYERS = 'view_players',
  BAN_PLAYERS = 'ban_players',
  GIVE_REWARDS = 'give_rewards',
  MANAGE_EVENTS = 'manage_events',
  VIEW_LOGS = 'view_logs'
}

export interface GMAccount {
  id: string;
  username: string;
  permissions: GMPermission[];
}
```

---

### 3.2 数据分析仪表盘

**目标**: 提供全面的游戏数据统计和可视化分析。

**核心指标**:

#### 3.2.1 用户指标

- **DAU (Daily Active Users)**: 日活跃用户
- **MAU (Monthly Active Users)**: 月活跃用户
- **CCU (Concurrent Users)**: 同时在线用户数（实时）
- **PCU (Peak Concurrent Users)**: 峰值在线
- **留存率**
  - 次日留存
  - 7日留存
  - 30日留存
- **新增用户**: 每日新注册用户
- **流失率**: 用户流失统计

#### 3.2.2 游戏行为数据

- **等级分布**: 各等级玩家数量分布
- **在线时长**: 平均/中位数在线时长
- **战斗数据**
  - PvE 战斗次数
  - PvP 战斗次数
  - 平均战斗时长
- **经济数据**
  - 货币产出/消耗（金币流入流出）
  - 物品产出/消耗
  - 交易量统计

#### 3.2.3 任务与技能

- **任务完成率**: 各任务完成比例
- **任务放弃率**: 玩家放弃任务比例
- **技能使用频率**: 各技能使用次数统计
- **成就解锁率**: 各成就解锁比例

#### 3.2.4 社交数据

- **聊天活跃度**: 消息发送量
- **好友数量**: 平均好友数
- **公会数据**: 公会数量、成员分布（如计划实现）

#### 3.2.5 异常监控

- **流失分析**: 流失玩家特征分析
- **付费转化**: 付费率、ARPU、ARPPU（如有付费系统）
- **漏斗分析**: 新手引导各阶段流失

**技术实现**:

```typescript
// src/analytics/collector.ts
export class AnalyticsCollector {
  private events: AnalyticsEvent[] = [];
  
  trackEvent(event: AnalyticsEvent): void {
    this.events.push(event);
    // 批量发送到数据库或分析服务
  }
  
  trackPlayerLogin(playerId: string): void {
    this.trackEvent({ type: 'player_login', playerId, timestamp: Date.now() });
  }
  
  trackQuestComplete(playerId: string, questId: string): void {
    this.trackEvent({ type: 'quest_complete', playerId, questId, timestamp: Date.now() });
  }
}
```

**数据存储**:
- 使用时序数据库（InfluxDB、TimescaleDB）
- 或传统数据库 + 定时聚合任务

**可视化界面**:
- 使用 Grafana 构建仪表盘
- 或自定义 Web 界面（ECharts/Chart.js）

**日志系统**:
```typescript
// 标准化事件日志格式
{
  "timestamp": "2025-10-15T15:30:00Z",
  "eventType": "player_levelup",
  "playerId": "player_123",
  "sessionId": "session_456",
  "data": {
    "oldLevel": 4,
    "newLevel": 5
  }
}
```

---

### 3.3 客服工单系统

**目标**: 提供玩家问题反馈和客服处理的工单系统。

**核心功能**:

#### 3.3.1 玩家端

- **提交工单**
  - 游戏内提交（UI 表单）
  - Web 后台提交
  - 分类选择（账号问题、游戏 Bug、投诉建议等）
  - 附件上传（截图）

- **查询工单**
  - 查看我的工单列表
  - 查看工单处理进度
  - 回复工单

- **FAQ 系统**
  - 常见问题在线帮助
  - 自助解决问题
  - 减少工单量

#### 3.3.2 客服端

- **工单管理**
  - 待处理工单队列
  - 工单分配（自动/手动）
  - 工单优先级设置
  - 工单状态（待处理、处理中、已解决、已关闭）

- **快捷回复**
  - 预设回复模板
  - 常见问题快速回复

- **统计报表**
  - 工单处理量
  - 平均响应时间
  - 问题分类统计

**Schema 扩展**:

```typescript
// src/schemas/Ticket.ts
export class Ticket extends Schema {
  @type("string") id: string;
  @type("string") playerId: string;
  @type("string") category: string;
  @type("string") title: string;
  @type("string") description: string;
  @type("string") status: string; // pending, in_progress, resolved, closed
  @type("number") createdAt: number;
  @type("number") updatedAt: number;
  @type("string") assignedTo: string; // GM ID
  @type([TicketMessage]) messages = new ArraySchema<TicketMessage>();
}

export class TicketMessage extends Schema {
  @type("string") sender: string; // player or GM
  @type("string") message: string;
  @type("number") timestamp: number;
}
```

**API 端点**:

```typescript
// 玩家端
app.post('/api/tickets', createTicket);
app.get('/api/tickets/:playerId', getPlayerTickets);
app.post('/api/tickets/:id/reply', replyTicket);

// 客服端
app.get('/gm/tickets', getAllTickets);
app.put('/gm/tickets/:id/assign', assignTicket);
app.put('/gm/tickets/:id/status', updateTicketStatus);
app.post('/gm/tickets/:id/reply', gmReplyTicket);
```

---

### 3.4 安全与反作弊

**目标**: 保护游戏公平性，防止外挂、作弊和恶意行为。

**核心措施**:

#### 3.4.1 行为检测

- **移动速度检测**
  ```typescript
  // 服务器端验证移动合法性
  function validateMovement(player: Player, newX: number, newY: number, deltaTime: number): boolean {
    const distance = Math.sqrt((newX - player.x)**2 + (newY - player.y)**2);
    const maxDistance = player.speed * (deltaTime / 1000) * 1.2; // 允许 20% 误差
    return distance <= maxDistance;
  }
  ```

- **攻击频率检测**
  - 检测异常高频攻击
  - 技能冷却时间强制校验

- **传送检测**
  - 检测瞬移作弊
  - 位置合法性验证

- **资源异常检测**
  - 金币/经验异常增长
  - 物品数量异常

#### 3.4.2 数据校验

- **服务器权威**
  - 所有关键逻辑在服务器端执行
  - 客户端仅发送输入，不发送结果

- **数据签名**
  - 关键数据包签名验证
  - 防止数据包篡改

- **输入验证**
  - 已有 `InputValidator` 在 `src/utils/security.ts`
  - 扩展验证规则

#### 3.4.3 玩家举报

- **举报系统**
  ```typescript
  // 玩家举报接口
  room.send('report', {
    reportedPlayerId: 'player_123',
    reason: 'cheating',
    description: '该玩家使用加速外挂'
  });
  ```

- **举报审核**
  - GM 后台查看举报列表
  - 调查玩家行为日志
  - 处罚决策（警告、禁言、封禁）

- **自动封禁**
  - 多次被举报自动标记
  - 严重作弊行为自动封禁

**日志记录**:

```typescript
// src/analytics/securityLogger.ts
export class SecurityLogger {
  logSuspiciousActivity(playerId: string, activity: string, details: any): void {
    const log = {
      timestamp: Date.now(),
      playerId,
      activity,
      details,
      severity: this.calculateSeverity(activity)
    };
    // 写入安全日志数据库
  }
  
  private calculateSeverity(activity: string): 'low' | 'medium' | 'high' {
    // 根据活动类型判断严重程度
  }
}
```

**限制措施**:
- 现有速率限制系统（`RateLimiter` in `src/utils/security.ts`）
- IP 频率限制
- 设备指纹识别（高级）

---

## 4. 技术与性能工具

### 4.1 Prometheus 监控集成

**目标**: 使用标准 Prometheus 客户端替代当前手动构建的指标系统，实现更强大的监控能力。

**当前状态**:
- 已有 `/metrics` 端点输出 Prometheus 格式
- 手动构建指标文本（在 `src/instrumentation/metrics.ts`）

**改进方案**:

#### 4.1.1 引入 prom-client

```bash
yarn add prom-client
```

```typescript
// src/instrumentation/prometheusMetrics.ts
import { Registry, Counter, Gauge, Histogram } from 'prom-client';

export const register = new Registry();

// 消息计数器
export const messageCounter = new Counter({
  name: 'colyseus_messages_total',
  help: 'Total number of messages received',
  labelNames: ['roomId', 'messageType'],
  registers: [register]
});

// 在线玩家数
export const playersGauge = new Gauge({
  name: 'colyseus_players_online',
  help: 'Number of players currently online',
  labelNames: ['roomId'],
  registers: [register]
});

// Tick 性能直方图
export const tickHistogram = new Histogram({
  name: 'colyseus_tick_duration_ms',
  help: 'Tick duration in milliseconds',
  labelNames: ['roomId'],
  buckets: [1, 5, 10, 20, 50, 100, 200],
  registers: [register]
});

// 事件循环延迟
export const eventLoopLag = new Gauge({
  name: 'colyseus_event_loop_lag_ms',
  help: 'Event loop lag in milliseconds',
  registers: [register]
});
```

#### 4.1.2 更新 /metrics 端点

```typescript
// src/app.config.ts
import { register } from './instrumentation/prometheusMetrics';

app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});
```

#### 4.1.3 添加业务指标

```typescript
// 玩家注册
export const playerRegistrations = new Counter({
  name: 'game_player_registrations_total',
  help: 'Total player registrations'
});

// 战斗次数
export const combatCounter = new Counter({
  name: 'game_combat_total',
  help: 'Total combat encounters',
  labelNames: ['combatType'] // pvp, pve
});

// 任务完成
export const questCompletions = new Counter({
  name: 'game_quest_completions_total',
  help: 'Total quest completions',
  labelNames: ['questId']
});

// 物品掉落
export const itemDrops = new Counter({
  name: 'game_item_drops_total',
  help: 'Total item drops',
  labelNames: ['itemId', 'rarity']
});
```

#### 4.1.4 Grafana 仪表盘

创建 Grafana 仪表盘配置：

```yaml
# k8s/grafana-dashboard.json
{
  "dashboard": {
    "title": "MMO Server Metrics",
    "panels": [
      {
        "title": "Online Players",
        "targets": [{
          "expr": "sum(colyseus_players_online)"
        }]
      },
      {
        "title": "Tick Performance (P99)",
        "targets": [{
          "expr": "histogram_quantile(0.99, rate(colyseus_tick_duration_ms_bucket[5m]))"
        }]
      },
      {
        "title": "Message Rate",
        "targets": [{
          "expr": "rate(colyseus_messages_total[1m])"
        }]
      }
    ]
  }
}
```

---

### 4.2 OpenTelemetry 链路追踪

**目标**: 实现分布式追踪，分析 tick 和 broadcast 阶段的性能瓶颈。

**核心功能**:

#### 4.2.1 安装依赖

```bash
yarn add @opentelemetry/api @opentelemetry/sdk-node @opentelemetry/auto-instrumentations-node
```

#### 4.2.2 初始化 Tracer

```typescript
// src/instrumentation/tracing.ts
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { JaegerExporter } from '@opentelemetry/exporter-jaeger';

const sdk = new NodeSDK({
  traceExporter: new JaegerExporter({
    endpoint: process.env.JAEGER_ENDPOINT || 'http://localhost:14268/api/traces'
  }),
  instrumentations: [getNodeAutoInstrumentations()]
});

export function initializeTracing() {
  sdk.start();
}
```

#### 4.2.3 追踪游戏循环

```typescript
// src/rooms/MyRoom.ts
import { trace } from '@opentelemetry/api';

const tracer = trace.getTracer('mmo-server');

setInterval(() => {
  const span = tracer.startSpan('game_tick');
  const tickStart = Date.now();
  
  try {
    const inputSpan = tracer.startSpan('input_processing', { parent: span });
    inputSystem(this.world);
    inputSpan.end();
    
    const movementSpan = tracer.startSpan('movement_system', { parent: span });
    movementSystem(this.world, deltaMs);
    movementSpan.end();
    
    const combatSpan = tracer.startSpan('combat_system', { parent: span });
    combatSystem(this.world, deltaMs);
    combatSpan.end();
    
    // ... 其他系统
    
    const syncSpan = tracer.startSpan('sync_system', { parent: span });
    syncSystem(this.world);
    syncSpan.end();
    
  } finally {
    span.end();
    const tickDuration = Date.now() - tickStart;
    recordTick(this.roomId, tickDuration);
  }
}, 1000 / 60);
```

#### 4.2.4 可视化分析

- 使用 Jaeger UI 查看追踪数据
- 分析各系统耗时占比
- 识别性能瓶颈

---

### 4.3 Redis 集群与横向扩展

**目标**: 启用 Redis 作为 Presence 和 Driver，支持多服务器横向扩展。

**当前状态**:
- 已安装 `@colyseus/redis-presence` 和 `@colyseus/redis-driver`
- 配置在 `src/app.config.ts` 中注释掉

**启用步骤**:

#### 4.3.1 解除 Redis 配置注释

```typescript
// src/app.config.ts
import { RedisPresence } from '@colyseus/redis-presence';
import { RedisDriver } from '@colyseus/redis-driver';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

export default {
  // ...
  driver: new RedisDriver(redisUrl),
  presence: new RedisPresence(redisUrl),
  // ...
}
```

#### 4.3.2 部署 Redis

```yaml
# k8s/redis-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: redis
spec:
  replicas: 1
  selector:
    matchLabels:
      app: redis
  template:
    metadata:
      labels:
        app: redis
    spec:
      containers:
      - name: redis
        image: redis:7-alpine
        ports:
        - containerPort: 6379
---
apiVersion: v1
kind: Service
metadata:
  name: redis
spec:
  selector:
    app: redis
  ports:
  - port: 6379
```

#### 4.3.3 多实例部署

```yaml
# k8s/colyseus-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: colyseus
spec:
  replicas: 3  # 部署 3 个实例
  selector:
    matchLabels:
      app: colyseus
  template:
    metadata:
      labels:
        app: colyseus
    spec:
      containers:
      - name: colyseus
        image: mmo-server:latest
        env:
        - name: REDIS_URL
          value: "redis://redis:6379"
        ports:
        - containerPort: 2567
```

#### 4.3.4 负载均衡

- 使用 Nginx/HAProxy 或 Kubernetes Ingress
- 配置粘性会话（如需要）

---

### 4.4 配置热更新机制

**目标**: 支持在不重启服务器的情况下更新游戏配置。

**实现方案**:

#### 4.4.1 配置管理器

```typescript
// src/config/configManager.ts
import fs from 'fs';
import path from 'path';
import { EventEmitter } from 'events';

export class ConfigManager extends EventEmitter {
  private configs: Map<string, any> = new Map();
  private watchers: Map<string, fs.FSWatcher> = new Map();
  
  loadConfig<T>(configName: string, configPath: string): T {
    const data = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    this.configs.set(configName, data);
    
    // 监听文件变化
    const watcher = fs.watch(configPath, (eventType) => {
      if (eventType === 'change') {
        this.reloadConfig(configName, configPath);
      }
    });
    this.watchers.set(configName, watcher);
    
    return data as T;
  }
  
  private reloadConfig(configName: string, configPath: string): void {
    try {
      const newData = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      const oldData = this.configs.get(configName);
      this.configs.set(configName, newData);
      
      console.log(`[ConfigManager] Reloaded config: ${configName}`);
      this.emit('config-updated', { configName, oldData, newData });
    } catch (err) {
      console.error(`[ConfigManager] Failed to reload ${configName}:`, err);
    }
  }
  
  getConfig<T>(configName: string): T | undefined {
    return this.configs.get(configName) as T;
  }
  
  dispose(): void {
    this.watchers.forEach(watcher => watcher.close());
    this.watchers.clear();
  }
}

export const configManager = new ConfigManager();
```

#### 4.4.2 应用配置热更新

```typescript
// src/systems/skillSystem.ts
import { configManager } from '../config/configManager';

let skillConfigs: Map<string, SkillConfig>;

// 初始加载
export function initializeSkills() {
  const configs = configManager.loadConfig<SkillsConfig>('skills', './config/skills.json');
  skillConfigs = new Map(Object.entries(configs.skills));
}

// 监听更新
configManager.on('config-updated', ({ configName }) => {
  if (configName === 'skills') {
    const newConfigs = configManager.getConfig<SkillsConfig>('skills');
    if (newConfigs) {
      skillConfigs = new Map(Object.entries(newConfigs.skills));
      console.log('[SkillSystem] Skills reloaded from config');
    }
  }
});
```

#### 4.4.3 GM 触发热更新

```typescript
// src/api/gmRoutes.ts
app.post('/gm/config/reload', (req, res) => {
  const { configName } = req.body;
  
  try {
    configManager.emit('reload-requested', configName);
    res.json({ success: true, message: `Config ${configName} reloaded` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
```

#### 4.4.4 支持的配置类型

- 技能配置（`config/skills.json`）
- 怪物配置（`config/monsters.json`）
- 物品配置（`config/items.json`）
- 掉落表配置（`config/loot-tables.json`）
- 游戏平衡参数（`config/balance.json`）

---

## 5. 配置管理与版本控制

**目标**: 建立完善的配置文件管理和版本控制机制。

**核心措施**:

### 5.1 配置文件版本管理

```json
// config/skills.json
{
  "version": "1.2.3",
  "lastUpdated": "2025-10-15T15:00:00Z",
  "skills": {
    // 技能配置
  }
}
```

### 5.2 配置验证 Schema

使用 JSON Schema 验证配置文件：

```typescript
// src/config/schemas/skillSchema.ts
export const skillSchema = {
  type: 'object',
  required: ['version', 'skills'],
  properties: {
    version: { type: 'string', pattern: '^\\d+\\.\\d+\\.\\d+$' },
    skills: {
      type: 'object',
      patternProperties: {
        '^[a-z_]+$': {
          type: 'object',
          required: ['id', 'name', 'cooldown', 'manaCost'],
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            cooldown: { type: 'number', minimum: 0 },
            manaCost: { type: 'number', minimum: 0 }
          }
        }
      }
    }
  }
};
```

### 5.3 配置回滚机制

```typescript
// src/config/configManager.ts
export class ConfigManager {
  private configHistory: Map<string, any[]> = new Map();
  
  private reloadConfig(configName: string, configPath: string): void {
    const newData = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    const oldData = this.configs.get(configName);
    
    // 保存历史版本
    if (!this.configHistory.has(configName)) {
      this.configHistory.set(configName, []);
    }
    this.configHistory.get(configName)!.push({
      data: oldData,
      timestamp: Date.now()
    });
    
    // 限制历史版本数量
    const history = this.configHistory.get(configName)!;
    if (history.length > 10) {
      history.shift();
    }
    
    this.configs.set(configName, newData);
  }
  
  rollback(configName: string): boolean {
    const history = this.configHistory.get(configName);
    if (!history || history.length === 0) return false;
    
    const previous = history.pop();
    this.configs.set(configName, previous!.data);
    this.emit('config-updated', { configName, newData: previous!.data });
    return true;
  }
}
```

### 5.4 配置导出/导入

```typescript
// GM 后台配置导出
app.get('/gm/config/export', (req, res) => {
  const allConfigs = {
    skills: configManager.getConfig('skills'),
    monsters: configManager.getConfig('monsters'),
    items: configManager.getConfig('items')
  };
  res.json(allConfigs);
});

// GM 后台配置导入
app.post('/gm/config/import', (req, res) => {
  const { configType, data } = req.body;
  // 验证并导入配置
});
```

### 5.5 配置变更日志

```typescript
// 记录所有配置变更
export interface ConfigChangeLog {
  timestamp: number;
  configName: string;
  changedBy: string; // GM ID
  action: 'update' | 'rollback';
  changes: any; // diff
}
```

---

## 6. 实施优先级建议

根据开发难度和业务价值，建议的实施优先级：

### P0 - 核心基础（立即实施）

1. **配置管理与版本控制**
   - 建立配置文件结构
   - 实现配置验证和热更新
   - **工作量**: 3-5 天

2. **技能系统配置化**
   - 将现有技能移至配置文件
   - 实现配置加载器
   - **工作量**: 2-3 天

3. **Prometheus 监控升级**
   - 引入 prom-client
   - 标准化指标输出
   - **工作量**: 2-3 天

### P1 - 内容生产工具（第一阶段）

4. **怪物/NPC 生成点配置**
   - 实现生成点配置文件
   - 开发生成管理器
   - **工作量**: 5-7 天

5. **背包与物品系统**
   - 物品数据结构设计
   - 背包系统实现
   - 客户端 UI 开发
   - **工作量**: 10-14 天

6. **Tiled 地图编辑器集成**
   - WorldLoader 开发
   - 碰撞检测集成
   - **工作量**: 7-10 天

### P2 - 运营工具（第二阶段）

7. **GM 后台系统（基础版）**
   - 玩家管理功能
   - 游戏公告
   - 实时监控
   - **工作量**: 14-21 天

8. **怪物 AI 系统**
   - 状态机实现
   - AI 配置化
   - **工作量**: 10-14 天

9. **数据分析仪表盘（基础版）**
   - 核心指标收集
   - Grafana 仪表盘
   - **工作量**: 7-10 天

### P3 - 高级功能（第三阶段）

10. **客服工单系统**
    - 工单提交和管理
    - FAQ 系统
    - **工作量**: 10-14 天

11. **安全与反作弊**
    - 行为检测系统
    - 举报系统
    - **工作量**: 7-10 天

12. **OpenTelemetry 链路追踪**
    - 分布式追踪集成
    - 性能分析
    - **工作量**: 5-7 天

13. **Redis 集群与横向扩展**
    - 启用 Redis
    - 多实例部署测试
    - **工作量**: 3-5 天

### 总体时间估算

- **P0**: 约 1-2 周
- **P1**: 约 4-6 周
- **P2**: 约 6-8 周
- **P3**: 约 4-6 周

**总计**: 约 15-22 周（3.5-5.5 个月）

---

## 附录

### A. 推荐技术栈

- **后端框架**: Colyseus (已使用)
- **数据库**: PostgreSQL (持久化) + Redis (缓存/集群)
- **监控**: Prometheus + Grafana
- **追踪**: OpenTelemetry + Jaeger
- **地图编辑器**: Tiled Map Editor
- **GM 后台**: React + Ant Design / Vue + Element UI
- **客户端**: Pixi.js (已使用)

### B. 文档规范

每个新功能应包含：
- 功能设计文档
- API 接口文档
- 配置文件格式说明
- 使用教程
- 测试用例

### C. 团队协作建议

- **策划**: 负责配置文件设计、数值平衡、地图设计
- **程序**: 负责系统开发、API 实现、性能优化
- **美术**: 提供资源素材、UI 设计
- **运营**: 使用 GM 后台、数据分析、活动策划

### D. 扩展性考虑

设计时应考虑：
- 多地图/多房间支持
- 跨服功能（如跨服 PvP）
- 公会/氏族系统
- 交易市场
- 装备打造/升级
- 宠物/坐骑系统

---

## 总结

本路线图涵盖了将 mmo-server 演化为成熟 MMO 游戏所需的核心功能和工具体系。建议按照优先级分阶段实施，并在每个阶段进行充分测试和文档化。

**关键成功因素**:
1. 配置驱动设计，降低开发成本
2. 完善的工具链，提升内容生产效率
3. 强大的运营支持，保障游戏健康运营
4. 扎实的技术基础，确保系统稳定性和可扩展性

欢迎团队成员补充建议和反馈！
