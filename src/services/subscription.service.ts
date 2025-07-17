import { DatabaseConfig } from '../config/database.config';
import { StripeService } from './stripe.service';
import { Logger } from '../utils/logger';
import { NotFoundError, ConflictError, PaymentError } from '../middleware/error.middleware';
import { AppConfig } from '../config/app.config';

export interface SubscriptionData {
  userId: string;
  tier: 'basic' | 'pro';
  status: 'active' | 'canceled' | 'incomplete' | 'past_due' | 'unpaid';
  stripeSubscriptionId: string | undefined;
  stripePriceId: string | undefined;
  currentPeriodStart: Date | undefined;
  currentPeriodEnd: Date | undefined;
}

export interface UsageData {
  userId: string;
  date: Date;
  messageCount: number;
}

export interface SubscriptionLimits {
  dailyMessageLimit: number;
  features: string[];
}

export class SubscriptionService {
  private static instance: SubscriptionService;
  private logger = Logger.getInstance();
  private stripeService: StripeService;

  private constructor() {
    this.stripeService = StripeService.getInstance();
  }

  static getInstance(): SubscriptionService {
    if (!SubscriptionService.instance) {
      SubscriptionService.instance = new SubscriptionService();
    }
    return SubscriptionService.instance;
  }

  /**
   * Create a new subscription
   */
  async createSubscription(userId: string, tier: 'basic' | 'pro'): Promise<SubscriptionData> {
    try {
      const db = DatabaseConfig.getClient();

      // Get user
      const user = await db.user.findUnique({
        where: { id: userId }
      });

      if (!user) {
        throw new NotFoundError('User not found');
      }

      // Check if user already has a subscription
      const existingSubscription = await db.subscription.findUnique({
        where: { userId }
      });

      if (existingSubscription) {
        throw new ConflictError('User already has a subscription');
      }

      // Get Stripe price ID for the tier
      const priceIds = this.stripeService.getPriceIds();
      const priceId = tier === 'pro' ? priceIds.pro : priceIds.basic;

      // Create or get Stripe customer
      let customerId = user.stripeCustomerId;
      if (!customerId) {
        const customerData: any = {
          userId,
          mobileNumber: user.mobileNumber,
        };

        // Only add name if it is defined
        if (user.name) {
          customerData.name = user.name;
        }

        const customer = await this.stripeService.createCustomer(customerData);
        customerId = customer.id;

        // Update user with customer ID
        await db.user.update({
          where: { id: userId },
          data: { stripeCustomerId: customerId }
        });
      }

      // Create Stripe subscription
      const stripeSubscription = await this.stripeService.createSubscription({
        userId,
        customerId,
        priceId,
        metadata: { tier }
      });

      // Create subscription record
      const subscription = await db.subscription.create({
        data: {
          userId,
          stripeSubscriptionId: stripeSubscription.id,
          stripePriceId: priceId,
          stripeCurrentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
          stripeCurrentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
          status: stripeSubscription.status,
          tier
        }
      });

      // Update user subscription tier
      await db.user.update({
        where: { id: userId },
        data: { 
          subscriptionTier: tier,
          subscriptionStatus: stripeSubscription.status
        }
      });

      this.logger.info(`Subscription created for user ${userId}: ${tier} tier`);

      return {
        userId,
        tier,
        status: subscription.status as any,
        stripeSubscriptionId: subscription.stripeSubscriptionId || undefined,
        stripePriceId: subscription.stripePriceId || undefined,
        currentPeriodStart: subscription.stripeCurrentPeriodStart || undefined,
        currentPeriodEnd: subscription.stripeCurrentPeriodEnd || undefined,
      };
    } catch (error) {
      this.logger.error('Failed to create subscription:', error);
      throw error;
    }
  }

