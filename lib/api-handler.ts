/**
 * Shared handler wrapper for Vercel serverless functions.
 * Catches AppError and unexpected errors, returns safe JSON responses.
 * Never leaks stack traces to the client in production.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { AppError, toErrorResponse } from './errors';
import { logger } from './logger';

type Method = 'GET' | 'POST' | 'PATCH' | 'DELETE' | 'PUT';

type RouteHandlers = Partial<Record<Method, (req: VercelRequest, res: VercelResponse) => Promise<void>>>;

export function withMethods(handlers: RouteHandlers) {
  return async (req: VercelRequest, res: VercelResponse): Promise<void> => {
    const method = req.method as Method | undefined;
    const handler = method ? handlers[method] : undefined;

    if (!handler) {
      res.setHeader('Allow', Object.keys(handlers).join(', '));
      res.status(405).json({ error: { code: 'METHOD_NOT_ALLOWED', message: 'Method not allowed.' } });
      return;
    }

    try {
      await handler(req, res);
    } catch (err) {
      const isApp = err instanceof AppError;
      const statusCode = isApp ? err.statusCode : 500;

      if (!isApp) {
        logger.error('Unhandled error in API handler', {
          method: req.method,
          url: req.url,
          error: err instanceof Error ? err.message : String(err),
        });
      }

      res.status(statusCode).json(toErrorResponse(err));
    }
  };
}

/** Verifies the Supabase Auth JWT on admin endpoints. */
import { createClient } from '@supabase/supabase-js';
import { config } from './config';
import { UnauthorizedError } from './errors';

export async function requireAdminAuth(req: VercelRequest): Promise<{ userId: string; email: string }> {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new UnauthorizedError('Authorization header required.');
  }

  const token = authHeader.slice(7);

  // Verify the JWT using Supabase (the service role client can verify any project JWT)
  const userClient = createClient(config.SUPABASE_URL, config.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const { data, error } = await userClient.auth.getUser(token);

  if (error || !data.user) {
    throw new UnauthorizedError('Invalid or expired session.');
  }

  // PENDING: For multi-admin support, add role check here.
  // Currently any authenticated Supabase user with a valid session is treated as admin.
  // Restrict by checking data.user.email against a whitelist in env vars if needed.
  const adminEmails = config.ADMIN_EMAIL.split(',').map(e => e.trim());
  if (!adminEmails.includes(data.user.email ?? '')) {
    throw new UnauthorizedError('Not authorised for admin access.');
  }

  return { userId: data.user.id, email: data.user.email ?? '' };
}

// Simple in-memory rate limiter — does NOT persist across cold starts.
// PENDING: Replace with Redis/Upstash for production at scale.
const rateLimitMap = new Map<string, { count: number; windowStart: number }>();

export function checkRateLimit(
  key: string,
  maxRequests = 10,
  windowMs = 60_000,
): void {
  const now = Date.now();
  const entry = rateLimitMap.get(key);

  if (!entry || now - entry.windowStart > windowMs) {
    rateLimitMap.set(key, { count: 1, windowStart: now });
    return;
  }

  entry.count++;
  if (entry.count > maxRequests) {
    throw new AppError(429, 'RATE_LIMITED', 'Too many requests. Please try again shortly.');
  }
}

/** Returns the caller IP, or 'unknown' if not determinable. */
export function getClientIp(req: VercelRequest): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') return forwarded.split(',')[0]?.trim() ?? 'unknown';
  return 'unknown';
}
