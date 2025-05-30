// src/components/debug/PerformanceMonitor.tsx - Real-time Performance Debugging
import React, { useState, useEffect, useCallback, memo } from 'react';
import { useMobileOptimizations } from '../../../../convex/useMobileOptimizations';

interface PerformanceData {
  fps: number;
  memoryUsage?: {
    used: number;
    total: number;
    percentage: number;
  };
  renderTime: number;
  componentCount: number;
  networkSpeed?: string;
  batteryLevel?: number;
  isCharging?: boolean;
  deviceInfo: {
    isMobile: boolean;
    isIOS: boolean;
    pixelRatio: number;
    screenSize: string;
  };
}

interface PerformanceAlert {
  type: 'warning' | 'error' | 'info';
  message: string;
  timestamp: number;
}

const PerformanceMonitorComponent: React.FC<{
  isVisible?: boolean;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
}> = ({ isVisible = true, position = 'top-right' }) => {
  const [performanceData, setPerformanceData] = useState<PerformanceData>({
    fps: 0,
    renderTime: 0,
    componentCount: 0,
    deviceInfo: {
      isMobile: false,
      isIOS: false,
      pixelRatio: 1,
      screenSize: '0x0'
    }
  });

  const [alerts, setAlerts] = useState<PerformanceAlert[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [history, setHistory] = useState<number[]>([]);

  const mobileOptimizations = useMobileOptimizations();

  // FPS monitoring
  const monitorFPS = useCallback(() => {
    let frameCount = 0;
    let lastTime = performance.now();
    let animationId: number;

    const tick = (currentTime: number) => {
      frameCount++;
      
      if (currentTime >= lastTime + 1000) {
        const fps = Math.round((frameCount * 1000) / (currentTime - lastTime));
        
        setPerformanceData(prev => ({
          ...prev,
          fps
        }));

        setHistory(prev => {
          const newHistory = [...prev, fps].slice(-20); // Keep last 20 readings
          return newHistory;
        });

        // Performance alerts
        if (fps < 20) {
          addAlert('error', `Very low FPS: ${fps}`);
        } else if (fps < 30) {
          addAlert('warning', `Low FPS: ${fps}`);
        }

        frameCount = 0;
        lastTime = currentTime;
      }
      
      animationId = requestAnimationFrame(tick);
    };

    animationId = requestAnimationFrame(tick);
    
    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, []);

  // Memory monitoring
  const monitorMemory = useCallback(() => {
    if ('memory' in performance) {
      const memInfo = (performance as any).memory;
      const memoryUsage = {
        used: Math.round(memInfo.usedJSHeapSize / 1024 / 1024),
        total: Math.round(memInfo.jsHeapSizeLimit / 1024 / 1024),
        percentage: Math.round((memInfo.usedJSHeapSize / memInfo.jsHeapSizeLimit) * 100)
      };

      setPerformanceData(prev => ({
        ...prev,
        memoryUsage
      }));

      // Memory alerts
      if (memoryUsage.percentage > 90) {
        addAlert('error', `Critical memory usage: ${memoryUsage.percentage}%`);
      } else if (memoryUsage.percentage > 70) {
        addAlert('warning', `High memory usage: ${memoryUsage.percentage}%`);
      }
    }
  }, []);

  // Render time monitoring
  const monitorRenderTime = useCallback(() => {
    const startTime = performance.now();
    
    return () => {
      const endTime = performance.now();
      const renderTime = Math.round(endTime - startTime);
      
      setPerformanceData(prev => ({
        ...prev,
        renderTime
      }));

      if (renderTime > 16) { // More than 16ms indicates <60fps
        addAlert('warning', `Slow render: ${renderTime}ms`);
      }
    };
  }, []);

  // Component count monitoring
  const countComponents = useCallback(() => {
    const allElements = document.querySelectorAll('*');
    const reactElements = Array.from(allElements).filter(el => 
      el.hasAttribute('data-reactroot') || 
      el.className?.toString().includes('react') ||
      (el as any)._reactInternalFiber
    );

    setPerformanceData(prev => ({
      ...prev,
      componentCount: reactElements.length
    }));
  }, []);

  // Network monitoring
  const monitorNetwork = useCallback(() => {
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      setPerformanceData(prev => ({
        ...prev,
        networkSpeed: connection?.effectiveType || 'unknown'
      }));

      if (connection?.effectiveType === 'slow-2g' || connection?.effectiveType === '2g') {
        addAlert('warning', 'Slow network connection detected');
      }
    }
  }, []);

  // Battery monitoring
  const monitorBattery = useCallback(async () => {
    if ('getBattery' in navigator) {
      try {
        const battery = await (navigator as any).getBattery();
        
        setPerformanceData(prev => ({
          ...prev,
          batteryLevel: Math.round(battery.level * 100),
          isCharging: battery.charging
        }));

        if (battery.level < 0.2 && !battery.charging) {
          addAlert('warning', 'Low battery - consider reducing animations');
        }
      } catch (error) {
        // Battery API not available
      }
    }
  }, []);

  // Device info monitoring
  const monitorDeviceInfo = useCallback(() => {
    setPerformanceData(prev => ({
      ...prev,
      deviceInfo: {
        isMobile: /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent),
        isIOS: /iPad|iPhone|iPod/.test(navigator.userAgent),
        pixelRatio: window.devicePixelRatio || 1,
        screenSize: `${window.innerWidth}x${window.innerHeight}`
      }
    }));
  }, []);

  const addAlert = useCallback((type: PerformanceAlert['type'], message: string) => {
    const alert: PerformanceAlert = {
      type,
      message,
      timestamp: Date.now()
    };

    setAlerts(prev => {
      // Avoid duplicate alerts
      const isDuplicate = prev.some(a => 
        a.message === message && 
        Date.now() - a.timestamp < 5000 // Within 5 seconds
      );
      
      if (isDuplicate) return prev;
      
      return [alert, ...prev.slice(0, 4)]; // Keep only last 5 alerts
    });

    // Auto-remove alert after 10 seconds
    setTimeout(() => {
      setAlerts(prev => prev.filter(a => a.timestamp !== alert.timestamp));
    }, 10000);
  }, []);

  useEffect(() => {
    if (!isVisible) return;

    // Start monitoring
    const cleanupFPS = monitorFPS();
    
    const intervals = [
      setInterval(monitorMemory, 2000),
      setInterval(countComponents, 5000),
      setInterval(monitorNetwork, 10000),
      setInterval(monitorBattery, 30000),
      setInterval(monitorDeviceInfo, 1000)
    ];

    // Initial measurements
    monitorMemory();
    countComponents();
    monitorNetwork();
    monitorBattery();
    monitorDeviceInfo();

    return () => {
      cleanupFPS();
      intervals.forEach(clearInterval);
    };
  }, [isVisible, monitorFPS, monitorMemory, countComponents, monitorNetwork, monitorBattery, monitorDeviceInfo]);

  // Render time monitoring hook
  useEffect(() => {
    const cleanup = monitorRenderTime();
    return cleanup;
  });

  if (!isVisible || process.env.NODE_ENV !== 'development') {
    return null;
  }

  const getPositionClasses = () => {
    switch (position) {
      case 'top-left': return 'top-4 left-4';
      case 'top-right': return 'top-4 right-4';
      case 'bottom-left': return 'bottom-4 left-4';
      case 'bottom-right': return 'bottom-4 right-4';
      default: return 'top-4 right-4';
    }
  };

  const getFPSColor = (fps: number) => {
    if (fps >= 55) return 'text-green-400';
    if (fps >= 30) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getMemoryColor = (percentage?: number) => {
    if (!percentage) return 'text-gray-400';
    if (percentage >= 80) return 'text-red-400';
    if (percentage >= 60) return 'text-yellow-400';
    return 'text-green-400';
  };

  return (
    <div className={`fixed ${getPositionClasses()} z-[9999] font-mono text-xs`}>
      {/* Alerts */}
      <div className="mb-2 space-y-1">
        {alerts.map((alert, index) => (
          <div
            key={`${alert.timestamp}-${index}`}
            className={`px-2 py-1 rounded text-white shadow-lg animate-fade-in ${
              alert.type === 'error' ? 'bg-red-600' :
              alert.type === 'warning' ? 'bg-yellow-600' :
              'bg-blue-600'
            }`}
          >
            {alert.message}
          </div>
        ))}
      </div>

      {/* Main Monitor */}
      <div className="bg-black/90 backdrop-blur-sm border border-white/20 rounded-lg shadow-xl overflow-hidden">
        {/* Header */}
        <div 
          className="px-3 py-2 bg-gray-800 cursor-pointer flex justify-between items-center"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${performanceData.fps > 30 ? 'bg-green-400' : 'bg-red-400'} animate-pulse`}></div>
            <span className="text-white font-medium">Performance</span>
          </div>
          <svg 
            className={`w-4 h-4 text-white transition-transform ${isExpanded ? 'rotate-180' : ''}`} 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
          </svg>
        </div>

        {/* Compact View */}
        <div className="px-3 py-2 text-white space-y-1">
          <div className="flex justify-between">
            <span>FPS:</span>
            <span className={getFPSColor(performanceData.fps)}>
              {performanceData.fps}
            </span>
          </div>
          
          {performanceData.memoryUsage && (
            <div className="flex justify-between">
              <span>Memory:</span>
              <span className={getMemoryColor(performanceData.memoryUsage.percentage)}>
                {performanceData.memoryUsage.percentage}%
              </span>
            </div>
          )}
        </div>

        {/* Expanded View */}
        {isExpanded && (
          <div className="px-3 py-2 border-t border-white/20 text-white space-y-2">
            {/* FPS History Graph */}
            <div>
              <div className="text-xs text-gray-300 mb-1">FPS History:</div>
              <div className="flex items-end space-x-1 h-8">
                {history.map((fps, index) => (
                  <div
                    key={index}
                    className={`w-1 ${getFPSColor(fps).replace('text-', 'bg-')} opacity-80`}
                    style={{ height: `${Math.min((fps / 60) * 100, 100)}%` }}
                  />
                ))}
              </div>
            </div>

            {/* Detailed Stats */}
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span>Render Time:</span>
                <span className={performanceData.renderTime > 16 ? 'text-red-400' : 'text-green-400'}>
                  {performanceData.renderTime}ms
                </span>
              </div>
              
              <div className="flex justify-between">
                <span>Components:</span>
                <span className="text-blue-400">{performanceData.componentCount}</span>
              </div>
              
              {performanceData.networkSpeed && (
                <div className="flex justify-between">
                  <span>Network:</span>
                  <span className={
                    performanceData.networkSpeed.includes('2g') ? 'text-red-400' :
                    performanceData.networkSpeed.includes('3g') ? 'text-yellow-400' :
                    'text-green-400'
                  }>
                    {performanceData.networkSpeed}
                  </span>
                </div>
              )}
              
              {performanceData.batteryLevel !== undefined && (
                <div className="flex justify-between">
                  <span>Battery:</span>
                  <span className={
                    performanceData.batteryLevel < 20 ? 'text-red-400' :
                    performanceData.batteryLevel < 50 ? 'text-yellow-400' :
                    'text-green-400'
                  }>
                    {performanceData.batteryLevel}% {performanceData.isCharging ? '⚡' : '🔋'}
                  </span>
                </div>
              )}
            </div>

            {/* Device Info */}
            <div className="pt-2 border-t border-white/20 text-xs">
              <div className="text-gray-300 mb-1">Device:</div>
              <div className="space-y-1">
                <div>{performanceData.deviceInfo.screenSize}</div>
                <div className="flex space-x-2">
                  {performanceData.deviceInfo.isMobile && <span className="text-blue-400">📱 Mobile</span>}
                  {performanceData.deviceInfo.isIOS && <span className="text-blue-400">🍎 iOS</span>}
                  <span className="text-gray-400">DPR: {performanceData.deviceInfo.pixelRatio}</span>
                </div>
              </div>
            </div>

            {/* Optimization Status */}
            <div className="pt-2 border-t border-white/20 text-xs">
              <div className="text-gray-300 mb-1">Optimizations:</div>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span>Animations:</span>
                  <span className={mobileOptimizations.shouldReduceAnimations ? 'text-yellow-400' : 'text-green-400'}>
                    {mobileOptimizations.shouldReduceAnimations ? 'Reduced' : 'Full'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Particles:</span>
                  <span className={mobileOptimizations.shouldDisableParticles ? 'text-red-400' : 'text-green-400'}>
                    {mobileOptimizations.shouldDisableParticles ? 'Disabled' : 'Enabled'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Backgrounds:</span>
                  <span className={mobileOptimizations.shouldUseSimpleBackgrounds ? 'text-yellow-400' : 'text-green-400'}>
                    {mobileOptimizations.shouldUseSimpleBackgrounds ? 'Simple' : 'Complex'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Reduced Motion:</span>
                  <span className={mobileOptimizations.prefersReducedMotion ? 'text-yellow-400' : 'text-green-400'}>
                    {mobileOptimizations.prefersReducedMotion ? 'Yes' : 'No'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Mobile Device:</span>
                  <span className={mobileOptimizations.isMobile ? 'text-blue-400' : 'text-gray-400'}>
                    {mobileOptimizations.isMobile ? 'Yes' : 'No'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Low End Device:</span>
                  <span className={mobileOptimizations.isLowEndDevice ? 'text-red-400' : 'text-green-400'}>
                    {mobileOptimizations.isLowEndDevice ? 'Yes' : 'No'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};

export default memo(PerformanceMonitorComponent);

// Hook for easy integration
export const usePerformanceMonitor = (enabled: boolean = true) => {
  return {
    PerformanceMonitor: () => <PerformanceMonitorComponent isVisible={enabled} />
  };
};