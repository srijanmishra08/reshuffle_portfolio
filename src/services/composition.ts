
/**
 * Composition Engine
 * Generates portfolio JSON from scored content
 * Based on 06_COMPOSITION_ENGINE.md
 */

import type {
  Category,
  Portfolio,
  Section,
  SectionId,
  Block,
  BlockType,
  ScoredContent,
  Navigation,
  Analytics
} from '../types/index.js';
import { generatePortfolioId, generateBlockId, now } from '../utils/index.js';
import { buildBlock } from './block-builder.js';

// ============================================
// SECTION CONFIGURATION
// ============================================

interface SectionConfig {
  id: SectionId;
  order: number;
  required: boolean;
  minBlocks: number;
  maxBlocks: number;
  preferredTypes: BlockType[];
  contentFilter: (content: ScoredContent, category: Category) => boolean;
}

const SECTION_CONFIGS: SectionConfig[] = [
  {
    id: 'hook',
    order: 1,
    required: true,
    minBlocks: 1,
    maxBlocks: 2,
    preferredTypes: ['metric', 'media', 'expandable_text'],
    contentFilter: (content, _category) => {
      // Hook: Best performing content, intro text, or metrics
      if (content.type === 'video') return true;
      if (content.source === 'youtube') return true;
      // Bio/intro text belongs in hook
      if (content.type === 'text') {
        const textType = content.extracted_data?.text_type;
        if (textType === 'intro' || textType === 'bio') return true;
      }
      return content.final_score > 0.6;
    }
  },
  {
    id: 'credibility',
    order: 2,
    required: true,
    minBlocks: 1,
    maxBlocks: 3,
    preferredTypes: ['expandable_text', 'external_link', 'metric'],
    contentFilter: (content) => {
      // Credibility: Credentials, certifications, social profiles, testimonials
      if (content.type === 'pdf') return true;
      // Only social profile links go to credibility (not work showcase links)
      if (content.type === 'external_link') {
        const socialSources = ['github', 'linkedin', 'instagram', 'twitter', 'tiktok'];
        return socialSources.includes(content.source);
      }
      if (content.source === 'github') return true;
      return content.scores.credibility > 0.5;
    }
  },
  {
    id: 'work',
    order: 3,
    required: true,
    minBlocks: 1,
    maxBlocks: 6,
    preferredTypes: ['gallery', 'scroll_container', 'media', 'comparison', 'external_link'],
    contentFilter: (content) => {
      // Work: Portfolio items, case studies, projects, work showcase links
      if (content.type === 'image') return true;
      if (content.type === 'video') return true;
      if (content.type === 'code') return true;
      // Work showcase links (websites) go to work section
      if (content.type === 'external_link') {
        const socialSources = ['github', 'linkedin', 'instagram', 'twitter', 'tiktok'];
        // If it's NOT a social profile, it's a work link
        return !socialSources.includes(content.source);
      }
      // Don't put text in work section
      if (content.type === 'text') return false;
      if (content.type === 'pdf') return false;
      return content.scores.quality > 0.4;
    }
  },
  {
    id: 'process',
    order: 4,
    required: false,
    minBlocks: 0,
    maxBlocks: 2,
    preferredTypes: ['timeline', 'expandable_text', 'hotspot_media'],
    contentFilter: (content) => {
      // Process: How they work, methodology, about sections
      if (content.type === 'text') {
        const textType = content.extracted_data?.text_type;
        // About and general descriptions go here
        if (textType === 'about' || textType === 'description' || textType === 'general') return true;
      }
      if (content.type === 'pdf' && !content.extracted_data?.is_resume) return true;
      return false;
    }
  },
  {
    id: 'action',
    order: 5,
    required: true,
    minBlocks: 1,
    maxBlocks: 1,
    preferredTypes: ['cta'],
    contentFilter: () => false // CTA is generated, not from content
  }
];

// ============================================
// CATEGORY-SPECIFIC RULES
// ============================================

