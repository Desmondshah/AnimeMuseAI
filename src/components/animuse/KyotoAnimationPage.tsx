import React, { useState, useEffect, useCallback } from "react";
import { useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { AnimeRecommendation } from "../../../convex/types";
import AnimeCard from "./AnimeCard";
import Carousel from "./shared/Carousel";
import { ArrowLeft } from "lucide-react";

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



const KyotoAnimationPage: React.FC<KyotoAnimationPageProps> = ({ onViewAnimeDetail, onBack }) => {
  const [allKyotoAnimationAnime, setAllKyotoAnimationAnime] = useState<AnimeRecommendation[]>([]);
  const [error, setError] = useState<string | null>(null);

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
      
      // If we got real data from database, use it; otherwise keep fallback
      if (anime.length > 0) {
        setAllKyotoAnimationAnime(anime);
        organizeAnimeIntoCategories(anime);
        setError(null);
        console.log(`[KyoAni] Successfully loaded ${anime.length} anime from database`);
      } else {
        console.log('[KyoAni] No anime found in database, using fallback data');
      }

    } catch (err: any) {
      console.error('[KyoAni] Fetch error:', err);
      setError(err.message || 'Using fallback data due to fetch error');
    }
  }, [fetchKyotoAnimationAnime, organizeAnimeIntoCategories]);

  // Initialize with fallback data immediately, then fetch from database
  useEffect(() => {
    // Show fallback data instantly
    console.log('[KyoAni] Loading page with instant fallback data...');
    setAllKyotoAnimationAnime(FALLBACK_KYOANI_ANIME);
    organizeAnimeIntoCategories(FALLBACK_KYOANI_ANIME);
    
    // Then fetch real data from database in background
    fetchKyotoAnimationData().catch(err => {
      console.error('[KyoAni] Background fetch failed:', err);
    });
  }, [fetchKyotoAnimationData, organizeAnimeIntoCategories]);



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


        </div>
      </div>
    </div>
  );
};

export default KyotoAnimationPage; 