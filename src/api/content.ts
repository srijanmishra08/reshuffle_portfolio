/**
 * Content API Routes
 * Endpoints for extracting, resolving media, and managing content
 * Includes rate limiting and universal media resolution
 */

import { Router, Request, Response } from 'express';
import multer from 'multer';
import { z } from 'zod';
import type { Category, RawInput } from '../types/index.js';
import { ingestContent, ingestBatch } from '../services/ingestion.js';
import { scoreContent } from '../services/scoring.js';
import { detectPlatform, isExtractable, detectPlatformExtended, isEmbeddable, getPlatformDisplayName, getPlatformColor } from '../utils/platform-detection.js';
import { resolveMedia } from '../services/media-resolver.js';
import { extractLimiter, uploadLimiter } from '../middleware/index.js';

const router = Router();

// Configure multer
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB
    files: 20
  },
  fileFilter: (_req, file, cb) => {
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

const ExtractUrlSchema = z.object({
  url: z.string().url().max(2048),
  title: z.string().max(200).optional(),
  description: z.string().max(1000).optional()
});

const ExtractBatchSchema = z.object({
  category: z.enum([
    'Finance', 'Entertainment', 'Design', 'Legal',
    'Tech', 'Marketing', 'Influencers', 'Business'
  ]),
  urls: z.array(ExtractUrlSchema).max(50).optional(),
  texts: z.array(z.object({
    text: z.string().min(1).max(50000),
    title: z.string().max(200).optional(),
    description: z.string().max(1000).optional()
  })).max(20).optional(),
  videos: z.array(z.object({
    url: z.string().url().max(2048),
    title: z.string().max(200).optional(),
    description: z.string().max(1000).optional()
  })).max(20).optional()
});

const ResolveMediaSchema = z.object({
  url: z.string().url().max(2048)
});

const ResolveBatchMediaSchema = z.object({
  urls: z.array(z.string().url().max(2048)).min(1).max(20)
});

// ============================================
// ROUTES
// ============================================

/**
 * POST /content/extract
 * Extract content from a URL or file
 * Rate limited: 30 per 5 min
 */
router.post('/extract',
  extractLimiter,
  uploadLimiter,
  upload.single('file'),
  async (req: Request, res: Response): Promise<void> => {
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
 * Rate limited: 30 per 5 min
 */
router.post('/batch',
  extractLimiter,
  uploadLimiter,
  upload.array('files', 20),
  async (req: Request, res: Response): Promise<void> => {
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
    
    const { category, urls, texts, videos } = validation.data;
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

    // Add video URLs (treated as URLs, media resolver handles the embed)
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
      content: result.scored_content,
      media_embeds_resolved: result.normalized_content.filter(c => c.media_embed).length
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
 * POST /content/resolve-media
 * Resolve a URL into embeddable media (video/image embed HTML, thumbnails, etc.)
 * Works with YouTube, Vimeo, Instagram, TikTok, X/Twitter, LinkedIn, Behance, Dribbble, Google Drive, etc.
 * Rate limited: 30 per 5 min
 */
router.post('/resolve-media', extractLimiter, async (req: Request, res: Response): Promise<void> => {
  try {
    const validation = ResolveMediaSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({
        error: 'Validation failed',
        details: validation.error.errors
      });
      return;
    }

    const { url } = validation.data;
    const resolved = await resolveMedia(url);

    if (!resolved) {
      const platform = detectPlatformExtended(url);
      res.json({
        success: false,
        url,
        platform,
        embeddable: false,
        message: `Could not resolve embeddable media from ${platform}. The URL may require authentication or may not contain embeddable content.`
      });
      return;
    }

    res.json({
      success: true,
      url,
      media: {
        embed_html: resolved.embed_html,
        thumbnail_url: resolved.thumbnail_url,
        platform_url: resolved.platform_url,
        media_type: resolved.media_type,
        title: resolved.title,
        author_name: resolved.author_name,
        author_url: resolved.author_url,
        width: resolved.width,
        height: resolved.height,
        duration_seconds: resolved.duration_seconds,
        platform_name: resolved.platform_name
      }
    });

  } catch (error) {
    console.error('Media resolution error:', error);
    res.status(500).json({
      error: 'Media resolution failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /content/resolve-media/batch
 * Resolve multiple URLs into embeddable media in parallel
 * Rate limited: 30 per 5 min
 */
router.post('/resolve-media/batch', extractLimiter, async (req: Request, res: Response): Promise<void> => {
  try {
    const validation = ResolveBatchMediaSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({
        error: 'Validation failed',
        details: validation.error.errors
      });
      return;
    }

    const { urls } = validation.data;
    
    // Resolve in parallel with bounded concurrency
    const results = await Promise.allSettled(
      urls.map(url => resolveMedia(url))
    );

    const resolved = urls.map((url, i) => {
      const result = results[i];
      if (result.status === 'fulfilled' && result.value) {
        return {
          url,
          success: true,
          media: result.value
        };
      }
      return {
        url,
        success: false,
        platform: detectPlatformExtended(url),
        message: 'Could not resolve embeddable media'
      };
    });

    res.json({
      success: true,
      total: urls.length,
      resolved_count: resolved.filter(r => r.success).length,
      results: resolved
    });

  } catch (error) {
    console.error('Batch media resolution error:', error);
    res.status(500).json({
      error: 'Batch media resolution failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /content/detect-platform
 * Detect platform from a URL (enhanced with embed capability info)
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
    const extended = detectPlatformExtended(url);
    const extractable = isExtractable(platform);
    const embeddable = isEmbeddable(url);
    
    res.json({
      url,
      platform,
      platform_display: getPlatformDisplayName(platform),
      platform_color: getPlatformColor(platform),
      extended_platform: extended,
      extractable,
      embeddable,
      note: embeddable
        ? `Media from ${getPlatformDisplayName(platform)} can be embedded directly`
        : extractable
          ? `Content will be extracted from ${getPlatformDisplayName(platform)}`
          : `Link will be saved as clickable ${getPlatformDisplayName(platform)} link`
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
 * Rate limited: 30 per 5 min
 */
router.post('/score', extractLimiter, async (req: Request, res: Response): Promise<void> => {
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
