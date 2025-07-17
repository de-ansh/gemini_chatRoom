import { Request, Response } from 'express';
import { StripeService } from '../services/stripe.service';
import { SubscriptionService } from '../services/subscription.service';
import { asyncHandler } from '../middleware/error.middleware';
import { Logger } from '../utils/logger';

const logger = Logger.getInstance();

export class WebhookController {
  /**
   * Handle Stripe webhook events
   * POST /api/webhook/stripe
   */
  static handleStripeWebhook = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const signature = req.headers['stripe-signature'] as string;
    
    if (!signature) {
      res.status(400).json({
        status: 'error',
        message: 'Missing Stripe signature'
      });
      return;
    }

    try {
      // Verify webhook signature
      const event = StripeService.getInstance().verifyWebhookSignature(
        JSON.stringify(req.body),
        signature
      );

      logger.info(`Received Stripe webhook: ${event.type}`);

      // Handle different event types
      switch (event.type) {
        case 'customer.subscription.created':
          await WebhookController.handleSubscriptionCreated(event.data.object);
          break;

        case 'customer.subscription.updated':
          await WebhookController.handleSubscriptionUpdated(event.data.object);
          break;

        case 'customer.subscription.deleted':
          await WebhookController.handleSubscriptionDeleted(event.data.object);
          break;

        case 'invoice.payment_succeeded':
          await WebhookController.handlePaymentSucceeded(event.data.object);
          break;

        case 'invoice.payment_failed':
          await WebhookController.handlePaymentFailed(event.data.object);
          break;

        case 'customer.subscription.trial_will_end':
          await WebhookController.handleTrialWillEnd(event.data.object);
          break;

        default:
          logger.info(`Unhandled Stripe event type: ${event.type}`);
      }

      res.status(200).json({
        status: 'success',
        message: 'Webhook processed successfully'
      });
    } catch (error) {
      logger.error('Stripe webhook processing failed:', error);
      res.status(400).json({
        status: 'error',
        message: 'Webhook processing failed'
      });
    }
  });

  /**
   * Handle subscription created event
   */
  private static async handleSubscriptionCreated(subscription: any): Promise<void> {
    try {
      logger.info(`Subscription created: ${subscription.id}`);
      
      // Update subscription status in database
      await SubscriptionService.getInstance().updateSubscriptionFromWebhook(
        subscription.id,
        subscription.status
      );
    } catch (error) {
      logger.error('Failed to handle subscription created:', error);
    }
  }

  /**
   * Handle subscription updated event
   */
  private static async handleSubscriptionUpdated(subscription: any): Promise<void> {
    try {
      logger.info(`Subscription updated: ${subscription.id}`);
      
      // Update subscription status in database
      await SubscriptionService.getInstance().updateSubscriptionFromWebhook(
        subscription.id,
        subscription.status
      );
    } catch (error) {
      logger.error('Failed to handle subscription updated:', error);
    }
  }

  /**
   * Handle subscription deleted event
   */
  private static async handleSubscriptionDeleted(subscription: any): Promise<void> {
    try {
      logger.info(`Subscription deleted: ${subscription.id}`);
      
      // Update subscription status in database
      await SubscriptionService.getInstance().updateSubscriptionFromWebhook(
        subscription.id,
        'canceled'
      );
    } catch (error) {
      logger.error('Failed to handle subscription deleted:', error);
    }
  }

  /**
   * Handle payment succeeded event
   */
  private static async handlePaymentSucceeded(invoice: any): Promise<void> {
    try {
      logger.info(`Payment succeeded for invoice: ${invoice.id}`);
      
      if (invoice.subscription) {
        // Update subscription status
        await SubscriptionService.getInstance().updateSubscriptionFromWebhook(
          invoice.subscription,
          'active'
        );
      }
    } catch (error) {
      logger.error('Failed to handle payment succeeded:', error);
    }
  }

  /**
   * Handle payment failed event
   */
  private static async handlePaymentFailed(invoice: any): Promise<void> {
    try {
      logger.info(`Payment failed for invoice: ${invoice.id}`);
      
      if (invoice.subscription) {
        // Update subscription status
        await SubscriptionService.getInstance().updateSubscriptionFromWebhook(
          invoice.subscription,
          'past_due'
        );
      }
    } catch (error) {
      logger.error('Failed to handle payment failed:', error);
    }
  }

  /**
   * Handle trial will end event
   */
  private static async handleTrialWillEnd(subscription: any): Promise<void> {
    try {
      logger.info(`Trial will end for subscription: ${subscription.id}`);
      
      // You could send notification emails here
      // For now, just log the event
    } catch (error) {
      logger.error('Failed to handle trial will end:', error);
    }
  }

  /**
   * Health check for webhooks
   * GET /api/webhook/health
   */
  static webhookHealth = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const stripeHealth = await StripeService.getInstance().healthCheck();

    res.status(200).json({
      status: 'success',
      data: {
        stripe: stripeHealth,
        timestamp: new Date().toISOString()
      }
    });
  });

  /**
   * Test webhook endpoint (for development)
   * POST /api/webhook/test
   */
  static testWebhook = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    logger.info('Test webhook received', { body: req.body });

    res.status(200).json({
      status: 'success',
      message: 'Test webhook received',
      data: {
        timestamp: new Date().toISOString(),
        body: req.body
      }
    });
  });
} 