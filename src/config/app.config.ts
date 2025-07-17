import dotenv from 'dotenv';

dotenv.config();

export class AppConfig {
  static readonly port: number = parseInt(process.env.PORT || '3000', 10);
  static readonly nodeEnv: string = process.env.NODE_ENV || 'development';
  static readonly apiVersion: string = process.env.API_VERSION || 'v1';
  static readonly frontendUrl: string = process.env.FRONTEND_URL || 'http://localhost:3000';
  static readonly backendUrl: string = process.env.BACKEND_URL || 'http://localhost:3000';
  static readonly corsOrigin: string = process.env.CORS_ORIGIN || 'http://localhost:3000';
  
  // JWT Configuration
  static readonly jwtSecret: string = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production';
  static readonly jwtExpiresIn: string = process.env.JWT_EXPIRES_IN || '7d';
  
  // Rate Limiting
  static readonly basicTierDailyLimit: number = parseInt(process.env.BASIC_TIER_DAILY_LIMIT || '5', 10);
  static readonly proTierDailyLimit: number = parseInt(process.env.PRO_TIER_DAILY_LIMIT || '1000', 10);
  
  // Cache Configuration
  static readonly cacheTtl: number = parseInt(process.env.CACHE_TTL || '300', 10);
  static readonly chatroomCacheTtl: number = parseInt(process.env.CHATROOM_CACHE_TTL || '300', 10);
  
  // Logging
  static readonly logLevel: string = process.env.LOG_LEVEL || 'info';
  static readonly logFormat: string = process.env.LOG_FORMAT || 'combined';
  
  // Google Gemini API
  static readonly geminiApiKey: string = process.env.GEMINI_API_KEY || '';
  
  // Stripe Configuration
  static readonly stripeSecretKey: string = process.env.STRIPE_SECRET_KEY || '';
  static readonly stripePublishableKey: string = process.env.STRIPE_PUBLISHABLE_KEY || '';
  static readonly stripeWebhookSecret: string = process.env.STRIPE_WEBHOOK_SECRET || '';
  
  // Validation
  static validate(): void {
    const requiredEnvVars = [
      'DATABASE_URL',
      'JWT_SECRET',
      'GEMINI_API_KEY',
      'STRIPE_SECRET_KEY',
      'STRIPE_WEBHOOK_SECRET'
    ];
    
    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
      throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
    }
    
    if (this.port < 1 || this.port > 65535) {
      throw new Error('PORT must be between 1 and 65535');
    }
    
    if (!this.geminiApiKey) {
      throw new Error('GEMINI_API_KEY is required');
    }
    
    if (!this.stripeSecretKey.startsWith('sk_')) {
      throw new Error('STRIPE_SECRET_KEY must start with "sk_"');
    }
  }
  
  static get isDevelopment(): boolean {
    return this.nodeEnv === 'development';
  }
  
  static get isProduction(): boolean {
    return this.nodeEnv === 'production';
  }
  
  static get isTest(): boolean {
    return this.nodeEnv === 'test';
  }
} 