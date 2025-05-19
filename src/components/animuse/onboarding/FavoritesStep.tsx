import React, { useState } from "react";
import StyledButton from "../shared/StyledButton";

interface FavoritesStepProps {
  data: { favoriteAnimes: string[] };
  updateData: (data: { favoriteAnimes: string[] }) => void;
}

export default function FavoritesStep({ data, updateData }: FavoritesStepProps) {
  const [currentFavorite, setCurrentFavorite] = useState("");

  const addFavorite = () => {
    if (currentFavorite.trim() && !data.favoriteAnimes.includes(currentFavorite.trim())) {
      updateData({ favoriteAnimes: [...data.favoriteAnimes, currentFavorite.trim()] });
      setCurrentFavorite("");
    }
  };

  const removeFavorite = (animeToRemove: string) => {
    updateData({ favoriteAnimes: data.favoriteAnimes.filter(anime => anime !== animeToRemove) });
  };

  return (
    <div>
      <h3 className="text-xl font-orbitron text-neon-cyan mb-4 text-center">Any All-Time Favorites?</h3>
      <p className="text-sm text-brand-text-secondary mb-6 text-center">List a few anime you absolutely love.</p>
      <div className="flex gap-2 mb-4">
        <input
          type="text"
          placeholder="e.g., Attack on Titan"
          value={currentFavorite}
          onChange={(e) => setCurrentFavorite(e.target.value)}
          className="neumorphic-input flex-grow"
        />
        <StyledButton onClick={addFavorite} variant="primary_small" className="flex-shrink-0">Add</StyledButton>
      </div>
      <div className="space-y-2 max-h-32 overflow-y-auto p-1">
        {data.favoriteAnimes.map((anime) => (
          <div key={anime} className="flex justify-between items-center p-2 bg-brand-dark rounded shadow-neumorphic-light-inset">
            <span className="text-sm">{anime}</span>
            <button onClick={() => removeFavorite(anime)} className="text-sakura-pink hover:text-red-500 text-xs">Remove</button>
          </div>
        ))}
      </div>
    </div>
  );
}
