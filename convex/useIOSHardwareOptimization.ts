// convex/useIOSHardwareOptimization.ts - iPhone CPU & GPU Optimization
import { useEffect, useState, useCallback, useRef } from 'react';

interface HardwareCapabilities {
  // GPU capabilities
  webGLContext?: WebGLRenderingContext | WebGL2RenderingContext | null;
  hardwareAcceleration: boolean;
  maxTextureSize: number;
  gpuVendor: string;
  gpuRenderer: string;
  
  // CPU capabilities
  logicalCpuCores: number;
  deviceMemory?: number;
  
  // iPhone specific
  isIPhone: boolean;
  iPhoneModel: string;
  supportsOffscreenCanvas: boolean;
  supportsWebGL2: boolean;
  supportsImageBitmap: boolean;
  
  // Performance monitoring
  performanceObserver?: PerformanceObserver;
  frameRate: number;
  isLowPowerMode: boolean;
}

interface OptimizationSettings {
  // GPU optimizations
  enableHardwareAcceleration: boolean;
  useWebGLTransitions: boolean;
  enableGPUImageProcessing: boolean;
  maxConcurrentAnimations: number;
  
  // CPU optimizations
  enableWebWorkers: boolean;
  maxWorkerThreads: number;
  enableVirtualization: boolean;
  batchProcessingSize: number;
  
  // Memory optimizations
  enableImagePooling: boolean;
  maxCachedImages: number;
  compressionLevel: 'high' | 'medium' | 'low';
  
  // Battery optimizations
  adaptToBatteryLevel: boolean;
  reducedMotionThreshold: number;
}

