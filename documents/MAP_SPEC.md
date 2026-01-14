# MMO 地图数据规范 (mmo.json)

本文档规范了基于 Tiled 导出的 `config/map/mmo.json` 在服务器与客户端中的解析与使用方式，涵盖：资源(采集点)、地形/障碍、领地、晶石(水晶)、怪物、传送点及通用命名与属性约定。

## 1. 总体结构

mmo.json 为 Tiled 1.4.x 导出，核心字段：

- `width`,`height` : 地图网格宽高(单位: tiles)。
- `tilewidth`,`tileheight` : 单个 tile 像素尺寸。用于计算像素世界尺寸：`worldWidthPx = width * tilewidth`。
- `layers` : 图层数组 (多种类型: `imagelayer`, `tilelayer`, `objectgroup`)。
- `tilesets` : 外部 tileset 引用。

### 图层分类

| 图层名                            | 类型             | 用途                       |
| --------------------------------- | ---------------- | -------------------------- |
| `front_layer` (image/tile)      | 前景表现层       | 纯渲染，不参与逻辑         |
| `territory_layer` (objectgroup) | 领地与晶石       | 领地占位 + 水晶防守点      |
| `resource_layer` (objectgroup)  | 资源采集点       | 金矿、树木等可采集节点     |
| `monster_layer` (objectgroup)   | 怪物出生点       | 怪物刷点坐标集合           |
| `object_layer` (objectgroup)    | 多边形/矩形/传送 | 障碍轮廓、传送点、特殊区域 |
| `obstacle_layer` (tilelayer)    | 障碍格层         | 用于碰撞/阻挡判定          |

## 2. 通用对象字段

Tiled Object 可能包含：

- `id` : 唯一 ID (仅编辑器内)。
- `name` : 语义名称 (建议规范化)。
- `type` : 数值或字符串 (建议迁移为语义字符串)。
- `x`,`y` : 左上角坐标 (像素)。
- `width`,`height` : 对于矩形对象的尺寸。
- `properties` : 任意键值对 (字符串形式导出)。
- `points` : 多边形顶点列表 (存在于多边形对象)。

### 推荐命名与属性统一

为降低解析逻辑复杂度，建议：

- 使用 `type` 字段区分业务类型：`territory` / `crystal` / `resource` / `monster_spawn` / `teleport` / `obstacle_poly`。
- 若暂未改动编辑器，当前基于 `name` 前缀识别：`territory_`、`crystal_`、`gold`、`trees`、`monster`、`teleport point`。
- 所有自定义属性统一为字符串导出，解析时转换为目标类型。

服务器解析辅助方法：

```ts
function readProp(obj: any, key: string, def?: any) {
  const props = obj?.properties || {}; // 若为对象
  const v = props[key];
  if (v === undefined) return def;
  // 尝试数字转换
  if (typeof v === 'string' && /^-?\d+(\.\d+)?$/.test(v)) return Number(v);
  return v;
}
```

## 3. 领地 (Territory)

来源图层：`territory_layer` 中 `name` 形如 `territory_<index>` 的对象。

属性约定：

| 属性             | 现有 | 说明                  | 推荐最终字段            |
| ---------------- | ---- | --------------------- | ----------------------- |
| `seat`         | 有   | 领地座位/占领槽位数量 | `seatCount: number`   |
| `tname`        | 有   | 领地显示名称          | `displayName: string` |
| `width,height` | 有   | 占领矩形范围          | `bounds: {x,y,w,h}`   |

示例解析结果：

```json
{
  "id": "territory_1",
  "displayName": "领地1号",
  "seatCount": 15,
  "bounds": { "x": 2413, "y": 2034, "w": 226, "h": 222 }
}
```

服务器用途：

- 进入/离开事件触发 (根据玩家坐标与 bounds 碰撞)。
- 领地争夺、收益结算、晶石关联。

## 4. 晶石 (Crystal)

在 `territory_layer` 中与领地平级的对象，`name` 前缀: `crystal_`。

属性：

