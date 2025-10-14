import { ChatMessage } from '../schemas/MyRoomState';

/**
 * Chat system - manages chat messages with rate limiting
 * Security: includes profanity filter and spam protection
 */
export class ChatManager {
  private readonly maxMessages = 50; // Keep last 50 messages
  private readonly messageRateLimit = 1000; // 1 message per second per user
  private lastMessageTime = new Map<string, number>();
  
  // Simple profanity filter (in production, use a proper library)
  private readonly bannedWords = ['spam', 'hack', 'cheat'];
  
  /**
   * Add a chat message with rate limiting and filtering
   */
  addMessage(
    chatMessages: any,
    sessionId: string,
    playerName: string,
    message: string,
    channel: string = 'global'
  ): boolean {
    // Rate limiting
    const now = Date.now();
    const lastTime = this.lastMessageTime.get(sessionId) || 0;
    
    if (now - lastTime < this.messageRateLimit) {
      return false; // Rate limited
    }
    
    // Input validation
    if (!message || message.length === 0 || message.length > 200) {
      return false;
    }
    
    // Sanitize and filter
    const sanitized = this.sanitizeMessage(message);
    if (!sanitized) {
      return false; // Contains banned content
    }
    
    // Create message
    const chatMsg = new ChatMessage();
    chatMsg.sender = playerName;
    chatMsg.message = sanitized;
    chatMsg.timestamp = now;
    chatMsg.channel = channel;
    
    // Add to messages array
    chatMessages.push(chatMsg);
    
    // Keep only last N messages (performance optimization)
    while (chatMessages.length > this.maxMessages) {
      chatMessages.shift();
    }
    
    // Update rate limit tracker
    this.lastMessageTime.set(sessionId, now);
    
    return true;
  }
  
  /**
   * Sanitize message - remove banned words and trim
   */
  private sanitizeMessage(message: string): string | null {
    let sanitized = message.trim();
    
    // Convert to lowercase for checking
    const lower = sanitized.toLowerCase();
    
    // Check for banned words
    for (const word of this.bannedWords) {
      if (lower.includes(word)) {
        return null; // Message contains banned word
      }
    }
    
    // Basic HTML escape to prevent XSS
    sanitized = sanitized
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
    
    return sanitized;
  }
  
  /**
   * Clean up old rate limit entries (call periodically)
   */
  cleanupRateLimits(): void {
    const now = Date.now();
    const timeout = 60000; // 1 minute
    
    for (const [sessionId, time] of this.lastMessageTime.entries()) {
      if (now - time > timeout) {
        this.lastMessageTime.delete(sessionId);
      }
    }
  }
}
