import { Client, Room } from '@colyseus/core';
import { MapSchema } from '@colyseus/schema';
import { ChatRoomState, VoiceChannel, VoiceChannelMember, VoiceSignal } from '../schemas/ChatRoomState';
import { ChatManager } from '../systems/chatSystem';
import { RateLimiter, InputValidator } from '../utils/security';
import { recordMessage } from '../instrumentation/metrics';
import { tencentVoiceService } from '../services/tencentVoiceService';

export class ChatRoom extends Room<ChatRoomState> {

  private chatManager = new ChatManager();
  private chatRateLimiter = new RateLimiter(10, 1); // 10 messages, 1 per second

  onCreate(options: any) {
    console.log(`[ChatRoom] Creating room with options:`, options);
    
    try {
      this.state = new ChatRoomState();
      console.log(`[ChatRoom] State initialized successfully for room: ${this.roomId}`);
      
      // Initialize voice channels
      this.initializeVoiceChannels();
      
      // Setup message handlers
      this.setupMessageHandlers();
      
      console.log(`[ChatRoom] Room created successfully: ${this.roomId}`);
      
      // Log Tencent voice service status
      if (tencentVoiceService.validateConfig()) {
        console.log(`[TencentVoice] Service initialized for room: ${this.roomId}`);
      } else {
        console.warn(`[TencentVoice] Service not configured properly for room: ${this.roomId}`);
      }
    } catch (error) {
      console.error(`[ChatRoom] Error creating room ${this.roomId}:`, error);
      throw error;
    }
  }

