import { Queue, Job, JobsOptions } from 'bullmq';
import { QueueConfig } from '../config/queue.config';
import { Logger } from '../utils/logger';

export interface GeminiMessageJob {
  messageId: string;
  chatRoomId: string;
  userId: string;
  userMessage: string;
  context?: any;
  metadata?: {
    timestamp: Date;
    clientId?: string;
    sessionId?: string;
  };
}

export interface EmailJob {
  to: string;
  subject: string;
  template: string;
  data: any;
  priority?: number;
}

export interface WebhookJob {
  url: string;
  method: string;
  headers: Record<string, string>;
  payload: any;
  retryCount?: number;
}

export interface AnalyticsJob {
  eventType: string;
  userId: string;
  data: any;
  timestamp: Date;
}

export class QueueService {
  private static instance: QueueService;
  private queues: Map<string, Queue> = new Map();
  private logger = Logger.getInstance();

  private constructor() {}

  static getInstance(): QueueService {
    if (!QueueService.instance) {
      QueueService.instance = new QueueService();
    }
    return QueueService.instance;
  }

  // Initialize all queues
  async initialize(): Promise<void> {
    try {
      const queueNames = Object.values(QueueConfig.QUEUE_NAMES);
      
      for (const queueName of queueNames) {
        const queue = new Queue(queueName, QueueConfig.getDefaultQueueOptions());
        
        // Set up queue event listeners
        this.setupQueueEventListeners(queue);
        
        this.queues.set(queueName, queue);
      }

      this.logger.info('All queues initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize queues:', error);
      throw error;
    }
  }

  // Setup event listeners for queue monitoring
  private setupQueueEventListeners(queue: Queue): void {
    queue.on('error', (error: Error) => {
      this.logger.error(`Queue ${queue.name} error:`, error);
    });

    queue.on('waiting', (job: Job) => {
      this.logger.debug(`Job ${job.id} is waiting in queue ${queue.name}`);
    });
  }

  // Get queue by name
  getQueue(queueName: string): Queue | undefined {
    return this.queues.get(queueName);
  }

  // Enqueue Gemini message processing job
  async enqueueGeminiMessage(
    data: GeminiMessageJob,
    options?: JobsOptions
  ): Promise<Job<GeminiMessageJob>> {
    const queue = this.getQueue(QueueConfig.QUEUE_NAMES.GEMINI_PROCESSING);
    if (!queue) {
      throw new Error('Gemini processing queue not found');
    }

    const jobOptions: JobsOptions = {
      priority: QueueConfig.JOB_PRIORITIES.HIGH,
      delay: 0,
      ...options,
    };

    const job = await queue.add(
      QueueConfig.JOB_TYPES.PROCESS_GEMINI_MESSAGE,
      data,
      jobOptions
    );

    this.logger.info(`Enqueued Gemini message job ${job.id}`, { 
      messageId: data.messageId,
      chatRoomId: data.chatRoomId 
    });

    return job;
  }

  // Enqueue email notification job
  async enqueueEmail(
    data: EmailJob,
    options?: JobsOptions
  ): Promise<Job<EmailJob>> {
    const queue = this.getQueue(QueueConfig.QUEUE_NAMES.EMAIL_NOTIFICATIONS);
    if (!queue) {
      throw new Error('Email notifications queue not found');
    }

    const jobOptions: JobsOptions = {
      priority: data.priority || QueueConfig.JOB_PRIORITIES.MEDIUM,
      delay: 0,
      ...options,
    };

    const job = await queue.add(
      QueueConfig.JOB_TYPES.SEND_EMAIL,
      data,
      jobOptions
    );

    this.logger.info(`Enqueued email job ${job.id}`, { to: data.to });
    return job;
  }

  // Enqueue webhook processing job
  async enqueueWebhook(
    data: WebhookJob,
    options?: JobsOptions
  ): Promise<Job<WebhookJob>> {
    const queue = this.getQueue(QueueConfig.QUEUE_NAMES.WEBHOOK_PROCESSING);
    if (!queue) {
      throw new Error('Webhook processing queue not found');
    }

    const jobOptions: JobsOptions = {
      priority: QueueConfig.JOB_PRIORITIES.MEDIUM,
      delay: 0,
      ...options,
    };

    const job = await queue.add(
      QueueConfig.JOB_TYPES.PROCESS_WEBHOOK,
      data,
      jobOptions
    );

    this.logger.info(`Enqueued webhook job ${job.id}`, { url: data.url });
    return job;
  }

  // Enqueue analytics tracking job
  async enqueueAnalytics(
    data: AnalyticsJob,
    options?: JobsOptions
  ): Promise<Job<AnalyticsJob>> {
    const queue = this.getQueue(QueueConfig.QUEUE_NAMES.ANALYTICS_EVENTS);
    if (!queue) {
      throw new Error('Analytics events queue not found');
    }

    const jobOptions: JobsOptions = {
      priority: QueueConfig.JOB_PRIORITIES.LOW,
      delay: 0,
      ...options,
    };

    const job = await queue.add(
      QueueConfig.JOB_TYPES.TRACK_ANALYTICS,
      data,
      jobOptions
    );

    this.logger.debug(`Enqueued analytics job ${job.id}`, { eventType: data.eventType });
    return job;
  }

  // Get queue statistics
  async getQueueStats(queueName: string): Promise<any> {
    const queue = this.getQueue(queueName);
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }

    const [waiting, active, completed, failed, delayed] = await Promise.all([
      queue.getWaiting(),
      queue.getActive(),
      queue.getCompleted(),
      queue.getFailed(),
      queue.getDelayed(),
    ]);

    return {
      queueName,
      waiting: waiting.length,
      active: active.length,
      completed: completed.length,
      failed: failed.length,
      delayed: delayed.length,
    };
  }

  // Get all queue statistics
  async getAllQueueStats(): Promise<any[]> {
    const stats = [];
    
    for (const queueName of Object.values(QueueConfig.QUEUE_NAMES)) {
      try {
        const queueStats = await this.getQueueStats(queueName);
        stats.push(queueStats);
      } catch (error) {
        this.logger.error(`Failed to get stats for queue ${queueName}:`, error);
      }
    }

    return stats;
  }

  // Pause queue
  async pauseQueue(queueName: string): Promise<void> {
    const queue = this.getQueue(queueName);
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }

    await queue.pause();
    this.logger.info(`Queue ${queueName} paused`);
  }

  // Resume queue
  async resumeQueue(queueName: string): Promise<void> {
    const queue = this.getQueue(queueName);
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }

    await queue.resume();
    this.logger.info(`Queue ${queueName} resumed`);
  }

  // Clean queue (remove old jobs)
  async cleanQueue(queueName: string): Promise<void> {
    const queue = this.getQueue(queueName);
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }

    await queue.clean(24 * 60 * 60 * 1000, 100); // Clean jobs older than 24 hours
    this.logger.info(`Queue ${queueName} cleaned`);
  }

  // Health check
  async healthCheck(): Promise<boolean> {
    try {
      for (const queue of this.queues.values()) {
        await queue.waitUntilReady();
      }
      return true;
    } catch (error) {
      this.logger.error('Queue health check failed:', error);
      return false;
    }
  }

  // Graceful shutdown
  async shutdown(): Promise<void> {
    try {
      for (const queue of this.queues.values()) {
        await queue.close();
      }
      this.queues.clear();
      this.logger.info('All queues shut down gracefully');
    } catch (error) {
      this.logger.error('Error during queue shutdown:', error);
    }
  }
} 