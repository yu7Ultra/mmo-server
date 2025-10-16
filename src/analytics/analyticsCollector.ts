/**
 * Analytics Collector
 * 
 * Collects and aggregates game metrics for the Data Analytics Dashboard.
 * Provides standardized event logging and metrics for:
 * - User metrics (DAU/MAU/CCU/retention)
 * - Game behavior (level distribution, combat stats, economy)
 * - Quest and skill usage analytics
 * - Churn prediction and analysis
 * 
 * Integrates with Prometheus for real-time metrics and
 * provides historical data aggregation for dashboards.
 */

// ============================================================================
// Types & Interfaces
// ============================================================================

export interface UserMetrics {
  dau: number;              // Daily Active Users
  mau: number;              // Monthly Active Users
  ccu: number;              // Current Concurrent Users
  peakCCU: number;          // Peak CCU in period
  newUsers: number;         // New user registrations
  returningUsers: number;   // Users who returned after absence
}

export interface RetentionMetrics {
  day1: number;     // % of users who return after 1 day
  day7: number;     // % of users who return after 7 days
  day30: number;    // % of users who return after 30 days
}

export interface LevelDistribution {
  [level: number]: number;  // Number of players at each level
}

export interface CombatStats {
  totalCombatEncounters: number;
  pvpEncounters: number;
  pveEncounters: number;
  totalDamageDealt: number;
  totalKills: number;
  totalDeaths: number;
  averageCombatDuration: number;
}

export interface EconomyMetrics {
  totalCurrency: number;
  currencyCreated: number;    // Currency added to economy
  currencyDestroyed: number;  // Currency removed from economy
  averagePlayerWealth: number;
  wealthGiniCoefficient: number;  // Wealth inequality (0=equal, 1=unequal)
}

export interface QuestMetrics {
  totalQuestsStarted: number;
  totalQuestsCompleted: number;
  completionRate: number;
  averageCompletionTime: number;
  popularQuests: Array<{ questId: string; completions: number }>;
}

export interface SkillMetrics {
  totalSkillUsage: number;
  popularSkills: Array<{ skillId: string; uses: number }>;
  averageSkillsPerPlayer: number;
}

export interface ChurnMetrics {
  churnRate: number;        // % of players who stopped playing
  atRiskPlayers: number;    // Players likely to churn
  churnReasons: {
    [reason: string]: number;
  };
}

export interface PlayerSession {
  sessionId: string;
  playerId: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  lastActivity: number;
}

export interface AnalyticsEvent {
  type: string;
  playerId: string;
  timestamp: number;
  data: any;
}

// ============================================================================
// Analytics Collector Singleton
// ============================================================================

class AnalyticsCollector {
  private static instance: AnalyticsCollector;
  
  // Event listeners
  private listeners: Map<string, Array<Function>> = new Map();
  
  // Session tracking
  private sessions: Map<string, PlayerSession> = new Map();
  private dailyActivePlayers: Set<string> = new Set();
  private monthlyActivePlayers: Set<string> = new Set();
  
  // Historical data (last 30 days)
  private dailyActiveHistory: number[] = [];
  private sessionHistory: PlayerSession[] = [];
  
  // Metrics caches
  private levelDistribution: Map<number, number> = new Map();
  private skillUsage: Map<string, number> = new Map();
  private questCompletions: Map<string, number> = new Map();
  
  // Economy tracking
  private totalCurrency: number = 0;
  private currencyCreated: number = 0;
  private currencyDestroyed: number = 0;
  
  // Combat tracking
  private combatStats = {
    totalEncounters: 0,
    pvpEncounters: 0,
    pveEncounters: 0,
    totalDamage: 0,
    totalKills: 0,
    totalDeaths: 0,
    combatDurations: [] as number[],
  };
  
  // Event log (last 10000 events)
  private eventLog: AnalyticsEvent[] = [];
  private readonly MAX_EVENT_LOG = 10000;
  
  // Cleanup interval
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;
  
  private constructor() {
    this.startCleanupTimer();
    console.log('[Analytics] Collector initialized');
  }
  
  public static getInstance(): AnalyticsCollector {
    if (!AnalyticsCollector.instance) {
      AnalyticsCollector.instance = new AnalyticsCollector();
    }
    return AnalyticsCollector.instance;
  }
  
  // ============================================================================
  // Event Emitter Simple Implementation
  // ============================================================================
  
  public on(event: string, listener: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(listener);
  }
  
