import { Schema, ArraySchema, MapSchema, type } from '@colyseus/schema';

// Extended Chat message for ChatRoom
export class ChatMessage extends Schema {
  @type('string') sender: string = '';
  @type('string') message: string = '';
  @type('number') timestamp: number = 0;
  @type('string') channel: string = 'global'; // global, whisper, team, etc.
  @type('string') target: string = ''; // For whisper messages
  @type('string') senderId: string = ''; // Session ID of sender
}

// Voice channel member for spatial audio
export class VoiceChannelMember extends Schema {
  @type('string') sessionId: string = '';
  @type('string') playerName: string = '';
  @type('string') channelId: string = '';
  @type('number') x: number = 0; // 2D position for spatial audio
  @type('number') y: number = 0; // 2D position for spatial audio
  @type('boolean') muted: boolean = false;
  @type('boolean') deafened: boolean = false;
  @type('boolean') isTalking: boolean = false;
  @type('number') joinedAt: number = 0;
  @type('number') volume: number = 1.0; // Calculated volume based on distance
}

// Voice channel with spatial audio support
export class VoiceChannel extends Schema {
  @type('string') id: string = '';
  @type('string') name: string = '';
  @type('string') type: string = 'global'; // global, proximity, group, private
  @type({ map: VoiceChannelMember }) members = new MapSchema<VoiceChannelMember>();
  @type({ map: 'boolean' }) users = new MapSchema<boolean>();
  @type('number') maxMembers: number = 50;
  @type('number') createdAt: number = Date.now();
  @type('string') ownerId: string = ''; // For group/private channels
  @type('number') maxDistance: number = 200; // Maximum distance for proximity voice
  @type('boolean') spatialAudioEnabled: boolean = false;
}

// WebRTC signaling message
export class VoiceSignal extends Schema {
  @type('string') from: string = '';
  @type('string') to: string = '';
  @type('string') type: string = ''; // offer, answer, ice-candidate
  @type('string') data: string = ''; // JSON-encoded signaling data
  @type('number') timestamp: number = Date.now();
}

export class ChatRoomState extends Schema {
  @type([ChatMessage]) chatMessages = new ArraySchema<ChatMessage>();
  
  // Track users in different channels using simple maps
  // channel name -> user sessionId -> presence (boolean)
  @type({ map: 'boolean' }) channelUsers = new MapSchema<boolean>();
  
  // Voice channels for spatial audio
  @type({ map: VoiceChannel }) voiceChannels = new MapSchema<VoiceChannel>();
  
  // Voice channel members for quick lookup
  @type({ map: VoiceChannelMember }) voiceChannelMembers = new MapSchema<VoiceChannelMember>();
  
  // Server info
  @type('number') serverTime: number = Date.now();
  @type('string') roomName: string = 'Global Chat';
  @type('number') worldWidth: number = 2000; // For spatial calculations
  @type('number') worldHeight: number = 2000; // For spatial calculations
}