/**
 * Universal Media Resolver
 * Fetches embeddable media from any supported platform URL.
 * Uses oEmbed where available, falls back to Open Graph scraping,
 * and ultimately to platform-specific heuristics.
 *
 * Every resolved item returns:
 *  - embed_html (iframe / video tag the SSR renderer can drop in)
 *  - thumbnail_url (preview image)
 *  - platform_url  (original link for "View on …" button)
 *  - media_type    ('video' | 'image' | 'rich')
 */

import { mediaCache } from './cache.js';
import type { ContentSource } from '../types/index.js';
import { detectPlatform, extractYouTubeId } from '../utils/platform-detection.js';

// ============================================
// TYPES
// ============================================

export interface ResolvedMedia {
  /** Platform identifier */
  platform: ContentSource;
  /** 'video' | 'image' | 'rich' */
  media_type: 'video' | 'image' | 'rich';
  /** Title of the content */
  title: string;
  /** Description / caption */
  description: string;
  /** Direct thumbnail / preview image URL */
  thumbnail_url: string;
  /** Embeddable HTML snippet (iframe, video tag, etc.) */
  embed_html: string;
  /** Original URL on the platform for the "View on …" button */
  platform_url: string;
  /** Platform display name */
  platform_name: string;
  /** Width hint for the embed */
  width?: number;
  /** Height hint for the embed */
  height?: number;
  /** Duration in seconds (if video) */
  duration_seconds?: number;
  /** Author / channel / username */
  author_name?: string;
  /** Author profile URL */
  author_url?: string;
}

// ============================================
// oEmbed PROVIDERS
// ============================================

interface OEmbedProvider {
  name: string;
  endpoint: string;
  urlPatterns: RegExp[];
}

