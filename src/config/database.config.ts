import { PrismaClient } from '@prisma/client';
import { Logger } from '../utils/logger';

export class DatabaseConfig {
  private static prisma: PrismaClient;
  private static logger = Logger.getInstance();

  static async initialize(): Promise<void> {
    try {
      this.prisma = new PrismaClient({
        log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
        errorFormat: 'pretty',
        datasources: {
          db: {
            url: process.env.DATABASE_URL || 'postgresql://localhost:5432/gemini_chatroom'
          }
        }
      });

      // Connect to database
      await this.prisma.$connect();
      
      // Test the connection
      await this.prisma.$queryRaw`SELECT 1`;
      
      this.logger.info('Database connected successfully');
    } catch (error) {
      this.logger.error('Database connection failed:', error);
      throw error;
    }
  }

  static async disconnect(): Promise<void> {
    try {
      if (this.prisma) {
        await this.prisma.$disconnect();
        this.logger.info('Database disconnected successfully');
      }
    } catch (error) {
      this.logger.error('Error disconnecting from database:', error);
    }
  }

  static getClient(): PrismaClient {
    if (!this.prisma) {
      throw new Error('Database not initialized. Call initialize() first.');
    }
    return this.prisma;
  }

  static async healthCheck(): Promise<boolean> {
    try {
      if (!this.prisma) {
        return false;
      }
      
      await this.prisma.$queryRaw`SELECT 1`;
      return true;
    } catch (error) {
      this.logger.error('Database health check failed:', error);
      return false;
    }
  }

  static async runMigrations(): Promise<void> {
    try {
      // This would typically be handled by the Prisma CLI
      // but we can add custom migration logic here if needed
      this.logger.info('Running database migrations...');
      // Add migration logic here if needed
      this.logger.info('Database migrations completed');
    } catch (error) {
      this.logger.error('Database migration failed:', error);
      throw error;
    }
  }
}

// Export the database instance for easy access
export const db = DatabaseConfig.getClient; 