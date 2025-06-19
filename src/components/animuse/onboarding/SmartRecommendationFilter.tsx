// components/SmartRecommendationFilter.tsx
import React, { useState, useCallback, memo, useEffect, useRef } from 'react';
import { AnimeRecommendation } from '../../../../convex/types';
import type { FilterOptions as WorkerFilterOptions, FilterMessage } from '../../../../convex/recommendationFilterWorker';

type FilterOptions = WorkerFilterOptions;

interface SmartRecommendationFilterProps {
  recommendations: AnimeRecommendation[];
  onFilteredChange: (filtered: AnimeRecommendation[]) => void;
  watchedAnimeIds: string[];
  className?: string;
}

const SmartRecommendationFilter: React.FC<SmartRecommendationFilterProps> = ({
  recommendations,
  onFilteredChange,
  watchedAnimeIds,
  className = ''
}) => {

 const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    workerRef.current = new Worker(new URL('../../../../convex/recommendationFilterWorker.ts', import.meta.url), { type: 'module' });
    const worker = workerRef.current;
    worker.onmessage = (e: MessageEvent<AnimeRecommendation[]>) => {
      onFilteredChange(e.data);
    };
    return () => worker.terminate();
  }, [onFilteredChange]);
  const [filters, setFilters] = useState<FilterOptions>({
    minRating: 0,
    genres: [],
    years: [1990, new Date().getFullYear()],
    studios: [],
    excludeWatched: true,
    prioritizeNewReleases: false,
    moodMatchThreshold: 0
  });

  const [isExpanded, setIsExpanded] = useState(false);

  const availableGenres = React.useMemo(() => {
    const genres = new Set<string>();
    recommendations.forEach(rec => {
      rec.genres?.forEach(genre => genres.add(genre));
    });
    return Array.from(genres).sort();
  }, [recommendations]);

  const availableStudios = React.useMemo(() => {
    const studios = new Set<string>();
    recommendations.forEach(rec => {
      rec.studios?.forEach(studio => studios.add(studio));
    });
    return Array.from(studios).sort();
  }, [recommendations]);

  const applyFilters = useCallback(() => {
    const worker = workerRef.current;
    if (!worker) return;
    const message: FilterMessage = {
      recommendations,
      filters,
      watchedAnimeIds,
    };
    worker.postMessage(message);
  }, [recommendations, filters, watchedAnimeIds]);

  React.useEffect(() => {
    applyFilters();
  }, [applyFilters]);

  const updateFilter = (key: keyof FilterOptions, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const resetFilters = () => {
    setFilters({
      minRating: 0,
      genres: [],
      years: [1990, new Date().getFullYear()],
      studios: [],
      excludeWatched: true,
      prioritizeNewReleases: false,
      moodMatchThreshold: 0
    });
  };

  const activeFilterCount = Object.entries(filters).filter(([key, value]) => {
    if (key === 'excludeWatched' && value) return false; // Default behavior
    if (key === 'years') return value[0] !== 1990 || value[1] !== new Date().getFullYear();
    if (Array.isArray(value)) return value.length > 0;
    if (typeof value === 'number') return value > 0;
    return Boolean(value);
  }).length;

  return (
    <div className={`bg-black/20 backdrop-blur-sm border border-white/10 rounded-2xl ${className}`}>
      <div className="p-3">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center justify-between w-full text-left"
        >
          <span className="text-sm font-medium text-white flex items-center gap-2">
            🎛️ Smart Filters
            {activeFilterCount > 0 && (
              <span className="bg-brand-primary-action text-white text-xs rounded-full px-2 py-0.5">
                {activeFilterCount}
              </span>
            )}
          </span>
          <span className="text-white/60">
            {isExpanded ? '▲' : '▼'}
          </span>
        </button>

        {isExpanded && (
          <div className="mt-4 space-y-4">
            {/* Rating Filter */}
            <div>
              <label className="block text-xs text-white/70 mb-1">
                Minimum Rating: {filters.minRating}/10
              </label>
              <input
                type="range"
                min="0"
                max="10"
                step="0.5"
                value={filters.minRating}
                onChange={(e) => updateFilter('minRating', parseFloat(e.target.value))}
                className="w-full slider"
              />
            </div>

            {/* Mood Match Threshold */}
            <div>
              <label className="block text-xs text-white/70 mb-1">
                Mood Match: {filters.moodMatchThreshold}/10
              </label>
              <input
                type="range"
                min="0"
                max="10"
                step="1"
                value={filters.moodMatchThreshold}
                onChange={(e) => updateFilter('moodMatchThreshold', parseInt(e.target.value))}
                className="w-full slider"
              />
            </div>

            {/* Year Range */}
            <div>
              <label className="block text-xs text-white/70 mb-1">
                Years: {filters.years[0]} - {filters.years[1]}
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  min="1960"
                  max={new Date().getFullYear()}
                  value={filters.years[0]}
                  onChange={(e) => updateFilter('years', [parseInt(e.target.value), filters.years[1]])}
                  className="form-input text-xs flex-1"
                />
                <input
                  type="number"
                  min="1960"
                  max={new Date().getFullYear()}
                  value={filters.years[1]}
                  onChange={(e) => updateFilter('years', [filters.years[0], parseInt(e.target.value)])}
                  className="form-input text-xs flex-1"
                />
              </div>
            </div>

            {/* Genre Selection */}
            {availableGenres.length > 0 && (
              <div>
                <label className="block text-xs text-white/70 mb-1">
                  Genres ({filters.genres.length} selected)
                </label>
                <div className="max-h-24 overflow-y-auto space-y-1">
                  {availableGenres.slice(0, 10).map(genre => (
                    <label key={genre} className="flex items-center gap-2 text-xs">
                      <input
                        type="checkbox"
                        checked={filters.genres.includes(genre)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            updateFilter('genres', [...filters.genres, genre]);
                          } else {
                            updateFilter('genres', filters.genres.filter(g => g !== genre));
                          }
                        }}
                        className="form-checkbox w-3 h-3"
                      />
                      <span className="text-white/80">{genre}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Options */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={filters.excludeWatched}
                  onChange={(e) => updateFilter('excludeWatched', e.target.checked)}
                  className="form-checkbox w-3 h-3"
                />
                <span className="text-white/80">Exclude watched anime</span>
              </label>

              <label className="flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={filters.prioritizeNewReleases}
                  onChange={(e) => updateFilter('prioritizeNewReleases', e.target.checked)}
                  className="form-checkbox w-3 h-3"
                />
                <span className="text-white/80">Prioritize new releases</span>
              </label>
            </div>

            {/* Reset Button */}
            {activeFilterCount > 0 && (
              <button
                onClick={resetFilters}
                className="w-full text-xs bg-white/10 hover:bg-white/20 text-white rounded-lg py-2 transition-colors"
              >
                Reset All Filters
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default memo(SmartRecommendationFilter);