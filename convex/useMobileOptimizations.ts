// convex/useMobileOptimizations.ts - Enhanced with Performance Monitoring
import { useEffect, useState, useCallback } from 'react';

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
      const shouldReduceAnimations = isLowBandwidth || 
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

    window.addEventListener('resize', handleResize);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Check for connection changes
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      connection?.addEventListener('change', updateState);
    }

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      
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