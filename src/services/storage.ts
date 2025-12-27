/**
 * Storage Service
 * Simple local file storage for development
 * In production, replace with Firebase Storage or S3
 */

import fs from 'fs/promises';
import path from 'path';

const STORAGE_PATH = process.env.STORAGE_PATH || './uploads';

// Ensure storage directory exists
async function ensureStorageDir(dir: string): Promise<void> {
  const fullPath = path.join(STORAGE_PATH, dir);
  await fs.mkdir(fullPath, { recursive: true });
}

export async function saveFile(buffer: Buffer, filePath: string): Promise<string> {
  const dir = path.dirname(filePath);
  await ensureStorageDir(dir);
  
  const fullPath = path.join(STORAGE_PATH, filePath);
  await fs.writeFile(fullPath, buffer);
  
  // Return URL that can be accessed via the server
  // In production, this would be a cloud storage URL
  return `/uploads/${filePath}`;
}

export async function readFile(filePath: string): Promise<Buffer> {
  const fullPath = path.join(STORAGE_PATH, filePath);
  return fs.readFile(fullPath);
}

export async function deleteFile(filePath: string): Promise<void> {
  const fullPath = path.join(STORAGE_PATH, filePath);
  try {
    await fs.unlink(fullPath);
  } catch {
    // File may not exist, ignore
  }
}

export async function fileExists(filePath: string): Promise<boolean> {
  const fullPath = path.join(STORAGE_PATH, filePath);
  try {
    await fs.access(fullPath);
    return true;
  } catch {
    return false;
  }
}

export async function generateThumbnail(
  _inputPath: string, 
  outputPath: string
): Promise<string> {
  // For now, just return the output path
  // In production, use sharp or ffmpeg to generate thumbnails
  return `/uploads/${outputPath}`;
}

// Initialize storage directory
export async function initStorage(): Promise<void> {
  await fs.mkdir(STORAGE_PATH, { recursive: true });
  console.log(`📁 Storage initialized at ${STORAGE_PATH}`);
}
