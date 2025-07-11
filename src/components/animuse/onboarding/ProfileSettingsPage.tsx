// src/components/animuse/onboarding/ProfileSettingsPage.tsx - BRUTALIST AESTHETIC and Mobile-First Design
import React, { useState, useEffect, useCallback, memo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import StyledButton from "../shared/StyledButton";
import { toast } from "sonner";
import { useAuthActions } from "@convex-dev/auth/react";

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

// BRUTALIST LOADING SPINNER
const BrutalistLoadingSpinnerFullPage: React.FC = memo(() => (
  <div className="flex flex-col justify-center items-center h-screen bg-white">
    <div className="relative">
      <div className="w-20 h-20 border-4 border-black bg-brand-primary-action animate-spin"></div>
      <div className="absolute top-2 left-2 w-16 h-16 border-4 border-black bg-white animate-spin animate-reverse"></div>
      <div className="absolute top-6 left-6 w-8 h-8 bg-black animate-pulse"></div>
    </div>
    <p className="mt-4 text-lg text-black font-black uppercase tracking-wider bg-white px-4 py-2 border-4 border-black shadow-brutal">
      LOADING PROFILE...
    </p>
  </div>
));

// BRUTALIST SECTION WRAPPER
const BrutalistSectionWrapper: React.FC<{ 
  title: string; 
  children: React.ReactNode; 
  icon?: string;
  index?: number;
}> = ({ title, children, icon, index = 0 }) => (
  <div className="bg-black border-4 border-white shadow-brutal-lg p-6 mb-6">
    <div className="bg-brand-primary-action border-4 border-black p-4 mb-6">
      <div className="flex items-center gap-3">
        {icon && (
          <div className="bg-black border-4 border-white p-2">
            <span className="text-2xl">{icon}</span>
          </div>
        )}
        <h3 className="text-xl font-black text-black uppercase tracking-wider">{title}</h3>
      </div>
    </div>
    {children}
  </div>
);

// BRUTALIST MULTI-SELECT BUTTONS
const BrutalistMultiSelectButtons: React.FC<{
  options: readonly string[];
  selected: string[];
  onChange: (item: string) => void;
  colorScheme?: string;
}> = ({ options, selected, onChange, colorScheme = "brand-primary-action" }) => (
  <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
    {options.map(item => (
      <button
        key={item}
        type="button"
        onClick={() => onChange(item)}
        className={`px-3 py-2 border-4 border-black font-black text-xs uppercase tracking-wider transition-all duration-200 active:scale-95 touch-target ${
          selected.includes(item)
            ? `bg-${colorScheme} text-black shadow-brutal`
            : 'bg-white text-black shadow-brutal hover:bg-gray-200'
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
  const { signOut } = useAuthActions();

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
      toast.success("Profile updated successfully! Refreshing recommendations...", { id: "profile-settings-save" });
    } catch (error: any) {
      toast.error(error.data?.message || error.message || "Could not save preferences.", { id: "profile-settings-save" });
    } finally {
      setIsSaving(false);
    }
  };

  if (userProfile === undefined) return <BrutalistLoadingSpinnerFullPage />;
  
  if (userProfile === null) return (
    <div className="relative min-h-screen bg-white flex items-center justify-center px-4">
      <div className="bg-red-500 border-4 border-black shadow-brutal-lg p-8 text-center max-w-md">
        <div className="bg-white border-4 border-black p-6 mb-4">
          <div className="text-6xl mb-4">⚠️</div>
          <h2 className="text-xl font-black text-black uppercase mb-4">PROFILE NOT FOUND</h2>
          <p className="mb-4 text-sm font-bold text-black uppercase">WE COULDN'T LOAD YOUR PROFILE. PLEASE TRY AGAIN LATER.</p>
        </div>
        <button
          onClick={onBack}
          className="bg-brand-primary-action border-4 border-black px-6 py-3 font-black text-black uppercase tracking-wider shadow-brutal hover:bg-blue-400 transition-all active:scale-95"
        >
          BACK TO APP
        </button>
      </div>
    </div>
  );

  return (
    <div className="relative min-h-screen bg-white">
      
      {/* BRUTAL GEOMETRIC BACKGROUND */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {/* Grid overlay */}
        <div className="absolute inset-0 bg-grid-pattern opacity-10"></div>
        
        {/* Floating geometric shapes */}
        <div className="absolute top-20 left-4 w-32 h-32 bg-black border-4 border-brand-primary-action transform rotate-45 opacity-20"></div>
        <div className="absolute top-40 right-8 w-24 h-24 bg-brand-accent-gold border-4 border-black opacity-30"></div>
        <div className="absolute bottom-32 left-8 w-40 h-20 bg-brand-primary-action border-4 border-black transform -rotate-12 opacity-25"></div>
        <div className="absolute bottom-20 right-4 w-28 h-28 bg-black border-4 border-white transform rotate-12 opacity-20"></div>
        
        {/* Diagonal stripes */}
        <div className="absolute top-0 left-0 w-full h-2 bg-black transform -skew-y-12 opacity-30"></div>
        <div className="absolute bottom-0 right-0 w-full h-2 bg-brand-primary-action transform skew-y-12 opacity-30"></div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 p-4 space-y-6">
        
        {/* BRUTAL HERO HEADER */}
        <div className="bg-black border-4 border-white shadow-brutal-lg p-6 mb-6">
          <div className="bg-brand-primary-action border-4 border-black p-4 mb-4">
            <h1 className="text-2xl md:text-4xl font-black text-black uppercase tracking-wider text-center">
              ⚙️ PROFILE SETTINGS
            </h1>
          </div>
          
          <div className="bg-white border-4 border-black p-4 mb-4">
            <p className="text-black font-bold text-center text-sm md:text-base uppercase">
              CUSTOMIZE YOUR ANIME DISCOVERY EXPERIENCE
            </p>
          </div>
          
          <div className="text-center">
            <button
              onClick={onBack}
              className="bg-white border-4 border-black px-6 py-3 font-black text-black uppercase tracking-wider shadow-brutal hover:bg-gray-200 transition-all active:scale-95"
            >
              ← BACK TO DASHBOARD
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* BASIC INFO SECTION */}
          <BrutalistSectionWrapper title="Basic Information" icon="👤" index={0}>
            <div className="space-y-6">
              
              {/* Display Name */}
              <div>
                <div className="bg-white border-4 border-black p-2 mb-2">
                  <label htmlFor="name" className="text-sm font-black text-black uppercase">
                    DISPLAY NAME
                  </label>
                </div>
                <div className="bg-gray-100 border-4 border-black p-1">
                  <input 
                    type="text" 
                    id="name" 
                    name="name" 
                    value={formData.name || ""} 
                    onChange={handleInputChange} 
                    className="w-full bg-gray-100 border-none outline-none p-3 text-black font-bold placeholder-gray-600 text-sm uppercase"
                    placeholder="HOW SHOULD WE ADDRESS YOU?"
                  />
                </div>
              </div>
              
              {/* Experience Level */}
              <div>
                <div className="bg-white border-4 border-black p-2 mb-2">
                  <label htmlFor="experienceLevel" className="text-sm font-black text-black uppercase">
                    ANIME EXPERIENCE LEVEL
                  </label>
                </div>
                <div className="bg-gray-100 border-4 border-black p-1">
                  <select 
                    id="experienceLevel" 
                    name="experienceLevel" 
                    value={formData.experienceLevel || ""} 
                    onChange={handleInputChange} 
                    className="w-full bg-gray-100 border-none outline-none p-3 text-black font-bold text-sm uppercase appearance-none"
                  >
                    <option value="">SELECT YOUR LEVEL...</option>
                    {EXPERIENCE_LEVELS_OPTIONS.map(opt => (
                      <option key={opt} value={opt}>{opt.toUpperCase()}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </BrutalistSectionWrapper>

          {/* CONTENT PREFERENCES SECTION */}
          <BrutalistSectionWrapper title="Content Preferences" icon="🎭" index={1}>
            <div className="space-y-6">
              
              {/* Favorite Genres */}
              <div>
                <div className="bg-green-500 border-4 border-black p-2 mb-3">
                  <label className="text-sm font-black text-black uppercase">FAVORITE GENRES</label>
                </div>
                <BrutalistMultiSelectButtons
                  options={GENRES_OPTIONS}
                  selected={formData.genres || []}
                  onChange={(item) => toggleArrayItem("genres", item)}
                  colorScheme="green-500"
                />
              </div>
              
              {/* Genres to Avoid */}
              <div>
                <div className="bg-red-500 border-4 border-black p-2 mb-3">
                  <label className="text-sm font-black text-white uppercase">GENRES TO AVOID</label>
                </div>
                <BrutalistMultiSelectButtons
                  options={DISLIKED_GENRES_OPTIONS}
                  selected={formData.dislikedGenres || []}
                  onChange={(item) => toggleArrayItem("dislikedGenres", item)}
                  colorScheme="red-500"
                />
              </div>
              
              {/* Specific Content to Avoid */}
              <div>
                <div className="bg-white border-4 border-black p-2 mb-2">
                  <label htmlFor="dislikedTags" className="text-sm font-black text-black uppercase">
                    SPECIFIC CONTENT TO AVOID
                  </label>
                </div>
                <div className="bg-gray-100 border-4 border-black p-1">
                  <input 
                    type="text" 
                    id="dislikedTags" 
                    name="dislikedTags" 
                    value={(formData.dislikedTags || []).join(", ")} 
                    onChange={(e) => handleTagsChange(e, 'dislikedTags')} 
                    className="w-full bg-gray-100 border-none outline-none p-3 text-black font-bold placeholder-gray-600 text-sm uppercase"
                    placeholder="E.G., EXCESSIVE GORE, JUMP SCARES, FAN SERVICE"
                  />
                </div>
                <div className="bg-black text-white px-2 py-1 text-xs font-black uppercase mt-1">
                  SEPARATE MULTIPLE TAGS WITH COMMAS
                </div>
              </div>
            </div>
          </BrutalistSectionWrapper>

          {/* ADVANCED PREFERENCES SECTION */}
          <BrutalistSectionWrapper title="Advanced Preferences" icon="🎨" index={2}>
            <div className="space-y-6">
              
              {/* Character Archetypes */}
              <div>
                <div className="bg-pink-500 border-4 border-black p-2 mb-3">
                  <label className="text-sm font-black text-black uppercase">CHARACTER ARCHETYPES</label>
                </div>
                <BrutalistMultiSelectButtons
                  options={CHARACTER_ARCHETYPES_OPTIONS}
                  selected={formData.characterArchetypes || []}
                  onChange={(item) => toggleArrayItem("characterArchetypes", item)}
                  colorScheme="pink-500"
                />
              </div>
              
              {/* Favorite Tropes */}
              <div>
                <div className="bg-yellow-500 border-4 border-black p-2 mb-3">
                  <label className="text-sm font-black text-black uppercase">FAVORITE TROPES</label>
                </div>
                <BrutalistMultiSelectButtons
                  options={TROPES_OPTIONS}
                  selected={formData.tropes || []}
                  onChange={(item) => toggleArrayItem("tropes", item)}
                  colorScheme="yellow-500"
                />
              </div>
              
              {/* Art Styles */}
              <div>
                <div className="bg-indigo-500 border-4 border-black p-2 mb-3">
                  <label className="text-sm font-black text-white uppercase">ART STYLES</label>
                </div>
                <BrutalistMultiSelectButtons
                  options={ART_STYLES_OPTIONS}
                  selected={formData.artStyles || []}
                  onChange={(item) => toggleArrayItem("artStyles", item)}
                  colorScheme="indigo-500"
                />
              </div>
              
              {/* Narrative Pacing */}
              <div>
                <div className="bg-white border-4 border-black p-2 mb-2">
                  <label htmlFor="narrativePacing" className="text-sm font-black text-black uppercase">
                    PREFERRED NARRATIVE PACING
                  </label>
                </div>
                <div className="bg-gray-100 border-4 border-black p-1">
                  <select 
                    id="narrativePacing" 
                    name="narrativePacing" 
                    value={formData.narrativePacing || ""} 
                    onChange={handleInputChange} 
                    className="w-full bg-gray-100 border-none outline-none p-3 text-black font-bold text-sm uppercase appearance-none"
                  >
                    <option value="">NO PREFERENCE</option>
                    {NARRATIVE_PACING_OPTIONS.map(opt => (
                      <option key={opt} value={opt}>{opt.toUpperCase()}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </BrutalistSectionWrapper>

          {/* CURRENT MOODS SECTION */}
          <BrutalistSectionWrapper title="Current Moods" icon="😌" index={3}>
            <div>
              <div className="bg-white border-4 border-black p-3 mb-4">
                <p className="text-sm font-bold text-black uppercase">WHAT KIND OF EMOTIONAL EXPERIENCE ARE YOU SEEKING RIGHT NOW?</p>
              </div>
              <BrutalistMultiSelectButtons
                options={MOODS_OPTIONS}
                selected={formData.moods || []}
                onChange={(item) => toggleArrayItem("moods", item)}
                colorScheme="orange-500"
              />
            </div>
          </BrutalistSectionWrapper>

          {/* FAVORITE ANIME SECTION */}
          <BrutalistSectionWrapper title="Favorite Anime Collection" icon="⭐" index={4}>
            <div className="space-y-4">
              
              {/* Add Favorite Anime */}
              <div className="flex gap-3">
                <div className="flex-1 bg-gray-100 border-4 border-black p-1">
                  <input 
                    type="text" 
                    placeholder="ADD A FAVORITE ANIME..." 
                    value={currentFavoriteAnime} 
                    onChange={(e) => setCurrentFavoriteAnime(e.target.value)} 
                    className="w-full bg-gray-100 border-none outline-none p-3 text-black font-bold placeholder-gray-600 text-sm uppercase"
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addFavoriteAnime())}
                  />
                </div>
                <button
                  type="button" 
                  onClick={addFavoriteAnime} 
                  className="bg-brand-accent-gold border-4 border-black px-6 py-3 font-black text-black uppercase tracking-wider shadow-brutal hover:bg-yellow-400 transition-all active:scale-95"
                >
                  ADD
                </button>
              </div>
              
              {/* Favorite Anime List */}
              <div className="grid grid-cols-1 gap-3 max-h-48 overflow-y-auto">
                {(formData.favoriteAnimes || []).length === 0 ? (
                  <div className="bg-white border-4 border-black p-8 text-center">
                    <div className="text-4xl mb-2">📚</div>
                    <p className="text-black font-black text-sm uppercase">NO FAVORITES ADDED YET. SHARE YOUR ALL-TIME FAVORITES!</p>
                  </div>
                ) : (
                  (formData.favoriteAnimes || []).map((anime, index) => (
                    <div 
                      key={anime} 
                      className="bg-white border-4 border-black p-3 flex items-center justify-between shadow-brutal hover:bg-gray-100 transition-all duration-200"
                    >
                      <span className="text-black font-bold text-sm uppercase truncate pr-3">{anime.toUpperCase()}</span>
                      <button 
                        type="button"
                        onClick={() => removeFavoriteAnime(anime)} 
                        className="flex-shrink-0 w-8 h-8 bg-red-500 border-2 border-black text-white font-black text-sm hover:bg-red-600 transition-all active:scale-95"
                        aria-label={`Remove ${anime}`}
                      >
                        ×
                      </button>
                    </div>
                  ))
                )}
              </div>
              
              <div className="bg-black text-white px-2 py-1 text-xs font-black uppercase">
                ADD UP TO 10 OF YOUR ALL-TIME FAVORITE ANIME SERIES
              </div>
            </div>
          </BrutalistSectionWrapper>

          {/* PRIVACY & ADVANCED SETTINGS */}
          <BrutalistSectionWrapper title="Privacy & Advanced" icon="🔒" index={5}>
            <div className="space-y-6">
              
              {/* Make Watchlist Public */}
              <div className="bg-white border-4 border-black p-4 flex items-center justify-between">
                <div>
                  <div className="bg-black text-white px-2 py-1 mb-2">
                    <label htmlFor="watchlistIsPublic" className="text-sm font-black uppercase cursor-pointer">
                      MAKE MY WATCHLIST PUBLIC
                    </label>
                  </div>
                  <p className="text-xs font-bold text-black uppercase">ALLOW OTHER USERS TO DISCOVER ANIME THROUGH YOUR WATCHLIST</p>
                </div>
                <div className="ml-4">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      id="watchlistIsPublic" 
                      name="watchlistIsPublic" 
                      checked={formData.watchlistIsPublic || false} 
                      onChange={handleInputChange} 
                      className="sr-only peer"
                    />
                    <div className={`relative w-12 h-6 border-4 border-black transition-all ${
                      formData.watchlistIsPublic ? 'bg-brand-primary-action' : 'bg-gray-400'
                    }`}>
                      <div className={`absolute top-0 w-4 h-4 bg-white border-2 border-black transition-all ${
                        formData.watchlistIsPublic ? 'translate-x-6' : 'translate-x-0'
                      }`}></div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Enable Animations */}
              <div className="bg-white border-4 border-black p-4 flex items-center justify-between">
                <div>
                  <div className="bg-black text-white px-2 py-1 mb-2">
                    <label htmlFor="animationsEnabled" className="text-sm font-black uppercase cursor-pointer">
                      ENABLE ANIMATIONS
                    </label>
                  </div>
                  <p className="text-xs font-bold text-black uppercase">TURN OFF FOR BETTER PERFORMANCE ON SLOW DEVICES</p>
                </div>
                <div className="ml-4">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      id="animationsEnabled"
                      name="animationsEnabled"
                      checked={formData.animationsEnabled ?? true}
                      onChange={handleInputChange}
                      className="sr-only peer"
                    />
                    <div className={`relative w-12 h-6 border-4 border-black transition-all ${
                      formData.animationsEnabled ? 'bg-brand-primary-action' : 'bg-gray-400'
                    }`}>
                      <div className={`absolute top-0 w-4 h-4 bg-white border-2 border-black transition-all ${
                        formData.animationsEnabled ? 'translate-x-6' : 'translate-x-0'
                      }`}></div>
                    </div>
                  </label>
                </div>
              </div>
              
              {/* Data Import (Coming Soon) */}
              <div className="bg-gray-300 border-4 border-black p-4">
                <div className="bg-black text-white px-2 py-1 mb-2 flex items-center gap-2">
                  <span className="text-lg">📥</span>
                  <h4 className="text-sm font-black uppercase">DATA IMPORT (COMING SOON)</h4>
                </div>
                <p className="text-xs font-bold text-black uppercase mb-3">IMPORT YOUR ANIME LIST FROM OTHER PLATFORMS</p>
                <button
                  type="button" 
                  disabled 
                  className="bg-gray-500 border-4 border-black px-4 py-2 font-black text-gray-300 uppercase tracking-wider cursor-not-allowed"
                >
                  IMPORT FROM MYANIMELIST
                </button>
              </div>
            </div>
          </BrutalistSectionWrapper>

          {/* ACCOUNT MANAGEMENT SECTION */}
          <BrutalistSectionWrapper title="Account Management" icon="🔐" index={8}>
            <div className="space-y-6">
              <div className="bg-white border-4 border-black p-4">
                <div className="bg-red-500 text-white px-2 py-1 mb-3 flex items-center gap-2">
                  <span className="text-lg">⚠️</span>
                  <h4 className="text-sm font-black uppercase">ACCOUNT ACTIONS</h4>
                </div>
                <p className="text-xs font-bold text-black uppercase mb-4">MANAGE YOUR ACCOUNT AND SESSION</p>
                
                <div className="flex flex-col gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm("Are you sure you want to sign out? Any unsaved changes will be lost.")) {
                        void signOut();
                      }
                    }}
                    className="bg-red-500 border-4 border-black px-6 py-3 font-black text-white uppercase tracking-wider shadow-brutal hover:bg-red-600 transition-all active:scale-95 flex items-center justify-center gap-2"
                  >
                    <span className="text-lg">🚪</span>
                    SIGN OUT
                    <span className="text-lg">👋</span>
                  </button>
                  
                  <p className="text-xs text-gray-600 text-center font-bold uppercase">
                    This will end your session and return you to the login page
                  </p>
                </div>
              </div>
            </div>
          </BrutalistSectionWrapper>

          {/* BRUTAL SAVE BUTTON */}
          <div className="text-center pt-8">
            <button
              type="submit" 
              disabled={isSaving}
              className={`px-12 py-4 border-4 border-black font-black uppercase tracking-wider shadow-brutal-lg transition-all active:scale-95 ${
                isSaving 
                  ? 'bg-gray-400 text-gray-700' 
                  : 'bg-brand-primary-action text-black hover:bg-blue-400'
              }`}
            >
              {isSaving ? (
                <span className="flex items-center gap-3">
                  <div className="w-5 h-5 border-2 border-black border-t-transparent animate-spin"></div>
                  SAVING CHANGES...
                </span>
              ) : (
                <span className="flex items-center gap-3">
                  <span className="text-xl">💾</span>
                  SAVE ALL CHANGES
                  <span className="text-xl">✨</span>
                </span>
              )}
            </button>
          </div>
        </form>

        {/* Bottom Spacer */}
        <div className="h-24"></div>
      </div>
    </div>
  );
}