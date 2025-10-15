# 性能优化指南

本文档描述了 MMO 服务器中的性能优化和最佳实践。

## 架构

### 实体组件系统 (ECS)

服务器使用 Miniplex ECS 以获得最佳性能：

```typescript
// 不好：遍历所有实体
for (const entity of allEntities) {
  if (entity.player && entity.position) {
    // 处理
  }
}

// 好：预过滤查询
const entities = world.with('player', 'position');
for (const entity of entities) {
  // 处理 - 仅遍历具有所需组件的实体
}
```

**优势**:
- O(1) 组件查找
- 缓存友好的迭代
- 热循环中无条件检查

### 速率限制

使用令牌桶算法进行高效的速率限制：

```typescript
const limiter = new RateLimiter(10, 1); // 10 个令牌，每秒补充 1 个

// O(1) 检查
if (limiter.checkLimit(userId)) {
  // 允许操作
}
```

**性能**:
- O(1) 时间复杂度
- 最小内存开销
- 自动清理旧条目

### 对象池

减少垃圾回收压力：

```typescript
// 不使用池化
function createProjectile() {
  return new Projectile(); // 每次都新分配
}

// 使用池化
const pool = new ObjectPool(
  () => new Projectile(),
  (p) => p.reset(),
  100 // 预分配 100 个
);

const projectile = pool.acquire(); // 重用现有对象
// 使用 projectile
pool.release(projectile); // 归还到池中
```

**优势**:
- 减少 GC 暂停
- 降低内存碎片
- 更快的对象创建

## 系统优化

### 战斗系统

**优化措施**:
1. **距离检查**: 使用距离平方以避免 sqrt()
```typescript
// 不好
const distance = Math.sqrt(dx*dx + dy*dy);
if (distance < range) { /* 攻击 */ }

// 好
const distSq = dx*dx + dy*dy;
if (distSq < range*range) { /* 攻击 */ }
```

2. **攻击冷却**: 每个实体预计算
3. **伤害公式**: 最小化浮点运算
4. **统计追踪**: 批量更新，而非每次命中

**Tick 性能**: 100 个实体战斗约 ~0.5ms

### 技能系统

**优化措施**:
1. **冷却追踪**: 使用时间戳，非间隔定时器
2. **增益管理**: 延迟过期检查
3. **技能查找**: 使用 Map 而非数组搜索
4. **效果应用**: 批量状态更新

**Tick 性能**: 50 个激活技能约 ~0.3ms

### 任务系统

**优化措施**:
1. **进度检查**: 仅在相关事件时触发
2. **完成检测**: 延迟检查（不是每次 tick）
3. **任务查找**: 使用索引 Map

**Tick 性能**: 可忽略不计（事件驱动）

### 聊天系统

**优化措施**:
1. **速率限制**: 令牌桶（O(1)）
2. **消息过滤**: 编译的正则表达式
3. **历史限制**: 环形缓冲区（最多 50 条消息）
4. **广播**: 批量状态更新

**性能**: 每条消息 <0.1ms

### 语音频道系统

**优化措施**:
1. **对等架构**: 服务器上无媒体处理
2. **信令中继**: 最小消息转发
3. **频道查找**: 使用 Map 而非数组
4. **成员追踪**: 高效的集合操作

**性能**: 信令每条消息 <0.1ms（无媒体流）

## 监控和分析

### 自定义指标

服务器公开详细的性能指标：

**端点**: `GET /metrics.json`

```json
{
  "process": {
    "pid": 12345,
    "uptimeSeconds": 42,
    "memory": { "rss": 12345678 }
  },
  "aggregate": {
    "roomCount": 1,
    "totalClients": 10,
    "totalMessages": 120,
    "totalPatches": 240
  },
  "rooms": [{
    "roomId": "my_room_id",
    "clients": 10,
    "tickCount": 840,
    "tickAvgMs": 2.3,
    "tickP99Ms": 5.7,
    "messagesReceived": 120,
    "moveMessages": 100,
    "patchesSent": 240,
    "bytesEstimate": 40960
  }]
}
```

### Prometheus 集成

**端点**: `GET /metrics`

```
# HELP colyseus_event_loop_lag_ms 事件循环延迟
# TYPE colyseus_event_loop_lag_ms gauge
colyseus_event_loop_lag_ms 1.23
colyseus_room_count 1
colyseus_room_clients{roomId="my_room_id"} 10
colyseus_room_tick_avg_ms{roomId="my_room_id"} 2.3
```

添加到 Prometheus 配置：
```yaml
scrape_configs:
  - job_name: colyseus
    static_configs:
      - targets: ['your-host:2567']
    metrics_path: /metrics
```

### CPU 性能分析

触发 CPU 性能分析（默认 5 秒）：
```bash
curl -X POST "http://localhost:2567/profile/cpu?durationMs=5000"
```

返回的 JSON 包含生成的 `.cpuprofile` 文件路径（位于 `profiles/`）。

抓取堆快照：
```bash
curl -X POST http://localhost:2567/profile/heap
```

