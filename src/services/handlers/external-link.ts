/**
 * External Link Handler
 * Handles social media links (Instagram, LinkedIn, TikTok, etc.)
 * NO automatic extraction - user provides metadata
 * Based on 08_URL_PARSING.md
 */

import type { NormalizedContent, ContentSource, UserMetadata } from '../../types/index.js';
import { generateContentId, now } from '../../utils/index.js';
import { getPlatformDisplayName, Platform } from '../../utils/platform-detection.js';

/**
 * Process an external link (no automatic extraction)
 */
export function processExternalLink(
  url: string,
  platform: Platform,
  metadata?: UserMetadata
): NormalizedContent {
  const displayName = getPlatformDisplayName(platform);
  const title = metadata?.title || `${displayName} Link`;
  
  return {
    content_id: generateContentId(),
    type: 'external_link',
    source: platform as ContentSource,
    original_url: url,
    title: title,
    description: metadata?.description || '',
    extracted_data: {
      platform: platform,
      description: `View on ${displayName}`
    },
    created_at: now()
  };
}