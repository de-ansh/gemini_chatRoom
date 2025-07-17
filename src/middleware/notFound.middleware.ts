import { Request, Response, NextFunction } from 'express';
import { NotFoundError } from './error.middleware';

export const notFoundHandler = (req: Request, res: Response, next: NextFunction) => {
  const error = new NotFoundError(`Route ${req.originalUrl} not found`);
  next(error);
}; 