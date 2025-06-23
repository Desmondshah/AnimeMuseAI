// convex/iPad-hooks.ts - ADVANCED iPad-Specific Optimizations
import { useCallback, useRef, useEffect, useState, useMemo } from 'react';
import { useMobileOptimizations } from './useMobileOptimizations';

// ========================================
// HAPTIC FEEDBACK SYSTEM
// ========================================

type HapticType = 'light' | 'medium' | 'heavy' | 'selection' | 'impact' | 'notification';

interface HapticPattern {
  pattern: number[];
  intensity?: number;
}

export class HapticFeedbackManager {
  private isSupported = false;
  private patterns: Record<HapticType, HapticPattern> = {
    light: { pattern: [10], intensity: 0.3 },
    medium: { pattern: [20], intensity: 0.5 },
    heavy: { pattern: [30], intensity: 0.7 },
    selection: { pattern: [5], intensity: 0.2 },
    impact: { pattern: [15, 5, 15], intensity: 0.6 },
    notification: { pattern: [20, 10, 20, 10, 30], intensity: 0.8 }
  };

  constructor() {
    this.detectSupport();
  }

  private detectSupport(): void {
    this.isSupported = (
      'vibrate' in navigator ||
      'Vibration' in window ||
      'DeviceMotionEvent' in window
    );
  }

  trigger(type: HapticType = 'light', customPattern?: number[]): void {
    if (!this.isSupported) return;

    const pattern = customPattern || this.patterns[type].pattern;
    
    try {
      // iOS Safari support
      if ('DeviceMotionEvent' in window && (DeviceMotionEvent as any).requestPermission) {
        this.triggerIOSHaptic(type);
      }
      // Standard Vibration API
      else if ('vibrate' in navigator) {
        navigator.vibrate(pattern);
      }
    } catch (error) {
      // Silently fail for unsupported devices
    }
  }

  private triggerIOSHaptic(type: HapticType): void {
    // iOS-specific haptic feedback would require native bridge
    // For web implementation, we use vibration fallback
    const pattern = this.patterns[type].pattern;
    if ('vibrate' in navigator) {
      navigator.vibrate(pattern);
    }
  }

  triggerSuccess(): void {
    this.trigger('notification');
  }

  triggerError(): void {
    this.trigger('heavy');
  }

  triggerSelection(): void {
    this.trigger('selection');
  }

  triggerImpact(): void {
    this.trigger('impact');
  }
}

export const useHapticFeedback = () => {
  const managerRef = useRef<HapticFeedbackManager | null>(null);
  
  if (!managerRef.current) {
    managerRef.current = new HapticFeedbackManager();
  }

  const triggerHaptic = useCallback((type: HapticType = 'light', customPattern?: number[]) => {
    managerRef.current!.trigger(type, customPattern);
  }, []);

  return {
    triggerHaptic,
    triggerSuccess: managerRef.current.triggerSuccess.bind(managerRef.current),
    triggerError: managerRef.current.triggerError.bind(managerRef.current),
    triggerSelection: managerRef.current.triggerSelection.bind(managerRef.current),
    triggerImpact: managerRef.current.triggerImpact.bind(managerRef.current)
  };
};

// ========================================
// ADVANCED GESTURE RECOGNITION
// ========================================

interface GestureEvent {
  type: 'tap' | 'double-tap' | 'long-press' | 'swipe' | 'pinch' | 'rotate';
  data: any;
  preventDefault: () => void;
}

type GestureHandler = (event: GestureEvent) => void;

export class AdvancedGestureRecognizer {
  private element: Element | null = null;
  private handlers: Map<string, GestureHandler[]> = new Map();
  private touchHistory: Touch[] = [];
  private lastTapTime = 0;
  private longPressTimer?: NodeJS.Timeout;
  private initialDistance = 0;
  private initialAngle = 0;
  private isMultiTouch = false;

  attach(element: Element): void {
    this.element = element;
    this.setupEventListeners();
  }

  detach(): void {
    if (this.element) {
      this.removeEventListeners();
      this.element = null;
    }
  }

  on(gesture: string, handler: GestureHandler): void {
    if (!this.handlers.has(gesture)) {
      this.handlers.set(gesture, []);
    }
    this.handlers.get(gesture)!.push(handler);
  }

