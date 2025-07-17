import { Message } from '@prisma/client';
import { DatabaseConfig } from '../config/database.config';
import { Logger } from '../utils/logger';
import { NotFoundError, ValidationError } from '../middleware/error.middleware';
import { CacheService } from './cache.service';
import { SubscriptionService } from './subscription.service';

interface CreateMessageData {
  content: string;
  sender: 'user' | 'ai';
  messageType?: string;
}

interface MessageWithChatroom extends Message {
  chatroom: {
    id: string;
    name: string;
    userId: string;
  };
}

export class MessageService {
  private static logger = Logger.getInstance();

  /**
   * Create a new message in a chatroom
   */
  static async createMessage(
    chatroomId: string,
    userId: string,
    data: CreateMessageData
  ): Promise<Message> {
    try {
      // Validate input
      if (!data.content || data.content.trim().length === 0) {
        throw new ValidationError('Message content is required');
      }

      if (data.content.length > 4000) {
        throw new ValidationError('Message content cannot exceed 4000 characters');
      }

      if (!['user', 'ai'].includes(data.sender)) {
        throw new ValidationError('Invalid sender type. Must be "user" or "ai"');
      }

      const db = DatabaseConfig.getClient();

      // Verify chatroom exists and belongs to user
      const chatroom = await db.chatroom.findFirst({
        where: {
          id: chatroomId,
          userId
        }
      });

      if (!chatroom) {
        throw new NotFoundError('Chatroom not found');
      }

      // Check subscription limits for user messages only
      if (data.sender === 'user') {
        const { canSend, reason } = await SubscriptionService.getInstance().canSendMessage(userId);
        if (!canSend) {
          throw new ValidationError(`Cannot send message: ${reason}`);
        }
      }

      // Create the message
      const message = await db.message.create({
        data: {
          chatroomId,
          content: data.content.trim(),
          sender: data.sender,
          messageType: data.messageType || 'text'
        }
      });

      // Update chatroom's updated timestamp
      await db.chatroom.update({
        where: { id: chatroomId },
        data: { updatedAt: new Date() }
      });

      // Track usage for user messages only
      if (data.sender === 'user') {
        await SubscriptionService.getInstance().trackMessageUsage(userId);
      }

      // Invalidate cache after message creation
      await CacheService.invalidateMessageCache(chatroomId, userId);

      this.logger.info(`Message created: ${message.id} in chatroom: ${chatroomId}`);
      return message;
    } catch (error) {
      this.logger.error('Create message failed:', error);
      throw error;
    }
  }

  /**
   * Get messages for a chatroom with pagination
   */
  static async getChatroomMessages(
    chatroomId: string,
    userId: string,
    page: number = 1,
    limit: number = 50
  ): Promise<{ messages: Message[]; total: number; page: number; totalPages: number }> {
    try {
      // Validate pagination parameters
      if (page < 1) page = 1;
      if (limit < 1) limit = 50;
      if (limit > 100) limit = 100;

      const db = DatabaseConfig.getClient();

      // Verify chatroom exists and belongs to user
      const chatroom = await db.chatroom.findFirst({
        where: {
          id: chatroomId,
          userId
        }
      });

      if (!chatroom) {
        throw new NotFoundError('Chatroom not found');
      }

      const skip = (page - 1) * limit;

      // Get total count
      const total = await db.message.count({
        where: { chatroomId }
      });

      // Get messages
      const messages = await db.message.findMany({
        where: { chatroomId },
        orderBy: { createdAt: 'asc' },
        skip,
        take: limit
      });

      const totalPages = Math.ceil(total / limit);

      this.logger.debug(`Retrieved ${messages.length} messages for chatroom: ${chatroomId}`);
      return {
        messages,
        total,
        page,
        totalPages
      };
    } catch (error) {
      this.logger.error('Get chatroom messages failed:', error);
      throw error;
    }
  }

