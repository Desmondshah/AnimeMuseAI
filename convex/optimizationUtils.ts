// convex/optimizationUtils.ts - ULTIMATE Performance Optimization Utilities
import { useCallback, useRef, useMemo, useEffect, useState } from 'react';

// ========================================
// MEMORY POOL SYSTEM - Prevent GC Pauses
// ========================================

export class MemoryPool<T> {
  private pool: T[] = [];
  private active = new Set<T>();
  private factory: () => T;
  private reset?: (item: T) => void;
  private maxSize: number;

  constructor(factory: () => T, reset?: (item: T) => void, maxSize = 100) {
    this.factory = factory;
    this.reset = reset;
    this.maxSize = maxSize;
  }

  acquire(): T {
    let item = this.pool.pop();
    if (!item) {
      item = this.factory();
    }
    this.active.add(item);
    return item;
  }

  release(item: T) {
    if (this.active.has(item)) {
      this.active.delete(item);
      if (this.reset) {
        this.reset(item);
      }
      if (this.pool.length < this.maxSize) {
        this.pool.push(item);
      }
    }
  }

  clear() {
    this.pool.length = 0;
    this.active.clear();
  }

  getStats() {
    return {
      poolSize: this.pool.length,
      activeCount: this.active.size,
      totalCreated: this.pool.length + this.active.size
    };
  }
}

export const useMemoryPool = <T>(factory: () => T, reset?: (item: T) => void) => {
  const poolRef = useRef<MemoryPool<T> | null>(null);
  
  if (!poolRef.current) {
    poolRef.current = new MemoryPool(factory, reset);
  }

  useEffect(() => {
    return () => poolRef.current?.clear();
  }, []);

  return poolRef.current;
};

// ========================================
// ADVANCED IMAGE OPTIMIZATION
// ========================================

interface ImageCache {
  [key: string]: {
    promise: Promise<HTMLImageElement>;
    timestamp: number;
    size: number;
  };
}

export class AdvancedImageOptimizer {
  private cache: ImageCache = {};
  private maxCacheSize = 50 * 1024 * 1024; // 50MB
  private currentCacheSize = 0;

  supportsWebP(): boolean {
    if (typeof document === 'undefined') return false;
    const canvas = document.createElement('canvas');
    return canvas.toDataURL('image/webp').indexOf('image/webp') === 5;
  }

  supportsAVIF(): boolean {
    if (typeof document === 'undefined') return false;
    const canvas = document.createElement('canvas');
    return canvas.toDataURL('image/avif').indexOf('image/avif') === 5;
  }

  optimizeImageUrl(url: string, options: {
    width?: number;
    height?: number;
    quality?: number;
    format?: 'auto' | 'webp' | 'avif' | 'jpeg';
  } = {}): string {
    if (!url) return '';

    const { width = 400, height, quality = 85, format = 'auto' } = options;

    // Auto-detect best format
    let targetFormat = format;
    if (format === 'auto') {
      if (this.supportsAVIF()) {
        targetFormat = 'avif';
      } else if (this.supportsWebP()) {
        targetFormat = 'webp';
      } else {
        targetFormat = 'jpeg';
      }
    }

    // Handle different image services
    if (url.includes('myanimelist.net')) {
      return this.optimizeMALImage(url, { width, height, quality, format: targetFormat });
    } else if (url.includes('anilist.co')) {
      return this.optimizeAniListImage(url, { width, height, quality });
    }

    return url;
  }

  private optimizeMALImage(url: string, options: any): string {
    const { width, quality, format } = options;
    try {
      const urlObj = new URL(url);
      if (format === 'webp') {
        urlObj.searchParams.set('format', 'webp');
      }
      if (width) {
        urlObj.searchParams.set('w', width.toString());
      }
      if (quality) {
        urlObj.searchParams.set('q', quality.toString());
      }
      return urlObj.toString();
    } catch {
      return url;
    }
  }

  private optimizeAniListImage(url: string, options: any): string {
    const { width, quality } = options;
    try {
      const urlObj = new URL(url);
      if (width) {
        urlObj.searchParams.set('w', width.toString());
      }
      if (quality) {
        urlObj.searchParams.set('q', quality.toString());
      }
      return urlObj.toString();
    } catch {
      return url;
    }
  }

