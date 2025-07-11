// src/components/animuse/onboarding/GenreStep.tsx - Brutalist UI Version
import React, { useState, useEffect } from "react";
import StyledButton from "../shared/StyledButton";

const GENRES_OPTIONS = [
  { id: "action", label: "ACTION", symbol: "▲", color: "#FF0000", description: "HIGH-ENERGY BATTLES", accent: "#FFFF00" },
  { id: "adventure", label: "ADVENTURE", symbol: "●", color: "#00FF00", description: "EPIC JOURNEYS", accent: "#FF8800" },
  { id: "comedy", label: "COMEDY", symbol: "◆", color: "#FFFF00", description: "LAUGH-OUT-LOUD", accent: "#FF0088" },
  { id: "drama", label: "DRAMA", symbol: "■", color: "#FF00FF", description: "EMOTIONAL STORIES", accent: "#00FFFF" },
  { id: "fantasy", label: "FANTASY", symbol: "★", color: "#8800FF", description: "MAGICAL WORLDS", accent: "#FFFF00" },
  { id: "horror", label: "HORROR", symbol: "▼", color: "#000000", description: "SPINE-CHILLING", accent: "#FF0000" },
  { id: "isekai", label: "ISEKAI", symbol: "◯", color: "#0088FF", description: "ANOTHER WORLD", accent: "#FF88FF" },
  { id: "josei", label: "JOSEI", symbol: "▪", color: "#FF8888", description: "ADULT WOMEN", accent: "#88FF88" },
  { id: "mecha", label: "MECHA", symbol: "▣", color: "#888888", description: "GIANT ROBOTS", accent: "#FFFF88" },
  { id: "mystery", label: "MYSTERY", symbol: "?", color: "#440088", description: "PUZZLES & SECRETS", accent: "#88FFFF" },
  { id: "psychological", label: "PSYCH", symbol: "◈", color: "#660044", description: "MIND-BENDING", accent: "#FFAA00" },
  { id: "romance", label: "ROMANCE", symbol: "♥", color: "#FF4488", description: "LOVE STORIES", accent: "#88FF44" },
  { id: "sciFi", label: "SCI-FI", symbol: "▲", color: "#00AAFF", description: "FUTURISTIC TECH", accent: "#FF8800" },
  { id: "seinen", label: "SEINEN", symbol: "■", color: "#004488", description: "ADULT MEN", accent: "#88FF00" },
  { id: "shojo", label: "SHOJO", symbol: "✦", color: "#FF88AA", description: "YOUNG GIRLS", accent: "#88AAFF" },
  { id: "shonen", label: "SHONEN", symbol: "▲", color: "#FF4400", description: "YOUNG BOYS", accent: "#FFFF00" },
  { id: "sliceOfLife", label: "SLICE", symbol: "━", color: "#44AA44", description: "EVERYDAY", accent: "#FFAA44" },
  { id: "sports", label: "SPORTS", symbol: "○", color: "#00AA44", description: "ATHLETIC", accent: "#FF4444" },
  { id: "supernatural", label: "SUPER", symbol: "◐", color: "#220044", description: "BEYOND REALITY", accent: "#AAFF44" },
  { id: "thriller", label: "THRILLER", symbol: "⚡", color: "#AA2200", description: "SUSPENSE", accent: "#44AAFF" },
];

interface GenreStepProps {
  data: { genres: string[] };
  updateData: (data: { genres: string[] }) => void;
}

