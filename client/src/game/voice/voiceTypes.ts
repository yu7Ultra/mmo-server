export interface VoiceState {
  peerConnections: Map<string, RTCPeerConnection>;
  localStream: MediaStream | null;
  isMuted: boolean;
  isDeafened: boolean;
}

export const voiceState: VoiceState = {
  peerConnections: new Map(),
  localStream: null,
  isMuted: false,
  isDeafened: false
};

export const rtcConfig: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:global.stun.twilio.com:3478?transport=udp' }
  ]
};
