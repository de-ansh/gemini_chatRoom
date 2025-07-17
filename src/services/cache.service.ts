import { RedisConfig } from '../config/redis.config';
import { Logger } from '../utils/logger';

export class CacheService {
  private static logger = Logger.getInstance();
  private static readonly DEFAULT_TTL = 300; // 5 minutes
  
  // Cache key prefixes
  private static readonly KEYS = {
    CHATROOM_LIST: 'chatroom:list',
    CHATROOM_DETAIL: 'chatroom:detail',
    CHATROOM_SEARCH: 'chatroom:search',
    CHATROOM_STATS: 'chatroom:stats',
    MESSAGE_STATS: 'message:stats',
    USER_CHATROOMS: 'user:chatrooms'
  };

  // TTL configurations (in seconds)
  private static readonly TTL = {
    CHATROOM_LIST: 300,    // 5 minutes
    CHATROOM_DETAIL: 600,  // 10 minutes
    CHATROOM_SEARCH: 180,  // 3 minutes
    CHATROOM_STATS: 900,   // 15 minutes
    MESSAGE_STATS: 600,    // 10 minutes
    USER_CHATROOMS: 300    // 5 minutes
  };

  /**
   * Generate cache key for user chatrooms
   */
  private static getUserChatroomsKey(userId: string, page: number, limit: number): string {
    return `${this.KEYS.USER_CHATROOMS}:${userId}:${page}:${limit}`;
  }

  /**
   * Generate cache key for chatroom details
   */
  private static getChatroomDetailKey(chatroomId: string, messagesPage: number, messagesLimit: number): string {
    return `${this.KEYS.CHATROOM_DETAIL}:${chatroomId}:${messagesPage}:${messagesLimit}`;
  }

  /**
   * Generate cache key for chatroom search
   */
  private static getChatroomSearchKey(userId: string, query: string, page: number, limit: number): string {
    const sanitizedQuery = query.replace(/[^a-zA-Z0-9]/g, '_');
    return `${this.KEYS.CHATROOM_SEARCH}:${userId}:${sanitizedQuery}:${page}:${limit}`;
  }

  /**
   * Generate cache key for chatroom stats
   */
  private static getChatroomStatsKey(userId: string): string {
    return `${this.KEYS.CHATROOM_STATS}:${userId}`;
  }

  /**
   * Generate cache key for message stats
   */
  private static getMessageStatsKey(chatroomId: string): string {
    return `${this.KEYS.MESSAGE_STATS}:${chatroomId}`;
  }

  /**
   * Get cached data
   */
  static async get<T>(key: string): Promise<T | null> {
    try {
      const redis = RedisConfig.getClient();
      const cached = await redis.get(key);
      
      if (cached) {
        this.logger.debug(`Cache hit for key: ${key}`);
        return JSON.parse(cached);
      }
      
      this.logger.debug(`Cache miss for key: ${key}`);
      return null;
    } catch (error) {
      this.logger.error('Cache get failed:', error);
      return null;
    }
  }

  /**
   * Set cached data with TTL
   */
  static async set(key: string, data: any, ttl: number = this.DEFAULT_TTL): Promise<void> {
    try {
      const redis = RedisConfig.getClient();
      await redis.setEx(key, ttl, JSON.stringify(data));
      this.logger.debug(`Cache set for key: ${key} with TTL: ${ttl}s`);
    } catch (error) {
      this.logger.error('Cache set failed:', error);
    }
  }

  /**
   * Delete cached data
   */
  static async delete(key: string): Promise<void> {
    try {
      const redis = RedisConfig.getClient();
      await redis.del(key);
      this.logger.debug(`Cache deleted for key: ${key}`);
    } catch (error) {
      this.logger.error('Cache delete failed:', error);
    }
  }

  /**
   * Delete multiple keys by pattern
   */
  static async deleteByPattern(pattern: string): Promise<void> {
    try {
      const redis = RedisConfig.getClient();
      const keys = await redis.keys(pattern);
      
      if (keys.length > 0) {
        await redis.del(keys);
        this.logger.debug(`Cache deleted ${keys.length} keys matching pattern: ${pattern}`);
      }
    } catch (error) {
      this.logger.error('Cache delete by pattern failed:', error);
    }
  }

  /**
   * Cache user chatrooms
   */
  static async getCachedUserChatrooms(userId: string, page: number, limit: number): Promise<any | null> {
    const key = this.getUserChatroomsKey(userId, page, limit);
    return this.get(key);
  }

  /**
   * Set cached user chatrooms
   */
  static async setCachedUserChatrooms(userId: string, page: number, limit: number, data: any): Promise<void> {
    const key = this.getUserChatroomsKey(userId, page, limit);
    await this.set(key, data, this.TTL.USER_CHATROOMS);
  }

  /**
   * Cache chatroom details
   */
  static async getCachedChatroomDetail(chatroomId: string, messagesPage: number, messagesLimit: number): Promise<any | null> {
    const key = this.getChatroomDetailKey(chatroomId, messagesPage, messagesLimit);
    return this.get(key);
  }

  /**
   * Set cached chatroom details
   */
  static async setCachedChatroomDetail(chatroomId: string, messagesPage: number, messagesLimit: number, data: any): Promise<void> {
    const key = this.getChatroomDetailKey(chatroomId, messagesPage, messagesLimit);
    await this.set(key, data, this.TTL.CHATROOM_DETAIL);
  }

