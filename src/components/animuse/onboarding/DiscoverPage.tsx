// src/components/animuse/onboarding/DiscoverPage.tsx - Advanced Artistic Version
import React, { useState, useEffect, useCallback, memo } from "react";
import { usePaginatedQuery, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id, Doc } from "../../../../convex/_generated/dataModel";
import AnimeCard from "../AnimeCard";
import StyledButton from "../shared/StyledButton";

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

  const {
    results: animeList, status, loadMore, isLoading,
  } = usePaginatedQuery(
    api.anime.getFilteredAnime,
    {
      filters: Object.values(filters).some(value => Array.isArray(value) ? value.length > 0 : typeof value === 'object' ? Object.values(value).some(v => v !== undefined) : value !== undefined) ? filters : undefined,
      sortBy: getBackendSortOption(sortBy),
    },
    { initialNumItems: 20 }
  );

  const filteredAnimeList = React.useMemo(() => {
    if (!animeList || !debouncedSearchQuery) return animeList;
    const searchTerm = debouncedSearchQuery.toLowerCase();
    return animeList.filter(anime =>
      anime.title?.toLowerCase().includes(searchTerm) ||
      anime.description?.toLowerCase().includes(searchTerm) ||
      anime.genres?.some(genre => genre.toLowerCase().includes(searchTerm)) ||
      anime.studios?.some(studio => studio.toLowerCase().includes(searchTerm))
    );
  }, [animeList, debouncedSearchQuery]);

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
    <div className="relative min-h-screen">
      {/* Animated Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-0 w-96 h-96 bg-gradient-to-br from-brand-primary-action/10 to-transparent rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 right-0 w-80 h-80 bg-gradient-to-tl from-brand-accent-gold/10 to-transparent rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/3 right-1/4 w-64 h-64 bg-gradient-to-r from-brand-accent-peach/8 to-transparent rounded-full blur-3xl animate-pulse delay-2000"></div>
        <div className="absolute bottom-1/3 left-1/4 w-72 h-72 bg-gradient-to-l from-purple-500/8 to-transparent rounded-full blur-3xl animate-pulse delay-3000"></div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 px-4 sm:px-6 py-8 space-y-8">
        {/* Hero Header */}
        <div className="text-center space-y-4">
          <div className="inline-block">
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-heading text-white font-bold bg-gradient-to-r from-white via-brand-accent-gold to-white bg-clip-text text-transparent animate-pulse">
              🌟 Discover Anime
            </h1>
            <div className="h-1 w-full bg-gradient-to-r from-transparent via-brand-primary-action to-transparent mt-4 animate-pulse"></div>
          </div>
          <p className="text-lg text-white/80 max-w-2xl mx-auto">
            Explore our curated collection and find your next anime obsession
          </p>
          {onBack && (
            <StyledButton 
              onClick={onBack} 
              variant="ghost" 
              className="!text-sm !bg-white/10 !backdrop-blur-sm !border-white/20 hover:!bg-white/20 !text-white"
            >
              ← Back to Dashboard
            </StyledButton>
          )}
        </div>

        {/* Advanced Search Section */}
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-brand-primary-action/20 via-transparent to-brand-accent-gold/20 rounded-3xl blur-xl"></div>
          <div className="relative bg-black/30 backdrop-blur-sm border border-white/10 rounded-3xl p-6">
            <div className="flex flex-col lg:flex-row gap-4 items-center">
              {/* Search Input */}
              <div className="relative flex-1 group">
                <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                  <svg className="w-5 h-5 text-white/60 group-focus-within:text-brand-primary-action transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input 
                  type="text" 
                  placeholder="Search anime titles, genres, studios..." 
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

              {/* Sort Selector */}
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

            {/* Quick Actions */}
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

        {/* Search Results Summary */}
        {hasActiveSearch && (
          <div className="text-center">
            <div className="inline-flex items-center space-x-2 bg-black/30 backdrop-blur-sm rounded-full px-6 py-3 border border-white/20">
              <span className="text-white/80 text-sm">
                {isLoading && status === "LoadingFirstPage" ? "Searching..." : 
                  <>Found <span className="text-brand-accent-gold font-bold">{filteredAnimeList?.length || 0}</span> results for <span className="text-brand-primary-action font-medium">"{debouncedSearchQuery}"</span></>
                }
              </span>
            </div>
          </div>
        )}

        {/* Advanced Filters Panel */}
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
                {/* Genres Filter */}
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

                {/* Year Range Filter */}
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

                {/* Rating Filter */}
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

                {/* Minimum Reviews Filter */}
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

        {/* Loading State */}
        {isLoading && status === "LoadingFirstPage" && <DiscoverLoadingSpinner />}
        
        {/* Results Grid */}
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

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
              {filteredAnimeList.map((anime, index) => (
                <div 
                  key={anime._id} 
                  className="group relative transform transition-all duration-500 hover:scale-105"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  {/* Glow Effect */}
                  <div className="absolute -inset-2 bg-gradient-to-r from-brand-primary-action/30 to-brand-accent-gold/30 rounded-2xl blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  
                  <div className="relative bg-black/20 backdrop-blur-sm rounded-2xl overflow-hidden border border-white/10 group-hover:border-white/30 transition-all duration-300">
                    <AnimeCard anime={anime as Doc<"anime">} onViewDetails={onViewDetails} className="w-full" />
                    <div className="p-3 bg-gradient-to-t from-black/80 to-transparent">
                      <h4 className="text-sm font-medium text-white text-center truncate" title={anime.title}>
                        {anime.title}
                      </h4>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Load More Button */}
            {status === "CanLoadMore" && !hasActiveSearch && (
              <div className="text-center">
                <StyledButton 
                  onClick={() => loadMore(20)} 
                  disabled={isLoading && status === "LoadingMore"} 
                  variant="ghost"
                  className="!bg-white/10 !backdrop-blur-sm !border-white/20 hover:!bg-white/20 !text-white !px-8 !py-4"
                >
                  {isLoading && status === "LoadingMore" ? "Loading More..." : "🔍 Discover More Anime"}
                </StyledButton>
              </div>
            )}

            {status === "Exhausted" && filteredAnimeList.length > 0 && !hasActiveSearch && (
              <div className="text-center">
                <div className="inline-flex items-center space-x-2 bg-black/30 backdrop-blur-sm rounded-full px-6 py-3 border border-white/20">
                  <span className="text-white/80 text-sm">✨ You've discovered all available anime!</span>
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