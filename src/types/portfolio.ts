/**
 * Portfolio Engine - Core Type Definitions
 * Based on 01_JSON_SCHEMAS.md
 */

// ============================================
// CATEGORIES
// ============================================

export const CATEGORIES = [
  'Finance',
  'Entertainment', 
  'Design',
  'Legal',
  'Tech',
  'Marketing',
  'Influencers',
  'Business'
] as const;

export type Category = typeof CATEGORIES[number];

// ============================================
// PORTFOLIO
// ============================================

export interface Portfolio {
  portfolio_id: string;
  user_id: string;
  category: Category;
  version: 'v1';
  meta: PortfolioMeta;
  sections: Section[];
  navigation: Navigation;
  analytics: Analytics;
}

export interface PortfolioMeta {
  title: string;
  subtitle: string;
  created_at: string;
  updated_at: string;
  language: string;
  theme: 'light' | 'dark' | 'auto';
}

// ============================================
// SECTIONS
// ============================================

export const SECTION_IDS = ['hook', 'credibility', 'work', 'process', 'action'] as const;
export type SectionId = typeof SECTION_IDS[number];

export interface Section {
  section_id: SectionId;
  order: number;
  layout: 'full' | 'contained' | 'split';
  visibility: {
    initial: 'visible' | 'collapsed';
    min_content_required: number;
  };
  blocks: Block[];
}

// ============================================
// BLOCKS
// ============================================

export const BLOCK_TYPES = [
  'media',
  'expandable_text',
  'hotspot_media',
  'scroll_container',
  'metric',
  'comparison',
  'cta',
  'timeline',
  'gallery',
  'external_link'
] as const;

export type BlockType = typeof BLOCK_TYPES[number];

export interface BaseBlock {
  block_id: string;
  block_type: BlockType;
  interaction?: Interaction;
  visibility: {
    initial: 'collapsed' | 'expanded';
    priority: 'high' | 'medium' | 'low';
  };
  style: {
    background?: string;
    padding: 'none' | 'small' | 'medium' | 'large';
  };
}

export interface MediaBlock extends BaseBlock {
  block_type: 'media';
  content: MediaContent;
}

export interface ExpandableTextBlock extends BaseBlock {
  block_type: 'expandable_text';
  content: ExpandableTextContent;
}

export interface MetricBlock extends BaseBlock {
  block_type: 'metric';
  content: MetricContent;
}

export interface ComparisonBlock extends BaseBlock {
  block_type: 'comparison';
  content: ComparisonContent;
}

export interface HotspotMediaBlock extends BaseBlock {
  block_type: 'hotspot_media';
  content: HotspotMediaContent;
}

export interface ScrollContainerBlock extends BaseBlock {
  block_type: 'scroll_container';
  content: ScrollContainerContent;
}

export interface CTABlock extends BaseBlock {
  block_type: 'cta';
  content: CTAContent;
}

export interface TimelineBlock extends BaseBlock {
  block_type: 'timeline';
  content: TimelineContent;
}

export interface GalleryBlock extends BaseBlock {
  block_type: 'gallery';
  content: GalleryContent;
}

export interface ExternalLinkBlock extends BaseBlock {
  block_type: 'external_link';
  content: ExternalLinkContent;
}

export type Block = 
  | MediaBlock 
  | ExpandableTextBlock 
  | MetricBlock 
  | ComparisonBlock 
  | HotspotMediaBlock 
  | ScrollContainerBlock 
  | CTABlock 
  | TimelineBlock 
  | GalleryBlock
  | ExternalLinkBlock;

// ============================================
// BLOCK CONTENT TYPES
// ============================================

export interface MediaContent {
  media_type: 'video' | 'image' | 'audio';
  source_url: string;
  thumbnail_url: string;
  fallback_url?: string | null;
  dimensions: {
    width: number;
    height: number;
    aspect_ratio: '9:16' | '16:9' | '1:1' | '4:5' | '4:3';
  };
  playback?: {
    autoplay: boolean;
    muted: boolean;
    loop: boolean;
    start_time?: number;
    end_time?: number | null;
  };
  caption?: string | null;
  accessibility?: {
    alt_text: string;
    transcript_url?: string | null;
  };
}

