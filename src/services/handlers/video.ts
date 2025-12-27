/**
 * Video Handler
 * Processes uploaded video files
 * Based on 07_CONTENT_INGESTION.md
 */

import type { NormalizedContent, VideoMetadata, FileInput, UserMetadata } from '../../types/index.js';
import { generateContentId, now } from '../../utils/index.js';
import { saveFile } from '../storage.js';

const SUPPORTED_FORMATS = ['mp4', 'mov', 'webm', 'avi', 'm4v'];
const MAX_SIZE_BYTES = 500 * 1024 * 1024; // 500MB

export function getVideoFormat(mimeType: string, filename: string): string {
  // Try from mime type
  const mimeFormats: Record<string, string> = {
    'video/mp4': 'mp4',
    'video/quicktime': 'mov',
    'video/webm': 'webm',
    'video/x-msvideo': 'avi',
    'video/x-m4v': 'm4v'
  };
  
  if (mimeFormats[mimeType]) {
    return mimeFormats[mimeType];
  }
  
  // Fall back to extension
  const ext = filename.split('.').pop()?.toLowerCase();
  return ext || 'mp4';
}

export async function processVideoUpload(
  file: FileInput,
  userMetadata?: UserMetadata
): Promise<NormalizedContent> {
  const { buffer, filename, mimetype } = file;
  
  // Validate size
  if (buffer.length > MAX_SIZE_BYTES) {
    throw new Error(`Video too large. Maximum size is ${MAX_SIZE_BYTES / 1024 / 1024}MB`);
  }

  const format = getVideoFormat(mimetype, filename);
  
  // Validate format
  if (!SUPPORTED_FORMATS.includes(format)) {
    throw new Error(`Unsupported video format: ${format}. Supported: ${SUPPORTED_FORMATS.join(', ')}`);
  }

  const contentId = generateContentId();

  // Save video file (no transcoding in this simple version)
  const filePath = await saveFile(buffer, `videos/${contentId}.${format}`);

  return {
    content_id: contentId,
    type: 'video',
    source: 'upload',
    file_path: filePath,
    title: userMetadata?.title || filename,
    description: userMetadata?.description || '',
    extracted_data: {
      format: format,
      size_bytes: buffer.length
      // Note: In production, use ffprobe for duration/dimensions
    },
    created_at: now()
  };
}
