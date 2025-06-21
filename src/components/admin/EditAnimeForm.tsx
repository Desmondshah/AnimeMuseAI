// BRUTALIST EDIT ANIME FORM - EditAnimeForm.tsx
import React, { useState, useEffect, FormEvent, memo } from "react";
import { Id } from "../../../convex/_generated/dataModel";
import StyledButton from "../animuse/shared/StyledButton";
import { toast } from "sonner";
import { useMobileOptimizations, useAdminLayoutOptimization } from "../../../convex/useMobileOptimizations";

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

// BRUTALIST Form Section Component - iPad Optimized
const BrutalistFormSection: React.FC<{
  title: string;
  icon: string;
  children: React.ReactNode;
}> = memo(({ title, icon, children }) => {
  const { iPad } = useMobileOptimizations();
  
  return (
    <div className={`bg-black border-4 border-white ${
      iPad.isIPadMini ? 'p-4 mb-6' : 
      iPad.isIPadPro12 ? 'p-10 mb-10' : 
      'p-6 md:p-8 mb-6 md:mb-8'
    }`}>
      <div className={`flex items-center mb-6 md:mb-8 ${
        iPad.isIPadMini ? 'gap-3' : iPad.isIPadPro12 ? 'gap-8' : 'gap-4 md:gap-6'
      }`}>
        <div className={`bg-white text-black flex items-center justify-center border-4 border-black font-black ${
          iPad.isIPadMini ? 'w-12 h-12 text-2xl' : 
          iPad.isIPadPro12 ? 'w-20 h-20 text-4xl' : 
          'w-14 h-14 md:w-16 md:h-16 text-2xl md:text-3xl'
        }`}>
          {icon}
        </div>
        <h3 className={`font-black text-white uppercase tracking-wider leading-tight ${
          iPad.isIPadMini ? 'text-xl' : 
          iPad.isIPadPro12 ? 'text-3xl md:text-4xl' : 
          'text-2xl md:text-3xl'
        }`}>
          {title}
        </h3>
      </div>
      {children}
    </div>
  );
});

// BRUTALIST Input Component - iPad Optimized
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
  const { iPad } = useMobileOptimizations();
  
  return (
    <div className={`${iPad.isIPadMini ? 'mb-4' : iPad.isIPadPro12 ? 'mb-8' : 'mb-6'}`}>
      <label className={`block font-black text-white uppercase tracking-wide ${
        iPad.isIPadMini ? 'text-base mb-2' : 
        iPad.isIPadPro12 ? 'text-xl mb-4' : 
        'text-lg mb-3'
      }`}>
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
          className={`w-full bg-white text-black border-4 border-black font-black uppercase tracking-wide focus:outline-none focus:border-gray-500 transition-colors resize-none touch-target-ipad ${
            iPad.isIPadMini ? 'px-4 py-3 text-sm' : 
            iPad.isIPadPro12 ? 'px-8 py-6 text-lg' : 
            'px-6 py-4 text-base'
          }`}
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
          className={`w-full bg-white text-black border-4 border-black font-black uppercase tracking-wide focus:outline-none focus:border-gray-500 transition-colors touch-target-ipad ${
            iPad.isIPadMini ? 'px-4 py-3 text-sm' : 
            iPad.isIPadPro12 ? 'px-8 py-6 text-lg' : 
            'px-6 py-4 text-base'
          }`}
        />
      )}
    </div>
  );
});

