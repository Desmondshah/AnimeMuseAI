// Enhanced EditAnimeForm.tsx with dramatic visual upgrades
import React, { useState, useEffect, FormEvent, memo } from "react";
import { Id } from "../../../convex/_generated/dataModel";
import StyledButton from "../animuse/shared/StyledButton";
import { toast } from "sonner";
import { useMobileOptimizations } from "../../../convex/useMobileOptimizations";

// Form data shape (what the local state holds)
interface FormDataShape {
  title: string;
  description: string;
  posterUrl: string;
  genres: string[];
  year: number | ""; // Allow empty string for controlled input
  rating: number | ""; // Allow empty string
  emotionalTags: string[];
  trailerUrl: string;
  studios: string[];
  themes: string[];
}

// Shape of the updates object sent to the backend
interface AnimeBackendUpdates {
  title?: string;
  description?: string;
  posterUrl?: string;
  genres?: string[];
  year?: number; // Undefined means no change or remove
  rating?: number; // Undefined means no change or remove
  emotionalTags?: string[];
  trailerUrl?: string;
  studios?: string[];
  themes?: string[];
}

interface AnimeProp {
  _id: Id<"anime">;
  title?: string | null;
  description?: string | null;
  posterUrl?: string | null;
  genres?: string[] | null;
  year?: number | null;
  rating?: number | null;
  emotionalTags?: string[] | null;
  trailerUrl?: string | null;
  studios?: string[] | null;
  themes?: string[] | null;
}

interface EditAnimeFormProps {
  anime: AnimeProp;
  onSave: (animeId: Id<"anime">, updates: AnimeBackendUpdates) => Promise<void>;
  onCancel: () => void;
  isSaving: boolean;
}

// Enhanced Form Section Component with larger layout
const FormSection: React.FC<{
  title: string;
  icon: string;
  children: React.ReactNode;
  gradient: string;
}> = memo(({ title, icon, children, gradient }) => (
  <div className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${gradient} p-1.5 group`}>
    <div className="bg-black/70 backdrop-blur-xl rounded-2xl p-8 border border-white/15">
      <div className="flex items-center gap-4 mb-8">
        <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center text-white text-2xl shadow-xl`}>
          {icon}
        </div>
        <h3 className="text-2xl font-heading bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
          {title}
        </h3>
      </div>
      {children}
    </div>
  </div>
));

// Enhanced Input Component with larger size and better accessibility
const FuturisticInput: React.FC<{
  label: string;
  name: string;
  type?: string;
  value: string | number;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  placeholder?: string;
  required?: boolean;
  min?: string;
  max?: string;
  step?: string;
  rows?: number;
  className?: string;
}> = memo(({ label, name, type = "text", value, onChange, placeholder, required, min, max, step, rows, className = "" }) => {
  const [isFocused, setIsFocused] = useState(false);
  
  return (
    <div className="space-y-3">
      <label className="flex items-center gap-3 text-base font-semibold text-white/95">
        {label}
        {required && <span className="text-red-400 text-lg">*</span>}
      </label>
      
      <div className="relative">
        {rows ? (
          <textarea
            name={name}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            required={required}
            rows={rows}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            className={`
              w-full bg-black/40 backdrop-blur-sm border-2 transition-all duration-300
              ${isFocused 
                ? 'border-blue-500 shadow-xl shadow-blue-500/30 bg-black/50' 
                : 'border-white/25 hover:border-white/50'
              }
              rounded-2xl px-6 py-4 text-white placeholder-white/60 text-base
              focus:outline-none focus:ring-0 resize-none
              ${className}
            `}
          />
        ) : (
          <input
            name={name}
            type={type}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            required={required}
            min={min}
            max={max}
            step={step}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            className={`
              w-full bg-black/40 backdrop-blur-sm border-2 transition-all duration-300
              ${isFocused 
                ? 'border-blue-500 shadow-xl shadow-blue-500/30 bg-black/50' 
                : 'border-white/25 hover:border-white/50'
              }
              rounded-2xl px-6 py-4 text-white placeholder-white/60 text-base
              focus:outline-none focus:ring-0
              ${className}
            `}
          />
        )}
        
        {/* Enhanced animated border effect */}
        {isFocused && (
          <div className="absolute inset-0 rounded-2xl pointer-events-none">
            <div className="absolute inset-0 rounded-2xl border-2 border-blue-400 animate-pulse opacity-60"></div>
          </div>
        )}
      </div>
    </div>
  );
});