  /**
   * Cache chatroom search results
   */
  static async getCachedChatroomSearch(userId: string, query: string, page: number, limit: number): Promise<any | null> {
    const key = this.getChatroomSearchKey(userId, query, page, limit);
    return this.get(key);
  }

  /**
   * Set cached chatroom search results
   */
  static async setCachedChatroomSearch(userId: string, query: string, page: number, limit: number, data: any): Promise<void> {
    const key = this.getChatroomSearchKey(userId, query, page, limit);
    await this.set(key, data, this.TTL.CHATROOM_SEARCH);
  }

  /**
   * Cache chatroom stats
   */
  static async getCachedChatroomStats(userId: string): Promise<any | null> {
    const key = this.getChatroomStatsKey(userId);
    return this.get(key);
  }

  /**
   * Set cached chatroom stats
   */
  static async setCachedChatroomStats(userId: string, data: any): Promise<void> {
    const key = this.getChatroomStatsKey(userId);
    await this.set(key, data, this.TTL.CHATROOM_STATS);
  }

  /**
   * Cache message stats
   */
  static async getCachedMessageStats(chatroomId: string): Promise<any | null> {
    const key = this.getMessageStatsKey(chatroomId);
    return this.get(key);
  }

  /**
   * Set cached message stats
   */
  static async setCachedMessageStats(chatroomId: string, data: any): Promise<void> {
    const key = this.getMessageStatsKey(chatroomId);
    await this.set(key, data, this.TTL.MESSAGE_STATS);
  }

  /**
   * Invalidate all cache entries for a user
   */
  static async invalidateUserCache(userId: string): Promise<void> {
    await Promise.all([
      this.deleteByPattern(`${this.KEYS.USER_CHATROOMS}:${userId}:*`),
      this.deleteByPattern(`${this.KEYS.CHATROOM_SEARCH}:${userId}:*`),
      this.deleteByPattern(`${this.KEYS.CHATROOM_STATS}:${userId}`),
    ]);
    this.logger.info(`Invalidated cache for user: ${userId}`);
  }

  /**
   * Invalidate all cache entries for a chatroom
   */
  static async invalidateChatroomCache(chatroomId: string, userId: string): Promise<void> {
    await Promise.all([
      this.deleteByPattern(`${this.KEYS.CHATROOM_DETAIL}:${chatroomId}:*`),
      this.deleteByPattern(`${this.KEYS.MESSAGE_STATS}:${chatroomId}`),
      this.invalidateUserCache(userId), // Invalidate user's chatroom listings
    ]);
    this.logger.info(`Invalidated cache for chatroom: ${chatroomId}`);
  }

  /**
   * Invalidate cache when a message is added/deleted
   */
  static async invalidateMessageCache(chatroomId: string, userId: string): Promise<void> {
    await Promise.all([
      // Invalidate chatroom details (affects message counts and last message)
      this.deleteByPattern(`${this.KEYS.CHATROOM_DETAIL}:${chatroomId}:*`),
      // Invalidate message stats
      this.deleteByPattern(`${this.KEYS.MESSAGE_STATS}:${chatroomId}`),
      // Invalidate user's chatroom listings (affects last message display)
      this.deleteByPattern(`${this.KEYS.USER_CHATROOMS}:${userId}:*`),
      // Invalidate user's chatroom stats
      this.deleteByPattern(`${this.KEYS.CHATROOM_STATS}:${userId}`),
    ]);
    this.logger.info(`Invalidated message cache for chatroom: ${chatroomId}`);
  }

  /**
   * Clear all cache entries (for maintenance)
   */
  static async clearAllCache(): Promise<void> {
    try {
      const redis = RedisConfig.getClient();
      await redis.flushDb();
      this.logger.info('All cache cleared');
    } catch (error) {
      this.logger.error('Clear all cache failed:', error);
    }
  }

  /**
   * Get cache statistics
   */
  static async getCacheStats(): Promise<{
    totalKeys: number;
    chatroomKeys: number;
    messageKeys: number;
    userKeys: number;
  }> {
    try {
      const redis = RedisConfig.getClient();
      const allKeys = await redis.keys('*');
      
      return {
        totalKeys: allKeys.length,
        chatroomKeys: allKeys.filter(key => key.startsWith('chatroom:')).length,
        messageKeys: allKeys.filter(key => key.startsWith('message:')).length,
        userKeys: allKeys.filter(key => key.startsWith('user:')).length,
      };
    } catch (error) {
      this.logger.error('Get cache stats failed:', error);
      return { totalKeys: 0, chatroomKeys: 0, messageKeys: 0, userKeys: 0 };
    }
  }

  /**
   * Get all cache keys
   */
  static async getCacheKeys(): Promise<string[]> {
    try {
      const redis = RedisConfig.getClient();
      const keys = await redis.keys('*');
      return keys;
    } catch (error) {
      this.logger.error('Get cache keys failed:', error);
      return [];
    }
  }

  /**
   * Delete specific cache key
   */
  static async deleteCacheKey(key: string): Promise<void> {
    try {
      const redis = RedisConfig.getClient();
      await redis.del(key);
      this.logger.debug(`Cache key deleted: ${key}`);
    } catch (error) {
      this.logger.error('Delete cache key failed:', error);
    }
  }
} 