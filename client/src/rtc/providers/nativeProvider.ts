import { IRTCProvider, RTCProviderInitOptions, RemoteTrackInfo } from '../IRTCProvider';

interface PeerWrap { pc: RTCPeerConnection; audioEl?: HTMLAudioElement; lastLevel: number; }

export class NativeWebRTCProvider implements IRTCProvider {
  name = 'native';
  private opts!: RTCProviderInitOptions;
  private peers = new Map<string, PeerWrap>();
  private localStream: MediaStream | null = null;
  private remoteTrackCallbacks = new Set<(t: RemoteTrackInfo) => void>();
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private dataArray: Uint8Array | null = null; // standard Uint8Array for analyser
  private level = 0;
  private remoteAnalysers = new Map<string, { analyser: AnalyserNode; data: Uint8Array; level: number }>();
  private signalSend: ((payload: any) => void) | null = null;
  private sessionId!: string;
  private rtcConfig: RTCConfiguration = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };

  async init(opts: RTCProviderInitOptions & { signalSend: (p: any) => void; sessionId: string }) {
    this.opts = opts; this.sessionId = opts.sessionId; this.signalSend = opts.signalSend;
    if (opts.debug) console.log('[rtc:native] init', opts);
    this.localStream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
    this.setupLevelMeter();
    if (opts.channelId) await this.joinChannel(opts.channelId);
  }

  async joinChannel(_channelId: string) {
    // Peers will be created externally via signaling events.
  }
  async leaveChannel() {
    this.peers.forEach((_p, id) => this.closePeer(id));
    this.peers.clear();
  }
  setMute(muted: boolean) { this.localStream?.getAudioTracks().forEach(t => (t.enabled = !muted)); }
  setDeafen(deafened: boolean) { this.peers.forEach(p => { if (p.audioEl) p.audioEl.muted = deafened; }); }
  onRemoteTrack(cb: (track: RemoteTrackInfo) => void) { this.remoteTrackCallbacks.add(cb); return () => this.remoteTrackCallbacks.delete(cb); }
  getLocalAudioLevel() { return this.level; }
  getRemoteAudioLevels() { return new Map(Array.from(this.peers.entries()).map(([id, p]) => [id, p.lastLevel])); }
  async destroy() { await this.leaveChannel(); if (this.localStream) { this.localStream.getTracks().forEach(t => t.stop()); this.localStream = null; } if (this.audioContext) { this.audioContext.close().catch(() => {}); this.audioContext = null; } }

  async handleSignal(msg: { from: string; type: string; data: any }) {
    const { from, type, data } = msg;
    let wrap = this.peers.get(from);
    const initiator = this.sessionId < from;
    if (type === 'offer') {
      if (initiator) { console.warn('[rtc:native] glare offer ignored', from); return; }
      if (!wrap) wrap = this.createPeer(from);
      try {
        await wrap.pc.setRemoteDescription(new RTCSessionDescription(data));
        const answer = await wrap.pc.createAnswer();
        await wrap.pc.setLocalDescription(answer);
        this.signalSend?.({ to: from, type: 'answer', data: answer });
      } catch (e) { console.error('[rtc:native] answer error', e); }
    } else if (type === 'answer') {
      try { await wrap?.pc.setRemoteDescription(new RTCSessionDescription(data)); } catch (e) { console.error('[rtc:native] set answer error', e); }
    } else if (type === 'ice-candidate') {
      try { await wrap?.pc.addIceCandidate(new RTCIceCandidate(data)); } catch (e) { console.error('[rtc:native] ice error', e); }
    }
  }

  createPeer(peerId: string): PeerWrap {
    const pc = new RTCPeerConnection(this.rtcConfig);
    const wrap: PeerWrap = { pc, lastLevel: 0 };
    this.peers.set(peerId, wrap);
    this.localStream?.getTracks().forEach(t => pc.addTrack(t, this.localStream!));
    pc.ontrack = ev => {
      const audio = document.createElement('audio');
      audio.autoplay = true; (audio as any).playsInline = true;
      audio.srcObject = ev.streams[0];
      wrap.audioEl = audio;
      document.body.appendChild(audio);
      this.remoteTrackCallbacks.forEach(cb => cb({ peerId, stream: ev.streams[0], kind: 'audio' }));
      // Remote level analyser setup
      try {
        if (!this.audioContext) this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const rSource = this.audioContext.createMediaStreamSource(ev.streams[0]);
        const rAn = this.audioContext.createAnalyser(); rAn.fftSize = 512; rSource.connect(rAn);
        const rData = new Uint8Array(rAn.frequencyBinCount);
        this.remoteAnalysers.set(peerId, { analyser: rAn, data: rData, level: 0 });
      } catch(e){ console.warn('[rtc:native] remote analyser init failed', e); }
    };
    pc.onicecandidate = ev => { if (ev.candidate) this.signalSend?.({ to: peerId, type: 'ice-candidate', data: ev.candidate.toJSON() }); };
    pc.onconnectionstatechange = () => { if (['failed', 'disconnected', 'closed'].includes(pc.connectionState)) this.closePeer(peerId); };
    const initiator = this.sessionId < peerId;
    if (initiator) {
      pc.createOffer().then(offer => pc.setLocalDescription(offer).then(() => { this.signalSend?.({ to: peerId, type: 'offer', data: offer }); })).catch(e => console.error('[rtc:native] offer error', e));
    }
    return wrap;
  }

  private closePeer(peerId: string) {
    const wrap = this.peers.get(peerId); if (!wrap) return;
    if (wrap.audioEl) { wrap.audioEl.srcObject = null; wrap.audioEl.remove(); }
    wrap.pc.close(); this.peers.delete(peerId);
  }

  private setupLevelMeter() {
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const source = this.audioContext.createMediaStreamSource(this.localStream!);
      this.analyser = this.audioContext.createAnalyser(); this.analyser.fftSize = 512; source.connect(this.analyser);
  // Allocate plain Uint8Array compatible with AnalyserNode API
  this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
      const loop = () => {
        if (!this.analyser || !this.dataArray) return;
  // Casting to avoid TS inference issue with lib.dom.d.ts expecting Uint8Array<ArrayBuffer>
  // Cast to any to satisfy TypeScript signature mismatch seen in current project libs.
  this.analyser.getByteTimeDomainData(this.dataArray as any);
        let sum = 0; for (let i = 0; i < this.dataArray.length; i++) { const v = (this.dataArray[i] - 128) / 128; sum += v * v; }
        const rms = Math.sqrt(sum / this.dataArray.length); this.level = Math.min(1, rms * 4);
        // Update remote levels
        this.remoteAnalysers.forEach((obj, id) => {
          obj.analyser.getByteTimeDomainData(obj.data as any);
          let rs = 0; for (let i = 0; i < obj.data.length; i++) { const v = (obj.data[i] - 128) / 128; rs += v * v; }
          const rrms = Math.sqrt(rs / obj.data.length); obj.level = Math.min(1, rrms * 4);
          const peer = this.peers.get(id); if (peer) peer.lastLevel = obj.level;
        });
        requestAnimationFrame(loop);
      };
      loop();
    } catch (e) { console.warn('[rtc:native] meter init failed', e); }
  }
}
