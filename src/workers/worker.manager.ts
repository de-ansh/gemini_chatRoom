import { Logger } from '../utils/logger';
import { GeminiWorker } from './gemini.worker';

export class WorkerManager {
  private static instance: WorkerManager;
  private workers: Map<string, any> = new Map();
  private logger = Logger.getInstance();

  private constructor() {}

  static getInstance(): WorkerManager {
    if (!WorkerManager.instance) {
      WorkerManager.instance = new WorkerManager();
    }
    return WorkerManager.instance;
  }

  // Initialize all workers
  async initialize(): Promise<void> {
    try {
      // Initialize Gemini worker
      const geminiWorker = new GeminiWorker();
      this.workers.set('gemini', geminiWorker);

      // Future workers can be added here
      // const emailWorker = new EmailWorker();
      // this.workers.set('email', emailWorker);

      this.logger.info('All workers initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize workers:', error);
      throw error;
    }
  }

  // Get worker by name
  getWorker(workerName: string): any {
    return this.workers.get(workerName);
  }

  // Get all worker statistics
  getAllWorkerStats(): any[] {
    const stats = [];
    
    for (const [name, worker] of this.workers) {
      try {
        if (worker.getWorkerStats) {
          const workerStats = worker.getWorkerStats();
          stats.push({
            workerName: name,
            ...workerStats,
          });
        }
      } catch (error) {
        this.logger.error(`Failed to get stats for worker ${name}:`, error);
      }
    }

    return stats;
  }

  // Health check for all workers
  async healthCheck(): Promise<boolean> {
    try {
      for (const [name, worker] of this.workers) {
        if (worker.healthCheck) {
          const isHealthy = await worker.healthCheck();
          if (!isHealthy) {
            this.logger.warn(`Worker ${name} health check failed`);
            return false;
          }
        }
      }
      return true;
    } catch (error) {
      this.logger.error('Worker health check failed:', error);
      return false;
    }
  }

  // Graceful shutdown of all workers
  async shutdown(): Promise<void> {
    try {
      const shutdownPromises = [];
      
      for (const [name, worker] of this.workers) {
        if (worker.shutdown) {
          shutdownPromises.push(worker.shutdown());
        }
      }

      await Promise.all(shutdownPromises);
      this.workers.clear();
      
      this.logger.info('All workers shut down gracefully');
    } catch (error) {
      this.logger.error('Error during worker shutdown:', error);
    }
  }
} 