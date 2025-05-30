// src/components/animuse/onboarding/GenreStep.tsx - Advanced Artistic Version
import React, { useState, useEffect } from "react";
import StyledButton from "../shared/StyledButton";

const GENRES_OPTIONS = [
  { id: "action", label: "Action", emoji: "⚔️", color: "from-red-500 to-orange-500", description: "High-energy battles" },
  { id: "adventure", label: "Adventure", emoji: "🗺️", color: "from-green-500 to-teal-500", description: "Epic journeys" },
  { id: "comedy", label: "Comedy", emoji: "😂", color: "from-yellow-400 to-orange-400", description: "Laugh-out-loud fun" },
  { id: "drama", label: "Drama", emoji: "🎭", color: "from-purple-500 to-pink-500", description: "Emotional stories" },
  { id: "fantasy", label: "Fantasy", emoji: "🧙‍♂️", color: "from-purple-600 to-indigo-600", description: "Magical worlds" },
  { id: "horror", label: "Horror", emoji: "👻", color: "from-gray-800 to-red-900", description: "Spine-chilling tales" },
  { id: "isekai", label: "Isekai", emoji: "🌍", color: "from-blue-500 to-purple-500", description: "Another world" },
  { id: "josei", label: "Josei", emoji: "👩", color: "from-pink-400 to-rose-400", description: "Adult women stories" },
  { id: "mecha", label: "Mecha", emoji: "🤖", color: "from-gray-500 to-blue-600", description: "Giant robots" },
  { id: "mystery", label: "Mystery", emoji: "🔍", color: "from-indigo-600 to-purple-700", description: "Puzzles & secrets" },
  { id: "psychological", label: "Psychological", emoji: "🧠", color: "from-purple-700 to-indigo-800", description: "Mind-bending" },
  { id: "romance", label: "Romance", emoji: "💕", color: "from-pink-500 to-red-400", description: "Love stories" },
  { id: "sciFi", label: "Sci-Fi", emoji: "🚀", color: "from-cyan-500 to-blue-600", description: "Futuristic tech" },
  { id: "seinen", label: "Seinen", emoji: "👨", color: "from-blue-600 to-indigo-600", description: "Adult men stories" },
  { id: "shojo", label: "Shojo", emoji: "🌸", color: "from-pink-300 to-rose-400", description: "Young girls stories" },
  { id: "shonen", label: "Shonen", emoji: "💪", color: "from-orange-500 to-red-500", description: "Young boys stories" },
  { id: "sliceOfLife", label: "Slice of Life", emoji: "☕", color: "from-green-400 to-teal-400", description: "Everyday moments" },
  { id: "sports", label: "Sports", emoji: "⚽", color: "from-emerald-500 to-green-600", description: "Athletic competition" },
  { id: "supernatural", label: "Supernatural", emoji: "👁️", color: "from-purple-800 to-indigo-900", description: "Beyond reality" },
  { id: "thriller", label: "Thriller", emoji: "⚡", color: "from-red-600 to-orange-700", description: "Edge-of-seat suspense" },
];

interface GenreStepProps {
  data: { genres: string[] };
  updateData: (data: { genres: string[] }) => void;
}

// Genre Particle Animation
const GenreParticle: React.FC<{ genre: any; delay?: number }> = ({ genre, delay = 0 }) => (
  <div 
    className="absolute animate-ping"
    style={{ 
      animationDelay: `${delay}s`, 
      left: `${Math.random() * 100}%`, 
      top: `${Math.random() * 100}%`,
      animationDuration: `${2 + Math.random() * 2}s`
    }}
  >
    <span className="text-lg opacity-50">{genre.emoji}</span>
  </div>
);

