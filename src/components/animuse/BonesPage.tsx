import React, { useState, useEffect, useCallback } from "react";
import { useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { AnimeRecommendation } from "../../../convex/types";
import AnimeCard from "./AnimeCard";
import Carousel from "./shared/Carousel";
import { ArrowLeft } from "lucide-react";

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

const BonesPage: React.FC<BonesPageProps> = ({ onViewAnimeDetail, onBack }) => {
  const [categories, setCategories] = useState<BonesCategories>({
    legendary: [],
    action: [],
    recent: [],
    supernatural: []
  });
  const [error, setError] = useState<string | null>(null);

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
      const organizedCategories = organizeAnimeIntoCategories(animes);
      
      setCategories(organizedCategories);
      
      console.log(`Successfully organized ${animes.length} Bones anime into categories`);

    } catch (err) {
      console.error('Error fetching Bones anime:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch Bones anime');
    }
  }, [fetchBonesAnimeAction, organizeAnimeIntoCategories]);

  // Initialize data on component mount
  useEffect(() => {
    fetchBonesData();
  }, [fetchBonesData]);



  const totalAnime = categories.legendary.length + categories.action.length + 
                   categories.recent.length + categories.supernatural.length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-slate-800 to-blue-700 text-white">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={onBack}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600/20 hover:bg-blue-600/30 rounded-lg transition-colors"
          >
            <ArrowLeft size={20} />
            <span>Back</span>
          </button>
        </div>

        {/* Studio Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-400 to-silver-300 bg-clip-text text-transparent mb-4">
            Studio Bones
          </h1>
        </div>

        {/* Error Banner */}
        {error && categories.legendary.length > 0 && (
          <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4 mb-8">
            <p className="text-red-300 text-center">
              ⚠️ Some data may be outdated. Using cached results. {error}
            </p>
          </div>
        )}

        {/* Categories */}
        <div className="space-y-12">
          {/* Legendary Series */}
          {categories.legendary.length > 0 && (
            <section>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-1 h-8 bg-gradient-to-b from-yellow-400 to-yellow-600 rounded-full"></div>
                <h2 className="text-2xl font-bold text-yellow-300">Legendary Masterpieces</h2>
              </div>
              <Carousel>
                {categories.legendary.map((anime, index) => (
                  <div key={`legendary-${index}`} className="flex-shrink-0 w-48">
                    <AnimeCard
                      anime={anime}
                      onViewDetails={() => anime._id && onViewAnimeDetail(anime._id as Id<"anime">)}
                      className="h-full"
                    />
                  </div>
                ))}
              </Carousel>
            </section>
          )}

          {/* Action & Adventure */}
          {categories.action.length > 0 && (
            <section>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-1 h-8 bg-gradient-to-b from-red-400 to-red-600 rounded-full"></div>
                <h2 className="text-2xl font-bold text-red-300">Action & Adventure</h2>
              </div>
              <Carousel>
                {categories.action.map((anime, index) => (
                  <div key={`action-${index}`} className="flex-shrink-0 w-48">
                    <AnimeCard
                      anime={anime}
                      onViewDetails={() => anime._id && onViewAnimeDetail(anime._id as Id<"anime">)}
                      className="h-full"
                    />
                  </div>
                ))}
              </Carousel>
            </section>
          )}

          {/* Recent Works */}
          {categories.recent.length > 0 && (
            <section>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-1 h-8 bg-gradient-to-b from-green-400 to-green-600 rounded-full"></div>
                <h2 className="text-2xl font-bold text-green-300">Recent Works</h2>
              </div>
              <Carousel>
                {categories.recent.map((anime, index) => (
                  <div key={`recent-${index}`} className="flex-shrink-0 w-48">
                    <AnimeCard
                      anime={anime}
                      onViewDetails={() => anime._id && onViewAnimeDetail(anime._id as Id<"anime">)}
                      className="h-full"
                    />
                  </div>
                ))}
              </Carousel>
            </section>
          )}

          {/* Supernatural & Fantasy */}
          {categories.supernatural.length > 0 && (
            <section>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-1 h-8 bg-gradient-to-b from-purple-400 to-purple-600 rounded-full"></div>
                <h2 className="text-2xl font-bold text-purple-300">Supernatural & Fantasy</h2>
              </div>
              <Carousel>
                {categories.supernatural.map((anime, index) => (
                  <div key={`supernatural-${index}`} className="flex-shrink-0 w-48">
                    <AnimeCard
                      anime={anime}
                      onViewDetails={() => anime._id && onViewAnimeDetail(anime._id as Id<"anime">)}
                      className="h-full"
                    />
                  </div>
                ))}
              </Carousel>
            </section>
          )}
        </div>

        {/* Empty State */}
        {totalAnime === 0 && (
          <div className="text-center py-20">
            <div className="text-blue-400 text-6xl mb-4">🎬</div>
            <h2 className="text-2xl font-bold text-blue-300 mb-2">No Bones Anime Found</h2>
            <p className="text-blue-200 mb-6">
              We couldn't find any Studio Bones anime at the moment.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default BonesPage; 