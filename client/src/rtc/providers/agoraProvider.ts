import { IRTCProvider, RTCProviderInitOptions, RemoteTrackInfo } from '../IRTCProvider';

// Partial Agora provider: dynamic import + local level meter + token fetch.
// Full implementation requires adding agora-rtc-sdk-ng as dependency or CDN script.
export class AgoraRTCProvider implements IRTCProvider {
  name = 'agora';
  private opts!: RTCProviderInitOptions;
  private client: any; // AgoraRTCClient
  private localTrack: any; // MicrophoneAudioTrack
  private remoteTrackCallbacks = new Set<(t: RemoteTrackInfo) => void>();
  private level = 0;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private dataArray: Uint8Array | null = null;
  private joined = false;

  async init(opts: RTCProviderInitOptions) {
    this.opts = opts;
    const AgoraRTC = await this.loadSDK();
    // Fetch dynamic token if provided
    let token: string | undefined = opts.token;
    if (!token && (window as any).__RTC_TOKEN_ENDPOINT__) {
      try {
        const resp = await fetch(`${(window as any).__RTC_TOKEN_ENDPOINT__}?channel=global&userId=${encodeURIComponent(opts.userId)}`);
        const json = await resp.json(); token = json.token;
      } catch (e) { console.warn('[rtc:agora] token fetch failed', e); }
    }
    this.client = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
    await this.client.initialize?.(); // Some versions require init; fallback if undefined.
    this.client.on?.('user-published', async (user: any, mediaType: string) => {
      await this.client.subscribe(user, mediaType);
      if (mediaType === 'audio') {
        const remoteAudioTrack = user.audioTrack;
        remoteAudioTrack.play();
        const stream = new MediaStream();
        // Some Agora versions expose a raw MediaStreamTrack
        if (remoteAudioTrack?.getMediaStreamTrack) {
          stream.addTrack(remoteAudioTrack.getMediaStreamTrack());
        }
        this.remoteTrackCallbacks.forEach(cb => cb({ peerId: user.uid?.toString() || 'remote', stream, kind: 'audio' }));
      }
    });

    // Create local microphone track
    try {
      this.localTrack = await AgoraRTC.createMicrophoneAudioTrack();
      this.setupLocalLevelMeter(this.localTrack?.getMediaStreamTrack?.());
    } catch (e) { console.error('[rtc:agora] createMicrophoneAudioTrack error', e); }
  }

  async joinChannel(channelId: string) {
    if (this.joined) return;
    try {
      const appId = this.opts.appId || (window as any).__RTC_APP_ID__;
      if (!appId) { console.warn('[rtc:agora] missing appId'); return; }
      const uid = this.opts.userId;
      const token = this.opts.token; // for now may be undefined
      await this.client.join(appId, channelId, token || null, uid);
      if (this.localTrack) await this.client.publish([this.localTrack]);
      this.joined = true;
    } catch (e) { console.error('[rtc:agora] joinChannel failed', e); }
  }

  async leaveChannel() {
    if (!this.joined) return;
    try {
      await this.client.leave();
    } catch (e) { console.warn('[rtc:agora] leaveChannel warning', e); }
    this.joined = false;
  }
  setMute(muted: boolean) { if (this.localTrack) this.localTrack.setEnabled?.(!muted); }
  setDeafen(_deafened: boolean) { /* Could pause remote playback or detach audio elements */ }
  onRemoteTrack(cb: (track: RemoteTrackInfo) => void) { this.remoteTrackCallbacks.add(cb); return () => this.remoteTrackCallbacks.delete(cb); }
  getLocalAudioLevel() { return this.level; }
  getRemoteAudioLevels() { return new Map<string, number>(); }
  async destroy() { try { if (this.localTrack) { this.localTrack.stop(); this.localTrack.close?.(); } await this.leaveChannel(); } catch(_){} this.teardownLocalLevelMeter(); }

  private async loadSDK() {
    // Simplified: always use CDN if global not present. Avoid bundler resolving non-installed module.
    if (!(window as any).AgoraRTC) {
      await this.injectScript('https://download.agora.io/sdk/release/AgoraRTC_N.js');
    }
    return (window as any).AgoraRTC;
  }

  private injectScript(src: string) {
    return new Promise<void>((resolve, reject) => {
      const s = document.createElement('script'); s.src = src; s.async = true;
      s.onload = () => resolve(); s.onerror = (e) => reject(e);
      document.head.appendChild(s);
    });
  }

  private setupLocalLevelMeter(track?: MediaStreamTrack) {
    if (!track) return;
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const stream = new MediaStream([track]);
      const source = this.audioContext.createMediaStreamSource(stream);
      this.analyser = this.audioContext.createAnalyser(); this.analyser.fftSize = 512; source.connect(this.analyser);
      this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
      const loop = () => {
        if (!this.analyser || !this.dataArray) return;
  this.analyser.getByteTimeDomainData(this.dataArray as any);
        let sum = 0; for (let i=0;i<this.dataArray.length;i++){ const v=(this.dataArray[i]-128)/128; sum+= v*v; }
        const rms = Math.sqrt(sum/this.dataArray.length); this.level = Math.min(1, rms*4);
        requestAnimationFrame(loop);
      };
      loop();
    } catch (e) { console.warn('[rtc:agora] meter init failed', e); }
  }
  private teardownLocalLevelMeter() {
    if (this.audioContext) this.audioContext.close().catch(()=>{});
    this.audioContext = null; this.analyser = null; this.dataArray = null; this.level = 0;
  }
}
