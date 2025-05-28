// src/components/animuse/onboarding/FavoritesStep.tsx
import React, { useState } from "react";
import StyledButton from "../shared/StyledButton";

interface FavoritesStepProps {
  data: { favoriteAnimes: string[] };
  updateData: (data: { favoriteAnimes: string[] }) => void;
}

export default function FavoritesStep({ data, updateData }: FavoritesStepProps) {
  const [currentFavorite, setCurrentFavorite] = useState("");

  const addFavorite = () => {
    if (currentFavorite.trim() && !data.favoriteAnimes.includes(currentFavorite.trim()) && data.favoriteAnimes.length < 10) { // Limit to 10 favorites for brevity
      updateData({ favoriteAnimes: [...data.favoriteAnimes, currentFavorite.trim()] });
      setCurrentFavorite("");
    } else if (data.favoriteAnimes.length >= 10) {
        // Consider a toast message here if you have a toast system
        // toast.info("You can add up to 10 favorites.");
        alert("You can add up to 10 favorites for now.");
    }
  };

  const removeFavorite = (animeToRemove: string) => {
    updateData({ favoriteAnimes: data.favoriteAnimes.filter(anime => anime !== animeToRemove) });
  };

  return (
    <div className="flex flex-col h-full">
      <h3 className="text-xl sm:text-2xl font-heading text-brand-primary-action mb-3 text-center">
        All-Time Favorites?
      </h3>
      <p className="text-xs sm:text-sm text-brand-text-primary/70 mb-5 text-center">
        List a few anime you absolutely love (up to 10).
      </p>
      <div className="flex gap-2 mb-4">
        <input
          type="text"
          placeholder="e.g., Attack on Titan"
          value={currentFavorite}
          onChange={(e) => setCurrentFavorite(e.target.value)}
          className="form-input flex-grow text-sm" // Use form-input
        />
        <StyledButton onClick={addFavorite} variant="primary_small" className="flex-shrink-0 px-4">
          Add
        </StyledButton>
      </div>
      <div className="space-y-1.5 flex-grow overflow-y-auto pr-1 max-h-[120px] sm:max-h-[150px]"> {/* Added max-h */}
        {data.favoriteAnimes.map((anime) => (
          <div key={anime} className="flex justify-between items-center p-2 bg-brand-background/50 rounded text-brand-text-on-dark text-sm">
            <span className="truncate pr-2">{anime}</span>
            <button 
              onClick={() => removeFavorite(anime)} 
              className="text-brand-accent-peach hover:text-brand-primary-action text-xs font-semibold"
              aria-label={`Remove ${anime}`}
            >
              ✕
            </button>
          </div>
        ))}
        {data.favoriteAnimes.length === 0 && (
            <p className="text-xs text-center text-brand-text-primary/60 py-4">No favorites added yet.</p>
        )}
      </div>
    </div>
  );
}