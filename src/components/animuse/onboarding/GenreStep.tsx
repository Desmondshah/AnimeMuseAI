// src/components/animuse/onboarding/GenreStep.tsx
import React from "react";
import StyledButton from "../shared/StyledButton";

const GENRES = ["Action", "Adventure", "Comedy", "Drama", "Fantasy", "Horror", "Isekai", "Josei", "Mecha", "Mystery", "Psychological", "Romance", "Sci-Fi", "Seinen", "Shojo", "Shonen", "Slice of Life", "Sports", "Supernatural", "Thriller"]; // Expanded list

interface GenreStepProps {
  data: { genres: string[] };
  updateData: (data: { genres: string[] }) => void;
}

export default function GenreStep({ data, updateData }: GenreStepProps) {
  const toggleGenre = (genre: string) => {
    const newGenres = data.genres.includes(genre)
      ? data.genres.filter((g) => g !== genre)
      : [...data.genres, genre];
    updateData({ genres: newGenres });
  };
  return (
    <div className="text-center">
      <h3 className="text-xl sm:text-2xl font-heading text-brand-primary-action mb-2">
        Favorite Genres?
      </h3>
      <p className="text-xs sm:text-sm text-brand-text-primary/70 mb-4 sm:mb-6">
        Pick your most-loved story types. This is key for spot-on recommendations!
      </p>
      <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 gap-2 sm:gap-3 max-h-[200px] sm:max-h-[240px] overflow-y-auto pr-1">
        {GENRES.map((genre) => (
          <StyledButton
            key={genre}
            onClick={() => toggleGenre(genre)}
            selected={data.genres.includes(genre)}
            variant={data.genres.includes(genre) ? "primary_small" : "secondary_small"}
            className="w-full py-2 text-xs" // Smaller text for more items
          >
            {genre}
          </StyledButton>
        ))}
      </div>
    </div>
  );
}