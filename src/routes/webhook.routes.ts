import { Router } from 'express';
import { WebhookController } from '../controllers/webhook.controller';
import { stripeWebhookRateLimiter } from '../middleware/rateLimiter.middleware';

const router = Router();

// Apply specific rate limiting for webhooks
router.use('/stripe', stripeWebhookRateLimiter);

// Stripe webhook handler
router.post('/stripe', WebhookController.handleStripeWebhook);

// Webhook health check
router.get('/health', WebhookController.webhookHealth);

// Test webhook endpoint (for development)
router.post('/test', WebhookController.testWebhook);

export default router; 