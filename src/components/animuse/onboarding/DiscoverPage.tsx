// src/components/animuse/onboarding/DiscoverPage.tsx
import React, { useState, useEffect, useCallback, memo } from "react";
import { usePaginatedQuery, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id, Doc } from "../../../../convex/_generated/dataModel";
import AnimeCard from "../AnimeCard"; // Already refactored
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

const sortOptions: { value: SortOption; label: string }[] = [
  { value: "newest", label: "Newest Added" }, { value: "oldest", label: "Oldest Added" },
  { value: "title_asc", label: "Title A-Z" }, { value: "title_desc", label: "Title Z-A" },
  { value: "year_desc", label: "Release Year (Newest)" }, { value: "year_asc", label: "Release Year (Oldest)" },
  { value: "rating_desc", label: "External Rating (High-Low)" }, { value: "rating_asc", label: "External Rating (Low-High)" },
  { value: "user_rating_desc", label: "User Rating (High-Low)" }, { value: "user_rating_asc", label: "User Rating (Low-High)" },
  { value: "most_reviewed", label: "Most Reviewed" }, { value: "least_reviewed", label: "Least Reviewed" },
];

interface DiscoverPageProps {
  onViewDetails: (animeId: Id<"anime">) => void;
  onBack?: () => void;
}

const DiscoverLoadingSpinner: React.FC<{ message?: string }> = ({ message = "Loading anime..." }) => (
  <div className="flex flex-col justify-center items-center h-64 py-10 text-brand-text-primary/80"> {/* Adjusted for light background page */}
    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-primary-action"></div>
    <p className="mt-3 text-sm">{message}</p>
  </div>
);

const FilterPanelSection: React.FC<{title: string; children: React.ReactNode}> = ({title, children}) => (
    <div className="py-2.5 sm:py-3 border-b border-brand-accent-peach/20 last:border-b-0">
        <h4 className="text-xs sm:text-sm font-semibold text-brand-text-primary/90 mb-1.5">{title}</h4>
        {children}
    </div>
);


