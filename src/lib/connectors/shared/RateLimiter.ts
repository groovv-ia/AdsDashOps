import { logger } from '../../utils/logger';
import { RateLimitInfo } from './types';

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  platform: string;
}

interface RequestRecord {
  timestamp: number;
  endpoint: string;
}

export class RateLimiter {
  private config: RateLimitConfig;
  private requests: RequestRecord[] = [];
  private rateLimitInfo: RateLimitInfo | null = null;

  constructor(config: RateLimitConfig) {
    this.config = config;
  }

  private cleanOldRequests(): void {
    const now = Date.now();
    const cutoff = now - this.config.windowMs;
    this.requests = this.requests.filter(req => req.timestamp > cutoff);
  }

  async checkRateLimit(endpoint: string): Promise<{ allowed: boolean; retryAfter?: number }> {
    this.cleanOldRequests();

    if (this.rateLimitInfo && this.rateLimitInfo.resetAt > new Date()) {
      if (this.rateLimitInfo.remaining <= 0) {
        const retryAfter = Math.ceil((this.rateLimitInfo.resetAt.getTime() - Date.now()) / 1000);
        logger.warn(`Rate limit exceeded for ${this.config.platform}`, {
          endpoint,
          retryAfter,
          resetAt: this.rateLimitInfo.resetAt,
        });
        return { allowed: false, retryAfter };
      }
    }

    if (this.requests.length >= this.config.maxRequests) {
      const oldestRequest = this.requests[0];
      const retryAfter = Math.ceil((oldestRequest.timestamp + this.config.windowMs - Date.now()) / 1000);

      logger.warn(`Rate limit reached for ${this.config.platform}`, {
        endpoint,
        currentRequests: this.requests.length,
        maxRequests: this.config.maxRequests,
        retryAfter,
      });

      return { allowed: false, retryAfter };
    }

    return { allowed: true };
  }

  async recordRequest(endpoint: string): Promise<void> {
    this.requests.push({
      timestamp: Date.now(),
      endpoint,
    });

    logger.debug(`Request recorded for ${this.config.platform}`, {
      endpoint,
      totalRequests: this.requests.length,
      maxRequests: this.config.maxRequests,
    });
  }

  updateRateLimitInfo(limit: number, remaining: number, resetTimestamp: number): void {
    this.rateLimitInfo = {
      limit,
      remaining,
      resetAt: new Date(resetTimestamp * 1000),
    };

    logger.debug(`Rate limit info updated for ${this.config.platform}`, {
      limit,
      remaining,
      resetAt: this.rateLimitInfo.resetAt,
    });
  }

  async waitForRateLimit(endpoint: string): Promise<void> {
    const check = await this.checkRateLimit(endpoint);

    if (!check.allowed && check.retryAfter) {
      logger.info(`Waiting for rate limit reset: ${this.config.platform}`, {
        endpoint,
        retryAfter: check.retryAfter,
      });

      await new Promise(resolve => setTimeout(resolve, check.retryAfter! * 1000));
    }
  }

  getRemainingRequests(): number {
    this.cleanOldRequests();
    return Math.max(0, this.config.maxRequests - this.requests.length);
  }

  getNextResetTime(): Date | null {
    if (this.requests.length === 0) return null;

    const oldestRequest = this.requests[0];
    return new Date(oldestRequest.timestamp + this.config.windowMs);
  }
}
