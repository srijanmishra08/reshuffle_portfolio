/**
 * Video Downloader Service
 * Wraps yt-dlp binary for universal video/audio downloading.
 * Supports 1000+ sites including YouTube, Vimeo, Instagram, TikTok, Twitter/X, etc.
 * Inspired by: github.com/Avnsx/fansly-downloader (content downloading patterns)
 *              github.com/alexch33/super-video-downloader (yt-dlp integration, HLS/DASH support)
 */

import { spawn, execFile } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs/promises';
import { EventEmitter } from 'events';

const execFileAsync = promisify(execFile);

// ============================================
// TYPES
// ============================================

export type DownloadQuality = 'best' | '1080p' | '720p' | '480p' | '360p' | 'audio_only';
export type DownloadFormat = 'mp4' | 'webm' | 'mp3' | 'wav' | 'original';
export type DownloadStatus = 'queued' | 'downloading' | 'processing' | 'completed' | 'failed' | 'cancelled';

export interface DownloadOptions {
  quality?: DownloadQuality;
  format?: DownloadFormat;
  extractAudio?: boolean;
  embedThumbnail?: boolean;
  maxFileSize?: string;       // e.g. "500M"
  rateLimit?: string;         // e.g. "5M" for 5MB/s
  outputDir?: string;
  filenameTemplate?: string;
  cookies?: string;           // cookie file path
  proxy?: string;
  timeout?: number;           // seconds
}

export interface VideoMetadata {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  duration: number;           // seconds
  uploader: string;
  uploader_url: string;
  view_count: number;
  like_count: number;
  upload_date: string;        // YYYYMMDD
  webpage_url: string;
  extractor: string;          // platform name
  format: string;
  width: number;
  height: number;
  fps: number;
  filesize_approx: number;    // bytes
  formats: FormatInfo[];
}

export interface FormatInfo {
  format_id: string;
  ext: string;
  resolution: string;
  filesize: number;
  vcodec: string;
  acodec: string;
  fps: number;
  tbr: number;                // total bitrate
}

export interface DownloadProgress {
  status: 'downloading' | 'processing' | 'complete' | 'error';
  percent: number;
  speed: string;
  eta: string;
  downloaded_bytes: number;
  total_bytes: number;
  filename: string;
  elapsed: number;
}

export interface DownloadResult {
  success: boolean;
  filePath: string;
  filename: string;
  fileSize: number;
  duration: number;
  format: string;
  thumbnailPath?: string;
  metadata: VideoMetadata;
  error?: string;
}

// ============================================
// YT-DLP BINARY DETECTION
// ============================================

const YT_DLP_PATHS = [
  'yt-dlp',                           // system PATH
  '/opt/homebrew/bin/yt-dlp',          // macOS ARM homebrew
  '/usr/local/bin/yt-dlp',            // macOS Intel / Linux
  '/usr/bin/yt-dlp',                  // Linux system
];

const FFMPEG_PATHS = [
  'ffmpeg',
  '/opt/homebrew/bin/ffmpeg',
  '/usr/local/bin/ffmpeg',
  '/usr/bin/ffmpeg',
];

async function findBinary(paths: string[], versionFlag = '--version'): Promise<string | null> {
  for (const p of paths) {
    try {
      await execFileAsync(p, [versionFlag], { timeout: 5000 });
      return p;
    } catch {
      continue;
    }
  }
  return null;
}

/** Resolve a binary name to its full filesystem path */
async function resolveBinaryPath(name: string): Promise<string> {
  try {
    const { stdout } = await execFileAsync('which', [name], { timeout: 3000 });
    return stdout.trim();
  } catch {
    return name;
  }
}

let _ytdlpPath: string | null = null;
let _ffmpegPath: string | null = null;

async function getYtDlpPath(): Promise<string> {
  if (!_ytdlpPath) {
    _ytdlpPath = await findBinary(YT_DLP_PATHS);
    if (!_ytdlpPath) {
      throw new Error('yt-dlp not found. Install with: brew install yt-dlp (macOS) or pip install yt-dlp');
    }
  }
  return _ytdlpPath;
}

async function getFfmpegPath(): Promise<string> {
  if (!_ffmpegPath) {
    _ffmpegPath = await findBinary(FFMPEG_PATHS, '-version');
    if (!_ffmpegPath) {
      throw new Error('ffmpeg not found. Install with: brew install ffmpeg');
    }
  }
  return _ffmpegPath;
}

// ============================================
// QUALITY MAP
// ============================================

