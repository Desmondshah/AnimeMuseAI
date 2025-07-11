// src/components/animuse/onboarding/MoodStep.tsx - Brutalist UI Version
import React, { useState, useEffect } from "react";
import StyledButton from "../shared/StyledButton";

const MOODS_OPTIONS = [
  { id: "happy", label: "HAPPY", symbol: "▲", color: "#FFFF00", description: "UPLIFTING VIBES", accent: "#FF8800" },
  { id: "sad", label: "SAD", symbol: "▼", color: "#0088FF", description: "EMOTIONAL DEPTH", accent: "#88AAFF" },
  { id: "chill", label: "CHILL", symbol: "━", color: "#00AA44", description: "RELAXED MOOD", accent: "#88FF88" },
  { id: "dark", label: "DARK", symbol: "■", color: "#000000", description: "INTENSE SHADOW", accent: "#444444" },
  { id: "excited", label: "EXCITED", symbol: "★", color: "#FF0088", description: "HIGH ENERGY", accent: "#FFAA00" },
  { id: "nostalgic", label: "NOSTALGIC", symbol: "◐", color: "#8844AA", description: "WISTFUL MEMORY", accent: "#FFAAFF" },
  { id: "thoughtProvoking", label: "DEEP", symbol: "◆", color: "#444488", description: "MIND-BENDING", accent: "#AAAAFF" },
  { id: "intense", label: "INTENSE", symbol: "⚡", color: "#FF2200", description: "POWERFUL FORCE", accent: "#FFAA44" },
  { id: "mysterious", label: "MYSTERY", symbol: "?", color: "#662244", description: "ENIGMATIC", accent: "#AA66AA" },
];

interface MoodStepProps {
  data: { moods: string[] };
  updateData: (data: { moods: string[] }) => void;
}

