/**
 * Scoring Engine
 * Calculates content scores for portfolio composition
 * Based on 05_SCORING_HEURISTICS.md
 */

import type { 
  Category, 
  NormalizedContent, 
  ScoredContent, 
  ContentScores 
} from '../types/index.js';

// ============================================
// CATEGORY WEIGHTS
// Based on 04_CATEGORY_RULES.md
// ============================================

export const CATEGORY_WEIGHTS: Record<Category, ContentScores> = {
  Finance: {
    relevance: 0.25,
    quality: 0.20,
    credibility: 0.35,
    engagement: 0.10,
    freshness: 0.10
  },
  Entertainment: {
    relevance: 0.20,
    quality: 0.30,
    credibility: 0.10,
    engagement: 0.30,
    freshness: 0.10
  },
  Design: {
    relevance: 0.25,
    quality: 0.35,
    credibility: 0.10,
    engagement: 0.20,
    freshness: 0.10
  },
  Legal: {
    relevance: 0.20,
    quality: 0.15,
    credibility: 0.40,
    engagement: 0.05,
    freshness: 0.20
  },
  Tech: {
    relevance: 0.30,
    quality: 0.25,
    credibility: 0.20,
    engagement: 0.15,
    freshness: 0.10
  },
  Marketing: {
    relevance: 0.25,
    quality: 0.20,
    credibility: 0.15,
    engagement: 0.30,
    freshness: 0.10
  },
  Influencers: {
    relevance: 0.15,
    quality: 0.25,
    credibility: 0.10,
    engagement: 0.40,
    freshness: 0.10
  },
  Business: {
    relevance: 0.25,
    quality: 0.15,
    credibility: 0.35,
    engagement: 0.10,
    freshness: 0.15
  }
};

// ============================================
// CATEGORY KEYWORDS
// ============================================

const CATEGORY_KEYWORDS: Record<Category, string[]> = {
  Finance: [
    'finance', 'financial', 'investment', 'banking', 'accounting', 'cfo',
    'revenue', 'profit', 'roi', 'portfolio', 'audit', 'tax', 'budget',
    'forecast', 'valuation', 'equity', 'debt', 'capital', 'cash flow'
  ],
  Entertainment: [
    'entertainment', 'film', 'music', 'video', 'content', 'creative',
    'production', 'acting', 'directing', 'streaming', 'media', 'show',
    'performance', 'artist', 'celebrity', 'viral', 'views'
  ],
  Design: [
    'design', 'ui', 'ux', 'graphic', 'visual', 'brand', 'logo', 'creative',
    'interface', 'prototype', 'figma', 'sketch', 'adobe', 'illustration',
    'typography', 'color', 'layout', 'wireframe', 'aesthetic'
  ],
  Legal: [
    'legal', 'law', 'attorney', 'lawyer', 'litigation', 'contract',
    'compliance', 'regulation', 'court', 'case', 'settlement', 'rights',
    'intellectual property', 'patent', 'trademark', 'counsel'
  ],
  Tech: [
    'tech', 'technology', 'software', 'engineering', 'developer', 'code',
    'programming', 'api', 'cloud', 'data', 'ai', 'machine learning',
    'startup', 'product', 'architecture', 'system', 'scale', 'devops'
  ],
  Marketing: [
    'marketing', 'growth', 'seo', 'sem', 'social', 'campaign', 'brand',
    'conversion', 'analytics', 'content', 'digital', 'advertising',
    'engagement', 'reach', 'impression', 'click', 'lead', 'funnel'
  ],
  Influencers: [
    'influencer', 'creator', 'followers', 'viral', 'social media',
    'instagram', 'tiktok', 'youtube', 'brand deal', 'sponsorship',
    'engagement rate', 'audience', 'content creator', 'reach'
  ],
  Business: [
    'business', 'strategy', 'consulting', 'management', 'operations',
    'startup', 'entrepreneur', 'ceo', 'founder', 'leadership', 'growth',
    'scale', 'revenue', 'team', 'process', 'efficiency', 'optimization'
  ]
};

// ============================================
// SCORING FUNCTIONS
// ============================================

/**
 * Score content relevance to category (0-1)
 */
function scoreRelevance(content: NormalizedContent, category: Category): number {
  const keywords = CATEGORY_KEYWORDS[category];
  const extractedText = content.extracted_data?.extracted_text || '';
  const searchText = `${content.title} ${content.description} ${extractedText}`.toLowerCase();
  
  let matchCount = 0;
  for (const keyword of keywords) {
    if (searchText.includes(keyword.toLowerCase())) {
      matchCount++;
    }
  }
  
  // More matches = higher relevance, capped at 1.0
  const relevance = Math.min(matchCount / 5, 1.0);
  
  // Boost for certain content types per category
  let typeBoost = 0;
  if (category === 'Tech' && content.source === 'github') typeBoost = 0.2;
  if (category === 'Entertainment' && content.type === 'video') typeBoost = 0.2;
  if (category === 'Design' && content.type === 'image') typeBoost = 0.2;
  if (category === 'Finance' && content.type === 'pdf') typeBoost = 0.1;
  
  return Math.min(relevance + typeBoost, 1.0);
}

/**
 * Score content quality (0-1)
 */
