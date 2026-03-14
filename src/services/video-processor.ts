/**
 * Video Processor Service
 * Post-download video processing: thumbnail generation, format conversion,
 * metadata extraction using ffmpeg/ffprobe.
 */

import { execFile } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs/promises';

const execFileAsync = promisify(execFile);

// ============================================
// TYPES
// ============================================

export interface VideoInfo {
  duration: number;      // seconds
  width: number;
  height: number;
  fps: number;
  codec: string;
  audioCodec: string;
  bitrate: number;
  fileSize: number;      // bytes
  format: string;
}

export interface ThumbnailOptions {
  timestamp?: number;    // seconds into video (default: 10% of duration)
  width?: number;        // thumbnail width (default: 640)
  height?: number;       // thumbnail height (auto if not set)
  quality?: number;      // 1-31, lower = better (default: 5)
}

export interface TranscodeOptions {
  outputFormat?: 'mp4' | 'webm' | 'mp3' | 'wav';
  videoBitrate?: string;     // e.g. "1M"
  audioBitrate?: string;     // e.g. "128k"
  maxWidth?: number;
  maxHeight?: number;
  crf?: number;              // Constant Rate Factor (18-28 for x264)
  preset?: 'ultrafast' | 'fast' | 'medium' | 'slow';
}

// ============================================
// BINARY PATHS
// ============================================

const FFMPEG_PATHS = ['ffmpeg', '/opt/homebrew/bin/ffmpeg', '/usr/local/bin/ffmpeg', '/usr/bin/ffmpeg'];
const FFPROBE_PATHS = ['ffprobe', '/opt/homebrew/bin/ffprobe', '/usr/local/bin/ffprobe', '/usr/bin/ffprobe'];

async function findBin(paths: string[]): Promise<string | null> {
  for (const p of paths) {
    try {
      await execFileAsync(p, ['-version'], { timeout: 5000 });
      return p;
    } catch { continue; }
  }
  return null;
}

let _ffmpeg: string | null = null;
let _ffprobe: string | null = null;

async function getFFmpeg(): Promise<string> {
  if (!_ffmpeg) _ffmpeg = await findBin(FFMPEG_PATHS);
  if (!_ffmpeg) throw new Error('ffmpeg not found');
  return _ffmpeg;
}

async function getFFprobe(): Promise<string> {
  if (!_ffprobe) _ffprobe = await findBin(FFPROBE_PATHS);
  if (!_ffprobe) throw new Error('ffprobe not found');
  return _ffprobe;
}

// ============================================
// VIDEO INFO
// ============================================

/** Extract video/audio metadata via ffprobe */
export async function getVideoInfo(filePath: string): Promise<VideoInfo> {
  const ffprobe = await getFFprobe();
  const stat = await fs.stat(filePath);

  const { stdout } = await execFileAsync(ffprobe, [
    '-v', 'quiet',
    '-print_format', 'json',
    '-show_format',
    '-show_streams',
    filePath,
  ], { timeout: 30000 });

  const data = JSON.parse(stdout);

  const videoStream = data.streams?.find((s: any) => s.codec_type === 'video');
  const audioStream = data.streams?.find((s: any) => s.codec_type === 'audio');
  const format = data.format || {};

  return {
    duration: parseFloat(format.duration || '0'),
    width: videoStream?.width || 0,
    height: videoStream?.height || 0,
    fps: videoStream?.r_frame_rate ? evalFraction(videoStream.r_frame_rate) : 0,
    codec: videoStream?.codec_name || 'unknown',
    audioCodec: audioStream?.codec_name || 'none',
    bitrate: parseInt(format.bit_rate || '0', 10),
    fileSize: stat.size,
    format: format.format_name || path.extname(filePath).replace('.', ''),
  };
}

// ============================================
// THUMBNAIL GENERATION
// ============================================