| 属性        | 现有 | 说明         | 推荐             |
| ----------- | ---- | ------------ | ---------------- |
| `hp`      | 有   | 初始生命值   | `maxHp`/`hp` |
| `shield`  | 有   | 护盾值       | `shield`       |
| `restore` | 有   | 每周期恢复量 | `regenPerTick` |

示例：

```json
{
  "id": "crystal_2",
  "position": { "x": 754, "y": 1950 },
  "hp": 1000,
  "shield": 1000,
  "regenPerTick": 10
}
```

关联：可通过距离最近的 territory bounds 或配置映射建立归属。

## 5. 资源节点 (Resource Nodes)

图层：`resource_layer`。对象 `name` 为资源类型 (`gold`,`trees`)。

属性：

| 属性               | 现有   | 说明                   | 推荐                   |
| ------------------ | ------ | ---------------------- | ---------------------- |
| `rid`            | 有     | 资源类型 ID            | `resourceTypeId`     |
| `interval`       | 有     | 刷新/增长间隔 (秒)     | `respawnIntervalSec` |
| `nums`           | 有     | 单次刷新数量或叠加数量 | `spawnBatchSize`     |
| `quantity_limit` | 有     | 节点最大存量           | `capacity`           |
| `hp`             | 部分有 | 耐久 (例如砍树)        | `hp` / `maxHp`     |

统一解析：

```json
{
  "type": "gold",
  "resourceTypeId": 1,
  "capacity": 100,
  "respawnIntervalSec": 50,
  "spawnBatchSize": 1,
  "position": { "x": 483.333, "y": 3661.33 }
}
```

服务器逻辑：

- 定时器：每 `respawnIntervalSec` 增加 `spawnBatchSize` 直到 `capacity`。
- 采集：减少当前数量 (或对树使用 HP)。
- 空节点：进入“枯竭”状态，阻止采集动画。

## 6. 怪物出生点 (Monster Spawns)

图层：`monster_layer`，对象 `name` = `monster`。

属性：

| 属性           | 现有     | 说明        | 推荐                |
| -------------- | -------- | ----------- | ------------------- |
| `monster_id` | 部分对象 | 怪物配置 ID | `monsterConfigId` |

解析建议：无属性时使用该图层级 `properties.monster_id` 作为默认。

示例：

```json
{
  "spawnId": 81,
  "monsterConfigId": 1,
  "position": { "x": 2414, "y": 3034 }
}
```

服务器实现：

- 统一刷怪调度器按区域/权重刷新。
- 可扩展附加属性：`groupSize`, `respawnSec`, `leashRadius`。

## 7. 传送点 (Teleport)

位于 `object_layer`，`name` = `teleport point`。

属性：

| 属性              | 现有 | 说明                          | 推荐                |
| ----------------- | ---- | ----------------------------- | ------------------- |
| `destination`   | 有   | 目标标识 (可能是锚点或房间ID) | `destinationRef`  |
| `teleport time` | 有   | 激活需要的驻留时间 (秒)       | `channelTimeSec`  |
| `teleport_id`   | 有   | 传送点分组 ID                 | `teleportGroupId` |

示例：

```json
{
  "teleportGroupId": 1,
  "destinationRef": "#outTeleport",
  "channelTimeSec": 30,
  "bounds": { "x": 1390.91, "y": 1551.52, "w": 208.788, "h": 125.818 }
}
```

服务器逻辑：

- 玩家进入 bounds 开始计时，完成后执行切换/定位。
- 支持打断条件：移动/受击。

## 8. 障碍 / 地形轮廓 (Obstacles & Terrain Polygons)

图层：`object_layer` 中多边形对象 (`points` 数组) 或矩形对象：

属性：

| 属性          | 现有          | 说明                     | 推荐                                                         |
| ------------- | ------------- | ------------------------ | ------------------------------------------------------------ |
| `category`  | 有 (如 ob/op) | 分类 (阻挡/装饰/可穿透)  | `collisionType` (e.g. `solid`, `soft`, `decoration`) |
| `elevation` | 有            | 高度层级 (渲染/遮挡判定) | `elevation` (number)                                       |

