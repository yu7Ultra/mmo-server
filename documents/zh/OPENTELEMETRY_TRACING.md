# OpenTelemetry分布式追踪

使用OpenTelemetry在MMO服务器中进行分布式追踪的完整指南。

## 概述

OpenTelemetry为MMO服务器提供全面的分布式追踪，允许您：
- 跟踪所有阶段的游戏循环性能
- 实时识别性能瓶颈
- 监控网络操作和广播
- 追踪玩家行为和系统交互
- 调试复杂的分布式场景
- 分析端到端请求流

## 功能特性

### 追踪的操作

**游戏循环阶段：**
- 输入处理
- 移动系统
- 战斗系统
- 技能系统
- 任务系统
- 同步/广播阶段

**网络操作：**
- 按类型处理消息
- 广播操作
- 补丁生成和发送

**未来支持：**
- 数据库操作
- 外部API调用
- 缓存操作
- 文件I/O操作

### 支持的导出器

1. **Jaeger** (推荐用于生产)
   - 丰富的UI用于追踪可视化
   - 服务依赖图
   - 性能分析

2. **Zipkin** (替代方案)
   - 轻量级且简单
   - 良好的Docker集成

3. **Console** (开发环境)
   - 调试输出到控制台
   - 无外部依赖

## 快速开始

### 1. 安装Jaeger (推荐)

**使用Docker：**
```bash
docker run -d --name jaeger \
  -p 5775:5775/udp \
  -p 6831:6831/udp \
  -p 6832:6832/udp \
  -p 5778:5778 \
  -p 16686:16686 \
  -p 14268:14268 \
  -p 14250:14250 \
  -p 9411:9411 \
  jaegertracing/all-in-one:latest
```

**访问Jaeger UI：**
在浏览器中打开 `http://localhost:16686`

### 2. 启用追踪

**环境变量：**
```bash
# 启用追踪
TRACING_ENABLED=true

# 选择导出器 (jaeger, zipkin, console)
TRACING_EXPORTER=jaeger

# Jaeger端点 (默认: http://localhost:14268/api/traces)
JAEGER_ENDPOINT=http://localhost:14268/api/traces

# Zipkin端点 (默认: http://localhost:9411/api/v2/spans)
ZIPKIN_ENDPOINT=http://localhost:9411/api/v2/spans
```

**启动服务器：**
```bash
TRACING_ENABLED=true TRACING_EXPORTER=jaeger yarn start
```

### 3. 查看追踪

1. 在 `http://localhost:16686` 打开Jaeger UI
2. 选择服务: `mmo-server`
3. 点击"Find Traces"
4. 探索单个追踪和跨度

## API参考

### 初始化

```typescript
import { initializeTelemetry, shutdownTelemetry } from './instrumentation/telemetry';

// 服务器启动时初始化
initializeTelemetry();

// 服务器停止时关闭
process.on('SIGINT', async () => {
  await shutdownTelemetry();
  process.exit(0);
});
```

### 基本追踪

**创建跨度：**
```typescript
import { startSpan } from './instrumentation/telemetry';

const span = startSpan('my-operation', {
  'user.id': userId,
  'operation.type': 'custom',
});

try {
  // 您的代码在这里
  span.setStatus({ code: SpanStatusCode.OK });
} catch (error) {
  span.setStatus({ code: SpanStatusCode.ERROR });
  span.recordException(error);
} finally {
  span.end();
}
```

**使用Async/Await：**
```typescript
import { withSpan } from './instrumentation/telemetry';

await withSpan('my-operation', async (span) => {
  // 您的代码在这里
  span.setAttribute('custom.attribute', 'value');
  return result;
}, {
  'user.id': userId,
});
```

### 游戏循环追踪

**追踪整个Tick：**
```typescript
import { traceGameTick } from './instrumentation/telemetry';

const tickSpan = traceGameTick(roomId, tickNumber);

try {
  // 处理tick阶段
  const inputSpan = traceInputPhase(roomId, messageCount);
  // ... 处理输入
  inputSpan.end();

  const movementSpan = traceMovementPhase(roomId, playerCount);
  // ... 处理移动
  movementSpan.end();

  const combatSpan = traceCombatPhase(roomId, combatCount);
  // ... 处理战斗
  combatSpan.end();

  const syncSpan = traceSyncPhase(roomId, patchSize);
  // ... 广播更新
  syncSpan.end();

  tickSpan.setStatus({ code: SpanStatusCode.OK });
} catch (error) {
  tickSpan.setStatus({ code: SpanStatusCode.ERROR });
  tickSpan.recordException(error);
} finally {
  tickSpan.end();
}
```

