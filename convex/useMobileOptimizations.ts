import { useEffect, useState } from 'react';

export const useMobileOptimizations = () => {
  const [isMobile, setIsMobile] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [hasNotch, setHasNotch] = useState(false);
  const [isLowBandwidth, setIsLowBandwidth] = useState(false);

  useEffect(() => {
    // Detect mobile
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
      setIsIOS(/iPad|iPhone|iPod/.test(navigator.userAgent));
    };

    // Detect notch
    const checkNotch = () => {
      if (CSS.supports('padding-left: env(safe-area-inset-left)')) {
        const testDiv = document.createElement('div');
        testDiv.style.paddingLeft = 'env(safe-area-inset-left)';
        document.body.appendChild(testDiv);
        const paddingValue = parseInt(window.getComputedStyle(testDiv).paddingLeft);
        document.body.removeChild(testDiv);
        setHasNotch(paddingValue > 0);
      }
    };

    // Detect low bandwidth
    const checkBandwidth = () => {
      if ('connection' in navigator) {
        const connection = (navigator as any).connection;
        if (connection) {
          const slowConnections = ['slow-2g', '2g', '3g'];
          setIsLowBandwidth(slowConnections.includes(connection.effectiveType));
        }
      }
    };

    checkMobile();
    checkNotch();
    checkBandwidth();

    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Apply mobile-specific optimizations
  useEffect(() => {
    if (isLowBandwidth) {
      document.body.classList.add('low-bandwidth');
    } else {
      document.body.classList.remove('low-bandwidth');
    }

    if (isMobile) {
      document.body.classList.add('mobile-device');
    } else {
      document.body.classList.remove('mobile-device');
    }

    if (isIOS) {
      document.body.classList.add('ios-device');
    } else {
      document.body.classList.remove('ios-device');
    }
  }, [isMobile, isIOS, isLowBandwidth]);

  return { isMobile, isIOS, hasNotch, isLowBandwidth };
};