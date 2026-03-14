/**
 * Portfolio Engine - Main Server
 * Express.js API server for portfolio generation
 * Features: SSR rendering, universal media embeds, rate limiting, security hardening
 */

import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { portfolioRoutes, contentRoutes } from './api/index.js';
import downloadRoutes from './api/downloads.js';
import { initStorage } from './services/storage.js';
import { getDownloadStorage } from './services/download-storage.js';
import { checkDependencies } from './services/video-downloader.js';
// SSR renderer is imported by API routes directly
import {
  globalLimiter,
  securityHeaders,
  parameterPollutionProtection,
  sanitizeBody,
  payloadSizeGuard,
  validateContentType,
  preventPathTraversal
} from './middleware/index.js';

// ES Module dirname workaround
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Create Express app
const app = express();

// ============================================
// SECURITY MIDDLEWARE (applied first)
// ============================================

// Trust proxy if behind a reverse proxy (Vercel, nginx, etc.)
if (process.env.TRUST_PROXY === 'true') {
  app.set('trust proxy', 1);
}

// Security headers (Helmet)
app.use(securityHeaders);

// HTTP parameter pollution protection
app.use(parameterPollutionProtection);

// Prevent path traversal attacks
app.use(preventPathTraversal);

// ============================================
// CORS
// ============================================

app.use(cors({
  origin: NODE_ENV === 'production' 
    ? process.env.ALLOWED_ORIGINS?.split(',') 
    : true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  maxAge: 86400
}));

// ============================================
// RATE LIMITING (global)
// ============================================

app.use(globalLimiter);

// ============================================
// BODY PARSING
// ============================================

// Payload size guard before body parsing
app.use(payloadSizeGuard(100)); // 100MB max

// Parse JSON bodies
app.use(express.json({ limit: '50mb' }));

// Parse URL-encoded bodies
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Content type validation
app.use(validateContentType);

// Sanitize request bodies (XSS prevention)
app.use(sanitizeBody);

// ============================================
// STATIC FILES
// ============================================

// Serve static HTML files (index.html, view.html) from project root
app.use(express.static(path.join(__dirname, '..'), {
  index: 'index.html',
  extensions: ['html'],
  maxAge: '1h',
}));

// Serve uploaded files (with cache headers)
app.use('/uploads', express.static(path.join(__dirname, '../uploads'), {
  maxAge: '7d',
  etag: true,
  lastModified: true,
}));

// ============================================
// REQUEST LOGGING
// ============================================

