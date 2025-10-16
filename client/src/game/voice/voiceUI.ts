import { voiceState } from './voiceTypes';
import type { Room } from 'colyseus.js';
import type { MyRoomState } from '../../states/MyRoomState';

export function ensureVoicePanel() {
  if (document.getElementById('voice-panel')) return;
  const overlay = document.getElementById('ui-overlay');
  if (!overlay) return;
  const panel = document.createElement('div');
  panel.id = 'voice-panel';
  panel.className = 'panel';
  panel.innerHTML = `
    <h3>语音</h3>
    <div id="voice-controls" style="display:flex;gap:4px;flex-wrap:wrap;margin-bottom:6px;">
      <button id="voice-join-global">加入全局</button>
      <button id="voice-leave">离开</button>
      <button id="voice-mute">静音</button>
      <button id="voice-deafen">耳聋</button>
    </div>
    <div style="margin:4px 0;display:flex;align-items:center;gap:6px;">
      <span style="font-size:12px;color:#888;">输入电平</span>
      <div id="voice-level-bar" style="position:relative;width:110px;height:8px;background:#222;border:1px solid #444;">
        <div id="voice-level-fill" style="position:absolute;left:0;top:0;height:100%;width:0;background:linear-gradient(90deg,#2ecc71,#f1c40f,#e67e22,#e74c3c);"></div>
      </div>
      <span id="voice-level-text" style="font-size:10px;color:#999;width:38px;">0%</span>
    </div>
    <div id="voice-status" style="font-size:12px;color:#ccc;">未连接</div>
    <div id="voice-members" style="margin-top:6px;max-height:120px;overflow:auto;font-size:12px;"></div>
  `;
  overlay.appendChild(panel);
  injectVoiceStyles();
}

export function updateVoiceDisplay(room: Room<MyRoomState>) {
  const myPlayer = room.state.players.get(room.sessionId);
  const statusDiv = document.getElementById('voice-status');
  const membersDiv = document.getElementById('voice-members');
  if (!statusDiv || !membersDiv) return;
  if (myPlayer?.currentVoiceChannel) {
    const channel = room.state.voiceChannels.get(myPlayer.currentVoiceChannel);
    const channelName = channel ? channel.name : myPlayer.currentVoiceChannel;
    const muteStatus = voiceState.isMuted ? '🔇' : '🎤';
    const deafStatus = voiceState.isDeafened ? '🙉' : '👂';
    statusDiv.textContent = `${muteStatus} ${deafStatus} ${channelName}`;
    if (channel) {
      let html = '<div style="margin-top:4px;">成员:</div>';
      channel.members.forEach(member => {
        html += `<div>${member.muted ? '🔇' : '🎤'}${member.deafened ? '🙉' : '👂'} ${member.playerName}</div>`;
      });
      membersDiv.innerHTML = html;
    } else {
      membersDiv.innerHTML = '';
    }
  } else {
    statusDiv.textContent = '未连接';
    membersDiv.innerHTML = '';
  }
}

export function setVoiceButtonsState(joined: boolean) {
  const joinBtn = document.getElementById('voice-join-global') as HTMLButtonElement | null;
  const leaveBtn = document.getElementById('voice-leave') as HTMLButtonElement | null;
  const muteBtn = document.getElementById('voice-mute') as HTMLButtonElement | null;
  const deafenBtn = document.getElementById('voice-deafen') as HTMLButtonElement | null;
  if (!joinBtn || !leaveBtn || !muteBtn || !deafenBtn) return;
  joinBtn.disabled = joined;
  leaveBtn.disabled = !joined;
  muteBtn.disabled = !joined;
  deafenBtn.disabled = !joined;
  muteBtn.classList.toggle('active', voiceState.isMuted);
  deafenBtn.classList.toggle('active', voiceState.isDeafened);
}

function injectVoiceStyles() {
  if (document.getElementById('voice-style')) return;
  const style = document.createElement('style');
  style.id = 'voice-style';
  style.textContent = `#voice-panel button.active{background:#444;border:1px solid #888;}#voice-panel button:disabled{opacity:.5;cursor:not-allowed;}`;
  document.head.appendChild(style);
}

export function updateInputLevel(level: number) {
  const fill = document.getElementById('voice-level-fill') as HTMLDivElement | null;
  const txt = document.getElementById('voice-level-text');
  if (!fill || !txt) return;
  const pct = Math.min(1, level);
  fill.style.width = (pct * 100).toFixed(1) + '%';
  txt.textContent = Math.round(pct * 100) + '%';
  // 颜色高亮策略可选
  fill.style.filter = pct > 0.75 ? 'brightness(1.2)' : pct > 0.4 ? 'brightness(1.0)' : 'brightness(0.8)';
}

export function wireVoiceButtons(room: Room<MyRoomState>, currentPlayerId: string, joinGlobal: () => Promise<void>, leave: () => void, toggleMute: () => void, toggleDeafen: () => void) {
  const joinBtn = document.getElementById('voice-join-global');
  const leaveBtn = document.getElementById('voice-leave');
  const muteBtn = document.getElementById('voice-mute');
  const deafenBtn = document.getElementById('voice-deafen');
  joinBtn?.addEventListener('click', () => joinGlobal().then(() => setVoiceButtonsState(true)));
  leaveBtn?.addEventListener('click', () => { leave(); setVoiceButtonsState(false); });
  muteBtn?.addEventListener('click', () => { toggleMute(); setVoiceButtonsState(true); updateVoiceDisplay(room); });
  deafenBtn?.addEventListener('click', () => { toggleDeafen(); setVoiceButtonsState(true); updateVoiceDisplay(room); });
}
