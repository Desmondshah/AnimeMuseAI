// src/components/animuse/onboarding/DislikedStep.tsx
import React from "react";
import StyledButton from "../shared/StyledButton";

// Re-use existing GENRES or define a new list if needed for disliked items
const GENRES_FOR_DISLIKE = ["Shonen", "Shojo", "Seinen", "Josei", "Slice of Life", "Mecha", "Isekai", "Fantasy", "Sci-Fi", "Romance", "Comedy", "Horror", "Mystery", "Ecchi", "Harem"];

interface DislikedStepProps {
  data: { dislikedGenres: string[] };
  updateData: (data: { dislikedGenres: string[] }) => void;
}

export default function DislikedStep({ data, updateData }: DislikedStepProps) {
  const toggleDislikedGenre = (genre: string) => {
    const newDislikedGenres = data.dislikedGenres.includes(genre)
      ? data.dislikedGenres.filter((g) => g !== genre)
      : [...data.dislikedGenres, genre];
    updateData({ dislikedGenres: newDislikedGenres });
  };

  return (
    <div>
      <h3 className="text-xl font-orbitron text-neon-cyan mb-4 text-center">Any Genres to Avoid?</h3>
      <p className="text-sm text-brand-text-secondary mb-6 text-center">
        Select genres you'd prefer not to see recommendations for. This helps us fine-tune suggestions.
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-60 overflow-y-auto p-1">
        {GENRES_FOR_DISLIKE.map((genre) => (
          <StyledButton
            key={genre}
            onClick={() => toggleDislikedGenre(genre)}
            variant={data.dislikedGenres.includes(genre) ? "primary" : "secondary"}
            className="w-full"
          >
            {genre}
          </StyledButton>
        ))}
      </div>
    </div>
  );
}