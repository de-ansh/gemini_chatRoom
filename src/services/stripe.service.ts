import Stripe from 'stripe';
import { AppConfig } from '../config/app.config';
import { DatabaseConfig } from '../config/database.config';
import { Logger } from '../utils/logger';
import { NotFoundError, ConflictError } from '../middleware/error.middleware';

export interface CreateCustomerData {
  userId: string;
  mobileNumber: string;
  name?: string;
}

export interface CreateSubscriptionData {
  userId: string;
  customerId: string;
  priceId: string;
  metadata?: Record<string, string>;
}

export interface PaymentIntentData {
  amount: number;
  currency: string;
  customerId: string;
  description?: string;
  metadata?: Record<string, string>;
}

export class StripeService {
  private static instance: StripeService;
  private stripe: Stripe;
  private logger = Logger.getInstance();

  private constructor() {
    this.stripe = new Stripe(AppConfig.stripeSecretKey, {
      apiVersion: '2023-10-16',
    });
  }

  static getInstance(): StripeService {
    if (!StripeService.instance) {
      StripeService.instance = new StripeService();
    }
    return StripeService.instance;
  }

  /**
   * Create a Stripe customer
   */
  async createCustomer(data: CreateCustomerData): Promise<Stripe.Customer> {
    try {
      const customerData: any = {
        phone: data.mobileNumber,
        metadata: {
          userId: data.userId,
          mobileNumber: data.mobileNumber,
        },
      };

      // Only add name if it is defined
      if (data.name) {
        customerData.name = data.name;
      }

      const customer = await this.stripe.customers.create(customerData);

      this.logger.info(`Stripe customer created: ${customer.id} for user: ${data.userId}`);
      return customer;
    } catch (error) {
      this.logger.error('Failed to create Stripe customer:', error);
      throw new Error('Failed to create customer');
    }
  }

  /**
   * Create a subscription
   */
  async createSubscription(data: CreateSubscriptionData): Promise<Stripe.Subscription> {
    try {
      const subscription = await this.stripe.subscriptions.create({
        customer: data.customerId,
        items: [{ price: data.priceId }],
        metadata: {
          userId: data.userId,
          ...data.metadata,
        },
        payment_behavior: 'default_incomplete',
        payment_settings: { save_default_payment_method: 'on_subscription' },
        expand: ['latest_invoice.payment_intent'],
      });

      this.logger.info(`Stripe subscription created: ${subscription.id} for user: ${data.userId}`);
      return subscription;
    } catch (error) {
      this.logger.error('Failed to create Stripe subscription:', error);
      throw new Error('Failed to create subscription');
    }
  }

  /**
   * Cancel a subscription
   */
  async cancelSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
    try {
      const subscription = await this.stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: true,
      });

      this.logger.info(`Stripe subscription cancelled: ${subscriptionId}`);
      return subscription;
    } catch (error) {
      this.logger.error('Failed to cancel Stripe subscription:', error);
      throw new Error('Failed to cancel subscription');
    }
  }

  /**
   * Reactivate a subscription
   */
  async reactivateSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
    try {
      const subscription = await this.stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: false,
      });

      this.logger.info(`Stripe subscription reactivated: ${subscriptionId}`);
      return subscription;
    } catch (error) {
      this.logger.error('Failed to reactivate Stripe subscription:', error);
      throw new Error('Failed to reactivate subscription');
    }
  }

  /**
   * Create a payment intent
   */
  async createPaymentIntent(data: PaymentIntentData): Promise<Stripe.PaymentIntent> {
    try {
      const paymentIntentData: any = {
        amount: data.amount,
        currency: data.currency,
        customer: data.customerId,
        automatic_payment_methods: {
          enabled: true,
        },
      };

      // Only add description and metadata if they are defined
      if (data.description) {
        paymentIntentData.description = data.description;
      }
      if (data.metadata) {
        paymentIntentData.metadata = data.metadata;
      }

      const paymentIntent = await this.stripe.paymentIntents.create(paymentIntentData);

      this.logger.info(`Payment intent created: ${paymentIntent.id}`);
      return paymentIntent;
    } catch (error) {
      this.logger.error('Failed to create payment intent:', error);
      throw new Error('Failed to create payment intent');
    }
  }

  /**
   * Get subscription details
   */
  async getSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
    try {
      const subscription = await this.stripe.subscriptions.retrieve(subscriptionId);
      return subscription;
    } catch (error) {
      this.logger.error('Failed to retrieve subscription:', error);
      throw new Error('Failed to retrieve subscription');
    }
  }

  /**
   * Get customer details
   */
  async getCustomer(customerId: string): Promise<Stripe.Customer> {
    try {
      const customer = await this.stripe.customers.retrieve(customerId);
      if (customer.deleted) {
        throw new NotFoundError('Customer not found');
      }
      return customer as Stripe.Customer;
    } catch (error) {
      this.logger.error('Failed to retrieve customer:', error);
      throw new Error('Failed to retrieve customer');
    }
  }

  /**
   * Update customer
   */
  async updateCustomer(customerId: string, data: Partial<Stripe.CustomerUpdateParams>): Promise<Stripe.Customer> {
    try {
      const customer = await this.stripe.customers.update(customerId, data);
      this.logger.info(`Customer updated: ${customerId}`);
      return customer;
    } catch (error) {
      this.logger.error('Failed to update customer:', error);
      throw new Error('Failed to update customer');
    }
  }

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(payload: string, signature: string): Stripe.Event {
    try {
      const event = this.stripe.webhooks.constructEvent(
        payload,
        signature,
        AppConfig.stripeWebhookSecret
      );
      return event;
    } catch (error) {
      this.logger.error('Webhook signature verification failed:', error);
      throw new Error('Invalid webhook signature');
    }
  }

  /**
   * Get subscription price IDs
   */
  getPriceIds(): { basic: string; pro: string } {
    // These should be configured in environment variables
    return {
      basic: process.env.STRIPE_BASIC_PRICE_ID || 'price_basic',
      pro: process.env.STRIPE_PRO_PRICE_ID || 'price_pro',
    };
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      // Test Stripe API connection
      await this.stripe.customers.list({ limit: 1 });
      return true;
    } catch (error) {
      this.logger.error('Stripe health check failed:', error);
      return false;
    }
  }
} 