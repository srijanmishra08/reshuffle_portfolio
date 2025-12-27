import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const { url, method } = req;
  const path = url?.split('?')[0] || '/';

  try {
    // Health check
    if (path === '/health' || path === '/') {
      return res.status(200).json({
        status: 'ok',
        service: 'portfolio-engine',
        version: '1.0.0',
        timestamp: new Date().toISOString()
      });
    }

    // API info
    if (path === '/api') {
      return res.status(200).json({
        name: 'Portfolio Engine API',
        version: '1.0.0',
        endpoints: {
          'GET /health': 'Health check',
          'POST /api/portfolios/generate': 'Generate a portfolio'
        }
      });
    }

    // Generate portfolio endpoint
    if (path === '/api/portfolios/generate' && method === 'POST') {
      // Dynamically import to avoid top-level await issues
      const { ingestBatch } = await import('../src/services/ingestion.js');
      const { composePortfolio } = await import('../src/services/composition.js');
      
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

      // Build raw inputs from request
      const rawInputs: any[] = [];
      
      // Add URL inputs
      if (body.urls && Array.isArray(body.urls)) {
        for (const urlInput of body.urls) {
          rawInputs.push({
            type: 'url',
            url: urlInput.url,
            metadata: {
              title: urlInput.title,
              description: urlInput.description
            }
          });
        }
      }

      // Add text inputs
      if (body.texts && Array.isArray(body.texts)) {
        for (const textInput of body.texts) {
          rawInputs.push({
            type: 'text',
            text: textInput.text,
            metadata: {
              title: textInput.title,
              description: textInput.description
            }
          });
        }
      }

      // Ingest content
      const contents = await ingestBatch(rawInputs, {
        user_id: body.user_id,
        created_at: new Date().toISOString()
      });

      // Compose portfolio
      const portfolio = await composePortfolio(
        contents,
        body.category,
        body.title,
        body.subtitle
      );

      return res.status(200).json({
        success: true,
        data: {
          portfolio
        }
      });
    }

    // 404 for unknown routes
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