export default function MoodStep({ data, updateData }: MoodStepProps) {
  const [hoveredMood, setHoveredMood] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 640);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const toggleMood = (mood: string) => {
    const newMoods = data.moods.includes(mood)
      ? data.moods.filter((m) => m !== mood)
      : [...data.moods, mood];
    updateData({ moods: newMoods });
  };

  const selectedCount = data.moods.length;

  return (
    <div className="brutalist-container min-h-screen bg-black text-white font-mono relative overflow-hidden">
      {/* BRUTAL GEOMETRIC BACKGROUND */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-2 bg-yellow-400"></div>
        <div className="absolute top-0 right-0 w-2 h-full bg-red-500"></div>
        <div className="absolute bottom-0 left-0 w-full h-2 bg-cyan-400"></div>
        <div className="absolute top-0 left-0 w-2 h-full bg-green-500"></div>
        
        {/* HARSH DIAGONAL LINES */}
        <div className="absolute top-1/3 left-0 w-full h-1 bg-white transform rotate-6 opacity-20"></div>
        <div className="absolute top-2/3 left-0 w-full h-1 bg-yellow-400 transform -rotate-6 opacity-30"></div>
        
        {/* STARK GEOMETRIC SHAPES */}
        <div className="absolute top-12 right-12 w-20 h-20 bg-red-500 transform rotate-45"></div>
        <div className="absolute bottom-16 left-6 w-16 h-16 bg-blue-500"></div>
        <div className="absolute top-1/2 right-1/5 w-8 h-24 bg-yellow-400"></div>
      </div>

      {/* BRUTAL HEADER */}
      <div className="relative z-10 text-center pt-8 pb-6 border-b-4 border-white">
        <div className="bg-black border-4 border-white inline-block p-6 transform -rotate-1 shadow-[8px_8px_0px_0px_#FFFF00]">
          <h1 className="text-4xl md:text-6xl font-black tracking-wider mb-2">
            MOOD
          </h1>
          <div className="w-full h-2 bg-gradient-to-r from-yellow-400 via-red-500 to-blue-500"></div>
          <h2 className="text-xl md:text-2xl font-bold mt-2 text-cyan-400">
            WHAT'S YOUR VIBE?
          </h2>
        </div>
        
        {/* SELECTION COUNTER - BRUTAL STYLE */}
        {selectedCount > 0 && (
          <div className="mt-6 inline-block bg-yellow-400 text-black font-black text-xl p-4 border-4 border-white transform rotate-1 shadow-[4px_4px_0px_0px_#000000]">
            [{selectedCount}] SELECTED
          </div>
        )}
      </div>

      {/* MOOD GRID - BRUTALIST LAYOUT */}
      <div className="relative z-10 p-6">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-4 max-h-96 overflow-y-auto brutalist-scrollbar">
          {MOODS_OPTIONS.map((mood, index) => {
            const isSelected = data.moods.includes(mood.label);
            
            return (
              <button
                key={mood.id}
                onClick={() => toggleMood(mood.label)}
                className={`brutal-mood-card group relative border-4 p-4 font-black uppercase tracking-wide transform transition-all duration-100 ${
                  isSelected 
                    ? `bg-white text-black border-black shadow-[6px_6px_0px_0px_${mood.color}] -translate-x-1 -translate-y-1`
                    : `bg-black text-white border-white hover:shadow-[4px_4px_0px_0px_${mood.color}] hover:-translate-x-1 hover:-translate-y-1`
                }`}
                style={{
                  animationDelay: `${index * 0.03}s`,
                }}
              >
                {/* BRUTAL SYMBOL */}
                <div 
                  className={`text-4xl mb-3 font-black ${isSelected ? 'text-black' : 'text-white'}`}
                  style={{ color: isSelected ? mood.color : mood.accent }}
                >
                  {mood.symbol}
                </div>
                
                {/* MOOD LABEL */}
                <div className="text-sm font-black leading-tight mb-2">
                  {mood.label}
                </div>
                
                {/* DESCRIPTION - VISIBLE ON HOVER/SELECT */}
                <div className={`text-xs font-bold transition-all duration-200 ${
                  isSelected ? 'opacity-100 max-h-10' : 'opacity-0 max-h-0 group-hover:opacity-100 group-hover:max-h-10'
                }`}>
                  {mood.description}
                </div>
                
                {/* SELECTION INDICATOR */}
                {isSelected && (
                  <div 
                    className="absolute -top-2 -right-2 w-6 h-6 border-4 border-black font-black text-xs flex items-center justify-center"
                    style={{ backgroundColor: mood.accent }}
                  >
                    ✓
                  </div>
                )}
                
                {/* CORNER ACCENT */}
                <div 
                  className="absolute bottom-0 right-0 w-4 h-4"
                  style={{ backgroundColor: isSelected ? mood.accent : mood.color }}
                ></div>
              </button>
            );
          })}
        </div>
      </div>

      {/* MOOD COMBINATION FEEDBACK - BRUTAL */}
      {selectedCount > 1 && (
        <div className="relative z-10 p-6">
          <div className="max-w-md mx-auto bg-cyan-400 text-black border-4 border-black p-4 transform -rotate-1 shadow-[8px_8px_0px_0px_#000000]">
            <div className="text-center">
              <div className="text-3xl font-black mb-2">MOOD BLEND!</div>
              <div className="text-sm font-bold uppercase tracking-wide">
                {selectedCount} VIBES COMBINED
              </div>
              <div className="flex flex-wrap gap-1 justify-center mt-2">
                {data.moods.map((mood) => (
                  <span key={mood} className="text-xs bg-black text-white font-bold px-2 py-1 border border-white">
                    {mood}
                  </span>
                ))}
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
        
        .brutal-mood-card {
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
          background: #ffff00;
        }
        
        @keyframes brutal-pulse {
          0%, 100% { transform: scale(1) rotate(0deg); }
          50% { transform: scale(1.05) rotate(1deg); }
        }
        
        .brutal-mood-card:hover {
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