export default function DiscoverPage({ onViewDetails, onBack }: DiscoverPageProps) {
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    genres: [], yearRange: {}, ratingRange: {}, userRatingRange: {},
    minReviews: undefined, studios: [], themes: [], emotionalTags: [],
  });

  const filterOptions = useQuery(api.anime.getFilterOptions);

  const {
    results: animeList,
    status,
    loadMore,
    isLoading,
  } = usePaginatedQuery(
    api.anime.getFilteredAnime,
    {
      filters: Object.values(filters).some(value => {
        if (Array.isArray(value)) return value.length > 0;
        if (typeof value === "object" && value !== null) return Object.values(value).some(v => v !== undefined);
        return value !== undefined;
      }) ? filters : undefined,
      sortBy,
    },
    { initialNumItems: 10 }
  );

  useEffect(() => {
    const mediaQuery = window.matchMedia('(min-width: 768px)');
    const handleResize = (e: MediaQueryListEvent) => setShowFilters(e.matches);
    setShowFilters(mediaQuery.matches);
    mediaQuery.addEventListener('change', handleResize);
    return () => mediaQuery.removeEventListener('change', handleResize);
  }, []);

  const updateFilter = useCallback(<K extends keyof FilterState>(key: K, value: FilterState[K]) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  const toggleArrayFilter = useCallback((key: keyof Pick<FilterState, "genres" | "studios" | "themes" | "emotionalTags">, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: prev[key].includes(value)
        ? prev[key].filter(item => item !== value)
        : [...prev[key], value],
    }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({
      genres: [], yearRange: {}, ratingRange: {}, userRatingRange: {},
      minReviews: undefined, studios: [], themes: [], emotionalTags: [],
    });
  }, []);

  const activeFilterCount = Object.values(filters).reduce((acc, value) => {
    if (Array.isArray(value)) return acc + value.length;
    if (typeof value === "object" && value !== null) return acc + Object.values(value).filter(v => v !== undefined).length;
    if (value !== undefined) return acc + 1;
    return acc;
  }, 0);
  const hasActiveFilters = activeFilterCount > 0;

  const filterInputClass = "form-input !text-xs !py-1.5 !px-2 w-full";
  const filterLabelClass = "block text-xs font-medium text-brand-text-primary/70 mb-0.5";

  return (
    <div className="p-3 sm:p-4 md:p-0 text-brand-text-primary"> {/* Page is on brand-surface, text primary is dark brown. No extra card needed if MainApp provides one. If standalone, add card classes. */}
      <div className="flex flex-col sm:flex-row justify-between items-center mb-4 sm:mb-5 gap-2">
        <h2 className="text-xl sm:text-2xl md:text-3xl font-heading text-brand-primary-action">Discover Anime</h2>
        {onBack && (
          <StyledButton onClick={onBack} variant="ghost" className="text-sm text-brand-accent-gold hover:text-brand-primary-action self-start sm:self-center">
            ← Dashboard
          </StyledButton>
        )}
      </div>

      <div className="mb-4 flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between p-3 bg-brand-surface rounded-lg shadow-md border border-brand-accent-peach/30">
        <div className="flex flex-wrap gap-2 items-center">
          <StyledButton
            onClick={() => setShowFilters(!showFilters)}
            variant={showFilters ? "primary_small" : "secondary_small"}
            className="!text-xs sm:!text-sm"
            aria-expanded={showFilters}
            aria-controls="filter-panel"
          >
            {showFilters ? "Hide Filters" : "Filters"} {/* Simpler text */}
            {hasActiveFilters && (<span className="ml-1.5 inline-block bg-brand-primary-action text-brand-surface text-[10px] font-bold px-1.5 py-0.5 rounded-full">{activeFilterCount}</span>)}
          </StyledButton>
          {hasActiveFilters && showFilters && ( // Show Clear All only if filters are visible and active
            <StyledButton onClick={clearFilters} variant="ghost" className="!text-xs sm:!text-sm text-brand-accent-gold hover:!text-brand-primary-action">Clear All</StyledButton>
          )}
        </div>
        <div className="flex items-center gap-2 self-end sm:self-center">
          <label htmlFor="discoverSort" className="text-xs sm:text-sm text-brand-text-primary/80">Sort by:</label>
          <select
            id="discoverSort" value={sortBy} onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="form-input !text-xs sm:!text-sm !py-1.5 !px-2 w-auto rounded-md"
          >
            {sortOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </div>
      </div>

      {showFilters && (
        <div id="filter-panel" className="mb-5 bg-brand-surface rounded-lg shadow-lg p-3 sm:p-4 border border-brand-accent-peach/30">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-base sm:text-lg font-heading text-brand-accent-gold">Filter Options</h3>
            {hasActiveFilters && (
                 <StyledButton onClick={clearFilters} variant="ghost" className="!text-xs !text-brand-accent-gold hover:!text-brand-primary-action sm:hidden">Clear All</StyledButton>
            )}
          </div>
          {!filterOptions && <p className="text-xs text-brand-text-primary/70 py-4 text-center">Loading filter options...</p>}
          {filterOptions && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-3 sm:gap-x-4">
              {filterOptions.genres && filterOptions.genres.length > 0 && (
                <FilterPanelSection title="Genres">
                  <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto custom-scrollbar pr-1">
                    {filterOptions.genres.map(genre => (
                      <StyledButton key={genre} onClick={() => toggleArrayFilter("genres", genre)} selected={filters.genres.includes(genre)} variant={filters.genres.includes(genre) ? "primary_small" : "secondary_small"} className="!text-[10px] !px-1.5 !py-0.5">{genre}</StyledButton>
                    ))}
                  </div>
                </FilterPanelSection>
              )}
              {filterOptions.yearRange && (
                <FilterPanelSection title="Release Year">
                  <div className="flex items-center gap-2">
                    <input type="number" min={filterOptions.yearRange.min} max={filterOptions.yearRange.max} value={filters.yearRange.min || ""} onChange={e => updateFilter("yearRange", { ...filters.yearRange, min: e.target.value ? parseInt(e.target.value) : undefined })} className={filterInputClass} placeholder={`Min: ${filterOptions.yearRange.min}`} aria-label="Minimum Year"/>
                    <span className="text-brand-text-primary/70 text-xs">-</span>
                    <input type="number" min={filterOptions.yearRange.min} max={filterOptions.yearRange.max} value={filters.yearRange.max || ""} onChange={e => updateFilter("yearRange", { ...filters.yearRange, max: e.target.value ? parseInt(e.target.value) : undefined })} className={filterInputClass} placeholder={`Max: ${filterOptions.yearRange.max}`} aria-label="Maximum Year"/>
                  </div>
                </FilterPanelSection>
              )}
               {filterOptions.ratingRange && (
                    <FilterPanelSection title="External Rating (0-10)">
                         <div className="flex items-center gap-2">
                            <input type="number" min={filterOptions.ratingRange.min} max={filterOptions.ratingRange.max} step="0.1" value={filters.ratingRange.min || ''} onChange={e => updateFilter('ratingRange', { ...filters.ratingRange, min: e.target.value ? parseFloat(e.target.value) : undefined })} className={filterInputClass} placeholder={`Min: ${filterOptions.ratingRange.min?.toFixed(1)}`} aria-label="Minimum External Rating"/>
                            <span className="text-brand-text-primary/70 text-xs">-</span>
                            <input type="number" min={filterOptions.ratingRange.min} max={filterOptions.ratingRange.max} step="0.1" value={filters.ratingRange.max || ''} onChange={e => updateFilter('ratingRange', { ...filters.ratingRange, max: e.target.value ? parseFloat(e.target.value) : undefined })} className={filterInputClass} placeholder={`Max: ${filterOptions.ratingRange.max?.toFixed(1)}`} aria-label="Maximum External Rating"/>
                        </div>
                    </FilterPanelSection>
                )}
                <FilterPanelSection title="Min User Reviews">
                     <input type="number" min="0" value={filters.minReviews || ""} onChange={e => updateFilter("minReviews", e.target.value ? parseInt(e.target.value) : undefined)} className={`${filterInputClass} w-full sm:w-28`} placeholder="e.g., 5"/>
                </FilterPanelSection>
                {/* Add Studios, Themes, Emotional Tags similarly if data exists in filterOptions */}
            </div>
          )}
        </div>
      )}

      {isLoading && status === "LoadingFirstPage" && <DiscoverLoadingSpinner />}
      {animeList && animeList.length > 0 ? (
        <>
          <div className="mb-2.5 text-xs sm:text-sm text-brand-text-primary/80">
            Showing {animeList.length}{status === "CanLoadMore" ? "+" : ""} anime
            {hasActiveFilters && " (filtered)"}
          </div>
          <div className="grid grid-cols-2 xs:grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 gap-2.5 sm:gap-3 md:gap-4">
            {animeList.map(anime => (
              <AnimeCard key={anime._id} anime={anime as Doc<"anime">} onViewDetails={onViewDetails} variant="default"/>
            ))}
          </div>
          {status === "CanLoadMore" && (
            <div className="mt-5 sm:mt-6 text-center">
              <StyledButton onClick={() => loadMore(10)} disabled={isLoading && status === "LoadingMore"} variant="primary">
                {isLoading && status === "LoadingMore" ? "Loading..." : "Load More"}
              </StyledButton>
            </div>
          )}
          {status === "Exhausted" && animeList.length > 0 && (
            <p className="text-center mt-5 sm:mt-6 text-xs sm:text-sm text-brand-text-primary/70">You've seen all results!</p>
          )}
        </>
      ) : (
        status !== "LoadingFirstPage" && (
          <div className="text-center p-6 sm:p-8 bg-brand-accent-peach/10 rounded-lg mt-4">
            <p className="text-brand-text-primary/80 text-sm sm:text-base mb-3">
              {hasActiveFilters ? "No anime found for these filters." : "No anime in the database yet."}
            </p>
            {hasActiveFilters && <StyledButton onClick={clearFilters} variant="primary_small">Clear Filters</StyledButton>}
          </div>
        )
      )}
    </div>
  );
}