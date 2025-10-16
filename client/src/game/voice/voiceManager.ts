import type { Room } from 'colyseus.js';
import type { MyRoomState } from '../../states/MyRoomState';
import { getStateCallbacks } from 'colyseus.js';
import { voiceState, rtcConfig } from './voiceTypes';
import { ensureVoicePanel, updateVoiceDisplay, wireVoiceButtons, setVoiceButtonsState, updateInputLevel } from './voiceUI';

// Basic debounce for ICE flood (optional future improvement)

export async function initVoiceChat(room: Room<MyRoomState>, currentPlayerId: string) {
  ensureVoicePanel();
  const $$ = getStateCallbacks(room);

  // Channel listeners
  $$(room.state).voiceChannels.onAdd((channel, channelId) => {
    updateVoiceDisplay(room);
    $$(channel).members.onAdd((_member, sessionId) => {
      updateVoiceDisplay(room);
      const me = room.state.players.get(currentPlayerId);
      if (sessionId !== currentPlayerId && me?.currentVoiceChannel === channelId) {
        setupPeer(room, sessionId);
      }
    });
    $$(channel).members.onRemove((_member, sessionId) => {
      updateVoiceDisplay(room);
      closePeer(sessionId);
    });
  });
  $$(room.state).voiceChannels.onRemove(() => updateVoiceDisplay(room));

  // Player channel change
  const me = room.state.players.get(currentPlayerId);
  if (me) {
    $$(me).listen('currentVoiceChannel', () => updateVoiceDisplay(room));
  }

  // Signaling
  room.onMessage('voice:signal', (msg: any) => handleSignal(room, msg));

  // Buttons
  wireVoiceButtons(
    room,
    currentPlayerId,
    async () => {
      if (!voiceState.localStream) {
        try {
          voiceState.localStream = await navigator.mediaDevices.getUserMedia({
            audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
          });
          startLevelMeter(voiceState.localStream);
        } catch (e: any) {
          let msg = '麦克风获取失败';
            if (e && e.name) {
              switch (e.name) {
                case 'NotAllowedError':
                case 'PermissionDeniedError':
                  msg = '用户拒绝了麦克风访问，或此页面不是安全上下文(请使用 HTTPS 或 localhost)。';
                  break;
                case 'NotFoundError':
                  msg = '未找到可用的麦克风设备。';
                  break;
                case 'NotReadableError':
                case 'AbortError':
                  msg = '麦克风被其他程序占用或暂时不可用。';
                  break;
                case 'SecurityError':
                  msg = '安全策略阻止访问，请确认使用 localhost 或 HTTPS。';
                  break;
                case 'OverconstrainedError':
                  msg = '请求的音频约束无法满足(设备或参数不支持)。';
                  break;
              }
            }
          console.error('[voice] getUserMedia error:', e);
          alert(msg);
          return; }
      }
      room.send('voice:join', { channelId: 'global' });
    },
    () => {
      voiceState.peerConnections.forEach((_pc, id) => closePeer(id));
      voiceState.peerConnections.clear();
      room.send('voice:leave');
      updateVoiceDisplay(room);
    },
    () => { // mute
      voiceState.isMuted = !voiceState.isMuted;
      if (voiceState.localStream) {
        voiceState.localStream.getAudioTracks().forEach(t => t.enabled = !voiceState.isMuted);
      }
      room.send('voice:mute', { muted: voiceState.isMuted });
    },
    () => { // deafen
      voiceState.isDeafened = !voiceState.isDeafened;
      voiceState.peerConnections.forEach(pc => {
        const audio: HTMLAudioElement | undefined = (pc as any).remoteAudio;
        if (audio) audio.muted = voiceState.isDeafened;
      });
      room.send('voice:deafen', { deafened: voiceState.isDeafened });
    }
  );

  updateVoiceDisplay(room);
  setVoiceButtonsState(false);

  // Cleanup on room leave
  room.onLeave(() => {
    shutdownVoice();
    setVoiceButtonsState(false);
  });

  // Window unload
  window.addEventListener('beforeunload', () => {
    try { room.send('voice:leave'); } catch (_) {}
    shutdownVoice();
  }, { once: true });
}

function setupPeer(room: Room<MyRoomState>, peerId: string) {
  if (voiceState.peerConnections.has(peerId) || !voiceState.localStream) return;
  const pc = new RTCPeerConnection(rtcConfig);
  voiceState.peerConnections.set(peerId, pc);
  const isInitiator = room.sessionId < peerId; // 稳定排序避免 offer 冲突
  console.log('[voice] setupPeer', { peerId, isInitiator });
  voiceState.localStream.getTracks().forEach(track => pc.addTrack(track, voiceState.localStream!));
  pc.ontrack = (ev) => {
    const audio = document.createElement('audio');
    audio.autoplay = true;
  (audio as any).playsInline = true; // iOS safari inline
    audio.srcObject = ev.streams[0];
    (pc as any).remoteAudio = audio;
    // 可选：插入隐藏容器
    document.body.appendChild(audio);
    console.log('[voice] remote track received from', peerId);
  };
  pc.onicecandidate = (ev) => {
    if (ev.candidate) {
      room.send('voice:signal', { to: peerId, type: 'ice-candidate', data: ev.candidate.toJSON() });
    }
  };
  pc.onconnectionstatechange = () => {
    console.log('[voice] pc state', peerId, pc.connectionState);
    if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected' || pc.connectionState === 'closed') {
      closePeer(peerId);
    }
  };
  if (isInitiator) {
    createOffer(room, pc, peerId);
  }
}