示例多边形：

```json
{
  "collisionType": "ob", // solid obstacle
  "elevation": -100,
  "polygon": [ {"x":0,"y":0}, {"x":42,"y":-69}, ... ]
}
```

服务器应用：

- 构建碰撞网格/多边形集合供路径/射线检测。
- elevation 可用于决定是否可视/是否遮挡投射物。

## 9. Tile 障碍层 (Obstacle Tile Layer)

`obstacle_layer` 的 `data` 数组为 tile 索引 (0 = 空)。非零值代表阻挡分类：

推荐映射：

| TileIndex | 语义                      |
| --------- | ------------------------- |
| 1-4       | 基础阻挡 (墙/树桩)        |
| 5-8       | 次级阻挡 (可破坏)         |
| 9-12      | 高度差 (仅部分单位可通过) |

实际运行中由 `collisionMap[y][x] = kind` 构建，kind 通过 index 区间哈希。

## 10. 服务器解析流程建议

```ts
function parseMap(tileMap: TiledMap) {
  const result = {
    world: {
      widthPx: tileMap.width * tileMap.tilewidth,
      heightPx: tileMap.height * tileMap.tileheight
    },
    territories: [], crystals: [], resources: [], monsterSpawns: [], teleports: [], obstacles: { polygons: [], tiles: [] }
  };

  for (const layer of tileMap.layers) {
    if (layer.type === 'objectgroup') {
      for (const obj of layer.objects) {
        // classify by name/type
      }
    } else if (layer.type === 'tilelayer' && layer.name === 'obstacle_layer') {
      // build collision grid
    }
  }
  return result;
}
```

## 11. 客户端渲染与同步建议

- 初次进入房间只下发动态对象：资源当前数量、晶石状态、怪物列表。
- 静态地形/障碍通过 CDN 直接加载 `mmo.json`，减少服务器流量。
- 动态更新：
  - 资源节点数量变化 (采集 / 恢复)。
  - 怪物击杀 / 刷新。
  - 领地占领状态 / 晶石 HP。

## 12. 属性扩展规划

| 类别         | 未来可扩展字段                                                 |
| ------------ | -------------------------------------------------------------- |
| Territory    | `ownerGuildId`, `level`, `taxRate`                       |
| Crystal      | `elementType`, `respawnSec`, `dropTableId`               |
| Resource     | `rarity`, `toolRequirement`, `xpYield`                   |
| MonsterSpawn | `difficulty`, `groupSize`, `respawnSec`, `leashRadius` |
| Teleport     | `cooldownSec`, `accessLevel`                               |
| Obstacle     | `destructible`, `hp`, `material`                         |

## 13. 质量与一致性规范

- 坐标一律使用像素世界坐标 (左上原点)。
- 所有数值属性输出为字符串时解析成数字；不符合数值格式保持字符串。
- 统一枚举：资源 `gold|trees|...`，怪物类型从 `monsters.json` 引用。
- 修改 Tiled 后需：
  1. 增量检查层名未被误改。
  2. 新增属性在文档登记。
  3. 服务器解析单元测试更新。

## 14. 示例综合输出 (服务器内部结构)

```json
{
  "world": { "widthPx": 3040, "heightPx": 5360 },
  "territories": [ { "id": "territory_1", "seatCount": 15, "displayName": "领地1号", "bounds": {"x":2413,"y":2034,"w":226,"h":222} } ],
  "crystals": [ { "id": "crystal_1", "hp": 1000, "shield": 1000, "regenPerTick": 10, "position": {"x":2670,"y":2198} } ],
  "resources": [ { "type": "gold", "resourceTypeId": 1, "capacity": 100, "respawnIntervalSec": 50, "spawnBatchSize": 1, "position": {"x":483.333,"y":3661.33} } ],
  "monsterSpawns": [ { "spawnId": 53, "monsterConfigId": 1, "position": {"x":1004,"y":2596} } ],
  "teleports": [ { "teleportGroupId": 1, "destinationRef": "#outTeleport", "channelTimeSec": 30, "bounds": {"x":1390.91,"y":1551.52,"w":208.788,"h":125.818} } ],
  "obstacles": { "polygons": 32, "tiles": 400 }
}
```

