// src/components/animuse/settings/ProfileSettingsPage.tsx
import React, { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Doc } from "../../../../convex/_generated/dataModel";
import StyledButton from "../shared/StyledButton";
import { toast } from "sonner";

// Re-using constants from onboarding steps for consistency if they are not exported
// It's better if these are exported from a shared constants file in a real app.
const MOODS_OPTIONS = ["Happy", "Sad", "Chill", "Dark", "Excited", "Nostalgic", "Thought-Provoking"];
const GENRES_OPTIONS = ["Shonen", "Shojo", "Seinen", "Josei", "Slice of Life", "Mecha", "Isekai", "Fantasy", "Sci-Fi", "Romance", "Comedy", "Horror", "Mystery"];
const DISLIKED_GENRES_OPTIONS = ["Shonen", "Shojo", "Seinen", "Josei", "Slice of Life", "Mecha", "Isekai", "Fantasy", "Sci-Fi", "Romance", "Comedy", "Horror", "Mystery", "Ecchi", "Harem"];
const EXPERIENCE_LEVELS_OPTIONS = ["Newbie (Just starting!)", "Casual Viewer", "Seasoned Fan", "Otaku Legend"];

interface ProfileSettingsPageProps {
  onBack: () => void;
}

// Define a type for the editable fields of the user profile.
// Exclude system fields and fields not meant to be edited here (e.g., userId, phone verification status).
type UserProfileForEdit = {
  name?: string;
  moods?: string[];
  genres?: string[];
  favoriteAnimes?: string[];
  experienceLevel?: string;
  dislikedGenres?: string[];
  dislikedTags?: string[]; 
  // avatarUrl could be added here if you implement avatar uploads/changes
};

