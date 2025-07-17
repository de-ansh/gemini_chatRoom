import { GoogleGenerativeAI, GenerativeModel, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import { Logger } from '../utils/logger';
import { AppConfig } from '../config/app.config';

export interface GeminiMessage {
  role: 'user' | 'model';
  parts: string[];
}

export interface GeminiContext {
  chatRoomId: string;
  userId: string;
  conversationHistory: GeminiMessage[];
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface GeminiResponse {
  content: string;
  usage: {
    promptTokens: number;
    responseTokens: number;
    totalTokens: number;
  };
  metadata: {
    model: string;
    finishReason: string;
    safetyRatings: any[];
  };
}

export class GeminiService {
  private static instance: GeminiService;
  private genAI: GoogleGenerativeAI;
  private model: GenerativeModel;
  private logger = Logger.getInstance();

  private constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is required');
    }

    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({
      model: process.env.GEMINI_MODEL || 'gemini-1.5-flash',
      generationConfig: {
        temperature: parseFloat(process.env.GEMINI_TEMPERATURE || '0.7'),
        topK: parseInt(process.env.GEMINI_TOP_K || '40'),
        topP: parseFloat(process.env.GEMINI_TOP_P || '0.95'),
        maxOutputTokens: parseInt(process.env.GEMINI_MAX_TOKENS || '2048'),
      },
      safetySettings: [
        {
          category: HarmCategory.HARM_CATEGORY_HARASSMENT,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
      ],
    });
  }

  static getInstance(): GeminiService {
    if (!GeminiService.instance) {
      GeminiService.instance = new GeminiService();
    }
    return GeminiService.instance;
  }

  /**
   * Generate a response using Gemini API
   */
  async generateResponse(
    userMessage: string,
    context: GeminiContext
  ): Promise<GeminiResponse> {
    try {
      this.logger.info(`Generating Gemini response for chatroom: ${context.chatRoomId}`);

      // Create chat session
      const chat = this.model.startChat({
        history: this.formatHistoryForGemini(context.conversationHistory),
        generationConfig: {
          temperature: context.temperature || 0.7,
          maxOutputTokens: context.maxTokens || 2048,
        },
      });

      // Add system prompt if provided
      let prompt = userMessage;
      if (context.systemPrompt) {
        prompt = `${context.systemPrompt}\n\nUser: ${userMessage}`;
      }

      // Generate response
      const result = await chat.sendMessage(prompt);
      const response = await result.response;
      const text = response.text();

      // Get response metadata (simplified for now)
      const geminiResponse: GeminiResponse = {
        content: text,
        usage: {
          promptTokens: 0, // Not available in current API
          responseTokens: 0, // Not available in current API
          totalTokens: 0, // Not available in current API
        },
        metadata: {
          model: 'gemini-1.5-flash',
          finishReason: 'STOP',
          safetyRatings: [],
        },
      };

      this.logger.info(`Gemini response generated successfully`, {
        chatRoomId: context.chatRoomId,
        tokensUsed: geminiResponse.usage.totalTokens,
        finishReason: geminiResponse.metadata.finishReason,
      });

      return geminiResponse;
    } catch (error) {
      this.logger.error('Gemini API call failed:', error);
      throw new Error(`Failed to generate Gemini response: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Format conversation history for Gemini API
   */
  private formatHistoryForGemini(history: GeminiMessage[]): any[] {
    return history.map(message => ({
      role: message.role,
      parts: message.parts,
    }));
  }

  /**
   * Generate a system prompt based on context
   */
  generateSystemPrompt(context: Partial<GeminiContext>): string {
    const basePrompt = `You are a helpful AI assistant in a chatroom. 
    
Guidelines:
- Be conversational and engaging
- Provide accurate and helpful information
- If you're not sure about something, say so
- Keep responses concise but informative
- Use markdown formatting when appropriate
- Be respectful and professional

Context: This is a chatroom conversation.`;

    if (context.chatRoomId) {
      return `${basePrompt}\n\nChatroom ID: ${context.chatRoomId}`;
    }

    return basePrompt;
  }

  /**
   * Validate API key and model availability
   */
  async healthCheck(): Promise<boolean> {
    try {
      const testResponse = await this.generateResponse('Hello', {
        chatRoomId: 'test',
        userId: 'test',
        conversationHistory: [],
        systemPrompt: 'You are a test assistant. Respond with "Hello! I am working correctly."',
        maxTokens: 50,
      });

      return testResponse.content.includes('working correctly');
    } catch (error) {
      this.logger.error('Gemini health check failed:', error);
      return false;
    }
  }

  /**
   * Get model information
   */
  async getModelInfo(): Promise<any> {
    try {
      return {
        currentModel: 'gemini-1.5-flash',
        availableModels: ['gemini-1.5-flash', 'gemini-1.5-pro'],
        modelInfo: {
          name: 'gemini-1.5-flash',
          displayName: 'Gemini 1.5 Flash',
        },
      };
    } catch (error) {
      this.logger.error('Failed to get model info:', error);
      return {
        currentModel: 'gemini-1.5-flash',
        error: 'Failed to fetch model information',
      };
    }
  }
} 