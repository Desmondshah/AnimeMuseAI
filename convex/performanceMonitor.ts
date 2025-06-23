// utils/performanceMonitor.ts
import { useEffect, useState, useCallback } from 'react';

interface PerformanceMetrics {
  renderTime: number;
  interactionLatency: number;
  memoryUsage: number;
  cueCount: number;
  timestamp: number;
}

interface SafariPerformanceMetrics {
  imageLoadingLatency: number;
  safariSpecificLag: number;
  memoryPressure: number;
  networkEffectiveType: string;
  userAgentInfo: {
    isSafari: boolean;
    isMobileSafari: boolean;
    safariVersion: string;
    isIOSDevice: boolean;
  };
}

export class MoodBoardPerformanceMonitor {
  private metrics: PerformanceMetrics[] = [];
  private renderStartTime: number = 0;
  private interactionStartTime: number = 0;

  startRenderMeasurement(): void {
    this.renderStartTime = performance.now();
  }

  endRenderMeasurement(cueCount: number): void {
    const renderTime = performance.now() - this.renderStartTime;
    this.recordMetric('render', renderTime, cueCount);
  }

  startInteractionMeasurement(): void {
    this.interactionStartTime = performance.now();
  }

  endInteractionMeasurement(cueCount: number): void {
    const interactionLatency = performance.now() - this.interactionStartTime;
    this.recordMetric('interaction', interactionLatency, cueCount);
  }

  private recordMetric(type: 'render' | 'interaction', time: number, cueCount: number): void {
    const memory = this.getMemoryUsage();
    
    const metric: PerformanceMetrics = {
      renderTime: type === 'render' ? time : 0,
      interactionLatency: type === 'interaction' ? time : 0,
      memoryUsage: memory,
      cueCount,
      timestamp: Date.now()
    };

    this.metrics.push(metric);
    
    // Keep only last 100 measurements
    if (this.metrics.length > 100) {
      this.metrics = this.metrics.slice(-100);
    }

    // Log performance warnings
    if (type === 'render' && time > 100) {
      console.warn(`🐌 Slow mood board render: ${time.toFixed(2)}ms with ${cueCount} cues`);
    }
    
    if (type === 'interaction' && time > 50) {
      console.warn(`🐌 Slow mood board interaction: ${time.toFixed(2)}ms`);
    }

    if (memory > 50) {
      console.warn(`🧠 High memory usage: ${memory.toFixed(2)}MB`);
    }
  }

  private getMemoryUsage(): number {
    if ('memory' in performance) {
      return (performance as any).memory.usedJSHeapSize / 1024 / 1024;
    }
    return 0;
  }

  getAverageMetrics(): {
    avgRenderTime: number;
    avgInteractionLatency: number;
    avgMemoryUsage: number;
  } {
    if (this.metrics.length === 0) {
      return { avgRenderTime: 0, avgInteractionLatency: 0, avgMemoryUsage: 0 };
    }

    const totals = this.metrics.reduce(
      (acc, metric) => ({
        renderTime: acc.renderTime + metric.renderTime,
        interactionLatency: acc.interactionLatency + metric.interactionLatency,
        memoryUsage: acc.memoryUsage + metric.memoryUsage
      }),
      { renderTime: 0, interactionLatency: 0, memoryUsage: 0 }
    );

    return {
      avgRenderTime: totals.renderTime / this.metrics.length,
      avgInteractionLatency: totals.interactionLatency / this.metrics.length,
      avgMemoryUsage: totals.memoryUsage / this.metrics.length
    };
  }

  generatePerformanceReport(): string {
    const avg = this.getAverageMetrics();
    const recent = this.metrics.slice(-10);
    
    return `
📊 Mood Board Performance Report
================================
Average Metrics (${this.metrics.length} measurements):
• Render Time: ${avg.avgRenderTime.toFixed(2)}ms
• Interaction Latency: ${avg.avgInteractionLatency.toFixed(2)}ms
• Memory Usage: ${avg.avgMemoryUsage.toFixed(2)}MB

Recent Performance:
${recent.map(m => `• ${m.timestamp}: ${m.renderTime || m.interactionLatency}ms (${m.cueCount} cues)`).join('\n')}

Performance Status: ${this.getPerformanceStatus(avg)}
    `.trim();
  }

