/**
 * Content Types - Input and Normalized Content
 * Based on 07_CONTENT_INGESTION.md
 */

// ============================================
// INPUT TYPES
// ============================================

export type InputType = 'url' | 'image' | 'video' | 'pdf' | 'text';
export type ContentType = 'video' | 'image' | 'pdf' | 'text' | 'code' | 'external_link';
export type ContentSource = 
  | 'youtube' 
  | 'github' 
  | 'upload' 
  | 'input' 
  | 'instagram' 
  | 'linkedin' 
  | 'tiktok' 
  | 'twitter'
  | 'behance'
  | 'dribbble'
  | 'website'
  | 'other';

// File upload interface
export interface FileInput {
  buffer: Buffer;
  filename: string;
  mimetype: string;
}

// User-provided metadata
export interface UserMetadata {
  title?: string;
  description?: string;
  tags?: string[];
}

// Raw input from API
export interface RawInput {
  type: InputType;
  url?: string;
  file?: FileInput;
  text?: string;
  user_metadata?: UserMetadata;
}

// ============================================
// NORMALIZED CONTENT
// ============================================

export interface NormalizedContent {
  content_id: string;
  type: ContentType;
  source: ContentSource;
  original_url?: string;
  file_path?: string;
  title: string;
  description: string;
  extracted_data?: ExtractedData;
  created_at: string;
}

// Extracted data varies by source
export interface ExtractedData {
  // YouTube
  thumbnail_url?: string;
  embed_url?: string;
  channel_name?: string;
  view_count?: number;
  like_count?: number;
  duration_seconds?: number;
  published_at?: string;
  
  // GitHub - Repository
  stars?: number;
  forks?: number;
  language?: string;
  topics?: string[];
  open_issues?: number;
  updated_at?: string;
  readme_preview?: string;
  
  // GitHub - User Profile
  is_profile?: boolean;
  followers?: number;
  following?: number;
  public_repos?: number;
  bio?: string;
  company?: string;
  location?: string;
  blog?: string;
  twitter_username?: string;
  hireable?: boolean;
  top_repos?: Array<{
    name: string;
    description: string;
    stars: number;
    language: string;
    url: string;
  }>;
  
  // Image
  width?: number;
  height?: number;
  format?: string;
  
  // PDF
  page_count?: number;
  extracted_text?: string;
  word_count?: number;
  is_resume?: boolean;
  contact_email?: string;
  contact_phone?: string;
  linkedin_url?: string;
  github_url?: string;
  skills?: string[];
  person_name?: string;
  
  // Video
  size_bytes?: number;
  
  // External Link
  platform?: string;
  
  // Text
  text_type?: 'bio' | 'intro' | 'about' | 'testimonial' | 'description' | 'general';
  tags?: string[];
  
  // General
  description?: string;
}

// ============================================
// SCORED CONTENT
// ============================================

export interface ContentScores {
  relevance: number;  // 0-1
  quality: number;    // 0-1
  credibility: number; // 0-1
  engagement: number; // 0-1
  freshness: number;  // 0-1
}

export interface ScoredContent extends NormalizedContent {
  scores: ContentScores;
  final_score: number;
  assigned_section?: string | null;
  assigned_block_type?: string | null;
}

// ============================================
// EXTRACTION RESULTS
// ============================================

export interface YouTubeMetadata {
  title: string;
  description: string;
  thumbnail_url: string;
  channel_name?: string;
  published_at?: string;
  duration?: number;
  view_count?: number;
  like_count?: number;
}

export interface GitHubMetadata {
  title: string;
  description: string;
  stars: number;
  forks: number;
  language: string;
  topics: string[];
  created_at: string;
  updated_at: string;
  readme?: string;
}

export interface ImageMetadata {
  width: number;
  height: number;
  format: string;
  size_bytes: number;
}

export interface VideoMetadata {
  width: number;
  height: number;
  duration_seconds: number;
  format: string;
  size_bytes: number;
}

export interface PDFMetadata {
  page_count: number;
  text_content: string;
  word_count: number;
}
