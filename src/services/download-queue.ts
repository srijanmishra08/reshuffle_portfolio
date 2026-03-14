/**
 * Download Queue Service
 * Job queue with concurrency control, retry logic, and status tracking.
 * Manages download jobs as an in-memory queue for dev; swap for Redis/BullMQ in production.
 */

import { EventEmitter } from 'events';
import { nanoid } from 'nanoid';
import {
  VideoDownloader,
  extractMetadata,
  type DownloadOptions,
  type DownloadProgress,
  type DownloadResult,
  type DownloadStatus,
  type VideoMetadata,
} from './video-downloader.js';

// ============================================
// TYPES
// ============================================

export interface DownloadJob {
  id: string;
  url: string;
  status: DownloadStatus;
  options: DownloadOptions;
  progress: DownloadProgress | null;
  result: DownloadResult | null;
  metadata: VideoMetadata | null;
  error: string | null;
  retries: number;
  maxRetries: number;
  createdAt: number;
  startedAt: number | null;
  completedAt: number | null;
  priority: number;           // higher = processed first
}

export interface QueueConfig {
  maxConcurrent: number;      // max parallel downloads (default 3)
  maxRetries: number;         // max auto-retries on failure (default 2)
  retryDelayMs: number;       // base delay for exponential backoff (default 5000)
  maxQueueSize: number;       // max queued jobs (default 50)
  jobTTLMs: number;           // how long to keep completed jobs (default 1h)
  defaultTimeout: number;     // per-job timeout in seconds (default 600)
}

export interface QueueStats {
  queued: number;
  downloading: number;
  processing: number;
  completed: number;
  failed: number;
  cancelled: number;
  totalProcessed: number;
  totalBytes: number;
  averageSpeed: number;       // bytes/sec average across completed jobs
  uptime: number;             // ms since queue started
}

// ============================================
// DOWNLOAD QUEUE
// ============================================

const DEFAULT_CONFIG: QueueConfig = {
  maxConcurrent: 3,
  maxRetries: 2,
  retryDelayMs: 5000,
  maxQueueSize: 50,
  jobTTLMs: 60 * 60 * 1000,  // 1 hour
  defaultTimeout: 600,
};

export class DownloadQueue extends EventEmitter {
  private jobs = new Map<string, DownloadJob>();
  private activeDownloaders = new Map<string, VideoDownloader>();
  private config: QueueConfig;
  private startTime = Date.now();
  private totalProcessed = 0;
  private totalBytes = 0;
  private cleanupInterval: ReturnType<typeof setInterval>;
  private processing = false;

  constructor(config: Partial<QueueConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };

