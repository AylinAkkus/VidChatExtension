interface CacheEntry<T> {
  result?: T;
  promise?: Promise<T>;
}

export class SuggestionCache<TKey, TValue> {
  private cache = new Map<string, CacheEntry<TValue>>();
  private maxSize: number;

  constructor(options: { maxSize?: number } = {}) {
    this.maxSize = options.maxSize ?? 100; // Default: 100 entries
  }

  /**
   * Generate a cache key from the context object
   */
  private generateKey(key: TKey): string {
    return JSON.stringify(key);
  }

  /**
   * Get cached result or promise if available
   */
  get(key: TKey): TValue | Promise<TValue> | undefined {
    const cacheKey = this.generateKey(key);
    const entry = this.cache.get(cacheKey);

    if (!entry) {
      return undefined;
    }

    // Return result if available, otherwise return promise
    if (entry.result !== undefined) {
      console.log('💾 Cache hit - returning cached result');
      return entry.result;
    }

    if (entry.promise) {
      console.log('⏳ Cache hit - returning in-flight promise');
      return entry.promise;
    }

    return undefined;
  }

  /**
   * Set a promise for an in-flight request
   */
  setPromise(key: TKey, promise: Promise<TValue>): void {
    const cacheKey = this.generateKey(key);

    this.cache.set(cacheKey, {
      promise,
    });

    // When promise resolves, store the result
    promise.then((result) => {
      const entry = this.cache.get(cacheKey);
      if (entry) {
        entry.result = result;
        delete entry.promise;
      }
    }).catch(() => {
      // Remove failed promises from cache
      this.cache.delete(cacheKey);
    });

    this.cleanup();
  }

  /**
   * Set a completed result
   */
  set(key: TKey, value: TValue): void {
    const cacheKey = this.generateKey(key);

    this.cache.set(cacheKey, {
      result: value,
    });

    this.cleanup();
  }

  /**
   * Clean up old entries if cache is too large
   */
  private cleanup(): void {
    if (this.cache.size <= this.maxSize) {
      return;
    }

    // Remove excess entries (FIFO)
    const entries = Array.from(this.cache.keys());
    const toRemove = entries.slice(0, this.cache.size - this.maxSize);
    toRemove.forEach((key) => {
      this.cache.delete(key);
    });

    console.log(`🧹 Cache cleanup: removed ${toRemove.length} entries`);
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
    console.log('🗑️  Cache cleared');
  }

  /**
   * Get cache stats
   */
  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
    };
  }
}

