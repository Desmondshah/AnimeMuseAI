// Enhanced DiscoverPage.tsx with more prominent 3D mobile effects
import React, { useState, useEffect, useCallback, memo, useRef } from "react";
import { usePaginatedQuery, useQuery, useAction } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id, Doc } from "../../../../convex/_generated/dataModel";
import AnimeCard from "../AnimeCard";
import StyledButton from "../shared/StyledButton";
import ParallaxBackground from "../shared/ParallaxBackground";
import { toast } from "sonner";

interface FilterState {
  genres: string[];
  yearRange: { min?: number; max?: number };
  ratingRange: { min?: number; max?: number };
  userRatingRange: { min?: number; max?: number };
  minReviews?: number;
  studios: string[];
  themes: string[];
  emotionalTags: string[];
}

type SortOption =
  | "newest" | "oldest" | "title_asc" | "title_desc" | "year_desc" | "year_asc"
  | "rating_desc" | "rating_asc" | "user_rating_desc" | "user_rating_asc"
  | "most_reviewed" | "least_reviewed";

type UISortOption = SortOption | "relevance";

const sortOptions: { value: UISortOption; label: string; backendValue?: SortOption }[] = [
  { value: "relevance", label: "Most Relevant", backendValue: "newest" },
  { value: "newest", label: "Newest Added" },
  { value: "oldest", label: "Oldest Added" },
  { value: "year_desc", label: "Release Year (Newest)" },
  { value: "year_asc", label: "Release Year (Oldest)" },
  { value: "rating_desc", label: "External Rating (High-Low)" },
  { value: "rating_asc", label: "External Rating (Low-High)" },
  { value: "user_rating_desc", label: "User Rating (High-Low)" },
  { value: "user_rating_asc", label: "User Rating (Low-High)" },
  { value: "most_reviewed", label: "Most Reviewed" },
  { value: "least_reviewed", label: "Least Reviewed" },
];

interface DiscoverPageProps {
  onViewDetails: (animeId: Id<"anime">) => void;
  onBack?: () => void;
}

// Enhanced 3D Tilt Card Component (Optimized)
const TiltCard3D: React.FC<{
  children: React.ReactNode;
  index: number;
  tiltX: number;
  tiltY: number;
  isGyroActive: boolean;
}> = memo(({ children, index, tiltX, tiltY, isGyroActive }) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [localTilt, setLocalTilt] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  // Touch handling for mobile (simplified)
  const handleTouch = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    if (isGyroActive) return;
    
    const card = cardRef.current;
    if (!card) return;
    
    const touch = e.touches[0];
    const rect = card.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    const x = touch.clientX - centerX;
    const y = touch.clientY - centerY;
    
    const rotateX = (y / (rect.height / 2)) * -10; // Reduced for performance
    const rotateY = (x / (rect.width / 2)) * 10;
    
    setLocalTilt({ x: rotateX, y: rotateY });
    setIsHovered(true);
  }, [isGyroActive]);

  // Mouse handling for desktop
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (isGyroActive) return;
    
    const card = cardRef.current;
    if (!card) return;
    
    const rect = card.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    const x = e.clientX - centerX;
    const y = e.clientY - centerY;
    
    const rotateX = (y / (rect.height / 2)) * -10;
    const rotateY = (x / (rect.width / 2)) * 10;
    
    setLocalTilt({ x: rotateX, y: rotateY });
    setIsHovered(true);
  }, [isGyroActive]);

  const handleMouseLeave = useCallback(() => {
    if (!isGyroActive) {
      setLocalTilt({ x: 0, y: 0 });
      setIsHovered(false);
    }
  }, [isGyroActive]);

  const handleTouchEnd = useCallback(() => {
    if (!isGyroActive) {
      setLocalTilt({ x: 0, y: 0 });
      setIsHovered(false);
    }
  }, [isGyroActive]);

  // Use gyro tilt if active, otherwise use local interaction tilt
  const finalTiltX = isGyroActive ? tiltX * 1.2 : localTilt.x;
  const finalTiltY = isGyroActive ? tiltY * 1.2 : localTilt.y;

  // Simplified depth calculation
  const depthZ = isHovered || (isGyroActive && (Math.abs(finalTiltX) > 2 || Math.abs(finalTiltY) > 2)) ? 10 : 0;

  return (
    <div
      ref={cardRef}
      className="tilt-card-3d" // Removed p-2 as padding is handled in CSS
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onTouchMove={handleTouch}
      onTouchEnd={handleTouchEnd}
      style={{
        transform: `
          perspective(800px)
          rotateX(${finalTiltX}deg)
          rotateY(${finalTiltY}deg)
          translateZ(${depthZ}px)
        `,
        transition: 'transform 0.2s ease-out',
        transformStyle: 'preserve-3d',
        zIndex: isHovered || (isGyroActive && depthZ > 0) ? 1000 + index : index,
      }}
    >
      <div className="card-3d-inner">
        {/* Simplified shadow - only show on hover/active */}
        {(isHovered || (isGyroActive && depthZ > 0)) && (
          <div 
            className="card-3d-shadow"
            style={{
              transform: `translateZ(-10px) scale(0.95)`,
              opacity: 0.3,
            }}
          />
        )}
        
        {/* Glow effect on hover */}
        {(isHovered || (isGyroActive && depthZ > 0)) && (
          <div 
            className="card-3d-glow"
            style={{
              opacity: 0.5,
            }}
          />
        )}
        
        {/* Main content */}
        <div className="card-3d-content">
          {children}
        </div>
      </div>
    </div>
  );
});

