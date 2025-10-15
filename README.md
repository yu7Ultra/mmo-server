# Colyseus MMO Server

Production-ready Colyseus MMO server (TypeScript) with comprehensive game systems, ECS architecture, uWebSockets transport, Redis-ready configuration, custom performance metrics, and testing setup.

## Features

This server includes essential MMO features:
- ✅ **Combat System**: PvE/PvP combat with damage calculation and regeneration
- ✅ **Skill System**: 4 default skills with cooldowns and mana costs
- ✅ **Quest System**: Progress tracking and auto-completion
- ✅ **Achievement System**: 9 default achievements
- ✅ **Leaderboard**: Top 10 player rankings
- ✅ **Chat System**: Rate-limited chat with profanity filtering
- ✅ **Social System**: Friend management
- ✅ **Voice Communication**: WebRTC-based voice channels with peer-to-peer audio
- ✅ **Security**: Rate limiting, input validation, and XSS protection
- ✅ **Performance**: Object pooling, efficient ECS queries, minimal GC

## Documentation

📚 **Complete documentation is available in the [documents/](./documents/) directory**

- **English**: [documents/en/](./documents/en/) - Features, performance, usage examples, voice integration
- **中文**: [documents/zh/](./documents/zh/) - 客户端文档、Miniplex 指南、使用示例

Quick links:
- [Feature Documentation](./documents/en/FEATURES.md) - Detailed system documentation
- [Usage Examples](./documents/en/USAGE_EXAMPLES.md) - Code examples and integration
- [Performance Guide](./documents/en/PERFORMANCE.md) - Optimization and profiling
- [Voice Integration](./documents/en/VOICE_INTEGRATION.md) - WebRTC voice communication setup

## Installation

1. Ensure you have Node.js installed.
2. Install dependencies: `yarn install`

## Running the Server

`yarn start`

The server will start on port 2567.

## Development

-- Rooms are defined in the `src/rooms/` directory.
-- Schema definitions are in `src/schemas/`.
-- ECS entities & systems live under `src/entities/` and `src/systems/`.
-- Custom metrics instrumentation in `src/instrumentation/metrics.ts`.
-- Security utilities in `src/utils/security.ts`.
-- Frontend client (Vite + Pixi.js) in `client/` built into `client/dist`.
-- Load testing / mock clients in `client/src/command/`.

### Client Application

A fully-featured MMO game client is included in the `client/` directory with:
- ✅ **8 UI Panels**: Controls, Player Stats, Skills, Quests, Achievements, Leaderboard, Chat, Game Canvas
- ✅ **Complete Controls**: Arrow keys (movement), 1-4 (skills), Click (attack), Enter (chat)
- ✅ **Visual Feedback**: Health bars, mana bars, player names, cooldown timers
- ✅ **Real-time Sync**: All 20+ player properties synchronized from server

**Run the client:**
```bash
cd client
yarn install
yarn dev
# Opens at http://localhost:5173
```

**Build the client:**
```bash
cd client
yarn build
# Output in client/dist/
```

See [client/README.md](./client/README.md) for detailed client documentation or [documents/zh/CLIENT_README.md](./documents/zh/CLIENT_README.md) for Chinese version.

### Message Handlers

The server accepts the following client messages:

| Message | Payload | Description |
|---------|---------|-------------|
| `move` | `{ x: number, y: number }` | Set player velocity |
| `attack` | `{ targetId: string, skillId?: string }` | Attack target, optionally with skill |
| `chat` | `{ message: string, channel?: string }` | Send chat message |
| `quest` | `{ questId: string, action: 'abandon' }` | Manage quests |
| `friend` | `{ targetId: string, action: 'add'\|'remove' }` | Manage friends |
| `voice:join` | `{ channelId: string }` | Join voice channel |
| `voice:leave` | `{}` | Leave current voice channel |
| `voice:create` | `{ name: string, type: string, maxMembers?: number }` | Create new voice channel |
| `voice:mute` | `{ muted: boolean }` | Toggle mute status |
| `voice:deafen` | `{ deafened: boolean }` | Toggle deafen status |
| `voice:signal` | `{ to: string, type: string, data: any }` | WebRTC signaling relay |

