import { Router } from 'express';
import { CacheController } from '../controllers/cache.controller';
import { simpleAuthenticate } from '../middleware/auth.middleware';
import { rateLimiter } from '../middleware/rateLimiter.middleware';

const router = Router();

// Apply authentication to all cache routes
router.use(simpleAuthenticate);

// Apply rate limiting
router.use(rateLimiter);

// Cache management routes
router.get('/stats', CacheController.getCacheStats);
router.get('/keys', CacheController.getCacheKeys);
router.delete('/clear', CacheController.clearCache);
router.delete('/key/:key', CacheController.deleteCacheKey);
router.post('/warmup', CacheController.warmupCache);

export default router; 