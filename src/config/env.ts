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

  // Logging configuration
  LOG_LEVEL: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  LOG_FILE_MAX_SIZE: process.env.LOG_FILE_MAX_SIZE || '20m',
  LOG_FILE_MAX_FILES: process.env.LOG_FILE_MAX_FILES || '14d',
  LOG_DIR: process.env.LOG_DIR || 'logs',
  LOG_TO_CONSOLE: (process.env.LOG_TO_CONSOLE || 'true') !== 'false',
  LOG_TO_FILE: (process.env.LOG_TO_FILE || 'true') !== 'false',
};

export type EnvConfig = typeof ENV;