  private setupMessageHandlers() {
    console.log(`[ChatRoom] Setting up message handlers for room: ${this.roomId}`);
    
    // Chat message handler
    this.onMessage("chat", (client, message: { message: string; channel?: string }) => {
      console.log(`[ChatRoom] Received chat message from ${client.sessionId}:`, message);
      if (!this.chatRateLimiter.checkLimit(client.sessionId)) {
        console.log(`[ChatRoom] Rate limit exceeded for client ${client.sessionId}`);
        return;
      }
      
      recordMessage(this.roomId, 'chat');
      
      // Get user info from client (if available)
      const userData = client.userData as { playerName?: string } || {};
      const playerName = userData.playerName || `User_${client.sessionId.substring(0, 6)}`;
      
      this.chatManager.addExtendedMessage(
        this.state.chatMessages,
        client.sessionId,
        playerName,
        message.message,
        message.channel || 'global'
      );
      console.log(`[ChatRoom] Chat message processed for ${playerName}`);
    });

    // Whisper message handler
    this.onMessage("whisper", (client, message: { to: string; message: string }) => {
      console.log(`[ChatRoom] Received whisper from ${client.sessionId} to ${message.to}`);
      if (!this.chatRateLimiter.checkLimit(client.sessionId)) return;
      
      recordMessage(this.roomId, 'whisper');
      
      const userData = client.userData as { playerName?: string } || {};
      const playerName = userData.playerName || `User_${client.sessionId.substring(0, 6)}`;
      
      this.chatManager.addExtendedMessage(
        this.state.chatMessages,
        client.sessionId,
        playerName,
        message.message,
        'whisper',
        message.to
      );
      console.log(`[ChatRoom] Whisper sent from ${playerName} to ${message.to}`);
    });

    // Channel management
    this.onMessage("channel:join", (client, message: { channel: string }) => {
      console.log(`[ChatRoom] Client ${client.sessionId} joining channel: ${message.channel}`);
      recordMessage(this.roomId, 'channel:join');
      
      const userData = client.userData as { playerName?: string } || {};
      const playerName = userData.playerName || `User_${client.sessionId.substring(0, 6)}`;
      
      // Add user to channel using simple map structure
      const channelUserKey = `${message.channel}_${client.sessionId}`;
      this.state.channelUsers.set(channelUserKey, true);
      console.log(`[ChatRoom] Client ${client.sessionId} added to channel ${message.channel}`);
      
      // Broadcast join message
      this.chatManager.addExtendedMessage(
        this.state.chatMessages,
        'system',
        'System',
        `${playerName} joined the channel`,
        message.channel
      );
    });

    this.onMessage("channel:leave", (client, message: { channel: string }) => {
      console.log(`[ChatRoom] Client ${client.sessionId} leaving channel: ${message.channel}`);
      recordMessage(this.roomId, 'channel:leave');
      
      const userData = client.userData as { playerName?: string } || {};
      const playerName = userData.playerName || `User_${client.sessionId.substring(0, 6)}`;
      
      // Remove user from channel using simple map structure
      const channelUserKey = `${message.channel}_${client.sessionId}`;
      this.state.channelUsers.delete(channelUserKey);
      console.log(`[ChatRoom] Client ${client.sessionId} removed from channel ${message.channel}`);
      
      // Broadcast leave message
      this.chatManager.addExtendedMessage(
        this.state.chatMessages,
        'system',
        'System',
        `${playerName} left the channel`,
        message.channel
      );
    });

    // Voice system message handlers
    this.onMessage("voice:join_channel", (client, message: { channelId: string; x?: number; y?: number }) => {
      console.log(`[ChatRoom] Client ${client.sessionId} joining voice channel: ${message.channelId}`);
      this.handleJoinVoiceChannel(client, message);
    });

    this.onMessage("voice:leave_channel", (client, message: { channelId: string }) => {
      console.log(`[ChatRoom] Client ${client.sessionId} leaving voice channel: ${message.channelId}`);
      this.handleLeaveVoiceChannel(client, message);
    });

    this.onMessage("voice:update_position", (client, message: { x: number; y: number }) => {
      console.log(`[ChatRoom] Client ${client.sessionId} updating voice position:`, message);
      this.handleUpdateVoicePosition(client, message);
    });

    this.onMessage("voice:signal", (client, message: { targetSessionId: string; signal: any }) => {
      console.log(`[ChatRoom] Voice signal from ${client.sessionId} to ${message.targetSessionId}`);
      this.handleVoiceSignal(client, message);
    });

    // Tencent Cloud voice message handlers
    this.onMessage("voice:tencent:get_token", async (client, message: { channelId: string }) => {
      console.log(`[ChatRoom] Client ${client.sessionId} requesting Tencent token for channel: ${message.channelId}`);
      await this.handleTencentGetToken(client, message);
    });

    this.onMessage("voice:tencent:join", async (client, message: { channelId: string }) => {
      console.log(`[ChatRoom] Client ${client.sessionId} joining Tencent voice channel: ${message.channelId}`);
      await this.handleTencentJoin(client, message);
    });

    this.onMessage("voice:tencent:leave", async (client, message: { channelId: string }) => {
      console.log(`[ChatRoom] Client ${client.sessionId} leaving Tencent voice channel: ${message.channelId}`);
      await this.handleTencentLeave(client, message);
    });

    this.onMessage("voice:tencent:mute", async (client, message: { channelId: string; muted: boolean }) => {
      console.log(`[ChatRoom] Client ${client.sessionId} ${message.muted ? 'muting' : 'unmuting'} in Tencent channel: ${message.channelId}`);
      await this.handleTencentMute(client, message);
    });

    console.log(`[ChatRoom] Message handlers setup completed for room: ${this.roomId}`);
  }

  onJoin(client: Client, options: any) {
    console.log(`[ChatRoom] Client ${client.sessionId} joining room ${this.roomId} with options:`, options);
    
    try {
      // Store user data if provided
      if (options.playerName) {
        client.userData = { playerName: options.playerName };
        console.log(`[ChatRoom] Client ${client.sessionId} set playerName: ${options.playerName}`);
      }
      
      // Auto-join global channel using simple map structure
      const globalUserKey = `global_${client.sessionId}`;
      this.state.channelUsers.set(globalUserKey, true);
      console.log(`[ChatRoom] Client ${client.sessionId} auto-joined global channel`);
      
      // Send welcome message
      const playerName = options.playerName || `User_${client.sessionId.substring(0, 6)}`;
      this.chatManager.addExtendedMessage(
        this.state.chatMessages,
        'system',
        'System',
        `Welcome ${playerName}! Type /help for available commands.`,
        'global'
      );
      
      console.log(`[ChatRoom] Client ${client.sessionId} successfully joined as ${playerName}`);
    } catch (error) {
      console.error(`[ChatRoom] Error joining client ${client.sessionId}:`, error);
      throw error;
    }
  }

