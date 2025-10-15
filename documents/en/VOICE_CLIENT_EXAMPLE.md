# Voice Communication Client Example

This is a complete working example of integrating voice communication into a web-based MMO client.

## Quick Start

### 1. Server Setup
```bash
# Start the server
yarn install
yarn build
yarn start
```

### 2. Client Usage

Create an HTML file with this code:

```html
<!DOCTYPE html>
<html>
<head>
  <title>MMO Voice Chat Example</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 20px; }
    .channel { border: 1px solid #ccc; padding: 10px; margin: 10px 0; }
    .member { padding: 5px; margin: 5px 0; background: #f0f0f0; }
    .muted { color: #999; }
    button { margin: 5px; padding: 8px 15px; }
    #status { padding: 10px; background: #e8f5e9; margin: 10px 0; }
  </style>
</head>
<body>
  <h1>MMO Voice Chat Demo</h1>
  
  <div id="status">Disconnected</div>
  
  <div>
    <button onclick="connect()">Connect to Server</button>
    <button onclick="disconnect()">Disconnect</button>
  </div>
  
  <h2>Voice Channels</h2>
  <div>
    <button onclick="joinGlobal()">Join Global Voice</button>
    <button onclick="createTeam()">Create Team Channel</button>
    <button onclick="leaveVoice()">Leave Voice</button>
  </div>
  
  <div>
    <button onclick="toggleMute()">Toggle Mute</button>
    <button onclick="toggleDeafen()">Toggle Deafen</button>
  </div>
  
  <div id="channels"></div>
  
  <h2>My Status</h2>
  <div id="myStatus">Not in voice</div>
  
  <script src="https://unpkg.com/colyseus.js@^0.16.0/dist/colyseus.js"></script>
  <script>
    let room = null;
    let localStream = null;
    const peerConnections = new Map();
    let isMuted = false;
    let isDeafened = false;
    
    // WebRTC configuration
    const rtcConfig = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    };
    
    async function connect() {
      try {
        const client = new Colyseus.Client('ws://localhost:2567');
        room = await client.joinOrCreate('my_room', { name: 'VoiceUser' });
        
        document.getElementById('status').textContent = 'Connected to room: ' + room.id;
        
        // Setup voice channel listeners
        setupVoiceListeners();
        
        // Get microphone permission
        try {
          localStream = await navigator.mediaDevices.getUserMedia({ 
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true
            }
          });
          console.log('Microphone access granted');
        } catch (err) {
          console.error('Microphone access denied:', err);
          alert('Please grant microphone permission for voice chat');
        }
      } catch (err) {
        console.error('Connection failed:', err);
        document.getElementById('status').textContent = 'Connection failed: ' + err.message;
      }
    }
    
    function disconnect() {
      if (room) {
        // Close all peer connections
        peerConnections.forEach(pc => pc.close());
        peerConnections.clear();
        
        // Stop microphone
        if (localStream) {
          localStream.getTracks().forEach(track => track.stop());
          localStream = null;
        }
        
        room.leave();
        room = null;
        
        document.getElementById('status').textContent = 'Disconnected';
        document.getElementById('channels').innerHTML = '';
        document.getElementById('myStatus').textContent = 'Not in voice';
      }
    }
    
    function setupVoiceListeners() {
      // Listen for voice channels
      room.state.voiceChannels.onAdd((channel, channelId) => {
        console.log('Channel added:', channel.name);
        updateChannelDisplay();
        
        // Listen for members in this channel
        channel.members.onAdd((member, sessionId) => {
          console.log('Member joined:', member.playerName);
          updateChannelDisplay();
          
          // If it's not me and I'm in this channel, setup peer connection
          const myPlayer = room.state.players.get(room.sessionId);
          if (sessionId !== room.sessionId && 
              myPlayer.currentVoiceChannel === channelId) {
            setupPeerConnection(sessionId);
          }
        });
        
        channel.members.onRemove((member, sessionId) => {
          console.log('Member left:', member.playerName);
          updateChannelDisplay();
          closePeerConnection(sessionId);
        });
        
        channel.members.onChange((member, sessionId) => {
          updateChannelDisplay();
        });
      });
      
      room.state.voiceChannels.onRemove((channel, channelId) => {
        console.log('Channel removed:', channel.name);
        updateChannelDisplay();
      });
      
      // Listen for my player state changes
      room.state.players.onChange((player, sessionId) => {
        if (sessionId === room.sessionId) {
          updateMyStatus();
        }
      });
      
      // Listen for WebRTC signaling
      room.onMessage('voice:signal', handleSignal);
    }
    
    async function setupPeerConnection(peerId) {
      console.log('Setting up peer connection to:', peerId);
      
      if (!localStream) {
        console.error('No local stream available');
        return;
      }
      
      const pc = new RTCPeerConnection(rtcConfig);
      peerConnections.set(peerId, pc);
      
      // Add local audio tracks
      localStream.getTracks().forEach(track => {
        pc.addTrack(track, localStream);
      });
      
      // Handle incoming audio
      pc.ontrack = (event) => {
        console.log('Received remote track from:', peerId);
        const audio = new Audio();
        audio.srcObject = event.streams[0];
        audio.play();
        
        // Store audio element for volume control
        pc.remoteAudio = audio;
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
      
      // Handle connection state
      pc.onconnectionstatechange = () => {
        console.log('Connection state with', peerId, ':', pc.connectionState);
        if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
          closePeerConnection(peerId);
        }
      };
      
      // Create and send offer
      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        
        room.send('voice:signal', {
          to: peerId,
          type: 'offer',
          data: offer
        });
      } catch (err) {
        console.error('Error creating offer:', err);
      }
    }
    
    async function handleSignal(message) {
      const { from, type, data } = message;
      console.log('Received signal:', type, 'from:', from);
      
      let pc = peerConnections.get(from);
      
      if (type === 'offer') {
        if (!pc) {
          pc = new RTCPeerConnection(rtcConfig);
          peerConnections.set(from, pc);
          
          // Add local tracks
          if (localStream) {
            localStream.getTracks().forEach(track => {
              pc.addTrack(track, localStream);
            });
          }
          
          // Setup handlers
          pc.ontrack = (event) => {
            const audio = new Audio();
            audio.srcObject = event.streams[0];
            audio.play();
            pc.remoteAudio = audio;
          };
          
          pc.onicecandidate = (event) => {
            if (event.candidate) {
              room.send('voice:signal', {
                to: from,
                type: 'ice-candidate',
                data: event.candidate.toJSON()
              });
            }
          };
          
          pc.onconnectionstatechange = () => {
            console.log('Connection state:', pc.connectionState);
          };
        }
        
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(data));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          
          room.send('voice:signal', {
            to: from,
            type: 'answer',
            data: answer
          });
        } catch (err) {
          console.error('Error handling offer:', err);
        }
      } else if (type === 'answer') {
        if (pc) {
          try {
            await pc.setRemoteDescription(new RTCSessionDescription(data));
          } catch (err) {
            console.error('Error handling answer:', err);
          }
        }
      } else if (type === 'ice-candidate') {
        if (pc) {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(data));
          } catch (err) {
            console.error('Error adding ICE candidate:', err);
          }
        }
      }
    }
    
    function closePeerConnection(peerId) {
      const pc = peerConnections.get(peerId);
      if (pc) {
        if (pc.remoteAudio) {
          pc.remoteAudio.pause();
          pc.remoteAudio.srcObject = null;
        }
        pc.close();
        peerConnections.delete(peerId);
      }
    }
    
    function joinGlobal() {
      if (room) {
        room.send('voice:join', { channelId: 'global' });
      }
    }
    
    function createTeam() {
      if (room) {
        const name = prompt('Enter team name:', 'Team ' + Math.floor(Math.random() * 1000));
        if (name) {
          room.send('voice:create', {
            name: name,
            type: 'group',
            maxMembers: 10
          });
        }
      }
    }
    
    function leaveVoice() {
      if (room) {
        // Close all peer connections
        peerConnections.forEach(pc => closePeerConnection(pc));
        peerConnections.clear();
        
        room.send('voice:leave');
      }
    }
    
    function toggleMute() {
      isMuted = !isMuted;
      
      // Mute local audio tracks
      if (localStream) {
        localStream.getAudioTracks().forEach(track => {
          track.enabled = !isMuted;
        });
      }
      
      // Notify server
      if (room) {
        room.send('voice:mute', { muted: isMuted });
      }
      
      updateMyStatus();
    }
    
    function toggleDeafen() {
      isDeafened = !isDeafened;
      
      // Mute all remote audio
      peerConnections.forEach(pc => {
        if (pc.remoteAudio) {
          pc.remoteAudio.muted = isDeafened;
        }
      });
      
      // Notify server
      if (room) {
        room.send('voice:deafen', { deafened: isDeafened });
      }
      
      updateMyStatus();
    }
    
    function updateChannelDisplay() {
      if (!room) return;
      
      const channelsDiv = document.getElementById('channels');
      channelsDiv.innerHTML = '';
      
      room.state.voiceChannels.forEach((channel, channelId) => {
        const channelDiv = document.createElement('div');
        channelDiv.className = 'channel';
        
        let html = `<h3>${channel.name} (${channel.type})</h3>`;
        html += `<p>Members: ${channel.members.size}/${channel.maxMembers}</p>`;
        
        channel.members.forEach((member, sessionId) => {
          const isMe = sessionId === room.sessionId;
          const status = [];
          if (member.muted) status.push('muted');
          if (member.deafened) status.push('deafened');
          
          html += `<div class="member ${member.muted ? 'muted' : ''}">`;
          html += `${member.playerName}${isMe ? ' (you)' : ''}`;
          if (status.length > 0) html += ` (${status.join(', ')})`;
          html += '</div>';
        });
        
        channelDiv.innerHTML = html;
        channelsDiv.appendChild(channelDiv);
      });
    }
    
    function updateMyStatus() {
      if (!room) return;
      
      const myPlayer = room.state.players.get(room.sessionId);
      if (!myPlayer) return;
      
      let status = 'Not in voice';
      
      if (myPlayer.currentVoiceChannel) {
        const channel = room.state.voiceChannels.get(myPlayer.currentVoiceChannel);
        if (channel) {
          status = `In channel: ${channel.name}`;
          
          const states = [];
          if (myPlayer.voiceMuted || isMuted) states.push('Muted');
          if (myPlayer.voiceDeafened || isDeafened) states.push('Deafened');
          
          if (states.length > 0) {
            status += ` (${states.join(', ')})`;
          }
        }
      }
      
      document.getElementById('myStatus').textContent = status;
    }
  </script>
</body>
</html>
```

