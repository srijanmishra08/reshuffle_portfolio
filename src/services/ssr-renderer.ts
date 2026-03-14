/**
 * SSR Renderer
 * Server-side renders portfolio pages as complete HTML.
 * Every section includes text + media (video/image embeds).
 * External links show the embedded media + "View on {Platform}" button.
 */

import type { Portfolio, Section, Block } from '../types/index.js';
import { ssrCache } from './cache.js';
import { sanitizeString } from '../middleware/security.js';

// ============================================
// MAIN RENDER FUNCTION
// ============================================

export function renderPortfolioHTML(portfolio: Portfolio): string {
  const cacheKey = `ssr:${portfolio.portfolio_id}:${portfolio.meta.updated_at}`;
  const cached = ssrCache.get(cacheKey);
  if (cached) return cached;

  const sectionsHTML = portfolio.sections.map(s => renderSection(s, portfolio.category)).join('\n');

  const html = `<!DOCTYPE html>
<html lang="${esc(portfolio.meta.language || 'en')}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${esc(portfolio.meta.title)} — Portfolio</title>
  <meta name="description" content="${esc(portfolio.meta.subtitle || '')}">
  <meta name="robots" content="noindex, nofollow">
  <meta property="og:title" content="${esc(portfolio.meta.title)}">
  <meta property="og:description" content="${esc(portfolio.meta.subtitle || '')}">
  <meta property="og:type" content="profile">
  ${renderCSS()}
</head>
<body data-theme="${portfolio.meta.theme || 'auto'}">
  <header class="portfolio-header">
    <div class="container">
      <h1>${esc(portfolio.meta.title)}</h1>
      ${portfolio.meta.subtitle ? `<p class="subtitle">${esc(portfolio.meta.subtitle)}</p>` : ''}
      <span class="category-badge">${esc(portfolio.category)}</span>
    </div>
  </header>

  <nav class="quick-nav" aria-label="Portfolio sections">
    ${portfolio.navigation.quick_nav.items.map(item =>
      `<a href="#${item.target_section}" class="nav-pill">${esc(item.label)}</a>`
    ).join('')}
  </nav>

  <main class="portfolio-body">
    ${sectionsHTML}
  </main>

  <footer class="portfolio-footer">
    <p>Powered by <strong>ReShuffle</strong></p>
  </footer>
</body>
</html>`;

  ssrCache.set(cacheKey, html, 300);
  return html;
}

// ============================================
// SECTION RENDERER
// ============================================

function renderSection(section: Section, _category: string): string {
  const sectionNames: Record<string, string> = {
    hook: 'Overview',
    credibility: 'Credentials',
    work: 'Work',
    process: 'Process',
    action: 'Get in Touch',
  };
  const heading = sectionNames[section.section_id] || section.section_id;

  return `
  <section id="${section.section_id}" class="portfolio-section section-${section.section_id} layout-${section.layout}">
    <div class="container">
      <h2 class="section-heading">${esc(heading)}</h2>
      <div class="blocks-grid">
        ${section.blocks.map(b => renderBlock(b)).join('\n')}
      </div>
    </div>
  </section>`;
}

// ============================================
// BLOCK RENDERERS
// ============================================

function renderBlock(block: Block): string {
  switch (block.block_type) {
    case 'media':          return renderMediaBlock(block);
    case 'expandable_text': return renderExpandableTextBlock(block);
    case 'metric':         return renderMetricBlock(block);
    case 'external_link':  return renderExternalLinkBlock(block);
    case 'gallery':        return renderGalleryBlock(block);
    case 'timeline':       return renderTimelineBlock(block);
    case 'comparison':     return renderComparisonBlock(block);
    case 'cta':            return renderCTABlock(block);
    case 'scroll_container': return renderScrollContainerBlock(block);
    case 'hotspot_media':  return renderHotspotMediaBlock(block);
    default:               return `<div class="block block-unknown">Unsupported block</div>`;
  }
}

