/**
 * Rate limiter for preventing spam and abuse
 * Uses token bucket algorithm for efficient rate limiting
 */
export class RateLimiter {
  private buckets = new Map<string, { tokens: number; lastRefill: number }>();
  private readonly maxTokens: number;
  private readonly refillRate: number; // tokens per second
  
  constructor(maxTokens: number = 10, refillRate: number = 1) {
    this.maxTokens = maxTokens;
    this.refillRate = refillRate;
  }
  
  /**
   * Check if action is allowed for the given key
   * Returns true if allowed, false if rate limited
   */
  checkLimit(key: string, cost: number = 1): boolean {
    const now = Date.now();
    let bucket = this.buckets.get(key);
    
    if (!bucket) {
      bucket = { tokens: this.maxTokens, lastRefill: now };
      this.buckets.set(key, bucket);
    }
    
    // Refill tokens based on time passed
    const timePassed = (now - bucket.lastRefill) / 1000;
    const tokensToAdd = timePassed * this.refillRate;
    bucket.tokens = Math.min(this.maxTokens, bucket.tokens + tokensToAdd);
    bucket.lastRefill = now;
    
    // Check if we have enough tokens
    if (bucket.tokens >= cost) {
      bucket.tokens -= cost;
      return true;
    }
    
    return false;
  }
  
  /**
   * Clean up old entries
   */
  cleanup(): void {
    const now = Date.now();
    const timeout = 300000; // 5 minutes
    
    for (const [key, bucket] of this.buckets.entries()) {
      if (now - bucket.lastRefill > timeout) {
        this.buckets.delete(key);
      }
    }
  }
}

/**
 * Input validator for security
 */
export class InputValidator {
  /**
   * Validate player name
   */
  static validatePlayerName(name: string): boolean {
    if (!name || name.length < 3 || name.length > 20) {
      return false;
    }
    
    // Only allow alphanumeric and basic characters
    const validPattern = /^[a-zA-Z0-9_-]+$/;
    return validPattern.test(name);
  }
  
  /**
   * Validate numeric input is within range
   */
  static validateNumber(value: number, min: number, max: number): boolean {
    return typeof value === 'number' && 
           !isNaN(value) && 
           value >= min && 
           value <= max;
  }
  
  /**
   * Validate string length
   */
  static validateStringLength(str: string, minLength: number, maxLength: number): boolean {
    return typeof str === 'string' && 
           str.length >= minLength && 
           str.length <= maxLength;
  }
  
  /**
   * Sanitize object to prevent prototype pollution
   */
  static sanitizeObject(obj: any): any {
    if (typeof obj !== 'object' || obj === null) {
      return obj;
    }
    
    // Remove dangerous keys
    const dangerous = ['__proto__', 'constructor', 'prototype'];
    for (const key of dangerous) {
      delete obj[key];
    }
    
    return obj;
  }
}

/**
 * Object pool for reducing GC pressure
 * Reuses objects instead of creating new ones
 */
export class ObjectPool<T> {
  private available: T[] = [];
  private factory: () => T;
  private reset: (obj: T) => void;
  
  constructor(factory: () => T, reset: (obj: T) => void, initialSize: number = 10) {
    this.factory = factory;
    this.reset = reset;
    
    // Pre-allocate objects
    for (let i = 0; i < initialSize; i++) {
      this.available.push(factory());
    }
  }
  
  /**
   * Get an object from the pool
   */
  acquire(): T {
    if (this.available.length > 0) {
      return this.available.pop()!;
    }
    
    // Pool is empty, create new object
    return this.factory();
  }
  
  /**
   * Return an object to the pool
   */
  release(obj: T): void {
    this.reset(obj);
    this.available.push(obj);
  }
  
  /**
   * Get pool statistics
   */
  getStats(): { available: number } {
    return { available: this.available.length };
  }
}
