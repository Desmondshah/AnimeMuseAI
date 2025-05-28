// src/components/animuse/onboarding/ProfileSettingsPage.tsx
import React, { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Doc } from "../../../../convex/_generated/dataModel";
import StyledButton from "../shared/StyledButton";
import { toast } from "sonner";

const MOODS_OPTIONS = ["Happy", "Sad", "Chill", "Dark", "Excited", "Nostalgic", "Thought-Provoking"];
const GENRES_OPTIONS = ["Shonen", "Shojo", "Seinen", "Josei", "Slice of Life", "Mecha", "Isekai", "Fantasy", "Sci-Fi", "Romance", "Comedy", "Horror", "Mystery"];
const DISLIKED_GENRES_OPTIONS = [...GENRES_OPTIONS, "Ecchi", "Harem"]; // More options for dislike
const EXPERIENCE_LEVELS_OPTIONS = ["Newbie (Just starting!)", "Casual Viewer", "Seasoned Fan", "Otaku Legend"];

// Phase 2: Options for new granular preferences
const CHARACTER_ARCHETYPES_OPTIONS = ["Tsundere", "Kuudere", "Dandere", "Yandere", "Genki Girl", "Stoic Hero", "Anti-Hero", "Mentor Figure"];
const TROPES_OPTIONS = ["Found Family", "Time Loop", "Tournament Arc", "Redemption Arc", "Chosen One", "Love Triangle", "Hidden Identity"];
const ART_STYLES_OPTIONS = ["Retro (80s/90s)", "Modern Cel-Shaded", "Photorealistic", "Chibi", "Minimalist", "Ghibli-esque"];
const NARRATIVE_PACING_OPTIONS = ["Slow Burn", "Episodic", "Fast-Paced", "Medium Paced"];


interface ProfileSettingsPageProps {
  onBack: () => void;
}

type UserProfileForEdit = {
  name?: string;
  moods?: string[];
  genres?: string[];
  favoriteAnimes?: string[];
  experienceLevel?: string;
  dislikedGenres?: string[];
  dislikedTags?: string[]; 
  // Phase 2: New fields
  characterArchetypes?: string[];
  tropes?: string[];
  artStyles?: string[];
  narrativePacing?: string;
  watchlistIsPublic?: boolean;
};