export interface ExpandableTextContent {
  title: string;
  summary: string;
  full_text: string;
  reading_time_seconds?: number;
  icon?: string | null;
  tags?: string[];
}

export interface MetricContent {
  headline: string;
  subheadline?: string | null;
  metrics: Array<{
    label: string;
    value: string;
    unit?: string | null;
    trend?: 'up' | 'down' | 'neutral' | null;
    highlight?: boolean;
  }>;
  source_attribution?: string | null;
  date_range?: {
    start?: string | null;
    end?: string | null;
  };
}

export interface ComparisonContent {
  comparison_type: 'before_after' | 'side_by_side' | 'slider';
  items: Array<{
    label: string;
    media_url: string;
    caption?: string | null;
  }>;
  context?: string | null;
}

export interface HotspotMediaContent {
  media_type: 'image';
  source_url: string;
  hotspots: Array<{
    hotspot_id: string;
    position: {
      x_percent: number;
      y_percent: number;
    };
    label: string;
    description: string;
    link_to?: string | null;
  }>;
}

export interface ScrollContainerContent {
  scroll_direction: 'horizontal' | 'vertical';
  items: Array<{
    item_id: string;
    title: string;
    subtitle?: string | null;
    media_url: string;
    detail_block_id?: string | null;
  }>;
  peek_next?: boolean;
  snap_to_item?: boolean;
}

export interface CTAContent {
  primary_action: {
    label: string;
    action_type: 'open_chat' | 'external_link' | 'calendar' | 'save_card' | 'share' | 'phone' | 'email';
    payload: {
      url?: string | null;
      user_id?: string | null;
      phone?: string | null;
      email?: string | null;
      calendar_link?: string | null;
    };
    style: 'filled' | 'outlined' | 'text';
  };
  secondary_action?: {
    label?: string | null;
    action_type?: string | null;
    payload?: Record<string, unknown>;
  };
  urgency_text?: string | null;
}

export interface TimelineContent {
  timeline_type: 'vertical' | 'horizontal';
  items: Array<{
    item_id: string;
    date: string;
    title: string;
    description?: string | null;
    icon?: string | null;
    media_url?: string | null;
  }>;
  show_connectors?: boolean;
}

export interface GalleryContent {
  gallery_type: 'carousel' | 'grid' | 'masonry';
  items: Array<{
    item_id: string;
    media_url: string;
    thumbnail_url: string;
    caption?: string | null;
    tap_action?: 'expand' | 'navigate' | null;
  }>;
  auto_advance?: boolean;
  show_indicators?: boolean;
}

export interface ExternalLinkContent {
  platform: 'instagram' | 'linkedin' | 'tiktok' | 'twitter' | 'behance' | 'dribbble' | 'other';
  url: string;
  title: string;
  description?: string | null;
  thumbnail_url?: string | null;
  display: {
    icon: string;
    label: string;
    style: 'card' | 'button' | 'minimal';
  };
}

// ============================================
// INTERACTIONS
// ============================================

export interface Interaction {
  on_tap?: InteractionAction;
  on_long_press?: InteractionAction;
  on_double_tap?: InteractionAction;
  on_swipe?: InteractionAction;
}

export interface InteractionAction {
  type: 'expand' | 'navigate' | 'reveal' | 'trigger_action';
  target: string;
  payload?: Record<string, unknown>;
}

// ============================================
// NAVIGATION
// ============================================

export interface Navigation {
  anchors: Record<string, string>;
  deep_links: {
    enabled: boolean;
    base_url: string;
    section_format: string;
    block_format: string;
  };
  state_preservation: {
    enabled: boolean;
    restore_scroll_position: boolean;
    restore_expanded_state: boolean;
  };
  quick_nav: {
    enabled: boolean;
    items: Array<{
      label: string;
      target_section: string;
      icon: string;
    }>;
  };
}

// ============================================
// ANALYTICS
// ============================================

export interface Analytics {
  enabled: boolean;
  track_events: string[];
  custom_events?: Array<{
    event_name: string;
    trigger: string;
    payload?: Record<string, unknown>;
  }>;
}

export interface AnalyticsEvent {
  event_id: string;
  event_type: string;
  timestamp: string;
  data: Record<string, unknown>;
}
