// src/components/animuse/onboarding/MoodStep.tsx - Advanced Artistic Version
import React, { useState, useEffect } from "react";
import StyledButton from "../shared/StyledButton";

const MOODS_OPTIONS = [
  { id: "happy", label: "Happy", emoji: "😊", color: "from-yellow-400 to-orange-400", description: "Uplifting & joyful" },
  { id: "sad", label: "Sad", emoji: "😢", color: "from-blue-400 to-indigo-500", description: "Emotional & touching" },
  { id: "chill", label: "Chill", emoji: "😌", color: "from-green-400 to-teal-400", description: "Relaxed & peaceful" },
  { id: "dark", label: "Dark", emoji: "🌑", color: "from-gray-600 to-black", description: "Intense & mysterious" },
  { id: "excited", label: "Excited", emoji: "🤩", color: "from-pink-400 to-red-400", description: "Thrilling & energetic" },
  { id: "nostalgic", label: "Nostalgic", emoji: "⏳", color: "from-purple-400 to-pink-400", description: "Wistful & reflective" },
  { id: "thoughtProvoking", label: "Thought-Provoking", emoji: "🤔", color: "from-indigo-400 to-purple-500", description: "Deep & meaningful" },
  { id: "intense", label: "Intense", emoji: "🔥", color: "from-red-500 to-orange-600", description: "Powerful & gripping" },
  { id: "mysterious", label: "Mysterious", emoji: "🕵️", color: "from-purple-600 to-indigo-700", description: "Enigmatic & intriguing" },
];

interface MoodStepProps {
  data: { moods: string[] };
  updateData: (data: { moods: string[] }) => void;
}

// Floating Mood Particle
const MoodParticle: React.FC<{ mood: string; delay?: number }> = ({ mood, delay = 0 }) => {
  const moodEmojis: Record<string, string> = {
    happy: "✨", sad: "💫", chill: "🌸", dark: "⚡", excited: "🎆",
    nostalgic: "🍃", thoughtProvoking: "💭", intense: "🔥", mysterious: "🌟"
  };

  return (
    <div 
      className="absolute animate-ping"
      style={{ 
        animationDelay: `${delay}s`, 
        left: `${Math.random() * 100}%`, 
        top: `${Math.random() * 100}%`,
        animationDuration: `${3 + Math.random() * 2}s`
      }}
    >
      <span className="text-lg opacity-60">{moodEmojis[mood] || "✨"}</span>
    </div>
  );
};

