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
      
      // Update state
      setAllKyotoAnimationAnime(anime);
      organizeAnimeIntoCategories(anime);
      setError(null);
      
      console.log(`[KyoAni] Successfully loaded ${anime.length} anime from database`);

    } catch (err: any) {
      console.error('[KyoAni] Fetch error:', err);
      setError(err.message || 'Failed to load Kyoto Animation anime');
    }
  }, [fetchKyotoAnimationAnime, organizeAnimeIntoCategories]);

  // Initialize data on component mount
  useEffect(() => {
    fetchKyotoAnimationData().catch(err => {
      console.error('[KyoAni] Initial fetch failed:', err);
    });
  }, [fetchKyotoAnimationData]);



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