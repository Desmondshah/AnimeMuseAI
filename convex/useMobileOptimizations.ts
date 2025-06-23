// convex/useMobileOptimizations.ts - Enhanced with iPad Support
import { useEffect, useState, useCallback } from 'react';

// Custom event for animation preference changes
const ANIMATION_PREF_CHANGE_EVENT = 'animuse-animation-preference-changed';

interface PerformanceMetrics {
  fps: number;
  memoryUsage?: number;
  connectionType?: string;
  devicePixelRatio: number;
  screenSize: { width: number; height: number };
  batteryLevel?: number;
  isCharging?: boolean;
}

interface iPadInfo {
  isIPad: boolean;
  isIPadMini: boolean;
  isIPadAir: boolean;
  isIPadPro11: boolean;
  isIPadPro12: boolean;
  sidebarWidth: number;
  gridColumns: {
    anime: number;
    characters: number;
    reviews: number;
    users: number;
    stats: number;
  };
}

interface MobileOptimizationState {
  isMobile: boolean;
  isIOS: boolean;
  isSafari: boolean;
  hasNotch: boolean;
  isLowBandwidth: boolean;
  isLowPerformance: boolean;
  performanceMetrics: PerformanceMetrics;
  shouldReduceAnimations: boolean;
  shouldDisableParticles: boolean;
  shouldUseSimpleBackgrounds: boolean;
  shouldOptimizeForSafari: boolean;
  // Enhanced iPad support
  iPad: iPadInfo;
  isLandscape: boolean;
  isPortrait: boolean;
  shouldUseSidebarOverlay: boolean;
  adminGridClasses: (type: string) => string;
}