export default function GenreStep({ data, updateData }: GenreStepProps) {
  const [hoveredGenre, setHoveredGenre] = useState<string | null>(null);
  const [particles, setParticles] = useState<any[]>([]);
  const [searchFilter, setSearchFilter] = useState("");

  useEffect(() => {
    // Generate particles based on selected genres
    const selectedGenres = GENRES_OPTIONS.filter(genre => data.genres.includes(genre.label));
    setParticles([...selectedGenres, ...selectedGenres]); // Double for more particles
  }, [data.genres]);

  const toggleGenre = (genre: string) => {
    const newGenres = data.genres.includes(genre)
      ? data.genres.filter((g) => g !== genre)
      : [...data.genres, genre];
    updateData({ genres: newGenres });
  };

  const filteredGenres = GENRES_OPTIONS.filter(genre => 
    genre.label.toLowerCase().includes(searchFilter.toLowerCase()) ||
    genre.description.toLowerCase().includes(searchFilter.toLowerCase())
  );

  const selectedCount = data.genres.length;

  return (
    <div className="relative min-h-[400px] space-y-6">
      {/* Floating Background Particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Base ambient effects */}
        <div className="absolute top-4 left-8 w-24 h-24 bg-gradient-to-br from-brand-primary-action/20 to-transparent rounded-full blur-xl animate-pulse"></div>
        <div className="absolute bottom-6 right-12 w-32 h-32 bg-gradient-to-tl from-brand-accent-gold/15 to-transparent rounded-full blur-xl animate-pulse delay-1000"></div>
        
        {/* Dynamic genre particles */}
        {particles.map((genre, index) => (
          <GenreParticle key={`${genre.id}-${index}`} genre={genre} delay={index * 0.2} />
        ))}
      </div>

      {/* Header Section */}
      <div className="text-center space-y-4">
        <div className="relative inline-block">
          <div className="absolute -inset-4 bg-gradient-to-r from-brand-primary-action/30 to-brand-accent-gold/30 rounded-2xl blur-lg opacity-60 animate-pulse"></div>
          <div className="relative bg-black/30 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
            <div className="flex items-center justify-center space-x-3 mb-3">
              <span className="text-3xl animate-bounce">🎭</span>
              <h3 className="text-2xl sm:text-3xl font-heading font-bold">
                <span className="bg-gradient-to-r from-brand-primary-action to-brand-accent-gold bg-clip-text text-transparent">
                  Favorite Genres?
                </span>
              </h3>
              <span className="text-3xl animate-bounce delay-200">✨</span>
            </div>
            <p className="text-white/80 text-sm sm:text-base leading-relaxed">
              Pick your most-loved story types for spot-on recommendations!
              <br />
              <span className="text-brand-accent-gold font-medium">Select as many as you like - variety is good!</span>
            </p>
          </div>
        </div>

        {/* Stats & Search */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          {/* Selection Counter */}
          {selectedCount > 0 && (
            <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-brand-primary-action/20 to-brand-accent-gold/20 backdrop-blur-sm rounded-full px-6 py-2 border border-white/10 animate-fade-in">
              <span className="text-lg">📊</span>
              <span className="text-white font-medium text-sm">
                {selectedCount} genre{selectedCount > 1 ? 's' : ''} selected
              </span>
            </div>
          )}

          {/* Search Filter */}
          <div className="relative">
            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
              <svg className="w-4 h-4 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Search genres..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="bg-black/40 backdrop-blur-sm border border-white/20 rounded-full pl-10 pr-4 py-2 text-white text-sm placeholder-white/60 focus:border-brand-primary-action focus:ring-2 focus:ring-brand-primary-action/50 focus:outline-none transition-all duration-300"
            />
          </div>
        </div>
      </div>

      {/* Genre Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
        {filteredGenres.map((genre, index) => {
          const isSelected = data.genres.includes(genre.label);
          const isHovered = hoveredGenre === genre.id;
          
          return (
            <div
              key={genre.id}
              className="relative group"
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              {/* Selection Glow */}
              <div className={`absolute -inset-1 bg-gradient-to-r ${genre.color} rounded-2xl blur-md transition-all duration-300 ${
                isSelected ? 'opacity-60 scale-105' : isHovered ? 'opacity-30' : 'opacity-0'
              }`}></div>
              
              {/* Genre Card */}
              <button
                onClick={() => toggleGenre(genre.label)}
                onMouseEnter={() => setHoveredGenre(genre.id)}
                onMouseLeave={() => setHoveredGenre(null)}
                className={`relative w-full p-3 rounded-2xl border transition-all duration-300 transform hover:scale-105 ${
                  isSelected 
                    ? `bg-gradient-to-br ${genre.color} border-white/30 text-white shadow-xl scale-102` 
                    : 'bg-black/40 backdrop-blur-sm border-white/10 hover:border-white/30 hover:bg-black/60 text-white/90'
                }`}
              >
                {/* Background Pattern */}
                <div className="absolute inset-0 opacity-10">
                  <div className="absolute inset-0 bg-gradient-to-br from-transparent via-white/5 to-transparent transform rotate-45"></div>
                </div>
                
                <div className="relative z-10 text-center space-y-1">
                  {/* Emoji with Animation */}
                  <div className={`text-2xl transition-transform duration-300 ${
                    isSelected ? 'animate-bounce' : isHovered ? 'animate-pulse scale-110' : ''
                  }`}>
                    {genre.emoji}
                  </div>
                  
                  {/* Label */}
                  <div className="font-medium text-xs">{genre.label}</div>
                  
                  {/* Description - Show on hover or selection */}
                  <div className={`text-xs leading-tight transition-all duration-300 ${
                    isSelected || isHovered ? 'opacity-100 max-h-10' : 'opacity-0 max-h-0'
                  }`}>
                    {genre.description}
                  </div>
                </div>
                
                {/* Selection Indicator */}
                {isSelected && (
                  <div className="absolute -top-1 -right-1 w-5 h-5 bg-white rounded-full border-2 border-current flex items-center justify-center animate-pulse">
                    <svg className="w-2.5 h-2.5 text-current" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" />
                    </svg>
                  </div>
                )}
              </button>
            </div>
          );
        })}
      </div>

      {/* Quick Selection Helpers */}
      {selectedCount === 0 && (
        <div className="text-center space-y-3">
          <p className="text-white/60 text-sm">Not sure where to start? Try these popular combinations:</p>
          <div className="flex flex-wrap gap-2 justify-center">
            {[
              { label: "Action Fan", genres: ["Action", "Adventure", "Shonen"] },
              { label: "Drama Lover", genres: ["Drama", "Romance", "Slice of Life"] },
              { label: "Fantasy Explorer", genres: ["Fantasy", "Isekai", "Adventure"] },
              { label: "Everything!", genres: ["Action", "Adventure", "Comedy", "Drama", "Fantasy"] }
            ].map((preset) => (
              <button
                key={preset.label}
                onClick={() => updateData({ genres: preset.genres })}
                className="bg-white/10 hover:bg-white/20 text-white text-xs px-3 py-1 rounded-full transition-colors duration-200 border border-white/20 hover:border-white/40"
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Genre Diversity Feedback */}
      {selectedCount >= 3 && (
        <div className="relative animate-fade-in">
          <div className="absolute -inset-2 bg-gradient-to-r from-green-500/20 to-emerald-400/20 rounded-2xl blur-lg opacity-60"></div>
          <div className="relative bg-gradient-to-r from-green-500/10 to-emerald-400/10 backdrop-blur-sm border border-green-500/20 rounded-2xl p-4">
            <div className="flex items-center justify-center space-x-3">
              <span className="text-2xl">🎯</span>
              <div className="text-center">
                <p className="text-white font-medium text-sm">
                  Perfect! Your diverse genre selection will help us find amazing recommendations.
                </p>
                <div className="flex flex-wrap gap-1 justify-center mt-2">
                  {data.genres.slice(0, 5).map((genre) => (
                    <span key={genre} className="text-xs bg-white/20 text-white rounded-full px-2 py-1">
                      {genre}
                    </span>
                  ))}
                  {data.genres.length > 5 && (
                    <span className="text-xs bg-white/20 text-white rounded-full px-2 py-1">
                      +{data.genres.length - 5} more
                    </span>
                  )}
                </div>
              </div>
              <span className="text-2xl">🌟</span>
            </div>
          </div>
        </div>
      )}

      {/* Custom CSS */}
      <style jsx>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        .animate-fade-in {
          animation: fade-in 0.5s ease-out forwards;
        }
        
        .scale-102 {
          transform: scale(1.02);
        }
      `}</style>
    </div>
  );
}