  preloadImage(src: string): Promise<HTMLImageElement> {
    const cacheKey = src;
    
    if (this.cache[cacheKey]) {
      return this.cache[cacheKey].promise;
    }

    const promise = new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      img.onload = () => {
        // Estimate image size in cache
        const estimatedSize = img.width * img.height * 4; // RGBA
        
        this.currentCacheSize += estimatedSize;
        this.cache[cacheKey] = {
          promise,
          timestamp: Date.now(),
          size: estimatedSize
        };
        
        this.cleanupCache();
        resolve(img);
      };
      
      img.onerror = () => {
        delete this.cache[cacheKey];
        reject(new Error(`Failed to load image: ${src}`));
      };
      
      img.src = src;
    });

    this.cache[cacheKey] = {
      promise,
      timestamp: Date.now(),
      size: 0 // Will be updated on load
    };

    return promise;
  }

  private cleanupCache() {
    if (this.currentCacheSize <= this.maxCacheSize) return;

    // Remove oldest entries first
    const entries = Object.entries(this.cache)
      .sort(([, a], [, b]) => a.timestamp - b.timestamp);

    for (const [key, entry] of entries) {
      delete this.cache[key];
      this.currentCacheSize -= entry.size;
      
      if (this.currentCacheSize <= this.maxCacheSize * 0.8) break;
    }
  }

  getCacheStats() {
    return {
      cacheSize: this.currentCacheSize,
      maxCacheSize: this.maxCacheSize,
      entryCount: Object.keys(this.cache).length
    };
  }
}

export const useAdvancedImageOptimization = () => {
  const optimizerRef = useRef<AdvancedImageOptimizer | null>(null);
  
  if (!optimizerRef.current) {
    optimizerRef.current = new AdvancedImageOptimizer();
  }

  return optimizerRef.current;
};

// ========================================
// VIRTUAL SCROLLING SYSTEM
// ========================================

interface VirtualScrollOptions {
  itemHeight: number;
  containerHeight?: number;
  overscan?: number;
  estimateItemHeight?: (index: number) => number;
}

export const useVirtualScrolling = <T>(
  items: T[],
  options: VirtualScrollOptions
) => {
  const { itemHeight, containerHeight = 600, overscan = 3, estimateItemHeight } = options;
  
  const [scrollTop, setScrollTop] = useState(0);
  const scrollElementRef = useRef<HTMLDivElement>(null);

  const getItemHeight = useCallback((index: number) => {
    return estimateItemHeight ? estimateItemHeight(index) : itemHeight;
  }, [itemHeight, estimateItemHeight]);

  const { visibleRange, totalHeight } = useMemo(() => {
    if (items.length === 0) {
      return { visibleRange: { start: 0, end: 0 }, totalHeight: 0 };
    }

    let accumulatedHeight = 0;
    let startIndex = 0;
    let endIndex = 0;

    // Find start index
    for (let i = 0; i < items.length; i++) {
      const height = getItemHeight(i);
      if (accumulatedHeight + height > scrollTop) {
        startIndex = Math.max(0, i - overscan);
        break;
      }
      accumulatedHeight += height;
    }

    // Find end index
    accumulatedHeight = 0;
    for (let i = 0; i < items.length; i++) {
      accumulatedHeight += getItemHeight(i);
      if (accumulatedHeight > scrollTop + containerHeight) {
        endIndex = Math.min(items.length, i + overscan);
        break;
      }
    }

    if (endIndex === 0) endIndex = items.length;

    // Calculate total height
    const totalHeight = items.reduce((sum, _, index) => sum + getItemHeight(index), 0);

    return {
      visibleRange: { start: startIndex, end: endIndex },
      totalHeight
    };
  }, [items.length, scrollTop, containerHeight, overscan, getItemHeight]);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  const visibleItems = useMemo(() => {
    return items.slice(visibleRange.start, visibleRange.end).map((item, index) => ({
      item,
      index: visibleRange.start + index
    }));
  }, [items, visibleRange]);

  const offsetY = useMemo(() => {
    let offset = 0;
    for (let i = 0; i < visibleRange.start; i++) {
      offset += getItemHeight(i);
    }
    return offset;
  }, [visibleRange.start, getItemHeight]);

  return {
    scrollElementRef,
    visibleItems,
    totalHeight,
    offsetY,
    handleScroll,
    visibleRange
  };
};

// ========================================
// INTERSECTION OBSERVER OPTIMIZATION
// ========================================

interface IntersectionOptions {
  threshold?: number | number[];
  rootMargin?: string;
  trackVisible?: boolean;
}

