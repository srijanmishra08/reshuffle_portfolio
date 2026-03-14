/**
 * Downloads API Routes
 * Endpoints for video/audio downloading, queue management, and file serving.
 */

import { Router, type Request, type Response } from 'express';
import path from 'path';
import {
  extractMetadata,
  isSupportedURL,
  getSupportedSites,
  checkDependencies,
  type DownloadOptions,
  type DownloadQuality,
  type DownloadFormat,
} from '../services/video-downloader.js';
import { getDownloadQueue } from '../services/download-queue.js';
import { getDownloadStorage } from '../services/download-storage.js';
import {
  getVideoInfo,
  generateThumbnail,
  checkFFmpegAvailable,
} from '../services/video-processor.js';

const router = Router();

// ============================================
// DEPENDENCY CHECK
// ============================================

/**
 * GET /api/downloads/health
 * Check if yt-dlp and ffmpeg are available
 */
router.get('/health', async (_req: Request, res: Response) => {
  try {
    const deps = await checkDependencies();
    const ffmpegOk = await checkFFmpegAvailable();
    const queue = getDownloadQueue();
    const stats = queue.getStats();

    res.json({
      success: true,
      data: {
        dependencies: { ...deps, ffprobe: { available: ffmpegOk } },
        queue: stats,
        ready: deps.ytdlp.available && deps.ffmpeg.available,
      },
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: { code: 'HEALTH_CHECK_FAILED', message: (err as Error).message },
    });
  }
});

// ============================================
// METADATA & SUPPORT CHECK
// ============================================

/**
 * POST /api/downloads/metadata
 * Extract metadata from a URL without downloading
 */
router.post('/metadata', async (req: Request, res: Response) => {
  const { url } = req.body;
  if (!url || typeof url !== 'string') {
    return res.status(400).json({
      success: false,
      error: { code: 'INVALID_URL', message: 'URL is required' },
    });
  }

  try {
    const metadata = await extractMetadata(url);
    res.json({ success: true, data: metadata });
  } catch (err) {
    res.status(422).json({
      success: false,
      error: { code: 'METADATA_EXTRACTION_FAILED', message: (err as Error).message },
    });
  }
});

/**
 * POST /api/downloads/check-url
 * Check if a URL is supported by yt-dlp
 */
router.post('/check-url', async (req: Request, res: Response) => {
  const { url } = req.body;
  if (!url || typeof url !== 'string') {
    return res.status(400).json({
      success: false,
      error: { code: 'INVALID_URL', message: 'URL is required' },
    });
  }

  try {
    const supported = await isSupportedURL(url);
    let metadata = null;
    if (supported) {
      try { metadata = await extractMetadata(url); } catch { /* ok */ }
    }
    res.json({ success: true, data: { supported, url, metadata } });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: { code: 'CHECK_FAILED', message: (err as Error).message },
    });
  }
});

/**
 * GET /api/downloads/supported-sites
 * List all supported extractors
 */
router.get('/supported-sites', async (_req: Request, res: Response) => {
  try {
    const sites = await getSupportedSites();
    res.json({ success: true, data: { count: sites.length, sites } });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: { code: 'LIST_FAILED', message: (err as Error).message },
    });
  }
});

// ============================================
// DOWNLOAD JOBS
// ============================================

/**
 * POST /api/downloads/start
 * Start a new download job
 */
router.post('/start', async (req: Request, res: Response) => {
  const { url, quality, format, extractAudio, maxFileSize, priority } = req.body;

  if (!url || typeof url !== 'string') {
    return res.status(400).json({
      success: false,
      error: { code: 'INVALID_URL', message: 'URL is required' },
    });
  }

  try {
    // Check for existing download of same URL
    const storage = await getDownloadStorage();
    const existing = storage.getFileByUrl(url);
    if (existing) {
      return res.json({
        success: true,
        data: {
          job: null,
          cached: true,
          file: existing,
          message: 'File already downloaded',
        },
      });
    }

    const queue = getDownloadQueue();
    const options: DownloadOptions = {
      quality: (quality as DownloadQuality) || 'best',
      format: (format as DownloadFormat) || 'mp4',
      extractAudio: extractAudio === true,
      maxFileSize: maxFileSize || '2G',
      outputDir: storage.getVideoPath(''),
    };

    const job = await queue.addJob(url, options, priority || 0);

    // Listen for completion to register in storage
    queue.once(`job:completed`, async (completedJob) => {
      if (completedJob.id === job.id && completedJob.result) {
        try {
          const r = completedJob.result;
          await storage.registerFile({
            id: job.id,
            originalUrl: url,
            filePath: path.relative(process.cwd(), r.filePath),
            absolutePath: r.filePath,
            filename: r.filename,
            mimeType: getMimeType(r.format),
            fileSize: r.fileSize,
            duration: r.duration,
            width: r.metadata.width,
            height: r.metadata.height,
            format: r.format,
            thumbnailPath: r.thumbnailPath,
            metadataPath: undefined,
            createdAt: Date.now(),
          });
        } catch (err) {
          console.error('Failed to register file in storage:', err);
        }
      }
    });

    res.status(202).json({
      success: true,
      data: {
        job: {
          id: job.id,
          url: job.url,
          status: job.status,
          metadata: job.metadata,
          createdAt: job.createdAt,
        },
        cached: false,
      },
    });
  } catch (err) {
    const msg = (err as Error).message;
    const code = msg.includes('Queue full') ? 429 : msg.includes('already in queue') ? 409 : 500;
    res.status(code).json({
      success: false,
      error: { code: 'DOWNLOAD_FAILED', message: msg },
    });
  }
});

