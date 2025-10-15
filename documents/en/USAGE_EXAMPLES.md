# MMO Server Usage Examples

This file contains examples of how to use the MMO server features.

## Client Connection

```typescript
import { Client } from 'colyseus.js';

const client = new Client('ws://localhost:2567');

// Join room with player name
const room = await client.joinOrCreate('my_room', {
  name: 'PlayerName'
});

console.log('Joined room:', room.id);
```

## Movement

```typescript
// Send movement command
room.send('move', { x: 1, y: 0 }); // Move right
room.send('move', { x: -1, y: 0 }); // Move left
room.send('move', { x: 0, y: 1 }); // Move down
room.send('move', { x: 0, y: -1 }); // Move up
room.send('move', { x: 0, y: 0 }); // Stop
```

## Combat

```typescript
// Attack another player
room.send('attack', {
  targetId: 'target_session_id'
});

// Use a skill to attack
room.send('attack', {
  targetId: 'target_session_id',
  skillId: 'fireball' // or 'heal', 'shield', 'dash'
});
```

## Chat

```typescript
// Send a global chat message
room.send('chat', {
  message: 'Hello everyone!',
  channel: 'global'
});

// Send a team message
room.send('chat', {
  message: 'Let\'s group up!',
  channel: 'team'
});
```

## Friends

```typescript
// Add a friend
room.send('friend', {
  targetId: 'friend_session_id',
  action: 'add'
});

// Remove a friend
room.send('friend', {
  targetId: 'friend_session_id',
  action: 'remove'
});
```

## Quests

```typescript
// Abandon a quest
room.send('quest', {
  questId: 'kill_enemies_1',
  action: 'abandon'
});
```

## Listening to State Changes

```typescript
// Listen to player changes
room.state.players.onAdd((player, sessionId) => {
  console.log('Player joined:', sessionId);
  
  // Listen to player property changes
  player.onChange(() => {
    console.log('Player updated:', {
      name: player.name,
      level: player.level,
      health: player.health,
      experience: player.experience
    });
  });
});

room.state.players.onRemove((player, sessionId) => {
  console.log('Player left:', sessionId);
});

// Listen to chat messages
room.state.chatMessages.onAdd((message) => {
  console.log(`[${message.channel}] ${message.sender}: ${message.message}`);
});

// Listen to leaderboard changes
room.state.leaderboard.onChange(() => {
  console.log('Leaderboard updated:');
  room.state.leaderboard.forEach((entry, index) => {
    console.log(`${entry.rank}. ${entry.playerName} - Level ${entry.level} - Score: ${entry.score}`);
  });
});
```

## Accessing Player Stats

```typescript
const myPlayer = room.state.players.get(room.sessionId);

// Character info
console.log('Level:', myPlayer.level);
console.log('Experience:', myPlayer.experience, '/', myPlayer.experienceToNext);

// Combat stats
console.log('Health:', myPlayer.health, '/', myPlayer.maxHealth);
console.log('Mana:', myPlayer.mana, '/', myPlayer.maxMana);
console.log('Attack:', myPlayer.attack);
console.log('Defense:', myPlayer.defense);

// Skills
myPlayer.skills.forEach(skill => {
  const cooldownRemaining = Math.max(0, skill.cooldown - (Date.now() - skill.lastUsed));
  console.log(`${skill.name}: ${cooldownRemaining > 0 ? 'On cooldown' : 'Ready'}`);
});

// Quests
myPlayer.quests.forEach(quest => {
  console.log(`${quest.name}: ${quest.progress}/${quest.target} ${quest.completed ? '✓' : ''}`);
});

// Achievements
myPlayer.achievements.forEach(achievement => {
  if (achievement.unlocked) {
    console.log(`✓ ${achievement.name}: ${achievement.description}`);
  }
});

// Statistics
console.log('K/D:', myPlayer.kills, '/', myPlayer.deaths);
console.log('Damage dealt:', myPlayer.damageDealt);
console.log('Damage taken:', myPlayer.damageTaken);

// Friends
console.log('Friends:', myPlayer.friends.length);
```

## Complete Game Loop Example

