/**
 * GM Backend System
 * 
 * Provides administrative tools for game management including:
 * - Player management (ban, mute, kick, rewards, mail)
 * - Game announcements (server-wide, scrolling, popup)
 * - Event configuration and activation
 * - Real-time monitoring dashboard
 * - Permission-based access control
 */

import { Room } from '@colyseus/core';
import { MyRoomState, Player } from '../schemas/MyRoomState';
import { recordGMAction } from '../instrumentation/prometheusMetrics';

/**
 * GM Permission Levels
 */
export enum GMPermission {
    NONE = 0,
    MODERATOR = 1,      // Can mute, kick
    GAMEMASTER = 2,     // Can ban, send rewards
    ADMIN = 3,          // Full access including events
    SUPERADMIN = 4      // System administration
}

/**
 * GM Action Types for logging
 */
export enum GMActionType {
    BAN_PLAYER = 'ban_player',
    UNBAN_PLAYER = 'unban_player',
    MUTE_PLAYER = 'mute_player',
    UNMUTE_PLAYER = 'unmute_player',
    KICK_PLAYER = 'kick_player',
    SEND_REWARD = 'send_reward',
    SEND_MAIL = 'send_mail',
    BROADCAST_ANNOUNCEMENT = 'broadcast_announcement',
    START_EVENT = 'start_event',
    STOP_EVENT = 'stop_event',
    MODIFY_PLAYER_STATS = 'modify_player_stats'
}

/**
 * Announcement Types
 */
export enum AnnouncementType {
    SERVER_WIDE = 'server_wide',   // All players, one-time
    SCROLLING = 'scrolling',        // Scrolling text at top
    POPUP = 'popup',                // Modal popup
    CHAT = 'chat'                   // System message in chat
}

/**
 * Player ban/mute information
 */
interface PlayerRestriction {
    playerId: string;
    type: 'ban' | 'mute';
    reason: string;
    gmId: string;
    gmName: string;
    expiresAt?: number;  // Unix timestamp, undefined = permanent
    createdAt: number;
}

/**
 * Player reward information
 */
interface PlayerReward {
    playerId: string;
    type: 'experience' | 'currency' | 'item';
    amount?: number;
    itemId?: string;
    reason: string;
    gmId: string;
    gmName: string;
    timestamp: number;
}

/**
 * Player mail message
 */
export interface MailMessage {
    id: string;
    to: string;
    from: string;
    subject: string;
    body: string;
    attachments?: Array<{type: string, id: string, amount: number}>;
    read: boolean;
    timestamp: number;
    expiresAt?: number;
}

/**
 * Game announcement
 */
export interface Announcement {
    id: string;
    type: AnnouncementType;
    message: string;
    priority: 'low' | 'normal' | 'high' | 'urgent';
    duration?: number;  // milliseconds for scrolling/popup
    gmId: string;
    gmName: string;
    timestamp: number;
}

/**
 * Game event configuration
 */
export interface GameEvent {
    id: string;
    name: string;
    description: string;
    type: 'double_exp' | 'double_drop' | 'boss_spawn' | 'pvp_event' | 'custom';
    multiplier?: number;
    active: boolean;
    startTime?: number;
    endTime?: number;
    config: Record<string, any>;
}

/**
 * GM Backend Manager
 * Singleton class managing all GM operations
 */
export class GMBackendManager {
    private static instance: GMBackendManager;
    
    // GM permissions
    private gmPermissions: Map<string, GMPermission> = new Map();
    
    // Player restrictions
    private bannedPlayers: Map<string, PlayerRestriction> = new Map();
    private mutedPlayers: Map<string, PlayerRestriction> = new Map();
    
    // Mail system
    private mailbox: Map<string, MailMessage[]> = new Map();
    
    // Active events
    private activeEvents: Map<string, GameEvent> = new Map();
    