/**
 * POST /api/downloads/batch
 * Start multiple download jobs at once
 */
router.post('/batch', async (req: Request, res: Response) => {
  const { urls, quality, format } = req.body;

  if (!Array.isArray(urls) || urls.length === 0) {
    return res.status(400).json({
      success: false,
      error: { code: 'INVALID_URLS', message: 'Array of URLs is required' },
    });
  }

  if (urls.length > 20) {
    return res.status(400).json({
      success: false,
      error: { code: 'TOO_MANY_URLS', message: 'Maximum 20 URLs per batch' },
    });
  }

  try {
    const queue = getDownloadQueue();
    const storage = await getDownloadStorage();
    const options: DownloadOptions = {
      quality: (quality as DownloadQuality) || '720p',
      format: (format as DownloadFormat) || 'mp4',
      outputDir: storage.getVideoPath(''),
    };

    const jobs = await queue.addBatch(urls, options);

    res.status(202).json({
      success: true,
      data: {
        jobs: jobs.map(j => ({
          id: j.id,
          url: j.url,
          status: j.status,
        })),
        total: jobs.length,
        requested: urls.length,
      },
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: { code: 'BATCH_FAILED', message: (err as Error).message },
    });
  }
});

/**
 * GET /api/downloads/jobs
 * List all download jobs
 */
router.get('/jobs', (req: Request, res: Response) => {
  const { status } = req.query;
  const queue = getDownloadQueue();
  const jobs = queue.getJobs(status as any);

  res.json({
    success: true,
    data: {
      jobs: jobs.map(j => ({
        id: j.id,
        url: j.url,
        status: j.status,
        progress: j.progress,
        metadata: j.metadata ? {
          title: j.metadata.title,
          duration: j.metadata.duration,
          thumbnail: j.metadata.thumbnail,
          extractor: j.metadata.extractor,
        } : null,
        error: j.error,
        retries: j.retries,
        createdAt: j.createdAt,
        startedAt: j.startedAt,
        completedAt: j.completedAt,
      })),
      total: jobs.length,
    },
  });
});

/**
 * GET /api/downloads/jobs/:id
 * Get a specific job's status
 */
router.get('/jobs/:id', (req: Request, res: Response) => {
  const queue = getDownloadQueue();
  const job = queue.getJob(req.params.id);

  if (!job) {
    return res.status(404).json({
      success: false,
      error: { code: 'JOB_NOT_FOUND', message: `Job ${req.params.id} not found` },
    });
  }

  res.json({
    success: true,
    data: {
      id: job.id,
      url: job.url,
      status: job.status,
      progress: job.progress,
      result: job.result ? {
        filePath: job.result.filePath,
        filename: job.result.filename,
        fileSize: job.result.fileSize,
        duration: job.result.duration,
        format: job.result.format,
        thumbnailPath: job.result.thumbnailPath,
      } : null,
      metadata: job.metadata,
      error: job.error,
      retries: job.retries,
      maxRetries: job.maxRetries,
      createdAt: job.createdAt,
      startedAt: job.startedAt,
      completedAt: job.completedAt,
    },
  });
});

/**
 * DELETE /api/downloads/jobs/:id
 * Cancel or delete a job
 */
router.delete('/jobs/:id', (req: Request, res: Response) => {
  const queue = getDownloadQueue();
  const job = queue.getJob(req.params.id);

  if (!job) {
    return res.status(404).json({
      success: false,
      error: { code: 'JOB_NOT_FOUND', message: `Job ${req.params.id} not found` },
    });
  }

  if (job.status === 'queued' || job.status === 'downloading' || job.status === 'processing') {
    queue.cancelJob(req.params.id);
    res.json({ success: true, data: { action: 'cancelled', id: req.params.id } });
  } else {
    queue.deleteJob(req.params.id);
    res.json({ success: true, data: { action: 'deleted', id: req.params.id } });
  }
});

// ============================================
// FILE SERVING
// ============================================