  private getPerformanceStatus(avg: ReturnType<typeof this.getAverageMetrics>): string {
    if (avg.avgRenderTime > 200 || avg.avgInteractionLatency > 100) {
      return '🔴 Poor - Consider optimizations';
    }
    if (avg.avgRenderTime > 100 || avg.avgInteractionLatency > 50) {
      return '🟡 Fair - Some optimization needed';
    }
    return '🟢 Good - Performance is optimal';
  }
}

export const useSafariPerformanceMonitor = () => {
  const [metrics, setMetrics] = useState<SafariPerformanceMetrics>({
    imageLoadingLatency: 0,
    safariSpecificLag: 0,
    memoryPressure: 0,
    networkEffectiveType: 'unknown',
    userAgentInfo: {
      isSafari: false,
      isMobileSafari: false,
      safariVersion: '',
      isIOSDevice: false,
    },
  });

  const detectUserAgent = useCallback(() => {
    const ua = navigator.userAgent;
    const isSafari = /^((?!chrome|android).)*safari/i.test(ua);
    const isMobileSafari = /iPad|iPhone|iPod/.test(ua) && /Safari/.test(ua);
    const isIOSDevice = /iPad|iPhone|iPod/.test(ua);
    
    // Extract Safari version
    const safariVersionMatch = ua.match(/Version\/([0-9]+)/);
    const safariVersion = safariVersionMatch ? safariVersionMatch[1] : '';

    return {
      isSafari,
      isMobileSafari,
      safariVersion,
      isIOSDevice,
    };
  }, []);

  const measureImageLoadingPerformance = useCallback(() => {
    const startTime = performance.now();
    
    return {
      start: () => startTime,
      end: () => {
        const endTime = performance.now();
        const latency = endTime - startTime;
        
        setMetrics(prev => ({
          ...prev,
          imageLoadingLatency: latency,
        }));
        
        // Log if performance is concerning (Safari specific)
        if (latency > 1000) {
          console.warn(`[Safari Performance] Slow image loading detected: ${latency}ms`);
        }
        
        return latency;
      },
    };
  }, []);

  const detectMemoryPressure = useCallback(() => {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      const pressure = memory.usedJSHeapSize / memory.jsHeapSizeLimit;
      
      setMetrics(prev => ({
        ...prev,
        memoryPressure: pressure,
      }));
      
      return pressure;
    }
    return 0;
  }, []);

  const detectNetworkType = useCallback(() => {
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      const effectiveType = connection?.effectiveType || 'unknown';
      
      setMetrics(prev => ({
        ...prev,
        networkEffectiveType: effectiveType,
      }));
      
      return effectiveType;
    }
    return 'unknown';
  }, []);

  useEffect(() => {
    // Initialize user agent detection
    const userAgentInfo = detectUserAgent();
    setMetrics(prev => ({
      ...prev,
      userAgentInfo,
    }));

    // Monitor memory and network periodically
    const interval = setInterval(() => {
      detectMemoryPressure();
      detectNetworkType();
    }, 5000);

    // Safari-specific performance recommendations
    if (userAgentInfo.isMobileSafari) {
      console.log('🍎 [Safari Performance] Mobile Safari detected - applying optimizations');
      
      // Add Safari-specific monitoring
      const safariOptimizations = {
        'Reduce animations': 'Consider enabling animation reduction',
        'Optimize images': 'Use WebP format where possible',
        'Minimize DOM complexity': 'Reduce number of elements in viewport',
        'Use hardware acceleration': 'Apply transform3d() to animated elements',
      };
      
      console.table(safariOptimizations);
    }

    return () => clearInterval(interval);
  }, [detectUserAgent, detectMemoryPressure, detectNetworkType]);

  return {
    metrics,
    measureImageLoadingPerformance,
    detectMemoryPressure,
    detectNetworkType,
    // Performance recommendations based on current metrics
    getPerformanceRecommendations: (): string[] => {
      const recommendations: string[] = [];
      
      if (metrics.imageLoadingLatency > 800) {
        recommendations.push('Consider image optimization or lazy loading');
      }
      
      if (metrics.memoryPressure > 0.8) {
        recommendations.push('High memory usage detected - consider reducing active elements');
      }
      
      if (metrics.networkEffectiveType === '2g' || metrics.networkEffectiveType === 'slow-2g') {
        recommendations.push('Slow network detected - enable low bandwidth mode');
      }
      
      if (metrics.userAgentInfo.isMobileSafari && metrics.imageLoadingLatency > 1000) {
        recommendations.push('Mobile Safari optimization needed - apply hardware acceleration');
      }
      
      return recommendations;
    },
  };
};
