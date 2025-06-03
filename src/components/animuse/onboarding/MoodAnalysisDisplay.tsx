// components/MoodAnalysisDisplay.tsx
import React from 'react';

interface MoodAnalysis {
  energyLevel: number;
  complexityScore: number;
  categories: string[];
  primaryTone: string;
  dominantTheme: string;
  cueCount: number;
  isIntenseWeighted?: boolean;
  isSubtleWeighted?: boolean;
}

interface MoodAnalysisDisplayProps {
  analysis: MoodAnalysis;
  className?: string;
}

const MoodAnalysisDisplay: React.FC<MoodAnalysisDisplayProps> = ({
  analysis,
  className = ''
}) => {
  const getEnergyEmoji = (level: number) => {
    if (level <= 1) return '😴';
    if (level <= 2) return '😌';
    if (level <= 3) return '🙂';
    if (level <= 4) return '⚡';
    return '🔥';
  };

  const getComplexityEmoji = (score: number) => {
    if (score <= 1) return '🎈';
    if (score <= 2) return '🎯';
    if (score <= 3) return '🧩';
    if (score <= 4) return '🧠';
    return '🌀';
  };

  const getToneColor = (tone: string) => {
    switch (tone) {
      case 'dark/serious': return 'text-red-400';
      case 'uplifting/positive': return 'text-green-400';
      case 'intense/thrilling': return 'text-orange-400';
      case 'calm/reflective': return 'text-blue-400';
      default: return 'text-gray-400';
    }
  };

  return (
    <div className={`bg-black/20 backdrop-blur-sm border border-white/10 rounded-2xl p-4 ${className}`}>
      <h4 className="text-sm font-heading text-white mb-3 flex items-center gap-2">
        📊 Mood Analysis
        <span className="text-xs text-white/60">({analysis.cueCount} cues)</span>
      </h4>
      
      <div className="grid grid-cols-2 gap-3 text-xs">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-white/70">Energy Level:</span>
            <span className="flex items-center gap-1">
              <span>{getEnergyEmoji(analysis.energyLevel)}</span>
              <span className="text-brand-accent-gold">{analysis.energyLevel}/5</span>
            </span>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-white/70">Complexity:</span>
            <span className="flex items-center gap-1">
              <span>{getComplexityEmoji(analysis.complexityScore)}</span>
              <span className="text-brand-accent-gold">{analysis.complexityScore}/5</span>
            </span>
          </div>
        </div>
        
        <div className="space-y-2">
          <div>
            <span className="text-white/70">Primary Tone:</span>
            <div className={`font-medium capitalize ${getToneColor(analysis.primaryTone)}`}>
              {analysis.primaryTone.replace('/', ' / ')}
            </div>
          </div>
          
          <div>
            <span className="text-white/70">Categories:</span>
            <div className="text-white/90 font-medium">
              {analysis.categories.length}
            </div>
          </div>
        </div>
      </div>
      
      {analysis.dominantTheme && (
        <div className="mt-3 pt-3 border-t border-white/10">
          <span className="text-white/70 text-xs">Dominant Theme:</span>
          <div className="text-brand-accent-gold text-xs font-medium capitalize">
            {analysis.dominantTheme}
          </div>
        </div>
      )}
      
      {(analysis.isIntenseWeighted || analysis.isSubtleWeighted) && (
        <div className="mt-2 flex gap-1 text-xs">
          {analysis.isIntenseWeighted && (
            <span className="bg-red-500/20 text-red-300 px-2 py-0.5 rounded-full">
              High Intensity
            </span>
          )}
          {analysis.isSubtleWeighted && (
            <span className="bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full">
              Subtle Tones
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default MoodAnalysisDisplay;