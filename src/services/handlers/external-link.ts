/**
 * Universal External Link Handler
 * Resolves ANY URL into embeddable media + metadata.
 * Supports: X, Instagram, LinkedIn, YouTube, Google Drive, Behance,
 *           Dribbble, Vimeo, TikTok, and generic websites.
 * Based on 08_URL_PARSING.md
 */

import type { NormalizedContent, ContentSource, UserMetadata, MediaEmbed } from '../../types/index.js';
import { generateContentId, now } from '../../utils/index.js';
import { getPlatformDisplayName, type Platform } from '../../utils/platform-detection.js';
import { resolveMedia } from '../media-resolver.js';

/**
 * Process an external link — attempts to resolve rich media from the URL.
 * Falls back gracefully to a clickable card when embed is unavailable.
 */
export async function processExternalLink(
  url: string,
  platform: Platform,
  metadata?: UserMetadata
): Promise<NormalizedContent> {
  const displayName = getPlatformDisplayName(platform);

  // Resolve embed & thumbnail via the universal media resolver
  let embed: MediaEmbed | undefined;
  try {
    const resolved = await resolveMedia(url);
    embed = {
      embed_html: resolved.embed_html,
      thumbnail_url: resolved.thumbnail_url,
      platform_url: resolved.platform_url,
      platform_name: resolved.platform_name,
      media_type: resolved.media_type,
      width: resolved.width,
      height: resolved.height,
      author_name: resolved.author_name,
      author_url: resolved.author_url,
      duration_seconds: resolved.duration_seconds,
    };
  } catch (err) {
    console.warn(`Media resolution failed for ${url}:`, err);
    // Continue without embed — will render as a plain card
  }

  const title = metadata?.title || embed?.author_name || `${displayName} Link`;
  const description = metadata?.description || '';

  // Determine content type based on resolved media
  const isVideo = embed?.media_type === 'video';
  const contentType = isVideo ? 'video' as const : 'external_link' as const;

  return {
    content_id: generateContentId(),
    type: contentType,
    source: platform as ContentSource,
    original_url: url,
    title,
    description,
    extracted_data: {
      platform,
      thumbnail_url: embed?.thumbnail_url,
      embed_html: embed?.embed_html,
      platform_url: url,
      platform_name: embed?.platform_name || displayName,
      media_type: embed?.media_type || 'rich',
      description: `View on ${embed?.platform_name || displayName}`,
      duration_seconds: embed?.duration_seconds,
    },
    media_embed: embed,
    created_at: now(),
  };
}