export const useMobileOptimizations = (): MobileOptimizationState => {
  const [state, setState] = useState<MobileOptimizationState>({
    isMobile: false,
    isIOS: false,
    isSafari: false,
    hasNotch: false,
    isLowBandwidth: false,
    isLowPerformance: false,
    performanceMetrics: {
      fps: 60,
      devicePixelRatio: 1,
      screenSize: { width: 0, height: 0 }
    },
    shouldReduceAnimations: false,
    shouldDisableParticles: false,
    shouldUseSimpleBackgrounds: false,
    shouldOptimizeForSafari: false,
    // Enhanced iPad support
    iPad: {
      isIPad: false,
      isIPadMini: false,
      isIPadAir: false,
      isIPadPro11: false,
      isIPadPro12: false,
      sidebarWidth: 280,
      gridColumns: {
        anime: 3,
        characters: 4,
        reviews: 2,
        users: 2,
        stats: 4,
      },
    },
    isLandscape: false,
    isPortrait: true,
    shouldUseSidebarOverlay: false,
    adminGridClasses: () => '',
  });

  // Enhanced iPad detection
  const detectIPadInfo = useCallback((width: number, height: number): iPadInfo => {
    const userAgent = navigator.userAgent;
    const isIPadDevice = /iPad/.test(userAgent) || 
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1) ||
      (width >= 768 && width <= 1366 && 'ontouchstart' in window);

    if (!isIPadDevice) {
      return {
        isIPad: false,
        isIPadMini: false,
        isIPadAir: false,
        isIPadPro11: false,
        isIPadPro12: false,
        sidebarWidth: 280,
        gridColumns: { anime: 3, characters: 4, reviews: 2, users: 2, stats: 4 },
      };
    }

    // Determine specific iPad model based on screen dimensions
    const isIPadMini = width <= 834 && height <= 1024;
    const isIPadAir = (width >= 820 && width <= 834) && (height >= 1180 && height <= 1194);
    const isIPadPro11 = (width >= 834 && width <= 834) && (height >= 1194 && height <= 1194);
    const isIPadPro12 = width >= 1024 && width <= 1366;

    // Orientation detection
    const isLandscape = width > height;

    // Dynamic sidebar width
    let sidebarWidth = 280;
    if (width <= 834) sidebarWidth = 240;
    if (width >= 1024) sidebarWidth = 320;

    // Dynamic grid columns based on screen size and orientation
    let gridColumns = {
      anime: 3,
      characters: 4,
      reviews: 2,
      users: 2,
      stats: 4,
    };

    if (isLandscape) {
      if (width >= 1024) {
        gridColumns = { anime: 5, characters: 6, reviews: 3, users: 4, stats: 4 };
      } else {
        gridColumns = { anime: 4, characters: 5, reviews: 3, users: 3, stats: 4 };
      }
    } else {
      if (width >= 834) {
        gridColumns = { anime: 3, characters: 4, reviews: 2, users: 3, stats: 3 };
      } else {
        gridColumns = { anime: 2, characters: 3, reviews: 2, users: 2, stats: 2 };
      }
    }

    return {
      isIPad: true,
      isIPadMini,
      isIPadAir,
      isIPadPro11,
      isIPadPro12,
      sidebarWidth,
      gridColumns,
    };
  }, []);

  // Performance monitoring (enhanced from your original)
  const measurePerformance = useCallback(() => {
    const metrics: PerformanceMetrics = {
      fps: 60, // Will be updated by RAF
      devicePixelRatio: window.devicePixelRatio || 1,
      screenSize: { 
        width: window.innerWidth, 
        height: window.innerHeight 
      }
    };

    // Memory usage (if available)
    if ('memory' in performance) {
      const memInfo = (performance as any).memory;
      if (memInfo && memInfo.usedJSHeapSize && memInfo.jsHeapSizeLimit) {
        metrics.memoryUsage = memInfo.usedJSHeapSize / memInfo.jsHeapSizeLimit;
      }
    }

    // Connection type
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      if (connection && connection.effectiveType) {
        metrics.connectionType = connection.effectiveType;
      }
    }

    // Battery API (if available)
    if ('getBattery' in navigator) {
      (navigator as any).getBattery().then((battery: any) => {
        metrics.batteryLevel = battery.level;
        metrics.isCharging = battery.charging;
      }).catch(() => {
        // Battery API not available or blocked
      });
    }

    return metrics;
  }, []);

  // FPS monitoring (from your original)
  const monitorFPS = useCallback(() => {
    let frameCount = 0;
    let lastTime = performance.now();
    
    const countFrames = () => {
      frameCount++;
      const currentTime = performance.now();
      
      if (currentTime >= lastTime + 1000) {
        const fps = Math.round((frameCount * 1000) / (currentTime - lastTime));
        
        setState(prev => ({
          ...prev,
          performanceMetrics: {
            ...prev.performanceMetrics,
            fps: Math.max(0, fps)
          }
        }));
        
        frameCount = 0;
        lastTime = currentTime;
      }
      
      requestAnimationFrame(countFrames);
    };
    
    const rafId = requestAnimationFrame(countFrames);
    
    // Cleanup after 10 seconds to avoid memory leaks
    setTimeout(() => {
      cancelAnimationFrame(rafId);
    }, 10000);
  }, []);

  // Generate admin grid classes
  // Generate admin grid classes - FIXED for proper iPad responsiveness
