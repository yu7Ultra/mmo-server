/**
 * Security Manager - Anti-cheat and security validation system
 * 
 * Features:
 * - Movement speed validation
 * - Attack frequency validation
 * - Player report system
 * - Suspicious activity detection
 * - Automatic action triggers
 * - Security metrics
 */

import { recordSecurityViolation, recordSecurityReport, recordSecurityAction } from '../instrumentation/prometheusMetrics';

// Security configuration
export interface SecurityConfig {
  movement: {
    maxSpeedMultiplier: number;
    teleportDistanceThreshold: number;
    validateInterval: number;
  };
  combat: {
    minAttackInterval: number;
    maxAttacksPerSecond: number;
  };
  violations: {
    warningThreshold: number;
    kickThreshold: number;
    banThreshold: number;
    violationExpiry: number; // ms
  };
  autoActions: {
    enabled: boolean;
    banDuration: number; // ms
  };
}

const DEFAULT_SECURITY_CONFIG: SecurityConfig = {
  movement: {
    maxSpeedMultiplier: 2.0,
    teleportDistanceThreshold: 500,
    validateInterval: 100
  },
  combat: {
    minAttackInterval: 100,
    maxAttacksPerSecond: 10
  },
  violations: {
    warningThreshold: 3,
    kickThreshold: 5,
    banThreshold: 10,
    violationExpiry: 86400000 // 24 hours
  },
  autoActions: {
    enabled: true,
    banDuration: 86400000 // 24 hours
  }
};

// Violation types
export type ViolationType = 
  | 'speed_hack'
  | 'teleport'
  | 'attack_spam'
  | 'position_desync'
  | 'impossible_action'
  | 'suspicious_pattern';

// Report categories
export type ReportCategory =
  | 'cheating'
  | 'harassment'
  | 'botting'
  | 'exploiting'
  | 'spam'
  | 'inappropriate_name'
  | 'real_money_trading'
  | 'other';

// Violation record
interface Violation {
  type: ViolationType;
  timestamp: number;
  details: string;
  severity: number; // 1-10
}

// Player report
interface PlayerReport {
  reporterId: string;
  reportedId: string;
  category: ReportCategory;
  reason: string;
  evidence?: string;
  timestamp: number;
  status: 'pending' | 'reviewed' | 'resolved';
}

// Player security data
interface PlayerSecurityData {
  playerId: string;
  violations: Violation[];
  reports: string[]; // Report IDs
  lastPositions: Array<{ x: number; y: number; timestamp: number }>;
  lastAttackTimes: Map<string, number>; // skillId -> timestamp
  isBanned: boolean;
  banExpiresAt?: number;
  warningCount: number;
  kickCount: number;
}

/**
 * Security Manager - Singleton
 */
export class SecurityManager {
  private static instance: SecurityManager;
  private config: SecurityConfig;
  private playerData: Map<string, PlayerSecurityData>;
  private reports: Map<string, PlayerReport>;
  private bannedPlayers: Set<string>;

  private constructor() {
    this.config = { ...DEFAULT_SECURITY_CONFIG };
    this.playerData = new Map();
    this.reports = new Map();
    this.bannedPlayers = new Set();

    // Start cleanup timer
    this.startCleanupTimer();
  }

  static getInstance(): SecurityManager {
    if (!SecurityManager.instance) {
      SecurityManager.instance = new SecurityManager();
    }
    return SecurityManager.instance;
  }

  /**
   * Update security configuration
   */
  updateConfig(config: Partial<SecurityConfig>): void {
    this.config = { ...this.config, ...config };
    console.log('[SecurityManager] Configuration updated');
  }

  /**
   * Get player security data (create if not exists)
   */
  private getPlayerData(playerId: string): PlayerSecurityData {
    if (!this.playerData.has(playerId)) {
      this.playerData.set(playerId, {
        playerId,
        violations: [],
        reports: [],
        lastPositions: [],
        lastAttackTimes: new Map(),
        isBanned: false,
        warningCount: 0,
        kickCount: 0
      });
    }
    return this.playerData.get(playerId)!;
  }

