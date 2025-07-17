import { Router } from 'express';
import { QueueController } from '../controllers/queue.controller';
import { simpleAuthenticate } from '../middleware/auth.middleware';
import { rateLimiter } from '../middleware/rateLimiter.middleware';

const router = Router();

// Apply authentication to all queue routes
router.use(simpleAuthenticate);

// Apply rate limiting
router.use(rateLimiter);

// Queue management routes
router.get('/stats', QueueController.getQueueStats);
router.get('/stats/all', QueueController.getAllQueueStats);
router.post('/pause/:queueName', QueueController.pauseQueue);
router.post('/resume/:queueName', QueueController.resumeQueue);
router.delete('/clean/:queueName', QueueController.cleanQueue);

export default router; 