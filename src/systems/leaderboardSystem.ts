import { World } from 'miniplex';
import { Entity } from '../entities';
import { LeaderboardEntry } from '../schemas/MyRoomState';

/**
 * Leaderboard system - updates rankings efficiently
 * Only updates periodically to reduce overhead
 */
export class LeaderboardManager {
  private lastUpdate: number = 0;
  private updateInterval: number = 5000; // Update every 5 seconds
  
  /**
   * Update leaderboard if interval has passed
   */
  update(world: World<Entity>, leaderboard: any): void {
    const now = Date.now();
    if (now - this.lastUpdate < this.updateInterval) {
      return;
    }
    
    this.lastUpdate = now;
    this.rebuildLeaderboard(world, leaderboard);
  }
  
  /**
   * Rebuild the entire leaderboard
   */
  private rebuildLeaderboard(world: World<Entity>, leaderboard: any): void {
    const entities = world.with('player').entities;
    
    // Build array of player data for sorting
    const playerData: Array<{
      sessionId: string;
      name: string;
      level: number;
      kills: number;
      score: number;
    }> = [];
    
    for (const entity of entities) {
      playerData.push({
        sessionId: entity.sessionId,
        name: entity.player.name,
        level: entity.player.level,
        kills: entity.player.kills,
        score: this.calculateScore(entity)
      });
    }
    
    // Sort by score descending
    playerData.sort((a, b) => b.score - a.score);
    
    // Take top 10
    const topPlayers = playerData.slice(0, 10);
    
    // Clear and rebuild leaderboard
    leaderboard.clear();
    
    for (let i = 0; i < topPlayers.length; i++) {
      const entry = new LeaderboardEntry();
      entry.playerId = topPlayers[i].sessionId;
      entry.playerName = topPlayers[i].name;
      entry.score = topPlayers[i].score;
      entry.level = topPlayers[i].level;
      entry.rank = i + 1;
      leaderboard.push(entry);
    }
  }
  
  /**
   * Calculate player score for ranking
   * Formula: (level * 100) + (kills * 50) - (deaths * 25)
   */
  private calculateScore(entity: Entity): number {
    const { level, kills, deaths } = entity.player;
    return (level * 100) + (kills * 50) - (deaths * 25);
  }
}
