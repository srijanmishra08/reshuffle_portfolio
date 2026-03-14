/**
 * Security Middleware
 * Helmet, input sanitization, and request validation
 */

import helmet from 'helmet';
import hpp from 'hpp';
import type { Request, Response, NextFunction } from 'express';

// ============================================
// HELMET CONFIGURATION
// ============================================

export const securityHeaders = helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false, // Allow embedding external media
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
});

// ============================================
// HTTP PARAMETER POLLUTION PROTECTION
// ============================================

export const parameterPollutionProtection = hpp();

// ============================================
// INPUT SANITIZATION
// ============================================

/**
 * Sanitize string inputs to prevent XSS
 */
export function sanitizeString(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Deep sanitize an object's string values
 */
export function sanitizeObject(obj: any, depth = 0): any {
  if (depth > 10) return obj; // Prevent infinite recursion
  if (typeof obj === 'string') return sanitizeString(obj);
  if (Array.isArray(obj)) return obj.map(item => sanitizeObject(item, depth + 1));
  if (obj && typeof obj === 'object') {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      // Don't sanitize URLs, file paths, or buffer data
      if (key === 'url' || key === 'file_path' || key === 'buffer' || key === 'source_url') {
        sanitized[key] = value;
      } else {
        sanitized[key] = sanitizeObject(value, depth + 1);
      }
    }
    return sanitized;
  }
  return obj;
}

/**
 * Request body sanitization middleware
 */
export function sanitizeBody(req: Request, _res: Response, next: NextFunction): void {
  if (req.body && typeof req.body === 'object') {
    // Don't sanitize multipart form data (file uploads)
    const contentType = req.headers['content-type'] || '';
    if (!contentType.includes('multipart/form-data')) {
      req.body = sanitizeObject(req.body);
    }
  }
  next();
}

// ============================================
// REQUEST VALIDATION
// ============================================

/**
 * Reject requests with excessively large payloads
 */
export function payloadSizeGuard(maxSizeMB: number = 50) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const contentLength = parseInt(req.headers['content-length'] || '0', 10);
    const maxBytes = maxSizeMB * 1024 * 1024;
    
    if (contentLength > maxBytes) {
      res.status(413).json({
        success: false,
        error: {
          code: 'PAYLOAD_TOO_LARGE',
          message: `Request body exceeds maximum size of ${maxSizeMB}MB`,
        },
      });
      return;
    }
    next();
  };
}

/**
 * Validate Content-Type header for POST/PUT/PATCH requests
 */
export function validateContentType(req: Request, res: Response, next: NextFunction): void {
  if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
    const contentType = req.headers['content-type'] || '';
    const validTypes = [
      'application/json',
      'multipart/form-data',
      'application/x-www-form-urlencoded',
    ];
    
    const isValid = validTypes.some(type => contentType.includes(type));
    if (!isValid && contentType !== '') {
      res.status(415).json({
        success: false,
        error: {
          code: 'UNSUPPORTED_MEDIA_TYPE',
          message: `Content-Type "${contentType}" is not supported`,
        },
      });
      return;
    }
  }
  next();
}

/**
 * Prevent path traversal attacks in URL parameters
 */
export function preventPathTraversal(req: Request, res: Response, next: NextFunction): void {
  const dangerousPatterns = ['../', '..\\', '%2e%2e', '%252e'];
  const fullPath = decodeURIComponent(req.path);
  
  for (const pattern of dangerousPatterns) {
    if (fullPath.includes(pattern)) {
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_PATH',
          message: 'Invalid request path',
        },
      });
      return;
    }
  }
  next();
}
