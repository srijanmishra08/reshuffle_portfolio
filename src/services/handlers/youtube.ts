/**
 * YouTube Handler
 * Extracts metadata from YouTube URLs using oEmbed (free, no API key)
 * Based on 08_URL_PARSING.md
 */

import type { NormalizedContent, YouTubeMetadata } from '../../types/index.js';
import { generateContentId, now, parseDuration } from '../../utils/index.js';
import { extractYouTubeId } from '../../utils/platform-detection.js';

// Simple in-memory cache
const cache = new Map<string, { data: YouTubeMetadata; expires: number }>();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

export async function extractYouTubeMetadata(url: string): Promise<YouTubeMetadata> {
  const videoId = extractYouTubeId(url);
  if (!videoId) {
    throw new Error('Invalid YouTube URL');
  }

  // Check cache
  const cached = cache.get(videoId);
  if (cached && cached.expires > Date.now()) {
    return cached.data;
  }

  // Try oEmbed first (no API key needed)
  const metadata = await fetchOEmbed(url, videoId);
  
  // Cache result
  cache.set(videoId, {
    data: metadata,
    expires: Date.now() + CACHE_TTL
  });

  return metadata;
}

async function fetchOEmbed(url: string, videoId: string): Promise<YouTubeMetadata> {
  const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;
  
  try {
    const response = await fetch(oembedUrl);
    
    if (!response.ok) {
      throw new Error(`oEmbed failed: ${response.status}`);
    }
    
    const data = await response.json() as {
      title?: string;
      thumbnail_url?: string;
      author_name?: string;
    };
    
    return {
      title: data.title || `YouTube Video ${videoId}`,
      description: '', // oEmbed doesn't provide description
      thumbnail_url: data.thumbnail_url || `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
      channel_name: data.author_name,
      // oEmbed doesn't provide these, but we set defaults
      view_count: undefined,
      like_count: undefined,
      duration: undefined,
      published_at: undefined
    };
  } catch (error) {
    // Fallback to minimal data
    console.warn('YouTube oEmbed failed, using minimal data:', error);
    return {
      title: `YouTube Video ${videoId}`,
      description: '',
      thumbnail_url: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
    };
  }
}

export async function processYouTubeURL(url: string): Promise<NormalizedContent> {
  const videoId = extractYouTubeId(url);
  if (!videoId) {
    throw new Error('Invalid YouTube URL');
  }

  const metadata = await extractYouTubeMetadata(url);

  return {
    content_id: generateContentId(),
    type: 'video',
    source: 'youtube',
    original_url: url,
    title: metadata.title,
    description: metadata.description,
    extracted_data: {
      thumbnail_url: metadata.thumbnail_url,
      embed_url: `https://www.youtube.com/embed/${videoId}`,
      channel_name: metadata.channel_name,
      view_count: metadata.view_count,
      like_count: metadata.like_count,
      duration_seconds: metadata.duration,
      published_at: metadata.published_at
    },
    created_at: now()
  };
}

// For YouTube Data API (if API key is provided)
export async function extractYouTubeMetadataAPI(
  videoId: string, 
  apiKey: string
): Promise<YouTubeMetadata> {
  const apiUrl = `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&key=${apiKey}&part=snippet,contentDetails,statistics`;
  
  const response = await fetch(apiUrl);
  
  if (!response.ok) {
    throw new Error(`YouTube API failed: ${response.status}`);
  }
  
  interface YouTubeAPIResponse {
    items?: Array<{
      snippet: {
        title: string;
        description: string;
        thumbnails?: { high?: { url: string }; default?: { url: string } };
        channelTitle: string;
        publishedAt: string;
      };
      statistics: {
        viewCount?: string;
        likeCount?: string;
      };
      contentDetails: {
        duration: string;
      };
    }>;
  }
  
  const data = await response.json() as YouTubeAPIResponse;
  
  if (!data.items || data.items.length === 0) {
    throw new Error('Video not found');
  }
  
  const item = data.items[0];
  const snippet = item.snippet;
  const stats = item.statistics;
  const content = item.contentDetails;
  
  return {
    title: snippet.title,
    description: snippet.description,
    thumbnail_url: snippet.thumbnails?.high?.url || snippet.thumbnails?.default?.url || '',
    channel_name: snippet.channelTitle,
    published_at: snippet.publishedAt,
    duration: parseDuration(content.duration),
    view_count: parseInt(stats.viewCount || '0', 10),
    like_count: parseInt(stats.likeCount || '0', 10)
  };
}