const OEMBED_PROVIDERS: OEmbedProvider[] = [
  {
    name: 'YouTube',
    endpoint: 'https://www.youtube.com/oembed',
    urlPatterns: [/youtube\.com\/watch/i, /youtu\.be\//i, /youtube\.com\/shorts\//i],
  },
  {
    name: 'Vimeo',
    endpoint: 'https://vimeo.com/api/oembed.json',
    urlPatterns: [/vimeo\.com\/\d+/i],
  },
  {
    name: 'Instagram',
    endpoint: 'https://graph.facebook.com/v18.0/instagram_oembed',
    urlPatterns: [/instagram\.com\/(p|reel|tv)\//i],
  },
  {
    name: 'TikTok',
    endpoint: 'https://www.tiktok.com/oembed',
    urlPatterns: [/tiktok\.com\/@[\w.]+\/video\//i],
  },
  {
    name: 'Twitter',
    endpoint: 'https://publish.twitter.com/oembed',
    urlPatterns: [/twitter\.com\/\w+\/status\//i, /x\.com\/\w+\/status\//i],
  },
  {
    name: 'Dribbble',
    endpoint: 'https://dribbble.com/oauth/oembed',
    urlPatterns: [/dribbble\.com\/shots\//i],
  },
];

// ============================================
// RESOLVE HELPERS
// ============================================

const TIMEOUT_MS = parseInt(process.env.OEMBED_TIMEOUT_MS || '8000', 10);

async function fetchWithTimeout(url: string, timeoutMs: number = TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Try fetching oEmbed data for a URL from known providers
 */
async function tryOEmbed(url: string): Promise<any | null> {
  for (const provider of OEMBED_PROVIDERS) {
    const matches = provider.urlPatterns.some(p => p.test(url));
    if (!matches) continue;

    const endpoint = `${provider.endpoint}?url=${encodeURIComponent(url)}&format=json&maxwidth=800`;
    try {
      const res = await fetchWithTimeout(endpoint);
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // provider unreachable – continue
    }
  }
  return null;
}

/**
 * Scrape Open Graph meta tags as a fallback.
 * This is intentionally lightweight – no full HTML parsing.
 */
async function scrapeOpenGraph(url: string): Promise<Record<string, string>> {
  try {
    const res = await fetchWithTimeout(url);
    if (!res.ok) return {};
    const html = await res.text();

    const og: Record<string, string> = {};
    const metaRegex = /<meta\s+(?:property|name)=["'](og|twitter):([^"']+)["']\s+content=["']([^"']*)["']\s*\/?>/gi;
    let match: RegExpExecArray | null;
    while ((match = metaRegex.exec(html)) !== null) {
      og[`${match[1]}:${match[2]}`] = match[3];
    }

    // Also grab <title>
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    if (titleMatch) og['title'] = titleMatch[1].trim();

    return og;
  } catch {
    return {};
  }
}

// ============================================
// PLATFORM-SPECIFIC RESOLVERS
// ============================================

function resolveYouTube(url: string, oembed: any | null): ResolvedMedia {
  const videoId = extractYouTubeId(url);
  const thumb = oembed?.thumbnail_url
    || (videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : '');

  return {
    platform: 'youtube',
    media_type: 'video',
    title: oembed?.title || 'YouTube Video',
    description: '',
    thumbnail_url: thumb,
    embed_html: videoId
      ? `<iframe src="https://www.youtube.com/embed/${videoId}?rel=0" width="800" height="450" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen loading="lazy"></iframe>`
      : '',
    platform_url: url,
    platform_name: 'YouTube',
    width: 800,
    height: 450,
    author_name: oembed?.author_name,
    author_url: oembed?.author_url,
  };
}

function resolveVimeo(url: string, oembed: any | null): ResolvedMedia {
  const videoIdMatch = url.match(/vimeo\.com\/(\d+)/);
  const videoId = videoIdMatch?.[1] || '';

  return {
    platform: 'other',
    media_type: 'video',
    title: oembed?.title || 'Vimeo Video',
    description: oembed?.description || '',
    thumbnail_url: oembed?.thumbnail_url || '',
    embed_html: videoId
      ? `<iframe src="https://player.vimeo.com/video/${videoId}?dnt=1" width="800" height="450" frameborder="0" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen loading="lazy"></iframe>`
      : (oembed?.html || ''),
    platform_url: url,
    platform_name: 'Vimeo',
    width: oembed?.width || 800,
    height: oembed?.height || 450,
    author_name: oembed?.author_name,
    author_url: oembed?.author_url,
    duration_seconds: oembed?.duration,
  };
}

function resolveInstagram(url: string, oembed: any | null, og: Record<string, string>): ResolvedMedia {
  const isReel = /\/reel\//i.test(url);
  return {
    platform: 'instagram',
    media_type: isReel ? 'video' : 'image',
    title: oembed?.title || og['og:title'] || 'Instagram Post',
    description: og['og:description'] || '',
    thumbnail_url: oembed?.thumbnail_url || og['og:image'] || '',
    embed_html: oembed?.html
      || `<iframe src="https://www.instagram.com/${url.split('instagram.com/')[1]?.split('?')[0]}embed/" width="400" height="500" frameborder="0" scrolling="no" allowtransparency="true" loading="lazy"></iframe>`,
    platform_url: url,
    platform_name: 'Instagram',
    width: oembed?.thumbnail_width || 400,
    height: oembed?.thumbnail_height || 500,
    author_name: oembed?.author_name,
    author_url: oembed?.author_url,
  };
}

function resolveTikTok(url: string, oembed: any | null, og: Record<string, string>): ResolvedMedia {
  return {
    platform: 'tiktok',
    media_type: 'video',
    title: oembed?.title || og['og:title'] || 'TikTok Video',
    description: og['og:description'] || '',
    thumbnail_url: oembed?.thumbnail_url || og['og:image'] || '',
    embed_html: oembed?.html || '',
    platform_url: url,
    platform_name: 'TikTok',
    width: oembed?.thumbnail_width,
    height: oembed?.thumbnail_height,
    author_name: oembed?.author_name,
    author_url: oembed?.author_url,
  };
}

function resolveTwitter(url: string, oembed: any | null, og: Record<string, string>): ResolvedMedia {
  const hasVideo = og['og:type'] === 'video' || og['twitter:card'] === 'player';
  return {
    platform: 'twitter',
    media_type: hasVideo ? 'video' : 'rich',
    title: og['og:title'] || 'X Post',
    description: og['og:description'] || '',
    thumbnail_url: og['og:image'] || og['twitter:image'] || '',
    embed_html: oembed?.html || '',
    platform_url: url,
    platform_name: 'X (Twitter)',
    author_name: oembed?.author_name,
    author_url: oembed?.author_url,
  };
}

function resolveLinkedIn(url: string, og: Record<string, string>): ResolvedMedia {
  const hasVideo = og['og:type']?.includes('video') || og['og:video'] !== undefined;
  return {
    platform: 'linkedin',
    media_type: hasVideo ? 'video' : 'rich',
    title: og['og:title'] || 'LinkedIn Post',
    description: og['og:description'] || '',
    thumbnail_url: og['og:image'] || '',
    embed_html: hasVideo && og['og:video']
      ? `<video src="${og['og:video']}" poster="${og['og:image'] || ''}" controls preload="metadata" style="max-width:100%;border-radius:8px" loading="lazy"></video>`
      : '',
    platform_url: url,
    platform_name: 'LinkedIn',
  };
}

function resolveBehance(url: string, og: Record<string, string>): ResolvedMedia {
  return {
    platform: 'behance',
    media_type: 'image',
    title: og['og:title'] || 'Behance Project',
    description: og['og:description'] || '',
    thumbnail_url: og['og:image'] || '',
    embed_html: og['og:image']
      ? `<img src="${og['og:image']}" alt="${og['og:title'] || 'Behance'}" style="max-width:100%;border-radius:8px" loading="lazy" />`
      : '',
    platform_url: url,
    platform_name: 'Behance',
  };
}

function resolveDribbble(url: string, oembed: any | null, og: Record<string, string>): ResolvedMedia {
  return {
    platform: 'dribbble',
    media_type: 'image',
    title: oembed?.title || og['og:title'] || 'Dribbble Shot',
    description: og['og:description'] || '',
    thumbnail_url: og['og:image'] || '',
    embed_html: oembed?.html
      || (og['og:image'] ? `<img src="${og['og:image']}" alt="${og['og:title'] || ''}" style="max-width:100%;border-radius:8px" loading="lazy" />` : ''),
    platform_url: url,
    platform_name: 'Dribbble',
    author_name: oembed?.author_name,
  };
}

function resolveGoogleDrive(url: string): ResolvedMedia {
  // Extract file ID from various Drive URL formats
  const idMatch = url.match(/\/d\/([a-zA-Z0-9_-]+)/)
    || url.match(/id=([a-zA-Z0-9_-]+)/)
    || url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  const fileId = idMatch?.[1] || '';

  const isVideo = /video|mp4|mov|webm/i.test(url);
  const thumbnailUrl = fileId
    ? `https://drive.google.com/thumbnail?id=${fileId}&sz=w800`
    : '';
  const embedUrl = fileId
    ? `https://drive.google.com/file/d/${fileId}/preview`
    : '';

  return {
    platform: 'other',
    media_type: isVideo ? 'video' : 'image',
    title: 'Google Drive File',
    description: '',
    thumbnail_url: thumbnailUrl,
    embed_html: embedUrl
      ? `<iframe src="${embedUrl}" width="800" height="450" frameborder="0" allow="autoplay" allowfullscreen loading="lazy"></iframe>`
      : '',
    platform_url: url,
    platform_name: 'Google Drive',
    width: 800,
    height: 450,
  };
}

function resolveGeneric(url: string, og: Record<string, string>): ResolvedMedia {
  const hasVideo = og['og:type']?.includes('video') || !!og['og:video'];
  return {
    platform: 'website',
    media_type: hasVideo ? 'video' : og['og:image'] ? 'image' : 'rich',
    title: og['og:title'] || og['title'] || url,
    description: og['og:description'] || '',
    thumbnail_url: og['og:image'] || '',
    embed_html: hasVideo && og['og:video']
      ? `<video src="${og['og:video']}" poster="${og['og:image'] || ''}" controls preload="metadata" style="max-width:100%;border-radius:8px" loading="lazy"></video>`
      : og['og:image']
        ? `<img src="${og['og:image']}" alt="${og['og:title'] || ''}" style="max-width:100%;border-radius:8px" loading="lazy" />`
        : '',
    platform_url: url,
    platform_name: new URL(url).hostname.replace('www.', ''),
  };
}

// ============================================
// MAIN RESOLVER
// ============================================

/**
 * Resolve any URL to embeddable media metadata.
 * Results are cached for efficiency.
 */
export async function resolveMedia(url: string): Promise<ResolvedMedia> {
  // Cache check
  const cached = mediaCache.get(url);
  if (cached) return cached as ResolvedMedia;

  const platform = detectPlatform(url);

  // Fetch oEmbed + OG in parallel for speed
  const [oembed, og] = await Promise.all([
    tryOEmbed(url),
    scrapeOpenGraph(url),
  ]);

  let resolved: ResolvedMedia;

  switch (platform) {
    case 'youtube':
      resolved = resolveYouTube(url, oembed);
      break;
    case 'instagram':
      resolved = resolveInstagram(url, oembed, og);
      break;
    case 'tiktok':
      resolved = resolveTikTok(url, oembed, og);
      break;
    case 'twitter':
      resolved = resolveTwitter(url, oembed, og);
      break;
    case 'linkedin':
      resolved = resolveLinkedIn(url, og);
      break;
    case 'behance':
      resolved = resolveBehance(url, og);
      break;
    case 'dribbble':
      resolved = resolveDribbble(url, oembed, og);
      break;
    default: {
      // Check for Google Drive / Vimeo before generic
      if (/drive\.google\.com/i.test(url)) {
        resolved = resolveGoogleDrive(url);
      } else if (/vimeo\.com/i.test(url)) {
        resolved = resolveVimeo(url, oembed);
      } else {
        resolved = resolveGeneric(url, og);
      }
    }
  }

  mediaCache.set(url, resolved);
  return resolved;
}
