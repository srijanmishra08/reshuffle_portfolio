/**
 * Cache Layer
 * In-memory LRU cache with TTL support.
 * In production, swap for Redis.
 */

interface CacheEntry<T> {
  data: T;
  expires: number;
  hits: number;
}

export class MemoryCache<T = any> {
  private store = new Map<string, CacheEntry<T>>();
  private readonly maxEntries: number;
  private readonly defaultTTL: number;

  constructor(opts: { maxEntries?: number; defaultTTLSeconds?: number } = {}) {
    this.maxEntries = opts.maxEntries ?? 1000;
    this.defaultTTL = (opts.defaultTTLSeconds ?? 3600) * 1000;

    // Periodic cleanup every 5 minutes
    setInterval(() => this.cleanup(), 5 * 60 * 1000).unref();
  }

  get(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (entry.expires < Date.now()) {
      this.store.delete(key);
      return undefined;
    }
    entry.hits++;
    return entry.data;
  }

  set(key: string, data: T, ttlSeconds?: number): void {
    // Evict least-used entries if at capacity
    if (this.store.size >= this.maxEntries) {
      this.evict();
    }
    this.store.set(key, {
      data,
      expires: Date.now() + (ttlSeconds ? ttlSeconds * 1000 : this.defaultTTL),
      hits: 0,
    });
  }

  has(key: string): boolean {
    const entry = this.store.get(key);
    if (!entry) return false;
    if (entry.expires < Date.now()) {
      this.store.delete(key);
      return false;
    }
    return true;
  }

  delete(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }

  get size(): number {
    return this.store.size;
  }

  private evict(): void {
    // Remove expired first
    const now = Date.now();
    for (const [key, entry] of this.store) {
      if (entry.expires < now) {
        this.store.delete(key);
      }
    }
    // If still over capacity, remove least-hit entries
    if (this.store.size >= this.maxEntries) {
      const entries = [...this.store.entries()].sort((a, b) => a[1].hits - b[1].hits);
      const toRemove = Math.ceil(this.maxEntries * 0.2); // Remove 20%
      for (let i = 0; i < toRemove && i < entries.length; i++) {
        this.store.delete(entries[i][0]);
      }
    }
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.store) {
      if (entry.expires < now) {
        this.store.delete(key);
      }
    }
  }
}

// ============================================
// SINGLETON CACHES
// ============================================

/** Cache for oEmbed / media resolution results */
export const mediaCache = new MemoryCache<any>({
  maxEntries: 2000,
  defaultTTLSeconds: parseInt(process.env.MEDIA_CACHE_TTL || '43200', 10),   // 12h
});

/** Cache for YouTube metadata */
export const youtubeCache = new MemoryCache<any>({
  maxEntries: 500,
  defaultTTLSeconds: parseInt(process.env.YOUTUBE_CACHE_TTL || '86400', 10), // 24h
});

/** Cache for GitHub metadata */
export const githubCache = new MemoryCache<any>({
  maxEntries: 500,
  defaultTTLSeconds: parseInt(process.env.GITHUB_CACHE_TTL || '3600', 10),   // 1h
});

/** Cache for SSR-rendered portfolio HTML */
export const ssrCache = new MemoryCache<string>({
  maxEntries: 200,
  defaultTTLSeconds: 300, // 5 min
});
