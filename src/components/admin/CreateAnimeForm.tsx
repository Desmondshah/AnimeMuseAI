// src/components/admin/CreateAnimeForm.tsx
import React, { useState, FormEvent, memo } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
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
  anilistId: number | "";
  myAnimeListId: number | "";
  totalEpisodes: number | "";
  episodeDuration: number | "";
  airingStatus: string;
}

interface CreateAnimeFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

const CreateAnimeFormComponent: React.FC<CreateAnimeFormProps> = ({ onSuccess, onCancel }) => {
  const createAnimeMutation = useMutation(api.admin.adminCreateAnime);
  const [isSaving, setIsSaving] = useState(false);
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
    anilistId: "",
    myAnimeListId: "",
    totalEpisodes: "",
    episodeDuration: "",
    airingStatus: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
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
    fieldName: Extract<keyof CreateAnimeFormData, "year" | "rating" | "anilistId" | "myAnimeListId" | "totalEpisodes" | "episodeDuration">
  ) => {
    setFormData(prev => ({ ...prev, [fieldName]: e.target.value === "" ? "" : parseFloat(e.target.value) }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    if (!formData.title || !formData.description || !formData.posterUrl || formData.genres.length === 0) {
      toast.error("Please fill in all required fields: Title, Description, Poster URL, and at least one Genre.");
      return;
    }

    setIsSaving(true);
    try {
      const animeData = {
        title: formData.title,
        description: formData.description,
        posterUrl: formData.posterUrl,
        genres: formData.genres,
        year: formData.year === "" ? undefined : Number(formData.year),
        rating: formData.rating === "" ? undefined : Number(formData.rating),
        emotionalTags: formData.emotionalTags,
        trailerUrl: formData.trailerUrl || undefined,
        studios: formData.studios,
        themes: formData.themes,
        anilistId: formData.anilistId === "" ? undefined : Number(formData.anilistId),
        myAnimeListId: formData.myAnimeListId === "" ? undefined : Number(formData.myAnimeListId),
        totalEpisodes: formData.totalEpisodes === "" ? undefined : Number(formData.totalEpisodes),
        episodeDuration: formData.episodeDuration === "" ? undefined : Number(formData.episodeDuration),
        airingStatus: formData.airingStatus || undefined,
      };

      toast.loading("Creating anime...", { id: "create-anime" });
      await createAnimeMutation({ animeData });
      toast.success("Anime created successfully!", { id: "create-anime" });
      onSuccess();
    } catch (error: any) {
      toast.error(error.data?.message || "Failed to create anime.", { id: "create-anime" });
    } finally {
      setIsSaving(false);
    }
  };

  const inputBaseClass = "form-input w-full !text-xs sm:!text-sm !py-1.5 !px-2.5";
  const labelBaseClass = "block text-xs font-medium text-brand-text-primary/80 mb-0.5";

  return (
    <div className="bg-brand-surface text-brand-text-primary p-4 rounded-lg border border-brand-accent-peach/30">
      <h3 className="text-lg font-heading text-brand-primary-action mb-4">Create New Anime</h3>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Basic Information */}
        <div className="space-y-3">
          <h4 className="text-sm font-heading text-brand-primary-action/80 border-b border-brand-accent-peach/20 pb-1">
            Basic Information
          </h4>
          
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
            />
          </div>

          <div>
            <label htmlFor="description" className={labelBaseClass}>Description *</label>
            <textarea
              name="description"
              id="description"
              rows={3}
              className={inputBaseClass}
              value={formData.description}
              onChange={handleChange}
              required
            />
          </div>

          <div>
            <label htmlFor="posterUrl" className={labelBaseClass}>Poster URL *</label>
            <input
              type="url"
              name="posterUrl"
              id="posterUrl"
              className={inputBaseClass}
              value={formData.posterUrl}
              onChange={handleChange}
              required
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
            />
          </div>
        </div>

        {/* Classification */}
        <div className="space-y-3">
          <h4 className="text-sm font-heading text-brand-primary-action/80 border-b border-brand-accent-peach/20 pb-1">
            Classification
          </h4>
          
          <div>
            <label htmlFor="genres" className={labelBaseClass}>Genres (comma-separated) *</label>
            <input
              type="text"
              name="genres"
              id="genres"
              className={inputBaseClass}
              value={formData.genres.join(", ")}
              onChange={(e) => handleArrayChange(e, "genres")}
              placeholder="Action, Adventure, Fantasy"
              required
            />
          </div>

          <div>
            <label htmlFor="studios" className={labelBaseClass}>Studios (comma-separated)</label>
            <input
              type="text"
              name="studios"
              id="studios"
              className={inputBaseClass}
              value={formData.studios.join(", ")}
              onChange={(e) => handleArrayChange(e, "studios")}
              placeholder="Studio Ghibli, MAPPA"
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

          <div>
            <label htmlFor="emotionalTags" className={labelBaseClass}>Emotional Tags (comma-separated)</label>
            <input
              type="text"
              name="emotionalTags"
              id="emotionalTags"
              className={inputBaseClass}
              value={formData.emotionalTags.join(", ")}
              onChange={(e) => handleArrayChange(e, "emotionalTags")}
              placeholder="Heartwarming, Intense, Thought-provoking"
            />
          </div>
        </div>

        {/* Details */}
        <div className="space-y-3">
          <h4 className="text-sm font-heading text-brand-primary-action/80 border-b border-brand-accent-peach/20 pb-1">
            Details
          </h4>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="year" className={labelBaseClass}>Year</label>
              <input
                type="number"
                name="year"
                id="year"
                className={inputBaseClass}
                value={formData.year}
                onChange={(e) => handleNumberChange(e, "year")}
                min="1900"
                max="2030"
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
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="totalEpisodes" className={labelBaseClass}>Total Episodes</label>
              <input
                type="number"
                name="totalEpisodes"
                id="totalEpisodes"
                className={inputBaseClass}
                value={formData.totalEpisodes}
                onChange={(e) => handleNumberChange(e, "totalEpisodes")}
                min="1"
              />
            </div>
            <div>
              <label htmlFor="episodeDuration" className={labelBaseClass}>Episode Duration (minutes)</label>
              <input
                type="number"
                name="episodeDuration"
                id="episodeDuration"
                className={inputBaseClass}
                value={formData.episodeDuration}
                onChange={(e) => handleNumberChange(e, "episodeDuration")}
                min="1"
              />
            </div>
          </div>

          <div>
            <label htmlFor="airingStatus" className={labelBaseClass}>Airing Status</label>
            <select
              name="airingStatus"
              id="airingStatus"
              className={inputBaseClass}
              value={formData.airingStatus}
              onChange={handleChange}
            >
              <option value="">Select Status</option>
              <option value="RELEASING">Currently Airing</option>
              <option value="FINISHED">Finished</option>
              <option value="NOT_YET_RELEASED">Not Yet Released</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
        </div>

        {/* External IDs */}
        <div className="space-y-3">
          <h4 className="text-sm font-heading text-brand-primary-action/80 border-b border-brand-accent-peach/20 pb-1">
            External IDs (Optional)
          </h4>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="anilistId" className={labelBaseClass}>AniList ID</label>
              <input
                type="number"
                name="anilistId"
                id="anilistId"
                className={inputBaseClass}
                value={formData.anilistId}
                onChange={(e) => handleNumberChange(e, "anilistId")}
                min="1"
              />
            </div>
            <div>
              <label htmlFor="myAnimeListId" className={labelBaseClass}>MyAnimeList ID</label>
              <input
                type="number"
                name="myAnimeListId"
                id="myAnimeListId"
                className={inputBaseClass}
                value={formData.myAnimeListId}
                onChange={(e) => handleNumberChange(e, "myAnimeListId")}
                min="1"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t border-brand-accent-peach/20">
          <StyledButton
            type="button"
            onClick={onCancel}
            variant="secondary_small"
            disabled={isSaving}
          >
            Cancel
          </StyledButton>
          <StyledButton
            type="submit"
            variant="primary_small"
            disabled={isSaving}
          >
            {isSaving ? "Creating..." : "Create Anime"}
          </StyledButton>
        </div>
      </form>
    </div>
  );
};

export default memo(CreateAnimeFormComponent);