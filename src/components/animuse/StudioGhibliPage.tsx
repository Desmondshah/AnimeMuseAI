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

// Hardcoded fallback data for Studio Ghibli - always available instantly
const FALLBACK_GHIBLI_ANIME: AnimeRecommendation[] = [
  {
    _id: 'spirited-away',
    title: 'Spirited Away',
    description: 'A magical adventure of a young girl in a spirit world.',
    posterUrl: 'https://cdn.myanimelist.net/images/anime/6/79597.jpg',
    rating: 9.3,
    year: 2001,
    genres: ['Adventure', 'Drama', 'Family'],
    reasoning: 'Studio Ghibli masterpiece',
    moodMatchScore: 0.95
  },
  {
    _id: 'princess-mononoke',
    title: 'Princess Mononoke',
    description: 'A tale of war between humans and nature.',
    posterUrl: 'https://cdn.myanimelist.net/images/anime/7/75919.jpg',
    rating: 8.7,
    year: 1997,
    genres: ['Adventure', 'Drama'],
    reasoning: 'Studio Ghibli masterpiece',
    moodMatchScore: 0.90
  },
  {
    _id: 'howls-moving-castle',
    title: "Howl's Moving Castle",
    description: 'A young woman cursed with old age seeks to break the spell.',
    posterUrl: 'https://cdn.myanimelist.net/images/anime/5/75810.jpg',
    rating: 8.2,
    year: 2004,
    genres: ['Adventure', 'Drama', 'Romance'],
    reasoning: 'Studio Ghibli masterpiece',
    moodMatchScore: 0.85
  },
  {
    _id: 'my-neighbor-totoro',
    title: 'My Neighbor Totoro',
    description: 'Two sisters discover magical creatures in the countryside.',
    posterUrl: 'https://cdn.myanimelist.net/images/anime/4/75923.jpg',
    rating: 8.2,
    year: 1988,
    genres: ['Adventure', 'Family'],
    reasoning: 'Studio Ghibli masterpiece',
    moodMatchScore: 0.85
  },
  {
    _id: 'kikis-delivery-service',
    title: "Kiki's Delivery Service",
    description: 'A young witch starts her own delivery service.',
    posterUrl: 'https://cdn.myanimelist.net/images/anime/9/75915.jpg',
    rating: 7.9,
    year: 1989,
    genres: ['Adventure', 'Drama', 'Family'],
    reasoning: 'Studio Ghibli masterpiece',
    moodMatchScore: 0.80
  },
  {
    _id: 'castle-in-the-sky',
    title: 'Castle in the Sky',
    description: 'A young girl and boy search for a legendary floating castle.',
    posterUrl: 'https://cdn.myanimelist.net/images/anime/3/75914.jpg',
    rating: 8.0,
    year: 1986,
    genres: ['Adventure', 'Drama'],
    reasoning: 'Studio Ghibli masterpiece',
    moodMatchScore: 0.80
  },
  {
    _id: 'nausicaa',
    title: 'Nausicaä of the Valley of the Wind',
    description: 'A princess fights to save her world from ecological disaster.',
    posterUrl: 'https://cdn.myanimelist.net/images/anime/4/75918.jpg',
    rating: 8.4,
    year: 1984,
    genres: ['Adventure', 'Drama'],
    reasoning: 'Studio Ghibli masterpiece',
    moodMatchScore: 0.85
  },
  {
    _id: 'ponyo',
    title: 'Ponyo',
    description: 'A magical fish girl befriends a human boy.',
    posterUrl: 'https://cdn.myanimelist.net/images/anime/6/75912.jpg',
    rating: 7.7,
    year: 2008,
    genres: ['Adventure', 'Family'],
    reasoning: 'Studio Ghibli masterpiece',
    moodMatchScore: 0.75
  }
];

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

