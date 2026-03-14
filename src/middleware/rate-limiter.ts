/**
 * Rate Limiting Middleware
 * Configurable per-route rate limits with IP-based tracking
 */

import rateLimit from 'express-rate-limit';
import type { Request, Response } from 'express';

// ============================================
// RATE LIMIT CONFIGURATIONS
// ============================================

/**
 * Global API rate limit - applies to all routes
 */
export const globalLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests. Please try again later.',
      retry_after_seconds: 900
    }
  },
  keyGenerator: (req: Request) => {
    // Use X-Forwarded-For for proxied requests, fallback to IP
    return (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim()
      || req.ip
      || 'unknown';
  },
  skip: (req: Request) => {
    // Don't rate limit health checks
    return req.path === '/health';
  }
});

/**
 * Strict rate limit for portfolio generation (expensive operation)
 */
export const generateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_GENERATE_MAX || '10', 10),
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Portfolio generation limit reached. Please wait before generating another.',
      retry_after_seconds: 900
    }
  },
  keyGenerator: (req: Request) => {
    // Track by user_id if available, else by IP
    const userId = req.body?.user_id;
    if (userId) return `user:${userId}`;
    return (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim()
      || req.ip
      || 'unknown';
  }
});

/**
 * Upload rate limit
 */
export const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_UPLOAD_MAX || '20', 10),
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Upload limit reached. Please wait before uploading more files.',
      retry_after_seconds: 900
    }
  }
});

/**
 * Content extraction rate limit
 */
export const extractLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Content extraction limit reached. Please wait.',
      retry_after_seconds: 300
    }
  }
});

/**
 * SSR page view rate limit (prevent scraping)
 */
export const viewLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req: Request, res: Response) => {
    res.status(429).send('<html><body><h1>Too Many Requests</h1><p>Please slow down.</p></body></html>');
  }
});
