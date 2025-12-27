/**
 * Block Builder
 * Transforms scored content into specific block types
 */

import type {
  Block,
  BlockType,
  SectionId,
  ScoredContent,
  MediaBlock,
  ExpandableTextBlock,
  MetricBlock,
  ComparisonBlock,
  GalleryBlock,
  TimelineBlock,
  CTABlock,
  ExternalLinkBlock,
  ScrollContainerBlock,
  HotspotMediaBlock
} from '../types/index.js';
import { generateBlockId } from '../utils/index.js';

/**
 * Build a block from content based on type
 */
export function buildBlock(
  content: ScoredContent,
  blockType: BlockType,
  sectionId: SectionId
): Block {
  const baseBlock = {
    block_id: generateBlockId(),
    visibility: {
      initial: sectionId === 'hook' ? 'expanded' : 'collapsed',
      priority: content.final_score > 0.7 ? 'high' : 'medium' as const
    },
    style: {
      padding: 'medium' as const
    }
  };

  switch (blockType) {
    case 'media':
      return buildMediaBlock(content, baseBlock);
    case 'expandable_text':
      return buildExpandableTextBlock(content, baseBlock);
    case 'metric':
      return buildMetricBlock(content, baseBlock);
    case 'comparison':
      return buildComparisonBlock(content, baseBlock);
    case 'gallery':
      return buildGalleryBlock(content, baseBlock);
    case 'timeline':
      return buildTimelineBlock(content, baseBlock);
    case 'external_link':
      return buildExternalLinkBlock(content, baseBlock);
    case 'scroll_container':
      return buildScrollContainerBlock(content, baseBlock);
    case 'hotspot_media':
      return buildHotspotMediaBlock(content, baseBlock);
    case 'cta':
      return buildCTABlock(content, baseBlock);
    default:
      // Fallback to media block
      return buildMediaBlock(content, baseBlock);
  }
}

function buildMediaBlock(content: ScoredContent, base: any): MediaBlock {
  const isVideo = content.type === 'video' || content.source === 'youtube';
  
  return {
    ...base,
    block_type: 'media',
    content: {
      media_type: isVideo ? 'video' : 'image',
      sources: [{
        url: content.file_path || content.extracted_data?.embed_url || '',
        quality: 'high' as const,
        mime_type: isVideo ? 'video/mp4' : 'image/jpeg'
      }],
      thumbnail: {
        url: content.extracted_data?.thumbnail_url || content.file_path || '',
        blurhash: null
      },
      alt_text: content.title || 'Media content',
      caption: content.description || null,
      playback: isVideo ? {
        autoplay: true,
        loop: true,
        muted: true,
        controls: true
      } : null,
      aspect_ratio: '16:9'
    }
  };
}

function buildExpandableTextBlock(content: ScoredContent, base: any): ExpandableTextBlock {
  let fullText = content.extracted_data?.extracted_text || 
                 content.extracted_data?.description ||
                 content.description || 
                 '';
  
  // For GitHub profiles, build rich text from profile data
  if (content.source === 'github' && content.extracted_data?.is_profile) {
    const parts: string[] = [];
    if (content.extracted_data.bio) {
      parts.push(content.extracted_data.bio);
    }
    if (content.extracted_data.followers !== undefined) {
      parts.push(`\n\n📊 ${content.extracted_data.followers} followers • ${content.extracted_data.public_repos || 0} repositories`);
    }
    if (content.extracted_data.location) {
      parts.push(`📍 ${content.extracted_data.location}`);
    }
    if (content.extracted_data.company) {
      parts.push(`🏢 ${content.extracted_data.company}`);
    }
    if (content.extracted_data.top_repos && content.extracted_data.top_repos.length > 0) {
      parts.push('\n\n🔥 Top Projects:');
      for (const repo of content.extracted_data.top_repos.slice(0, 3)) {
        parts.push(`• ${repo.name} - ${repo.description || 'No description'} (⭐${repo.stars})`);
      }
    }
    fullText = parts.join('\n') || 'GitHub Profile';
  }
  
  const preview = fullText.slice(0, 200) + (fullText.length > 200 ? '...' : '');
  
  // Extract tags from content
  const tags: string[] = content.extracted_data?.tags || 
                         content.extracted_data?.topics || 
                         content.extracted_data?.skills ||
                         [];
  
  // Determine header based on content type
  let header = content.title || 'Details';
  if (content.type === 'text' && content.extracted_data?.text_type) {
    const typeHeaders: Record<string, string> = {
      'bio': 'About Me',
      'intro': 'Introduction',
      'about': 'About',
      'testimonial': 'Testimonial',
      'description': 'Description',
      'general': content.title || 'Details'
    };
    header = typeHeaders[content.extracted_data.text_type] || header;
  }
  
  return {
    ...base,
    block_type: 'expandable_text',
    content: {
      preview: {
        text: preview,
        max_lines: 3
      },
      full_content: {
        text: fullText,
        format: 'plain'
      },
      header,
      tags: tags.slice(0, 5)
    }
  };
}