const generateAdminGridClasses = useCallback((type: string, gridColumns: iPadInfo['gridColumns']) => {
  const columns = gridColumns[type as keyof typeof gridColumns] || 3;
  
  // Base grid classes with proper responsive breakpoints
  const baseClasses = 'grid gap-4 md:gap-6 w-full max-w-full';
  
  // iPad-specific responsive grid classes
  if (type === 'stats') {
    return `${baseClasses} grid-cols-2 md:grid-cols-${Math.min(columns, 4)}`;
  }
  
  if (type === 'anime') {
    return `${baseClasses} grid-cols-2 md:grid-cols-${Math.min(columns, 3)} lg:grid-cols-${Math.min(columns, 4)}`;
  }
  
  if (type === 'users') {
    return `${baseClasses} grid-cols-1 md:grid-cols-${Math.min(columns, 2)} lg:grid-cols-${Math.min(columns, 3)}`;
  }
  
  if (type === 'reviews') {
    return `${baseClasses} grid-cols-1 md:grid-cols-${Math.min(columns, 2)}`;
  }
  
  // Default fallback
  return `${baseClasses} grid-cols-2 md:grid-cols-${Math.min(columns, 3)}`;
}, []);

  useEffect(() => {
    const updateState = () => {
      const metrics = measurePerformance();
      const width = metrics.screenSize.width;
      const height = metrics.screenSize.height;
      
      // Original device detection
      const isMobile = width <= 768 || /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      
      // Safari detection (including Mobile Safari)
      const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent) || 
                       /iPad|iPhone|iPod/.test(navigator.userAgent);
      
      // Safari-specific optimizations needed
      const shouldOptimizeForSafari = isSafari && (isMobile || isIOS);
      
      // Enhanced iPad detection
      const iPadInfo = detectIPadInfo(width, height);
      const isLandscape = width > height;
      const isPortrait = height > width;
      const shouldUseSidebarOverlay = iPadInfo.isIPad && width <= 834;
      
      // Notch detection (from your original)
      let hasNotch = false;
      if (CSS.supports('padding-left: env(safe-area-inset-left)')) {
        const testDiv = document.createElement('div');
        testDiv.style.paddingLeft = 'env(safe-area-inset-left)';
        document.body.appendChild(testDiv);
        const paddingValue = parseInt(window.getComputedStyle(testDiv).paddingLeft);
        document.body.removeChild(testDiv);
        hasNotch = paddingValue > 0;
      }

      // Bandwidth detection (from your original)
      let isLowBandwidth = false;
      if ('connection' in navigator) {
        const connection = (navigator as any).connection;
        if (connection) {
          const slowConnections = ['slow-2g', '2g', '3g'];
          isLowBandwidth = slowConnections.includes(connection.effectiveType);
        }
      }

      // Enhanced performance detection for iPad
      const isLowPerformance = metrics.fps < 30 || 
                              (metrics.memoryUsage ? metrics.memoryUsage > 0.8 : false) ||
                              (metrics.devicePixelRatio > 2 && width > 1024); // High DPI large screens

      // Optimization decisions (enhanced)
      const storedPref = localStorage.getItem('animuse-animations-enabled');
      const animationsEnabled = storedPref === null ? true : storedPref === 'true';

      const shouldReduceAnimations = !animationsEnabled ||
                                   isLowBandwidth ||
                                   isLowPerformance ||
                                   (iPadInfo.isIPad && iPadInfo.isIPadMini) || // Reduce on iPad Mini
                                   window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      const shouldDisableParticles = isLowBandwidth || 
                                   isLowPerformance || 
                                   (isMobile && width < 414) ||
                                   (iPadInfo.isIPad && isLowPerformance);

      const shouldUseSimpleBackgrounds = isLowBandwidth || 
                                       isLowPerformance ||
                                       (metrics.memoryUsage ? metrics.memoryUsage > 0.7 : false) ||
                                       (iPadInfo.isIPadMini && isLandscape); // Simple backgrounds on iPad Mini landscape

      setState({
        isMobile,
        isIOS,
        isSafari,
        hasNotch,
        isLowBandwidth,
        isLowPerformance,
        performanceMetrics: metrics,
        shouldReduceAnimations,
        shouldDisableParticles,
        shouldUseSimpleBackgrounds,
        shouldOptimizeForSafari,
        // Enhanced iPad support
        iPad: iPadInfo,
        isLandscape,
        isPortrait,
        shouldUseSidebarOverlay,
        adminGridClasses: (type: string) => generateAdminGridClasses(type, iPadInfo.gridColumns),
      });

      // Apply CSS classes for styling (enhanced)
      const body = document.body;
      body.classList.toggle('low-bandwidth', Boolean(isLowBandwidth));
      body.classList.toggle('mobile-device', Boolean(isMobile));
      body.classList.toggle('ios-device', Boolean(isIOS));
      body.classList.toggle('safari-browser', Boolean(isSafari));
      body.classList.toggle('safari-mobile', Boolean(shouldOptimizeForSafari));
      body.classList.toggle('low-performance', Boolean(isLowPerformance));
      body.classList.toggle('reduce-animations', Boolean(shouldReduceAnimations));
      body.classList.toggle('disable-particles', Boolean(shouldDisableParticles));
      body.classList.toggle('simple-backgrounds', Boolean(shouldUseSimpleBackgrounds));
      
      // iPad-specific classes
      body.classList.toggle('ipad-device', iPadInfo.isIPad);
      body.classList.toggle('ipad-mini', iPadInfo.isIPadMini);
      body.classList.toggle('ipad-air', iPadInfo.isIPadAir);
      body.classList.toggle('ipad-pro-11', iPadInfo.isIPadPro11);
      body.classList.toggle('ipad-pro-12', iPadInfo.isIPadPro12);
      body.classList.toggle('landscape-mode', isLandscape);
      body.classList.toggle('portrait-mode', isPortrait);
      body.classList.toggle('sidebar-overlay-mode', shouldUseSidebarOverlay);

      // Update custom viewport unit for iOS 100vh issues
      document.documentElement.style.setProperty(
        '--vh', `${window.innerHeight * 0.01}px`
      );
      
      // Set iPad-specific CSS variables
      document.documentElement.style.setProperty(
        '--ipad-sidebar-width', `${iPadInfo.sidebarWidth}px`
      );
    };

    // Initial check
    updateState();
    
    // Start FPS monitoring
    monitorFPS();

    // Listen for changes (from your original)
    const handleResize = () => updateState();
    const handleVisibilityChange = () => {
      if (document.hidden) {
        return;
      }
      updateState();
    };
    
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'animuse-animations-enabled') {
        updateState();
      }
    };
    
    const handleAnimationPrefChange = () => {
      updateState();
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', updateState); // Important for iPad
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener(ANIMATION_PREF_CHANGE_EVENT, handleAnimationPrefChange);

    // Check for connection changes
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      connection?.addEventListener('change', updateState);
    }

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', updateState);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener(ANIMATION_PREF_CHANGE_EVENT, handleAnimationPrefChange);
      
      if ('connection' in navigator) {
        const connection = (navigator as any).connection;
        connection?.removeEventListener('change', updateState);
      }
    };
  }, [measurePerformance, monitorFPS, detectIPadInfo, generateAdminGridClasses]);

  // Development performance logger (enhanced)
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      const logPerformance = () => {
        console.log('🔧 Mobile Optimization State:', {
          device: {
            isMobile: state.isMobile,
            isIOS: state.isIOS,
            hasNotch: state.hasNotch,
            iPad: state.iPad,
            orientation: state.isLandscape ? 'landscape' : 'portrait',
          },
          performance: {
            fps: state.performanceMetrics.fps,
            memoryUsage: state.performanceMetrics.memoryUsage,
            isLowPerformance: state.isLowPerformance,
          },
          network: {
            connectionType: state.performanceMetrics.connectionType,
            isLowBandwidth: state.isLowBandwidth,
          },
          optimizations: {
            shouldReduceAnimations: state.shouldReduceAnimations,
            shouldDisableParticles: state.shouldDisableParticles,
            shouldUseSimpleBackgrounds: state.shouldUseSimpleBackgrounds,
            shouldUseSidebarOverlay: state.shouldUseSidebarOverlay,
          }
        });
      };

      // Log every 5 seconds in development
      const interval = setInterval(logPerformance, 5000);
      return () => clearInterval(interval);
    }
  }, [state]);

  return state;
};