  /**
   * Validate movement speed
   */
  validateMovement(
    playerId: string,
    oldPos: { x: number; y: number },
    newPos: { x: number; y: number },
    deltaTime: number,
    playerSpeed: number
  ): boolean {
    const playerData = this.getPlayerData(playerId);
    
    // Calculate distance moved
    const dx = newPos.x - oldPos.x;
    const dy = newPos.y - oldPos.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Calculate expected max distance
    const maxDistance = playerSpeed * (deltaTime / 1000) * this.config.movement.maxSpeedMultiplier;

    // Check for teleportation
    if (distance > this.config.movement.teleportDistanceThreshold) {
      this.recordViolation(playerId, 'teleport', `Teleported ${distance.toFixed(2)} units`, 8);
      recordSecurityViolation('teleport');
      return false;
    }

    // Check for speed hacking
    if (distance > maxDistance && deltaTime < this.config.movement.validateInterval) {
      this.recordViolation(playerId, 'speed_hack', 
        `Moved ${distance.toFixed(2)} units in ${deltaTime}ms (max: ${maxDistance.toFixed(2)})`, 6);
      recordSecurityViolation('speed_hack');
      return false;
    }

    // Update position history
    playerData.lastPositions.push({ x: newPos.x, y: newPos.y, timestamp: Date.now() });
    if (playerData.lastPositions.length > 10) {
      playerData.lastPositions.shift();
    }

    return true;
  }

  /**
   * Validate attack frequency
   */
  validateAttack(playerId: string, skillId: string, cooldown: number): boolean {
    const playerData = this.getPlayerData(playerId);
    const now = Date.now();
    const lastAttackTime = playerData.lastAttackTimes.get(skillId) || 0;
    const timeSinceLastAttack = now - lastAttackTime;

    // Check minimum interval
    if (timeSinceLastAttack < this.config.combat.minAttackInterval) {
      this.recordViolation(playerId, 'attack_spam',
        `Attack interval ${timeSinceLastAttack}ms (min: ${this.config.combat.minAttackInterval}ms)`, 7);
      recordSecurityViolation('attack_spam');
      return false;
    }

    // Check cooldown
    if (timeSinceLastAttack < cooldown) {
      this.recordViolation(playerId, 'attack_spam',
        `Cooldown not respected: ${timeSinceLastAttack}ms / ${cooldown}ms`, 8);
      recordSecurityViolation('attack_spam');
      return false;
    }

    // Update last attack time
    playerData.lastAttackTimes.set(skillId, now);

    return true;
  }

