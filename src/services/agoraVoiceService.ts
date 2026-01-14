import { createHmac } from 'crypto';

/**
 * Agora Voice Service - Backend integration with Agora RTC
 * 
 * This service handles:
 * - Generating Agora RTC tokens for clients
 * - Token expiration and security
 * - User authentication and authorization
 */
export class AgoraVoiceService {
  private appId: string;
  private appCertificate: string;
  private expireTime: number = 86400; // 24 hours in seconds

  constructor() {
    // Load configuration from environment variables
    this.appId = process.env.AGORA_APP_ID || '';
    this.appCertificate = process.env.AGORA_APP_CERTIFICATE || '';
    
    if (!this.appId || !this.appCertificate) {
      console.warn('Agora credentials not configured. Voice features will be limited.');
    }
  }

  /**
   * Generate an Agora RTC token for a user to join voice channel
   */
  generateVoiceToken(channelName: string, userId: string | number, role: number = 1): string {
    if (!this.appId || !this.appCertificate) {
      throw new Error('Agora credentials not configured');
    }

    // Convert user ID to number if it's a string
    const uid = typeof userId === 'string' ? this.stringToUid(userId) : userId;
    
    // Calculate token expiration time
    const currentTime = Math.floor(Date.now() / 1000);
    const privilegeExpiredTs = currentTime + this.expireTime;

    // Build token with privileges
    const token = this.buildTokenWithUid(
      this.appId,
      this.appCertificate,
      channelName,
      uid,
      role,
      privilegeExpiredTs
    );

    return token;
  }

  /**
   * Build Agora RTC token with UID
   */
  private buildTokenWithUid(
    appId: string,
    appCertificate: string,
    channelName: string,
    uid: number,
    role: number,
    privilegeExpiredTs: number
  ): string {
    // Generate token version 1
    const tokenVersion = "1";
    
    // Generate random salt
    const salt = Math.floor(Math.random() * 99999999) + 10000000;
    
    // Calculate token expiration
    const currentTime = Math.floor(Date.now() / 1000);
    const expireTime = currentTime + this.expireTime;

    // Build token content
    const tokenContent = {
      appId,
      channelName,
      uid: uid.toString(),
      salt: salt.toString(),
      ts: currentTime.toString(),
      expireTime: expireTime.toString()
    };

    // Create message for signature
    const message = [
      tokenVersion,
      appId,
      channelName,
      uid.toString(),
      salt.toString(),
      currentTime.toString(),
      expireTime.toString()
    ].join(':');

    // Generate signature using HMAC-SHA256
    const signature = createHmac('sha256', appCertificate)
      .update(message)
      .digest('hex');

    // Build final token
    const token = Buffer.from(JSON.stringify({
      version: tokenVersion,
      appId,
      channelName,
      uid,
      salt,
      ts: currentTime,
      expireTime,
      signature
    })).toString('base64');

    return token;
  }

  /**
   * Convert string user ID to numeric UID for Agora
   */
  private stringToUid(userId: string): number {
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      const char = userId.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  /**
   * Validate Agora configuration
   */
  validateConfig(): boolean {
    return !!this.appId && !!this.appCertificate;
  }
}

// Singleton instance
export const agoraVoiceService = new AgoraVoiceService();