// src/components/animuse/onboarding/ExperienceStep.tsx - Advanced Artistic Version
import React, { useState, useEffect } from "react";
import StyledButton from "../shared/StyledButton";

const EXPERIENCE_LEVELS = [
  {
    id: "newbie",
    label: "Newbie (Just starting!)",
    emoji: "🌱",
    color: "from-green-400 to-emerald-500",
    description: "Ready to explore the amazing world of anime",
    level: 1,
    badge: "Seedling Explorer",
    traits: ["Curious", "Open-minded", "Fresh perspective"],
    recommendation: "We'll start with accessible, popular series!"
  },
  {
    id: "casual",
    label: "Casual Viewer",
    emoji: "🎭",
    color: "from-blue-400 to-cyan-500",
    description: "Enjoying anime as entertainment",
    level: 2,
    badge: "Casual Enthusiast", 
    traits: ["Selective", "Balanced", "Mainstream taste"],
    recommendation: "Mix of popular hits and hidden gems!"
  },
  {
    id: "seasoned",
    label: "Seasoned Fan",
    emoji: "⚡",
    color: "from-purple-500 to-indigo-600",
    description: "Deep appreciation for the medium",
    level: 3,
    badge: "Anime Veteran",
    traits: ["Knowledgeable", "Analytical", "Genre-aware"],
    recommendation: "Diverse genres and deeper storytelling!"
  },
  {
    id: "legend",
    label: "Otaku Legend",
    emoji: "👑",
    color: "from-yellow-400 to-orange-500",
    description: "Living and breathing anime culture",
    level: 4,
    badge: "Master Otaku",
    traits: ["Expert", "Passionate", "Culture-immersed"],
    recommendation: "Obscure classics and avant-garde series!"
  }
];

interface ExperienceStepProps {
  data: { experienceLevel: string };
  updateData: (data: { experienceLevel: string }) => void;
}

// Floating Experience Orb
const ExperienceOrb: React.FC<{ 
  level: number; 
  delay?: number;
  size?: string;
}> = ({ level, delay = 0, size = "w-4 h-4" }) => {
  const orbs = ["✨", "⭐", "🌟", "💫"];
  const orb = orbs[(level - 1) % orbs.length];
  
  return (
    <div 
      className={`absolute animate-ping ${size} opacity-60`}
      style={{ 
        animationDelay: `${delay}s`, 
        left: `${Math.random() * 100}%`, 
        top: `${Math.random() * 100}%`,
        animationDuration: `${2 + Math.random() * 2}s`
      }}
    >
      <span className="text-lg">{orb}</span>
    </div>
  );
};

// Level Progress Bar
const LevelProgressBar: React.FC<{ currentLevel: number; maxLevel: number }> = ({ 
  currentLevel, 
  maxLevel 
}) => {
  return (
    <div className="relative w-full h-3 bg-black/40 rounded-full overflow-hidden backdrop-blur-sm border border-white/20">
      <div
        className="h-full bg-gradient-to-r from-brand-primary-action via-brand-accent-gold to-brand-accent-peach transition-all duration-1000 ease-out relative overflow-hidden"
        style={{ width: `${(currentLevel / maxLevel) * 100}%` }}
      >
        {/* Animated shine effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-pulse"></div>
      </div>
      
      {/* Level markers */}
      {Array.from({ length: maxLevel }, (_, i) => (
        <div
          key={i}
          className={`absolute top-0 bottom-0 w-0.5 ${
            i < currentLevel ? 'bg-white/60' : 'bg-white/20'
          }`}
          style={{ left: `${((i + 1) / maxLevel) * 100}%` }}
        />
      ))}
    </div>
  );
};

