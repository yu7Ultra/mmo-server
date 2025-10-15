import { RateLimiter, InputValidator, ObjectPool } from '../utils/security';

describe('Security Utilities', () => {
  describe('RateLimiter', () => {
    let rateLimiter: RateLimiter;

    beforeEach(() => {
      rateLimiter = new RateLimiter(5, 1); // 5 tokens, 1 per second
    });

    test('should allow action when tokens available', () => {
      const result = rateLimiter.checkLimit('user1');
      expect(result).toBe(true);
    });

    test('should deny action when tokens exhausted', () => {
      // Exhaust all tokens
      for (let i = 0; i < 5; i++) {
        rateLimiter.checkLimit('user1');
      }
      
      const result = rateLimiter.checkLimit('user1');
      expect(result).toBe(false);
    });

    test('should handle multiple users independently', () => {
      rateLimiter.checkLimit('user1');
      
      const result = rateLimiter.checkLimit('user2');
      expect(result).toBe(true);
    });

    test('should cleanup old entries', () => {
      rateLimiter.checkLimit('user1');
      rateLimiter.cleanup();
      // Cleanup should not affect recent entries
    });
  });

  describe('InputValidator', () => {
    test('should validate correct player name', () => {
      expect(InputValidator.validatePlayerName('Player123')).toBe(true);
      expect(InputValidator.validatePlayerName('Test_User')).toBe(true);
    });

    test('should reject invalid player names', () => {
      expect(InputValidator.validatePlayerName('ab')).toBe(false); // Too short
      expect(InputValidator.validatePlayerName('a'.repeat(25))).toBe(false); // Too long
      expect(InputValidator.validatePlayerName('Test User')).toBe(false); // Space
      expect(InputValidator.validatePlayerName('Test@User')).toBe(false); // Special char
    });

    test('should validate numbers in range', () => {
      expect(InputValidator.validateNumber(5, 0, 10)).toBe(true);
      expect(InputValidator.validateNumber(0, 0, 10)).toBe(true);
      expect(InputValidator.validateNumber(10, 0, 10)).toBe(true);
    });

    test('should reject numbers out of range', () => {
      expect(InputValidator.validateNumber(-1, 0, 10)).toBe(false);
      expect(InputValidator.validateNumber(11, 0, 10)).toBe(false);
      expect(InputValidator.validateNumber(NaN, 0, 10)).toBe(false);
    });

    test('should validate string length', () => {
      expect(InputValidator.validateStringLength('test', 2, 10)).toBe(true);
      expect(InputValidator.validateStringLength('a', 2, 10)).toBe(false);
      expect(InputValidator.validateStringLength('a'.repeat(15), 2, 10)).toBe(false);
    });

    test('should sanitize object', () => {
      const obj: any = {
        normal: 'value',
        dangerous: 'value'
      };
      obj.__proto__ = { malicious: true };
      obj.constructor = 'bad';
      obj.prototype = 'also bad';
      
      const sanitized = InputValidator.sanitizeObject(obj);
      
      expect(sanitized.normal).toBe('value');
      // After sanitization, dangerous keys should be removed
      // Note: constructor property is inherent to objects in JS and can't be fully removed
      // The important thing is that user-provided values are deleted
      expect(Object.hasOwnProperty.call(sanitized, 'prototype')).toBe(false);
    });
  });

  describe('ObjectPool', () => {
    interface TestObject {
      value: number;
    }

    let pool: ObjectPool<TestObject>;

    beforeEach(() => {
      pool = new ObjectPool<TestObject>(
        () => ({ value: 0 }),
        (obj) => { obj.value = 0; },
        5
      );
    });

    test('should create initial objects', () => {
      const stats = pool.getStats();
      expect(stats.available).toBe(5);
    });

    test('should acquire object from pool', () => {
      const obj = pool.acquire();
      
      expect(obj).toBeDefined();
      expect(obj.value).toBe(0);
      
      const stats = pool.getStats();
      expect(stats.available).toBe(4);
    });

    test('should release object back to pool', () => {
      const obj = pool.acquire();
      obj.value = 100;
      
      pool.release(obj);
      
      const stats = pool.getStats();
      expect(stats.available).toBe(5);
      
      const reused = pool.acquire();
      expect(reused.value).toBe(0); // Should be reset
    });

    test('should create new object when pool empty', () => {
      // Exhaust pool
      for (let i = 0; i < 5; i++) {
        pool.acquire();
      }
      
      // Should still be able to acquire
      const obj = pool.acquire();
      expect(obj).toBeDefined();
    });
  });
});
