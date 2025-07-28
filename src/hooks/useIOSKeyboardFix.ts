// src/hooks/useIOSKeyboardFix.ts - iOS Keyboard Detection and Viewport Management
import { useState, useEffect } from 'react';

interface IOSKeyboardState {
  keyboardHeight: number;
  isKeyboardVisible: boolean;
  viewportHeight: number;
  isIOS: boolean;
  safeAreaBottom: number;
}

export const useIOSKeyboardFix = (): IOSKeyboardState => {
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [viewportHeight, setViewportHeight] = useState(window.innerHeight);
  const [isIOS, setIsIOS] = useState(false);
  const [safeAreaBottom, setSafeAreaBottom] = useState(0);

  useEffect(() => {
    // Detect iOS with better accuracy
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
                (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    setIsIOS(iOS);

    // Get initial safe area
    const computedStyle = getComputedStyle(document.documentElement);
    const safeBottom = parseInt(computedStyle.getPropertyValue('--safe-area-inset-bottom') || '0');
    setSafeAreaBottom(safeBottom);

    // Store initial viewport height
    const initialHeight = window.innerHeight;
    setViewportHeight(initialHeight);

    // Set CSS custom properties for consistent viewport handling
    document.documentElement.style.setProperty('--initial-vh', `${initialHeight}px`);
    document.documentElement.style.setProperty('--current-vh', `${initialHeight}px`);

    const handleKeyboardChange = (currentHeight: number) => {
      const heightDiff = initialHeight - currentHeight;
      
      // Keyboard threshold - account for iOS Safari address bar changes
      const keyboardThreshold = iOS ? 150 : 100;
      
      if (heightDiff > keyboardThreshold) {
        // Keyboard is visible
        setKeyboardHeight(heightDiff);
        setIsKeyboardVisible(true);
        setViewportHeight(currentHeight);
        
        // Update CSS custom properties
        document.documentElement.style.setProperty('--keyboard-height', `${heightDiff}px`);
        document.documentElement.style.setProperty('--current-vh', `${currentHeight}px`);
        document.documentElement.style.setProperty('--available-height', `${currentHeight - safeBottom}px`);
        document.documentElement.classList.add('keyboard-visible');
        
        // Emit custom event for components that need to react
        window.dispatchEvent(new CustomEvent('keyboardVisible', { 
          detail: { height: heightDiff, viewportHeight: currentHeight } 
        }));
      } else {
        // Keyboard is hidden
        setKeyboardHeight(0);
        setIsKeyboardVisible(false);
        setViewportHeight(initialHeight);
        
        // Reset CSS custom properties
        document.documentElement.style.setProperty('--keyboard-height', '0px');
        document.documentElement.style.setProperty('--current-vh', `${initialHeight}px`);
        document.documentElement.style.setProperty('--available-height', `${initialHeight - safeBottom}px`);
        document.documentElement.classList.remove('keyboard-visible');
        
        // Emit custom event
        window.dispatchEvent(new CustomEvent('keyboardHidden', { 
          detail: { viewportHeight: initialHeight } 
        }));
      }
    };

    // Use Visual Viewport API when available (better for iOS)
    if (window.visualViewport && iOS) {
      const handleVisualViewportChange = () => {
        const currentHeight = window.visualViewport!.height;
        handleKeyboardChange(currentHeight);
      };

      // Initial setup
      handleVisualViewportChange();
      
      window.visualViewport.addEventListener('resize', handleVisualViewportChange);
      
      return () => {
        window.visualViewport?.removeEventListener('resize', handleVisualViewportChange);
        document.documentElement.classList.remove('keyboard-visible');
        
        // Clean up CSS properties
        document.documentElement.style.removeProperty('--keyboard-height');
        document.documentElement.style.removeProperty('--current-vh');
        document.documentElement.style.removeProperty('--available-height');
      };
    } else {
      // Fallback for older browsers or non-iOS devices
      const handleWindowResize = () => {
        const currentHeight = window.innerHeight;
        handleKeyboardChange(currentHeight);
      };

      // Debounce resize events
      let resizeTimeout: NodeJS.Timeout;
      const debouncedResize = () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(handleWindowResize, 100);
      };

      window.addEventListener('resize', debouncedResize);
      
      return () => {
        window.removeEventListener('resize', debouncedResize);
        clearTimeout(resizeTimeout);
        document.documentElement.classList.remove('keyboard-visible');
        
        // Clean up CSS properties
        document.documentElement.style.removeProperty('--keyboard-height');
        document.documentElement.style.removeProperty('--current-vh');
        document.documentElement.style.removeProperty('--available-height');
      };
    }
  }, [isIOS, safeAreaBottom]);

  // Update safe area when orientation changes
  useEffect(() => {
    const handleOrientationChange = () => {
      setTimeout(() => {
        const computedStyle = getComputedStyle(document.documentElement);
        const safeBottom = parseInt(computedStyle.getPropertyValue('--safe-area-inset-bottom') || '0');
        setSafeAreaBottom(safeBottom);
      }, 500); // Delay to let orientation change complete
    };

    window.addEventListener('orientationchange', handleOrientationChange);
    return () => window.removeEventListener('orientationchange', handleOrientationChange);
  }, []);

  return {
    keyboardHeight,
    isKeyboardVisible,
    viewportHeight,
    isIOS,
    safeAreaBottom,
  };
};

export default useIOSKeyboardFix;
