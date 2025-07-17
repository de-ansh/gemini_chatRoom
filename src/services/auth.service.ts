import bcrypt from 'bcryptjs';
import { User } from '@prisma/client';
import { DatabaseConfig } from '../config/database.config';
import { RedisConfig } from '../config/redis.config';
import { JWTService } from './jwt.service';
import { OTPService } from './otp.service';
import { 
  ValidationError, 
  AuthenticationError, 
  ConflictError, 
  NotFoundError,
  RateLimitError 
} from '../middleware/error.middleware';
import { Logger } from '../utils/logger';

interface AuthResult {
  user: Omit<User, 'passwordHash'>;
  token: string;
  expiresAt: Date;
}

interface UserData {
  id: string;
  mobileNumber: string;
  name: string | null;
  subscriptionTier: string;
  subscriptionStatus: string;
  stripeCustomerId: string | null;
  dailyMessageCount: number;
  lastMessageDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export class AuthService {
  private static logger = Logger.getInstance();
  private static readonly SALT_ROUNDS = 12;
  private static readonly MAX_OTP_ATTEMPTS = 5;

  /**
   * Register a new user with mobile number
   */
  static async registerUser(data: {
    mobileNumber: string;
    name?: string;
    password?: string;
  }): Promise<{ user: UserData; message: string }> {
    try {
      const db = DatabaseConfig.getClient();
      
      // Format and validate mobile number
      const formattedMobile = OTPService.formatMobileNumber(data.mobileNumber);
      
      // Check if user already exists
      const existingUser = await db.user.findUnique({
        where: { mobileNumber: formattedMobile }
      });

      if (existingUser) {
        throw new ConflictError('User already exists with this mobile number');
      }

      // Hash password if provided
      let passwordHash: string | null = null;
      if (data.password) {
        passwordHash = await bcrypt.hash(data.password, this.SALT_ROUNDS);
      }

      // Create user
      const user = await db.user.create({
        data: {
          mobileNumber: formattedMobile,
          name: data.name || null,
          passwordHash: passwordHash,
          subscriptionTier: 'basic',
          subscriptionStatus: 'active',
          dailyMessageCount: 0
        }
      });

      this.logger.info(`User registered successfully: ${user.id}`);

      // Return user without password hash
      const { passwordHash: _, ...userWithoutPassword } = user;
      return {
        user: {
          ...userWithoutPassword,
          name: userWithoutPassword.name || '', // Ensure name is never null
          lastMessageDate: userWithoutPassword.lastMessageDate || new Date() // Ensure lastMessageDate is never null
        },
        message: 'User registered successfully'
      };
    } catch (error) {
      this.logger.error('User registration failed:', error);
      throw error;
    }
  }

  /**
   * Send OTP for authentication
   */
  static async sendOTP(mobileNumber: string, purpose: 'login' | 'password_reset' = 'login'): Promise<{
    otpCode: string;
    expiresAt: Date;
    message: string;
  }> {
    try {
      const formattedMobile = OTPService.formatMobileNumber(mobileNumber);
      
      // Check rate limiting
      const attempts = await OTPService.getOTPAttempts(formattedMobile);
      if (attempts >= this.MAX_OTP_ATTEMPTS) {
        throw new RateLimitError('Too many OTP requests. Please try again later.');
      }

      // For login, check if user exists
      if (purpose === 'login') {
        const db = DatabaseConfig.getClient();
        const user = await db.user.findUnique({
          where: { mobileNumber: formattedMobile }
        });

        if (!user) {
          throw new NotFoundError('User not found with this mobile number');
        }
      }

      // Generate OTP
      const { otpCode, expiresAt } = await OTPService.generateOTP(formattedMobile, purpose);

      this.logger.info(`OTP sent for ${formattedMobile} (${purpose})`);

      return {
        otpCode, // In production, this would not be returned
        expiresAt,
        message: `OTP sent successfully to ${formattedMobile}`
      };
    } catch (error) {
      this.logger.error('Send OTP failed:', error);
      throw error;
    }
  }

  /**
   * Verify OTP and authenticate user
   */
  static async verifyOTP(
    mobileNumber: string, 
    otpCode: string, 
    purpose: 'login' | 'password_reset' = 'login'
  ): Promise<AuthResult> {
    try {
      const db = DatabaseConfig.getClient();
      const formattedMobile = OTPService.formatMobileNumber(mobileNumber);

      // Verify OTP
      const { isValid } = await OTPService.verifyOTP(formattedMobile, otpCode, purpose);
      
      if (!isValid) {
        throw new AuthenticationError('Invalid or expired OTP');
      }

      // Get user
      const user = await db.user.findUnique({
        where: { mobileNumber: formattedMobile }
      });

      if (!user) {
        throw new NotFoundError('User not found');
      }

      // Generate JWT token
      const token = JWTService.generateToken(user.id, user.mobileNumber);
      const expiresAt = JWTService.getTokenExpiration(token) || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      // Update user's last activity
      await db.user.update({
        where: { id: user.id },
        data: { updatedAt: new Date() }
      });

      this.logger.info(`User authenticated successfully: ${user.id}`);

      // Return user without password hash
      const { passwordHash: _, ...userWithoutPassword } = user;

      return {
        user: userWithoutPassword,
        token,
        expiresAt
      };
    } catch (error) {
      this.logger.error('OTP verification failed:', error);
      throw error;
    }
  }

  /**
   * Change user password (authenticated user)
   */
  static async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<{
    message: string;
  }> {
    try {
      const db = DatabaseConfig.getClient();

      // Get user
      const user = await db.user.findUnique({
        where: { id: userId }
      });

      if (!user) {
        throw new NotFoundError('User not found');
      }

      // Verify current password
      if (user.passwordHash) {
        const isValidPassword = await bcrypt.compare(currentPassword, user.passwordHash);
        if (!isValidPassword) {
          throw new AuthenticationError('Current password is incorrect');
        }
      }

      // Hash new password
      const newPasswordHash = await bcrypt.hash(newPassword, this.SALT_ROUNDS);

      // Update password
      await db.user.update({
        where: { id: userId },
        data: { 
          passwordHash: newPasswordHash,
          updatedAt: new Date()
        }
      });

      this.logger.info(`Password changed successfully for user: ${userId}`);

      return {
        message: 'Password changed successfully'
      };
    } catch (error) {
      this.logger.error('Password change failed:', error);
      throw error;
    }
  }

  /**
   * Reset password using OTP
   */
  static async resetPassword(mobileNumber: string, otpCode: string, newPassword: string): Promise<{
    message: string;
  }> {
    try {
      const db = DatabaseConfig.getClient();
      const formattedMobile = OTPService.formatMobileNumber(mobileNumber);

      // Verify OTP
      const { isValid } = await OTPService.verifyOTP(formattedMobile, otpCode, 'password_reset');
      
      if (!isValid) {
        throw new AuthenticationError('Invalid or expired OTP');
      }

      // Get user
      const user = await db.user.findUnique({
        where: { mobileNumber: formattedMobile }
      });

      if (!user) {
        throw new NotFoundError('User not found');
      }

      // Hash new password
      const newPasswordHash = await bcrypt.hash(newPassword, this.SALT_ROUNDS);

      // Update password
      await db.user.update({
        where: { id: user.id },
        data: { 
          passwordHash: newPasswordHash,
          updatedAt: new Date()
        }
      });

      this.logger.info(`Password reset successfully for user: ${user.id}`);

      return {
        message: 'Password reset successfully'
      };
    } catch (error) {
      this.logger.error('Password reset failed:', error);
      throw error;
    }
  }

  /**
   * Get user by ID
   */
  static async getUserById(userId: string): Promise<UserData> {
    try {
      this.logger.debug(`Getting user by ID: ${userId}`);
      
      const db = DatabaseConfig.getClient();
      this.logger.debug('Database client obtained');
      
      this.logger.debug('Executing database query...');
      const user = await db.user.findUnique({
        where: { id: userId }
      });
      this.logger.debug('Database query completed');

      if (!user) {
        this.logger.debug('User not found');
        throw new NotFoundError('User not found');
      }

      this.logger.debug('User found, processing response');
      // Return user without password hash
      const { passwordHash: _, ...userWithoutPassword } = user;
      this.logger.debug('User data processed successfully');
      return userWithoutPassword;
    } catch (error) {
      this.logger.error('Get user failed:', error);
      throw error;
    }
  }

  /**
   * Get user by mobile number
   */
  static async getUserByMobile(mobileNumber: string): Promise<UserData | null> {
    try {
      const db = DatabaseConfig.getClient();
      const formattedMobile = OTPService.formatMobileNumber(mobileNumber);
      
      const user = await db.user.findUnique({
        where: { mobileNumber: formattedMobile }
      });

      if (!user) {
        return null;
      }

      // Return user without password hash
      const { passwordHash: _, ...userWithoutPassword } = user;
      return userWithoutPassword;
    } catch (error) {
      this.logger.error('Get user by mobile failed:', error);
      throw error;
    }
  }

  /**
   * Update user profile
   */
  static async updateProfile(userId: string, data: { name?: string }): Promise<UserData> {
    try {
      const db = DatabaseConfig.getClient();
      
      const user = await db.user.update({
        where: { id: userId },
        data: {
          ...data,
          updatedAt: new Date()
        }
      });

      // Return user without password hash
      const { passwordHash: _, ...userWithoutPassword } = user;
      return userWithoutPassword;
    } catch (error) {
      this.logger.error('Update profile failed:', error);
      throw error;
    }
  }

  /**
   * Check if user exists
   */
  static async userExists(mobileNumber: string): Promise<boolean> {
    try {
      const db = DatabaseConfig.getClient();
      const formattedMobile = OTPService.formatMobileNumber(mobileNumber);
      
      const user = await db.user.findUnique({
        where: { mobileNumber: formattedMobile }
      });

      return !!user;
    } catch (error) {
      this.logger.error('User exists check failed:', error);
      return false;
    }
  }

  /**
   * Validate password strength
   */
  static validatePassword(password: string): { isValid: boolean; message?: string } {
    if (password.length < 8) {
      return { isValid: false, message: 'Password must be at least 8 characters long' };
    }

    if (!/(?=.*[a-z])/.test(password)) {
      return { isValid: false, message: 'Password must contain at least one lowercase letter' };
    }

    if (!/(?=.*[A-Z])/.test(password)) {
      return { isValid: false, message: 'Password must contain at least one uppercase letter' };
    }

    if (!/(?=.*\d)/.test(password)) {
      return { isValid: false, message: 'Password must contain at least one number' };
    }

    if (!/(?=.*[!@#$%^&*])/.test(password)) {
      return { isValid: false, message: 'Password must contain at least one special character (!@#$%^&*)' };
    }

    return { isValid: true };
  }

  /**
   * Delete user account
   */
  static async deleteUser(userId: string): Promise<void> {
    try {
      const db = DatabaseConfig.getClient();
      
      // Delete user
      await db.user.delete({
        where: { id: userId }
      });

      this.logger.info(`User account deleted: ${userId}`);
    } catch (error) {
      this.logger.error('Delete user failed:', error);
      throw error;
    }
  }
} 