import { Registry, Counter, Gauge, Histogram, collectDefaultMetrics } from 'prom-client';

/**
 * Prometheus metrics using prom-client for standardized monitoring
 */

// Create a custom registry
export const register = new Registry();

// Collect default Node.js metrics (CPU, memory, event loop, etc.)
collectDefaultMetrics({ 
  register,
  prefix: 'colyseus_'
});

// ============================================================================
// Server Metrics
// ============================================================================

/**
 * Event loop lag in milliseconds
 */
export const eventLoopLag = new Gauge({
  name: 'colyseus_event_loop_lag_ms',
  help: 'Event loop lag in milliseconds',
  registers: [register]
});

/**
 * Number of active rooms
 */
export const roomCount = new Gauge({
  name: 'colyseus_room_count',
  help: 'Total number of active rooms',
  registers: [register]
});

/**
 * Total number of connected clients
 */
export const totalClients = new Gauge({
  name: 'colyseus_total_clients',
  help: 'Total number of connected clients across all rooms',
  registers: [register]
});

// ============================================================================
// Room Metrics
// ============================================================================

/**
 * Number of clients per room
 */
export const roomClients = new Gauge({
  name: 'colyseus_room_clients',
  help: 'Number of clients connected to a room',
  labelNames: ['roomId'],
  registers: [register]
});

/**
 * Game tick duration histogram
 */
export const tickDuration = new Histogram({
  name: 'colyseus_tick_duration_ms',
  help: 'Game tick duration in milliseconds',
  labelNames: ['roomId'],
  buckets: [1, 2, 5, 10, 20, 50, 100, 200, 500],
  registers: [register]
});

/**
 * Message counter by type
 */
export const messagesReceived = new Counter({
  name: 'colyseus_messages_total',
  help: 'Total number of messages received',
  labelNames: ['roomId', 'messageType'],
  registers: [register]
});

/**
 * State patches sent
 */
export const patchesSent = new Counter({
  name: 'colyseus_patches_total',
  help: 'Total number of state patches sent',
  labelNames: ['roomId'],
  registers: [register]
});

/**
 * Patch size in bytes
 */
export const patchBytes = new Histogram({
  name: 'colyseus_patch_bytes',
  help: 'State patch size in bytes',
  labelNames: ['roomId'],
  buckets: [100, 500, 1000, 5000, 10000, 50000, 100000],
  registers: [register]
});

/**
 * Slow tick counter
 */
export const slowTicks = new Counter({
  name: 'colyseus_slow_ticks_total',
  help: 'Number of slow ticks detected',
  labelNames: ['roomId'],
  registers: [register]
});

// ============================================================================
// Game Business Metrics
// ============================================================================

/**
 * Player registrations/joins
 */
export const playerJoins = new Counter({
  name: 'game_player_joins_total',
  help: 'Total number of player joins',
  labelNames: ['roomId'],
  registers: [register]
});

/**
 * Player leaves
 */
export const playerLeaves = new Counter({
  name: 'game_player_leaves_total',
  help: 'Total number of player leaves',
  labelNames: ['roomId'],
  registers: [register]
});

/**
 * Combat encounters
 */
export const combatEncounters = new Counter({
  name: 'game_combat_total',
  help: 'Total combat encounters',
  labelNames: ['combatType'], // pvp, pve
  registers: [register]
});

/**
 * Damage dealt
 */
export const damageDealt = new Counter({
  name: 'game_damage_dealt_total',
  help: 'Total damage dealt',
  labelNames: ['skillId'],
  registers: [register]
});

/**
 * Skills used
 */
export const skillsUsed = new Counter({
  name: 'game_skills_used_total',
  help: 'Total skills used',
  labelNames: ['skillId'],
  registers: [register]
});

/**
 * Quests completed
 */
export const questCompletions = new Counter({
  name: 'game_quest_completions_total',
  help: 'Total quest completions',
  labelNames: ['questId'],
  registers: [register]
});

/**
 * Achievements unlocked
 */
export const achievementsUnlocked = new Counter({
  name: 'game_achievements_unlocked_total',
  help: 'Total achievements unlocked',
  labelNames: ['achievementId'],
  registers: [register]
});

/**
 * Chat messages sent
 */
export const chatMessages = new Counter({
  name: 'game_chat_messages_total',
  help: 'Total chat messages sent',
  labelNames: ['channel'],
  registers: [register]
});

/**
 * Player level distribution
 */
export const playerLevel = new Histogram({
  name: 'game_player_level',
  help: 'Player level distribution',
  buckets: [1, 5, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100],
  registers: [register]
});

/**
 * Player deaths
 */
export const playerDeaths = new Counter({
  name: 'game_player_deaths_total',
  help: 'Total player deaths',
  registers: [register]
});

/**
 * Player kills
 */
export const playerKills = new Counter({
  name: 'game_player_kills_total',
  help: 'Total player kills',
  registers: [register]
});

/**
 * Items dropped
 */
export const itemDrops = new Counter({
  name: 'game_item_drops_total',
  help: 'Total item drops',
  labelNames: ['itemId', 'rarity'],
  registers: [register]
});

/**
 * Experience gained
 */