### 消息追踪

```typescript
import { traceMessage } from './instrumentation/telemetry';

onMessage('move', (client, message) => {
  const span = traceMessage(this.roomId, 'move', client.sessionId);
  
  try {
    // 处理消息
    span.setAttribute('message.x', message.x);
    span.setAttribute('message.y', message.y);
    
    span.setStatus({ code: SpanStatusCode.OK });
  } catch (error) {
    span.setStatus({ code: SpanStatusCode.ERROR });
    span.recordException(error);
  } finally {
    span.end();
  }
});
```

### 广播追踪

```typescript
import { traceBroadcast } from './instrumentation/telemetry';

const span = traceBroadcast(roomId, 'announcement', clients.length);
try {
  this.broadcast('announcement', message);
  span.setStatus({ code: SpanStatusCode.OK });
} finally {
  span.end();
}
```

## 追踪属性

### 标准属性

**游戏特定：**
- `room.id` - 房间标识符
- `player.id` - 玩家标识符
- `session.id` - 客户端会话ID
- `tick.number` - 游戏tick编号
- `message.type` - 消息类型
- `message.count` - 消息数量
- `player.count` - 玩家数量
- `combat.count` - 战斗数量
- `patch.size` - 补丁大小(字节)
- `client.count` - 客户端数量

**网络：**
- `http.method` - HTTP方法
- `http.status_code` - HTTP状态码
- `http.url` - HTTP URL

**数据库 (未来)：**
- `db.operation` - 操作 (find, insert, update, delete)
- `db.collection` - 集合/表名
- `db.query` - 查询字符串

### 自定义属性

```typescript
span.setAttribute('custom.key', 'value');
span.setAttribute('user.level', 42);
span.setAttribute('quest.id', 'quest_123');
```

## 事件

为重要时刻添加事件到跨度：

```typescript
import { addSpanEvent } from './instrumentation/telemetry';

addSpanEvent(span, 'player.leveled_up', {
  'old.level': 4,
  'new.level': 5,
});

addSpanEvent(span, 'combat.started', {
  'attacker.id': attackerId,
  'target.id': targetId,
});
```

## 采样

控制采样率以减少开销：

```typescript
// 在telemetry.ts配置中
import { TraceIdRatioBasedSampler } from '@opentelemetry/sdk-trace-base';

// 采样10%的追踪
sampler: new TraceIdRatioBasedSampler(0.1),
```

## 性能影响

**开销：**
- 最小CPU: 启用时<1-2%
- 内存: 每个跨度约100字节
- 网络: 异步批处理导出 (可忽略)

**最佳实践：**
- 在生产中使用采样 (10-50%)
- 在高频循环中只追踪关键路径
- 批处理导出以减少网络开销
- 监控导出器队列大小

## Jaeger UI指南

### 查找追踪

1. **服务**: 选择 `mmo-server`
2. **操作**: 按跨度名称过滤 (例如，`game.tick`)
3. **标签**: 按属性过滤 (例如，`room.id=my_room`)
4. **回溯**: 设置时间范围
5. **最小/最大持续时间**: 过滤慢追踪

### 分析追踪

**追踪视图：**
- 时间线可视化
- 跨度层次结构
- 持续时间细分
- 错误突出显示

**跨度详情：**
- 属性 (标签)
- 事件 (日志)
- 进程信息
- 堆栈跟踪 (如果有错误)

**服务图：**
- 可视化服务依赖
- 请求流
- 错误率
- 延迟分布

### 常见查询

**查找慢tick：**
```
service=mmo-server operation=game.tick minDuration=20ms
```

**查找错误：**
```
service=mmo-server error=true
```

**查找特定房间：**
```
service=mmo-server room.id=abc123
```

**按玩家查找：**
```
service=mmo-server player.id=player_456
```

## 集成示例

### 房间集成

