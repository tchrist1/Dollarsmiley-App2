export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

export class ResponseCache<T> {
  private cache: Map<string, CacheEntry<T>> = new Map();
  private readonly defaultTTL: number = 3600000;

  constructor(defaultTTLMs?: number) {
    if (defaultTTLMs !== undefined) {
      this.defaultTTL = defaultTTLMs;
    }
  }

  generateKey(params: Record<string, any>): string {
    const sortedKeys = Object.keys(params).sort();
    const keyString = sortedKeys
      .map(key => `${key}:${JSON.stringify(params[key])}`)
      .join('|');
    return this.hashString(keyString);
  }

  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }

  set(key: string, data: T, ttlMs?: number): void {
    const ttl = ttlMs !== undefined ? ttlMs : this.defaultTTL;
    const timestamp = Date.now();
    this.cache.set(key, {
      data,
      timestamp,
      expiresAt: timestamp + ttl,
    });
  }

  get(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) {
      return null;
    }

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  has(key: string): boolean {
    return this.get(key) !== null;
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
      }
    }
  }

  size(): number {
    return this.cache.size;
  }

  async getOrSet(
    key: string,
    fetchFn: () => Promise<T>,
    ttlMs?: number
  ): Promise<T> {
    const cached = this.get(key);
    if (cached !== null) {
      return cached;
    }

    const data = await fetchFn();
    this.set(key, data, ttlMs);
    return data;
  }
}

const caches: Map<string, ResponseCache<any>> = new Map();

export function getCache<T>(cacheName: string, ttlMs?: number): ResponseCache<T> {
  if (!caches.has(cacheName)) {
    caches.set(cacheName, new ResponseCache<T>(ttlMs));
  }
  return caches.get(cacheName)!;
}

export function clearAllCaches(): void {
  for (const cache of caches.values()) {
    cache.clear();
  }
}

export function cleanupAllCaches(): void {
  for (const cache of caches.values()) {
    cache.cleanup();
  }
}

setInterval(() => {
  cleanupAllCaches();
}, 300000);