export default function ProfileSettingsPage({ onBack }: ProfileSettingsPageProps) {
  const userProfile = useQuery(api.users.getMyUserProfile);
  const updateUserPreferences = useMutation(api.users.updateUserProfilePreferences);
  // Phase 2: Mutation to set watchlist privacy globally
  const setWatchlistPrivacyMutation = useMutation(api.users.setWatchlistPrivacy);


  const [formData, setFormData] = useState<UserProfileForEdit>({});
  const [currentFavoriteAnime, setCurrentFavoriteAnime] = useState("");
  const [isSaving, setIsSaving] = useState(false);

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
        // Phase 2: Populate new fields
        characterArchetypes: userProfile.characterArchetypes || [],
        tropes: userProfile.tropes || [],
        artStyles: userProfile.artStyles || [],
        narrativePacing: userProfile.narrativePacing || "",
        watchlistIsPublic: userProfile.watchlistIsPublic || false,
      });
    }
  }, [userProfile]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    // @ts-ignore
    const isCheckbox = type === 'checkbox';
     // @ts-ignore
    setFormData((prev) => ({ ...prev, [name]: isCheckbox ? e.target.checked : value }));
  };

  const toggleArrayItem = (field: keyof Pick<UserProfileForEdit, "moods" | "genres" | "dislikedGenres" | "dislikedTags" | "characterArchetypes" | "tropes" | "artStyles">, item: string) => {
    setFormData((prev: UserProfileForEdit) => {
      const currentArray = (prev[field] as string[] | undefined) || [];
      const newArray = currentArray.includes(item)
        ? currentArray.filter((i) => i !== item)
        : [...currentArray, item];
      return { ...prev, [field]: newArray };
    });
  };
  
  const addFavoriteAnime = () => { /* ... */ };
  const removeFavoriteAnime = (animeToRemove: string) => { /* ... */ };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    toast.loading("Saving preferences...", { id: "profile-settings-save" });
    try {
      const preferencesToUpdate: UserProfileForEdit = {
        name: formData.name,
        moods: formData.moods,
        genres: formData.genres,
        favoriteAnimes: formData.favoriteAnimes,
        experienceLevel: formData.experienceLevel,
        dislikedGenres: formData.dislikedGenres,
        dislikedTags: formData.dislikedTags,
        characterArchetypes: formData.characterArchetypes,
        tropes: formData.tropes,
        artStyles: formData.artStyles,
        narrativePacing: formData.narrativePacing,
        watchlistIsPublic: formData.watchlistIsPublic,
      };
      await updateUserPreferences(preferencesToUpdate);
      // Note: watchlistIsPublic is part of the general preferences update now.
      // If you wanted a separate button for it, you'd call setWatchlistPrivacyMutation.
      toast.success("Preferences updated!", { id: "profile-settings-save" });
      onBack(); 
    } catch (error: any) {
      toast.error(error.data?.message || error.message || "Could not save.", { id: "profile-settings-save" });
    } finally {
      setIsSaving(false);
    }
  };
  
  // Phase 2: Handler for watchlist privacy toggle if it were a separate button
  const handleWatchlistPrivacyToggle = async () => {
      if (formData.watchlistIsPublic === undefined) return; // Should not happen if form is initialized
      const newIsPublic = !formData.watchlistIsPublic;
      setFormData(prev => ({...prev, watchlistIsPublic: newIsPublic})); // Optimistic UI update
      // This part is now handled by the main save button.
      // try {
      //     await setWatchlistPrivacyMutation({ isPublic: newIsPublic });
      //     toast.success(`Watchlist set to ${newIsPublic ? "public" : "private"}.`);
      // } catch (error: any) {
      //     setFormData(prev => ({...prev, watchlistIsPublic: !newIsPublic})); // Revert on error
      //     toast.error(error.data?.message || error.message || "Could not update watchlist privacy.");
      // }
  };


  if (userProfile === undefined) return <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-neon-cyan"></div><p className="ml-3">Loading...</p></div>;
  if (userProfile === null) return <div className="text-center p-8 neumorphic-card"><h2 className="text-2xl font-orbitron text-sakura-pink mb-4">Profile Not Found</h2><StyledButton onClick={onBack} variant="primary">Back</StyledButton></div>;

  return (
    <div className="p-4 sm:p-6 neumorphic-card max-w-2xl mx-auto">
      <div className="flex justify-between items-center mb-6 pb-4 border-b border-brand-dark">
        <h1 className="text-2xl sm:text-3xl font-orbitron text-sakura-pink">Profile Settings</h1>
        <StyledButton onClick={onBack} variant="secondary_small">&larr; Back</StyledButton>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Nickname, Moods, Favorite Genres, Favorite Animes, Experience Level, Disliked Genres, Disliked Tags (Keep existing fields) */}
        {/* ... existing fields from Phase 1 ... */}
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-brand-text-secondary mb-1">Nickname</label>
          <input type="text" id="name" name="name" value={formData.name || ""} onChange={handleInputChange} className="neumorphic-input w-full"/>
        </div>

        {/* Phase 2: Granular Preferences Sections */}
        <fieldset className="neumorphic-card bg-brand-dark p-4 shadow-neumorphic-light-inset">
            <legend className="text-xl font-orbitron text-neon-cyan mb-3 px-2">Deeper Preferences</legend>
            
            {/* Character Archetypes */}
            <div>
              <h4 className="text-md font-medium text-brand-text-secondary mb-2">Favorite Character Archetypes</h4>
              <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-1 rounded bg-brand-surface">
                {CHARACTER_ARCHETYPES_OPTIONS.map(item => (
                  <StyledButton type="button" key={item} onClick={() => toggleArrayItem("characterArchetypes", item)} variant={(formData.characterArchetypes || []).includes(item) ? "primary_small" : "secondary_small"}>{item}</StyledButton>
                ))}
              </div>
            </div>

            {/* Tropes */}
            <div className="mt-4">
              <h4 className="text-md font-medium text-brand-text-secondary mb-2">Favorite Tropes/Themes</h4>
              <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-1 rounded bg-brand-surface">
                {TROPES_OPTIONS.map(item => (
                  <StyledButton type="button" key={item} onClick={() => toggleArrayItem("tropes", item)} variant={(formData.tropes || []).includes(item) ? "primary_small" : "secondary_small"}>{item}</StyledButton>
                ))}
              </div>
            </div>

            {/* Art Styles */}
            <div className="mt-4">
              <h4 className="text-md font-medium text-brand-text-secondary mb-2">Preferred Art Styles</h4>
              <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-1 rounded bg-brand-surface">
                {ART_STYLES_OPTIONS.map(item => (
                  <StyledButton type="button" key={item} onClick={() => toggleArrayItem("artStyles", item)} variant={(formData.artStyles || []).includes(item) ? "primary_small" : "secondary_small"}>{item}</StyledButton>
                ))}
              </div>
            </div>
            
            {/* Narrative Pacing */}
            <div className="mt-4">
                <label htmlFor="narrativePacing" className="block text-md font-medium text-brand-text-secondary mb-2">Preferred Narrative Pacing</label>
                <select id="narrativePacing" name="narrativePacing" value={formData.narrativePacing || ""} onChange={handleInputChange} className="neumorphic-input w-full">
                    <option value="">No Preference</option>
                    {NARRATIVE_PACING_OPTIONS.map(option => (<option key={option} value={option}>{option}</option>))}
                </select>
            </div>
        </fieldset>
        
        {/* Phase 2: Watchlist Privacy */}
        <div className="neumorphic-card bg-brand-dark p-4 shadow-neumorphic-light-inset">
            <h3 className="text-xl font-orbitron text-neon-cyan mb-3">Watchlist Settings</h3>
            <div className="flex items-center justify-between">
                <label htmlFor="watchlistIsPublic" className="text-md font-medium text-brand-text-secondary">Make My Watchlist Public</label>
                <input type="checkbox" id="watchlistIsPublic" name="watchlistIsPublic" checked={formData.watchlistIsPublic || false} onChange={handleInputChange} className="neumorphic-input form-checkbox h-5 w-5 text-electric-blue rounded accent-electric-blue"/>
            </div>
            <p className="text-xs text-brand-text-secondary mt-1">If public, other users might be able to see your watchlist (feature not fully implemented yet).</p>
        </div>


        {/* Phase 2: Placeholder for Watchlist Import */}
        <div className="neumorphic-card bg-brand-dark p-4 shadow-neumorphic-light-inset">
            <h3 className="text-xl font-orbitron text-neon-cyan mb-2">Import Data</h3>
            <p className="text-brand-text-secondary mb-3">Import your existing watchlist from other services.</p>
            <StyledButton type="button" variant="secondary" disabled>Import from MyAnimeList (Coming Soon)</StyledButton>
            {/* TODO: Implement MAL/AniList import functionality. This will involve API calls or file parsing. */}
            <p className="text-xs text-brand-text-secondary mt-1">This feature is planned for a future update.</p>
        </div>


        <div className="flex justify-end pt-4">
          <StyledButton type="submit" variant="primary" disabled={isSaving}>{isSaving ? "Saving..." : "Save All Changes"}</StyledButton>
        </div>
      </form>
    </div>
  );
}