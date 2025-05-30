// convex/useMobileOptimizations.ts - Mobile Detection and Optimization Hooks
import { useState, useEffect, useCallback, useMemo } from 'react';

// Device detection utilities
const getDeviceInfo = () => {
  if (typeof window === 'undefined') {
    return { 
      isMobile: false, 
      isIOS: false, 
      isAndroid: false,
      isLowEndDevice: false,
      screenWidth: 1024,
      screenHeight: 768,
      pixelRatio: 1
    };
  }
  
  const userAgent = navigator.userAgent;
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
  const isIOS = /iPad|iPhone|iPod/.test(userAgent);
  const isAndroid = /Android/i.test(userAgent);
  const isLowEndDevice = navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 2;
  
  return {
    isMobile,
    isIOS,
    isAndroid,
    isLowEndDevice: isLowEndDevice || false,
    screenWidth: window.innerWidth || 1024,
    screenHeight: window.innerHeight || 768,
    pixelRatio: window.devicePixelRatio || 1
  };
};

// Network detection
const getNetworkInfo = () => {
  if (typeof navigator === 'undefined' || !('connection' in navigator)) {
    return { isSlowConnection: false, saveData: false };
  }
  
  const connection = (navigator as any).connection;
  const isSlowConnection = connection?.effectiveType === 'slow-2g' || 
                          connection?.effectiveType === '2g' ||
                          connection?.downlink < 1;
  const saveData = connection?.saveData || false;
  
  return { isSlowConnection, saveData };
};

// Performance detection
const getPerformanceInfo = () => {
  if (typeof window === 'undefined') return { isLowPerformance: false };
  
  const memory = (performance as any).memory;
  const isLowMemory = memory ? memory.usedJSHeapSize / memory.jsHeapSizeLimit > 0.9 : false;
  const isLowPerformance = navigator.hardwareConcurrency <= 2 || isLowMemory;
  
  return { isLowPerformance, isLowMemory };
};

// Main mobile optimization hook
export const useMobileOptimizations = () => {
  const [deviceInfo, setDeviceInfo] = useState(getDeviceInfo());
  const [networkInfo, setNetworkInfo] = useState(getNetworkInfo());
  const [performanceInfo, setPerformanceInfo] = useState(getPerformanceInfo());
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const updateDeviceInfo = () => setDeviceInfo(getDeviceInfo());
    const updateNetworkInfo = () => setNetworkInfo(getNetworkInfo());
    
    // Check for reduced motion preference
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);
    
    const handleMotionChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };
    
    // Event listeners
    window.addEventListener('resize', updateDeviceInfo);
    mediaQuery.addEventListener('change', handleMotionChange);
    
    if ('connection' in navigator) {
      (navigator as any).connection.addEventListener('change', updateNetworkInfo);
    }

    return () => {
      window.removeEventListener('resize', updateDeviceInfo);
      mediaQuery.removeEventListener('change', handleMotionChange);
      if ('connection' in navigator) {
        (navigator as any).connection.removeEventListener('change', updateNetworkInfo);
      }
    };
  }, []);

  // Apply device-specific CSS classes
  useEffect(() => {
    const { isMobile, isIOS, isLowEndDevice } = deviceInfo;
    const { isSlowConnection, saveData } = networkInfo;
    const { isLowPerformance } = performanceInfo;
    
    const classList = document.documentElement.classList;
    
    // Device classes
    classList.toggle('mobile-device', isMobile);
    classList.toggle('ios-device', isIOS);
    classList.toggle('low-end-device', isLowEndDevice);
    
    // Performance classes  
    classList.toggle('low-bandwidth', isSlowConnection || saveData);
    classList.toggle('low-performance', isLowPerformance);
    classList.toggle('reduced-motion', prefersReducedMotion);
    
  }, [deviceInfo, networkInfo, performanceInfo, prefersReducedMotion]);

  // Computed optimization flags
  const shouldReduceAnimations = useMemo(() => {
    return prefersReducedMotion || (deviceInfo.isMobile && deviceInfo.isLowEndDevice) || networkInfo.isSlowConnection;
  }, [prefersReducedMotion, deviceInfo.isMobile, deviceInfo.isLowEndDevice, networkInfo.isSlowConnection]);

  const shouldDisableParticles = useMemo(() => {
    return deviceInfo.isLowEndDevice || networkInfo.isSlowConnection || networkInfo.saveData;
  }, [deviceInfo.isLowEndDevice, networkInfo.isSlowConnection, networkInfo.saveData]);

  const shouldUseSimpleBackgrounds = useMemo(() => {
    return (deviceInfo.isMobile && deviceInfo.isLowEndDevice) || networkInfo.saveData;
  }, [deviceInfo.isMobile, deviceInfo.isLowEndDevice, networkInfo.saveData]);

  return {
    ...deviceInfo,
    ...networkInfo,
    ...performanceInfo,
    prefersReducedMotion,
    shouldReduceAnimations,
    shouldDisableParticles,
    shouldUseSimpleBackgrounds
  };
};

