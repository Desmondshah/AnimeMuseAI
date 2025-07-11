// src/components/animuse/onboarding/ExperienceStep.tsx - Brutalist UI Version
import React, { useState, useEffect } from "react";
import StyledButton from "../shared/StyledButton";

const EXPERIENCE_LEVELS = [
  {
    id: "newbie",
    label: "NEWBIE",
    symbol: "▲",
    color: "#00FF00",
    description: "JUST STARTING",
    level: 1,
    badge: "SEEDLING",
    traits: ["CURIOUS", "FRESH", "OPEN"],
    recommendation: "ACCESSIBLE SERIES FOR BEGINNERS",
    accent: "#88FF88"
  },
  {
    id: "casual",
    label: "CASUAL",
    symbol: "■",
    color: "#0088FF",
    description: "ENTERTAINMENT FAN",
    level: 2,
    badge: "ENTHUSIAST", 
    traits: ["SELECTIVE", "BALANCED", "MAINSTREAM"],
    recommendation: "POPULAR HITS + HIDDEN GEMS",
    accent: "#88AAFF"
  },
  {
    id: "seasoned",
    label: "SEASONED",
    symbol: "⚡",
    color: "#8800FF",
    description: "GENRE EXPERT",
    level: 3,
    badge: "VETERAN",
    traits: ["ANALYTICAL", "DIVERSE", "INFORMED"],
    recommendation: "COMPLEX NARRATIVES + VARIETY",
    accent: "#AA88FF"
  },
  {
    id: "legend",
    label: "LEGEND",
    symbol: "★",
    color: "#FFAA00",
    description: "CULTURE MASTER",
    level: 4,
    badge: "OTAKU",
    traits: ["EXPERT", "PASSIONATE", "IMMERSED"],
    recommendation: "OBSCURE CLASSICS + AVANT-GARDE",
    accent: "#FFFF88"
  }
];

interface ExperienceStepProps {
  data: { experienceLevel: string };
  updateData: (data: { experienceLevel: string }) => void;
}

