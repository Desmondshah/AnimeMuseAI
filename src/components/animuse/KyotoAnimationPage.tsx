import React, { useState, useEffect, useCallback } from "react";
import { useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { AnimeRecommendation } from "../../../convex/types";
import AnimeCard from "./AnimeCard";
import Carousel from "./shared/Carousel";
import { ArrowLeft } from "lucide-react";

interface KyotoAnimationPageProps {
  onViewAnimeDetail: (animeId: Id<"anime">) => void;
  onBack: () => void;
}

// Cache configuration
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
const CACHE_KEY = 'kyoto_animation_anime_cache';

interface CachedKyotoAnimationData {
  anime: AnimeRecommendation[];
  timestamp: number;
  version: string;
}

const KyotoAnimationPage: React.FC<KyotoAnimationPageProps> = ({ onViewAnimeDetail, onBack }) => {
  const [allKyotoAnimationAnime, setAllKyotoAnimationAnime] = useState<AnimeRecommendation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFetched, setLastFetched] = useState<number | null>(null);
  const [hasInitialData, setHasInitialData] = useState(false);

  const fetchKyotoAnimationAnime = useAction(api.externalApis.fetchKyotoAnimationAnime);

  // Cache management functions
  const getCachedData = useCallback((): CachedKyotoAnimationData | null => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (!cached) return null;
      
      const data: CachedKyotoAnimationData = JSON.parse(cached);
      const now = Date.now();
      
      // Check if cache is still valid
      if (now - data.timestamp > CACHE_DURATION) {
        localStorage.removeItem(CACHE_KEY);
        return null;
      }
      
      return data;
    } catch (error) {
      console.warn('[KyoAni] Cache read error:', error);
      localStorage.removeItem(CACHE_KEY);
      return null;
    }
  }, []);

  const setCachedData = useCallback((anime: AnimeRecommendation[]) => {
    try {
      const cacheData: CachedKyotoAnimationData = {
        anime,
        timestamp: Date.now(),
        version: '1.0.0'
      };
      localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
      setLastFetched(Date.now());
    } catch (error) {
      console.warn('[KyoAni] Cache write error:', error);
    }
  }, []);

  const isDataStale = useCallback((): boolean => {
    if (!lastFetched) return true;
    return (Date.now() - lastFetched) > CACHE_DURATION;
  }, [lastFetched]);

  // Organize anime by categories
  const [categories, setCategories] = useState<{
    legendary: AnimeRecommendation[];
    drama: AnimeRecommendation[];
    comedy: AnimeRecommendation[];
    movies: AnimeRecommendation[];
  }>({
    legendary: [],
    drama: [],
    comedy: [],
    movies: []
  });

  const organizeAnimeIntoCategories = useCallback((anime: AnimeRecommendation[]) => {
    const legendary = anime.filter((a: AnimeRecommendation) => 
      a.rating && a.rating >= 8.5 || a.title.toLowerCase().includes('clannad') || 
      a.title.toLowerCase().includes('violet evergarden') || a.title.toLowerCase().includes('silent voice') ||
      a.title.toLowerCase().includes('haruhi') || a.title.toLowerCase().includes('disappearance')
    );
    const drama = anime.filter((a: AnimeRecommendation) => 
      a.genres?.some(g => ['Drama', 'Romance', 'Slice of Life'].includes(g))
    );
    const comedy = anime.filter((a: AnimeRecommendation) => 
      a.genres?.some(g => ['Comedy', 'School', 'Music'].includes(g))
    );
    const movies = anime.filter((a: AnimeRecommendation) => 
      a.title.toLowerCase().includes('movie') || a.title.toLowerCase().includes('film') ||
      a.title.toLowerCase().includes('silent voice') || a.title.toLowerCase().includes('disappearance') ||
      a.title.toLowerCase().includes('violet evergarden: the movie')
    );

    setCategories({
      legendary: legendary.slice(0, 12),
      drama: drama.slice(0, 10),
      comedy: comedy.slice(0, 10),
      movies: movies.slice(0, 8)
    });
  }, []);

  const fetchKyotoAnimationData = useCallback(async (forceRefresh: boolean = false) => {
    try {
      setError(null);

      // Check cache first (unless forcing refresh)
      if (!forceRefresh) {
        const cachedData = getCachedData();
        if (cachedData && cachedData.anime.length > 0) {
          console.log('[KyoAni] Loading from cache...');
          setAllKyotoAnimationAnime(cachedData.anime);
          setLastFetched(cachedData.timestamp);
          organizeAnimeIntoCategories(cachedData.anime);
          setError(null);
          setHasInitialData(true);
          return;
        }
      }

      // Only show loading if we don't have initial data
      if (!hasInitialData) {
        setIsLoading(true);
      }
      
      console.log('[KyoAni] Fetching from API...');
      const result = await fetchKyotoAnimationAnime({ limit: 100 });
      
      if (result.error) {
        setError(result.error);
        return;
      }

      const anime = result.animes || [];
      
      if (anime.length === 0) {
        setError('No Kyoto Animation anime found');
        return;
      }

      // Update state and cache
      setAllKyotoAnimationAnime(anime);
      setCachedData(anime);
      organizeAnimeIntoCategories(anime);
      setError(null);
      setHasInitialData(true);
      
      console.log(`[KyoAni] Successfully fetched ${anime.length} anime`);

    } catch (err: any) {
      console.error('[KyoAni] Fetch error:', err);
      setError(err.message || 'Failed to load Kyoto Animation anime');
      
      // Try to fall back to cache if available
      const cachedData = getCachedData();
      if (cachedData && cachedData.anime.length > 0) {
        console.log('[KyoAni] Falling back to cached data...');
        setAllKyotoAnimationAnime(cachedData.anime);
        setLastFetched(cachedData.timestamp);
        organizeAnimeIntoCategories(cachedData.anime);
        setError('Using cached data - refresh failed');
        setHasInitialData(true);
      }
    } finally {
      setIsLoading(false);
    }
  }, [fetchKyotoAnimationAnime, getCachedData, setCachedData, organizeAnimeIntoCategories, hasInitialData]);

  // Smart initialization with background refresh
  useEffect(() => {
    // Check cache first for instant loading
    const cachedData = getCachedData();
    if (cachedData && cachedData.anime.length > 0) {
      console.log('[KyoAni] Loading from cache instantly...');
      setAllKyotoAnimationAnime(cachedData.anime);
      setLastFetched(cachedData.timestamp);
      organizeAnimeIntoCategories(cachedData.anime);
      setError(null);
      setHasInitialData(true);
      // Cache found - no need to fetch, cron jobs handle refreshing
    } else {
      // No cache available, fetch immediately
      console.log('[KyoAni] No cache found, fetching from API...');
      fetchKyotoAnimationData().catch(err => {
        console.error('[KyoAni] Initial fetch failed:', err);
      });
    }
  }, [fetchKyotoAnimationData, getCachedData, organizeAnimeIntoCategories, isDataStale]);

  // Loading state
  if (isLoading && !hasInitialData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900/20 via-black to-pink-900/20 flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="w-20 h-20 border-4 border-transparent border-t-purple-400 border-r-pink-600 rounded-full animate-spin"></div>
            <div className="absolute top-2 left-2 w-16 h-16 border-4 border-transparent border-b-purple-300 border-l-white/50 rounded-full animate-spin animate-reverse"></div>
            <div className="absolute top-6 left-6 w-8 h-8 bg-gradient-to-r from-purple-400 to-pink-600 rounded-full animate-pulse"></div>
          </div>
          <p className="text-xl text-white font-medium animate-pulse mt-4">Loading Kyoto Animation Excellence...</p>
          <p className="text-sm text-white/60">Gathering heartfelt masterpieces</p>
        </div>
      </div>
    );
  }

  if (error && !hasInitialData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900/20 via-black to-pink-900/20 flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">😔</div>
          <h2 className="text-2xl font-heading text-white mb-4">Oops!</h2>
          <p className="text-white/80 mb-6">{error}</p>
          <div className="space-x-4">
            <button
              onClick={() => fetchKyotoAnimationData(true)}
              className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
            >
              Try Again
            </button>
            <button
              onClick={onBack}
              className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900/20 via-black to-pink-900/20">
      {/* Floating particles effect */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute w-2 h-2 bg-purple-400/20 rounded-full animate-ping"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${2 + Math.random() * 3}s`
            }}
          />
        ))}
      </div>

      <div className="relative z-10 px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-6">
            <button 
              onClick={onBack}
              className="absolute left-4 top-8 bg-black/30 backdrop-blur-sm border border-white/20 hover:bg-black/50 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
            >
              <ArrowLeft size={20} />
              Back
            </button>
          </div>
          
          <div className="inline-block">
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-heading font-bold mb-4">
              <span className="bg-gradient-to-r from-purple-400 via-pink-500 to-purple-600 bg-clip-text text-transparent">
                🏛️ Kyoto Animation
              </span>
            </h1>
            <div className="h-1 w-full bg-gradient-to-r from-transparent via-purple-400 to-transparent animate-pulse"></div>
          </div>
          
          <p className="text-lg text-white/80 max-w-2xl mx-auto leading-relaxed mt-6">
            Experience the heartfelt storytelling and stunning animation that defines emotional excellence
          </p>
          
          <div className="mt-4 flex flex-col items-center gap-2">
            <div className="text-sm text-purple-400">
              {allKyotoAnimationAnime.length} heartfelt masterpieces found
            </div>
            

          </div>
        </div>

        {/* Content Sections */}
        <div className="max-w-7xl mx-auto space-y-16">
          
          {/* Legendary Works */}
          {categories.legendary.length > 0 && (
            <section>
              <div className="mb-8">
                <h2 className="text-2xl sm:text-3xl font-heading text-white mb-2 flex items-center gap-3">
                  🏆 Legendary Masterpieces
                </h2>
                <div className="h-0.5 w-24 bg-gradient-to-r from-purple-400 to-pink-400"></div>
              </div>
              <div className="relative bg-black/20 backdrop-blur-sm border border-white/10 rounded-3xl p-6">
                <Carousel>
                  {categories.legendary.map((anime, index) => (
                    <div key={`legendary-${index}`} className="flex-shrink-0 w-48 sm:w-52">
                      <AnimeCard
                        anime={anime}
                        onViewDetails={() => anime._id && onViewAnimeDetail(anime._id as Id<"anime">)}
                        className="h-full"
                      />
                    </div>
                  ))}
                </Carousel>
              </div>
            </section>
          )}

          {/* Drama & Romance */}
          {categories.drama.length > 0 && (
            <section>
              <div className="mb-8">
                <h2 className="text-2xl sm:text-3xl font-heading text-white mb-2 flex items-center gap-3">
                  💕 Drama & Romance
                </h2>
                <div className="h-0.5 w-24 bg-gradient-to-r from-pink-400 to-purple-400"></div>
              </div>
              <div className="relative bg-black/20 backdrop-blur-sm border border-white/10 rounded-3xl p-6">
                <Carousel>
                  {categories.drama.map((anime, index) => (
                    <div key={`drama-${index}`} className="flex-shrink-0 w-48 sm:w-52">
                      <AnimeCard
                        anime={anime}
                        onViewDetails={() => anime._id && onViewAnimeDetail(anime._id as Id<"anime">)}
                        className="h-full"
                      />
                    </div>
                  ))}
                </Carousel>
              </div>
            </section>
          )}

          {/* Comedy & Slice of Life */}
          {categories.comedy.length > 0 && (
            <section>
              <div className="mb-8">
                <h2 className="text-2xl sm:text-3xl font-heading text-white mb-2 flex items-center gap-3">
                  😊 Comedy & Slice of Life
                </h2>
                <div className="h-0.5 w-24 bg-gradient-to-r from-yellow-400 to-purple-400"></div>
              </div>
              <div className="relative bg-black/20 backdrop-blur-sm border border-white/10 rounded-3xl p-6">
                <Carousel>
                  {categories.comedy.map((anime, index) => (
                    <div key={`comedy-${index}`} className="flex-shrink-0 w-48 sm:w-52">
                      <AnimeCard
                        anime={anime}
                        onViewDetails={() => anime._id && onViewAnimeDetail(anime._id as Id<"anime">)}
                        className="h-full"
                      />
                    </div>
                  ))}
                </Carousel>
              </div>
            </section>
          )}

          {/* Movies & Specials */}
          {categories.movies.length > 0 && (
            <section>
              <div className="mb-8">
                <h2 className="text-2xl sm:text-3xl font-heading text-white mb-2 flex items-center gap-3">
                  🎬 Movies & Specials
                </h2>
                <div className="h-0.5 w-24 bg-gradient-to-r from-purple-400 to-pink-400"></div>
              </div>
              <div className="relative bg-black/20 backdrop-blur-sm border border-white/10 rounded-3xl p-6">
                <Carousel>
                  {categories.movies.map((anime, index) => (
                    <div key={`movies-${index}`} className="flex-shrink-0 w-48 sm:w-52">
                      <AnimeCard
                        anime={anime}
                        onViewDetails={() => anime._id && onViewAnimeDetail(anime._id as Id<"anime">)}
                        className="h-full"
                      />
                    </div>
                  ))}
                </Carousel>
              </div>
            </section>
          )}

          {/* Error Banner */}
          {error && hasInitialData && (
            <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4 text-center">
              <p className="text-red-300">
                ⚠️ Some data may be outdated. Using cached results. {error}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default KyotoAnimationPage; 