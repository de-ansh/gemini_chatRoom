import { Request, Response, NextFunction } from 'express';
import { body, validationResult, ValidationChain } from 'express-validator';
import { ValidationError } from './error.middleware';
import { Logger } from '../utils/logger';

const logger = Logger.getInstance();

/**
 * Middleware to handle validation errors
 */
export const handleValidationErrors = (req: Request, res: Response, next: NextFunction): void => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(error => ({
      field: error.type === 'field' ? error.path : 'unknown',
      message: error.msg
    }));
    
    logger.warn('Validation failed:', errorMessages);
    
    res.status(400).json({
      status: 'error',
      message: 'Validation failed',
      errors: errorMessages
    });
    return;
  }
  
  next();
};

/**
 * Validation rules for user registration
 */
export const validateUserRegistration: ValidationChain[] = [
  body('mobileNumber')
    .notEmpty()
    .withMessage('Mobile number is required')
    .isLength({ min: 10, max: 15 })
    .withMessage('Mobile number must be between 10-15 digits')
    .matches(/^[0-9]+$/)
    .withMessage('Mobile number must contain only digits')
    .custom((value) => {
      if (value.startsWith('0')) {
        throw new Error('Mobile number cannot start with 0');
      }
      return true;
    }),
  
  body('name')
    .optional()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2-100 characters')
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('Name must contain only letters and spaces'),
  
  body('password')
    .optional()
    .isLength({ min: 8, max: 128 })
    .withMessage('Password must be between 8-128 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).*$/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number')
];

/**
 * Validation rules for sending OTP
 */
export const validateSendOTP: ValidationChain[] = [
  body('mobileNumber')
    .notEmpty()
    .withMessage('Mobile number is required')
    .isLength({ min: 10, max: 15 })
    .withMessage('Mobile number must be between 10-15 digits')
    .matches(/^[0-9]+$/)
    .withMessage('Mobile number must contain only digits')
    .custom((value) => {
      if (value.startsWith('0')) {
        throw new Error('Mobile number cannot start with 0');
      }
      return true;
    }),
  
  body('purpose')
    .optional()
    .isIn(['login', 'password_reset'])
    .withMessage('Purpose must be either "login" or "password_reset"')
];

/**
 * Validation rules for OTP verification
 */
export const validateVerifyOTP: ValidationChain[] = [
  body('mobileNumber')
    .notEmpty()
    .withMessage('Mobile number is required')
    .isLength({ min: 10, max: 15 })
    .withMessage('Mobile number must be between 10-15 digits')
    .matches(/^[0-9]+$/)
    .withMessage('Mobile number must contain only digits'),
  
  body('otpCode')
    .notEmpty()
    .withMessage('OTP code is required')
    .isLength({ min: 6, max: 6 })
    .withMessage('OTP code must be exactly 6 digits')
    .matches(/^[0-9]+$/)
    .withMessage('OTP code must contain only digits'),
  
  body('purpose')
    .optional()
    .isIn(['login', 'password_reset'])
    .withMessage('Purpose must be either "login" or "password_reset"')
];

/**
 * Validation rules for password change
 */
export const validateChangePassword: ValidationChain[] = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required')
    .isLength({ min: 1, max: 128 })
    .withMessage('Current password cannot be empty'),
  
  body('newPassword')
    .isLength({ min: 8, max: 128 })
    .withMessage('New password must be between 8-128 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).*$/)
    .withMessage('New password must contain at least one uppercase letter, one lowercase letter, and one number')
    .custom((value, { req }) => {
      if (value === req.body.currentPassword) {
        throw new Error('New password must be different from current password');
      }
      return true;
    }),
  
  body('confirmPassword')
    .notEmpty()
    .withMessage('Password confirmation is required')
    .custom((value, { req }) => {
      if (value !== req.body.newPassword) {
        throw new Error('Password confirmation does not match');
      }
      return true;
    })
];

