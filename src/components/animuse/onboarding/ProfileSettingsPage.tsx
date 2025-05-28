// src/components/animuse/onboarding/ProfileSettingsPage.tsx
import React, { useState, useEffect, useCallback, memo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
// Doc type might not be needed if UserProfileForEdit is comprehensive
// import { Doc } from "../../../../convex/_generated/dataModel";
import StyledButton from "../shared/StyledButton";
import { toast } from "sonner";

const MOODS_OPTIONS = ["Happy", "Sad", "Chill", "Dark", "Excited", "Nostalgic", "Thought-Provoking", "Intense", "Mysterious"];
const GENRES_OPTIONS = ["Action", "Adventure", "Comedy", "Drama", "Fantasy", "Horror", "Isekai", "Josei", "Mecha", "Mystery", "Psychological", "Romance", "Sci-Fi", "Seinen", "Shojo", "Shonen", "Slice of Life", "Sports", "Supernatural", "Thriller"];
const DISLIKED_GENRES_OPTIONS = [...GENRES_OPTIONS, "Ecchi", "Harem"];
const EXPERIENCE_LEVELS_OPTIONS = ["Newbie (Just starting!)", "Casual Viewer", "Seasoned Fan", "Otaku Legend"];
const CHARACTER_ARCHETYPES_OPTIONS = ["Tsundere", "Kuudere", "Dandere", "Yandere", "Genki Girl", "Stoic Hero", "Anti-Hero", "Mentor Figure", "Trickster"];
const TROPES_OPTIONS = ["Found Family", "Time Loop", "Tournament Arc", "Redemption Arc", "Chosen One", "Love Triangle", "Hidden Identity", "Deconstruction", "Magical Girl"];
const ART_STYLES_OPTIONS = ["Retro (80s/90s)", "Modern Cel-Shaded", "Photorealistic", "Chibi/Super-Deformed", "Minimalist", "Ghibli-esque", "Dark & Gritty"];
const NARRATIVE_PACING_OPTIONS = ["Slow Burn", "Episodic", "Fast-Paced", "Medium Paced"];

interface ProfileSettingsPageProps {
  onBack: () => void;
}

// Simplified type for form data, ensuring all fields from schema are optional
type UserProfileForEdit = {
  name?: string;
  moods?: string[];
  genres?: string[];
  favoriteAnimes?: string[]; // Will handle this with a separate input
  experienceLevel?: string;
  dislikedGenres?: string[];
  dislikedTags?: string[];
  characterArchetypes?: string[];
  tropes?: string[];
  artStyles?: string[];
  narrativePacing?: string;
  watchlistIsPublic?: boolean;
};

const LoadingSpinnerFullPage: React.FC = memo(() => (
    <div className="flex flex-col justify-center items-center h-screen bg-brand-background text-brand-text-on-dark">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary-action"></div>
      <p className="mt-4 text-lg">Loading Profile...</p>
    </div>
));

const SectionWrapper: React.FC<{ title: string; children: React.ReactNode; className?: string }> = ({ title, children, className }) => (
    <div className={`bg-brand-accent-peach/10 p-3 sm:p-4 rounded-lg shadow-sm ${className}`}>
        <h3 className="text-sm sm:text-base font-heading text-brand-accent-gold mb-2 font-semibold">{title}</h3>
        {children}
    </div>
);


export default function ProfileSettingsPage({ onBack }: ProfileSettingsPageProps) {
  const userProfile = useQuery(api.users.getMyUserProfile);
  const updateUserPreferences = useMutation(api.users.updateUserProfilePreferences);

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
        characterArchetypes: userProfile.characterArchetypes || [],
        tropes: userProfile.tropes || [],
        artStyles: userProfile.artStyles || [],
        narrativePacing: userProfile.narrativePacing || "",
        watchlistIsPublic: userProfile.watchlistIsPublic || false,
      });
    }
  }, [userProfile]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const isCheckbox = type === 'checkbox';
    // @ts-ignore - type for checked is boolean
    setFormData(prev => ({ ...prev, [name]: isCheckbox ? (e.target as HTMLInputElement).checked : value }));
  };

  const toggleArrayItem = (field: keyof UserProfileForEdit, item: string) => {
    setFormData(prev => {
      const currentArray = (prev[field] as string[] | undefined) || [];
      const newArray = currentArray.includes(item)
        ? currentArray.filter(i => i !== item)
        : [...currentArray, item];
      return { ...prev, [field]: newArray };
    });
  };

  const addFavoriteAnime = () => {
    if (currentFavoriteAnime.trim() && !(formData.favoriteAnimes || []).includes(currentFavoriteAnime.trim())) {
      if ((formData.favoriteAnimes || []).length >= 10) {
        toast.info("You can add up to 10 favorite anime.");
        return;
      }
      setFormData(prev => ({ ...prev, favoriteAnimes: [...(prev.favoriteAnimes || []), currentFavoriteAnime.trim()] }));
      setCurrentFavoriteAnime("");
    }
  };

  const removeFavoriteAnime = (animeToRemove: string) => {
    setFormData(prev => ({ ...prev, favoriteAnimes: (prev.favoriteAnimes || []).filter(anime => anime !== animeToRemove) }));
  };
  
  const handleTagsChange = (e: React.ChangeEvent<HTMLInputElement>, fieldName: 'dislikedTags') => {
    const tagsArray = e.target.value.split(',').map(tag => tag.trim()).filter(Boolean);
    setFormData(prev => ({...prev, [fieldName]: tagsArray}));
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    toast.loading("Saving preferences...", { id: "profile-settings-save" });
    try {
      // Ensure all fields are passed, even if empty arrays (backend handles optionals)
      const preferencesToUpdate: UserProfileForEdit = {
        name: formData.name || "", // Ensure name is not undefined
        moods: formData.moods || [],
        genres: formData.genres || [],
        favoriteAnimes: formData.favoriteAnimes || [],
        experienceLevel: formData.experienceLevel || "",
        dislikedGenres: formData.dislikedGenres || [],
        dislikedTags: formData.dislikedTags || [],
        characterArchetypes: formData.characterArchetypes || [],
        tropes: formData.tropes || [],
        artStyles: formData.artStyles || [],
        narrativePacing: formData.narrativePacing || "",
        watchlistIsPublic: formData.watchlistIsPublic || false,
      };
      await updateUserPreferences(preferencesToUpdate);
      toast.success("Preferences updated successfully!", { id: "profile-settings-save" });
      // onBack(); // Optionally navigate back on success
    } catch (error: any) {
      toast.error(error.data?.message || error.message || "Could not save preferences.", { id: "profile-settings-save" });
    } finally {
      setIsSaving(false);
    }
  };

  if (userProfile === undefined) return <LoadingSpinnerFullPage />;
  if (userProfile === null) return (
    <div className="bg-brand-surface text-brand-text-primary rounded-xl shadow-xl p-6 text-center max-w-md mx-auto">
      <h2 className="text-xl font-heading text-brand-primary-action mb-4">Profile Not Found</h2>
      <p className="mb-4 text-sm">We couldn't load your profile. Please try again later.</p>
      <StyledButton onClick={onBack} variant="primary">Back to App</StyledButton>
    </div>
  );
  
  const renderMultiSelectButtons = (
    options: readonly string[],
    field: keyof Pick<UserProfileForEdit, "moods" | "genres" | "dislikedGenres" | "characterArchetypes" | "tropes" | "artStyles">
  ) => (
    <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto custom-scrollbar border border-brand-accent-peach/20 rounded-md p-2 bg-brand-surface">
        {options.map(item => (
            <StyledButton
                type="button"
                key={item}
                onClick={() => toggleArrayItem(field, item)}
                selected={(formData[field] as string[] || []).includes(item)}
                variant={(formData[field] as string[] || []).includes(item) ? "primary_small" : "secondary_small"}
                className="!text-[10px] !px-1.5 !py-0.5" // Compact buttons
            >
                {item}
            </StyledButton>
        ))}
    </div>
  );


  return (
    <div className="bg-brand-surface text-brand-text-primary rounded-xl shadow-xl p-4 sm:p-5 md:p-6 max-w-2xl mx-auto">
      <div className="flex justify-between items-center mb-4 pb-3 border-b border-brand-accent-peach/30">
        <h1 className="text-lg sm:text-xl md:text-2xl font-heading text-brand-primary-action">Profile Settings</h1>
        <StyledButton onClick={onBack} variant="ghost" className="!text-sm text-brand-accent-gold hover:!text-brand-primary-action">
          ← Back
        </StyledButton>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-6">
        <SectionWrapper title="Basic Info">
          <div>
            <label htmlFor="name" className="block text-xs sm:text-sm font-medium text-brand-text-primary/80 mb-1">Nickname</label>
            <input type="text" id="name" name="name" value={formData.name || ""} onChange={handleInputChange} className="form-input w-full !text-sm"/>
          </div>
          <div className="mt-3">
            <label htmlFor="experienceLevel" className="block text-xs sm:text-sm font-medium text-brand-text-primary/80 mb-1">Anime Experience Level</label>
            <select id="experienceLevel" name="experienceLevel" value={formData.experienceLevel || ""} onChange={handleInputChange} className="form-input w-full !text-sm">
                <option value="">Select level...</option>
                {EXPERIENCE_LEVELS_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
          </div>
        </SectionWrapper>

        <SectionWrapper title="Content Preferences">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                <div>
                    <label className="block text-xs sm:text-sm font-medium text-brand-text-primary/80 mb-1">Favorite Genres</label>
                    {renderMultiSelectButtons(GENRES_OPTIONS, "genres")}
                </div>
                <div>
                    <label className="block text-xs sm:text-sm font-medium text-brand-text-primary/80 mb-1">Disliked Genres</label>
                    {renderMultiSelectButtons(DISLIKED_GENRES_OPTIONS, "dislikedGenres")}
                </div>
            </div>
            <div className="mt-3">
                 <label htmlFor="dislikedTags" className="block text-xs sm:text-sm font-medium text-brand-text-primary/80 mb-1">Specific Tags to Avoid (comma-separated)</label>
                 <input type="text" id="dislikedTags" name="dislikedTags" value={(formData.dislikedTags || []).join(", ")} onChange={(e) => handleTagsChange(e, 'dislikedTags')} className="form-input w-full !text-sm" placeholder="e.g., excessive gore, jump scares"/>
            </div>
        </SectionWrapper>

        <SectionWrapper title="Deeper Preferences">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                <div>
                    <label className="block text-xs sm:text-sm font-medium text-brand-text-primary/80 mb-1">Favorite Character Archetypes</label>
                    {renderMultiSelectButtons(CHARACTER_ARCHETYPES_OPTIONS, "characterArchetypes")}
                </div>
                <div>
                    <label className="block text-xs sm:text-sm font-medium text-brand-text-primary/80 mb-1">Favorite Tropes/Themes</label>
                    {renderMultiSelectButtons(TROPES_OPTIONS, "tropes")}
                </div>
                <div>
                    <label className="block text-xs sm:text-sm font-medium text-brand-text-primary/80 mb-1">Preferred Art Styles</label>
                    {renderMultiSelectButtons(ART_STYLES_OPTIONS, "artStyles")}
                </div>
                <div>
                    <label htmlFor="narrativePacing" className="block text-xs sm:text-sm font-medium text-brand-text-primary/80 mb-1">Preferred Narrative Pacing</label>
                    <select id="narrativePacing" name="narrativePacing" value={formData.narrativePacing || ""} onChange={handleInputChange} className="form-input w-full !text-sm">
                        <option value="">No Preference</option>
                        {NARRATIVE_PACING_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                </div>
                 <div>
                    <label className="block text-xs sm:text-sm font-medium text-brand-text-primary/80 mb-1">Current Moods (Optional)</label>
                    {renderMultiSelectButtons(MOODS_OPTIONS, "moods")}
                </div>
            </div>
        </SectionWrapper>

        <SectionWrapper title="Favorite Anime List">
            <div className="flex gap-2 mb-2">
                <input type="text" placeholder="Add a favorite anime..." value={currentFavoriteAnime} onChange={(e) => setCurrentFavoriteAnime(e.target.value)} className="form-input flex-grow !text-sm"/>
                <StyledButton type="button" onClick={addFavoriteAnime} variant="secondary_small" className="flex-shrink-0">Add</StyledButton>
            </div>
            <div className="space-y-1 max-h-32 overflow-y-auto custom-scrollbar border border-brand-accent-peach/20 rounded-md p-1.5 bg-brand-surface">
                {(formData.favoriteAnimes || []).length === 0 && <p className="text-xs text-brand-text-primary/60 text-center py-1">No favorites added yet.</p>}
                {(formData.favoriteAnimes || []).map(anime => (
                    <div key={anime} className="flex justify-between items-center p-1.5 bg-brand-accent-peach/20 rounded text-xs">
                        <span className="text-brand-text-primary/90">{anime}</span>
                        <button type="button" onClick={() => removeFavoriteAnime(anime)} className="text-red-500 hover:text-red-700 font-semibold text-sm leading-none px-1" aria-label={`Remove ${anime}`}>&times;</button>
                    </div>
                ))}
            </div>
        </SectionWrapper>

        <SectionWrapper title="Privacy & Other Settings">
            <div className="flex items-center justify-between">
                <label htmlFor="watchlistIsPublic" className="text-xs sm:text-sm font-medium text-brand-text-primary/90">Make My Watchlist Public</label>
                <input type="checkbox" id="watchlistIsPublic" name="watchlistIsPublic" checked={formData.watchlistIsPublic || false} onChange={handleInputChange} className="form-checkbox h-4 w-4 rounded border-brand-accent-peach text-brand-primary-action focus:ring-brand-primary-action focus:ring-offset-brand-surface accent-brand-primary-action"/>
            </div>
            <p className="text-[10px] sm:text-xs text-brand-text-primary/70 mt-0.5">If public, other users might see your watchlist (feature in progress).</p>
            
            <div className="mt-3">
                <h4 className="text-xs sm:text-sm font-medium text-brand-text-primary/90 mb-1">Import Data</h4>
                <StyledButton type="button" variant="secondary" disabled className="!text-xs">Import from MyAnimeList (Soon)</StyledButton>
            </div>
        </SectionWrapper>

        <div className="flex justify-end pt-3 sm:pt-4">
          <StyledButton type="submit" variant="primary" disabled={isSaving} className="!px-5 !py-2.5">
            {isSaving ? "Saving..." : "Save All Changes"}
          </StyledButton>
        </div>
      </form>
    </div>
  );
}