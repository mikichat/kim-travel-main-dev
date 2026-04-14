import { Request, Response, NextFunction } from 'express';

interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}

export function errorHandler(
  err: AppError,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Log error with request ID
  console.error(`[${req.id}] Error:`, {
    path: req.path,
    method: req.method,
    error: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });

  // Default error values
  const statusCode = err.statusCode || 500;
  const message = err.isOperational ? err.message : '서버 내부 오류가 발생했습니다.';

  // Security: Don't leak stack traces in production
  const response: {
    success: false;
    message: string;
    error?: string;
    stack?: string;
    requestId: string;
  } = {
    success: false,
    message,
    requestId: req.id,
  };

  // Add error details only in development
  if (process.env.NODE_ENV === 'development') {
    response.error = err.message;
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
}

// Operational error helper
export function operationalError(message: string, statusCode = 400): AppError {
  const error: AppError = new Error(message);
  error.statusCode = statusCode;
  error.isOperational = true;
  return error;
}

// Not found error
export function notFoundError(resource: string): AppError {
  const error: AppError = new Error(`${resource}을(를) 찾을 수 없습니다.`);
  error.statusCode = 404;
  error.isOperational = true;
  return error;
}
