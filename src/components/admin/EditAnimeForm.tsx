// BRUTALIST EDIT ANIME FORM - EditAnimeForm.tsx
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

// BRUTALIST Form Section Component
const BrutalistFormSection: React.FC<{
  title: string;
  icon: string;
  children: React.ReactNode;
}> = memo(({ title, icon, children }) => (
  <div className="bg-black border-4 border-white p-8 mb-8">
    <div className="flex items-center gap-6 mb-8">
      <div className="w-16 h-16 bg-white text-black flex items-center justify-center border-4 border-black font-black text-3xl">
        {icon}
      </div>
      <h3 className="text-3xl font-black text-white uppercase tracking-wider">
        {title}
      </h3>
    </div>
    {children}
  </div>
));

// BRUTALIST Input Component
const BrutalistInput: React.FC<{
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
  return (
    <div className="mb-6">
      <label className="block text-lg font-black text-white uppercase tracking-wide mb-3">
        {label}
        {required && <span className="text-red-500 ml-2">*</span>}
      </label>
      
      {rows ? (
        <textarea
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          rows={rows}
          className="w-full bg-white text-black border-4 border-black px-6 py-4 font-black uppercase tracking-wide focus:outline-none focus:border-gray-500 transition-colors resize-none"
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
          className="w-full bg-white text-black border-4 border-black px-6 py-4 font-black uppercase tracking-wide focus:outline-none focus:border-gray-500 transition-colors"
        />
      )}
    </div>
  );
});

// BRUTALIST Array Input Component
const BrutalistArrayInput: React.FC<{
  label: string;
  value: string[];
  onChange: (value: string[]) => void;
  placeholder: string;
  icon: string;
}> = memo(({ label, value, onChange, placeholder, icon }) => {
  const [inputValue, setInputValue] = useState(value.join(', '));
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    const arrayValue = newValue.split(',').map(item => item.trim()).filter(Boolean);
    onChange(arrayValue);
  };

  return (
    <div className="mb-6">
      <label className="flex items-center gap-4 text-lg font-black text-white uppercase tracking-wide mb-3">
        <span className="text-3xl">{icon}</span>
        {label}
      </label>
      
      <input
        type="text"
        value={inputValue}
        onChange={handleChange}
        placeholder={placeholder}
        className="w-full bg-white text-black border-4 border-black px-6 py-4 font-black uppercase tracking-wide focus:outline-none focus:border-gray-500 transition-colors"
      />
      
      {value.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {value.map((item, index) => (
            <span key={index} className="bg-white text-black px-4 py-2 border-4 border-black font-black uppercase tracking-wide">
              {item}
            </span>
          ))}
        </div>
      )}
    </div>
  );
});

