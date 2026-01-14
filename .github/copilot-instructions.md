# GitHub Copilot Instructions for MMO Server Project

## Project Overview

This is a production-ready Colyseus MMO server built with TypeScript, featuring:
- **Colyseus Framework**: Real-time multiplayer game server with multiple room types
- **ECS Architecture**: Entity Component System using Miniplex v2.x
- **uWebSockets Transport**: High-performance WebSocket implementation  
- **Redis-ready**: Horizontal scaling with Redis presence/driver (configurable via `REDIS_URL`)
- **Performance Monitoring**: Custom metrics, Prometheus integration, CPU/heap profiling
- **Full Game Systems**: Combat, skills, quests, achievements, voice chat, spatial partitioning
- **Frontend Client**: Complete Vite + Pixi.js MMO client with 8 UI panels

## Architecture & Patterns

### Core Directory Structure

- `src/rooms/`: Room definitions (`MyRoom.ts`, `CellRoom.ts`, `ChatRoom.ts`)
- `src/schemas/`: Colyseus Schema state definitions with `@type()` decorators
- `src/entities/`: ECS entity type definitions (`Entity`, commands)
- `src/systems/`: ECS system implementations (pure functions taking `World<Entity>`)
- `src/instrumentation/`: Metrics collection, profiling endpoints
- `src/services/`: External integrations (Agora, Tencent voice providers)
- `src/analytics/`: Player analytics and retention tracking
- `src/tickets/`: Customer support ticket system
- `client/`: Complete MMO client with mock testing tools

### Key Technologies

- **Runtime**: Node.js with TypeScript, CommonJS modules
- **Framework**: Colyseus v0.16.x with uWebSockets transport
- **ECS**: Miniplex v2.x for entity queries and world management
- **State**: @colyseus/schema v3.x for network synchronization
- **Testing**: Jest with @colyseus/testing for integration tests
- **Frontend**: Vite + Pixi.js + colyseus.js client

### Code Style & Conventions

1. **TypeScript Configuration**: 
   - Target ES2020, CommonJS modules, strict mode enabled
   - Experimental decorators for Colyseus Schema (`@type()`)
   - Output to `build/` directory, source in `src/`

2. **ECS Patterns**:
   - Entities defined as TypeScript types in `src/entities/index.ts` with optional components
   - Systems are pure functions: `(world: World<Entity>) => void`
   - Use `world.with('component1', 'component2')` for entity filtering
   - Keep systems focused on single responsibilities

3. **Room Lifecycle**:
   - `onCreate()`: Initialize state, systems, world bounds, register metrics
   - `onJoin()`: Create entity, add to spatial system, grant starter items
   - `onLeave()`: Clean entity, remove from spatial system, update leaderboard
   - `onDispose()`: Clean up world, unregister metrics, dispose spatial system

4. **State Schema**:
   - Use `@type()` decorators for network-synchronized properties
   - Run `yarn schema-codegen` after schema changes to generate client types
   - State changes automatically trigger client patches

5. **Message Handling**:
   - All messages rate-limited via `actionRateLimiter.attempt(sessionId)`
   - Use `InputValidator.sanitizeString()` for text input
   - Record metrics with `recordMessage(roomId, messageType)`

6. **Spatial System Integration**:
   - Call `addToSpatialSystem(entity)` on entity creation
   - Call `removeFromSpatialSystem(entityId)` on entity removal
   - Spatial queries enable efficient collision detection and area-of-effect

## Critical Development Workflows

### Build & Development Commands

```bash
# Development with live reload
yarn dev                    # tsc-watch + node restart

# Production build  
yarn build                 # TypeScript compilation to build/
yarn start                 # Start production server

# Schema generation (CRITICAL after schema changes)
yarn schema-codegen        # Generate client state classes
yarn schema-codegen-external  # For external Unity project

# Testing
yarn test                  # Jest test suite
```

### Load Testing & Profiling

```bash
# Build mock clients first
cd client && yarn build:mock

# Spawn mock clients (adjust count)
node client/dist/command/spawn-mock.js --count 200 --interval 1000

# CPU profiling (production environment)
curl -X POST "http://localhost:2567/profile/cpu?durationMs=10000"
# Output: profiles/cpu-{timestamp}-{duration}.cpuprofile

# Heap snapshots
curl -X POST http://localhost:2567/profile/heap

# View profiles: Chrome DevTools > Performance > Load Profile
# Or https://speedscope.app for interactive flame graphs
```

### Metrics Monitoring

- **JSON Metrics**: `GET /metrics.json` - Structured room metrics, tick performance
- **Prometheus**: `GET /metrics` - Standard Prometheus exposition format  
- **Analytics**: `GET /analytics` - Player behavior, retention, economy data

## System-Specific Implementation Patterns

### Adding New ECS Systems

1. Create function in `src/systems/mySystem.ts`:
```typescript
import { World } from 'miniplex';
import { Entity } from '../entities';

export function mySystem(world: World<Entity>) {
  const entities = world.with('position', 'myComponent');
  entities.forEach(entity => {
    // Process entity logic
  });
}
```

2. Register in room's `onCreate()` tick loop:
```typescript
setInterval(() => {
  const start = performance.now();
  mySystem(this.world);
  // other systems...
  recordTick(this.roomId, performance.now() - start);
}, 1000/60);
```

### Schema State Updates

1. Update schema class in `src/schemas/MyRoomState.ts`:
```typescript
export class Player extends Schema {
  @type('number') newProperty: number = 0;
}
```

2. Generate client types: `yarn schema-codegen`

3. Access in systems via `entity.player.newProperty`

### Voice System Integration

- **Pluggable providers**: `native` (WebRTC), `agora`, `tencent`, `aliyun`, `zego`
- **Configuration**: Set `window.__RTC_PROVIDER__` and `window.__RTC_APP_ID__` before client init
- **Token endpoint**: `/rtc/token?channel=global&userId={sessionId}&provider=agora`
- **Fallback**: Native WebRTC if cloud provider fails

### Message Rate Limiting

All client messages processed through:
```typescript
if (!this.actionRateLimiter.attempt(client.sessionId)) {
  console.warn(`Rate limit exceeded for ${client.sessionId}`);
  return;
}
```

Configure in room constructor: `new RateLimiter(maxActions, perSecond)`

## Performance & Scaling Considerations

1. **Tick Performance**: 
   - Target <5ms average tick time for 60fps
   - Use `recordSlowTick()` for ticks >16ms  
   - Profile under load before optimizing

2. **Spatial Optimization**:
   - Spatial partitioning reduces O(n²) collision checks to O(n)
   - Configure via `initializeSpatialSystem({ maxObjects: 10 })`

3. **Memory Management**:
   - Object pooling in security utilities
   - Sliding window metrics to prevent unbounded growth
   - Monitor heap via `/profile/heap`

4. **Horizontal Scaling**:
   - Set `REDIS_URL` environment variable
   - Enables Redis presence/driver for multi-server deployments

## Testing Guidelines

- **Integration Tests**: Use `@colyseus/testing` with `ColyseusTestServer`
- **Test Coverage**: All systems have dedicated test files in `src/test/`
- **Mock Clients**: `client/dist/command/spawn-mock.js` for load testing
- **Test Patterns**: Room lifecycle, message handling, state synchronization

## Common Pitfalls

1. **State Mutation**: Only mutate properties with `@type()` decorators
2. **Schema Codegen**: Must run after any schema changes or client breaks
3. **Entity Cleanup**: Always remove from spatial system in `onLeave()`
4. **Rate Limiting**: Check rate limits before processing expensive operations
5. **Performance**: Profile slow ticks under realistic load, not empty rooms