  off(gesture: string, handler: GestureHandler): void {
    const handlers = this.handlers.get(gesture);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  private setupEventListeners(): void {
    if (!this.element) return;

    this.element.addEventListener('touchstart', this.handleTouchStart.bind(this) as EventListener, { passive: false });
    this.element.addEventListener('touchmove', this.handleTouchMove.bind(this) as EventListener, { passive: false });
    this.element.addEventListener('touchend', this.handleTouchEnd.bind(this) as EventListener, { passive: false });
    this.element.addEventListener('touchcancel', this.handleTouchCancel.bind(this) as EventListener, { passive: false });
  }

  private removeEventListeners(): void {
    if (!this.element) return;

    this.element.removeEventListener('touchstart', this.handleTouchStart.bind(this) as EventListener);
    this.element.removeEventListener('touchmove', this.handleTouchMove.bind(this) as EventListener);
    this.element.removeEventListener('touchend', this.handleTouchEnd.bind(this) as EventListener);
    this.element.removeEventListener('touchcancel', this.handleTouchCancel.bind(this) as EventListener);
  }

  private handleTouchStart(e: TouchEvent): void {
    this.touchHistory = Array.from(e.touches);
    this.isMultiTouch = e.touches.length > 1;

    if (e.touches.length === 1) {
      // Start long press detection
      this.longPressTimer = setTimeout(() => {
        this.emit('long-press', {
          type: 'long-press',
          data: { touch: e.touches[0] },
          preventDefault: () => e.preventDefault()
        });
      }, 500);
    } else if (e.touches.length === 2) {
      // Initialize pinch/zoom detection
      this.initialDistance = this.getDistance(e.touches[0], e.touches[1]);
      this.initialAngle = this.getAngle(e.touches[0], e.touches[1]);
    }
  }

  private handleTouchMove(e: TouchEvent): void {
    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer);
      this.longPressTimer = undefined;
    }

    if (e.touches.length === 2 && this.touchHistory.length === 2) {
      // Handle pinch/zoom
      const currentDistance = this.getDistance(e.touches[0], e.touches[1]);
      const currentAngle = this.getAngle(e.touches[0], e.touches[1]);
      
      const scaleChange = currentDistance / this.initialDistance;
      const rotationChange = currentAngle - this.initialAngle;

      if (Math.abs(scaleChange - 1) > 0.1) {
        this.emit('pinch', {
          type: 'pinch',
          data: { scale: scaleChange, touches: e.touches },
          preventDefault: () => e.preventDefault()
        });
      }

      if (Math.abs(rotationChange) > 0.1) {
        this.emit('rotate', {
          type: 'rotate',
          data: { rotation: rotationChange, touches: e.touches },
          preventDefault: () => e.preventDefault()
        });
      }
    }
  }

  private handleTouchEnd(e: TouchEvent): void {
    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer);
      this.longPressTimer = undefined;
    }

    if (!this.isMultiTouch && this.touchHistory.length === 1) {
      const touch = this.touchHistory[0];
      const now = Date.now();
      
      // Detect double tap
      if (now - this.lastTapTime < 300) {
        this.emit('double-tap', {
          type: 'double-tap',
          data: { touch },
          preventDefault: () => e.preventDefault()
        });
      } else {
        this.emit('tap', {
          type: 'tap',
          data: { touch },
          preventDefault: () => e.preventDefault()
        });
      }
      
      this.lastTapTime = now;
    }

    // Handle swipe detection
    if (this.touchHistory.length === 1 && e.changedTouches.length === 1) {
      const startTouch = this.touchHistory[0];
      const endTouch = e.changedTouches[0];
      
      const deltaX = endTouch.clientX - startTouch.clientX;
      const deltaY = endTouch.clientY - startTouch.clientY;
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      
      if (distance > 50) { // Minimum swipe distance
        let direction = '';
        if (Math.abs(deltaX) > Math.abs(deltaY)) {
          direction = deltaX > 0 ? 'right' : 'left';
        } else {
          direction = deltaY > 0 ? 'down' : 'up';
        }
        
        this.emit('swipe', {
          type: 'swipe',
          data: { direction, distance, deltaX, deltaY },
          preventDefault: () => e.preventDefault()
        });
      }
    }

    this.touchHistory = [];
    this.isMultiTouch = false;
  }

  private handleTouchCancel(e: TouchEvent): void {
    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer);
      this.longPressTimer = undefined;
    }
    this.touchHistory = [];
    this.isMultiTouch = false;
  }

  private getDistance(touch1: Touch, touch2: Touch): number {
    const dx = touch1.clientX - touch2.clientX;
    const dy = touch1.clientY - touch2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  private getAngle(touch1: Touch, touch2: Touch): number {
    return Math.atan2(touch2.clientY - touch1.clientY, touch2.clientX - touch1.clientX);
  }

  private emit(gesture: string, event: GestureEvent): void {
    const handlers = this.handlers.get(gesture);
    if (handlers) {
      handlers.forEach(handler => handler(event));
    }
  }
}

