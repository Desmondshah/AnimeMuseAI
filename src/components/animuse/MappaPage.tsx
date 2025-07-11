import React, { useState, useEffect, useCallback, useRef } from "react";
import { useAction, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { AnimeRecommendation } from "../../../convex/types";
import { motion } from "framer-motion";
import AnimeCard from './AnimeCard';
import { Swiper, SwiperSlide } from 'swiper/react';
import { FreeMode } from 'swiper/modules';
import StyledButton from "./shared/StyledButton";
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

// Brutalist MAPPA Carousel Component
const BrutalistMappaCarousel: React.FC<{
  children: React.ReactNode[];
  title: string;
  color: string;
  accent?: string;
  icon?: string;
}> = ({ children, title, color, accent = '#000', icon = '⚡' }) => {
  return (
    <div className="relative mb-20">
      {/* Tech-Brutalist Header */}
      <div className="relative mb-8">
        {/* Glitch effect background */}
        <div className="absolute inset-0 opacity-20">
          <div className="grid grid-cols-16 grid-rows-4 h-full w-full gap-px">
            {Array.from({ length: 64 }).map((_, i) => (
              <div 
                key={i} 
                className="border border-cyan-400" 
                style={{ 
                  backgroundColor: i % 5 === 0 ? color : 'transparent',
                  opacity: Math.random() * 0.8 + 0.2,
                  transform: `scale(${0.8 + Math.random() * 0.4})`
                }} 
              />
            ))}
          </div>
        </div>

        {/* Main header structure */}
        <div className="relative">
          <div 
            className="absolute inset-0 transform skew-x-12 translate-x-6 translate-y-1"
            style={{ backgroundColor: color }}
          />
          <div 
            className="absolute inset-0 transform -skew-x-6 -translate-x-3 translate-y-3 opacity-70"
            style={{ backgroundColor: accent }}
          />
          <div className="relative bg-black p-6 border-4 border-white transform -skew-x-3 -translate-x-1">
            <h2 className="text-3xl md:text-4xl font-black text-white uppercase tracking-widest transform skew-x-3">
              {icon} {title}
            </h2>
            <div className="flex mt-3 space-x-1">
              <div className="h-1 w-16 bg-white" />
              <div className="h-1 w-8" style={{ backgroundColor: color }} />
              <div className="h-1 w-4" style={{ backgroundColor: accent }} />
            </div>
          </div>
        </div>

        {/* Electric corner accents */}
        <div 
          className="absolute -top-2 -left-2 w-8 h-8 border-4 border-white transform rotate-45"
          style={{ backgroundColor: color }}
        />
        <div 
          className="absolute -top-2 -right-2 w-8 h-8 border-4 border-white transform -rotate-45"
          style={{ backgroundColor: accent }}
        />
      </div>

      {/* Tech-Brutalist Frame Container */}
      <div className="relative overflow-hidden">
        {/* Multi-layered frame system */}
        <div className="absolute inset-0 border-8 border-white z-10 pointer-events-none" />
        <div 
          className="absolute inset-4 border-4 z-10 pointer-events-none"
          style={{ borderColor: color }}
        />
        <div 
          className="absolute inset-6 border-2 z-10 pointer-events-none opacity-60"
          style={{ borderColor: accent }}
        />

        {/* Electric circuit pattern */}
        <div 
          className="absolute inset-0 opacity-15" 
          style={{
            backgroundImage: `
              linear-gradient(90deg, ${color} 2px, transparent 2px),
              linear-gradient(0deg, ${color} 2px, transparent 2px),
              linear-gradient(45deg, ${accent} 1px, transparent 1px),
              linear-gradient(-45deg, ${accent} 1px, transparent 1px)
            `,
            backgroundSize: '30px 30px, 30px 30px, 15px 15px, 15px 15px'
          }}
        />

        {/* Glitch stripes */}
        <div className="absolute top-0 left-0 w-full h-4 bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-30 z-10 pointer-events-none animate-pulse" />
        <div className="absolute bottom-0 left-0 w-full h-4 bg-gradient-to-r from-transparent via-purple-400 to-transparent opacity-30 z-10 pointer-events-none animate-pulse" />

        {/* Swiper Carousel */}
        <div className="p-8 bg-gray-900">
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
            spaceBetween={20}
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
                {/* Tech-brutalist card frame */}
                <div className="relative">
                  {/* Main frame with electric tilt */}
                  <div 
                    className="bg-black p-1 transition-all duration-300 hover:scale-105 hover:rotate-1"
                    style={{ 
                      transform: `rotate(${(index % 5 - 2) * 1.5}deg)` 
                    }}
                  >
                    <div 
                      className="p-1"
                      style={{ backgroundColor: color }}
                    >
                      <div className="bg-white p-1">
                        <div className="bg-gray-900 p-1">
                          <div className="bg-white">
                            {child}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Electric corner nodes */}
                  <div 
                    className="absolute -top-1 -left-1 w-4 h-4 border-2 border-white z-20"
                    style={{ 
                      backgroundColor: color,
                      transform: `rotate(${(index % 4) * 90}deg)`
                    }}
                  />
                  <div 
                    className="absolute -top-1 -right-1 w-4 h-4 border-2 border-white z-20"
                    style={{ 
                      backgroundColor: accent,
                      transform: `rotate(${(index % 4 + 1) * 90}deg)`
                    }}
                  />
                  <div 
                    className="absolute -bottom-1 -left-1 w-4 h-4 border-2 border-white z-20"
                    style={{ 
                      backgroundColor: accent,
                      transform: `rotate(${(index % 4 + 2) * 90}deg)`
                    }}
                  />
                  <div 
                    className="absolute -bottom-1 -right-1 w-4 h-4 border-2 border-white z-20"
                    style={{ 
                      backgroundColor: color,
                      transform: `rotate(${(index % 4 + 3) * 90}deg)`
                    }}
                  />
                  
                  {/* Layered electric shadows */}
                  <div 
                    className="absolute inset-0 -z-10"
                    style={{ 
                      backgroundColor: color,
                      transform: `rotate(${(index % 5 - 2) * 1.5}deg) translate(6px, 6px)`,
                      opacity: 0.8
                    }}
                  />
                  <div 
                    className="absolute inset-0 -z-20"
                    style={{ 
                      backgroundColor: accent,
                      transform: `rotate(${(index % 5 - 2) * 1.5}deg) translate(12px, 12px)`,
                      opacity: 0.5
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

  // Only show database data - no fallback content to prevent flickering
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
      // No cache - fetch data and show loading state
      console.log('[MAPPA] No cache found, fetching from database...');
      setHasInitialData(false);
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
    <div className="min-h-screen bg-black relative overflow-hidden">
      {/* Electric grid background */}
      <div 
        className="fixed inset-0 opacity-5" 
        style={{
          backgroundImage: `
            linear-gradient(90deg, #00ffff 1px, transparent 1px),
            linear-gradient(0deg, #00ffff 1px, transparent 1px),
            linear-gradient(45deg, #ff00ff 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px, 50px 50px, 25px 25px'
        }}
      />

      {/* Glitch particles */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {[...Array(15)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-cyan-400 animate-ping"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 2}s`,
              animationDuration: `${1 + Math.random() * 2}s`,
              boxShadow: '0 0 6px currentColor'
            }}
          />
        ))}
      </div>

      <div className="relative z-10 px-4 py-8">
        {/* Brutalist Header */}
        <div className="text-center mb-16">
          <div className="absolute left-4 top-4 z-50">
            <StyledButton 
              onClick={onBack}
              className="bg-black border-4 border-white text-white hover:bg-white hover:text-black transition-colors font-black uppercase tracking-wider"
            >
              ← BACK
            </StyledButton>
          </div>
          
          {/* Massive MAPPA title */}
          <div className="relative mb-8">
            {/* Background geometric shapes */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-96 h-32 bg-cyan-400 opacity-20 transform rotate-12" />
              <div className="absolute w-80 h-28 bg-purple-400 opacity-20 transform -rotate-6" />
              <div className="absolute w-72 h-24 bg-white opacity-10 transform rotate-3" />
            </div>
            
            {/* Main title */}
            <div className="relative">
              <div className="absolute inset-0 transform translate-x-2 translate-y-2">
                <h1 className="text-6xl md:text-8xl font-black text-cyan-400 uppercase tracking-widest opacity-60">
                  MAPPA
                </h1>
              </div>
              <div className="absolute inset-0 transform -translate-x-1 -translate-y-1">
                <h1 className="text-6xl md:text-8xl font-black text-purple-400 uppercase tracking-widest opacity-60">
                  MAPPA
                </h1>
              </div>
              <h1 className="relative text-6xl md:text-8xl font-black text-white uppercase tracking-widest">
                MAPPA
              </h1>
            </div>
          </div>
          
          <div className="max-w-3xl mx-auto">
            <div className="bg-black border-4 border-white p-6 transform -skew-x-2">
              <p className="text-lg text-white font-bold uppercase tracking-wide transform skew-x-2">
                CUTTING-EDGE ANIMATION • MODERN MASTERPIECES • TECHNICAL EXCELLENCE
              </p>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto">
          {/* Show loading state if no initial data */}
          {!hasInitialData && isLoading && (
            <div className="flex flex-col items-center justify-center min-h-[400px] space-y-8">
              <div className="relative">
                <div className="w-32 h-32 border-8 border-white border-t-cyan-400 rounded-full animate-spin" />
                <div className="absolute inset-0 w-32 h-32 border-8 border-transparent border-r-pink-400 rounded-full animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }} />
              </div>
              <div className="text-center">
                <h3 className="text-2xl font-black text-white uppercase tracking-widest">
                  LOADING MAPPA MASTERWORKS
                </h3>
                <p className="text-cyan-400 font-bold uppercase tracking-wide mt-2">
                  Fetching from database...
                </p>
              </div>
            </div>
          )}

          {/* Show content when data is available */}
          {hasInitialData && (
            <>
              {/* Legendary Works */}
              {categories.legendary.length > 0 && (
                <BrutalistMappaCarousel 
                  title="LEGENDARY WORKS"
                  color="#00ffff"
                  accent="#ff00ff"
                  icon="🏆"
                >
                  {categories.legendary.map((anime, index) => (
                    <motion.div
                      key={`legendary-${index}`}
                  initial={{ opacity: 0, scale: 0.8 }}
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
            </BrutalistMappaCarousel>
          )}

          {/* Action & Supernatural */}
          {categories.action.length > 0 && (
            <BrutalistMappaCarousel 
              title="ACTION ARSENAL"
              color="#ff4444"
              accent="#ffaa00"
              icon="⚔️"
            >
              {categories.action.map((anime, index) => (
                <motion.div
                  key={`action-${index}`}
                  initial={{ opacity: 0, scale: 0.8 }}
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
            </BrutalistMappaCarousel>
          )}

          {/* Recent Productions */}
          {categories.recent.length > 0 && (
            <BrutalistMappaCarousel 
              title="RECENT TECH"
              color="#44ff44"
              accent="#00ffaa"
              icon="🆕"
            >
              {categories.recent.map((anime, index) => (
                <motion.div
                  key={`recent-${index}`}
                  initial={{ opacity: 0, scale: 0.8 }}
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
            </BrutalistMappaCarousel>
          )}

          {/* Mature & Psychological */}
          {categories.mature.length > 0 && (
            <BrutalistMappaCarousel 
              title="MIND MATRIX"
              color="#aa44ff"
              accent="#ff44aa"
              icon="🧠"
            >
              {categories.mature.map((anime, index) => (
                <motion.div
                  key={`mature-${index}`}
                  initial={{ opacity: 0, scale: 0.8 }}
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
            </BrutalistMappaCarousel>
          )}
            </>
          )}
        </div>

        {/* Brutalist Footer */}
        <div className="text-center mt-20 mb-8">
          <div className="bg-white border-4 border-black p-4 transform skew-x-3 max-w-2xl mx-auto">
            <p className="text-black font-black uppercase tracking-wider transform -skew-x-3">
              MAPPA STUDIO - REDEFINING ANIME SINCE 2011
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MappaPage;