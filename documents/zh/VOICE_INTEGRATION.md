# 语音通讯集成指南

本指南提供了在 MMO 服务器中集成和使用语音通讯系统的全面文档。

## 概述

语音通讯系统使用 WebRTC 点对点连接实现实时语音聊天。 The server acts as a signaling relay, coordinating connection establishment between clients while keeping media traffic peer-to-peer for optimal latency and performance.

## 架构

### 设计原则

1. **Peer-to-Peer**: Audio/video streams directly between clients (no server relay)
2. **Server Signaling**: Server coordinates WebRTC connection setup
3. **Channel-Based**: Players organize into voice channels
4. **Low Overhead**: Minimal server resources for media streaming
5. **Scalable**: Supports multiple channel types and use cases

### 组件

```
┌─────────────────────────────────────────────────────────────┐
│                        MMO Server                           │
│                                                             │
│  ┌──────────────────┐        ┌──────────────────────┐     │
│  │ VoiceChannelMgr  │◄──────►│  MyRoomState         │     │
│  │  - Join/Leave    │        │  - voiceChannels     │     │
│  │  - Mute/Deafen   │        │  - Players state     │     │
│  │  - Rate Limiting │        └──────────────────────┘     │
│  └──────────────────┘                                      │
│         ▲                                                   │
│         │ Signaling                                        │
│         ▼                                                   │
│  ┌──────────────────┐                                      │
│  │  Message Handlers│                                      │
│  │  voice:join      │                                      │
│  │  voice:leave     │                                      │
│  │  voice:signal    │                                      │
│  │  voice:mute      │                                      │
│  └──────────────────┘                                      │
└─────────────────────────────────────────────────────────────┘
         ▲                                ▲
         │ WebSocket                      │ WebSocket
         │ (Signaling)                    │ (Signaling)
         ▼                                ▼
┌─────────────────┐            ┌─────────────────┐
│   Client A      │            │   Client B      │
│  ┌───────────┐  │  WebRTC    │  ┌───────────┐  │
│  │ WebRTC    │◄─┼────────────┼─►│ WebRTC    │  │
│  │ Peer      │  │  (Direct)  │  │ Peer      │  │
│  └───────────┘  │            │  └───────────┘  │
└─────────────────┘            └─────────────────┘
```

## Voice Channel Types

### 1. 全局频道
- **Purpose**: Server-wide voice communication
- **Max Members**: 100 (configurable)
- **Auto-created**: Yes
- **Deletable**: No
- **Use Case**: Lobby chat, server announcements

### 2. 分组频道
- **Purpose**: Team/guild voice communication
- **Max Members**: 50 (default, configurable up to 100)
- **Auto-created**: No (created by players)
- **Deletable**: Yes (by owner)
- **Use Case**: Party/team coordination, guild meetings

### 3. 私密频道
- **Purpose**: One-on-one or small group conversations
- **Max Members**: Configurable (typically 2-10)
- **Auto-created**: No
- **Deletable**: Yes (by owner)
- **Use Case**: Private conversations, direct calls

### 4. 邻近频道
- **Purpose**: Spatial voice (hear nearby players)
- **Max Members**: Dynamic (based on proximity)
- **Auto-created**: Yes (on demand)
- **Deletable**: Yes (when empty)
- **Use Case**: Immersive in-game voice, local area chat

## 服务器端 API

### 消息处理器

#### Join Voice Channel
```typescript
room.send('voice:join', { channelId: 'global' });
```

**Parameters:**
- `channelId` (string): ID of the channel to join

**Behavior:**
- Automatically leaves current channel if in one
- Validates channel exists and is not full
- Updates player state and channel membership
- Rate limited: 20 actions per 5 seconds

#### Leave Voice Channel
```typescript
room.send('voice:leave');
```

**Behavior:**
- Removes from current voice channel
- Clears player's voice channel state
- Auto-deletes empty non-global channels
- Rate limited: 20 actions per 5 seconds

#### Create Voice Channel
```typescript
room.send('voice:create', {
  name: 'Team Alpha',
  type: 'group',        // 'global' | 'proximity' | 'group' | 'private'
  maxMembers: 10        // Optional, defaults to 50
});
```

**Parameters:**
- `name` (string): Display name for the channel
- `type` (string): Channel type
- `maxMembers` (number, optional): Maximum members (capped at 100)

**Behavior:**
- Creates new voice channel owned by the sender
- Auto-generates unique channel ID
- Rate limited: 20 actions per 5 seconds (costs 3 tokens)

