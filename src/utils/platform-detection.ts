/**
 * Platform Detection
 * Detects platform from URL for routing to appropriate handler
 * Supports: YouTube, GitHub, Instagram, LinkedIn, TikTok, X/Twitter,
 *           Behance, Dribbble, Vimeo, Google Drive, Medium, and more.
 */

import type { ContentSource, ContentType } from '../types/index.js';

export type Platform = ContentSource;

const PLATFORM_PATTERNS: Record<string, RegExp[]> = {
  youtube: [
    /youtube\.com\/watch\?v=/i,
    /youtu\.be\//i,
    /youtube\.com\/shorts\//i,
    /youtube\.com\/embed\//i,
    /youtube\.com\/live\//i
  ],
  github: [
    /github\.com\/[\w-]+\/[\w.-]+/i,  // Matches repos: github.com/owner/repo
    /github\.com\/[\w-]+\/?$/i          // Matches profiles: github.com/username
  ],
  instagram: [
    /instagram\.com\/(p|reel|tv|stories)\//i,
    /instagr\.am\//i,
    /instagram\.com\/[\w.]+\/?$/i        // Profile pages
  ],
  linkedin: [
    /linkedin\.com\/(posts|pulse|feed|in\/[\w-]+\/detail)/i,
    /linkedin\.com\/embed/i,
    /lnkd\.in\//i
  ],
  tiktok: [
    /tiktok\.com\/@[\w.]+\/video\//i,
    /tiktok\.com\/@[\w.]+\/photo\//i,
    /vm\.tiktok\.com\//i
  ],
  twitter: [
    /twitter\.com\/\w+\/status\//i,
    /x\.com\/\w+\/status\//i,
    /twitter\.com\/i\/web\/status\//i
  ],
  behance: [
    /behance\.net\/gallery\//i,
    /behance\.net\/[\w-]+\/?$/i          // Profile pages
  ],
  dribbble: [
    /dribbble\.com\/shots\//i,
    /dribbble\.com\/[\w-]+\/?$/i         // Profile pages
  ],
  vimeo: [
    /vimeo\.com\/\d+/i,
    /player\.vimeo\.com\/video\//i
  ],
  drive: [
    /drive\.google\.com\/file\//i,
    /drive\.google\.com\/open/i,
    /docs\.google\.com\/presentation/i
  ],
  medium: [
    /medium\.com\//i,
    /[\w-]+\.medium\.com\//i
  ],
  spotify: [
    /open\.spotify\.com\/(track|episode|show|playlist)/i
  ],
  soundcloud: [
    /soundcloud\.com\//i
  ],
  pinterest: [
    /pinterest\.\w+\/pin\//i
  ],
  figma: [
    /figma\.com\/file\//i,
    /figma\.com\/design\//i,
    /figma\.com\/proto\//i
  ],
  notion: [
    /notion\.so\//i,
    /notion\.site\//i
  ],
  dropbox: [
    /dropbox\.com\/s\//i,
    /dropbox\.com\/scl\//i
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
        // Map extra platforms to ContentSource values
        if (['vimeo', 'drive', 'medium', 'spotify', 'soundcloud', 'pinterest', 'figma', 'notion', 'dropbox'].includes(platform)) {
          return 'other';  // These get resolved by the media resolver
        }
        return platform as Platform;
      }
    }
  }
  return 'website';
}

/**
 * Get the raw platform key (including extended platforms) — used by media resolver
 */
export function detectPlatformExtended(url: string): string {
  for (const [platform, patterns] of Object.entries(PLATFORM_PATTERNS)) {
    for (const pattern of patterns) {
      if (pattern.test(url)) {
        return platform;
      }
    }
  }
  return 'website';
}

/**
 * Check if platform supports automatic rich content extraction (API-based)
 */
export function isExtractable(platform: Platform): boolean {
  return platform === 'youtube' || platform === 'github';
}

/**
 * Check if platform supports media embedding (oEmbed / iframe)
 */
export function isEmbeddable(url: string): boolean {
  const extended = detectPlatformExtended(url);
  const embeddable = [
    'youtube', 'vimeo', 'instagram', 'tiktok', 'twitter',
    'dribbble', 'spotify', 'soundcloud', 'figma', 'drive'
  ];
  return embeddable.includes(extended);
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
    /youtube\.com\/embed\/([a-zA-Z0-9_-]+)/,
    /youtube\.com\/live\/([a-zA-Z0-9_-]+)/
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

export function getPlatformDisplayName(platform: ContentSource | string): string {
  const names: Record<string, string> = {
    youtube: 'YouTube',
    github: 'GitHub',
    instagram: 'Instagram',
    linkedin: 'LinkedIn',
    tiktok: 'TikTok',
    twitter: 'X (Twitter)',
    behance: 'Behance',
    dribbble: 'Dribbble',
    vimeo: 'Vimeo',
    drive: 'Google Drive',
    medium: 'Medium',
    spotify: 'Spotify',
    soundcloud: 'SoundCloud',
    pinterest: 'Pinterest',
    figma: 'Figma',
    notion: 'Notion',
    dropbox: 'Dropbox',
    upload: 'Upload',
    input: 'Text',
    website: 'Website',
    other: 'Link'
  };
  return names[platform] || platform;
}

export function getPlatformIcon(platform: ContentSource | string): string {
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
    vimeo: 'play.circle.fill',
    drive: 'folder.fill',
    medium: 'doc.text.fill',
    spotify: 'music.note.list',
    soundcloud: 'waveform',
    pinterest: 'pin.fill',
    figma: 'pencil.and.ruler.fill',
    notion: 'doc.fill',
    dropbox: 'arrow.down.circle.fill',
    upload: 'arrow.up.circle.fill',
    input: 'text.alignleft',
    website: 'globe',
    other: 'link'
  };
  return icons[platform] || 'link';
}

/**
 * Get the brand color hex for a platform (used in SSR rendering)
 */
export function getPlatformColor(platform: string): string {
  const colors: Record<string, string> = {
    youtube: '#FF0000',
    github: '#333333',
    instagram: '#E4405F',
    linkedin: '#0A66C2',
    tiktok: '#000000',
    twitter: '#1DA1F2',
    behance: '#1769FF',
    dribbble: '#EA4C89',
    vimeo: '#1AB7EA',
    drive: '#4285F4',
    medium: '#000000',
    spotify: '#1DB954',
    soundcloud: '#FF5500',
    pinterest: '#BD081C',
    figma: '#F24E1E',
    notion: '#000000',
    dropbox: '#0061FF',
    website: '#6366F1',
    other: '#6B7280',
  };
  return colors[platform] || '#6B7280';
}