export const useAdvancedGestures = () => {
  const recognizerRef = useRef<AdvancedGestureRecognizer | null>(null);
  
  if (!recognizerRef.current) {
    recognizerRef.current = new AdvancedGestureRecognizer();
  }

  const attachGestures = useCallback((element: Element) => {
    recognizerRef.current!.attach(element);
  }, []);

  const detachGestures = useCallback(() => {
    recognizerRef.current!.detach();
  }, []);

  const onGesture = useCallback((gesture: string, handler: GestureHandler) => {
    recognizerRef.current!.on(gesture, handler);
  }, []);

  const offGesture = useCallback((gesture: string, handler: GestureHandler) => {
    recognizerRef.current!.off(gesture, handler);
  }, []);

  return {
    attachGestures,
    detachGestures,
    onGesture,
    offGesture
  };
};

// ========================================
// PROMOTION DISPLAY OPTIMIZATION
// ========================================

export const useProMotionOptimization = () => {
  const [refreshRate, setRefreshRate] = useState(60);
  const [supportsProMotion, setSupportsProMotion] = useState(false);
  const animationFrameRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    // Detect ProMotion support (120Hz displays)
    const detectProMotion = () => {
      let frameCount = 0;
      let lastTime = performance.now();
      let measurements: number[] = [];

      const measureRefreshRate = (currentTime: number) => {
        frameCount++;
        
        if (currentTime - lastTime >= 1000) { // Measure over 1 second
          const fps = Math.round((frameCount * 1000) / (currentTime - lastTime));
          measurements.push(fps);
          
          if (measurements.length >= 3) {
            const avgFps = measurements.reduce((a, b) => a + b, 0) / measurements.length;
            setRefreshRate(Math.round(avgFps));
            setSupportsProMotion(avgFps > 90); // Consider 90+ fps as ProMotion
            return;
          }
          
          frameCount = 0;
          lastTime = currentTime;
        }
        
        animationFrameRef.current = requestAnimationFrame(measureRefreshRate);
      };

      animationFrameRef.current = requestAnimationFrame(measureRefreshRate);
    };

    detectProMotion();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  const optimizeForProMotion = useCallback((animationDuration: number) => {
    // Adjust animation duration for high refresh rate displays
    if (supportsProMotion) {
      return animationDuration * 0.8; // Slightly faster animations on ProMotion
    }
    return animationDuration;
  }, [supportsProMotion]);

  const getOptimalFrameRate = useCallback(() => {
    return supportsProMotion ? 120 : 60;
  }, [supportsProMotion]);

  return {
    refreshRate,
    supportsProMotion,
    optimizeForProMotion,
    getOptimalFrameRate
  };
};

// ========================================
// IPAD-SPECIFIC UI OPTIMIZATIONS
// ========================================

export const useIPadUIOptimizations = () => {
  const { iPad, isLandscape, isPortrait } = useMobileOptimizations();
  const { triggerHaptic } = useHapticFeedback();

  const getOptimalGridColumns = useCallback((contentType: 'anime' | 'characters' | 'reviews') => {
    if (!iPad.isIPad) return 2; // Mobile default

    const baseColumns = iPad.gridColumns[contentType] || 3;
    
    // Adjust for orientation
    if (isLandscape) {
      return Math.min(baseColumns + 1, 6);
    }
    
    return baseColumns;
  }, [iPad, isLandscape]);

  const getOptimalTouchTargetSize = useCallback(() => {
    if (iPad.isIPadPro11 || iPad.isIPadPro12) {
      return 48; // Larger targets for Pro models
    } else if (iPad.isIPad) {
      return 44; // Standard iPad targets
    }
    return 40; // Mobile default
  }, [iPad]);

  const shouldUsePointerEvents = useMemo(() => {
    // Enable pointer events for iPad with trackpad/mouse
    return iPad.isIPad && window.matchMedia('(pointer: fine)').matches;
  }, [iPad]);

  const getOptimalSidebarBehavior = useCallback(() => {
    if (!iPad.isIPad) return 'overlay';
    
    if (isLandscape && (iPad.isIPadAir || iPad.isIPadPro11 || iPad.isIPadPro12)) {
      return 'persistent'; // Keep sidebar visible
    }
    
    return 'overlay';
  }, [iPad, isLandscape]);

  return {
    getOptimalGridColumns,
    getOptimalTouchTargetSize,
    shouldUsePointerEvents,
    getOptimalSidebarBehavior,
    triggerHaptic
  };
};

