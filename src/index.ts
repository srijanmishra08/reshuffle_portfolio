/**
 * Portfolio Engine - Main Server
 * Express.js API server for portfolio generation
 */

import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { portfolioRoutes, contentRoutes } from './api/index.js';
import { initStorage } from './services/storage.js';

// ES Module dirname workaround
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Create Express app
const app = express();

// ============================================
// MIDDLEWARE
// ============================================

// CORS - allow all origins in development
app.use(cors({
  origin: NODE_ENV === 'production' 
    ? process.env.ALLOWED_ORIGINS?.split(',') 
    : true,
  credentials: true
}));

// Parse JSON bodies
app.use(express.json({ limit: '10mb' }));

// Parse URL-encoded bodies
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static files from test-web directory
app.use(express.static(path.join(__dirname, '../test-web')));

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Request logging
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

// Health check
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'portfolio-engine',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// API info
app.get('/api', (_req, res) => {
  res.json({
    name: 'Portfolio Engine API',
    version: '1.0.0',
    endpoints: {
      portfolios: {
        'POST /api/portfolios/generate': 'Generate a portfolio from content',
        'GET /api/portfolios/:id': 'Retrieve a portfolio (not implemented)'
      },
      content: {
        'POST /api/content/extract': 'Extract content from URL or file',
        'POST /api/content/batch': 'Extract and score multiple content items',
        'POST /api/content/detect-platform': 'Detect platform from URL',
        'POST /api/content/score': 'Score content for a category'
      }
    },
    categories: [
      'Finance', 'Entertainment', 'Design', 'Legal',
      'Tech', 'Marketing', 'Influencers', 'Business'
    ],
    supported_inputs: {
      urls: ['YouTube (extracted)', 'GitHub (extracted)', 'Instagram (clickable)', 'LinkedIn (clickable)', 'TikTok (clickable)', 'Any website (clickable)'],
      files: ['Images (jpg, png, webp)', 'Videos (mp4, mov, webm)', 'PDFs'],
      text: ['Plain text input']
    }
  });
});

// Mount API routes
app.use('/api/portfolios', portfolioRoutes);
app.use('/api/content', contentRoutes);

// Serve test webpage at root
app.get('/', (_req, res) => {
  res.sendFile(path.join(__dirname, '../test-web/index.html'));
});

// Serve portfolio preview
app.get('/preview', (_req, res) => {
  res.sendFile(path.join(__dirname, '../test-web/portfolio-preview.html'));
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
      
      // Start server
      app.listen(PORT, () => {
        console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   🚀 Portfolio Engine Server                              ║
║                                                           ║
║   Local:   http://localhost:${PORT}                         ║
║   API:     http://localhost:${PORT}/api                     ║
║   Health:  http://localhost:${PORT}/health                  ║
║                                                           ║
║   Test Webpage: http://localhost:${PORT}/                   ║
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
