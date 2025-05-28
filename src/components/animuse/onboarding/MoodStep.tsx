// src/components/animuse/onboarding/MoodStep.tsx
import React from "react";
import StyledButton from "../shared/StyledButton";

const MOODS = ["Happy", "Sad", "Chill", "Dark", "Excited", "Nostalgic", "Thought-Provoking"];

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
    <div>
      <h3 className="text-xl font-orbitron text-neon-cyan mb-2 text-center">What's your current vibe?</h3>
      {/* PHASE 1: Added subtext for clarity */}
      <p className="text-xs text-brand-text-secondary mb-4 text-center">
        This helps AniMuse understand the kind of atmosphere or emotional tone you're looking for in an anime right now.
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {MOODS.map((mood) => (
          <StyledButton
            key={mood}
            onClick={() => toggleMood(mood)}
            variant={data.moods.includes(mood) ? "primary" : "secondary"}
            className="w-full"
          >
            {mood}
          </StyledButton>
        ))}
      </div>
    </div>
  );
}