import { Request, Response, NextFunction } from 'express';

/**
 * Centralized Express error handler.
 * All error responses include { error: "..." } to match the frontend's parseApiError().
 */
export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  console.error('Unhandled error:', err);

  // Plaid errors have a response.data.error_message
  const plaidError = (err as unknown as Record<string, unknown>).response as
    | { data?: { error_message?: string; error_code?: string } }
    | undefined;

  if (plaidError?.data?.error_message) {
    res.status(502).json({
      error: plaidError.data.error_message,
      code: plaidError.data.error_code,
    });
    return;
  }

  res.status(500).json({
    error: err.message || 'Internal server error',
  });
}
