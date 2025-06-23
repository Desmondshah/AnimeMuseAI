// convex/optimizationUtils.ts - Performance Optimization Utilities
import { useState, useEffect, useCallback, useRef } from 'react';

// Image optimization utilities
export const ImageOptimizer = {
  // Preload images with priority queue
  preloadImage: (src: string, priority: 'high' | 'low' = 'low'): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      
      // Set loading priority
      if (priority === 'high') {
        img.loading = 'eager';
        img.fetchPriority = 'high';
      } else {
        img.loading = 'lazy';
        img.fetchPriority = 'low';
      }
      
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  },

  // Generate optimized image URLs with size and quality parameters
  optimizeImageUrl: (
    url: string, 
    width?: number, 
    height?: number, 
    quality: 'high' | 'medium' | 'low' = 'medium'
  ): string => {
    if (!url || url.includes('placehold.co')) return url;
    
    try {
      const urlObj = new URL(url);
      const qualityMap = { high: 85, medium: 70, low: 50 };
      
      // Add optimization parameters for supported services
      if (urlObj.hostname.includes('anilist.co') || urlObj.hostname.includes('media.anilist.co')) {
        urlObj.searchParams.set('q', qualityMap[quality].toString());
        if (width) urlObj.searchParams.set('w', width.toString());
        if (height) urlObj.searchParams.set('h', height.toString());
      }
      
      return urlObj.toString();
    } catch {
      return url;
    }
  },

  // Create responsive image sizes
  generateSizes: (breakpoints?: { mobile?: number; tablet?: number; desktop?: number }) => {
    const bp = {
      mobile: breakpoints?.mobile || 375,
      tablet: breakpoints?.tablet || 768,
      desktop: breakpoints?.desktop || 1200,
    };
    
    return `(max-width: ${bp.mobile}px) 50vw, (max-width: ${bp.tablet}px) 33vw, (max-width: ${bp.desktop}px) 25vw, 20vw`;
  }
};

// Data fetching optimization utilities
export const DataOptimizer = {
  // Debounced function with cancel support
  createDebouncedFn: <T extends (...args: any[]) => any>(
    fn: T,
    delay: number = 300
  ) => {
    let timeoutId: NodeJS.Timeout;
    
    const debouncedFn = (...args: Parameters<T>) => {
      clearTimeout(timeoutId);
      return new Promise<ReturnType<T>>((resolve, reject) => {
        timeoutId = setTimeout(() => {
          try {
            resolve(fn(...args));
          } catch (error) {
            reject(error);
          }
        }, delay);
      });
    };
    
    debouncedFn.cancel = () => clearTimeout(timeoutId);
    
    return debouncedFn;
  },

  // Batch multiple requests with deduplication
  createBatchProcessor: <T, R>(
    processor: (items: T[]) => Promise<R[]>,
    batchSize: number = 10,
    delay: number = 100
  ) => {
    const queue: Array<{ item: T; resolve: (result: R) => void; reject: (error: any) => void }> = [];
    let timeoutId: NodeJS.Timeout;
    
    const processBatch = async () => {
      if (queue.length === 0) return;
      
      const batch = queue.splice(0, batchSize);
      const items = batch.map(entry => entry.item);
      
      try {
        const results = await processor(items);
        batch.forEach((entry, index) => {
          entry.resolve(results[index]);
        });
      } catch (error) {
        batch.forEach(entry => {
          entry.reject(error);
        });
      }
    };
    
    return (item: T): Promise<R> => {
      return new Promise((resolve, reject) => {
        queue.push({ item, resolve, reject });
        
        clearTimeout(timeoutId);
        timeoutId = setTimeout(processBatch, delay);
      });
    };
  }
};

// Performance monitoring utilities
export const PerformanceMonitor = {
  // Measure function execution time
  measure: async <T>(
    name: string,
    fn: () => Promise<T> | T
  ): Promise<{ result: T; duration: number }> => {
    const start = performance.now();
    const result = await fn();
    const duration = performance.now() - start;
    
    if (duration > 100) {
      console.warn(`[Performance] Slow operation "${name}": ${duration.toFixed(2)}ms`);
    }
    
    return { result, duration };
  },

  // Throttle function calls
  throttle: <T extends (...args: any[]) => any>(
    fn: T,
    limit: number = 100
  ) => {
    let inThrottle: boolean;
    
    return (...args: Parameters<T>): ReturnType<T> | undefined => {
      if (!inThrottle) {
        const result = fn(...args);
        inThrottle = true;
        setTimeout(() => (inThrottle = false), limit);
        return result;
      }
    };
  },

  // Memory usage tracking
  trackMemoryUsage: () => {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      return {
        used: Math.round(memory.usedJSHeapSize / 1024 / 1024),
        total: Math.round(memory.jsHeapSizeLimit / 1024 / 1024),
        percentage: Math.round((memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100)
      };
    }
    return null;
  }
};

