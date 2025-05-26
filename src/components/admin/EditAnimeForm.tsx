// src/components/admin/EditAnimeForm.tsx
import React, { useState, useEffect, FormEvent } from "react";
import { Doc, Id } from "../../../convex/_generated/dataModel";
import StyledButton from "../animuse/shared/StyledButton";
import { toast } from "sonner";

interface AnimeEditableFields {
  title?: string;
  description?: string;
  posterUrl?: string;
  genres?: string[];
  year?: number;
  rating?: number; // External rating
  emotionalTags?: string[];
  trailerUrl?: string;
  studios?: string[];
  themes?: string[];
}

interface EditAnimeFormProps {
  anime: Doc<"anime">; // The anime document to edit
  onSave: (animeId: Id<"anime">, updates: AnimeEditableFields) => Promise<void>;
  onCancel: () => void;
  isSaving: boolean; // To disable button during save
}

const EditAnimeForm: React.FC<EditAnimeFormProps> = ({ anime, onSave, onCancel, isSaving }) => {
  const [formData, setFormData] = useState<AnimeEditableFields>({});

  useEffect(() => {
    // Pre-fill form data from the anime document
    setFormData({
      title: anime.title || "",
      description: anime.description || "",
      posterUrl: anime.posterUrl || "",
      genres: anime.genres || [],
      year: anime.year, // undefined is fine for optional number
      rating: anime.rating, // undefined is fine for optional number
      emotionalTags: anime.emotionalTags || [],
      trailerUrl: anime.trailerUrl || "",
      studios: anime.studios || [],
      themes: anime.themes || [],
    });
  }, [anime]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleArrayChange = (e: React.ChangeEvent<HTMLInputElement>, fieldName: keyof AnimeEditableFields) => {
    // Assuming comma-separated strings for array fields for simplicity in a text input
    const value = e.target.value.split(',').map(item => item.trim()).filter(item => item);
    setFormData(prev => ({ ...prev, [fieldName]: value }));
  };

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>, fieldName: keyof AnimeEditableFields) => {
    const value = e.target.value;
    setFormData(prev => ({ ...prev, [fieldName]: value === "" ? undefined : parseFloat(value) }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    // Construct the updates object by comparing with original anime data
    // This ensures we only send fields that have actually changed or are new.
    const updates: AnimeEditableFields = {};
    let hasChanges = false;

    (Object.keys(formData) as Array<keyof AnimeEditableFields>).forEach(key => {
      const formValue = formData[key];
      const originalValue = anime[key as keyof Doc<"anime">]; // Type assertion

      // Handle array comparison (simple stringify for now, could be more robust)
      if (Array.isArray(formValue) && Array.isArray(originalValue)) {
        if (JSON.stringify(formValue.slice().sort()) !== JSON.stringify(originalValue.slice().sort())) {
          updates[key] = formValue as any; // Type assertion
          hasChanges = true;
        }
      } else if (formValue !== originalValue) {
        // For year and rating, ensure empty string becomes undefined
        if ((key === 'year' || key === 'rating') && formValue === "") {
            updates[key] = undefined;
        } else {
            updates[key] = formValue as any; // Type assertion
        }
        hasChanges = true;
      }
    });
    
    if (!hasChanges) {
        toast.info("No changes detected.");
        onCancel(); // Or just do nothing
        return;
    }

    await onSave(anime._id, updates);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="title" className="block text-sm font-medium text-brand-text-secondary mb-1">Title</label>
        <input
          type="text"
          name="title"
          id="title"
          className="neumorphic-input w-full"
          value={formData.title || ""}
          onChange={handleChange}
          required
        />
      </div>
      <div>
        <label htmlFor="description" className="block text-sm font-medium text-brand-text-secondary mb-1">Description</label>
        <textarea
          name="description"
          id="description"
          rows={4}
          className="neumorphic-input w-full"
          value={formData.description || ""}
          onChange={handleChange}
        />
      </div>
      <div>
        <label htmlFor="posterUrl" className="block text-sm font-medium text-brand-text-secondary mb-1">Poster URL</label>
        <input
          type="url"
          name="posterUrl"
          id="posterUrl"
          className="neumorphic-input w-full"
          value={formData.posterUrl || ""}
          onChange={handleChange}
        />
      </div>
       <div>
        <label htmlFor="trailerUrl" className="block text-sm font-medium text-brand-text-secondary mb-1">Trailer URL</label>
        <input
          type="url"
          name="trailerUrl"
          id="trailerUrl"
          className="neumorphic-input w-full"
          value={formData.trailerUrl || ""}
          onChange={handleChange}
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
            <label htmlFor="year" className="block text-sm font-medium text-brand-text-secondary mb-1">Year</label>
            <input
            type="number"
            name="year"
            id="year"
            className="neumorphic-input w-full"
            value={formData.year === undefined ? "" : formData.year}
            onChange={(e) => handleNumberChange(e, "year")}
            />
        </div>
        <div>
            <label htmlFor="rating" className="block text-sm font-medium text-brand-text-secondary mb-1">Rating (External, 0-10)</label>
            <input
            type="number"
            name="rating"
            id="rating"
            step="0.1"
            min="0"
            max="10"
            className="neumorphic-input w-full"
            value={formData.rating === undefined ? "" : formData.rating}
            onChange={(e) => handleNumberChange(e, "rating")}
            />
        </div>
      </div>
      <div>
        <label htmlFor="genres" className="block text-sm font-medium text-brand-text-secondary mb-1">Genres (comma-separated)</label>
        <input
          type="text"
          name="genres"
          id="genres"
          className="neumorphic-input w-full"
          value={formData.genres?.join(", ") || ""}
          onChange={(e) => handleArrayChange(e, "genres")}
          placeholder="e.g., Action, Adventure, Fantasy"
        />
      </div>
       <div>
        <label htmlFor="studios" className="block text-sm font-medium text-brand-text-secondary mb-1">Studios (comma-separated)</label>
        <input
          type="text"
          name="studios"
          id="studios"
          className="neumorphic-input w-full"
          value={formData.studios?.join(", ") || ""}
          onChange={(e) => handleArrayChange(e, "studios")}
        />
      </div>
       <div>
        <label htmlFor="themes" className="block text-sm font-medium text-brand-text-secondary mb-1">Themes (comma-separated)</label>
        <input
          type="text"
          name="themes"
          id="themes"
          className="neumorphic-input w-full"
          value={formData.themes?.join(", ") || ""}
          onChange={(e) => handleArrayChange(e, "themes")}
        />
      </div>
      <div>
        <label htmlFor="emotionalTags" className="block text-sm font-medium text-brand-text-secondary mb-1">Emotional Tags (comma-separated)</label>
        <input
          type="text"
          name="emotionalTags"
          id="emotionalTags"
          className="neumorphic-input w-full"
          value={formData.emotionalTags?.join(", ") || ""}
          onChange={(e) => handleArrayChange(e, "emotionalTags")}
        />
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <StyledButton type="button" onClick={onCancel} variant="secondary" disabled={isSaving}>
          Cancel
        </StyledButton>
        <StyledButton type="submit" variant="primary" disabled={isSaving}>
          {isSaving ? "Saving..." : "Save Changes"}
        </StyledButton>
      </div>
    </form>
  );
};

export default EditAnimeForm;