// Enhanced Experience Card
const ExperienceCard: React.FC<{
  experience: typeof EXPERIENCE_LEVELS[0];
  isSelected: boolean;
  onSelect: () => void;
  index: number;
}> = ({ experience, isSelected, onSelect, index }) => {
  const [isHovered, setIsHovered] = useState(false);
  
  return (
    <div 
      className="group relative transform transition-all duration-500 hover:scale-105"
      style={{ animationDelay: `${index * 150}ms` }}
    >
      {/* Card Glow Effect */}
      <div className={`absolute -inset-3 bg-gradient-to-r ${experience.color} rounded-3xl blur-xl transition-all duration-500 ${
        isSelected 
          ? 'opacity-80 scale-110' 
          : isHovered 
          ? 'opacity-40 scale-105' 
          : 'opacity-0'
      }`}></div>
      
      {/* Selection Ring */}
      {isSelected && (
        <div className="absolute -inset-1 bg-gradient-to-r from-white/60 to-white/30 rounded-3xl animate-pulse"></div>
      )}
      
      <button
        onClick={onSelect}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`relative w-full p-6 rounded-3xl border transition-all duration-500 transform focus:outline-none focus:ring-2 focus:ring-brand-primary-action/50 ${
          isSelected 
            ? `bg-gradient-to-br ${experience.color} border-white/40 text-white shadow-2xl scale-105` 
            : 'bg-black/40 backdrop-blur-sm border-white/20 hover:border-white/40 hover:bg-black/60 text-white/90'
        }`}
      >
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0 bg-gradient-to-br from-transparent via-white/10 to-transparent transform rotate-45"></div>
        </div>
        
        <div className="relative z-10 space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className={`text-4xl transition-transform duration-300 ${
                isSelected ? 'animate-bounce' : isHovered ? 'animate-pulse scale-110' : ''
              }`}>
                {experience.emoji}
              </div>
              <div className="text-left">
                <h4 className="font-heading font-bold text-lg">{experience.label}</h4>
                <p className="text-xs opacity-90">{experience.badge}</p>
              </div>
            </div>
            
            {/* Level Badge */}
            <div className={`w-10 h-10 rounded-full bg-gradient-to-r ${experience.color} flex items-center justify-center text-white font-bold shadow-lg`}>
              {experience.level}
            </div>
          </div>
          
          {/* Description */}
          <p className="text-sm leading-relaxed opacity-90">
            {experience.description}
          </p>
          
          {/* Traits */}
          <div className="flex flex-wrap gap-2">
            {experience.traits.map((trait, i) => (
              <span
                key={trait}
                className={`text-xs px-2 py-1 rounded-full border transition-all duration-300 ${
                  isSelected 
                    ? 'bg-white/20 border-white/40 text-white' 
                    : 'bg-white/10 border-white/20 text-white/80'
                } delay-${i * 100}`}
              >
                {trait}
              </span>
            ))}
          </div>
          
          {/* Recommendation Preview */}
          {(isSelected || isHovered) && (
            <div className="pt-3 border-t border-white/20 animate-fade-in">
              <p className="text-xs opacity-80 italic">
                💡 {experience.recommendation}
              </p>
            </div>
          )}
        </div>
        
        {/* Selection Indicator */}
        {isSelected && (
          <div className="absolute -top-2 -right-2 w-8 h-8 bg-white rounded-full border-4 border-current flex items-center justify-center animate-pulse shadow-lg">
            <svg className="w-4 h-4 text-current" fill="currentColor" viewBox="0 0 20 20">
              <path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" />
            </svg>
          </div>
        )}
      </button>
    </div>
  );
};

export default function ExperienceStep({ data, updateData }: ExperienceStepProps) {
  const [selectedExperience, setSelectedExperience] = useState<typeof EXPERIENCE_LEVELS[0] | null>(
    EXPERIENCE_LEVELS.find(exp => exp.label === data.experienceLevel) || null
  );
  const [particles, setParticles] = useState<number[]>([]);

  useEffect(() => {
    // Generate particles based on selected level
    if (selectedExperience) {
      setParticles(Array.from({ length: selectedExperience.level * 3 }, (_, i) => i));
    } else {
      setParticles([]);
    }
  }, [selectedExperience]);

  const handleSelect = (experience: typeof EXPERIENCE_LEVELS[0]) => {
    setSelectedExperience(experience);
    updateData({ experienceLevel: experience.label });
  };

  return (
    <div className="relative min-h-[600px] space-y-8">
      {/* Floating Background Particles - Reduced on mobile */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none experience-particles">
        {/* Base ambient effects */}
        <div className="absolute top-8 left-12 w-24 h-24 bg-gradient-to-br from-brand-primary-action/20 to-transparent rounded-full blur-xl animate-pulse"></div>
        <div className="absolute bottom-12 right-16 w-32 h-32 bg-gradient-to-tl from-brand-accent-gold/15 to-transparent rounded-full blur-xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-8 w-20 h-20 bg-gradient-to-r from-brand-accent-peach/12 to-transparent rounded-full blur-lg animate-pulse delay-2000"></div>
        
        {/* Dynamic experience particles */}
        {particles.map((particle, index) => (
          <ExperienceOrb 
            key={particle} 
            level={selectedExperience?.level || 1} 
            delay={index * 0.2}
            size={index % 3 === 0 ? "w-5 h-5" : "w-4 h-4"}
          />
        ))}
      </div>

      {/* Header Section */}
      <div className="text-center space-y-6">
        <div className="relative inline-block">
          <div className="absolute -inset-4 bg-gradient-to-r from-brand-primary-action/30 to-brand-accent-gold/30 rounded-2xl blur-lg opacity-60 animate-pulse"></div>
          <div className="relative bg-black/30 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
            <div className="flex items-center justify-center space-x-3 mb-3">
              <span className="text-3xl animate-bounce">🎯</span>
              <h3 className="text-2xl sm:text-3xl font-heading font-bold">
                <span className="bg-gradient-to-r from-brand-primary-action to-brand-accent-gold bg-clip-text text-transparent">
                  Your Anime Experience
                </span>
              </h3>
              <span className="text-3xl animate-bounce delay-200">⚡</span>
            </div>
            <p className="text-white/80 text-sm sm:text-base leading-relaxed">
              Help us understand your anime journey so far.
              <br />
              <span className="text-brand-accent-gold font-medium">Each level unlocks different recommendation styles!</span>
            </p>
          </div>
        </div>

        {/* Progress Indicator */}
        {selectedExperience && (
          <div className="max-w-md mx-auto space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-white/80">Experience Level</span>
              <span className="text-sm font-bold text-brand-accent-gold">
                {selectedExperience.level}/4
              </span>
            </div>
            <LevelProgressBar currentLevel={selectedExperience.level} maxLevel={4} />
            <p className="text-xs text-white/60">
              {selectedExperience.badge} Status Unlocked!
            </p>
          </div>
        )}
      </div>

      {/* Experience Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-4xl mx-auto">
        {EXPERIENCE_LEVELS.map((experience, index) => (
          <ExperienceCard
            key={experience.id}
            experience={experience}
            isSelected={selectedExperience?.id === experience.id}
            onSelect={() => handleSelect(experience)}
            index={index}
          />
        ))}
      </div>

      {/* Selected Experience Summary */}
      {selectedExperience && (
        <div className="relative animate-fade-in max-w-2xl mx-auto">
          <div className={`absolute -inset-3 bg-gradient-to-r ${selectedExperience.color} rounded-3xl blur-xl opacity-40 animate-pulse`}></div>
          <div className={`relative bg-gradient-to-r ${selectedExperience.color} bg-opacity-20 backdrop-blur-sm border border-white/30 rounded-3xl p-6`}>
            <div className="text-center space-y-4">
              <div className="flex items-center justify-center space-x-3">
                <span className="text-4xl animate-bounce">{selectedExperience.emoji}</span>
                <div>
                  <h4 className="text-xl font-heading text-white font-bold">
                    {selectedExperience.badge}
                  </h4>
                  <p className="text-white/80 text-sm">Level {selectedExperience.level} Anime Fan</p>
                </div>
                <span className="text-4xl animate-bounce delay-200">🎊</span>
              </div>
              
              <div className="bg-black/30 backdrop-blur-sm rounded-2xl p-4 border border-white/20">
                <h5 className="text-lg font-heading text-brand-accent-gold mb-2">
                  Personalization Strategy
                </h5>
                <p className="text-white/90 text-sm leading-relaxed">
                  {selectedExperience.recommendation}
                </p>
              </div>
              
              <div className="flex flex-wrap gap-2 justify-center">
                {selectedExperience.traits.map((trait) => (
                  <span
                    key={trait}
                    className="bg-white/20 backdrop-blur-sm border border-white/30 rounded-full px-3 py-1 text-white text-xs font-medium"
                  >
                    ✨ {trait}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Experience Benefits */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
        {EXPERIENCE_LEVELS.map((exp, index) => (
          <div 
            key={exp.id}
            className={`text-center p-4 rounded-2xl border transition-all duration-300 ${
              selectedExperience?.id === exp.id
                ? `bg-gradient-to-br ${exp.color} bg-opacity-20 border-white/40 scale-105`
                : 'bg-black/20 border-white/10 hover:bg-black/30 hover:border-white/20'
            }`}
          >
            <div className="text-2xl mb-2">{exp.emoji}</div>
            <h6 className="font-heading text-white font-medium text-sm mb-1">
              Level {exp.level}
            </h6>
            <p className="text-white/70 text-xs">
              {exp.badge}
            </p>
          </div>
        ))}
      </div>

      {/* Custom CSS for mobile optimization and animations */}
      <style jsx>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(15px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        .animate-fade-in {
          animation: fade-in 0.6s ease-out forwards;
        }

        /* Mobile and performance optimizations */
        @media (max-width: 768px), 
               (prefers-reduced-motion: reduce),
               .low-bandwidth,
               .mobile-device {
          .experience-particles > div:not(:first-child):not(:nth-child(2)):not(:nth-child(3)) {
            display: none !important;
          }
          
          .animate-pulse,
          .animate-bounce {
            animation-duration: 3s;
          }
          
          .blur-xl,
          .blur-lg {
            backdrop-filter: none;
            filter: blur(4px);
          }
        }

        /* iOS specific optimizations */
        @media (max-width: 768px) and (-webkit-min-device-pixel-ratio: 2) {
          .backdrop-blur-sm,
          .backdrop-blur-xl {
            backdrop-filter: none;
            background-color: rgba(0, 0, 0, 0.7);
          }
        }

        /* Reduced motion preferences */
        @media (prefers-reduced-motion: reduce) {
          .animate-bounce,
          .animate-pulse,
          .animate-ping {
            animation: none;
          }
          
          .transition-all,
          .transition-transform,
          .transition-opacity {
            transition: none;
          }
        }
      `}</style>
    </div>
  );
}