// utils/performanceMonitor.ts
interface PerformanceMetrics {
  renderTime: number;
  interactionLatency: number;
  memoryUsage: number;
  cueCount: number;
  timestamp: number;
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
