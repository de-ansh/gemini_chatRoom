import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { authRateLimiter } from '../middleware/rateLimiter.middleware';
import {
  validateUserRegistration,
  validateSendOTP,
  validateVerifyOTP,
  validateChangePassword,
  validatePasswordReset,
  sanitizeMobileNumber,
  sanitizeStrings,
  allowedFields,
  validate
} from '../middleware/validation.middleware';
import { simpleAuthenticate } from '@/middleware/auth.middleware';

const router = Router();

// Apply rate limiting to all auth routes
router.use(authRateLimiter);

// Apply sanitization to all routes
router.use(sanitizeMobileNumber);
router.use(sanitizeStrings);

// Public routes (no authentication required)
router.post('/signup', 
  allowedFields(['mobileNumber', 'name', 'password']),
  validate(validateUserRegistration),
  AuthController.signup
);

router.post('/send-otp', 
  allowedFields(['mobileNumber', 'purpose']),
  validate(validateSendOTP),
  AuthController.sendOTP
);

router.post('/verify-otp', 
  allowedFields(['mobileNumber', 'otpCode', 'purpose']),
  validate(validateVerifyOTP),
  AuthController.verifyOTP
);

router.post('/forgot-password', 
  allowedFields(['mobileNumber']),
  validate(validateSendOTP),
  AuthController.forgotPassword
);

router.post('/reset-password', 
  allowedFields(['mobileNumber', 'otpCode', 'newPassword', 'confirmPassword']),
  validate(validatePasswordReset),
  AuthController.resetPassword
);

router.post('/check-mobile', 
  allowedFields(['mobileNumber']),
  validate(validateSendOTP),
  AuthController.checkMobile
);

router.post('/otp-status', 
  allowedFields(['mobileNumber', 'purpose']),
  validate(validateSendOTP),
  AuthController.getOTPStatus
);

// Protected routes (authentication required)
router.post('/change-password', 
  simpleAuthenticate,
  allowedFields(['currentPassword', 'newPassword', 'confirmPassword']),
  validate(validateChangePassword),
  AuthController.changePassword
);

router.post('/logout', 
  simpleAuthenticate,
  AuthController.logout
);

router.post('/refresh', 
  simpleAuthenticate,
  AuthController.refreshToken
);

router.get('/history', 
  simpleAuthenticate,
  AuthController.getAuthHistory
);

router.get('/profile', 
  simpleAuthenticate,
  AuthController.getProfile
);

export default router; 