## 15. 后续动作建议

1. 在 Tiled 中逐步把 `type` 字段改为语义字符串而非数值。
2. 为怪物刷点添加可选属性：`respawnSec`, `groupSize`.
3. 为资源节点添加 `rarity`, `xpYield` 方便经济平衡。
4. 增加服务器单元测试：验证所有必需字段均被解析。

---

最后更新：自动生成于构建时间。

## 16. 版本与兼容策略 (Versioning)

为避免多人协作导致解析不兼容，建议引入：

- `mapVersion` (随编辑器导出可手动写入 `properties`)。
- 服务器维护 `SUPPORTED_MAP_MAJOR`，若差异超过主版本直接拒绝加载并报警。
- 使用语义化：`MAJOR.MINOR.PATCH` 仅当结构或字段删改才递增 MAJOR。

示例校验伪代码：

```ts
function ensureVersion(tileMap: any) {
  const raw = tileMap.properties?.mapVersion || tileMap.tiledversion;
  const [maj] = String(raw).split('.').map(n => Number(n));
  if (maj !== SUPPORTED_MAP_MAJOR) throw new Error('Incompatible map major version');
}
```

## 17. 图层命名与规范扩展 (Layer Naming Extensions)

新增可规划图层：

- `weather_layer` : 天气触发区域 (雨/雪/雾)。
- `event_layer` : 限时活动刷点或剧情触发器。
- `path_hint_layer` : AI 导航参考点 (稀疏路标而非全图网格)。
- `audio_layer` : 环境音区域 (河流、城镇)。

命名规范：`<domain>_layer`；所有逻辑层必须为 `objectgroup` 以便扩展对象属性。

## 18. 属性类型与转换策略 (Property Typing)

统一转换优先级：布尔 > 数字 > JSON > 字符串。

```ts
function smartCast(v: string) {
  if (v === 'true' || v === 'false') return v === 'true';
  if (/^-?\d+(\.\d+)?$/.test(v)) return Number(v);
  if ((v.startsWith('{') && v.endsWith('}')) || (v.startsWith('[') && v.endsWith(']'))) {
    try { return JSON.parse(v); } catch { return v; }
  }
  return v;
}
```

服务器解析后应生成一个“已规范化”结构供后续系统直接消费，避免每帧重复转换。

## 19. 性能与内存 (Performance & Memory)

- 加载阶段一次性解析 -> 缓存结构体，不在 tick 中遍历原始 JSON。
- 多边形复杂度预警：顶点数 > 200 记录日志，> 500 拒绝 (防止路径/碰撞指数膨胀)。
- 采用 AABB 快速预筛 + 精确多边形碰撞，避免对所有对象做点内判断。
- 若地图将扩展至 >100MB，考虑分片：逻辑分区 JSON + 顶层索引。

## 20. 事件与交互语义 (Events Semantics)

为一致性定义基础事件：

- `TerritoryEnter/TerritoryLeave`
- `CrystalDamaged/CrystalDestroyed/CrystalRegenTick`
- `ResourceHarvest/ResourceDepleted/ResourceRespawn`
- `MonsterSpawned/MonsterKilled/MonsterDespawn`
- `TeleportChannelStart/TeleportChannelInterrupt/TeleportExecute`

事件载荷统一包含：`timestamp`, `entityId`, `position`, `sourcePlayerId?`, `extra`。

## 21. 测试策略 (Testing Strategy)

单元测试：

- 地图解析：验证每类对象数量与关键字段。
- 属性转换：混合属性 (数字/布尔/JSON)。

集成测试：

- 载入地图后模拟玩家坐标移动触发领地/传送事件。
- 怪物刷点调度：模拟时间推进校验 respawn。

负载测试：

- 资源节点 > 500 时解析耗时 < 50ms。
- 多边形障碍总顶点数上限预估：`totalVertices < 50k`。

## 22. 多服务器与分片 (Multi-Server & Sharding)

若横向扩展：

