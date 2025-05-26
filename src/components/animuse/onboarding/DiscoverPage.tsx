import React, { useState, useEffect } from "react";
import { usePaginatedQuery, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id, Doc } from "../../../../convex/_generated/dataModel";
import AnimeCard from "../AnimeCard";
import StyledButton from "../shared/StyledButton";

interface DiscoverPageProps {
  onViewDetails: (animeId: Id<"anime">) => void;
  onBack?: () => void; // Make sure this optional prop is included
}

// Define types for filters
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

type SortOption = "newest" | "oldest" | "title_asc" | "title_desc" | "year_desc" | "year_asc" | 
                  "rating_desc" | "rating_asc" | "user_rating_desc" | "user_rating_asc" | 
                  "most_reviewed" | "least_reviewed";

const sortOptions: { value: SortOption; label: string }[] = [
  { value: "newest", label: "Newest First" },
  { value: "oldest", label: "Oldest First" },
  { value: "title_asc", label: "Title A-Z" },
  { value: "title_desc", label: "Title Z-A" },
  { value: "year_desc", label: "Year (Newest)" },
  { value: "year_asc", label: "Year (Oldest)" },
  { value: "rating_desc", label: "Rating (High to Low)" },
  { value: "rating_asc", label: "Rating (Low to High)" },
  { value: "user_rating_desc", label: "User Rating (High to Low)" },
  { value: "user_rating_asc", label: "User Rating (Low to High)" },
  { value: "most_reviewed", label: "Most Reviewed" },
  { value: "least_reviewed", label: "Least Reviewed" },
];