/**
 * Validation rules for password reset
 */
export const validatePasswordReset: ValidationChain[] = [
  body('mobileNumber')
    .notEmpty()
    .withMessage('Mobile number is required')
    .isLength({ min: 10, max: 15 })
    .withMessage('Mobile number must be between 10-15 digits')
    .matches(/^[0-9]+$/)
    .withMessage('Mobile number must contain only digits'),
  
  body('otpCode')
    .notEmpty()
    .withMessage('OTP code is required')
    .isLength({ min: 6, max: 6 })
    .withMessage('OTP code must be exactly 6 digits')
    .matches(/^[0-9]+$/)
    .withMessage('OTP code must contain only digits'),
  
  body('newPassword')
    .isLength({ min: 8, max: 128 })
    .withMessage('New password must be between 8-128 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).*$/)
    .withMessage('New password must contain at least one uppercase letter, one lowercase letter, and one number'),
  
  body('confirmPassword')
    .notEmpty()
    .withMessage('Password confirmation is required')
    .custom((value, { req }) => {
      if (value !== req.body.newPassword) {
        throw new Error('Password confirmation does not match');
      }
      return true;
    })
];

/**
 * Validation rules for profile update
 */
export const validateProfileUpdate: ValidationChain[] = [
  body('name')
    .optional()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2-100 characters')
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('Name must contain only letters and spaces')
];

/**
 * Validation rules for chatroom creation
 */
export const validateChatroomCreation: ValidationChain[] = [
  body('name')
    .notEmpty()
    .withMessage('Chatroom name is required')
    .isLength({ min: 1, max: 100 })
    .withMessage('Chatroom name must be between 1-100 characters')
    .trim(),
  
  body('description')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Description must be less than 500 characters')
    .trim()
];

/**
 * Validation rules for sending messages
 */
export const validateSendMessage: ValidationChain[] = [
  body('content')
    .notEmpty()
    .withMessage('Message content is required')
    .isLength({ min: 1, max: 5000 })
    .withMessage('Message content must be between 1-5000 characters')
    .trim()
];

/**
 * Custom validation function for mobile number format
 */
export const validateMobileNumber = (value: string): boolean => {
  const mobileRegex = /^[1-9]\d{9}$/;
  return mobileRegex.test(value);
};

/**
 * Custom validation function for password strength
 */
export const validatePasswordStrength = (value: string): boolean => {
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
  return passwordRegex.test(value);
};

/**
 * Sanitize mobile number (remove spaces, dashes, etc.)
 */
export const sanitizeMobileNumber = (req: Request, res: Response, next: NextFunction): void => {
  if (req.body.mobileNumber) {
    req.body.mobileNumber = req.body.mobileNumber.replace(/\D/g, '');
  }
  next();
};

/**
 * Sanitize string inputs (trim whitespace)
 */
export const sanitizeStrings = (req: Request, res: Response, next: NextFunction): void => {
  const fieldsToSanitize = ['name', 'content', 'description'];
  
  fieldsToSanitize.forEach(field => {
    if (req.body[field] && typeof req.body[field] === 'string') {
      req.body[field] = req.body[field].trim();
    }
  });
  
  next();
};

/**
 * Validation middleware factory
 */
export const validate = (validations: ValidationChain[]) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // Run all validations
    await Promise.all(validations.map(validation => validation.run(req)));
    
    // Handle validation errors
    handleValidationErrors(req, res, next);
  };
};

/**
 * Check if request contains only allowed fields
 */
export const allowedFields = (allowedFields: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const requestFields = Object.keys(req.body);
    const extraFields = requestFields.filter(field => !allowedFields.includes(field));
    
    if (extraFields.length > 0) {
      logger.warn(`Extra fields detected: ${extraFields.join(', ')}`);
      res.status(400).json({
        status: 'error',
        message: 'Invalid fields in request',
        extraFields
      });
      return;
    }
    
    next();
  };
}; 