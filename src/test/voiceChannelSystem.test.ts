import { VoiceChannelManager } from '../systems/voiceChannelSystem';
import { VoiceChannel, VoiceChannelMember, Player } from '../schemas/MyRoomState';
import { MapSchema } from '@colyseus/schema';

describe('Voice Channel System', () => {
  let voiceManager: VoiceChannelManager;
  let voiceChannels: MapSchema<VoiceChannel>;
  let player1: Player;
  let player2: Player;

  beforeEach(() => {
    voiceManager = new VoiceChannelManager();
    voiceChannels = new MapSchema<VoiceChannel>();
    
    player1 = new Player();
    player1.name = 'Player1';
    player1.x = 100;
    player1.y = 100;
    
    player2 = new Player();
    player2.name = 'Player2';
    player2.x = 150;
    player2.y = 150;
  });

  describe('Channel Initialization', () => {
    test('should initialize default channels', () => {
      voiceManager.initializeDefaultChannels(voiceChannels);
      
      expect(voiceChannels.size).toBe(1);
      expect(voiceChannels.has('global')).toBe(true);
      
      const globalChannel = voiceChannels.get('global');
      expect(globalChannel?.name).toBe('Global Voice');
      expect(globalChannel?.type).toBe('global');
      expect(globalChannel?.maxMembers).toBe(100);
    });
  });

  describe('Channel Creation', () => {
    test('should create a new voice channel', () => {
      const channel = voiceManager.createChannel(
        voiceChannels,
        'team1',
        'Team Voice',
        'group',
        'player1',
        10
      );

      expect(channel).not.toBeNull();
      expect(channel?.id).toBe('team1');
      expect(channel?.name).toBe('Team Voice');
      expect(channel?.type).toBe('group');
      expect(channel?.ownerId).toBe('player1');
      expect(channel?.maxMembers).toBe(10);
      expect(voiceChannels.size).toBe(1);
    });

    test('should reject duplicate channel IDs', () => {
      voiceManager.createChannel(voiceChannels, 'team1', 'Team 1', 'group', 'player1');
      const duplicate = voiceManager.createChannel(voiceChannels, 'team1', 'Team 2', 'group', 'player2');

      expect(duplicate).toBeNull();
      expect(voiceChannels.size).toBe(1);
    });

    test('should reject invalid channel IDs', () => {
      const shortId = voiceManager.createChannel(voiceChannels, 'ab', 'Short', 'group', 'player1');
      expect(shortId).toBeNull();
      
      const longId = voiceManager.createChannel(
        voiceChannels,
        'a'.repeat(51),
        'Long',
        'group',
        'player1'
      );
      expect(longId).toBeNull();
    });

    test('should cap max members at 100', () => {
      const channel = voiceManager.createChannel(
        voiceChannels,
        'large',
        'Large Channel',
        'group',
        'player1',
        200
      );

      expect(channel?.maxMembers).toBe(100);
    });
  });

  describe('Channel Deletion', () => {
    beforeEach(() => {
      voiceManager.initializeDefaultChannels(voiceChannels);
      voiceManager.createChannel(voiceChannels, 'team1', 'Team 1', 'group', 'player1');
    });

    test('should delete a channel', () => {
      const result = voiceManager.deleteChannel(voiceChannels, 'team1', 'player1');
      
      expect(result).toBe(true);
      expect(voiceChannels.has('team1')).toBe(false);
    });

    test('should not delete channel if not owner', () => {
      const result = voiceManager.deleteChannel(voiceChannels, 'team1', 'player2');
      
      expect(result).toBe(false);
      expect(voiceChannels.has('team1')).toBe(true);
    });

    test('should not delete global channel', () => {
      const result = voiceManager.deleteChannel(voiceChannels, 'global', 'player1');
      
      expect(result).toBe(false);
      expect(voiceChannels.has('global')).toBe(true);
    });

    test('should clear members before deleting', () => {
      voiceManager.joinChannel(voiceChannels, player1, 'session1', 'team1');
      
      const channel = voiceChannels.get('team1');
      expect(channel?.members.size).toBe(1);
      
      voiceManager.deleteChannel(voiceChannels, 'team1', 'player1');
      expect(voiceChannels.has('team1')).toBe(false);
    });
  });

  describe('Joining Channels', () => {
    beforeEach(() => {
      voiceManager.initializeDefaultChannels(voiceChannels);
    });

    test('should join a voice channel', () => {
      const result = voiceManager.joinChannel(
        voiceChannels,
        player1,
        'session1',
        'global'
      );

      expect(result).toBe(true);
      expect(player1.currentVoiceChannel).toBe('global');
      
      const channel = voiceChannels.get('global');
      expect(channel?.members.size).toBe(1);
      
      const member = channel?.members.get('session1');
      expect(member?.sessionId).toBe('session1');
      expect(member?.playerName).toBe('Player1');
      expect(member?.muted).toBe(false);
      expect(member?.deafened).toBe(false);
    });

    test('should reject joining non-existent channel', () => {
      const result = voiceManager.joinChannel(
        voiceChannels,
        player1,
        'session1',
        'nonexistent'
      );

      expect(result).toBe(false);
      expect(player1.currentVoiceChannel).toBe('');
    });

    test('should leave previous channel when joining new one', () => {
      voiceManager.createChannel(voiceChannels, 'team1', 'Team 1', 'group', 'owner1');
      
      voiceManager.joinChannel(voiceChannels, player1, 'session1', 'global');
      expect(player1.currentVoiceChannel).toBe('global');
      
      voiceManager.joinChannel(voiceChannels, player1, 'session1', 'team1');
      expect(player1.currentVoiceChannel).toBe('team1');
      
      const globalChannel = voiceChannels.get('global');
      expect(globalChannel?.members.has('session1')).toBe(false);
      
      const teamChannel = voiceChannels.get('team1');
      expect(teamChannel?.members.has('session1')).toBe(true);
    });

    test('should reject joining full channel', () => {
      voiceManager.createChannel(voiceChannels, 'small', 'Small', 'group', 'owner1', 1);
      
      voiceManager.joinChannel(voiceChannels, player1, 'session1', 'small');
      const result = voiceManager.joinChannel(voiceChannels, player2, 'session2', 'small');

      expect(result).toBe(false);
      expect(player2.currentVoiceChannel).toBe('');
    });

    test('should preserve mute/deafen state when joining', () => {
      player1.voiceMuted = true;
      player1.voiceDeafened = true;
      
      voiceManager.joinChannel(voiceChannels, player1, 'session1', 'global');
      
      const channel = voiceChannels.get('global');
      const member = channel?.members.get('session1');
      
      expect(member?.muted).toBe(true);
      expect(member?.deafened).toBe(true);
    });
  });

  describe('Leaving Channels', () => {
    beforeEach(() => {
      voiceManager.initializeDefaultChannels(voiceChannels);
      voiceManager.joinChannel(voiceChannels, player1, 'session1', 'global');
    });

    test('should leave voice channel', () => {
      const result = voiceManager.leaveChannel(voiceChannels, player1, 'session1');

      expect(result).toBe(true);
      expect(player1.currentVoiceChannel).toBe('');
      
      const channel = voiceChannels.get('global');
      expect(channel?.members.has('session1')).toBe(false);
    });

    test('should handle leaving when not in channel', () => {
      const result = voiceManager.leaveChannel(voiceChannels, player2, 'session2');

      expect(result).toBe(false);
    });

    test('should delete empty non-global channels', () => {
      voiceManager.createChannel(voiceChannels, 'temp', 'Temp', 'group', 'owner1');
      voiceManager.joinChannel(voiceChannels, player1, 'session1', 'temp');
      
      expect(voiceChannels.has('temp')).toBe(true);
      
      voiceManager.leaveChannel(voiceChannels, player1, 'session1');
      
      expect(voiceChannels.has('temp')).toBe(false);
    });

    test('should not delete global channel when empty', () => {
      voiceManager.leaveChannel(voiceChannels, player1, 'session1');
      
      expect(voiceChannels.has('global')).toBe(true);
    });
  });

  describe('Mute/Deafen Controls', () => {
    beforeEach(() => {
      voiceManager.initializeDefaultChannels(voiceChannels);
      voiceManager.joinChannel(voiceChannels, player1, 'session1', 'global');
    });

    test('should toggle mute status', () => {
      const result = voiceManager.toggleMute(voiceChannels, player1, 'session1', true);

      expect(result).toBe(true);
      expect(player1.voiceMuted).toBe(true);
      
      const channel = voiceChannels.get('global');
      const member = channel?.members.get('session1');
      expect(member?.muted).toBe(true);
    });

    test('should toggle deafen status', () => {
      const result = voiceManager.toggleDeafen(voiceChannels, player1, 'session1', true);

      expect(result).toBe(true);
      expect(player1.voiceDeafened).toBe(true);
      
      const channel = voiceChannels.get('global');
      const member = channel?.members.get('session1');
      expect(member?.deafened).toBe(true);
    });

    test('should update player state even when not in channel', () => {
      voiceManager.leaveChannel(voiceChannels, player1, 'session1');
      
      voiceManager.toggleMute(voiceChannels, player1, 'session1', true);
      expect(player1.voiceMuted).toBe(true);
    });
  });

  describe('Member Discovery', () => {
    beforeEach(() => {
      voiceManager.initializeDefaultChannels(voiceChannels);
    });

    test('should get channel members', () => {
      voiceManager.joinChannel(voiceChannels, player1, 'session1', 'global');
      voiceManager.joinChannel(voiceChannels, player2, 'session2', 'global');

      const members = voiceManager.getChannelMembers(voiceChannels, 'session1', player1);

      expect(members).toHaveLength(1);
      expect(members).toContain('session2');
      expect(members).not.toContain('session1'); // Should not include self
    });

    test('should return empty array when not in channel', () => {
      const members = voiceManager.getChannelMembers(voiceChannels, 'session1', player1);

      expect(members).toHaveLength(0);
    });
  });

  describe('Proximity Members', () => {
    test('should find nearby players', () => {
      const players = new Map<string, Player>();
      
      player1.x = 100;
      player1.y = 100;
      
      player2.x = 150; // Distance: sqrt(50^2 + 50^2) ≈ 70.7
      player2.y = 150;
      
      const player3 = new Player();
      player3.x = 500; // Distance: 400+, far away
      player3.y = 500;
      
      players.set('session1', player1);
      players.set('session2', player2);
      players.set('session3', player3);

      const nearby = voiceManager.getProximityMembers(players, 'session1', 200);

      expect(nearby).toHaveLength(1);
      expect(nearby).toContain('session2');
      expect(nearby).not.toContain('session3');
    });

    test('should not include self in proximity members', () => {
      const players = new Map<string, Player>();
      players.set('session1', player1);

      const nearby = voiceManager.getProximityMembers(players, 'session1', 200);

      expect(nearby).not.toContain('session1');
    });
  });

  describe('Rate Limiting', () => {
    test('should allow signaling within limits', () => {
      expect(voiceManager.canSendSignal('session1')).toBe(true);
    });

    test('should enforce signaling rate limits', () => {
      // Exhaust the rate limit (100 signals)
      for (let i = 0; i < 100; i++) {
        expect(voiceManager.canSendSignal('session1')).toBe(true);
      }
      
      // Should be rate limited now
      expect(voiceManager.canSendSignal('session1')).toBe(false);
    });
  });

  describe('Cleanup', () => {
    test('should clean up rate limiters', () => {
      voiceManager.canSendSignal('session1');
      
      // Should not throw
      expect(() => voiceManager.cleanup()).not.toThrow();
    });
  });
});
