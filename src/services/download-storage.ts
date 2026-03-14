/**
 * Download Storage Service
 * Manages downloaded video/audio file storage with:
 * - Organized directory structure
 * - Disk quota management
 * - File metadata tracking
 * - Automatic cleanup of old files
 * - Serve files via HTTP
 */

import fs from 'fs/promises';
import path from 'path';
import { createReadStream, existsSync, statSync } from 'fs';
import type { IncomingMessage, ServerResponse } from 'http';

// ============================================
// TYPES
// ============================================

export interface StoredFile {
  id: string;
  originalUrl: string;
  filePath: string;           // relative to storage root
  absolutePath: string;
  filename: string;
  mimeType: string;
  fileSize: number;           // bytes
  duration: number;           // seconds
  width: number;
  height: number;
  format: string;
  thumbnailPath?: string;
  metadataPath?: string;
  createdAt: number;
  lastAccessedAt: number;
  accessCount: number;
}

export interface StorageConfig {
  rootDir: string;            // root storage directory
  maxStorageBytes: number;    // max total storage (default 10GB)
  maxFileBytes: number;       // max single file size (default 2GB)
  cleanupThreshold: number;   // cleanup when storage exceeds this % (default 0.9 = 90%)
  retentionDays: number;      // days to keep files (default 30)
}

export interface StorageStats {
  totalFiles: number;
  totalSizeBytes: number;
  totalSizeHuman: string;
  maxStorageBytes: number;
  maxStorageHuman: string;
  usagePercent: number;
  oldestFile: number;
  newestFile: number;
  byFormat: Record<string, { count: number; bytes: number }>;
}

// ============================================
// DEFAULTS
// ============================================

const DEFAULT_CONFIG: StorageConfig = {
  rootDir: path.join(process.cwd(), 'downloads'),
  maxStorageBytes: 10 * 1024 ** 3,     // 10 GB
  maxFileBytes: 2 * 1024 ** 3,          // 2 GB
  cleanupThreshold: 0.9,
  retentionDays: 30,
};

const MIME_MAP: Record<string, string> = {
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mkv': 'video/x-matroska',
  '.avi': 'video/x-msvideo',
  '.mov': 'video/quicktime',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.m4a': 'audio/mp4',
  '.ogg': 'audio/ogg',
  '.flac': 'audio/flac',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.json': 'application/json',
};

// ============================================
// DOWNLOAD STORAGE MANAGER
// ============================================

export class DownloadStorage {
  private config: StorageConfig;
  private fileIndex = new Map<string, StoredFile>();
  private indexPath: string;

  constructor(config: Partial<StorageConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.indexPath = path.join(this.config.rootDir, '.file-index.json');
  }

  /** Initialize storage directories and load index */
  async init(): Promise<void> {
    const dirs = ['videos', 'thumbnails', 'metadata', 'temp'];
    for (const dir of dirs) {
      await fs.mkdir(path.join(this.config.rootDir, dir), { recursive: true });
    }

    // Load existing index
    try {
      const indexData = await fs.readFile(this.indexPath, 'utf-8');
      const entries: StoredFile[] = JSON.parse(indexData);
      for (const entry of entries) {
        this.fileIndex.set(entry.id, entry);
      }
      console.log(`📦 Storage initialized: ${this.fileIndex.size} files indexed`);
    } catch {
      console.log('📦 Storage initialized: new index');
    }

    // Run cleanup on start
    await this.cleanup();
  }

