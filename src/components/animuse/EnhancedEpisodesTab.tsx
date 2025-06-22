// src/components/animuse/EnhancedEpisodesTab.tsx
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";

// iOS-Native CSS Styles
const iOSStyles = `
  @import url('https://fonts.googleapis.com/css2?family=SF+Pro+Display:wght@300;400;500;600;700&display=swap');
  
  .ios-episodes-container {
    font-family: 'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }
  
  .ios-glass-card {
    background: rgba(255, 255, 255, 0.08);
    backdrop-filter: blur(40px) saturate(180%);
    -webkit-backdrop-filter: blur(40px) saturate(180%);
    border: 1px solid rgba(255, 255, 255, 0.12);
    box-shadow: 
      0 8px 32px rgba(0, 0, 0, 0.1),
      0 1px 0 rgba(255, 255, 255, 0.1) inset,
      0 -1px 0 rgba(0, 0, 0, 0.1) inset;
  }
  
  .ios-glass-button {
    background: rgba(255, 255, 255, 0.1);
    backdrop-filter: blur(20px) saturate(180%);
    -webkit-backdrop-filter: blur(20px) saturate(180%);
    border: 1px solid rgba(255, 255, 255, 0.15);
    transition: all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  }
  
  .ios-glass-button:active {
    background: rgba(255, 255, 255, 0.2);
    transform: scale(0.96);
    transition: all 0.1s ease;
  }
  
  .ios-input {
    background: rgba(255, 255, 255, 0.08);
    backdrop-filter: blur(20px) saturate(180%);
    -webkit-backdrop-filter: blur(20px) saturate(180%);
    border: 1px solid rgba(255, 255, 255, 0.12);
    transition: all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  }
  
  .ios-input:focus {
    background: rgba(255, 255, 255, 0.12);
    border-color: rgba(255, 255, 255, 0.3);
    box-shadow: 0 0 0 4px rgba(255, 255, 255, 0.08);
  }
  
  .ios-shadow-soft {
    box-shadow: 
      0 4px 16px rgba(0, 0, 0, 0.12),
      0 2px 4px rgba(0, 0, 0, 0.08);
  }
  
  .ios-shadow-strong {
    box-shadow: 
      0 8px 32px rgba(0, 0, 0, 0.16),
      0 4px 8px rgba(0, 0, 0, 0.12),
      0 1px 0 rgba(255, 255, 255, 0.1) inset;
  }
  
  .ios-text-primary {
    color: rgba(255, 255, 255, 0.95);
    font-weight: 600;
    letter-spacing: -0.01em;
  }
  
  .ios-text-secondary {
    color: rgba(255, 255, 255, 0.7);
    font-weight: 500;
    letter-spacing: -0.005em;
  }
  
  .ios-text-tertiary {
    color: rgba(255, 255, 255, 0.5);
    font-weight: 500;
    letter-spacing: 0;
  }
  
  .ios-scrollbar-hide {
    scrollbar-width: none;
    -ms-overflow-style: none;
  }
  
  .ios-scrollbar-hide::-webkit-scrollbar {
    display: none;
  }
  
  .ios-spring-animation {
    transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  }
  
  .ios-episode-card {
    transition: all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  }
  
  .ios-episode-card:active {
    transform: scale(0.96);
    transition: all 0.1s ease;
  }
  
  .ios-blur-strong {
    backdrop-filter: blur(40px) saturate(180%) brightness(110%);
    -webkit-backdrop-filter: blur(40px) saturate(180%) brightness(110%);
  }
  
  .ios-border-subtle {
    border: 1px solid rgba(255, 255, 255, 0.12);
  }
  
  .ios-border-emphasis {
    border: 1px solid rgba(255, 255, 255, 0.2);
  }

  /* Custom scrollbar for webkit browsers */
  .ios-custom-scroll::-webkit-scrollbar {
    width: 2px;
    height: 2px;
  }
  
  .ios-custom-scroll::-webkit-scrollbar-track {
    background: transparent;
  }
  
  .ios-custom-scroll::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.2);
    border-radius: 4px;
  }
  
  .ios-custom-scroll::-webkit-scrollbar-thumb:hover {
    background: rgba(255, 255, 255, 0.3);
  }
`;

