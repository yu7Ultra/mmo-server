import dotenv from 'dotenv';
dotenv.config();

function num(name: string, def: number): number {
  const v = process.env[name];
  if (v === undefined) return def;
  const n = Number(v);
  return isNaN(n) ? def : n;
}

export const ENV = {
  PORT: num('PORT', 2567),
  REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',
  NODE_ENV: process.env.NODE_ENV || 'development',

  // Performance / simulation
  TICK_RATE: num('TICK_RATE', 10), // ticks per second
  PERF_SLOW_TICK_MS: num('PERF_SLOW_TICK_MS', 20),
  PERF_AUTO_PROFILE_COOLDOWN_MS: num('PERF_AUTO_PROFILE_COOLDOWN_MS', 60000),
  AUTO_PROFILE_DURATION_MS: num('AUTO_PROFILE_DURATION_MS', 1000),

  // Schema buffer sizing
  SCHEMA_BUFFER_SIZE: num('SCHEMA_BUFFER_SIZE', 0), // 0 means auto
  EXPECTED_MAX_CLIENTS: num('EXPECTED_MAX_CLIENTS', 300),
  PER_PLAYER_BYTES: num('PER_PLAYER_BYTES', 64),
  SCHEMA_BUFFER_MAX: num('SCHEMA_BUFFER_MAX', 1024 * 1024),

  // Metrics / instrumentation
  ENABLE_AUTO_PROFILE: (process.env.ENABLE_AUTO_PROFILE || 'true') !== 'false',
};

export type EnvConfig = typeof ENV;