export default function MoodStep({ data, updateData }: MoodStepProps) {
  const [hoveredMood, setHoveredMood] = useState<string | null>(null);
  const [particles, setParticles] = useState<string[]>([]);

  useEffect(() => {
    // Generate particles based on selected moods
    const selectedMoodIds = MOODS_OPTIONS.filter(mood => data.moods.includes(mood.label)).map(mood => mood.id);
    setParticles([...selectedMoodIds, ...selectedMoodIds, ...selectedMoodIds]); // Triple for more particles
  }, [data.moods]);

  const toggleMood = (mood: string) => {
    const newMoods = data.moods.includes(mood)
      ? data.moods.filter((m) => m !== mood)
      : [...data.moods, mood];
    updateData({ moods: newMoods });
  };

  const selectedCount = data.moods.length;

  return (
    <div className="relative min-h-[400px] space-y-8">
      {/* Floating Background Particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Base ambient particles */}
        <div className="absolute top-4 left-8 w-20 h-20 bg-gradient-to-br from-brand-accent-gold/20 to-transparent rounded-full blur-xl animate-pulse"></div>
        <div className="absolute bottom-6 right-12 w-24 h-24 bg-gradient-to-tl from-brand-primary-action/15 to-transparent rounded-full blur-xl animate-pulse delay-1000"></div>
        
        {/* Dynamic mood particles */}
        {particles.map((mood, index) => (
          <MoodParticle key={`${mood}-${index}`} mood={mood} delay={index * 0.3} />
        ))}
      </div>

      {/* Header Section */}
      <div className="text-center space-y-4">
        <div className="relative inline-block">
          <div className="absolute -inset-4 bg-gradient-to-r from-brand-accent-gold/30 to-brand-primary-action/30 rounded-2xl blur-lg opacity-60 animate-pulse"></div>
          <div className="relative bg-black/30 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
            <div className="flex items-center justify-center space-x-3 mb-3">
              <span className="text-3xl animate-bounce">😌</span>
              <h3 className="text-2xl sm:text-3xl font-heading font-bold">
                <span className="bg-gradient-to-r from-brand-primary-action to-brand-accent-gold bg-clip-text text-transparent">
                  What's your current vibe?
                </span>
              </h3>
              <span className="text-3xl animate-bounce delay-200">✨</span>
            </div>
            <p className="text-white/80 text-sm sm:text-base leading-relaxed">
              Select one or more moods that match how you're feeling right now.
              <br />
              <span className="text-brand-accent-gold font-medium">This helps AniMuse understand your emotional preferences.</span>
            </p>
          </div>
        </div>

        {/* Selection Counter */}
        {selectedCount > 0 && (
          <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-brand-primary-action/20 to-brand-accent-gold/20 backdrop-blur-sm rounded-full px-6 py-2 border border-white/10 animate-fade-in">
            <span className="text-lg">🎯</span>
            <span className="text-white font-medium text-sm">
              {selectedCount} mood{selectedCount > 1 ? 's' : ''} selected
            </span>
          </div>
        )}
      </div>

      {/* Mood Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
        {MOODS_OPTIONS.map((mood, index) => {
          const isSelected = data.moods.includes(mood.label);
          const isHovered = hoveredMood === mood.id;
          
          return (
            <div
              key={mood.id}
              className="relative group"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              {/* Selection Glow */}
              <div className={`absolute -inset-2 bg-gradient-to-r ${mood.color} rounded-2xl blur-lg transition-all duration-300 ${
                isSelected ? 'opacity-60 scale-105' : isHovered ? 'opacity-30' : 'opacity-0'
              }`}></div>
              
              {/* Mood Card */}
              <button
                onClick={() => toggleMood(mood.label)}
                onMouseEnter={() => setHoveredMood(mood.id)}
                onMouseLeave={() => setHoveredMood(null)}
                className={`relative w-full p-4 rounded-2xl border transition-all duration-300 transform hover:scale-105 ${
                  isSelected 
                    ? `bg-gradient-to-br ${mood.color} border-white/30 text-white shadow-2xl scale-105` 
                    : 'bg-black/40 backdrop-blur-sm border-white/10 hover:border-white/30 hover:bg-black/60 text-white/90'
                }`}
              >
                {/* Background Pattern */}
                <div className="absolute inset-0 opacity-10">
                  <div className="absolute inset-0 bg-gradient-to-br from-transparent via-white/5 to-transparent transform rotate-45"></div>
                </div>
                
                <div className="relative z-10 text-center space-y-2">
                  {/* Emoji with Animation */}
                  <div className={`text-3xl transition-transform duration-300 ${
                    isSelected ? 'animate-bounce' : isHovered ? 'animate-pulse scale-110' : ''
                  }`}>
                    {mood.emoji}
                  </div>
                  
                  {/* Label */}
                  <div className="font-medium text-sm">{mood.label}</div>
                  
                  {/* Description */}
                  <div className={`text-xs leading-relaxed transition-opacity duration-300 ${
                    isSelected || isHovered ? 'opacity-100' : 'opacity-70'
                  }`}>
                    {mood.description}
                  </div>
                </div>
                
                {/* Selection Indicator */}
                {isSelected && (
                  <div className="absolute -top-2 -right-2 w-6 h-6 bg-white rounded-full border-2 border-current flex items-center justify-center animate-pulse">
                    <svg className="w-3 h-3 text-current" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" />
                    </svg>
                  </div>
                )}
              </button>
            </div>
          );
        })}
      </div>

      {/* Mood Combination Suggestions */}
      {selectedCount > 1 && (
        <div className="relative animate-fade-in">
          <div className="absolute -inset-2 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-2xl blur-lg opacity-60"></div>
          <div className="relative bg-gradient-to-r from-purple-500/10 to-pink-500/10 backdrop-blur-sm border border-purple-500/20 rounded-2xl p-4">
            <div className="flex items-center justify-center space-x-3">
              <span className="text-2xl">🎭</span>
              <div className="text-center">
                <p className="text-white font-medium text-sm">
                  Great combo! Your mood blend will help us find the perfect anime atmosphere.
                </p>
                <div className="flex flex-wrap gap-1 justify-center mt-2">
                  {data.moods.map((mood, index) => (
                    <span key={mood} className="text-xs bg-white/20 text-white rounded-full px-2 py-1">
                      {mood}
                    </span>
                  ))}
                </div>
              </div>
              <span className="text-2xl">✨</span>
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
      `}</style>
    </div>
  );
}