// ========================================
// WEB WORKER INTEGRATION
// ========================================

interface WorkerMessage {
  type: string;
  data: any;
  id: string;
}

export class WebWorkerManager {
  private workers: Map<string, Worker> = new Map();
  private pendingTasks: Map<string, { resolve: Function; reject: Function }> = new Map();

  createWorker(name: string, workerCode: string): void {
    const blob = new Blob([workerCode], { type: 'application/javascript' });
    const worker = new Worker(URL.createObjectURL(blob));
    
    worker.onmessage = (e: MessageEvent<WorkerMessage>) => {
      const { id, data } = e.data;
      const task = this.pendingTasks.get(id);
      if (task) {
        task.resolve(data);
        this.pendingTasks.delete(id);
      }
    };

    worker.onerror = (error) => {
      console.error(`Worker ${name} error:`, error);
    };

    this.workers.set(name, worker);
  }

  async executeTask<T>(workerName: string, type: string, data: any): Promise<T> {
    const worker = this.workers.get(workerName);
    if (!worker) {
      throw new Error(`Worker ${workerName} not found`);
    }

    const id = `task-${Date.now()}-${Math.random()}`;
    
    return new Promise((resolve, reject) => {
      this.pendingTasks.set(id, { resolve, reject });
      worker.postMessage({ type, data, id });

      // Timeout after 30 seconds
      setTimeout(() => {
        if (this.pendingTasks.has(id)) {
          this.pendingTasks.delete(id);
          reject(new Error('Worker task timeout'));
        }
      }, 30000);
    });
  }

  terminateWorker(name: string): void {
    const worker = this.workers.get(name);
    if (worker) {
      worker.terminate();
      this.workers.delete(name);
    }
  }

  terminateAll(): void {
    this.workers.forEach(worker => worker.terminate());
    this.workers.clear();
    this.pendingTasks.clear();
  }
}

export const useWebWorkers = () => {
  const managerRef = useRef<WebWorkerManager | null>(null);
  
  if (!managerRef.current) {
    managerRef.current = new WebWorkerManager();
  }

  useEffect(() => {
    // Create performance-critical workers
    const filterWorkerCode = `
      self.onmessage = function(e) {
        const { type, data, id } = e.data;
        
        switch(type) {
          case 'FILTER_ANIME':
            const filtered = data.anime.filter(anime => 
              anime.title.toLowerCase().includes(data.query.toLowerCase()) ||
              anime.genres.some(genre => genre.toLowerCase().includes(data.query.toLowerCase()))
            );
            self.postMessage({ type: 'FILTER_RESULT', data: filtered, id });
            break;
            
          case 'SORT_RECOMMENDATIONS':
            const sorted = [...data.recommendations].sort((a, b) => {
              if (data.sortBy === 'rating') return b.rating - a.rating;
              if (data.sortBy === 'year') return b.year - a.year;
              return b.moodMatchScore - a.moodMatchScore;
            });
            self.postMessage({ type: 'SORT_RESULT', data: sorted, id });
            break;
            
          case 'CALCULATE_SIMILARITY':
            // Complex similarity calculations
            const similarity = data.anime1.genres.filter(g => 
              data.anime2.genres.includes(g)
            ).length / Math.max(data.anime1.genres.length, data.anime2.genres.length);
            self.postMessage({ type: 'SIMILARITY_RESULT', data: similarity, id });
            break;
        }
      };
    `;

    if (managerRef.current) {
      managerRef.current.createWorker('filter', filterWorkerCode);
    }

    return () => {
      managerRef.current?.terminateAll();
    };
  }, []);

  const filterAnime = useCallback(async (anime: any[], query: string) => {
    if (!managerRef.current) throw new Error('WebWorkerManager not initialized');
    return managerRef.current.executeTask('filter', 'FILTER_ANIME', { anime, query });
  }, []);

  const sortRecommendations = useCallback(async (recommendations: any[], sortBy: string) => {
    if (!managerRef.current) throw new Error('WebWorkerManager not initialized');
    return managerRef.current.executeTask('filter', 'SORT_RECOMMENDATIONS', { recommendations, sortBy });
  }, []);

  const calculateSimilarity = useCallback(async (anime1: any, anime2: any) => {
    if (!managerRef.current) throw new Error('WebWorkerManager not initialized');
    return managerRef.current.executeTask('filter', 'CALCULATE_SIMILARITY', { anime1, anime2 });
  }, []);

  return {
    filterAnime,
    sortRecommendations,
    calculateSimilarity,
    manager: managerRef.current
  };
};
