import { IRTCProvider, RTCProviderInitOptions, RemoteTrackInfo } from '../IRTCProvider';

// Placeholder ZEGO provider stub.
// TODO: Integrate with ZegoExpressEngine Web SDK via dynamic import.
export class ZegoRTCProvider implements IRTCProvider {
  name = 'zego';
  private opts!: RTCProviderInitOptions;
  private remoteTrackCallbacks = new Set<(t: RemoteTrackInfo) => void>();
  private level = 0;
  async init(opts: RTCProviderInitOptions) {
    this.opts = opts;
    console.warn('[rtc:zego] init stub – no real implementation yet');
  }
  async joinChannel(channelId: string) { console.warn('[rtc:zego] joinChannel stub', channelId); }
  async leaveChannel() { console.warn('[rtc:zego] leaveChannel stub'); }
  setMute(_muted: boolean) { /* TODO */ }
  setDeafen(_deafened: boolean) { /* TODO */ }
  onRemoteTrack(cb: (track: RemoteTrackInfo) => void) { this.remoteTrackCallbacks.add(cb); return () => this.remoteTrackCallbacks.delete(cb); }
  getLocalAudioLevel() { return this.level; }
  getRemoteAudioLevels() { return new Map<string, number>(); }
  async destroy() { /* TODO */ }
}
