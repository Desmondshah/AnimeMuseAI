import { AnimeRecommendation } from "../convex/types";

export interface FilterOptions {
  minRating: number;
  genres: string[];
  years: [number, number];
  studios: string[];
  excludeWatched: boolean;
  prioritizeNewReleases: boolean;
  moodMatchThreshold: number;
}

export interface FilterMessage {
  recommendations: AnimeRecommendation[];
  filters: FilterOptions;
  watchedAnimeIds: string[];
}

self.onmessage = (e: MessageEvent<FilterMessage>) => {
  const { recommendations, filters, watchedAnimeIds } = e.data;
  let filtered = [...recommendations];
  if (filters.minRating > 0) {
    filtered = filtered.filter(r => (r.rating || 0) >= filters.minRating);
  }
  if (filters.genres.length > 0) {
    filtered = filtered.filter(r => r.genres?.some(g => filters.genres.includes(g)));
  }
  filtered = filtered.filter(r => {
    const year = r.year || 2000;
    return year >= filters.years[0] && year <= filters.years[1];
  });
  if (filters.studios.length > 0) {
    filtered = filtered.filter(r => r.studios?.some(s => filters.studios.includes(s)));
  }
  if (filters.excludeWatched) {
    filtered = filtered.filter(r => !watchedAnimeIds.includes(r.title));
  }
  if (filters.moodMatchThreshold > 0) {
    filtered = filtered.filter(r => (r.moodMatchScore || 0) >= filters.moodMatchThreshold);
  }
  if (filters.prioritizeNewReleases) {
    filtered.sort((a, b) => (b.year || 0) - (a.year || 0));
  } else {
    filtered.sort((a, b) => (b.moodMatchScore || 0) - (a.moodMatchScore || 0));
  }
  postMessage(filtered);
};