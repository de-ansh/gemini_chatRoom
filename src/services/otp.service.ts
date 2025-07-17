import { DatabaseConfig } from '../config/database.config';
import { ValidationError, NotFoundError } from '../middleware/error.middleware';
import { Logger } from '../utils/logger';
import { RedisConfig } from '../config/redis.config';
import { CacheService } from '../services/cache.service';

interface OTPData {
  id: string;
  mobileNumber: string;
  otpCode: string;
  purpose: 'login' | 'password_reset';
  expiresAt: Date;
  isVerified: boolean;
}

export class OTPService {
  private static logger = Logger.getInstance();
  private static readonly OTP_EXPIRY_MINUTES = 5;
  private static readonly OTP_LENGTH = 6;

  /**
   * Generate a random OTP code
   */
  private static generateOTPCode(): string {
    const min = Math.pow(10, this.OTP_LENGTH - 1);
    const max = Math.pow(10, this.OTP_LENGTH) - 1;
    return Math.floor(Math.random() * (max - min + 1) + min).toString();
  }

  /**
   * Generate and store OTP for mobile number
   */
  static async generateOTP(
    mobileNumber: string, 
    purpose: 'login' | 'password_reset' = 'login'
  ): Promise<{ otpCode: string; expiresAt: Date }> {
    try {
      const db = DatabaseConfig.getClient();
      
      // Validate mobile number format
      if (!this.isValidMobileNumber(mobileNumber)) {
        throw new ValidationError('Invalid mobile number format');
      }

      // Generate OTP
      const otpCode = this.generateOTPCode();
      const expiresAt = new Date(Date.now() + this.OTP_EXPIRY_MINUTES * 60 * 1000);

      // Delete any existing OTPs for this mobile number and purpose
      await db.otp.deleteMany({
        where: {
          mobileNumber,
          purpose,
          isVerified: false
        }
      });

      // Store new OTP
      await db.otp.create({
        data: {
          mobileNumber,
          otpCode,
          purpose,
          expiresAt,
          isVerified: false
        }
      });

      // Cache OTP in Redis for faster lookup
      const cacheKey = `otp:${mobileNumber}:${purpose}`;
      await CacheService.setJson(cacheKey, {
        otpCode,
        expiresAt: expiresAt.toISOString(),
        purpose
      }, this.OTP_EXPIRY_MINUTES * 60);

      this.logger.info(`OTP generated for ${mobileNumber} (${purpose})`);
      
      return {
        otpCode,
        expiresAt
      };
    } catch (error) {
      this.logger.error('OTP generation failed:', error);
      throw error;
    }
  }

  /**
   * Verify OTP code
   */
  static async verifyOTP(
    mobileNumber: string, 
    otpCode: string, 
    purpose: 'login' | 'password_reset' = 'login'
  ): Promise<{ isValid: boolean; otpId?: string }> {
    try {
      const db = DatabaseConfig.getClient();

      // First check Redis cache
      const cacheKey = `otp:${mobileNumber}:${purpose}`;
      const cachedOTP = await CacheService.getJson<{
        otpCode: string;
        expiresAt: string;
        purpose: string;
      }>(cacheKey);

      if (cachedOTP) {
        const isExpired = new Date(cachedOTP.expiresAt) < new Date();
        if (isExpired) {
          await CacheService.del(cacheKey);
          return { isValid: false };
        }

        if (cachedOTP.otpCode !== otpCode) {
          return { isValid: false };
        }
      }

      // Verify against database
      const otpRecord = await db.otp.findFirst({
        where: {
          mobileNumber,
          otpCode,
          purpose,
          isVerified: false,
          expiresAt: {
            gt: new Date()
          }
        }
      });

      if (!otpRecord) {
        this.logger.warn(`OTP verification failed for ${mobileNumber}`);
        return { isValid: false };
      }

      // Mark OTP as verified
      await db.otp.update({
        where: { id: otpRecord.id },
        data: { isVerified: true }
      });

      // Remove from cache
      await CacheService.del(cacheKey);

      this.logger.info(`OTP verified successfully for ${mobileNumber} (${purpose})`);
      
      return {
        isValid: true,
        otpId: otpRecord.id
      };
    } catch (error) {
      this.logger.error('OTP verification failed:', error);
      throw error;
    }
  }

  /**
   * Check if OTP exists and is valid (without marking as verified)
   */
  static async checkOTP(
    mobileNumber: string, 
    otpCode: string, 
    purpose: 'login' | 'password_reset' = 'login'
  ): Promise<boolean> {
    try {
      const db = DatabaseConfig.getClient();

      const otpRecord = await db.otp.findFirst({
        where: {
          mobileNumber,
          otpCode,
          purpose,
          isVerified: false,
          expiresAt: {
            gt: new Date()
          }
        }
      });

      return !!otpRecord;
    } catch (error) {
      this.logger.error('OTP check failed:', error);
      return false;
    }
  }

  /**
   * Clean up expired OTPs
   */
  static async cleanupExpiredOTPs(): Promise<number> {
    try {
      const db = DatabaseConfig.getClient();
      
      const result = await db.otp.deleteMany({
        where: {
          expiresAt: {
            lt: new Date()
          }
        }
      });

      if (result.count > 0) {
        this.logger.info(`Cleaned up ${result.count} expired OTPs`);
      }

      return result.count;
    } catch (error) {
      this.logger.error('OTP cleanup failed:', error);
      return 0;
    }
  }

  /**
   * Get OTP attempts for mobile number (for rate limiting)
   */
  static async getOTPAttempts(mobileNumber: string): Promise<number> {
    try {
      const db = DatabaseConfig.getClient();
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

      const attempts = await db.otp.count({
        where: {
          mobileNumber,
          createdAt: {
            gte: oneHourAgo
          }
        }
      });

      return attempts;
    } catch (error) {
      this.logger.error('Failed to get OTP attempts:', error);
      return 0;
    }
  }

  /**
   * Validate mobile number format
   */
  private static isValidMobileNumber(mobileNumber: string): boolean {
    // Basic validation - customize based on your requirements
    const mobileRegex = /^[1-9]\d{9}$/; // 10-digit number starting with non-zero
    return mobileRegex.test(mobileNumber);
  }

  /**
   * Format mobile number (remove spaces, dashes, etc.)
   */
  static formatMobileNumber(mobileNumber: string): string {
    return mobileNumber.replace(/\D/g, '');
  }

  /**
   * Get remaining OTP validity time
   */
  static async getOTPValidityTime(mobileNumber: string, purpose: 'login' | 'password_reset'): Promise<number> {
    try {
      const db = DatabaseConfig.getClient();
      
      const otpRecord = await db.otp.findFirst({
        where: {
          mobileNumber,
          purpose,
          isVerified: false,
          expiresAt: {
            gt: new Date()
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      if (!otpRecord) {
        return 0;
      }

      const remainingTime = otpRecord.expiresAt.getTime() - Date.now();
      return Math.max(0, Math.floor(remainingTime / 1000)); // Return seconds
    } catch (error) {
      this.logger.error('Failed to get OTP validity time:', error);
      return 0;
    }
  }
} 