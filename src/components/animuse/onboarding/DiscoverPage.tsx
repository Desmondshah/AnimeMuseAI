// src/components/animuse/onboarding/DiscoverPage.tsx
import React, { useState, useEffect, useCallback, memo } from "react";
import { usePaginatedQuery, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id, Doc } from "../../../../convex/_generated/dataModel";
import AnimeCard from "../AnimeCard"; // Renders poster + banner only
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

const DiscoverLoadingSpinner: React.FC<{ message?: string }> = ({ message = "Loading anime..." }) => (
  <div className="flex flex-col justify-center items-center h-64 py-10 text-brand-text-on-dark/80">
    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-primary-action"></div>
    <p className="mt-3 text-sm">{message}</p>
  </div>
);

const FilterPanelSection: React.FC<{title: string; children: React.ReactNode}> = ({title, children}) => (
  <div className="py-2.5 sm:py-3 border-b border-brand-accent-peach/20 last:border-b-0">
    <h4 className="text-xs sm:text-sm font-semibold text-brand-text-on-dark/90 mb-1.5">{title}</h4>
    {children}
  </div>
);

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
  const filterInputClass = "form-input !text-xs !py-1.5 !px-2 w-full !text-brand-text-on-dark";
  const labelBaseClass = "block text-xs font-medium text-brand-text-on-dark/70 mb-0.5";

  return (
    <div className="p-3 sm:p-4 md:p-0 text-brand-text-on-dark">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-4 sm:mb-5 gap-2">
        <h2 className="text-xl sm:text-2xl md:text-3xl font-heading text-brand-primary-action">Browse Anime</h2>
        {onBack && ( <StyledButton onClick={onBack} variant="ghost" className="text-sm text-brand-accent-gold hover:text-brand-primary-action self-start sm:self-center"> ← Back </StyledButton> )}
      </div>

      <div className="mb-4 p-3 bg-brand-surface rounded-lg shadow-md border border-brand-accent-peach/30">
        <div className="flex gap-2 items-center">
          <div className="relative flex-1">
            <input type="text" placeholder="Search anime titles, genres..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="form-input w-full !text-sm !pl-10 !text-brand-text-on-dark placeholder:!text-brand-text-on-dark/60" />
            <div className="absolute left-3 top-1/2 transform -translate-y-1/2"><svg className="w-4 h-4 text-brand-text-on-dark/50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg></div>
            {searchQuery && ( <button onClick={clearSearch} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-brand-text-on-dark/50 hover:text-brand-primary-action"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg></button> )}
          </div>
          {hasAnyActive && ( <StyledButton onClick={clearAll} variant="ghost" className="!text-xs text-brand-accent-gold hover:!text-brand-primary-action"> Clear All </StyledButton> )}
        </div>
        {hasActiveSearch && ( <div className="mt-2 text-xs text-brand-text-on-dark/70">
            {isLoading && status === "LoadingFirstPage" ? "Searching..." : <>{filteredAnimeList?.length || 0} result{filteredAnimeList?.length !== 1 ? 's' : ''} for "<span className="font-medium text-brand-primary-action">{debouncedSearchQuery}</span>"</>}
        </div> )}
      </div>

      <div className="mb-4 flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between p-3 bg-brand-surface rounded-lg shadow-md border border-brand-accent-peach/30 text-brand-text-on-dark">
        <div className="flex flex-wrap gap-2 items-center">
          <StyledButton onClick={() => setShowFilters(!showFilters)} variant={showFilters ? "primary_small" : "secondary_small"} className="!text-xs sm:!text-sm" aria-expanded={showFilters} aria-controls="filter-panel">
            {showFilters ? "Hide Filters" : "Advanced Filters"}
            {hasActiveFilters && ( <span className="ml-1.5 inline-block bg-brand-primary-action text-brand-surface text-[10px] font-bold px-1.5 py-0.5 rounded-full"> {activeFilterCount} </span> )}
          </StyledButton>
        </div>
        <div className="flex items-center gap-2 self-end sm:self-center">
          <label htmlFor="discoverSort" className="text-xs sm:text-sm text-brand-text-on-dark/80">Sort by:</label>
          <select id="discoverSort" value={sortBy} onChange={(e) => setSortBy(e.target.value as UISortOption)} className="form-input !text-xs sm:!text-sm !py-1.5 !px-2 w-auto rounded-md !text-brand-text-on-dark">
            {sortOptions.map(option => ( <option key={option.value} value={option.value} disabled={option.value === "relevance" && !hasActiveSearch}> {option.label} </option> ))}
          </select>
        </div>
      </div>

      {showFilters && ( <div id="filter-panel" className="mb-5 bg-brand-surface rounded-lg shadow-lg p-3 sm:p-4 border border-brand-accent-peach/30 text-brand-text-on-dark">
        <div className="flex justify-between items-center mb-2">
            <h3 className="text-base sm:text-lg font-heading text-brand-accent-gold">Advanced Filters</h3>
            {hasActiveFilters && ( <StyledButton onClick={clearFilters} variant="ghost" className="!text-xs !text-brand-accent-gold hover:!text-brand-primary-action sm:hidden"> Clear Filters </StyledButton> )}
        </div>
        {!filterOptions && <p className="text-xs text-brand-text-on-dark/70 py-4 text-center">Loading filter options...</p>}
        {filterOptions && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-3 sm:gap-x-4">
              {filterOptions.genres && filterOptions.genres.length > 0 && (
                <FilterPanelSection title="Genres">
                  <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto custom-scrollbar pr-1">
                    {filterOptions.genres.map(genre => ( <StyledButton key={genre} onClick={() => toggleArrayFilter("genres", genre)} selected={filters.genres.includes(genre)} variant={filters.genres.includes(genre) ? "primary_small" : "secondary_small"} className="!text-[10px] !px-1.5 !py-0.5"> {genre} </StyledButton> ))}
                  </div>
                </FilterPanelSection>
              )}
              {filterOptions.yearRange && (
                <FilterPanelSection title="Release Year">
                  <div className="flex items-center gap-2">
                    <input type="number" min={filterOptions.yearRange.min} max={filterOptions.yearRange.max} value={filters.yearRange.min || ""} onChange={e => updateFilter("yearRange", { ...filters.yearRange, min: e.target.value ? parseInt(e.target.value) : undefined })} className={filterInputClass} placeholder={`Min: ${filterOptions.yearRange.min}`} aria-label="Minimum Year"/>
                    <span className="text-brand-text-on-dark/70 text-xs">-</span>
                    <input type="number" min={filterOptions.yearRange.min} max={filterOptions.yearRange.max} value={filters.yearRange.max || ""} onChange={e => updateFilter("yearRange", { ...filters.yearRange, max: e.target.value ? parseInt(e.target.value) : undefined })} className={filterInputClass} placeholder={`Max: ${filterOptions.yearRange.max}`} aria-label="Maximum Year"/>
                  </div>
                </FilterPanelSection>
              )}
              {filterOptions.ratingRange && (
                <FilterPanelSection title="External Rating (0-10)">
                  <div className="flex items-center gap-2">
                    <input type="number" min={filterOptions.ratingRange.min} max={filterOptions.ratingRange.max} step="0.1" value={filters.ratingRange.min || ''} onChange={e => updateFilter('ratingRange', { ...filters.ratingRange, min: e.target.value ? parseFloat(e.target.value) : undefined })} className={filterInputClass} placeholder={`Min: ${filterOptions.ratingRange.min?.toFixed(1)}`} aria-label="Minimum External Rating"/>
                    <span className="text-brand-text-on-dark/70 text-xs">-</span>
                    <input type="number" min={filterOptions.ratingRange.min} max={filterOptions.ratingRange.max} step="0.1" value={filters.ratingRange.max || ''} onChange={e => updateFilter('ratingRange', { ...filters.ratingRange, max: e.target.value ? parseFloat(e.target.value) : undefined })} className={filterInputClass} placeholder={`Max: ${filterOptions.ratingRange.max?.toFixed(1)}`} aria-label="Maximum External Rating"/>
                  </div>
                </FilterPanelSection>
              )}
              <FilterPanelSection title="Min User Reviews">
                <input type="number" min="0" value={filters.minReviews || ""} onChange={e => updateFilter("minReviews", e.target.value ? parseInt(e.target.value) : undefined)} className={`${filterInputClass} w-full sm:w-28`} placeholder="e.g., 5"/>
              </FilterPanelSection>
            </div>
          )}
      </div> )}

      {isLoading && status === "LoadingFirstPage" && <DiscoverLoadingSpinner />}
      
      {filteredAnimeList && filteredAnimeList.length > 0 ? (
        <>
          <div className="mb-2.5 text-xs sm:text-sm text-brand-text-on-dark/80">
            Showing {filteredAnimeList.length}{!hasActiveSearch && status === "CanLoadMore" ? "+" : ""} anime
            {hasActiveSearch && " matching your search"}
            {hasActiveFilters && " (filtered)"}
          </div>
          <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 gap-x-3 gap-y-5 sm:gap-x-4 sm:gap-y-6">
            {filteredAnimeList.map(anime => (
              <div key={anime._id} className="flex flex-col items-center">
                <AnimeCard anime={anime as Doc<"anime">} onViewDetails={onViewDetails} className="w-full" />
                <h4 className="mt-1.5 text-xs text-center text-brand-text-on-dark w-full truncate px-1" title={anime.title}>
                  {anime.title}
                </h4>
              </div>
            ))}
          </div>
          {status === "CanLoadMore" && !hasActiveSearch && ( <div className="mt-5 sm:mt-6 text-center"> <StyledButton onClick={() => loadMore(20)} disabled={isLoading && status === "LoadingMore"} variant="primary"> {isLoading && status === "LoadingMore" ? "Loading..." : "Load More"} </StyledButton> </div> )}
          {status === "Exhausted" && filteredAnimeList.length > 0 && !hasActiveSearch && ( <p className="text-center mt-5 sm:mt-6 text-xs sm:text-sm text-brand-text-on-dark/70">You've seen all results!</p> )}
        </>
      ) : ( status !== "LoadingFirstPage" && (
          <div className="text-center p-6 sm:p-8 bg-brand-surface/5 rounded-lg mt-4">
            <div className="mb-4">
              <svg className="w-16 h-16 mx-auto text-brand-text-on-dark/40 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              <p className="text-brand-text-on-dark/80 text-sm sm:text-base mb-3">
                {hasActiveSearch ? `No anime found matching "${debouncedSearchQuery}"${hasActiveFilters ? " with current filters" : ""}.` : hasActiveFilters ? "No anime found for these filters." : "No anime in the database yet."}
              </p>
            </div>
            <div className="flex flex-wrap gap-2 justify-center">
              {hasActiveSearch && ( <StyledButton onClick={clearSearch} variant="secondary_small"> Clear Search </StyledButton> )}
              {hasActiveFilters && ( <StyledButton onClick={clearFilters} variant="secondary_small"> Clear Filters </StyledButton> )}
              {hasAnyActive && ( <StyledButton onClick={clearAll} variant="primary_small"> Clear All </StyledButton> )}
            </div>
          </div>
        )
      )}
    </div>
  );
}