```typescript
import { Client } from 'colyseus.js';

async function main() {
  const client = new Client('ws://localhost:2567');
  const room = await client.joinOrCreate('my_room', { name: 'Hero' });
  
  console.log('Connected to room:', room.id);
  
  // Listen to state
  room.state.players.onAdd((player, sessionId) => {
    console.log('Player joined:', player.name);
  });
  
  room.state.chatMessages.onAdd((msg) => {
    console.log(`[${msg.channel}] ${msg.sender}: ${msg.message}`);
  });
  
  // Send initial chat
  room.send('chat', { message: 'Hello world!', channel: 'global' });
  
  // Game loop
  let moveDirection = { x: 1, y: 0 };
  let skillCooldowns = {};
  
  setInterval(() => {
    const myPlayer = room.state.players.get(room.sessionId);
    if (!myPlayer) return;
    
    // Move
    room.send('move', moveDirection);
    
    // Use heal skill when low health
    if (myPlayer.health < myPlayer.maxHealth * 0.5) {
      const healSkill = myPlayer.skills.find(s => s.id === 'heal');
      if (healSkill) {
        const cooldownRemaining = Math.max(0, healSkill.cooldown - (Date.now() - healSkill.lastUsed));
        if (cooldownRemaining === 0) {
          room.send('attack', { targetId: room.sessionId, skillId: 'heal' });
        }
      }
    }
    
    // Find and attack nearby enemies
    room.state.players.forEach((otherPlayer, otherId) => {
      if (otherId !== room.sessionId && !myPlayer.inCombat) {
        // Calculate distance (simplified)
        const dx = otherPlayer.x - myPlayer.x;
        const dy = otherPlayer.y - myPlayer.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < 100) {
          room.send('attack', { targetId: otherId, skillId: 'fireball' });
        }
      }
    });
    
  }, 100); // 10 updates per second
  
  // Handle disconnect
  room.onLeave((code) => {
    console.log('Left room with code:', code);
  });
}

main().catch(console.error);
```

## Performance Tips

1. **Batch Updates**: Don't send messages on every frame, use a reasonable interval
2. **Client-side Prediction**: Update local state immediately, reconcile with server
3. **Interest Management**: Only track nearby entities, not all players
4. **Throttle State Changes**: Use onChange callbacks judiciously
5. **Cache Calculations**: Pre-calculate distances and cooldowns

## Security Notes

1. All messages are rate-limited on the server
2. Input is validated and sanitized
3. Don't trust client data - server is authoritative
4. Chat messages are filtered for profanity
5. Player names are validated (alphanumeric, 3-20 chars)

## Voice Communication

### Joining Voice Channels

```typescript
// Join global voice channel
room.send('voice:join', { channelId: 'global' });

// Listen for channel updates
room.state.voiceChannels.onAdd((channel, channelId) => {
  console.log('Voice channel available:', channel.name);
  
  // Listen for members
  channel.members.onAdd((member, sessionId) => {
    console.log(`${member.playerName} joined voice`);
    if (member.muted) console.log('  (muted)');
  });
});
```

### Creating Voice Channels

```typescript
// Create a team voice channel
room.send('voice:create', {
  name: 'Team Alpha',
  type: 'group',      // 'global', 'proximity', 'group', 'private'
  maxMembers: 10
});

// Create a private call
room.send('voice:create', {
  name: 'Private Call',
  type: 'private',
  maxMembers: 2
});
```

### Voice Controls

```typescript
// Toggle mute
room.send('voice:mute', { muted: true });

// Toggle deafen (can't hear others)
room.send('voice:deafen', { deafened: true });

// Leave voice channel
room.send('voice:leave');
```

### WebRTC Voice Setup

```typescript
// Setup peer connections for voice chat
const peerConnections = new Map<string, RTCPeerConnection>();

// Create peer connection to another player
async function setupVoiceConnection(peerId: string) {
  const pc = new RTCPeerConnection({
    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
  });
  
  peerConnections.set(peerId, pc);
  
  // Add microphone stream
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  stream.getTracks().forEach(track => pc.addTrack(track, stream));
  
  // Receive audio from peer
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
  
  // Create and send offer
  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);
  
  room.send('voice:signal', {
    to: peerId,
    type: 'offer',
    data: offer
  });
}

// Handle signaling messages
room.onMessage('voice:signal', async (message) => {
  const { from, type, data } = message;
  
  let pc = peerConnections.get(from);
  
  if (type === 'offer') {
    if (!pc) {
      pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
      });
      peerConnections.set(from, pc);
      // ... setup handlers
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
});

// When member joins your channel
room.state.voiceChannels.get(myChannelId).members.onAdd((member, sessionId) => {
  if (sessionId !== room.sessionId) {
    setupVoiceConnection(sessionId);
  }
});
```

### Voice Channel Information

```typescript
// Get current voice channel
const myPlayer = room.state.players.get(room.sessionId);
if (myPlayer.currentVoiceChannel) {
  const channel = room.state.voiceChannels.get(myPlayer.currentVoiceChannel);
  console.log('In channel:', channel.name);
  console.log('Members:', channel.members.size);
  
  // List members
  channel.members.forEach((member, sessionId) => {
    console.log(`  - ${member.playerName} ${member.muted ? '(muted)' : ''}`);
  });
}

// List all available channels
room.state.voiceChannels.forEach((channel, channelId) => {
  console.log(`${channel.name} (${channel.type}): ${channel.members.size}/${channel.maxMembers}`);
});
```