function scoreQuality(content: NormalizedContent): number {
  let score = 0.5; // Base score
  
  // Has thumbnail
  if (content.extracted_data?.thumbnail_url) score += 0.1;
  
  // Has description
  if (content.description && content.description.length > 50) score += 0.1;
  
  // Video quality indicators
  if (content.type === 'video') {
    const width = content.extracted_data?.width;
    const height = content.extracted_data?.height;
    if (width && height) {
      // HD or higher
      if (width >= 1280 || height >= 720) score += 0.15;
      // 4K
      if (width >= 3840 || height >= 2160) score += 0.1;
    }
    // Has duration (means we extracted it)
    if (content.extracted_data?.duration_seconds && content.extracted_data.duration_seconds > 0) {
      score += 0.1;
    }
  }
  
  // Image quality
  if (content.type === 'image') {
    const width = content.extracted_data?.width;
    const height = content.extracted_data?.height;
    if (width && height && width >= 1000 && height >= 1000) {
      score += 0.15;
    }
  }
  
  // PDF with extracted text
  if (content.type === 'pdf' && content.extracted_data?.extracted_text) {
    score += 0.15;
    if (content.extracted_data?.page_count && content.extracted_data.page_count > 1) {
      score += 0.05;
    }
  }
  
  // GitHub with good README
  if (content.source === 'github' && content.extracted_data?.readme_preview) {
    if (content.extracted_data.readme_preview.length > 200) score += 0.15;
  }
  
  return Math.min(score, 1.0);
}

/**
 * Score content credibility (0-1)
 */
function scoreCredibility(content: NormalizedContent): number {
  let score = 0.3; // Base score
  
  // Trusted sources
  const trustedSources = ['youtube', 'github'];
  if (trustedSources.includes(content.source)) {
    score += 0.2;
  }
  
  // YouTube engagement
  if (content.source === 'youtube') {
    const views = content.extracted_data?.view_count;
    if (views) {
      if (views > 1000) score += 0.1;
      if (views > 10000) score += 0.1;
      if (views > 100000) score += 0.1;
    }
  }
  
  // GitHub stars
  if (content.source === 'github') {
    const stars = content.extracted_data?.stars;
    if (stars) {
      if (stars > 10) score += 0.1;
      if (stars > 100) score += 0.1;
      if (stars > 1000) score += 0.15;
    }
  }
  
  // PDF (often credentials/case studies)
  if (content.type === 'pdf') {
    score += 0.15;
  }
  
  // External links (less credible since no verification)
  if (content.type === 'external_link') {
    score -= 0.1;
  }
  
  return Math.max(0, Math.min(score, 1.0));
}

/**
 * Score content engagement potential (0-1)
 */
function scoreEngagement(content: NormalizedContent): number {
  let score = 0.3; // Base score
  
  // Video content is generally more engaging
  if (content.type === 'video') {
    score += 0.25;
  }
  
  // Images are visually engaging
  if (content.type === 'image') {
    score += 0.2;
  }
  
  // YouTube with high views
  if (content.source === 'youtube') {
    const views = content.extracted_data?.view_count;
    if (views) {
      if (views > 10000) score += 0.15;
      if (views > 100000) score += 0.15;
    }
    const likes = content.extracted_data?.like_count;
    if (likes && views) {
      const ratio = likes / views;
      if (ratio > 0.03) score += 0.1; // Good like ratio
    }
  }
  
  // Social proof links
  if (content.type === 'external_link') {
    const socialPlatforms = ['instagram', 'tiktok', 'linkedin'];
    if (socialPlatforms.includes(content.source)) {
      score += 0.15;
    }
  }
  
  // Long-form text is less immediately engaging
  if (content.type === 'text' || content.type === 'pdf') {
    score -= 0.1;
  }
  
  return Math.max(0, Math.min(score, 1.0));
}

/**
 * Score content freshness (0-1)
 */
function scoreFreshness(content: NormalizedContent): number {
  const createdAt = new Date(content.created_at);
  const now = new Date();
  const ageInDays = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
  
  // Decay function: newer content scores higher
  // Fresh (< 30 days): 1.0
  // Recent (30-90 days): 0.8
  // Moderate (90-365 days): 0.6
  // Older (1-2 years): 0.4
  // Old (> 2 years): 0.2
  
  if (ageInDays < 30) return 1.0;
  if (ageInDays < 90) return 0.8;
  if (ageInDays < 365) return 0.6;
  if (ageInDays < 730) return 0.4;
  return 0.2;
}

// ============================================
// MAIN SCORING FUNCTION
// ============================================

/**
 * Score a single content item for a given category
 */
export function scoreContent(
  content: NormalizedContent, 
  category: Category
): ScoredContent {
  const scores: ContentScores = {
    relevance: scoreRelevance(content, category),
    quality: scoreQuality(content),
    credibility: scoreCredibility(content),
    engagement: scoreEngagement(content),
    freshness: scoreFreshness(content)
  };
  
  const weights = CATEGORY_WEIGHTS[category];
  
  // Weighted average
  const finalScore = 
    scores.relevance * weights.relevance +
    scores.quality * weights.quality +
    scores.credibility * weights.credibility +
    scores.engagement * weights.engagement +
    scores.freshness * weights.freshness;
  
  return {
    ...content,
    scores,
    final_score: Math.round(finalScore * 100) / 100
  };
}

/**
 * Score multiple content items and sort by final score
 */
export function scoreContentBatch(
  contents: NormalizedContent[],
  category: Category
): ScoredContent[] {
  return contents
    .map(content => scoreContent(content, category))
    .sort((a, b) => b.final_score - a.final_score);
}
