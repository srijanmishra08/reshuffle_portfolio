import type { VercelRequest, VercelResponse } from '@vercel/node';

// Simple in-memory rate limiter for serverless (resets on cold start)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(key: string, maxRequests: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(key);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (entry.count >= maxRequests) return false;
  entry.count++;
  return true;
}

function getClientIP(req: VercelRequest): string {
  return (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || 'unknown';
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

  // CORS headers
  const origin = req.headers.origin || '*';
  const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['*'];
  const corsOrigin = allowedOrigins.includes('*') ? '*' : (allowedOrigins.includes(origin) ? origin : allowedOrigins[0]);
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', corsOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const { url, method } = req;
  const path = url?.split('?')[0] || '/';
  const clientIP = getClientIP(req);

  try {
    // ============================================
    // HEALTH & INFO
    // ============================================
    
    if (path === '/health') {
      return res.status(200).json({
        status: 'ok',
        service: 'portfolio-engine',
        version: '2.0.0',
        timestamp: new Date().toISOString(),
        features: [
          'universal-media-embeds',
          'ssr-rendering',
          'rate-limiting',
          'security-hardened'
        ]
      });
    }

    if (path === '/' || path === '') {
      // Root is served as static index.html by Vercel routes
      return res.status(200).json({
        status: 'ok',
        service: 'portfolio-engine',
        version: '2.0.0',
        hint: 'Visit the root URL in a browser to see the Portfolio Builder'
      });
    }

    if (path === '/api') {
      return res.status(200).json({
        name: 'Portfolio Engine API',
        version: '3.0.0',
        endpoints: {
          'GET /health': 'Health check',
          'POST /api/portfolios/generate': 'Generate portfolio (JSON + SSR HTML)',
          'POST /api/portfolios/generate/ssr': 'Generate portfolio (SSR HTML only)',
          'POST /api/content/extract': 'Extract content from URL/file/text',
          'POST /api/content/batch': 'Batch extract + score content',
          'POST /api/content/resolve-media': 'Resolve URL to embeddable media',
          'POST /api/content/resolve-media/batch': 'Batch resolve URLs to embeddable media',
          'POST /api/content/detect-platform': 'Detect platform + embed capability from URL',
          'POST /api/content/score': 'Score content for category',
          'GET /api/downloads/health': 'Check yt-dlp/ffmpeg availability',
          'POST /api/downloads/metadata': 'Extract video metadata without downloading',
          'POST /api/downloads/check-url': 'Check if URL is downloadable',
          'POST /api/downloads/start': 'Start a video download job',
          'GET /api/downloads/jobs': 'List download jobs',
          'GET /api/downloads/jobs/:id': 'Get job status',
          'DELETE /api/downloads/jobs/:id': 'Cancel/delete a job',
          'GET /api/downloads/queue/stats': 'Queue statistics'
        },
        supported_platforms: [
          'YouTube', 'Vimeo', 'Instagram', 'TikTok', 'X/Twitter',
          'LinkedIn', 'Behance', 'Dribbble', 'Google Drive',
          'GitHub', 'Medium', 'Spotify', 'Figma', 'Pinterest', 'Notion'
        ]
      });
    }

    // ============================================
    // PORTFOLIO GENERATION
    // ============================================

    if (path === '/api/portfolios/generate' && method === 'POST') {
      // Rate limit: 10 per 15 min
      if (!checkRateLimit(`generate:${clientIP}`, 10, 15 * 60 * 1000)) {
        return res.status(429).json({ error: 'Too many requests. Please try again in a few minutes.' });
      }

      const { ingestBatch, validateBatch } = await import('../src/services/ingestion.js');
      const { composePortfolio } = await import('../src/services/composition.js');
      const { renderPortfolioHTML } = await import('../src/services/ssr-renderer.js');
      
      const body = req.body;
      
      if (!body || !body.user_id || !body.category || !body.title) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Missing required fields: user_id, category, title'
          }
        });
      }

      const rawInputs: any[] = [];
      
      // Handle inputs array from iOS app
      if (body.inputs && Array.isArray(body.inputs)) {
        for (const input of body.inputs) {
          if (input.type === 'url' && input.url) {
            rawInputs.push({
              type: 'url',
              url: input.url,
              user_metadata: { title: input.title, description: input.description }
            });
          } else if (input.type === 'text' && input.text) {
            rawInputs.push({
              type: 'text',
              text: input.text,
              user_metadata: { title: input.title, description: input.description }
            });
          } else if (input.type === 'video' && input.url) {
            rawInputs.push({
              type: 'url',
              url: input.url,
              user_metadata: { title: input.title, description: input.description }
            });
          } else if (input.type === 'file' && input.file_path) {
            rawInputs.push({
              type: 'url',
              url: input.file_path,
              user_metadata: { title: input.title, description: input.description }
            });
          }
        }
      }
      
      // Support urls/texts/videos format
      if (body.urls && Array.isArray(body.urls)) {
        for (const urlInput of body.urls) {
          rawInputs.push({
            type: 'url',
            url: urlInput.url,
            user_metadata: { title: urlInput.title, description: urlInput.description }
          });
        }
      }

      if (body.videos && Array.isArray(body.videos)) {
        for (const videoInput of body.videos) {
          rawInputs.push({
            type: 'url',
            url: videoInput.url,
            user_metadata: { title: videoInput.title, description: videoInput.description }
          });
        }
      }

      if (body.texts && Array.isArray(body.texts)) {
        for (const textInput of body.texts) {
          rawInputs.push({
            type: 'text',
            text: textInput.text,
            user_metadata: { title: textInput.title, description: textInput.description }
          });
        }
      }

      if (rawInputs.length === 0) {
        return res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'No valid inputs provided' }
        });
      }

      // Validate and process
      const inputValidation = validateBatch(rawInputs);
      const ingestResult = await ingestBatch(inputValidation.validInputs, body.category);

      // Compose portfolio
      const portfolio = composePortfolio(ingestResult.scored_content, {
        userId: body.user_id,
        category: body.category,
        title: body.title,
        subtitle: body.subtitle || ''
      });

      // Generate SSR HTML
      const html = renderPortfolioHTML(portfolio);

      return res.status(200).json({
        success: true,
        data: { portfolio, html },
        processing_summary: {
          total_inputs: rawInputs.length,
          processed: ingestResult.successful,
          failed: ingestResult.failed,
          sections_generated: portfolio.sections.length,
          blocks_generated: portfolio.sections.reduce((sum: number, s: any) => sum + s.blocks.length, 0),
          media_embeds_resolved: ingestResult.normalized_content.filter((c: any) => c.media_embed).length
        }
      });
    }

    // ============================================
    // SSR-ONLY PORTFOLIO GENERATION 
    // ============================================

    if (path === '/api/portfolios/generate/ssr' && method === 'POST') {
      if (!checkRateLimit(`ssr:${clientIP}`, 10, 15 * 60 * 1000)) {
        return res.status(429).json({ error: 'Too many requests.' });
      }

      const { ingestBatch, validateBatch } = await import('../src/services/ingestion.js');
      const { composePortfolio } = await import('../src/services/composition.js');
      const { renderPortfolioHTML } = await import('../src/services/ssr-renderer.js');

      const body = req.body;
      if (!body || !body.user_id || !body.category || !body.title) {
        return res.status(400).send('<html><body><h1>Error</h1><p>Missing required fields</p></body></html>');
      }

      const rawInputs: any[] = [];
      if (body.urls) for (const u of body.urls) rawInputs.push({ type: 'url', url: u.url, user_metadata: { title: u.title, description: u.description } });
      if (body.videos) for (const v of body.videos) rawInputs.push({ type: 'url', url: v.url, user_metadata: { title: v.title, description: v.description } });
      if (body.texts) for (const t of body.texts) rawInputs.push({ type: 'text', text: t.text, user_metadata: { title: t.title, description: t.description } });
      if (body.inputs) for (const i of body.inputs) {
        if (i.type === 'url' || i.type === 'video') rawInputs.push({ type: 'url', url: i.url, user_metadata: { title: i.title, description: i.description } });
        else if (i.type === 'text') rawInputs.push({ type: 'text', text: i.text, user_metadata: { title: i.title, description: i.description } });
      }

      const inputValidation = validateBatch(rawInputs);
      const ingestResult = await ingestBatch(inputValidation.validInputs, body.category);
      const portfolio = composePortfolio(ingestResult.scored_content, {
        userId: body.user_id, category: body.category, title: body.title, subtitle: body.subtitle || ''
      });

      const html = renderPortfolioHTML(portfolio);
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.status(200).send(html);
    }

    // ============================================
    // MEDIA RESOLUTION
    // ============================================

    if (path === '/api/content/resolve-media' && method === 'POST') {
      if (!checkRateLimit(`resolve:${clientIP}`, 30, 5 * 60 * 1000)) {
        return res.status(429).json({ error: 'Too many requests.' });
      }

      const { resolveMedia } = await import('../src/services/media-resolver.js');
      const { detectPlatformExtended } = await import('../src/utils/platform-detection.js');

      const { url } = req.body;
      if (!url) return res.status(400).json({ error: 'URL is required' });

      try { new URL(url); } catch {
        return res.status(400).json({ error: 'Invalid URL format' });
      }

      const resolved = await resolveMedia(url);
      if (!resolved) {
        const platform = detectPlatformExtended(url);
        return res.status(200).json({
          success: false,
          url,
          platform: platform.platform,
          message: 'Could not resolve embeddable media'
        });
      }

      return res.status(200).json({
        success: true,
        url,
        media: resolved
      });
    }

    if (path === '/api/content/resolve-media/batch' && method === 'POST') {
      if (!checkRateLimit(`resolve-batch:${clientIP}`, 10, 5 * 60 * 1000)) {
        return res.status(429).json({ error: 'Too many requests.' });
      }

      const { resolveMedia } = await import('../src/services/media-resolver.js');
      const { detectPlatformExtended } = await import('../src/utils/platform-detection.js');

      const { urls } = req.body;
      if (!urls || !Array.isArray(urls) || urls.length === 0 || urls.length > 20) {
        return res.status(400).json({ error: 'Provide 1-20 URLs in the urls array' });
      }

      const results = await Promise.allSettled(urls.map((u: string) => resolveMedia(u)));
      const resolved = urls.map((url: string, i: number) => {
        const r = results[i];
        if (r.status === 'fulfilled' && r.value) return { url, success: true, media: r.value };
        return { url, success: false, platform: detectPlatformExtended(url).platform };
      });

      return res.status(200).json({
        success: true,
        total: urls.length,
        resolved_count: resolved.filter((r: any) => r.success).length,
        results: resolved
      });
    }

    // ============================================
    // CONTENT EXTRACTION
    // ============================================

    if (path === '/api/content/extract' && method === 'POST') {
      if (!checkRateLimit(`extract:${clientIP}`, 30, 5 * 60 * 1000)) {
        return res.status(429).json({ error: 'Too many requests.' });
      }

      const { ingestContent } = await import('../src/services/ingestion.js');

      const body = req.body;
      let input: any;

      if (body.url) {
        input = { type: 'url', url: body.url, user_metadata: { title: body.title, description: body.description } };
      } else if (body.text) {
        input = { type: 'text', text: body.text, user_metadata: { title: body.title, description: body.description } };
      } else {
        return res.status(400).json({ error: 'Provide url or text' });
      }

      const result = await ingestContent(input);
      if (!result.success) {
        return res.status(422).json({ error: 'Extraction failed', message: result.error });
      }

      return res.status(200).json({ success: true, content: result.normalized });
    }

    if (path === '/api/content/batch' && method === 'POST') {
      if (!checkRateLimit(`batch:${clientIP}`, 15, 5 * 60 * 1000)) {
        return res.status(429).json({ error: 'Too many requests.' });
      }

      const { ingestBatch } = await import('../src/services/ingestion.js');

      const body = req.body;
      if (!body.category) return res.status(400).json({ error: 'category is required' });

      const rawInputs: any[] = [];
      if (body.urls) for (const u of body.urls) rawInputs.push({ type: 'url', url: u.url, user_metadata: { title: u.title, description: u.description } });
      if (body.videos) for (const v of body.videos) rawInputs.push({ type: 'url', url: v.url, user_metadata: { title: v.title, description: v.description } });
      if (body.texts) for (const t of body.texts) rawInputs.push({ type: 'text', text: t.text, user_metadata: { title: t.title, description: t.description } });

      const result = await ingestBatch(rawInputs, body.category);

      return res.status(200).json({
        success: true,
        total: result.total,
        processed: result.successful,
        failed: result.failed,
        content: result.scored_content
      });
    }

    // ============================================
    // PLATFORM DETECTION
    // ============================================

    if (path === '/api/content/detect-platform' && method === 'POST') {
      const { detectPlatform, isExtractable, detectPlatformExtended, isEmbeddable, getPlatformDisplayName, getPlatformColor } = await import('../src/utils/platform-detection.js');

      const { url } = req.body;
      if (!url) return res.status(400).json({ error: 'URL is required' });
      try { new URL(url); } catch { return res.status(400).json({ error: 'Invalid URL' }); }

      const platform = detectPlatform(url);
      const extended = detectPlatformExtended(url);
      return res.status(200).json({
        url,
        platform,
        platform_display: getPlatformDisplayName(platform),
        platform_color: getPlatformColor(platform),
        category: extended.category,
        extractable: isExtractable(platform),
        embeddable: isEmbeddable(url)
      });
    }

    // ============================================
    // CONTENT SCORING
    // ============================================

    if (path === '/api/content/score' && method === 'POST') {
      if (!checkRateLimit(`score:${clientIP}`, 30, 5 * 60 * 1000)) {
        return res.status(429).json({ error: 'Too many requests.' });
      }

      const { scoreContent } = await import('../src/services/scoring.js');
      const { content, category } = req.body;
      if (!content || !category) return res.status(400).json({ error: 'content and category required' });

      const scored = scoreContent(content, category);
      return res.status(200).json({ success: true, scored_content: scored });
    }

    // ============================================
    // VIDEO DOWNLOADS — Not available on this deployment
    // Video processing requires yt-dlp + ffmpeg which are not available
    // in the Vercel serverless runtime. This feature is planned for a
    // dedicated container service (Railway / Render). See DEPLOYMENT.md.
    // ============================================

    if (path.startsWith('/api/downloads')) {
      return res.status(501).json({
        success: false,
        error: {
          code: 'NOT_IMPLEMENTED',
          message: 'Video download endpoints are not available on this deployment. This feature requires yt-dlp and ffmpeg which run on a dedicated container service.',
          docs: 'https://github.com/reshuffle/portfolio-engine#video-downloads'
        }
      });
    }

    // ============================================
    // 404
    // ============================================

    return res.status(404).json({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: `Route ${method} ${path} not found`
      }
    });

  } catch (error: any) {
    console.error('API Error:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'Internal server error'
      }
    });
  }
}
