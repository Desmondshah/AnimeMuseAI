// src/components/animuse/EnhancedEpisodesTab.tsx
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";


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

// Enhanced Episode Card Component with Cinematic Design
const CinematicEpisodeCard: React.FC<{
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
  const [isHovered, setIsHovered] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [previewError, setPreviewError] = useState(false);
  
  const cardRef = useRef<HTMLDivElement>(null);

  const cardStyle = themePalette ? {
    borderColor: `${themePalette.primary}20`,
    background: `linear-gradient(135deg, 
      ${themePalette.dark}60 0%, 
      ${themePalette.primary}10 50%, 
      ${themePalette.dark}80 100%
    )`
  } : {};

  const handlePreviewClick = () => {
    if (episode.previewUrl && onPreview) {
      setPreviewError(false);
      onPreview(episode.previewUrl);
    }
  };

  const handleWatchClick = () => {
    if (episode.url && onWatch) {
      onWatch(episode.url);
    }
  };

  return (
    <motion.div
      ref={cardRef}
      layout
      initial={{ opacity: 0, y: 30, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -30, scale: 0.9 }}
      transition={{ 
        duration: 0.6, 
        delay: index * 0.1,
        type: "spring",
        stiffness: 100
      }}
      className={`
        episode-card-cinematic group relative overflow-hidden rounded-3xl border backdrop-blur-xl
        transition-all duration-700 cursor-pointer
        ${isFeatured 
          ? 'featured-episode col-span-2 row-span-2 min-h-[500px]' 
          : 'col-span-1 row-span-1 min-h-[280px] aspect-[4/5]'
        }
        hover:scale-[1.02] hover:z-10
      `}
      style={cardStyle}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      whileHover={{ 
        boxShadow: themePalette ? 
          `0 25px 50px ${themePalette.primary}30` : 
          '0 25px 50px rgba(0,0,0,0.3)'
      }}
    >
      {/* Background Image with Parallax Effect */}
      <div className="absolute inset-0 overflow-hidden">
        {episode.thumbnail ? (
          <motion.img
            src={episode.thumbnail}
            alt={episode.title || `Episode ${index + 1}`}
            className="episode-thumbnail w-full h-full object-cover"
            style={{
              filter: isWatched ? 'grayscale(0.3) brightness(0.8)' : 'none'
            }}
            animate={{
              scale: isHovered ? 1.1 : 1,
              filter: isHovered ? 'brightness(0.7)' : 'brightness(1)'
            }}
            transition={{ duration: 0.7 }}
            onLoad={() => setImageLoaded(true)}
            onError={(e) => {
              (e.target as HTMLImageElement).src = `https://placehold.co/600x400/${
                themePalette?.primary?.replace('#', '') || 'ECB091'
              }/000000/png?text=Episode+${index + 1}&font=poppins`;
            }}
          />
        ) : (
          <div 
            className="w-full h-full flex items-center justify-center"
            style={{
              background: themePalette?.gradient || 
                'linear-gradient(135deg, rgba(236, 176, 145, 0.5), rgba(255, 107, 53, 0.5))'
            }}
          >
            <span className="text-6xl font-bold text-white/30">
              {index + 1}
            </span>
          </div>
        )}
        
        {/* Cinematic Overlay Gradients */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-60 group-hover:opacity-80 transition-opacity duration-500" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/30 via-transparent to-black/30 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      </div>

      {/* Watch Progress Indicator */}
      {watchProgress > 0 && (
        <motion.div 
          className="episode-progress-bar absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-green-400 to-green-600 z-20"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: watchProgress / 100 }}
          transition={{ duration: 1, delay: 0.5 }}
          style={{ transformOrigin: 'left' }}
        />
      )}

      {/* Status Badges */}
      <div className="absolute top-4 right-4 flex flex-col gap-2 z-20">
        {/* Removed the watched checkmark badge */}
        
        {/* Removed the preview badge */}

        {/* Removed the site badge */}
      </div>

      {/* Episode Number Badge */}
      <motion.div 
        className="absolute top-4 left-4 z-20"
        initial={{ scale: 0, rotate: -90 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ delay: 0.4, type: "spring" }}
      >
        <div 
          className="w-16 h-16 rounded-2xl backdrop-blur-xl border flex items-center justify-center"
          style={{
            background: themePalette ? 
              `linear-gradient(135deg, ${themePalette.primary}80, ${themePalette.accent}60)` :
              'linear-gradient(135deg, rgba(255, 107, 53, 0.8), rgba(176, 137, 104, 0.6))',
            borderColor: themePalette?.primary + '40' || 'rgba(255, 255, 255, 0.2)'
          }}
        >
          <span className="text-white font-bold text-lg">
            {index + 1}
          </span>
        </div>
      </motion.div>

      {/* Removed Central Play Button entirely */}

      {/* Episode Information Overlay */}
      <motion.div 
        className="episode-info-overlay absolute bottom-0 left-0 right-0 p-6 z-20"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        <div className="episode-controls backdrop-blur-xl bg-black/30 rounded-2xl p-4 border border-white/10">
          <h3 className="text-white font-bold text-lg mb-2 line-clamp-2">
            {episode.title || `Episode ${index + 1}`}
          </h3>
          
          {/* Episode Metadata */}
          <div className="episode-stats flex items-center gap-4 text-white/70 text-sm mb-4">
            {episode.duration && (
              <div className="stat-item flex items-center gap-1">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                </svg>
                {episode.duration}
              </div>
            )}
            
            {episode.airDate && (
              <div className="stat-item flex items-center gap-1">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                </svg>
                {episode.airDate}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <motion.div 
            className="flex gap-3"
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            {episode.previewUrl && (
              <motion.button
                onClick={handlePreviewClick}
                className="episode-action-button flex-1 bg-white/10 backdrop-blur-sm rounded-xl py-3 px-4 border border-white/20 text-white font-medium transition-all duration-300"
                whileHover={{ scale: 1.02, backgroundColor: 'rgba(255,255,255,0.15)' }}
                whileTap={{ scale: 0.98 }}
              >
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                    <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                  </svg>
                  Preview
                </span>
              </motion.button>
            )}
            
            {episode.url && (
              <motion.button
                onClick={handleWatchClick}
                className="episode-action-button flex-1 backdrop-blur-sm rounded-xl py-3 px-4 border text-white font-medium transition-all duration-300 hover:brightness-110"
                style={{
                  background: themePalette?.gradient || 
                    'linear-gradient(135deg, #FF6B35, #E55A2B)',
                  borderColor: themePalette?.primary + '60' || 'rgba(255, 107, 53, 0.6)'
                }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M8 5v10l8-5-8-5z"/>
                  </svg>
                  Watch Now
                </span>
              </motion.button>
            )}
          </motion.div>
        </div>
      </motion.div>
    </motion.div>
  );
};

// Episodes Timeline Component
const EpisodesTimeline: React.FC<{
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
    <div className="relative mb-8">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white font-bold text-lg">Episode Timeline</h3>
        <div className="text-white/60 text-sm">
          {episodes.length} Episodes
        </div>
      </div>
      
      <div 
        ref={scrollRef}
        className="episode-timeline flex gap-2 overflow-x-auto pb-4 scrollbar-hide"
        style={{ scrollbarWidth: 'none' }}
      >
        {episodes.map((episode, index) => (
          <motion.button
            key={index}
            onClick={() => onEpisodeSelect(index)}
            className={`
              episode-timeline-item flex-shrink-0 w-20 h-12 rounded-xl border backdrop-blur-sm transition-all duration-300
              ${currentEpisode === index 
                ? 'active border-2' 
                : 'border border-white/20 hover:border-white/40'
              }
            `}
            style={{
              background: currentEpisode === index 
                ? themePalette?.gradient || 'linear-gradient(135deg, #FF6B35, #E55A2B)'
                : 'rgba(255, 255, 255, 0.05)',
              borderColor: currentEpisode === index 
                ? themePalette?.primary || '#FF6B35'
                : undefined
            }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <div className="flex flex-col items-center justify-center h-full">
              <span className="text-white text-xs font-medium">EP</span>
              <span className="text-white text-sm font-bold">{index + 1}</span>
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  );
};

// Episodes Filter and Sort Component
const EpisodesControls: React.FC<{
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
      className="episode-controls-panel mb-8 backdrop-blur-xl rounded-2xl p-6 border"
      style={{
        background: themePalette ? 
          `linear-gradient(135deg, ${themePalette.dark}40, ${themePalette.primary}10)` :
          'rgba(0, 0, 0, 0.4)',
        borderColor: themePalette?.primary + '20' || 'rgba(255, 255, 255, 0.2)'
      }}
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white font-bold text-xl">Episodes Collection</h3>
        <motion.button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-white/70 hover:text-white transition-colors"
          whileHover={{ scale: 1.05 }}
        >
          <svg 
            className={`w-6 h-6 transition-transform ${isExpanded ? 'rotate-180' : ''}`} 
            fill="currentColor" 
            viewBox="0 0 20 20"
          >
            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </motion.button>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              {/* Search */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search episodes..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    onFilterChange(e.target.value);
                  }}
                  className="episode-search-input w-full bg-white/10 backdrop-blur-sm rounded-xl py-3 px-4 pl-12 text-white placeholder-white/60 border border-white/20 focus:border-white/50 focus:outline-none transition-all"
                />
                <svg className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/60" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                </svg>
              </div>

              {/* Sort */}
              <select
                onChange={(e) => onSortChange(e.target.value)}
                className="w-full bg-white/10 backdrop-blur-sm rounded-xl py-3 px-4 text-white border border-white/20 focus:border-white/50 focus:outline-none appearance-none cursor-pointer"
              >
                <option value="default" className="bg-gray-800">Default Order</option>
                <option value="title" className="bg-gray-800">By Title</option>
                <option value="duration" className="bg-gray-800">By Duration</option>
                <option value="date" className="bg-gray-800">By Air Date</option>
              </select>

              {/* View Mode */}
              <div className="episode-view-toggle flex rounded-xl overflow-hidden border border-white/20">
                <button
                  onClick={() => onViewModeChange('grid')}
                  className={`flex-1 py-3 px-4 transition-all ${
                    viewMode === 'grid' 
                      ? 'active bg-white/20 text-white' 
                      : 'bg-white/5 text-white/70 hover:bg-white/10'
                  }`}
                >
                  <svg className="w-5 h-5 mx-auto" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                  </svg>
                </button>
                <button
                  onClick={() => onViewModeChange('list')}
                  className={`flex-1 py-3 px-4 transition-all ${
                    viewMode === 'list' 
                      ? 'active bg-white/20 text-white' 
                      : 'bg-white/5 text-white/70 hover:bg-white/10'
                  }`}
                >
                  <svg className="w-5 h-5 mx-auto" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Stats */}
            <div className="episode-stats flex items-center gap-6 text-white/60 text-sm">
              <div>Total Episodes: {episodes.length}</div>
              <div>With Previews: {episodes.filter(ep => ep.previewUrl).length}</div>
              <div>Available to Watch: {episodes.filter(ep => ep.url).length}</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// Preview Management Panel Component
const PreviewManagementPanel: React.FC<{
  animeId: string;
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

  const panelStyle = themePalette ? {
    backgroundColor: `${themePalette.dark}40`,
    borderColor: `${themePalette.primary}20`
  } : {
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderColor: 'rgba(255,255,255,0.2)'
  };

  const buttonStyle = themePalette ? {
    background: `linear-gradient(135deg, ${themePalette.secondary}, ${themePalette.accent})`,
    boxShadow: `0 4px 15px ${themePalette.secondary}30`
  } : {
    background: 'linear-gradient(135deg, #8B5CF6, #A855F7)',
    boxShadow: '0 4px 15px rgba(139, 92, 246, 0.3)'
  };

  return (
    <motion.div 
      className="backdrop-blur-lg border rounded-2xl p-4 mb-6"
      style={panelStyle}
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-white font-medium text-sm mb-1">Preview Status</h3>
          {episodePreviewStatus && (
            <p className="text-white/60 text-xs">
              {episodePreviewStatus.episodesWithPreviews} of {episodePreviewStatus.totalEpisodes} episodes have previews 
              ({episodePreviewStatus.previewPercentage}%)
            </p>
          )}
        </div>
        <motion.button
          onClick={handleEnrichPreviews}
          className="text-xs py-2 px-4 border-0 rounded-xl font-medium text-white transition-all"
          style={buttonStyle}
          disabled={isEnriching}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          {isEnriching ? (
            <>
              <span className="mr-2 animate-spin">🔄</span>
              Enriching...
            </>
          ) : (
            <>
              <span className="mr-2">🎬</span>
              Find Previews
            </>
          )}
        </motion.button>
      </div>

      {episodePreviewStatus && episodePreviewStatus.totalEpisodes > 0 && (
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-white/60 text-xs">Progress:</span>
            <div className="flex-1 bg-white/10 rounded-full h-2">
              <motion.div 
                className="h-2 rounded-full transition-all duration-500"
                style={{
                  width: `${episodePreviewStatus.previewPercentage}%`,
                  background: themePalette ? 
                    `linear-gradient(to right, ${themePalette.primary}, ${themePalette.accent})` :
                    'linear-gradient(to right, #10B981, #34D399)'
                }}
                initial={{ width: 0 }}
                animate={{ width: `${episodePreviewStatus.previewPercentage}%` }}
                transition={{ duration: 1, delay: 0.5 }}
              />
            </div>
            <span className="text-white text-xs">{episodePreviewStatus.previewPercentage}%</span>
          </div>
        </div>
      )}

      <AnimatePresence>
        {enrichmentResult && (
          <motion.div 
            className={`text-xs p-3 rounded-lg ${
              enrichmentResult.success 
                ? 'bg-green-500/20 border border-green-500/30 text-green-400' 
                : 'bg-red-500/20 border border-red-500/30 text-red-400'
            }`}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3 }}
          >
            {enrichmentResult.success ? '✅' : '❌'} {enrichmentResult.message || enrichmentResult.error}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// Enhanced Episodes Tab Component
export const EnhancedEpisodesTab: React.FC<{
  episodes: StreamingEpisode[];
  themePalette?: ColorPalette;
  onPreview: (previewUrl: string) => void;
  anime: any;
  animeId?: string; // Add animeId prop
}> = ({ episodes, themePalette, onPreview, anime, animeId }) => {
  const [filteredEpisodes, setFilteredEpisodes] = useState(episodes);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [currentEpisode, setCurrentEpisode] = useState(0);
  const [watchProgress, setWatchProgress] = useState<{[key: number]: number}>({});

  // Mock watched episodes data - in real app, this would come from user data
  const watchedEpisodes = new Set([0, 1, 2]); // First 3 episodes watched

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

  if (!episodes || episodes.length === 0) {
    return (
      <div className="ios-scroll-section px-6 py-8">
        <motion.div 
          className="backdrop-blur-xl border rounded-3xl p-12 text-center"
          style={{
            background: themePalette ? 
              `linear-gradient(135deg, ${themePalette.dark}40, ${themePalette.primary}10)` :
              'rgba(0, 0, 0, 0.4)',
            borderColor: themePalette?.primary + '20' || 'rgba(255, 255, 255, 0.2)'
          }}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6 }}
        >
          <motion.div 
            className="text-8xl mb-6 opacity-50"
            animate={{ 
              rotateY: [0, 360],
              scale: [1, 1.1, 1]
            }}
            transition={{ 
              duration: 4,
              repeat: Infinity,
              repeatType: "loop"
            }}
          >
            📺
          </motion.div>
          <h3 className="text-2xl text-white/70 mb-4 font-bold">No Episodes Available</h3>
          <p className="text-white/50 text-lg mb-6 max-w-md mx-auto">
            Episode data is not yet available for this anime. Check back later or help us by adding episode information.
          </p>
          <motion.button
            className="backdrop-blur-sm rounded-xl py-3 px-8 border text-white font-medium"
            style={{
              background: themePalette?.gradient || 'linear-gradient(135deg, #FF6B35, #E55A2B)',
              borderColor: themePalette?.primary + '60' || 'rgba(255, 107, 53, 0.6)'
            }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => {/* Handle add episodes */}}
          >
            Help Add Episodes
          </motion.button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="ios-scroll-section px-6 py-8">
      {/* Preview Management Panel for Testing */}
      <PreviewManagementPanel 
        animeId={animeId || anime?._id || ''}
        animeTitle={anime?.title || ''}
        themePalette={themePalette}
      />

      {/* Episodes Controls */}
      <EpisodesControls
        episodes={filteredEpisodes}
        onFilterChange={handleFilterChange}
        onSortChange={handleSortChange}
        onViewModeChange={setViewMode}
        viewMode={viewMode}
        themePalette={themePalette}
      />

      {/* Episodes Timeline */}
      <EpisodesTimeline
        episodes={filteredEpisodes}
        currentEpisode={currentEpisode}
        onEpisodeSelect={setCurrentEpisode}
        themePalette={themePalette}
      />

      {/* Episodes Grid */}
      {viewMode === 'grid' ? (
        <motion.div 
          className="episodes-grid grid gap-6 auto-rows-min"
          style={{
            gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
          }}
          layout
        >
          {filteredEpisodes.map((episode, index) => {
            const originalIndex = episodes.indexOf(episode);
            
            return (
              <CinematicEpisodeCard
                key={originalIndex}
                episode={episode}
                index={originalIndex}
                themePalette={themePalette}
                onPreview={onPreview}
                onWatch={handleWatchEpisode}
                isWatched={watchedEpisodes.has(originalIndex)}
                watchProgress={watchProgress[originalIndex] || 0}
                isFeatured={false}
              />
            );
          })}
        </motion.div>
      ) : (
        // List View
        <div className="space-y-4">
          {filteredEpisodes.map((episode, index) => {
            const originalIndex = episodes.indexOf(episode);
            
            return (
              <motion.div
                key={originalIndex}
                className="episode-list-item backdrop-blur-xl rounded-2xl p-6 border"
                style={{
                  background: themePalette ? 
                    `linear-gradient(90deg, ${themePalette.dark}60, ${themePalette.primary}10)` :
                    'rgba(0, 0, 0, 0.4)',
                  borderColor: themePalette?.primary + '20' || 'rgba(255, 255, 255, 0.2)'
                }}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                whileHover={{ scale: 1.01 }}
              >
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0">
                    {episode.thumbnail ? (
                      <img 
                        src={episode.thumbnail} 
                        alt={episode.title || `Episode ${originalIndex + 1}`}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div 
                        className="w-full h-full flex items-center justify-center"
                        style={{ background: themePalette?.gradient }}
                      >
                        <span className="text-white font-bold">{originalIndex + 1}</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex-1">
                    <h4 className="text-white font-semibold text-lg mb-1">
                      {episode.title || `Episode ${originalIndex + 1}`}
                    </h4>
                    <div className="episode-stats flex items-center gap-4 text-white/60 text-sm">
                      <span>EP {originalIndex + 1}</span>
                      {episode.duration && <span>{episode.duration}</span>}
                      {episode.site && <span>{episode.site}</span>}
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    {episode.previewUrl && (
                      <button
                        onClick={() => onPreview(episode.previewUrl!)}
                        className="bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-xl py-2 px-4 text-white font-medium transition-all"
                      >
                        Preview
                      </button>
                    )}
                    {episode.url && (
                      <button
                        onClick={() => handleWatchEpisode(episode.url!)}
                        className="backdrop-blur-sm rounded-xl py-2 px-4 text-white font-medium transition-all"
                        style={{
                          background: themePalette?.gradient || 'linear-gradient(135deg, #FF6B35, #E55A2B)'
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
      )}
    </div>
  );
};