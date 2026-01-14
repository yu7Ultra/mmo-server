import { ChatMessage as MyRoomChatMessage } from '../schemas/MyRoomState';
import { ChatMessage as ChatRoomChatMessage } from '../schemas/ChatRoomState';
import * as prom from '../instrumentation/prometheusMetrics';

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
   * Add a chat message with rate limiting and filtering (for MyRoom compatibility)
   */
  addMessage(
    chatMessages: any,
    sessionId: string,
    playerName: string,
    message: string,
    channel: string = 'global'
  ): boolean {
    return this.addExtendedMessage(chatMessages, sessionId, playerName, message, channel);
  }
  
  /**
   * Add a chat message with extended options for ChatRoom
   */
  addExtendedMessage(
    chatMessages: any,
    sessionId: string,
    playerName: string,
    message: string,
    channel: string = 'global',
    target: string = ''
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
    
    // Create appropriate message type based on chatMessages type
    if (chatMessages[0] instanceof ChatRoomChatMessage) {
      // For ChatRoomState
      const chatMsg = new ChatRoomChatMessage();
      chatMsg.sender = playerName;
      chatMsg.message = sanitized;
      chatMsg.timestamp = now;
      chatMsg.channel = channel;
      chatMsg.target = target;
      chatMsg.senderId = sessionId;
      chatMessages.push(chatMsg);
    } else {
      // For MyRoomState (backward compatibility)
      const chatMsg = new MyRoomChatMessage();
      chatMsg.sender = playerName;
      chatMsg.message = sanitized;
      chatMsg.timestamp = now;
      chatMsg.channel = channel;
      chatMessages.push(chatMsg);
    }
    
    // Keep only last N messages (performance optimization)
    while (chatMessages.length > this.maxMessages) {
      chatMessages.shift();
    }
    
    // Update rate limit tracker
    this.lastMessageTime.set(sessionId, now);
    
    // Record chat message in Prometheus
    prom.recordChatMessage(channel);
    
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
      .replace(/&/g, '&')
      .replace(/</g, '<')
      .replace(/>/g, '>')
      .replace(/"/g, '"')
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
