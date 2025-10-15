# Prometheus Metrics Integration

This document describes the Prometheus metrics available in the MMO server.

## Overview

The server uses `prom-client` for standardized Prometheus metrics collection. Metrics are exposed at `/metrics` in Prometheus exposition format.

## Endpoints

- **`GET /metrics`** - Prometheus metrics (standard format, compatible with Prometheus scraping)
- **`GET /metrics.json`** - JSON format metrics (legacy, for debugging)
- **`GET /metrics/legacy`** - Legacy Prometheus text format (backward compatibility)

## Metric Categories

### Server Metrics

**Event Loop Lag**
```
colyseus_event_loop_lag_ms
```
Measures event loop lag in milliseconds. High values indicate server performance issues.

**Room Count**
```
colyseus_room_count
```
Total number of active game rooms.

**Total Clients**
```
colyseus_total_clients
```
Total number of connected clients across all rooms.

### Room Metrics

**Room Clients**
```
colyseus_room_clients{roomId="..."}
```
Number of clients per room.

**Tick Duration**
```
colyseus_tick_duration_ms{roomId="..."}
```
Histogram of game tick durations. Use for performance analysis:
- `histogram_quantile(0.99, rate(colyseus_tick_duration_ms_bucket[5m]))` - P99 tick time
- `histogram_quantile(0.50, rate(colyseus_tick_duration_ms_bucket[5m]))` - Median tick time

**Messages Received**
```
colyseus_messages_total{roomId="...", messageType="..."}
```
Counter of messages by room and type (move, attack, chat, etc.).

**Patches Sent**
```
colyseus_patches_total{roomId="..."}
```
Number of state patches sent to clients.

**Patch Bytes**
```
colyseus_patch_bytes{roomId="..."}
```
Histogram of patch sizes in bytes.

**Slow Ticks**
```
colyseus_slow_ticks_total{roomId="..."}
```
Count of slow ticks (exceeding threshold).

### Game Business Metrics

**Player Joins**
```
game_player_joins_total{roomId="..."}
```
Total player joins.

**Player Leaves**
```
game_player_leaves_total{roomId="..."}
```
Total player leaves/disconnects.

**Combat Encounters**
```
game_combat_total{combatType="pvp|pve"}
```
Number of combat encounters by type.

**Damage Dealt**
```
game_damage_dealt_total{skillId="..."}
```
Total damage dealt, labeled by skill/source.

**Skills Used**
```
game_skills_used_total{skillId="..."}
```
Count of skill usage by skill ID.

**Quest Completions**
```
game_quest_completions_total{questId="..."}
```
Number of quest completions.

**Achievements Unlocked**
```
game_achievements_unlocked_total{achievementId="..."}
```
Count of achievement unlocks.

**Chat Messages**
```
game_chat_messages_total{channel="..."}
```
Chat messages sent by channel.

**Player Level**
```
game_player_level
```
Histogram of player levels.

**Player Deaths & Kills**
```
game_player_deaths_total
game_player_kills_total
```
Combat statistics.

**Item Drops**
```
game_item_drops_total{itemId="...", rarity="..."}
```
Item drops by item ID and rarity.

**Experience Gained**
```
game_experience_gained_total{source="quest|combat|achievement"}
```
Total experience gained by source.

## Default Node.js Metrics

The server also collects default Node.js metrics (prefixed with `colyseus_`):
- Process CPU usage
- Memory usage (heap, RSS)
- Garbage collection stats
- Active handles and requests

## Grafana Integration

### Sample PromQL Queries

**Average Tick Time (5m window)**
```promql
rate(colyseus_tick_duration_ms_sum[5m]) / rate(colyseus_tick_duration_ms_count[5m])
```

**P99 Tick Time**
```promql
histogram_quantile(0.99, rate(colyseus_tick_duration_ms_bucket[5m]))
```

**Message Rate**
```promql
rate(colyseus_messages_total[1m])
```

**Online Players**
```promql
sum(colyseus_room_clients)
```

**Most Used Skills**
```promql
topk(5, rate(game_skills_used_total[5m]))
```

**Quest Completion Rate**
```promql
rate(game_quest_completions_total[5m])
```

### Grafana Dashboard

Import the included Grafana dashboard configuration from `docs/grafana-dashboard.json` (to be created).

## Prometheus Configuration

Add to your `prometheus.yml`:

```yaml
scrape_configs:
  - job_name: 'mmo-server'
    static_configs:
      - targets: ['localhost:2567']
    metrics_path: /metrics
    scrape_interval: 15s
```

## Alerting Rules

Example alert rules:

```yaml
groups:
  - name: mmo_server
    rules:
      # High event loop lag
      - alert: HighEventLoopLag
        expr: colyseus_event_loop_lag_ms > 100
        for: 1m
        annotations:
          summary: "High event loop lag detected"
          
      # Slow ticks
      - alert: SlowGameTicks
        expr: rate(colyseus_slow_ticks_total[5m]) > 0.1
        for: 2m
        annotations:
          summary: "Game ticks are slow"
          
      # No players
      - alert: NoPlayersOnline
        expr: sum(colyseus_room_clients) == 0
        for: 10m
        annotations:
          summary: "No players online for 10 minutes"
```

## Development

### Adding New Metrics

1. Define the metric in `src/instrumentation/prometheusMetrics.ts`:
```typescript
export const myMetric = new Counter({
  name: 'game_my_metric_total',
  help: 'Description of my metric',
  labelNames: ['label1', 'label2'],
  registers: [register]
});
```

2. Create helper function:
```typescript
export function recordMyMetric(label1: string, label2: string): void {
  myMetric.labels(label1, label2).inc();
}
```

3. Use in game code:
```typescript
import * as prom from '../instrumentation/prometheusMetrics';

// Record event
prom.recordMyMetric('value1', 'value2');
```

### Testing Metrics

```bash
# View metrics
curl http://localhost:2567/metrics

# View JSON format
curl http://localhost:2567/metrics.json | jq
```

## Performance Considerations

- Metrics collection is designed for minimal overhead
- Histograms use pre-defined buckets to avoid cardinality explosion
- Labels are used judiciously to prevent metric explosion
- All metrics are thread-safe and lock-free

## Migration from Legacy Metrics

The legacy metrics system (`toPrometheusText()`) is still available at `/metrics/legacy` for backward compatibility. It will be deprecated in a future release.

New code should use the Prometheus metrics from `prometheusMetrics.ts` module.
