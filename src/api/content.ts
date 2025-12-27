/**
 * Content API Routes
 * Endpoints for extracting and managing content
 */

import { Router, Request, Response } from 'express';
import multer from 'multer';
import { z } from 'zod';
import type { Category, RawInput } from '../types/index.js';
import { ingestContent, ingestBatch } from '../services/ingestion.js';
import { scoreContent } from '../services/scoring.js';
import { detectPlatform, isExtractable } from '../utils/platform-detection.js';

const router = Router();

// Configure multer
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB
  }
});

// ============================================
// VALIDATION SCHEMAS
// ============================================

const ExtractUrlSchema = z.object({
  url: z.string().url(),
  title: z.string().optional(),
  description: z.string().optional()
});

const ExtractBatchSchema = z.object({
  category: z.enum([
    'Finance', 'Entertainment', 'Design', 'Legal',
    'Tech', 'Marketing', 'Influencers', 'Business'
  ]),
  urls: z.array(ExtractUrlSchema).optional(),
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
 * POST /content/extract
 * Extract content from a URL or file
 */
router.post('/extract', upload.single('file'), async (req: Request, res: Response): Promise<void> => {
  try {
    let input: RawInput;
    
    // Check if file was uploaded
    if (req.file) {
      const inputType = getFileInputType(req.file.mimetype);
      if (!inputType) {
        res.status(400).json({
          error: 'Unsupported file type',
          supported: ['image/*', 'video/*', 'application/pdf']
        });
        return;
      }
      
      input = {
        type: inputType,
        file: {
          buffer: req.file.buffer,
          filename: req.file.originalname,
          mimetype: req.file.mimetype
        },
        user_metadata: {
          title: req.body.title,
          description: req.body.description
        }
      };
    } else if (req.body.url) {
      // URL extraction
      const validation = ExtractUrlSchema.safeParse(req.body);
      if (!validation.success) {
        res.status(400).json({
          error: 'Validation failed',
          details: validation.error.errors
        });
        return;
      }
      
      input = {
        type: 'url',
        url: validation.data.url,
        user_metadata: {
          title: validation.data.title,
          description: validation.data.description
        }
      };
    } else if (req.body.text) {
      // Text extraction
      input = {
        type: 'text',
        text: req.body.text,
        user_metadata: {
          title: req.body.title,
          description: req.body.description
        }
      };
    } else {
      res.status(400).json({
        error: 'No content provided',
        message: 'Provide either a URL, text, or file'
      });
      return;
    }
    
    // Process the input
    const result = await ingestContent(input);
    
    if (!result.success) {
      res.status(422).json({
        error: 'Extraction failed',
        message: result.error
      });
      return;
    }
    
    res.json({
      success: true,
      content: result.normalized
    });
    
  } catch (error) {
    console.error('Content extraction error:', error);
    res.status(500).json({
      error: 'Extraction failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /content/batch
 * Extract multiple content items and score them
 */
router.post('/batch', upload.array('files', 20), async (req: Request, res: Response): Promise<void> => {
  try {
    // Parse JSON body
    let body: any;
    try {
      body = req.body.data ? JSON.parse(req.body.data) : req.body;
    } catch {
      body = req.body;
    }
    
    const validation = ExtractBatchSchema.safeParse(body);
    if (!validation.success) {
      res.status(400).json({
        error: 'Validation failed',
        details: validation.error.errors
      });
      return;
    }
    
    const { category, urls, texts } = validation.data;
    const rawInputs: RawInput[] = [];
    
    // Add URLs
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
    
    // Add texts
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
    
    // Add files
    const files = req.files as Express.Multer.File[];
    if (files) {
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
    
    // Process batch
    const result = await ingestBatch(rawInputs, category as Category);
    
    res.json({
      success: true,
      total: result.total,
      processed: result.successful,
      failed: result.failed,
      content: result.scored_content
    });
    
  } catch (error) {
    console.error('Batch extraction error:', error);
    res.status(500).json({
      error: 'Batch extraction failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /content/detect-platform
 * Detect platform from a URL
 */
router.post('/detect-platform', async (req: Request, res: Response): Promise<void> => {
  try {
    const { url } = req.body;
    
    if (!url) {
      res.status(400).json({ error: 'URL is required' });
      return;
    }
    
    try {
      new URL(url);
    } catch {
      res.status(400).json({ error: 'Invalid URL format' });
      return;
    }
    
    const platform = detectPlatform(url);
    const extractable = isExtractable(platform);
    
    res.json({
      url,
      platform,
      extractable,
      note: extractable 
        ? `Content will be extracted from ${platform}` 
        : `Link will be saved as clickable ${platform} link (no extraction)`
    });
    
  } catch (error) {
    res.status(500).json({
      error: 'Detection failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /content/score
 * Score content for a specific category
 */
router.post('/score', async (req: Request, res: Response): Promise<void> => {
  try {
    const { content, category } = req.body;
    
    if (!content || !category) {
      res.status(400).json({
        error: 'Missing required fields',
        required: ['content', 'category']
      });
      return;
    }
    
    const scored = scoreContent(content, category as Category);
    
    res.json({
      success: true,
      scored_content: scored
    });
    
  } catch (error) {
    res.status(500).json({
      error: 'Scoring failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
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
