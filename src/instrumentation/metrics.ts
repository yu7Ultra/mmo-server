import { performance } from 'perf_hooks';
import os from 'os';

class SlidingWindow {
  private values: number[] = [];
  constructor(private maxSize: number) {}
  push(v: number) {
    this.values.push(v);
    if (this.values.length > this.maxSize) this.values.shift();
  }
  avg() {
    if (this.values.length === 0) return 0;
    return this.values.reduce((a, b) => a + b, 0) / this.values.length;
  }
  p99() {
    if (this.values.length === 0) return 0;
    const sorted = [...this.values].sort((a, b) => a - b);
    const idx = Math.floor(sorted.length * 0.99);
    return sorted[idx];
  }
}

export type RoomMetrics = {
  roomId: string;
  tickCount: number;
  tickDurations: SlidingWindow;
  messagesReceived: number;
  moveMessages: number;
  patchesSent: number;
  bytesEstimate: number;
  lastSecondMessages: number;
  lastSecondPatches: number;
  clients: number;
  slowTickCount: number;
  recentSlowTicks: number[]; // store last N slow tick durations
  autoProfilesTriggered: number;
  lastAutoProfileFile?: string;
};

const rooms = new Map<string, RoomMetrics>();

export function registerRoom(roomId: string) {
  rooms.set(roomId, {
    roomId,
    tickCount: 0,
    tickDurations: new SlidingWindow(300),
    messagesReceived: 0,
    moveMessages: 0,
    patchesSent: 0,
    bytesEstimate: 0,
    lastSecondMessages: 0,
    lastSecondPatches: 0,
    clients: 0,
    slowTickCount: 0,
    recentSlowTicks: [],
    autoProfilesTriggered: 0,
  });
}

export function unregisterRoom(roomId: string) {
  rooms.delete(roomId);
}

export function recordTick(roomId: string, ms: number) {
  const m = rooms.get(roomId);
  if (!m) return;
  m.tickCount++;
  m.tickDurations.push(ms);
}

export function recordSlowTick(roomId: string, ms: number, threshold: number) {
  const m = rooms.get(roomId);
  if (!m) return;
  m.slowTickCount++;
  m.recentSlowTicks.push(ms);
  if (m.recentSlowTicks.length > 20) m.recentSlowTicks.shift();
  // Optional: could log once
  if (m.slowTickCount === 1 || m.slowTickCount % 50 === 0) {
    console.warn(`[perf] slow tick in room ${roomId}: ${ms.toFixed(2)}ms (> ${threshold}ms)`);
  }
}

export function updateAutoProfile(roomId: string, filePath: string) {
  const m = rooms.get(roomId);
  if (!m) return;
  m.autoProfilesTriggered++;
  m.lastAutoProfileFile = filePath;
}

export function recordMessage(roomId: string, type?: string, approximateBytes?: number) {
  const m = rooms.get(roomId);
  if (!m) return;
  m.messagesReceived++;
  m.lastSecondMessages++;
  if (type === 'move') m.moveMessages++;
  if (approximateBytes) m.bytesEstimate += approximateBytes;
}

export function recordPatch(roomId: string, approximateBytes?: number) {
  const m = rooms.get(roomId);
  if (!m) return;
  m.patchesSent++;
  m.lastSecondPatches++;
  if (approximateBytes) m.bytesEstimate += approximateBytes;
}

export function updateClients(roomId: string, count: number) {
  const m = rooms.get(roomId);
  if (!m) return;
  m.clients = count;
}

setInterval(() => {
  for (const m of rooms.values()) {
    m.lastSecondMessages = 0;
    m.lastSecondPatches = 0;
  }
}, 1000).unref();

let eventLoopLagMs = 0;
(function monitorEventLoopLag(interval = 500) {
  let start = performance.now();
  setInterval(() => {
    const now = performance.now();
    const diff = now - start - interval;
    eventLoopLagMs = diff < 0 ? 0 : diff;
    start = now;
  }, interval).unref();
})();

export function collectAllMetrics() {
  const roomArray = [] as any[];
  let totalMessages = 0;
  let totalPatches = 0;
  let totalClients = 0;

  for (const m of rooms.values()) {
    totalMessages += m.messagesReceived;
    totalPatches += m.patchesSent;
    totalClients += m.clients;
    roomArray.push({
      roomId: m.roomId,
      clients: m.clients,
      tickCount: m.tickCount,
      tickAvgMs: m.tickDurations.avg(),
      tickP99Ms: m.tickDurations.p99(),
      messagesReceived: m.messagesReceived,
      moveMessages: m.moveMessages,
      patchesSent: m.patchesSent,
      bytesEstimate: m.bytesEstimate,
      slowTickCount: m.slowTickCount,
      recentSlowTicks: m.recentSlowTicks,
      autoProfilesTriggered: m.autoProfilesTriggered,
      lastAutoProfileFile: m.lastAutoProfileFile,
    });
  }

  const mem = process.memoryUsage();

  return {
    process: {
      pid: process.pid,
      uptimeSeconds: process.uptime(),
      memory: {
        rss: mem.rss,
        heapUsed: mem.heapUsed,
        heapTotal: mem.heapTotal,
      },
      cpuCount: os.cpus().length,
      eventLoopLagMs,
    },
    aggregate: {
      roomCount: rooms.size,
      totalClients,
      totalMessages,
      totalPatches,
    },
    rooms: roomArray,
  };
}

export function toPrometheusText() {
  const metrics = collectAllMetrics();
  const lines: string[] = [];
  lines.push('# HELP colyseus_event_loop_lag_ms event loop lag');
  lines.push('# TYPE colyseus_event_loop_lag_ms gauge');
  lines.push(`colyseus_event_loop_lag_ms ${metrics.process.eventLoopLagMs}`);
  lines.push('# HELP colyseus_room_count total rooms');
  lines.push('# TYPE colyseus_room_count gauge');
  lines.push(`colyseus_room_count ${metrics.aggregate.roomCount}`);
  lines.push('# HELP colyseus_total_clients total clients');
  lines.push('# TYPE colyseus_total_clients gauge');
  lines.push(`colyseus_total_clients ${metrics.aggregate.totalClients}`);
  for (const r of metrics.rooms) {
    const label = `{roomId="${r.roomId}"}`;
    lines.push(`colyseus_room_clients${label} ${r.clients}`);
    lines.push(`colyseus_room_tick_avg_ms${label} ${r.tickAvgMs}`);
    lines.push(`colyseus_room_tick_p99_ms${label} ${r.tickP99Ms}`);
    lines.push(`colyseus_room_messages_received${label} ${r.messagesReceived}`);
    lines.push(`colyseus_room_patches_sent${label} ${r.patchesSent}`);
    lines.push(`colyseus_room_bytes_estimate${label} ${r.bytesEstimate}`);
    lines.push(`colyseus_room_slow_tick_count${label} ${r.slowTickCount}`);
    lines.push(`colyseus_room_auto_profiles_triggered${label} ${r.autoProfilesTriggered}`);
  }
  return lines.join('\n');
}