// Enhanced helper hooks
export const useAnimationOptimization = () => {
  const { shouldReduceAnimations, isLowPerformance, iPad } = useMobileOptimizations();
  
  return {
    shouldAnimate: !shouldReduceAnimations,
    animationDuration: isLowPerformance ? 'slow' : iPad.isIPad ? 'medium' : 'normal',
    shouldUseGPUAcceleration: !isLowPerformance && !iPad.isIPadMini,
  };
};

export const useParticleOptimization = () => {
  const { shouldDisableParticles, performanceMetrics, iPad } = useMobileOptimizations();
  
  const getParticleCount = (baseCount: number): number => {
    if (shouldDisableParticles) return 0;
    if (iPad.isIPadMini) return Math.floor(baseCount * 0.4);
    if (iPad.isIPad && performanceMetrics.fps < 45) return Math.floor(baseCount * 0.5);
    if (performanceMetrics.fps < 45) return Math.floor(baseCount * 0.3);
    if (performanceMetrics.fps < 55) return Math.floor(baseCount * 0.6);
    return baseCount;
  };

  return {
    shouldShowParticles: !shouldDisableParticles,
    getOptimalParticleCount: getParticleCount,
  };
};

export const useBackgroundOptimization = () => {
  const { shouldUseSimpleBackgrounds, isLowBandwidth, iPad, isLandscape } = useMobileOptimizations();
  
  return {
    shouldUseGradients: !shouldUseSimpleBackgrounds,
    shouldUseBlur: !isLowBandwidth && !(iPad.isIPadMini && isLandscape),
    backgroundComplexity: shouldUseSimpleBackgrounds ? 'simple' : 'complex',
    shouldUseGlassmorphism: !shouldUseSimpleBackgrounds && !iPad.isIPadMini,
  };
};

