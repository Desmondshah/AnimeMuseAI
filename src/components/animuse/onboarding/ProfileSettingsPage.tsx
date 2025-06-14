// src/components/animuse/onboarding/ProfileSettingsPage.tsx - Advanced Artistic Version
import React, { useState, useEffect, useCallback, memo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
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

type UserProfileForEdit = {
  name?: string;
  moods?: string[];
  genres?: string[];
  favoriteAnimes?: string[];
  experienceLevel?: string;
  dislikedGenres?: string[];
  dislikedTags?: string[];
  characterArchetypes?: string[];
  tropes?: string[];
  artStyles?: string[];
  narrativePacing?: string;
  watchlistIsPublic?: boolean;
  animationsEnabled?: boolean;
};

const LoadingSpinnerFullPage: React.FC = memo(() => (
  <div className="flex flex-col justify-center items-center h-screen">
    <div className="relative">
      <div className="w-20 h-20 border-4 border-transparent border-t-brand-primary-action border-r-brand-accent-gold rounded-full animate-spin"></div>
      <div className="absolute top-2 left-2 w-16 h-16 border-4 border-transparent border-b-brand-accent-peach border-l-white/50 rounded-full animate-spin animate-reverse"></div>
      <div className="absolute top-6 left-6 w-8 h-8 bg-gradient-to-r from-brand-primary-action to-brand-accent-gold rounded-full animate-pulse"></div>
    </div>
    <p className="mt-4 text-lg text-white font-medium animate-pulse">Loading Your Profile...</p>
  </div>
));

const SectionWrapper: React.FC<{ 
  title: string; 
  children: React.ReactNode; 
  icon?: string;
  gradient?: string;
  index?: number;
}> = ({ title, children, icon, gradient = "from-brand-primary-action/20 to-brand-accent-gold/20", index = 0 }) => (
  <div 
    className="group relative transform transition-all duration-500 hover:scale-[1.02]"
    style={{ animationDelay: `${index * 100}ms` }}
  >
    {/* Glow Effect */}
    <div className={`absolute -inset-2 bg-gradient-to-r ${gradient} rounded-3xl blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300`}></div>
    
    <div className="relative bg-black/30 backdrop-blur-sm border border-white/10 rounded-3xl p-6 group-hover:border-white/20 transition-all duration-300">
      <div className="flex items-center gap-3 mb-6">
        {icon && (
          <div className="p-2 bg-gradient-to-r from-brand-primary-action/20 to-brand-accent-gold/20 rounded-full">
            <span className="text-2xl">{icon}</span>
          </div>
        )}
        <h3 className="text-xl font-heading text-white font-bold">{title}</h3>
      </div>
      {children}
    </div>
  </div>
);

const MultiSelectButtons: React.FC<{
  options: readonly string[];
  selected: string[];
  onChange: (item: string) => void;
  colorScheme?: string;
}> = ({ options, selected, onChange, colorScheme = "brand-primary-action" }) => (
  <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto custom-scrollbar">
    {options.map(item => (
      <button
        key={item}
        type="button"
        onClick={() => onChange(item)}
        className={`px-3 py-2 rounded-full text-xs font-medium transition-all duration-200 ${
          selected.includes(item)
            ? `bg-gradient-to-r from-${colorScheme} to-brand-accent-gold text-white shadow-lg transform scale-105`
            : 'bg-white/10 text-white/80 hover:bg-white/20 hover:text-white hover:scale-105'
        }`}
      >
        {item}
      </button>
    ))}
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
      const animationsPref = localStorage.getItem('animuse-animations-enabled');
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
        animationsEnabled:
          animationsPref !== null
            ? animationsPref === 'true'
            : userProfile.animationsEnabled ?? true,
      });
    }
  }, [userProfile]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const isCheckbox = type === 'checkbox';
    const newValue = isCheckbox ? (e.target as HTMLInputElement).checked : value;
    setFormData(prev => ({ ...prev, [name]: newValue }));
    if (name === 'animationsEnabled' && isCheckbox) {
      localStorage.setItem('animuse-animations-enabled', String(newValue));
    }
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
      const preferencesToUpdate: UserProfileForEdit = {
        name: formData.name || "",
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
        animationsEnabled: formData.animationsEnabled ?? true,
      };
      await updateUserPreferences(preferencesToUpdate);
      toast.success("Profile updated successfully!", { id: "profile-settings-save" });
    } catch (error: any) {
      toast.error(error.data?.message || error.message || "Could not save preferences.", { id: "profile-settings-save" });
    } finally {
      setIsSaving(false);
    }
  };

  if (userProfile === undefined) return <LoadingSpinnerFullPage />;
  
  if (userProfile === null) return (
    <div className="relative min-h-screen flex items-center justify-center px-4">
      <div className="bg-black/30 backdrop-blur-sm border border-red-500/30 rounded-3xl p-8 text-center max-w-md">
        <div className="text-6xl mb-4">⚠️</div>
        <h2 className="text-xl font-heading text-red-400 mb-4">Profile Not Found</h2>
        <p className="mb-4 text-sm text-red-300">We couldn't load your profile. Please try again later.</p>
        <StyledButton onClick={onBack} variant="primary">Back to App</StyledButton>
      </div>
    </div>
  );

  return (
    <div className="relative min-h-screen">
      {/* Floating Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-80 h-80 bg-gradient-to-br from-brand-primary-action/12 to-transparent rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-32 right-16 w-96 h-96 bg-gradient-to-tr from-brand-accent-gold/10 to-transparent rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 right-1/4 w-64 h-64 bg-gradient-to-l from-brand-accent-peach/8 to-transparent rounded-full blur-3xl animate-pulse delay-2000"></div>
        <div className="absolute bottom-1/4 left-1/3 w-72 h-72 bg-gradient-to-r from-purple-500/8 to-transparent rounded-full blur-3xl animate-pulse delay-3000"></div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 px-4 sm:px-6 py-8 md:max-w-5xl lg:max-w-6xl mx-auto space-y-8">
        {/* Hero Header */}
        <div className="text-center space-y-6">
          <div className="inline-block">
            <h1 className="hero-title font-heading text-white font-bold">
  ⚙️ Profile Settings
</h1>
            <div className="h-1 w-full bg-gradient-to-r from-transparent via-brand-primary-action to-transparent mt-4 animate-pulse"></div>
          </div>
          <p className="text-lg text-white/80 max-w-2xl mx-auto">
            Customize your anime discovery experience and personalize your recommendations
          </p>
          
          <StyledButton 
            onClick={onBack} 
            variant="ghost" 
            className="!bg-white/10 !backdrop-blur-sm !border-white/20 hover:!bg-white/20 !text-white"
          >
            ← Back to Dashboard
          </StyledButton>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Basic Info Section */}
          <SectionWrapper title="Basic Information" icon="👤" index={0}>
            <div className="space-y-6">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-white/90 mb-2">
                  Display Name
                </label>
                <input 
                  type="text" 
                  id="name" 
                  name="name" 
                  value={formData.name || ""} 
                  onChange={handleInputChange} 
                  className="w-full bg-black/40 backdrop-blur-sm border border-white/20 rounded-2xl px-4 py-3 text-white placeholder-white/60 focus:border-brand-primary-action focus:ring-2 focus:ring-brand-primary-action/50 focus:outline-none transition-all duration-300"
                  placeholder="How should we address you?"
                />
              </div>
              
              <div>
                <label htmlFor="experienceLevel" className="block text-sm font-medium text-white/90 mb-2">
                  Anime Experience Level
                </label>
                <div className="relative">
                  <select 
                    id="experienceLevel" 
                    name="experienceLevel" 
                    value={formData.experienceLevel || ""} 
                    onChange={handleInputChange} 
                    className="w-full bg-black/40 backdrop-blur-sm border border-white/20 rounded-2xl px-4 py-3 text-white focus:border-brand-primary-action focus:ring-2 focus:ring-brand-primary-action/50 focus:outline-none transition-all duration-300 appearance-none"
                  >
                    <option value="" className="bg-black text-white">Select your level...</option>
                    {EXPERIENCE_LEVELS_OPTIONS.map(opt => (
                      <option key={opt} value={opt} className="bg-black text-white">{opt}</option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none">
                    <svg className="w-5 h-5 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </SectionWrapper>

          {/* Content Preferences Section */}
          <SectionWrapper title="Content Preferences" icon="🎭" gradient="from-purple-500/20 to-pink-500/20" index={1}>
            <div className="space-y-8">
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8">
                <div>
                  <label className="block text-sm font-medium text-white/90 mb-3">Favorite Genres</label>
                  <MultiSelectButtons
                    options={GENRES_OPTIONS}
                    selected={formData.genres || []}
                    onChange={(item) => toggleArrayItem("genres", item)}
                    colorScheme="green-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-white/90 mb-3">Genres to Avoid</label>
                  <MultiSelectButtons
                    options={DISLIKED_GENRES_OPTIONS}
                    selected={formData.dislikedGenres || []}
                    onChange={(item) => toggleArrayItem("dislikedGenres", item)}
                    colorScheme="red-500"
                  />
                </div>
              </div>
              
              <div>
                <label htmlFor="dislikedTags" className="block text-sm font-medium text-white/90 mb-2">
                  Specific Content to Avoid
                </label>
                <input 
                  type="text" 
                  id="dislikedTags" 
                  name="dislikedTags" 
                  value={(formData.dislikedTags || []).join(", ")} 
                  onChange={(e) => handleTagsChange(e, 'dislikedTags')} 
                  className="w-full bg-black/40 backdrop-blur-sm border border-white/20 rounded-2xl px-4 py-3 text-white placeholder-white/60 focus:border-brand-primary-action focus:ring-2 focus:ring-brand-primary-action/50 focus:outline-none transition-all duration-300"
                  placeholder="e.g., excessive gore, jump scares, fan service"
                />
                <p className="text-xs text-white/60 mt-1">Separate multiple tags with commas</p>
              </div>
            </div>
          </SectionWrapper>

          {/* Advanced Preferences Section */}
          <SectionWrapper title="Advanced Preferences" icon="🎨" gradient="from-cyan-500/20 to-blue-500/20" index={2}>
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8">
              <div>
                <label className="block text-sm font-medium text-white/90 mb-3">Character Archetypes</label>
                <MultiSelectButtons
                  options={CHARACTER_ARCHETYPES_OPTIONS}
                  selected={formData.characterArchetypes || []}
                  onChange={(item) => toggleArrayItem("characterArchetypes", item)}
                  colorScheme="pink-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-white/90 mb-3">Favorite Tropes</label>
                <MultiSelectButtons
                  options={TROPES_OPTIONS}
                  selected={formData.tropes || []}
                  onChange={(item) => toggleArrayItem("tropes", item)}
                  colorScheme="yellow-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-white/90 mb-3">Art Styles</label>
                <MultiSelectButtons
                  options={ART_STYLES_OPTIONS}
                  selected={formData.artStyles || []}
                  onChange={(item) => toggleArrayItem("artStyles", item)}
                  colorScheme="indigo-500"
                />
              </div>
              
              <div>
                <label htmlFor="narrativePacing" className="block text-sm font-medium text-white/90 mb-2">
                  Preferred Narrative Pacing
                </label>
                <div className="relative">
                  <select 
                    id="narrativePacing" 
                    name="narrativePacing" 
                    value={formData.narrativePacing || ""} 
                    onChange={handleInputChange} 
                    className="w-full bg-black/40 backdrop-blur-sm border border-white/20 rounded-2xl px-4 py-3 text-white focus:border-brand-primary-action focus:ring-2 focus:ring-brand-primary-action/50 focus:outline-none transition-all duration-300 appearance-none"
                  >
                    <option value="" className="bg-black text-white">No Preference</option>
                    {NARRATIVE_PACING_OPTIONS.map(opt => (
                      <option key={opt} value={opt} className="bg-black text-white">{opt}</option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none">
                    <svg className="w-5 h-5 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </SectionWrapper>

          {/* Current Moods Section */}
          <SectionWrapper title="Current Moods" icon="😌" gradient="from-orange-500/20 to-yellow-500/20" index={3}>
            <div>
              <p className="text-sm text-white/70 mb-4">What kind of emotional experience are you seeking right now?</p>
              <MultiSelectButtons
                options={MOODS_OPTIONS}
                selected={formData.moods || []}
                onChange={(item) => toggleArrayItem("moods", item)}
                colorScheme="orange-500"
              />
            </div>
          </SectionWrapper>

          {/* Favorite Anime Section */}
          <SectionWrapper title="Favorite Anime Collection" icon="⭐" gradient="from-emerald-500/20 to-teal-500/20" index={4}>
            <div className="space-y-4">
              <div className="flex gap-3">
                <input 
                  type="text" 
                  placeholder="Add a favorite anime..." 
                  value={currentFavoriteAnime} 
                  onChange={(e) => setCurrentFavoriteAnime(e.target.value)} 
                  className="flex-1 bg-black/40 backdrop-blur-sm border border-white/20 rounded-2xl px-4 py-3 text-white placeholder-white/60 focus:border-brand-primary-action focus:ring-2 focus:ring-brand-primary-action/50 focus:outline-none transition-all duration-300"
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addFavoriteAnime())}
                />
                <StyledButton 
                  type="button" 
                  onClick={addFavoriteAnime} 
                  variant="secondary" 
                  className="!bg-gradient-to-r !from-brand-primary-action/20 !to-brand-accent-gold/20 !border-brand-primary-action/40 hover:!from-brand-primary-action/40 hover:!to-brand-accent-gold/40"
                >
                  Add
                </StyledButton>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-48 overflow-y-auto custom-scrollbar">
                {(formData.favoriteAnimes || []).length === 0 ? (
                  <div className="col-span-full text-center py-8">
                    <div className="text-4xl mb-2">📚</div>
                    <p className="text-white/60 text-sm">No favorites added yet. Share your all-time favorites!</p>
                  </div>
                ) : (
                  (formData.favoriteAnimes || []).map((anime, index) => (
                    <div 
                      key={anime} 
                      className="group relative bg-black/40 backdrop-blur-sm border border-white/10 rounded-2xl p-3 flex items-center justify-between hover:border-white/30 transition-all duration-300"
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      <span className="text-white/90 text-sm truncate pr-3">{anime}</span>
                      <button 
                        type="button"
                        onClick={() => removeFavoriteAnime(anime)} 
                        className="flex-shrink-0 w-6 h-6 rounded-full bg-red-500/20 text-red-400 hover:bg-red-500/40 hover:text-red-300 transition-all duration-200 flex items-center justify-center text-sm font-bold"
                        aria-label={`Remove ${anime}`}
                      >
                        ×
                      </button>
                    </div>
                  ))
                )}
              </div>
              <p className="text-xs text-white/60">Add up to 10 of your all-time favorite anime series</p>
            </div>
          </SectionWrapper>

          {/* Privacy & Advanced Settings */}
          <SectionWrapper title="Privacy & Advanced" icon="🔒" gradient="from-slate-500/20 to-gray-500/20" index={5}>
            <div className="space-y-6">
              <div className="flex items-center justify-between p-4 bg-black/20 backdrop-blur-sm rounded-2xl border border-white/10">
                <div>
                  <label htmlFor="watchlistIsPublic" className="text-sm font-medium text-white/90 cursor-pointer">
                    Make My Watchlist Public
                  </label>
                  <p className="text-xs text-white/60 mt-1">Allow other users to discover anime through your watchlist</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    id="watchlistIsPublic" 
                    name="watchlistIsPublic" 
                    checked={formData.watchlistIsPublic || false} 
                    onChange={handleInputChange} 
                    className="sr-only peer"
                  />
                  <div className="relative w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-brand-primary-action/25 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-brand-primary-action peer-checked:to-brand-accent-gold"></div>
                </label>
              </div>

              <div className="flex items-center justify-between p-4 bg-black/20 backdrop-blur-sm rounded-2xl border border-white/10">
                <div>
                  <label htmlFor="animationsEnabled" className="text-sm font-medium text-white/90 cursor-pointer">
                    Enable Animations
                  </label>
                  <p className="text-xs text-white/60 mt-1">Turn off for better performance on slow devices</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    id="animationsEnabled"
                    name="animationsEnabled"
                    checked={formData.animationsEnabled ?? true}
                    onChange={handleInputChange}
                    className="sr-only peer"
                  />
                  <div className="relative w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-brand-primary-action/25 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-brand-primary-action peer-checked:to-brand-accent-gold"></div>
                </label>
              </div>
              
              <div className="p-4 bg-black/20 backdrop-blur-sm rounded-2xl border border-white/10">
                <h4 className="text-sm font-medium text-white/90 mb-2 flex items-center gap-2">
                  <span className="text-lg">📥</span>
                  Data Import (Coming Soon)
                </h4>
                <p className="text-xs text-white/60 mb-3">Import your anime list from other platforms</p>
                <StyledButton 
                  type="button" 
                  variant="ghost" 
                  disabled 
                  className="!bg-white/5 !border-white/10 !text-white/50"
                >
                  Import from MyAnimeList
                </StyledButton>
              </div>
            </div>
          </SectionWrapper>

          {/* Save Button */}
          <div className="text-center pt-8">
            <div className="relative inline-block group">
              {/* Glow Effect */}
              <div className="absolute -inset-4 bg-gradient-to-r from-brand-primary-action/50 to-brand-accent-gold/50 rounded-3xl blur-xl opacity-60 group-hover:opacity-100 transition-opacity duration-300"></div>
              
              <StyledButton 
                type="submit" 
                variant="primary" 
                disabled={isSaving}
                className="relative !text-lg !px-12 !py-4 !bg-gradient-to-r !from-brand-primary-action !to-brand-accent-gold hover:!from-brand-accent-gold hover:!to-brand-primary-action !transition-all !duration-500 !shadow-2xl hover:!shadow-brand-primary-action/25"
              >
                {isSaving ? (
                  <span className="flex items-center gap-3">
                    <div className="w-5 h-5 border-2 border-transparent border-t-white rounded-full animate-spin"></div>
                    Saving Changes...
                  </span>
                ) : (
                  <span className="flex items-center gap-3">
                    <span className="text-xl">💾</span>
                    Save All Changes
                    <span className="text-xl">✨</span>
                  </span>
                )}
              </StyledButton>
            </div>
          </div>
        </form>

        {/* Bottom Spacer */}
        <div className="h-24"></div>
      </div>
    </div>
  );
}