  /**
   * Report a player
   */
  reportPlayer(
    reporterId: string,
    reportedId: string,
    category: ReportCategory,
    reason: string,
    evidence?: string
  ): string {
    const reportId = `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const report: PlayerReport = {
      reporterId,
      reportedId,
      category,
      reason,
      evidence,
      timestamp: Date.now(),
      status: 'pending'
    };

    this.reports.set(reportId, report);

    // Add to reported player's data
    const playerData = this.getPlayerData(reportedId);
    playerData.reports.push(reportId);

    recordSecurityReport(category);
    
    console.log(`[SecurityManager] Player ${reportedId} reported by ${reporterId} for ${category}`);

    return reportId;
  }

  /**
   * Record a violation
   */
  private recordViolation(
    playerId: string,
    type: ViolationType,
    details: string,
    severity: number
  ): void {
    const playerData = this.getPlayerData(playerId);
    
    const violation: Violation = {
      type,
      timestamp: Date.now(),
      details,
      severity
    };

    playerData.violations.push(violation);

    console.log(`[SecurityManager] Violation recorded for ${playerId}: ${type} - ${details}`);

    // Check if action needed
    if (this.config.autoActions.enabled) {
      this.checkAutoActions(playerId, playerData);
    }
  }

  /**
   * Check and trigger automatic actions
   */
  private checkAutoActions(playerId: string, playerData: PlayerSecurityData): void {
    // Count recent violations (last 24h)
    const recentViolations = this.getRecentViolations(playerData);
    const violationCount = recentViolations.length;

    if (violationCount >= this.config.violations.banThreshold) {
      this.banPlayer(playerId, this.config.autoActions.banDuration, 'Automatic ban: excessive violations');
      recordSecurityAction('ban');
    } else if (violationCount >= this.config.violations.kickThreshold) {
      playerData.kickCount++;
      recordSecurityAction('kick');
      console.log(`[SecurityManager] Player ${playerId} should be kicked (${violationCount} violations)`);
    } else if (violationCount >= this.config.violations.warningThreshold) {
      playerData.warningCount++;
      recordSecurityAction('warning');
      console.log(`[SecurityManager] Warning issued to ${playerId} (${violationCount} violations)`);
    }
  }

  /**
   * Get recent violations (within expiry window)
   */
  private getRecentViolations(playerData: PlayerSecurityData): Violation[] {
    const now = Date.now();
    const expiry = this.config.violations.violationExpiry;
    return playerData.violations.filter(v => now - v.timestamp < expiry);
  }

  /**
   * Ban a player
   */
  banPlayer(playerId: string, duration: number, reason: string): void {
    const playerData = this.getPlayerData(playerId);
    playerData.isBanned = true;
    playerData.banExpiresAt = duration > 0 ? Date.now() + duration : undefined;
    this.bannedPlayers.add(playerId);
    
    console.log(`[SecurityManager] Player ${playerId} banned for ${duration}ms. Reason: ${reason}`);
  }

  /**
   * Unban a player
   */
  unbanPlayer(playerId: string): void {
    const playerData = this.getPlayerData(playerId);
    playerData.isBanned = false;
    playerData.banExpiresAt = undefined;
    this.bannedPlayers.delete(playerId);
    
    console.log(`[SecurityManager] Player ${playerId} unbanned`);
  }

  /**
   * Check if player is banned
   */
  isPlayerBanned(playerId: string): boolean {
    if (!this.playerData.has(playerId)) {
      return false;
    }

    const playerData = this.playerData.get(playerId)!;
    
    // Check if ban expired
    if (playerData.isBanned && playerData.banExpiresAt) {
      if (Date.now() >= playerData.banExpiresAt) {
        this.unbanPlayer(playerId);
        return false;
      }
    }

    return playerData.isBanned;
  }

  /**
   * Get player violation history
   */
  getPlayerViolations(playerId: string): Violation[] {
    const playerData = this.getPlayerData(playerId);
    return this.getRecentViolations(playerData);
  }

  /**
   * Get security statistics
   */
  getSecurityStats() {
    const now = Date.now();
    let totalViolations = 0;
    let totalReports = 0;
    let activeBans = 0;

    this.playerData.forEach(playerData => {
      totalViolations += this.getRecentViolations(playerData).length;
      totalReports += playerData.reports.length;
      if (playerData.isBanned) {
        activeBans++;
      }
    });

    const pendingReports = Array.from(this.reports.values())
      .filter(r => r.status === 'pending').length;

    return {
      totalViolations,
      totalReports,
      activeBans,
      pendingReports,
      trackedPlayers: this.playerData.size
    };
  }

  /**
   * Get pending reports for admin review
   */
  getPendingReports(): PlayerReport[] {
    return Array.from(this.reports.values())
      .filter(r => r.status === 'pending')
      .sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Clean up expired data
   */
  private cleanup(): void {
    const now = Date.now();
    const expiry = this.config.violations.violationExpiry;

    this.playerData.forEach((playerData, playerId) => {
      // Remove old violations
      playerData.violations = playerData.violations.filter(v => now - v.timestamp < expiry);

      // Check ban expiration
      if (playerData.isBanned && playerData.banExpiresAt && now >= playerData.banExpiresAt) {
        this.unbanPlayer(playerId);
      }

      // Remove player data if no recent activity
      if (playerData.violations.length === 0 && 
          playerData.reports.length === 0 && 
          !playerData.isBanned &&
          playerData.lastPositions.length === 0) {
        this.playerData.delete(playerId);
      }
    });

    console.log(`[SecurityManager] Cleanup complete. Tracking ${this.playerData.size} players`);
  }

  /**
   * Start periodic cleanup
   */
  private startCleanupTimer(): void {
    setInterval(() => {
      this.cleanup();
    }, 3600000); // Every hour
  }

  /**
   * Remove player data (on disconnect)
   */
  removePlayer(playerId: string): void {
    const playerData = this.playerData.get(playerId);
    if (playerData && !playerData.isBanned && playerData.violations.length === 0) {
      this.playerData.delete(playerId);
    }
  }
}

/**
 * Get the singleton instance
 */
export function getSecurityManager(): SecurityManager {
  return SecurityManager.getInstance();
}