// Component optimization hooks
export const useOptimizedImage = (src: string, options?: {
  priority?: 'high' | 'low';
  quality?: 'high' | 'medium' | 'low';
  width?: number;
  height?: number;
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [optimizedSrc, setOptimizedSrc] = useState(src);

  useEffect(() => {
    if (!src) return;

    // Optimize the image URL
    const optimized = ImageOptimizer.optimizeImageUrl(
      src,
      options?.width,
      options?.height,
      options?.quality || 'medium'
    );
    
    setOptimizedSrc(optimized);

    // Preload the image
    ImageOptimizer.preloadImage(optimized, options?.priority || 'low')
      .then(() => {
        setIsLoaded(true);
        setHasError(false);
      })
      .catch(() => {
        setHasError(true);
        setIsLoaded(false);
      });
  }, [src, options?.priority, options?.quality, options?.width, options?.height]);

  return { isLoaded, hasError, optimizedSrc };
};

export const usePerformanceOptimization = () => {
  const [metrics, setMetrics] = useState({
    fps: 60,
    memoryUsage: 0,
    isLowPerformance: false
  });

  useEffect(() => {
    let frameCount = 0;
    let lastTime = performance.now();
    let animationId: number;

    const measureFPS = (currentTime: number) => {
      frameCount++;
      
      if (currentTime >= lastTime + 1000) {
        const fps = Math.round((frameCount * 1000) / (currentTime - lastTime));
        frameCount = 0;
        lastTime = currentTime;
        
        const memoryUsage = PerformanceMonitor.trackMemoryUsage();
        
        setMetrics({
          fps,
          memoryUsage: memoryUsage?.percentage || 0,
          isLowPerformance: fps < 45 || (memoryUsage?.percentage || 0) > 80
        });
      }
      
      animationId = requestAnimationFrame(measureFPS);
    };

    animationId = requestAnimationFrame(measureFPS);
    
    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, []);

  return metrics;
};

// Cache management utilities
export const CacheManager = {
  // Simple in-memory cache with TTL
  create: <T>(ttl: number = 5 * 60 * 1000) => {
    const cache = new Map<string, { data: T; expiry: number }>();
    
    return {
      get: (key: string): T | null => {
        const entry = cache.get(key);
        if (!entry) return null;
        
        if (Date.now() > entry.expiry) {
          cache.delete(key);
          return null;
        }
        
        return entry.data;
      },
      
      set: (key: string, data: T): void => {
        cache.set(key, {
          data,
          expiry: Date.now() + ttl
        });
      },
      
      clear: (): void => {
        cache.clear();
      },
      
      size: (): number => cache.size
    };
  }
};

// Animation optimization utilities
export const AnimationOptimizer = {
  // Reduced motion check
  shouldReduceAnimations: (): boolean => {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  },

  // Get optimal animation duration based on performance
  getOptimalDuration: (baseDuration: number, isLowPerformance?: boolean): number => {
    if (AnimationOptimizer.shouldReduceAnimations()) return baseDuration * 0.5;
    if (isLowPerformance) return baseDuration * 0.7;
    return baseDuration;
  },

  // Create performance-aware animation variants
  createVariants: (isLowPerformance?: boolean) => ({
    initial: { opacity: 0, y: isLowPerformance ? 0 : 20 },
    animate: { 
      opacity: 1, 
      y: 0,
      transition: {
        duration: AnimationOptimizer.getOptimalDuration(0.3, isLowPerformance)
      }
    },
    exit: { 
      opacity: 0, 
      y: isLowPerformance ? 0 : -20,
      transition: {
        duration: AnimationOptimizer.getOptimalDuration(0.2, isLowPerformance)
      }
    }
  })
};