export default function ExperienceStep({ data, updateData }: ExperienceStepProps) {
  const [selectedExperience, setSelectedExperience] = useState<typeof EXPERIENCE_LEVELS[0] | null>(
    EXPERIENCE_LEVELS.find(exp => exp.label === data.experienceLevel) || null
  );

  const handleSelect = (experience: typeof EXPERIENCE_LEVELS[0]) => {
    setSelectedExperience(experience);
    updateData({ experienceLevel: experience.label });
  };

  return (
    <div className="brutalist-container min-h-screen bg-black text-white font-mono relative overflow-hidden">
      {/* BRUTAL GEOMETRIC BACKGROUND */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-2 bg-green-500"></div>
        <div className="absolute top-0 right-0 w-2 h-full bg-blue-500"></div>
        <div className="absolute bottom-0 left-0 w-full h-2 bg-purple-500"></div>
        <div className="absolute top-0 left-0 w-2 h-full bg-orange-500"></div>
        
        {/* HARSH DIAGONAL LINES */}
        <div className="absolute top-1/4 left-0 w-full h-1 bg-white transform rotate-3 opacity-20"></div>
        <div className="absolute top-3/4 left-0 w-full h-1 bg-green-500 transform -rotate-3 opacity-30"></div>
        
        {/* STARK GEOMETRIC SHAPES */}
        <div className="absolute top-16 right-16 w-24 h-24 bg-blue-500 transform rotate-45"></div>
        <div className="absolute bottom-20 left-8 w-20 h-20 bg-purple-500"></div>
        <div className="absolute top-1/2 right-1/6 w-10 h-28 bg-orange-500"></div>
      </div>

      {/* BRUTAL HEADER */}
      <div className="relative z-10 text-center pt-8 pb-6 border-b-4 border-white">
        <div className="bg-black border-4 border-white inline-block p-6 transform -rotate-1 shadow-[8px_8px_0px_0px_#00FF00]">
          <h1 className="text-4xl md:text-6xl font-black tracking-wider mb-2">
            EXPERIENCE
          </h1>
          <div className="w-full h-2 bg-gradient-to-r from-green-500 via-blue-500 to-purple-500"></div>
          <h2 className="text-xl md:text-2xl font-bold mt-2 text-orange-400">
            WHAT'S YOUR LEVEL?
          </h2>
        </div>
        
        {/* LEVEL INDICATOR - BRUTAL STYLE */}
        {selectedExperience && (
          <div className="mt-6 inline-block bg-orange-400 text-black font-black text-xl p-4 border-4 border-white transform rotate-1 shadow-[4px_4px_0px_0px_#000000]">
            LEVEL [{selectedExperience.level}/4] - {selectedExperience.badge}
          </div>
        )}
      </div>

      {/* EXPERIENCE CARDS - BRUTALIST LAYOUT */}
      <div className="relative z-10 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-h-96 overflow-y-auto brutalist-scrollbar">
          {EXPERIENCE_LEVELS.map((experience, index) => {
            const isSelected = selectedExperience?.id === experience.id;
            
            return (
              <button
                key={experience.id}
                onClick={() => handleSelect(experience)}
                className={`brutal-experience-card group relative border-4 p-6 font-black uppercase tracking-wide transform transition-all duration-100 ${
                  isSelected 
                    ? `bg-white text-black border-black shadow-[8px_8px_0px_0px_${experience.color}] -translate-x-1 -translate-y-1`
                    : `bg-black text-white border-white hover:shadow-[6px_6px_0px_0px_${experience.color}] hover:-translate-x-1 hover:-translate-y-1`
                }`}
                style={{
                  animationDelay: `${index * 0.1}s`,
                }}
              >
                {/* LEVEL BADGE */}
                <div className={`absolute -top-3 -right-3 w-12 h-12 border-4 border-black font-black text-lg flex items-center justify-center ${
                  isSelected ? 'bg-black text-white' : 'bg-white text-black'
                }`}>
                  {experience.level}
                </div>

                {/* BRUTAL SYMBOL */}
                <div 
                  className={`text-5xl mb-4 font-black ${isSelected ? 'text-black' : 'text-white'}`}
                  style={{ color: isSelected ? experience.color : experience.accent }}
                >
                  {experience.symbol}
                </div>
                
                {/* EXPERIENCE LABEL */}
                <div className="text-xl font-black leading-tight mb-2">
                  {experience.label}
                </div>
                
                {/* DESCRIPTION */}
                <div className="text-sm font-bold mb-4">
                  {experience.description}
                </div>

                {/* BADGE */}
                <div 
                  className={`text-xs font-black p-2 border-2 mb-4 ${
                    isSelected ? 'border-black bg-black text-white' : 'border-white bg-white text-black'
                  }`}
                >
                  {experience.badge}
                </div>
                
                {/* TRAITS - VISIBLE ON SELECT */}
                <div className={`transition-all duration-200 ${
                  isSelected ? 'opacity-100 max-h-40' : 'opacity-0 max-h-0 group-hover:opacity-100 group-hover:max-h-40'
                }`}>
                  <div className="text-xs font-bold mb-2">TRAITS:</div>
                  <div className="flex flex-wrap gap-1 mb-3">
                    {experience.traits.map((trait) => (
                      <span 
                        key={trait} 
                        className={`text-xs font-bold px-2 py-1 border ${
                          isSelected ? 'border-black bg-black text-white' : 'border-white bg-white text-black'
                        }`}
                      >
                        {trait}
                      </span>
                    ))}
                  </div>
                  <div className="text-xs font-bold">
                    → {experience.recommendation}
                  </div>
                </div>
                
                {/* SELECTION INDICATOR */}
                {isSelected && (
                  <div 
                    className="absolute -top-2 -left-2 w-8 h-8 border-4 border-white font-black text-sm flex items-center justify-center bg-black text-white"
                  >
                    ✓
                  </div>
                )}
                
                {/* CORNER ACCENT */}
                <div 
                  className="absolute bottom-0 right-0 w-6 h-6"
                  style={{ backgroundColor: isSelected ? experience.accent : experience.color }}
                ></div>
              </button>
            );
          })}
        </div>
      </div>

      {/* SELECTION FEEDBACK - BRUTAL */}
      {selectedExperience && (
        <div className="relative z-10 p-6">
          <div className="max-w-2xl mx-auto bg-green-500 text-black border-4 border-black p-6 transform -rotate-1 shadow-[12px_12px_0px_0px_#000000]">
            <div className="text-center">
              <div className="text-4xl font-black mb-3">
                {selectedExperience.symbol} LEVEL {selectedExperience.level} CONFIRMED
              </div>
              <div className="text-lg font-bold uppercase tracking-wide mb-4">
                {selectedExperience.badge} STATUS ACTIVATED
              </div>
              <div className="bg-black text-white p-4 font-bold text-sm border-4 border-white">
                STRATEGY: {selectedExperience.recommendation}
              </div>
              <div className="flex flex-wrap gap-2 justify-center mt-4">
                {selectedExperience.traits.map((trait) => (
                  <span key={trait} className="text-xs bg-black text-white font-bold px-3 py-2 border-2 border-white">
                    {trait}
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
        
        .brutal-experience-card {
          clip-path: polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 12px 100%, 0 calc(100% - 12px));
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
          background: #00ff00;
        }
        
        @keyframes brutal-pulse {
          0%, 100% { transform: scale(1) rotate(0deg); }
          50% { transform: scale(1.02) rotate(0.5deg); }
        }
        
        .brutal-experience-card:hover {
          animation: brutal-pulse 0.4s ease-in-out;
        }
        
        /* Disable smooth scrolling for brutal feel */
        * {
          scroll-behavior: auto !important;
        }
      `}</style>
    </div>
  );
}