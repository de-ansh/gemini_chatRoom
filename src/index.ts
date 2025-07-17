import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import dotenv from 'dotenv';

import { AppConfig } from './config/app.config';
import { DatabaseConfig } from './config/database.config';
import { RedisConfig } from './config/redis.config';
import { QueueService } from './services/queue.service';
import { WorkerManager } from './workers/worker.manager';
import { errorHandler } from './middleware/error.middleware';
import { notFoundHandler } from './middleware/notFound.middleware';
import { rateLimiter } from './middleware/rateLimiter.middleware';
import { Logger } from './utils/logger';
import routes from './routes';

// Load environment variables
dotenv.config();

const app = express();
const logger = Logger.getInstance();

// Security middleware
app.use(helmet());

// CORS configuration
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Compression middleware
app.use(compression());

// Request logging
app.use(morgan(process.env.LOG_FORMAT || 'combined', {
  stream: {
    write: (message: string) => logger.info(message.trim())
  }
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
app.use('/api/', rateLimiter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    version: process.env.API_VERSION || 'v1'
  });
});

// Simple test endpoint
app.get('/test', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Server is working!',
    timestamp: new Date().toISOString()
  });
});

// API routes
app.use('/api', routes);

// Error handling middleware (must be last)
app.use(notFoundHandler);
app.use(errorHandler);

// Start server
const startServer = async () => {
  try {
    // Initialize database connection
    await DatabaseConfig.initialize();
    logger.info('Database connection established');

    // Initialize Redis
    try {
      const redisClient = RedisConfig.getRedisClient();
      await redisClient.ping();
      logger.info('Redis connected successfully');
    } catch (error) {
      logger.error('Redis connection failed:', error);
      process.exit(1);
    }

    // Initialize queue service
    const queueService = QueueService.getInstance();
    await queueService.initialize();
    logger.info('Queue service initialized');

    // Initialize worker manager
    const workerManager = WorkerManager.getInstance();
    await workerManager.initialize();
    logger.info('Worker manager initialized');

    // Start the server
    const port = AppConfig.port;
    app.listen(port, () => {
      logger.info(`🚀 Server running on port ${port}`);
      logger.info(`📡 API available at http://localhost:${port}/api`);
      logger.info(`🔍 Health check at http://localhost:${port}/health`);
      logger.info(`🚀 Queue dashboard at http://localhost:${port}/api/queue/overview`);
      logger.info(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  
  // Shutdown workers and queues first
  const workerManager = WorkerManager.getInstance();
  await workerManager.shutdown();
  
  const queueService = QueueService.getInstance();
  await queueService.shutdown();
  
  // Then shutdown database
  await DatabaseConfig.disconnect();
  
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  
  // Shutdown workers and queues first
  const workerManager = WorkerManager.getInstance();
  await workerManager.shutdown();
  
  const queueService = QueueService.getInstance();
  await queueService.shutdown();
  
  // Then shutdown database
  await DatabaseConfig.disconnect();
  
  process.exit(0);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  
  // Don't exit immediately for unhandled rejections in development
  if (process.env.NODE_ENV === 'development') {
    logger.warn('Continuing in development mode despite unhandled rejection');
  } else {
    process.exit(1);
  }
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  
  // Always exit for uncaught exceptions as they indicate serious problems
  process.exit(1);
});

// Start the application
startServer(); 