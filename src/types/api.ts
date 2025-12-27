/**
 * API Types - Request and Response Schemas
 * Based on 10_API_SPECIFICATION.md
 */

import type { Category, Portfolio } from './portfolio.js';
import type { ContentSource, NormalizedContent } from './content.js';

// ============================================
// API RESPONSES
// ============================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

// ============================================
// GENERATE PORTFOLIO
// ============================================

export interface GeneratePortfolioRequest {
  user_id: string;
  category: Category;
  content: ContentInput[];
  options?: GenerateOptions;
}

export interface ContentInput {
  input_type: 'url' | 'file' | 'text';
  source_url?: string;
  file_name?: string;
  mime_type?: string;
  file_data?: string; // base64
  raw_text?: string;
  user_metadata?: {
    title?: string;
    description?: string;
    tags?: string[];
    thumbnail?: string; // base64
  };
}

export interface GenerateOptions {
  force_regenerate?: boolean;
  include_analytics?: boolean;
}

export interface GeneratePortfolioResponse {
  portfolio_id: string;
  status: 'complete' | 'processing' | 'failed';
  portfolio?: Portfolio;
  metadata?: {
    generation_time_ms: number;
    content_items_processed: number;
    blocks_generated: number;
  };
  progress?: {
    stage: string;
    percentage: number;
    current_item?: string;
  };
}

// ============================================
// EXTRACT URL
// ============================================

export interface ExtractURLRequest {
  url: string;
}

export interface ExtractURLResponse {
  url: string;
  type: string;
  source: ContentSource;
  extractable: boolean;
  metadata?: Record<string, unknown>;
  message?: string;
  extraction_method?: 'api' | 'oembed' | 'scrape';
  extraction_quality?: 'full' | 'partial' | 'minimal';
}

// ============================================
// ADD EXTERNAL LINK
// ============================================

export interface AddExternalLinkRequest {
  platform: string;
  url: string;
  title: string;
  description?: string;
  thumbnail?: string; // base64
}

export interface AddExternalLinkResponse {
  content_id: string;
  type: 'external_link';
  platform: string;
  url: string;
  title: string;
  description?: string;
  thumbnail_url?: string;
  display: {
    icon: string;
    label: string;
    open_in: 'external_browser';
  };
}

// ============================================
// VALIDATE CONTENT
// ============================================

export interface ValidateContentRequest {
  category: Category;
  content: ContentInput[];
}

export interface ValidateContentResponse {
  valid: boolean;
  items: Array<{
    index: number;
    source_url?: string;
    status: 'valid' | 'invalid' | 'needs_metadata';
    detected_type?: string;
    detected_source?: string;
    error?: string;
  }>;
  recommendations: {
    can_generate: boolean;
    suggested_additions?: string[];
    warnings?: string[];
  };
}

// ============================================
// LIST PORTFOLIOS
// ============================================

export interface ListPortfoliosResponse {
  portfolios: Array<{
    portfolio_id: string;
    category: Category;
    status: 'draft' | 'published';
    created_at: string;
    preview: {
      title: string;
      subtitle: string;
      thumbnail_url?: string;
    };
  }>;
  pagination: {
    total: number;
    limit: number;
    offset: number;
    has_more: boolean;
  };
}

// ============================================
// CATEGORIES
// ============================================

export interface CategoryInfo {
  id: Category;
  display_name: string;
  description: string;
  icon: string;
  hook_emphasis: string;
  suggested_content_types: string[];
}
