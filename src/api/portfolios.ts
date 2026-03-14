/**
 * Portfolio API Routes
 * Endpoints for generating and managing portfolios
 * Includes SSR rendering and rate limiting
 */

import { Router, Request, Response } from 'express';
import multer from 'multer';
import { z } from 'zod';
import type { Category, RawInput } from '../types/index.js';
import { ingestBatch, validateBatch } from '../services/ingestion.js';
import { composePortfolio } from '../services/composition.js';
import { renderPortfolioHTML } from '../services/ssr-renderer.js';
import { initStorage } from '../services/storage.js';
import { generateLimiter, uploadLimiter, viewLimiter } from '../middleware/index.js';

// Initialize storage
await initStorage();

const router = Router();

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB max
    files: 20 // Max 20 files per request
  },
  fileFilter: (_req, file, cb) => {
    // Only allow specific mime types
    const allowed = [
      'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif',
      'video/mp4', 'video/quicktime', 'video/webm', 'video/x-msvideo', 'video/x-m4v',
      'application/pdf',
    ];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${file.mimetype} is not allowed`));
    }
  }
});

// ============================================
// VALIDATION SCHEMAS
// ============================================

const GeneratePortfolioSchema = z.object({
  user_id: z.string().min(1).max(128),
  category: z.enum([
    'Finance', 'Entertainment', 'Design', 'Legal',
    'Tech', 'Marketing', 'Influencers', 'Business'
  ]),
  title: z.string().min(1).max(100),
  subtitle: z.string().max(200).optional(),
  urls: z.array(z.object({
    url: z.string().url().max(2048),
    title: z.string().max(200).optional(),
    description: z.string().max(1000).optional()
  })).max(50).optional(),
  texts: z.array(z.object({
    text: z.string().min(1).max(50000),
    title: z.string().max(200).optional(),
    description: z.string().max(1000).optional()
  })).max(20).optional(),
  videos: z.array(z.object({
    url: z.string().url().max(2048),
    title: z.string().max(200).optional(),
    description: z.string().max(1000).optional()
  })).max(20).optional(),
});

// ============================================
// ROUTES
// ============================================

/**
 * POST /portfolios/generate
 * Generate a portfolio from uploaded content
 * Rate limited: 10 per 15 min
 */
router.post('/generate',
  generateLimiter,
  uploadLimiter,
  upload.array('files', 20),
  async (req: Request, res: Response): Promise<void> => {
  try {
    // Parse JSON body from form data
    let body: any;
    try {
      body = req.body.data ? JSON.parse(req.body.data) : req.body;
    } catch {
      body = req.body;
    }
    
    // Validate request
    const validation = GeneratePortfolioSchema.safeParse(body);
    if (!validation.success) {
      res.status(400).json({
        error: 'Validation failed',
        details: validation.error.errors
      });
      return;
    }
    
    const { user_id, category, title, subtitle, urls, texts, videos } = validation.data;
    
    // Build raw inputs
    const rawInputs: RawInput[] = [];
    
    // Add URL inputs
    if (urls) {
      for (const urlInput of urls) {
        rawInputs.push({
          type: 'url',
          url: urlInput.url,
          user_metadata: {
            title: urlInput.title,
            description: urlInput.description
          }
        });
      }
    }
    
    // Add video URL inputs (treated as URLs, media resolver handles embed)
    if (videos) {
      for (const videoInput of videos) {
        rawInputs.push({
          type: 'url',
          url: videoInput.url,
          user_metadata: {
            title: videoInput.title,
            description: videoInput.description
          }
        });
      }
    }
    
    // Add text inputs
    if (texts) {
      for (const textInput of texts) {
        rawInputs.push({
          type: 'text',
          text: textInput.text,
          user_metadata: {
            title: textInput.title,
            description: textInput.description
          }
        });
      }
    }
    
    // Add file inputs
    const files = req.files as Express.Multer.File[];
    if (files && files.length > 0) {
      for (const file of files) {
        const inputType = getFileInputType(file.mimetype);
        if (inputType) {
          rawInputs.push({
            type: inputType,
            file: {
              buffer: file.buffer,
              filename: file.originalname,
              mimetype: file.mimetype
            }
          });
        }
      }
    }
    
    // Validate inputs
    const inputValidation = validateBatch(rawInputs);
    if (inputValidation.invalidInputs.length > 0) {
      console.warn('Some inputs were invalid:', inputValidation.invalidInputs);
    }
    
    // Process content
    const ingestResult = await ingestBatch(inputValidation.validInputs, category as Category);
    
    // Generate portfolio
    const portfolio = composePortfolio(ingestResult.scored_content, {
      userId: user_id,
      category: category as Category,
      title,
      subtitle: subtitle || ''
    });

    // Generate SSR HTML
    const html = renderPortfolioHTML(portfolio);
    
    // Return response
    res.json({
      success: true,
      portfolio,
      html,
      processing_summary: {
        total_inputs: rawInputs.length,
        processed: ingestResult.successful,
        failed: ingestResult.failed,
        sections_generated: portfolio.sections.length,
        blocks_generated: portfolio.sections.reduce((sum, s) => sum + s.blocks.length, 0),
        media_embeds_resolved: ingestResult.normalized_content.filter(c => c.media_embed).length
      }
    });
    
  } catch (error) {
    console.error('Portfolio generation error:', error);
    res.status(500).json({
      error: 'Failed to generate portfolio',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /portfolios/generate/ssr
 * Generate portfolio and return ONLY the SSR HTML (for direct page rendering)
 */
router.post('/generate/ssr',
  generateLimiter,
  uploadLimiter,
  upload.array('files', 20),
  async (req: Request, res: Response): Promise<void> => {
  try {
    let body: any;
    try {
      body = req.body.data ? JSON.parse(req.body.data) : req.body;
    } catch {
      body = req.body;
    }
    
    const validation = GeneratePortfolioSchema.safeParse(body);
    if (!validation.success) {
      res.status(400).json({ error: 'Validation failed', details: validation.error.errors });
      return;
    }
    
    const { user_id, category, title, subtitle, urls, texts, videos } = validation.data;
    const rawInputs: RawInput[] = [];
    
    if (urls) {
      for (const u of urls) rawInputs.push({ type: 'url', url: u.url, user_metadata: { title: u.title, description: u.description } });
    }
    if (videos) {
      for (const v of videos) rawInputs.push({ type: 'url', url: v.url, user_metadata: { title: v.title, description: v.description } });
    }
    if (texts) {
      for (const t of texts) rawInputs.push({ type: 'text', text: t.text, user_metadata: { title: t.title, description: t.description } });
    }
    
    const files = req.files as Express.Multer.File[];
    if (files) {
      for (const file of files) {
        const inputType = getFileInputType(file.mimetype);
        if (inputType) rawInputs.push({ type: inputType, file: { buffer: file.buffer, filename: file.originalname, mimetype: file.mimetype } });
      }
    }
    
    const inputValidation = validateBatch(rawInputs);
    const ingestResult = await ingestBatch(inputValidation.validInputs, category as Category);
    const portfolio = composePortfolio(ingestResult.scored_content, {
      userId: user_id, category: category as Category, title, subtitle: subtitle || ''
    });
    
    const html = renderPortfolioHTML(portfolio);
    
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch (error) {
    console.error('SSR generation error:', error);
    res.status(500).send('<html><body><h1>Error</h1><p>Failed to generate portfolio</p></body></html>');
  }
});

/**
 * GET /portfolios/:id
 * Retrieve a generated portfolio
 */
router.get('/:id', async (_req: Request, res: Response): Promise<void> => {
  // For now, portfolios are generated on-the-fly
  // In production, you'd store and retrieve from database
  res.status(501).json({
    error: 'Portfolio storage not implemented',
    message: 'Portfolios are currently generated on-the-fly. Database storage coming soon.'
  });
});

/**
 * GET /portfolios/:id/view
 * SSR rendered portfolio page (rate limited to prevent scraping)
 */
router.get('/:id/view', viewLimiter, async (_req: Request, res: Response): Promise<void> => {
  // In production, fetch portfolio from database and render
  res.status(501).send('<html><body><h1>Coming Soon</h1><p>Stored portfolio viewing requires database integration.</p></body></html>');
});

// ============================================
// HELPERS
// ============================================

function getFileInputType(mimetype: string): 'image' | 'video' | 'pdf' | null {
  if (mimetype.startsWith('image/')) return 'image';
  if (mimetype.startsWith('video/')) return 'video';
  if (mimetype === 'application/pdf') return 'pdf';
  return null;
}

export default router;