const DiscoverLoadingSpinner: React.FC<{ message?: string }> = memo(({ message = "Discovering anime..." }) => (
  <div className="flex flex-col justify-center items-center h-64 py-10">
    <div className="relative">
      <div className="w-16 h-16 border-4 border-transparent border-t-brand-primary-action border-r-brand-accent-gold rounded-full animate-spin"></div>
      <div className="absolute top-2 left-2 w-12 h-12 border-4 border-transparent border-b-brand-accent-peach border-l-white/50 rounded-full animate-spin animate-reverse"></div>
      <div className="absolute top-4 left-4 w-8 h-8 bg-gradient-to-r from-brand-primary-action to-brand-accent-gold rounded-full animate-pulse"></div>
    </div>
    <p className="mt-4 text-base text-white/80 font-medium animate-pulse">{message}</p>
  </div>
));

const FilterSection: React.FC<{title: string; children: React.ReactNode; icon?: string}> = memo(({title, children, icon}) => (
  <div className="group relative overflow-hidden rounded-2xl bg-black/30 backdrop-blur-sm border border-white/10 p-4 transition-all duration-300 hover:border-white/30 hover:bg-black/40">
    <div className="absolute inset-0 bg-gradient-to-br from-brand-primary-action/5 to-brand-accent-gold/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
    <div className="relative z-10">
      <h4 className="text-sm font-heading text-white/90 mb-3 flex items-center gap-2">
        {icon && <span className="text-lg">{icon}</span>}
        {title}
      </h4>
      {children}
    </div>
  </div>
));

