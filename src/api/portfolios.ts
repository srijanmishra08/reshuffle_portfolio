/**
 * Portfolio API Routes
 * Endpoints for generating and managing portfolios
 */

import { Router, Request, Response } from 'express';
import multer from 'multer';
import { z } from 'zod';
import type { Category, RawInput } from '../types/index.js';
import { ingestBatch, validateBatch } from '../services/ingestion.js';
import { composePortfolio } from '../services/composition.js';
import { initStorage } from '../services/storage.js';

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
  }
});

// ============================================
// VALIDATION SCHEMAS
// ============================================

const GeneratePortfolioSchema = z.object({
  user_id: z.string().min(1),
  category: z.enum([
    'Finance', 'Entertainment', 'Design', 'Legal',
    'Tech', 'Marketing', 'Influencers', 'Business'
  ]),
  title: z.string().min(1).max(100),
  subtitle: z.string().max(200).optional(),
  urls: z.array(z.object({
    url: z.string().url(),
    title: z.string().optional(),
    description: z.string().optional()
  })).optional(),
  texts: z.array(z.object({
    text: z.string().min(1),
    title: z.string().optional(),
    description: z.string().optional()
  })).optional()
});

// ============================================
// ROUTES
// ============================================

/**
 * POST /portfolios/generate
 * Generate a portfolio from uploaded content
 */
router.post('/generate', upload.array('files', 20), async (req: Request, res: Response): Promise<void> => {
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
    
    const { user_id, category, title, subtitle, urls, texts } = validation.data;
    
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
    
    // Return response
    res.json({
      success: true,
      portfolio,
      processing_summary: {
        total_inputs: rawInputs.length,
        processed: ingestResult.successful,
        failed: ingestResult.failed,
        sections_generated: portfolio.sections.length,
        blocks_generated: portfolio.sections.reduce((sum, s) => sum + s.blocks.length, 0)
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