/** Generate a thumbnail image from a video file */
export async function generateThumbnail(
  videoPath: string,
  outputPath: string,
  options: ThumbnailOptions = {}
): Promise<string> {
  const ffmpeg = await getFFmpeg();

  // Get video duration to pick a good timestamp
  let timestamp = options.timestamp;
  if (timestamp === undefined) {
    const info = await getVideoInfo(videoPath);
    timestamp = Math.min(info.duration * 0.1, 10); // 10% or 10s max
    if (timestamp < 1 && info.duration > 1) timestamp = 1;
  }

  const width = options.width || 640;
  const quality = options.quality || 5;

  // Ensure output directory exists
  await fs.mkdir(path.dirname(outputPath), { recursive: true });

  const args = [
    '-y',                    // overwrite
    '-i', videoPath,
    '-ss', String(timestamp),
    '-vframes', '1',
    '-vf', `scale=${width}:-2`,
    '-q:v', String(quality),
    outputPath,
  ];

  if (options.height) {
    args[args.indexOf(`scale=${width}:-2`)] = `scale=${width}:${options.height}`;
  }

  await execFileAsync(ffmpeg, args, { timeout: 30000 });
  return outputPath;
}

/** Generate a contact sheet (grid of thumbnails) from a video */
export async function generateContactSheet(
  videoPath: string,
  outputPath: string,
  cols = 4,
  rows = 4
): Promise<string> {
  const ffmpeg = await getFFmpeg();
  const info = await getVideoInfo(videoPath);
  const interval = info.duration / (cols * rows + 1);

  await fs.mkdir(path.dirname(outputPath), { recursive: true });

  // Generate individual thumbnails then tile them
  const args = [
    '-y',
    '-i', videoPath,
    '-vf', `fps=1/${Math.max(interval, 1)},scale=320:-2,tile=${cols}x${rows}`,
    '-frames:v', '1',
    '-q:v', '5',
    outputPath,
  ];

  await execFileAsync(ffmpeg, args, { timeout: 60000 });
  return outputPath;
}

// ============================================
// TRANSCODING
// ============================================

/** Transcode a video to a different format */
export async function transcodeVideo(
  inputPath: string,
  outputPath: string,
  options: TranscodeOptions = {}
): Promise<string> {
  const ffmpeg = await getFFmpeg();
  await fs.mkdir(path.dirname(outputPath), { recursive: true });

  const args = ['-y', '-i', inputPath];

  // Video settings
  const outputFormat = options.outputFormat || 'mp4';

  if (outputFormat === 'mp3' || outputFormat === 'wav') {
    // Audio-only extraction
    args.push('-vn'); // no video
    if (options.audioBitrate) args.push('-b:a', options.audioBitrate);
  } else {
    // Video transcoding
    if (outputFormat === 'mp4') {
      args.push('-c:v', 'libx264', '-c:a', 'aac');
    } else if (outputFormat === 'webm') {
      args.push('-c:v', 'libvpx-vp9', '-c:a', 'libopus');
    }

    if (options.crf !== undefined) args.push('-crf', String(options.crf));
    if (options.preset) args.push('-preset', options.preset);
    if (options.videoBitrate) args.push('-b:v', options.videoBitrate);
    if (options.audioBitrate) args.push('-b:a', options.audioBitrate);

    // Scale filter for max dimensions
    if (options.maxWidth || options.maxHeight) {
      const w = options.maxWidth || -2;
      const h = options.maxHeight || -2;
      args.push('-vf', `scale='min(${w},iw)':'min(${h},ih)':force_original_aspect_ratio=decrease`);
    }

    // Faststart for web streaming
    if (outputFormat === 'mp4') {
      args.push('-movflags', '+faststart');
    }
  }

  args.push(outputPath);

  await execFileAsync(ffmpeg, args, { timeout: 300000 }); // 5 min timeout
  return outputPath;
}

/** Extract audio from a video file */
export async function extractAudio(
  videoPath: string,
  outputPath: string,
  format: 'mp3' | 'wav' | 'm4a' = 'mp3',
  bitrate = '192k'
): Promise<string> {
  return transcodeVideo(videoPath, outputPath, {
    outputFormat: format === 'm4a' ? 'mp4' : format,
    audioBitrate: bitrate,
  });
}

// ============================================
// HELPERS
// ============================================

/** Evaluate a fraction string like "30/1" or "30000/1001" */
function evalFraction(fracStr: string): number {
  const parts = fracStr.split('/');
  if (parts.length === 2) {
    const num = parseFloat(parts[0]);
    const den = parseFloat(parts[1]);
    return den > 0 ? Math.round(num / den * 100) / 100 : 0;
  }
  return parseFloat(fracStr) || 0;
}

/** Check if ffmpeg and ffprobe are available */
export async function checkFFmpegAvailable(): Promise<boolean> {
  try {
    await getFFmpeg();
    await getFFprobe();
    return true;
  } catch {
    return false;
  }
}
