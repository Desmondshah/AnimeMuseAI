import React from "react";
import StyledButton from "../shared/StyledButton";

const GENRES = ["Shonen", "Shojo", "Seinen", "Josei", "Slice of Life", "Mecha", "Isekai", "Fantasy", "Sci-Fi", "Romance", "Comedy", "Horror", "Mystery"];

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
    <div>
      <h3 className="text-xl font-orbitron text-neon-cyan mb-4 text-center">Favorite Genres?</h3>
      <p className="text-sm text-brand-text-secondary mb-6 text-center">Pick your preferred anime genres.</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {GENRES.map((genre) => (
          <StyledButton
            key={genre}
            onClick={() => toggleGenre(genre)}
            variant={data.genres.includes(genre) ? "primary" : "secondary"}
            className="w-full"
          >
            {genre}
          </StyledButton>
        ))}
      </div>
    </div>
  );
}