// BRUTALIST Array Input Component - iPad Optimized
const BrutalistArrayInput: React.FC<{
  label: string;
  value: string[];
  onChange: (value: string[]) => void;
  placeholder: string;
  icon: string;
}> = memo(({ label, value, onChange, placeholder, icon }) => {
  const { iPad } = useMobileOptimizations();
  const [inputValue, setInputValue] = useState(value.join(', '));
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    const arrayValue = newValue.split(',').map(item => item.trim()).filter(Boolean);
    onChange(arrayValue);
  };

  return (
    <div className={`${iPad.isIPadMini ? 'mb-4' : iPad.isIPadPro12 ? 'mb-8' : 'mb-6'}`}>
      <label className={`flex items-center font-black text-white uppercase tracking-wide ${
        iPad.isIPadMini ? 'gap-2 text-base mb-2' : 
        iPad.isIPadPro12 ? 'gap-6 text-xl mb-4' : 
        'gap-4 text-lg mb-3'
      }`}>
        <span className={`${
          iPad.isIPadMini ? 'text-2xl' : iPad.isIPadPro12 ? 'text-4xl' : 'text-3xl'
        }`}>{icon}</span>
        {label}
      </label>
      
      <input
        type="text"
        value={inputValue}
        onChange={handleChange}
        placeholder={placeholder}
        className={`w-full bg-white text-black border-4 border-black font-black uppercase tracking-wide focus:outline-none focus:border-gray-500 transition-colors touch-target-ipad ${
          iPad.isIPadMini ? 'px-4 py-3 text-sm' : 
          iPad.isIPadPro12 ? 'px-8 py-6 text-lg' : 
          'px-6 py-4 text-base'
        }`}
      />
      
      {value.length > 0 && (
        <div className={`flex flex-wrap ${
          iPad.isIPadMini ? 'mt-3 gap-2' : iPad.isIPadPro12 ? 'mt-6 gap-4' : 'mt-4 gap-2'
        }`}>
          {value.map((item, index) => (
            <span key={index} className={`bg-white text-black border-4 border-black font-black uppercase tracking-wide ${
              iPad.isIPadMini ? 'px-3 py-1 text-xs' : 
              iPad.isIPadPro12 ? 'px-6 py-3 text-base' : 
              'px-4 py-2 text-sm'
            }`}>
              {item}
            </span>
          ))}
        </div>
      )}
    </div>
  );
});

// BRUTALIST Auto-Resizing Textarea Component - iPad Optimized
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
  const { iPad } = useMobileOptimizations();
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
    <div className={`${iPad.isIPadMini ? 'mb-4' : iPad.isIPadPro12 ? 'mb-8' : 'mb-6'} ${className}`}>
      <label className={`block font-black text-white uppercase tracking-wide ${
        iPad.isIPadMini ? 'text-base mb-2' : 
        iPad.isIPadPro12 ? 'text-xl mb-4' : 
        'text-lg mb-3'
      }`}>
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
        className={`w-full bg-white text-black border-4 border-black font-black uppercase tracking-wide focus:outline-none focus:border-gray-500 transition-colors resize-none overflow-hidden touch-target-ipad ${
          iPad.isIPadMini ? 'px-4 py-3 text-sm' : 
          iPad.isIPadPro12 ? 'px-8 py-6 text-lg' : 
          'px-6 py-4 text-base'
        }`}
        style={{ minHeight: `${minRows * 1.5}rem` }}
      />
      
      {/* Character count indicator */}
      <div className="mt-2 text-right">
        <span className={`font-black text-white uppercase tracking-wide ${
          iPad.isIPadMini ? 'text-xs' : iPad.isIPadPro12 ? 'text-base' : 'text-sm'
        }`}>
          {value.length} CHARACTERS
        </span>
      </div>
    </div>
  );
});

