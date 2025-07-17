import { createClient, RedisClientType } from 'redis';
import { Logger } from '../utils/logger';

export class RedisConfig {
  private static client: RedisClientType;
  private static logger = Logger.getInstance();

  static async initialize(): Promise<void> {
    try {
      this.client = createClient({
        url: process.env.REDIS_URL || 'redis://:redis123@localhost:6379',
        password: process.env.REDIS_PASSWORD || 'redis123',
        socket: {
          host: process.env.REDIS_HOST || 'localhost',
          port: parseInt(process.env.REDIS_PORT || '6379', 10),
          reconnectStrategy: (retries) => {
            this.logger.warn(`Redis reconnection attempt ${retries}`);
            return Math.min(retries * 50, 500);
          }
        }
      });

      // Error handling
      this.client.on('error', (error) => {
        this.logger.error('Redis client error:', error);
      });

      this.client.on('connect', () => {
        this.logger.info('Redis client connected');
      });

      this.client.on('ready', () => {
        this.logger.info('Redis client ready');
      });

      this.client.on('reconnecting', () => {
        this.logger.warn('Redis client reconnecting...');
      });

      // Connect to Redis
      await this.client.connect();
      
      // Test the connection
      await this.client.ping();
      
      this.logger.info('Redis connected successfully');
    } catch (error) {
      this.logger.error('Redis connection failed:', error);
      throw error;
    }
  }

  static async disconnect(): Promise<void> {
    try {
      if (this.client) {
        await this.client.disconnect();
        this.logger.info('Redis disconnected successfully');
      }
    } catch (error) {
      this.logger.error('Error disconnecting from Redis:', error);
    }
  }

  static getClient(): RedisClientType {
    if (!this.client) {
      throw new Error('Redis not initialized. Call initialize() first.');
    }
    return this.client;
  }

  static async healthCheck(): Promise<boolean> {
    try {
      if (!this.client) {
        return false;
      }
      
      const result = await this.client.ping();
      return result === 'PONG';
    } catch (error) {
      this.logger.error('Redis health check failed:', error);
      return false;
    }
  }

  // Cache utility methods
  static async set(key: string, value: string, ttl?: number): Promise<void> {
    try {
      const client = this.getClient();
      if (ttl) {
        await client.setEx(key, ttl, value);
      } else {
        await client.set(key, value);
      }
    } catch (error) {
      this.logger.error(`Redis SET error for key ${key}:`, error);
      throw error;
    }
  }

  static async get(key: string): Promise<string | null> {
    try {
      const client = this.getClient();
      return await client.get(key);
    } catch (error) {
      this.logger.error(`Redis GET error for key ${key}:`, error);
      return null;
    }
  }

  static async del(key: string): Promise<number> {
    try {
      const client = this.getClient();
      return await client.del(key);
    } catch (error) {
      this.logger.error(`Redis DEL error for key ${key}:`, error);
      return 0;
    }
  }

  static async exists(key: string): Promise<boolean> {
    try {
      const client = this.getClient();
      const result = await client.exists(key);
      return result === 1;
    } catch (error) {
      this.logger.error(`Redis EXISTS error for key ${key}:`, error);
      return false;
    }
  }

  static async setJson(key: string, value: any, ttl?: number): Promise<void> {
    try {
      const jsonValue = JSON.stringify(value);
      await this.set(key, jsonValue, ttl);
    } catch (error) {
      this.logger.error(`Redis SETJSON error for key ${key}:`, error);
      throw error;
    }
  }

  static async getJson<T>(key: string): Promise<T | null> {
    try {
      const value = await this.get(key);
      if (value) {
        return JSON.parse(value) as T;
      }
      return null;
    } catch (error) {
      this.logger.error(`Redis GETJSON error for key ${key}:`, error);
      return null;
    }
  }

  static async clearPattern(pattern: string): Promise<number> {
    try {
      const client = this.getClient();
      const keys = await client.keys(pattern);
      if (keys.length > 0) {
        return await client.del(keys);
      }
      return 0;
    } catch (error) {
      this.logger.error(`Redis CLEARPATTERN error for pattern ${pattern}:`, error);
      return 0;
    }
  }

  static async flushAll(): Promise<void> {
    try {
      const client = this.getClient();
      await client.flushAll();
      this.logger.info('Redis cache cleared');
    } catch (error) {
      this.logger.error('Redis FLUSHALL error:', error);
      throw error;
    }
  }
}

// Export the Redis instance for easy access
export const redis = RedisConfig.getClient; 