export const useIntersectionOptimizer = (options: IntersectionOptions = {}) => {
  const { threshold = [0, 0.1, 0.5, 1], rootMargin = '50px', trackVisible = true } = options;
  
  const [visibleElements, setVisibleElements] = useState<Set<string>>(new Set());
  const [intersectionRatios, setIntersectionRatios] = useState<Map<string, number>>(new Map());
  const observerRef = useRef<IntersectionObserver | null>(null);
  const elementsRef = useRef<Map<Element, string>>(new Map());

  const observe = useCallback((element: Element, id?: string) => {
    if (!element) return;

    const elementId = id || element.getAttribute('data-id') || `element-${Date.now()}`;
    elementsRef.current.set(element, elementId);

    if (!observerRef.current) {
      observerRef.current = new IntersectionObserver(
        (entries) => {
          const newVisible = new Set(visibleElements);
          const newRatios = new Map(intersectionRatios);

          entries.forEach((entry) => {
            const element = entry.target;
            const elementId = elementsRef.current.get(element);
            
            if (elementId) {
              newRatios.set(elementId, entry.intersectionRatio);
              
              if (trackVisible) {
                if (entry.isIntersecting) {
                  newVisible.add(elementId);
                } else {
                  newVisible.delete(elementId);
                }
              }
            }
          });

          setIntersectionRatios(newRatios);
          if (trackVisible) {
            setVisibleElements(newVisible);
          }
        },
        { threshold, rootMargin }
      );
    }

    observerRef.current.observe(element);
  }, [threshold, rootMargin, trackVisible, visibleElements, intersectionRatios]);

  const unobserve = useCallback((element: Element) => {
    if (observerRef.current && element) {
      observerRef.current.unobserve(element);
      elementsRef.current.delete(element);
    }
  }, []);

  useEffect(() => {
    return () => {
      observerRef.current?.disconnect();
      elementsRef.current.clear();
    };
  }, []);

  return {
    visibleElements,
    intersectionRatios,
    observe,
    unobserve,
    isVisible: (id: string) => visibleElements.has(id),
    getIntersectionRatio: (id: string) => intersectionRatios.get(id) || 0
  };
};

// ========================================
// PERFORMANCE MONITORING
// ========================================

interface PerformanceMetrics {
  fps: number;
  memoryUsage: number;
  renderTime: number;
  idleTime: number;
  networkLatency: number;
}

export class PerformanceMonitor {
  private metrics: PerformanceMetrics = {
    fps: 60,
    memoryUsage: 0,
    renderTime: 0,
    idleTime: 0,
    networkLatency: 0
  };

  private fpsFrames: number[] = [];
  private lastFrameTime = performance.now();
  private animationFrame?: number;

  startMonitoring() {
    this.monitorFPS();
    this.monitorMemory();
  }

  stopMonitoring() {
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
    }
  }

  private monitorFPS() {
    const measureFPS = (currentTime: number) => {
      const delta = currentTime - this.lastFrameTime;
      const fps = 1000 / delta;
      
      this.fpsFrames.push(fps);
      if (this.fpsFrames.length > 60) {
        this.fpsFrames.shift();
      }
      
      this.metrics.fps = this.fpsFrames.reduce((a, b) => a + b, 0) / this.fpsFrames.length;
      this.lastFrameTime = currentTime;
      
      this.animationFrame = requestAnimationFrame(measureFPS);
    };
    
    this.animationFrame = requestAnimationFrame(measureFPS);
  }

  private monitorMemory() {
    if ('memory' in (performance as any)) {
      const updateMemory = () => {
        const memInfo = (performance as any).memory;
        this.metrics.memoryUsage = memInfo.usedJSHeapSize / memInfo.jsHeapSizeLimit;
        setTimeout(updateMemory, 1000);
      };
      updateMemory();
    }
  }

  getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  isPerformanceGood(): boolean {
    return this.metrics.fps > 55 && this.metrics.memoryUsage < 0.8;
  }
}

export const usePerformanceMonitor = () => {
  const monitorRef = useRef<PerformanceMonitor | null>(null);
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    fps: 60,
    memoryUsage: 0,
    renderTime: 0,
    idleTime: 0,
    networkLatency: 0
  });

  if (!monitorRef.current) {
    monitorRef.current = new PerformanceMonitor();
  }

  useEffect(() => {
    const monitor = monitorRef.current!;
    monitor.startMonitoring();

    const updateMetrics = () => {
      setMetrics(monitor.getMetrics());
    };

    const interval = setInterval(updateMetrics, 1000);

    return () => {
      monitor.stopMonitoring();
      clearInterval(interval);
    };
  }, []);

  return {
    metrics,
    isPerformanceGood: monitorRef.current.isPerformanceGood(),
    monitor: monitorRef.current
  };
};

// ========================================
// DEBOUNCING & THROTTLING UTILITIES
// ========================================

export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number,
  immediate = false
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout | null = null;
  
  return (...args: Parameters<T>) => {
    const later = () => {
      timeout = null;
      if (!immediate) func(...args);
    };
    
    const callNow = immediate && !timeout;
    
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    
    if (callNow) func(...args);
  };
};

export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};

// ========================================
// RAF OPTIMIZATION
// ========================================

export const useOptimizedRAF = (callback: () => void, deps: any[] = []) => {
  const callbackRef = useRef(callback);
  const frameRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    callbackRef.current = callback;
  });

  const start = useCallback(() => {
    if (frameRef.current) return;

    const frame = () => {
      callbackRef.current();
      frameRef.current = requestAnimationFrame(frame);
    };

    frameRef.current = requestAnimationFrame(frame);
  }, []);

  const stop = useCallback(() => {
    if (frameRef.current) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = undefined;
    }
  }, []);

  useEffect(() => {
    return stop;
  }, deps);

  return { start, stop };
};
