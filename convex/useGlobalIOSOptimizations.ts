// convex/useGlobalIOSOptimizations.ts - Global iOS Performance Provider
import React, { useEffect, useCallback, useMemo, useRef, useState } from 'react';
import { useMobileOptimizations } from './useMobileOptimizations';
import { useAdvancedImageOptimization, useVirtualScrolling, usePerformanceMonitor } from './optimizationUtils';
import { useIntelligentCache, usePrefetching, useOfflineStorage } from './storageActions';
import { useHapticFeedback, useProMotionOptimization, useIPadUIOptimizations, useWebWorkers } from './iPad-hooks';

interface GlobalIOSOptimizations {
  isOptimized: boolean;
  performanceLevel: 'high' | 'balanced' | 'battery';
  appliedClasses: string[];
  fps: number;
  memoryUsage: number;
  
  // Advanced optimization features
  imageOptimizer?: any;
  cache?: any;
  prefetch?: any;
  prefetchOnHover?: any;
  storage?: any;
  storageReady?: boolean;
  triggerHaptic?: any;
  supportsProMotion?: boolean;
  optimizeForProMotion?: any;
  iPadOptimizations?: any;
  filterAnime?: any;
  sortRecommendations?: any;
  preloadVisibleImages?: any;
  
  // Performance utilities
  isPerformanceGood?: boolean;
  performanceMetrics?: any;
}

