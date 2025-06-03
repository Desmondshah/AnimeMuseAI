// hooks/useMoodBoardPerformance.ts
import { useEffect, useCallback } from 'react';

interface PerformanceMetrics {
  renderTime: number;
  interactionLatency: number;
  memoryUsage?: number;
}

export const useMoodBoardPerformance = (enabled: boolean = false) => {
  const measureRenderTime = useCallback(() => {
    if (!enabled) return;
    
    const startTime = performance.now();
    
    // Use requestAnimationFrame to measure render completion
    requestAnimationFrame(() => {
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      
      if (renderTime > 100) {
        console.warn(`Slow mood board render: ${renderTime.toFixed(2)}ms`);
      }
    });
  }, [enabled]);

  const measureInteractionLatency = useCallback((interactionType: string) => {
    if (!enabled) return () => {};
    
    const startTime = performance.now();
    
    return () => {
      const endTime = performance.now();
      const latency = endTime - startTime;
      
      if (latency > 50) {
        console.warn(`Slow ${interactionType} interaction: ${latency.toFixed(2)}ms`);
      }
    };
  }, [enabled]);

  const checkMemoryUsage = useCallback(() => {
    if (!enabled || !('memory' in performance)) return;
    
    const memory = (performance as any).memory;
    const usedMB = memory.usedJSHeapSize / 1024 / 1024;
    
    if (usedMB > 100) {
      console.warn(`High memory usage: ${usedMB.toFixed(2)}MB`);
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    
    measureRenderTime();
    
    const interval = setInterval(checkMemoryUsage, 5000);
    return () => clearInterval(interval);
  }, [enabled, measureRenderTime, checkMemoryUsage]);

  return {
    measureRenderTime,
    measureInteractionLatency,
    checkMemoryUsage
  };
};