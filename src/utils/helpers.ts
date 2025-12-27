/**
 * Utility Functions
 */

import { v4 as uuidv4 } from 'uuid';

export function generateId(prefix: string = ''): string {
  const id = uuidv4().replace(/-/g, '').substring(0, 12);
  return prefix ? `${prefix}_${id}` : id;
}

export function generateContentId(): string {
  return generateId('c');
}

export function generateBlockId(): string {
  return generateId('b');
}

export function generatePortfolioId(): string {
  return generateId('p');
}

export function generateSectionId(): string {
  return generateId('s');
}

export function now(): string {
  return new Date().toISOString();
}

export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.substring(0, maxLength - 3) + '...';
}

export function wordCount(text: string): number {
  return text.split(/\s+/).filter(w => w.length > 0).length;
}

export function extractDomain(url: string): string | null {
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace('www.', '');
  } catch {
    return null;
  }
}

export function parseDuration(isoDuration: string): number {
  // Parse ISO 8601 duration (e.g., PT4M13S -> 253 seconds)
  const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  
  const hours = parseInt(match[1] || '0', 10);
  const minutes = parseInt(match[2] || '0', 10);
  const seconds = parseInt(match[3] || '0', 10);
  
  return hours * 3600 + minutes * 60 + seconds;
}

export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function sanitizeFilename(filename: string): string {
  return filename.replace(/[^a-zA-Z0-9.-]/g, '_').toLowerCase();
}

export function getFileExtension(filename: string): string {
  const parts = filename.split('.');
  return parts.length > 1 ? parts.pop()!.toLowerCase() : '';
}

export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

export function calculateAspectRatio(width: number, height: number): string {
  const ratio = width / height;
  
  if (Math.abs(ratio - 16/9) < 0.1) return '16:9';
  if (Math.abs(ratio - 9/16) < 0.1) return '9:16';
  if (Math.abs(ratio - 1) < 0.1) return '1:1';
  if (Math.abs(ratio - 4/5) < 0.1) return '4:5';
  if (Math.abs(ratio - 4/3) < 0.1) return '4:3';
  
  // Default to closest
  if (ratio > 1) return '16:9';
  return '9:16';
}
