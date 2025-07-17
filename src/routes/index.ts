import { Router } from 'express';
import authRoutes from './auth.routes';
import userRoutes from './user.routes';
import subscriptionRoutes from './subscription.routes';
import chatroomRoutes from './chatroom.routes';
import webhookRoutes from './webhook.routes';
import cacheRoutes from './cache.routes';
import queueRoutes from './queue.routes';
import geminiRoutes from './gemini.routes';

const router = Router();

// Health check for the API
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'API is running',
    timestamp: new Date().toISOString(),
  });
});

// API routes
router.use('/auth', authRoutes);
router.use('/user', userRoutes);
router.use('/chatroom', chatroomRoutes);
router.use('/subscription', subscriptionRoutes);
router.use('/webhook', webhookRoutes);
router.use('/cache', cacheRoutes);
router.use('/queue', queueRoutes);
router.use('/gemini', geminiRoutes);

export default router; 