/**
 * GET /api/downloads/files/:id
 * Serve a downloaded file (supports Range requests for video streaming)
 */
router.get('/files/:id', async (req: Request, res: Response) => {
  try {
    const storage = await getDownloadStorage();
    await storage.serveFile(req.params.id, req, res);
  } catch (err) {
    res.status(500).json({
      success: false,
      error: { code: 'SERVE_FAILED', message: (err as Error).message },
    });
  }
});

/**
 * GET /api/downloads/files/:id/thumbnail
 * Get a video thumbnail
 */
router.get('/files/:id/thumbnail', async (req: Request, res: Response) => {
  try {
    const storage = await getDownloadStorage();
    const file = storage.getFile(req.params.id);
    if (!file) {
      return res.status(404).json({
        success: false,
        error: { code: 'FILE_NOT_FOUND', message: 'File not found' },
      });
    }

    if (file.thumbnailPath) {
      // Serve existing thumbnail
      const fsModule = await import('fs');
      if (fsModule.existsSync(file.thumbnailPath)) {
        res.setHeader('Content-Type', 'image/jpeg');
        res.setHeader('Cache-Control', 'public, max-age=86400');
        fsModule.createReadStream(file.thumbnailPath).pipe(res);
        return;
      }
    }

    // Generate thumbnail on the fly
    const outputPath = storage.getThumbnailPath(`${file.id}_thumb.jpg`);
    await generateThumbnail(file.absolutePath, outputPath);
    const fsSync = await import('fs');
    res.setHeader('Content-Type', 'image/jpeg');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    fsSync.createReadStream(outputPath).pipe(res);
  } catch (err) {
    res.status(500).json({
      success: false,
      error: { code: 'THUMBNAIL_FAILED', message: (err as Error).message },
    });
  }
});

/**
 * GET /api/downloads/files/:id/info
 * Get video file info (ffprobe analysis)
 */
router.get('/files/:id/info', async (req: Request, res: Response) => {
  try {
    const storage = await getDownloadStorage();
    const file = storage.getFile(req.params.id);
    if (!file) {
      return res.status(404).json({
        success: false,
        error: { code: 'FILE_NOT_FOUND', message: 'File not found' },
      });
    }

    const info = await getVideoInfo(file.absolutePath);
    res.json({ success: true, data: { file, videoInfo: info } });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: { code: 'INFO_FAILED', message: (err as Error).message },
    });
  }
});

/**
 * DELETE /api/downloads/files/:id
 * Delete a stored file
 */
router.delete('/files/:id', async (req: Request, res: Response) => {
  try {
    const storage = await getDownloadStorage();
    const deleted = await storage.deleteFile(req.params.id);
    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: { code: 'FILE_NOT_FOUND', message: 'File not found' },
      });
    }
    res.json({ success: true, data: { deleted: true, id: req.params.id } });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: { code: 'DELETE_FAILED', message: (err as Error).message },
    });
  }
});

// ============================================
// STORAGE MANAGEMENT
// ============================================

/**
 * GET /api/downloads/storage/stats
 * Get storage statistics
 */
router.get('/storage/stats', async (_req: Request, res: Response) => {
  try {
    const storage = await getDownloadStorage();
    const stats = storage.getStats();
    const queue = getDownloadQueue();
    const queueStats = queue.getStats();

    res.json({
      success: true,
      data: { storage: stats, queue: queueStats },
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: { code: 'STATS_FAILED', message: (err as Error).message },
    });
  }
});

/**
 * GET /api/downloads/storage/files
 * List all stored files
 */
router.get('/storage/files', async (req: Request, res: Response) => {
  try {
    const { format, limit, offset } = req.query;
    const storage = await getDownloadStorage();
    const files = storage.listFiles({
      format: format as string,
      limit: limit ? parseInt(limit as string) : undefined,
      offset: offset ? parseInt(offset as string) : undefined,
    });

    res.json({ success: true, data: { files, total: files.length } });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: { code: 'LIST_FAILED', message: (err as Error).message },
    });
  }
});

// ============================================
// QUEUE MANAGEMENT
// ============================================

/**
 * GET /api/downloads/queue/stats
 * Get queue statistics
 */
router.get('/queue/stats', (_req: Request, res: Response) => {
  const queue = getDownloadQueue();
  res.json({ success: true, data: queue.getStats() });
});

// ============================================
// HELPERS
// ============================================

function getMimeType(format: string): string {
  const map: Record<string, string> = {
    mp4: 'video/mp4', webm: 'video/webm', mkv: 'video/x-matroska',
    avi: 'video/x-msvideo', mov: 'video/quicktime',
    mp3: 'audio/mpeg', wav: 'audio/wav', m4a: 'audio/mp4',
    ogg: 'audio/ogg', flac: 'audio/flac',
  };
  return map[format] || 'application/octet-stream';
}

export default router;
