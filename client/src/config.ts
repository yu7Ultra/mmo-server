// Centralized typed access to client environment variables.
// All variables must be prefixed with VITE_ in .env files for Vite to expose them.

interface ClientEnvConfig {
  COLYSEUS_WS_URL: string;
  COLYSEUS_ROOM: string;
  PLAYER_NAME_PREFIX: string;
  ASSET_TMX: string; // blank disables TMX load
  WORLD_REPEAT_X: number;
  WORLD_REPEAT_Y: number;
  COOLDOWN_UI_INTERVAL_MS: number;
  RTC_PROVIDER: string;
  RTC_TOKEN_ENDPOINT: string;
  RTC_DEBUG: boolean;
  AGORA_APP_ID?: string;
  TENCENT_SDK_APP_ID?: string;
  ALIYUN_APP_ID?: string;
  ZEGO_APP_ID?: string;
}

function toNumber(val: any, fallback: number): number {
  const n = Number(val);
  return Number.isFinite(n) ? n : fallback;
}

export const EnvConfig: ClientEnvConfig = {
  COLYSEUS_WS_URL: import.meta.env.VITE_COLYSEUS_WS_URL || 'ws://localhost:2567',
  COLYSEUS_ROOM: import.meta.env.VITE_COLYSEUS_ROOM || 'my_room',
  PLAYER_NAME_PREFIX: import.meta.env.VITE_PLAYER_NAME_PREFIX || 'Player',
  ASSET_TMX: import.meta.env.VITE_ASSET_TMX || 'assets/oga/kenney_monochrome-pirates/Tiled/sample-overworld.tmx',
  WORLD_REPEAT_X: toNumber(import.meta.env.VITE_WORLD_REPEAT_X, 6),
  WORLD_REPEAT_Y: toNumber(import.meta.env.VITE_WORLD_REPEAT_Y, 6),
  COOLDOWN_UI_INTERVAL_MS: toNumber(import.meta.env.VITE_COOLDOWN_UI_INTERVAL_MS, 100),
  RTC_PROVIDER: import.meta.env.VITE_RTC_PROVIDER || 'native',
  RTC_TOKEN_ENDPOINT: import.meta.env.VITE_RTC_TOKEN_ENDPOINT || '/rtc/token',
  RTC_DEBUG: (import.meta.env.VITE_RTC_DEBUG || 'false') === 'true',
  AGORA_APP_ID: import.meta.env.VITE_AGORA_APP_ID || undefined,
  TENCENT_SDK_APP_ID: import.meta.env.VITE_TENCENT_SDK_APP_ID || undefined,
  ALIYUN_APP_ID: import.meta.env.VITE_ALIYUN_APP_ID || undefined,
  ZEGO_APP_ID: import.meta.env.VITE_ZEGO_APP_ID || undefined
};

// Helper for logging config (avoid leaking secrets; these are client-side anyway)
export function logEnvConfig() {
  if (EnvConfig.RTC_DEBUG) {
    console.log('[EnvConfig]', { ...EnvConfig, /* ensure booleans/numbers typed */ });
  }
}