## How It Works

### 1. Connection
- Connects to Colyseus server on ws://localhost:2567
- Joins 'my_room' with a username
- Requests microphone permission

### 2. Voice Channels
- Server automatically creates 'global' voice channel
- Players can create custom group channels
- UI shows all available channels and their members

### 3. WebRTC Peer Connections
- When joining a channel, peer connections are established with other members
- Each peer connection:
  - Sends local microphone audio
  - Receives and plays remote audio
  - Exchanges ICE candidates for NAT traversal

### 4. Signaling Flow
1. Player A joins channel
2. Player B already in channel
3. Player A creates offer → sends to server → forwarded to Player B
4. Player B creates answer → sends to server → forwarded to Player A
5. Both exchange ICE candidates
6. Direct WebRTC connection established

### 5. Controls
- **Mute**: Disables local microphone
- **Deafen**: Mutes all incoming audio
- **Leave**: Closes all peer connections and leaves channel

## Features Demonstrated

✅ Join/leave voice channels
✅ Create custom channels
✅ WebRTC peer-to-peer audio
✅ Mute/deafen controls
✅ Real-time member list
✅ Echo cancellation and noise suppression
✅ ICE candidate exchange
✅ Connection state monitoring

## Browser Requirements

- Chrome 56+
- Firefox 52+
- Safari 11+
- Edge 79+

All require HTTPS in production (except localhost).

## Production Considerations

### HTTPS Required
WebRTC requires HTTPS in production (getUserMedia restriction).

### TURN Servers
For NAT traversal in restrictive networks, add TURN servers:

```javascript
const rtcConfig = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    {
      urls: 'turn:your-turn-server.com:3478',
      username: 'user',
      credential: 'pass'
    }
  ]
};
```

### Mobile Support
For mobile devices, handle audio focus and interruptions:

```javascript
// Resume audio context on user interaction
document.addEventListener('click', () => {
  if (audioContext.state === 'suspended') {
    audioContext.resume();
  }
});
```

## Troubleshooting

### No Audio
1. Check microphone permissions in browser
2. Verify getUserMedia success
3. Check browser console for errors
4. Ensure audio elements are playing

### Connection Failed
1. Check server is running
2. Verify WebSocket connection
3. Check for firewall blocking
4. Try adding TURN server

### Echo/Feedback
1. Use headphones
2. Ensure echo cancellation is enabled
3. Lower speaker volume

## Next Steps

- Add volume indicators (visualize speaking)
- Implement push-to-talk mode
- Add spatial audio (3D positioning)
- Support video streams
- Add recording functionality
- Implement bandwidth adaptation
