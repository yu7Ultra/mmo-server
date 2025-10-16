# OpenTelemetry Distributed Tracing

Complete guide to distributed tracing in the MMO server using OpenTelemetry.

## Overview

OpenTelemetry provides comprehensive distributed tracing for the MMO server, allowing you to:
- Track game loop performance across all phases
- Identify performance bottlenecks in real-time
- Monitor network operations and broadcasts
- Trace player actions and system interactions
- Debug complex distributed scenarios
- Analyze end-to-end request flows

## Features

### Traced Operations

**Game Loop Phases:**
- Input processing
- Movement system
- Combat system
- Skill system
- Quest system
- Sync/broadcast phase

**Network Operations:**
- Message handling by type
- Broadcast operations
- Patch generation and sending

**Future Support:**
- Database operations
- External API calls
- Cache operations
- File I/O operations

### Supported Exporters

1. **Jaeger** (Recommended for production)
   - Rich UI for trace visualization
   - Service dependency graphs
   - Performance analytics

2. **Zipkin** (Alternative)
   - Lightweight and simple
   - Good Docker integration

3. **Console** (Development)
   - Debug output to console
   - No external dependencies

## Quick Start

### 1. Install Jaeger (Recommended)

**Using Docker:**
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

**Access Jaeger UI:**
Open `http://localhost:16686` in your browser

### 2. Enable Tracing

**Environment Variables:**
```bash
# Enable tracing
TRACING_ENABLED=true

# Select exporter (jaeger, zipkin, console)
TRACING_EXPORTER=jaeger

# Jaeger endpoint (default: http://localhost:14268/api/traces)
JAEGER_ENDPOINT=http://localhost:14268/api/traces

# Zipkin endpoint (default: http://localhost:9411/api/v2/spans)
ZIPKIN_ENDPOINT=http://localhost:9411/api/v2/spans
```

**Start Server:**
```bash
TRACING_ENABLED=true TRACING_EXPORTER=jaeger yarn start
```

### 3. View Traces

1. Open Jaeger UI at `http://localhost:16686`
2. Select service: `mmo-server`
3. Click "Find Traces"
4. Explore individual traces and spans

## API Reference

### Initialization

```typescript
import { initializeTelemetry, shutdownTelemetry } from './instrumentation/telemetry';

// Initialize on server start
initializeTelemetry();

// Shutdown on server stop
process.on('SIGINT', async () => {
  await shutdownTelemetry();
  process.exit(0);
});
```

### Basic Tracing

**Create a Span:**
```typescript
import { startSpan } from './instrumentation/telemetry';

const span = startSpan('my-operation', {
  'user.id': userId,
  'operation.type': 'custom',
});

try {
  // Your code here
  span.setStatus({ code: SpanStatusCode.OK });
} catch (error) {
  span.setStatus({ code: SpanStatusCode.ERROR });
  span.recordException(error);
} finally {
  span.end();
}
```

**With Async/Await:**
```typescript
import { withSpan } from './instrumentation/telemetry';

await withSpan('my-operation', async (span) => {
  // Your code here
  span.setAttribute('custom.attribute', 'value');
  return result;
}, {
  'user.id': userId,
});
```

### Game Loop Tracing

**Trace Entire Tick:**
```typescript
import { traceGameTick } from './instrumentation/telemetry';

const tickSpan = traceGameTick(roomId, tickNumber);

try {
  // Process tick phases
  const inputSpan = traceInputPhase(roomId, messageCount);
  // ... process inputs
  inputSpan.end();

  const movementSpan = traceMovementPhase(roomId, playerCount);
  // ... process movement
  movementSpan.end();

  const combatSpan = traceCombatPhase(roomId, combatCount);
  // ... process combat
  combatSpan.end();

  const syncSpan = traceSyncPhase(roomId, patchSize);
  // ... broadcast updates
  syncSpan.end();

  tickSpan.setStatus({ code: SpanStatusCode.OK });
} catch (error) {
  tickSpan.setStatus({ code: SpanStatusCode.ERROR });
  tickSpan.recordException(error);
} finally {
  tickSpan.end();
}
```

### Message Tracing

```typescript
import { traceMessage } from './instrumentation/telemetry';

onMessage('move', (client, message) => {
  const span = traceMessage(this.roomId, 'move', client.sessionId);
  
  try {
    // Handle message
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

### Broadcast Tracing

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

## Trace Attributes

### Standard Attributes

**Game-Specific:**
- `room.id` - Room identifier
- `player.id` - Player identifier
- `session.id` - Client session ID
- `tick.number` - Game tick number
- `message.type` - Message type
- `message.count` - Number of messages
- `player.count` - Number of players
- `combat.count` - Number of combats
- `patch.size` - Patch size in bytes
- `client.count` - Number of clients

**Network:**
- `http.method` - HTTP method
- `http.status_code` - HTTP status code
- `http.url` - HTTP URL

**Database (Future):**
- `db.operation` - Operation (find, insert, update, delete)
- `db.collection` - Collection/table name
- `db.query` - Query string

### Custom Attributes

```typescript
span.setAttribute('custom.key', 'value');
span.setAttribute('user.level', 42);
span.setAttribute('quest.id', 'quest_123');
```

## Events

Add events to spans for important moments:

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

## Sampling

Control sampling rate to reduce overhead:

```typescript
// In telemetry.ts configuration
import { TraceIdRatioBasedSampler } from '@opentelemetry/sdk-trace-base';