  /**
   * Get recent messages for a chatroom (for real-time updates)
   */
  static async getRecentMessages(
    chatroomId: string,
    userId: string,
    since?: Date,
    limit: number = 50
  ): Promise<Message[]> {
    try {
      const db = DatabaseConfig.getClient();

      // Verify chatroom exists and belongs to user
      const chatroom = await db.chatroom.findFirst({
        where: {
          id: chatroomId,
          userId
        }
      });

      if (!chatroom) {
        throw new NotFoundError('Chatroom not found');
      }

      // Build where condition
      const whereCondition: any = { chatroomId };
      if (since) {
        whereCondition.createdAt = { gt: since };
      }

      // Get recent messages
      const messages = await db.message.findMany({
        where: whereCondition,
        orderBy: { createdAt: 'desc' },
        take: limit
      });

      // Return in ascending order (oldest first)
      const orderedMessages = messages.reverse();

      this.logger.debug(`Retrieved ${orderedMessages.length} recent messages for chatroom: ${chatroomId}`);
      return orderedMessages;
    } catch (error) {
      this.logger.error('Get recent messages failed:', error);
      throw error;
    }
  }

  /**
   * Get a specific message by ID
   */
  static async getMessageById(
    messageId: string,
    userId: string
  ): Promise<MessageWithChatroom> {
    try {
      const db = DatabaseConfig.getClient();

      // Get message with chatroom details
      const message = await db.message.findFirst({
        where: {
          id: messageId,
          chatroom: { userId } // Ensure message belongs to user's chatroom
        },
        include: {
          chatroom: {
            select: {
              id: true,
              name: true,
              userId: true
            }
          }
        }
      });

      if (!message) {
        throw new NotFoundError('Message not found');
      }

      this.logger.debug(`Retrieved message: ${messageId}`);
      return message as MessageWithChatroom;
    } catch (error) {
      this.logger.error('Get message by ID failed:', error);
      throw error;
    }
  }

  /**
   * Delete a message (only user messages can be deleted)
   */
  static async deleteMessage(messageId: string, userId: string): Promise<void> {
    try {
      const db = DatabaseConfig.getClient();

      // Check if message exists and belongs to user's chatroom
      const message = await db.message.findFirst({
        where: {
          id: messageId,
          chatroom: { userId }
        },
        include: {
          chatroom: true
        }
      });

      if (!message) {
        throw new NotFoundError('Message not found');
      }

      // Only allow deletion of user messages
      if (message.sender !== 'user') {
        throw new ValidationError('Only user messages can be deleted');
      }

      // Delete the message
      await db.message.delete({
        where: { id: messageId }
      });

      // Update chatroom's updated timestamp
      await db.chatroom.update({
        where: { id: message.chatroomId },
        data: { updatedAt: new Date() }
      });

      // Invalidate cache after message deletion
      await CacheService.invalidateMessageCache(message.chatroomId, userId);

      this.logger.info(`Message deleted: ${messageId}`);
    } catch (error) {
      this.logger.error('Delete message failed:', error);
      throw error;
    }
  }

  /**
   * Get message statistics for a chatroom
   */
  static async getMessageStats(chatroomId: string, userId: string): Promise<{
    totalMessages: number;
    userMessages: number;
    aiMessages: number;
    averageMessageLength: number;
  }> {
    try {
      // Check cache first
      const cachedResult = await CacheService.getCachedMessageStats(chatroomId);
      if (cachedResult) {
        this.logger.debug(`Cache hit for message stats: ${chatroomId}`);
        return cachedResult;
      }

      const db = DatabaseConfig.getClient();

      // Verify chatroom exists and belongs to user
      const chatroom = await db.chatroom.findFirst({
        where: {
          id: chatroomId,
          userId
        }
      });

      if (!chatroom) {
        throw new NotFoundError('Chatroom not found');
      }

      // Get message counts
      const totalMessages = await db.message.count({
        where: { chatroomId }
      });

      const userMessages = await db.message.count({
        where: { chatroomId, sender: 'user' }
      });

      const aiMessages = await db.message.count({
        where: { chatroomId, sender: 'ai' }
      });

      // Calculate average message length
      const messages = await db.message.findMany({
        where: { chatroomId },
        select: { content: true }
      });

      const averageMessageLength = totalMessages > 0 ? 
        Math.round(messages.reduce((sum, msg) => sum + msg.content.length, 0) / totalMessages) : 0;

      const result = {
        totalMessages,
        userMessages,
        aiMessages,
        averageMessageLength
      };

      // Cache the result
      await CacheService.setCachedMessageStats(chatroomId, result);

      return result;
    } catch (error) {
      this.logger.error('Get message stats failed:', error);
      throw error;
    }
  }

