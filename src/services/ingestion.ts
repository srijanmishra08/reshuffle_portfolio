/**
 * Content Ingestion Pipeline
 * Routes inputs to appropriate handlers and processes in batch
 */

import type { RawInput, NormalizedContent, ScoredContent, Category } from '../types/index.js';
import { processYouTubeURL } from './handlers/youtube.js';
import { processGitHubURL } from './handlers/github.js';
import { processExternalLink } from './handlers/external-link.js';
import { processImageUpload } from './handlers/image.js';
import { processVideoUpload } from './handlers/video.js';
import { processPdfUpload } from './handlers/pdf.js';
import { processTextInput } from './handlers/text.js';
import { scoreContentBatch } from './scoring.js';
import { detectPlatform } from '../utils/platform-detection.js';

// ============================================
// TYPES
// ============================================

export interface IngestResult {
  success: boolean;
  content_id: string;
  normalized?: NormalizedContent;
  error?: string;
}

export interface BatchIngestResult {
  total: number;
  successful: number;
  failed: number;
  results: IngestResult[];
  normalized_content: NormalizedContent[];
  scored_content: ScoredContent[];
}

// ============================================
// SINGLE CONTENT INGESTION
// ============================================

/**
 * Process a single raw input and normalize it
 */
export async function ingestContent(input: RawInput): Promise<IngestResult> {
  try {
    let normalized: NormalizedContent;
    
    switch (input.type) {
      case 'url':
        normalized = await processUrl(input);
        break;
      
      case 'image':
        if (!input.file) {
          throw new Error('Image file is required');
        }
        normalized = await processImageUpload(input.file, input.user_metadata);
        break;
      
      case 'video':
        if (!input.file) {
          throw new Error('Video file is required');
        }
        normalized = await processVideoUpload(input.file, input.user_metadata);
        break;
      
      case 'pdf':
        if (!input.file) {
          throw new Error('PDF file is required');
        }
        normalized = await processPdfUpload(input.file, input.user_metadata);
        break;
      
      case 'text':
        if (!input.text) {
          throw new Error('Text content is required');
        }
        normalized = processTextInput(input.text, input.user_metadata);
        break;
      
      default:
        throw new Error(`Unknown input type: ${(input as any).type}`);
    }
    
    return {
      success: true,
      content_id: normalized.content_id,
      normalized
    };
    
  } catch (error) {
    return {
      success: false,
      content_id: '',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Process URL input based on detected platform.
 * YouTube and GitHub get API-based extraction.
 * ALL other URLs go through the universal media resolver
 * which fetches oEmbed / OG metadata and produces embeddable content.
 */
async function processUrl(input: RawInput): Promise<NormalizedContent> {
  if (!input.url) {
    throw new Error('URL is required');
  }
  
  const platform = detectPlatform(input.url);
  
  switch (platform) {
    case 'youtube':
      return processYouTubeURL(input.url);
    
    case 'github':
      return processGitHubURL(input.url);
    
    // ALL other URLs – Instagram, LinkedIn, X, TikTok, Behance, Dribbble,
    // Google Drive, Vimeo, or any generic website – go through the
    // universal media resolver for rich embed extraction.
    default:
      return processExternalLink(input.url, platform, input.user_metadata);
  }
}

// ============================================
// BATCH INGESTION
// ============================================

/**
 * Process multiple inputs in batch with concurrency control
 */
export async function ingestBatch(
  inputs: RawInput[],
  category: Category
): Promise<BatchIngestResult> {
  const results: IngestResult[] = [];
  const normalizedContent: NormalizedContent[] = [];
  
  // Process inputs with bounded concurrency (max 5 at a time)
  const CONCURRENCY = 5;
  for (let i = 0; i < inputs.length; i += CONCURRENCY) {
    const batch = inputs.slice(i, i + CONCURRENCY);
    const batchResults = await Promise.allSettled(
      batch.map(input => ingestContent(input))
    );
    
    for (const settled of batchResults) {
      if (settled.status === 'fulfilled') {
        results.push(settled.value);
        if (settled.value.success && settled.value.normalized) {
          normalizedContent.push(settled.value.normalized);
        }
      } else {
        results.push({
          success: false,
          content_id: '',
          error: settled.reason?.message || 'Processing failed'
        });
      }
    }
  }
  
  // Score the normalized content
  const scoredContent = scoreContentBatch(normalizedContent, category);
  
  return {
    total: inputs.length,
    successful: normalizedContent.length,
    failed: inputs.length - normalizedContent.length,
    results,
    normalized_content: normalizedContent,
    scored_content: scoredContent
  };
}

// ============================================
// VALIDATION
// ============================================

/**
 * Validate raw input before processing
 */
export function validateInput(input: RawInput): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Check required fields
  if (!input.type) {
    errors.push('Input type is required');
  }
  
  // Type-specific validation
  switch (input.type) {
    case 'url':
      if (!input.url) {
        errors.push('URL is required for URL input type');
      } else {
        try {
          new URL(input.url);
        } catch {
          errors.push('Invalid URL format');
        }
      }
      break;
    
    case 'image':
    case 'video':
    case 'pdf':
      if (!input.file) {
        errors.push(`File is required for ${input.type} input type`);
      }
      break;
    
    case 'text':
      if (!input.text) {
        errors.push('Text content is required for text input type');
      }
      break;
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate batch of inputs
 */
export function validateBatch(inputs: RawInput[]): {
  valid: boolean;
  validInputs: RawInput[];
  invalidInputs: Array<{ input: RawInput; errors: string[] }>;
} {
  const validInputs: RawInput[] = [];
  const invalidInputs: Array<{ input: RawInput; errors: string[] }> = [];
  
  for (const input of inputs) {
    const validation = validateInput(input);
    if (validation.valid) {
      validInputs.push(input);
    } else {
      invalidInputs.push({ input, errors: validation.errors });
    }
  }
  
  return {
    valid: invalidInputs.length === 0,
    validInputs,
    invalidInputs
  };
}
