// Enhanced DiscoverPage.tsx with BRUTALIST AESTHETIC and Mobile-First Design
import React, { useState, useEffect, useCallback, memo, useMemo } from "react";
import { usePaginatedQuery, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id, Doc } from "../../../../convex/_generated/dataModel";
import AnimeCard from "../AnimeCard";
import StyledButton from "../shared/StyledButton";
import { toast } from "sonner";
import { motion } from "framer-motion";

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
  { value: "relevance", label: "MOST RELEVANT", backendValue: "newest" },
  { value: "newest", label: "NEWEST ADDED" },
  { value: "oldest", label: "OLDEST ADDED" },
  { value: "year_desc", label: "RELEASE YEAR (NEW)" },
  { value: "year_asc", label: "RELEASE YEAR (OLD)" },
  { value: "rating_desc", label: "RATING (HIGH-LOW)" },
  { value: "rating_asc", label: "RATING (LOW-HIGH)" },
  { value: "user_rating_desc", label: "USER RATING (HIGH-LOW)" },
  { value: "user_rating_asc", label: "USER RATING (LOW-HIGH)" },
  { value: "most_reviewed", label: "MOST REVIEWED" },
  { value: "least_reviewed", label: "LEAST REVIEWED" },
];

interface DiscoverPageProps {
  onViewDetails: (animeId: Id<"anime">) => void;
  onBack?: () => void;
}

// BRUTALIST LOADING SPINNER
const BrutalistLoadingSpinner: React.FC<{ message?: string }> = memo(({ message = "LOADING..." }) => (
  <div className="flex flex-col justify-center items-center h-64 py-10">
    <div className="relative">
      <div className="w-16 h-16 border-4 border-black bg-brand-primary-action animate-spin"></div>
      <div className="absolute top-2 left-2 w-12 h-12 border-4 border-black bg-white animate-spin animate-reverse"></div>
      <div className="absolute top-4 left-4 w-8 h-8 bg-black animate-pulse"></div>
    </div>
    <p className="mt-4 text-lg text-black font-black uppercase tracking-wider bg-white px-4 py-2 border-4 border-black shadow-brutal">
      {message}
    </p>
  </div>
));

// BRUTALIST FILTER SECTION
const BrutalistFilterSection: React.FC<{title: string; children: React.ReactNode; icon?: string}> = memo(({title, children, icon}) => (
  <div className="bg-white border-4 border-black shadow-brutal-lg p-4 mb-4">
    <div className="bg-black border-2 border-white p-2 mb-4">
      <h4 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
        {icon && <span className="text-lg">{icon}</span>}
        {title}
      </h4>
    </div>
    <div className="bg-gray-100 border-2 border-black p-3">
      {children}
    </div>
  </div>
));

const gridVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.05 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export default function DiscoverPage({ onViewDetails, onBack }: DiscoverPageProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<UISortOption>("newest");
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    genres: [], yearRange: {}, ratingRange: {}, userRatingRange: {},
    minReviews: undefined, studios: [], themes: [], emotionalTags: [],
  });
  
  const filterOptions = useQuery(api.anime.getFilterOptions);

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

  // Server-side search with backend
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

  const deduplicatedAnimeList = useMemo(() => {
    const seenTitles = new Set();
    return animeList.filter(anime => {
      const normalizedTitle = anime.title.trim().toLowerCase();
      if (seenTitles.has(normalizedTitle)) {
        return false;
      }
      seenTitles.add(normalizedTitle);
      return true;
    });
  }, [animeList]);

  const filteredAnimeList = deduplicatedAnimeList;

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

  const activeFilterCount = Object.values(filters).reduce((acc, value) => Array.isArray(value) ? acc + value.length : typeof value === 'object' ? acc + Object.values(value).filter(v => v !== undefined).length : value !== undefined ? acc + 1 : acc, 0);
  const hasActiveFilters = activeFilterCount > 0;
  const hasActiveSearch = debouncedSearchQuery.length > 0;
  const hasAnyActive = hasActiveFilters || hasActiveSearch;

  return (
    <div className="relative min-h-screen bg-white">
      
      {/* BRUTAL GEOMETRIC BACKGROUND */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {/* Grid overlay */}
        <div className="absolute inset-0 bg-grid-pattern opacity-10"></div>
        
        {/* Floating geometric shapes */}
        <div className="absolute top-20 left-4 w-32 h-32 bg-black border-4 border-brand-primary-action transform rotate-45 opacity-20"></div>
        <div className="absolute top-40 right-8 w-24 h-24 bg-brand-accent-gold border-4 border-black opacity-30"></div>
        <div className="absolute bottom-32 left-8 w-40 h-20 bg-brand-primary-action border-4 border-black transform -rotate-12 opacity-25"></div>
        <div className="absolute bottom-20 right-4 w-28 h-28 bg-black border-4 border-white transform rotate-12 opacity-20"></div>
        
        {/* Diagonal stripes */}
        <div className="absolute top-0 left-0 w-full h-2 bg-black transform -skew-y-12 opacity-30"></div>
        <div className="absolute bottom-0 right-0 w-full h-2 bg-brand-primary-action transform skew-y-12 opacity-30"></div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 p-4 space-y-6">
        
        {/* BRUTAL HERO HEADER */}
        <div className="bg-black border-4 border-white shadow-brutal-lg p-6 mb-6">
          <div className="bg-brand-primary-action border-4 border-black p-4 mb-4">
            <h1 className="text-2xl md:text-4xl font-black text-black uppercase tracking-wider text-center">
              🔍 ANIME DISCOVERY
            </h1>
          </div>
          
          <div className="bg-white border-4 border-black p-4 mb-4">
            <p className="text-black font-bold text-center text-sm md:text-base uppercase">
              EXPLORE • SEARCH • DISCOVER YOUR NEXT OBSESSION
            </p>
          </div>
          
          {/* Action buttons */}
          <div className="flex flex-wrap gap-3 justify-center">
            {onBack && (
              <button
                onClick={onBack}
                className="bg-white border-4 border-black px-6 py-3 font-black text-black uppercase tracking-wider shadow-brutal hover:bg-gray-200 transition-all active:scale-95"
              >
                ← BACK
              </button>
            )}
          </div>
        </div>

        {/* BRUTAL SEARCH SECTION */}
        <div className="bg-black border-4 border-white shadow-brutal-lg p-6">
          <div className="space-y-4">
            
            {/* Search Input */}
            <div className="relative">
              <div className="bg-white border-4 border-black p-1">
                <input 
                  type="text" 
                  placeholder="SEARCH ANIME TITLES, GENRES, DESCRIPTIONS..." 
                  value={searchQuery} 
                  onChange={(e) => setSearchQuery(e.target.value)} 
                  className="w-full bg-white border-none outline-none px-4 py-3 text-black font-bold uppercase placeholder-gray-500 text-sm"
                />
              </div>
              {searchQuery && (
                <button 
                  onClick={clearSearch} 
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-black text-white px-3 py-1 font-black text-xs border-2 border-white hover:bg-gray-800"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Sort and Filter Controls */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="bg-white border-4 border-black p-1">
                  <select 
                    value={sortBy} 
                    onChange={(e) => setSortBy(e.target.value as UISortOption)} 
                    className="w-full bg-white border-none outline-none px-3 py-2 text-black font-bold uppercase text-sm"
                  >
                    {sortOptions.map(option => (
                      <option key={option.value} value={option.value} disabled={option.value === "relevance" && !hasActiveSearch} className="bg-white text-black font-bold">
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`px-6 py-3 border-4 border-black font-black uppercase tracking-wider shadow-brutal transition-all active:scale-95 relative ${
                  showFilters ? 'bg-brand-primary-action text-black' : 'bg-white text-black hover:bg-gray-200'
                }`}
              >
                🎛️ FILTERS
                {hasActiveFilters && (
                  <span className="absolute -top-2 -right-2 bg-black text-white text-xs font-black px-2 py-1 border-2 border-white min-w-[24px] text-center">
                    {activeFilterCount}
                  </span>
                )}
              </button>
            </div>

            {/* Clear All Button */}
            {hasAnyActive && (
              <div className="pt-4 border-t-4 border-white text-center">
                <button
                  onClick={clearAll}
                  className="bg-brand-accent-gold border-4 border-black px-6 py-3 font-black text-black uppercase tracking-wider shadow-brutal hover:bg-yellow-400 transition-all active:scale-95"
                >
                  ✨ CLEAR ALL
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Search Results Summary */}
        {hasActiveSearch && (
          <div className="text-center">
            <div className="inline-block bg-black border-4 border-white px-6 py-3">
              <span className="text-white font-black uppercase text-sm">
                {isLoading && status === "LoadingFirstPage" ? (
                  <span className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white bg-black animate-spin"></div>
                    SEARCHING DATABASE...
                  </span>
                ) : (
                  <>
                    🔍 FOUND <span className="text-brand-primary-action">{filteredAnimeList?.length || 0}</span>
                    {status === "CanLoadMore" && "+"} RESULTS FOR "<span className="text-brand-accent-gold">{debouncedSearchQuery.toUpperCase()}</span>"
                  </>
                )}
              </span>
            </div>
          </div>
        )}

        {/* BRUTAL FILTERS PANEL */}
        {showFilters && filterOptions && (
          <div className="bg-black border-4 border-white shadow-brutal-lg p-6">
            <div className="flex justify-between items-center mb-6">
              <div className="bg-brand-primary-action border-4 border-black px-4 py-2">
                <h2 className="text-xl font-black text-black uppercase">🎛️ ADVANCED FILTERS</h2>
              </div>
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="bg-white border-4 border-black px-4 py-2 font-black text-black uppercase tracking-wider shadow-brutal hover:bg-gray-200 transition-all active:scale-95"
                >
                  CLEAR
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Genres Filter */}
              {filterOptions.genres && filterOptions.genres.length > 0 && (
                <BrutalistFilterSection title="GENRES" icon="🎭">
                  <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                    {filterOptions.genres.map((genre: string) => (
                      <button
                        key={genre}
                        onClick={() => toggleArrayFilter("genres", genre)}
                        className={`px-3 py-2 border-2 border-black font-bold text-xs uppercase tracking-wider transition-all active:scale-95 ${
                          filters.genres.includes(genre)
                            ? 'bg-black text-white shadow-brutal'
                            : 'bg-white text-black hover:bg-gray-200'
                        }`}
                      >
                        {genre.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </BrutalistFilterSection>
              )}

              {/* Year Range Filter */}
              {filterOptions.yearRange && (
                <BrutalistFilterSection title="RELEASE YEAR" icon="📅">
                  <div className="flex items-center gap-3">
                    <div className="bg-white border-2 border-black p-1 flex-1">
                      <input 
                        type="number" 
                        min={filterOptions.yearRange.min} 
                        max={filterOptions.yearRange.max} 
                        value={filters.yearRange.min || ""} 
                        onChange={e => updateFilter("yearRange", { ...filters.yearRange, min: e.target.value ? parseInt(e.target.value) : undefined })} 
                        className="w-full bg-white border-none outline-none px-2 py-1 text-black font-bold text-sm"
                        placeholder={`MIN: ${filterOptions.yearRange.min}`}
                      />
                    </div>
                    <span className="text-black font-black">—</span>
                    <div className="bg-white border-2 border-black p-1 flex-1">
                      <input 
                        type="number" 
                        min={filterOptions.yearRange.min} 
                        max={filterOptions.yearRange.max} 
                        value={filters.yearRange.max || ""} 
                        onChange={e => updateFilter("yearRange", { ...filters.yearRange, max: e.target.value ? parseInt(e.target.value) : undefined })} 
                        className="w-full bg-white border-none outline-none px-2 py-1 text-black font-bold text-sm"
                        placeholder={`MAX: ${filterOptions.yearRange.max}`}
                      />
                    </div>
                  </div>
                </BrutalistFilterSection>
              )}

              {/* Rating Filter */}
              {filterOptions.ratingRange && (
                <BrutalistFilterSection title="EXTERNAL RATING" icon="⭐">
                  <div className="flex items-center gap-3">
                    <div className="bg-white border-2 border-black p-1 flex-1">
                      <input 
                        type="number" 
                        min={filterOptions.ratingRange.min} 
                        max={filterOptions.ratingRange.max} 
                        step="0.1" 
                        value={filters.ratingRange.min || ''} 
                        onChange={e => updateFilter('ratingRange', { ...filters.ratingRange, min: e.target.value ? parseFloat(e.target.value) : undefined })} 
                        className="w-full bg-white border-none outline-none px-2 py-1 text-black font-bold text-sm"
                        placeholder={`MIN: ${filterOptions.ratingRange.min?.toFixed(1)}`}
                      />
                    </div>
                    <span className="text-black font-black">—</span>
                    <div className="bg-white border-2 border-black p-1 flex-1">
                      <input 
                        type="number" 
                        min={filterOptions.ratingRange.min} 
                        max={filterOptions.ratingRange.max} 
                        step="0.1" 
                        value={filters.ratingRange.max || ''} 
                        onChange={e => updateFilter('ratingRange', { ...filters.ratingRange, max: e.target.value ? parseFloat(e.target.value) : undefined })} 
                        className="w-full bg-white border-none outline-none px-2 py-1 text-black font-bold text-sm"
                        placeholder={`MAX: ${filterOptions.ratingRange.max?.toFixed(1)}`}
                      />
                    </div>
                  </div>
                </BrutalistFilterSection>
              )}

              {/* Minimum Reviews Filter */}
              <BrutalistFilterSection title="MINIMUM REVIEWS" icon="📝">
                <div className="bg-white border-2 border-black p-1">
                  <input 
                    type="number" 
                    min="0" 
                    value={filters.minReviews || ""} 
                    onChange={e => updateFilter("minReviews", e.target.value ? parseInt(e.target.value) : undefined)} 
                    className="w-full bg-white border-none outline-none px-2 py-1 text-black font-bold text-sm"
                    placeholder="E.G., 5"
                  />
                </div>
              </BrutalistFilterSection>
            </div>
          </div>
        )}

        {/* Loading State */}
        {isLoading && status === "LoadingFirstPage" && (
          <BrutalistLoadingSpinner message={hasActiveSearch ? "SEARCHING DATABASE..." : "DISCOVERING ANIME..."} />
        )}
        
        {/* RESULTS GRID - MOBILE-FIRST 2-COLUMN LAYOUT */}
        {filteredAnimeList && filteredAnimeList.length > 0 ? (
          <div className="space-y-6">
            
            {/* Results Counter */}
            <div className="text-center">
              <div className="inline-block bg-black border-4 border-white px-6 py-3">
                <span className="text-white font-black uppercase text-sm">
                  SHOWING <span className="text-brand-accent-gold">{filteredAnimeList.length}</span>
                  {!hasActiveSearch && status === "CanLoadMore" && "+"} ANIME
                  {hasActiveSearch && " MATCHING SEARCH"}
                  {hasActiveFilters && " (FILTERED)"}
                </span>
              </div>
            </div>

            {/* 2-COLUMN ANIME GRID FOR MOBILE */}
            <motion.div
              className="grid grid-cols-2 gap-3 sm:gap-4"
              variants={gridVariants}
              initial="hidden"
              animate="visible"
            >
              {filteredAnimeList.map((anime, index) => (
                <motion.div
                  key={anime._id}
                  className="group relative"
                  variants={itemVariants}
                >
                  {/* Brutal frame for anime card */}
                  <div className="bg-black border-4 border-white shadow-brutal-lg p-2 hover:border-brand-primary-action transition-all duration-200 active:scale-95">
                    <div className="bg-white border-2 border-black p-1">
                      <AnimeCard anime={anime as Doc<"anime">} onViewDetails={onViewDetails} className="w-full" />
                    </div>
                    
                    {/* Title in brutal style */}
                    <div className="mt-2 bg-black border-2 border-white p-2">
                      <h4 
                        className="text-xs font-black text-white text-center leading-tight uppercase tracking-wider"
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
                        {anime.title.toUpperCase()}
                      </h4>
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>

            {/* Load More Button */}
            {status === "CanLoadMore" && (
              <div className="text-center">
                <button
                  onClick={() => loadMore(20)}
                  disabled={isLoading && status === "LoadingMore"}
                  className={`border-4 border-black px-8 py-4 font-black uppercase tracking-wider shadow-brutal transition-all active:scale-95 ${
                    isLoading && status === "LoadingMore"
                      ? 'bg-gray-300 text-gray-600'
                      : 'bg-brand-primary-action text-black hover:bg-blue-400'
                  }`}
                >
                  {isLoading && status === "LoadingMore" ? (
                    <span className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-black bg-white animate-spin"></div>
                      LOADING MORE...
                    </span>
                  ) : hasActiveSearch ? (
                    "🔍 LOAD MORE SEARCH RESULTS"
                  ) : (
                    "🔍 DISCOVER MORE ANIME"
                  )}
                </button>
              </div>
            )}

            {/* All Results Loaded */}
            {status === "Exhausted" && filteredAnimeList.length > 0 && (
              <div className="text-center">
                <div className="inline-block bg-black border-4 border-white px-6 py-3">
                  <span className="text-white font-black uppercase text-sm">
                    ✨ {hasActiveSearch ? "ALL SEARCH RESULTS SHOWN!" : "ALL ANIME DISCOVERED!"}
                  </span>
                </div>
              </div>
            )}
          </div>
        ) : (
          // Empty state with brutal styling
          status !== "LoadingFirstPage" && (
            <div className="text-center py-16">
              <div className="bg-black border-4 border-white shadow-brutal-lg p-12 max-w-lg mx-auto">
                <div className="bg-white border-4 border-black p-8 mb-6">
                  <div className="text-6xl mb-4">🔍</div>
                  <h3 className="text-2xl font-black text-black uppercase mb-4">NO ANIME FOUND</h3>
                  <p className="text-black font-bold text-base leading-relaxed">
                    {hasActiveSearch 
                      ? `NO ANIME MATCHES "${debouncedSearchQuery.toUpperCase()}"${hasActiveFilters ? " WITH CURRENT FILTERS" : ""}.`
                      : hasActiveFilters 
                      ? "NO ANIME MATCHES YOUR CURRENT FILTERS."
                      : "THE ANIME DATABASE IS EMPTY RIGHT NOW."
                    }
                  </p>
                </div>
                
                <div className="flex flex-wrap gap-3 justify-center">
                  {hasActiveSearch && (
                    <button
                      onClick={clearSearch}
                      className="bg-white border-4 border-black px-4 py-2 font-black text-black uppercase tracking-wider shadow-brutal hover:bg-gray-200 transition-all active:scale-95"
                    >
                      CLEAR SEARCH
                    </button>
                  )}
                  {hasActiveFilters && (
                    <button
                      onClick={clearFilters}
                      className="bg-white border-4 border-black px-4 py-2 font-black text-black uppercase tracking-wider shadow-brutal hover:bg-gray-200 transition-all active:scale-95"
                    >
                      CLEAR FILTERS
                    </button>
                  )}
                  {hasAnyActive && (
                    <button
                      onClick={clearAll}
                      className="bg-brand-primary-action border-4 border-black px-4 py-2 font-black text-black uppercase tracking-wider shadow-brutal hover:bg-blue-400 transition-all active:scale-95"
                    >
                      START FRESH
                    </button>
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