const CATEGORY_HOOK_TYPES: Record<Category, BlockType> = {
  Finance: 'metric',
  Entertainment: 'media',
  Design: 'comparison',
  Legal: 'expandable_text',
  Tech: 'media',
  Marketing: 'metric',
  Influencers: 'media',
  Business: 'metric'
};

// ============================================
// COMPOSITION FUNCTIONS
// ============================================

/**
 * Assign content to sections based on scores and filters
 */
function assignContentToSections(
  scoredContent: ScoredContent[],
  category: Category
): Map<SectionId, ScoredContent[]> {
  const assignments = new Map<SectionId, ScoredContent[]>();
  const usedContent = new Set<string>();
  
  // Initialize all sections
  for (const config of SECTION_CONFIGS) {
    assignments.set(config.id, []);
  }
  
  // First pass: assign content to best-fit sections
  for (const config of SECTION_CONFIGS) {
    if (config.id === 'action') continue; // CTA generated separately
    
    const candidates = scoredContent
      .filter(c => !usedContent.has(c.content_id))
      .filter(c => config.contentFilter(c, category))
      .slice(0, config.maxBlocks);
    
    for (const content of candidates) {
      assignments.get(config.id)!.push(content);
      usedContent.add(content.content_id);
    }
  }
  
  // Second pass: fill empty required sections with remaining content
  for (const config of SECTION_CONFIGS) {
    if (!config.required) continue;
    if (config.id === 'action') continue;
    
    const assigned = assignments.get(config.id)!;
    if (assigned.length < config.minBlocks) {
      const remaining = scoredContent
        .filter(c => !usedContent.has(c.content_id))
        .slice(0, config.minBlocks - assigned.length);
      
      for (const content of remaining) {
        assigned.push(content);
        usedContent.add(content.content_id);
      }
    }
  }
  
  return assignments;
}

/**
 * Determine the best block type for content in a section
 */
function selectBlockType(
  content: ScoredContent,
  sectionId: SectionId,
  category: Category
): BlockType {
  const sectionConfig = SECTION_CONFIGS.find(c => c.id === sectionId)!;
  
  // Content-type specific overrides (regardless of section)
  // PDFs should always be expandable_text, never media
  if (content.type === 'pdf') {
    return 'expandable_text';
  }
  
  // Text content should always be expandable_text
  if (content.type === 'text') {
    return 'expandable_text';
  }
  
  // External links should stay as external_link
  if (content.type === 'external_link') {
    return 'external_link';
  }
  
  // GitHub profiles should be external_link with rich preview
  if (content.source === 'github' && content.extracted_data?.is_profile) {
    return 'external_link';
  }
  
  // For hook section with media content, use category-specific type
  if (sectionId === 'hook') {
    return CATEGORY_HOOK_TYPES[category];
  }
  
  // Match content type to block type
  const typeMapping: Record<string, BlockType> = {
    'video': 'media',
    'image': 'media',
    'pdf': 'expandable_text',
    'text': 'expandable_text',
    'code': 'expandable_text',
    'external_link': 'external_link'
  };
  
  const mappedType = typeMapping[content.type];
  
  // If mapped type is in preferred types for this section, use it
  if (mappedType && sectionConfig.preferredTypes.includes(mappedType)) {
    return mappedType;
  }
  
  // Fall back to first preferred type
  return sectionConfig.preferredTypes[0];
}

/**
 * Build a section with blocks
 */
function buildSection(
  sectionId: SectionId,
  contents: ScoredContent[],
  category: Category
): Section {
  const config = SECTION_CONFIGS.find(c => c.id === sectionId)!;
  
  const blocks: Block[] = contents.map(content => {
    const blockType = selectBlockType(content, sectionId, category);
    return buildBlock(content, blockType, sectionId);
  });
  
  return {
    section_id: sectionId,
    order: config.order,
    layout: sectionId === 'hook' ? 'full' : 'contained',
    visibility: {
      initial: 'visible',
      min_content_required: config.minBlocks
    },
    blocks
  };
}

/**
 * Build the CTA section
 */
