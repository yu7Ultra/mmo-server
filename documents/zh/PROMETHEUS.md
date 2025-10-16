# Prometheus指标集成

本文档描述了MMO服务器中可用的Prometheus指标。

## 概述

服务器使用 `prom-client` 进行标准化的Prometheus指标收集。指标在 `/metrics` 以Prometheus展示格式公开。

## 端点

- **`GET /metrics`** - Prometheus指标 (标准格式，与Prometheus抓取兼容)
- **`GET /metrics.json`** - JSON格式指标 (遗留格式，用于调试)
- **`GET /metrics/legacy`** - 遗留Prometheus文本格式 (向后兼容)

## 指标类别

### 服务器指标

**事件循环延迟**
```
colyseus_event_loop_lag_ms
```
以毫秒为单位测量事件循环延迟。高值表示服务器性能问题。

**房间数量**
```
colyseus_room_count
```
活跃游戏房间的总数。

**总客户端数**
```
colyseus_total_clients
```
所有房间中连接的客户端总数。

### 房间指标

**房间客户端**
```
colyseus_room_clients{roomId="..."}
```
每个房间的客户端数量。

**Tick持续时间**
```
colyseus_tick_duration_ms{roomId="..."}
```
游戏tick持续时间的直方图。用于性能分析：
- `histogram_quantile(0.99, rate(colyseus_tick_duration_ms_bucket[5m]))` - P99 tick时间
- `histogram_quantile(0.50, rate(colyseus_tick_duration_ms_bucket[5m]))` - 中位tick时间

**接收的消息**
```
colyseus_messages_total{roomId="...", messageType="..."}
```
按房间和类型统计的消息计数器 (move, attack, chat等)。

**发送的补丁**
```
colyseus_patches_total{roomId="..."}
```
发送给客户端的状态补丁数量。

**补丁字节数**
```
colyseus_patch_bytes{roomId="..."}
```
补丁大小的字节直方图。

**慢Tick**
```
colyseus_slow_ticks_total{roomId="..."}
```
超过阈值的慢tick计数。

### 游戏业务指标

**玩家加入**
```
game_player_joins_total{roomId="..."}
```
玩家加入总数。

**玩家离开**
```
game_player_leaves_total{roomId="..."}
```
玩家离开/断开连接总数。

**战斗遭遇**
```
game_combat_total{combatType="pvp|pve"}
```
按类型统计的战斗遭遇数量。

**造成伤害**
```
game_damage_dealt_total{skillId="..."}
```
按技能/来源标记的总伤害输出。

**使用的技能**
```
game_skills_used_total{skillId="..."}
```
按技能ID统计的技能使用计数。

**任务完成**
```
game_quest_completions_total{questId="..."}
```
任务完成数量。

**解锁成就**
```
game_achievements_unlocked_total{achievementId="..."}
```
成就解锁计数。

**聊天消息**
```
game_chat_messages_total{channel="..."}
```
按频道统计的发送聊天消息。

**玩家等级**
```
game_player_level
```
玩家等级的直方图。

**玩家死亡和击杀**
```
game_player_deaths_total
game_player_kills_total
```
战斗统计。

**物品掉落**
```
game_item_drops_total{itemId="...", rarity="..."}
```
按物品ID和稀有度统计的物品掉落。

**获得的经验**
```
game_experience_gained_total{source="quest|combat|achievement"}
```
按来源统计的总经验获得。

## 默认Node.js指标

服务器还收集默认的Node.js指标 (前缀为 `colyseus_`)：
- 进程CPU使用率
- 内存使用率 (堆、RSS)
- 垃圾回收统计
- 活跃句柄和请求

## Grafana集成

### 示例PromQL查询

**平均Tick时间 (5分钟窗口)**
```promql
rate(colyseus_tick_duration_ms_sum[5m]) / rate(colyseus_tick_duration_ms_count[5m])
```

**P99 Tick时间**
```promql
histogram_quantile(0.99, rate(colyseus_tick_duration_ms_bucket[5m]))
```

**消息速率**
```promql
rate(colyseus_messages_total[1m])
```

**在线玩家**
```promql
sum(colyseus_room_clients)
```

**最常用技能**
```promql
topk(5, rate(game_skills_used_total[5m]))
```

**任务完成率**
```promql
rate(game_quest_completions_total[5m])
```

### Grafana仪表板

从 `docs/grafana-dashboard.json` 导入包含的Grafana仪表板配置 (待创建)。

## Prometheus配置

添加到您的 `prometheus.yml`：

```yaml
scrape_configs:
  - job_name: 'mmo-server'
    static_configs:
      - targets: ['localhost:2567']
    metrics_path: /metrics
    scrape_interval: 15s
```

## 警报规则

示例警报规则：

```yaml
groups:
  - name: mmo_server
    rules:
      # 高事件循环延迟
      - alert: HighEventLoopLag
        expr: colyseus_event_loop_lag_ms > 100
        for: 1m
        annotations:
          summary: "检测到高事件循环延迟"
          
      # 慢tick
      - alert: SlowGameTicks
        expr: rate(colyseus_slow_ticks_total[5m]) > 0.1
        for: 2m
        annotations:
          summary: "游戏tick很慢"
          
      # 无玩家在线
      - alert: NoPlayersOnline
        expr: sum(colyseus_room_clients) == 0
        for: 10m
        annotations:
          summary: "10分钟内无玩家在线"
```

## 开发

### 添加新指标

1. 在 `src/instrumentation/prometheusMetrics.ts` 中定义指标：
```typescript
export const myMetric = new Counter({
  name: 'game_my_metric_total',
  help: '我的指标描述',
  labelNames: ['label1', 'label2'],
  registers: [register]
});
```

2. 创建辅助函数：
```typescript
export function recordMyMetric(label1: string, label2: string): void {
  myMetric.labels(label1, label2).inc();
}
```

3. 在游戏代码中使用：
```typescript
import * as prom from '../instrumentation/prometheusMetrics';

// 记录事件
prom.recordMyMetric('value1', 'value2');
```

### 测试指标

```bash
# 查看指标
curl http://localhost:2567/metrics

# 查看JSON格式
curl http://localhost:2567/metrics.json | jq
```

## 性能考虑

- 指标收集设计为最小开销
- 直方图使用预定义桶以避免基数爆炸
- 谨慎使用标签以防止指标爆炸
- 所有指标都是线程安全的和无锁的

## 从遗留指标迁移

遗留指标系统 (`toPrometheusText()`) 在 `/metrics/legacy` 仍然可用以保持向后兼容性。它将在未来版本中弃用。

新代码应使用 `prometheusMetrics.ts` 模块中的Prometheus指标。