  onLeave(client: Client, consented: boolean) {
    console.log(`[ChatRoom] Client ${client.sessionId} leaving room ${this.roomId}, consented: ${consented}`);
    
    try {
      // Remove user from all channels using simple map structure
      const keysToRemove: string[] = [];
      for (const [key, value] of this.state.channelUsers.entries()) {
        if (key.endsWith(`_${client.sessionId}`)) {
          keysToRemove.push(key);
        }
      }
      
      console.log(`[ChatRoom] Removing client ${client.sessionId} from ${keysToRemove.length} channels`);
      
      // Remove all user's channel entries
      keysToRemove.forEach(key => {
        this.state.channelUsers.delete(key);
        
        // Extract channel name from key (format: "channel_sessionId")
        const channel = key.split('_').slice(0, -1).join('_');
        
        // Broadcast leave message
        const userData = client.userData as { playerName?: string } || {};
        const playerName = userData.playerName || `User_${client.sessionId.substring(0, 6)}`;
        
        this.chatManager.addExtendedMessage(
          this.state.chatMessages,
          'system',
          'System',
          `${playerName} left the channel`,
          channel
        );
        
        console.log(`[ChatRoom] Client ${client.sessionId} removed from channel: ${channel}`);
      });
      
      console.log(`[ChatRoom] Client ${client.sessionId} successfully left room ${this.roomId}`);
    } catch (error) {
      console.error(`[ChatRoom] Error processing leave for client ${client.sessionId}:`, error);
    }
  }

  onDispose() {
    console.log(`[ChatRoom] Room ${this.roomId} disposing...`);
    this.chatManager.cleanupRateLimits();
    console.log(`[ChatRoom] Room ${this.roomId} disposed successfully`);
  }

  // Voice system methods
  private initializeVoiceChannels() {
    console.log(`[ChatRoom] Initializing voice channels for room: ${this.roomId}`);
    
    // Create default voice channels
    const defaultChannels = ['global_voice', 'team_voice', 'proximity_voice'];
    
    defaultChannels.forEach(channelId => {
      const channel = new VoiceChannel();
      channel.id = channelId;
      channel.name = channelId.replace('_', ' ').toUpperCase();
      channel.maxDistance = channelId === 'proximity_voice' ? 100 : 0; // 0 means no distance limit
      channel.spatialAudioEnabled = channelId === 'proximity_voice';
      
      this.state.voiceChannels.set(channelId, channel);
      console.log(`[ChatRoom] Created voice channel: ${channel.name}`);
    });
    
    console.log(`[ChatRoom] Voice channels initialized: ${defaultChannels.length} channels created`);
  }

  private handleJoinVoiceChannel(client: Client, message: { channelId: string; x?: number; y?: number }) {
    console.log(`[ChatRoom] Handling voice channel join for ${client.sessionId} to ${message.channelId}`);
    
    const channel = this.state.voiceChannels.get(message.channelId);
    if (!channel) {
      console.warn(`[ChatRoom] Voice channel not found: ${message.channelId}`);
      client.send('voice:error', { error: 'Channel not found' });
      return;
    }

    // Create or update voice member
    let member = this.state.voiceChannelMembers.get(client.sessionId);
    if (!member) {
      member = new VoiceChannelMember();
      member.sessionId = client.sessionId;
      member.channelId = message.channelId;
      member.x = message.x || 0;
      member.y = message.y || 0;
      member.isTalking = false;
      member.volume = 1.0;
      this.state.voiceChannelMembers.set(client.sessionId, member);
      console.log(`[ChatRoom] Created new voice member for ${client.sessionId}`);
    } else {
      member.channelId = message.channelId;
      member.x = message.x || member.x;
      member.y = message.y || member.y;
      console.log(`[ChatRoom] Updated existing voice member for ${client.sessionId}`);
    }

    // Add to channel's user map
    const voiceUserKey = `${message.channelId}_${client.sessionId}`;
    channel.users.set(voiceUserKey, true);
    console.log(`[ChatRoom] Added ${client.sessionId} to voice channel users`);

    // Broadcast join event
    this.broadcast('voice:user_joined', {
      sessionId: client.sessionId,
      channelId: message.channelId,
      x: member.x,
      y: member.y
    }, { except: client });

    client.send('voice:joined', { channelId: message.channelId });
    console.log(`[ChatRoom] Voice channel join completed for ${client.sessionId}`);
  }