export const useIOSHardwareOptimization = () => {
  const [capabilities, setCapabilities] = useState<HardwareCapabilities>({
    hardwareAcceleration: false,
    maxTextureSize: 0,
    gpuVendor: '',
    gpuRenderer: '',
    logicalCpuCores: navigator.hardwareConcurrency || 4,
    isIPhone: false,
    iPhoneModel: '',
    supportsOffscreenCanvas: false,
    supportsWebGL2: false,
    supportsImageBitmap: false,
    frameRate: 60,
    isLowPowerMode: false,
  });

  const [settings, setSettings] = useState<OptimizationSettings>({
    enableHardwareAcceleration: true,
    useWebGLTransitions: false,
    enableGPUImageProcessing: false,
    maxConcurrentAnimations: 8,
    enableWebWorkers: true,
    maxWorkerThreads: 2,
    enableVirtualization: true,
    batchProcessingSize: 50,
    enableImagePooling: true,
    maxCachedImages: 100,
    compressionLevel: 'medium',
    adaptToBatteryLevel: true,
    reducedMotionThreshold: 20,
  });

  const workerPoolRef = useRef<Worker[]>([]);
  const imagePoolRef = useRef<Map<string, HTMLImageElement>>(new Map());
  const animationFrameRef = useRef<number | undefined>(undefined);

  // Detect iPhone model and capabilities
  const detectHardwareCapabilities = useCallback(async () => {
    const userAgent = navigator.userAgent;
    const isIPhone = /iPhone|iPod/.test(userAgent);
    
    // iPhone model detection
    let iPhoneModel = '';
    if (isIPhone) {
      const match = userAgent.match(/iPhone OS (\d+)_(\d+)/);
      if (match) {
        const majorVersion = parseInt(match[1]);
        if (majorVersion >= 17) iPhoneModel = 'iPhone 15 Series or newer';
        else if (majorVersion >= 16) iPhoneModel = 'iPhone 14 Series';
        else if (majorVersion >= 15) iPhoneModel = 'iPhone 13 Series';
        else if (majorVersion >= 14) iPhoneModel = 'iPhone 12 Series';
        else iPhoneModel = 'iPhone 11 Series or older';
      }
    }

    // WebGL detection and GPU info
    const canvas = document.createElement('canvas');
    let webGLContext: WebGLRenderingContext | WebGL2RenderingContext | null = null;
    let hardwareAcceleration = false;
    let maxTextureSize = 0;
    let gpuVendor = '';
    let gpuRenderer = '';
    let supportsWebGL2 = false;

    try {
      // Try WebGL2 first
      webGLContext = canvas.getContext('webgl2') as WebGL2RenderingContext;
      supportsWebGL2 = !!webGLContext;
      
      // Fallback to WebGL1
      if (!webGLContext) {
        webGLContext = canvas.getContext('webgl') as WebGLRenderingContext;
      }

      if (webGLContext) {
        hardwareAcceleration = true;
        maxTextureSize = webGLContext.getParameter(webGLContext.MAX_TEXTURE_SIZE);
        
        const debugInfo = webGLContext.getExtension('WEBGL_debug_renderer_info');
        if (debugInfo) {
          gpuVendor = webGLContext.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL);
          gpuRenderer = webGLContext.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
        }
      }
    } catch (error) {
      console.warn('WebGL not available:', error);
    }

    // Check for other modern APIs
    const supportsOffscreenCanvas = 'OffscreenCanvas' in window;
    const supportsImageBitmap = 'createImageBitmap' in window;

    // Device memory (if available)
    const deviceMemory = (navigator as any).deviceMemory;

    // Battery API for power management
    let isLowPowerMode = false;
    try {
      if ('getBattery' in navigator) {
        const battery = await (navigator as any).getBattery();
        isLowPowerMode = battery.level < 0.2 && !battery.charging;
      }
    } catch (error) {
      console.log('Battery API not available');
    }

    setCapabilities({
      webGLContext,
      hardwareAcceleration,
      maxTextureSize,
      gpuVendor,
      gpuRenderer,
      logicalCpuCores: navigator.hardwareConcurrency || 4,
      deviceMemory,
      isIPhone,
      iPhoneModel,
      supportsOffscreenCanvas,
      supportsWebGL2,
      supportsImageBitmap,
      frameRate: 60,
      isLowPowerMode,
    });

    // Adjust settings based on capabilities
    if (isIPhone) {
      setSettings(prev => ({
        ...prev,
        enableWebWorkers: prev.enableWebWorkers && navigator.hardwareConcurrency >= 4,
        maxWorkerThreads: Math.min(navigator.hardwareConcurrency - 1, 3),
        useWebGLTransitions: hardwareAcceleration && maxTextureSize >= 2048,
        enableGPUImageProcessing: hardwareAcceleration && supportsWebGL2,
        maxConcurrentAnimations: isLowPowerMode ? 4 : 8,
        compressionLevel: deviceMemory && deviceMemory < 4 ? 'high' : 'medium',
      }));
    }
  }, []);

  // GPU-accelerated element creation
  const createGPUOptimizedElement = useCallback((element: HTMLElement) => {
    if (!settings.enableHardwareAcceleration) return;

    // Apply GPU acceleration hints
    element.style.transform = 'translateZ(0)';
    element.style.willChange = 'transform, opacity';
    element.style.backfaceVisibility = 'hidden';
    element.style.perspective = '1000px';
    
    // Use contain for better layer optimization
    element.style.contain = 'layout style paint';
    
    // iPhone specific optimizations
    if (capabilities.isIPhone) {
      element.style.webkitTransform = 'translateZ(0)';
      element.style.webkitBackfaceVisibility = 'hidden';
      element.style.webkitPerspective = '1000px';
    }
  }, [settings.enableHardwareAcceleration, capabilities.isIPhone]);

  // Initialize on mount
  useEffect(() => {
    detectHardwareCapabilities();
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [detectHardwareCapabilities]);

  return {
    capabilities,
    settings,
    updateSettings: setSettings,
    createGPUOptimizedElement,
    isOptimized: capabilities.isIPhone && capabilities.hardwareAcceleration,
  };
}; 