    // Action log
    private actionLog: Array<{
        action: GMActionType;
        gmId: string;
        gmName: string;
        target?: string;
        details: string;
        timestamp: number;
    }> = [];

    private constructor() {
        // Initialize with default super admin (for testing/development)
        if (process.env.NODE_ENV === 'development') {
            this.gmPermissions.set('admin', GMPermission.SUPERADMIN);
            console.log('[GMBackend] Development mode: admin user has SUPERADMIN permissions');
        }
        
        // Start periodic cleanup of expired restrictions
        this.startCleanupTimer();
    }

    /**
     * Get singleton instance
     */
    public static getInstance(): GMBackendManager {
        if (!GMBackendManager.instance) {
            GMBackendManager.instance = new GMBackendManager();
        }
        return GMBackendManager.instance;
    }

    /**
     * Check if user has sufficient GM permission
     */
    public hasPermission(gmId: string, requiredLevel: GMPermission): boolean {
        const userLevel = this.gmPermissions.get(gmId) || GMPermission.NONE;
        return userLevel >= requiredLevel;
    }

    /**
     * Grant GM permission to a user
     */
    public grantPermission(gmId: string, level: GMPermission, granterName: string): void {
        this.gmPermissions.set(gmId, level);
        this.logAction(GMActionType.MODIFY_PLAYER_STATS, 'system', granterName, gmId, 
            `Granted GM permission level ${level}`);
        console.log(`[GMBackend] Granted permission level ${level} to ${gmId}`);
    }

    /**
     * Ban a player
     */
    public banPlayer(
        gmId: string,
        gmName: string,
        playerId: string,
        reason: string,
        durationMs?: number
    ): { success: boolean; message: string } {
        if (!this.hasPermission(gmId, GMPermission.GAMEMASTER)) {
            return { success: false, message: 'Insufficient permissions' };
        }

        const restriction: PlayerRestriction = {
            playerId,
            type: 'ban',
            reason,
            gmId,
            gmName,
            expiresAt: durationMs ? Date.now() + durationMs : undefined,
            createdAt: Date.now()
        };

        this.bannedPlayers.set(playerId, restriction);
        this.logAction(GMActionType.BAN_PLAYER, gmId, gmName, playerId, 
            `Reason: ${reason}, Duration: ${durationMs ? `${durationMs}ms` : 'permanent'}`);
        
        recordGMAction('ban_player');
        
        return { 
            success: true, 
            message: `Player ${playerId} banned${durationMs ? ` for ${durationMs}ms` : ' permanently'}` 
        };
    }

    /**
     * Unban a player
     */
    public unbanPlayer(gmId: string, gmName: string, playerId: string): { success: boolean; message: string } {
        if (!this.hasPermission(gmId, GMPermission.GAMEMASTER)) {
            return { success: false, message: 'Insufficient permissions' };
        }

        if (!this.bannedPlayers.has(playerId)) {
            return { success: false, message: 'Player is not banned' };
        }

        this.bannedPlayers.delete(playerId);
        this.logAction(GMActionType.UNBAN_PLAYER, gmId, gmName, playerId, 'Ban removed');
        
        recordGMAction('unban_player');
        
        return { success: true, message: `Player ${playerId} unbanned` };
    }

    /**
     * Mute a player
     */
    public mutePlayer(
        gmId: string,
        gmName: string,
        playerId: string,
        reason: string,
        durationMs?: number
    ): { success: boolean; message: string } {
        if (!this.hasPermission(gmId, GMPermission.MODERATOR)) {
            return { success: false, message: 'Insufficient permissions' };
        }

        const restriction: PlayerRestriction = {
            playerId,
            type: 'mute',
            reason,
            gmId,
            gmName,
            expiresAt: durationMs ? Date.now() + durationMs : undefined,
            createdAt: Date.now()
        };

        this.mutedPlayers.set(playerId, restriction);
        this.logAction(GMActionType.MUTE_PLAYER, gmId, gmName, playerId, 
            `Reason: ${reason}, Duration: ${durationMs ? `${durationMs}ms` : 'permanent'}`);
        
        recordGMAction('mute_player');
        
        return { 
            success: true, 
            message: `Player ${playerId} muted${durationMs ? ` for ${durationMs}ms` : ' permanently'}` 
        };
    }

