import { Queue, Worker, ConnectionOptions } from 'bullmq';
import { Logger } from '../utils/logger';

export class QueueConfig {
  private static logger = Logger.getInstance();
  
  // Parse Redis URL to extract connection details
  private static parseRedisUrl(): ConnectionOptions {
    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl) {
      return {
        family: 0,
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379', 10),
        db: parseInt(process.env.REDIS_QUEUE_DB || '1', 10),
        maxRetriesPerRequest: null, // Required by BullMQ
        retryDelayOnFailover: 100,
        enableReadyCheck: false,
        lazyConnect: true,
      };
    }

    try {
      const url = new URL(redisUrl);
      const result: ConnectionOptions = {
        family: 0,
        host: url.hostname,
        port: parseInt(url.port || '6379', 10),
        db: parseInt(process.env.REDIS_QUEUE_DB || '1', 10),
        maxRetriesPerRequest: null, // Required by BullMQ
        retryDelayOnFailover: 100,
        enableReadyCheck: false,
        lazyConnect: true,
      };
      
      // Add password if present in URL
      if (url.password) {
        (result as any).password = url.password;
      }
      
      return result;
    } catch (error) {
      this.logger.error('Failed to parse REDIS_URL:', error);
      return {
        family: 0,
        host: 'localhost',
        port: 6379,
        db: 1,
        maxRetriesPerRequest: null,
        retryDelayOnFailover: 100,
        enableReadyCheck: false,
        lazyConnect: true,
      };
    }
  }
  
  // Redis connection options for BullMQ
  static getRedisConnection(): ConnectionOptions {
    return this.parseRedisUrl();
  }

  // Default queue options
  static getDefaultQueueOptions() {
    return {
      connection: this.getRedisConnection(),
      defaultJobOptions: {
        removeOnComplete: 100, // Keep last 100 completed jobs
        removeOnFail: 50, // Keep last 50 failed jobs
        attempts: 3, // Retry failed jobs 3 times
        backoff: {
          type: 'exponential',
          delay: 2000, // Start with 2 seconds
        },
      },
    };
  }

  // Default worker options
  static getDefaultWorkerOptions() {
    return {
      connection: this.getRedisConnection(),
      concurrency: 10, // Process up to 10 jobs concurrently
      removeOnComplete: 100,
      removeOnFail: 50,
    };
  }

  // Queue names
  static readonly QUEUE_NAMES = {
    GEMINI_PROCESSING: 'gemini-processing',
    EMAIL_NOTIFICATIONS: 'email-notifications',
    WEBHOOK_PROCESSING: 'webhook-processing',
    ANALYTICS_EVENTS: 'analytics-events',
  } as const;

  // Job types
  static readonly JOB_TYPES = {
    PROCESS_GEMINI_MESSAGE: 'process-gemini-message',
    SEND_EMAIL: 'send-email',
    PROCESS_WEBHOOK: 'process-webhook',
    TRACK_ANALYTICS: 'track-analytics',
  } as const;

  // Job priorities
  static readonly JOB_PRIORITIES = {
    HIGH: 1,
    MEDIUM: 5,
    LOW: 10,
  } as const;

  // Queue health check
  static async healthCheck(): Promise<boolean> {
    try {
      const testQueue = new Queue('health-check', {
        connection: this.getRedisConnection(),
      });
      
      await testQueue.waitUntilReady();
      await testQueue.close();
      
      return true;
    } catch (error) {
      this.logger.error('Queue health check failed:', error);
      return false;
    }
  }
}

export type QueueName = keyof typeof QueueConfig.QUEUE_NAMES;
export type JobType = keyof typeof QueueConfig.JOB_TYPES; 