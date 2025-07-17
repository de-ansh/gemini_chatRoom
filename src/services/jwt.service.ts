import jwt, { SignOptions } from 'jsonwebtoken';
import { AppConfig } from '../config/app.config';
import { AuthenticationError } from '../middleware/error.middleware';
import { Logger } from '../utils/logger';

interface JWTPayload {
  userId: string;
  mobileNumber: string;
  iat?: number;
  exp?: number;
}

export class JWTService {
  private static logger = Logger.getInstance();

  /**
   * Generate JWT token for authenticated user
   */
  static generateToken(userId: string, mobileNumber: string): string {
    try {
      const payload: JWTPayload = {
        userId,
        mobileNumber,
      };

      const token = jwt.sign(payload, AppConfig.jwtSecret, {
        expiresIn: AppConfig.jwtExpiresIn,
        issuer: 'gemini-chatroom-backend',
        audience: 'gemini-chatroom-users',
      } as SignOptions);

      this.logger.info(`JWT token generated for user: ${userId}`);
      return token;
    } catch (error) {
      this.logger.error('JWT token generation failed:', error);
      throw new AuthenticationError('Token generation failed');
    }
  }

  /**
   * Verify JWT token and return payload
   */
  static verifyToken(token: string): JWTPayload {
    try {
      const decoded = jwt.verify(token, AppConfig.jwtSecret, {
        issuer: 'gemini-chatroom-backend',
        audience: 'gemini-chatroom-users',
      }) as JWTPayload;

      return decoded;
    } catch (error) {
      this.logger.warn('JWT token verification failed:', error);
      
      if (error instanceof jwt.TokenExpiredError) {
        throw new AuthenticationError('Token has expired');
      }
      
      if (error instanceof jwt.JsonWebTokenError) {
        throw new AuthenticationError('Invalid token');
      }
      
      throw new AuthenticationError('Token verification failed');
    }
  }

  /**
   * Decode JWT token without verification (for debugging)
   */
  static decodeToken(token: string): JWTPayload | null {
    try {
      return jwt.decode(token) as JWTPayload;
    } catch (error) {
      this.logger.error('JWT token decode failed:', error);
      return null;
    }
  }

  /**
   * Get token expiration time
   */
  static getTokenExpiration(token: string): Date | null {
    try {
      const decoded = this.decodeToken(token);
      if (decoded?.exp) {
        return new Date(decoded.exp * 1000);
      }
      return null;
    } catch (error) {
      this.logger.error('Failed to get token expiration:', error);
      return null;
    }
  }

  /**
   * Check if token is expired
   */
  static isTokenExpired(token: string): boolean {
    try {
      const expiration = this.getTokenExpiration(token);
      if (!expiration) return true;
      
      return expiration < new Date();
    } catch (error) {
      return true;
    }
  }

  /**
   * Extract bearer token from Authorization header
   */
  static extractBearerToken(authHeader: string | undefined): string | null {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }
    
    return authHeader.substring(7);
  }

  /**
   * Generate refresh token (for future implementation)
   */
  static generateRefreshToken(userId: string): string {
    try {
      const payload = {
        userId,
        type: 'refresh',
      };

      return jwt.sign(payload, AppConfig.jwtSecret, {
        expiresIn: '30d',
        issuer: 'gemini-chatroom-backend',
        audience: 'gemini-chatroom-users',
      });
    } catch (error) {
      this.logger.error('Refresh token generation failed:', error);
      throw new AuthenticationError('Refresh token generation failed');
    }
  }
} 