// Enhanced Array Input Component with larger size and better visual feedback
const ArrayInput: React.FC<{
  label: string;
  value: string[];
  onChange: (value: string[]) => void;
  placeholder: string;
  icon: string;
}> = memo(({ label, value, onChange, placeholder, icon }) => {
  const [inputValue, setInputValue] = useState(value.join(', '));
  const [isFocused, setIsFocused] = useState(false);
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    const arrayValue = newValue.split(',').map(item => item.trim()).filter(Boolean);
    onChange(arrayValue);
  };

  return (
    <div className="space-y-3">
      <label className="flex items-center gap-3 text-base font-semibold text-white/95">
        <span className="text-2xl">{icon}</span>
        {label}
      </label>
      
      <div className="relative">
        <input
          type="text"
          value={inputValue}
          onChange={handleChange}
          placeholder={placeholder}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          className={`
            w-full bg-black/40 backdrop-blur-sm border-2 transition-all duration-300
            ${isFocused 
              ? 'border-purple-500 shadow-xl shadow-purple-500/30 bg-black/50' 
              : 'border-white/25 hover:border-white/50'
            }
            rounded-2xl px-6 py-4 text-white placeholder-white/60 text-base
            focus:outline-none focus:ring-0
          `}
        />
        
        {/* Enhanced tag preview with larger size */}
        {value.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-3">
            {value.slice(0, 5).map((item, index) => (
              <span
                key={index}
                className="px-4 py-2 bg-gradient-to-r from-purple-600/30 to-blue-600/30 text-white/90 rounded-xl text-sm border border-white/25 backdrop-blur-sm"
              >
                {item}
              </span>
            ))}
            {value.length > 5 && (
              <span className="px-4 py-2 bg-white/15 text-white/70 rounded-xl text-sm backdrop-blur-sm">
                +{value.length - 5} more
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
});

const EditAnimeFormComponent: React.FC<EditAnimeFormProps> = ({ anime, onSave, onCancel, isSaving }) => {
  const { shouldReduceAnimations, isMobile } = useMobileOptimizations();
  
  const [formData, setFormData] = useState<FormDataShape>({
    title: anime.title || "",
    description: anime.description || "",
    posterUrl: anime.posterUrl || "",
    genres: anime.genres || [],
    year: anime.year ?? "",
    rating: anime.rating ?? "",
    emotionalTags: anime.emotionalTags || [],
    trailerUrl: anime.trailerUrl || "",
    studios: anime.studios || [],
    themes: anime.themes || [],
  });

  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    setFormData({
      title: anime.title || "",
      description: anime.description || "",
      posterUrl: anime.posterUrl || "",
      genres: anime.genres || [],
      year: anime.year ?? "",
      rating: anime.rating ?? "",
      emotionalTags: anime.emotionalTags || [],
      trailerUrl: anime.trailerUrl || "",
      studios: anime.studios || [],
      themes: anime.themes || [],
    });
  }, [anime]);

  // Check for changes
  useEffect(() => {
    const checkForChanges = () => {
      const currentFormKeys = Object.keys(formData) as Array<keyof FormDataShape>;
      let changesDetected = false;

      for (const key of currentFormKeys) {
        const formValue = formData[key];
        const originalValue = anime[key as keyof AnimeProp];

        if (key === "title" || key === "description" || key === "posterUrl" || key === "trailerUrl") {
          const currentVal = formValue as string;
          const originalVal = (originalValue as string | null | undefined) || "";
          if (currentVal !== originalVal) {
            changesDetected = true;
            break;
          }
        } else if (key === "year" || key === "rating") {
          const currentNumVal = formValue === "" || formValue === undefined ? undefined : Number(formValue);
          const originalNumVal = originalValue === null || originalValue === undefined ? undefined : Number(originalValue);
          if (currentNumVal !== originalNumVal) {
            changesDetected = true;
            break;
          }
        } else if (key === "genres" || key === "emotionalTags" || key === "studios" || key === "themes") {
          const currentArrayVal = formValue as string[];
          const originalArrayVal = (originalValue as string[] | null | undefined) || [];
          if (JSON.stringify(currentArrayVal.slice().sort()) !== JSON.stringify(originalArrayVal.slice().sort())) {
            changesDetected = true;
            break;
          }
        }
      }
      
      setHasChanges(changesDetected);
    };

    checkForChanges();
  }, [formData, anime]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleNumberChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    fieldName: Extract<keyof FormDataShape, "year" | "rating">
  ) => {
    setFormData(prev => ({ ...prev, [fieldName]: e.target.value === "" ? "" : parseFloat(e.target.value) }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const updates: AnimeBackendUpdates = {};
    let changesFound = false;

    const currentFormKeys = Object.keys(formData) as Array<keyof FormDataShape>;

    for (const key of currentFormKeys) {
      const formValue = formData[key];
      const originalValue = anime[key as keyof AnimeProp];

      if (key === "title" || key === "description" || key === "posterUrl" || key === "trailerUrl") {
        const currentVal = formValue as string;
        const originalVal = (originalValue as string | null | undefined) || "";
        if (currentVal !== originalVal) {
          updates[key] = currentVal;
          changesFound = true;
        }
      } else if (key === "year" || key === "rating") {
        const currentNumVal = formValue === "" || formValue === undefined ? undefined : Number(formValue);
        const originalNumVal = originalValue === null || originalValue === undefined ? undefined : Number(originalValue);
        if (currentNumVal !== originalNumVal) {
          updates[key] = currentNumVal;
          changesFound = true;
        }
      } else if (key === "genres" || key === "emotionalTags" || key === "studios" || key === "themes") {
        const currentArrayVal = formValue as string[];
        const originalArrayVal = (originalValue as string[] | null | undefined) || [];
        if (JSON.stringify(currentArrayVal.slice().sort()) !== JSON.stringify(originalArrayVal.slice().sort())) {
          updates[key] = currentArrayVal;
          changesFound = true;
        }
      }
    }
    
    if (!changesFound) {
      toast.info("No changes detected to save.");
      onCancel(); 
      return;
    }
    await onSave(anime._id, updates);
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto p-6">
      {/* Enhanced Header */}
      <div className="text-center mb-10">
        <h2 className="text-4xl font-heading bg-gradient-to-r from-white via-blue-200 to-purple-200 bg-clip-text text-transparent mb-3">
          Edit Anime
        </h2>
        <p className="text-white/80 text-lg">Update anime information and metadata</p>
        
        {/* Enhanced changes indicator */}
        {hasChanges && (
          <div className="mt-6 inline-flex items-center gap-3 bg-yellow-500/25 text-yellow-300 px-6 py-3 rounded-2xl border border-yellow-500/40 backdrop-blur-sm">
            <span className="w-3 h-3 bg-yellow-400 rounded-full animate-pulse"></span>
            <span className="font-medium">Unsaved changes detected</span>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Basic Information Section */}
        <FormSection
          title="Basic Information"
          icon="📝"
          gradient="from-blue-600 to-cyan-600"
        >
          <div className="space-y-6">
            <FuturisticInput
              label="Title"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="Enter anime title..."
              required
            />
            
            <FuturisticInput
              label="Description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Enter anime description..."
              rows={5}
            />
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <FuturisticInput
                label="Poster URL"
                name="posterUrl"
                type="url"
                value={formData.posterUrl}
                onChange={handleChange}
                placeholder="https://example.com/poster.jpg"
              />
              
              <FuturisticInput
                label="Trailer URL"
                name="trailerUrl"
                type="url"
                value={formData.trailerUrl}
                onChange={handleChange}
                placeholder="https://youtube.com/watch?v=..."
              />
            </div>
          </div>
        </FormSection>

        {/* Details Section */}
        <FormSection
          title="Details & Ratings"
          icon="⭐"
          gradient="from-yellow-600 to-orange-600"
        >
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <FuturisticInput
              label="Release Year"
              name="year"
              type="number"
              value={formData.year}
              onChange={(e) => {
                const value = e.target.value === "" ? "" : parseFloat(e.target.value);
                setFormData(prev => ({ ...prev, year: value }));
              }}
              placeholder="2024"
              min="1900"
              max="2030"
            />
            
            <FuturisticInput
              label="Rating"
              name="rating"
              type="number"
              value={formData.rating}
              onChange={(e) => {
                const value = e.target.value === "" ? "" : parseFloat(e.target.value);
                setFormData(prev => ({ ...prev, rating: value }));
              }}
              placeholder="8.5"
              min="0"
              max="10"
              step="0.1"
            />
          </div>
        </FormSection>

        {/* Categories Section */}
        <FormSection
          title="Categories & Tags"
          icon="🏷️"
          gradient="from-purple-600 to-pink-600"
        >
          <div className="space-y-6">
            <ArrayInput
              label="Genres"
              value={formData.genres}
              onChange={(value) => setFormData(prev => ({ ...prev, genres: value }))}
              placeholder="Action, Adventure, Fantasy, Drama..."
              icon="🎭"
            />
            
            <ArrayInput
              label="Studios"
              value={formData.studios}
              onChange={(value) => setFormData(prev => ({ ...prev, studios: value }))}
              placeholder="Studio Ghibli, MAPPA, Toei Animation..."
              icon="🏢"
            />
            
            <ArrayInput
              label="Themes"
              value={formData.themes}
              onChange={(value) => setFormData(prev => ({ ...prev, themes: value }))}
              placeholder="Friendship, Coming of Age, War, Love..."
              icon="🎨"
            />
            
            <ArrayInput
              label="Emotional Tags"
              value={formData.emotionalTags}
              onChange={(value) => setFormData(prev => ({ ...prev, emotionalTags: value }))}
              placeholder="Heartwarming, Intense, Thought-provoking..."
              icon="💫"
            />
          </div>
        </FormSection>

        {/* Enhanced Action Buttons */}
        <div className="flex flex-col lg:flex-row gap-6 pt-8">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSaving}
            className="flex-1 bg-black/40 backdrop-blur-sm border-2 border-white/25 text-white py-4 px-8 rounded-2xl hover:bg-black/50 hover:border-white/40 transition-all duration-300 disabled:opacity-50 text-lg font-medium"
          >
            Cancel
          </button>
          
          <button
            type="submit"
            disabled={isSaving || !hasChanges}
            className={`flex-1 py-4 px-8 rounded-2xl font-semibold transition-all duration-300 border-2 text-lg
              ${hasChanges && !isSaving
                ? 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white border-blue-500/40 shadow-xl shadow-blue-500/30 hover:shadow-2xl hover:shadow-blue-500/40'
                : 'bg-gray-600/50 text-gray-400 border-gray-600/40 cursor-not-allowed'
              }`}
          >
            {isSaving ? (
              <span className="flex items-center justify-center gap-3">
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                Saving...
              </span>
            ) : hasChanges ? (
              "Save Changes"
            ) : (
              "No Changes"
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default memo(EditAnimeFormComponent);