function buildMetricBlock(content: ScoredContent, base: any): MetricBlock {
  // Extract metrics from content
  const metrics: Array<{
    label: string;
    value: string;
    unit: string | null;
    trend: { direction: 'up' | 'down' | 'neutral'; percentage: number } | null;
  }> = [];
  
  // Try to extract from YouTube stats
  if (content.extracted_data?.view_count) {
    metrics.push({
      label: 'Views',
      value: formatNumber(content.extracted_data.view_count),
      unit: null,
      trend: { direction: 'up', percentage: 0 }
    });
  }
  
  // Try to extract from GitHub profile stats
  if (content.extracted_data?.is_profile) {
    if (content.extracted_data.followers !== undefined) {
      metrics.push({
        label: 'Followers',
        value: formatNumber(content.extracted_data.followers),
        unit: null,
        trend: null
      });
    }
    if (content.extracted_data.public_repos !== undefined) {
      metrics.push({
        label: 'Repos',
        value: formatNumber(content.extracted_data.public_repos),
        unit: null,
        trend: null
      });
    }
  }
  
  // Try to extract from GitHub repo stats
  if (content.extracted_data?.stars !== undefined) {
    metrics.push({
      label: 'Stars',
      value: formatNumber(content.extracted_data.stars),
      unit: null,
      trend: null
    });
  }
  
  if (content.extracted_data?.forks !== undefined) {
    metrics.push({
      label: 'Forks',
      value: formatNumber(content.extracted_data.forks),
      unit: null,
      trend: null
    });
  }
  
  // Default metric if none extracted
  if (metrics.length === 0) {
    metrics.push({
      label: 'Quality Score',
      value: Math.round(content.final_score * 100).toString(),
      unit: '%',
      trend: { direction: 'up', percentage: 10 }
    });
  }
  
  return {
    ...base,
    block_type: 'metric',
    content: {
      metrics: metrics.slice(0, 4), // Max 4 metrics
      layout: metrics.length <= 2 ? 'horizontal' : 'grid',
      style: 'prominent'
    }
  };
}

function buildComparisonBlock(content: ScoredContent, base: any): ComparisonBlock {
  // Comparison blocks need before/after images
  // Default to showing the content as "after" with placeholder for "before"
  return {
    ...base,
    block_type: 'comparison',
    content: {
      before: {
        url: '/placeholder-before.jpg',
        label: 'Before'
      },
      after: {
        url: content.file_path || content.extracted_data?.thumbnail_url || '',
        label: 'After'
      },
      slider: {
        initial_position: 50,
        orientation: 'horizontal'
      },
      caption: content.description || null
    }
  };
}

function buildGalleryBlock(content: ScoredContent, base: any): GalleryBlock {
  // Single item gallery - could be expanded if content has multiple images
  const items = [{
    url: content.file_path || content.extracted_data?.thumbnail_url || '',
    thumbnail_url: content.file_path || content.extracted_data?.thumbnail_url || '',
    caption: content.description || null,
    media_type: 'image' as const
  }];
  
  return {
    ...base,
    block_type: 'gallery',
    content: {
      items,
      layout: {
        type: 'grid',
        columns: 2
      },
      lightbox: {
        enabled: true,
        show_captions: true
      }
    }
  };
}