  private handleLeaveVoiceChannel(client: Client, message: { channelId: string }) {
    console.log(`[ChatRoom] Handling voice channel leave for ${client.sessionId} from ${message.channelId}`);
    
    const member = this.state.voiceChannelMembers.get(client.sessionId);
    if (!member || member.channelId !== message.channelId) {
      console.log(`[ChatRoom] No active voice member found for ${client.sessionId} in channel ${message.channelId}`);
      return;
    }

    // Remove from channel
    const channel = this.state.voiceChannels.get(message.channelId);
    if (channel) {
      const voiceUserKey = `${message.channelId}_${client.sessionId}`;
      channel.users.delete(voiceUserKey);
      console.log(`[ChatRoom] Removed ${client.sessionId} from voice channel users`);
    }

    // Remove member if leaving all channels
    this.state.voiceChannelMembers.delete(client.sessionId);
    console.log(`[ChatRoom] Removed voice member for ${client.sessionId}`);

    // Broadcast leave event
    this.broadcast('voice:user_left', {
      sessionId: client.sessionId,
      channelId: message.channelId
    }, { except: client });

    client.send('voice:left', { channelId: message.channelId });
    console.log(`[ChatRoom] Voice channel leave completed for ${client.sessionId}`);
  }

  private handleUpdateVoicePosition(client: Client, message: { x: number; y: number }) {
    const member = this.state.voiceChannelMembers.get(client.sessionId);
    if (!member) {
      console.log(`[ChatRoom] No voice member found for position update: ${client.sessionId}`);
      return;
    }

    // Update position
    member.x = message.x;
    member.y = message.y;
    console.log(`[ChatRoom] Updated voice position for ${client.sessionId}: (${message.x}, ${message.y})`);

    // Calculate spatial volume for proximity-based channels
    this.updateSpatialVolumes(member.channelId);

    // Broadcast position update
    this.broadcast('voice:position_updated', {
      sessionId: client.sessionId,
      x: message.x,
      y: message.y,
      channelId: member.channelId
    }, { except: client });
  }

  private handleVoiceSignal(client: Client, message: { targetSessionId: string; signal: any }) {
    console.log(`[ChatRoom] Forwarding voice signal from ${client.sessionId} to ${message.targetSessionId}`);
    
    // Forward WebRTC signaling to target client
    const targetClient = this.clients.find(c => c.sessionId === message.targetSessionId);
    if (targetClient) {
      targetClient.send('voice:signal', {
        fromSessionId: client.sessionId,
        signal: message.signal
      });
      console.log(`[ChatRoom] Voice signal forwarded successfully`);
    } else {
      console.warn(`[ChatRoom] Target client not found for voice signal: ${message.targetSessionId}`);
    }
  }

  private updateSpatialVolumes(channelId: string) {
    const channel = this.state.voiceChannels.get(channelId);
    if (!channel || !channel.spatialAudioEnabled) {
      return;
    }

    const members = Array.from(this.state.voiceChannelMembers.values())
      .filter(member => member.channelId === channelId);

    console.log(`[ChatRoom] Updating spatial volumes for ${members.length} members in channel ${channelId}`);

    // Calculate volume based on distance for each pair of members
    for (let i = 0; i < members.length; i++) {
      const memberA = members[i];
      for (let j = i + 1; j < members.length; j++) {
        const memberB = members[j];
        
        const distance = this.calculateDistance(memberA, memberB);
        const volume = this.calculateSpatialVolume(distance, channel.maxDistance);
        
        // Update volumes (this would need to be sent to clients)
        // For now, we just update the member state
        memberA.volume = Math.min(memberA.volume, volume);
        memberB.volume = Math.min(memberB.volume, volume);
      }
    }
  }