export default function DiscoverPage({ onViewDetails, onBack }: DiscoverPageProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<UISortOption>("newest");
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    genres: [], yearRange: {}, ratingRange: {}, userRatingRange: {},
    minReviews: undefined, studios: [], themes: [], emotionalTags: [],
  });
  
  // Poster enhancement state
  const [isEnhancingPosters, setIsEnhancingPosters] = useState(false);
  const [enhancementProgress, setEnhancementProgress] = useState<{current: number; total: number} | null>(null);

  // Enhanced 3D tilt state
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [gyroSupported, setGyroSupported] = useState(false);
  const [gyroActive, setGyroActive] = useState(false);
  const [showPermissionUI, setShowPermissionUI] = useState(false);

  const filterOptions = useQuery(api.anime.getFilterOptions);
  const enhanceBatchPosters = useAction(api.externalApis.callBatchEnhanceVisibleAnimePosters);

  // Check for device orientation support
  useEffect(() => {
    // Check if device orientation is available
    if ('DeviceOrientationEvent' in window) {
      // Check if it's iOS 13+ which requires permission
      if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
        setGyroSupported(true);
        setShowPermissionUI(true);
      } else {
        // Non-iOS or older iOS - try to detect if it works
        let hasReceivedEvent = false;
        
        const testHandler = (event: DeviceOrientationEvent) => {
          if (event.alpha !== null || event.beta !== null || event.gamma !== null) {
            hasReceivedEvent = true;
            setGyroSupported(true);
            setGyroActive(true);
            window.removeEventListener('deviceorientation', testHandler);
          }
        };
        
        window.addEventListener('deviceorientation', testHandler);
        
        // Remove test handler after 2 seconds if no event received
        setTimeout(() => {
          window.removeEventListener('deviceorientation', testHandler);
          if (!hasReceivedEvent) {
            console.log('Device orientation not supported or not moving');
          }
        }, 2000);
      }
    }
  }, []);

  // Request gyro permission (iOS 13+)
  const requestGyroPermission = useCallback(async () => {
    if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
      try {
        const permission = await (DeviceOrientationEvent as any).requestPermission();
        if (permission === 'granted') {
          setGyroActive(true);
          setShowPermissionUI(false);
          toast.success('3D tilt effects enabled! Move your device to see the magic ✨');
        } else {
          toast.error('Permission denied. You can still use touch to see 3D effects!');
          setShowPermissionUI(false);
        }
      } catch (error) {
        console.error('Error requesting device orientation permission:', error);
        toast.error('Could not enable 3D effects');
        setShowPermissionUI(false);
      }
    } else if (gyroSupported) {
      // For non-iOS devices that support gyro
      setGyroActive(true);
      toast.success('3D effects activated! Tilt your device 🎮');
    }
  }, [gyroSupported]);

  // Handle device orientation with smoothing
  useEffect(() => {
    if (!gyroActive) return;

    let targetTilt = { x: 0, y: 0 };
    let rafId: number;

    const handleOrientation = (event: DeviceOrientationEvent) => {
      const { beta, gamma } = event;
      
      if (beta !== null && gamma !== null) {
        // Normalize values
        targetTilt.x = Math.max(-20, Math.min(20, beta - 45)) / 4;
        targetTilt.y = Math.max(-20, Math.min(20, gamma)) / 4;
      }
    };

    const smoothUpdate = () => {
      setTilt((prev) => {
        const dx = targetTilt.x - prev.x;
        const dy = targetTilt.y - prev.y;
        const factor = 0.1; // smoothing factor
        return {
          x: prev.x + dx * factor,
          y: prev.y + dy * factor,
        };
      });
      rafId = requestAnimationFrame(smoothUpdate);
    };

    window.addEventListener('deviceorientation', handleOrientation);
    // Update tilt at 30fps for better performance
    rafId = requestAnimationFrame(smoothUpdate);
    
    return () => {
      window.removeEventListener('deviceorientation', handleOrientation);
      cancelAnimationFrame(rafId);
    };
  }, [gyroActive]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearchQuery(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    if (debouncedSearchQuery && sortBy !== "relevance") setSortBy("relevance");
    else if (!debouncedSearchQuery && sortBy === "relevance") setSortBy("newest");
  }, [debouncedSearchQuery, sortBy]);

  const getBackendSortOption = (uiSortOption: UISortOption): SortOption => {
    const option = sortOptions.find(opt => opt.value === uiSortOption);
    return option?.backendValue || (uiSortOption as SortOption);
  };

  const {
    results: animeList, status, loadMore, isLoading,
  } = usePaginatedQuery(
    api.anime.getFilteredAnime,
    {
      searchTerm: debouncedSearchQuery || undefined,
      filters: Object.values(filters).some(value => 
        Array.isArray(value) ? value.length > 0 : 
        typeof value === 'object' ? Object.values(value).some(v => v !== undefined) : 
        value !== undefined
      ) ? filters : undefined,
      sortBy: getBackendSortOption(sortBy),
    },
    { initialNumItems: 20 }
  );

  const filteredAnimeList = animeList;

  useEffect(() => {
    const mediaQuery = window.matchMedia('(min-width: 768px)');
    const handleResize = (e: MediaQueryListEvent) => setShowFilters(e.matches);
    setShowFilters(mediaQuery.matches);
    mediaQuery.addEventListener('change', handleResize);
    return () => mediaQuery.removeEventListener('change', handleResize);
  }, []);

  const updateFilter = useCallback(<K extends keyof FilterState>(key: K, value: FilterState[K]) => setFilters(prev => ({ ...prev, [key]: value })), []);
  const toggleArrayFilter = useCallback((key: keyof Pick<FilterState, "genres" | "studios" | "themes" | "emotionalTags">, value: string) => setFilters(prev => ({ ...prev, [key]: prev[key].includes(value) ? prev[key].filter(item => item !== value) : [...prev[key], value] })), []);
  const clearFilters = useCallback(() => setFilters({ genres: [], yearRange: {}, ratingRange: {}, userRatingRange: {}, minReviews: undefined, studios: [], themes: [], emotionalTags: [] }), []);
  const clearSearch = useCallback(() => { setSearchQuery(""); setDebouncedSearchQuery(""); }, []);
  const clearAll = useCallback(() => { clearFilters(); clearSearch(); }, [clearFilters, clearSearch]);

  const handleEnhancePosters = useCallback(async () => {
    if (!filteredAnimeList || filteredAnimeList.length === 0) {
      toast.error("No anime to enhance!");
      return;
    }

    setIsEnhancingPosters(true);
    setEnhancementProgress({ current: 0, total: filteredAnimeList.length });

    const toastId = "enhance-posters";
    toast.loading("Enhancing anime posters...", { id: toastId });

    try {
      const animeIds = filteredAnimeList.slice(0, 24).map(anime => anime._id);
      
      const result = await enhanceBatchPosters({
        animeIds: animeIds,
        messageId: `batch-enhance-${Date.now()}`
      });

      if (result.error) {
        toast.error(`Enhancement failed: ${result.error}`, { id: toastId });
      } else {
        toast.success(`Enhanced ${result.enhancedCount} out of ${animeIds.length} anime posters!`, { id: toastId });
      }
    } catch (error: any) {
      console.error("Poster enhancement error:", error);
      toast.error(`Enhancement failed: ${error.message}`, { id: toastId });
    } finally {
      setIsEnhancingPosters(false);
      setEnhancementProgress(null);
    }
  }, [filteredAnimeList, enhanceBatchPosters]);

  const activeFilterCount = Object.values(filters).reduce((acc, value) => Array.isArray(value) ? acc + value.length : typeof value === 'object' ? acc + Object.values(value).filter(v => v !== undefined).length : value !== undefined ? acc + 1 : acc, 0);
  const hasActiveFilters = activeFilterCount > 0;
  const hasActiveSearch = debouncedSearchQuery.length > 0;
  const hasAnyActive = hasActiveFilters || hasActiveSearch;

  return (
    <div className="relative min-h-screen">
      <style jsx>{`
        .tilt-card-3d {
          position: relative;
          transform-style: preserve-3d;
          cursor: pointer;
          will-change: transform;
          z-index: 0;
        }
        
        .card-3d-inner {
          position: relative;
          transform-style: preserve-3d;
          width: 100%;
          height: 100%;
        }
        
        .card-3d-shadow {
          position: absolute;
          inset: 4px;
          background: rgba(0, 0, 0, 0.4);
          border-radius: 0.75rem; /* Match the card radius */
          filter: blur(8px);
          pointer-events: none;
        }
        
        .card-3d-glow {
          position: absolute;
          inset: -2px;
          background: linear-gradient(135deg, 
            rgba(255, 107, 53, 0.4), 
            rgba(176, 137, 104, 0.4));
          border-radius: 0.75rem; /* Match the card radius */
          opacity: 0;
          filter: blur(8px);
          pointer-events: none;
          transition: opacity 0.3s ease;
        }
        
        .card-3d-content {
          position: relative;
          transform-style: preserve-3d;
          backface-visibility: hidden;
          width: 100%;
          height: 100%;
        }
        
        /* Mobile grid spacing */
        @media (max-width: 768px) {
          .discovery-grid-3d {
            perspective: 1200px;
            transform-style: preserve-3d;
          }
        }
        
        /* Ensure proper grid layout and spacing */
        .discovery-grid {
          display: grid !important;
          row-gap: 1rem;
        }
        
        @media (max-width: 640px) {
          .discovery-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
            column-gap: 0.5rem !important; /* 8px */
            row-gap: 1rem !important; /* 16px vertical spacing */
            padding: 0 0.25rem; /* 4px */
          }
        }
        
        @media (min-width: 641px) and (max-width: 768px) {
          .discovery-grid {
            grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
            column-gap: 0.75rem !important; /* 12px */
            row-gap: 1.25rem !important; /* 20px vertical spacing */
          }
        }
        
        @media (min-width: 769px) {
          .discovery-grid {
            grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
            column-gap: 1rem !important; /* 16px */
            row-gap: 1.5rem !important; /* 24px vertical spacing */
          }
        }
        
        @media (min-width: 1024px) {
          .discovery-grid {
            grid-template-columns: repeat(6, minmax(0, 1fr)) !important;
            column-gap: 1.25rem !important; /* 20px */
            row-gap: 1.75rem !important; /* 28px vertical spacing */
          }
        }
        
        @media (prefers-reduced-motion: reduce) {
          .tilt-card-3d {
            transform: none !important;
          }
          .card-3d-shadow,
          .card-3d-glow {
            display: none;
          }
        }
        
        .gyro-indicator {
          position: fixed;
          top: 80px;
          right: 20px;
          background: rgba(0, 0, 0, 0.8);
          color: white;
          padding: 8px 16px;
          border-radius: 20px;
          font-size: 12px;
          z-index: 100;
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.2);
        }
        
        .permission-banner {
          animation: slideDown 0.5s ease-out;
        }
        
        @keyframes slideDown {
          from {
            transform: translateY(-100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
      `}</style>

      {/* Enhanced 3D Permission Banner */}
      {showPermissionUI && (
        <div className="fixed top-16 left-0 right-0 z-50 px-4 permission-banner">
          <div className="bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 rounded-2xl p-5 shadow-2xl max-w-md mx-auto border border-white/20">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-3xl">🎮</span>
              <h3 className="text-white font-bold text-lg">Enable 3D Tilt Effects!</h3>
            </div>
            <p className="text-white/90 text-sm mb-4">
              Move your phone to see anime cards float in 3D space. It's like magic! ✨
            </p>
            <div className="flex gap-3">
              <button
                onClick={requestGyroPermission}
                className="bg-white text-purple-600 px-6 py-2.5 rounded-xl font-medium text-sm hover:bg-white/90 transition-all transform hover:scale-105"
              >
                Enable 3D Motion
              </button>
              <button
                onClick={() => setShowPermissionUI(false)}
                className="bg-white/20 text-white px-4 py-2.5 rounded-xl font-medium text-sm hover:bg-white/30 transition-all"
              >
                Maybe Later
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Gyro Status Indicator (for debugging) */}
      {gyroActive && (
        <div className="gyro-indicator">
          <span className="flex items-center gap-2">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            3D Motion Active
          </span>
        </div>
      )}

      {/* Animated Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <ParallaxBackground
          speed={0.1}
          className="absolute top-0 left-0 w-96 h-96 bg-gradient-to-br from-brand-primary-action/10 to-transparent rounded-full blur-3xl animate-pulse"
        />
        <ParallaxBackground
          speed={0.15}
          className="absolute bottom-0 right-0 w-80 h-80 bg-gradient-to-tl from-brand-accent-gold/10 to-transparent rounded-full blur-3xl animate-pulse delay-1000"
        />
        <ParallaxBackground
          speed={0.08}
          className="absolute top-1/3 right-1/4 w-64 h-64 bg-gradient-to-r from-brand-accent-peach/8 to-transparent rounded-full blur-3xl animate-pulse delay-2000"
        />
        <ParallaxBackground
          speed={0.12}
          className="absolute bottom-1/3 left-1/4 w-72 h-72 bg-gradient-to-l from-purple-500/8 to-transparent rounded-full blur-3xl animate-pulse delay-3000"
        />
      </div>

      {/* Main Content */}
      <div className="relative z-10 px-4 sm:px-6 py-8 space-y-8">
        {/* Hero Header */}
        <div className="text-center space-y-4">
          <div className="inline-block">
            <h1 className="hero-title font-heading text-white font-bold bg-gradient-to-r from-white via-brand-accent-gold to-white bg-clip-text text-transparent animate-pulse">
              🌟 Discover Anime
            </h1>
            <div className="h-1 w-full bg-gradient-to-r from-transparent via-brand-primary-action to-transparent mt-4 animate-pulse"></div>
          </div>
          <p className="mobile-optimized-text text-white/80 max-w-2xl mx-auto">
            Explore our curated collection and find your next anime obsession
            {(gyroActive || !gyroSupported) && (
              <span className="block text-sm mt-2 text-brand-accent-gold animate-pulse">
                {gyroActive ? '✨ Tilt your device to see 3D effects!' : '👆 Touch and drag cards for 3D effects!'}
              </span>
            )}
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            {onBack && (
              <StyledButton 
                onClick={onBack} 
                variant="ghost" 
                className="!text-sm !bg-white/10 !backdrop-blur-sm !border-white/20 hover:!bg-white/20 !text-white"
              >
                ← Back to Dashboard
              </StyledButton>
            )}
            
            {/* 3D Toggle Button */}
            {gyroSupported && !gyroActive && !showPermissionUI && (
              <StyledButton 
                onClick={requestGyroPermission}
                variant="secondary"
                className="!text-sm !bg-gradient-to-r !from-purple-600 !to-pink-600 hover:!from-pink-600 hover:!to-purple-600 !text-white !border-0"
              >
                <span className="flex items-center gap-2">
                  🎮 Enable 3D Motion
                </span>
              </StyledButton>
            )}
            
            <StyledButton 
              onClick={handleEnhancePosters}
              disabled={isEnhancingPosters || !filteredAnimeList || filteredAnimeList.length === 0}
              variant="secondary"
              className="!text-sm !bg-gradient-to-r !from-purple-600 !to-blue-600 hover:!from-blue-600 hover:!to-purple-600 !text-white !border-0"
            >
              {isEnhancingPosters ? (
                <span className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Enhancing Posters...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  🖼️ Enhance Posters
                </span>
              )}
            </StyledButton>
          </div>
          
          {enhancementProgress && (
            <div className="inline-flex items-center space-x-2 bg-black/30 backdrop-blur-sm rounded-full px-6 py-3 border border-white/20">
              <span className="text-white/80 text-sm">
                Enhancing: {enhancementProgress.current}/{enhancementProgress.total}
              </span>
            </div>
          )}
        </div>

        {/* Advanced Search Section */}
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-brand-primary-action/20 via-transparent to-brand-accent-gold/20 rounded-3xl blur-xl"></div>
          <div className="relative bg-black/30 backdrop-blur-sm border border-white/10 rounded-3xl p-6">
            <div className="flex flex-col lg:flex-row gap-4 items-center">
              <div className="relative flex-1 group">
                <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                  <svg className="w-5 h-5 text-white/60 group-focus-within:text-brand-primary-action transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input 
                  type="text" 
                  placeholder="Search anime titles, descriptions, genres..." 
                  value={searchQuery} 
                  onChange={(e) => setSearchQuery(e.target.value)} 
                  className="w-full bg-black/40 backdrop-blur-sm border border-white/20 rounded-2xl pl-12 pr-12 py-4 text-white placeholder-white/60 focus:border-brand-primary-action focus:ring-2 focus:ring-brand-primary-action/50 focus:outline-none transition-all duration-300"
                />
                {searchQuery && (
                  <button 
                    onClick={clearSearch} 
                    className="absolute inset-y-0 right-4 flex items-center text-white/60 hover:text-white transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>

              <div className="flex items-center gap-4">
                <select 
                  value={sortBy} 
                  onChange={(e) => setSortBy(e.target.value as UISortOption)} 
                  className="bg-black/40 backdrop-blur-sm border border-white/20 rounded-xl px-4 py-3 text-white text-sm focus:border-brand-primary-action focus:ring-2 focus:ring-brand-primary-action/50 focus:outline-none transition-all duration-300"
                >
                  {sortOptions.map(option => (
                    <option key={option.value} value={option.value} disabled={option.value === "relevance" && !hasActiveSearch} className="bg-black text-white">
                      {option.label}
                    </option>
                  ))}
                </select>

                <StyledButton
                  onClick={() => setShowFilters(!showFilters)}
                  variant={showFilters ? "primary_small" : "ghost"}
                  className={`relative ${showFilters ? '' : '!bg-white/10 !backdrop-blur-sm !border-white/20 hover:!bg-white/20 !text-white'}`}
                >
                  🎛️ Filters
                  {hasActiveFilters && (
                    <span className="absolute -top-2 -right-2 bg-brand-primary-action text-white text-xs font-bold px-2 py-1 rounded-full animate-pulse">
                      {activeFilterCount}
                    </span>
                  )}
                </StyledButton>
              </div>
            </div>

            {hasAnyActive && (
              <div className="mt-4 pt-4 border-t border-white/10 flex justify-center">
                <StyledButton 
                  onClick={clearAll} 
                  variant="ghost" 
                  className="!text-sm !bg-white/10 !backdrop-blur-sm !border-white/20 hover:!bg-white/20 !text-white"
                >
                  ✨ Clear All Filters
                </StyledButton>
              </div>
            )}
          </div>
        </div>

        {hasActiveSearch && (
          <div className="text-center">
            <div className="inline-flex items-center space-x-2 bg-black/30 backdrop-blur-sm rounded-full px-6 py-3 border border-white/20">
              <span className="text-white/80 text-sm">
                {isLoading && status === "LoadingFirstPage" ? (
                  <span className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Searching database...
                  </span>
                ) : (
                  <>
                    🔍 Found <span className="text-brand-accent-gold font-bold">{filteredAnimeList?.length || 0}</span>
                    {status === "CanLoadMore" && "+"} results for <span className="text-brand-primary-action font-medium">"{debouncedSearchQuery}"</span>
                  </>
                )}
              </span>
            </div>
          </div>
        )}

        {showFilters && filterOptions && (
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-b from-purple-500/10 to-blue-500/10 rounded-3xl blur-xl"></div>
            <div className="relative bg-black/40 backdrop-blur-sm border border-white/10 rounded-3xl p-6 space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-heading text-white">🎛️ Advanced Filters</h2>
                {hasActiveFilters && (
                  <StyledButton 
                    onClick={clearFilters} 
                    variant="ghost" 
                    className="!text-sm !bg-white/10 !backdrop-blur-sm !border-white/20 hover:!bg-white/20 !text-white"
                  >
                    Clear Filters
                  </StyledButton>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filterOptions.genres && filterOptions.genres.length > 0 && (
                  <FilterSection title="Genres" icon="🎭">
                    <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto custom-scrollbar">
                      {filterOptions.genres.map(genre => (
                        <button
                          key={genre}
                          onClick={() => toggleArrayFilter("genres", genre)}
                          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${
                            filters.genres.includes(genre)
                              ? 'bg-brand-primary-action text-white shadow-lg shadow-brand-primary-action/50'
                              : 'bg-white/10 text-white/80 hover:bg-white/20 hover:text-white'
                          }`}
                        >
                          {genre}
                        </button>
                      ))}
                    </div>
                  </FilterSection>
                )}

                {filterOptions.yearRange && (
                  <FilterSection title="Release Year" icon="📅">
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <input 
                          type="number" 
                          min={filterOptions.yearRange.min} 
                          max={filterOptions.yearRange.max} 
                          value={filters.yearRange.min || ""} 
                          onChange={e => updateFilter("yearRange", { ...filters.yearRange, min: e.target.value ? parseInt(e.target.value) : undefined })} 
                          className="bg-black/40 backdrop-blur-sm border border-white/20 rounded-lg px-3 py-2 text-white text-sm placeholder-white/50 focus:border-brand-primary-action focus:outline-none flex-1"
                          placeholder={`Min: ${filterOptions.yearRange.min}`}
                        />
                        <span className="text-white/60">—</span>
                        <input 
                          type="number" 
                          min={filterOptions.yearRange.min} 
                          max={filterOptions.yearRange.max} 
                          value={filters.yearRange.max || ""} 
                          onChange={e => updateFilter("yearRange", { ...filters.yearRange, max: e.target.value ? parseInt(e.target.value) : undefined })} 
                          className="bg-black/40 backdrop-blur-sm border border-white/20 rounded-lg px-3 py-2 text-white text-sm placeholder-white/50 focus:border-brand-primary-action focus:outline-none flex-1"
                          placeholder={`Max: ${filterOptions.yearRange.max}`}
                        />
                      </div>
                    </div>
                  </FilterSection>
                )}

                {filterOptions.ratingRange && (
                  <FilterSection title="External Rating" icon="⭐">
                    <div className="flex items-center gap-3">
                      <input 
                        type="number" 
                        min={filterOptions.ratingRange.min} 
                        max={filterOptions.ratingRange.max} 
                        step="0.1" 
                        value={filters.ratingRange.min || ''} 
                        onChange={e => updateFilter('ratingRange', { ...filters.ratingRange, min: e.target.value ? parseFloat(e.target.value) : undefined })} 
                        className="bg-black/40 backdrop-blur-sm border border-white/20 rounded-lg px-3 py-2 text-white text-sm placeholder-white/50 focus:border-brand-primary-action focus:outline-none flex-1"
                        placeholder={`Min: ${filterOptions.ratingRange.min?.toFixed(1)}`}
                      />
                      <span className="text-white/60">—</span>
                      <input 
                        type="number" 
                        min={filterOptions.ratingRange.min} 
                        max={filterOptions.ratingRange.max} 
                        step="0.1" 
                        value={filters.ratingRange.max || ''} 
                        onChange={e => updateFilter('ratingRange', { ...filters.ratingRange, max: e.target.value ? parseFloat(e.target.value) : undefined })} 
                        className="bg-black/40 backdrop-blur-sm border border-white/20 rounded-lg px-3 py-2 text-white text-sm placeholder-white/50 focus:border-brand-primary-action focus:outline-none flex-1"
                        placeholder={`Max: ${filterOptions.ratingRange.max?.toFixed(1)}`}
                      />
                    </div>
                  </FilterSection>
                )}

                <FilterSection title="Minimum Reviews" icon="📝">
                  <input 
                    type="number" 
                    min="0" 
                    value={filters.minReviews || ""} 
                    onChange={e => updateFilter("minReviews", e.target.value ? parseInt(e.target.value) : undefined)} 
                    className="bg-black/40 backdrop-blur-sm border border-white/20 rounded-lg px-3 py-2 text-white text-sm placeholder-white/50 focus:border-brand-primary-action focus:outline-none w-full"
                    placeholder="e.g., 5"
                  />
                </FilterSection>
              </div>
            </div>
          </div>
        )}

        {isLoading && status === "LoadingFirstPage" && (
          <DiscoverLoadingSpinner message={hasActiveSearch ? "Searching your anime database..." : "Discovering anime..."} />
        )}
        
        {filteredAnimeList && filteredAnimeList.length > 0 ? (
          <div className="space-y-8">
            <div className="text-center">
              <div className="inline-flex items-center space-x-2 bg-black/30 backdrop-blur-sm rounded-full px-6 py-3 border border-white/20">
                <span className="text-white/80 text-sm">
                  Showing <span className="text-brand-accent-gold font-bold">{filteredAnimeList.length}</span>
                  {!hasActiveSearch && status === "CanLoadMore" && "+"} anime
                  {hasActiveSearch && " matching your search"}
                  {hasActiveFilters && " (filtered)"}
                </span>
              </div>
            </div>

            {/* Enhanced 3D Grid */}
            <div className="discovery-grid discovery-grid-3d">
              {filteredAnimeList.map((anime, index) => (
                <TiltCard3D
                  key={anime._id}
                  index={index}
                  tiltX={tilt.x}
                  tiltY={tilt.y}
                  isGyroActive={gyroActive}
                >
                  <div className="relative bg-black/20 backdrop-blur-sm rounded-xl overflow-hidden border border-white/10">
                    <AnimeCard anime={anime as Doc<"anime">} onViewDetails={onViewDetails} className="w-full" />
                    
                    <div className="p-1.5 sm:p-2 bg-gradient-to-t from-black/80 to-transparent">
                      <h4 
                        className="text-xs sm:text-sm font-medium text-white text-center leading-tight"
                        style={{
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                          lineHeight: '1.2',
                          maxHeight: '2.4em',
                        }}
                        title={anime.title}
                      >
                        {anime.title}
                      </h4>
                    </div>
                  </div>
                </TiltCard3D>
              ))}
            </div>

            {status === "CanLoadMore" && (
              <div className="text-center">
                <StyledButton 
                  onClick={() => loadMore(20)} 
                  disabled={isLoading && status === "LoadingMore"} 
                  variant="ghost"
                  className="!bg-white/10 !backdrop-blur-sm !border-white/20 hover:!bg-white/20 !text-white !px-8 !py-4"
                >
                  {isLoading && status === "LoadingMore" ? (
                    <span className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Loading More...
                    </span>
                  ) : hasActiveSearch ? (
                    "🔍 Load More Search Results"
                  ) : (
                    "🔍 Discover More Anime"
                  )}
                </StyledButton>
              </div>
            )}

            {status === "Exhausted" && filteredAnimeList.length > 0 && (
              <div className="text-center">
                <div className="inline-flex items-center space-x-2 bg-black/30 backdrop-blur-sm rounded-full px-6 py-3 border border-white/20">
                  <span className="text-white/80 text-sm">
                    ✨ {hasActiveSearch ? "All search results shown!" : "You've discovered all available anime!"}
                  </span>
                </div>
              </div>
            )}
          </div>
        ) : (
          status !== "LoadingFirstPage" && (
            <div className="text-center py-16">
              <div className="bg-black/30 backdrop-blur-sm rounded-3xl p-12 border border-white/10 max-w-lg mx-auto">
                <div className="text-8xl mb-6 animate-bounce">🔍</div>
                <h3 className="text-2xl font-heading text-white mb-4">No Anime Found</h3>
                <p className="text-white/80 text-lg mb-6 leading-relaxed">
                  {hasActiveSearch 
                    ? `No anime matches "${debouncedSearchQuery}"${hasActiveFilters ? " with current filters" : ""}.`
                    : hasActiveFilters 
                    ? "No anime matches your current filters."
                    : "The anime database is empty right now."
                  }
                </p>
                <div className="flex flex-wrap gap-3 justify-center">
                  {hasActiveSearch && (
                    <StyledButton 
                      onClick={clearSearch} 
                      variant="ghost"
                      className="!bg-white/10 !backdrop-blur-sm !border-white/20 hover:!bg-white/20 !text-white"
                    >
                      Clear Search
                    </StyledButton>
                  )}
                  {hasActiveFilters && (
                    <StyledButton 
                      onClick={clearFilters} 
                      variant="ghost"
                      className="!bg-white/10 !backdrop-blur-sm !border-white/20 hover:!bg-white/20 !text-white"
                    >
                      Clear Filters
                    </StyledButton>
                  )}
                  {hasAnyActive && (
                    <StyledButton 
                      onClick={clearAll} 
                      variant="primary_small"
                    >
                      Start Fresh
                    </StyledButton>
                  )}
                </div>
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
}