// Sample 10% of traces
sampler: new TraceIdRatioBasedSampler(0.1),
```

## Performance Impact

**Overhead:**
- Minimal CPU: <1-2% when enabled
- Memory: ~100 bytes per span
- Network: Async batched export (negligible)

**Best Practices:**
- Use sampling in production (10-50%)
- Trace only critical paths in high-frequency loops
- Batch export to reduce network overhead
- Monitor exporter queue size

## Jaeger UI Guide

### Finding Traces

1. **Service**: Select `mmo-server`
2. **Operation**: Filter by span name (e.g., `game.tick`)
3. **Tags**: Filter by attributes (e.g., `room.id=my_room`)
4. **Lookback**: Set time range
5. **Min/Max Duration**: Filter slow traces

### Analyzing Traces

**Trace View:**
- Timeline visualization
- Span hierarchy
- Duration breakdown
- Error highlighting

**Span Details:**
- Attributes (tags)
- Events (logs)
- Process information
- Stack traces (if errors)

**Service Graph:**
- Visual service dependencies
- Request flow
- Error rates
- Latency distribution

### Common Queries

**Find slow ticks:**
```
service=mmo-server operation=game.tick minDuration=20ms
```

**Find errors:**
```
service=mmo-server error=true
```

**Find specific room:**
```
service=mmo-server room.id=abc123
```

**Find by player:**
```
service=mmo-server player.id=player_456
```

## Integration Examples

### Room Integration

```typescript
import { initializeTelemetry } from './instrumentation/telemetry';

export class MyRoom extends Room<MyRoomState> {
  onCreate(options: any) {
    // Tick loop with tracing
    this.setSimulationInterval((deltaTime) => {
      const tickSpan = traceGameTick(this.roomId, this.tickCounter);
      
      try {
        // Game loop phases
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

### System Integration

```typescript
export function combatSystem(world: World<Entity>) {
  const span = startSpan('system.combat');
  
  try {
    const combatEntities = world.where(e => e.inCombat);
    span.setAttribute('entity.count', combatEntities.length);
    
    combatEntities.forEach(entity => {
      // Process combat
    });
    
    span.setStatus({ code: SpanStatusCode.OK });
  } finally {
    span.end();
  }
}
```

## Deployment

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
      - name: mmo-server
        env:
        - name: TRACING_ENABLED
          value: "true"
        - name: JAEGER_ENDPOINT
          value: "http://jaeger:14268/api/traces"
```

## Troubleshooting

### Traces Not Appearing

**Check telemetry is enabled:**
```bash
# Should see: [Telemetry] OpenTelemetry initialized successfully
grep -i telemetry server.log
```

**Verify Jaeger is running:**
```bash
curl http://localhost:14268/api/traces
```

**Check exporter configuration:**
```typescript
console.log('TRACING_ENABLED:', process.env.TRACING_ENABLED);
console.log('JAEGER_ENDPOINT:', process.env.JAEGER_ENDPOINT);
```

### High Memory Usage

**Reduce sampling rate:**
```typescript
// Sample only 10% of requests
sampler: new TraceIdRatioBasedSampler(0.1),
```

**Limit span attributes:**
```typescript
// Avoid large attributes
span.setAttribute('config', JSON.stringify(largeObject)); // ❌ Bad
span.setAttribute('config.size', largeObject.length);     // ✅ Good
```

### Performance Degradation

**Profile with and without tracing:**
```bash
# Without tracing
TRACING_ENABLED=false yarn start

# With tracing
TRACING_ENABLED=true yarn start
```

**Use async export:**
Ensure batch span processor is used (default)

## Best Practices

1. **Trace Granularity**: Balance detail vs overhead
2. **Sampling**: Use in production (10-50%)
3. **Attributes**: Use semantic names and standard conventions
4. **Events**: Add for significant moments
5. **Errors**: Always record exceptions
6. **Context Propagation**: Ensure context flows through async operations
7. **Resource Cleanup**: End spans in finally blocks
8. **Testing**: Test with tracing enabled

## Future Enhancements

- [ ] Automatic instrumentation for popular libraries
- [ ] Custom dashboards in Jaeger
- [ ] Alerting based on trace data
- [ ] Integration with metrics (exemplars)
- [ ] Long-term trace storage
- [ ] Trace-based testing

## Resources

- [OpenTelemetry Documentation](https://opentelemetry.io/docs/)
- [Jaeger Documentation](https://www.jaegertracing.io/docs/)
- [Semantic Conventions](https://opentelemetry.io/docs/specs/semconv/)
- [Best Practices](https://opentelemetry.io/docs/concepts/instrumenting/)
