import { Router } from 'express';
import { simpleAuthenticate } from '../middleware/auth.middleware';
import { rateLimiter } from '../middleware/rateLimiter.middleware';
import { AuthController } from '@/controllers/auth.controller';

const router = Router();

// Apply authentication to all user routes
router.use(simpleAuthenticate);

// Apply rate limiting
router.use(rateLimiter);

router.get('/me', AuthController.getProfile);
router.put('/profile', AuthController.updateProfile);
router.delete('/account', AuthController.deleteAccount);

export default router; 