    /**
     * Unmute a player
     */
    public unmutePlayer(gmId: string, gmName: string, playerId: string): { success: boolean; message: string } {
        if (!this.hasPermission(gmId, GMPermission.MODERATOR)) {
            return { success: false, message: 'Insufficient permissions' };
        }

        if (!this.mutedPlayers.has(playerId)) {
            return { success: false, message: 'Player is not muted' };
        }

        this.mutedPlayers.delete(playerId);
        this.logAction(GMActionType.UNMUTE_PLAYER, gmId, gmName, playerId, 'Mute removed');
        
        recordGMAction('unmute_player');
        
        return { success: true, message: `Player ${playerId} unmuted` };
    }

    /**
     * Check if player is banned
     */
    public isPlayerBanned(playerId: string): boolean {
        const restriction = this.bannedPlayers.get(playerId);
        if (!restriction) return false;
        
        // Check if ban has expired
        if (restriction.expiresAt && restriction.expiresAt < Date.now()) {
            this.bannedPlayers.delete(playerId);
            return false;
        }
        
        return true;
    }

    /**
     * Check if player is muted
     */
    public isPlayerMuted(playerId: string): boolean {
        const restriction = this.mutedPlayers.get(playerId);
        if (!restriction) return false;
        
        // Check if mute has expired
        if (restriction.expiresAt && restriction.expiresAt < Date.now()) {
            this.mutedPlayers.delete(playerId);
            return false;
        }
        
        return true;
    }

    /**
     * Send reward to player
     */
    public sendReward(
        gmId: string,
        gmName: string,
        playerId: string,
        type: 'experience' | 'currency' | 'item',
        amount: number,
        itemId?: string,
        reason: string = 'GM reward'
    ): { success: boolean; message: string } {
        if (!this.hasPermission(gmId, GMPermission.GAMEMASTER)) {
            return { success: false, message: 'Insufficient permissions' };
        }

        const reward: PlayerReward = {
            playerId,
            type,
            amount: type !== 'item' ? amount : undefined,
            itemId: type === 'item' ? itemId : undefined,
            reason,
            gmId,
            gmName,
            timestamp: Date.now()
        };

        this.logAction(GMActionType.SEND_REWARD, gmId, gmName, playerId, 
            `Type: ${type}, Amount: ${amount}, Reason: ${reason}`);
        
        recordGMAction('send_reward');
        
        // Note: Actual reward delivery would happen via room message
        return { success: true, message: `Reward sent to ${playerId}` };
    }

    /**
     * Send mail to player
     */
    public sendMail(
        gmId: string,
        gmName: string,
        recipientId: string,
        subject: string,
        body: string,
        attachments?: Array<{type: string, id: string, amount: number}>,
        expiresInMs?: number
    ): { success: boolean; message: string } {
        if (!this.hasPermission(gmId, GMPermission.GAMEMASTER)) {
            return { success: false, message: 'Insufficient permissions' };
        }

        const mail: MailMessage = {
            id: `mail_${Date.now()}_${Math.random().toString(36).substring(7)}`,
            to: recipientId,
            from: gmName,
            subject,
            body,
            attachments,
            read: false,
            timestamp: Date.now(),
            expiresAt: expiresInMs ? Date.now() + expiresInMs : undefined
        };

        if (!this.mailbox.has(recipientId)) {
            this.mailbox.set(recipientId, []);
        }
        this.mailbox.get(recipientId)!.push(mail);

        this.logAction(GMActionType.SEND_MAIL, gmId, gmName, recipientId, 
            `Subject: ${subject}`);
        
        recordGMAction('send_mail');
        
        return { success: true, message: `Mail sent to ${recipientId}` };
    }

