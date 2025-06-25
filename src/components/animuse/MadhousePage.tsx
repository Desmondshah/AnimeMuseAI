import React, { useState, useEffect, useCallback, useRef } from "react";
import { useAction, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { AnimeRecommendation } from "../../../convex/types";
import { motion, AnimatePresence } from "framer-motion";
import StyledButton from "./shared/StyledButton";
import AnimeCard from "./AnimeCard";
import { Id } from "../../../convex/_generated/dataModel";
import { Swiper, SwiperSlide } from 'swiper/react';
import { FreeMode } from 'swiper/modules';

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

// Brutalist Carousel Component for Madhouse
const BrutalistMadhouseCarousel: React.FC<{
  children: React.ReactNode[];
  title: string;
  color: string;
  accent?: string;
}> = ({ children, title, color, accent = '#000' }) => {
  return (
    <div className="relative mb-16">
      {/* Industrial Header Frame */}
      <div className="relative mb-6">
        <div className="bg-black p-1">
          <div className="bg-white p-1">
            <div 
              className="p-2"
              style={{ backgroundColor: color }}
            >
              <div className="bg-black p-4">
                <h2 className="text-2xl md:text-3xl font-black text-white uppercase tracking-widest text-center">
                  {title}
                </h2>
                <div className="mt-2 h-1 bg-white mx-auto w-1/2" />
              </div>
            </div>
          </div>
        </div>
        
        {/* Corner reinforcements */}
        <div className="absolute top-0 left-0 w-4 h-4 bg-yellow-400 border-2 border-black" />
        <div className="absolute top-0 right-0 w-4 h-4 bg-yellow-400 border-2 border-black" />
        <div className="absolute bottom-0 left-0 w-4 h-4 bg-yellow-400 border-2 border-black" />
        <div className="absolute bottom-0 right-0 w-4 h-4 bg-yellow-400 border-2 border-black" />
      </div>

      {/* Triple-framed carousel structure */}
      <div className="relative overflow-hidden">
        {/* Industrial Frame System */}
        <div className="absolute inset-0 border-12 border-white z-10 pointer-events-none" />
        <div 
          className="absolute inset-6 border-6 z-10 pointer-events-none"
          style={{ borderColor: color }}
        />
        <div 
          className="absolute inset-10 border-4 z-10 pointer-events-none opacity-60"
          style={{ borderColor: accent }}
        />

        {/* Warning stripes */}
        <div className="absolute top-0 left-0 w-full h-8 bg-gradient-to-r from-transparent via-yellow-400 to-transparent opacity-20 z-10 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-full h-8 bg-gradient-to-r from-transparent via-red-400 to-transparent opacity-20 z-10 pointer-events-none" />

        {/* Factory grid background */}
        <div 
          className="absolute inset-0 opacity-10" 
          style={{
            backgroundImage: `
              linear-gradient(to right, #000 1px, transparent 1px),
              linear-gradient(to bottom, #000 1px, transparent 1px)
            `,
            backgroundSize: '20px 20px'
          }}
        />

        {/* Swiper Carousel */}
        <div className="p-12 bg-gray-200">
          <Swiper
            modules={[FreeMode]}
            freeMode={{
              enabled: true,
              sticky: false,
              momentumRatio: 0.25,
              momentumVelocityRatio: 0.25,
            }}
            grabCursor={true}
            slidesPerView="auto"
            spaceBetween={24}
            resistance={true}
            resistanceRatio={0.85}
            className="w-full"
            style={{
              overflow: 'visible',
              padding: '10px 0 20px 0',
              willChange: 'transform',
            }}
          >
            {children.map((child, index) => (
              <SwiperSlide
                key={`${title}-${index}`}
                className="w-[220px] sm:w-[240px] flex-shrink-0"
                style={{ height: 'auto' }}
              >
                {/* Industrial card frame with corner reinforcements */}
                <div className="relative">
                  {/* Main industrial frame with alternating tilts */}
                  <div 
                    className="bg-black p-2 transition-all duration-300 hover:scale-110"
                    style={{ 
                      transform: `rotate(${(index % 4 - 1.5) * 2}deg)` 
                    }}
                  >
                    <div 
                      className="p-2"
                      style={{ backgroundColor: color }}
                    >
                      <div className="bg-white p-1">
                        <div className="bg-gray-800 p-1">
                          <div className="bg-white">
                            {child}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Corner reinforcements with tilts */}
                  <div 
                    className="absolute -top-2 -left-2 w-6 h-6 bg-yellow-400 border-2 border-black z-20"
                    style={{ 
                      transform: `rotate(${15 + (index % 3) * 15}deg)` 
                    }}
                  />
                  <div 
                    className="absolute -top-2 -right-2 w-6 h-6 bg-yellow-400 border-2 border-black z-20"
                    style={{ 
                      transform: `rotate(${-15 - (index % 3) * 15}deg)` 
                    }}
                  />
                  <div 
                    className="absolute -bottom-2 -left-2 w-6 h-6 bg-yellow-400 border-2 border-black z-20"
                    style={{ 
                      transform: `rotate(${45 + (index % 2) * 45}deg)` 
                    }}
                  />
                  <div 
                    className="absolute -bottom-2 -right-2 w-6 h-6 bg-yellow-400 border-2 border-black z-20"
                    style={{ 
                      transform: `rotate(${-45 - (index % 2) * 45}deg)` 
                    }}
                  />
                  
                  {/* Multi-layered shadow system with tilts */}
                  <div 
                    className="absolute inset-0 -z-10"
                    style={{ 
                      backgroundColor: accent,
                      transform: `rotate(${(index % 4 - 1.5) * 2}deg) translate(8px, 8px)`
                    }}
                  />
                  <div 
                    className="absolute inset-0 -z-20 opacity-60"
                    style={{ 
                      backgroundColor: color,
                      transform: `rotate(${(index % 4 - 1.5) * 2}deg) translate(16px, 16px)`
                    }}
                  />
                </div>
              </SwiperSlide>
            ))}
          </Swiper>
        </div>
      </div>
    </div>
  );
};

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
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="w-32 h-32 border-8 border-white">
              <div className="w-full h-full bg-gradient-to-r from-red-600 to-orange-600 animate-pulse" />
            </div>
            <div className="absolute -top-4 -left-4 w-8 h-8 bg-red-600 transform rotate-45" />
            <div className="absolute -top-4 -right-4 w-8 h-8 bg-orange-600 transform rotate-45" />
            <div className="absolute -bottom-4 -left-4 w-8 h-8 bg-orange-600 transform rotate-45" />
            <div className="absolute -bottom-4 -right-4 w-8 h-8 bg-red-600 transform rotate-45" />
          </div>
          <p className="text-2xl text-white font-black uppercase tracking-wider mt-8">LOADING MADHOUSE</p>
          <p className="text-sm text-red-400 uppercase font-bold">EXCELLENCE IN PROGRESS</p>
        </div>
      </div>
    );
  }

  if (error && !hasInitialData) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="relative mb-8">
            <div className="w-24 h-24 bg-red-600 border-8 border-white transform rotate-45 mx-auto" />
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-white font-black text-2xl">!</div>
          </div>
          <h2 className="text-3xl font-black text-white uppercase tracking-wider mb-4">ERROR</h2>
          <p className="text-white/80 mb-8 font-bold uppercase">{error}</p>
          <div className="space-x-6">
            <StyledButton 
              onClick={() => fetchMadhouseData(true)} 
              className="bg-red-600 border-4 border-white text-white hover:bg-white hover:text-red-600 font-black uppercase tracking-wider"
            >
              RETRY
            </StyledButton>
            <StyledButton 
              onClick={onBack} 
              className="bg-black border-4 border-white text-white hover:bg-white hover:text-black font-black uppercase tracking-wider"
            >
              BACK
            </StyledButton>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      {/* Industrial Background Pattern */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-black to-red-900" />
        
        {/* Factory grid pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="grid grid-cols-20 grid-rows-20 h-full w-full">
            {Array.from({ length: 400 }).map((_, i) => (
              <div 
                key={i} 
                className={`border-l border-t border-red-600 ${
                  i % 17 === 0 ? 'bg-red-600' : 
                  i % 23 === 0 ? 'bg-orange-600' : 
                  i % 31 === 0 ? 'bg-white' : ''
                }`}
                style={{ opacity: Math.random() * 0.3 + 0.1 }}
              />
            ))}
          </div>
        </div>
        
        {/* Industrial shapes */}
        <div className="absolute top-20 left-20 w-40 h-40 bg-red-600 transform rotate-45 opacity-15" />
        <div className="absolute top-60 right-32 w-32 h-32 bg-orange-600 transform -rotate-12 opacity-20" />
        <div className="absolute bottom-32 left-1/3 w-48 h-48 bg-white transform rotate-12 opacity-10" />
        <div className="absolute bottom-60 right-20 w-36 h-36 bg-red-600 transform -rotate-45 opacity-15" />
        
        {/* Warning stripes */}
        <div className="absolute top-0 left-0 w-full h-4 bg-gradient-to-r from-yellow-400 via-red-600 to-yellow-400 opacity-20" />
        <div className="absolute bottom-0 left-0 w-full h-4 bg-gradient-to-r from-red-600 via-orange-600 to-red-600 opacity-20" />
      </div>

      <div className="relative z-10 px-4 py-8">
        {/* Industrial Header */}
        <div className="mb-20">
          <div className="absolute left-4 top-4 z-50">
            <StyledButton 
              onClick={onBack}
              className="bg-black border-6 border-white text-white hover:bg-white hover:text-black transition-colors font-black uppercase tracking-wider transform hover:scale-110"
            >
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-red-600 transform rotate-45" />
                <span>BACK</span>
              </div>
            </StyledButton>
          </div>
          
          <motion.div
            initial={{ opacity: 0, y: -100 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.0, ease: "easeOut" }}
            className="text-center"
          >
            {/* Industrial Title */}
            <div className="relative inline-block mb-12">
              {/* Industrial frame layers */}
              <div className="absolute -inset-8 bg-red-600 transform rotate-3 translate-x-6 translate-y-6" />
              <div className="absolute -inset-6 bg-orange-600 transform -rotate-2 translate-x-4 translate-y-4 opacity-80" />
              <div className="absolute -inset-4 bg-white transform rotate-1 translate-x-2 translate-y-2 opacity-60" />
              
              <div className="relative bg-black border-12 border-white p-12 transform -rotate-1">
                {/* Corner reinforcements */}
                <div className="absolute -top-4 -left-4 w-8 h-8 bg-red-600 border-4 border-white transform rotate-45" />
                <div className="absolute -top-4 -right-4 w-8 h-8 bg-orange-600 border-4 border-white transform rotate-45" />
                <div className="absolute -bottom-4 -left-4 w-8 h-8 bg-orange-600 border-4 border-white transform rotate-45" />
                <div className="absolute -bottom-4 -right-4 w-8 h-8 bg-red-600 border-4 border-white transform rotate-45" />
                
                <h1 className="text-7xl md:text-9xl font-black text-white uppercase tracking-widest leading-none">
                  MAD
                </h1>
                <h1 className="text-7xl md:text-9xl font-black text-red-400 uppercase tracking-widest leading-none">
                  HOUSE
                </h1>
              </div>
            </div>
            
            {/* Industrial Subtitle */}
            <div className="relative inline-block mb-8">
              <div className="absolute inset-0 bg-white transform skew-x-12" />
              <div className="absolute inset-0 bg-red-600 transform -skew-x-6 translate-x-2" />
              <div className="relative bg-black border-6 border-white p-6 transform skew-x-3">
                <p className="text-2xl text-white font-black uppercase tracking-widest">
                  LEGENDARY ANIMATION
                </p>
              </div>
            </div>

            {/* Industrial Stats */}
            <div className="mt-12 flex justify-center space-x-12">
              <div className="text-center relative">
                <div className="absolute inset-0 bg-red-600 transform rotate-45 opacity-20" />
                <div className="relative bg-black border-4 border-white p-4">
                  <div className="text-4xl font-black text-red-400">{allMadhouseAnime.length}</div>
                  <div className="text-sm text-white uppercase font-bold">WORKS</div>
                </div>
              </div>
              <div className="text-center relative">
                <div className="absolute inset-0 bg-orange-600 transform rotate-45 opacity-20" />
                <div className="relative bg-black border-4 border-white p-4">
                  <div className="text-4xl font-black text-orange-400">50+</div>
                  <div className="text-sm text-white uppercase font-bold">YEARS</div>
                </div>
              </div>
              <div className="text-center relative">
                <div className="absolute inset-0 bg-white transform rotate-45 opacity-20" />
                <div className="relative bg-black border-4 border-white p-4">
                  <div className="text-4xl font-black text-white">∞</div>
                  <div className="text-sm text-white uppercase font-bold">QUALITY</div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Content Sections */}
        <div className="max-w-7xl mx-auto">
          {/* Legendary Works */}
          {categories.legendary.length > 0 && (
            <BrutalistMadhouseCarousel 
              title="LEGENDARY WORKS"
              color="#dc2626"
              accent="#ea580c"
            >
              {categories.legendary.map((anime, index) => (
                <motion.div
                  key={`legendary-${index}`}
                  initial={{ opacity: 0, scale: 0.7 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.1 }}
                  className="cursor-pointer"
                >
                  <AnimeCard 
                    anime={anime} 
                    isRecommendation={true} 
                    onViewDetails={onViewAnimeDetail}
                    className="w-full h-full"
                  />
                </motion.div>
              ))}
            </BrutalistMadhouseCarousel>
          )}

          {/* Action & Adventure */}
          {categories.action.length > 0 && (
            <BrutalistMadhouseCarousel 
              title="ACTION & POWER"
              color="#ea580c"
              accent="#dc2626"
            >
              {categories.action.map((anime, index) => (
                <motion.div
                  key={`action-${index}`}
                  initial={{ opacity: 0, scale: 0.7 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.1 }}
                  className="cursor-pointer"
                >
                  <AnimeCard 
                    anime={anime} 
                    isRecommendation={true} 
                    onViewDetails={onViewAnimeDetail}
                    className="w-full h-full"
                  />
                </motion.div>
              ))}
            </BrutalistMadhouseCarousel>
          )}

          {/* Psychological Thrillers */}
          {categories.psychological.length > 0 && (
            <BrutalistMadhouseCarousel 
              title="MIND GAMES"
              color="#7c2d12"
              accent="#dc2626"
            >
              {categories.psychological.map((anime, index) => (
                <motion.div
                  key={`psychological-${index}`}
                  initial={{ opacity: 0, scale: 0.7 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.1 }}
                  className="cursor-pointer"
                >
                  <AnimeCard 
                    anime={anime} 
                    isRecommendation={true} 
                    onViewDetails={onViewAnimeDetail}
                    className="w-full h-full"
                  />
                </motion.div>
              ))}
            </BrutalistMadhouseCarousel>
          )}

          {/* Recent Works */}
          {categories.recent.length > 0 && (
            <BrutalistMadhouseCarousel 
              title="MODERN ERA"
              color="#f97316"
              accent="#dc2626"
            >
              {categories.recent.map((anime, index) => (
                <motion.div
                  key={`recent-${index}`}
                  initial={{ opacity: 0, scale: 0.7 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.1 }}
                  className="cursor-pointer"
                >
                  <AnimeCard 
                    anime={anime} 
                    isRecommendation={true} 
                    onViewDetails={onViewAnimeDetail}
                    className="w-full h-full"
                  />
                </motion.div>
              ))}
            </BrutalistMadhouseCarousel>
          )}
        </div>

        {/* Industrial Footer */}
        <div className="mt-24 text-center">
          <div className="relative inline-block">
            <div className="absolute inset-0 bg-red-600 transform rotate-2" />
            <div className="absolute inset-0 bg-white transform -rotate-1 translate-x-2" />
            <div className="relative bg-black border-6 border-white p-8 transform rotate-1">
              <p className="text-white font-black uppercase tracking-widest">
                UNCOMPROMISING EXCELLENCE
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MadhousePage;