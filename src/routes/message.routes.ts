import { Router } from 'express';
import { MessageController } from '../controllers/message.controller';
import { simpleAuthenticate } from '../middleware/auth.middleware';
import { rateLimiter } from '../middleware/rateLimiter.middleware';

const router = Router();

// Apply authentication middleware to all message routes
router.use(simpleAuthenticate);

// Apply rate limiting
router.use(rateLimiter);

// Individual message routes
router.get('/:id', MessageController.getMessageById);
router.delete('/:id', MessageController.deleteMessage);

export default router; 