import React, { useState, useEffect, useCallback, useRef } from "react";
import { useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { AnimeRecommendation } from "../../../convex/types";
import { motion } from "framer-motion";
import StyledButton from "./shared/StyledButton";
import Carousel from "./shared/Carousel";
import AnimeCard from "./AnimeCard";
import { Id } from "../../../convex/_generated/dataModel";

interface MadhousePageProps {
  onViewAnimeDetail: (animeId: Id<"anime">) => void;
  onBack: () => void;
}

// Cache configuration
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
const CACHE_KEY = 'madhouse_anime_cache';

interface CachedMadhouseData {
  anime: AnimeRecommendation[];
  timestamp: number;
  version: string;
}

const MadhousePage: React.FC<MadhousePageProps> = ({ onViewAnimeDetail, onBack }) => {
  const [allMadhouseAnime, setAllMadhouseAnime] = useState<AnimeRecommendation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFetched, setLastFetched] = useState<number | null>(null);
  const [hasInitialData, setHasInitialData] = useState(false);

  const fetchMadhouseAnime = useAction(api.externalApis.fetchMadhouseAnime);
  const fetchInProgressRef = useRef<boolean>(false);
  const debouncedFetchRef = useRef<NodeJS.Timeout | null>(null);

  // Cache management functions
  const getCachedData = useCallback((): CachedMadhouseData | null => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (!cached) return null;
      
      const data: CachedMadhouseData = JSON.parse(cached);
      const now = Date.now();
      
      // Check if cache is still valid
      if (now - data.timestamp > CACHE_DURATION) {
        localStorage.removeItem(CACHE_KEY);
        return null;
      }
      
      return data;
    } catch (error) {
      console.warn('[Madhouse] Cache read error:', error);
      localStorage.removeItem(CACHE_KEY);
      return null;
    }
  }, []);

  const setCachedData = useCallback((anime: AnimeRecommendation[]) => {
    try {
      const cacheData: CachedMadhouseData = {
        anime,
        timestamp: Date.now(),
        version: '1.0.0'
      };
      localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
      setLastFetched(Date.now());
    } catch (error) {
      console.warn('[Madhouse] Cache write error:', error);
    }
  }, []);

  const isDataStale = useCallback((): boolean => {
    if (!lastFetched) return true;
    return (Date.now() - lastFetched) > CACHE_DURATION;
  }, [lastFetched]);

  // Organize anime by categories
  const [categories, setCategories] = useState<{
    legendary: AnimeRecommendation[];
    action: AnimeRecommendation[];
    psychological: AnimeRecommendation[];
    recent: AnimeRecommendation[];
  }>({
    legendary: [],
    action: [],
    psychological: [],
    recent: []
  });

  const organizeAnimeIntoCategories = useCallback((anime: AnimeRecommendation[]) => {
    const legendary = anime.filter((a: AnimeRecommendation) => 
      a.rating && a.rating >= 8.5 || a.title.toLowerCase().includes('death note') || 
      a.title.toLowerCase().includes('hunter x hunter') || a.title.toLowerCase().includes('monster')
    );
    const action = anime.filter((a: AnimeRecommendation) => 
      a.genres?.some(g => ['Action', 'Adventure', 'Superhero'].includes(g))
    );
    const psychological = anime.filter((a: AnimeRecommendation) => 
      a.genres?.some(g => ['Psychological', 'Thriller', 'Horror', 'Mystery'].includes(g))
    );
    const recent = anime.filter((a: AnimeRecommendation) => a.year && a.year >= 2015);

    setCategories({
      legendary: legendary.slice(0, 12),
      action: action.slice(0, 10),
      psychological: psychological.slice(0, 8),
      recent: recent.slice(0, 10)
    });
  }, []);

  const fetchMadhouseData = useCallback(async (forceRefresh: boolean = false) => {
    // Prevent concurrent fetches
    if (fetchInProgressRef.current) {
      console.log('[Madhouse] Fetch already in progress, skipping...');
      return;
    }

    // Check cache first (unless forcing refresh)
    if (!forceRefresh) {
      const cachedData = getCachedData();
      if (cachedData && cachedData.anime.length > 0) {
        console.log('[Madhouse] Loading from cache...');
        setAllMadhouseAnime(cachedData.anime);
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
      
      console.log('[Madhouse] Fetching from API...');
      const result = await fetchMadhouseAnime({ limit: 100 });
      
      if (result.error) {
        setError(result.error);
        return;
      }

      const anime = result.animes || [];
      
      if (anime.length === 0) {
        setError('No Madhouse anime found');
        return;
      }

      // Update state and cache
      setAllMadhouseAnime(anime);
      setCachedData(anime);
      organizeAnimeIntoCategories(anime);
      setError(null);
      setHasInitialData(true);
      
      console.log(`[Madhouse] Successfully fetched ${anime.length} anime`);

    } catch (err: any) {
      console.error('[Madhouse] Fetch error:', err);
      setError(err.message || 'Failed to load Madhouse anime');
      
      // Try to fall back to cache if available
      const cachedData = getCachedData();
      if (cachedData && cachedData.anime.length > 0) {
        console.log('[Madhouse] Falling back to cached data...');
        setAllMadhouseAnime(cachedData.anime);
        setLastFetched(cachedData.timestamp);
        organizeAnimeIntoCategories(cachedData.anime);
        setError('Using cached data - refresh failed');
        setHasInitialData(true);
      }
    } finally {
      setIsLoading(false);
      fetchInProgressRef.current = false;
    }
  }, [fetchMadhouseAnime, getCachedData, setCachedData, organizeAnimeIntoCategories, hasInitialData]);

  // Smart initialization with background refresh
  useEffect(() => {
    if (debouncedFetchRef.current) {
      clearTimeout(debouncedFetchRef.current);
    }

    debouncedFetchRef.current = setTimeout(() => {
             // Check cache first for instant loading
       const cachedData = getCachedData();
       if (cachedData && cachedData.anime.length > 0) {
         console.log('[Madhouse] Loading from cache instantly...');
         setAllMadhouseAnime(cachedData.anime);
         setLastFetched(cachedData.timestamp);
         organizeAnimeIntoCategories(cachedData.anime);
         setError(null);
         setHasInitialData(true);
         // Cache found - no need to fetch, cron jobs handle refreshing
       } else {
         // No cache, fetch immediately
         console.log('[Madhouse] No cache found, fetching from API...');
         fetchMadhouseData(false);
       }
    }, 100); // Small debounce

    return () => {
      if (debouncedFetchRef.current) {
        clearTimeout(debouncedFetchRef.current);
      }
    };
  }, [fetchMadhouseData, getCachedData, organizeAnimeIntoCategories, isDataStale]);



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
      <div className="min-h-screen bg-gradient-to-br from-red-900/20 via-black to-orange-900/20 flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="w-20 h-20 border-4 border-transparent border-t-red-400 border-r-orange-600 rounded-full animate-spin"></div>
            <div className="absolute top-2 left-2 w-16 h-16 border-4 border-transparent border-b-red-300 border-l-white/50 rounded-full animate-spin animate-reverse"></div>
            <div className="absolute top-6 left-6 w-8 h-8 bg-gradient-to-r from-red-400 to-orange-600 rounded-full animate-pulse"></div>
          </div>
          <p className="text-xl text-white font-medium animate-pulse mt-4">Loading Madhouse Excellence...</p>
          <p className="text-sm text-white/60">Gathering masterpieces</p>
        </div>
      </div>
    );
  }

  if (error && !hasInitialData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-900/20 via-black to-orange-900/20 flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">😔</div>
          <h2 className="text-2xl font-heading text-white mb-4">Oops!</h2>
          <p className="text-white/80 mb-6">{error}</p>
          <div className="space-x-4">
            <StyledButton onClick={() => fetchMadhouseData(true)} variant="primary">
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
    <div className="min-h-screen bg-gradient-to-br from-red-900/20 via-black to-orange-900/20">
      {/* Floating particles effect */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute w-2 h-2 bg-red-400/20 rounded-full animate-ping"
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
              <span className="bg-gradient-to-r from-red-400 via-orange-500 to-red-600 bg-clip-text text-transparent">
                🏠 Madhouse
              </span>
            </h1>
            <div className="h-1 w-full bg-gradient-to-r from-transparent via-red-400 to-transparent animate-pulse"></div>
          </motion.div>
          
          <p className="text-lg text-white/80 max-w-2xl mx-auto leading-relaxed mt-6">
            Experience the legendary animation quality and storytelling excellence of Madhouse
          </p>
          
          <div className="mt-4 flex flex-col items-center gap-2">
            <div className="text-sm text-red-400">
              {allMadhouseAnime.length} legendary works found
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
          
          {/* Legendary Works */}
          {categories.legendary.length > 0 && (
            <section>
              <div className="mb-8">
                <h2 className="text-2xl sm:text-3xl font-heading text-white mb-2 flex items-center gap-3">
                  👑 Legendary Works
                </h2>
                <div className="h-0.5 w-24 bg-gradient-to-r from-red-400 to-transparent"></div>
              </div>
              
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-red-400/10 via-transparent to-orange-600/10 rounded-3xl blur-xl"></div>
                <div className="relative bg-black/20 backdrop-blur-sm border border-white/10 rounded-3xl p-6">
                  <Carousel variant="default">
                    {categories.legendary.map((anime, index) => (
                      <motion.div
                        key={`legendary-${index}`}
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
                          <div className="absolute inset-0 bg-gradient-to-t from-red-900/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl pointer-events-none"></div>
                        </div>
                      </motion.div>
                    ))}
                  </Carousel>
                </div>
              </div>
            </section>
          )}

          {/* Action & Adventure */}
          {categories.action.length > 0 && (
            <section>
              <div className="mb-8">
                <h2 className="text-2xl sm:text-3xl font-heading text-white mb-2 flex items-center gap-3">
                  ⚔️ Action & Adventure
                </h2>
                <div className="h-0.5 w-24 bg-gradient-to-r from-orange-400 to-transparent"></div>
              </div>
              
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-orange-400/10 via-transparent to-red-600/10 rounded-3xl blur-xl"></div>
                <div className="relative bg-black/20 backdrop-blur-sm border border-white/10 rounded-3xl p-6">
                  <Carousel variant="default">
                    {categories.action.map((anime, index) => (
                      <motion.div
                        key={`action-${index}`}
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
                          <div className="absolute inset-0 bg-gradient-to-t from-orange-900/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl pointer-events-none"></div>
                        </div>
                      </motion.div>
                    ))}
                  </Carousel>
                </div>
              </div>
            </section>
          )}

          {/* Psychological Thrillers */}
          {categories.psychological.length > 0 && (
            <section>
              <div className="mb-8">
                <h2 className="text-2xl sm:text-3xl font-heading text-white mb-2 flex items-center gap-3">
                  🧠 Psychological Thrillers
                </h2>
                <div className="h-0.5 w-24 bg-gradient-to-r from-purple-400 to-transparent"></div>
              </div>
              
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-purple-400/10 via-transparent to-red-600/10 rounded-3xl blur-xl"></div>
                <div className="relative bg-black/20 backdrop-blur-sm border border-white/10 rounded-3xl p-6">
                  <Carousel variant="default">
                    {categories.psychological.map((anime, index) => (
                      <motion.div
                        key={`psychological-${index}`}
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
                          <div className="absolute inset-0 bg-gradient-to-t from-purple-900/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl pointer-events-none"></div>
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
                <div className="h-0.5 w-24 bg-gradient-to-r from-blue-400 to-transparent"></div>
              </div>
              
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-400/10 via-transparent to-red-600/10 rounded-3xl blur-xl"></div>
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
                          <div className="absolute inset-0 bg-gradient-to-t from-blue-900/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl pointer-events-none"></div>
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
            Experience the unmatched quality and innovation of Madhouse productions
          </p>
        </div>
      </div>
    </div>
  );
};

export default MadhousePage; 