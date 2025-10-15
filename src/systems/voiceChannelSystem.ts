import { MapSchema } from '@colyseus/schema';
import { VoiceChannel, VoiceChannelMember, Player } from '../schemas/MyRoomState';
import { RateLimiter, InputValidator } from '../utils/security';

/**
 * VoiceChannelManager - Manages voice channels and WebRTC signaling
 * 
 * Features:
 * - Create and manage voice channels (global, proximity, group, private)
 * - Handle member join/leave operations
 * - Manage mute/deafen states
 * - WebRTC signaling relay between peers
 * - Rate limiting for voice operations
 */
export class VoiceChannelManager {
  private rateLimiter = new RateLimiter(30, 10); // 30 actions, 10 per second
  private signalingRateLimiter = new RateLimiter(100, 20); // 100 signals, 20 per second
  
  /**
   * Initialize default voice channels
   */
  initializeDefaultChannels(voiceChannels: MapSchema<VoiceChannel>): void {
    // Create global voice channel
    const globalChannel = new VoiceChannel();
    globalChannel.id = 'global';
    globalChannel.name = 'Global Voice';
    globalChannel.type = 'global';
    globalChannel.maxMembers = 100;
    globalChannel.createdAt = Date.now();
    voiceChannels.set('global', globalChannel);
  }
  
  /**
   * Create a new voice channel
   */
  createChannel(
    voiceChannels: MapSchema<VoiceChannel>,
    channelId: string,
    name: string,
    type: 'global' | 'proximity' | 'group' | 'private',
    ownerId: string,
    maxMembers: number = 50
  ): VoiceChannel | null {
    // Validate channel ID
    if (!InputValidator.validateStringLength(channelId, 3, 50)) {
      return null;
    }
    
    // Check if channel already exists
    if (voiceChannels.has(channelId)) {
      return null;
    }
    
    // Create new channel
    const channel = new VoiceChannel();
    channel.id = channelId;
    channel.name = name || `Channel ${channelId}`;
    channel.type = type;
    channel.ownerId = ownerId;
    channel.maxMembers = Math.min(maxMembers, 100); // Cap at 100
    channel.createdAt = Date.now();
    
    voiceChannels.set(channelId, channel);
    return channel;
  }
  
  /**
   * Delete a voice channel
   */
  deleteChannel(
    voiceChannels: MapSchema<VoiceChannel>,
    channelId: string,
    requesterId: string
  ): boolean {
    const channel = voiceChannels.get(channelId);
    if (!channel) return false;
    
    // Only owner or server can delete non-global channels
    if (channel.type !== 'global' && channel.ownerId !== requesterId) {
      return false;
    }
    
    // Cannot delete global channel
    if (channel.type === 'global') {
      return false;
    }
    
    // Remove all members before deleting
    channel.members.clear();
    voiceChannels.delete(channelId);
    return true;
  }
  
  /**
   * Add player to voice channel
   */
  joinChannel(
    voiceChannels: MapSchema<VoiceChannel>,
    player: Player,
    sessionId: string,
    channelId: string
  ): boolean {
    // Check rate limit
    if (!this.rateLimiter.checkLimit(sessionId, 2)) {
      return false;
    }
    
    const channel = voiceChannels.get(channelId);
    if (!channel) return false;
    
    // Check if channel is full
    if (channel.members.size >= channel.maxMembers) {
      return false;
    }
    
    // Leave current channel if in one
    if (player.currentVoiceChannel) {
      this.leaveChannel(voiceChannels, player, sessionId);
    }
    
    // Create member entry
    const member = new VoiceChannelMember();
    member.sessionId = sessionId;
    member.playerName = player.name;
    member.muted = player.voiceMuted;
    member.deafened = player.voiceDeafened;
    member.joinedAt = Date.now();
    
    // Add to channel
    channel.members.set(sessionId, member);
    player.currentVoiceChannel = channelId;
    
    return true;
  }
  
  /**
   * Remove player from voice channel
   */
  leaveChannel(
    voiceChannels: MapSchema<VoiceChannel>,
    player: Player,
    sessionId: string
  ): boolean {
    if (!player.currentVoiceChannel) return false;
    
    const channel = voiceChannels.get(player.currentVoiceChannel);
    if (!channel) {
      player.currentVoiceChannel = '';
      return false;
    }
    
    // Remove from channel
    channel.members.delete(sessionId);
    player.currentVoiceChannel = '';
    
    // Delete empty non-global channels
    if (channel.members.size === 0 && channel.type !== 'global') {
      voiceChannels.delete(channel.id);
    }
    
    return true;
  }
  
  /**
   * Toggle mute status for a player
   */
  toggleMute(
    voiceChannels: MapSchema<VoiceChannel>,
    player: Player,
    sessionId: string,
    muted: boolean
  ): boolean {
    player.voiceMuted = muted;
    
    // Update member state in current channel
    if (player.currentVoiceChannel) {
      const channel = voiceChannels.get(player.currentVoiceChannel);
      if (channel) {
        const member = channel.members.get(sessionId);
        if (member) {
          member.muted = muted;
          return true;
        }
      }
    }
    
    return false;
  }
  
  /**
   * Toggle deafen status for a player
   */
  toggleDeafen(
    voiceChannels: MapSchema<VoiceChannel>,
    player: Player,
    sessionId: string,
    deafened: boolean
  ): boolean {
    player.voiceDeafened = deafened;
    
    // Update member state in current channel
    if (player.currentVoiceChannel) {
      const channel = voiceChannels.get(player.currentVoiceChannel);
      if (channel) {
        const member = channel.members.get(sessionId);
        if (member) {
          member.deafened = deafened;
          return true;
        }
      }
    }
    
    return false;
  }
  
  /**
   * Get all members in a player's current voice channel (for WebRTC peer discovery)
   */
  getChannelMembers(
    voiceChannels: MapSchema<VoiceChannel>,
    sessionId: string,
    player: Player
  ): string[] {
    if (!player.currentVoiceChannel) return [];
    
    const channel = voiceChannels.get(player.currentVoiceChannel);
    if (!channel) return [];
    
    // Return all session IDs except self
    const members: string[] = [];
    channel.members.forEach((member, memberId) => {
      if (memberId !== sessionId) {
        members.push(memberId);
      }
    });
    
    return members;
  }
  
  /**
   * Check if signaling is allowed (rate limiting)
   */
  canSendSignal(sessionId: string): boolean {
    return this.signalingRateLimiter.checkLimit(sessionId, 1);
  }
  
  /**
   * Cleanup rate limiters periodically
   */
  cleanup(): void {
    this.rateLimiter.cleanup();
    this.signalingRateLimiter.cleanup();
  }
  
  /**
   * Get proximity-based players for proximity voice channels
   * Returns session IDs of players within range
   */
  getProximityMembers(
    players: Map<string, Player>,
    sessionId: string,
    maxDistance: number = 200
  ): string[] {
    const player = players.get(sessionId);
    if (!player) return [];
    
    const nearby: string[] = [];
    
    players.forEach((otherPlayer, otherId) => {
      if (otherId === sessionId) return;
      
      // Calculate distance
      const dx = player.x - otherPlayer.x;
      const dy = player.y - otherPlayer.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance <= maxDistance) {
        nearby.push(otherId);
      }
    });
    
    return nearby;
  }
}