app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`);
  });
  next();
});

// ============================================
// ROUTES
// ============================================

// Health check (no rate limit)
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'portfolio-engine',
    version: '3.0.0',
    features: ['ssr', 'media-embeds', 'rate-limiting', 'security', 'video-download', 'video-processing'],
    timestamp: new Date().toISOString()
  });
});

// API info
app.get('/api', (_req, res) => {
  res.json({
    name: 'Portfolio Engine API',
    version: '3.0.0',
    endpoints: {
      portfolios: {
        'POST /api/portfolios/generate': 'Generate a portfolio from content (returns JSON + SSR HTML)',
        'GET /api/portfolios/:id': 'Retrieve a portfolio (not implemented)',
        'GET /api/portfolios/:id/view': 'SSR-rendered portfolio page'
      },
      content: {
        'POST /api/content/extract': 'Extract content from URL or file',
        'POST /api/content/batch': 'Extract and score multiple content items',
        'POST /api/content/detect-platform': 'Detect platform from URL',
        'POST /api/content/score': 'Score content for a category',
        'POST /api/content/resolve-media': 'Resolve a URL to embeddable media'
      },
      downloads: {
        'GET /api/downloads/health': 'Check yt-dlp/ffmpeg availability and queue status',
        'POST /api/downloads/metadata': 'Extract video metadata without downloading',
        'POST /api/downloads/check-url': 'Check if URL is supported for download',
        'GET /api/downloads/supported-sites': 'List all 1000+ supported sites',
        'POST /api/downloads/start': 'Start a video download job',
        'POST /api/downloads/batch': 'Start multiple download jobs',
        'GET /api/downloads/jobs': 'List all download jobs',
        'GET /api/downloads/jobs/:id': 'Get job status and progress',
        'DELETE /api/downloads/jobs/:id': 'Cancel or delete a job',
        'GET /api/downloads/files/:id': 'Stream a downloaded file',
        'GET /api/downloads/files/:id/thumbnail': 'Get video thumbnail',
        'GET /api/downloads/files/:id/info': 'Get video file analysis',
        'DELETE /api/downloads/files/:id': 'Delete a stored file',
        'GET /api/downloads/storage/stats': 'Storage and queue statistics',
        'GET /api/downloads/storage/files': 'List all stored files',
        'GET /api/downloads/queue/stats': 'Download queue statistics'
      }
    },
    categories: [
      'Finance', 'Entertainment', 'Design', 'Legal',
      'Tech', 'Marketing', 'Influencers', 'Business'
    ],
    supported_inputs: {
      urls: [
        'YouTube (embedded video)',
        'Instagram (embedded post/reel)',
        'TikTok (embedded video)',
        'X / Twitter (embedded post)',
        'LinkedIn (preview + link)',
        'Behance (embedded project)',
        'Dribbble (embedded shot)',
        'Vimeo (embedded video)',
        'Google Drive (embedded file)',
        'GitHub (extracted metadata)',
        'Any website (OG metadata)'
      ],
      files: ['Images (jpg, png, webp, gif)', 'Videos (mp4, mov, webm)', 'PDFs'],
      text: ['Plain text input']
    },
    security: {
      rate_limiting: 'Per-route rate limits',
      input_sanitization: 'XSS prevention on all inputs',
      headers: 'Helmet security headers',
      cors: 'Configurable CORS policy'
    }
  });
});

// Mount API routes
app.use('/api/portfolios', portfolioRoutes);
app.use('/api/content', contentRoutes);
app.use('/api/downloads', downloadRoutes);

// ============================================
// SSR PORTFOLIO VIEW
// ============================================

// Serve test webpage at root
app.get('/', (_req, res) => {
  res.sendFile(path.join(__dirname, '../index.html'));
});

// Serve view page
app.get('/view', (_req, res) => {
  res.sendFile(path.join(__dirname, '../view.html'));
});

// ============================================
// ERROR HANDLING
// ============================================

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`,
    hint: 'Check /api for available endpoints'
  });
});

// Global error handler
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  
  res.status(err.status || 500).json({
    error: err.name || 'Internal Server Error',
    message: NODE_ENV === 'development' ? err.message : 'An unexpected error occurred',
    ...(NODE_ENV === 'development' && { stack: err.stack })
  });
});

// ============================================
// SERVER STARTUP
// ============================================

// Export for Vercel serverless
export default app;

// Only start server if not in Vercel environment
if (process.env.VERCEL !== '1') {
  async function start() {
    try {
      // Initialize storage directories
      await initStorage();
      console.log('✓ Storage initialized');

      // Initialize download storage
      await getDownloadStorage();
      console.log('✓ Download storage initialized');

      // Check video download dependencies
      const deps = await checkDependencies();
      console.log(`✓ yt-dlp: ${deps.ytdlp.available ? deps.ytdlp.version : 'NOT FOUND'}`);
      console.log(`✓ ffmpeg: ${deps.ffmpeg.available ? deps.ffmpeg.version : 'NOT FOUND'}`);
      
      // Start server
      app.listen(PORT, () => {
        console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   🚀 Portfolio Engine Server v2.0                         ║
║                                                           ║
║   Local:   http://localhost:${PORT}                         ║
║   API:     http://localhost:${PORT}/api                     ║
║   Health:  http://localhost:${PORT}/health                  ║
║                                                           ║
║   ✓ SSR Rendering              ✓ Media Embeds             ║
║   ✓ Rate Limiting              ✓ Security Hardened        ║
║   ✓ Universal Link Resolution                             ║
║   ✓ Video Download (yt-dlp)    ✓ Video Processing         ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
        `);
      });
    } catch (error) {
      console.error('Failed to start server:', error);
      process.exit(1);
    }
  }

  start();
}