  private calculateDistance(memberA: VoiceChannelMember, memberB: VoiceChannelMember): number {
    const dx = memberA.x - memberB.x;
    const dy = memberA.y - memberB.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  private calculateSpatialVolume(distance: number, maxDistance: number): number {
    if (distance >= maxDistance) {
      return 0; // No audio beyond max distance
    }
    
    // Linear volume decrease based on distance
    return 1 - (distance / maxDistance);
  }

  // Tencent Cloud voice service methods
  private async handleTencentGetToken(client: Client, message: { channelId: string }) {
    try {
      console.log(`[TencentVoice] Generating token for ${client.sessionId} in channel ${message.channelId}`);
      const token = await tencentVoiceService.generateVoiceToken(client.sessionId, message.channelId);
      client.send('voice:tencent:token', {
        token,
        sdkAppId: parseInt(process.env.TENCENT_TRTC_SDK_APP_ID || '0'),
        channelId: message.channelId
      });
      console.log(`[TencentVoice] Token generated successfully for ${client.sessionId}`);
    } catch (error) {
      console.error(`[TencentVoice] Failed to generate token for ${client.sessionId}:`, error);
      client.send('voice:tencent:error', {
        error: 'Failed to generate voice token',
        channelId: message.channelId
      });
    }
  }

  private async handleTencentJoin(client: Client, message: { channelId: string }) {
    try {
      console.log(`[TencentVoice] Joining TRTC room for ${client.sessionId} in channel ${message.channelId}`);
      
      // Create TRTC room if needed
      await tencentVoiceService.createTRTCRoom(message.channelId);
      
      // Generate token for client
      const token = await tencentVoiceService.generateVoiceToken(client.sessionId, message.channelId);
      
      client.send('voice:tencent:joined', {
        channelId: message.channelId,
        token,
        sdkAppId: parseInt(process.env.TENCENT_TRTC_SDK_APP_ID || '0')
      });

      // Broadcast to other clients in the same channel
      this.broadcast('voice:tencent:user_joined', {
        sessionId: client.sessionId,
        channelId: message.channelId
      }, { except: client });

      console.log(`[TencentVoice] User ${client.sessionId} joined TRTC room ${message.channelId}`);
    } catch (error) {
      console.error(`[TencentVoice] Failed to join TRTC room for ${client.sessionId}:`, error);
      client.send('voice:tencent:error', {
        error: 'Failed to join voice channel',
        channelId: message.channelId
      });
    }
  }

  private async handleTencentLeave(client: Client, message: { channelId: string }) {
    try {
      console.log(`[TencentVoice] Leaving TRTC room for ${client.sessionId} from channel ${message.channelId}`);
      
      // In a real implementation, you might want to track room usage
      // and delete empty rooms after some time
      
      client.send('voice:tencent:left', {
        channelId: message.channelId
      });

      // Broadcast to other clients
      this.broadcast('voice:tencent:user_left', {
        sessionId: client.sessionId,
        channelId: message.channelId
      }, { except: client });

      console.log(`[TencentVoice] User ${client.sessionId} left TRTC room ${message.channelId}`);
    } catch (error) {
      console.error(`[TencentVoice] Failed to leave TRTC room for ${client.sessionId}:`, error);
    }
  }

  private async handleTencentMute(client: Client, message: { channelId: string; muted: boolean }) {
    try {
      console.log(`[TencentVoice] Setting mute status for ${client.sessionId} to ${message.muted} in channel ${message.channelId}`);
      
      await tencentVoiceService.muteUser(message.channelId, client.sessionId, message.muted);
      
      client.send('voice:tencent:mute_updated', {
        channelId: message.channelId,
        muted: message.muted
      });

      // Broadcast mute status to other clients
      this.broadcast('voice:tencent:user_muted', {
        sessionId: client.sessionId,
        channelId: message.channelId,
        muted: message.muted
      }, { except: client });

      console.log(`[TencentVoice] User ${client.sessionId} ${message.muted ? 'muted' : 'unmuted'} in TRTC room ${message.channelId}`);
    } catch (error) {
      console.error(`[TencentVoice] Failed to update mute status for ${client.sessionId}:`, error);
      client.send('voice:tencent:error', {
        error: 'Failed to update mute status',
        channelId: message.channelId
      });
    }
  }
}