const EditAnimeFormComponent: React.FC<EditAnimeFormProps> = ({ anime, onSave, onCancel, isSaving }) => {
  const { shouldReduceAnimations, isMobile, iPad, isLandscape } = useMobileOptimizations();
  const { getGridClasses } = useAdminLayoutOptimization();
  
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
    <div className={`bg-black border-4 border-white mx-auto ${
      iPad.isIPad ? 'iPad-edit-form max-w-none' : 'max-w-6xl'
    } ${
      iPad.isIPadMini ? 'p-4' : iPad.isIPadPro12 ? 'p-8' : 'p-6'
    }`}>
      {/* BRUTALIST Header with Poster Preview - iPad Optimized */}
      <div className={`bg-white border-4 border-black ${
        iPad.isIPadMini ? 'p-4 mb-6' : iPad.isIPadPro12 ? 'p-8 mb-10' : 'p-6 mb-8'
      }`}>
        <div className={`flex flex-col lg:flex-row items-start ${
          iPad.isIPadMini ? 'gap-4' : iPad.isIPadPro12 ? 'gap-8' : 'gap-6'
        }`}>
          {/* Poster Preview */}
          <div className="flex-shrink-0">
            <div className={`bg-white border-4 border-black overflow-hidden ${
              iPad.isIPadMini ? 'w-32 h-44' : 
              iPad.isIPadPro12 ? 'w-60 h-80' : 
              'w-48 h-64'
            }`}>
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
              <div className={`w-full h-full flex items-center justify-center ${formData.posterUrl ? 'hidden' : ''} ${
                iPad.isIPadMini ? 'text-4xl' : iPad.isIPadPro12 ? 'text-8xl' : 'text-6xl'
              }`}>
                🎬
              </div>
            </div>
          </div>
          
          {/* Header Content */}
          <div className="flex-1 min-w-0">
            <h2 className={`font-black text-black mb-4 uppercase tracking-wider leading-tight truncate ${
              iPad.isIPadMini ? 'text-2xl' : 
              iPad.isIPadPro12 ? 'text-4xl md:text-5xl' : 
              'text-3xl md:text-4xl'
            }`}>
              EDIT ANIME: {anime.title || 'UNTITLED'}
            </h2>
            <p className={`text-black uppercase tracking-wide mb-4 ${
              iPad.isIPadMini ? 'text-sm' : 
              iPad.isIPadPro12 ? 'text-lg md:text-xl' : 
              'text-base md:text-lg'
            }`}>
              UPDATE ANIME INFORMATION AND METADATA
            </p>
            
            {/* Changes Indicator */}
            {hasChanges && (
              <div className={`inline-flex items-center bg-yellow-500 text-black border-4 border-black font-black uppercase tracking-wide ${
                iPad.isIPadMini ? 'gap-2 px-3 py-1 text-xs' : 
                iPad.isIPadPro12 ? 'gap-4 px-6 py-3 text-base' : 
                'gap-3 px-4 py-2 text-sm'
              }`}>
                <span className={`bg-black ${
                  iPad.isIPadMini ? 'w-2 h-2' : 'w-3 h-3'
                }`}></span>
                <span>UNSAVED CHANGES DETECTED</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className={`${
        iPad.isIPadMini ? 'space-y-4' : iPad.isIPadPro12 ? 'space-y-8' : 'space-y-6'
      }`}>
        {/* Basic Information Section */}
        <BrutalistFormSection
          title="BASIC INFORMATION"
          icon="📝"
        >
          <div className={`${getGridClasses('form')} ${
            iPad.isIPadMini ? 'gap-4' : iPad.isIPadPro12 ? 'gap-8' : 'gap-6'
          }`}>
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
          
          <div className={`${getGridClasses('form')} ${
            iPad.isIPadMini ? 'gap-4' : iPad.isIPadPro12 ? 'gap-8' : 'gap-6'
          }`}>
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
          <div className={`${getGridClasses('form')} ${
            iPad.isIPadMini ? 'gap-4' : iPad.isIPadPro12 ? 'gap-8' : 'gap-6'
          }`}>
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
            
            <div className={`bg-white border-4 border-black ${
              iPad.isIPadMini ? 'p-3' : iPad.isIPadPro12 ? 'p-6' : 'p-4'
            }`}>
              <div className={`font-black text-black uppercase tracking-wide mb-2 ${
                iPad.isIPadMini ? 'text-base' : 
                iPad.isIPadPro12 ? 'text-xl' : 
                'text-lg'
              }`}>
                CURRENT RATING: {anime.rating || 'N/A'}
              </div>
              <div className={`text-black ${
                iPad.isIPadMini ? 'text-xs' : iPad.isIPadPro12 ? 'text-base' : 'text-sm'
              }`}>
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
          <div className={`${getGridClasses('form')} ${
            iPad.isIPadMini ? 'gap-4' : iPad.isIPadPro12 ? 'gap-8' : 'gap-6'
          }`}>
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
          
          <div className={`${getGridClasses('form')} ${
            iPad.isIPadMini ? 'gap-4' : iPad.isIPadPro12 ? 'gap-8' : 'gap-6'
          }`}>
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

        {/* Action Buttons - iPad Optimized */}
        <div className={`flex pt-6 ${
          iPad.isIPadMini ? 'gap-3' : iPad.isIPadPro12 ? 'gap-8' : 'gap-6'
        }`}>
          <button
            type="button"
            onClick={onCancel}
            className={`flex-1 bg-white text-black border-4 border-black font-black uppercase tracking-wide hover:bg-gray-100 transition-colors touch-target-ipad ${
              iPad.isIPadMini ? 'px-4 py-3 text-sm' : 
              iPad.isIPadPro12 ? 'px-10 py-6 text-lg' : 
              'px-8 py-4 text-base'
            }`}
          >
            CANCEL
          </button>
          <button
            type="submit"
            disabled={isSaving || !hasChanges}
            className={`flex-1 bg-green-500 text-white border-4 border-green-500 font-black uppercase tracking-wide hover:bg-green-600 transition-colors disabled:opacity-50 touch-target-ipad ${
              iPad.isIPadMini ? 'px-4 py-3 text-sm' : 
              iPad.isIPadPro12 ? 'px-10 py-6 text-lg' : 
              'px-8 py-4 text-base'
            }`}
          >
            {isSaving ? "SAVING..." : "SAVE CHANGES"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default memo(EditAnimeFormComponent);