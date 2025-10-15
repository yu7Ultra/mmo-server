# MMO Client - Voice Communication

This client includes integrated voice communication features using WebRTC.

## Features

### Voice Communication (语音通讯)
- 🎙️ Real-time voice chat using WebRTC
- 🌍 Global voice channels
- 👥 Custom team channels (test page only)
- 🔇 Mute/unmute controls
- 🔈 Deafen controls (block all incoming audio)
- 📊 Real-time member status display

## Quick Start

### Development Mode

```bash
# Install dependencies
yarn install

# Start development server
yarn dev
```

Then open http://localhost:5173 in your browser.

### Production Build

```bash
# Build for production
yarn build

# Preview production build
yarn preview
```

## Using Voice Chat

### In Main Client (index.html)

1. **Start the Game**
   - Make sure the MMO server is running on port 2567
   - Open the client in multiple browser tabs/windows

2. **Join Voice Channel**
   - Look for the "🎙️ 语音" panel on the right side
   - Click "加入全局" (Join Global) to join the global voice channel
   - Grant microphone permission when prompted

3. **Voice Controls**
   - **静音** (Mute): Toggle your microphone on/off
   - **免打扰** (Deafen): Toggle hearing other players
   - **离开频道** (Leave): Exit the current voice channel

4. **Status Display**
   - 🎤 = Microphone unmuted
   - 🔇 = Microphone muted
   - 🔊 = Hearing others
   - 🔈 = Deafened (not hearing others)

### In Test Page (voice-test.html)

The test page provides additional features for testing:

1. **Open the Test Page**
   ```bash
   # Option 1: Direct file access
   open client/voice-test.html
   
   # Option 2: Use HTTP server
   cd client
   python3 -m http.server 8080
   # Then open http://localhost:8080/voice-test.html
   ```

2. **Additional Features**
   - Create custom team channels
   - Detailed debug logging
   - Connection state monitoring
   - More granular controls

See `../VOICE_TEST_INSTRUCTIONS.md` for complete testing guide.

## Browser Requirements

Voice chat requires:
- Chrome 56+ / Edge 79+ / Firefox 52+ / Safari 11+
- HTTPS (in production) or localhost
- Microphone permission
- WebRTC support

## Technical Details

### Architecture

```
┌─────────────┐         ┌─────────────┐         ┌─────────────┐
│  Client A   │         │   Server    │         │  Client B   │
│             │         │  (Colyseus) │         │             │
│  WebRTC     │◄────────┤  Signaling  ├────────►│  WebRTC     │
│  Peer       │  relay  │   Relay     │  relay  │  Peer       │
│             │         │             │         │             │
└──────┬──────┘         └─────────────┘         └──────┬──────┘
       │                                               │
       │        Direct P2P Audio Connection            │
       └───────────────────────────────────────────────┘
```

### WebRTC Flow

1. Client A joins channel → Server notifies Client B
2. Client A creates WebRTC offer
3. Server relays offer to Client B
4. Client B creates answer
5. Server relays answer to Client A
6. ICE candidates exchanged through server
7. Direct peer-to-peer connection established
8. Audio streams flow directly between clients

### State Management

Voice state is synchronized via Colyseus Schema:
- `VoiceChannel` - Channel information
- `VoiceChannelMember` - Member status (muted, deafened)
- Player properties: `currentVoiceChannel`, `voiceMuted`, `voiceDeafened`

## Troubleshooting

### No Audio

1. Check microphone permissions in browser settings
2. Verify getUserMedia success in console
3. Check browser console for WebRTC errors
4. Ensure both clients are in the same channel
5. Try refreshing the page

### Connection Issues

1. Confirm server is running (`yarn start` in root directory)
2. Check WebSocket connection (should show "Connected" status)
3. Verify firewall is not blocking WebRTC
4. For production, consider adding TURN server

### Echo/Feedback

1. Use headphones instead of speakers
2. Ensure echo cancellation is enabled (it is by default)
3. Lower speaker volume
4. Check that only one tab is unmuted

## Development

### Adding Voice to Your Client

```typescript
import { Room } from 'colyseus.js';
import { MyRoomState } from './states/MyRoomState';

// Initialize WebRTC
const rtcConfig = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' }
    ]
};

// Get microphone access
const stream = await navigator.mediaDevices.getUserMedia({ 
    audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
    }
});

// Join voice channel
room.send('voice:join', { channelId: 'global' });

// Setup WebRTC peer connections (see main.ts for complete example)
```

### Server Messages

- `voice:join` - Join a voice channel
- `voice:leave` - Leave current channel
- `voice:create` - Create custom channel
- `voice:mute` - Toggle mute status
- `voice:deafen` - Toggle deafen status
- `voice:signal` - WebRTC signaling (offer/answer/ICE)

## Resources

- [Colyseus Documentation](https://docs.colyseus.io/)
- [WebRTC API](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API)
- [Voice Integration Guide](../documents/en/VOICE_INTEGRATION.md)
- [Voice Client Example](../documents/en/VOICE_CLIENT_EXAMPLE.md)
- [Test Instructions](../VOICE_TEST_INSTRUCTIONS.md)

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review the test instructions in `../VOICE_TEST_INSTRUCTIONS.md`
3. Check browser console for error messages
4. Verify server logs for signaling issues
