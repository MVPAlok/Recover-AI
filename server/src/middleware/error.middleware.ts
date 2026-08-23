import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger.js';
import { metricsService } from '../services/metrics.service.js';

export interface CustomError extends Error {
  statusCode?: number;
  code?: string;
}

/**
 * Sanitizes technical error messages to avoid leaking filesystem paths,
 * Prisma connection strings, or internal secrets to the client.
 */
function sanitizeErrorMessage(rawMessage: string): string {
  if (
    rawMessage.includes('prisma') ||
    rawMessage.includes('SELECT') ||
    rawMessage.includes('INSERT') ||
    rawMessage.includes('postgres://') ||
    rawMessage.includes('postgresql://') ||
    rawMessage.includes('C:\\') ||
    rawMessage.includes('/home/')
  ) {
    return 'A database or internal service error occurred. The operation has been safely halted.';
  }

  // Strip file path references
  return rawMessage.replace(/([A-Z]:\\[^\s:]+)|(\/[^\s:]+\.ts)/gi, '[REDACTED_PATH]');
}

export const errorHandler = (
  err: CustomError,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  const statusCode = err.statusCode || 500;
  const requestId = `req_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const sanitizedMsg = sanitizeErrorMessage(err.message || 'Internal Server Error');

  logger.error(
    `[ErrorHandler] [${requestId}] HTTP ${statusCode} on ${req.method} ${req.originalUrl}: ${err.message}`,
    { stack: err.stack }
  );

  metricsService.recordRequest(0, true);

  res.status(statusCode).json({
    success: false,
    error: {
      code: err.code || (statusCode >= 500 ? 'INTERNAL_SERVER_ERROR' : 'BAD_REQUEST'),
      message: sanitizedMsg,
      requestId,
    },
  });
};
