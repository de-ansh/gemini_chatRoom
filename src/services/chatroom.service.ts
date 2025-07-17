import { Chatroom, Message } from '@prisma/client';
import { DatabaseConfig } from '../config/database.config';
import { Logger } from '../utils/logger';
import { NotFoundError, ValidationError } from '../middleware/error.middleware';
import { CacheService } from './cache.service';

interface CreateChatroomData {
  name: string;
  description?: string;
}

interface UpdateChatroomData {
  name?: string;
  description?: string;
}

interface ChatroomWithMessages extends Chatroom {
  messages: Message[];
  messageCount: number;
}

interface ChatroomListItem extends Chatroom {
  messageCount: number;
  lastMessage?: {
    content: string;
    sender: string;
    createdAt: Date;
  };
}

export class ChatroomService {
  private static logger = Logger.getInstance();

  /**
   * Create a new chatroom for a user
   */
  static async createChatroom(userId: string, data: CreateChatroomData): Promise<Chatroom> {
    try {
      // Validate input
      if (!data.name || data.name.trim().length === 0) {
        throw new ValidationError('Chatroom name is required');
      }

      if (data.name.length > 100) {
        throw new ValidationError('Chatroom name cannot exceed 100 characters');
      }

      if (data.description && data.description.length > 500) {
        throw new ValidationError('Chatroom description cannot exceed 500 characters');
      }

      const db = DatabaseConfig.getClient();

      // Check if user already has a chatroom with this name
      const existingChatroom = await db.chatroom.findFirst({
        where: {
          userId,
          name: data.name.trim()
        }
      });

      if (existingChatroom) {
        throw new ValidationError('A chatroom with this name already exists');
      }

      // Create the chatroom
      const chatroom = await db.chatroom.create({
        data: {
          userId,
          name: data.name.trim(),
          description: data.description?.trim() || null
        }
      });

      // Invalidate user cache after creation
      await CacheService.invalidateUserCache(userId);

      this.logger.info(`Chatroom created: ${chatroom.id} for user: ${userId}`);
      return chatroom;
    } catch (error) {
      this.logger.error('Create chatroom failed:', error);
      throw error;
    }
  }

  /**
   * Get all chatrooms for a user with pagination
   */
  static async getUserChatrooms(
    userId: string,
    page: number = 1,
    limit: number = 10
  ): Promise<{ chatrooms: ChatroomListItem[]; total: number; page: number; totalPages: number }> {
    try {
      // Validate pagination parameters
      if (page < 1) page = 1;
      if (limit < 1) limit = 10;
      if (limit > 100) limit = 100;

      // Check cache first
      const cachedResult = await CacheService.getCachedUserChatrooms(userId, page, limit);
      if (cachedResult) {
        this.logger.debug(`Cache hit for user chatrooms: ${userId}`);
        return cachedResult;
      }

      const skip = (page - 1) * limit;
      const db = DatabaseConfig.getClient();

      // Get total count
      const total = await db.chatroom.count({
        where: { userId }
      });

      // Get chatrooms with message counts
      const chatrooms = await db.chatroom.findMany({
        where: { userId },
        include: {
          _count: {
            select: { messages: true }
          }
        },
        orderBy: { updatedAt: 'desc' },
        skip,
        take: limit
      });

      // Get last messages for each chatroom separately to avoid complex joins
      const chatroomIds = chatrooms.map(c => c.id);
      const lastMessages = await db.message.findMany({
        where: {
          chatroomId: { in: chatroomIds }
        },
        select: {
          chatroomId: true,
          content: true,
          sender: true,
          createdAt: true
        },
        orderBy: { createdAt: 'desc' },
        distinct: ['chatroomId']
      });

      // Create a map of last messages by chatroom ID
      const lastMessageMap = new Map();
      lastMessages.forEach(msg => {
        lastMessageMap.set(msg.chatroomId, {
          content: msg.content,
          sender: msg.sender,
          createdAt: msg.createdAt
        });
      });

      // Transform the response
      const formattedChatrooms: ChatroomListItem[] = chatrooms.map((chatroom: any) => ({
        id: chatroom.id,
        userId: chatroom.userId,
        name: chatroom.name,
        description: chatroom.description,
        createdAt: chatroom.createdAt,
        updatedAt: chatroom.updatedAt,
        messageCount: chatroom._count.messages,
        lastMessage: lastMessageMap.get(chatroom.id) || undefined
      }));

      const totalPages = Math.ceil(total / limit);

      const result = {
        chatrooms: formattedChatrooms,
        total,
        page,
        totalPages
      };

      // Cache the result
      await CacheService.setCachedUserChatrooms(userId, page, limit, result);

      this.logger.debug(`Retrieved ${formattedChatrooms.length} chatrooms for user: ${userId}`);
      return result;
    } catch (error) {
      this.logger.error('Get user chatrooms failed:', error);
      throw error;
    }
  }