async function createOffer(room: Room<MyRoomState>, pc: RTCPeerConnection, peerId: string) {
  try {
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    room.send('voice:signal', { to: peerId, type: 'offer', data: offer });
  } catch (e) { console.error('offer error', e); }
}

async function handleSignal(room: Room<MyRoomState>, msg: any) {
  const { from, type, data } = msg;
  let pc = voiceState.peerConnections.get(from);
  const isInitiator = room.sessionId < from;
  if (type === 'offer') {
    // 如果我们是发起者但仍收到 offer，说明冲突，忽略该 offer（或做更复杂的 glare 处理）
    if (isInitiator) {
      console.warn('[voice] glare: initiator received offer from', from, 'ignoring');
      return;
    }
    if (!pc) {
      pc = new RTCPeerConnection(rtcConfig);
      voiceState.peerConnections.set(from, pc);
      if (voiceState.localStream) voiceState.localStream.getTracks().forEach(t => pc!.addTrack(t, voiceState.localStream!));
      pc.ontrack = (ev) => {
        const audio = document.createElement('audio');
        audio.autoplay = true; (audio as any).playsInline = true;
        audio.srcObject = ev.streams[0];
        (pc as any).remoteAudio = audio; document.body.appendChild(audio);
        console.log('[voice] remote track (offer path) from', from);
      };
      pc.onicecandidate = (ev) => { if (ev.candidate) room.send('voice:signal', { to: from, type: 'ice-candidate', data: ev.candidate.toJSON() }); };
    }
    try {
      await pc.setRemoteDescription(new RTCSessionDescription(data));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      room.send('voice:signal', { to: from, type: 'answer', data: answer });
      console.log('[voice] sent answer to', from);
    } catch (e) { console.error('[voice] answer error', e); }
  } else if (type === 'answer') {
    try { await pc?.setRemoteDescription(new RTCSessionDescription(data)); console.log('[voice] set remote answer from', from); } catch (e) { console.error('[voice] set answer error', e); }
  } else if (type === 'ice-candidate') {
    try { await pc?.addIceCandidate(new RTCIceCandidate(data)); } catch (e) { console.error('[voice] ice error', e); }
  }
}

function closePeer(peerId: string) {
  const pc = voiceState.peerConnections.get(peerId);
  if (!pc) return;
  const audio: HTMLAudioElement | undefined = (pc as any).remoteAudio;
  if (audio) { audio.srcObject = null; }
  pc.close();
  voiceState.peerConnections.delete(peerId);
}

export function shutdownVoice() {
  voiceState.peerConnections.forEach((_pc, id) => closePeer(id));
  voiceState.peerConnections.clear();
  if (voiceState.localStream) {
    voiceState.localStream.getTracks().forEach(t => t.stop());
    voiceState.localStream = null;
  }
  stopLevelMeter();
}

// -------- Input Level Meter --------
let levelMeterRAF: number | null = null;
let audioContext: AudioContext | null = null;
let analyser: AnalyserNode | null = null;
let dataArray: Uint8Array | null = null;

function startLevelMeter(stream: MediaStream) {
  try {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const source = audioContext.createMediaStreamSource(stream);
    analyser = audioContext.createAnalyser();
    analyser.fftSize = 512;
    source.connect(analyser);
    dataArray = new Uint8Array(analyser.frequencyBinCount);
    const update = () => {
      if (!analyser || !dataArray) return;
  analyser.getByteTimeDomainData(dataArray as any);
      // 归一化求瞬时幅度 (RMS)
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) {
        const v = (dataArray[i] - 128) / 128; // -1..1
        sum += v * v;
      }
      const rms = Math.sqrt(sum / dataArray.length); // 0..1 典型语音 ~0.02-0.3
      // 放大一点并限制 (可调) 让 UI 更灵敏
      const scaled = Math.min(1, rms * 4);
      updateInputLevel(scaled);
      levelMeterRAF = requestAnimationFrame(update);
    };
    update();
  } catch (e) {
    console.warn('[voice] level meter init failed', e);
  }
}

function stopLevelMeter() {
  if (levelMeterRAF) cancelAnimationFrame(levelMeterRAF);
  levelMeterRAF = null;
  if (audioContext) {
    audioContext.close().catch(()=>{});
  }
  audioContext = null;
  analyser = null;
  dataArray = null;
  updateInputLevel(0);
}
