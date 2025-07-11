// src/hooks/useAnimeDetailMobileOptimizations.ts
import { useState, useEffect, useCallback } from 'react';
import { useMobileOptimizations } from '../src/hooks/useMobileOptimizations';

interface AnimeDetailMobileState {
  // Image optimization
  shouldUseCompressedImages: boolean;
  shouldLazyLoadImages: boolean;
  imageQuality: 'high' | 'medium' | 'low';
  
  // UI optimizations
  shouldReduceGlassmorphism: boolean;
  shouldDisableParallax: boolean;
  shouldSimplifyAnimations: boolean;
  shouldReduceTabEffects: boolean;
  
  // Content optimization
  maxVisibleCharacters: number;
  maxVisibleEpisodes: number;
  shouldPaginateContent: boolean;
  
  // Performance metrics
  isLowMemoryDevice: boolean;
  isSlowNetwork: boolean;
  batteryLevel?: number;
  
  // Device characteristics
  hasNotch: boolean;
  safeAreaInsets: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
}

export const useAnimeDetailMobileOptimizations = (): AnimeDetailMobileState & {
  optimizeImageUrl: (url: string, width?: number, height?: number) => string;
  getOptimalImageSize: (containerWidth: number) => { width: number; height: number };
  shouldShowSection: (sectionName: string) => boolean;
  getOptimalContentLimit: (contentType: 'characters' | 'episodes' | 'reviews') => number;
} => {
  const baseMobileOpts = useMobileOptimizations();
  
  const [detailState, setDetailState] = useState<AnimeDetailMobileState>({
    shouldUseCompressedImages: false,
    shouldLazyLoadImages: true,
    imageQuality: 'high',
    shouldReduceGlassmorphism: false,
    shouldDisableParallax: false,
    shouldSimplifyAnimations: false,
    shouldReduceTabEffects: false,
    maxVisibleCharacters: 12,
    maxVisibleEpisodes: 20,
    shouldPaginateContent: false,
    isLowMemoryDevice: false,
    isSlowNetwork: false,
    hasNotch: false,
    safeAreaInsets: { top: 0, bottom: 0, left: 0, right: 0 },
  });

  // Detect device capabilities and optimize accordingly
  useEffect(() => {
    const updateOptimizations = () => {
      const viewport = {
        width: window.innerWidth,
        height: window.innerHeight,
      };

      // Memory detection
      const isLowMemoryDevice = (() => {
        if ('memory' in (navigator as any)) {
          const memory = (navigator as any).memory;
          return memory.jsHeapSizeLimit < 1073741824; // Less than 1GB
        }
        // Fallback: detect based on device characteristics
        return viewport.width <= 414 && 'ontouchstart' in window;
      })();

      // Network speed detection
      const isSlowNetwork = (() => {
        if ('connection' in navigator) {
          const connection = (navigator as any).connection;
          return ['slow-2g', '2g'].includes(connection?.effectiveType);
        }
        return false;
      })();

      // Safe area detection
      const safeAreaInsets = {
        top: parseInt(getComputedStyle(document.documentElement).getPropertyValue('env(safe-area-inset-top)') || '0'),
        bottom: parseInt(getComputedStyle(document.documentElement).getPropertyValue('env(safe-area-inset-bottom)') || '0'),
        left: parseInt(getComputedStyle(document.documentElement).getPropertyValue('env(safe-area-inset-left)') || '0'),
        right: parseInt(getComputedStyle(document.documentElement).getPropertyValue('env(safe-area-inset-right)') || '0'),
      };

      const hasNotch = safeAreaInsets.top > 20;

      // Determine image quality based on device and network
      let imageQuality: 'high' | 'medium' | 'low' = 'high';
      if (isSlowNetwork || baseMobileOpts.isLowBandwidth) {
        imageQuality = 'low';
      } else if (isLowMemoryDevice || baseMobileOpts.isLowPerformance) {
        imageQuality = 'medium';
      }

      // Content limits based on device performance
      const maxVisibleCharacters = (() => {
        if (isLowMemoryDevice) return 6;
        if (viewport.width <= 375) return 8;
        if (viewport.width <= 414) return 10;
        return 12;
      })();

      const maxVisibleEpisodes = (() => {
        if (isLowMemoryDevice) return 10;
        if (isSlowNetwork) return 15;
        return 20;
      })();

      setDetailState({
        shouldUseCompressedImages: isSlowNetwork || baseMobileOpts.isLowBandwidth,
        shouldLazyLoadImages: true,
        imageQuality,
        shouldReduceGlassmorphism: isLowMemoryDevice || baseMobileOpts.isLowPerformance,
        shouldDisableParallax: baseMobileOpts.shouldReduceAnimations || isLowMemoryDevice,
        shouldSimplifyAnimations: baseMobileOpts.shouldReduceAnimations,
        shouldReduceTabEffects: isLowMemoryDevice,
        maxVisibleCharacters,
        maxVisibleEpisodes,
        shouldPaginateContent: isLowMemoryDevice || isSlowNetwork,
        isLowMemoryDevice,
        isSlowNetwork,
        batteryLevel: baseMobileOpts.performanceMetrics.batteryLevel,
        hasNotch,
        safeAreaInsets,
      });
    };

    updateOptimizations();

    // Listen for changes
    window.addEventListener('resize', updateOptimizations);
    window.addEventListener('orientationchange', updateOptimizations);
    
    if ('connection' in navigator) {
      (navigator as any).connection?.addEventListener('change', updateOptimizations);
    }

    return () => {
      window.removeEventListener('resize', updateOptimizations);
      window.removeEventListener('orientationchange', updateOptimizations);
      if ('connection' in navigator) {
        (navigator as any).connection?.removeEventListener('change', updateOptimizations);
      }
    };
  }, [baseMobileOpts]);

  // Image optimization function
  const optimizeImageUrl = useCallback((url: string, width?: number, height?: number): string => {
    if (!url || !detailState.shouldUseCompressedImages) {
      return url;
    }

    // If it's a placeholder URL, return as-is
    if (url.includes('placehold.co') || url.includes('placeholder')) {
      return url;
    }

    // For real image URLs, try to add optimization parameters
    try {
      const urlObj = new URL(url);
      
      // Add quality parameter based on image quality setting
      const qualityMap = { high: 85, medium: 70, low: 50 };
      const quality = qualityMap[detailState.imageQuality];
      
      // For common image services, add optimization parameters
      if (urlObj.hostname.includes('anilist.co') || urlObj.hostname.includes('media.anilist.co')) {
        // AniList supports quality parameters
        urlObj.searchParams.set('q', quality.toString());
        if (width) urlObj.searchParams.set('w', width.toString());
        if (height) urlObj.searchParams.set('h', height.toString());
      }
      
      return urlObj.toString();
    } catch {
      return url;
    }
  }, [detailState.shouldUseCompressedImages, detailState.imageQuality]);

  // Get optimal image size for container
  const getOptimalImageSize = useCallback((containerWidth: number) => {
    const devicePixelRatio = window.devicePixelRatio || 1;
    const effectiveWidth = containerWidth * devicePixelRatio;
    
    // Reduce resolution on low-performance devices
    const scaleFactor = detailState.isLowMemoryDevice ? 0.75 : 1;
    
    return {
      width: Math.round(effectiveWidth * scaleFactor),
      height: Math.round((effectiveWidth * scaleFactor) * 1.5), // 3:2 aspect ratio
    };
  }, [detailState.isLowMemoryDevice]);

  // Determine if a section should be shown based on performance
  const shouldShowSection = useCallback((sectionName: string): boolean => {
    if (!detailState.isLowMemoryDevice && !detailState.isSlowNetwork) {
      return true;
    }

    // Priority sections that should always show
    const prioritySections = ['overview', 'episodes', 'characters'];
    
    if (prioritySections.includes(sectionName)) {
      return true;
    }

    // Secondary sections that can be hidden on low-performance devices
    const secondarySections = ['reviews', 'similar', 'recommendations'];
    
    if (secondarySections.includes(sectionName)) {
      return !detailState.isLowMemoryDevice;
    }

    return true;
  }, [detailState.isLowMemoryDevice, detailState.isSlowNetwork]);

  // Get optimal content limits
  const getOptimalContentLimit = useCallback((contentType: 'characters' | 'episodes' | 'reviews'): number => {
    const limits = {
      characters: detailState.maxVisibleCharacters,
      episodes: detailState.maxVisibleEpisodes,
      reviews: detailState.isLowMemoryDevice ? 5 : 10,
    };

    return limits[contentType];
  }, [detailState.maxVisibleCharacters, detailState.maxVisibleEpisodes, detailState.isLowMemoryDevice]);

  return {
    ...detailState,
    optimizeImageUrl,
    getOptimalImageSize,
    shouldShowSection,
    getOptimalContentLimit,
  };
};