export const useGlobalIOSOptimizations = (): GlobalIOSOptimizations => {
  const mobileOpts = useMobileOptimizations();
  
  // Initialize all advanced optimization systems
  const imageOptimizer = useAdvancedImageOptimization();
  const cache = useIntelligentCache();
  const { prefetch, prefetchOnHover } = usePrefetching();
  const { storage, isReady: storageReady } = useOfflineStorage();
  const { triggerHaptic, triggerSuccess } = useHapticFeedback();
  const { supportsProMotion, optimizeForProMotion } = useProMotionOptimization();
  const iPadOptimizations = useIPadUIOptimizations();
  const { filterAnime, sortRecommendations } = useWebWorkers();
  const { metrics: performanceMetrics, isPerformanceGood } = usePerformanceMonitor();

  // Auto-detect performance level based on device capabilities
  const performanceLevel = useMemo(() => {
    if (!isPerformanceGood || mobileOpts.isLowPerformance) {
      return 'battery';
    } else if (performanceMetrics.fps < 55) {
      return 'balanced';
    }
    return 'high';
  }, [performanceMetrics.fps, mobileOpts.isLowPerformance, isPerformanceGood]);

  // Generate global optimization classes
  const appliedClasses = useMemo(() => {
    const classes: string[] = ['global-ios-optimized'];
    
    if (mobileOpts.isIOS) {
      classes.push('ios-device');
    }
    
    if (mobileOpts.isMobile) {
      classes.push('mobile-device');
    }
    
    if (mobileOpts.isLowBandwidth) {
      classes.push('low-bandwidth');
    }
    
    if (mobileOpts.shouldReduceAnimations) {
      classes.push('reduce-animations');
    }
    
    if (mobileOpts.shouldDisableParticles) {
      classes.push('disable-particles');
    }
    
    if (mobileOpts.shouldUseSimpleBackgrounds) {
      classes.push('simple-backgrounds');
    }
    
    if (performanceLevel === 'battery') {
      classes.push('battery-saver-mode');
    } else if (performanceLevel === 'balanced') {
      classes.push('balanced-performance-mode');
    } else {
      classes.push('high-performance-mode');
    }
    
    if (mobileOpts.iPad.isIPad) {
      classes.push('ipad-device');
      if (mobileOpts.iPad.isIPadPro11 || mobileOpts.iPad.isIPadPro12) {
        classes.push('ipad-pro');
      }
    }
    
    if (mobileOpts.hasNotch) {
      classes.push('has-notch');
    }
    
    return classes;
  }, [mobileOpts, performanceLevel]);

  // Apply global optimizations to document
  useEffect(() => {
    const applyGlobalOptimizations = () => {
      // Apply classes to html element for CSS targeting
      const htmlElement = document.documentElement;
      
      // Remove existing optimization classes
      htmlElement.classList.forEach(className => {
        if (className.startsWith('ios-') || 
            className.startsWith('mobile-') ||
            className.startsWith('performance-') ||
            className.startsWith('battery-') ||
            className.startsWith('balanced-') ||
            className.startsWith('high-performance') ||
            className.includes('optimized')) {
          htmlElement.classList.remove(className);
        }
      });
      
      // Add current optimization classes
      appliedClasses.forEach(className => {
        htmlElement.classList.add(className);
      });

      // Apply viewport optimizations for iOS
      if (mobileOpts.isIOS) {
        const viewport = document.querySelector('meta[name=viewport]');
        if (viewport) {
          viewport.setAttribute('content', 
            'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover'
          );
        }
        
        // Set CSS variables for iOS safe areas
        const safeAreaTop = getComputedStyle(document.documentElement)
          .getPropertyValue('env(safe-area-inset-top)') || '0px';
        const safeAreaBottom = getComputedStyle(document.documentElement)
          .getPropertyValue('env(safe-area-inset-bottom)') || '0px';
        
        document.documentElement.style.setProperty('--safe-area-top', safeAreaTop);
        document.documentElement.style.setProperty('--safe-area-bottom', safeAreaBottom);
      }

      // Apply performance-based optimizations
      if (performanceLevel === 'battery') {
        // Reduce visual effects for battery saving
        document.documentElement.style.setProperty('--animation-duration', '0.1s');
        document.documentElement.style.setProperty('--blur-intensity', '2px');
        document.documentElement.style.setProperty('--shadow-intensity', '0.1');
      } else if (performanceLevel === 'balanced') {
        document.documentElement.style.setProperty('--animation-duration', '0.2s');
        document.documentElement.style.setProperty('--blur-intensity', '4px');
        document.documentElement.style.setProperty('--shadow-intensity', '0.3');
      } else {
        document.documentElement.style.setProperty('--animation-duration', '0.3s');
        document.documentElement.style.setProperty('--blur-intensity', '8px');
        document.documentElement.style.setProperty('--shadow-intensity', '0.5');
      }
    };

    applyGlobalOptimizations();
  }, [appliedClasses, mobileOpts.isIOS, performanceLevel]);

  // iOS-specific touch optimizations
  useEffect(() => {
    if (!mobileOpts.isIOS) return;

    let touchStartY = 0;
    let touchStartX = 0;

    const handleTouchStart = (e: TouchEvent) => {
      touchStartY = e.touches[0].clientY;
      touchStartX = e.touches[0].clientX;
    };

    const handleTouchMove = (e: TouchEvent) => {
      const touchY = e.touches[0].clientY;
      const touchX = e.touches[0].clientX;
      const deltaY = touchY - touchStartY;
      const deltaX = touchX - touchStartX;

      // Prevent rubber band effect at document level
      if (Math.abs(deltaY) > Math.abs(deltaX)) {
        const scrollContainer = (e.target as Element).closest('.scrollable, .overflow-auto, .overflow-y-auto');
        if (!scrollContainer && window.scrollY === 0 && deltaY > 0) {
          e.preventDefault();
        }
        if (!scrollContainer && 
            window.scrollY + window.innerHeight >= document.documentElement.scrollHeight && 
            deltaY < 0) {
          e.preventDefault();
        }
      }
    };

    // Prevent double-tap zoom
    const handleTouchEnd = (e: TouchEvent) => {
      const now = Date.now();
      const timeSinceLastTouch = now - (window as any).lastTouchTime;
      if (timeSinceLastTouch < 300 && timeSinceLastTouch > 0) {
        e.preventDefault();
      }
      (window as any).lastTouchTime = now;
    };

    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd, { passive: false });

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [mobileOpts.isIOS]);

  // Memory pressure monitoring
  useEffect(() => {
    let memoryCheckInterval: NodeJS.Timeout;
    
    if ('memory' in performance) {
      memoryCheckInterval = setInterval(() => {
        const memInfo = (performance as any).memory;
        if (memInfo && memInfo.usedJSHeapSize && memInfo.jsHeapSizeLimit) {
          const memoryUsage = memInfo.usedJSHeapSize / memInfo.jsHeapSizeLimit;
          
          // Auto-adjust performance if memory usage is high
          if (memoryUsage > 0.8) {
            document.documentElement.classList.add('memory-pressure');
          } else {
            document.documentElement.classList.remove('memory-pressure');
          }
        }
      }, 5000);
    }

    return () => {
      if (memoryCheckInterval) {
        clearInterval(memoryCheckInterval);
      }
    };
  }, []);

  // Service Worker registration for advanced caching
  useEffect(() => {
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      navigator.serviceWorker.register('/sw.js')
        .then((registration) => {
          console.log('🚀 Service Worker registered successfully');
          triggerSuccess();
        })
        .catch((error) => {
          console.error('Service Worker registration failed:', error);
        });
    }
  }, [triggerSuccess]);

  // Smart image preloading based on viewport
  const preloadVisibleImages = useCallback(async (imageUrls: string[]) => {
    if (performanceLevel === 'battery') return;
    
    for (const url of imageUrls.slice(0, 5)) { // Limit concurrent preloads
      try {
        const optimizedUrl = imageOptimizer.optimizeImageUrl(url, {
          width: mobileOpts.iPad.isIPad ? 400 : 300,
          quality: performanceLevel === 'high' ? 90 : 75,
          format: 'auto'
        });
        await imageOptimizer.preloadImage(optimizedUrl);
      } catch (error) {
        console.log('Image preload failed:', url);
      }
    }
  }, [imageOptimizer, performanceLevel, mobileOpts.iPad.isIPad]);

  return {
    isOptimized: true,
    performanceLevel,
    appliedClasses,
    fps: performanceMetrics.fps,
    memoryUsage: performanceMetrics.memoryUsage || 0,
    
    // Advanced optimization features
    imageOptimizer,
    cache,
    prefetch,
    prefetchOnHover,
    storage,
    storageReady,
    triggerHaptic,
    supportsProMotion,
    optimizeForProMotion,
    iPadOptimizations,
    filterAnime,
    sortRecommendations,
    preloadVisibleImages,
    
    // Performance utilities
    isPerformanceGood,
    performanceMetrics
  };
};

// Global performance provider for React Context
export const GlobalIOSOptimizationProvider: React.FC<{ children: React.ReactNode }> = ({ 
  children 
}) => {
  const optimizations = useGlobalIOSOptimizations();
  
  return React.createElement('div', {
    className: `global-ios-container ${optimizations.appliedClasses.join(' ')}`,
    'data-performance-level': optimizations.performanceLevel,
    'data-fps': optimizations.fps
  }, children);
};

// Hook to get current optimization status
export const useOptimizationStatus = () => {
  const optimizations = useGlobalIOSOptimizations();
  return optimizations;
}; 