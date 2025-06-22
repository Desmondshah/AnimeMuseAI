import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import StyledButton from './shared/StyledButton';

interface InAppAnimeViewerProps {
  isOpen: boolean;
  onClose: () => void;
  episodeUrl: string | null;
  episodeTitle?: string;
  animeTitle?: string;
  episodeNumber?: number;
  themePalette?: {
    primary: string;
    secondary: string;
    accent: string;
    dark: string;
    gradient: string;
  };
}

const InAppAnimeViewer: React.FC<InAppAnimeViewerProps> = ({
  isOpen,
  onClose,
  episodeUrl,
  episodeTitle,
  animeTitle,
  episodeNumber,
  themePalette
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const viewerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen && episodeUrl) {
      setIsLoading(true);
      setHasError(false);
    }
  }, [isOpen, episodeUrl]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        if (isFullscreen) {
          setIsFullscreen(false);
        } else {
          onClose();
        }
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, isFullscreen, onClose]);

  // Fullscreen handling
  const toggleFullscreen = async () => {
    try {
      if (!isFullscreen && viewerRef.current) {
        if (viewerRef.current.requestFullscreen) {
          await viewerRef.current.requestFullscreen();
        } else if ((viewerRef.current as any).webkitRequestFullscreen) {
          await (viewerRef.current as any).webkitRequestFullscreen();
        }
        setIsFullscreen(true);
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if ((document as any).webkitExitFullscreen) {
          await (document as any).webkitExitFullscreen();
        }
        setIsFullscreen(false);
      }
    } catch (error) {
      console.log('Fullscreen not supported or denied');
    }
  };

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Handle iframe load
  const handleIframeLoad = () => {
    setIsLoading(false);
    setHasError(false);
  };

  const handleIframeError = () => {
    setIsLoading(false);
    setHasError(true);
  };

  // Open in external browser
  const openExternal = () => {
    if (episodeUrl) {
      window.open(episodeUrl, '_blank', 'noopener,noreferrer');
    }
  };

  if (!isOpen || !episodeUrl) return null;

  const modalStyle = themePalette ? {
    backgroundColor: themePalette.dark,
    borderColor: `${themePalette.primary}40`
  } : {
    backgroundColor: '#000000',
    borderColor: 'rgba(255,255,255,0.2)'
  };

  return (
    <AnimatePresence>
      <motion.div
        ref={viewerRef}
        className="fixed inset-0 bg-black z-[200] flex flex-col"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
      >
        {/* Header Bar - Hidden in fullscreen */}
        <AnimatePresence>
          {!isFullscreen && (
            <motion.div
              className="flex items-center justify-between p-4 bg-black/90 backdrop-blur-xl border-b border-white/10 z-50"
              initial={{ y: -60 }}
              animate={{ y: 0 }}
              exit={{ y: -60 }}
              transition={{ duration: 0.3 }}
            >
              {/* Episode Info */}
              <div className="flex-1 min-w-0">
                <h3 className="text-white font-semibold text-lg truncate">
                  {episodeTitle || `Episode ${episodeNumber || '?'}`}
                </h3>
                {animeTitle && (
                  <p className="text-white/70 text-sm truncate">{animeTitle}</p>
                )}
              </div>

              {/* Controls */}
              <div className="flex items-center gap-2 ml-4">
                {/* Refresh Button */}
                <button
                  onClick={() => {
                    if (iframeRef.current) {
                      setIsLoading(true);
                      setHasError(false);
                      iframeRef.current.src = episodeUrl;
                    }
                  }}
                  className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
                  title="Refresh"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>

                {/* Fullscreen Button */}
                <button
                  onClick={toggleFullscreen}
                  className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
                  title="Toggle Fullscreen"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                  </svg>
                </button>

                {/* External Link Button */}
                <button
                  onClick={openExternal}
                  className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
                  title="Open in Browser"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </button>

                {/* Close Button */}
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 hover:text-red-300 transition-colors"
                  title="Close Viewer"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Loading State */}
        {isLoading && (
          <div className="absolute inset-0 bg-black/90 flex items-center justify-center z-40">
            <div className="text-center">
              <motion.div
                className="w-16 h-16 border-4 border-white/20 border-t-white rounded-full mx-auto mb-4"
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              />
              <h4 className="text-white text-xl font-semibold mb-2">Loading Episode...</h4>
              <p className="text-white/70">
                {episodeTitle || `Episode ${episodeNumber || '?'}`}
              </p>
              {animeTitle && (
                <p className="text-white/50 text-sm mt-1">{animeTitle}</p>
              )}
            </div>
          </div>
        )}

        {/* Error State */}
        {hasError && (
          <div className="absolute inset-0 bg-black/90 flex items-center justify-center z-40">
            <div className="text-center max-w-md mx-auto p-6">
              <div className="text-6xl mb-6">🚫</div>
              <h4 className="text-white text-2xl font-bold mb-4">Unable to Load Episode</h4>
              <p className="text-white/70 mb-6 leading-relaxed">
                This streaming site may not allow embedding or requires additional permissions.
              </p>
              
              <div className="space-y-3">
                <StyledButton
                  onClick={openExternal}
                  className="w-full !bg-blue-600 hover:!bg-blue-700 !text-white"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  Watch in Browser
                </StyledButton>
                
                <button
                  onClick={() => {
                    setHasError(false);
                    setIsLoading(true);
                    if (iframeRef.current) {
                      iframeRef.current.src = episodeUrl;
                    }
                  }}
                  className="w-full py-3 px-4 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
                >
                  Try Again
                </button>
                
                <button
                  onClick={onClose}
                  className="w-full py-2 px-4 text-white/70 hover:text-white transition-colors text-sm"
                >
                  Close Viewer
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <div className="flex-1 relative bg-black">
          <iframe
            ref={iframeRef}
            src={episodeUrl}
            title={`${animeTitle} - ${episodeTitle || `Episode ${episodeNumber}`}`}
            className="w-full h-full border-0"
            allowFullScreen
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-pointer-lock allow-top-navigation allow-presentation"
            onLoad={handleIframeLoad}
            onError={handleIframeError}
            style={{
              colorScheme: 'dark'
            }}
          />
        </div>

        {/* Touch overlay for mobile gestures in fullscreen */}
        {isFullscreen && (
          <div
            className="absolute top-0 left-0 w-full h-16 z-30 opacity-0 hover:opacity-100 transition-opacity"
            onTouchStart={() => setIsFullscreen(false)}
            onClick={() => setIsFullscreen(false)}
          />
        )}
      </motion.div>
    </AnimatePresence>
  );
};

export default InAppAnimeViewer; 