function renderMediaBlock(block: any): string {
  const c = block.content;
  const isVideo = c.media_type === 'video';

  // If we have an embed_html from resolved media, use it
  if (c.embed_html) {
    return `
    <div class="block block-media" id="${block.block_id}">
      <div class="media-embed">${c.embed_html}</div>
      ${c.caption ? `<p class="media-caption">${esc(c.caption)}</p>` : ''}
    </div>`;
  }

  // Check for sources array (new format)
  const sourceUrl = c.sources?.[0]?.url || c.source_url || '';
  const thumbnailUrl = c.thumbnail?.url || c.thumbnail_url || '';

  if (isVideo) {
    return `
    <div class="block block-media block-video" id="${block.block_id}">
      <video
        src="${esc(sourceUrl)}"
        poster="${esc(thumbnailUrl)}"
        ${c.playback?.controls !== false ? 'controls' : ''}
        ${c.playback?.autoplay ? 'autoplay' : ''}
        ${c.playback?.muted ? 'muted' : ''}
        ${c.playback?.loop ? 'loop' : ''}
        preload="metadata"
        playsinline
        style="width:100%;border-radius:12px"
      ></video>
      ${c.caption ? `<p class="media-caption">${esc(c.caption)}</p>` : ''}
    </div>`;
  }

  return `
  <div class="block block-media block-image" id="${block.block_id}">
    <img src="${esc(sourceUrl || thumbnailUrl)}" alt="${esc(c.alt_text || c.caption || 'Image')}" loading="lazy" style="width:100%;border-radius:12px" />
    ${c.caption ? `<p class="media-caption">${esc(c.caption)}</p>` : ''}
  </div>`;
}

function renderExpandableTextBlock(block: any): string {
  const c = block.content;
  const header = c.header || c.title || 'Details';
  const preview = c.preview?.text || c.summary || '';
  const full = c.full_content?.text || c.full_text || preview;
  const tags = c.tags || [];

  return `
  <div class="block block-text" id="${block.block_id}">
    <h3 class="text-header">${esc(header)}</h3>
    <p class="text-preview">${esc(preview)}</p>
    <details class="text-expand">
      <summary>Read more</summary>
      <div class="text-full">${esc(full)}</div>
    </details>
    ${tags.length ? `<div class="tags">${tags.map((t: string) => `<span class="tag">${esc(t)}</span>`).join('')}</div>` : ''}
  </div>`;
}

function renderMetricBlock(block: any): string {
  const c = block.content;
  const metrics = c.metrics || [];

  return `
  <div class="block block-metric" id="${block.block_id}">
    <div class="metrics-grid">
      ${metrics.map((m: any) => `
        <div class="metric-card">
          <span class="metric-value">${esc(m.value)}${m.unit ? esc(m.unit) : ''}</span>
          <span class="metric-label">${esc(m.label)}</span>
          ${m.trend ? `<span class="metric-trend trend-${m.trend.direction || m.trend}">
            ${(m.trend.direction || m.trend) === 'up' ? '↑' : (m.trend.direction || m.trend) === 'down' ? '↓' : '→'}
            ${m.trend.percentage ? m.trend.percentage + '%' : ''}
          </span>` : ''}
        </div>
      `).join('')}
    </div>
  </div>`;
}

function renderExternalLinkBlock(block: any): string {
  const c = block.content;
  const url = c.url || '';
  const platform = c.platform || 'website';
  const title = c.preview?.title || c.title || 'External Link';
  const description = c.preview?.description || c.description || '';
  const thumbnailUrl = c.preview?.thumbnail_url || c.thumbnail_url || '';
  const embedData = c.media_embed;

  // Build the embed section (video or image from the platform)
  let embedSection = '';
  if (embedData?.embed_html) {
    embedSection = `<div class="link-embed">${embedData.embed_html}</div>`;
  } else if (thumbnailUrl) {
    embedSection = `<div class="link-embed"><img src="${esc(thumbnailUrl)}" alt="${esc(title)}" loading="lazy" style="width:100%;border-radius:8px" /></div>`;
  }

  return `
  <div class="block block-external-link" id="${block.block_id}">
    <div class="external-link-card platform-${esc(platform)}">
      ${embedSection}
      <div class="link-info">
        <h4 class="link-title">${esc(title)}</h4>
        ${description ? `<p class="link-desc">${esc(description)}</p>` : ''}
        <a href="${esc(url)}" target="_blank" rel="noopener noreferrer" class="view-on-platform-btn platform-${esc(platform)}">
          View on ${esc(c.preview?.platform_name || getPlatformLabel(platform))} →
        </a>
      </div>
    </div>
  </div>`;
}

