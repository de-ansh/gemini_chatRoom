import { Request, Response } from 'express';
import { QueueService } from '../services/queue.service';
import { WorkerManager } from '../workers/worker.manager';
import { Logger } from '../utils/logger';

export class QueueController {
  private static logger = Logger.getInstance();
  private static queueService = QueueService.getInstance();
  private static workerManager = WorkerManager.getInstance();

  // Get queue statistics
  static async getQueueStats(req: Request, res: Response): Promise<void> {
    try {
      const stats = await QueueController.queueService.getAllQueueStats();
      
      res.json({
        success: true,
        data: stats,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      QueueController.logger.error('Failed to get queue stats:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get queue statistics',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  // Get all queue statistics
  static async getAllQueueStats(req: Request, res: Response): Promise<void> {
    try {
      const stats = await QueueController.queueService.getAllQueueStats();
      
      res.json({
        success: true,
        data: stats,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      QueueController.logger.error('Failed to get all queue stats:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get all queue statistics',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  // Get specific queue statistics
  static async getQueueStatsByName(req: Request, res: Response): Promise<void> {
    try {
      const { queueName } = req.params;
      
      if (!queueName) {
        res.status(400).json({
          success: false,
          error: 'Queue name is required',
        });
        return;
      }
      
      const stats = await QueueController.queueService.getQueueStats(queueName);
      
      res.json({
        success: true,
        data: stats,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      QueueController.logger.error(`Failed to get stats for queue ${req.params.queueName}:`, error);
      res.status(500).json({
        success: false,
        error: 'Failed to get queue statistics',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  // Get worker statistics
  static async getWorkerStats(req: Request, res: Response): Promise<void> {
    try {
      const stats = QueueController.workerManager.getAllWorkerStats();
      
      res.json({
        success: true,
        data: stats,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      QueueController.logger.error('Failed to get worker stats:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get worker statistics',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  // Pause a queue
  static async pauseQueue(req: Request, res: Response): Promise<void> {
    try {
      const { queueName } = req.params;
      
      if (!queueName) {
        res.status(400).json({
          success: false,
          error: 'Queue name is required',
        });
        return;
      }
      
      await QueueController.queueService.pauseQueue(queueName);
      
      res.json({
        success: true,
        message: `Queue ${queueName} paused successfully`,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      QueueController.logger.error(`Failed to pause queue ${req.params.queueName}:`, error);
      res.status(500).json({
        success: false,
        error: 'Failed to pause queue',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  // Resume a queue
  static async resumeQueue(req: Request, res: Response): Promise<void> {
    try {
      const { queueName } = req.params;
      
      if (!queueName) {
        res.status(400).json({
          success: false,
          error: 'Queue name is required',
        });
        return;
      }
      
      await QueueController.queueService.resumeQueue(queueName);
      
      res.json({
        success: true,
        message: `Queue ${queueName} resumed successfully`,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      QueueController.logger.error(`Failed to resume queue ${req.params.queueName}:`, error);
      res.status(500).json({
        success: false,
        error: 'Failed to resume queue',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  // Clean a queue
  static async cleanQueue(req: Request, res: Response): Promise<void> {
    try {
      const { queueName } = req.params;
      
      if (!queueName) {
        res.status(400).json({
          success: false,
          error: 'Queue name is required',
        });
        return;
      }
      
      await QueueController.queueService.cleanQueue(queueName);
      
      res.json({
        success: true,
        message: `Queue ${queueName} cleaned successfully`,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      QueueController.logger.error(`Failed to clean queue ${req.params.queueName}:`, error);
      res.status(500).json({
        success: false,
        error: 'Failed to clean queue',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  // Enqueue a test Gemini message
  static async enqueueTestMessage(req: Request, res: Response): Promise<void> {
    try {
      const { chatRoomId, userMessage, context } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
        return;
      }

      if (!chatRoomId || !userMessage) {
        res.status(400).json({
          success: false,
          error: 'chatRoomId and userMessage are required',
        });
        return;
      }

      const job = await QueueController.queueService.enqueueGeminiMessage({
        messageId: `test-${Date.now()}`,
        chatRoomId,
        userId,
        userMessage,
        context,
        metadata: {
          timestamp: new Date(),
          clientId: 'test-client',
        },
      });

      res.json({
        success: true,
        message: 'Test message enqueued successfully',
        data: {
          jobId: job.id,
          jobName: job.name,
          chatRoomId,
          userMessage,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      QueueController.logger.error('Failed to enqueue test message:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to enqueue test message',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  // Queue health check
  static async healthCheck(req: Request, res: Response): Promise<void> {
    try {
      const [queueHealthy, workersHealthy] = await Promise.all([
        QueueController.queueService.healthCheck(),
        QueueController.workerManager.healthCheck(),
      ]);

      const isHealthy = queueHealthy && workersHealthy;

      res.status(isHealthy ? 200 : 503).json({
        success: isHealthy,
        message: isHealthy ? 'Queue system is healthy' : 'Queue system is unhealthy',
        data: {
          queues: queueHealthy,
          workers: workersHealthy,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      QueueController.logger.error('Queue health check failed:', error);
      res.status(503).json({
        success: false,
        error: 'Health check failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  // Get system overview
  static async getSystemOverview(req: Request, res: Response): Promise<void> {
    try {
      const [queueStats, workerStats] = await Promise.all([
        QueueController.queueService.getAllQueueStats(),
        QueueController.workerManager.getAllWorkerStats(),
      ]);

      const totalJobs = queueStats.reduce((acc, queue) => ({
        waiting: acc.waiting + queue.waiting,
        active: acc.active + queue.active,
        completed: acc.completed + queue.completed,
        failed: acc.failed + queue.failed,
        delayed: acc.delayed + queue.delayed,
      }), {
        waiting: 0,
        active: 0,
        completed: 0,
        failed: 0,
        delayed: 0,
      });

      res.json({
        success: true,
        data: {
          summary: {
            totalQueues: queueStats.length,
            totalWorkers: workerStats.length,
            totalJobs,
          },
          queues: queueStats,
          workers: workerStats,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      QueueController.logger.error('Failed to get system overview:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get system overview',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
} 