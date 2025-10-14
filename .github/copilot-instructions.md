# GitHub Copilot Instructions for MMO Server Project

## Project Overview

This is a production-ready Colyseus MMO server built with TypeScript, featuring:
- **Colyseus Framework**: Real-time multiplayer game server
- **ECS Architecture**: Entity Component System using Miniplex
- **uWebSockets Transport**: High-performance WebSocket implementation
- **Redis-ready**: Configuration for horizontal scaling with Redis presence/driver
- **Performance Monitoring**: Custom metrics, profiling, and Prometheus integration
- **Frontend Client**: Vite + Pixi.js based client in the `client/` directory

## Architecture & Patterns

### Directory Structure

- `src/rooms/`: Room definitions (game logic containers)
- `src/schemas/`: State schema definitions using Colyseus Schema
- `src/entities/`: ECS entity definitions
- `src/systems/`: ECS system implementations (game logic)
- `src/instrumentation/`: Metrics and profiling utilities
- `client/`: Frontend client application
  - `client/src/`: TypeScript source files
  - `client/dist/`: Built client files
  - `client/src/command/`: Load testing and mock client tools

### Key Technologies

- **Runtime**: Node.js with TypeScript
- **Framework**: Colyseus v0.16.x
- **ECS**: Miniplex v2.x
- **Transport**: uWebSockets
- **State Management**: @colyseus/schema
- **Testing**: Jest with @colyseus/testing
- **Frontend**: Vite, Pixi.js, colyseus.js client

### Code Style & Conventions

1. **TypeScript Usage**: 
   - Use strict TypeScript types
   - Avoid `any` types when possible
   - Use interfaces for public APIs

2. **ECS Patterns**:
   - Entities are defined in `src/entities/`
   - Systems process entities and are in `src/systems/`
   - Keep systems pure and focused on single responsibilities
   - Use Miniplex queries for entity filtering

3. **Room Lifecycle**:
   - `onCreate()`: Initialize room state and systems
   - `onJoin()`: Handle player joining
   - `onLeave()`: Clean up player data
   - `onDispose()`: Clean up room resources

4. **State Schema**:
   - Use `@type()` decorators for synchronized properties
   - Keep state minimal and optimized for network sync
   - State changes trigger automatic client updates

5. **Metrics & Monitoring**:
   - Record important events using functions from `src/instrumentation/metrics.ts`
   - Use `recordTick()`, `recordMessage()`, `recordPatch()` for performance tracking
   - Enable slow tick profiling for optimization

## Common Tasks

### Adding a New System

1. Create a new file in `src/systems/` (e.g., `mySystem.ts`)
2. Export a function that takes `World<Entity>` as parameter
3. Use world queries to filter and process relevant entities
4. Register the system in the room's `onCreate()` tick loop

Example:
```typescript
import { World } from 'miniplex';
import { Entity } from '../entities';

export function mySystem(world: World<Entity>) {
  // Query entities with specific components
  const entities = world.where(e => e.myComponent !== undefined);
  
  entities.forEach(entity => {
    // Process entity
  });
}
```

### Adding New State Properties

1. Update the schema in `src/schemas/MyRoomState.ts`
2. Add `@type()` decorator for network synchronization
3. Run `yarn schema-codegen` to generate client-side state classes
4. Update client code to listen for state changes

### Adding Metrics

Use instrumentation functions:
- `recordTick(roomId, durationMs)`: Record tick duration
- `recordMessage(roomId, type)`: Track message counts
- `recordPatch(roomId, byteCount)`: Monitor patch sizes
- `recordSlowTick(roomId, durationMs)`: Alert on slow ticks

### Running Tests

```bash
yarn install  # Install dependencies
yarn build    # Build TypeScript
yarn test     # Run Jest tests
```

### Development Workflow

```bash
yarn dev      # Start with live reload
yarn build    # Production build
yarn start    # Start production server
```

### Load Testing

```bash
# Build client mock tools first
cd client && yarn build:mock

# Spawn mock clients
node client/dist/command/spawn-mock.js --count 200 --interval 1000
```

## Important Notes

1. **Network Optimization**: 
   - Keep state minimal
   - Use binary schema types when possible
   - Monitor patch sizes via `/metrics.json`

2. **Scaling**:
   - Enable Redis presence/driver in `src/app.config.ts` for clustering
   - Use environment variables for configuration

3. **Profiling**:
   - CPU profiling: `curl -X POST "http://localhost:2567/profile/cpu?durationMs=5000"`
   - Heap snapshot: `curl -X POST http://localhost:2567/profile/heap`
   - View in Chrome DevTools or speedscope.app

4. **Client-Server State Sync**:
   - Server state changes automatically propagate to clients
   - Use `getStateCallbacks()` on client to listen for changes
   - Server is authoritative

## Common Pitfalls to Avoid

1. Don't mutate state outside of schema properties
2. Don't perform heavy computations in tick loops without profiling
3. Don't forget to clean up entities in `onLeave()`
4. Don't send large messages - use state synchronization
5. Don't access `this.state` before it's initialized in `onCreate()`

## Testing Guidelines

- Write integration tests using `@colyseus/testing`
- Mock clients should use `ColyseusTestServer`
- Test room lifecycle: join, message handling, leave
- Verify state synchronization
- Test edge cases: rapid joins/leaves, invalid messages

## Performance Best Practices

1. Profile under load before optimization
2. Use `recordSlowTick()` to identify performance issues
3. Batch state updates when possible
4. Minimize allocation in hot paths
5. Monitor event loop lag via `/metrics`

## References

- [Colyseus Documentation](https://docs.colyseus.io/)
- [Miniplex ECS Docs](https://miniplex.hmans.co/) (see also `MINIPLEX_DOCS_CN.md` for Chinese docs)
- [Colyseus Schema](https://docs.colyseus.io/colyseus/state/schema/)
- Project README: See `README.md` for setup and profiling guides
