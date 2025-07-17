import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';
import { Logger } from '../utils/logger';

const logger = Logger.getInstance();

export const rateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    status: 'error',
    message: 'Too many requests from this IP, please try again later.',
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  handler: (req: Request, res: Response) => {
    logger.warn(`Rate limit exceeded for IP: ${req.ip || 'unknown'}`);
    res.status(429).json({
      status: 'error',
      message: 'Too many requests from this IP, please try again later.',
    });
  },
});

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // limit each IP to 50 requests per windowMs for auth endpoints (increased for testing)
  message: {
    status: 'error',
    message: 'Too many authentication attempts, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    logger.warn(`Auth rate limit exceeded for IP: ${req.ip || 'unknown'}`);
    res.status(429).json({
      status: 'error',
      message: 'Too many authentication attempts, please try again later.',
    });
  },
});

export const stripeWebhookRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // Allow more requests for Stripe webhooks
  message: {
    status: 'error',
    message: 'Too many webhook requests.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req: Request) => {
    // Skip rate limiting for Stripe webhooks from known IPs
    const stripeIPs = [
      '54.187.174.169',
      '54.187.205.235',
      '54.187.216.72',
      // Add more Stripe IPs as needed
    ];
    const clientIP = req.ip || req.socket.remoteAddress || 'unknown';
    return stripeIPs.includes(clientIP as string);
  },
}); 