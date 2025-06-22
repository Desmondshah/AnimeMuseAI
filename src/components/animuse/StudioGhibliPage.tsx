import React, { useState, useEffect, useCallback, useRef } from "react";
import { useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { AnimeRecommendation } from "../../../convex/types";
import { motion } from "framer-motion";
import StyledButton from "./shared/StyledButton";
import Carousel from "./shared/Carousel";
import AnimeCard from "./AnimeCard";
import { Id } from "../../../convex/_generated/dataModel";

interface StudioGhibliPageProps {
  onViewAnimeDetail: (animeId: Id<"anime">) => void;
  onBack: () => void;
}

// Cache configuration
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
const CACHE_KEY = 'studio_ghibli_anime_cache';

interface CachedGhibliData {
  anime: AnimeRecommendation[];
  timestamp: number;
  version: string;
}

const StudioGhibliPage: React.FC<StudioGhibliPageProps> = ({ onViewAnimeDetail, onBack }) => {
  const [allGhibliAnime, setAllGhibliAnime] = useState<AnimeRecommendation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFetched, setLastFetched] = useState<number | null>(null);
  const [hasInitialData, setHasInitialData] = useState(false);

  const fetchStudioGhibliAnime = useAction(api.externalApis.fetchStudioGhibliAnime);
  const fetchInProgressRef = useRef<boolean>(false);
  const debouncedFetchRef = useRef<NodeJS.Timeout | null>(null);

  // Cache management functions
  const getCachedData = useCallback((): CachedGhibliData | null => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (!cached) return null;
      
      const data: CachedGhibliData = JSON.parse(cached);
      const now = Date.now();
      
      // Check if cache is still valid
      if (now - data.timestamp > CACHE_DURATION) {
        localStorage.removeItem(CACHE_KEY);
        return null;
      }
      
      return data;
    } catch (error) {
      console.warn('[Studio Ghibli] Cache read error:', error);
      localStorage.removeItem(CACHE_KEY);
      return null;
    }
  }, []);

  const setCachedData = useCallback((anime: AnimeRecommendation[]) => {
    try {
      const cacheData: CachedGhibliData = {
        anime,
        timestamp: Date.now(),
        version: '1.0.0'
      };
      localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
      setLastFetched(Date.now());
    } catch (error) {
      console.warn('[Studio Ghibli] Cache write error:', error);
    }
  }, []);

  const isDataStale = useCallback((): boolean => {
    if (!lastFetched) return true;
    return (Date.now() - lastFetched) > CACHE_DURATION;
  }, [lastFetched]);

  // Organize anime by categories
  const [categories, setCategories] = useState<{
    films: AnimeRecommendation[];
    classics: AnimeRecommendation[];
    recent: AnimeRecommendation[];
    highRated: AnimeRecommendation[];
  }>({
    films: [],
    classics: [],
    recent: [],
    highRated: []
  });

  const organizeAnimeIntoCategories = useCallback((anime: AnimeRecommendation[]) => {
    const films = anime.filter((a: AnimeRecommendation) => 
      a.genres?.includes('Drama') || a.genres?.includes('Adventure') || !a.genres?.includes('TV')
    );
    const classics = anime.filter((a: AnimeRecommendation) => a.year && a.year <= 2000);
    const recent = anime.filter((a: AnimeRecommendation) => a.year && a.year >= 2010);
    const highRated = anime.filter((a: AnimeRecommendation) => a.rating && a.rating >= 8.0)
      .sort((a: AnimeRecommendation, b: AnimeRecommendation) => (b.rating || 0) - (a.rating || 0));

    setCategories({
      films: films.slice(0, 12),
      classics: classics.slice(0, 8),
      recent: recent.slice(0, 8),
      highRated: highRated.slice(0, 10)
    });
  }, []);

  const fetchGhibliData = useCallback(async (forceRefresh: boolean = false) => {
    // Prevent concurrent fetches
    if (fetchInProgressRef.current) {
      console.log('[Studio Ghibli] Fetch already in progress, skipping...');
      return;
    }

    // Check cache first (unless forcing refresh)
    if (!forceRefresh) {
      const cachedData = getCachedData();
      if (cachedData && cachedData.anime.length > 0) {
        console.log('[Studio Ghibli] Loading from cache...');
        setAllGhibliAnime(cachedData.anime);
        setLastFetched(cachedData.timestamp);
        organizeAnimeIntoCategories(cachedData.anime);
        setError(null);
        setHasInitialData(true);
        return;
      }
    }

    // Fetch from API
    fetchInProgressRef.current = true;
    
    try {
      // Only show loading if we don't have initial data
      if (!hasInitialData) {
        setIsLoading(true);
      }
      setError(null);
      
      console.log('[Studio Ghibli] Fetching from API...');
      const result = await fetchStudioGhibliAnime({ limit: 100 });
      
      if (result.error) {
        setError(result.error);
        return;
      }

      const anime = result.animes || [];
      
      if (anime.length === 0) {
        setError('No Studio Ghibli anime found');
        return;
      }

      // Update state and cache
      setAllGhibliAnime(anime);
      setCachedData(anime);
      organizeAnimeIntoCategories(anime);
      setError(null);
      setHasInitialData(true);
      
      console.log(`[Studio Ghibli] Successfully fetched ${anime.length} anime`);

    } catch (err: any) {
      console.error('[Studio Ghibli] Fetch error:', err);
      setError(err.message || 'Failed to load Studio Ghibli anime');
      
      // Try to fall back to cache if available
      const cachedData = getCachedData();
      if (cachedData && cachedData.anime.length > 0) {
        console.log('[Studio Ghibli] Falling back to cached data...');
        setAllGhibliAnime(cachedData.anime);
        setLastFetched(cachedData.timestamp);
        organizeAnimeIntoCategories(cachedData.anime);
        setError('Using cached data - refresh failed');
        setHasInitialData(true);
      }
    } finally {
      setIsLoading(false);
      fetchInProgressRef.current = false;
    }
  }, [fetchStudioGhibliAnime, getCachedData, setCachedData, organizeAnimeIntoCategories, hasInitialData]);



  // Smart initialization with background refresh
  useEffect(() => {
    if (debouncedFetchRef.current) {
      clearTimeout(debouncedFetchRef.current);
    }

    debouncedFetchRef.current = setTimeout(() => {
             // Check cache first for instant loading
       const cachedData = getCachedData();
       if (cachedData && cachedData.anime.length > 0) {
         console.log('[Studio Ghibli] Loading from cache instantly...');
         setAllGhibliAnime(cachedData.anime);
         setLastFetched(cachedData.timestamp);
         organizeAnimeIntoCategories(cachedData.anime);
         setError(null);
         setHasInitialData(true);
         // Cache found - no need to fetch, cron jobs handle refreshing
       } else {
         // No cache, fetch immediately
         console.log('[Studio Ghibli] No cache found, fetching from API...');
         fetchGhibliData(false);
       }
    }, 100); // Small debounce

    return () => {
      if (debouncedFetchRef.current) {
        clearTimeout(debouncedFetchRef.current);
      }
    };
     }, [fetchGhibliData, getCachedData, organizeAnimeIntoCategories, isDataStale]);



  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debouncedFetchRef.current) {
        clearTimeout(debouncedFetchRef.current);
      }
      fetchInProgressRef.current = false;
    };
  }, []);



  if (isLoading && !hasInitialData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-900/20 via-black to-emerald-900/20 flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="w-20 h-20 border-4 border-transparent border-t-green-400 border-r-emerald-600 rounded-full animate-spin"></div>
            <div className="absolute top-2 left-2 w-16 h-16 border-4 border-transparent border-b-green-300 border-l-white/50 rounded-full animate-spin animate-reverse"></div>
            <div className="absolute top-6 left-6 w-8 h-8 bg-gradient-to-r from-green-400 to-emerald-600 rounded-full animate-pulse"></div>
          </div>
          <p className="text-xl text-white font-medium animate-pulse mt-4">Loading Studio Ghibli Magic...</p>
          <p className="text-sm text-white/60">Gathering masterpieces</p>
        </div>
      </div>
    );
  }

  if (error && !hasInitialData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-900/20 via-black to-emerald-900/20 flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">😔</div>
          <h2 className="text-2xl font-heading text-white mb-4">Oops!</h2>
          <p className="text-white/80 mb-6">{error}</p>
          <div className="space-x-4">
            <StyledButton onClick={() => fetchGhibliData(true)} variant="primary">
              Try Again
            </StyledButton>
            <StyledButton onClick={onBack} variant="secondary">
              Go Back
            </StyledButton>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-900/20 via-black to-emerald-900/20">
      {/* Floating particles effect */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute w-2 h-2 bg-green-400/20 rounded-full animate-ping"
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
            <StyledButton 
              onClick={onBack}
              variant="ghost"
              className="!absolute !left-4 !top-8 !bg-black/30 !backdrop-blur-sm !border-white/20 hover:!bg-black/50 !text-white"
            >
              ← Back
            </StyledButton>
          </div>
          
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="inline-block"
          >
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-heading font-bold mb-4">
              <span className="bg-gradient-to-r from-green-400 via-emerald-500 to-green-600 bg-clip-text text-transparent">
                🌿 Studio Ghibli
              </span>
            </h1>
            <div className="h-1 w-full bg-gradient-to-r from-transparent via-green-400 to-transparent animate-pulse"></div>
          </motion.div>
          
          <p className="text-lg text-white/80 max-w-2xl mx-auto leading-relaxed mt-6">
            Discover the magical world of Studio Ghibli's breathtaking animated masterpieces
          </p>
          
          <div className="mt-4 flex flex-col items-center gap-2">
            <div className="text-sm text-green-400">
              {allGhibliAnime.length} magical works found
            </div>
            

          </div>
        </div>

        {/* Content Sections */}
        <div className="max-w-7xl mx-auto space-y-16">
          
          {/* Show placeholder sections when loading for the first time */}
          {isLoading && !hasInitialData && (
            <div className="space-y-16">
              {[1, 2, 3, 4].map((section) => (
                <section key={section}>
                  <div className="mb-8">
                    <div className="h-8 w-48 bg-white/10 rounded-lg animate-pulse"></div>
                    <div className="h-0.5 w-24 bg-white/20 mt-2"></div>
                  </div>
                  <div className="relative bg-black/20 backdrop-blur-sm border border-white/10 rounded-3xl p-6">
                    <div className="flex gap-4 overflow-hidden">
                      {[1, 2, 3, 4, 5].map((item) => (
                        <div key={item} className="flex-shrink-0 w-48 sm:w-52">
                          <div className="aspect-[2/3] bg-white/10 rounded-2xl animate-pulse"></div>
                        </div>
                      ))}
                    </div>
                  </div>
                </section>
              ))}
            </div>
          )}
          
          {/* Iconic Films */}
          {categories.films.length > 0 && (
            <section>
              <div className="mb-8">
                <h2 className="text-2xl sm:text-3xl font-heading text-white mb-2 flex items-center gap-3">
                  🎬 Iconic Films
                </h2>
                <div className="h-0.5 w-24 bg-gradient-to-r from-green-400 to-transparent"></div>
              </div>
              
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-green-400/10 via-transparent to-emerald-600/10 rounded-3xl blur-xl"></div>
                <div className="relative bg-black/20 backdrop-blur-sm border border-white/10 rounded-3xl p-6">
                  <Carousel variant="default">
                    {categories.films.map((anime, index) => (
                      <motion.div
                        key={`films-${index}`}
                        className="group flex-shrink-0 w-48 sm:w-52 transform cursor-pointer"
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        whileHover={{ scale: 1.05 }}
                      >
                        <div className="relative">
                          <AnimeCard 
                            anime={anime} 
                            isRecommendation={true} 
                            onViewDetails={onViewAnimeDetail}
                            className="w-full"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-green-900/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl pointer-events-none"></div>
                        </div>
                      </motion.div>
                    ))}
                  </Carousel>
                </div>
              </div>
            </section>
          )}

          {/* Classic Era */}
          {categories.classics.length > 0 && (
            <section>
              <div className="mb-8">
                <h2 className="text-2xl sm:text-3xl font-heading text-white mb-2 flex items-center gap-3">
                  🏛️ Classic Era
                </h2>
                <div className="h-0.5 w-24 bg-gradient-to-r from-emerald-400 to-transparent"></div>
              </div>
              
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-400/10 via-transparent to-green-600/10 rounded-3xl blur-xl"></div>
                <div className="relative bg-black/20 backdrop-blur-sm border border-white/10 rounded-3xl p-6">
                  <Carousel variant="default">
                    {categories.classics.map((anime, index) => (
                      <motion.div
                        key={`classics-${index}`}
                        className="group flex-shrink-0 w-48 sm:w-52 transform cursor-pointer"
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        whileHover={{ scale: 1.05 }}
                      >
                        <div className="relative">
                          <AnimeCard 
                            anime={anime} 
                            isRecommendation={true} 
                            onViewDetails={onViewAnimeDetail}
                            className="w-full"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-emerald-900/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl pointer-events-none"></div>
                        </div>
                      </motion.div>
                    ))}
                  </Carousel>
                </div>
              </div>
            </section>
          )}

          {/* Highest Rated */}
          {categories.highRated.length > 0 && (
            <section>
              <div className="mb-8">
                <h2 className="text-2xl sm:text-3xl font-heading text-white mb-2 flex items-center gap-3">
                  ⭐ Highest Rated
                </h2>
                <div className="h-0.5 w-24 bg-gradient-to-r from-yellow-400 to-transparent"></div>
              </div>
              
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-yellow-400/10 via-transparent to-green-600/10 rounded-3xl blur-xl"></div>
                <div className="relative bg-black/20 backdrop-blur-sm border border-white/10 rounded-3xl p-6">
                  <Carousel variant="default">
                    {categories.highRated.map((anime, index) => (
                      <motion.div
                        key={`rated-${index}`}
                        className="group flex-shrink-0 w-48 sm:w-52 transform cursor-pointer"
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        whileHover={{ scale: 1.05 }}
                      >
                        <div className="relative">
                          <AnimeCard 
                            anime={anime} 
                            isRecommendation={true} 
                            onViewDetails={onViewAnimeDetail}
                            className="w-full"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-yellow-900/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl pointer-events-none"></div>
                          {anime.rating && (
                            <div className="absolute top-2 right-2 bg-yellow-500/90 text-black text-xs font-bold px-2 py-1 rounded-full pointer-events-none">
                              {anime.rating.toFixed(1)}⭐
                            </div>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </Carousel>
                </div>
              </div>
            </section>
          )}

          {/* Recent Works */}
          {categories.recent.length > 0 && (
            <section>
              <div className="mb-8">
                <h2 className="text-2xl sm:text-3xl font-heading text-white mb-2 flex items-center gap-3">
                  ✨ Recent Works
                </h2>
                <div className="h-0.5 w-24 bg-gradient-to-r from-cyan-400 to-transparent"></div>
              </div>
              
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-400/10 via-transparent to-green-600/10 rounded-3xl blur-xl"></div>
                <div className="relative bg-black/20 backdrop-blur-sm border border-white/10 rounded-3xl p-6">
                  <Carousel variant="default">
                    {categories.recent.map((anime, index) => (
                      <motion.div
                        key={`recent-${index}`}
                        className="group flex-shrink-0 w-48 sm:w-52 transform cursor-pointer"
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        whileHover={{ scale: 1.05 }}
                      >
                        <div className="relative">
                          <AnimeCard 
                            anime={anime} 
                            isRecommendation={true} 
                            onViewDetails={onViewAnimeDetail}
                            className="w-full"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-cyan-900/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl pointer-events-none"></div>
                        </div>
                      </motion.div>
                    ))}
                  </Carousel>
                </div>
              </div>
            </section>
          )}

        </div>

        {/* Footer */}
        <div className="text-center mt-20 mb-8">
          <p className="text-white/60 text-sm">
            Experience the magic and wonder of Studio Ghibli's timeless stories
          </p>
        </div>
      </div>
    </div>
  );
};

export default StudioGhibliPage; 