  public emit(event: string, data?: any): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach(listener => listener(data));
    }
  }
  
  public removeAllListeners(): void {
    this.listeners.clear();
  }
  
  // ============================================================================
  // Session Management
  // ============================================================================
  
  public trackPlayerJoin(playerId: string, sessionId: string): void {
    const session: PlayerSession = {
      sessionId,
      playerId,
      startTime: Date.now(),
      lastActivity: Date.now(),
    };
    
    this.sessions.set(sessionId, session);
    this.dailyActivePlayers.add(playerId);
    this.monthlyActivePlayers.add(playerId);
    
    this.logEvent('player_join', playerId, { sessionId });
    this.emit('player-join', { playerId, sessionId });
  }
  
  public trackPlayerLeave(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    
    session.endTime = Date.now();
    session.duration = session.endTime - session.startTime;
    
    this.sessionHistory.push({ ...session });
    this.sessions.delete(sessionId);
    
    this.logEvent('player_leave', session.playerId, {
      sessionId,
      duration: session.duration,
    });
    this.emit('player-leave', { playerId: session.playerId, sessionId, duration: session.duration });
  }
  
  public updatePlayerActivity(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.lastActivity = Date.now();
    }
  }
  
  // ============================================================================
  // Game Event Tracking
  // ============================================================================
  
  public trackLevelUp(playerId: string, newLevel: number, oldLevel: number): void {
    // Update level distribution
    if (oldLevel > 0) {
      const oldCount = this.levelDistribution.get(oldLevel) || 0;
      this.levelDistribution.set(oldLevel, Math.max(0, oldCount - 1));
    }
    
    const newCount = this.levelDistribution.get(newLevel) || 0;
    this.levelDistribution.set(newLevel, newCount + 1);
    
    this.logEvent('level_up', playerId, { oldLevel, newLevel });
  }
  
  public trackCombatEncounter(playerId: string, targetId: string, isPvP: boolean, duration: number): void {
    this.combatStats.totalEncounters++;
    if (isPvP) {
      this.combatStats.pvpEncounters++;
    } else {
      this.combatStats.pveEncounters++;
    }
    this.combatStats.combatDurations.push(duration);
    
    this.logEvent('combat_encounter', playerId, { targetId, isPvP, duration });
  }
  
  public trackDamageDealt(playerId: string, damage: number, skillId?: string): void {
    this.combatStats.totalDamage += damage;
    this.logEvent('damage_dealt', playerId, { damage, skillId });
  }
  
  public trackKill(killerId: string, victimId: string, isPvP: boolean): void {
    this.combatStats.totalKills++;
    this.logEvent('kill', killerId, { victimId, isPvP });
  }
  
  public trackDeath(playerId: string, killerId?: string): void {
    this.combatStats.totalDeaths++;
    this.logEvent('death', playerId, { killerId });
  }
  
  public trackSkillUse(playerId: string, skillId: string): void {
    const count = this.skillUsage.get(skillId) || 0;
    this.skillUsage.set(skillId, count + 1);
    this.logEvent('skill_use', playerId, { skillId });
  }
  
  public trackQuestStart(playerId: string, questId: string): void {
    this.logEvent('quest_start', playerId, { questId });
  }
  
  public trackQuestComplete(playerId: string, questId: string, duration: number): void {
    const count = this.questCompletions.get(questId) || 0;
    this.questCompletions.set(questId, count + 1);
    this.logEvent('quest_complete', playerId, { questId, duration });
  }
  
  public trackCurrencyGain(playerId: string, amount: number, source: string): void {
    this.totalCurrency += amount;
    this.currencyCreated += amount;
    this.logEvent('currency_gain', playerId, { amount, source });
  }
  
  public trackCurrencySpend(playerId: string, amount: number, purpose: string): void {
    this.totalCurrency -= amount;
    this.currencyDestroyed += amount;
    this.logEvent('currency_spend', playerId, { amount, purpose });
  }
  
  public trackItemDrop(playerId: string, itemId: string, quantity: number): void {
    this.logEvent('item_drop', playerId, { itemId, quantity });
  }
  
  public trackItemPickup(playerId: string, itemId: string, quantity: number): void {
    this.logEvent('item_pickup', playerId, { itemId, quantity });
  }
  
  // ============================================================================
  // Metrics Getters
  // ============================================================================
  
  public getUserMetrics(): UserMetrics {
    const ccu = this.sessions.size;
    const peakCCU = Math.max(...this.dailyActiveHistory, ccu);
    
    return {
      dau: this.dailyActivePlayers.size,
      mau: this.monthlyActivePlayers.size,
      ccu,
      peakCCU,
      newUsers: 0, // Would need database integration
      returningUsers: 0, // Would need database integration
    };
  }
  
  public getRetentionMetrics(): RetentionMetrics {
    // Simplified - would need database for accurate retention
    return {
      day1: 0.65,  // Placeholder - 65% day-1 retention
      day7: 0.35,  // Placeholder - 35% day-7 retention
      day30: 0.15, // Placeholder - 15% day-30 retention
    };
  }
  
  public getLevelDistribution(): LevelDistribution {
    const distribution: LevelDistribution = {};
    this.levelDistribution.forEach((count, level) => {
      if (count > 0) {
        distribution[level] = count;
      }
    });
    return distribution;
  }
  
  public getCombatStats(): CombatStats {
    const avgDuration = this.combatStats.combatDurations.length > 0
      ? this.combatStats.combatDurations.reduce((a, b) => a + b, 0) / this.combatStats.combatDurations.length
      : 0;
    
    return {
      totalCombatEncounters: this.combatStats.totalEncounters,
      pvpEncounters: this.combatStats.pvpEncounters,
      pveEncounters: this.combatStats.pveEncounters,
      totalDamageDealt: this.combatStats.totalDamage,
      totalKills: this.combatStats.totalKills,
      totalDeaths: this.combatStats.totalDeaths,
      averageCombatDuration: avgDuration,
    };
  }
  
  public getEconomyMetrics(): EconomyMetrics {
    const activePlayers = this.sessions.size || 1;
    const avgWealth = this.totalCurrency / activePlayers;
    
    return {
      totalCurrency: this.totalCurrency,
      currencyCreated: this.currencyCreated,
      currencyDestroyed: this.currencyDestroyed,
      averagePlayerWealth: avgWealth,
      wealthGiniCoefficient: 0.4, // Placeholder - would need full player data
    };
  }
  
  public getQuestMetrics(): QuestMetrics {
    const completions = Array.from(this.questCompletions.entries())
      .map(([questId, completions]) => ({ questId, completions }))
      .sort((a, b) => b.completions - a.completions)
      .slice(0, 10);
    
    return {
      totalQuestsStarted: 0, // Would need to track quest starts
      totalQuestsCompleted: Array.from(this.questCompletions.values()).reduce((a, b) => a + b, 0),
      completionRate: 0.75, // Placeholder
      averageCompletionTime: 300000, // Placeholder - 5 minutes
      popularQuests: completions,
    };
  }
  
  public getSkillMetrics(): SkillMetrics {
    const popularSkills = Array.from(this.skillUsage.entries())
      .map(([skillId, uses]) => ({ skillId, uses }))
      .sort((a, b) => b.uses - a.uses)
      .slice(0, 10);
    
    const totalUsage = Array.from(this.skillUsage.values()).reduce((a, b) => a + b, 0);
    const activePlayers = this.sessions.size || 1;
    
    return {
      totalSkillUsage: totalUsage,
      popularSkills,
      averageSkillsPerPlayer: totalUsage / activePlayers,
    };
  }
  
  public getChurnMetrics(): ChurnMetrics {
    // Simplified churn detection - players inactive for > 24 hours
    const now = Date.now();
    const oneDayAgo = now - 24 * 60 * 60 * 1000;
    
    const atRisk = Array.from(this.sessions.values()).filter(
      session => session.lastActivity < oneDayAgo
    ).length;
    
    return {
      churnRate: 0.2, // Placeholder - 20% monthly churn
      atRiskPlayers: atRisk,
      churnReasons: {
        inactivity: atRisk,
        other: 0,
      },
    };
  }
  
  public getAverageSessionDuration(): number {
    if (this.sessionHistory.length === 0) return 0;
    
    const totalDuration = this.sessionHistory
      .filter(s => s.duration)
      .reduce((sum, s) => sum + (s.duration || 0), 0);
    
    return totalDuration / this.sessionHistory.length;
  }
  
  public getEventLog(limit: number = 100): AnalyticsEvent[] {
    return this.eventLog.slice(-limit);
  }
  
  // ============================================================================
  // Internal Helpers
  // ============================================================================
  
  private logEvent(type: string, playerId: string, data: any): void {
    const event: AnalyticsEvent = {
      type,
      playerId,
      timestamp: Date.now(),
      data,
    };
    
    this.eventLog.push(event);
    
    // Trim event log if too large
    if (this.eventLog.length > this.MAX_EVENT_LOG) {
      this.eventLog = this.eventLog.slice(-this.MAX_EVENT_LOG);
    }
    
    this.emit('event', event);
  }
  
  private startCleanupTimer(): void {
    // Clean up old data every hour
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60 * 60 * 1000);
  }
  
  private cleanup(): void {
    const now = Date.now();
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
    
    // Reset daily active users
    this.dailyActivePlayers.clear();
    this.dailyActiveHistory.push(this.dailyActivePlayers.size);
    
    // Keep only last 30 days of history
    if (this.dailyActiveHistory.length > 30) {
      this.dailyActiveHistory = this.dailyActiveHistory.slice(-30);
    }
    
    // Clean up old sessions
    this.sessionHistory = this.sessionHistory.filter(
      s => (s.endTime || now) > thirtyDaysAgo
    );
    
    // Reset monthly users every 30 days (simplified)
    if (this.sessionHistory.length > 10000) {
      this.monthlyActivePlayers.clear();
    }
    
    console.log('[Analytics] Cleanup completed');
  }
  
  public dispose(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.removeAllListeners();
  }
}

// ============================================================================
// Export
// ============================================================================

export function getAnalyticsCollector(): AnalyticsCollector {
  return AnalyticsCollector.getInstance();
}

export default AnalyticsCollector;
