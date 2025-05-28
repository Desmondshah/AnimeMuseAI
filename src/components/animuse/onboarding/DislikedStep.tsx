// src/components/animuse/onboarding/DislikedStep.tsx
import React from "react";
import StyledButton from "../shared/StyledButton";

const GENRES_FOR_DISLIKE = ["Shonen", "Shojo", "Seinen", "Josei", "Slice of Life", "Mecha", "Isekai", "Fantasy", "Sci-Fi", "Romance", "Comedy", "Horror", "Mystery", "Ecchi", "Harem"];

interface DislikedStepProps {
  // Assuming dislikedTags might be added to schema and onboarding data
  data: { dislikedGenres: string[]; dislikedTags?: string[] }; 
  updateData: (data: { dislikedGenres: string[]; dislikedTags?: string[] }) => void;
}

export default function DislikedStep({ data, updateData }: DislikedStepProps) {
  const toggleDislikedGenre = (genre: string) => {
    const newDislikedGenres = data.dislikedGenres.includes(genre)
      ? data.dislikedGenres.filter((g) => g !== genre)
      : [...data.dislikedGenres, genre];
    updateData({ ...data, dislikedGenres: newDislikedGenres });
  };

  // Placeholder for disliked tags if you add it
  // const handleDislikedTagsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  //   const tags = e.target.value.split(',').map(tag => tag.trim()).filter(Boolean);
  //   updateData({ ...data, dislikedTags: tags });
  // };

  return (
    <div>
      <h3 className="text-xl font-orbitron text-neon-cyan mb-2 text-center">Any Genres to Avoid?</h3>
      {/* PHASE 1: Added subtext for clarity */}
      <p className="text-xs text-brand-text-secondary mb-4 text-center">
        Telling us what you *don't* like is just as important! This helps AniMuse avoid showing you things you'd rather skip.
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-60 overflow-y-auto p-1">
        {GENRES_FOR_DISLIKE.map((genre) => (
          <StyledButton
            key={genre}
            onClick={() => toggleDislikedGenre(genre)}
            variant={data.dislikedGenres.includes(genre) ? "primary_small" : "secondary_small"}
            className="w-full"
          >
            {genre}
          </StyledButton>
        ))}
      </div>
      {/* Placeholder for disliked tags input
      <div className="mt-4">
        <label htmlFor="dislikedTags" className="block text-sm font-medium text-brand-text-secondary mb-1">
            Specific Tags to Avoid (comma-separated, e.g., excessive gore, jump scares)
        </label>
        <input
            type="text"
            id="dislikedTags"
            name="dislikedTags"
            value={(data.dislikedTags || []).join(", ")}
            onChange={handleDislikedTagsChange}
            className="neumorphic-input w-full"
            placeholder="e.g., time loops, isekai (if not already a genre)"
        />
        <p className="text-xs text-brand-text-secondary mt-1">Helps filter out specific elements you don't enjoy.</p>
      </div>
      */}
    </div>
  );
}