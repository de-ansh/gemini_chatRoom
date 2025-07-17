import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service';
import { OTPService } from '../services/otp.service';
import { asyncHandler } from '../middleware/error.middleware';
import { Logger } from '../utils/logger';

const logger = Logger.getInstance();

export class AuthController {
  /**
   * Register a new user
   * POST /api/auth/signup
   */
  static signup = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { mobileNumber, name, password } = req.body;

    // Validate password if provided
    if (password) {
      const passwordValidation = AuthService.validatePassword(password);
      if (!passwordValidation.isValid) {
        res.status(400).json({
          status: 'error',
          message: passwordValidation.message
        });
        return;
      }
    }

    // Register user
    const result = await AuthService.registerUser({
      mobileNumber,
      name,
      password
    });

    logger.info(`User registered: ${result.user.id}`);

    res.status(201).json({
      status: 'success',
      message: result.message,
      data: {
        user: result.user
      }
    });
  });

  /**
   * Send OTP to mobile number
   * POST /api/auth/send-otp
   */
  static sendOTP = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { mobileNumber, purpose = 'login' } = req.body;

    // Send OTP
    const result = await AuthService.sendOTP(mobileNumber, purpose);

    logger.info(`OTP sent to ${mobileNumber} for ${purpose}`);

    res.status(200).json({
      status: 'success',
      message: result.message,
      data: {
        otpCode: result.otpCode, // In production, remove this
        expiresAt: result.expiresAt,
        purpose
      }
    });
  });

  /**
   * Verify OTP and authenticate user
   * POST /api/auth/verify-otp
   */
  static verifyOTP = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { mobileNumber, otpCode, purpose = 'login' } = req.body;

    // Verify OTP and authenticate
    const result = await AuthService.verifyOTP(mobileNumber, otpCode, purpose);

    logger.info(`OTP verified for user: ${result.user.id}`);

    res.status(200).json({
      status: 'success',
      message: 'Authentication successful',
      data: {
        user: result.user,
        token: result.token,
        expiresAt: result.expiresAt
      }
    });
  });

  /**
   * Send OTP for password reset
   * POST /api/auth/forgot-password
   */
  static forgotPassword = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { mobileNumber } = req.body;

    // Check if user exists
    const userExists = await AuthService.userExists(mobileNumber);
    if (!userExists) {
      res.status(404).json({
        status: 'error',
        message: 'User not found with this mobile number'
      });
      return;
    }

    // Send OTP for password reset
    const result = await AuthService.sendOTP(mobileNumber, 'password_reset');

    logger.info(`Password reset OTP sent to ${mobileNumber}`);

    res.status(200).json({
      status: 'success',
      message: result.message,
      data: {
        otpCode: result.otpCode, // In production, remove this
        expiresAt: result.expiresAt,
        purpose: 'password_reset'
      }
    });
  });

  /**
   * Change password for authenticated user
   * POST /api/auth/change-password
   */
  static changePassword = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { currentPassword, newPassword } = req.body;
    const userId = (req as any).user?.id;

    if (!userId) {
      res.status(401).json({
        status: 'error',
        message: 'Authentication required'
      });
      return;
    }

    // Validate new password
    const passwordValidation = AuthService.validatePassword(newPassword);
    if (!passwordValidation.isValid) {
      res.status(400).json({
        status: 'error',
        message: passwordValidation.message
      });
      return;
    }

    // Change password
    const result = await AuthService.changePassword(userId, currentPassword, newPassword);

    logger.info(`Password changed for user: ${userId}`);

    res.status(200).json({
      status: 'success',
      message: result.message
    });
  });

  /**
   * Reset password using OTP
   * POST /api/auth/reset-password
   */
  static resetPassword = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { mobileNumber, otpCode, newPassword } = req.body;

    // Validate new password
    const passwordValidation = AuthService.validatePassword(newPassword);
    if (!passwordValidation.isValid) {
      res.status(400).json({
        status: 'error',
        message: passwordValidation.message
      });
      return;
    }

    // Reset password
    const result = await AuthService.resetPassword(mobileNumber, otpCode, newPassword);

    logger.info(`Password reset completed for mobile: ${mobileNumber}`);

    res.status(200).json({
      status: 'success',
      message: result.message
    });
  });

  /**
   * Get current user profile
   * GET /api/user/me
   */
  static getProfile = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({
        status: 'error',
        message: 'Authentication required'
      });
      return;
    }

    // Get user profile
    const user = await AuthService.getUserById(userId);

    res.status(200).json({
      status: 'success',
      data: {
        user
      }
    });
  });

  /**
   * Update user profile
   * PUT /api/user/profile
   */
  static updateProfile = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { name } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({
        status: 'error',
        message: 'Authentication required'
      });
      return;
    }

    // Update profile
    const user = await AuthService.updateProfile(userId, { name });

    logger.info(`Profile updated for user: ${userId}`);

    res.status(200).json({
      status: 'success',
      message: 'Profile updated successfully',
      data: {
        user
      }
    });
  });

  /**
   * Check if mobile number is registered
   * POST /api/auth/check-mobile
   */
  static checkMobile = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { mobileNumber } = req.body;

    // Check if user exists
    const userExists = await AuthService.userExists(mobileNumber);
    const user = userExists ? await AuthService.getUserByMobile(mobileNumber) : null;

    res.status(200).json({
      status: 'success',
      data: {
        exists: userExists,
        user: user ? {
          id: user.id,
          name: user.name,
          mobileNumber: user.mobileNumber
        } : null
      }
    });
  });

  /**
   * Logout user (client-side token invalidation)
   * POST /api/auth/logout
   */
  static logout = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.user?.id;

    if (userId) {
      logger.info(`User logged out: ${userId}`);
    }

    res.status(200).json({
      status: 'success',
      message: 'Logged out successfully'
    });
  });

  /**
   * Refresh token (placeholder for future implementation)
   * POST /api/auth/refresh
   */
  static refreshToken = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    res.status(501).json({
      status: 'error',
      message: 'Refresh token functionality not implemented yet'
    });
  });

  /**
   * Get OTP status (remaining validity time)
   * POST /api/auth/otp-status
   */
  static getOTPStatus = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { mobileNumber, purpose = 'login' } = req.body;

    // Get OTP validity time
    const remainingTime = await OTPService.getOTPValidityTime(mobileNumber, purpose);

    res.status(200).json({
      status: 'success',
      data: {
        remainingTime,
        isValid: remainingTime > 0
      }
    });
  });

  /**
   * Get user's authentication history (placeholder)
   * GET /api/auth/history
   */
  static getAuthHistory = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({
        status: 'error',
        message: 'Authentication required'
      });
      return;
    }

    // This would typically fetch from an audit log table
    res.status(200).json({
      status: 'success',
      data: {
        history: []
      }
    });
  });

  /**
   * Delete user account
   * DELETE /api/user/account
   */
  static deleteAccount = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({
        status: 'error',
        message: 'Authentication required'
      });
      return;
    }

    // Delete user account
    await AuthService.deleteUser(userId);

    logger.info(`Account deleted for user: ${userId}`);

    res.status(200).json({
      status: 'success',
      message: 'Account deleted successfully'
    });
  });
} 