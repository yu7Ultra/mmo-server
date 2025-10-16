import { IRTCProvider, RTCProviderInitOptions, RemoteTrackInfo } from '../IRTCProvider';

// Placeholder Aliyun RTC provider (stub). Will be replaced with actual Aliyun SDK integration.
// TODO: yarn add aliyun-webrtc-sdk (hypothetical) or load via dynamic <script>.
export class AliyunRTCProvider implements IRTCProvider {
  name = 'aliyun';
  private opts!: RTCProviderInitOptions;
  private remoteTrackCallbacks = new Set<(t: RemoteTrackInfo) => void>();
  private level = 0; // local level placeholder
  async init(opts: RTCProviderInitOptions) {
    this.opts = opts;
    // TODO: Acquire token if needed, init Aliyun client, create local stream.
    console.warn('[rtc:aliyun] init stub – no real implementation yet');
  }
  async joinChannel(channelId: string) {
    console.warn('[rtc:aliyun] joinChannel stub', channelId);
  }
  async leaveChannel() {
    console.warn('[rtc:aliyun] leaveChannel stub');
  }
  setMute(_muted: boolean) { /* TODO */ }
  setDeafen(_deafened: boolean) { /* TODO */ }
  onRemoteTrack(cb: (track: RemoteTrackInfo) => void) { this.remoteTrackCallbacks.add(cb); return () => this.remoteTrackCallbacks.delete(cb); }
  getLocalAudioLevel() { return this.level; }
  getRemoteAudioLevels() { return new Map<string, number>(); }
  async destroy() { /* TODO: cleanup */ }
}