#### Toggle Mute
```typescript
room.send('voice:mute', { muted: true });
```

**Parameters:**
- `muted` (boolean): Mute state

**Behavior:**
- Updates player mute state
- Syncs state to all channel members
- Rate limited: 20 actions per 5 seconds

#### Toggle Deafen
```typescript
room.send('voice:deafen', { deafened: true });
```

**Parameters:**
- `deafened` (boolean): Deafen state

**Behavior:**
- Updates player deafen state
- Syncs state to all channel members
- Rate limited: 20 actions per 5 seconds

#### WebRTC Signaling
```typescript
room.send('voice:signal', {
  to: 'target_session_id',
  type: 'offer',              // 'offer' | 'answer' | 'ice-candidate'
  data: { /* WebRTC data */ }
});
```

**Parameters:**
- `to` (string): Target peer session ID
- `type` (string): Signal type
- `data` (object): WebRTC signaling data (offer/answer/ICE candidate)

**Behavior:**
- Relays signaling message to target peer
- Validates both peers are in same channel
- Rate limited: 100 signals per 20 seconds

**Received Signal:**
```typescript
room.onMessage('voice:signal', (message) => {
  // message.from: sender session ID
  // message.type: signal type
  // message.data: WebRTC data
});
```

### VoiceChannelManager API

The server uses `VoiceChannelManager` for voice channel operations:

```typescript
class VoiceChannelManager {
  // Initialize default channels
  initializeDefaultChannels(voiceChannels: MapSchema<VoiceChannel>): void
  
  // Create a channel
  createChannel(
    voiceChannels: MapSchema<VoiceChannel>,
    channelId: string,
    name: string,
    type: 'global' | 'proximity' | 'group' | 'private',
    ownerId: string,
    maxMembers?: number
  ): VoiceChannel | null
  
  // Delete a channel
  deleteChannel(
    voiceChannels: MapSchema<VoiceChannel>,
    channelId: string,
    requesterId: string
  ): boolean
  
  // Join a channel
  joinChannel(
    voiceChannels: MapSchema<VoiceChannel>,
    player: Player,
    sessionId: string,
    channelId: string
  ): boolean
  
  // Leave a channel
  leaveChannel(
    voiceChannels: MapSchema<VoiceChannel>,
    player: Player,
    sessionId: string
  ): boolean
  
  // Toggle mute
  toggleMute(
    voiceChannels: MapSchema<VoiceChannel>,
    player: Player,
    sessionId: string,
    muted: boolean
  ): boolean
  
  // Toggle deafen
  toggleDeafen(
    voiceChannels: MapSchema<VoiceChannel>,
    player: Player,
    sessionId: string,
    deafened: boolean
  ): boolean
  
  // Get channel members (for peer discovery)
  getChannelMembers(
    voiceChannels: MapSchema<VoiceChannel>,
    sessionId: string,
    player: Player
  ): string[]
  
  // Get nearby players (for proximity voice)
  getProximityMembers(
    players: Map<string, Player>,
    sessionId: string,
    maxDistance?: number
  ): string[]
  
  // Check signaling rate limit
  canSendSignal(sessionId: string): boolean
  
  // Cleanup rate limiters
  cleanup(): void
}
```

## State Schema

### VoiceChannel
```typescript
class VoiceChannel extends Schema {
  @type('string') id: string
  @type('string') name: string
  @type('string') type: string // 'global' | 'proximity' | 'group' | 'private'
  @type({ map: VoiceChannelMember }) members: MapSchema<VoiceChannelMember>
  @type('number') maxMembers: number
  @type('number') createdAt: number
  @type('string') ownerId: string // For group/private channels
}
```

### VoiceChannelMember
```typescript
class VoiceChannelMember extends Schema {
  @type('string') sessionId: string
  @type('string') playerName: string
  @type('boolean') muted: boolean
  @type('boolean') deafened: boolean
  @type('number') joinedAt: number
}
```

### Player (Voice-related fields)
```typescript
class Player extends Schema {
  // ... other fields
  
  @type('string') currentVoiceChannel: string  // Current channel ID
  @type('boolean') voiceMuted: boolean
  @type('boolean') voiceDeafened: boolean
}
```

## 客户端集成

### 基础设置