// Animation optimization hook
export const useAnimationOptimization = () => {
  const { isMobile, isLowEndDevice, prefersReducedMotion, isSlowConnection } = useMobileOptimizations();
  
  const shouldAnimate = useMemo(() => {
    return !prefersReducedMotion && !(isMobile && isLowEndDevice) && !isSlowConnection;
  }, [prefersReducedMotion, isMobile, isLowEndDevice, isSlowConnection]);
  
  const shouldUseGPUAcceleration = useMemo(() => {
    return !isLowEndDevice && !isSlowConnection;
  }, [isLowEndDevice, isSlowConnection]);
  
  const animationDuration = useMemo(() => {
    if (prefersReducedMotion) return 0;
    if (isMobile || isLowEndDevice) return 'slow';
    return 'normal';
  }, [prefersReducedMotion, isMobile, isLowEndDevice]);

  return {
    shouldAnimate,
    shouldUseGPUAcceleration,
    animationDuration
  };
};

// Particle system optimization hook
export const useParticleOptimization = () => {
  const { isMobile, isLowEndDevice, isSlowConnection, screenWidth = 1024 } = useMobileOptimizations();
  
  const shouldShowParticles = useMemo(() => {
    return !isMobile || (!isLowEndDevice && !isSlowConnection && screenWidth > 414);
  }, [isMobile, isLowEndDevice, isSlowConnection, screenWidth]);
  
  const getOptimalParticleCount = useCallback((baseCount: number) => {
    if (!shouldShowParticles) return 0;
    if (isMobile && screenWidth <= 375) return Math.max(1, Math.floor(baseCount * 0.25));
    if (isMobile && screenWidth <= 414) return Math.max(2, Math.floor(baseCount * 0.4));
    if (isMobile) return Math.max(3, Math.floor(baseCount * 0.6));
    if (isLowEndDevice) return Math.floor(baseCount * 0.7);
    return baseCount;
  }, [shouldShowParticles, isMobile, screenWidth, isLowEndDevice]);

  return {
    shouldShowParticles,
    getOptimalParticleCount
  };
};

// Background effects optimization hook
export const useBackgroundOptimization = () => {
  const { isMobile, isLowEndDevice, isSlowConnection, saveData } = useMobileOptimizations();
  
  const shouldUseGradients = useMemo(() => {
    return !(isMobile && isLowEndDevice) && !saveData;
  }, [isMobile, isLowEndDevice, saveData]);
  
  const shouldUseBlur = useMemo(() => {
    return !isLowEndDevice && !isSlowConnection && !saveData;
  }, [isLowEndDevice, isSlowConnection, saveData]);
  
  const getBlurLevel = useCallback((level: 'sm' | 'md' | 'lg' | 'xl') => {
    if (!shouldUseBlur) return '';
    
    const levels = {
      sm: isMobile ? 'blur-sm' : 'blur-sm',
      md: isMobile ? 'blur-sm' : 'blur-md', 
      lg: isMobile ? 'blur-md' : 'blur-lg',
      xl: isMobile ? 'blur-md' : 'blur-xl'
    };
    
    return levels[level];
  }, [shouldUseBlur, isMobile]);

  return {
    shouldUseGradients,
    shouldUseBlur,
    getBlurLevel
  };
};

// Text scaling optimization hook
export const useTextOptimization = () => {
  const { screenWidth = 1024, isMobile } = useMobileOptimizations();
  
  const getTextSize = useCallback((size: 'xs' | 'sm' | 'base' | 'lg' | 'xl' | '2xl' | '3xl') => {
    if (!isMobile) return `text-${size}`;
    
    const mobileMapping = {
      'xs': screenWidth <= 375 ? 'text-xs' : 'text-xs',
      'sm': screenWidth <= 375 ? 'text-xs' : 'text-sm',
      'base': screenWidth <= 375 ? 'text-sm' : 'text-base',
      'lg': screenWidth <= 375 ? 'text-base' : 'text-lg',
      'xl': screenWidth <= 375 ? 'text-lg' : 'text-xl',
      '2xl': screenWidth <= 375 ? 'text-xl' : 'text-2xl',
      '3xl': screenWidth <= 375 ? 'text-2xl' : 'text-3xl'
    };
    
    return mobileMapping[size];
  }, [isMobile, screenWidth]);
  
  const getHeadingSize = useCallback((level: 1 | 2 | 3 | 4 | 5 | 6) => {
    if (!isMobile) {
      const sizes = ['text-4xl', 'text-3xl', 'text-2xl', 'text-xl', 'text-lg', 'text-base'];
      return sizes[level - 1];
    }
    
    const mobileSizes = screenWidth <= 375 
      ? ['text-2xl', 'text-xl', 'text-lg', 'text-base', 'text-sm', 'text-sm']
      : ['text-3xl', 'text-2xl', 'text-xl', 'text-lg', 'text-base', 'text-sm'];
    
    return mobileSizes[level - 1];
  }, [isMobile, screenWidth]);

  return {
    getTextSize,
    getHeadingSize
  };
};

