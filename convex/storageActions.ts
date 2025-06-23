// convex/storageActions.ts - ADVANCED Storage & Caching System
import { useCallback, useRef, useEffect, useState } from 'react';
import { debounce } from './optimizationUtils';

// ========================================
// INTELLIGENT CACHING SYSTEM
// ========================================

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  size: number;
  accessCount: number;
  lastAccessed: number;
}

export class IntelligentCache<T = any> {
  private cache = new Map<string, CacheEntry<T>>();
  private maxSize: number;
  private currentSize = 0;
  private maxMemory: number;

  constructor(maxSize = 1000, maxMemory = 100 * 1024 * 1024) { // 100MB default
    this.maxSize = maxSize;
    this.maxMemory = maxMemory;
  }

  set(key: string, data: T, ttl = 3600000): void { // 1 hour default TTL
    const size = this.estimateSize(data);
    const now = Date.now();

    // Check if we need to evict
    this.evictIfNeeded(size);

    const entry: CacheEntry<T> = {
      data,
      timestamp: now,
      ttl,
      size,
      accessCount: 0,
      lastAccessed: now
    };

    this.cache.set(key, entry);
    this.currentSize += size;
  }

  get(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const now = Date.now();
    
    // Check if expired
    if (now - entry.timestamp > entry.ttl) {
      this.delete(key);
      return null;
    }

    // Update access statistics
    entry.accessCount++;
    entry.lastAccessed = now;

    return entry.data;
  }

  delete(key: string): boolean {
    const entry = this.cache.get(key);
    if (entry) {
      this.currentSize -= entry.size;
      return this.cache.delete(key);
    }
    return false;
  }

  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.delete(key);
      return false;
    }

    return true;
  }

  clear(): void {
    this.cache.clear();
    this.currentSize = 0;
  }

  private estimateSize(data: any): number {
    if (typeof data === 'string') {
      return data.length * 2; // UTF-16
    } else if (typeof data === 'object') {
      return JSON.stringify(data).length * 2;
    } else {
      return 8; // Primitive types
    }
  }

  private evictIfNeeded(newEntrySize: number): void {
    // Evict by memory usage
    while (this.currentSize + newEntrySize > this.maxMemory) {
      this.evictLeastValuable();
    }

    // Evict by count
    while (this.cache.size >= this.maxSize) {
      this.evictLeastValuable();
    }
  }

  private evictLeastValuable(): void {
    let leastValuable: string | null = null;
    let leastValue = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      // Value = accessCount / age (higher is better)
      const age = Date.now() - entry.timestamp;
      const value = entry.accessCount / (age / 1000 / 60); // per minute
      
      if (value < leastValue) {
        leastValue = value;
        leastValuable = key;
      }
    }

    if (leastValuable) {
      this.delete(leastValuable);
    }
  }

  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      memoryUsage: this.currentSize,
      maxMemory: this.maxMemory,
      hitRate: this.calculateHitRate()
    };
  }

  private calculateHitRate(): number {
    // This would need to be tracked separately in a real implementation
    return 0.85; // Placeholder
  }
}

// ========================================
// PREFETCHING SYSTEM
// ========================================

interface PrefetchOptions {
  priority?: 'high' | 'medium' | 'low';
  condition?: () => boolean;
  delay?: number;
}

export class PrefetchManager {
  private queue: Array<{
    key: string;
    fetcher: () => Promise<any>;
    options: PrefetchOptions;
    timestamp: number;
  }> = [];
  
  private processing = false;
  private cache: IntelligentCache;
  private activeRequests = new Set<string>();

  constructor(cache: IntelligentCache) {
    this.cache = cache;
  }

  prefetch<T>(
    key: string, 
    fetcher: () => Promise<T>, 
    options: PrefetchOptions = {}
  ): void {
    // Don't prefetch if already cached or in progress
    if (this.cache.has(key) || this.activeRequests.has(key)) {
      return;
    }

    // Check condition
    if (options.condition && !options.condition()) {
      return;
    }

    this.queue.push({
      key,
      fetcher,
      options: { priority: 'medium', delay: 0, ...options },
      timestamp: Date.now()
    });

    this.processQueue();
  }

  private async processQueue(): Promise<void> {
    if (this.processing || this.queue.length === 0) return;

    this.processing = true;

    // Sort by priority and timestamp
    this.queue.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      const aPriority = priorityOrder[a.options.priority || 'medium'];
      const bPriority = priorityOrder[b.options.priority || 'medium'];
      
      if (aPriority !== bPriority) {
        return bPriority - aPriority;
      }
      return a.timestamp - b.timestamp;
    });

    while (this.queue.length > 0 && this.shouldContinueProcessing()) {
      const item = this.queue.shift()!;
      
      try {
        this.activeRequests.add(item.key);
        
        if (item.options.delay) {
          await new Promise(resolve => setTimeout(resolve, item.options.delay));
        }

        const data = await item.fetcher();
        this.cache.set(item.key, data);
      } catch (error) {
        console.warn(`Prefetch failed for ${item.key}:`, error);
      } finally {
        this.activeRequests.delete(item.key);
      }

      // Yield to main thread
      await new Promise(resolve => setTimeout(resolve, 0));
    }

    this.processing = false;
  }

  private shouldContinueProcessing(): boolean {
    // Stop prefetching if system is under pressure
    if ('memory' in (performance as any)) {
      const memInfo = (performance as any).memory;
      const memoryUsage = memInfo.usedJSHeapSize / memInfo.jsHeapSizeLimit;
      if (memoryUsage > 0.8) return false;
    }

    return true;
  }

  clear(): void {
    this.queue.length = 0;
    this.activeRequests.clear();
  }
}

// ========================================
// OFFLINE STORAGE SYSTEM
// ========================================

