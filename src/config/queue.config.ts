import { Queue, Worker, ConnectionOptions } from 'bullmq';
import { Logger } from '../utils/logger';

export class QueueConfig {
  private static logger = Logger.getInstance();
  
  // Redis connection options for BullMQ
  static getRedisConnection(): ConnectionOptions {
    return {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
      password: process.env.REDIS_PASSWORD || 'redis123',
      db: parseInt(process.env.REDIS_QUEUE_DB || '1', 10), // Use different DB for queues
      maxRetriesPerRequest: 3,
      retryDelayOnFailover: 100,
      enableReadyCheck: false,
      lazyConnect: true,
    };
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