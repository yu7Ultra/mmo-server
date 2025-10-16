/**
 * OpenTelemetry Distributed Tracing
 * 
 * Provides comprehensive distributed tracing for MMO server operations:
 * - Game loop phases (input, movement, combat, sync)
 * - Network operations (messages, broadcasts)
 * - Database operations (when implemented)
 * - External service calls
 * 
 * Supports multiple exporters:
 * - Jaeger (recommended for production)
 * - Zipkin (alternative)
 * - Console (development/debugging)
 */

import { NodeSDK } from '@opentelemetry/sdk-node';
import { SEMRESATTRS_SERVICE_NAME } from '@opentelemetry/semantic-conventions';
import { JaegerExporter } from '@opentelemetry/exporter-jaeger';
import { ZipkinExporter } from '@opentelemetry/exporter-zipkin';
import { trace, context, Span, SpanStatusCode } from '@opentelemetry/api';

// Configuration
const SERVICE_NAME = 'mmo-server';
const JAEGER_ENDPOINT = process.env.JAEGER_ENDPOINT || 'http://localhost:14268/api/traces';
const ZIPKIN_ENDPOINT = process.env.ZIPKIN_ENDPOINT || 'http://localhost:9411/api/v2/spans';
const TRACING_ENABLED = process.env.TRACING_ENABLED === 'true';
const TRACING_EXPORTER = process.env.TRACING_EXPORTER || 'jaeger'; // jaeger, zipkin, console

// Singleton SDK instance
let sdk: NodeSDK | null = null;
let tracerInstance: ReturnType<typeof trace.getTracer> | null = null;

/**
 * Initialize OpenTelemetry SDK
 */
export function initializeTelemetry(): void {
  if (!TRACING_ENABLED) {
    console.log('[Telemetry] Tracing disabled (set TRACING_ENABLED=true to enable)');
    return;
  }

  // Select exporter based on configuration
  let exporter;
  switch (TRACING_EXPORTER) {
    case 'jaeger':
      exporter = new JaegerExporter({
        endpoint: JAEGER_ENDPOINT,
      });
      console.log(`[Telemetry] Using Jaeger exporter: ${JAEGER_ENDPOINT}`);
      break;
    case 'zipkin':
      exporter = new ZipkinExporter({
        url: ZIPKIN_ENDPOINT,
      });
      console.log(`[Telemetry] Using Zipkin exporter: ${ZIPKIN_ENDPOINT}`);
      break;
    case 'console':
      console.log('[Telemetry] Using Console exporter (development mode)');
      // Console exporter for development
      exporter = undefined; // Will use default console exporter
      break;
    default:
      console.warn(`[Telemetry] Unknown exporter: ${TRACING_EXPORTER}, using Jaeger`);
      exporter = new JaegerExporter({
        endpoint: JAEGER_ENDPOINT,
      });
  }

  // Create SDK with resource and exporter
  sdk = new NodeSDK({
    serviceName: SERVICE_NAME,
    traceExporter: exporter,
  });

  // Start SDK
  sdk.start();
  tracerInstance = trace.getTracer(SERVICE_NAME, '1.0.0');
  
  console.log('[Telemetry] OpenTelemetry initialized successfully');
}

/**
 * Shutdown telemetry
 */
export async function shutdownTelemetry(): Promise<void> {
  if (sdk) {
    await sdk.shutdown();
    console.log('[Telemetry] OpenTelemetry shutdown complete');
  }
}

/**
 * Get tracer instance
 */
export function getTracer() {
  if (!tracerInstance) {
    // Return no-op tracer if telemetry not initialized
    return trace.getTracer('noop');
  }
  return tracerInstance;
}

/**
 * Create and start a span
 * @param name - Span name
 * @param attributes - Optional span attributes
 * @returns Active span
 */
export function startSpan(name: string, attributes?: Record<string, any>): Span {
  const tracer = getTracer();
  return tracer.startSpan(name, {
    attributes: attributes || {},
  });
}

/**
 * Execute function within a span
 * @param name - Span name
 * @param fn - Function to execute
 * @param attributes - Optional span attributes
 */
export async function withSpan<T>(
  name: string,
  fn: (span: Span) => Promise<T>,
  attributes?: Record<string, any>
): Promise<T> {
  const span = startSpan(name, attributes);
  const ctx = trace.setSpan(context.active(), span);

  try {
    const result = await context.with(ctx, () => fn(span));
    span.setStatus({ code: SpanStatusCode.OK });
    return result;
  } catch (error) {
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: error instanceof Error ? error.message : 'Unknown error',
    });
    span.recordException(error as Error);
    throw error;
  } finally {
    span.end();
  }
}

/**
 * Trace game loop tick
 */
export function traceGameTick(roomId: string, tickNumber: number): Span {
  return startSpan('game.tick', {
    'room.id': roomId,
    'tick.number': tickNumber,
  });
}

/**
 * Trace input processing phase
 */
export function traceInputPhase(roomId: string, messageCount: number): Span {
  return startSpan('game.tick.input', {
    'room.id': roomId,
    'message.count': messageCount,
  });
}

/**
 * Trace movement system phase
 */
export function traceMovementPhase(roomId: string, playerCount: number): Span {
  return startSpan('game.tick.movement', {
    'room.id': roomId,
    'player.count': playerCount,
  });
}

/**
 * Trace combat system phase
 */
export function traceCombatPhase(roomId: string, combatCount: number): Span {
  return startSpan('game.tick.combat', {
    'room.id': roomId,
    'combat.count': combatCount,
  });
}

/**
 * Trace sync/broadcast phase
 */
export function traceSyncPhase(roomId: string, patchSize: number): Span {
  return startSpan('game.tick.sync', {
    'room.id': roomId,
    'patch.size': patchSize,
  });
}

/**
 * Trace message handling
 */
export function traceMessage(roomId: string, messageType: string, sessionId: string): Span {
  return startSpan('message.handle', {
    'room.id': roomId,
    'message.type': messageType,
    'session.id': sessionId,
  });
}

/**
 * Trace broadcast operation
 */
export function traceBroadcast(roomId: string, messageType: string, clientCount: number): Span {
  return startSpan('broadcast', {
    'room.id': roomId,
    'message.type': messageType,
    'client.count': clientCount,
  });
}

/**
 * Trace database operation (for future use)
 */
export function traceDbOperation(operation: string, collection: string): Span {
  return startSpan('db.operation', {
    'db.operation': operation,
    'db.collection': collection,
  });
}

/**
 * Trace external API call (for future use)
 */
export function traceExternalCall(service: string, endpoint: string, method: string): Span {
  return startSpan('external.call', {
    'external.service': service,
    'external.endpoint': endpoint,
    'http.method': method,
  });
}

/**
 * Add event to current span
 */
export function addSpanEvent(span: Span, name: string, attributes?: Record<string, any>): void {
  span.addEvent(name, attributes);
}

/**
 * Set span attribute
 */
export function setSpanAttribute(span: Span, key: string, value: any): void {
  span.setAttribute(key, value);
}

/**
 * Mark span as error
 */
export function setSpanError(span: Span, error: Error): void {
  span.setStatus({
    code: SpanStatusCode.ERROR,
    message: error.message,
  });
  span.recordException(error);
}

/**
 * Get current active span
 */
export function getCurrentSpan(): Span | undefined {
  return trace.getActiveSpan();
}

// Export trace context utilities
export { trace, context, SpanStatusCode };