  /**
   * Get a specific chatroom by ID with messages
   */
  static async getChatroomById(
    chatroomId: string,
    userId: string,
    messagesPage: number = 1,
    messagesLimit: number = 50
  ): Promise<ChatroomWithMessages> {
    try {
      // Validate pagination parameters
      if (messagesPage < 1) messagesPage = 1;
      if (messagesLimit < 1) messagesLimit = 50;
      if (messagesLimit > 100) messagesLimit = 100;

      // Check cache first
      const cachedResult = await CacheService.getCachedChatroomDetail(chatroomId, messagesPage, messagesLimit);
      if (cachedResult) {
        this.logger.debug(`Cache hit for chatroom detail: ${chatroomId}`);
        return cachedResult;
      }

      const skip = (messagesPage - 1) * messagesLimit;
      const db = DatabaseConfig.getClient();

      // Get chatroom with messages
      const chatroom = await db.chatroom.findFirst({
        where: {
          id: chatroomId,
          userId // Ensure user owns this chatroom
        },
        include: {
          messages: {
            orderBy: { createdAt: 'desc' },
            skip,
            take: messagesLimit
          },
          _count: {
            select: { messages: true }
          }
        }
      });

      if (!chatroom) {
        throw new NotFoundError('Chatroom not found');
      }

      // Reverse messages to show oldest first
      const messages = chatroom.messages.reverse();

      const result: ChatroomWithMessages = {
        id: chatroom.id,
        userId: chatroom.userId,
        name: chatroom.name,
        description: chatroom.description,
        createdAt: chatroom.createdAt,
        updatedAt: chatroom.updatedAt,
        messages,
        messageCount: chatroom._count.messages
      };

      // Cache the result
      await CacheService.setCachedChatroomDetail(chatroomId, messagesPage, messagesLimit, result);

      this.logger.debug(`Retrieved chatroom: ${chatroomId} with ${messages.length} messages`);
      return result;
    } catch (error) {
      this.logger.error('Get chatroom by ID failed:', error);
      throw error;
    }
  }

  /**
   * Update a chatroom
   */
  static async updateChatroom(
    chatroomId: string,
    userId: string,
    data: UpdateChatroomData
  ): Promise<Chatroom> {
    try {
      // Validate input
      if (data.name !== undefined) {
        if (!data.name || data.name.trim().length === 0) {
          throw new ValidationError('Chatroom name cannot be empty');
        }
        if (data.name.length > 100) {
          throw new ValidationError('Chatroom name cannot exceed 100 characters');
        }
      }

      if (data.description !== undefined && data.description && data.description.length > 500) {
        throw new ValidationError('Chatroom description cannot exceed 500 characters');
      }

      const db = DatabaseConfig.getClient();

      // Check if chatroom exists and belongs to user
      const existingChatroom = await db.chatroom.findFirst({
        where: {
          id: chatroomId,
          userId
        }
      });

      if (!existingChatroom) {
        throw new NotFoundError('Chatroom not found');
      }

      // Check if updating name conflicts with existing chatroom
      if (data.name && data.name.trim() !== existingChatroom.name) {
        const conflictingChatroom = await db.chatroom.findFirst({
          where: {
            userId,
            name: data.name.trim(),
            id: { not: chatroomId }
          }
        });

        if (conflictingChatroom) {
          throw new ValidationError('A chatroom with this name already exists');
        }
      }

      // Update the chatroom
      const updateData: any = {};
      if (data.name !== undefined) {
        updateData.name = data.name.trim();
      }
      if (data.description !== undefined) {
        updateData.description = data.description?.trim() || null;
      }

      const updatedChatroom = await db.chatroom.update({
        where: { id: chatroomId },
        data: updateData
      });

      // Invalidate cache after update
      await CacheService.invalidateChatroomCache(chatroomId, userId);

      this.logger.info(`Chatroom updated: ${chatroomId}`);
      return updatedChatroom;
    } catch (error) {
      this.logger.error('Update chatroom failed:', error);
      throw error;
    }
  }

