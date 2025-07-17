import { Request, Response } from 'express';
import { SubscriptionService } from '../services/subscription.service';
import { asyncHandler } from '../middleware/error.middleware';
import { Logger } from '../utils/logger';

const logger = Logger.getInstance();

export class SubscriptionController {
  /**
   * Subscribe to Pro tier
   * POST /api/subscription/pro
   */
  static subscribeToPro = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({
        status: 'error',
        message: 'Authentication required'
      });
      return;
    }

    // Create subscription
    const subscription = await SubscriptionService.getInstance().createSubscription(userId, 'pro');

    logger.info(`User ${userId} subscribed to Pro tier`);

    res.status(201).json({
      status: 'success',
      message: 'Successfully subscribed to Pro tier',
      data: {
        subscription
      }
    });
  });

  /**
   * Get subscription status
   * GET /api/subscription/status
   */
  static getSubscriptionStatus = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({
        status: 'error',
        message: 'Authentication required'
      });
      return;
    }

    const subscription = await SubscriptionService.getInstance().getSubscription(userId);
    const limits = subscription 
      ? SubscriptionService.getInstance().getSubscriptionLimits(subscription.tier)
      : SubscriptionService.getInstance().getSubscriptionLimits('basic');

    res.status(200).json({
      status: 'success',
      data: {
        subscription,
        limits
      }
    });
  });

  /**
   * Cancel subscription
   * POST /api/subscription/cancel
   */
  static cancelSubscription = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({
        status: 'error',
        message: 'Authentication required'
      });
      return;
    }

    await SubscriptionService.getInstance().cancelSubscription(userId);

    logger.info(`User ${userId} cancelled subscription`);

    res.status(200).json({
      status: 'success',
      message: 'Subscription cancelled successfully'
    });
  });

  /**
   * Reactivate subscription
   * POST /api/subscription/reactivate
   */
  static reactivateSubscription = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({
        status: 'error',
        message: 'Authentication required'
      });
      return;
    }

    await SubscriptionService.getInstance().reactivateSubscription(userId);

    logger.info(`User ${userId} reactivated subscription`);

    res.status(200).json({
      status: 'success',
      message: 'Subscription reactivated successfully'
    });
  });

  /**
   * Get usage statistics
   * GET /api/subscription/usage
   */
  static getUsageStats = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.user?.id;
    const days = parseInt(req.query.days as string) || 30;

    if (!userId) {
      res.status(401).json({
        status: 'error',
        message: 'Authentication required'
      });
      return;
    }

    const usageStats = await SubscriptionService.getInstance().getUsageStats(userId, days);

    res.status(200).json({
      status: 'success',
      data: {
        usageStats,
        period: `${days} days`
      }
    });
  });

  /**
   * Check message permission
   * GET /api/subscription/can-send
   */
  static checkMessagePermission = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({
        status: 'error',
        message: 'Authentication required'
      });
      return;
    }

    const { canSend, reason } = await SubscriptionService.getInstance().canSendMessage(userId);

    res.status(200).json({
      status: 'success',
      data: {
        canSend,
        reason
      }
    });
  });

  /**
   * Get subscription plans
   * GET /api/subscription/plans
   */
  static getSubscriptionPlans = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const basicLimits = SubscriptionService.getInstance().getSubscriptionLimits('basic');
    const proLimits = SubscriptionService.getInstance().getSubscriptionLimits('pro');

    res.status(200).json({
      status: 'success',
      data: {
        plans: [
          {
            tier: 'basic',
            name: 'Basic Plan',
            dailyMessageLimit: basicLimits.dailyMessageLimit,
            features: basicLimits.features,
            price: '$0/month'
          },
          {
            tier: 'pro',
            name: 'Pro Plan',
            dailyMessageLimit: proLimits.dailyMessageLimit,
            features: proLimits.features,
            price: '$9.99/month'
          }
        ]
      }
    });
  });
} 