// src/components/animuse/onboarding/MoodStep.tsx
import React from "react";
import StyledButton from "../shared/StyledButton";

const MOODS = ["Happy", "Sad", "Chill", "Dark", "Excited", "Nostalgic", "Thought-Provoking", "Intense", "Mysterious"]; // Added more options

interface MoodStepProps {
  data: { moods: string[] };
  updateData: (data: { moods: string[] }) => void;
}

export default function MoodStep({ data, updateData }: MoodStepProps) {
  const toggleMood = (mood: string) => {
    const newMoods = data.moods.includes(mood)
      ? data.moods.filter((m) => m !== mood)
      : [...data.moods, mood];
    updateData({ moods: newMoods });
  };

  return (
    <div className="text-center">
      <h3 className="text-xl sm:text-2xl font-heading text-brand-primary-action mb-2">
        What's your current vibe?
      </h3>
      <p className="text-xs sm:text-sm text-white/70 mb-4 sm:mb-6">
        Select one or more moods. This helps AniMuse understand the emotional tone you're looking for.
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3 max-h-[200px] sm:max-h-[240px] overflow-y-auto pr-1">
        {MOODS.map((mood) => (
          <StyledButton
            key={mood}
            onClick={() => toggleMood(mood)}
            // Use the 'selected' prop for clear visual distinction
            selected={data.moods.includes(mood)}
            variant={data.moods.includes(mood) ? "primary_small" : "secondary_small"}
            className="w-full py-2" // Ensure consistent padding
          >
            {mood}
          </StyledButton>
        ))}
      </div>
    </div>
  );
}