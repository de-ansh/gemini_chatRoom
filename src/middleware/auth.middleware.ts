import { Request, Response, NextFunction } from 'express';
import { JWTService } from '../services/jwt.service';
import { AuthenticationError } from './error.middleware';

// Extend Express Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        mobileNumber: string;
      };
    }
  }
}

export async function simpleAuthenticate(req: Request, res: Response, next: NextFunction) {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ status: 'error', message: 'No token provided' });
      return;
    }
    
    const token = authHeader.substring(7);

    // Verify token
    const decoded = JWTService.verifyToken(token);
    
    // Attach minimal user info from token
    req.user = {
      id: decoded.userId,
      mobileNumber: decoded.mobileNumber,
    };

    next();
  } catch (error) {
    res.status(401).json({ status: 'error', message: 'Invalid or expired token' });
  }
}