// Inject styles
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement("style");
  styleSheet.innerText = iOSStyles;
  document.head.appendChild(styleSheet);
}

// Interface definitions
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
}

// iOS-Native Episode Card Component with Sophisticated Design
const IOSEpisodeCard: React.FC<{
  episode: StreamingEpisode;
  index: number;
  themePalette?: ColorPalette;
  onPreview?: (previewUrl: string) => void;
  onWatch?: (url: string) => void;
  isWatched?: boolean;
  watchProgress?: number;
  isFeatured?: boolean;
}> = ({ 
  episode, 
  index, 
  themePalette, 
  onPreview, 
  onWatch, 
  isWatched = false, 
  watchProgress = 0,
  isFeatured = false 
}) => {
  const [isPressed, setIsPressed] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  
  const cardRef = useRef<HTMLDivElement>(null);

  const handlePreviewClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (episode.previewUrl && onPreview) {
      onPreview(episode.previewUrl);
    }
  };

  const handleWatchClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (episode.url && onWatch) {
      onWatch(episode.url);
    }
  };

  const cardVariants = {
    initial: { 
      opacity: 0, 
      y: 20,
      scale: 0.95
    },
    animate: { 
      opacity: 1, 
      y: 0,
      scale: 1,
      transition: {
        duration: 0.4,
        delay: index * 0.08,
        ease: [0.25, 0.46, 0.45, 0.94]
      }
    },
    pressed: {
      scale: 0.96,
      transition: { duration: 0.1 }
    }
  };

  return (
    <motion.div
      ref={cardRef}
      variants={cardVariants}
      initial="initial"
      animate="animate"
      whileTap="pressed"
      className="ios-episode-card group relative"
      onTouchStart={() => setIsPressed(true)}
      onTouchEnd={() => setIsPressed(false)}
      onMouseDown={() => setIsPressed(true)}
      onMouseUp={() => setIsPressed(false)}
      onMouseLeave={() => setIsPressed(false)}
    >
      {/* Main Card Container */}
      <div className="relative bg-white/[0.08] backdrop-blur-xl rounded-3xl overflow-hidden border border-white/[0.12] shadow-2xl shadow-black/20">
        
        {/* Episode Thumbnail */}
        <div className="relative aspect-[16/10] overflow-hidden">
          {episode.thumbnail ? (
            <motion.img
              src={episode.thumbnail}
              alt={episode.title || `Episode ${index + 1}`}
              className="w-full h-full object-cover"
              initial={{ scale: 1.1, opacity: 0 }}
              animate={{ 
                scale: imageLoaded ? 1 : 1.1, 
                opacity: imageLoaded ? 1 : 0 
              }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              onLoad={() => setImageLoaded(true)}
              onError={(e) => {
                (e.target as HTMLImageElement).src = `https://placehold.co/400x250/${
                  themePalette?.primary?.replace('#', '') || 'ECB091'
                }/FFFFFF/png?text=EP+${index + 1}&font=system-ui`;
              }}
            />
          ) : (
            <div 
              className="w-full h-full flex items-center justify-center"
              style={{
                background: themePalette?.gradient || 
                  'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
              }}
            >
              <span className="text-3xl font-bold text-white/90 font-mono">
                {String(index + 1).padStart(2, '0')}
              </span>
            </div>
          )}
          
          {/* Progress Indicator */}
          {watchProgress > 0 && (
            <motion.div 
              className="absolute bottom-0 left-0 right-0 h-1"
              initial={{ scaleX: 0 }}
              animate={{ scaleX: watchProgress / 100 }}
              transition={{ duration: 1, delay: 0.5 }}
              style={{ 
                transformOrigin: 'left',
                background: 'linear-gradient(90deg, #34D399, #10B981)'
              }}
            />
          )}

          {/* Episode Number Badge */}
          <div className="absolute top-3 left-3">
            <div className="bg-black/60 backdrop-blur-md rounded-2xl px-3 py-1.5 border border-white/20">
              <span className="text-white text-sm font-semibold font-mono tracking-wide">
                {String(index + 1).padStart(2, '0')}
              </span>
            </div>
          </div>

          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-active:opacity-100 transition-opacity duration-300" />
        </div>

        {/* Episode Information */}
        <div className="p-4 space-y-3">
          {/* Title */}
          <h3 className="text-white text-lg font-semibold leading-tight line-clamp-2 font-system">
            {episode.title || `Episode ${index + 1}`}
          </h3>
          
          {/* Metadata */}
          {(episode.duration || episode.airDate || episode.site) && (
            <div className="flex items-center text-white/60 text-sm space-x-4">
              {episode.duration && (
                <div className="flex items-center space-x-1">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                  </svg>
                  <span className="font-medium">{episode.duration}</span>
                </div>
              )}
              
              {episode.site && (
                <div className="flex items-center space-x-1">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                  </svg>
                  <span className="font-medium">{episode.site}</span>
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex space-x-2 pt-2">
            {episode.previewUrl && (
              <motion.button
                onClick={handlePreviewClick}
                className="flex-1 bg-white/10 backdrop-blur-sm rounded-2xl py-3 px-4 border border-white/20 text-white font-medium text-sm active:bg-white/20 transition-all duration-200"
                whileTap={{ scale: 0.98 }}
                whileHover={{ backgroundColor: 'rgba(255,255,255,0.15)' }}
              >
                <span className="flex items-center justify-center space-x-2">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                    <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                  </svg>
                  <span>Preview</span>
                </span>
              </motion.button>
            )}
            
            {episode.url && (
              <motion.button
                onClick={handleWatchClick}
                className="flex-1 backdrop-blur-sm rounded-2xl py-3 px-4 border text-white font-medium text-sm active:brightness-90 transition-all duration-200"
                style={{
                  background: themePalette?.gradient || 
                    'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  borderColor: themePalette?.primary + '60' || 'rgba(102, 126, 234, 0.6)',
                  boxShadow: `0 4px 20px ${themePalette?.primary || '#667eea'}40`
                }}
                whileTap={{ scale: 0.98 }}
              >
                <span className="flex items-center justify-center space-x-2">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M8 5v10l8-5-8-5z"/>
                  </svg>
                  <span>Watch</span>
                </span>
              </motion.button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// iOS-Native Timeline Component
const IOSEpisodesTimeline: React.FC<{
  episodes: StreamingEpisode[];
  currentEpisode?: number;
  onEpisodeSelect: (index: number) => void;
  themePalette?: ColorPalette;
}> = ({ episodes, currentEpisode = 0, onEpisodeSelect, themePalette }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current && currentEpisode !== undefined) {
      const episodeElement = scrollRef.current.children[currentEpisode] as HTMLElement;
      if (episodeElement) {
        episodeElement.scrollIntoView({ behavior: 'smooth', inline: 'center' });
      }
    }
  }, [currentEpisode]);

  return (
    <div className="space-y-4 mb-8">
      {/* Section Header */}
      <div className="flex items-center justify-between px-1">
        <h3 className="ios-text-primary text-xl font-bold">Timeline</h3>
        <div className="ios-text-tertiary text-sm font-medium">
          {episodes.length} episodes
        </div>
      </div>
      
      {/* Timeline Scroll */}
      <div 
        ref={scrollRef}
        className="flex space-x-3 overflow-x-auto pb-4 px-1 ios-scrollbar-hide ios-custom-scroll"
      >
        {episodes.map((episode, index) => (
          <motion.button
            key={index}
            onClick={() => onEpisodeSelect(index)}
            className={`flex-shrink-0 w-16 h-16 rounded-2xl ios-blur-strong ios-border-subtle ios-spring-animation ${
              currentEpisode === index 
                ? 'ios-border-emphasis ios-shadow-strong' 
                : 'active:scale-95'
            }`}
            style={{
              background: currentEpisode === index 
                ? themePalette?.gradient || 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                : 'rgba(255, 255, 255, 0.08)',
              borderColor: currentEpisode === index 
                ? themePalette?.primary || '#667eea'
                : undefined,
              boxShadow: currentEpisode === index 
                ? `0 8px 25px ${themePalette?.primary || '#667eea'}40`
                : undefined
            }}
            whileTap={{ scale: 0.9 }}
          >
            <div className="flex flex-col items-center justify-center h-full">
              <span className="ios-text-tertiary text-xs font-medium font-mono">EP</span>
              <span className="ios-text-primary text-sm font-bold font-mono">{index + 1}</span>
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  );
};

// iOS-Native Controls Panel
const IOSEpisodesControls: React.FC<{
  episodes: StreamingEpisode[];
  onFilterChange: (filter: string) => void;
  onSortChange: (sort: string) => void;
  onViewModeChange: (mode: 'grid' | 'list') => void;
  viewMode: 'grid' | 'list';
  themePalette?: ColorPalette;
}> = ({ episodes, onFilterChange, onSortChange, onViewModeChange, viewMode, themePalette }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <motion.div 
      className="mb-8 ios-glass-card rounded-3xl ios-border-subtle overflow-hidden ios-shadow-strong"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
    >
      {/* Header */}
      <div className="p-6 border-b ios-border-subtle">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="ios-text-primary text-xl font-bold mb-1">Episodes</h3>
            <p className="ios-text-secondary text-sm font-medium">
              {episodes.length} episodes available
            </p>
          </div>
          <motion.button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-3 rounded-full ios-glass-button ios-spring-animation"
            whileTap={{ scale: 0.9 }}
          >
            <motion.svg 
              className="w-5 h-5 ios-text-primary" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
              animate={{ rotate: isExpanded ? 180 : 0 }}
              transition={{ duration: 0.3 }}
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
            </motion.svg>
          </motion.button>
        </div>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="overflow-hidden"
          >
            <div className="p-6 space-y-6">
              {/* Search */}
              <div className="space-y-3">
                <label className="ios-text-secondary text-sm font-medium block">Search Episodes</label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search by title or number..."
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      onFilterChange(e.target.value);
                    }}
                    className="w-full ios-input rounded-2xl py-4 px-5 pl-12 ios-text-primary placeholder-white/50"
                  />
                  <svg className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 ios-text-tertiary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>

              {/* Sort Options */}
              <div className="space-y-3">
                <label className="ios-text-secondary text-sm font-medium block">Sort By</label>
                <select
                  onChange={(e) => onSortChange(e.target.value)}
                  className="w-full ios-input rounded-2xl py-4 px-5 ios-text-primary appearance-none cursor-pointer"
                >
                  <option value="default" className="bg-gray-900">Default Order</option>
                  <option value="title" className="bg-gray-900">Episode Title</option>
                  <option value="duration" className="bg-gray-900">Duration</option>
                  <option value="date" className="bg-gray-900">Air Date</option>
                </select>
              </div>

              {/* View Mode Toggle */}
              <div className="space-y-3">
                <label className="ios-text-secondary text-sm font-medium block">View Mode</label>
                <div className="ios-glass-card rounded-2xl p-1 ios-border-subtle">
                  <div className="flex">
                    <button
                      onClick={() => onViewModeChange('grid')}
                      className={`flex-1 py-3 px-4 rounded-xl ios-spring-animation font-medium text-sm ${
                        viewMode === 'grid' 
                          ? 'ios-glass-button ios-text-primary ios-shadow-soft' 
                          : 'ios-text-secondary hover:ios-text-primary'
                      }`}
                    >
                      <div className="flex items-center justify-center space-x-2">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                        </svg>
                        <span>Grid</span>
                      </div>
                    </button>
                    <button
                      onClick={() => onViewModeChange('list')}
                      className={`flex-1 py-3 px-4 rounded-xl ios-spring-animation font-medium text-sm ${
                        viewMode === 'list' 
                          ? 'ios-glass-button ios-text-primary ios-shadow-soft' 
                          : 'ios-text-secondary hover:ios-text-primary'
                      }`}
                    >
                      <div className="flex items-center justify-center space-x-2">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                        </svg>
                        <span>List</span>
                      </div>
                    </button>
                  </div>
                </div>
              </div>

              {/* Statistics */}
              <div className="grid grid-cols-3 gap-4 pt-4 border-t ios-border-subtle">
                <div className="text-center">
                  <div className="ios-text-primary text-lg font-bold font-mono">{episodes.length}</div>
                  <div className="ios-text-tertiary text-xs font-medium">Total</div>
                </div>
                <div className="text-center">
                  <div className="ios-text-primary text-lg font-bold font-mono">{episodes.filter(ep => ep.previewUrl).length}</div>
                  <div className="ios-text-tertiary text-xs font-medium">Previews</div>
                </div>
                <div className="text-center">
                  <div className="ios-text-primary text-lg font-bold font-mono">{episodes.filter(ep => ep.url).length}</div>
                  <div className="ios-text-tertiary text-xs font-medium">Available</div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// iOS-Native Preview Management Panel
const IOSPreviewManagementPanel: React.FC<{
  animeId: Id<"anime">;
  animeTitle: string;
  themePalette?: ColorPalette;
}> = ({ animeId, animeTitle, themePalette }) => {
  const [isEnriching, setIsEnriching] = useState(false);
  const [enrichmentResult, setEnrichmentResult] = useState<any>(null);
  
  const triggerPreviewEnrichment = useMutation(api.anime.triggerPreviewEnrichment);
  const episodePreviewStatus = useQuery(
    api.anime.getEpisodePreviewStatus,
    animeId ? { animeId } : "skip"
  );

  const handleEnrichPreviews = async () => {
    setIsEnriching(true);
    setEnrichmentResult(null);
    
    try {
      const result = await triggerPreviewEnrichment({ animeId });
      setEnrichmentResult(result);
    } catch (error: any) {
      console.error("Preview enrichment error:", error);
      setEnrichmentResult({ success: false, error: error.message });
    } finally {
      setIsEnriching(false);
    }
  };

  return (
    <motion.div 
      className="mb-8 ios-glass-card rounded-3xl ios-border-subtle overflow-hidden ios-shadow-strong"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.6, delay: 0.1 }}
    >
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center ios-shadow-soft">
              <span className="text-white text-lg">🎬</span>
            </div>
            <div>
              <h3 className="ios-text-primary font-bold text-lg">Preview Status</h3>
              {episodePreviewStatus && (
                <p className="ios-text-secondary text-sm font-medium">
                  {episodePreviewStatus.episodesWithPreviews} of {episodePreviewStatus.totalEpisodes} episodes ({episodePreviewStatus.previewPercentage}%)
                </p>
              )}
            </div>
          </div>
          
          <motion.button
            onClick={handleEnrichPreviews}
            disabled={isEnriching}
            className="px-6 py-3 rounded-2xl font-semibold text-sm ios-text-primary ios-blur-strong ios-border-subtle ios-spring-animation ios-shadow-soft"
            style={{
              background: isEnriching 
                ? 'rgba(255, 255, 255, 0.1)' 
                : 'linear-gradient(135deg, #8B5CF6, #A855F7)',
              boxShadow: isEnriching 
                ? 'none' 
                : '0 8px 25px rgba(139, 92, 246, 0.4)'
            }}
            whileTap={{ scale: 0.95 }}
          >
            <div className="flex items-center space-x-2">
              <motion.span
                animate={{ rotate: isEnriching ? 360 : 0 }}
                transition={{ 
                  duration: 1, 
                  repeat: isEnriching ? Infinity : 0,
                  ease: "linear"
                }}
              >
                🔄
              </motion.span>
              <span>{isEnriching ? 'Finding...' : 'Find Previews'}</span>
            </div>
          </motion.button>
        </div>

        {/* Progress Bar */}
        {episodePreviewStatus && episodePreviewStatus.totalEpisodes > 0 && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <span className="ios-text-secondary text-sm font-medium">Progress</span>
              <span className="ios-text-primary text-sm font-bold font-mono">
                {episodePreviewStatus.previewPercentage}%
              </span>
            </div>
            <div className="h-2 ios-glass-card rounded-full overflow-hidden">
              <motion.div 
                className="h-full rounded-full"
                style={{
                  background: themePalette ? 
                    `linear-gradient(90deg, ${themePalette.primary}, ${themePalette.accent})` :
                    'linear-gradient(90deg, #10B981, #34D399)'
                }}
                initial={{ width: 0 }}
                animate={{ width: `${episodePreviewStatus.previewPercentage}%` }}
                transition={{ duration: 1.2, ease: "easeOut", delay: 0.5 }}
              />
            </div>
          </div>
        )}

        {/* Result Message */}
        <AnimatePresence>
          {enrichmentResult && (
            <motion.div 
              className={`p-4 rounded-2xl border ${
                enrichmentResult.success 
                  ? 'bg-green-500/20 border-green-500/30 text-green-400' 
                  : 'bg-red-500/20 border-red-500/30 text-red-400'
              }`}
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              transition={{ duration: 0.3 }}
            >
              <div className="flex items-center space-x-2">
                <span className="text-lg">
                  {enrichmentResult.success ? '✅' : '❌'}
                </span>
                <span className="font-medium text-sm">
                  {enrichmentResult.message || enrichmentResult.error}
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

// Main Enhanced Episodes Tab Component
export const EnhancedEpisodesTab: React.FC<{
  episodes: StreamingEpisode[];
  themePalette?: ColorPalette;
  onPreview: (previewUrl: string) => void;
  anime: any;
  animeId?: string;
}> = ({ episodes, themePalette, onPreview, anime, animeId }) => {
  const [filteredEpisodes, setFilteredEpisodes] = useState(episodes);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [currentEpisode, setCurrentEpisode] = useState(0);
  const [watchProgress, setWatchProgress] = useState<{[key: number]: number}>({});

  // Mock watched episodes data
  const watchedEpisodes = new Set([0, 1, 2]);

  // Refs for episode cards
  const cardRefs = React.useRef<(HTMLDivElement | null)[]>([]);

  React.useEffect(() => {
    if (cardRefs.current[currentEpisode]) {
      cardRefs.current[currentEpisode]?.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
    }
  }, [currentEpisode]);

  useEffect(() => {
    setFilteredEpisodes(episodes);
  }, [episodes]);

  const handleFilterChange = (searchTerm: string) => {
    if (!searchTerm.trim()) {
      setFilteredEpisodes(episodes);
    } else {
      const filtered = episodes.filter(episode => 
        episode.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        `Episode ${episodes.indexOf(episode) + 1}`.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredEpisodes(filtered);
    }
  };

  const handleSortChange = (sortBy: string) => {
    const sorted = [...filteredEpisodes].sort((a, b) => {
      switch (sortBy) {
        case 'title':
          return (a.title || '').localeCompare(b.title || '');
        case 'duration':
          return (a.duration || '').localeCompare(b.duration || '');
        case 'date':
          return new Date(a.airDate || 0).getTime() - new Date(b.airDate || 0).getTime();
        default:
          return episodes.indexOf(a) - episodes.indexOf(b);
      }
    });
    setFilteredEpisodes(sorted);
  };

  const handleWatchEpisode = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  // Empty State
  if (!episodes || episodes.length === 0) {
    return (
      <div className="ios-episodes-container px-6 py-12">
        <motion.div 
          className="ios-glass-card rounded-3xl ios-border-subtle p-16 text-center ios-shadow-strong"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94] }}
        >
          <motion.div 
            className="text-8xl mb-8 opacity-60"
            animate={{ 
              scale: [1, 1.05, 1],
              opacity: [0.6, 0.8, 0.6]
            }}
            transition={{ 
              duration: 3,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          >
            📺
          </motion.div>
          <h3 className="ios-text-primary text-2xl font-bold mb-4">No Episodes Available</h3>
          <p className="ios-text-secondary text-lg mb-8 max-w-md mx-auto leading-relaxed">
            Episode data is not yet available for this anime. Check back later for updates.
          </p>
          <motion.button
            className="ios-glass-button rounded-2xl py-4 px-8 ios-text-primary font-semibold ios-spring-animation ios-shadow-soft"
            style={{
              background: themePalette?.gradient || 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              boxShadow: `0 8px 25px ${themePalette?.primary || '#667eea'}40`
            }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            Request Episodes
          </motion.button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="ios-episodes-container px-6 py-8 space-y-8">
      {/* Preview Management Panel */}
      <IOSPreviewManagementPanel 
        animeId={animeId || anime?._id}
        animeTitle={anime?.title || ''}
        themePalette={themePalette}
      />

      {/* Episodes Controls */}
      <IOSEpisodesControls
        episodes={filteredEpisodes}
        onFilterChange={handleFilterChange}
        onSortChange={handleSortChange}
        onViewModeChange={setViewMode}
        viewMode={viewMode}
        themePalette={themePalette}
      />

      {/* Episodes Timeline */}
      <IOSEpisodesTimeline
        episodes={filteredEpisodes}
        currentEpisode={currentEpisode}
        onEpisodeSelect={setCurrentEpisode}
        themePalette={themePalette}
      />

      {/* Episodes Content */}
      {viewMode === 'grid' ? (
        <motion.div 
          className="grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5"
          style={{
            gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
          }}
          layout
        >
          {filteredEpisodes.map((episode, index) => {
            const originalIndex = episodes.indexOf(episode);
            return (
              <div ref={el => { cardRefs.current[originalIndex] = el; }} key={originalIndex}>
                <IOSEpisodeCard
                  episode={episode}
                  index={originalIndex}
                  themePalette={themePalette}
                  onPreview={onPreview}
                  onWatch={handleWatchEpisode}
                  isWatched={watchedEpisodes.has(originalIndex)}
                  watchProgress={watchProgress[originalIndex] || 0}
                  isFeatured={false}
                />
              </div>
            );
          })}
        </motion.div>
      ) : (
        filteredEpisodes.length === 0 ? (
          <div className="text-center text-white/70 py-12">No episodes found.</div>
        ) : (
          <div className="space-y-4">
            {filteredEpisodes.map((episode, index) => {
              const originalIndex = episodes.indexOf(episode);
              return (
                <motion.div
                  key={originalIndex}
                  className="ios-glass-card rounded-3xl p-6 ios-shadow-strong"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05, duration: 0.4 }}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                >
                  <div className="flex items-center space-x-4">
                    {/* Thumbnail */}
                    <div className="w-20 h-20 rounded-2xl overflow-hidden flex-shrink-0 ios-glass-card">
                      {episode.thumbnail ? (
                        <img 
                          src={episode.thumbnail} 
                          alt={episode.title || `Episode ${originalIndex + 1}`}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div 
                          className="w-full h-full flex items-center justify-center"
                          style={{ background: themePalette?.gradient || 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
                        >
                          <span className="ios-text-primary font-bold font-mono text-sm">
                            {String(originalIndex + 1).padStart(2, '0')}
                          </span>
                        </div>
                      )}
                    </div>
                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <h4 className="ios-text-primary font-bold text-lg mb-2 truncate">
                        {episode.title || `Episode ${originalIndex + 1}`}
                      </h4>
                      <div className="flex flex-col space-y-2">
                        <div className="flex items-center space-x-3 ios-text-tertiary text-sm">
                          <span className="font-mono">EP {String(originalIndex + 1).padStart(2, '0')}</span>
                          {episode.duration && <span>{episode.duration}</span>}
                        </div>
                        {episode.site && (
                          <div className="flex items-start">
                            <span className="ios-glass-button px-3 py-1 rounded-xl text-xs font-medium ios-text-secondary">
                              {episode.site}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    {/* Actions */}
                    <div className="flex space-x-2">
                      {episode.previewUrl && (
                        <button
                          onClick={() => onPreview(episode.previewUrl!)}
                          className="ios-glass-button rounded-2xl py-2 px-4 ios-text-primary font-medium text-sm ios-spring-animation"
                        >
                          Preview
                        </button>
                      )}
                      {episode.url && (
                        <button
                          onClick={() => handleWatchEpisode(episode.url!)}
                          className="backdrop-blur-sm rounded-2xl py-2 px-4 ios-text-primary font-medium text-sm ios-spring-animation ios-shadow-soft"
                          style={{
                            background: themePalette?.gradient || 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            boxShadow: `0 4px 15px ${themePalette?.primary || '#667eea'}30`
                          }}
                        >
                          Watch
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )
      )}
    </div>
  );
};