function buildTimelineBlock(content: ScoredContent, base: any): TimelineBlock {
  // Parse text content into timeline entries
  const text = content.extracted_data?.extracted_text || content.description || '';
  
  const entries = [{
    date: new Date().toISOString(),
    title: content.title || 'Entry',
    description: text.slice(0, 200),
    marker: {
      icon: 'circle.fill',
      color: '#007AFF'
    }
  }];
  
  return {
    ...base,
    block_type: 'timeline',
    content: {
      entries,
      orientation: 'vertical',
      style: 'connected'
    }
  };
}

function buildExternalLinkBlock(content: ScoredContent, base: any): ExternalLinkBlock {
  // Determine platform from content
  let platform: 'instagram' | 'tiktok' | 'linkedin' | 'github' | 'youtube' | 'website' = 'website';
  
  if (content.source === 'instagram') platform = 'instagram';
  else if (content.source === 'tiktok') platform = 'tiktok';
  else if (content.source === 'linkedin') platform = 'linkedin';
  else if (content.source === 'github') platform = 'github';
  else if (content.source === 'youtube') platform = 'youtube';
  
  // Build description with GitHub-specific info
  let description = content.description || '';
  if (content.source === 'github' && content.extracted_data?.is_profile) {
    const parts: string[] = [];
    if (content.extracted_data.followers) {
      parts.push(`${formatNumber(content.extracted_data.followers)} followers`);
    }
    if (content.extracted_data.public_repos) {
      parts.push(`${content.extracted_data.public_repos} repos`);
    }
    if (content.extracted_data.location) {
      parts.push(content.extracted_data.location);
    }
    if (parts.length > 0) {
      description = parts.join(' • ');
    }
  } else if (content.source === 'github' && content.extracted_data?.stars !== undefined) {
    const parts: string[] = [];
    if (content.extracted_data.language) {
      parts.push(content.extracted_data.language);
    }
    parts.push(`⭐ ${formatNumber(content.extracted_data.stars)}`);
    if (content.extracted_data.forks) {
      parts.push(`🍴 ${formatNumber(content.extracted_data.forks)}`);
    }
    description = parts.join(' • ');
  }
  
  return {
    ...base,
    block_type: 'external_link',
    content: {
      url: content.original_url || '',
      platform,
      preview: {
        title: content.title || 'External Link',
        description,
        thumbnail_url: content.extracted_data?.thumbnail_url || null,
        favicon_url: null
      },
      style: 'card',
      open_in: 'browser'
    }
  };
}

function buildScrollContainerBlock(content: ScoredContent, base: any): ScrollContainerBlock {
  // Create a scroll container with this content
  const childBlock = buildMediaBlock(content, { 
    ...base, 
    block_id: generateBlockId() 
  });
  
  return {
    ...base,
    block_type: 'scroll_container',
    content: {
      scroll_direction: 'horizontal',
      children: [childBlock],
      snap: {
        enabled: true,
        alignment: 'center'
      },
      indicators: {
        show: true,
        style: 'dots'
      }
    }
  };
}

function buildHotspotMediaBlock(content: ScoredContent, base: any): HotspotMediaBlock {
  return {
    ...base,
    block_type: 'hotspot_media',
    content: {
      base_media: {
        url: content.file_path || content.extracted_data?.thumbnail_url || '',
        media_type: 'image'
      },
      hotspots: [], // No hotspots by default
      interaction: {
        tap_behavior: 'show_tooltip',
        animation: 'pulse'
      }
    }
  };
}

function buildCTABlock(_content: ScoredContent, base: any): CTABlock {
  return {
    ...base,
    block_type: 'cta',
    content: {
      primary_action: {
        label: 'Contact',
        action_type: 'open_chat',
        payload: {},
        style: 'filled'
      },
      secondary_action: null,
      urgency_text: null
    }
  };
}

// ============================================
// HELPERS
// ============================================

function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
}
