/**
 * Platform Detection
 * Detects platform from URL for routing to appropriate handler
 */

import type { ContentSource, ContentType } from '../types/index.js';

export type Platform = ContentSource;

const PLATFORM_PATTERNS: Record<string, RegExp[]> = {
  youtube: [
    /youtube\.com\/watch\?v=/i,
    /youtu\.be\//i,
    /youtube\.com\/shorts\//i,
    /youtube\.com\/embed\//i
  ],
  github: [
    /github\.com\/[\w-]+\/[\w.-]+/i,  // Matches repos: github.com/owner/repo
    /github\.com\/[\w-]+\/?$/i          // Matches profiles: github.com/username
  ],
  instagram: [
    /instagram\.com\/(p|reel|tv)\//i,
    /instagr\.am\//i
  ],
  linkedin: [
    /linkedin\.com\/(posts|pulse|feed)/i,
    /lnkd\.in\//i
  ],
  tiktok: [
    /tiktok\.com\/@[\w.]+\/video\//i,
    /vm\.tiktok\.com\//i
  ],
  twitter: [
    /twitter\.com\/\w+\/status\//i,
    /x\.com\/\w+\/status\//i
  ],
  behance: [
    /behance\.net\/gallery\//i
  ],
  dribbble: [
    /dribbble\.com\/shots\//i
  ]
};

/**
 * Detect platform from URL
 * Returns the platform identifier string
 */
export function detectPlatform(url: string): Platform {
  for (const [platform, patterns] of Object.entries(PLATFORM_PATTERNS)) {
    for (const pattern of patterns) {
      if (pattern.test(url)) {
        return platform as Platform;
      }
    }
  }
  return 'website';
}

/**
 * Check if platform supports automatic content extraction
 */
export function isExtractable(platform: Platform): boolean {
  return platform === 'youtube' || platform === 'github';
}

/**
 * Get content type for platform
 */
export function getContentType(platform: Platform): ContentType {
  switch (platform) {
    case 'youtube':
      return 'video';
    case 'github':
      return 'code';
    default:
      return 'external_link';
  }
}

export function extractYouTubeId(url: string): string | null {
  // Handle various YouTube URL formats
  const patterns = [
    /youtube\.com\/watch\?v=([a-zA-Z0-9_-]+)/,
    /youtu\.be\/([a-zA-Z0-9_-]+)/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]+)/,
    /youtube\.com\/embed\/([a-zA-Z0-9_-]+)/
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  
  return null;
}

export function extractGitHubRepo(url: string): { owner: string; repo: string } | null {
  const match = url.match(/github\.com\/([^\/]+)\/([^\/\?#]+)/);
  if (!match) return null;
  
  return {
    owner: match[1],
    repo: match[2].replace(/\.git$/, '')
  };
}

export function getPlatformDisplayName(platform: ContentSource): string {
  const names: Record<string, string> = {
    youtube: 'YouTube',
    github: 'GitHub',
    instagram: 'Instagram',
    linkedin: 'LinkedIn',
    tiktok: 'TikTok',
    twitter: 'X (Twitter)',
    behance: 'Behance',
    dribbble: 'Dribbble',
    upload: 'Upload',
    input: 'Text',
    other: 'Link'
  };
  return names[platform] || platform;
}

export function getPlatformIcon(platform: ContentSource): string {
  // SF Symbol / Material Icon names
  const icons: Record<string, string> = {
    youtube: 'play.rectangle.fill',
    github: 'chevron.left.forwardslash.chevron.right',
    instagram: 'camera.fill',
    linkedin: 'briefcase.fill',
    tiktok: 'music.note',
    twitter: 'bubble.left.fill',
    behance: 'paintbrush.fill',
    dribbble: 'basketball.fill',
    upload: 'arrow.up.circle.fill',
    input: 'text.alignleft',
    other: 'link'
  };
  return icons[platform] || 'link';
}
