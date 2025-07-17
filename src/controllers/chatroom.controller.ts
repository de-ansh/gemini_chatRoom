import { Request, Response } from 'express';
import { ChatroomService } from '../services/chatroom.service';
import { Logger } from '../utils/logger';
import { asyncHandler } from '../middleware/error.middleware';

export class ChatroomController {
  private static logger = Logger.getInstance();

  /**
   * Create a new chatroom
   * POST /api/v1/chatrooms
   */
  static createChatroom = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    if (!req.user) {
      res.status(401).json({
        status: 'error',
        message: 'Authentication required'
      });
      return;
    }

    const userId = req.user.id;
    const { name, description } = req.body;

    const chatroom = await ChatroomService.createChatroom(userId, {
      name,
      description
    });

    this.logger.info(`Chatroom created successfully: ${chatroom.id}`);
    res.status(201).json({
      status: 'success',
      message: 'Chatroom created successfully',
      data: { chatroom }
    });
  });

  /**
   * Get all chatrooms for the authenticated user
   * GET /api/v1/chatrooms
   */
  static getChatrooms = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    if (!req.user) {
      res.status(401).json({
        status: 'error',
        message: 'Authentication required'
      });
      return;
    }

    const userId = req.user.id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    const result = await ChatroomService.getUserChatrooms(userId, page, limit);

    this.logger.info(`Retrieved ${result.chatrooms.length} chatrooms for user: ${userId}`);
    res.status(200).json({
      status: 'success',
      message: 'Chatrooms retrieved successfully',
      data: result
    });
  });

  /**
   * Get a specific chatroom by ID
   * GET /api/v1/chatrooms/:id
   */
  static async getChatroomById(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          status: 'error',
          message: 'Authentication required'
        });
        return;
      }

      const userId = req.user.id;
      const chatroomId = req.params.id;
      
      if (!chatroomId) {
        res.status(400).json({
          status: 'error',
          message: 'Chatroom ID is required'
        });
        return;
      }

      const messagesPage = parseInt(req.query.messagesPage as string) || 1;
      const messagesLimit = parseInt(req.query.messagesLimit as string) || 50;

      const chatroom = await ChatroomService.getChatroomById(
        chatroomId,
        userId,
        messagesPage,
        messagesLimit
      );

      this.logger.info(`Retrieved chatroom: ${chatroomId}`);
      res.status(200).json({
        status: 'success',
        message: 'Chatroom retrieved successfully',
        data: { chatroom }
      });
    } catch (error) {
      this.logger.error('Get chatroom by ID failed:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to retrieve chatroom'
      });
    }
  }

  /**
   * Update a chatroom
   * PUT /api/v1/chatrooms/:id
   */
  static async updateChatroom(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          status: 'error',
          message: 'Authentication required'
        });
        return;
      }

      const userId = req.user.id;
      const chatroomId = req.params.id;
      
      if (!chatroomId) {
        res.status(400).json({
          status: 'error',
          message: 'Chatroom ID is required'
        });
        return;
      }

      const { name, description } = req.body;

      const chatroom = await ChatroomService.updateChatroom(chatroomId, userId, {
        name,
        description
      });

      if (!chatroom) {
        res.status(404).json({
          status: 'error',
          message: 'Chatroom not found'
        });
        return;
      }

      this.logger.info(`Chatroom updated successfully: ${chatroom.id}`);
      res.status(200).json({
        status: 'success',
        message: 'Chatroom updated successfully',
        data: { chatroom }
      });
    } catch (error) {
      this.logger.error('Update chatroom failed:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to update chatroom'
      });
    }
  }

  /**
   * Delete a chatroom
   * DELETE /api/v1/chatrooms/:id
   */
  static async deleteChatroom(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          status: 'error',
          message: 'Authentication required'
        });
        return;
      }

      const userId = req.user.id;
      const chatroomId = req.params.id;

      if (!chatroomId) {
        res.status(400).json({
          status: 'error',
          message: 'Chatroom ID is required'
        });
        return;
      }

      await ChatroomService.deleteChatroom(chatroomId, userId);

      this.logger.info(`Chatroom deleted successfully: ${chatroomId}`);
      res.status(200).json({
        status: 'success',
        message: 'Chatroom deleted successfully'
      });
    } catch (error) {
      this.logger.error('Delete chatroom failed:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to delete chatroom'
      });
    }
  }

  /**
   * Get chatroom statistics
   * GET /api/v1/chatrooms/stats
   */
  static async getChatroomStats(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          status: 'error',
          message: 'Authentication required'
        });
        return;
      }

      const userId = req.user.id;

      const stats = await ChatroomService.getChatroomStats(userId);

      this.logger.info(`Retrieved chatroom stats for user: ${userId}`);
      res.status(200).json({
        status: 'success',
        message: 'Chatroom statistics retrieved successfully',
        data: { stats }
      });
    } catch (error) {
      this.logger.error('Get chatroom stats failed:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to retrieve chatroom statistics'
      });
    }
  }

  /**
   * Search chatrooms
   * GET /api/v1/chatrooms/search
   */
  static searchChatrooms = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    if (!req.user) {
      res.status(401).json({
        status: 'error',
        message: 'Authentication required'
      });
      return;
    }

    const userId = req.user.id;
    const query = req.query.q as string;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    if (!query) {
      res.status(400).json({
        status: 'error',
        message: 'Search query is required'
      });
      return;
    }

    const result = await ChatroomService.searchChatrooms(userId, query, page, limit);

    this.logger.info(`Search completed for user: ${userId}, found ${result.chatrooms.length} chatrooms`);
    res.status(200).json({
      status: 'success',
      message: 'Search completed successfully',
      data: result
    });
  });

  /**
   * Send a message to a chatroom with automatic Gemini processing
   * POST /api/v1/chatrooms/:id/send-message
   */
  static sendMessageToChatroom = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    if (!req.user) {
      res.status(401).json({
        status: 'error',
        message: 'Authentication required'
      });
      return;
    }

    const userId = req.user.id;
    const chatroomId = req.params.id;
    const { content, messageType = 'text' } = req.body;

    if (!chatroomId) {
      res.status(400).json({
        status: 'error',
        message: 'Chatroom ID is required'
      });
      return;
    }

    if (!content || content.trim().length === 0) {
      res.status(400).json({
        status: 'error',
        message: 'Message content is required'
      });
      return;
    }

    try {
      // Import MessageService here to avoid circular dependencies
      const { MessageService } = await import('../services/message.service');
      const { QueueService } = await import('../services/queue.service');
      
      // Create the user message
      const message = await MessageService.createMessage(chatroomId, userId, {
        content: content.trim(),
        sender: 'user',
        messageType
      });

      // Always enqueue for Gemini processing
      const queueService = QueueService.getInstance();
      const geminiJob = await queueService.enqueueGeminiMessage({
        messageId: message.id,
        chatRoomId: chatroomId,
        userId: userId,
        userMessage: content.trim(),
        context: {
          messageType,
          timestamp: new Date(),
          chatRoomId: chatroomId,
          userId: userId,
        },
        metadata: {
          timestamp: new Date(),
          clientId: req.headers['x-client-id'] as string,
          sessionId: req.headers['x-session-id'] as string,
        },
      });

      this.logger.info(`Message sent to chatroom and queued for Gemini: ${message.id}, Job ID: ${geminiJob.id}`);
      
      res.status(201).json({
        status: 'success',
        message: 'Message sent successfully and queued for AI processing',
        data: { 
          message,
          geminiJob: {
            id: geminiJob.id,
            status: 'queued',
            estimatedProcessingTime: '2-5 seconds'
          }
        }
      });
    } catch (error) {
      this.logger.error('Send message to chatroom failed:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to send message'
      });
    }
  });
} 