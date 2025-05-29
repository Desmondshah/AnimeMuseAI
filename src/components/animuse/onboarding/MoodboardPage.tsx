// src/components/animuse/MoodboardPage.tsx
import React, { useState, useEffect, useCallback, memo } from "react";
import { useQuery, useAction } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import StyledButton from "../shared/StyledButton";
import { toast } from "sonner";
import AnimeCard from "../AnimeCard"; // Renders poster + banner only
import { AnimeRecommendation } from "../../../../convex/types";
import { Id } from "../../../../convex/_generated/dataModel";

const MOOD_BOARD_CUES = [
  { id: "dark_gritty", label: "Dark & Gritty", emoji: "💀" }, { id: "heartwarming", label: "Heartwarming", emoji: "🥰" },
  { id: "epic_adventure", label: "Epic Adventure", emoji: "🗺️" }, { id: "mind_bending", label: "Mind-Bending", emoji: "🧠" },
  { id: "chill_vibes", label: "Chill Vibes", emoji: "😌" }, { id: "nostalgic", label: "Nostalgic", emoji: "⏳" },
  { id: "action_packed", label: "Action Packed", emoji: "💥" }, { id: "romantic", label: "Romantic", emoji: "💕" },
  { id: "comedic_relief", label: "Comedic Relief", emoji: "😂" }, { id: "thought_provoking", label: "Thought-Provoking", emoji: "🤔" },
];

interface MoodboardPageProps {
  navigateToDetail: (animeId: Id<"anime">) => void;
}

const LoadingSpinnerComponent: React.FC<{ message?: string; className?: string }> = ({ message = "Loading...", className = "" }) => (
    <div className={`flex flex-col justify-center items-center py-10 ${className}`}>
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-primary-action"></div>
      {message && <p className="mt-3 text-sm text-brand-text-primary/80">{message}</p>} {/* Text for light bg */}
    </div>
);
const LoadingSpinner = memo(LoadingSpinnerComponent);

const MoodboardPageComponent: React.FC<MoodboardPageProps> = ({ navigateToDetail }) => {
  const [selectedMoodCues, setSelectedMoodCues] = useState<string[]>([]);
  const [moodBoardRecommendations, setMoodBoardRecommendations] = useState<AnimeRecommendation[]>([]);
  const [isLoadingMoodBoard, setIsLoadingMoodBoard] = useState(false);
  
  const userProfile = useQuery(api.users.getMyUserProfile);
  const getRecommendationsByMoodTheme = useAction(api.ai.getRecommendationsByMoodTheme);

  const handleMoodCueToggle = useCallback((cueLabel: string) => {
    setSelectedMoodCues(prev => prev.includes(cueLabel) ? prev.filter(c => c !== cueLabel) : [...prev, cueLabel]);
  }, []);

  const fetchMoodBoardRecommendations = useCallback(async () => {
    if (selectedMoodCues.length === 0) {
      setMoodBoardRecommendations([]);
      return;
    }
    setIsLoadingMoodBoard(true);
    setMoodBoardRecommendations([]);
    try {
      const profileForAI = userProfile ? {
        name: userProfile.name, moods: userProfile.moods, genres: userProfile.genres, favoriteAnimes: userProfile.favoriteAnimes, experienceLevel: userProfile.experienceLevel, dislikedGenres: userProfile.dislikedGenres, dislikedTags: userProfile.dislikedTags, characterArchetypes: userProfile.characterArchetypes, tropes: userProfile.tropes, artStyles: userProfile.artStyles, narrativePacing: userProfile.narrativePacing
      } : undefined;
      const result = await getRecommendationsByMoodTheme({ selectedCues: selectedMoodCues, userProfile: profileForAI, count: 6, messageId: `moodpage-${Date.now()}`});
      if (result.error && result.error !== "OpenAI API key not configured.") {
        toast.error(`Mood board error: ${result.error.substring(0,100)}`);
      } else {
        setMoodBoardRecommendations(result.recommendations || []);
      }
    } catch (e: any) {
      toast.error(`Error fetching mood board: ${e.message}`);
    } finally {
      setIsLoadingMoodBoard(false);
    }
  }, [selectedMoodCues, userProfile, getRecommendationsByMoodTheme]);

  useEffect(() => {
    if (selectedMoodCues.length > 0) {
      fetchMoodBoardRecommendations();
    } else {
      setMoodBoardRecommendations([]);
    }
  }, [selectedMoodCues, fetchMoodBoardRecommendations]); // fetchMoodBoardRecommendations is stable due to useCallback

  return (
    <div className="bg-brand-surface text-brand-text-primary rounded-xl shadow-xl p-4 sm:p-6 space-y-6">
      <h1 className="text-2xl sm:text-3xl font-heading text-brand-primary-action text-center">
        🎨 Moodboard Discovery
      </h1>
      <p className="text-sm text-brand-text-primary/80 text-center mb-4 sm:mb-5">
        Select vibes to find anime that match your current mood!
      </p>
      <div className="flex flex-wrap justify-center gap-2 sm:gap-2.5 mb-5 sm:mb-6 p-3 bg-brand-accent-peach/10 rounded-lg">
        {MOOD_BOARD_CUES.map(cue => (
          <StyledButton 
            key={cue.id} 
            onClick={() => handleMoodCueToggle(cue.label)} 
            selected={selectedMoodCues.includes(cue.label)} 
            variant={selectedMoodCues.includes(cue.label) ? "primary_small" : "secondary_small"} 
            className="text-xs px-2.5 py-1.5 sm:px-3 sm:py-2"
          >
            {cue.emoji} {cue.label}
          </StyledButton>
        ))}
      </div>

      {isLoadingMoodBoard && <LoadingSpinner message="Brewing suggestions..." className="text-brand-text-primary/80" />}
      
      {!isLoadingMoodBoard && moodBoardRecommendations.length > 0 && (
        <div>
          <h3 className="text-lg sm:text-xl font-heading text-brand-accent-gold mb-3 text-center">
            Vibes for: {selectedMoodCues.join(" & ")}
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-3 gap-y-5 sm:gap-x-4 sm:gap-y-6">
            {moodBoardRecommendations.map((rec, index) => (
              <div key={`mood-${index}-${rec.title}`} className="flex flex-col items-center">
                <AnimeCard 
                  anime={rec} 
                  isRecommendation={true} 
                  onViewDetails={navigateToDetail}
                  className="w-full"
                />
                <h4 
                  className="mt-1.5 text-xs text-center text-brand-text-primary w-full truncate px-1"
                  title={rec.title}
                >
                  {rec.title}
                </h4>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {!isLoadingMoodBoard && selectedMoodCues.length > 0 && moodBoardRecommendations.length === 0 && (
          <div className="text-center p-4 mt-2 bg-brand-accent-peach/20 rounded-lg">
            <p className="text-sm text-brand-text-primary/80">No specific matches for these vibes. Try adjusting or selecting fewer cues!</p>
          </div>
       )}

      {!isLoadingMoodBoard && selectedMoodCues.length === 0 && (
          <div className="text-center p-6 mt-2 bg-brand-accent-peach/10 rounded-lg">
            <p className="text-base text-brand-text-primary/80">Select some mood cues above to get started!</p>
          </div>
      )}
    </div>
  );
};

export default memo(MoodboardPageComponent);