```typescript
import { Client } from 'colyseus.js';

const client = new Client('ws://localhost:2567');
const room = await client.joinOrCreate('my_room', { name: 'Player1' });

// Listen for voice channel updates
room.state.voiceChannels.onAdd((channel, channelId) => {
  console.log(`Channel ${channel.name} added`);
  
  // Listen for members joining/leaving
  channel.members.onAdd((member, sessionId) => {
    console.log(`${member.playerName} joined ${channel.name}`);
    
    // If not self, establish WebRTC connection
    if (sessionId !== room.sessionId) {
      createPeerConnection(sessionId);
    }
  });
  
  channel.members.onRemove((member, sessionId) => {
    console.log(`${member.playerName} left ${channel.name}`);
    closePeerConnection(sessionId);
  });
});

// Listen for signaling messages
room.onMessage('voice:signal', handleSignal);
```

### WebRTC Integration

```typescript
const peerConnections = new Map<string, RTCPeerConnection>();

async function createPeerConnection(peerId: string) {
  const pc = new RTCPeerConnection({
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      // Add TURN servers for production
    ]
  });
  
  peerConnections.set(peerId, pc);
  
  // Add local audio stream
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  stream.getTracks().forEach(track => pc.addTrack(track, stream));
  
  // Handle incoming streams
  pc.ontrack = (event) => {
    const audio = new Audio();
    audio.srcObject = event.streams[0];
    audio.play();
  };
  
  // Handle ICE candidates
  pc.onicecandidate = (event) => {
    if (event.candidate) {
      room.send('voice:signal', {
        to: peerId,
        type: 'ice-candidate',
        data: event.candidate.toJSON()
      });
    }
  };
  
  // Create offer
  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);
  
  room.send('voice:signal', {
    to: peerId,
    type: 'offer',
    data: offer
  });
}

async function handleSignal(message: any) {
  const { from, type, data } = message;
  
  let pc = peerConnections.get(from);
  
  if (type === 'offer') {
    if (!pc) {
      pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
      });
      peerConnections.set(from, pc);
      
      // Setup handlers (same as above)
      // ...
    }
    
    await pc.setRemoteDescription(new RTCSessionDescription(data));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    
    room.send('voice:signal', {
      to: from,
      type: 'answer',
      data: answer
    });
  } else if (type === 'answer') {
    await pc?.setRemoteDescription(new RTCSessionDescription(data));
  } else if (type === 'ice-candidate') {
    await pc?.addIceCandidate(new RTCIceCandidate(data));
  }
}

function closePeerConnection(peerId: string) {
  const pc = peerConnections.get(peerId);
  pc?.close();
  peerConnections.delete(peerId);
}
```

### Channel Management

```typescript
// Join global voice
function joinGlobalVoice() {
  room.send('voice:join', { channelId: 'global' });
}

// Create team channel
function createTeamChannel() {
  room.send('voice:create', {
    name: 'Team Alpha',
    type: 'group',
    maxMembers: 10
  });
}

// Mute/unmute
function toggleMute(muted: boolean) {
  room.send('voice:mute', { muted });
}

// Deafen/undeafen
function toggleDeafen(deafened: boolean) {
  room.send('voice:deafen', { deafened });
}

// Leave channel
function leaveVoice() {
  // Close all peer connections
  peerConnections.forEach(pc => pc.close());
  peerConnections.clear();
  
  room.send('voice:leave');
}
```

## Security Considerations

### 速率限制

The system implements multiple rate limiting tiers:

1. **Voice Actions**: 20 actions per 5 seconds
   - Join, leave, mute, deafen, create channel
   
2. **Signaling**: 100 messages per 20 seconds
   - WebRTC offer, answer, ICE candidates

### 验证

- Channel IDs validated (3-50 characters)
- Max members capped at 100
- Only channel owners can delete non-global channels
- Signaling only allowed between members of same channel

### 隐私

