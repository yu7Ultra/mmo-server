import { IRTCProvider, RTCProviderKey } from './IRTCProvider';
import { NativeWebRTCProvider } from './providers/nativeProvider';
import { AliyunRTCProvider } from './providers/aliyunProvider';
import { TencentRTCProvider } from './providers/tencentProvider';
import { AgoraRTCProvider } from './providers/agoraProvider';
import { ZegoRTCProvider } from './providers/zegoProvider';

export function createRTCProvider(key: RTCProviderKey): IRTCProvider {
  switch (key) {
    case 'native': return new NativeWebRTCProvider();
    case 'agora': return new AgoraRTCProvider();
    case 'tencent': return new TencentRTCProvider();
    case 'aliyun': return new AliyunRTCProvider();
    case 'zego': return new ZegoRTCProvider();
    default:
      console.warn(`[rtc] unknown provider '${key}'. Using native.`);
      return new NativeWebRTCProvider();
  }
}
