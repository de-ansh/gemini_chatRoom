import { Request, Response } from 'express';
import { GeminiService } from '../services/gemini.service';
import { Logger } from '../utils/logger';

export class GeminiController {
  private static logger = Logger.getInstance();
  private static geminiService = GeminiService.getInstance();

  // Test Gemini API connection
  static async testConnection(req: Request, res: Response): Promise<void> {
    try {
      const isHealthy = await GeminiController.geminiService.healthCheck();
      
      res.json({
        success: isHealthy,
        message: isHealthy ? 'Gemini API is working correctly' : 'Gemini API connection failed',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      GeminiController.logger.error('Gemini connection test failed:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to test Gemini connection',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  // Get model information
  static async getModelInfo(req: Request, res: Response): Promise<void> {
    try {
      const modelInfo = await GeminiController.geminiService.getModelInfo();
      
      res.json({
        success: true,
        data: modelInfo,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      GeminiController.logger.error('Failed to get model info:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get model information',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  // Test message generation
  static async testMessageGeneration(req: Request, res: Response): Promise<void> {
    try {
      const { message, context } = req.body;

      if (!message) {
        res.status(400).json({
          success: false,
          error: 'Message is required',
        });
        return;
      }

      const testContext = {
        chatRoomId: context?.chatRoomId || 'test-room',
        userId: context?.userId || 'test-user',
        conversationHistory: context?.conversationHistory || [],
        systemPrompt: context?.systemPrompt || 'You are a helpful AI assistant. Respond briefly and clearly.',
        temperature: context?.temperature || 0.7,
        maxTokens: context?.maxTokens || 500,
      };

      const response = await GeminiController.geminiService.generateResponse(message, testContext);
      
      res.json({
        success: true,
        data: {
          userMessage: message,
          aiResponse: response,
          context: testContext,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      GeminiController.logger.error('Message generation test failed:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate test message',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  // Get Gemini API configuration
  static async getConfiguration(req: Request, res: Response): Promise<void> {
    try {
      const config = {
        model: process.env.GEMINI_MODEL || 'gemini-1.5-flash',
        temperature: parseFloat(process.env.GEMINI_TEMPERATURE || '0.7'),
        maxTokens: parseInt(process.env.GEMINI_MAX_TOKENS || '2048'),
        topK: parseInt(process.env.GEMINI_TOP_K || '40'),
        topP: parseFloat(process.env.GEMINI_TOP_P || '0.95'),
        apiKeyConfigured: !!process.env.GEMINI_API_KEY,
      };

      res.json({
        success: true,
        data: config,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      GeminiController.logger.error('Failed to get configuration:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get configuration',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  // Health check for Gemini service
  static async healthCheck(req: Request, res: Response): Promise<void> {
    try {
      const [connectionHealthy, modelInfo] = await Promise.all([
        GeminiController.geminiService.healthCheck(),
        GeminiController.geminiService.getModelInfo(),
      ]);

      const isHealthy = connectionHealthy && !modelInfo.error;

      res.status(isHealthy ? 200 : 503).json({
        success: isHealthy,
        message: isHealthy ? 'Gemini service is healthy' : 'Gemini service is unhealthy',
        data: {
          connection: connectionHealthy,
          model: modelInfo.currentModel,
          apiKeyConfigured: !!process.env.GEMINI_API_KEY,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      GeminiController.logger.error('Gemini health check failed:', error);
      res.status(503).json({
        success: false,
        error: 'Health check failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
} 