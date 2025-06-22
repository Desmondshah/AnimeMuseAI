import React, { useState, useEffect, useCallback, useRef } from "react";
import { useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { AnimeRecommendation } from "../../../convex/types";
import { motion } from "framer-motion";
import StyledButton from "./shared/StyledButton";
import Carousel from "./shared/Carousel";
import AnimeCard from "./AnimeCard";
import { Id } from "../../../convex/_generated/dataModel";

// Hardcoded fallback data for MAPPA - always available instantly
const FALLBACK_MAPPA_ANIME: AnimeRecommendation[] = [
  {
    _id: 'attack-on-titan-s4',
    title: 'Attack on Titan: The Final Season',
    description: 'The epic conclusion to the Attack on Titan saga.',
    posterUrl: 'https://cdn.myanimelist.net/images/anime/1000/110531.jpg',
    rating: 9.0,
    year: 2020,
    genres: ['Action', 'Drama', 'Fantasy'],
    reasoning: 'MAPPA masterpiece',
    moodMatchScore: 0.95
  },
  {
    _id: 'jujutsu-kaisen',
    title: 'Jujutsu Kaisen',
    description: 'A high school student joins a secret organization of Jujutsu Sorcerers.',
    posterUrl: 'https://cdn.myanimelist.net/images/anime/1171/109222.jpg',
    rating: 8.6,
    year: 2020,
    genres: ['Action', 'School', 'Supernatural'],
    reasoning: 'MAPPA masterpiece',
    moodMatchScore: 0.90
  },
  {
    _id: 'chainsaw-man',
    title: 'Chainsaw Man',
    description: 'A young man becomes a devil hunter to pay off his debt.',
    posterUrl: 'https://cdn.myanimelist.net/images/anime/1806/126216.jpg',
    rating: 8.8,
    year: 2022,
    genres: ['Action', 'Supernatural'],
    reasoning: 'MAPPA masterpiece',
    moodMatchScore: 0.90
  },
  {
    _id: 'hell-paradise',
    title: 'Hell\'s Paradise',
    description: 'A ninja seeks the elixir of immortality on a mysterious island.',
    posterUrl: 'https://cdn.myanimelist.net/images/anime/1630/134701.jpg',
    rating: 8.2,
    year: 2023,
    genres: ['Action', 'Historical', 'Supernatural'],
    reasoning: 'MAPPA masterpiece',
    moodMatchScore: 0.85
  },
  {
    _id: 'vinland-saga',
    title: 'Vinland Saga',
    description: 'A young Viking warrior seeks revenge in medieval Europe.',
    posterUrl: 'https://cdn.myanimelist.net/images/anime/1775/103929.jpg',
    rating: 9.0,
    year: 2019,
    genres: ['Action', 'Adventure', 'Drama', 'Historical'],
    reasoning: 'MAPPA masterpiece',
    moodMatchScore: 0.95
  },
  {
    _id: 'dororo',
    title: 'Dororo',
    description: 'A young man reclaims his body parts from demons.',
    posterUrl: 'https://cdn.myanimelist.net/images/anime/1180/95018.jpg',
    rating: 8.2,
    year: 2019,
    genres: ['Action', 'Adventure', 'Drama', 'Historical'],
    reasoning: 'MAPPA masterpiece',
    moodMatchScore: 0.85
  },
  {
    _id: 'zombie-land-saga',
    title: 'Zombie Land Saga',
    description: 'Zombie girls form an idol group to save Saga Prefecture.',
    posterUrl: 'https://cdn.myanimelist.net/images/anime/1198/93893.jpg',
    rating: 7.5,
    year: 2018,
    genres: ['Comedy', 'Music', 'Supernatural'],
    reasoning: 'MAPPA masterpiece',
    moodMatchScore: 0.75
  },
  {
    _id: 'yuri-on-ice',
    title: 'Yuri!!! on Ice',
    description: 'A figure skater aims for the Grand Prix with his idol as coach.',
    posterUrl: 'https://cdn.myanimelist.net/images/anime/8/81102.jpg',
    rating: 8.0,
    year: 2016,
    genres: ['Drama', 'Sports'],
    reasoning: 'MAPPA masterpiece',
    moodMatchScore: 0.80
  }
];

interface MappaPageProps {
  onViewAnimeDetail: (animeId: Id<"anime">) => void;
  onBack: () => void;
}

// Cache configuration
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
const CACHE_KEY = 'mappa_anime_cache';

interface CachedMappaData {
  anime: AnimeRecommendation[];
  timestamp: number;
  version: string;
}

const MappaPage: React.FC<MappaPageProps> = ({ onViewAnimeDetail, onBack }) => {
  const [allMappaAnime, setAllMappaAnime] = useState<AnimeRecommendation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFetched, setLastFetched] = useState<number | null>(null);
  const [hasInitialData, setHasInitialData] = useState(false);

  const fetchMappaAnime = useAction(api.externalApis.fetchMappaAnime);
  const fetchInProgressRef = useRef<boolean>(false);

  // Cache management functions
  const getCachedData = useCallback((): CachedMappaData | null => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (!cached) return null;
      
      const data: CachedMappaData = JSON.parse(cached);
      const now = Date.now();
      
      // Check if cache is still valid
      if (now - data.timestamp > CACHE_DURATION) {
        localStorage.removeItem(CACHE_KEY);
        return null;
      }
      
      return data;
    } catch (error) {
      console.warn('[MAPPA] Cache read error:', error);
      localStorage.removeItem(CACHE_KEY);
      return null;
    }
  }, []);

  const setCachedData = useCallback((anime: AnimeRecommendation[]) => {
    try {
      const cacheData: CachedMappaData = {
        anime,
        timestamp: Date.now(),
        version: '1.0.0'
      };
      localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
      setLastFetched(Date.now());
    } catch (error) {
      console.warn('[MAPPA] Cache write error:', error);
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
    recent: AnimeRecommendation[];
    mature: AnimeRecommendation[];
  }>({
    legendary: [],
    action: [],
    recent: [],
    mature: []
  });

  const organizeAnimeIntoCategories = useCallback((anime: AnimeRecommendation[]) => {
    const legendary = anime.filter((a: AnimeRecommendation) => 
      a.rating && a.rating >= 8.5 || a.title.includes('Attack on Titan') || a.title.includes('Vinland')
    );
    const action = anime.filter((a: AnimeRecommendation) => 
      a.genres?.includes('Action') || a.genres?.includes('Supernatural')
    );
    const recent = anime.filter((a: AnimeRecommendation) => a.year && a.year >= 2020);
    const mature = anime.filter((a: AnimeRecommendation) => 
      a.genres?.includes('Drama') || a.title.includes('Chainsaw') || a.title.includes('Hell')
    );

    setCategories({
      legendary: legendary.slice(0, 8),
      action: action.slice(0, 10),
      recent: recent.slice(0, 8),
      mature: mature.slice(0, 8)
    });
  }, []);

  const fetchMappaData = useCallback(async (forceRefresh: boolean = false) => {
    // Prevent concurrent fetches
    if (fetchInProgressRef.current) {
      console.log('[MAPPA] Fetch already in progress, skipping...');
      return;
    }

    // Check cache first (unless forcing refresh)
    if (!forceRefresh) {
      const cachedData = getCachedData();
      if (cachedData && cachedData.anime.length > 0) {
        console.log('[MAPPA] Loading from cache...');
        setAllMappaAnime(cachedData.anime);
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
      
      console.log('[MAPPA] Fetching from API...');
      const result = await fetchMappaAnime({ limit: 100 });
      
      if (result.error) {
        setError(result.error);
        return;
      }

      const anime = result.animes || [];
      
      if (anime.length === 0) {
        setError('No MAPPA anime found');
        return;
      }

      // Update state and cache
      setAllMappaAnime(anime);
      setCachedData(anime);
      organizeAnimeIntoCategories(anime);
      setError(null);
      setHasInitialData(true);
      
      console.log(`[MAPPA] Successfully fetched ${anime.length} anime`);

    } catch (err: any) {
      console.error('[MAPPA] Fetch error:', err);
      setError(err.message || 'Failed to load MAPPA anime');
      
      // Try to fall back to cache if available
      const cachedData = getCachedData();
      if (cachedData && cachedData.anime.length > 0) {
        console.log('[MAPPA] Falling back to cached data...');
        setAllMappaAnime(cachedData.anime);
        setLastFetched(cachedData.timestamp);
        organizeAnimeIntoCategories(cachedData.anime);
        setError('Using cached data - refresh failed');
        setHasInitialData(true);
      }
    } finally {
      setIsLoading(false);
      fetchInProgressRef.current = false;
    }
  }, [fetchMappaAnime, getCachedData, setCachedData, organizeAnimeIntoCategories, hasInitialData]);

  // Always show content immediately - no loading states
  useEffect(() => {
    // Check cache first
    const cachedData = getCachedData();
    if (cachedData && cachedData.anime.length > 0) {
      console.log('[MAPPA] Loading from cache instantly...');
      setAllMappaAnime(cachedData.anime);
      setLastFetched(cachedData.timestamp);
      organizeAnimeIntoCategories(cachedData.anime);
      setError(null);
      setHasInitialData(true);
    } else {
      // No cache - show fallback data immediately, then fetch in background
      console.log('[MAPPA] No cache found, showing fallback data...');
      setAllMappaAnime(FALLBACK_MAPPA_ANIME);
      organizeAnimeIntoCategories(FALLBACK_MAPPA_ANIME);
      setError(null);
      setHasInitialData(true);
      
      // Fetch real data in background without showing loading
      fetchMappaData(false);
    }
  }, [getCachedData, organizeAnimeIntoCategories, fetchMappaData]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      fetchInProgressRef.current = false;
    };
  }, []);

  const handleRefresh = useCallback(() => {
    fetchMappaData(true);
  }, [fetchMappaData]);

  const formatCacheAge = useCallback((timestamp: number): string => {
    const age = Date.now() - timestamp;
    const minutes = Math.floor(age / (1000 * 60));
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) return `${hours}h ${minutes % 60}m ago`;
    return `${minutes}m ago`;
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-900/20 via-black to-purple-900/20">
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
              <span className="bg-gradient-to-r from-red-400 via-purple-500 to-red-600 bg-clip-text text-transparent">
                ⚡ MAPPA
              </span>
            </h1>
            <div className="h-1 w-full bg-gradient-to-r from-transparent via-red-400 to-transparent animate-pulse"></div>
          </motion.div>
          
          <p className="text-lg text-white/80 max-w-2xl mx-auto leading-relaxed mt-6">
            Experience the cutting-edge animation and storytelling that defines modern anime excellence
          </p>
          
          <div className="mt-4 flex flex-col items-center gap-2">
            <div className="text-sm text-red-400">
              {allMappaAnime.length} modern masterpieces found
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
                  🏆 Legendary MAPPA Works
                </h2>
                <div className="h-0.5 w-24 bg-gradient-to-r from-red-400 to-transparent"></div>
              </div>
              
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-red-400/10 via-transparent to-purple-600/10 rounded-3xl blur-xl"></div>
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

          {/* Action & Supernatural */}
          {categories.action.length > 0 && (
            <section>
              <div className="mb-8">
                <h2 className="text-2xl sm:text-3xl font-heading text-white mb-2 flex items-center gap-3">
                  ⚔️ Action & Supernatural
                </h2>
                <div className="h-0.5 w-24 bg-gradient-to-r from-purple-400 to-transparent"></div>
              </div>
              
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-purple-400/10 via-transparent to-red-600/10 rounded-3xl blur-xl"></div>
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
                          <div className="absolute inset-0 bg-gradient-to-t from-purple-900/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl pointer-events-none"></div>
                        </div>
                      </motion.div>
                    ))}
                  </Carousel>
                </div>
              </div>
            </section>
          )}

          {/* Recent Productions */}
          {categories.recent.length > 0 && (
            <section>
              <div className="mb-8">
                <h2 className="text-2xl sm:text-3xl font-heading text-white mb-2 flex items-center gap-3">
                  🆕 Recent MAPPA Productions
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

          {/* Mature & Psychological */}
          {categories.mature.length > 0 && (
            <section>
              <div className="mb-8">
                <h2 className="text-2xl sm:text-3xl font-heading text-white mb-2 flex items-center gap-3">
                  🧠 Mature & Psychological
                </h2>
                <div className="h-0.5 w-24 bg-gradient-to-r from-orange-400 to-transparent"></div>
              </div>
              
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-orange-400/10 via-transparent to-red-600/10 rounded-3xl blur-xl"></div>
                <div className="relative bg-black/20 backdrop-blur-sm border border-white/10 rounded-3xl p-6">
                  <Carousel variant="default">
                    {categories.mature.map((anime, index) => (
                      <motion.div
                        key={`mature-${index}`}
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

          {/* Fallback content if no anime loaded */}
          {!isLoading && allMappaAnime.length === 0 && !error && (
            <div className="text-center py-16">
              <div className="text-6xl mb-4">🎬</div>
              <h3 className="text-2xl font-bold text-white mb-4">No MAPPA anime loaded</h3>
              <p className="text-white/60 mb-6">This might be a temporary issue. Please try refreshing.</p>
              <StyledButton onClick={handleRefresh} variant="primary">
                Refresh Data
              </StyledButton>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center mt-20 mb-8">
          <p className="text-white/60 text-sm">
            MAPPA - Pushing the boundaries of animation since 2011
          </p>
          <p className="text-white/40 text-xs mt-1">
            From Attack on Titan's final seasons to Jujutsu Kaisen's stunning battles
          </p>
        </div>
      </div>
    </div>
  );
};

export default MappaPage;