// New iPad-specific hooks
export const useAdminLayoutOptimization = () => {
  const { iPad, shouldUseSidebarOverlay, adminGridClasses, isLandscape } = useMobileOptimizations();
  
  return {
    sidebarWidth: iPad.sidebarWidth,
    shouldUseSidebarOverlay,
    getGridClasses: (type: string) => {
      // Ensure we return proper Tailwind classes that exist
      const columns = iPad.gridColumns[type as keyof typeof iPad.gridColumns] || 3;
      const baseClasses = 'grid gap-4 md:gap-6 w-full max-w-full box-border';
      
      // Use only safe Tailwind grid classes
      switch (type) {
        case 'stats':
          if (iPad.isIPadMini) return `${baseClasses} grid-cols-2`;
          if (iPad.isIPadPro12) return `${baseClasses} grid-cols-2 md:grid-cols-4`;
          return `${baseClasses} grid-cols-2 md:grid-cols-3`;
          
        case 'anime':
          if (iPad.isIPadMini) return `${baseClasses} grid-cols-2`;
          if (iPad.isIPadPro12) return `${baseClasses} grid-cols-2 md:grid-cols-3 lg:grid-cols-4`;
          return `${baseClasses} grid-cols-2 md:grid-cols-3`;
          
        case 'users':
          if (iPad.isIPadMini) return `${baseClasses} grid-cols-1 md:grid-cols-2`;
          if (iPad.isIPadPro12) return `${baseClasses} grid-cols-1 md:grid-cols-2 lg:grid-cols-3`;
          return `${baseClasses} grid-cols-1 md:grid-cols-2`;
          
        case 'reviews':
          return `${baseClasses} grid-cols-1 md:grid-cols-2`;
          
        default:
          return `${baseClasses} grid-cols-2 md:grid-cols-3`;
      }
    },
    contentPadding: iPad.isIPadMini ? 'p-4' : iPad.isIPadPro12 ? 'p-6 md:p-8 lg:p-12' : 'p-6 md:p-8',
    isOptimizedForAdmin: iPad.isIPad,
    recommendedItemsPerPage: isLandscape ? 20 : 12,
  };
};

export const useIPadResponsive = () => {
  const { iPad, isLandscape, isPortrait } = useMobileOptimizations();
  
  return {
    ...iPad,
    isLandscape,
    isPortrait,
    getResponsiveClasses: (baseClasses: string) => {
      const classes = [baseClasses];
      if (iPad.isIPad) classes.push('ipad-optimized');
      if (iPad.isIPadMini) classes.push('ipad-mini-layout');
      if (isLandscape) classes.push('landscape-layout');
      return classes.join(' ');
    },
  };
};

// Utility function to trigger animation preference update (from your original)
export const updateAnimationPreference = (enabled: boolean) => {
  localStorage.setItem('animuse-animations-enabled', String(enabled));
  window.dispatchEvent(new CustomEvent(ANIMATION_PREF_CHANGE_EVENT));
};