    /**
     * Get player's mailbox
     */
    public getPlayerMail(playerId: string): MailMessage[] {
        const now = Date.now();
        const mail = this.mailbox.get(playerId) || [];
        
        // Filter out expired mail
        const activeMail = mail.filter(m => !m.expiresAt || m.expiresAt > now);
        this.mailbox.set(playerId, activeMail);
        
        return activeMail;
    }

    /**
     * Mark mail as read
     */
    public markMailRead(playerId: string, mailId: string): boolean {
        const mail = this.mailbox.get(playerId);
        if (!mail) return false;
        
        const message = mail.find(m => m.id === mailId);
        if (!message) return false;
        
        message.read = true;
        return true;
    }

    /**
     * Broadcast announcement
     */
    public broadcastAnnouncement(
        gmId: string,
        gmName: string,
        type: AnnouncementType,
        message: string,
        priority: 'low' | 'normal' | 'high' | 'urgent' = 'normal',
        durationMs?: number
    ): { success: boolean; message: string; announcement?: Announcement } {
        if (!this.hasPermission(gmId, GMPermission.GAMEMASTER)) {
            return { success: false, message: 'Insufficient permissions' };
        }

        const announcement: Announcement = {
            id: `announce_${Date.now()}`,
            type,
            message,
            priority,
            duration: durationMs,
            gmId,
            gmName,
            timestamp: Date.now()
        };

        this.logAction(GMActionType.BROADCAST_ANNOUNCEMENT, gmId, gmName, undefined, 
            `Type: ${type}, Priority: ${priority}, Message: ${message}`);
        
        recordGMAction('broadcast_announcement');
        
        // Note: Actual broadcast would happen via room.broadcast()
        return { success: true, message: 'Announcement broadcasted', announcement };
    }

    /**
     * Start a game event
     */
    public startEvent(
        gmId: string,
        gmName: string,
        eventId: string,
        eventName: string,
        eventType: 'double_exp' | 'double_drop' | 'boss_spawn' | 'pvp_event' | 'custom',
        durationMs?: number,
        config: Record<string, any> = {}
    ): { success: boolean; message: string } {
        if (!this.hasPermission(gmId, GMPermission.ADMIN)) {
            return { success: false, message: 'Insufficient permissions' };
        }

        const event: GameEvent = {
            id: eventId,
            name: eventName,
            description: config.description || '',
            type: eventType,
            multiplier: config.multiplier,
            active: true,
            startTime: Date.now(),
            endTime: durationMs ? Date.now() + durationMs : undefined,
            config
        };

        this.activeEvents.set(eventId, event);
        this.logAction(GMActionType.START_EVENT, gmId, gmName, undefined, 
            `Event: ${eventName}, Type: ${eventType}, Duration: ${durationMs || 'unlimited'}`);
        
        recordGMAction('start_event');
        
        return { success: true, message: `Event ${eventName} started` };
    }

    /**
     * Stop a game event
     */
    public stopEvent(gmId: string, gmName: string, eventId: string): { success: boolean; message: string } {
        if (!this.hasPermission(gmId, GMPermission.ADMIN)) {
            return { success: false, message: 'Insufficient permissions' };
        }

        const event = this.activeEvents.get(eventId);
        if (!event) {
            return { success: false, message: 'Event not found' };
        }

        event.active = false;
        event.endTime = Date.now();
        this.activeEvents.delete(eventId);

        this.logAction(GMActionType.STOP_EVENT, gmId, gmName, undefined, 
            `Event: ${event.name}`);
        
        recordGMAction('stop_event');
        
        return { success: true, message: `Event ${event.name} stopped` };
    }