// BRUTALIST Auto-Resizing Textarea Component
const BrutalistAutoResizeTextarea: React.FC<{
  label: string;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  placeholder?: string;
  required?: boolean;
  minRows?: number;
  maxRows?: number;
  className?: string;
}> = memo(({ label, name, value, onChange, placeholder, required, minRows = 3, maxRows = 10, className = "" }) => {
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  const adjustHeight = React.useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    // Reset height to auto to get the correct scrollHeight
    textarea.style.height = 'auto';
    
    // Calculate new height based on content
    const scrollHeight = textarea.scrollHeight;
    const lineHeight = parseInt(getComputedStyle(textarea).lineHeight);
    const minHeight = lineHeight * minRows;
    const maxHeight = lineHeight * maxRows;
    
    // Set height within bounds
    const newHeight = Math.min(Math.max(scrollHeight, minHeight), maxHeight);
    textarea.style.height = `${newHeight}px`;
    
    // Show scrollbar if content exceeds max height
    textarea.style.overflowY = scrollHeight > maxHeight ? 'auto' : 'hidden';
  }, [minRows, maxRows]);

  // Adjust height on value change
  React.useEffect(() => {
    adjustHeight();
  }, [value, adjustHeight]);

  // Adjust height on mount
  React.useEffect(() => {
    adjustHeight();
  }, [adjustHeight]);

  return (
    <div className={`mb-6 ${className}`}>
      <label className="block text-lg font-black text-white uppercase tracking-wide mb-3">
        {label}
        {required && <span className="text-red-500 ml-2">*</span>}
      </label>
      
      <textarea
        ref={textareaRef}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        rows={minRows}
        className="w-full bg-white text-black border-4 border-black px-6 py-4 font-black uppercase tracking-wide focus:outline-none focus:border-gray-500 transition-colors resize-none overflow-hidden"
        style={{ minHeight: `${minRows * 1.5}rem` }}
      />
      
      {/* Character count indicator */}
      <div className="mt-2 text-right">
        <span className="text-sm font-black text-white uppercase tracking-wide">
          {value.length} CHARACTERS
        </span>
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
    <div className="bg-black border-4 border-white p-6 max-w-6xl mx-auto">
      {/* BRUTALIST Header with Poster Preview */}
      <div className="bg-white border-4 border-black p-6 mb-8">
        <div className="flex flex-col lg:flex-row gap-6 items-start">
          {/* Poster Preview */}
          <div className="flex-shrink-0">
            <div className="w-48 h-64 bg-white border-4 border-black overflow-hidden">
              {formData.posterUrl ? (
                <img
                  src={formData.posterUrl}
                  alt="Anime Poster Preview"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    target.nextElementSibling?.classList.remove('hidden');
                  }}
                />
              ) : null}
              <div className={`w-full h-full flex items-center justify-center text-6xl ${formData.posterUrl ? 'hidden' : ''}`}>
                🎬
              </div>
            </div>
          </div>
          
          {/* Header Content */}
          <div className="flex-1">
            <h2 className="text-4xl font-black text-black mb-4 uppercase tracking-wider">
              EDIT ANIME: {anime.title || 'UNTITLED'}
            </h2>
            <p className="text-black text-xl uppercase tracking-wide mb-4">
              UPDATE ANIME INFORMATION AND METADATA
            </p>
            
            {/* Changes Indicator */}
            {hasChanges && (
              <div className="inline-flex items-center gap-3 bg-yellow-500 text-black px-4 py-2 border-4 border-black font-black uppercase tracking-wide">
                <span className="w-3 h-3 bg-black"></span>
                <span>UNSAVED CHANGES DETECTED</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information Section */}
        <BrutalistFormSection
          title="BASIC INFORMATION"
          icon="📝"
        >
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <BrutalistInput
              label="TITLE"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="ENTER ANIME TITLE..."
              required
            />
            
            <BrutalistInput
              label="RELEASE YEAR"
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
          </div>
          
          <BrutalistAutoResizeTextarea
            label="DESCRIPTION"
            name="description"
            value={formData.description}
            onChange={handleChange}
            placeholder="ENTER ANIME DESCRIPTION..."
            required
          />
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <BrutalistInput
              label="POSTER URL"
              name="posterUrl"
              type="url"
              value={formData.posterUrl}
              onChange={handleChange}
              placeholder="HTTPS://EXAMPLE.COM/POSTER.JPG"
            />
            
            <BrutalistInput
              label="TRAILER URL"
              name="trailerUrl"
              type="url"
              value={formData.trailerUrl}
              onChange={handleChange}
              placeholder="HTTPS://YOUTUBE.COM/WATCH?V=..."
            />
          </div>
        </BrutalistFormSection>

        {/* Details Section */}
        <BrutalistFormSection
          title="DETAILS & RATINGS"
          icon="⭐"
        >
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <BrutalistInput
              label="RATING"
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
            
            <div className="bg-white border-4 border-black p-4">
              <div className="text-lg font-black text-black uppercase tracking-wide mb-2">
                CURRENT RATING: {anime.rating || 'N/A'}
              </div>
              <div className="text-sm text-black">
                {anime.year ? `Released: ${anime.year}` : 'Year: Unknown'}
              </div>
            </div>
          </div>
        </BrutalistFormSection>

        {/* Categories Section */}
        <BrutalistFormSection
          title="CATEGORIES & TAGS"
          icon="🏷️"
        >
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <BrutalistArrayInput
              label="GENRES"
              value={formData.genres}
              onChange={(value) => setFormData(prev => ({ ...prev, genres: value }))}
              placeholder="ACTION, ADVENTURE, COMEDY (COMMA-SEPARATED)"
              icon="🎭"
            />
            
            <BrutalistArrayInput
              label="EMOTIONAL TAGS"
              value={formData.emotionalTags}
              onChange={(value) => setFormData(prev => ({ ...prev, emotionalTags: value }))}
              placeholder="INSPIRING, THOUGHT-PROVOKING, EXCITING"
              icon="💭"
            />
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <BrutalistArrayInput
              label="STUDIOS"
              value={formData.studios}
              onChange={(value) => setFormData(prev => ({ ...prev, studios: value }))}
              placeholder="STUDIO GHIBLI, MADHOUSE, BONES"
              icon="🎬"
            />
            
            <BrutalistArrayInput
              label="THEMES"
              value={formData.themes}
              onChange={(value) => setFormData(prev => ({ ...prev, themes: value }))}
              placeholder="FRIENDSHIP, LOVE, WAR, REDEMPTION"
              icon="🎯"
            />
          </div>
        </BrutalistFormSection>

        {/* Action Buttons */}
        <div className="flex gap-6 pt-6">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 bg-white text-black border-4 border-black px-8 py-4 font-black uppercase tracking-wide hover:bg-gray-100 transition-colors"
          >
            CANCEL
          </button>
          <button
            type="submit"
            disabled={isSaving || !hasChanges}
            className="flex-1 bg-green-500 text-white border-4 border-green-500 px-8 py-4 font-black uppercase tracking-wide hover:bg-green-600 transition-colors disabled:opacity-50"
          >
            {isSaving ? "SAVING..." : "SAVE CHANGES"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default memo(EditAnimeFormComponent);