function renderGalleryBlock(block: any): string {
  const c = block.content;
  const items = c.items || [];

  return `
  <div class="block block-gallery" id="${block.block_id}">
    <div class="gallery-grid">
      ${items.map((item: any) => `
        <div class="gallery-item">
          ${item.media_type === 'video'
            ? `<video src="${esc(item.url || item.media_url)}" poster="${esc(item.thumbnail_url || '')}" controls preload="metadata" playsinline style="width:100%;border-radius:8px"></video>`
            : `<img src="${esc(item.url || item.media_url || item.thumbnail_url)}" alt="${esc(item.caption || '')}" loading="lazy" style="width:100%;border-radius:8px" />`
          }
          ${item.caption ? `<p class="gallery-caption">${esc(item.caption)}</p>` : ''}
        </div>
      `).join('')}
    </div>
  </div>`;
}

function renderTimelineBlock(block: any): string {
  const c = block.content;
  const entries = c.entries || c.items || [];

  return `
  <div class="block block-timeline" id="${block.block_id}">
    <div class="timeline">
      ${entries.map((e: any) => `
        <div class="timeline-entry">
          <div class="timeline-marker"></div>
          <div class="timeline-content">
            <time class="timeline-date">${esc(e.date || '')}</time>
            <h4>${esc(e.title)}</h4>
            ${e.description ? `<p>${esc(e.description)}</p>` : ''}
            ${e.media_url ? `<img src="${esc(e.media_url)}" alt="" loading="lazy" style="max-width:100%;border-radius:8px;margin-top:8px" />` : ''}
          </div>
        </div>
      `).join('')}
    </div>
  </div>`;
}

function renderComparisonBlock(block: any): string {
  const c = block.content;
  return `
  <div class="block block-comparison" id="${block.block_id}">
    <div class="comparison-container">
      <div class="comparison-item">
        <span class="comparison-label">${esc(c.before?.label || 'Before')}</span>
        <img src="${esc(c.before?.url || '')}" alt="Before" loading="lazy" style="width:100%;border-radius:8px" />
      </div>
      <div class="comparison-item">
        <span class="comparison-label">${esc(c.after?.label || 'After')}</span>
        <img src="${esc(c.after?.url || '')}" alt="After" loading="lazy" style="width:100%;border-radius:8px" />
      </div>
    </div>
    ${c.caption ? `<p class="comparison-caption">${esc(c.caption)}</p>` : ''}
  </div>`;
}

function renderCTABlock(block: any): string {
  const c = block.content;
  const primary = c.primary_action;
  const secondary = c.secondary_action;

  let primaryHref = '#';
  if (primary?.payload?.url)    primaryHref = primary.payload.url;
  if (primary?.payload?.email)  primaryHref = `mailto:${primary.payload.email}`;
  if (primary?.payload?.phone)  primaryHref = `tel:${primary.payload.phone}`;
  if (primary?.payload?.calendar_link) primaryHref = primary.payload.calendar_link;

  return `
  <div class="block block-cta" id="${block.block_id}">
    <div class="cta-container">
      ${c.urgency_text ? `<p class="cta-urgency">${esc(c.urgency_text)}</p>` : ''}
      <a href="${esc(primaryHref)}" class="cta-primary btn-${primary?.style || 'filled'}" target="_blank" rel="noopener noreferrer">
        ${esc(primary?.label || 'Get in Touch')}
      </a>
      ${secondary?.label ? `
        <a href="#" class="cta-secondary">${esc(secondary.label)}</a>
      ` : ''}
    </div>
  </div>`;
}

function renderScrollContainerBlock(block: any): string {
  const c = block.content;
  const children = c.children || [];

  return `
  <div class="block block-scroll" id="${block.block_id}">
    <div class="scroll-container" style="display:flex;gap:16px;overflow-x:auto;scroll-snap-type:x mandatory;padding:8px 0">
      ${children.map((child: any) => `
        <div class="scroll-item" style="flex:0 0 auto;scroll-snap-align:center;min-width:280px">
          ${renderBlock(child)}
        </div>
      `).join('')}
    </div>
  </div>`;
}

function renderHotspotMediaBlock(block: any): string {
  const c = block.content;
  return `
  <div class="block block-hotspot" id="${block.block_id}">
    <div class="hotspot-container" style="position:relative">
      <img src="${esc(c.base_media?.url || '')}" alt="Interactive media" loading="lazy" style="width:100%;border-radius:12px" />
      ${(c.hotspots || []).map((h: any) => `
        <div class="hotspot-pin" style="position:absolute;left:${h.position?.x_percent || 50}%;top:${h.position?.y_percent || 50}%;transform:translate(-50%,-50%)" title="${esc(h.label || '')}">
          <span class="hotspot-dot"></span>
        </div>
      `).join('')}
    </div>
  </div>`;
}

