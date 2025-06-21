// BRUTALIST CREATE ANIME FORM - CreateAnimeForm.tsx
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
      <label htmlFor={name} className="block text-lg font-black text-black uppercase tracking-wide mb-3">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      
      <textarea
        ref={textareaRef}
        name={name}
        id={name}
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
        <span className="text-sm font-black text-black uppercase tracking-wide">
          {value.length} CHARACTERS
        </span>
      </div>
    </div>
  );
});

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
            <h3 className="text-4xl font-black text-black mb-4 uppercase tracking-wider">
              CREATE NEW ANIME
            </h3>
            <p className="text-black text-xl uppercase tracking-wide mb-4">
              ADD NEW ANIME TO THE DATABASE
            </p>
            
            {/* Form Status */}
            <div className="inline-flex items-center gap-3 bg-blue-500 text-white px-4 py-2 border-4 border-blue-500 font-black uppercase tracking-wide">
              <span className="w-3 h-3 bg-white"></span>
              <span>NEW ANIME ENTRY</span>
            </div>
          </div>
        </div>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div className="bg-white border-4 border-black p-6">
          <h4 className="text-2xl font-black text-black mb-6 uppercase tracking-wide border-b-4 border-black pb-4">
            BASIC INFORMATION
          </h4>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <label htmlFor="title" className="block text-lg font-black text-black uppercase tracking-wide mb-3">
                TITLE <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="title"
                id="title"
                className="w-full bg-white text-black border-4 border-black px-6 py-4 font-black uppercase tracking-wide focus:outline-none focus:border-gray-500 transition-colors"
                value={formData.title}
                onChange={handleChange}
                required
              />
            </div>

            <div>
              <label htmlFor="year" className="block text-lg font-black text-black uppercase tracking-wide mb-3">
                RELEASE YEAR
              </label>
              <input
                type="number"
                name="year"
                id="year"
                className="w-full bg-white text-black border-4 border-black px-6 py-4 font-black uppercase tracking-wide focus:outline-none focus:border-gray-500 transition-colors"
                value={formData.year}
                onChange={handleChange}
                min="1900"
                max="2030"
              />
            </div>
          </div>

          <div className="mt-6">
            <BrutalistAutoResizeTextarea
              label="DESCRIPTION"
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="ENTER ANIME DESCRIPTION..."
              required
              minRows={4}
              maxRows={8}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
            <div>
              <label htmlFor="posterUrl" className="block text-lg font-black text-black uppercase tracking-wide mb-3">
                POSTER URL <span className="text-red-500">*</span>
              </label>
              <input
                type="url"
                name="posterUrl"
                id="posterUrl"
                className="w-full bg-white text-black border-4 border-black px-6 py-4 font-black uppercase tracking-wide focus:outline-none focus:border-gray-500 transition-colors"
                value={formData.posterUrl}
                onChange={handleChange}
                required
              />
            </div>

            <div>
              <label htmlFor="trailerUrl" className="block text-lg font-black text-black uppercase tracking-wide mb-3">
                TRAILER URL
              </label>
              <input
                type="url"
                name="trailerUrl"
                id="trailerUrl"
                className="w-full bg-white text-black border-4 border-black px-6 py-4 font-black uppercase tracking-wide focus:outline-none focus:border-gray-500 transition-colors"
                value={formData.trailerUrl}
                onChange={handleChange}
              />
            </div>
          </div>
        </div>

        {/* Classification */}
        <div className="bg-white border-4 border-black p-6">
          <h4 className="text-2xl font-black text-black mb-6 uppercase tracking-wide border-b-4 border-black pb-4">
            CLASSIFICATION
          </h4>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <label htmlFor="genres" className="block text-lg font-black text-black uppercase tracking-wide mb-3">
                GENRES (COMMA-SEPARATED) <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="genres"
                id="genres"
                className="w-full bg-white text-black border-4 border-black px-6 py-4 font-black uppercase tracking-wide focus:outline-none focus:border-gray-500 transition-colors"
                value={formData.genres.join(", ")}
                onChange={(e) => handleArrayChange(e, "genres")}
                required
              />
            </div>

            <div>
              <label htmlFor="airingStatus" className="block text-lg font-black text-black uppercase tracking-wide mb-3">
                AIRING STATUS
              </label>
              <select
                name="airingStatus"
                id="airingStatus"
                className="w-full bg-white text-black border-4 border-black px-6 py-4 font-black uppercase tracking-wide focus:outline-none focus:border-gray-500 transition-colors"
                value={formData.airingStatus}
                onChange={handleChange}
              >
                <option value="">SELECT STATUS</option>
                <option value="FINISHED">FINISHED</option>
                <option value="RELEASING">RELEASING</option>
                <option value="NOT_YET_RELEASED">NOT YET RELEASED</option>
                <option value="CANCELLED">CANCELLED</option>
                <option value="HIATUS">HIATUS</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
            <div>
              <label htmlFor="rating" className="block text-lg font-black text-black uppercase tracking-wide mb-3">
                RATING
              </label>
              <input
                type="number"
                name="rating"
                id="rating"
                className="w-full bg-white text-black border-4 border-black px-6 py-4 font-black uppercase tracking-wide focus:outline-none focus:border-gray-500 transition-colors"
                value={formData.rating}
                onChange={handleChange}
                min="0"
                max="10"
                step="0.1"
              />
            </div>

            <div>
              <label htmlFor="totalEpisodes" className="block text-lg font-black text-black uppercase tracking-wide mb-3">
                TOTAL EPISODES
              </label>
              <input
                type="number"
                name="totalEpisodes"
                id="totalEpisodes"
                className="w-full bg-white text-black border-4 border-black px-6 py-4 font-black uppercase tracking-wide focus:outline-none focus:border-gray-500 transition-colors"
                value={formData.totalEpisodes}
                onChange={handleChange}
                min="1"
              />
            </div>
          </div>
        </div>

        {/* Additional Details */}
        <div className="bg-white border-4 border-black p-6">
          <h4 className="text-2xl font-black text-black mb-6 uppercase tracking-wide border-b-4 border-black pb-4">
            ADDITIONAL DETAILS
          </h4>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <label htmlFor="emotionalTags" className="block text-lg font-black text-black uppercase tracking-wide mb-3">
                EMOTIONAL TAGS (COMMA-SEPARATED)
              </label>
              <input
                type="text"
                name="emotionalTags"
                id="emotionalTags"
                className="w-full bg-white text-black border-4 border-black px-6 py-4 font-black uppercase tracking-wide focus:outline-none focus:border-gray-500 transition-colors"
                value={formData.emotionalTags.join(", ")}
                onChange={(e) => handleArrayChange(e, "emotionalTags")}
              />
            </div>

            <div>
              <label htmlFor="studios" className="block text-lg font-black text-black uppercase tracking-wide mb-3">
                STUDIOS (COMMA-SEPARATED)
              </label>
              <input
                type="text"
                name="studios"
                id="studios"
                className="w-full bg-white text-black border-4 border-black px-6 py-4 font-black uppercase tracking-wide focus:outline-none focus:border-gray-500 transition-colors"
                value={formData.studios.join(", ")}
                onChange={(e) => handleArrayChange(e, "studios")}
              />
            </div>
          </div>

          <div className="mt-6">
            <label htmlFor="themes" className="block text-lg font-black text-black uppercase tracking-wide mb-3">
              THEMES (COMMA-SEPARATED)
            </label>
            <input
              type="text"
              name="themes"
              id="themes"
              className="w-full bg-white text-black border-4 border-black px-6 py-4 font-black uppercase tracking-wide focus:outline-none focus:border-gray-500 transition-colors"
              value={formData.themes.join(", ")}
              onChange={(e) => handleArrayChange(e, "themes")}
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-6">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 bg-white text-black border-4 border-black px-8 py-4 font-black uppercase tracking-wide hover:bg-gray-100 transition-colors"
          >
            CANCEL
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="flex-1 bg-green-500 text-white border-4 border-green-500 px-8 py-4 font-black uppercase tracking-wide hover:bg-green-600 transition-colors disabled:opacity-50"
          >
            {isSaving ? "CREATING..." : "CREATE ANIME"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default memo(CreateAnimeFormComponent);