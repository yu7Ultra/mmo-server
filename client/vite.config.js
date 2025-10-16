import { defineConfig, loadEnv } from 'vite'


export default defineConfig(({ mode }) => {
    // Load environment variables (VITE_*). This merges .env, .env.[mode]
    const env = loadEnv(mode, process.cwd(), 'VITE_');
    // 开发环境 base 为 '/'，其他环境（如 test、production）为 '/mmo-client/'
    const base = mode === 'development' ? '/' : '/mmo-client/'
    return {
        base,
        server: {
            host: '0.0.0.0', // 允许外部访问（局域网/公网）
            allowedHosts: [
                '1887197n8x.vicp.fun',
                // 可选：添加其他合法域名
                'localhost',
                'your-custom-domain.com'
            ]
        },
        define: {
            // Expose selected RTC and Colyseus variables explicitly if needed by non-import.meta paths
            __RTC_PROVIDER__: JSON.stringify(env.VITE_RTC_PROVIDER || 'native'),
            __RTC_APP_ID__: JSON.stringify(env.VITE_AGORA_APP_ID || env.VITE_TENCENT_SDK_APP_ID || env.VITE_ALIYUN_APP_ID || env.VITE_ZEGO_APP_ID || ''),
            __RTC_TOKEN_ENDPOINT__: JSON.stringify(env.VITE_RTC_TOKEN_ENDPOINT || '/rtc/token'),
            __RTC_DEBUG__: JSON.stringify(env.VITE_RTC_DEBUG || 'false'),
            __COLYSEUS_WS_URL__: JSON.stringify(env.VITE_COLYSEUS_WS_URL || 'ws://localhost:2567'),
            __COLYSEUS_ROOM__: JSON.stringify(env.VITE_COLYSEUS_ROOM || 'my_room')
        },
        // 其他配置...
    }
})