  /** Register a downloaded file in the index */
  async registerFile(entry: Omit<StoredFile, 'lastAccessedAt' | 'accessCount'>): Promise<StoredFile> {
    // Check file size limit
    if (entry.fileSize > this.config.maxFileBytes) {
      throw new Error(`File exceeds max size: ${formatBytes(entry.fileSize)} > ${formatBytes(this.config.maxFileBytes)}`);
    }

    // Check total storage
    const currentSize = this.getTotalSize();
    if (currentSize + entry.fileSize > this.config.maxStorageBytes) {
      // Try cleanup first
      await this.cleanup();
      const newSize = this.getTotalSize();
      if (newSize + entry.fileSize > this.config.maxStorageBytes) {
        throw new Error(`Storage full: ${formatBytes(newSize + entry.fileSize)} exceeds ${formatBytes(this.config.maxStorageBytes)}`);
      }
    }

    const storedFile: StoredFile = {
      ...entry,
      lastAccessedAt: Date.now(),
      accessCount: 0,
    };

    this.fileIndex.set(storedFile.id, storedFile);
    await this.saveIndex();
    return storedFile;
  }

  /** Get file entry by ID */
  getFile(fileId: string): StoredFile | undefined {
    const file = this.fileIndex.get(fileId);
    if (file) {
      file.lastAccessedAt = Date.now();
      file.accessCount++;
    }
    return file;
  }

  /** Get file by URL (for dedup) */
  getFileByUrl(url: string): StoredFile | undefined {
    for (const file of this.fileIndex.values()) {
      if (file.originalUrl === url) {
        return file;
      }
    }
    return undefined;
  }

  /** List all stored files */
  listFiles(options?: { format?: string; limit?: number; offset?: number }): StoredFile[] {
    let files = Array.from(this.fileIndex.values());

    if (options?.format) {
      files = files.filter(f => f.format === options.format);
    }

    files.sort((a, b) => b.createdAt - a.createdAt);

    const offset = options?.offset || 0;
    const limit = options?.limit || 50;
    return files.slice(offset, offset + limit);
  }

  /** Delete a file and its associated thumbnail/metadata */
  async deleteFile(fileId: string): Promise<boolean> {
    const file = this.fileIndex.get(fileId);
    if (!file) return false;

    // Delete file and associated files
    const pathsToDelete = [file.absolutePath];
    if (file.thumbnailPath) pathsToDelete.push(file.thumbnailPath);
    if (file.metadataPath) pathsToDelete.push(file.metadataPath);

    for (const p of pathsToDelete) {
      try {
        await fs.unlink(p);
      } catch {
        // Ignore — file might already be gone
      }
    }

    this.fileIndex.delete(fileId);
    await this.saveIndex();
    return true;
  }

