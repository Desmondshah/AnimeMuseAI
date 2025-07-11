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

// Hardcoded fallback data for Studio Bones - covers all categories instantly
const FALLBACK_BONES_ANIME: AnimeRecommendation[] = [
  // LEGENDARY MASTERPIECES (High rating 8.5+ or famous titles)
  {
    _id: 'fullmetal-alchemist-brotherhood',
    title: 'Fullmetal Alchemist: Brotherhood',
    description: 'Two brothers search for the Philosopher\'s Stone to restore their bodies.',
    posterUrl: 'https://cdn.myanimelist.net/images/anime/1223/96541.jpg',
    rating: 9.1,
    year: 2009,
    genres: ['Action', 'Adventure', 'Drama'],
    reasoning: 'Studio Bones legendary masterpiece',
    moodMatchScore: 0.95
  },
  {
    _id: 'mob-psycho-100',
    title: 'Mob Psycho 100',
    description: 'A psychic middle schooler tries to live a normal life.',
    posterUrl: 'https://cdn.myanimelist.net/images/anime/8/80356.jpg',
    rating: 8.7,
    year: 2016,
    genres: ['Action', 'Comedy', 'Supernatural'],
    reasoning: 'Studio Bones supernatural masterpiece',
    moodMatchScore: 0.90
  },
  {
    _id: 'soul-eater',
    title: 'Soul Eater',
    description: 'Students train to become Death Scythes and their wielders.',
    posterUrl: 'https://cdn.myanimelist.net/images/anime/3/14037.jpg',
    rating: 8.5,
    year: 2008,
    genres: ['Action', 'Comedy', 'Supernatural'],
    reasoning: 'Studio Bones action classic',
    moodMatchScore: 0.85
  },
  
  // RECENT WORKS (2018+)
  {
    _id: 'my-hero-academia-s4',
    title: 'My Hero Academia Season 4',
    description: 'Heroes face their greatest challenges yet.',
    posterUrl: 'https://cdn.myanimelist.net/images/anime/1412/108005.jpg',
    rating: 8.0,
    year: 2019,
    genres: ['Action', 'School', 'Superhero'],
    reasoning: 'Studio Bones recent hit',
    moodMatchScore: 0.85
  },
  {
    _id: 'carole-tuesday',
    title: 'Carole & Tuesday',
    description: 'Two girls pursue their musical dreams on Mars.',
    posterUrl: 'https://cdn.myanimelist.net/images/anime/1709/99009.jpg',
    rating: 7.8,
    year: 2019,
    genres: ['Drama', 'Music', 'Sci-Fi'],
    reasoning: 'Studio Bones musical drama',
    moodMatchScore: 0.80
  },
  {
    _id: 'sk8-infinity',
    title: 'SK8 the Infinity',
    description: 'High school students compete in underground skateboarding races.',
    posterUrl: 'https://cdn.myanimelist.net/images/anime/1630/117876.jpg',
    rating: 8.0,
    year: 2021,
    genres: ['Sports', 'School'],
    reasoning: 'Studio Bones recent sports anime',
    moodMatchScore: 0.80
  },
  
  // ACTION & ADVENTURE
  {
    _id: 'star-driver',
    title: 'Star Driver',
    description: 'A student pilots a giant mecha to protect his island.',
    posterUrl: 'https://cdn.myanimelist.net/images/anime/9/75195.jpg',
    rating: 7.3,
    year: 2010,
    genres: ['Action', 'Mecha', 'School'],
    reasoning: 'Studio Bones mecha action',
    moodMatchScore: 0.75
  },
  {
    _id: 'concrete-revolutio',
    title: 'Concrete Revolutio',
    description: 'Superhumans struggle with justice in an alternate Japan.',
    posterUrl: 'https://cdn.myanimelist.net/images/anime/1820/111986.jpg',
    rating: 7.2,
    year: 2015,
    genres: ['Action', 'Drama', 'Superhero'],
    reasoning: 'Studio Bones superhero action',
    moodMatchScore: 0.75
  },
  {
    _id: 'blood-blockade-battlefront',
    title: 'Blood Blockade Battlefront',
    description: 'Agents fight supernatural threats in New York.',
    posterUrl: 'https://cdn.myanimelist.net/images/anime/7/72809.jpg',
    rating: 7.7,
    year: 2015,
    genres: ['Action', 'Adventure', 'Supernatural'],
    reasoning: 'Studio Bones supernatural action',
    moodMatchScore: 0.80
  },
  
  // SUPERNATURAL & FANTASY
  {
    _id: 'darker-than-black',
    title: 'Darker than Black',
    description: 'Contractors with supernatural abilities work in the shadows.',
    posterUrl: 'https://cdn.myanimelist.net/images/anime/7/21757.jpg',
    rating: 8.1,
    year: 2007,
    genres: ['Action', 'Mystery', 'Supernatural'],
    reasoning: 'Studio Bones dark supernatural thriller',
    moodMatchScore: 0.80
  },
  {
    _id: 'noragami',
    title: 'Noragami',
    description: 'A minor god seeks to build his own shrine.',
    posterUrl: 'https://cdn.myanimelist.net/images/anime/1886/119640.jpg',
    rating: 7.9,
    year: 2014,
    genres: ['Action', 'Adventure', 'Supernatural'],
    reasoning: 'Studio Bones supernatural adventure',
    moodMatchScore: 0.85
  },
  {
    _id: 'wolf-rain',
    title: 'Wolf\'s Rain',
    description: 'Wolves search for paradise in a post-apocalyptic world.',
    posterUrl: 'https://cdn.myanimelist.net/images/anime/6/75193.jpg',
    rating: 8.0,
    year: 2003,
    genres: ['Adventure', 'Drama', 'Fantasy'],
    reasoning: 'Studio Bones fantasy epic',
    moodMatchScore: 0.80
  },
  
  // ADDITIONAL CLASSICS
  {
    _id: 'ouran-high-school-host-club',
    title: 'Ouran High School Host Club',
    description: 'A scholarship student joins a host club at an elite school.',
    posterUrl: 'https://cdn.myanimelist.net/images/anime/1208/94745.jpg',
    rating: 8.2,
    year: 2006,
    genres: ['Comedy', 'Romance', 'School'],
    reasoning: 'Studio Bones romantic comedy',
    moodMatchScore: 0.85
  },
  {
    _id: 'eureka-seven',
    title: 'Eureka Seven',
    description: 'A boy joins a rebel group and pilots a mecha.',
    posterUrl: 'https://cdn.myanimelist.net/images/anime/1/1116.jpg',
    rating: 8.1,
    year: 2005,
    genres: ['Adventure', 'Drama', 'Mecha'],
    reasoning: 'Studio Bones mecha epic',
    moodMatchScore: 0.80
  },
  {
    _id: 'space-dandy',
    title: 'Space Dandy',
    description: 'A pompadoured alien hunter searches the galaxy.',
    posterUrl: 'https://cdn.myanimelist.net/images/anime/12/75195.jpg',
    rating: 7.8,
    year: 2014,
    genres: ['Adventure', 'Comedy', 'Sci-Fi'],
    reasoning: 'Studio Bones space comedy',
    moodMatchScore: 0.75
  }
];