function buildCTASection(userId: string, _title: string): Section {
  const ctaBlock: Block = {
    block_id: generateBlockId(),
    block_type: 'cta',
    content: {
      primary_action: {
        label: 'Get in Touch',
        action_type: 'open_chat',
        payload: {
          user_id: userId
        },
        style: 'filled'
      },
      secondary_action: {
        label: 'Save Card',
        action_type: 'save_card',
        payload: {}
      },
      urgency_text: null
    },
    visibility: {
      initial: 'expanded',
      priority: 'high'
    },
    style: {
      padding: 'large'
    }
  };
  
  return {
    section_id: 'action',
    order: 5,
    layout: 'contained',
    visibility: {
      initial: 'visible',
      min_content_required: 1
    },
    blocks: [ctaBlock]
  };
}

/**
 * Build navigation structure
 */
function buildNavigation(portfolioId: string, sections: Section[]): Navigation {
  const anchors: Record<string, string> = {};
  const quickNavItems: Array<{ label: string; target_section: string; icon: string }> = [];
  
  const sectionLabels: Record<SectionId, { label: string; icon: string }> = {
    hook: { label: 'Overview', icon: 'star.fill' },
    credibility: { label: 'About', icon: 'person.fill' },
    work: { label: 'Work', icon: 'briefcase.fill' },
    process: { label: 'Process', icon: 'gearshape.fill' },
    action: { label: 'Contact', icon: 'message.fill' }
  };
  
  for (const section of sections) {
    anchors[section.section_id] = `section_${section.section_id}`;
    
    const labelInfo = sectionLabels[section.section_id];
    quickNavItems.push({
      label: labelInfo.label,
      target_section: section.section_id,
      icon: labelInfo.icon
    });
  }
  
  return {
    anchors,
    deep_links: {
      enabled: true,
      base_url: `reshuffle://portfolio/${portfolioId}`,
      section_format: `reshuffle://portfolio/${portfolioId}/{section_id}`,
      block_format: `reshuffle://portfolio/${portfolioId}/block/{block_id}`
    },
    state_preservation: {
      enabled: true,
      restore_scroll_position: true,
      restore_expanded_state: true
    },
    quick_nav: {
      enabled: true,
      items: quickNavItems
    }
  };
}

/**
 * Build analytics configuration
 */
function buildAnalytics(): Analytics {
  return {
    enabled: true,
    track_events: [
      'portfolio_view',
      'section_view',
      'block_interaction',
      'cta_click',
      'external_link_click',
      'share'
    ]
  };
}

// ============================================
// MAIN COMPOSITION FUNCTION
// ============================================

export interface ComposeOptions {
  userId: string;
  category: Category;
  title: string;
  subtitle: string;
}

/**
 * Compose a complete portfolio from scored content
 */
export function composePortfolio(
  scoredContent: ScoredContent[],
  options: ComposeOptions
): Portfolio {
  const { userId, category, title, subtitle } = options;
  const portfolioId = generatePortfolioId();
  
  // Assign content to sections
  const assignments = assignContentToSections(scoredContent, category);
  
  // Build sections
  const sections: Section[] = [];
  
  for (const config of SECTION_CONFIGS) {
    if (config.id === 'action') {
      // Build CTA separately
      sections.push(buildCTASection(userId, title));
      continue;
    }
    
    const sectionContent = assignments.get(config.id)!;
    
    // Skip optional sections with no content
    if (!config.required && sectionContent.length === 0) {
      continue;
    }
    
    // Build section even if empty (for required sections)
    if (sectionContent.length > 0 || config.required) {
      sections.push(buildSection(config.id, sectionContent, category));
    }
  }
  
  // Sort sections by order
  sections.sort((a, b) => a.order - b.order);
  
  // Build portfolio
  const portfolio: Portfolio = {
    portfolio_id: portfolioId,
    user_id: userId,
    category,
    version: 'v1',
    meta: {
      title,
      subtitle,
      created_at: now(),
      updated_at: now(),
      language: 'en',
      theme: 'auto'
    },
    sections,
    navigation: buildNavigation(portfolioId, sections),
    analytics: buildAnalytics()
  };
  
  return portfolio;
}
