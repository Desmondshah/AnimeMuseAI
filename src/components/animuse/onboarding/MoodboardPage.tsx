// In MoodboardPage.tsx - Updated to be more advanced and artistic

import React, { useState, useEffect, useCallback, memo } from "react";
import { useQuery, useAction } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import StyledButton from "../shared/StyledButton";
import { toast } from "sonner";
import AnimeCard from "../AnimeCard";
import { AnimeRecommendation } from "../../../../convex/types";
import { Id } from "../../../../convex/_generated/dataModel";

const MOOD_BOARD_CUES = [
  { id: "dark_gritty", label: "Dark & Gritty", emoji: "💀", color: "from-red-900 to-gray-900" }, 
  { id: "heartwarming", label: "Heartwarming", emoji: "🥰", color: "from-pink-500 to-rose-400" },
  { id: "epic_adventure", label: "Epic Adventure", emoji: "🗺️", color: "from-orange-500 to-amber-400" }, 
  { id: "mind_bending", label: "Mind-Bending", emoji: "🧠", color: "from-purple-600 to-indigo-500" },
  { id: "chill_vibes", label: "Chill Vibes", emoji: "😌", color: "from-cyan-400 to-blue-400" }, 
  { id: "nostalgic", label: "Nostalgic", emoji: "⏳", color: "from-yellow-400 to-orange-300" },
  { id: "action_packed", label: "Action Packed", emoji: "💥", color: "from-red-500 to-orange-500" }, 
  { id: "romantic", label: "Romantic", emoji: "💕", color: "from-pink-400 to-red-400" },
  { id: "comedic_relief", label: "Comedic Relief", emoji: "😂", color: "from-green-400 to-emerald-400" }, 
  { id: "thought_provoking", label: "Thought-Provoking", emoji: "🤔", color: "from-slate-400 to-gray-500" },
];

interface MoodboardPageProps {
  navigateToDetail: (animeId: Id<"anime">) => void;
  selectedMoodCues: string[];
  onMoodCuesChange: (cues: string[]) => void;
  moodBoardRecommendations: AnimeRecommendation[];
  onRecommendationsChange: (recs: AnimeRecommendation[]) => void;
  isLoadingMoodBoard: boolean;
  onLoadingChange: (loading: boolean) => void;
}

const LoadingSpinnerComponent: React.FC<{ message?: string; className?: string }> = ({ message = "Loading...", className = "" }) => (
    <div className={`flex flex-col justify-center items-center py-10 ${className}`}>
      <div className="relative">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-transparent border-t-brand-primary-action border-r-brand-accent-gold"></div>
        <div className="animate-ping absolute top-2 left-2 h-8 w-8 rounded-full bg-brand-primary-action opacity-20"></div>
      </div>
      {message && <p className="mt-4 text-base text-white/80 font-medium">{message}</p>}
    </div>
);
const LoadingSpinner = memo(LoadingSpinnerComponent);

