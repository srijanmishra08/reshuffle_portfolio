/**
 * Image Handler
 * Processes uploaded image files
 * Based on 07_CONTENT_INGESTION.md
 */

import sharp from 'sharp';
import type { NormalizedContent, ImageMetadata, FileInput, UserMetadata } from '../../types/index.js';
import { generateContentId, now } from '../../utils/index.js';
import { saveFile } from '../storage.js';

const SUPPORTED_FORMATS = ['jpeg', 'jpg', 'png', 'webp', 'gif', 'heic', 'heif'];
const MAX_SIZE_BYTES = 20 * 1024 * 1024; // 20MB

export async function extractImageMetadata(buffer: Buffer): Promise<ImageMetadata> {
  const metadata = await sharp(buffer).metadata();
  
  return {
    width: metadata.width || 0,
    height: metadata.height || 0,
    format: metadata.format || 'unknown',
    size_bytes: buffer.length
  };
}

export async function processImageUpload(
  file: FileInput,
  userMetadata?: UserMetadata
): Promise<NormalizedContent> {
  const { buffer, filename } = file;
  
  // Validate size
  if (buffer.length > MAX_SIZE_BYTES) {
    throw new Error(`Image too large. Maximum size is ${MAX_SIZE_BYTES / 1024 / 1024}MB`);
  }

  // Extract metadata
  const imageInfo = await extractImageMetadata(buffer);
  
  // Validate format
  if (!SUPPORTED_FORMATS.includes(imageInfo.format)) {
    throw new Error(`Unsupported image format: ${imageInfo.format}. Supported: ${SUPPORTED_FORMATS.join(', ')}`);
  }

  const contentId = generateContentId();

  // Optimize and save image
  const optimizedBuffer = await sharp(buffer)
    .resize(2000, 2000, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 85 })
    .toBuffer();

  const filePath = await saveFile(optimizedBuffer, `images/${contentId}.jpg`);

  return {
    content_id: contentId,
    type: 'image',
    source: 'upload',
    file_path: filePath,
    title: userMetadata?.title || filename,
    description: userMetadata?.description || '',
    extracted_data: {
      width: imageInfo.width,
      height: imageInfo.height,
      format: imageInfo.format
    },
    created_at: now()
  };
}
