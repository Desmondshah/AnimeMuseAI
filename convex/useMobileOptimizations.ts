// convex/useMobileOptimizations.ts - Enhanced with Performance Monitoring
import { useEffect, useState, useCallback, useRef } from 'react';

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

interface MobileOptimizationState {
  isMobile: boolean;
  isIOS: boolean;
  hasNotch: boolean;
  isLowBandwidth: boolean;
  isLowPerformance: boolean;
  performanceMetrics: PerformanceMetrics;
  shouldReduceAnimations: boolean;
  shouldDisableParticles: boolean;
  shouldUseSimpleBackgrounds: boolean;
}

export const useMobileOptimizations = (): MobileOptimizationState => {
  const [state, setState] = useState<MobileOptimizationState>({
    isMobile: false,
    isIOS: false,
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
    shouldUseSimpleBackgrounds: false
  });

  // Performance monitoring
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

  // FPS monitoring
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
            fps: Math.max(0, fps) // Ensure fps is never negative
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

  useEffect(() => {
    const updateState = () => {
      const metrics = measurePerformance();
      
      // Device detection
      const isMobile = window.innerWidth <= 768 || /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      
      // Notch detection
      let hasNotch = false;
      if (CSS.supports('padding-left: env(safe-area-inset-left)')) {
        const testDiv = document.createElement('div');
        testDiv.style.paddingLeft = 'env(safe-area-inset-left)';
        document.body.appendChild(testDiv);
        const paddingValue = parseInt(window.getComputedStyle(testDiv).paddingLeft);
        document.body.removeChild(testDiv);
        hasNotch = paddingValue > 0;
      }

      // Bandwidth detection
      let isLowBandwidth = false;
      if ('connection' in navigator) {
        const connection = (navigator as any).connection;
        if (connection) {
          const slowConnections = ['slow-2g', '2g', '3g'];
          isLowBandwidth = slowConnections.includes(connection.effectiveType);
        }
      }

      // Performance-based optimizations
      const isLowPerformance = metrics.fps < 30 || 
                              (metrics.memoryUsage ? metrics.memoryUsage > 0.8 : false) ||
                              metrics.devicePixelRatio > 2;

      // Optimization decisions
      const storedPref = localStorage.getItem('animuse-animations-enabled');
      const animationsEnabled = storedPref === null ? true : storedPref === 'true';

      const shouldReduceAnimations = !animationsEnabled ||
                                   isLowBandwidth ||
                                   isLowPerformance ||
                                   window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      const shouldDisableParticles = isLowBandwidth || 
                                   isLowPerformance || 
                                   (isMobile && metrics.screenSize.width < 414);

      const shouldUseSimpleBackgrounds = isLowBandwidth || 
                                       isLowPerformance ||
                                       (metrics.memoryUsage ? metrics.memoryUsage > 0.7 : false);

      setState({
        isMobile,
        isIOS,
        hasNotch,
        isLowBandwidth,
        isLowPerformance,
        performanceMetrics: metrics,
        shouldReduceAnimations,
        shouldDisableParticles,
        shouldUseSimpleBackgrounds
      });

      // Apply CSS classes for styling
      const body = document.body;
      body.classList.toggle('low-bandwidth', Boolean(isLowBandwidth));
      body.classList.toggle('mobile-device', Boolean(isMobile));
      body.classList.toggle('ios-device', Boolean(isIOS));
      body.classList.toggle('low-performance', Boolean(isLowPerformance));
      body.classList.toggle('reduce-animations', Boolean(shouldReduceAnimations));
      body.classList.toggle('disable-particles', Boolean(shouldDisableParticles));
      body.classList.toggle('simple-backgrounds', Boolean(shouldUseSimpleBackgrounds));

      // Update custom viewport unit for iOS 100vh issues
      document.documentElement.style.setProperty(
        '--vh', `${window.innerHeight * 0.01}px`
      );
    };

    // Initial check
    updateState();
    
    // Start FPS monitoring
    monitorFPS();

    // Listen for changes
    const handleResize = () => updateState();
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Pause performance monitoring when tab is hidden
        return;
      }
      updateState();
    };
    
    // Listen for storage changes (for when animation preference is updated)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'animuse-animations-enabled') {
        updateState();
      }
    };
    
    // Listen for custom animation preference changes (same window)
    const handleAnimationPrefChange = () => {
      updateState();
    };

    window.addEventListener('resize', handleResize);
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
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener(ANIMATION_PREF_CHANGE_EVENT, handleAnimationPrefChange);
      
      if ('connection' in navigator) {
        const connection = (navigator as any).connection;
        connection?.removeEventListener('change', updateState);
      }
    };
  }, [measurePerformance, monitorFPS]);

  // Development performance logger
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      const logPerformance = () => {
        console.log('🔧 Mobile Optimization State:', {
          device: {
            isMobile: state.isMobile,
            isIOS: state.isIOS,
            hasNotch: state.hasNotch,
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

// Helper hooks for specific optimizations
export const useAnimationOptimization = () => {
  const { shouldReduceAnimations, isLowPerformance } = useMobileOptimizations();
  
  return {
    shouldAnimate: !shouldReduceAnimations,
    animationDuration: isLowPerformance ? 'slow' : 'normal',
    shouldUseGPUAcceleration: !isLowPerformance,
  };
};

export const useParticleOptimization = () => {
  const { shouldDisableParticles, performanceMetrics } = useMobileOptimizations();
  
  const getParticleCount = (baseCount: number): number => {
    if (shouldDisableParticles) return 0;
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
  const { shouldUseSimpleBackgrounds, isLowBandwidth } = useMobileOptimizations();
  
  return {
    shouldUseGradients: !shouldUseSimpleBackgrounds,
    shouldUseBlur: !isLowBandwidth,
    backgroundComplexity: shouldUseSimpleBackgrounds ? 'simple' : 'complex',
  };
};

// Utility function to trigger animation preference update
export const updateAnimationPreference = (enabled: boolean) => {
  localStorage.setItem('animuse-animations-enabled', enabled.toString());
  window.dispatchEvent(new CustomEvent(ANIMATION_PREF_CHANGE_EVENT));
};

// Mobile scroll detection utility
export const useMobileScrollDetection = () => {
  const [scrollDirection, setScrollDirection] = useState<'up' | 'down' | null>(null);
  const [scrollY, setScrollY] = useState(0);
  const lastScrollY = useRef(0);
  const { isMobile, isIOS } = useMobileOptimizations();

  useEffect(() => {
    const handleScroll = () => {
      const currentY = window.pageYOffset || document.documentElement.scrollTop;
      const delta = currentY - lastScrollY.current;
      
      // Only update direction if there's significant movement
      if (Math.abs(delta) > 5) {
        const newDirection = delta > 0 ? 'down' : 'up';
        setScrollDirection(newDirection);
        
        // Debug logging
        if (process.env.NODE_ENV === 'development') {
          console.log('📱 Scroll:', {
            currentY,
            delta,
            direction: newDirection,
            lastY: lastScrollY.current
          });
        }
      }
      
      setScrollY(currentY);
      lastScrollY.current = currentY;
    };

    // Use passive listeners for better performance
    window.addEventListener('scroll', handleScroll, { passive: true });
    
    // iOS-specific touch handling
    if (isIOS) {
      document.addEventListener('touchstart', handleScroll, { passive: true });
      document.addEventListener('touchmove', handleScroll, { passive: true });
    }

    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (isIOS) {
        document.removeEventListener('touchstart', handleScroll);
        document.removeEventListener('touchmove', handleScroll);
      }
    };
  }, [isIOS]);

  return {
    scrollDirection,
    scrollY,
    isScrollingDown: scrollDirection === 'down',
    isScrollingUp: scrollDirection === 'up',
    isAtTop: scrollY < 20,
  };
};

// Mobile navigation visibility utility
export const useMobileNavigationVisibility = () => {
  const [isNavigationVisible, setIsNavigationVisible] = useState(true);
  const { scrollDirection, scrollY, isAtTop } = useMobileScrollDetection();
  const { isMobile } = useMobileOptimizations();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!isMobile) return;

    // Debug logging
    if (process.env.NODE_ENV === 'development') {
      console.log('🧭 Navigation State:', {
        scrollDirection,
        scrollY,
        isAtTop,
        isMobile,
        currentVisibility: isNavigationVisible
      });
    }

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Always show navigation when at top
    if (isAtTop) {
      setIsNavigationVisible(true);
      return;
    }

    // Show navigation when scrolling up
    if (scrollDirection === 'up') {
      setIsNavigationVisible(true);
    } 
    // Hide navigation when scrolling down (but not at top)
    else if (scrollDirection === 'down' && scrollY > 50) {
      setIsNavigationVisible(false);
    }

    // Auto-show navigation after scroll stops (only if we're not at top)
    if (!isAtTop && scrollY > 50) {
      timeoutRef.current = setTimeout(() => {
        setIsNavigationVisible(true);
      }, 1500);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [scrollDirection, scrollY, isAtTop, isMobile]);

  return {
    isNavigationVisible,
    showNavigation: () => setIsNavigationVisible(true),
    hideNavigation: () => setIsNavigationVisible(false),
  };
};