All messages are rate-limited for security.

### Custom Metrics

Two endpoints are exposed by the Express integration:

1. `GET /metrics.json` - Structured JSON snapshot:
```json
{
	"process": { "pid": 12345, "uptimeSeconds": 42, "memory": { "rss": 12345678 } },
	"aggregate": { "roomCount": 1, "totalClients": 10, "totalMessages": 120, "totalPatches": 240 },
	"rooms": [
		{
			"roomId": "my_room_id",
			"clients": 10,
			"tickCount": 840,
			"tickAvgMs": 2.3,
			"tickP99Ms": 5.7,
			"messagesReceived": 120,
			"moveMessages": 100,
			"patchesSent": 240,
			"bytesEstimate": 40960
		}
	]
}
```

2. `GET /metrics` - Prometheus exposition format (scrape with Prometheus):
```
# HELP colyseus_event_loop_lag_ms event loop lag
# TYPE colyseus_event_loop_lag_ms gauge
colyseus_event_loop_lag_ms 1.23
colyseus_room_count 1
colyseus_room_clients{roomId="my_room_id"} 10
colyseus_room_tick_avg_ms{roomId="my_room_id"} 2.3
...
```

Add to Prometheus config:
```
scrape_configs:
	- job_name: colyseus
		static_configs:
			- targets: ['your-host:2567']
		metrics_path: /metrics
```

### Testing

Run test suite: `yarn test`

The test suite includes comprehensive tests for:
- Combat system (damage, regeneration, kill tracking)
- Skill system (cooldowns, mana costs, buffs)
- Quest system (progress tracking, completion, rewards)
- Achievement system (unlocking, progress)
- Chat system (rate limiting, filtering)
- Security utilities (rate limiting, input validation, object pooling)

### Development Loop

Use live reload via: `yarn dev`

### Load Testing

Spawn headless mock clients (adjust count):
```
node client/dist/command/spawn-mock.js --count 200 --interval 1000
```

### Future Enhancements

-- Optional Prometheus `prom-client` integration (replace manual text builder).
-- OpenTelemetry spans for tick & broadcast phases.
-- Redis presence/driver activation for horizontal scaling.

### Profiling (Flame Graph / 火焰图)

Trigger a CPU profile via HTTP (默认 5 秒):
```
curl -X POST "http://localhost:2567/profile/cpu?durationMs=5000"
```
返回 JSON 中包含生成的 `.cpuprofile` 文件路径 (位于 `profiles/`).

抓取堆快照:
```
curl -X POST http://localhost:2567/profile/heap
```

列出已有文件:
```
curl http://localhost:2567/profile/list
```

本地命令行方式生成 CPU Profile (设置时长毫秒):
```
yarn build
D=10000 yarn profile:cpu
```

查看火焰图的方法:
1. 打开 Chrome DevTools -> Performance -> Load profile -> 选择生成的 `.cpuprofile` 文件。
2. 或使用 https://www.speedscope.app 加载 `.cpuprofile` / `.json` 文件获得交互式火焰图。

建议流程:
1. 在压测启动后 30 秒触发一次 10 秒 CPU Profile。
2. 对比多次 Profile，关注: `movementSystem`, `syncSystem`, 序列化热点 (patch broadcast), GC pauses。

如需自动化，可以在负载脚本中定时调用 `/profile/cpu` 并将结果上传到对象存储或日志系统。

## Notes

Customize logic in `src/rooms/MyRoom.ts` and systems under `src/systems/`.
Refer to Colyseus docs for clustering (enable Redis presence/driver in `app.config.ts`).