function qualityToFormat(quality: DownloadQuality): string {
  switch (quality) {
    case 'best':       return 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best';
    case '1080p':      return 'bestvideo[height<=1080][ext=mp4]+bestaudio[ext=m4a]/best[height<=1080][ext=mp4]/best[height<=1080]';
    case '720p':       return 'bestvideo[height<=720][ext=mp4]+bestaudio[ext=m4a]/best[height<=720][ext=mp4]/best[height<=720]';
    case '480p':       return 'bestvideo[height<=480][ext=mp4]+bestaudio[ext=m4a]/best[height<=480][ext=mp4]/best[height<=480]';
    case '360p':       return 'bestvideo[height<=360][ext=mp4]+bestaudio[ext=m4a]/best[height<=360][ext=mp4]/best[height<=360]';
    case 'audio_only': return 'bestaudio[ext=m4a]/bestaudio';
    default:           return 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best';
  }
}

// ============================================
// SUPPORTED SITES CHECK
// ============================================

/** Check if a URL is from a site supported by yt-dlp */
export async function isSupportedURL(url: string): Promise<boolean> {
  try {
    const ytdlp = await getYtDlpPath();
    await execFileAsync(ytdlp, [
      '--simulate',
      '--no-warnings',
      '-q',
      url,
    ], { timeout: 15000 });
    return true;
  } catch {
    return false;
  }
}

/** Get list of all supported extractors (sites) */
export async function getSupportedSites(): Promise<string[]> {
  const ytdlp = await getYtDlpPath();
  const { stdout } = await execFileAsync(ytdlp, ['--list-extractors'], { timeout: 10000 });
  return stdout.trim().split('\n').filter(Boolean);
}

// ============================================
// METADATA EXTRACTION
// ============================================

/** Extract video metadata without downloading */
export async function extractMetadata(url: string): Promise<VideoMetadata> {
  const ytdlp = await getYtDlpPath();
  
  const args = [
    '--dump-json',
    '--no-download',
    '--no-warnings',
    '--no-playlist',        // single video only
    url,
  ];

  const { stdout } = await execFileAsync(ytdlp, args, { timeout: 30000 });
  const raw = JSON.parse(stdout);

  return {
    id: raw.id || '',
    title: raw.title || 'Untitled',
    description: (raw.description || '').slice(0, 2000),
    thumbnail: raw.thumbnail || '',
    duration: raw.duration || 0,
    uploader: raw.uploader || raw.channel || '',
    uploader_url: raw.uploader_url || raw.channel_url || '',
    view_count: raw.view_count || 0,
    like_count: raw.like_count || 0,
    upload_date: raw.upload_date || '',
    webpage_url: raw.webpage_url || url,
    extractor: raw.extractor || raw.extractor_key || 'unknown',
    format: raw.format || '',
    width: raw.width || 0,
    height: raw.height || 0,
    fps: raw.fps || 0,
    filesize_approx: raw.filesize_approx || raw.filesize || 0,
    formats: (raw.formats || []).slice(0, 20).map((f: any) => ({
      format_id: f.format_id || '',
      ext: f.ext || '',
      resolution: f.resolution || `${f.width || '?'}x${f.height || '?'}`,
      filesize: f.filesize || f.filesize_approx || 0,
      vcodec: f.vcodec || 'none',
      acodec: f.acodec || 'none',
      fps: f.fps || 0,
      tbr: f.tbr || 0,
    })),
  };
}

// ============================================
// DOWNLOAD WITH PROGRESS
// ============================================

export class VideoDownloader extends EventEmitter {
  private process: ReturnType<typeof spawn> | null = null;