  /**
   * Get subscription details
   */
  async getSubscription(userId: string): Promise<SubscriptionData | null> {
    try {
      const db = DatabaseConfig.getClient();

      const subscription = await db.subscription.findUnique({
        where: { userId }
      });

      if (!subscription) {
        return null;
      }

      return {
        userId,
        tier: subscription.tier as 'basic' | 'pro',
        status: subscription.status as any,
        stripeSubscriptionId: subscription.stripeSubscriptionId || undefined,
        stripePriceId: subscription.stripePriceId || undefined,
        currentPeriodStart: subscription.stripeCurrentPeriodStart || undefined,
        currentPeriodEnd: subscription.stripeCurrentPeriodEnd || undefined,
      };
    } catch (error) {
      this.logger.error('Failed to get subscription:', error);
      throw error;
    }
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(userId: string): Promise<void> {
    try {
      const db = DatabaseConfig.getClient();

      const subscription = await db.subscription.findUnique({
        where: { userId }
      });

      if (!subscription) {
        throw new NotFoundError('Subscription not found');
      }

      if (!subscription.stripeSubscriptionId) {
        throw new PaymentError('No Stripe subscription ID found');
      }

      // Cancel in Stripe
      await this.stripeService.cancelSubscription(subscription.stripeSubscriptionId);

      // Update local record
      await db.subscription.update({
        where: { userId },
        data: { status: 'canceled' }
      });

      // Update user
      await db.user.update({
        where: { id: userId },
        data: { subscriptionStatus: 'canceled' }
      });

      this.logger.info(`Subscription cancelled for user ${userId}`);
    } catch (error) {
      this.logger.error('Failed to cancel subscription:', error);
      throw error;
    }
  }

  /**
   * Reactivate subscription
   */
  async reactivateSubscription(userId: string): Promise<void> {
    try {
      const db = DatabaseConfig.getClient();

      const subscription = await db.subscription.findUnique({
        where: { userId }
      });

      if (!subscription) {
        throw new NotFoundError('Subscription not found');
      }

      if (!subscription.stripeSubscriptionId) {
        throw new PaymentError('No Stripe subscription ID found');
      }

      // Reactivate in Stripe
      await this.stripeService.reactivateSubscription(subscription.stripeSubscriptionId);

      // Update local record
      await db.subscription.update({
        where: { userId },
        data: { status: 'active' }
      });

      // Update user
      await db.user.update({
        where: { id: userId },
        data: { subscriptionStatus: 'active' }
      });

      this.logger.info(`Subscription reactivated for user ${userId}`);
    } catch (error) {
      this.logger.error('Failed to reactivate subscription:', error);
      throw error;
    }
  }

  /**
   * Track message usage
   */
  async trackMessageUsage(userId: string): Promise<void> {
    try {
      const db = DatabaseConfig.getClient();
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Get or create daily usage record
      let usage = await db.dailyUsage.findUnique({
        where: {
          userId_date: {
            userId,
            date: today
          }
        }
      });

      if (!usage) {
        usage = await db.dailyUsage.create({
          data: {
            userId,
            date: today,
            messageCount: 1
          }
        });
      } else {
        usage = await db.dailyUsage.update({
          where: { id: usage.id },
          data: { messageCount: usage.messageCount + 1 }
        });
      }

      // Update user's daily message count
      await db.user.update({
        where: { id: userId },
        data: {
          dailyMessageCount: usage.messageCount,
          lastMessageDate: new Date()
        }
      });

      this.logger.debug(`Message usage tracked for user ${userId}: ${usage.messageCount} messages today`);
    } catch (error) {
      this.logger.error('Failed to track message usage:', error);
      throw error;
    }
  }

  /**
   * Check if user can send message
   */
  async canSendMessage(userId: string): Promise<{ canSend: boolean; reason?: string }> {
    try {
      const db = DatabaseConfig.getClient();

      const user = await db.user.findUnique({
        where: { id: userId }
      });

      if (!user) {
        return { canSend: false, reason: 'User not found' };
      }

      // Check subscription status
      if (user.subscriptionStatus !== 'active') {
        return { canSend: false, reason: 'Inactive subscription' };
      }

      // Get limits for the tier
      const limits = this.getSubscriptionLimits(user.subscriptionTier as 'basic' | 'pro');

      // Check daily message limit
      if (user.dailyMessageCount >= limits.dailyMessageLimit) {
        return { canSend: false, reason: 'Daily message limit exceeded' };
      }

      return { canSend: true };
    } catch (error) {
      this.logger.error('Failed to check message permission:', error);
      return { canSend: false, reason: 'System error' };
    }
  }

  /**
   * Get subscription limits for a tier
   */
  getSubscriptionLimits(tier: 'basic' | 'pro'): SubscriptionLimits {
    if (tier === 'pro') {
      return {
        dailyMessageLimit: AppConfig.proTierDailyLimit,
        features: ['unlimited_messages', 'priority_support', 'advanced_ai']
      };
    } else {
      return {
        dailyMessageLimit: AppConfig.basicTierDailyLimit,
        features: ['basic_messages', 'standard_support']
      };
    }
  }

  /**
   * Get usage statistics
   */
  async getUsageStats(userId: string, days: number = 30): Promise<UsageData[]> {
    try {
      const db = DatabaseConfig.getClient();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const usage = await db.dailyUsage.findMany({
        where: {
          userId,
          date: {
            gte: startDate
          }
        },
        orderBy: { date: 'desc' }
      });

      return usage.map(u => ({
        userId: u.userId,
        date: u.date,
        messageCount: u.messageCount
      }));
    } catch (error) {
      this.logger.error('Failed to get usage stats:', error);
      throw error;
    }
  }

  /**
   * Reset daily usage (called by cron job)
   */
  async resetDailyUsage(): Promise<void> {
    try {
      const db = DatabaseConfig.getClient();

      // Reset all users' daily message count
      await db.user.updateMany({
        data: { dailyMessageCount: 0 }
      });

      this.logger.info('Daily message usage reset for all users');
    } catch (error) {
      this.logger.error('Failed to reset daily usage:', error);
      throw error;
    }
  }

  /**
   * Update subscription from webhook
   */
  async updateSubscriptionFromWebhook(stripeSubscriptionId: string, status: string): Promise<void> {
    try {
      const db = DatabaseConfig.getClient();

      const subscription = await db.subscription.findUnique({
        where: { stripeSubscriptionId }
      });

      if (!subscription) {
        this.logger.warn(`Subscription not found for Stripe ID: ${stripeSubscriptionId}`);
        return;
      }

      // Update subscription status
      await db.subscription.update({
        where: { id: subscription.id },
        data: { status }
      });

      // Update user subscription status
      await db.user.update({
        where: { id: subscription.userId },
        data: { subscriptionStatus: status }
      });

      this.logger.info(`Subscription status updated for user ${subscription.userId}: ${status}`);
    } catch (error) {
      this.logger.error('Failed to update subscription from webhook:', error);
      throw error;
    }
  }
} 