  /** Serve a stored file via HTTP (supports Range requests for video streaming) */
  async serveFile(fileId: string, req: IncomingMessage, res: ServerResponse): Promise<void> {
    const file = this.getFile(fileId);
    if (!file) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'File not found' }));
      return;
    }

    if (!existsSync(file.absolutePath)) {
      this.fileIndex.delete(fileId);
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'File missing from disk' }));
      return;
    }

    const stat = statSync(file.absolutePath);
    const mimeType = file.mimeType || MIME_MAP[path.extname(file.filename).toLowerCase()] || 'application/octet-stream';

    // Support Range requests (for HTML5 video seeking)
    const range = req.headers.range;
    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : stat.size - 1;
      const chunksize = end - start + 1;

      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${stat.size}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': mimeType,
      });

      createReadStream(file.absolutePath, { start, end }).pipe(res);
    } else {
      res.writeHead(200, {
        'Content-Length': stat.size,
        'Content-Type': mimeType,
        'Accept-Ranges': 'bytes',
        'Content-Disposition': `inline; filename="${file.filename}"`,
        'Cache-Control': 'public, max-age=86400',
      });

      createReadStream(file.absolutePath).pipe(res);
    }
  }

  /** Get storage statistics */
  getStats(): StorageStats {
    const files = Array.from(this.fileIndex.values());
    const totalSize = this.getTotalSize();
    const byFormat: Record<string, { count: number; bytes: number }> = {};

    let oldest = Infinity;
    let newest = 0;

    for (const f of files) {
      if (f.createdAt < oldest) oldest = f.createdAt;
      if (f.createdAt > newest) newest = f.createdAt;

      if (!byFormat[f.format]) byFormat[f.format] = { count: 0, bytes: 0 };
      byFormat[f.format].count++;
      byFormat[f.format].bytes += f.fileSize;
    }

    return {
      totalFiles: files.length,
      totalSizeBytes: totalSize,
      totalSizeHuman: formatBytes(totalSize),
      maxStorageBytes: this.config.maxStorageBytes,
      maxStorageHuman: formatBytes(this.config.maxStorageBytes),
      usagePercent: this.config.maxStorageBytes > 0 ? Math.round((totalSize / this.config.maxStorageBytes) * 100) : 0,
      oldestFile: oldest === Infinity ? 0 : oldest,
      newestFile: newest,
      byFormat,
    };
  }

  // ============================================
  // STORAGE PATHS
  // ============================================

  /** Get the path where a video should be stored */
  getVideoPath(filename: string): string {
    return path.join(this.config.rootDir, 'videos', filename);
  }

  /** Get the path where a thumbnail should be stored */
  getThumbnailPath(filename: string): string {
    return path.join(this.config.rootDir, 'thumbnails', filename);
  }

  /** Get the path for metadata JSON */
  getMetadataPath(filename: string): string {
    return path.join(this.config.rootDir, 'metadata', filename);
  }

  /** Get temp directory for in-progress downloads */
  getTempDir(): string {
    return path.join(this.config.rootDir, 'temp');
  }

  // ============================================
  // INTERNAL
  // ============================================

  private getTotalSize(): number {
    let total = 0;
    for (const file of this.fileIndex.values()) {
      total += file.fileSize;
    }
    return total;
  }

  /** Remove expired files and shrink storage to threshold */
  private async cleanup(): Promise<void> {
    const now = Date.now();
    const maxAge = this.config.retentionDays * 24 * 60 * 60 * 1000;
    const filesToDelete: string[] = [];

    // Remove expired files
    for (const [id, file] of this.fileIndex) {
      if (now - file.createdAt > maxAge) {
        filesToDelete.push(id);
      }
    }

    // If still over threshold, remove least-accessed files
    if (this.getTotalSize() > this.config.maxStorageBytes * this.config.cleanupThreshold) {
      const sortedByAccess = Array.from(this.fileIndex.entries())
        .filter(([id]) => !filesToDelete.includes(id))
        .sort(([, a], [, b]) => a.lastAccessedAt - b.lastAccessedAt);

      for (const [id] of sortedByAccess) {
        if (this.getTotalSize() <= this.config.maxStorageBytes * this.config.cleanupThreshold * 0.8) break;
        filesToDelete.push(id);
      }
    }

    // Execute deletions
    for (const id of filesToDelete) {
      await this.deleteFile(id);
    }

    // Clean temp directory
    try {
      const tempDir = this.getTempDir();
      const tempFiles = await fs.readdir(tempDir);
      for (const f of tempFiles) {
        const fp = path.join(tempDir, f);
        const stat = await fs.stat(fp);
        if (now - stat.mtimeMs > 60 * 60 * 1000) { // 1 hour old temp files
          await fs.unlink(fp);
        }
      }
    } catch { /* ignore */ }

    if (filesToDelete.length > 0) {
      console.log(`🧹 Cleaned up ${filesToDelete.length} files`);
    }
  }

  private async saveIndex(): Promise<void> {
    const entries = Array.from(this.fileIndex.values());
    await fs.writeFile(this.indexPath, JSON.stringify(entries, null, 2));
  }
}

// ============================================
// HELPERS
// ============================================

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

// ============================================
// SINGLETON
// ============================================

let _storage: DownloadStorage | null = null;

export async function getDownloadStorage(config?: Partial<StorageConfig>): Promise<DownloadStorage> {
  if (!_storage) {
    _storage = new DownloadStorage(config);
    await _storage.init();
  }
  return _storage;
}