- WebRTC connections are peer-to-peer (server doesn't see media)
- Media streams encrypted end-to-end via WebRTC (DTLS-SRTP)
- Server only relays signaling metadata

## Performance Considerations

### 服务器资源

- **Minimal**: Server only handles signaling, no media relay
- **Memory**: ~1KB per channel member for state synchronization
- **CPU**: Negligible (just message forwarding)
- **Bandwidth**: Only signaling data (~1-5KB per connection establishment)

### 客户端资源

- **CPU**: Depends on audio codec and peer count
- **Memory**: ~10-50MB per active peer connection
- **Bandwidth**: ~50-100 Kbps per peer for audio (Opus codec)

### Scaling Recommendations

1. **Small Deployment** (< 100 concurrent players)
   - Default settings work well
   - Single server sufficient

2. **Medium Deployment** (100-1000 players)
   - Consider limiting voice channel sizes
   - Use proximity channels to reduce peer connections
   - Monitor client CPU/bandwidth usage

3. **Large Deployment** (> 1000 players)
   - Implement channel sharding
   - Add TURN servers for NAT traversal
   - Consider selective voice relay for very large channels
   - Use spatial audio algorithms to limit active connections

## Troubleshooting

### 常见问题

#### Peers Can't Connect
- **Cause**: NAT/firewall blocking WebRTC
- **Solution**: Add TURN servers to `RTCPeerConnection` config

#### High Latency
- **Cause**: Suboptimal network routing
- **Solution**: Use TURN servers closer to users

#### Echo/Feedback
- **Cause**: No echo cancellation
- **Solution**: Enable echo cancellation in `getUserMedia`:
  ```typescript
  { audio: { echoCancellation: true, noiseSuppression: true } }
  ```

#### Signaling Rate Limited
- **Cause**: Too many connection attempts
- **Solution**: Implement exponential backoff, batch ICE candidates

### Debug Mode

Enable verbose logging:

```typescript
// Server-side
console.log('Voice channels:', room.state.voiceChannels.size);
room.state.voiceChannels.forEach((channel, id) => {
  console.log(`  ${id}: ${channel.members.size} members`);
});

// Client-side
pc.oniceconnectionstatechange = () => {
  console.log('ICE state:', pc.iceConnectionState);
};

pc.onconnectionstatechange = () => {
  console.log('Connection state:', pc.connectionState);
};
```

## 高级功能

### 邻近语音

Implement spatial voice chat:

```typescript
// Server-side: Get nearby players
const nearbyIds = voiceChannelManager.getProximityMembers(
  playerMap,
  sessionId,
  200 // Max distance
);

// Client-side: Adjust volume based on distance
function updateVolumeForDistance(distance: number, maxDistance: number) {
  const volume = Math.max(0, 1 - (distance / maxDistance));
  audioElement.volume = volume;
}
```

### 语音活动检测

Implement "speaking" indicator:

```typescript
// Client-side
const audioContext = new AudioContext();
const analyser = audioContext.createAnalyser();
const microphone = audioContext.createMediaStreamSource(stream);

microphone.connect(analyser);

function checkVoiceActivity() {
  const dataArray = new Uint8Array(analyser.frequencyBinCount);
  analyser.getByteFrequencyData(dataArray);
  
  const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
  const isSpeaking = average > 10; // Threshold
  
  // Update UI or notify server
}
```

### Recording Support

```typescript
const mediaRecorder = new MediaRecorder(stream);
const chunks: Blob[] = [];

mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
mediaRecorder.onstop = () => {
  const blob = new Blob(chunks, { type: 'audio/webm' });
  // Save or upload blob
};

mediaRecorder.start();
// ... later
mediaRecorder.stop();
```

## 生产部署

### TURN 服务器设置

For reliable NAT traversal in production:

```typescript
const iceServers = [
  { urls: 'stun:stun.l.google.com:19302' },
  {
    urls: 'turn:your-turn-server.com:3478',
    username: 'username',
    credential: 'password'
  }
];
```

Consider using:
- **coturn**: Open-source TURN server
- **Twilio TURN**: Managed service
- **Xirsys**: Managed service

### 监控

Track voice metrics:

```typescript
// Connection success rate
pc.oniceconnectionstatechange = () => {
  if (pc.iceConnectionState === 'connected') {
    metrics.increment('voice.connections.success');
  } else if (pc.iceConnectionState === 'failed') {
    metrics.increment('voice.connections.failed');
  }
};

// Active channels
const activeChannels = room.state.voiceChannels.size;
metrics.gauge('voice.channels.active', activeChannels);
```

## 最佳实践

1. **Cleanup**: Always close peer connections on disconnect
2. **Error Handling**: Gracefully handle WebRTC failures
3. **User Controls**: Provide clear mute/deafen UI
4. **Privacy**: Show indicators when voice is active
5. **Permissions**: Request microphone access responsibly
6. **Bandwidth**: Monitor and limit connections for mobile users
7. **Testing**: Test on various networks and devices
8. **Fallback**: Provide text chat alternative

## License & Credits

This voice communication system is part of the MMO server project and follows the same license.

WebRTC is a W3C standard supported by all modern browsers.