// ============================================
// HELPERS
// ============================================

function esc(str: string): string {
  return sanitizeString(str || '');
}

function getPlatformLabel(platform: string): string {
  const labels: Record<string, string> = {
    instagram: 'Instagram',
    linkedin: 'LinkedIn',
    tiktok: 'TikTok',
    twitter: 'X',
    behance: 'Behance',
    dribbble: 'Dribbble',
    youtube: 'YouTube',
    github: 'GitHub',
    website: 'Website',
    other: 'Source',
  };
  return labels[platform] || 'Source';
}

// ============================================
// CSS (inlined for zero external deps in SSR)
// ============================================

function renderCSS(): string {
  return `<style>
  :root {
    --bg: #ffffff; --fg: #111827; --muted: #6b7280; --accent: #6366f1;
    --card-bg: #f9fafb; --card-border: #e5e7eb; --radius: 16px;
    --max-w: 800px;
  }
  [data-theme="dark"] {
    --bg: #0f172a; --fg: #f1f5f9; --muted: #94a3b8; --accent: #818cf8;
    --card-bg: #1e293b; --card-border: #334155;
  }
  @media (prefers-color-scheme: dark) {
    [data-theme="auto"] {
      --bg: #0f172a; --fg: #f1f5f9; --muted: #94a3b8; --accent: #818cf8;
      --card-bg: #1e293b; --card-border: #334155;
    }
  }
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    background: var(--bg); color: var(--fg); line-height: 1.6; -webkit-font-smoothing: antialiased; }
  .container { max-width: var(--max-w); margin: 0 auto; padding: 0 20px; }
  /* Header */
  .portfolio-header { padding: 48px 0 32px; text-align: center; }
  .portfolio-header h1 { font-size: 2rem; font-weight: 700; margin-bottom: 8px; }
  .portfolio-header .subtitle { color: var(--muted); font-size: 1.1rem; margin-bottom: 12px; }
  .category-badge { display: inline-block; padding: 4px 14px; border-radius: 99px; background: var(--accent);
    color: #fff; font-size: 0.8rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
  /* Nav */
  .quick-nav { display: flex; justify-content: center; gap: 8px; padding: 12px 20px; position: sticky;
    top: 0; z-index: 10; background: var(--bg); border-bottom: 1px solid var(--card-border); }
  .nav-pill { text-decoration: none; color: var(--muted); padding: 6px 14px; border-radius: 99px;
    font-size: 0.85rem; font-weight: 500; transition: all 0.2s; }
  .nav-pill:hover { background: var(--card-bg); color: var(--fg); }
  /* Sections */
  .portfolio-section { padding: 40px 0; }
  .section-heading { font-size: 1.3rem; font-weight: 600; margin-bottom: 24px;
    padding-bottom: 8px; border-bottom: 2px solid var(--accent); display: inline-block; }
  .blocks-grid { display: flex; flex-direction: column; gap: 24px; }
  /* Blocks */
  .block { background: var(--card-bg); border: 1px solid var(--card-border); border-radius: var(--radius);
    padding: 20px; overflow: hidden; }
  .block-media { padding: 0; }
  .block-media video, .block-media img { display: block; width: 100%; border-radius: var(--radius); }
  .media-embed { width: 100%; }
  .media-embed iframe { width: 100%; aspect-ratio: 16/9; border: none; border-radius: var(--radius); }
  .media-caption { padding: 12px 16px; color: var(--muted); font-size: 0.9rem; }
  /* Text */
  .text-header { font-size: 1.1rem; font-weight: 600; margin-bottom: 8px; }
  .text-preview { color: var(--muted); }
  details.text-expand { margin-top: 8px; }
  details.text-expand summary { cursor: pointer; color: var(--accent); font-weight: 500; font-size: 0.9rem; }
  .text-full { margin-top: 12px; white-space: pre-wrap; }
  .tags { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 12px; }
  .tag { background: var(--accent); color: #fff; padding: 2px 10px; border-radius: 99px; font-size: 0.75rem; }
  /* Metrics */
  .metrics-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 16px; }
  .metric-card { text-align: center; padding: 16px; background: var(--bg); border-radius: 12px; }
  .metric-value { display: block; font-size: 1.8rem; font-weight: 700; color: var(--accent); }
  .metric-label { display: block; font-size: 0.85rem; color: var(--muted); margin-top: 4px; }
  .metric-trend { font-size: 0.8rem; font-weight: 600; }
  .trend-up { color: #10b981; } .trend-down { color: #ef4444; } .trend-neutral { color: var(--muted); }
  /* External Link */
  .external-link-card { display: flex; flex-direction: column; gap: 0; padding: 0; overflow: hidden; }
  .link-embed { width: 100%; }
  .link-embed iframe { width: 100%; aspect-ratio: 16/9; border: none; border-radius: var(--radius) var(--radius) 0 0; }
  .link-embed img { width: 100%; display: block; border-radius: var(--radius) var(--radius) 0 0; }
  .link-embed video { width: 100%; display: block; border-radius: var(--radius) var(--radius) 0 0; }
  .link-info { padding: 16px 20px; }
  .link-title { font-size: 1rem; font-weight: 600; margin-bottom: 4px; }
  .link-desc { color: var(--muted); font-size: 0.9rem; margin-bottom: 12px; }
  .view-on-platform-btn { display: inline-flex; align-items: center; gap: 6px; padding: 8px 18px;
    border-radius: 99px; font-size: 0.85rem; font-weight: 600; text-decoration: none; color: #fff;
    background: var(--accent); transition: opacity 0.2s; }
  .view-on-platform-btn:hover { opacity: 0.85; }
  /* Platform-specific button colors */
  .view-on-platform-btn.platform-youtube { background: #FF0000; }
  .view-on-platform-btn.platform-instagram { background: #E4405F; }
  .view-on-platform-btn.platform-linkedin { background: #0A66C2; }
  .view-on-platform-btn.platform-tiktok { background: #000000; }
  .view-on-platform-btn.platform-twitter { background: #1DA1F2; }
  .view-on-platform-btn.platform-behance { background: #1769FF; }
  .view-on-platform-btn.platform-dribbble { background: #EA4C89; }
  .view-on-platform-btn.platform-github { background: #333333; }
  /* Gallery */
  .gallery-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 12px; }
  .gallery-item img, .gallery-item video { width: 100%; display: block; border-radius: 8px; }
  .gallery-caption { font-size: 0.8rem; color: var(--muted); margin-top: 4px; }
  /* Timeline */
  .timeline { position: relative; padding-left: 32px; }
  .timeline::before { content: ''; position: absolute; left: 8px; top: 0; bottom: 0; width: 2px; background: var(--card-border); }
  .timeline-entry { position: relative; margin-bottom: 24px; }
  .timeline-marker { position: absolute; left: -28px; top: 4px; width: 12px; height: 12px;
    border-radius: 50%; background: var(--accent); border: 2px solid var(--bg); }
  .timeline-date { font-size: 0.8rem; color: var(--muted); }
  .timeline-content h4 { font-size: 1rem; margin: 4px 0; }
  /* Comparison */
  .comparison-container { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
  .comparison-label { display: block; font-weight: 600; font-size: 0.85rem; margin-bottom: 8px; text-align: center; }
  .comparison-caption { text-align: center; color: var(--muted); font-size: 0.9rem; margin-top: 12px; }
  /* CTA */
  .cta-container { text-align: center; padding: 24px 0; }
  .cta-urgency { color: var(--accent); font-weight: 600; margin-bottom: 12px; }
  .cta-primary { display: inline-block; padding: 14px 36px; border-radius: 99px; font-size: 1rem;
    font-weight: 600; text-decoration: none; transition: opacity 0.2s; }
  .btn-filled { background: var(--accent); color: #fff; }
  .btn-outlined { border: 2px solid var(--accent); color: var(--accent); background: transparent; }
  .cta-primary:hover { opacity: 0.85; }
  .cta-secondary { display: block; margin-top: 12px; color: var(--muted); text-decoration: none; font-size: 0.9rem; }
  /* Footer */
  .portfolio-footer { text-align: center; padding: 40px 20px; color: var(--muted); font-size: 0.85rem; }
  /* Responsive */
  @media (max-width: 600px) {
    .portfolio-header h1 { font-size: 1.5rem; }
    .quick-nav { flex-wrap: wrap; }
    .comparison-container { grid-template-columns: 1fr; }
    .gallery-grid { grid-template-columns: 1fr; }
  }
</style>`;
}