- 地图只保存在共享 CDN + Redis 缓存 Key: `map:hash`。
- 分区 (shard) 通过对象属性 `shard` 或按照坐标区块 `tileMap.width/regionSize` 自动划分。
- 领地/晶石跨分片交互需通过消息总线 (Redis Pub/Sub)。

## 23. 本地化 (Localization)

支持多语言：

- 在对象属性中增加 `tname_zh`, `tname_en` 等；或使用 `localizationId`，客户端通过字典映射。
- 文档中新增映射文件：`documents/LOCALIZATION_MAP.md`（未来可生成）。

## 24. 安全与数据校验 (Security & Validation)

- 加载前计算文件哈希，与签名列表比对 (防止被替换为篡改地图)。
- 属性白名单：忽略未知危险字段 (例如尝试注入脚本字符串)。
- 坐标范围校验：若超出 `worldWidthPx/worldHeightPx` 直接丢弃并记录。
- 多边形自交检测：发现异常自动标记“不可导航”。

## 25. 编辑工作流 (Authoring Workflow)

推荐流程：

1. 地图编辑者使用约定图层模板 (初次提供 base.tmx)。
2. 修改后运行脚本：`yarn map:validate` -> 解析 + 校验 + 生成摘要报告。
3. 提交 PR 附报告 (数量统计 + 新增字段列表)。
4. 评审者更新本规范若出现新字段。

自动化脚本输出建议：

```text
Map Validate Report
Objects: territories=3 crystals=3 resources=28 monsters=40 teleports=2 polygons=32
New Properties Detected: rarity (resource_layer), leashRadius (monster_layer)
Warnings: polygon(id=3) vertexCount=612 exceeds recommended 500
```

## 26. 与服务器系统的映射 (Server System Mapping)

| 类别         | 主要系统          | 次要系统              |
| ------------ | ----------------- | --------------------- |
| Territory    | 领地占领/收益结算 | 战斗加成 Buff 派发    |
| Crystal      | 防守/攻城系统     | 公会战计分模块        |
| Resource     | 资源刷新调度器    | 经济统计 & 反脚本检测 |
| MonsterSpawn | 怪物刷怪调度      | 掉落/经验分配         |
| Teleport     | 场景切换/副本入口 | 防卡位安全检查        |
| Obstacles    | 碰撞/寻路         | 射线检测/视野遮挡     |

## 27. 扩展字段建议清单 (Extended Field Candidates)

| 字段             | 适用对象   | 用途                 |
| ---------------- | ---------- | -------------------- |
| `leashRadius`  | 怪物出生点 | 控制怪物追击距离     |
| `aggroRange`   | 怪物出生点 | 初始仇恨检测半径     |
| `respawnSec`   | 怪物/资源  | 精确定义刷新周期     |
| `rarity`       | 资源       | 稀有度影响掉落权重   |
| `xpYield`      | 资源/怪物  | 经验产出用于平衡     |
| `ownerGuildId` | 领地       | 当前占领公会         |
| `level`        | 领地/晶石  | 难度或收益等级       |
| `elementType`  | 晶石       | 元素属性影响战斗加成 |
| `dropTableId`  | 怪物/晶石  | 后端掉落表索引       |
| `cooldownSec`  | Teleport   | 冷却防刷频率         |
| `accessLevel`  | Teleport   | 权限控制 (会员/任务) |
| `destructible` | 障碍       | 可破坏标记           |
| `hp`           | 障碍/资源  | 耐久/剩余生命        |

## 28. 监控与指标 (Metrics)

建议接入 Prometheus 维度：

- `map_resource_nodes_total`
- `map_monster_spawns_total`
- `map_territory_control_changes_total`
- `map_crystal_damage_sum`
- `map_parse_duration_ms` (加载耗时)
- `map_polygon_vertices_total`

## 29. 未来分层加载 (Progressive Streaming)

对于超大地图：

- 使用四叉树分块文件：`map_chunk_{x}_{y}.json`。
- 客户端基于视野 + 预取策略动态加载周边块。
- 服务器仅保留逻辑热点区块常驻内存。

