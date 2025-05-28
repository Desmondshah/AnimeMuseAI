// src/components/admin/CreateAnimeForm.tsx
import React, { useState, FormEvent, memo } from "react";
import StyledButton from "../animuse/shared/StyledButton";
import { toast } from "sonner";

interface CreateAnimeFormData {
  title: string;
  description: string;
  posterUrl: string;
  genres: string[];
  year: number | "";
  rating: number | "";
  emotionalTags: string[];
  trailerUrl: string;
  studios: string[];
  themes: string[];
}

interface CreateAnimeFormProps {
  onSubmit: (animeData: CreateAnimeFormData) => Promise<void>;
  onCancel: () => void;
  isSubmitting: boolean;
}

const CreateAnimeFormComponent: React.FC<CreateAnimeFormProps> = ({ onSubmit, onCancel, isSubmitting }) => {
  const [formData, setFormData] = useState<CreateAnimeFormData>({
    title: "",
    description: "",
    posterUrl: "",
    genres: [],
    year: "",
    rating: "",
    emotionalTags: [],
    trailerUrl: "",
    studios: [],
    themes: [],
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleArrayChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    fieldName: Extract<keyof CreateAnimeFormData, "genres" | "emotionalTags" | "studios" | "themes">
  ) => {
    const value = e.target.value.split(',').map(item => item.trim()).filter(Boolean);
    setFormData(prev => ({ ...prev, [fieldName]: value }));
  };

  const handleNumberChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    fieldName: Extract<keyof CreateAnimeFormData, "year" | "rating">
  ) => {
    setFormData(prev => ({ ...prev, [fieldName]: e.target.value === "" ? "" : parseFloat(e.target.value) }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim()) {
      toast.error("Title is required");
      return;
    }

    if (!formData.description.trim()) {
      toast.error("Description is required");
      return;
    }

    await onSubmit(formData);
  };

  const inputBaseClass = "form-input w-full !text-xs sm:!text-sm !py-2 !px-3";
  const labelBaseClass = "block text-xs font-medium text-brand-text-primary/80 mb-1";

  return (
    <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
      <div className="grid grid-cols-1 gap-4">
        <div>
          <label htmlFor="title" className={labelBaseClass}>Title *</label>
          <input 
            type="text" 
            name="title" 
            id="title" 
            className={inputBaseClass} 
            value={formData.title} 
            onChange={handleChange} 
            required 
            placeholder="Enter anime title"
          />
        </div>

        <div>
          <label htmlFor="description" className={labelBaseClass}>Description *</label>
          <textarea 
            name="description" 
            id="description" 
            rows={4} 
            className={inputBaseClass} 
            value={formData.description} 
            onChange={handleChange} 
            required
            placeholder="Enter anime description/synopsis"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="posterUrl" className={labelBaseClass}>Poster URL</label>
            <input 
              type="url" 
              name="posterUrl" 
              id="posterUrl" 
              className={inputBaseClass} 
              value={formData.posterUrl} 
              onChange={handleChange}
              placeholder="https://example.com/poster.jpg"
            />
          </div>
          <div>
            <label htmlFor="trailerUrl" className={labelBaseClass}>Trailer URL</label>
            <input 
              type="url" 
              name="trailerUrl" 
              id="trailerUrl" 
              className={inputBaseClass} 
              value={formData.trailerUrl} 
              onChange={handleChange}
              placeholder="https://youtube.com/watch?v=..."
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="year" className={labelBaseClass}>Release Year</label>
            <input 
              type="number" 
              name="year" 
              id="year" 
              className={inputBaseClass} 
              value={formData.year} 
              onChange={(e) => handleNumberChange(e, "year")}
              min="1900"
              max={new Date().getFullYear() + 5}
              placeholder="2024"
            />
          </div>
          <div>
            <label htmlFor="rating" className={labelBaseClass}>Rating (0-10)</label>
            <input 
              type="number" 
              name="rating" 
              id="rating" 
              step="0.1" 
              min="0" 
              max="10" 
              className={inputBaseClass} 
              value={formData.rating} 
              onChange={(e) => handleNumberChange(e, "rating")}
              placeholder="8.5"
            />
          </div>
        </div>

        <div>
          <label htmlFor="genres" className={labelBaseClass}>Genres (comma-separated)</label>
          <input 
            type="text" 
            name="genres" 
            id="genres" 
            className={inputBaseClass} 
            value={formData.genres.join(", ")} 
            onChange={(e) => handleArrayChange(e, "genres")} 
            placeholder="Action, Adventure, Fantasy"
          />
          <p className="text-xs text-brand-text-primary/60 mt-1">Enter genres separated by commas</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="studios" className={labelBaseClass}>Studios (comma-separated)</label>
            <input 
              type="text" 
              name="studios" 
              id="studios" 
              className={inputBaseClass} 
              value={formData.studios.join(", ")} 
              onChange={(e) => handleArrayChange(e, "studios")}
              placeholder="Studio Ghibli, Mappa"
            />
          </div>
          <div>
            <label htmlFor="themes" className={labelBaseClass}>Themes (comma-separated)</label>
            <input 
              type="text" 
              name="themes" 
              id="themes" 
              className={inputBaseClass} 
              value={formData.themes.join(", ")} 
              onChange={(e) => handleArrayChange(e, "themes")}
              placeholder="Coming of Age, Friendship"
            />
          </div>
        </div>

        <div>
          <label htmlFor="emotionalTags" className={labelBaseClass}>Emotional Tags (comma-separated)</label>
          <input 
            type="text" 
            name="emotionalTags" 
            id="emotionalTags" 
            className={inputBaseClass} 
            value={formData.emotionalTags.join(", ")} 
            onChange={(e) => handleArrayChange(e, "emotionalTags")}
            placeholder="Heartwarming, Exciting, Thought-provoking"
          />
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-brand-accent-peach/30">
        <StyledButton 
          type="button" 
          onClick={onCancel} 
          variant="secondary_small" 
          disabled={isSubmitting}
        >
          Cancel
        </StyledButton>
        <StyledButton 
          type="submit" 
          variant="primary_small" 
          disabled={isSubmitting}
        >
          {isSubmitting ? "Creating..." : "Create Anime"}
        </StyledButton>
      </div>
    </form>
  );
};

export default memo(CreateAnimeFormComponent);