export default function DiscoverPage({ onViewDetails, onBack }: DiscoverPageProps) {
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    genres: [],
    yearRange: {},
    ratingRange: {},
    userRatingRange: {},
    studios: [],
    themes: [],
    emotionalTags: [],
  });

  // Get filter options from backend
  const filterOptions = useQuery(api.anime.getFilterOptions);

  // Use the new filtered query instead of getAllAnime
  const {
    results: animeList,
    status,
    loadMore,
    isLoading,
  } = usePaginatedQuery(
    api.anime.getFilteredAnime,
    {
      filters: Object.keys(filters).some(key => {
        const value = filters[key as keyof FilterState];
        if (Array.isArray(value)) return value.length > 0;
        if (typeof value === 'object' && value !== null) {
          return Object.values(value).some(v => v !== undefined);
        }
        return value !== undefined;
      }) ? filters : undefined,
      sortBy,
    },
    { initialNumItems: 12 }
  );

  // Reset pagination when filters or sort changes
  useEffect(() => {
    // The usePaginatedQuery hook automatically handles this
  }, [filters, sortBy]);

  const updateFilter = <K extends keyof FilterState>(
    key: K,
    value: FilterState[K]
  ) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const toggleArrayFilter = (
    key: keyof Pick<FilterState, 'genres' | 'studios' | 'themes' | 'emotionalTags'>,
    value: string
  ) => {
    setFilters(prev => ({
      ...prev,
      [key]: prev[key].includes(value)
        ? prev[key].filter(item => item !== value)
        : [...prev[key], value],
    }));
  };

  const clearFilters = () => {
    setFilters({
      genres: [],
      yearRange: {},
      ratingRange: {},
      userRatingRange: {},
      studios: [],
      themes: [],
      emotionalTags: [],
    });
  };

  const hasActiveFilters = Object.keys(filters).some(key => {
    const value = filters[key as keyof FilterState];
    if (Array.isArray(value)) return value.length > 0;
    if (typeof value === 'object' && value !== null) {
      return Object.values(value).some(v => v !== undefined);
    }
    return value !== undefined;
  });

  return (
    <div className="p-4 sm:p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-orbitron text-electric-blue">Discover Anime</h2>
        {onBack && (
          <StyledButton 
            onClick={onBack}
            variant="secondary_small"
          >
            &larr; Dashboard
          </StyledButton>
        )}
      </div>

      {/* Controls */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-wrap gap-2 items-center">
          <StyledButton
            onClick={() => setShowFilters(!showFilters)}
            variant={showFilters ? "primary_small" : "secondary_small"}
          >
            {showFilters ? "Hide Filters" : "Show Filters"}
            {hasActiveFilters && <span className="ml-1 text-xs">({
              [filters.genres, filters.studios, filters.themes, filters.emotionalTags]
                .reduce((acc, arr) => acc + arr.length, 0) +
              Object.values(filters.yearRange).filter(v => v !== undefined).length +
              Object.values(filters.ratingRange).filter(v => v !== undefined).length +
              Object.values(filters.userRatingRange).filter(v => v !== undefined).length +
              (filters.minReviews !== undefined ? 1 : 0)
            })</span>}
          </StyledButton>
          
          {hasActiveFilters && (
            <StyledButton
              onClick={clearFilters}
              variant="secondary_small"
              className="text-xs"
            >
              Clear All
            </StyledButton>
          )}
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm text-brand-text-secondary">Sort by:</label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="neumorphic-input text-sm"
          >
            {sortOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && filterOptions && (
        <div className="neumorphic-card mb-6 p-4 space-y-6">
          <h3 className="text-lg font-orbitron text-sakura-pink">Filters</h3>
          
          {/* Genre Filter */}
          {filterOptions.genres.length > 0 && (
            <div>
              <h4 className="text-md text-neon-cyan mb-2">Genres</h4>
              <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto">
                {filterOptions.genres.map(genre => (
                  <StyledButton
                    key={genre}
                    onClick={() => toggleArrayFilter('genres', genre)}
                    variant={filters.genres.includes(genre) ? "primary_small" : "secondary_small"}
                    className="text-xs"
                  >
                    {genre}
                  </StyledButton>
                ))}
              </div>
            </div>
          )}

          {/* Year Range Filter */}
          {filterOptions.yearRange && (
            <div>
              <h4 className="text-md text-neon-cyan mb-2">Year Range</h4>
              <div className="flex gap-4 items-center">
                <div>
                  <label className="text-xs text-brand-text-secondary">Min Year:</label>
                  <input
                    type="number"
                    min={filterOptions.yearRange.min}
                    max={filterOptions.yearRange.max}
                    value={filters.yearRange.min || ''}
                    onChange={(e) => updateFilter('yearRange', {
                      ...filters.yearRange,
                      min: e.target.value ? parseInt(e.target.value) : undefined
                    })}
                    className="neumorphic-input w-20 text-sm ml-2"
                    placeholder={filterOptions.yearRange.min.toString()}
                  />
                </div>
                <div>
                  <label className="text-xs text-brand-text-secondary">Max Year:</label>
                  <input
                    type="number"
                    min={filterOptions.yearRange.min}
                    max={filterOptions.yearRange.max}
                    value={filters.yearRange.max || ''}
                    onChange={(e) => updateFilter('yearRange', {
                      ...filters.yearRange,
                      max: e.target.value ? parseInt(e.target.value) : undefined
                    })}
                    className="neumorphic-input w-20 text-sm ml-2"
                    placeholder={filterOptions.yearRange.max.toString()}
                  />
                </div>
              </div>
            </div>
          )}

          {/* External Rating Filter */}
          {filterOptions.ratingRange && (
            <div>
              <h4 className="text-md text-neon-cyan mb-2">External Rating</h4>
              <div className="flex gap-4 items-center">
                <div>
                  <label className="text-xs text-brand-text-secondary">Min Rating:</label>
                  <input
                    type="number"
                    min={filterOptions.ratingRange.min}
                    max={filterOptions.ratingRange.max}
                    step="0.1"
                    value={filters.ratingRange.min || ''}
                    onChange={(e) => updateFilter('ratingRange', {
                      ...filters.ratingRange,
                      min: e.target.value ? parseFloat(e.target.value) : undefined
                    })}
                    className="neumorphic-input w-20 text-sm ml-2"
                    placeholder={filterOptions.ratingRange.min.toFixed(1)}
                  />
                </div>
                <div>
                  <label className="text-xs text-brand-text-secondary">Max Rating:</label>
                  <input
                    type="number"
                    min={filterOptions.ratingRange.min}
                    max={filterOptions.ratingRange.max}
                    step="0.1"
                    value={filters.ratingRange.max || ''}
                    onChange={(e) => updateFilter('ratingRange', {
                      ...filters.ratingRange,
                      max: e.target.value ? parseFloat(e.target.value) : undefined
                    })}
                    className="neumorphic-input w-20 text-sm ml-2"
                    placeholder={filterOptions.ratingRange.max.toFixed(1)}
                  />
                </div>
              </div>
            </div>
          )}

          {/* User Rating Filter */}
          {filterOptions.userRatingRange && (
            <div>
              <h4 className="text-md text-neon-cyan mb-2">User Rating</h4>
              <div className="flex gap-4 items-center">
                <div>
                  <label className="text-xs text-brand-text-secondary">Min Rating:</label>
                  <input
                    type="number"
                    min={filterOptions.userRatingRange.min}
                    max={filterOptions.userRatingRange.max}
                    step="0.1"
                    value={filters.userRatingRange.min || ''}
                    onChange={(e) => updateFilter('userRatingRange', {
                      ...filters.userRatingRange,
                      min: e.target.value ? parseFloat(e.target.value) : undefined
                    })}
                    className="neumorphic-input w-20 text-sm ml-2"
                    placeholder={filterOptions.userRatingRange.min.toFixed(1)}
                  />
                </div>
                <div>
                  <label className="text-xs text-brand-text-secondary">Max Rating:</label>
                  <input
                    type="number"
                    min={filterOptions.userRatingRange.min}
                    max={filterOptions.userRatingRange.max}
                    step="0.1"
                    value={filters.userRatingRange.max || ''}
                    onChange={(e) => updateFilter('userRatingRange', {
                      ...filters.userRatingRange,
                      max: e.target.value ? parseFloat(e.target.value) : undefined
                    })}
                    className="neumorphic-input w-20 text-sm ml-2"
                    placeholder={filterOptions.userRatingRange.max.toFixed(1)}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Minimum Reviews Filter */}
          <div>
            <h4 className="text-md text-neon-cyan mb-2">Minimum Reviews</h4>
            <input
              type="number"
              min="0"
              value={filters.minReviews || ''}
              onChange={(e) => updateFilter('minReviews', 
                e.target.value ? parseInt(e.target.value) : undefined
              )}
              className="neumorphic-input w-24 text-sm"
              placeholder="0"
            />
          </div>

          {/* Studios Filter */}
          {filterOptions.studios.length > 0 && (
            <div>
              <h4 className="text-md text-neon-cyan mb-2">Studios</h4>
              <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                {filterOptions.studios.slice(0, 20).map(studio => (
                  <StyledButton
                    key={studio}
                    onClick={() => toggleArrayFilter('studios', studio)}
                    variant={filters.studios.includes(studio) ? "primary_small" : "secondary_small"}
                    className="text-xs"
                  >
                    {studio}
                  </StyledButton>
                ))}
                {filterOptions.studios.length > 20 && (
                  <span className="text-xs text-brand-text-secondary self-center">
                    ... and {filterOptions.studios.length - 20} more
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Themes Filter */}
          {filterOptions.themes.length > 0 && (
            <div>
              <h4 className="text-md text-neon-cyan mb-2">Themes</h4>
              <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                {filterOptions.themes.slice(0, 15).map(theme => (
                  <StyledButton
                    key={theme}
                    onClick={() => toggleArrayFilter('themes', theme)}
                    variant={filters.themes.includes(theme) ? "primary_small" : "secondary_small"}
                    className="text-xs"
                  >
                    {theme}
                  </StyledButton>
                ))}
                {filterOptions.themes.length > 15 && (
                  <span className="text-xs text-brand-text-secondary self-center">
                    ... and {filterOptions.themes.length - 15} more
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Emotional Tags Filter */}
          {filterOptions.emotionalTags.length > 0 && (
            <div>
              <h4 className="text-md text-neon-cyan mb-2">Emotional Tags</h4>
              <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                {filterOptions.emotionalTags.slice(0, 15).map(tag => (
                  <StyledButton
                    key={tag}
                    onClick={() => toggleArrayFilter('emotionalTags', tag)}
                    variant={filters.emotionalTags.includes(tag) ? "primary_small" : "secondary_small"}
                    className="text-xs"
                  >
                    {tag}
                  </StyledButton>
                ))}
                {filterOptions.emotionalTags.length > 15 && (
                  <span className="text-xs text-brand-text-secondary self-center">
                    ... and {filterOptions.emotionalTags.length - 15} more
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Results */}
      {status === "LoadingFirstPage" && (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-neon-cyan"></div>
          <p className="ml-3">Loading anime...</p>
        </div>
      )}

      {animeList && animeList.length > 0 ? (
        <>
          <div className="mb-4 text-sm text-brand-text-secondary">
            Found {animeList.length}+ anime{hasActiveFilters && " matching your filters"}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {animeList.map((anime) => (
              <AnimeCard
                key={anime._id}
                anime={anime as Doc<"anime">}
                onViewDetails={onViewDetails}
              />
            ))}
          </div>
          {status === "CanLoadMore" && (
            <div className="mt-8 text-center">
              <StyledButton onClick={() => loadMore(12)} disabled={isLoading}>
                {isLoading ? "Loading..." : "Load More Anime"}
              </StyledButton>
            </div>
          )}
          {status === "Exhausted" && animeList.length > 0 && (
            <p className="text-center mt-8 text-brand-text-secondary">
              You've reached the end of the filtered results!
            </p>
          )}
        </>
      ) : (
        status !== "LoadingFirstPage" && (
          <div className="text-center p-8 neumorphic-card">
            <p className="text-brand-text-secondary text-lg mb-4">
              {hasActiveFilters 
                ? "No anime found matching your filters." 
                : "No anime found in the database yet."
              }
            </p>
            {hasActiveFilters && (
              <StyledButton onClick={clearFilters} variant="primary">
                Clear Filters
              </StyledButton>
            )}
          </div>
        )
      )}
    </div>
  );
}