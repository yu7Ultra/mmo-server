import { IRTCProvider, RTCProviderInitOptions, RemoteTrackInfo } from '../IRTCProvider';

// Placeholder Tencent TRTC provider stub.
// TODO: Integrate with @tencentcloud/trtc-web-sdk via dynamic import to avoid bundle bloat.
export class TencentRTCProvider implements IRTCProvider {
  name = 'tencent';
  private opts!: RTCProviderInitOptions;
  private remoteTrackCallbacks = new Set<(t: RemoteTrackInfo) => void>();
  private level = 0;
  async init(opts: RTCProviderInitOptions) {
    this.opts = opts;
    console.warn('[rtc:tencent] init stub – no real implementation yet');
  }
  async joinChannel(channelId: string) { console.warn('[rtc:tencent] joinChannel stub', channelId); }
  async leaveChannel() { console.warn('[rtc:tencent] leaveChannel stub'); }
  setMute(_muted: boolean) { /* TODO */ }
  setDeafen(_deafened: boolean) { /* TODO */ }
  onRemoteTrack(cb: (track: RemoteTrackInfo) => void) { this.remoteTrackCallbacks.add(cb); return () => this.remoteTrackCallbacks.delete(cb); }
  getLocalAudioLevel() { return this.level; }
  getRemoteAudioLevels() { return new Map<string, number>(); }
  async destroy() { /* TODO */ }
}