列出现有文件：
```bash
curl http://localhost:2567/profile/list
```

命令行方式生成 CPU 性能分析（设置持续时间毫秒）：
```bash
yarn build
D=10000 yarn profile:cpu
```

### 查看火焰图

查看火焰图的方法：
1. 打开 Chrome DevTools -> Performance -> Load profile -> 选择生成的 `.cpuprofile` 文件
2. 或使用 https://www.speedscope.app 加载 `.cpuprofile` / `.json` 文件获得交互式火焰图

### 推荐的性能分析流程

1. 在压测启动后 30 秒触发一次 10 秒 CPU Profile
2. 对比多次 Profile，关注：
   - `movementSystem`
   - `syncSystem`
   - 序列化热点（patch broadcast）
   - GC 暂停

如需自动化，可以在负载脚本中定时调用 `/profile/cpu` 并将结果上传到对象存储或日志系统。

## 最佳实践

### Tick 循环优化

```typescript
// 不好：在 tick 中创建对象
onTick(deltaTime) {
  const updates = []; // 每次 tick 新建数组
  // 处理
}

// 好：重用缓冲区
private updates = [];
onTick(deltaTime) {
  this.updates.length = 0; // 清空而非重建
  // 处理
}
```

### 状态更新

```typescript
// 不好：频繁的小更新
player.x = newX;
player.y = newY;
player.health = newHealth;
// 触发 3 次状态同步

// 好：批量更新
Object.assign(player, {
  x: newX,
  y: newY,
  health: newHealth
});
// 触发 1 次状态同步
```

### 避免字符串拼接

```typescript
// 不好：热循环中的字符串操作
for (const player of players) {
  const key = player.id + ':' + player.name; // 每次分配
}

// 好：使用模板字面量或预计算
const cache = new Map();
for (const player of players) {
  let key = cache.get(player.id);
  if (!key) {
    key = `${player.id}:${player.name}`;
    cache.set(player.id, key);
  }
}
```

### 数组操作

```typescript
// 不好：splice() 在热循环中
for (let i = 0; i < array.length; i++) {
  if (shouldRemove(array[i])) {
    array.splice(i, 1); // O(n) 每次移除
    i--;
  }
}

// 好：反向迭代或标记-清除
for (let i = array.length - 1; i >= 0; i--) {
  if (shouldRemove(array[i])) {
    array[i] = array[array.length - 1];
    array.pop(); // O(1)
  }
}
```

## 负载测试

使用模拟客户端生成负载：

```bash
# 构建模拟客户端工具
cd client && yarn build:mock

# 生成 200 个模拟客户端，每秒 1 个
node client/dist/command/spawn-mock.js --count 200 --interval 1000
```

### 预期性能

在 4 核 CPU、8GB RAM 下：
- **100 个客户端**: ~2-3ms 平均 tick 时间
- **200 个客户端**: ~4-6ms 平均 tick 时间
- **500 个客户端**: ~10-15ms 平均 tick 时间

### 瓶颈

常见的性能瓶颈：
1. **状态同步**: 大状态对象
2. **消息处理**: 每个客户端每秒 >10 条消息
3. **碰撞检测**: 未优化的距离检查
4. **垃圾回收**: 每次 tick 过度分配

## 横向扩展

### Redis 集成

启用 Redis 以进行横向扩展：

```typescript
// app.config.ts
import { RedisPresence } from '@colyseus/redis-presence';
import { RedisDriver } from '@colyseus/redis-driver';

export default config({
  options: {
    presence: new RedisPresence(),
    driver: new RedisDriver()
  }
});
```

### 负载均衡

使用 Nginx 或 HAProxy 进行负载均衡：

```nginx
upstream colyseus {
  least_conn;
  server server1:2567;
  server server2:2567;
  server server3:2567;
}

server {
  listen 80;
  location / {
    proxy_pass http://colyseus;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
  }
}
```

## 内存管理

### 监控内存使用

```bash
# 堆快照
curl -X POST http://localhost:2567/profile/heap

# 检查指标
curl http://localhost:2567/metrics.json | jq '.process.memory'
```

### 内存泄漏检测

常见的泄漏来源：
1. 事件监听器未清理
2. 定时器未清除
3. 缓存无限增长
4. 闭包捕获大对象

**修复**:
```typescript
// 不好
onJoin() {
  setInterval(() => {}, 1000); // 永不清除
}

// 好
private interval: NodeJS.Timeout;
onJoin() {
  this.interval = setInterval(() => {}, 1000);
}
onDispose() {
  clearInterval(this.interval);
}
```

## 总结

关键优化原则：
1. ✅ 使用 ECS 进行高效查询
2. ✅ 使用对象池最小化分配
3. ✅ 批量状态更新
4. ✅ 定期分析性能
5. ✅ 监控慢 tick
6. ✅ 使用 Redis 进行横向扩展
7. ✅ 对热路径进行负载测试

遵循这些实践可以轻松处理 500+ 并发玩家。