  /** Download a video/audio from URL with progress events */
  async download(url: string, options: DownloadOptions = {}): Promise<DownloadResult> {
    const ytdlp = await getYtDlpPath();
    let ffmpeg = await getFfmpegPath();
    // Resolve to full path so --ffmpeg-location works correctly
    ffmpeg = await resolveBinaryPath(ffmpeg);

    const outputDir = options.outputDir || path.join(process.cwd(), 'downloads', 'videos');
    await fs.mkdir(outputDir, { recursive: true });

    const template = options.filenameTemplate || '%(id)s_%(title).50s.%(ext)s';
    const outputPath = path.join(outputDir, template);

    // Build yt-dlp arguments
    const args: string[] = [
      '-f', qualityToFormat(options.quality || 'best'),
      '-o', outputPath,
      '--no-playlist',
      '--write-thumbnail',
      '--convert-thumbnails', 'jpg',
      '--write-info-json',
      '--newline',               // each progress line on newline for parsing
      '--progress-template', '%(progress._percent_str)s|%(progress._speed_str)s|%(progress._eta_str)s|%(progress._downloaded_bytes_str)s|%(progress._total_bytes_str)s',
      '--ffmpeg-location', path.dirname(ffmpeg),
      '--no-warnings',
      '--restrict-filenames',    // safe filenames
      '--no-overwrites',
    ];

    // Format conversion
    if (options.format === 'mp4') {
      args.push('--merge-output-format', 'mp4');
    } else if (options.format === 'webm') {
      args.push('--merge-output-format', 'webm');
    } else if (options.format === 'mp3' || options.extractAudio) {
      args.push('-x', '--audio-format', options.format === 'wav' ? 'wav' : 'mp3');
    }

    // Embed thumbnail in file
    if (options.embedThumbnail) {
      args.push('--embed-thumbnail');
    }

    // Rate limit
    if (options.rateLimit) {
      args.push('-r', options.rateLimit);
    }

    // Max file size
    if (options.maxFileSize) {
      args.push('--max-filesize', options.maxFileSize);
    }

    // Proxy
    if (options.proxy) {
      args.push('--proxy', options.proxy);
    }

    // Cookies
    if (options.cookies) {
      args.push('--cookies', options.cookies);
    }

    args.push(url);

    // Spawn the download process
    return new Promise<DownloadResult>((resolve, reject) => {
      const timeout = options.timeout || 600; // 10 min default
      let timedOut = false;

      const timer = setTimeout(() => {
        timedOut = true;
        this.cancel();
        reject(new Error(`Download timed out after ${timeout}s`));
      }, timeout * 1000);

      this.process = spawn(ytdlp, args, {
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      let stderr = '';

      this.process.stdout?.on('data', (data: Buffer) => {
        const lines = data.toString().split('\n').filter(Boolean);
        for (const line of lines) {
          this.parseProgress(line);
        }
      });

      this.process.stderr?.on('data', (data: Buffer) => {
        stderr += data.toString();
      });

      this.process.on('close', async (code) => {
        clearTimeout(timer);
        if (timedOut) return;

        if (code !== 0) {
          this.emit('progress', { status: 'error', percent: 0, speed: '', eta: '', downloaded_bytes: 0, total_bytes: 0, filename: '', elapsed: 0 });
          reject(new Error(`yt-dlp exited with code ${code}: ${stderr.slice(0, 500)}`));
          return;
        }

        try {
          // Find the actual downloaded file(s)
          const result = await this.findDownloadedFiles(outputDir, url);
          this.emit('progress', { status: 'complete', percent: 100, speed: '', eta: '', downloaded_bytes: result.fileSize, total_bytes: result.fileSize, filename: result.filename, elapsed: 0 });
          resolve(result);
        } catch (err) {
          reject(new Error(`Download succeeded but file not found: ${(err as Error).message}`));
        }
      });

      this.process.on('error', (err) => {
        clearTimeout(timer);
        reject(new Error(`Failed to spawn yt-dlp: ${err.message}`));
      });
    });
  }

  /** Cancel the current download */
  cancel(): void {
    if (this.process) {
      this.process.kill('SIGTERM');
      setTimeout(() => {
        if (this.process && !this.process.killed) {
          this.process.kill('SIGKILL');
        }
      }, 3000);
    }
  }

  /** Parse yt-dlp progress output */
  private parseProgress(line: string): void {
    // Try to parse our custom progress template
    const parts = line.trim().split('|');
    if (parts.length >= 5) {
      const percent = parseFloat(parts[0].replace('%', '').trim()) || 0;
      this.emit('progress', {
        status: 'downloading' as const,
        percent,
        speed: parts[1]?.trim() || '',
        eta: parts[2]?.trim() || '',
        downloaded_bytes: parseByteString(parts[3]?.trim() || '0'),
        total_bytes: parseByteString(parts[4]?.trim() || '0'),
        filename: '',
        elapsed: 0,
      } satisfies DownloadProgress);
    }
    // Also check for standard [download] lines
    else if (line.includes('[download]') && line.includes('%')) {
      const match = line.match(/([\d.]+)%/);
      if (match) {
        this.emit('progress', {
          status: 'downloading' as const,
          percent: parseFloat(match[1]),
          speed: '',
          eta: '',
          downloaded_bytes: 0,
          total_bytes: 0,
          filename: '',
          elapsed: 0,
        } satisfies DownloadProgress);
      }
    }
    // Merging / post-processing
    else if (line.includes('[Merger]') || line.includes('[ffmpeg]') || line.includes('[ExtractAudio]')) {
      this.emit('progress', {
        status: 'processing' as const,
        percent: 99,
        speed: '',
        eta: '',
        downloaded_bytes: 0,
        total_bytes: 0,
        filename: '',
        elapsed: 0,
      } satisfies DownloadProgress);
    }
  }

  /** Find the actual downloaded file and associated thumbnail/metadata */
  private async findDownloadedFiles(outputDir: string, url: string): Promise<DownloadResult> {
    // First try to get metadata to know the filename
    let metadata: VideoMetadata;
    try {
      metadata = await extractMetadata(url);
    } catch {
      metadata = {
        id: 'unknown', title: 'Unknown', description: '', thumbnail: '',
        duration: 0, uploader: '', uploader_url: '', view_count: 0,
        like_count: 0, upload_date: '', webpage_url: url, extractor: 'unknown',
        format: '', width: 0, height: 0, fps: 0, filesize_approx: 0, formats: [],
      };
    }

    // Scan the output directory for recently modified files
    const files = await fs.readdir(outputDir);
    const videoExts = ['.mp4', '.webm', '.mkv', '.avi', '.mov', '.mp3', '.wav', '.m4a', '.ogg', '.flac'];
    const thumbExts = ['.jpg', '.jpeg', '.png', '.webp'];
    
    let videoFile = '';
    let thumbFile = '';
    let newestTime = 0;

    for (const file of files) {
      const ext = path.extname(file).toLowerCase();
      const stat = await fs.stat(path.join(outputDir, file));
      const mtime = stat.mtimeMs;

      if (videoExts.includes(ext) && mtime > newestTime) {
        videoFile = file;
        newestTime = mtime;
      }
      if (thumbExts.includes(ext) && file.includes(metadata.id)) {
        thumbFile = file;
      }
    }

    if (!videoFile) {
      throw new Error('No video file found in output directory');
    }

    const filePath = path.join(outputDir, videoFile);
    const stat = await fs.stat(filePath);

    return {
      success: true,
      filePath,
      filename: videoFile,
      fileSize: stat.size,
      duration: metadata.duration,
      format: path.extname(videoFile).replace('.', ''),
      thumbnailPath: thumbFile ? path.join(outputDir, thumbFile) : undefined,
      metadata,
    };
  }
}

// ============================================
// CONVENIENCE FUNCTIONS
// ============================================

/** Quick download without progress tracking */
export async function downloadVideo(url: string, options: DownloadOptions = {}): Promise<DownloadResult> {
  const downloader = new VideoDownloader();
  return downloader.download(url, options);
}

/** Download just the thumbnail */
export async function downloadThumbnail(url: string, outputDir: string): Promise<string> {
  const ytdlp = await getYtDlpPath();
  const outputPath = path.join(outputDir, '%(id)s_thumb.%(ext)s');
  
  await fs.mkdir(outputDir, { recursive: true });

  await execFileAsync(ytdlp, [
    '--write-thumbnail',
    '--convert-thumbnails', 'jpg',
    '--skip-download',
    '-o', outputPath,
    '--no-warnings',
    '--restrict-filenames',
    url,
  ], { timeout: 30000 });

  // Find the thumbnail
  const files = await fs.readdir(outputDir);
  const thumb = files.find(f => f.includes('_thumb') && /\.(jpg|jpeg|png|webp)$/i.test(f));
  if (!thumb) throw new Error('Thumbnail not found');
  return path.join(outputDir, thumb);
}

// ============================================
// HELPERS
// ============================================

function parseByteString(s: string): number {
  const match = s.match(/([\d.]+)\s*(KiB|MiB|GiB|B|KB|MB|GB)?/i);
  if (!match) return 0;
  const num = parseFloat(match[1]);
  const unit = (match[2] || 'B').toUpperCase();
  const multipliers: Record<string, number> = {
    'B': 1, 'KB': 1024, 'KIB': 1024,
    'MB': 1024 ** 2, 'MIB': 1024 ** 2,
    'GB': 1024 ** 3, 'GIB': 1024 ** 3,
  };
  return Math.round(num * (multipliers[unit] || 1));
}

/** Check if yt-dlp and ffmpeg are available */
export async function checkDependencies(): Promise<{
  ytdlp: { available: boolean; version: string; path: string };
  ffmpeg: { available: boolean; version: string; path: string };
}> {
  let ytdlpInfo = { available: false, version: '', path: '' };
  let ffmpegInfo = { available: false, version: '', path: '' };

  try {
    const ytdlp = await getYtDlpPath();
    const { stdout } = await execFileAsync(ytdlp, ['--version'], { timeout: 5000 });
    ytdlpInfo = { available: true, version: stdout.trim(), path: ytdlp };
  } catch {}

  try {
    const ffmpeg = await getFfmpegPath();
    const { stdout } = await execFileAsync(ffmpeg, ['-version'], { timeout: 5000 });
    const versionMatch = stdout.match(/ffmpeg version ([\S]+)/);
    ffmpegInfo = { available: true, version: versionMatch?.[1] || 'unknown', path: ffmpeg };
  } catch {}

  return { ytdlp: ytdlpInfo, ffmpeg: ffmpegInfo };
}