  /**
   * Delete a chatroom and all its messages
   */
  static async deleteChatroom(chatroomId: string, userId: string): Promise<void> {
    try {
      const db = DatabaseConfig.getClient();

      // Check if chatroom exists and belongs to user
      const chatroom = await db.chatroom.findFirst({
        where: {
          id: chatroomId,
          userId
        }
      });

      if (!chatroom) {
        throw new NotFoundError('Chatroom not found');
      }

      // Delete the chatroom (messages will be cascade deleted)
      await db.chatroom.delete({
        where: { id: chatroomId }
      });

      // Invalidate cache after deletion
      await CacheService.invalidateChatroomCache(chatroomId, userId);

      this.logger.info(`Chatroom deleted: ${chatroomId}`);
    } catch (error) {
      this.logger.error('Delete chatroom failed:', error);
      throw error;
    }
  }

  /**
   * Get chatroom statistics for a user
   */
  static async getChatroomStats(userId: string): Promise<{
    totalChatrooms: number;
    totalMessages: number;
    averageMessagesPerChatroom: number;
  }> {
    try {
      // Check cache first
      const cachedResult = await CacheService.getCachedChatroomStats(userId);
      if (cachedResult) {
        this.logger.debug(`Cache hit for chatroom stats: ${userId}`);
        return cachedResult;
      }

      const db = DatabaseConfig.getClient();

      const stats = await db.chatroom.aggregate({
        where: { userId },
        _count: { id: true }
      });

      const totalChatrooms = stats._count.id || 0;
      const totalMessages = await db.message.count({
        where: {
          chatroom: { userId }
        }
      });

      const averageMessagesPerChatroom = totalChatrooms > 0 ? 
        Math.round(totalMessages / totalChatrooms) : 0;

      const result = {
        totalChatrooms,
        totalMessages,
        averageMessagesPerChatroom
      };

      // Cache the result
      await CacheService.setCachedChatroomStats(userId, result);

      return result;
    } catch (error) {
      this.logger.error('Get chatroom stats failed:', error);
      throw error;
    }
  }

  /**
   * Search chatrooms by name or description
   */
  static async searchChatrooms(
    userId: string,
    query: string,
    page: number = 1,
    limit: number = 10
  ): Promise<{ chatrooms: ChatroomListItem[]; total: number; page: number; totalPages: number }> {
    try {
      if (!query || query.trim().length === 0) {
        return this.getUserChatrooms(userId, page, limit);
      }

      // Validate pagination parameters
      if (page < 1) page = 1;
      if (limit < 1) limit = 10;
      if (limit > 100) limit = 100;

      const searchQuery = query.trim();

      // Check cache first
      const cachedResult = await CacheService.getCachedChatroomSearch(userId, searchQuery, page, limit);
      if (cachedResult) {
        this.logger.debug(`Cache hit for chatroom search: ${userId} - ${searchQuery}`);
        return cachedResult;
      }

      const skip = (page - 1) * limit;
      const db = DatabaseConfig.getClient();

      // Get total count
      const total = await db.chatroom.count({
        where: {
          userId,
          OR: [
            { name: { contains: searchQuery, mode: 'insensitive' } },
            { description: { contains: searchQuery, mode: 'insensitive' } }
          ]
        }
      });

      // Search chatrooms
      const chatrooms = await db.chatroom.findMany({
        where: {
          userId,
          OR: [
            { name: { contains: searchQuery, mode: 'insensitive' } },
            { description: { contains: searchQuery, mode: 'insensitive' } }
          ]
        },
        include: {
          messages: {
            take: 1,
            orderBy: { createdAt: 'desc' },
            select: {
              content: true,
              sender: true,
              createdAt: true
            }
          },
          _count: {
            select: { messages: true }
          }
        },
        orderBy: { updatedAt: 'desc' },
        skip,
        take: limit
      });

      // Transform the response
      const formattedChatrooms: ChatroomListItem[] = chatrooms.map((chatroom: any) => ({
        id: chatroom.id,
        userId: chatroom.userId,
        name: chatroom.name,
        description: chatroom.description,
        createdAt: chatroom.createdAt,
        updatedAt: chatroom.updatedAt,
        messageCount: chatroom._count.messages,
        lastMessage: chatroom.messages[0] || undefined
      }));

      const totalPages = Math.ceil(total / limit);

      const result = {
        chatrooms: formattedChatrooms,
        total,
        page,
        totalPages
      };

      // Cache the result
      await CacheService.setCachedChatroomSearch(userId, searchQuery, page, limit, result);

      this.logger.debug(`Search found ${formattedChatrooms.length} chatrooms for query: ${searchQuery}`);
      return result;
    } catch (error) {
      this.logger.error('Search chatrooms failed:', error);
      throw error;
    }
  }
} 