// CSS class generator for conditional styling
export const generateMobileClasses = (mobileOpts: AnimeDetailMobileState): string => {
  const classes: string[] = [];

  if (mobileOpts.shouldReduceGlassmorphism) {
    classes.push('reduce-glassmorphism');
  }

  if (mobileOpts.shouldDisableParallax) {
    classes.push('disable-parallax');
  }

  if (mobileOpts.shouldSimplifyAnimations) {
    classes.push('simplify-animations');
  }

  if (mobileOpts.shouldReduceTabEffects) {
    classes.push('reduce-tab-effects');
  }

  if (mobileOpts.isLowMemoryDevice) {
    classes.push('low-memory-device');
  }

  if (mobileOpts.isSlowNetwork) {
    classes.push('slow-network');
  }

  if (mobileOpts.hasNotch) {
    classes.push('has-notch');
  }

  return classes.join(' ');
};

// Image lazy loading hook
export const useImageLazyLoading = () => {
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set());

  const loadImage = useCallback((src: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (loadedImages.has(src)) {
        resolve();
        return;
      }

      const img = new Image();
      img.onload = () => {
        setLoadedImages(prev => new Set(prev).add(src));
        resolve();
      };
      img.onerror = reject;
      img.src = src;
    });
  }, [loadedImages]);

  const isImageLoaded = useCallback((src: string) => {
    return loadedImages.has(src);
  }, [loadedImages]);

  return { loadImage, isImageLoaded };
};

// Performance monitoring for anime detail page
export const useAnimeDetailPerformance = () => {
  const [metrics, setMetrics] = useState({
    initialLoadTime: 0,
    imageLoadTime: 0,
    interactionLatency: 0,
    memoryUsage: 0,
  });

  useEffect(() => {
    const startTime = performance.now();

    // Monitor initial load
    const handleLoad = () => {
      setMetrics(prev => ({
        ...prev,
        initialLoadTime: performance.now() - startTime,
      }));
    };

    // Monitor memory usage
    const monitorMemory = () => {
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        setMetrics(prev => ({
          ...prev,
          memoryUsage: memory.usedJSHeapSize / memory.jsHeapSizeLimit,
        }));
      }
    };

    window.addEventListener('load', handleLoad);
    const memoryInterval = setInterval(monitorMemory, 5000);

    return () => {
      window.removeEventListener('load', handleLoad);
      clearInterval(memoryInterval);
    };
  }, []);

  return metrics;
};