// Brutalist Carousel Component with Swiper
const BrutalistCarousel: React.FC<{
  children: React.ReactNode[];
  title: string;
  color: string;
}> = ({ children, title, color }) => {
  return (
    <div className="relative mb-20">
      {/* Brutalist Section Header */}
      <div className="relative mb-8">
        <div 
          className="absolute inset-0 transform -skew-y-1 -translate-x-4"
          style={{ backgroundColor: color }}
        />
        <div className="relative bg-black p-6 border-4 border-white transform skew-y-1 translate-x-4">
          <h2 className="text-3xl md:text-4xl font-black text-white uppercase tracking-wider">
            {title}
          </h2>
          <div className="mt-2 w-full h-1 bg-white" />
        </div>
      </div>

      {/* Brutalist Frame Container */}
      <div className="relative border-8 border-black bg-gray-100 overflow-hidden">
        {/* Double border system */}
        <div className="absolute inset-4 border-4 border-white z-10 pointer-events-none" />
        
        {/* Geometric background shapes */}
        <div className="absolute top-4 left-8 w-16 h-16 bg-black transform rotate-45 opacity-20" />
        <div className="absolute bottom-8 right-12 w-12 h-12 bg-white transform -rotate-12 opacity-30" />
        <div 
          className="absolute top-1/2 left-1/4 w-8 h-8 transform -rotate-45 opacity-40"
          style={{ backgroundColor: color }}
        />

        {/* Swiper Carousel */}
        <div className="p-8">
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
                {/* Geometric card frame */}
                <div className="relative">
                  {/* Main frame with random tilt */}
                  <div 
                    className="bg-black p-1 transition-transform duration-300 hover:scale-105"
                    style={{ 
                      transform: `rotate(${(index % 3 - 1) * 3}deg)` 
                    }}
                  >
                    <div className="bg-white p-1">
                      <div 
                        className="p-1"
                        style={{ backgroundColor: color }}
                      >
                        <div className="bg-white">
                          {child}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Tilted shadow layer */}
                  <div 
                    className="absolute inset-0 -z-10 transform translate-x-2 translate-y-2 opacity-60"
                    style={{ 
                      backgroundColor: color,
                      transform: `rotate(${(index % 3 - 1) * 3}deg) translate(8px, 8px)`
                    }}
                  />
                  
                  {/* Additional angled accent */}
                  <div 
                    className="absolute -top-1 -right-1 w-6 h-6 bg-black transform rotate-45 z-20"
                    style={{ 
                      transform: `rotate(${45 + (index % 2) * 90}deg)`
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

const StudioGhibliPage: React.FC<StudioGhibliPageProps> = ({ onViewAnimeDetail, onBack }) => {
  const [allGhibliAnime, setAllGhibliAnime] = useState<AnimeRecommendation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFetched, setLastFetched] = useState<number | null>(null);
  const [hasInitialData, setHasInitialData] = useState(false);

  const fetchStudioGhibliAnime = useAction(api.externalApis.fetchStudioGhibliAnime);
  const fetchInProgressRef = useRef<boolean>(false);

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

  // Only show database data - no fallback content to prevent flickering
  useEffect(() => {
    // Check cache first
    const cachedData = getCachedData();
    if (cachedData && cachedData.anime.length > 0) {
      console.log('[Studio Ghibli] Loading from cache instantly...');
      setAllGhibliAnime(cachedData.anime);
      setLastFetched(cachedData.timestamp);
      organizeAnimeIntoCategories(cachedData.anime);
      setError(null);
      setHasInitialData(true);
    } else {
      // No cache - fetch data and show loading state
      console.log('[Studio Ghibli] No cache found, fetching from database...');
      setHasInitialData(false);
      fetchGhibliData(false);
    }
  }, [getCachedData, organizeAnimeIntoCategories, fetchGhibliData]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      fetchInProgressRef.current = false;
    };
  }, []);

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      {/* Brutalist Background Pattern */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-black to-gray-800" />
        <div className="absolute inset-0 opacity-10">
          {/* Concrete texture pattern */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.1)_1px,transparent_1px)] bg-[length:20px_20px]" />
          <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.05)_25%,rgba(255,255,255,0.05)_50%,transparent_50%,transparent_75%,rgba(255,255,255,0.05)_75%)] bg-[length:40px_40px]" />
        </div>
        
        {/* Geometric Shapes */}
        <div className="absolute top-10 left-10 w-32 h-32 bg-green-500 transform rotate-45 opacity-20" />
        <div className="absolute top-40 right-20 w-24 h-24 bg-yellow-500 transform -rotate-12 opacity-15" />
        <div className="absolute bottom-20 left-1/4 w-40 h-40 bg-red-500 transform rotate-12 opacity-15" />
        <div className="absolute bottom-40 right-10 w-28 h-28 bg-blue-500 transform -rotate-45 opacity-20" />
      </div>

      <div className="relative z-10 px-4 py-8">
        {/* Brutalist Header */}
        <div className="mb-16">
          <div className="absolute left-4 top-4 z-50">
            <StyledButton 
              onClick={onBack}
              className="bg-black border-4 border-white text-white hover:bg-white hover:text-black transition-colors font-black uppercase tracking-wider"
            >
              ← BACK
            </StyledButton>
          </div>
          
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="text-center"
          >
            {/* Brutalist Title */}
            <div className="relative inline-block mb-8">
              <div className="absolute inset-0 bg-green-500 transform rotate-2 translate-x-4 translate-y-2" />
              <div className="relative bg-black border-8 border-white p-8 transform -rotate-1">
                <h1 className="text-6xl md:text-8xl font-black text-white uppercase tracking-wider leading-none">
                  STUDIO
                </h1>
                <h1 className="text-6xl md:text-8xl font-black text-green-400 uppercase tracking-wider leading-none">
                  GHIBLI
                </h1>
              </div>
            </div>
            
            {/* Brutalist Subtitle */}
            <div className="relative inline-block">
              <div className="absolute inset-0 bg-white transform -skew-x-12" />
              <div className="relative bg-black border-4 border-white p-4 transform skew-x-12">
                <p className="text-xl text-white font-bold uppercase tracking-wide">
                  ANIMATED MASTERWORKS
                </p>
              </div>
            </div>

            {/* Stats */}
            <div className="mt-8 flex justify-center space-x-8">
              <div className="text-center">
                <div className="text-3xl font-black text-green-400">{allGhibliAnime.length}</div>
                <div className="text-sm text-white uppercase font-bold">FILMS</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-black text-yellow-400">40+</div>
                <div className="text-sm text-white uppercase font-bold">YEARS</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-black text-red-400">∞</div>
                <div className="text-sm text-white uppercase font-bold">MAGIC</div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Content Sections */}
        <div className="max-w-7xl mx-auto">
          {/* Show loading state if no initial data */}
          {!hasInitialData && isLoading && (
            <div className="flex flex-col items-center justify-center min-h-[400px] space-y-8">
              <div className="relative">
                <div className="w-32 h-32 border-8 border-white border-t-green-400 rounded-full animate-spin" />
                <div className="absolute inset-0 w-32 h-32 border-8 border-transparent border-r-yellow-400 rounded-full animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }} />
              </div>
              <div className="text-center">
                <h3 className="text-2xl font-black text-white uppercase tracking-widest">
                  LOADING GHIBLI MASTERWORKS
                </h3>
                <p className="text-green-400 font-bold uppercase tracking-wide mt-2">
                  Fetching from database...
                </p>
              </div>
            </div>
          )}

          {/* Show content when data is available */}
          {hasInitialData && (
            <>
              {/* Iconic Films */}
              {categories.films.length > 0 && (
                <BrutalistCarousel 
                  title="ICONIC FILMS"
                  color="#10b981"
                >
                  {categories.films.map((anime, index) => (
                    <motion.div
                      key={`films-${index}`}
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
                </BrutalistCarousel>
              )}

              {/* Classic Era */}
              {categories.classics.length > 0 && (
                <BrutalistCarousel 
                  title="CLASSIC ERA"
                  color="#f59e0b"
            >
              {categories.classics.map((anime, index) => (
                <motion.div
                  key={`classics-${index}`}
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
            </BrutalistCarousel>
          )}

          {/* Highest Rated */}
          {categories.highRated.length > 0 && (
            <BrutalistCarousel 
              title="HIGHEST RATED"
              color="#ef4444"
            >
              {categories.highRated.map((anime, index) => (
                <motion.div
                  key={`rated-${index}`}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.1 }}
                  className="cursor-pointer relative"
                >
                  <AnimeCard 
                    anime={anime} 
                    isRecommendation={true} 
                    onViewDetails={onViewAnimeDetail}
                    className="w-full h-full"
                  />
                  {anime.rating && (
                    <div className="absolute -top-2 -right-2 bg-yellow-400 text-black text-xs font-black px-2 py-1 border-2 border-black z-10">
                      {anime.rating.toFixed(1)}★
                    </div>
                  )}
                </motion.div>
              ))}
            </BrutalistCarousel>
          )}

          {/* Recent Works */}
          {categories.recent.length > 0 && (
            <BrutalistCarousel 
              title="RECENT WORKS"
              color="#8b5cf6"
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
            </BrutalistCarousel>
          )}
            </>
          )}
        </div>

        {/* Brutalist Footer */}
        <div className="mt-20 text-center">
          <div className="relative inline-block">
            <div className="absolute inset-0 bg-white transform rotate-1" />
            <div className="relative bg-black border-4 border-white p-6 transform -rotate-1">
              <p className="text-white font-bold uppercase tracking-wide">
                EXPERIENCE THE MAGIC
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudioGhibliPage; 