    // Periodically clean up old completed/failed jobs
    this.cleanupInterval = setInterval(() => this.cleanup(), 5 * 60 * 1000);
    this.cleanupInterval.unref();
  }

  // ============================================
  // JOB MANAGEMENT
  // ============================================

  /** Add a download job to the queue */
  async addJob(url: string, options: DownloadOptions = {}, priority = 0): Promise<DownloadJob> {
    // Check queue capacity
    const queuedCount = this.getJobsByStatus('queued').length + this.getJobsByStatus('downloading').length;
    if (queuedCount >= this.config.maxQueueSize) {
      throw new Error(`Queue full (${this.config.maxQueueSize} jobs). Wait for downloads to complete.`);
    }

    // Check for duplicate URLs currently in queue/downloading
    for (const job of this.jobs.values()) {
      if (job.url === url && (job.status === 'queued' || job.status === 'downloading')) {
        throw new Error(`URL already in queue: ${job.id}`);
      }
    }

    // Pre-fetch metadata (non-blocking — we'll retry if it fails)
    let metadata: VideoMetadata | null = null;
    try {
      metadata = await extractMetadata(url);
    } catch {
      // Will retry on download
    }

    const job: DownloadJob = {
      id: nanoid(12),
      url,
      status: 'queued',
      options: {
        ...options,
        timeout: options.timeout || this.config.defaultTimeout,
      },
      progress: null,
      result: null,
      metadata,
      error: null,
      retries: 0,
      maxRetries: this.config.maxRetries,
      createdAt: Date.now(),
      startedAt: null,
      completedAt: null,
      priority,
    };

    this.jobs.set(job.id, job);
    this.emit('job:added', job);

    // Trigger processing
    this.processQueue();

    return job;
  }

  /** Cancel a job (removes from queue or kills active download) */
  cancelJob(jobId: string): boolean {
    const job = this.jobs.get(jobId);
    if (!job) return false;

    if (job.status === 'queued') {
      job.status = 'cancelled';
      job.completedAt = Date.now();
      this.emit('job:cancelled', job);
      return true;
    }

    if (job.status === 'downloading' || job.status === 'processing') {
      const downloader = this.activeDownloaders.get(jobId);
      if (downloader) {
        downloader.cancel();
        this.activeDownloaders.delete(jobId);
      }
      job.status = 'cancelled';
      job.completedAt = Date.now();
      this.emit('job:cancelled', job);
      this.processQueue();
      return true;
    }

    return false;
  }

  /** Get a job by ID */
  getJob(jobId: string): DownloadJob | undefined {
    return this.jobs.get(jobId);
  }

  /** Get all jobs, optionally filtered by status */
  getJobs(status?: DownloadStatus): DownloadJob[] {
    const all = Array.from(this.jobs.values());
    if (status) return all.filter(j => j.status === status);
    return all.sort((a, b) => b.createdAt - a.createdAt);
  }

  /** Delete a completed/failed/cancelled job */
  deleteJob(jobId: string): boolean {
    const job = this.jobs.get(jobId);
    if (!job) return false;
    if (job.status === 'downloading' || job.status === 'processing') {
      this.cancelJob(jobId);
    }
    this.jobs.delete(jobId);
    this.emit('job:deleted', jobId);
    return true;
  }

  /** Add multiple jobs at once */
  async addBatch(urls: string[], options: DownloadOptions = {}): Promise<DownloadJob[]> {
    const jobs: DownloadJob[] = [];
    for (const url of urls) {
      try {
        const job = await this.addJob(url, options);
        jobs.push(job);
      } catch (err) {
        // Skip duplicates or queue-full errors for batch
        console.warn(`Skipping ${url}: ${(err as Error).message}`);
      }
    }
    return jobs;
  }

  // ============================================
  // QUEUE PROCESSING
  // ============================================

  private async processQueue(): Promise<void> {
    if (this.processing) return;
    this.processing = true;

    try {
      while (true) {
        const activeCount = this.getJobsByStatus('downloading').length;
        if (activeCount >= this.config.maxConcurrent) break;

        // Get next job by priority, then FIFO
        const nextJob = this.getNextJob();
        if (!nextJob) break;

        // Process it (don't await — concurrent)
        this.executeJob(nextJob).catch((err) => {
          console.error(`Job ${nextJob.id} failed:`, err);
        });
      }
    } finally {
      this.processing = false;
    }
  }

  private getNextJob(): DownloadJob | null {
    const queued = this.getJobsByStatus('queued')
      .sort((a, b) => b.priority - a.priority || a.createdAt - b.createdAt);
    return queued[0] || null;
  }

  private getJobsByStatus(status: DownloadStatus): DownloadJob[] {
    return Array.from(this.jobs.values()).filter(j => j.status === status);
  }

  private async executeJob(job: DownloadJob): Promise<void> {
    job.status = 'downloading';
    job.startedAt = Date.now();
    this.emit('job:started', job);

    const downloader = new VideoDownloader();
    this.activeDownloaders.set(job.id, downloader);

    // Forward progress events
    downloader.on('progress', (progress: DownloadProgress) => {
      job.progress = progress;
      if (progress.status === 'processing') {
        job.status = 'processing';
      }
      this.emit('job:progress', { jobId: job.id, progress });
    });

    try {
      const result = await downloader.download(job.url, job.options);
      job.status = 'completed';
      job.result = result;
      job.completedAt = Date.now();
      job.metadata = result.metadata;

      this.totalProcessed++;
      this.totalBytes += result.fileSize;

      this.emit('job:completed', job);
    } catch (err) {
      const errorMsg = (err as Error).message;
      job.error = errorMsg;

      // Retry logic with exponential backoff
      if (job.retries < job.maxRetries && !errorMsg.includes('cancelled') && !errorMsg.includes('timed out')) {
        job.retries++;
        job.status = 'queued';
        job.error = `Retry ${job.retries}/${job.maxRetries}: ${errorMsg}`;
        this.emit('job:retry', job);

        const delay = this.config.retryDelayMs * Math.pow(2, job.retries - 1);
        setTimeout(() => this.processQueue(), delay);
      } else {
        job.status = 'failed';
        job.completedAt = Date.now();
        this.emit('job:failed', job);
      }
    } finally {
      this.activeDownloaders.delete(job.id);
      // Process next in queue
      this.processQueue();
    }
  }

  // ============================================
  // STATS & CLEANUP
  // ============================================

  getStats(): QueueStats {
    const jobs = Array.from(this.jobs.values());
    const completed = jobs.filter(j => j.status === 'completed');
    const totalDuration = completed.reduce((sum, j) => {
      if (j.startedAt && j.completedAt) return sum + (j.completedAt - j.startedAt);
      return sum;
    }, 0);

    return {
      queued: jobs.filter(j => j.status === 'queued').length,
      downloading: jobs.filter(j => j.status === 'downloading').length,
      processing: jobs.filter(j => j.status === 'processing').length,
      completed: completed.length,
      failed: jobs.filter(j => j.status === 'failed').length,
      cancelled: jobs.filter(j => j.status === 'cancelled').length,
      totalProcessed: this.totalProcessed,
      totalBytes: this.totalBytes,
      averageSpeed: totalDuration > 0 ? Math.round(this.totalBytes / (totalDuration / 1000)) : 0,
      uptime: Date.now() - this.startTime,
    };
  }

  /** Remove old completed/failed jobs beyond TTL */
  private cleanup(): void {
    const now = Date.now();
    for (const [id, job] of this.jobs) {
      if (
        (job.status === 'completed' || job.status === 'failed' || job.status === 'cancelled') &&
        job.completedAt &&
        (now - job.completedAt) > this.config.jobTTLMs
      ) {
        this.jobs.delete(id);
      }
    }
  }

  /** Clear all jobs and stop processing */
  shutdown(): void {
    clearInterval(this.cleanupInterval);
    // Cancel all active downloads
    for (const [, downloader] of this.activeDownloaders) {
      downloader.cancel();
    }
    this.activeDownloaders.clear();
    this.jobs.clear();
    this.emit('shutdown');
  }

  /** Get queue size */
  get size(): number {
    return this.jobs.size;
  }
}

// ============================================
// SINGLETON INSTANCE
// ============================================

let _queue: DownloadQueue | null = null;

export function getDownloadQueue(config?: Partial<QueueConfig>): DownloadQueue {
  if (!_queue) {
    _queue = new DownloadQueue(config);
  }
  return _queue;
}
