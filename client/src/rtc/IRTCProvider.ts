export interface RTCProviderInitOptions {
  appId?: string;
  userId: string; // session / player id
  userName?: string;
  token?: string;
  channelId?: string;
  debug?: boolean;
}

export interface RemoteTrackInfo {
  peerId: string;
  stream: MediaStream;
  kind: 'audio' | 'video';
}

export interface IRTCProvider {
  name: string;
  init(opts: RTCProviderInitOptions): Promise<void>;
  joinChannel(channelId: string): Promise<void>;
  leaveChannel(): Promise<void>;
  setMute(muted: boolean): void;
  setDeafen(deafened: boolean): void;
  onRemoteTrack(cb: (track: RemoteTrackInfo) => void): () => void;
  getLocalAudioLevel(): number; // 0..1
  getRemoteAudioLevels(): Map<string, number>; // peerId -> level
  destroy(): Promise<void>;
}

export type RTCProviderKey = 'native' | 'agora' | 'tencent' | 'aliyun' | 'zego';
