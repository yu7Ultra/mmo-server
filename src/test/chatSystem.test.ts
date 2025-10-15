import { ChatManager } from '../systems/chatSystem';
import { ChatMessage } from '../schemas/MyRoomState';
import { ArraySchema } from '@colyseus/schema';

describe('Chat System', () => {
  let chatManager: ChatManager;
  let chatMessages: ArraySchema<ChatMessage>;

  beforeEach(() => {
    chatManager = new ChatManager();
    chatMessages = new ArraySchema<ChatMessage>();
  });

  test('should add valid message', () => {
    const result = chatManager.addMessage(
      chatMessages,
      'player1',
      'TestPlayer',
      'Hello world',
      'global'
    );

    expect(result).toBe(true);
    expect(chatMessages.length).toBe(1);
    expect(chatMessages[0].sender).toBe('TestPlayer');
    expect(chatMessages[0].message).toBe('Hello world');
  });

  test('should enforce rate limiting', () => {
    chatManager.addMessage(chatMessages, 'player1', 'TestPlayer', 'Message 1');
    
    // Try to send another message immediately
    const result = chatManager.addMessage(
      chatMessages,
      'player1',
      'TestPlayer',
      'Message 2'
    );

    expect(result).toBe(false);
    expect(chatMessages.length).toBe(1);
  });

  test('should reject empty messages', () => {
    const result = chatManager.addMessage(
      chatMessages,
      'player1',
      'TestPlayer',
      ''
    );

    expect(result).toBe(false);
    expect(chatMessages.length).toBe(0);
  });

  test('should reject messages that are too long', () => {
    const longMessage = 'a'.repeat(300);
    
    const result = chatManager.addMessage(
      chatMessages,
      'player1',
      'TestPlayer',
      longMessage
    );

    expect(result).toBe(false);
    expect(chatMessages.length).toBe(0);
  });

  test('should filter banned words', () => {
    const result = chatManager.addMessage(
      chatMessages,
      'player1',
      'TestPlayer',
      'This is spam message'
    );

    expect(result).toBe(false);
    expect(chatMessages.length).toBe(0);
  });

  test('should keep only last N messages', () => {
    // Add 60 messages (max is 50)
    for (let i = 0; i < 60; i++) {
      // Wait a bit to avoid rate limiting
      chatManager.addMessage(
        chatMessages,
        `player${i}`,
        `Player${i}`,
        `Message ${i}`
      );
    }

    expect(chatMessages.length).toBeLessThanOrEqual(50);
  });

  test('should sanitize HTML in messages', () => {
    const result = chatManager.addMessage(
      chatMessages,
      'player1',
      'TestPlayer',
      '<script>alert("xss")</script>',
      'global'
    );

    if (result) {
      expect(chatMessages[0].message).not.toContain('<script>');
      expect(chatMessages[0].message).toContain('&lt;');
    }
  });

  test('should set timestamp on messages', () => {
    const before = Date.now();
    
    chatManager.addMessage(
      chatMessages,
      'player1',
      'TestPlayer',
      'Test message'
    );

    const after = Date.now();

    expect(chatMessages[0].timestamp).toBeGreaterThanOrEqual(before);
    expect(chatMessages[0].timestamp).toBeLessThanOrEqual(after);
  });
});
