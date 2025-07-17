import { Request, Response } from 'express';
import { CacheService } from '../services/cache.service';
import { Logger } from '../utils/logger';

export class CacheController {
  private static logger = Logger.getInstance();

  /**
   * Get cache statistics
   * GET /api/v1/cache/stats
   */
  static async getCacheStats(req: Request, res: Response): Promise<void> {
    try {
      const stats = await CacheService.getCacheStats();

      res.status(200).json({
        status: 'success',
        data: { stats }
      });
    } catch (error) {
      this.logger.error('Get cache stats failed:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to get cache statistics'
      });
    }
  }

  /**
   * Clear all cache (admin only)
   * DELETE /api/v1/cache
   */
  static async clearCache(req: Request, res: Response): Promise<void> {
    try {
      await CacheService.clearAllCache();

      this.logger.info('All cache cleared by admin');
      res.status(200).json({
        status: 'success',
        message: 'All cache cleared successfully'
      });
    } catch (error) {
      this.logger.error('Clear cache failed:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to clear cache'
      });
    }
  }

  /**
   * Clear user specific cache
   * DELETE /api/v1/cache/user/:userId
   */
  static async clearUserCache(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.params.userId;

      if (!userId) {
        res.status(400).json({
          status: 'error',
          message: 'User ID is required'
        });
        return;
      }

      await CacheService.invalidateUserCache(userId);

      this.logger.info(`User cache cleared for user: ${userId}`);
      res.status(200).json({
        status: 'success',
        message: 'User cache cleared successfully'
      });
    } catch (error) {
      this.logger.error('Clear user cache failed:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to clear user cache'
      });
    }
  }

  /**
   * Clear chatroom specific cache
   * DELETE /api/v1/cache/chatroom/:chatroomId
   */
  static async clearChatroomCache(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          status: 'error',
          message: 'Authentication required'
        });
        return;
      }

      const chatroomId = req.params.chatroomId;

      if (!chatroomId) {
        res.status(400).json({
          status: 'error',
          message: 'Chatroom ID is required'
        });
        return;
      }

      await CacheService.invalidateChatroomCache(chatroomId, req.user.id);

      this.logger.info(`Chatroom cache cleared for chatroom: ${chatroomId}`);
      res.status(200).json({
        status: 'success',
        message: 'Chatroom cache cleared successfully'
      });
    } catch (error) {
      this.logger.error('Clear chatroom cache failed:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to clear chatroom cache'
      });
    }
  }

  /**
   * Warm up cache for a user (pre-populate frequently accessed data)
   * POST /api/v1/cache/warmup
   */
  static async warmupCache(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          status: 'error',
          message: 'Authentication required'
        });
        return;
      }

      const userId = req.user.id;

      // Import here to avoid circular dependencies
      const { ChatroomService } = require('../services/chatroom.service');
      
      // Warm up user's first page of chatrooms
      await ChatroomService.getUserChatrooms(userId, 1, 10);
      
      // Warm up user's chatroom stats
      await ChatroomService.getChatroomStats(userId);

      this.logger.info(`Cache warmed up for user: ${userId}`);
      res.status(200).json({
        status: 'success',
        message: 'Cache warmed up successfully'
      });
    } catch (error) {
      this.logger.error('Cache warmup failed:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to warm up cache'
      });
    }
  }

  /**
   * Get cache keys
   * GET /api/v1/cache/keys
   */
  static async getCacheKeys(req: Request, res: Response): Promise<void> {
    try {
      const keys = await CacheService.getCacheKeys();

      res.status(200).json({
        status: 'success',
        data: { keys }
      });
    } catch (error) {
      this.logger.error('Get cache keys failed:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to get cache keys'
      });
    }
  }

  /**
   * Delete specific cache key
   * DELETE /api/v1/cache/key/:key
   */
  static async deleteCacheKey(req: Request, res: Response): Promise<void> {
    try {
      const key = req.params.key;

      if (!key) {
        res.status(400).json({
          status: 'error',
          message: 'Cache key is required'
        });
        return;
      }

      await CacheService.deleteCacheKey(key);

      this.logger.info(`Cache key deleted: ${key}`);
      res.status(200).json({
        status: 'success',
        message: 'Cache key deleted successfully'
      });
    } catch (error) {
      this.logger.error('Delete cache key failed:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to delete cache key'
      });
    }
  }
} 