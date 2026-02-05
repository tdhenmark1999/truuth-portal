import { Request, Response, NextFunction } from 'express';

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  console.error('Error:', err);

  // Don't expose internal error details to client
  const message = process.env.NODE_ENV === 'production'
    ? 'An unexpected error occurred. Please try again.'
    : err.message;

  res.status(500).json({
    error: message,
  });
}
