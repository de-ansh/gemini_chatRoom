import { Worker, Job } from 'bullmq';
import { QueueConfig } from '../config/queue.config';
import { GeminiMessageJob } from '../services/queue.service';
import { GeminiService, GeminiContext, GeminiMessage } from '../services/gemini.service';
import { Logger } from '../utils/logger';

export class GeminiWorker {
  private worker: Worker;
  private logger = Logger.getInstance();
  private geminiService = GeminiService.getInstance();

  constructor() {
    this.worker = new Worker(
      QueueConfig.QUEUE_NAMES.GEMINI_PROCESSING,
      this.processGeminiJob.bind(this),
      {
        connection: QueueConfig.getRedisConnection(),
        concurrency: 10,
      }
    );

    this.setupWorkerEventListeners();
  }

  private setupWorkerEventListeners(): void {
    this.worker.on('ready', () => {
      this.logger.info('Gemini worker is ready');
    });

    this.worker.on('error', (error) => {
      this.logger.error('Gemini worker error:', error);
    });

    this.worker.on('failed', (job, err) => {
      this.logger.error(`Gemini job ${job?.id} failed:`, err);
    });

    this.worker.on('completed', (job, result) => {
      this.logger.info(`Gemini job ${job.id} completed successfully`, { result });
    });

    this.worker.on('stalled', (jobId) => {
      this.logger.warn(`Gemini job ${jobId} stalled`);
    });
  }

  private async processGeminiJob(job: Job<GeminiMessageJob>): Promise<any> {
    const { messageId, chatRoomId, userId, userMessage, context, metadata } = job.data;
    
    this.logger.info(`Processing Gemini job ${job.id}`, {
      messageId,
      chatRoomId,
      userId,
      messageLength: userMessage.length,
    });

    try {
      // Update job progress
      await job.updateProgress(10);

      // Step 1: Initialize Gemini API
      const geminiResponse = await this.callGeminiAPI(userMessage, context);
      await job.updateProgress(60);

      // Step 2: Process the response
      const processedResponse = await this.processGeminiResponse(geminiResponse, context);
      await job.updateProgress(80);

      // Step 3: Save response to database
      const savedMessage = await this.saveGeminiResponse(
        messageId,
        chatRoomId,
        userId,
        processedResponse
      );
      await job.updateProgress(100);

      const result = {
        messageId,
        chatRoomId,
        userId,
        geminiResponse: processedResponse,
        savedMessageId: savedMessage.id,
        processedAt: new Date(),
        metadata: {
          ...metadata,
          processingTime: Date.now() - job.timestamp,
        },
      };

      this.logger.info(`Gemini job ${job.id} completed successfully`, { result });
      return result;

    } catch (error) {
      this.logger.error(`Gemini job ${job.id} failed:`, error);
      throw error;
    }
  }

  private async callGeminiAPI(userMessage: string, context?: any): Promise<any> {
    try {
      // Get conversation history from database
      const conversationHistory = await this.getConversationHistory(context?.chatRoomId);
      
      // Create Gemini context
      const geminiContext: GeminiContext = {
        chatRoomId: context?.chatRoomId || 'unknown',
        userId: context?.userId || 'unknown',
        conversationHistory: conversationHistory,
        systemPrompt: this.geminiService.generateSystemPrompt({
          chatRoomId: context?.chatRoomId,
          userId: context?.userId,
        }),
        temperature: 0.7,
        maxTokens: 2048,
      };

      // Generate response using Gemini API
      const response = await this.geminiService.generateResponse(userMessage, geminiContext);
      
      return response;
    } catch (error) {
      this.logger.error('Gemini API call failed:', error);
      throw new Error('Failed to call Gemini API');
    }
  }

  private async getConversationHistory(chatRoomId?: string): Promise<GeminiMessage[]> {
    if (!chatRoomId) {
      return [];
    }

    try {
      // Import here to avoid circular dependencies
      const db = (await import('../config/database.config')).DatabaseConfig.getClient();
      
      // Get recent messages for context (last 10 messages) without user ownership check
      const messages = await db.message.findMany({
        where: { chatroomId: chatRoomId },
        orderBy: { createdAt: 'asc' },
        take: 10
      });
      
      // Convert to Gemini format
      const conversationHistory: GeminiMessage[] = [];
      
      for (const message of messages) {
        const role = message.sender === 'user' ? 'user' : 'model';
        conversationHistory.push({
          role,
          parts: [message.content],
        });
      }
      
      return conversationHistory;
    } catch (error) {
      this.logger.error('Failed to get conversation history:', error);
      return [];
    }
  }

  private async processGeminiResponse(response: any, context?: any): Promise<any> {
    try {
      // Process the response (formatting, filtering, etc.)
      const processedResponse = {
        content: response.content,
        usage: response.usage,
        metadata: {
          ...response.metadata,
          processedAt: new Date(),
          wordCount: response.content.split(' ').length,
          characterCount: response.content.length,
          context: context || {},
        },
        formatting: {
          hasCodeBlocks: response.content.includes('```'),
          hasLinks: response.content.includes('http'),
          hasList: response.content.includes('- ') || response.content.includes('* '),
        },
      };

      return processedResponse;
    } catch (error) {
      this.logger.error('Failed to process Gemini response:', error);
      throw new Error('Failed to process Gemini response');
    }
  }

  private async saveGeminiResponse(
    originalMessageId: string,
    chatRoomId: string,
    userId: string,
    geminiResponse: any
  ): Promise<any> {
    try {
      // Import here to avoid circular dependencies
      const { MessageService } = await import('../services/message.service');
      
      // For AI messages, we need to bypass the normal user validation
      // since the AI worker doesn't have the same user context
      const db = (await import('../config/database.config')).DatabaseConfig.getClient();
      
      // Verify chatroom exists (without user ownership check for AI messages)
      const chatroom = await db.chatroom.findFirst({
        where: {
          id: chatRoomId
        }
      });

      if (!chatroom) {
        throw new Error('Chatroom not found for AI response');
      }

      // Save the Gemini response as a new message directly in the database
      const savedMessage = await db.message.create({
        data: {
          chatroomId: chatRoomId,
          content: geminiResponse.content,
          sender: 'ai',
          messageType: 'text'
        }
      });

      // Update chatroom's updated timestamp
      await db.chatroom.update({
        where: { id: chatRoomId },
        data: { updatedAt: new Date() }
      });

      // Invalidate cache
      const { CacheService } = await import('../services/cache.service');
      await CacheService.invalidateMessageCache(chatRoomId, userId);

      this.logger.info(`Gemini response saved as message: ${savedMessage.id}`);
      return savedMessage;
    } catch (error) {
      this.logger.error('Failed to save Gemini response:', error);
      // Don't throw here, just log the error and return a mock response
      return {
        id: 'failed-save',
        content: 'Failed to save AI response',
        sender: 'ai',
        messageType: 'text',
      };
    }
  }

  // Get worker statistics
  getWorkerStats(): any {
    return {
      name: this.worker.name,
      concurrency: this.worker.concurrency,
      closing: this.worker.closing,
    };
  }

  // Graceful shutdown
  async shutdown(): Promise<void> {
    try {
      await this.worker.close();
      this.logger.info('Gemini worker shut down gracefully');
    } catch (error) {
      this.logger.error('Error shutting down Gemini worker:', error);
    }
  }
} 