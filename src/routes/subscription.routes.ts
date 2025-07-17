import { Router } from 'express';
import { SubscriptionController } from '../controllers/subscription.controller';
import { simpleAuthenticate } from '../middleware/auth.middleware';

const router = Router();

// Apply authentication to all subscription routes
router.use(simpleAuthenticate);

// Get subscription plans (public info)
router.get('/plans', SubscriptionController.getSubscriptionPlans);

// Get subscription status
router.get('/status', SubscriptionController.getSubscriptionStatus);

// Check if user can send message
router.get('/can-send', SubscriptionController.checkMessagePermission);

// Get usage statistics
router.get('/usage', SubscriptionController.getUsageStats);

// Subscribe to Pro tier
router.post('/pro', SubscriptionController.subscribeToPro);

// Cancel subscription
router.post('/cancel', SubscriptionController.cancelSubscription);

// Reactivate subscription
router.post('/reactivate', SubscriptionController.reactivateSubscription);

export default router; 