export default function ProfileSettingsPage({ onBack }: ProfileSettingsPageProps) {
  const userProfile = useQuery(api.users.getMyUserProfile);
  const updateUserPreferences = useMutation(api.users.updateUserProfilePreferences);

  const [formData, setFormData] = useState<UserProfileForEdit>({});
  const [currentFavoriteAnime, setCurrentFavoriteAnime] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Populate form data when userProfile is loaded or changes
  useEffect(() => {
    if (userProfile) {
      setFormData({
        name: userProfile.name || "",
        moods: userProfile.moods || [],
        genres: userProfile.genres || [],
        favoriteAnimes: userProfile.favoriteAnimes || [],
        experienceLevel: userProfile.experienceLevel || "",
        dislikedGenres: userProfile.dislikedGenres || [],
        dislikedTags: userProfile.dislikedTags || [], 
      });
    }
  }, [userProfile]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const toggleArrayItem = (field: keyof Pick<UserProfileForEdit, "moods" | "genres" | "dislikedGenres" | "dislikedTags">, item: string) => {
    setFormData((prev: UserProfileForEdit) => {
      const currentArray = (prev[field] as string[] | undefined) || [];
      const newArray = currentArray.includes(item)
        ? currentArray.filter((i) => i !== item)
        : [...currentArray, item];
      return { ...prev, [field]: newArray };
    });
  };
  
  const addFavoriteAnime = () => {
    if (currentFavoriteAnime.trim() && !(formData.favoriteAnimes?.includes(currentFavoriteAnime.trim()))) {
      setFormData(prev => ({
        ...prev,
        favoriteAnimes: [...(prev.favoriteAnimes || []), currentFavoriteAnime.trim()]
      }));
      setCurrentFavoriteAnime("");
    }
  };

  const removeFavoriteAnime = (animeToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      favoriteAnimes: (prev.favoriteAnimes || []).filter(anime => anime !== animeToRemove)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    toast.loading("Saving your preferences...", { id: "profile-settings-save" });
    try {
      // Construct the object with only the fields that are part of UserProfileForEdit
      // and are defined in formData.
      const preferencesToUpdate: UserProfileForEdit = {
        name: formData.name,
        moods: formData.moods,
        genres: formData.genres,
        favoriteAnimes: formData.favoriteAnimes,
        experienceLevel: formData.experienceLevel,
        dislikedGenres: formData.dislikedGenres,
        dislikedTags: formData.dislikedTags,
      };
      await updateUserPreferences(preferencesToUpdate);
      toast.success("Preferences updated successfully!", { id: "profile-settings-save" });
      onBack(); 
    } catch (error: any) {
      console.error("Failed to update preferences:", error);
      toast.error(error.data?.message || error.message || "Could not save preferences.", { id: "profile-settings-save" });
    } finally {
      setIsSaving(false);
    }
  };

  if (userProfile === undefined) { // Changed from !userProfile to userProfile === undefined for loading state
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-neon-cyan"></div>
        <p className="ml-3 text-brand-text-secondary">Loading profile...</p>
      </div>
    );
  }
  if (userProfile === null) {
     return (
        <div className="text-center p-8 neumorphic-card">
            <h2 className="text-2xl font-orbitron text-sakura-pink mb-4">Profile Not Found</h2>
            <p className="text-brand-text-secondary mb-6">
            Could not load your profile. You might need to complete onboarding first.
            </p>
            <StyledButton onClick={onBack} variant="primary">Go Back</StyledButton>
        </div>
     );
  }


  return (
    <div className="p-4 sm:p-6 neumorphic-card max-w-2xl mx-auto">
      <div className="flex justify-between items-center mb-6 pb-4 border-b border-brand-dark">
        <h1 className="text-2xl sm:text-3xl font-orbitron text-sakura-pink">Profile Settings</h1>
        <StyledButton onClick={onBack} variant="secondary_small">
          &larr; Back
        </StyledButton>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Nickname */}
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-brand-text-secondary mb-1">
            Nickname
          </label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name || ""}
            onChange={handleInputChange}
            className="neumorphic-input w-full"
            placeholder="Your Nickname"
          />
        </div>

        {/* Moods */}
        <div>
          <h3 className="text-lg font-orbitron text-neon-cyan mb-2">Your Vibe (Moods)</h3>
          <p className="text-xs text-brand-text-secondary mb-3">Select moods that generally describe what you're looking for.</p>
          <div className="flex flex-wrap gap-2">
            {MOODS_OPTIONS.map((mood) => (
              <StyledButton
                type="button"
                key={mood}
                onClick={() => toggleArrayItem("moods", mood)}
                variant={(formData.moods || []).includes(mood) ? "primary_small" : "secondary_small"}
              >
                {mood}
              </StyledButton>
            ))}
          </div>
        </div>

        {/* Favorite Genres */}
        <div>
          <h3 className="text-lg font-orbitron text-neon-cyan mb-2">Favorite Genres</h3>
          <p className="text-xs text-brand-text-secondary mb-3">Pick the genres you enjoy the most.</p>
          <div className="flex flex-wrap gap-2">
            {GENRES_OPTIONS.map((genre) => (
              <StyledButton
                type="button"
                key={genre}
                onClick={() => toggleArrayItem("genres", genre)}
                variant={(formData.genres || []).includes(genre) ? "primary_small" : "secondary_small"}
              >
                {genre}
              </StyledButton>
            ))}
          </div>
        </div>
        
        {/* Disliked Genres */}
        <div>
          <h3 className="text-lg font-orbitron text-neon-cyan mb-2">Genres to Avoid</h3>
          <p className="text-xs text-brand-text-secondary mb-3">Select genres you'd prefer not to see recommendations for.</p>
          <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto p-1 rounded bg-brand-dark shadow-neumorphic-light-inset">
            {DISLIKED_GENRES_OPTIONS.map((genre) => (
              <StyledButton
                type="button"
                key={genre}
                onClick={() => toggleArrayItem("dislikedGenres", genre)}
                variant={(formData.dislikedGenres || []).includes(genre) ? "primary_small" : "secondary_small"}
              >
                {genre}
              </StyledButton>
            ))}
          </div>
        </div>

        {/* Favorite Animes */}
        <div>
          <h3 className="text-lg font-orbitron text-neon-cyan mb-2">All-Time Favorite Animes</h3>
          <p className="text-xs text-brand-text-secondary mb-3">List a few anime you absolutely love. This helps the AI understand your core tastes.</p>
           <div className="flex gap-2 mb-3">
            <input
              type="text"
              placeholder="e.g., Attack on Titan"
              value={currentFavoriteAnime}
              onChange={(e) => setCurrentFavoriteAnime(e.target.value)}
              className="neumorphic-input flex-grow"
            />
            <StyledButton type="button" onClick={addFavoriteAnime} variant="primary_small" className="flex-shrink-0">Add</StyledButton>
          </div>
          <div className="space-y-2 max-h-32 overflow-y-auto p-1 rounded bg-brand-dark shadow-neumorphic-light-inset">
            {(formData.favoriteAnimes || []).map((anime) => (
              <div key={anime} className="flex justify-between items-center p-2 bg-brand-surface rounded shadow-sm">
                <span className="text-sm">{anime}</span>
                <button type="button" onClick={() => removeFavoriteAnime(anime)} className="text-sakura-pink hover:text-red-500 text-xs">Remove</button>
              </div>
            ))}
          </div>
        </div>

        {/* Experience Level */}
        <div>
          <h3 className="text-lg font-orbitron text-neon-cyan mb-2">Anime Experience Level</h3>
          <p className="text-xs text-brand-text-secondary mb-3">How deep are you in the anime world?</p>
          <div className="space-y-2">
            {EXPERIENCE_LEVELS_OPTIONS.map((level) => (
              <StyledButton
                type="button"
                key={level}
                onClick={() => setFormData(prev => ({...prev, experienceLevel: level}))}
                variant={formData.experienceLevel === level ? "primary" : "secondary"}
                className="w-full"
              >
                {level}
              </StyledButton>
            ))}
          </div>
        </div>
        
        {/* Disliked Tags */}
        <div>
          <h3 className="text-lg font-orbitron text-neon-cyan mb-2">Tags to Avoid (Optional)</h3>
          <p className="text-xs text-brand-text-secondary mb-3">List specific tags or tropes you don't enjoy (comma-separated).</p>
           <input
            type="text"
            name="dislikedTags"
            value={(formData.dislikedTags || []).join(", ")}
            onChange={(e) => setFormData(prev => ({...prev, dislikedTags: e.target.value.split(',').map(t => t.trim()).filter(Boolean)}))}
            className="neumorphic-input w-full"
            placeholder="e.g., excessive gore, jump scares, love triangles"
          />
        </div>

        <div className="flex justify-end pt-4">
          <StyledButton type="submit" variant="primary" disabled={isSaving}>
            {isSaving ? "Saving..." : "Save Changes"}
          </StyledButton>
        </div>
      </form>
    </div>
  );
}