interface BonesPageProps {
  onViewAnimeDetail: (animeId: Id<"anime">) => void;
  onBack: () => void;
}

interface BonesCategories {
  legendary: AnimeRecommendation[];
  action: AnimeRecommendation[];
  recent: AnimeRecommendation[];
  supernatural: AnimeRecommendation[];
}

// Brutalist Bones Carousel Component
const BrutalistBonesCarousel: React.FC<{
  children: React.ReactNode[];
  title: string;
  color: string;
  accent?: string;
  icon?: string;
}> = ({ children, title, color, accent = '#000', icon = '🦴' }) => {
  return (
    <div className="relative mb-20">
      {/* Skeletal Header */}
      <div className="relative mb-8">
        {/* Bone pattern background */}
        <div className="absolute inset-0 opacity-15">
          <div className="grid grid-cols-8 grid-rows-3 h-full w-full gap-2">
            {Array.from({ length: 24 }).map((_, i) => (
              <div 
                key={i} 
                className="border-2 border-gray-400" 
                style={{ 
                  backgroundColor: i % 3 === 0 ? color : 'transparent',
                  opacity: Math.random() * 0.6 + 0.3,
                  transform: `rotate(${(i % 4 - 2) * 15}deg) scale(${0.7 + Math.random() * 0.6})`
                }} 
              />
            ))}
          </div>
        </div>

        {/* Main header structure */}
        <div className="relative">
          <div 
            className="absolute inset-0 transform skew-x-6 translate-x-4 translate-y-2"
            style={{ backgroundColor: color }}
          />
          <div 
            className="absolute inset-0 transform -skew-x-3 -translate-x-2 translate-y-4 opacity-70"
            style={{ backgroundColor: accent }}
          />
          <div className="relative bg-black p-6 border-6 border-white transform -skew-x-2 -translate-x-1">
            <h2 className="text-3xl md:text-4xl font-black text-white uppercase tracking-widest transform skew-x-2">
              {icon} {title}
            </h2>
            <div className="flex mt-3 space-x-2">
              <div className="h-2 w-20 bg-white" />
              <div className="h-2 w-12" style={{ backgroundColor: color }} />
              <div className="h-2 w-6" style={{ backgroundColor: accent }} />
            </div>
          </div>
        </div>

        {/* Skeletal corner elements */}
        <div 
          className="absolute -top-3 -left-3 w-12 h-4 border-4 border-white transform rotate-12"
          style={{ backgroundColor: color }}
        />
        <div 
          className="absolute -top-3 -right-3 w-12 h-4 border-4 border-white transform -rotate-12"
          style={{ backgroundColor: accent }}
        />
        <div 
          className="absolute -bottom-3 -left-3 w-4 h-12 border-4 border-white transform rotate-45"
          style={{ backgroundColor: accent }}
        />
        <div 
          className="absolute -bottom-3 -right-3 w-4 h-12 border-4 border-white transform -rotate-45"
          style={{ backgroundColor: color }}
        />
      </div>

      {/* Brutalist Frame Container */}
      <div className="relative overflow-hidden">
        {/* Triple-layered frame system */}
        <div className="absolute inset-0 border-6 border-white z-10 pointer-events-none" />
        <div 
          className="absolute inset-3 border-4 z-10 pointer-events-none"
          style={{ borderColor: color }}
        />
        <div 
          className="absolute inset-5 border-2 z-10 pointer-events-none opacity-60"
          style={{ borderColor: accent }}
        />

        {/* Skeletal pattern background */}
        <div 
          className="absolute inset-0 opacity-10" 
          style={{
            backgroundImage: `
              linear-gradient(45deg, ${color} 2px, transparent 2px),
              linear-gradient(-45deg, ${color} 2px, transparent 2px),
              linear-gradient(90deg, ${accent} 1px, transparent 1px),
              linear-gradient(0deg, ${accent} 1px, transparent 1px)
            `,
            backgroundSize: '40px 40px, 40px 40px, 20px 20px, 20px 20px'
          }}
        />

        {/* Bone-like decorative stripes */}
        <div className="absolute top-0 left-0 w-full h-6 bg-gradient-to-r from-transparent via-gray-300 to-transparent opacity-20 z-10 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-full h-6 bg-gradient-to-r from-transparent via-gray-400 to-transparent opacity-20 z-10 pointer-events-none" />

        {/* Swiper Carousel */}
        <div className="p-8 bg-gray-100">
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
                {/* Skeletal card frame */}
                <div className="relative">
                  {/* Main frame with bone-like tilt */}
                  <div 
                    className="bg-black p-2 transition-all duration-300 hover:scale-105 hover:rotate-1"
                    style={{ 
                      transform: `rotate(${(index % 6 - 2.5) * 2}deg)` 
                    }}
                  >
                    <div 
                      className="p-2"
                      style={{ backgroundColor: color }}
                    >
                      <div className="bg-white p-1">
                        <div className="bg-gray-200 p-1">
                          <div className="bg-white">
                            {child}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Bone-like corner joints */}
                  <div 
                    className="absolute -top-2 -left-2 w-8 h-2 border-2 border-white z-20"
                    style={{ 
                      backgroundColor: color,
                      transform: `rotate(${(index % 3) * 30}deg)`
                    }}
                  />
                  <div 
                    className="absolute -top-2 -right-2 w-8 h-2 border-2 border-white z-20"
                    style={{ 
                      backgroundColor: accent,
                      transform: `rotate(${-(index % 3) * 30}deg)`
                    }}
                  />
                  <div 
                    className="absolute -bottom-2 -left-2 w-2 h-8 border-2 border-white z-20"
                    style={{ 
                      backgroundColor: accent,
                      transform: `rotate(${(index % 4) * 45}deg)`
                    }}
                  />
                  <div 
                    className="absolute -bottom-2 -right-2 w-2 h-8 border-2 border-white z-20"
                    style={{ 
                      backgroundColor: color,
                      transform: `rotate(${-(index % 4) * 45}deg)`
                    }}
                  />
                  
                  {/* Layered bone-like shadows */}
                  <div 
                    className="absolute inset-0 -z-10"
                    style={{ 
                      backgroundColor: color,
                      transform: `rotate(${(index % 6 - 2.5) * 2}deg) translate(8px, 8px)`,
                      opacity: 0.7
                    }}
                  />
                  <div 
                    className="absolute inset-0 -z-20"
                    style={{ 
                      backgroundColor: accent,
                      transform: `rotate(${(index % 6 - 2.5) * 2}deg) translate(16px, 16px)`,
                      opacity: 0.4
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

const BonesPage: React.FC<BonesPageProps> = ({ onViewAnimeDetail, onBack }) => {
  const [categories, setCategories] = useState<BonesCategories>({
    legendary: [],
    action: [],
    recent: [],
    supernatural: []
  });
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchBonesAnimeAction = useAction(api.externalApis.fetchBonesAnime);

  // Organize anime into categories
  const organizeAnimeIntoCategories = useCallback((animes: AnimeRecommendation[]): BonesCategories => {
    const legendary: AnimeRecommendation[] = [];
    const action: AnimeRecommendation[] = [];
    const recent: AnimeRecommendation[] = [];
    const supernatural: AnimeRecommendation[] = [];

    // Define legendary Bones anime
    const legendaryTitles = [
      'fullmetal alchemist', 'brotherhood', 'soul eater', 'mob psycho 100',
      'ouran high school host club', 'darker than black', 'eureka seven', 
      'wolf\'s rain', 'my hero academia', 'noragami'
    ];

    animes.forEach(anime => {
      const title = anime.title.toLowerCase();
      const rating = anime.rating || 0;
      const year = anime.year || 0;
      const genres = anime.genres?.map(g => g.toLowerCase()) || [];

      // Legendary: High-rated anime (8.5+) or famous Bones titles
      if (rating >= 8.5 || legendaryTitles.some(legendaryTitle => title.includes(legendaryTitle))) {
        legendary.push(anime);
      }
      // Action: Action, Adventure, Superhero, Mecha genres
      else if (genres.some(genre => 
        ['action', 'adventure', 'superhero', 'mecha', 'martial arts'].includes(genre)
      )) {
        action.push(anime);
      }
      // Recent: 2018 onwards
      else if (year >= 2018) {
        recent.push(anime);
      }
      // Supernatural: Supernatural, Fantasy, Mystery, Sci-Fi genres
      else if (genres.some(genre => 
        ['supernatural', 'fantasy', 'mystery', 'sci-fi', 'magic'].includes(genre)
      )) {
        supernatural.push(anime);
      }
      // Default to action if no other category fits
      else {
        action.push(anime);
      }
    });

    // Sort each category by rating
    const sortByRating = (a: AnimeRecommendation, b: AnimeRecommendation) => 
      (b.rating || 0) - (a.rating || 0);

    return {
      legendary: legendary.sort(sortByRating).slice(0, 12),
      action: action.sort(sortByRating).slice(0, 12),
      recent: recent.sort(sortByRating).slice(0, 12),
      supernatural: supernatural.sort(sortByRating).slice(0, 12)
    };
  }, []);

  // Fetch Bones data from database
  const fetchBonesData = useCallback(async () => {
    try {
      setError(null);

      console.log('Fetching Bones anime from database...');
      
      const result = await fetchBonesAnimeAction({ limit: 100 });
      
      if (result.error) {
        throw new Error(result.error);
      }

      const animes = result.animes || [];
      
      // Use database data or show empty state if no data
      const organizedCategories = organizeAnimeIntoCategories(animes);
      setCategories(organizedCategories);
      
      if (animes.length > 0) {
        console.log(`Successfully organized ${animes.length} Bones anime from database`);
      } else {
        console.log('No Bones anime found in database');
      }

    } catch (err) {
      console.error('Error fetching Bones anime:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch Bones anime');
    } finally {
      setIsLoading(false);
    }
  }, [fetchBonesAnimeAction, organizeAnimeIntoCategories]);

  // Only show database data - no fallback content to prevent flickering
  useEffect(() => {
    // Don't show fallback data, only show loading state
    console.log('Loading Bones page - fetching from database...');
    setIsLoading(true);
    
    // Fetch real data from database
    fetchBonesData();
  }, [fetchBonesData]);

  const totalAnime = categories.legendary.length + categories.action.length + 
                   categories.recent.length + categories.supernatural.length;

  return (
    <div className="min-h-screen bg-gray-900 relative overflow-hidden">
      {/* Skeletal grid background */}
      <div 
        className="fixed inset-0 opacity-5" 
        style={{
          backgroundImage: `
            linear-gradient(90deg, #ffffff 1px, transparent 1px),
            linear-gradient(0deg, #ffffff 1px, transparent 1px),
            linear-gradient(45deg, #cccccc 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px, 60px 60px, 30px 30px'
        }}
      />

      {/* Floating bone particles */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {[...Array(12)].map((_, i) => (
          <div
            key={i}
            className="absolute w-2 h-1 bg-gray-300 animate-pulse"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${2 + Math.random() * 4}s`,
              transform: `rotate(${Math.random() * 360}deg)`
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
          
          {/* Massive BONES title */}
          <div className="relative mb-8">
            {/* Skeletal background shapes */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-80 h-20 bg-gray-300 opacity-20 transform rotate-6" />
              <div className="absolute w-72 h-16 bg-gray-400 opacity-20 transform -rotate-3" />
              <div className="absolute w-64 h-12 bg-white opacity-15 transform rotate-1" />
            </div>
            
            {/* Main title */}
            <div className="relative">
              <div className="absolute inset-0 transform translate-x-3 translate-y-3">
                <h1 className="text-6xl md:text-8xl font-black text-gray-400 uppercase tracking-widest opacity-60">
                  BONES
                </h1>
              </div>
              <div className="absolute inset-0 transform -translate-x-2 -translate-y-2">
                <h1 className="text-6xl md:text-8xl font-black text-gray-600 uppercase tracking-widest opacity-60">
                  BONES
                </h1>
              </div>
              <h1 className="relative text-6xl md:text-8xl font-black text-white uppercase tracking-widest">
                BONES
              </h1>
            </div>
          </div>
          
          <div className="max-w-3xl mx-auto">
            <div className="bg-black border-6 border-white p-6 transform -skew-x-3">
              <p className="text-lg text-white font-bold uppercase tracking-wide transform skew-x-3">
                SKELETAL PRECISION • ANIMATED EXCELLENCE • STRUCTURAL MASTERY
              </p>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto">
          {/* Show loading state while fetching data */}
          {isLoading && (
            <div className="flex flex-col items-center justify-center min-h-[400px] space-y-8">
              <div className="relative">
                <div className="w-32 h-32 border-8 border-white border-t-amber-400 rounded-full animate-spin" />
                <div className="absolute inset-0 w-32 h-32 border-8 border-transparent border-r-orange-400 rounded-full animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }} />
              </div>
              <div className="text-center">
                <h3 className="text-2xl font-black text-white uppercase tracking-widest">
                  LOADING BONES MASTERWORKS
                </h3>
                <p className="text-amber-400 font-bold uppercase tracking-wide mt-2">
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
                <BrutalistBonesCarousel 
                  title="LEGENDARY BONES"
                  color="#fbbf24"
                  accent="#f59e0b"
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
            </BrutalistBonesCarousel>
          )}

          {/* Action & Adventure */}
          {categories.action.length > 0 && (
            <BrutalistBonesCarousel 
              title="ACTION SKELETON"
              color="#dc2626"
              accent="#991b1b"
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
                    onViewDetails={() => anime._id && onViewAnimeDetail(anime._id as Id<"anime">)}
                    className="w-full h-full"
                  />
                </motion.div>
              ))}
            </BrutalistBonesCarousel>
          )}

          {/* Recent Works */}
          {categories.recent.length > 0 && (
            <BrutalistBonesCarousel 
              title="FRESH MARROW"
              color="#059669"
              accent="#047857"
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
                    onViewDetails={() => anime._id && onViewAnimeDetail(anime._id as Id<"anime">)}
                    className="w-full h-full"
                  />
                </motion.div>
              ))}
            </BrutalistBonesCarousel>
          )}

          {/* Supernatural & Fantasy */}
          {categories.supernatural.length > 0 && (
            <BrutalistBonesCarousel 
              title="SPIRIT BONES"
              color="#7c3aed"
              accent="#5b21b6"
              icon="👻"
            >
              {categories.supernatural.map((anime, index) => (
                <motion.div
                  key={`supernatural-${index}`}
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
            </BrutalistBonesCarousel>
          )}
            </>
          )}
        </div>

        {/* Brutalist Footer */}
        <div className="text-center mt-20 mb-8">
          <div className="bg-white border-6 border-black p-4 transform skew-x-2 max-w-2xl mx-auto">
            <p className="text-black font-black uppercase tracking-wider transform -skew-x-2">
              STUDIO BONES - STRUCTURAL ANIMATION SINCE 1998
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BonesPage; 