```typescript
import { initializeTelemetry } from './instrumentation/telemetry';

export class MyRoom extends Room<MyRoomState> {
  onCreate(options: any) {
    // 带追踪的tick循环
    this.setSimulationInterval((deltaTime) => {
      const tickSpan = traceGameTick(this.roomId, this.tickCounter);
      
      try {
        // 游戏循环阶段
        this.processInputs();
        this.updateMovement(deltaTime);
        this.updateCombat(deltaTime);
        this.broadcastState();
        
        tickSpan.setStatus({ code: SpanStatusCode.OK });
      } catch (error) {
        tickSpan.setStatus({ code: SpanStatusCode.ERROR });
        tickSpan.recordException(error);
      } finally {
        tickSpan.end();
      }
    });
  }
}
```

### 系统集成

```typescript
export function combatSystem(world: World<Entity>) {
  const span = startSpan('system.combat');
  
  try {
    const combatEntities = world.where(e => e.inCombat);
    span.setAttribute('entity.count', combatEntities.length);
    
    combatEntities.forEach(entity => {
      // 处理战斗
    });
    
    span.setStatus({ code: SpanStatusCode.OK });
  } finally {
    span.end();
  }
}
```

## 部署

### Docker Compose

```yaml
version: '3'
services:
  jaeger:
    image: jaegertracing/all-in-one:latest
    ports:
      - "5775:5775/udp"
      - "6831:6831/udp"
      - "6832:6832/udp"
      - "5778:5778"
      - "16686:16686"
      - "14268:14268"
    environment:
      - COLLECTOR_ZIPKIN_HOST_PORT=:9411
  
  mmo-server:
    build: .
    ports:
      - "2567:2567"
    environment:
      - TRACING_ENABLED=true
      - TRACING_EXPORTER=jaeger
      - JAEGER_ENDPOINT=http://jaeger:14268/api/traces
    depends_on:
      - jaeger
```

### Kubernetes

```yaml
apiVersion: v1
kind: Service
metadata:
  name: jaeger
spec:
  ports:
  - port: 16686
    name: ui
  - port: 14268
    name: collector
  selector:
    app: jaeger
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: mmo-server
spec:
  template:
    spec:
      containers:
      - name: server
        env:
        - name: TRACING_ENABLED
          value: "true"
        - name: JAEGER_ENDPOINT
          value: "http://jaeger:14268/api/traces"
```

## 故障排除

### 追踪未出现

**检查遥测是否启用：**
```bash
# 应该看到: [Telemetry] OpenTelemetry initialized successfully
grep -i telemetry server.log
```

**验证Jaeger正在运行：**
```bash
curl http://localhost:14268/api/traces
```

**检查导出器配置：**
```typescript
console.log('TRACING_ENABLED:', process.env.TRACING_ENABLED);
console.log('JAEGER_ENDPOINT:', process.env.JAEGER_ENDPOINT);
```

### 内存使用过高

**降低采样率：**
```typescript
// 只采样10%的请求
sampler: new TraceIdRatioBasedSampler(0.1),
```

**限制跨度属性：**
```typescript
// 避免大的属性
span.setAttribute('config', JSON.stringify(largeObject)); // ❌ 不好
span.setAttribute('config.size', largeObject.length);     // ✅ 好
```

### 性能下降

**有和没有追踪时进行性能分析：**
```bash
# 没有追踪
TRACING_ENABLED=false yarn start

# 有追踪
TRACING_ENABLED=true yarn start
```

**使用异步导出：**
确保使用批处理跨度处理器 (默认)

## 最佳实践

1. **追踪粒度**: 平衡细节与开销
2. **采样**: 在生产中使用 (10-50%)
3. **属性**: 使用语义名称和标准约定
4. **事件**: 为重要时刻添加
5. **错误**: 始终记录异常
6. **上下文传播**: 确保上下文通过异步操作流动
7. **资源清理**: 在finally块中结束跨度
8. **测试**: 启用追踪时进行测试

## 未来增强功能

- [ ] 流行库的自动检测
- [ ] Jaeger中的自定义仪表板
- [ ] 基于追踪数据的警报
- [ ] 与指标集成 (示例)
- [ ] 长期追踪存储
- [ ] 基于追踪的测试

## 资源

- [OpenTelemetry文档](https://opentelemetry.io/docs/)
- [Jaeger文档](https://www.jaegertracing.io/docs/)
- [语义约定](https://opentelemetry.io/docs/specs/semconv/)
- [最佳实践](https://opentelemetry.io/docs/concepts/instrumenting/)