export default function GenreStep({ data, updateData }: GenreStepProps) {
  const [hoveredGenre, setHoveredGenre] = useState<string | null>(null);
  const [searchFilter, setSearchFilter] = useState("");
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 640);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

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
    <div className="brutalist-container min-h-screen bg-black text-white font-mono relative overflow-hidden">
      {/* BRUTAL GEOMETRIC BACKGROUND */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-2 bg-red-500"></div>
        <div className="absolute top-0 right-0 w-2 h-full bg-yellow-400"></div>
        <div className="absolute bottom-0 left-0 w-full h-2 bg-cyan-400"></div>
        <div className="absolute top-0 left-0 w-2 h-full bg-magenta-500"></div>
        
        {/* HARSH DIAGONAL LINES */}
        <div className="absolute top-1/4 left-0 w-full h-1 bg-white transform rotate-12 opacity-20"></div>
        <div className="absolute top-3/4 left-0 w-full h-1 bg-red-500 transform -rotate-12 opacity-30"></div>
        
        {/* STARK GEOMETRIC SHAPES */}
        <div className="absolute top-10 right-10 w-16 h-16 bg-yellow-400 transform rotate-45"></div>
        <div className="absolute bottom-20 left-8 w-12 h-12 bg-cyan-400"></div>
        <div className="absolute top-1/2 right-1/4 w-6 h-20 bg-magenta-500"></div>
      </div>

      {/* BRUTAL HEADER */}
      <div className="relative z-10 text-center pt-8 pb-6 border-b-4 border-white">
        <div className="bg-black border-4 border-white inline-block p-6 transform -rotate-1 shadow-[8px_8px_0px_0px_#FF0000]">
          <h1 className="text-4xl md:text-6xl font-black tracking-wider mb-2">
            GENRE
          </h1>
          <div className="w-full h-2 bg-gradient-to-r from-red-500 via-yellow-400 to-cyan-400"></div>
          <h2 className="text-xl md:text-2xl font-bold mt-2 text-yellow-400">
            SELECT YOUR POISON
          </h2>
        </div>
        
        {/* SELECTION COUNTER - BRUTAL STYLE */}
        {selectedCount > 0 && (
          <div className="mt-6 inline-block bg-red-500 text-black font-black text-xl p-4 border-4 border-white transform rotate-1 shadow-[4px_4px_0px_0px_#000000]">
            [{selectedCount}] SELECTED
          </div>
        )}
      </div>

      {/* SEARCH BAR - BRUTAL */}
      <div className="relative z-10 p-6 border-b-2 border-gray-600">
        <div className="max-w-md mx-auto relative">
          <input
            type="text"
            placeholder="SEARCH GENRES..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className="w-full bg-black border-4 border-white text-white text-xl font-bold p-4 placeholder-gray-400 focus:border-yellow-400 focus:outline-none uppercase tracking-widest shadow-[4px_4px_0px_0px_#FF0000]"
          />
          <div className="absolute right-2 top-1/2 transform -translate-y-1/2 text-2xl text-yellow-400">
            ▶
          </div>
        </div>
      </div>

      {/* GENRE GRID - BRUTALIST LAYOUT */}
      <div className="relative z-10 p-6">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 max-h-96 overflow-y-auto brutalist-scrollbar">
          {filteredGenres.map((genre, index) => {
            const isSelected = data.genres.includes(genre.label);
            
            return (
              <button
                key={genre.id}
                onClick={() => toggleGenre(genre.label)}
                className={`brutal-genre-card group relative border-4 p-4 font-black uppercase tracking-wide transform transition-all duration-100 ${
                  isSelected 
                    ? `bg-white text-black border-black shadow-[6px_6px_0px_0px_${genre.color}] -translate-x-1 -translate-y-1`
                    : `bg-black text-white border-white hover:shadow-[4px_4px_0px_0px_${genre.color}] hover:-translate-x-1 hover:-translate-y-1`
                }`}
                style={{
                  animationDelay: `${index * 0.02}s`,
                }}
              >
                {/* BRUTAL SYMBOL */}
                <div 
                  className={`text-3xl mb-2 font-black ${isSelected ? 'text-black' : 'text-white'}`}
                  style={{ color: isSelected ? genre.color : genre.accent }}
                >
                  {genre.symbol}
                </div>
                
                {/* GENRE LABEL */}
                <div className="text-sm font-black leading-tight mb-1">
                  {genre.label}
                </div>
                
                {/* DESCRIPTION - VISIBLE ON HOVER/SELECT */}
                <div className={`text-xs font-bold transition-all duration-200 ${
                  isSelected ? 'opacity-100 max-h-10' : 'opacity-0 max-h-0 group-hover:opacity-100 group-hover:max-h-10'
                }`}>
                  {genre.description}
                </div>
                
                {/* SELECTION INDICATOR */}
                {isSelected && (
                  <div 
                    className="absolute -top-2 -right-2 w-6 h-6 border-4 border-black font-black text-xs flex items-center justify-center"
                    style={{ backgroundColor: genre.accent }}
                  >
                    ✓
                  </div>
                )}
                
                {/* CORNER ACCENT */}
                <div 
                  className="absolute bottom-0 right-0 w-3 h-3"
                  style={{ backgroundColor: isSelected ? genre.accent : genre.color }}
                ></div>
              </button>
            );
          })}
        </div>
      </div>

      {/* QUICK PRESETS - BRUTAL STYLE */}
      {selectedCount === 0 && (
        <div className="relative z-10 p-6 border-t-4 border-red-500">
          <div className="text-center">
            <h3 className="text-2xl font-black mb-4 text-yellow-400 tracking-widest">
              QUICK SELECTION
            </h3>
            <div className="flex flex-wrap gap-4 justify-center">
              {[
                { label: "ACTION PACK", genres: ["ACTION", "ADVENTURE", "SHONEN"], color: "#FF0000" },
                { label: "FEEL ZONE", genres: ["DRAMA", "ROMANCE", "SLICE"], color: "#FF00FF" },
                { label: "WEIRD STUFF", genres: ["FANTASY", "ISEKAI", "SUPER"], color: "#00FF00" },
                { label: "EVERYTHING", genres: ["ACTION", "DRAMA", "COMEDY", "FANTASY", "ROMANCE"], color: "#FFFF00" }
              ].map((preset) => (
                <button
                  key={preset.label}
                  onClick={() => updateData({ genres: preset.genres })}
                  className="bg-black text-white border-4 border-white px-6 py-3 font-black text-sm uppercase tracking-wide hover:bg-white hover:text-black transition-all duration-100 shadow-[4px_4px_0px_0px_#000000] hover:shadow-none hover:translate-x-1 hover:translate-y-1"
                  style={{ borderColor: preset.color }}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* FEEDBACK MESSAGE - BRUTAL */}
      {selectedCount >= 3 && (
        <div className="relative z-10 p-6">
          <div className="max-w-md mx-auto bg-green-500 text-black border-4 border-black p-4 transform -rotate-1 shadow-[8px_8px_0px_0px_#000000]">
            <div className="text-center">
              <div className="text-3xl font-black mb-2">EXCELLENT!</div>
              <div className="text-sm font-bold uppercase tracking-wide">
                {selectedCount} GENRES LOCKED AND LOADED
              </div>
            </div>
          </div>
        </div>
      )}

      {/* BRUTAL CSS STYLES */}
      <style jsx>{`
        .brutalist-container {
          font-family: 'Courier New', monospace;
        }
        
        .brutal-genre-card {
          clip-path: polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px));
        }
        
        .brutalist-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        
        .brutalist-scrollbar::-webkit-scrollbar-track {
          background: #000;
          border: 2px solid #fff;
        }
        
        .brutalist-scrollbar::-webkit-scrollbar-thumb {
          background: #fff;
          border: 1px solid #000;
        }
        
        .brutalist-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #ff0000;
        }
        
        @keyframes brutal-pulse {
          0%, 100% { transform: scale(1) rotate(0deg); }
          50% { transform: scale(1.05) rotate(1deg); }
        }
        
        .brutal-genre-card:hover {
          animation: brutal-pulse 0.3s ease-in-out;
        }
        
        /* Disable smooth scrolling for brutal feel */
        * {
          scroll-behavior: auto !important;
        }
      `}</style>
    </div>
  );
}