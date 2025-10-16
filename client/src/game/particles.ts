import { Ticker } from 'pixi.js';

export type ParticleCallback = (elapsedMs: number, deltaMs: number) => boolean;

interface ParticleEntry {
  callback: ParticleCallback;
  elapsedMs: number;
}

class ParticleManager {
  private entries = new Set<ParticleEntry>();
  private readonly ticker: Ticker;
  private readonly tickerHandler: (ticker: Ticker) => void;

  constructor(ticker: Ticker) {
    this.ticker = ticker;
    this.tickerHandler = (tickerInstance: Ticker) => {
      const rawDelta = (tickerInstance as any).deltaMS ?? ((tickerInstance as any).delta ?? 1) * (1000 / 60);
      const deltaMs = typeof rawDelta === 'number' ? rawDelta : 0;
      this.update(deltaMs);
    };
    this.ticker.add(this.tickerHandler as any);
  }

  public add(callback: ParticleCallback): () => void {
    const entry: ParticleEntry = { callback, elapsedMs: 0 };
    this.entries.add(entry);
    return () => {
      this.entries.delete(entry);
    };
  }

  public update(deltaMs: number): void {
    const toRemove: ParticleEntry[] = [];
    for (const entry of this.entries) {
      entry.elapsedMs += deltaMs;
      const done = entry.callback(entry.elapsedMs, deltaMs);
      if (done) {
        toRemove.push(entry);
      }
    }
    for (const entry of toRemove) {
      this.entries.delete(entry);
    }
  }

  public destroy(): void {
    this.ticker.remove(this.tickerHandler as any);
    this.entries.clear();
  }
}

let manager: ParticleManager | null = null;

export function initParticleManager(ticker: Ticker): void {
  if (manager) {
    manager.destroy();
  }
  manager = new ParticleManager(ticker);
}

export function disposeParticleManager(): void {
  if (manager) {
    manager.destroy();
    manager = null;
  }
}

export function scheduleParticle(callback: ParticleCallback): () => void {
  if (!manager) {
    throw new Error('ParticleManager not initialized. Call initParticleManager() first.');
  }
  return manager.add(callback);
}
