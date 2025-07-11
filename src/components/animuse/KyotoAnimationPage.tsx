import React, { useState, useEffect, useCallback } from "react";
import { useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { AnimeRecommendation } from "../../../convex/types";
import { motion } from "framer-motion";
import AnimeCard from "./AnimeCard";
import { Swiper, SwiperSlide } from 'swiper/react';
import { FreeMode } from 'swiper/modules';
import StyledButton from "./shared/StyledButton";

// Hardcoded fallback data for Kyoto Animation - always available instantly
const FALLBACK_KYOANI_ANIME: AnimeRecommendation[] = [
  {
    _id: 'violet-evergarden',
    title: 'Violet Evergarden',
    description: 'A former soldier learns to write letters and understand emotions.',
    posterUrl: 'https://cdn.myanimelist.net/images/anime/1795/95088.jpg',
    rating: 8.5,
    year: 2018,
    genres: ['Drama', 'Fantasy', 'Slice of Life'],
    reasoning: 'Kyoto Animation emotional masterpiece',
    moodMatchScore: 0.95
  },
  {
    _id: 'a-silent-voice',
    title: 'A Silent Voice',
    description: 'A former bully seeks redemption with a deaf classmate.',
    posterUrl: 'https://cdn.myanimelist.net/images/anime/1122/96435.jpg',
    rating: 8.9,
    year: 2016,
    genres: ['Drama', 'Romance', 'School'],
    reasoning: 'Kyoto Animation heartfelt film',
    moodMatchScore: 0.95
  },
  {
    _id: 'clannad-after-story',
    title: 'Clannad: After Story',
    description: 'The continuation of Tomoya and Nagisa\'s love story.',
    posterUrl: 'https://cdn.myanimelist.net/images/anime/1299/110774.jpg',
    rating: 9.0,
    year: 2008,
    genres: ['Drama', 'Romance', 'Slice of Life'],
    reasoning: 'Kyoto Animation legendary drama',
    moodMatchScore: 0.95
  },
  {
    _id: 'k-on',
    title: 'K-On!',
    description: 'High school girls form a light music club.',
    posterUrl: 'https://cdn.myanimelist.net/images/anime/10/76121.jpg',
    rating: 7.8,
    year: 2009,
    genres: ['Comedy', 'Music', 'School'],
    reasoning: 'Kyoto Animation slice of life classic',
    moodMatchScore: 0.85
  },
  {
    _id: 'haruhi-suzumiya',
    title: 'The Melancholy of Haruhi Suzumiya',
    description: 'A high school student unknowingly has reality-altering powers.',
    posterUrl: 'https://cdn.myanimelist.net/images/anime/5/75849.jpg',
    rating: 7.8,
    year: 2006,
    genres: ['Comedy', 'Mystery', 'School'],
    reasoning: 'Kyoto Animation supernatural comedy',
    moodMatchScore: 0.80
  },
  {
    _id: 'sound-euphonium',
    title: 'Sound! Euphonium',
    description: 'A high school concert band strives for excellence.',
    posterUrl: 'https://cdn.myanimelist.net/images/anime/1524/111766.jpg',
    rating: 8.0,
    year: 2015,
    genres: ['Drama', 'Music', 'School'],
    reasoning: 'Kyoto Animation music drama',
    moodMatchScore: 0.85
  },
  {
    _id: 'hyouka',
    title: 'Hyouka',
    description: 'A curious student gets drawn into solving mysteries.',
    posterUrl: 'https://cdn.myanimelist.net/images/anime/13/50521.jpg',
    rating: 8.1,
    year: 2012,
    genres: ['Mystery', 'School', 'Slice of Life'],
    reasoning: 'Kyoto Animation mystery series',
    moodMatchScore: 0.85
  },
  {
    _id: 'dragon-maid',
    title: 'Miss Kobayashi\'s Dragon Maid',
    description: 'A programmer lives with a dragon who becomes her maid.',
    posterUrl: 'https://cdn.myanimelist.net/images/anime/5/85434.jpg',
    rating: 7.9,
    year: 2017,
    genres: ['Comedy', 'Fantasy', 'Slice of Life'],
    reasoning: 'Kyoto Animation comedy fantasy',
    moodMatchScore: 0.80
  }
];

interface KyotoAnimationPageProps {
  onViewAnimeDetail: (animeId: Id<"anime">) => void;
  onBack: () => void;
}

// Brutalist Kyoto Animation Carousel Component
const BrutalistKyotoCarousel: React.FC<{
  children: React.ReactNode[];
  title: string;
  color: string;
  accent?: string;
  icon?: string;
}> = ({ children, title, color, accent = '#000', icon = '🏛️' }) => {
  return (
    <div className="relative mb-20">
      {/* Temple-inspired Header */}
      <div className="relative mb-8">
        {/* Traditional pattern background */}
        <div className="absolute inset-0 opacity-10">
          <div className="grid grid-cols-12 grid-rows-4 h-full w-full gap-1">
            {Array.from({ length: 48 }).map((_, i) => (
              <div 
                key={i} 
                className="border border-gray-300" 
                style={{ 
                  backgroundColor: i % 4 === 0 ? color : i % 4 === 1 ? accent : 'transparent',
                  opacity: 0.3 + (Math.sin(i * 0.5) * 0.4),
                  transform: `scale(${0.8 + Math.sin(i * 0.3) * 0.3})`
                }} 
              />
            ))}
          </div>
        </div>

        {/* Main header structure with temple-like layers */}
        <div className="relative">
          {/* Temple roof layers */}
          <div 
            className="absolute inset-0 transform skew-y-2 translate-y-6"
            style={{ backgroundColor: accent, opacity: 0.6 }}
          />
          <div 
            className="absolute inset-0 transform -skew-y-1 translate-y-4"
            style={{ backgroundColor: color, opacity: 0.8 }}
          />
          <div className="relative bg-black p-8 border-8 border-white">
            <h2 className="text-3xl md:text-4xl font-black text-white uppercase tracking-widest text-center">
              {icon} {title}
            </h2>
            <div className="flex justify-center mt-4 space-x-3">
              <div className="h-3 w-16 bg-white" />
              <div className="h-3 w-24" style={{ backgroundColor: color }} />
              <div className="h-3 w-16 bg-white" />
              <div className="h-3 w-12" style={{ backgroundColor: accent }} />
              <div className="h-3 w-16 bg-white" />
            </div>
          </div>
        </div>

        {/* Temple pillar elements */}
        <div 
          className="absolute -top-4 left-8 w-6 h-16 border-4 border-white"
          style={{ backgroundColor: color }}
        />
        <div 
          className="absolute -top-4 right-8 w-6 h-16 border-4 border-white"
          style={{ backgroundColor: color }}
        />
        <div 
          className="absolute -bottom-4 left-16 w-4 h-8 border-4 border-white"
          style={{ backgroundColor: accent }}
        />
        <div 
          className="absolute -bottom-4 right-16 w-4 h-8 border-4 border-white"
          style={{ backgroundColor: accent }}
        />
      </div>

      {/* Brutalist Frame Container */}
      <div className="relative overflow-hidden">
        {/* Layered temple-inspired frame system */}
        <div className="absolute inset-0 border-8 border-white z-10 pointer-events-none" />
        <div 
          className="absolute inset-4 border-6 z-10 pointer-events-none"
          style={{ borderColor: color }}
        />
        <div 
          className="absolute inset-8 border-4 z-10 pointer-events-none opacity-70"
          style={{ borderColor: accent }}
        />
        <div className="absolute inset-12 border-2 border-white z-10 pointer-events-none opacity-50" />

        {/* Traditional pattern background */}
        <div 
          className="absolute inset-0 opacity-8" 
          style={{
            backgroundImage: `
              radial-gradient(circle at 25% 25%, ${color} 2px, transparent 2px),
              radial-gradient(circle at 75% 75%, ${accent} 2px, transparent 2px),
              linear-gradient(45deg, transparent 48%, ${color} 49%, ${color} 51%, transparent 52%),
              linear-gradient(-45deg, transparent 48%, ${accent} 49%, ${accent} 51%, transparent 52%)
            `,
            backgroundSize: '30px 30px, 30px 30px, 60px 60px, 60px 60px'
          }}
        />

        {/* Temple-like decorative borders */}
        <div className="absolute top-0 left-0 w-full h-8 bg-gradient-to-r from-transparent via-white to-transparent opacity-30 z-10 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-full h-8 bg-gradient-to-r from-transparent via-gray-200 to-transparent opacity-30 z-10 pointer-events-none" />

        {/* Swiper Carousel */}
        <div className="p-12 bg-gray-50">
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
                {/* Temple-inspired card frame */}
                <div className="relative">
                  {/* Main frame with elegant tilt */}
                  <div 
                    className="bg-black p-3 transition-all duration-300 hover:scale-105 hover:-rotate-1"
                    style={{ 
                      transform: `rotate(${(index % 5 - 2) * 1.5}deg)` 
                    }}
                  >
                    <div 
                      className="p-3 border-2 border-white"
                      style={{ backgroundColor: color }}
                    >
                      <div 
                        className="p-2 border border-white"
                        style={{ backgroundColor: accent, opacity: 0.9 }}
                      >
                        <div className="bg-white p-1">
                          <div className="bg-gray-100">
                            {child}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Temple-like corner ornaments */}
                  <div 
                    className="absolute -top-3 -left-3 w-10 h-3 border-3 border-white z-20"
                    style={{ 
                      backgroundColor: color,
                      transform: `rotate(${(index % 2) * 45}deg)`
                    }}
                  />
                  <div 
                    className="absolute -top-3 -right-3 w-10 h-3 border-3 border-white z-20"
                    style={{ 
                      backgroundColor: accent,
                      transform: `rotate(${-(index % 2) * 45}deg)`
                    }}
                  />
                  <div 
                    className="absolute -bottom-3 -left-3 w-3 h-10 border-3 border-white z-20"
                    style={{ 
                      backgroundColor: accent,
                      transform: `rotate(${(index % 3) * 30}deg)`
                    }}
                  />
                  <div 
                    className="absolute -bottom-3 -right-3 w-3 h-10 border-3 border-white z-20"
                    style={{ 
                      backgroundColor: color,
                      transform: `rotate(${-(index % 3) * 30}deg)`
                    }}
                  />
                  
                  {/* Elegant layered shadows */}
                  <div 
                    className="absolute inset-0 -z-10"
                    style={{ 
                      backgroundColor: color,
                      transform: `rotate(${(index % 5 - 2) * 1.5}deg) translate(10px, 10px)`,
                      opacity: 0.6
                    }}
                  />
                  <div 
                    className="absolute inset-0 -z-20"
                    style={{ 
                      backgroundColor: accent,
                      transform: `rotate(${(index % 5 - 2) * 1.5}deg) translate(20px, 20px)`,
                      opacity: 0.3
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

const KyotoAnimationPage: React.FC<KyotoAnimationPageProps> = ({ onViewAnimeDetail, onBack }) => {
  const [allKyotoAnimationAnime, setAllKyotoAnimationAnime] = useState<AnimeRecommendation[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchKyotoAnimationAnime = useAction(api.externalApis.fetchKyotoAnimationAnime);

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

  const fetchKyotoAnimationData = useCallback(async () => {
    try {
      setError(null);
      
      console.log('[KyoAni] Fetching from database...');
      const result = await fetchKyotoAnimationAnime({ limit: 100 });
      
      if (result.error) {
        setError(result.error);
        return;
      }

      const anime = result.animes || [];
      
      // Use database data or show empty state if no data
      setAllKyotoAnimationAnime(anime);
      organizeAnimeIntoCategories(anime);
      setError(null);
      
      if (anime.length > 0) {
        console.log(`[KyoAni] Successfully loaded ${anime.length} anime from database`);
      } else {
        console.log('[KyoAni] No anime found in database');
      }

    } catch (err: any) {
      console.error('[KyoAni] Fetch error:', err);
      setError(err.message || 'Failed to fetch KyoAni anime');
    } finally {
      setIsLoading(false);
    }
  }, [fetchKyotoAnimationAnime, organizeAnimeIntoCategories]);

  // Only show database data - no fallback content to prevent flickering
  useEffect(() => {
    // Don't show fallback data, only show loading state
    console.log('[KyoAni] Loading page - fetching from database...');
    setIsLoading(true);
    
    // Fetch real data from database
    fetchKyotoAnimationData().catch(err => {
      console.error('[KyoAni] Fetch failed:', err);
    });
  }, [fetchKyotoAnimationData]);

  return (
    <div className="min-h-screen bg-gray-800 relative overflow-hidden">
      {/* Traditional pattern background */}
      <div 
        className="fixed inset-0 opacity-5" 
        style={{
          backgroundImage: `
            linear-gradient(90deg, #ffffff 2px, transparent 2px),
            linear-gradient(0deg, #ffffff 2px, transparent 2px),
            radial-gradient(circle at 50% 50%, #cccccc 1px, transparent 1px)
          `,
          backgroundSize: '80px 80px, 80px 80px, 40px 40px'
        }}
      />

      {/* Floating temple elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {[...Array(15)].map((_, i) => (
          <div
            key={i}
            className="absolute w-3 h-1 bg-purple-200 animate-pulse opacity-20"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 4}s`,
              animationDuration: `${3 + Math.random() * 5}s`,
              transform: `rotate(${Math.random() * 180}deg) scale(${0.5 + Math.random() * 1})`
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
          
          {/* Massive KYOTO ANIMATION title */}
          <div className="relative mb-8">
            {/* Temple background shapes */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-96 h-24 bg-purple-300 opacity-15 transform rotate-2" />
              <div className="absolute w-88 h-20 bg-pink-300 opacity-15 transform -rotate-1" />
              <div className="absolute w-80 h-16 bg-white opacity-10" />
            </div>
            
            {/* Main title with temple-like layering */}
            <div className="relative">
              <div className="absolute inset-0 transform translate-x-4 translate-y-4">
                <h1 className="text-4xl md:text-7xl font-black text-purple-400 uppercase tracking-widest opacity-50">
                  KYOTO
                </h1>
                <h1 className="text-3xl md:text-5xl font-black text-purple-400 uppercase tracking-widest opacity-50 mt-2">
                  ANIMATION
                </h1>
              </div>
              <div className="absolute inset-0 transform -translate-x-2 -translate-y-2">
                <h1 className="text-4xl md:text-7xl font-black text-pink-400 uppercase tracking-widest opacity-60">
                  KYOTO
                </h1>
                <h1 className="text-3xl md:text-5xl font-black text-pink-400 uppercase tracking-widest opacity-60 mt-2">
                  ANIMATION
                </h1>
              </div>
              <div className="relative">
                <h1 className="text-4xl md:text-7xl font-black text-white uppercase tracking-widest">
                  KYOTO
                </h1>
                <h1 className="text-3xl md:text-5xl font-black text-white uppercase tracking-widest mt-2">
                  ANIMATION
                </h1>
              </div>
            </div>
          </div>
          
          <div className="max-w-4xl mx-auto">
            <div className="bg-black border-8 border-white p-8 transform -skew-y-1">
              <p className="text-xl text-white font-bold uppercase tracking-wide transform skew-y-1">
                TEMPLE OF ANIMATION • EMOTIONAL MASTERY • VISUAL PERFECTION
              </p>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto">
          {/* Show loading state while fetching data */}
          {isLoading && (
            <div className="flex flex-col items-center justify-center min-h-[400px] space-y-8">
              <div className="relative">
                <div className="w-32 h-32 border-8 border-white border-t-purple-400 rounded-full animate-spin" />
                <div className="absolute inset-0 w-32 h-32 border-8 border-transparent border-r-violet-400 rounded-full animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }} />
              </div>
              <div className="text-center">
                <h3 className="text-2xl font-black text-white uppercase tracking-widest">
                  LOADING KYOTO MASTERWORKS
                </h3>
                <p className="text-purple-400 font-bold uppercase tracking-wide mt-2">
                  Fetching from database...
                </p>
              </div>
            </div>
          )}

          {/* Show content when data is available and not loading */}
          {!isLoading && (
            <>
              {/* Legendary Masterpieces */}
              {categories.legendary.length > 0 && (
                <BrutalistKyotoCarousel 
                  title="LEGENDARY TEMPLE"
                  color="#8b5cf6"
                  accent="#a855f7"
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
                    onViewDetails={() => anime._id && onViewAnimeDetail(anime._id as Id<"anime">)}
                    className="w-full h-full"
                  />
                </motion.div>
              ))}
            </BrutalistKyotoCarousel>
          )}

          {/* Drama & Romance */}
          {categories.drama.length > 0 && (
            <BrutalistKyotoCarousel 
              title="EMOTIONAL SHRINE"
              color="#ec4899"
              accent="#f472b6"
              icon="💕"
            >
              {categories.drama.map((anime, index) => (
                <motion.div
                  key={`drama-${index}`}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.1 }}
                  className="cursor-pointer"
                >
                  <AnimeCard 
                    anime={anime} 
                    onViewDetails={() => anime._id && onViewAnimeDetail(anime._id as Id<"anime">)}
                    className="w-full h-full"
                  />
                </motion.div>
              ))}
            </BrutalistKyotoCarousel>
          )}

          {/* Comedy & Slice of Life */}
          {categories.comedy.length > 0 && (
            <BrutalistKyotoCarousel 
              title="HARMONY PAVILION"
              color="#f59e0b"
              accent="#fbbf24"
              icon="😊"
            >
              {categories.comedy.map((anime, index) => (
                <motion.div
                  key={`comedy-${index}`}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.1 }}
                  className="cursor-pointer"
                >
                  <AnimeCard 
                    anime={anime} 
                    onViewDetails={() => anime._id && onViewAnimeDetail(anime._id as Id<"anime">)}
                    className="w-full h-full"
                  />
                </motion.div>
              ))}
            </BrutalistKyotoCarousel>
          )}

          {/* Movies & Specials */}
          {categories.movies.length > 0 && (
            <BrutalistKyotoCarousel 
              title="CINEMA SANCTUARY"
              color="#06b6d4"
              accent="#0891b2"
              icon="🎬"
            >
              {categories.movies.map((anime, index) => (
                <motion.div
                  key={`movies-${index}`}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.1 }}
                  className="cursor-pointer"
                >
                  <AnimeCard 
                    anime={anime} 
                    onViewDetails={() => anime._id && onViewAnimeDetail(anime._id as Id<"anime">)}
                    className="w-full h-full"
                  />
                </motion.div>
              ))}
            </BrutalistKyotoCarousel>
          )}
            </>
          )}
        </div>

        {/* Brutalist Footer */}
        <div className="text-center mt-20 mb-8">
          <div className="bg-white border-8 border-black p-6 transform skew-y-1 max-w-3xl mx-auto">
            <p className="text-black font-black uppercase tracking-wider transform -skew-y-1">
              KYOTO ANIMATION - CRAFTING EMOTIONS SINCE 1981
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default KyotoAnimationPage; 