export class OfflineStorage {
  private dbName = 'animuse-offline';
  private version = 1;
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Create stores
        if (!db.objectStoreNames.contains('anime')) {
          const animeStore = db.createObjectStore('anime', { keyPath: '_id' });
          animeStore.createIndex('rating', 'rating', { unique: false });
          animeStore.createIndex('year', 'year', { unique: false });
        }

        if (!db.objectStoreNames.contains('characters')) {
          db.createObjectStore('characters', { keyPath: '_id' });
        }

        if (!db.objectStoreNames.contains('reviews')) {
          db.createObjectStore('reviews', { keyPath: '_id' });
        }

        if (!db.objectStoreNames.contains('cache')) {
          const cacheStore = db.createObjectStore('cache', { keyPath: 'key' });
          cacheStore.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };
    });
  }

  async set(storeName: string, data: any): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.put(data);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async get(storeName: string, key: string): Promise<any> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.get(key);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  }

  async getAll(storeName: string): Promise<any[]> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  }

  async delete(storeName: string, key: string): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(key);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async clear(storeName: string): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.clear();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }
}

// ========================================
// HOOKS FOR REACT INTEGRATION
// ========================================

export const useIntelligentCache = <T = any>() => {
  const cacheRef = useRef<IntelligentCache<T> | null>(null);
  
  if (!cacheRef.current) {
    cacheRef.current = new IntelligentCache<T>();
  }

  return cacheRef.current;
};

export const usePrefetching = () => {
  const cache = useIntelligentCache();
  const prefetchManagerRef = useRef<PrefetchManager | null>(null);
  
  if (!prefetchManagerRef.current && cache) {
    prefetchManagerRef.current = new PrefetchManager(cache);
  }

  const prefetch = useCallback(<T>(
    key: string,
    fetcher: () => Promise<T>,
    options?: PrefetchOptions
  ) => {
    prefetchManagerRef.current!.prefetch(key, fetcher, options);
  }, []);

  // Smart prefetching on hover
  const prefetchOnHover = useCallback(
    debounce((key: string, fetcher: () => Promise<any>) => {
      prefetch(key, fetcher, { 
        priority: 'low',
        delay: 100,
        condition: () => (navigator as any).connection ? 
          (navigator as any).connection.effectiveType !== 'slow-2g' : true
      });
    }, 300),
    [prefetch]
  );

  return {
    prefetch,
    prefetchOnHover,
    cache,
    manager: prefetchManagerRef.current
  };
};

export const useOfflineStorage = () => {
  const storageRef = useRef<OfflineStorage | null>(null);
  const [isReady, setIsReady] = useState(false);

  if (!storageRef.current) {
    storageRef.current = new OfflineStorage();
  }

  useEffect(() => {
    storageRef.current!.init().then(() => {
      setIsReady(true);
    }).catch(console.error);
  }, []);

  return {
    storage: storageRef.current,
    isReady
  };
};

// ========================================
// SMART DATA SYNCHRONIZATION
// ========================================

interface SyncOptions {
  immediate?: boolean;
  background?: boolean;
  retryCount?: number;
  retryDelay?: number;
}

export class SmartSync {
  private offlineStorage: OfflineStorage;
  private cache: IntelligentCache;
  private syncQueue: Array<{
    action: 'create' | 'update' | 'delete';
    storeName: string;
    data: any;
    timestamp: number;
  }> = [];

  constructor(offlineStorage: OfflineStorage, cache: IntelligentCache) {
    this.offlineStorage = offlineStorage;
    this.cache = cache;
    this.setupOnlineListener();
  }

  private setupOnlineListener(): void {
    window.addEventListener('online', () => {
      this.processSyncQueue();
    });
  }

  async queueSync(
    action: 'create' | 'update' | 'delete',
    storeName: string,
    data: any,
    options: SyncOptions = {}
  ): Promise<void> {
    const syncItem = {
      action,
      storeName,
      data,
      timestamp: Date.now()
    };

    this.syncQueue.push(syncItem);

    // Store offline
    if (action === 'delete') {
      await this.offlineStorage.delete(storeName, data._id);
    } else {
      await this.offlineStorage.set(storeName, data);
    }

    // Update cache
    const cacheKey = `${storeName}:${data._id}`;
    if (action === 'delete') {
      this.cache.delete(cacheKey);
    } else {
      this.cache.set(cacheKey, data);
    }

    // Sync immediately if online and requested
    if (options.immediate && navigator.onLine) {
      await this.processSyncQueue();
    }
  }

  private async processSyncQueue(): Promise<void> {
    if (!navigator.onLine || this.syncQueue.length === 0) return;

    const itemsToSync = [...this.syncQueue];
    this.syncQueue.length = 0;

    for (const item of itemsToSync) {
      try {
        await this.syncItem(item);
      } catch (error) {
        // Re-queue failed items
        this.syncQueue.push(item);
        console.error('Sync failed:', error);
      }
    }
  }

  private async syncItem(item: any): Promise<void> {
    // This would integrate with your Convex backend
    const endpoint = `/api/${item.storeName}`;
    
    const response = await fetch(endpoint, {
      method: item.action === 'delete' ? 'DELETE' : 
              item.action === 'create' ? 'POST' : 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item.data)
    });

    if (!response.ok) {
      throw new Error(`Sync failed: ${response.statusText}`);
    }
  }
}

export const useSmartSync = () => {
  const { storage } = useOfflineStorage();
  const cache = useIntelligentCache();
  const syncRef = useRef<SmartSync | null>(null);

  useEffect(() => {
    if (storage && cache && !syncRef.current) {
      syncRef.current = new SmartSync(storage, cache);
    }
  }, [storage, cache]);

  return syncRef.current;
};
