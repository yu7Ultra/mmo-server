export interface RTCSelectionConfig {
  provider: 'native' | 'agora' | 'tencent' | 'aliyun' | 'zego';
  appId?: string;
  tokenEndpoint?: string;
  debug?: boolean;
}

// Read from Vite environment variables (prefixed with VITE_). Fallbacks preserved for legacy globals.
export const RTC_CONFIG: RTCSelectionConfig = {
  provider: (import.meta as any).env?.VITE_RTC_PROVIDER || (window as any).__RTC_PROVIDER__ || 'native',
  appId:
    (import.meta as any).env?.VITE_AGORA_APP_ID ||
    (import.meta as any).env?.VITE_TENCENT_SDK_APP_ID ||
    (import.meta as any).env?.VITE_ALIYUN_APP_ID ||
    (import.meta as any).env?.VITE_ZEGO_APP_ID ||
    (window as any).__RTC_APP_ID__ || undefined,
  tokenEndpoint: (import.meta as any).env?.VITE_RTC_TOKEN_ENDPOINT || (window as any).__RTC_TOKEN_ENDPOINT__ || '/rtc/token',
  debug: ((import.meta as any).env?.VITE_RTC_DEBUG === 'true') || !!(window as any).__RTC_DEBUG__,
};
