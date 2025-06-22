import React, { useState, useEffect, useCallback } from "react";
import { useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { AnimeRecommendation } from "../../../convex/types";
import AnimeCard from "./AnimeCard";
import Carousel from "./shared/Carousel";
import { ArrowLeft } from "lucide-react";

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
      
      // If we got real data from database, use it; otherwise keep fallback
      if (animes.length > 0) {
        const organizedCategories = organizeAnimeIntoCategories(animes);
        setCategories(organizedCategories);
        console.log(`Successfully organized ${animes.length} Bones anime from database`);
      } else {
        console.log('No Bones anime found in database, using fallback data');
      }

    } catch (err) {
      console.error('Error fetching Bones anime:', err);
      setError(err instanceof Error ? err.message : 'Using fallback data due to fetch error');
    }
  }, [fetchBonesAnimeAction, organizeAnimeIntoCategories]);

  // Initialize with fallback data immediately, then fetch from database
  useEffect(() => {
    // Show fallback data instantly
    console.log('Loading Bones page with instant fallback data...');
    const fallbackCategories = organizeAnimeIntoCategories(FALLBACK_BONES_ANIME);
    setCategories(fallbackCategories);
    
    // Then fetch real data from database in background
    fetchBonesData();
  }, [fetchBonesData, organizeAnimeIntoCategories]);



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