import Redis from 'ioredis';
import { Logger } from '../utils/logger';

export class RedisConfig {
  private static logger = Logger.getInstance();

  static getRedisClient(): Redis {
    const redisUrl = process.env.REDIS_URL;
    
    if (redisUrl) {
      // For Railway deployment - use URL directly
      this.logger.info('Using REDIS_URL for connection');
      return new Redis(redisUrl, {
        maxRetriesPerRequest: null,
        enableReadyCheck: false,
        lazyConnect: true,
        connectTimeout: 10000,
        commandTimeout: 5000,
      });
    }
    
    // Fallback for local development
    this.logger.info('Using local Redis configuration');
    return new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
      password: process.env.REDIS_PASSWORD || 'redis123',
      db: parseInt(process.env.REDIS_DB || '0', 10),
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      lazyConnect: true,
      connectTimeout: 10000,
      commandTimeout: 5000,
    });
  }

  static getCacheRedisClient(): Redis {
    const redisUrl = process.env.REDIS_URL;
    
    if (redisUrl) {
      // For Railway deployment - use URL with cache database
      const url = new URL(redisUrl);
      url.pathname = `/${process.env.REDIS_CACHE_DB || '1'}`;
      
      this.logger.info('Using REDIS_URL for cache connection');
      return new Redis(url.toString(), {
        maxRetriesPerRequest: null,
        enableReadyCheck: false,
        lazyConnect: true,
        connectTimeout: 10000,
        commandTimeout: 5000,
      });
    }
    
    // Fallback for local development
    this.logger.info('Using local Redis cache configuration');
    return new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
      password: process.env.REDIS_PASSWORD || 'redis123',
      db: parseInt(process.env.REDIS_CACHE_DB || '1', 10),
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      lazyConnect: true,
      connectTimeout: 10000,
      commandTimeout: 5000,
    });
  }

  static async healthCheck(): Promise<boolean> {
    try {
      const client = this.getRedisClient();
      await client.ping();
      await client.disconnect();
      return true;
    } catch (error) {
      this.logger.error('Redis health check failed:', error);
      return false;
    }
  }
} 