## 30. 回滚机制 (Rollback Strategy)

若新地图上线后出现严重问题：

- 保存最近 3 个版本文件 + 哈希。
- 运行 `yarn map:rollback --to <hash>` 恢复。
- Redis 发布频道 `map_version_change` 让所有房间重载低风险层 (如资源、怪物)；高风险层(障碍/多边形)延迟刷新或等新房间生效。

---

扩展规范到此，后续如出现新图层或新字段，请在 PR 中先更新本文件再合并。

## 31. ParsedMapData 结构与解析约定 (ParsedMapData & Parser Conventions)

本节定义服务器端 `parseTileMap()` 产出的强类型结构 `ParsedMapData` 以及房间/系统的使用方式，便于开发理解与扩展。

### 概览

- 源数据：Tiled JSON (`TiledMap`)，文件位于 `config/map/mmo.json`。
- 解析：`parseTileMap(map, { onWarn })` 返回 `{ map: ParsedMapData, diag }`。
- 目标：集中管理命名约定、属性类型转换与对象分类，使房间逻辑保持简洁与稳健。

### ParsedMapData 字段

- **world**: `{ widthPx: number, heightPx: number, tileWidth: number, tileHeight: number }`
- **territories**: `Array<{ id: string, name: string, bounds: { x:number, y:number, w:number, h:number }, props: Record<string, unknown> }>`
- **crystals**: `Array<{ id: string, position: { x:number, y:number }, radius:number, props: Record<string, unknown> }>`
- **resources**: `Array<{ id: string, type: 'gold'|'tree'|'other', position: { x:number, y:number }, props: Record<string, unknown> }>`
- **monsterSpawns**: `Array<{ id: string, position: { x:number, y:number }, count?: number, radius?: number, props: Record<string, unknown> }>`
- **teleports**: `Array<{ id: string, position: { x:number, y:number }, target?: string, props: Record<string, unknown> }>`
- **obstaclePolygons**: `Array<{ id: string, points: Array<{ x:number, y:number }>, props: Record<string, unknown> }>`
- **obstacleTileLayers**: `Array<{ id: string, name: string, data: number[], props: Record<string, unknown> }>`

### 命名约定

- 领地：对象 `name` 以 `territory_` 开头
- 晶石：对象 `name` 以 `crystal_` 开头
- 资源：`gold_*`、`tree_*` 或 `resource_*`
- 怪物出生：`spawn_monster` 或 `type === 'monster'`
- 传送：`teleport_*` 或 `type === 'teleport'`
- 障碍：`objectgroup` 中的多边形对象，或 `tilelayer` 的 `obstacle_*` 图层

### 属性类型转换 (smartCast)

- 将字符串属性转换为数字/布尔 (当符合格式)；保留 JSON 字符串并尝试解析。
- 若 Tiled 属性已显式类型，优先使用显式类型。
- 统一输出 `props: Record<string, unknown>`，供系统读取领域字段。

### 房间集成模式

- 在 `onCreate()` 仅解析一次：`const { map, diag } = parseTileMap(tileMap, { onWarn })`。
- 保存在房间：`this.parsedMap = map`，供后续系统 (刷新、指标、寻路) 复用。
- 初始化：依据 `map.world` 设置边界；依据 `map.monsterSpawns`、`map.resources` 等生成初始实体。

### 诊断信息 (Diagnostics)

- `diag.polygonVertexTotal`：多边形顶点总数，便于快速复杂度评估。
- `onWarn`：对未识别对象名/缺失属性/异常图层发出结构化警告。
- 房间在启动时记录诊断，有助监控与调试 (Prometheus/日志)。

### 设计动机 (Rationale)

- 关注点分离：将 Tiled 细节与房间/系统逻辑解耦。
- 强类型：减少运行时错误，提升 IDE 辅助与协作效率。
- 可测试性：对 `parseTileMap()` 进行单元测试；房间只消费保证形状的数据。
- 可演进性：未来新增区域/导航网/范围效果等，仅需扩展解析与类型，无需改动房间核心逻辑。
