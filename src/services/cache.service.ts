import { RedisConfig } from '../config/redis.config';
import { Logger } from '../utils/logger';

export class CacheService {
  private static logger = Logger.getInstance();
  private static redisClient = RedisConfig.getCacheRedisClient();

  /**
   * Set a key-value pair in cache
   */
  static async set(key: string, value: string, ttl?: number): Promise<void> {
    try {
      if (ttl) {
        await this.redisClient.setex(key, ttl, value);
      } else {
        await this.redisClient.set(key, value);
      }
    } catch (error) {
      this.logger.error(`Cache SET error for key ${key}:`, error);
      throw error;
    }
  }

  /**
   * Get a value from cache
   */
  static async get(key: string): Promise<string | null> {
    try {
      return await this.redisClient.get(key);
    } catch (error) {
      this.logger.error(`Cache GET error for key ${key}:`, error);
      return null;
    }
  }

  /**
   * Delete a key from cache
   */
  static async del(key: string): Promise<number> {
    try {
      return await this.redisClient.del(key);
    } catch (error) {
      this.logger.error(`Cache DEL error for key ${key}:`, error);
      return 0;
    }
  }

  /**
   * Check if a key exists in cache
   */
  static async exists(key: string): Promise<boolean> {
    try {
      const result = await this.redisClient.exists(key);
      return result === 1;
    } catch (error) {
      this.logger.error(`Cache EXISTS error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Set a JSON object in cache
   */
  static async setJson(key: string, value: any, ttl?: number): Promise<void> {
    try {
      const jsonValue = JSON.stringify(value);
      await this.set(key, jsonValue, ttl);
    } catch (error) {
      this.logger.error(`Cache SETJSON error for key ${key}:`, error);
      throw error;
    }
  }

  /**
   * Get a JSON object from cache
   */
  static async getJson<T>(key: string): Promise<T | null> {
    try {
      const value = await this.get(key);
      if (value) {
        return JSON.parse(value) as T;
      }
      return null;
    } catch (error) {
      this.logger.error(`Cache GETJSON error for key ${key}:`, error);
      return null;
    }
  }

  /**
   * Clear cache by pattern
   */
  static async clearPattern(pattern: string): Promise<number> {
    try {
      const keys = await this.redisClient.keys(pattern);
      if (keys.length > 0) {
        return await this.redisClient.del(...keys);
      }
      return 0;
    } catch (error) {
      this.logger.error(`Cache CLEARPATTERN error for pattern ${pattern}:`, error);
      return 0;
    }
  }

  /**
   * Clear all cache
   */
  static async flushAll(): Promise<void> {
    try {
      await this.redisClient.flushall();
      this.logger.info('Cache cleared');
    } catch (error) {
      this.logger.error('Cache FLUSHALL error:', error);
      throw error;
    }
  }

  /**
   * Get cache statistics
   */
  static async getStats(): Promise<any> {
    try {
      const info = await this.redisClient.info();
      const keys = await this.redisClient.dbsize();
      
      return {
        keys,
        info: info.split('\r\n').reduce((acc: any, line: string) => {
          if (line.includes(':')) {
            const [key, value] = line.split(':');
            if (key) {
              acc[key] = value;
            }
          }
          return acc;
        }, {}),
      };
    } catch (error) {
      this.logger.error('Cache stats error:', error);
      return null;
    }
  }

  /**
   * Health check
   */
  static async healthCheck(): Promise<boolean> {
    try {
      await this.redisClient.ping();
      return true;
    } catch (error) {
      this.logger.error('Cache health check failed:', error);
      return false;
    }
  }

  // Chatroom-specific cache methods
  static async invalidateUserCache(userId: string): Promise<void> {
    try {
      await this.clearPattern(`user:${userId}:*`);
      this.logger.debug(`Invalidated cache for user: ${userId}`);
    } catch (error) {
      this.logger.error(`Failed to invalidate user cache for ${userId}:`, error);
    }
  }

  static async invalidateChatroomCache(chatroomId: string, userId: string): Promise<void> {
    try {
      await this.clearPattern(`chatroom:${chatroomId}:*`);
      await this.clearPattern(`user:${userId}:chatrooms:*`);
      this.logger.debug(`Invalidated cache for chatroom: ${chatroomId}`);
    } catch (error) {
      this.logger.error(`Failed to invalidate chatroom cache for ${chatroomId}:`, error);
    }
  }

  static async getCachedUserChatrooms(userId: string, page: number, limit: number): Promise<any> {
    const key = `user:${userId}:chatrooms:${page}:${limit}`;
    return await this.getJson(key);
  }

  static async setCachedUserChatrooms(userId: string, page: number, limit: number, data: any): Promise<void> {
    const key = `user:${userId}:chatrooms:${page}:${limit}`;
    await this.setJson(key, data, 300); // 5 minutes TTL
  }

  static async getCachedChatroomDetail(chatroomId: string, page: number, limit: number): Promise<any> {
    const key = `chatroom:${chatroomId}:detail:${page}:${limit}`;
    return await this.getJson(key);
  }

  static async setCachedChatroomDetail(chatroomId: string, page: number, limit: number, data: any): Promise<void> {
    const key = `chatroom:${chatroomId}:detail:${page}:${limit}`;
    await this.setJson(key, data, 300); // 5 minutes TTL
  }

  static async getCachedChatroomStats(userId: string): Promise<any> {
    const key = `user:${userId}:stats`;
    return await this.getJson(key);
  }

  static async setCachedChatroomStats(userId: string, data: any): Promise<void> {
    const key = `user:${userId}:stats`;
    await this.setJson(key, data, 600); // 10 minutes TTL
  }

  static async getCachedChatroomSearch(userId: string, query: string, page: number, limit: number): Promise<any> {
    const key = `user:${userId}:search:${query}:${page}:${limit}`;
    return await this.getJson(key);
  }

  static async setCachedChatroomSearch(userId: string, query: string, page: number, limit: number, data: any): Promise<void> {
    const key = `user:${userId}:search:${query}:${page}:${limit}`;
    await this.setJson(key, data, 300); // 5 minutes TTL
  }

  // Message-specific cache methods
  static async invalidateMessageCache(chatroomId: string, userId: string): Promise<void> {
    try {
      await this.clearPattern(`message:${chatroomId}:*`);
      await this.clearPattern(`chatroom:${chatroomId}:messages:*`);
      this.logger.debug(`Invalidated cache for messages in chatroom: ${chatroomId}`);
    } catch (error) {
      this.logger.error(`Failed to invalidate message cache for ${chatroomId}:`, error);
    }
  }

  static async getCachedMessageStats(chatroomId: string): Promise<any> {
    const key = `message:${chatroomId}:stats`;
    return await this.getJson(key);
  }

  static async setCachedMessageStats(chatroomId: string, data: any): Promise<void> {
    const key = `message:${chatroomId}:stats`;
    await this.setJson(key, data, 600); // 10 minutes TTL
  }

  // Additional cache utility methods
  static async getCacheStats(): Promise<any> {
    return await this.getStats();
  }

  static async clearAllCache(): Promise<void> {
    return await this.flushAll();
  }

  static async getCacheKeys(): Promise<string[]> {
    try {
      return await this.redisClient.keys('*');
    } catch (error) {
      this.logger.error('Get cache keys failed:', error);
      return [];
    }
  }

  static async deleteCacheKey(key: string): Promise<number> {
    return await this.del(key);
  }
} 