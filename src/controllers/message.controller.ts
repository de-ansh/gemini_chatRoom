import { Request, Response } from 'express';
import { MessageService } from '../services/message.service';
import { QueueService } from '../services/queue.service';
import { Logger } from '../utils/logger';
import { asyncHandler } from '../middleware/error.middleware';

export class MessageController {
  private static logger = Logger.getInstance();
  private static queueService = QueueService.getInstance();

  /**
   * Send a message to a chatroom
   * POST /api/v1/messages
   */
  static sendMessage = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    if (!req.user) {
      res.status(401).json({
        status: 'error',
        message: 'Authentication required'
      });
      return;
    }

    const userId = req.user.id;
    const chatroomId = req.params.chatroomId;
    const { content, messageType, processWithGemini } = req.body;

    if (!chatroomId) {
      res.status(400).json({
        status: 'error',
        message: 'Chatroom ID is required'
      });
      return;
    }

    // Create the user message
    const message = await MessageService.createMessage(chatroomId, userId, {
      content,
      sender: 'user',
      messageType: messageType || 'text'
    });

    // If processWithGemini is true, enqueue for Gemini processing
    if (processWithGemini) {
      try {
        const geminiJob = await MessageController.queueService.enqueueGeminiMessage({
          messageId: message.id,
          chatRoomId: chatroomId,
          userId: userId,
          userMessage: content,
          context: {
            messageType: messageType || 'text',
            timestamp: new Date(),
          },
          metadata: {
            timestamp: new Date(),
            clientId: req.headers['x-client-id'] as string,
            sessionId: req.headers['x-session-id'] as string,
          },
        });

        this.logger.info(`Message sent and queued for Gemini processing: ${message.id}, Job ID: ${geminiJob.id}`);
        
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
      } catch (queueError) {
        this.logger.error('Failed to queue message for Gemini processing:', queueError);
        
        // Still return success for the message creation, but indicate queue failure
        res.status(201).json({
          status: 'success',
          message: 'Message sent successfully, but AI processing failed to queue',
          data: { 
            message,
            warning: 'AI processing unavailable'
          }
        });
      }
    } else {
      this.logger.info(`Message sent successfully: ${message.id}`);
      res.status(201).json({
        status: 'success',
        message: 'Message sent successfully',
        data: { message }
      });
    }
  });

  /**
   * Get messages for a chatroom
   * GET /api/v1/messages/:chatroomId
   */
  static getChatroomMessages = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    if (!req.user) {
      res.status(401).json({
        status: 'error',
        message: 'Authentication required'
      });
      return;
    }

    const userId = req.user.id;
    const chatroomId = req.params.chatroomId;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;

    if (!chatroomId) {
      res.status(400).json({
        status: 'error',
        message: 'Chatroom ID is required'
      });
      return;
    }

    const result = await MessageService.getChatroomMessages(chatroomId, userId, page, limit);

    res.status(200).json({
      status: 'success',
      data: result
    });
  });

  /**
   * Get recent messages for a chatroom (for real-time updates)
   * GET /api/v1/messages/:chatroomId/recent
   */
  static async getRecentMessages(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          status: 'error',
          message: 'Authentication required'
        });
        return;
      }

      const userId = req.user.id;
      const chatroomId = req.params.chatroomId;
      const since = req.query.since ? new Date(req.query.since as string) : undefined;
      const limit = parseInt(req.query.limit as string) || 50;

      if (!chatroomId) {
        res.status(400).json({
          status: 'error',
          message: 'Chatroom ID is required'
        });
        return;
      }

      const messages = await MessageService.getRecentMessages(chatroomId, userId, since, limit);

      res.status(200).json({
        status: 'success',
        data: { messages }
      });
    } catch (error) {
      this.logger.error('Get recent messages failed:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to get recent messages'
      });
    }
  }

  /**
   * Get message history for a chatroom (for conversation context)
   * GET /api/v1/messages/:chatroomId/history
   */
  static async getMessageHistory(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          status: 'error',
          message: 'Authentication required'
        });
        return;
      }

      const userId = req.user.id;
      const chatroomId = req.params.chatroomId;
      const limit = parseInt(req.query.limit as string) || 10;

      if (!chatroomId) {
        res.status(400).json({
          status: 'error',
          message: 'Chatroom ID is required'
        });
        return;
      }

      const messages = await MessageService.getMessageHistory(chatroomId, userId, limit);

      res.status(200).json({
        status: 'success',
        data: { messages }
      });
    } catch (error) {
      this.logger.error('Get message history failed:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to get message history'
      });
    }
  }

  /**
   * Get a specific message by ID
   * GET /api/v1/messages/:messageId
   */
  static async getMessageById(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          status: 'error',
          message: 'Authentication required'
        });
        return;
      }

      const userId = req.user.id;
      const messageId = req.params.messageId;

      if (!messageId) {
        res.status(400).json({
          status: 'error',
          message: 'Message ID is required'
        });
        return;
      }

      const message = await MessageService.getMessageById(messageId, userId);

      res.status(200).json({
        status: 'success',
        data: { message }
      });
    } catch (error) {
      this.logger.error('Get message by ID failed:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to get message'
      });
    }
  }

  /**
   * Delete a message
   * DELETE /api/v1/messages/:messageId
   */
  static async deleteMessage(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          status: 'error',
          message: 'Authentication required'
        });
        return;
      }

      const userId = req.user.id;
      const messageId = req.params.messageId;

      if (!messageId) {
        res.status(400).json({
          status: 'error',
          message: 'Message ID is required'
        });
        return;
      }

      await MessageService.deleteMessage(messageId, userId);

      this.logger.info(`Message deleted successfully: ${messageId}`);
      res.status(200).json({
        status: 'success',
        message: 'Message deleted successfully'
      });
    } catch (error) {
      this.logger.error('Delete message failed:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to delete message'
      });
    }
  }

  /**
   * Get message statistics for a chatroom
   * GET /api/v1/messages/:chatroomId/stats
   */
  static async getMessageStats(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          status: 'error',
          message: 'Authentication required'
        });
        return;
      }

      const userId = req.user.id;
      const chatroomId = req.params.chatroomId;

      if (!chatroomId) {
        res.status(400).json({
          status: 'error',
          message: 'Chatroom ID is required'
        });
        return;
      }

      const stats = await MessageService.getMessageStats(chatroomId, userId);

      res.status(200).json({
        status: 'success',
        data: { stats }
      });
    } catch (error) {
      this.logger.error('Get message stats failed:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to get message statistics'
      });
    }
  }

  /**
   * Search messages within a chatroom
   * GET /api/v1/messages/:chatroomId/search
   */
  static async searchMessages(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          status: 'error',
          message: 'Authentication required'
        });
        return;
      }

      const userId = req.user.id;
      const chatroomId = req.params.chatroomId;
      const query = req.query.q as string;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      if (!chatroomId) {
        res.status(400).json({
          status: 'error',
          message: 'Chatroom ID is required'
        });
        return;
      }

      if (!query) {
        res.status(400).json({
          status: 'error',
          message: 'Search query is required'
        });
        return;
      }

      const result = await MessageService.searchMessages(chatroomId, userId, query, page, limit);

      res.status(200).json({
        status: 'success',
        data: result
      });
    } catch (error) {
      this.logger.error('Search messages failed:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to search messages'
      });
    }
  }

  /**
   * Clear all messages in a chatroom
   * DELETE /api/v1/messages/:chatroomId
   */
  static async clearChatroomMessages(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          status: 'error',
          message: 'Authentication required'
        });
        return;
      }

      const userId = req.user.id;
      const chatroomId = req.params.chatroomId;

      if (!chatroomId) {
        res.status(400).json({
          status: 'error',
          message: 'Chatroom ID is required'
        });
        return;
      }

      await MessageService.clearChatroomMessages(chatroomId, userId);

      this.logger.info(`Chatroom messages cleared successfully: ${chatroomId}`);
      res.status(200).json({
        status: 'success',
        message: 'Chatroom messages cleared successfully'
      });
    } catch (error) {
      this.logger.error('Clear chatroom messages failed:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to clear chatroom messages'
      });
    }
  }

  /**
   * Send an AI message to a chatroom (for internal use)
   * POST /api/v1/messages/:chatroomId/ai
   */
  static async sendAIMessage(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          status: 'error',
          message: 'Authentication required'
        });
        return;
      }

      const userId = req.user.id;
      const chatroomId = req.params.chatroomId;
      const { content, messageType } = req.body;

      if (!chatroomId) {
        res.status(400).json({
          status: 'error',
          message: 'Chatroom ID is required'
        });
        return;
      }

      const message = await MessageService.createMessage(chatroomId, userId, {
        content,
        sender: 'ai',
        messageType: messageType || 'text'
      });

      this.logger.info(`AI message sent successfully: ${message.id}`);
      res.status(201).json({
        status: 'success',
        message: 'AI message sent successfully',
        data: { message }
      });
    } catch (error) {
      this.logger.error('Send AI message failed:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to send AI message'
      });
    }
  }
} 