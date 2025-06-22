// src/components/animuse/StreamingOverlay.tsx - In-App Anime Streaming Viewer
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Maximize2, Minimize2, ExternalLink, RefreshCw, ArrowLeft, ArrowRight, Settings } from 'lucide-react';

interface ColorPalette {
  primary: string;
  secondary: string;
  accent: string;
  light: string;
  dark: string;
  gradient: string;
  gradientReverse: string;
}

interface StreamingEpisode {
  title?: string;
  thumbnail?: string;
  url?: string;
  site?: string;
  previewUrl?: string;
  duration?: string;
  airDate?: string;
  episodeNumber?: number;
}

interface StreamingOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  episode: StreamingEpisode | null;
  animeTitle: string;
  episodes?: StreamingEpisode[];
  currentEpisodeIndex?: number;
  onEpisodeChange?: (index: number) => void;
  themePalette?: ColorPalette;
}

export const StreamingOverlay: React.FC<StreamingOverlayProps> = ({
  isOpen,
  onClose,
  episode,
  animeTitle,
  episodes = [],
  currentEpisodeIndex = 0,
  onEpisodeChange,
  themePalette
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [streamingMethod, setStreamingMethod] = useState<'iframe' | 'popup'>('iframe');
  const [showControls, setShowControls] = useState(true);
  const [popupWindow, setPopupWindow] = useState<Window | null>(null);
  
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout>();

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      switch (e.key) {
        case 'Escape':
          if (isFullscreen) {
            setIsFullscreen(false);
          } else {
            onClose();
          }
          break;
        case 'f':
        case 'F':
          setIsFullscreen(!isFullscreen);
          break;
        case 'ArrowLeft':
          if (episodes.length > 1 && currentEpisodeIndex > 0) {
            onEpisodeChange?.(currentEpisodeIndex - 1);
          }
          break;
        case 'ArrowRight':
          if (episodes.length > 1 && currentEpisodeIndex < episodes.length - 1) {
            onEpisodeChange?.(currentEpisodeIndex + 1);
          }
          break;
        case 'r':
        case 'R':
          handleRefresh();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isFullscreen, currentEpisodeIndex, episodes.length, onClose, onEpisodeChange]);

  // Auto-hide controls
  useEffect(() => {
    if (!isOpen) return;

    const resetControlsTimeout = () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
      setShowControls(true);
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    };

    const handleMouseMove = () => resetControlsTimeout();
    const handleMouseLeave = () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
      setShowControls(false);
    };

    resetControlsTimeout();
    document.addEventListener('mousemove', handleMouseMove);
    overlayRef.current?.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
      document.removeEventListener('mousemove', handleMouseMove);
      overlayRef.current?.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [isOpen]);

  // Cleanup popup window on unmount
  useEffect(() => {
    return () => {
      if (popupWindow && !popupWindow.closed) {
        popupWindow.close();
      }
    };
  }, [popupWindow]);

  const handleRefresh = useCallback(() => {
    setIsLoading(true);
    setHasError(false);
    
    if (streamingMethod === 'iframe' && iframeRef.current) {
      iframeRef.current.src = episode?.url || '';
    } else if (popupWindow && !popupWindow.closed) {
      popupWindow.location.reload();
    }
  }, [episode?.url, streamingMethod, popupWindow]);

  const handleOpenInPopup = useCallback(() => {
    if (!episode?.url) return;

    const popup = window.open(
      episode.url,
      'anime-stream',
      'width=1280,height=720,scrollbars=yes,resizable=yes,status=yes,toolbar=yes,menubar=yes,location=yes'
    );
    
    if (popup) {
      setPopupWindow(popup);
      setStreamingMethod('popup');
      
      // Monitor popup
      const checkClosed = setInterval(() => {
        if (popup.closed) {
          setPopupWindow(null);
          clearInterval(checkClosed);
        }
      }, 1000);
    }
  }, [episode?.url]);

  const handleMethodSwitch = (method: 'iframe' | 'popup') => {
    if (method === 'popup') {
      handleOpenInPopup();
    } else {
      if (popupWindow && !popupWindow.closed) {
        popupWindow.close();
        setPopupWindow(null);
      }
      setStreamingMethod('iframe');
    }
  };

  const getSafeUrl = (url: string) => {
    // Add protocol if missing
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      return `https://${url}`;
    }
    return url;
  };

  const getEpisodeTitle = () => {
    if (episode?.title) return episode.title;
    const episodeNum = episode?.episodeNumber || currentEpisodeIndex + 1;
    return `Episode ${episodeNum}`;
  };

  if (!isOpen || !episode) return null;

  return (
    <AnimatePresence>
      <motion.div
        ref={overlayRef}
        className={`fixed inset-0 z-50 bg-black/90 backdrop-blur-sm ${
          isFullscreen ? 'bg-black' : ''
        }`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
      >
        {/* Main Container */}
        <div className={`w-full h-full flex flex-col ${isFullscreen ? 'p-0' : 'p-4 md:p-8'}`}>
          
          {/* Top Controls */}
          <AnimatePresence>
            {showControls && (
              <motion.div
                className={`flex items-center justify-between mb-4 ${isFullscreen ? 'absolute top-4 left-4 right-4 z-10' : ''}`}
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.2 }}
              >
                {/* Episode Info */}
                <div className="flex items-center space-x-4">
                  <button
                    onClick={onClose}
                    className="p-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 hover:bg-white/20 transition-all duration-200"
                  >
                    <X className="w-5 h-5 text-white" />
                  </button>
                  
                  <div className="text-white">
                    <h2 className="text-xl font-bold">{animeTitle}</h2>
                    <p className="text-white/70 text-sm">{getEpisodeTitle()}</p>
                  </div>
                </div>

                {/* Controls */}
                <div className="flex items-center space-x-2">
                  {/* Episode Navigation */}
                  {episodes.length > 1 && (
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => onEpisodeChange?.(currentEpisodeIndex - 1)}
                        disabled={currentEpisodeIndex === 0}
                        className="p-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                      >
                        <ArrowLeft className="w-5 h-5 text-white" />
                      </button>
                      
                      <span className="text-white/70 text-sm font-medium px-2">
                        {currentEpisodeIndex + 1} / {episodes.length}
                      </span>
                      
                      <button
                        onClick={() => onEpisodeChange?.(currentEpisodeIndex + 1)}
                        disabled={currentEpisodeIndex === episodes.length - 1}
                        className="p-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                      >
                        <ArrowRight className="w-5 h-5 text-white" />
                      </button>
                    </div>
                  )}

                  {/* Streaming Method Toggle */}
                  <div className="flex items-center space-x-1 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg p-1">
                    <button
                      onClick={() => handleMethodSwitch('iframe')}
                      className={`px-3 py-1 rounded text-sm font-medium transition-all duration-200 ${
                        streamingMethod === 'iframe' && !popupWindow
                          ? 'bg-white/20 text-white'
                          : 'text-white/70 hover:text-white hover:bg-white/10'
                      }`}
                    >
                      Embed
                    </button>
                    <button
                      onClick={() => handleMethodSwitch('popup')}
                      className={`px-3 py-1 rounded text-sm font-medium transition-all duration-200 ${
                        popupWindow && !popupWindow.closed
                          ? 'bg-white/20 text-white'
                          : 'text-white/70 hover:text-white hover:bg-white/10'
                      }`}
                    >
                      Popup
                    </button>
                  </div>

                  {/* Utility Buttons */}
                  <button
                    onClick={handleRefresh}
                    className="p-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 hover:bg-white/20 transition-all duration-200"
                  >
                    <RefreshCw className="w-5 h-5 text-white" />
                  </button>

                  <button
                    onClick={() => window.open(episode.url, '_blank')}
                    className="p-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 hover:bg-white/20 transition-all duration-200"
                  >
                    <ExternalLink className="w-5 h-5 text-white" />
                  </button>

                  <button
                    onClick={() => setIsFullscreen(!isFullscreen)}
                    className="p-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 hover:bg-white/20 transition-all duration-200"
                  >
                    {isFullscreen ? (
                      <Minimize2 className="w-5 h-5 text-white" />
                    ) : (
                      <Maximize2 className="w-5 h-5 text-white" />
                    )}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Streaming Container */}
          <div className={`flex-1 relative ${isFullscreen ? 'h-full' : 'max-h-[calc(100vh-200px)]'}`}>
            {streamingMethod === 'iframe' && (!popupWindow || popupWindow.closed) ? (
              <div className="w-full h-full bg-gray-900 rounded-xl overflow-hidden border border-white/10">
                {isLoading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-900 z-10">
                    <div className="text-center">
                      <motion.div
                        className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full mx-auto mb-4"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      />
                      <p className="text-white/70">Loading stream...</p>
                    </div>
                  </div>
                )}

                {hasError ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
                    <div className="text-center max-w-md mx-auto p-6">
                      <div className="text-red-400 mb-4">
                        <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z" />
                        </svg>
                      </div>
                      <h3 className="text-white text-xl font-bold mb-2">Streaming Error</h3>
                      <p className="text-white/70 mb-6">
                        This site doesn't allow embedding. This is common with streaming sites for security reasons.
                      </p>
                      <div className="space-y-3">
                        <button
                          onClick={handleOpenInPopup}
                          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg font-medium transition-colors duration-200"
                        >
                          Open in Popup Window
                        </button>
                        <button
                          onClick={() => window.open(episode.url, '_blank')}
                          className="w-full bg-white/10 hover:bg-white/20 text-white py-3 px-4 rounded-lg font-medium transition-colors duration-200"
                        >
                          Open in New Tab
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <iframe
                    ref={iframeRef}
                    src={getSafeUrl(episode.url || '')}
                    className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                    sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-presentation"
                    onLoad={() => setIsLoading(false)}
                    onError={() => {
                      setIsLoading(false);
                      setHasError(true);
                    }}
                  />
                )}
              </div>
            ) : (
              <div className="w-full h-full bg-gray-900 rounded-xl border border-white/10 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-blue-400 mb-4">
                    <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </div>
                  <h3 className="text-white text-xl font-bold mb-2">Streaming in Popup</h3>
                  <p className="text-white/70 mb-4">
                    The episode is playing in a separate window
                  </p>
                  {popupWindow && !popupWindow.closed ? (
                    <button
                      onClick={() => popupWindow.focus()}
                      className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg font-medium transition-colors duration-200"
                    >
                      Focus Window
                    </button>
                  ) : (
                    <button
                      onClick={handleOpenInPopup}
                      className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg font-medium transition-colors duration-200"
                    >
                      Reopen Window
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Bottom Info */}
          <AnimatePresence>
            {showControls && !isFullscreen && (
              <motion.div
                className="mt-4 text-center"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                transition={{ duration: 0.2 }}
              >
                <p className="text-white/50 text-sm">
                  Press <kbd className="bg-white/10 px-2 py-1 rounded text-xs">F</kbd> for fullscreen • 
                  <kbd className="bg-white/10 px-2 py-1 rounded text-xs ml-1">ESC</kbd> to close • 
                  <kbd className="bg-white/10 px-2 py-1 rounded text-xs ml-1">←→</kbd> to navigate episodes
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default StreamingOverlay; 