  /**
   * Search messages within a chatroom
   */
  static async searchMessages(
    chatroomId: string,
    userId: string,
    query: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{ messages: Message[]; total: number; page: number; totalPages: number }> {
    try {
      if (!query || query.trim().length === 0) {
        throw new ValidationError('Search query is required');
      }

      const db = DatabaseConfig.getClient();

      // Verify chatroom exists and belongs to user
      const chatroom = await db.chatroom.findFirst({
        where: {
          id: chatroomId,
          userId
        }
      });

      if (!chatroom) {
        throw new NotFoundError('Chatroom not found');
      }

      // Validate pagination parameters
      if (page < 1) page = 1;
      if (limit < 1) limit = 20;
      if (limit > 100) limit = 100;

      const skip = (page - 1) * limit;
      const searchQuery = query.trim();

      // Get total count
      const total = await db.message.count({
        where: {
          chatroomId,
          content: { contains: searchQuery, mode: 'insensitive' }
        }
      });

      // Search messages
      const messages = await db.message.findMany({
        where: {
          chatroomId,
          content: { contains: searchQuery, mode: 'insensitive' }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      });

      const totalPages = Math.ceil(total / limit);

      this.logger.debug(`Search found ${messages.length} messages for query: ${searchQuery}`);
      return {
        messages,
        total,
        page,
        totalPages
      };
    } catch (error) {
      this.logger.error('Search messages failed:', error);
      throw error;
    }
  }

  /**
   * Get message history for a chatroom (for conversation context)
   */
  static async getMessageHistory(
    chatroomId: string,
    userId: string,
    limit: number = 10
  ): Promise<Message[]> {
    try {
      const db = DatabaseConfig.getClient();

      // Verify chatroom exists and belongs to user
      const chatroom = await db.chatroom.findFirst({
        where: {
          id: chatroomId,
          userId
        }
      });

      if (!chatroom) {
        throw new NotFoundError('Chatroom not found');
      }

      // Validate limit
      if (limit < 1) limit = 10;
      if (limit > 50) limit = 50;

      // Get recent messages for context
      const messages = await db.message.findMany({
        where: { chatroomId },
        orderBy: { createdAt: 'desc' },
        take: limit
      });

      // Return in ascending order (oldest first)
      const orderedMessages = messages.reverse();

      this.logger.debug(`Retrieved ${orderedMessages.length} history messages for chatroom: ${chatroomId}`);
      return orderedMessages;
    } catch (error) {
      this.logger.error('Get message history failed:', error);
      throw error;
    }
  }

  /**
   * Clear all messages in a chatroom
   */
  static async clearChatroomMessages(chatroomId: string, userId: string): Promise<void> {
    try {
      const db = DatabaseConfig.getClient();

      // Verify chatroom exists and belongs to user
      const chatroom = await db.chatroom.findFirst({
        where: {
          id: chatroomId,
          userId
        }
      });

      if (!chatroom) {
        throw new NotFoundError('Chatroom not found');
      }

      // Delete all messages in the chatroom
      await db.message.deleteMany({
        where: { chatroomId }
      });

      // Update chatroom's updated timestamp
      await db.chatroom.update({
        where: { id: chatroomId },
        data: { updatedAt: new Date() }
      });

      // Invalidate cache after clearing messages
      await CacheService.invalidateMessageCache(chatroomId, userId);

      this.logger.info(`Cleared all messages in chatroom: ${chatroomId}`);
    } catch (error) {
      this.logger.error('Clear chatroom messages failed:', error);
      throw error;
    }
  }
} 