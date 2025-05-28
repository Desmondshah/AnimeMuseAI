// src/components/animuse/onboarding/DislikedStep.tsx
import React from "react";
import StyledButton from "../shared/StyledButton";

// Using the same expanded genre list, or a slightly modified one if needed for dislikes
const GENRES_FOR_DISLIKE = ["Action", "Adventure", "Comedy", "Drama", "Ecchi", "Fantasy", "Harem", "Horror", "Isekai", "Josei", "Mecha", "Mystery", "Psychological", "Romance", "Sci-Fi", "Seinen", "Shojo", "Shonen", "Slice of Life", "Sports", "Supernatural", "Thriller"];

interface DislikedStepProps {
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

  return (
    <div className="text-center">
      <h3 className="text-xl sm:text-2xl font-heading text-brand-primary-action mb-2">
        Any Genres to Avoid?
      </h3>
      <p className="text-xs sm:text-sm text-brand-text-primary/70 mb-4 sm:mb-6">
        Knowing what you *don't* like is just as important for filtering your recommendations.
      </p>
      <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 gap-2 sm:gap-3 max-h-[200px] sm:max-h-[240px] overflow-y-auto pr-1">
        {GENRES_FOR_DISLIKE.map((genre) => (
          <StyledButton
            key={genre}
            onClick={() => toggleDislikedGenre(genre)}
            selected={data.dislikedGenres.includes(genre)}
            variant={data.dislikedGenres.includes(genre) ? "primary_small" : "secondary_small"}
            className="w-full py-2 text-xs" // Smaller text
          >
            {genre}
          </StyledButton>
        ))}
      </div>
      {/* Placeholder for disliked tags input - consider if this UI is needed or too complex for mobile onboarding */}
    </div>
  );
}