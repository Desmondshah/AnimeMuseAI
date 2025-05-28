// src/components/admin/EditAnimeForm.tsx
import React, { useState, useEffect, FormEvent, memo } from "react";
import { Id } from "../../../convex/_generated/dataModel";
import StyledButton from "../animuse/shared/StyledButton";
import { toast } from "sonner";

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

const EditAnimeFormComponent: React.FC<EditAnimeFormProps> = ({ anime, onSave, onCancel, isSaving }) => {
  const [formData, setFormData] = useState<FormDataShape>({
    title: anime.title || "",
    description: anime.description || "",
    posterUrl: anime.posterUrl || "",
    genres: anime.genres || [],
    year: anime.year ?? "", // Handles null and undefined from prop
    rating: anime.rating ?? "", // Handles null and undefined from prop
    emotionalTags: anime.emotionalTags || [],
    trailerUrl: anime.trailerUrl || "",
    studios: anime.studios || [],
    themes: anime.themes || [],
  });

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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleArrayChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    fieldName: Extract<keyof FormDataShape, "genres" | "emotionalTags" | "studios" | "themes">
  ) => {
    const value = e.target.value.split(',').map(item => item.trim()).filter(Boolean);
    setFormData(prev => ({ ...prev, [fieldName]: value }));
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
    let hasChanges = false;

    const currentFormKeys = Object.keys(formData) as Array<keyof FormDataShape>;

    for (const key of currentFormKeys) {
      const formValue = formData[key];
      const originalValue = anime[key as keyof AnimeProp];

      if (key === "title" || key === "description" || key === "posterUrl" || key === "trailerUrl") {
        const currentVal = formValue as string; // Known to be string from FormDataShape
        const originalVal = (originalValue as string | null | undefined) || "";
        if (currentVal !== originalVal) {
          updates[key] = currentVal;
          hasChanges = true;
        }
      } else if (key === "year" || key === "rating") {
        const currentNumVal = formValue === "" || formValue === undefined ? undefined : Number(formValue);
        const originalNumVal = originalValue === null || originalValue === undefined ? undefined : Number(originalValue);
        if (currentNumVal !== originalNumVal) {
          updates[key] = currentNumVal;
          hasChanges = true;
        }
      } else if (key === "genres" || key === "emotionalTags" || key === "studios" || key === "themes") {
        const currentArrayVal = formValue as string[]; // Known to be string[]
        const originalArrayVal = (originalValue as string[] | null | undefined) || [];
        if (JSON.stringify(currentArrayVal.slice().sort()) !== JSON.stringify(originalArrayVal.slice().sort())) {
          updates[key] = currentArrayVal;
          hasChanges = true;
        }
      }
    }
    
    if (!hasChanges) {
        toast.info("No changes detected to save.");
        onCancel(); 
        return;
    }
    await onSave(anime._id, updates);
  };
  
  const inputBaseClass = "form-input w-full !text-xs sm:!text-sm !py-1.5 !px-2.5";
  const labelBaseClass = "block text-xs font-medium text-brand-text-primary/80 mb-0.5";

  return (
    <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
      <div>
        <label htmlFor="title" className={labelBaseClass}>Title *</label>
        <input type="text" name="title" id="title" className={inputBaseClass} value={formData.title} onChange={handleChange} required />
      </div>
      <div>
        <label htmlFor="description" className={labelBaseClass}>Description</label>
        <textarea name="description" id="description" rows={3} className={inputBaseClass} value={formData.description} onChange={handleChange} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        <div>
            <label htmlFor="posterUrl" className={labelBaseClass}>Poster URL</label>
            <input type="url" name="posterUrl" id="posterUrl" className={inputBaseClass} value={formData.posterUrl} onChange={handleChange} />
        </div>
        <div>
            <label htmlFor="trailerUrl" className={labelBaseClass}>Trailer URL</label>
            <input type="url" name="trailerUrl" id="trailerUrl" className={inputBaseClass} value={formData.trailerUrl} onChange={handleChange} />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        <div>
            <label htmlFor="year" className={labelBaseClass}>Year</label>
            <input type="number" name="year" id="year" className={inputBaseClass} value={formData.year} onChange={(e) => handleNumberChange(e, "year")} />
        </div>
        <div>
            <label htmlFor="rating" className={labelBaseClass}>Rating (0-10)</label>
            <input type="number" name="rating" id="rating" step="0.1" min="0" max="10" className={inputBaseClass} value={formData.rating} onChange={(e) => handleNumberChange(e, "rating")} />
        </div>
      </div>
      <div>
        <label htmlFor="genres" className={labelBaseClass}>Genres (comma-separated)</label>
        <input type="text" name="genres" id="genres" className={inputBaseClass} value={formData.genres.join(", ")} onChange={(e) => handleArrayChange(e, "genres")} placeholder="Action, Adventure, Fantasy"/>
      </div>
      <div>
        <label htmlFor="studios" className={labelBaseClass}>Studios (comma-separated)</label>
        <input type="text" name="studios" id="studios" className={inputBaseClass} value={formData.studios.join(", ")} onChange={(e) => handleArrayChange(e, "studios")} />
      </div>
       <div>
        <label htmlFor="themes" className={labelBaseClass}>Themes (comma-separated)</label>
        <input type="text" name="themes" id="themes" className={inputBaseClass} value={formData.themes.join(", ")} onChange={(e) => handleArrayChange(e, "themes")} />
      </div>
      <div>
        <label htmlFor="emotionalTags" className={labelBaseClass}>Emotional Tags (comma-separated)</label>
        <input type="text" name="emotionalTags" id="emotionalTags" className={inputBaseClass} value={formData.emotionalTags.join(", ")} onChange={(e) => handleArrayChange(e, "emotionalTags")} />
      </div>

      <div className="flex justify-end gap-2 sm:gap-3 pt-2 sm:pt-3">
        <StyledButton type="button" onClick={onCancel} variant="secondary_small" disabled={isSaving}>Cancel</StyledButton>
        <StyledButton type="submit" variant="primary_small" disabled={isSaving || !onhashchange}> {/* Disable if no changes */}
          {isSaving ? "Saving..." : "Save Changes"}
        </StyledButton>
      </div>
    </form>
  );
};

export default memo(EditAnimeFormComponent);