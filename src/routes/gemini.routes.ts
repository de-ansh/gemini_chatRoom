import { Router } from 'express';
import { GeminiController } from '../controllers/gemini.controller';
import { simpleAuthenticate } from '../middleware/auth.middleware';
import { rateLimiter } from '../middleware/rateLimiter.middleware';

const router = Router();

// Apply rate limiting to prevent abuse
router.use(rateLimiter);

// Add a public test endpoint (temporarily for testing)
router.get('/test-public', (req, res) => {
  res.json({
    success: true,
    message: 'Gemini API is accessible',
    timestamp: new Date().toISOString(),
  });
});

// Apply authentication middleware to protected Gemini routes
router.use(simpleAuthenticate);

// Gemini API management endpoints
router.get('/health', GeminiController.healthCheck);
router.get('/config', GeminiController.getConfiguration);
router.get('/model-info', GeminiController.getModelInfo);
router.post('/test-connection', GeminiController.testConnection);
router.post('/test-generation', GeminiController.testMessageGeneration);

export default router; 