// Spacing optimization hook
export const useSpacingOptimization = () => {
  const { screenWidth = 1024, isMobile } = useMobileOptimizations();
  
  const getSpacing = useCallback((size: 'xs' | 'sm' | 'md' | 'lg' | 'xl') => {
    if (!isMobile) return size;
    
    const mobileMapping = {
      'xs': screenWidth <= 375 ? 'xs' : 'xs',
      'sm': screenWidth <= 375 ? 'xs' : 'sm',
      'md': screenWidth <= 375 ? 'sm' : 'md',
      'lg': screenWidth <= 375 ? 'md' : 'lg',
      'xl': screenWidth <= 375 ? 'lg' : 'xl'
    };
    
    return mobileMapping[size];
  }, [isMobile, screenWidth]);
  
  const getPadding = useCallback((size: 'sm' | 'md' | 'lg' | 'xl') => {
    const spacing = getSpacing(size);
    return `p-${spacing === 'xs' ? '2' : spacing === 'sm' ? '3' : spacing === 'md' ? '4' : spacing === 'lg' ? '6' : '8'}`;
  }, [getSpacing]);
  
  const getMargin = useCallback((size: 'sm' | 'md' | 'lg' | 'xl') => {
    const spacing = getSpacing(size);
    return `m-${spacing === 'xs' ? '2' : spacing === 'sm' ? '3' : spacing === 'md' ? '4' : spacing === 'lg' ? '6' : '8'}`;
  }, [getSpacing]);

  return {
    getSpacing,
    getPadding,
    getMargin
  };
};

// Performance monitoring hook (development only)
export const usePerformanceMonitoring = () => {
  const [fps, setFps] = useState(0);
  const [memory, setMemory] = useState(0);
  
  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return;
    
    let frameCount = 0;
    let lastTime = performance.now();
    let animationId: number;
    
    const measureFPS = () => {
      frameCount++;
      const currentTime = performance.now();
      
      if (currentTime >= lastTime + 1000) {
        setFps(Math.round((frameCount * 1000) / (currentTime - lastTime)));
        frameCount = 0;
        lastTime = currentTime;
        
        // Memory monitoring
        if ((performance as any).memory) {
          const memInfo = (performance as any).memory;
          setMemory(Math.round(memInfo.usedJSHeapSize / 1048576)); // MB
        }
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
  
  return { fps, memory };
};

// Intersection Observer hook for lazy animations
export const useLazyAnimation = (threshold = 0.1) => {
  const [isInView, setIsInView] = useState(false);
  const [ref, setRef] = useState<Element | null>(null);
  
  useEffect(() => {
    if (!ref) return;
    
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.unobserve(ref); // Only animate once
        }
      },
      { threshold }
    );
    
    observer.observe(ref);
    
    return () => {
      if (ref) observer.unobserve(ref);
    };
  }, [ref, threshold]);
  
  return [setRef, isInView] as const;
};

// Touch optimization hook
export const useTouchOptimization = () => {
  const { isMobile, isIOS } = useMobileOptimizations();
  
  const getTouchProps = useCallback(() => {
    if (!isMobile) return {};
    
    return {
      style: {
        touchAction: 'manipulation',
        WebkitTapHighlightColor: 'transparent',
        WebkitTouchCallout: 'none',
        WebkitUserSelect: 'none',
        userSelect: 'none',
        ...(isIOS && {
          WebkitOverflowScrolling: 'touch'
        })
      }
    };
  }, [isMobile, isIOS]);
  
  const getMinTouchTarget = useCallback(() => {
    return isMobile ? { minHeight: '44px', minWidth: '44px' } : {};
  }, [isMobile]);
  
  return {
    getTouchProps,
    getMinTouchTarget
  };
};