const MoodboardPageComponent: React.FC<MoodboardPageProps> = ({ 
  navigateToDetail, 
  selectedMoodCues, 
  onMoodCuesChange, 
  moodBoardRecommendations, 
  onRecommendationsChange,
  isLoadingMoodBoard,
  onLoadingChange
}) => {
  const userProfile = useQuery(api.users.getMyUserProfile);
  const getRecommendationsByMoodTheme = useAction(api.ai.getRecommendationsByMoodTheme);

  const handleMoodCueToggle = useCallback((cueLabel: string) => {
    const newCues = selectedMoodCues.includes(cueLabel) 
      ? selectedMoodCues.filter(c => c !== cueLabel) 
      : [...selectedMoodCues, cueLabel];
    onMoodCuesChange(newCues);
  }, [selectedMoodCues, onMoodCuesChange]);

  const fetchMoodBoardRecommendations = useCallback(async () => {
    if (selectedMoodCues.length === 0) {
      onRecommendationsChange([]);
      return;
    }
    
    onLoadingChange(true);
    onRecommendationsChange([]);
    
    try {
      const profileForAI = userProfile ? {
        name: userProfile.name, 
        moods: userProfile.moods, 
        genres: userProfile.genres, 
        favoriteAnimes: userProfile.favoriteAnimes, 
        experienceLevel: userProfile.experienceLevel, 
        dislikedGenres: userProfile.dislikedGenres, 
        dislikedTags: userProfile.dislikedTags, 
        characterArchetypes: userProfile.characterArchetypes, 
        tropes: userProfile.tropes, 
        artStyles: userProfile.artStyles, 
        narrativePacing: userProfile.narrativePacing
      } : undefined;
      
      const result = await getRecommendationsByMoodTheme({ 
        selectedCues: selectedMoodCues, 
        userProfile: profileForAI, 
        count: 6, 
        messageId: `moodpage-${Date.now()}`
      });
      
      if (result.error && result.error !== "OpenAI API key not configured.") {
        toast.error(`Mood board error: ${result.error.substring(0,100)}`);
      } else {
        onRecommendationsChange(result.recommendations || []);
      }
    } catch (e: any) {
      toast.error(`Error fetching mood board: ${e.message}`);
    } finally {
      onLoadingChange(false);
    }
  }, [selectedMoodCues, userProfile, getRecommendationsByMoodTheme, onRecommendationsChange, onLoadingChange]);

  // Only fetch if we have mood cues but no recommendations yet
  useEffect(() => {
    if (selectedMoodCues.length > 0 && moodBoardRecommendations.length === 0 && !isLoadingMoodBoard) {
      fetchMoodBoardRecommendations();
    } else if (selectedMoodCues.length === 0) {
      onRecommendationsChange([]);
    }
  }, [selectedMoodCues, moodBoardRecommendations.length, isLoadingMoodBoard, fetchMoodBoardRecommendations, onRecommendationsChange]);

  return (
    <div className="relative min-h-screen">
      {/* Floating Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-64 h-64 bg-gradient-to-br from-brand-primary-action/10 to-transparent rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-32 right-16 w-96 h-96 bg-gradient-to-tr from-brand-accent-gold/10 to-transparent rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-gradient-to-r from-brand-accent-peach/5 to-transparent rounded-full blur-3xl animate-pulse delay-2000"></div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 px-4 sm:px-6 py-8 space-y-10">
        {/* Hero Section */}
        <div className="text-center space-y-6">
          <div className="inline-block">
            <h1 className="hero-title font-heading text-white font-bold bg-gradient-to-r from-white via-brand-accent-gold to-white bg-clip-text text-transparent animate-pulse">
  🎨 Moodboard Discovery
</h1>
            <div className="h-1 w-full bg-gradient-to-r from-transparent via-brand-primary-action to-transparent mt-4 animate-pulse"></div>
          </div>
          <p className="text-lg sm:text-xl text-white/80 max-w-2xl mx-auto leading-relaxed">
            Craft your perfect anime experience by selecting the vibes that resonate with your soul
          </p>
        </div>

        {/* Artistic Mood Selector */}
        <div className="relative">
  <div className="absolute inset-0 bg-gradient-to-r from-brand-primary-action/20 via-transparent to-brand-accent-gold/20 rounded-3xl blur-xl"></div>
  <div className="relative bg-black/30 backdrop-blur-sm border border-white/10 rounded-3xl p-6 sm:p-8">
    <h2 className="text-2xl sm:text-3xl font-heading text-white mb-6 text-center">Select Your Vibes</h2>
    
    {/* Updated grid for 2 columns on mobile */}
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
      {MOOD_BOARD_CUES.map(cue => {
        const isSelected = selectedMoodCues.includes(cue.label);
        return (
          <button
            key={cue.id}
            onClick={() => handleMoodCueToggle(cue.label)}
            className={`group relative overflow-hidden rounded-2xl p-3 sm:p-4 md:p-6 transition-all duration-300 transform hover:scale-105 ${
              isSelected 
                ? 'shadow-2xl shadow-brand-primary-action/50 scale-105' 
                : 'hover:shadow-xl hover:shadow-white/20'
            }`}
          >
            {/* Background Gradient */}
            <div className={`absolute inset-0 bg-gradient-to-br ${cue.color} ${
              isSelected ? 'opacity-80' : 'opacity-40'
            } transition-opacity duration-300`}></div>
            
            {/* Selected Ring */}
            {isSelected && (
              <div className="absolute inset-0 ring-2 ring-white/60 rounded-2xl animate-pulse"></div>
            )}
            
            {/* Content */}
            <div className="relative z-10 text-center space-y-1 sm:space-y-2">
              <div className={`text-2xl sm:text-3xl md:text-4xl transition-transform duration-300 ${
                isSelected ? 'animate-bounce' : 'group-hover:animate-pulse'
              }`}>
                {cue.emoji}
              </div>
              <div className={`text-xs sm:text-sm font-medium transition-colors duration-300 leading-tight ${
                isSelected ? 'text-white' : 'text-white/90'
              }`}>
                {cue.label}
              </div>
            </div>
            
            {/* Hover Effect */}
            <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl"></div>
          </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Selected Vibes Display */}
        {selectedMoodCues.length > 0 && (
          <div className="text-center space-y-4">
            <div className="inline-flex items-center space-x-2 bg-black/30 backdrop-blur-sm rounded-full px-6 py-3 border border-white/20">
              <span className="text-white/80 text-sm">Selected Vibes:</span>
              <div className="flex flex-wrap gap-2">
                {selectedMoodCues.map((cue, index) => (
                  <span key={cue} className="text-brand-accent-gold font-medium text-sm">
                    {cue}{index < selectedMoodCues.length - 1 ? ' •' : ''}
                  </span>
                ))}
              </div>
            </div>
            <StyledButton 
              onClick={fetchMoodBoardRecommendations} 
              variant="ghost"
              disabled={isLoadingMoodBoard}
              className="!text-sm !bg-white/10 !backdrop-blur-sm !border-white/20 hover:!bg-white/20 !text-white"
            >
              {isLoadingMoodBoard ? "✨ Brewing Magic..." : "🔄 Refresh Recommendations"}
            </StyledButton>
          </div>
        )}

        {/* Loading State */}
        {isLoadingMoodBoard && (
          <div className="text-center py-16">
            <LoadingSpinner message="Conjuring the perfect anime vibes..." className="text-white" />
          </div>
        )}
        
        {/* Results Section */}
        {!isLoadingMoodBoard && moodBoardRecommendations.length > 0 && (
  <div className="space-y-8">
    <div className="text-center">
      <h3 className="text-3xl sm:text-4xl font-heading text-white mb-2">
        Your Curated Collection
      </h3>
      <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-brand-primary-action/20 to-brand-accent-gold/20 rounded-full px-6 py-2 backdrop-blur-sm border border-white/10">
        <span className="text-white/80 text-sm">Vibes:</span>
        <span className="text-brand-accent-gold font-medium text-sm">
          {selectedMoodCues.join(" × ")}
        </span>
      </div>
    </div>
    
    {/* Updated grid for 2 columns on mobile */}
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4 md:gap-6">
      {moodBoardRecommendations.map((rec, index) => (
        <div 
          key={`mood-${index}-${rec.title}`} 
          className="group relative transform transition-all duration-500 hover:scale-105"
          style={{ animationDelay: `${index * 100}ms` }}
        >
          {/* Glow Effect */}
          <div className="absolute -inset-1 sm:-inset-2 bg-gradient-to-r from-brand-primary-action/30 to-brand-accent-gold/30 rounded-2xl blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          
          <div className="relative bg-black/20 backdrop-blur-sm rounded-2xl overflow-hidden border border-white/10 group-hover:border-white/30 transition-all duration-300">
            <AnimeCard 
              anime={rec} 
              isRecommendation={true} 
              onViewDetails={navigateToDetail}
              className="w-full"
            />
            <div className="p-2 sm:p-3 bg-gradient-to-t from-black/80 to-transparent">
              <h4 
                className="text-xs sm:text-sm font-medium text-white text-center leading-tight"
                style={{
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                  lineHeight: '1.2',
                  maxHeight: '2.4em',
                }}
                title={rec.title}
              >
                {rec.title || "Unknown Title"}
              </h4>
            </div>
          </div>
        </div>
      ))}
    </div>
  </div>
)}
        
        {/* Empty States */}
        {!isLoadingMoodBoard && selectedMoodCues.length > 0 && moodBoardRecommendations.length === 0 && (
          <div className="text-center py-16">
            <div className="bg-black/30 backdrop-blur-sm rounded-3xl p-8 border border-white/10 max-w-md mx-auto">
              <div className="text-6xl mb-4">🎭</div>
              <h3 className="text-xl font-heading text-white mb-2">No Perfect Matches</h3>
              <p className="text-white/70 text-sm mb-4">
                Your selected vibes are quite unique! Try adjusting your selection or exploring different combinations.
              </p>
              <StyledButton 
                onClick={() => onMoodCuesChange([])} 
                variant="ghost"
                className="!text-sm !bg-white/10 !backdrop-blur-sm !border-white/20 hover:!bg-white/20 !text-white"
              >
                🎯 Reset & Try Again
              </StyledButton>
            </div>
          </div>
        )}

        {!isLoadingMoodBoard && selectedMoodCues.length === 0 && (
          <div className="text-center py-16">
            <div className="bg-black/30 backdrop-blur-sm rounded-3xl p-8 border border-white/10 max-w-lg mx-auto">
              <div className="text-8xl mb-6 animate-bounce">🎨</div>
              <h3 className="text-2xl font-heading text-white mb-4">Create Your Mood Canvas</h3>
              <p className="text-white/80 text-lg leading-relaxed">
                Select the emotional vibes above to discover anime that perfectly match your current state of mind.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default memo(MoodboardPageComponent);