export const experienceGained = new Counter({
  name: 'game_experience_gained_total',
  help: 'Total experience gained',
  labelNames: ['source'], // quest, combat, achievement
  registers: [register]
});

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Update event loop lag metric
 */
export function updateEventLoopLag(lagMs: number): void {
  eventLoopLag.set(lagMs);
}

/**
 * Update room count
 */
export function updateRoomCount(count: number): void {
  roomCount.set(count);
}

/**
 * Update total clients
 */
export function updateTotalClients(count: number): void {
  totalClients.set(count);
}

/**
 * Record a game tick
 */
export function recordTickDuration(roomId: string, durationMs: number): void {
  tickDuration.labels(roomId).observe(durationMs);
}

/**
 * Record a message
 */
export function recordMessage(roomId: string, messageType: string): void {
  messagesReceived.labels(roomId, messageType).inc();
}

/**
 * Record a patch
 */
export function recordPatch(roomId: string, bytes?: number): void {
  patchesSent.labels(roomId).inc();
  if (bytes) {
    patchBytes.labels(roomId).observe(bytes);
  }
}

/**
 * Record slow tick
 */
export function recordSlowTick(roomId: string): void {
  slowTicks.labels(roomId).inc();
}

/**
 * Record player join
 */
export function recordPlayerJoin(roomId: string): void {
  playerJoins.labels(roomId).inc();
}

/**
 * Record player leave
 */
export function recordPlayerLeave(roomId: string): void {
  playerLeaves.labels(roomId).inc();
}

/**
 * Record combat
 */
export function recordCombat(type: 'pvp' | 'pve'): void {
  combatEncounters.labels(type).inc();
}

/**
 * Record damage
 */
export function recordDamage(skillId: string, amount: number): void {
  damageDealt.labels(skillId).inc(amount);
}

/**
 * Record skill use
 */
export function recordSkillUse(skillId: string): void {
  skillsUsed.labels(skillId).inc();
}

/**
 * Record quest completion
 */
export function recordQuestCompletion(questId: string): void {
  questCompletions.labels(questId).inc();
}

/**
 * Record achievement unlock
 */
export function recordAchievementUnlock(achievementId: string): void {
  achievementsUnlocked.labels(achievementId).inc();
}

/**
 * Record chat message
 */
export function recordChatMessage(channel: string): void {
  chatMessages.labels(channel).inc();
}

/**
 * Record player level
 */
export function recordPlayerLevel(level: number): void {
  playerLevel.observe(level);
}

/**
 * Record player death
 */
export function recordPlayerDeath(): void {
  playerDeaths.inc();
}

/**
 * Record player kill
 */
export function recordPlayerKill(): void {
  playerKills.inc();
}

/**
 * Record item drop
 */
export function recordItemDrop(itemId: string, rarity: string): void {
  itemDrops.labels(itemId, rarity).inc();
}

/**
 * Record experience gained
 */
export function recordExperience(source: string, amount: number): void {
  experienceGained.labels(source).inc(amount);
}

// ============================================================================
// GM Backend Metrics
// ============================================================================

/**
 * GM actions performed
 */
export const gmActions = new Counter({
  name: 'gm_actions_total',
  help: 'Total GM actions performed',
  labelNames: ['action'],
  registers: [register]
});

/**
 * Banned players (gauge)
 */
export const bannedPlayers = new Gauge({
  name: 'gm_banned_players',
  help: 'Number of currently banned players',
  registers: [register]
});

/**
 * Muted players (gauge)
 */
export const mutedPlayers = new Gauge({
  name: 'gm_muted_players',
  help: 'Number of currently muted players',
  registers: [register]
});

/**
 * Active game events (gauge)
 */
export const activeGameEvents = new Gauge({
  name: 'gm_active_events',
  help: 'Number of currently active game events',
  registers: [register]
});

/**
 * Mail messages sent
 */
export const mailSent = new Counter({
  name: 'gm_mail_sent_total',
  help: 'Total mail messages sent by GMs',
  registers: [register]
});

/**
 * Rewards sent
 */
export const rewardsSent = new Counter({
  name: 'gm_rewards_sent_total',
  help: 'Total rewards sent by GMs',
  labelNames: ['type'], // experience, currency, item
  registers: [register]
});

/**
 * Announcements broadcasted
 */
export const announcementsBroadcasted = new Counter({
  name: 'gm_announcements_total',
  help: 'Total announcements broadcasted',
  labelNames: ['type'], // server_wide, scrolling, popup, chat
  registers: [register]
});

/**
 * Record GM action
 */
export function recordGMAction(action: string): void {
  gmActions.labels(action).inc();
}

/**
 * Update banned players count
 */
export function updateBannedPlayers(count: number): void {
  bannedPlayers.set(count);
}

/**
 * Update muted players count
 */
export function updateMutedPlayers(count: number): void {
  mutedPlayers.set(count);
}

/**
 * Update active events count
 */
export function updateActiveEvents(count: number): void {
  activeGameEvents.set(count);
}

/**
 * Record mail sent
 */
export function recordMailSent(): void {
  mailSent.inc();
}

/**
 * Record reward sent
 */
export function recordRewardSent(type: string): void {
  rewardsSent.labels(type).inc();
}

/**
 * Record announcement
 */
export function recordAnnouncement(type: string): void {
  announcementsBroadcasted.labels(type).inc();
}