    /**
     * Get active events
     */
    public getActiveEvents(): GameEvent[] {
        const now = Date.now();
        const active: GameEvent[] = [];
        
        for (const [id, event] of this.activeEvents) {
            if (event.active && (!event.endTime || event.endTime > now)) {
                active.push(event);
            } else if (event.endTime && event.endTime <= now) {
                // Auto-expire events
                event.active = false;
                this.activeEvents.delete(id);
            }
        }
        
        return active;
    }

    /**
     * Check if specific event is active
     */
    public isEventActive(eventId: string): boolean {
        const event = this.activeEvents.get(eventId);
        if (!event) return false;
        
        const now = Date.now();
        return event.active && (!event.endTime || event.endTime > now);
    }

    /**
     * Get event multiplier for experience/drops
     */
    public getEventMultiplier(type: 'exp' | 'drop'): number {
        let multiplier = 1.0;
        const events = this.getActiveEvents();
        
        for (const event of events) {
            if (event.type === 'double_exp' && type === 'exp') {
                multiplier *= (event.multiplier || 2.0);
            } else if (event.type === 'double_drop' && type === 'drop') {
                multiplier *= (event.multiplier || 2.0);
            }
        }
        
        return multiplier;
    }

    /**
     * Get recent action log
     */
    public getActionLog(limit: number = 100): Array<any> {
        return this.actionLog.slice(-limit);
    }

    /**
     * Get server statistics for dashboard
     */
    public getServerStats(rooms: Room[]): {
        totalPlayers: number;
        totalRooms: number;
        bannedPlayers: number;
        mutedPlayers: number;
        activeEvents: number;
        pendingMail: number;
    } {
        let totalPlayers = 0;
        for (const room of rooms) {
            totalPlayers += room.clients.length;
        }

        let pendingMail = 0;
        for (const mail of this.mailbox.values()) {
            pendingMail += mail.filter(m => !m.read).length;
        }

        return {
            totalPlayers,
            totalRooms: rooms.length,
            bannedPlayers: this.bannedPlayers.size,
            mutedPlayers: this.mutedPlayers.size,
            activeEvents: this.getActiveEvents().length,
            pendingMail
        };
    }

    /**
     * Log GM action
     */
    private logAction(
        action: GMActionType,
        gmId: string,
        gmName: string,
        target: string | undefined,
        details: string
    ): void {
        this.actionLog.push({
            action,
            gmId,
            gmName,
            target,
            details,
            timestamp: Date.now()
        });

        // Keep only last 1000 actions
        if (this.actionLog.length > 1000) {
            this.actionLog = this.actionLog.slice(-1000);
        }

        console.log(`[GM Action] ${gmName} (${gmId}): ${action} ${target ? `on ${target}` : ''} - ${details}`);
    }

    /**
     * Start cleanup timer for expired restrictions
     */
    private startCleanupTimer(): void {
        setInterval(() => {
            const now = Date.now();
            
            // Clean expired bans
            for (const [playerId, restriction] of this.bannedPlayers) {
                if (restriction.expiresAt && restriction.expiresAt < now) {
                    this.bannedPlayers.delete(playerId);
                    console.log(`[GMBackend] Auto-expired ban for ${playerId}`);
                }
            }
            
            // Clean expired mutes
            for (const [playerId, restriction] of this.mutedPlayers) {
                if (restriction.expiresAt && restriction.expiresAt < now) {
                    this.mutedPlayers.delete(playerId);
                    console.log(`[GMBackend] Auto-expired mute for ${playerId}`);
                }
            }
            
            // Clean expired mail
            for (const [playerId, mail] of this.mailbox) {
                const activeMail = mail.filter(m => !m.expiresAt || m.expiresAt > now);
                if (activeMail.length !== mail.length) {
                    this.mailbox.set(playerId, activeMail);
                    console.log(`[GMBackend] Cleaned ${mail.length - activeMail.length} expired mail for ${playerId}`);
                }
            }
        }, 60000); // Run every minute
    }
}

/**
 * Get GM Backend instance
 */
export function getGMBackend(): GMBackendManager {
    return GMBackendManager.getInstance();
}
