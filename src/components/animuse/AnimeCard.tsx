// src/components/animuse/AnimeCard.tsx - Redesigned & Themed
import React, { memo, useState } from "react";
import { Doc, Id } from "../../../convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { toast } from "sonner";
import { AnimeRecommendation } from "../../../convex/types";
import StyledButton from "./shared/StyledButton"; // Import our StyledButton

interface AnimeCardProps {
  anime: AnimeRecommendation | Doc<"anime">;
  onAddToWatchlist?: (animeId: Id<"anime">, status: string) => void;
  onViewDetails?: (animeId: Id<"anime">) => void;
  isRecommendation?: boolean;
  variant?: "default" | "featured" | "compact";
}

const AnimeCardComponent: React.FC<AnimeCardProps> = ({
  anime,
  onAddToWatchlist,
  onViewDetails,
  isRecommendation = false,
  variant = "default"
}) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  const upsertToWatchlist = useMutation(api.anime.upsertToWatchlist);
  const addAnimeByUser = useMutation(api.anime.addAnimeByUser);

  const existingAnimeInDB = useQuery(
    api.anime.getAnimeByTitle,
    anime.title ? { title: anime.title } : "skip"
  );

  const watchlistEntry = useQuery(
    api.anime.getWatchlistItem,
    existingAnimeInDB?._id ? { animeId: existingAnimeInDB._id } : "skip"
  );

  // Consistent placeholder URL using theme colors
  const getPlaceholderUrl = (title: string) => {
    const bgColor = "ECB091"; // brand-accent-peach
    const textColor = "321D0B"; // brand-background (Dark Brown)
    const  titleText = title.length > 15 ? title.substring(0, 12) + "..." : title;
    return `https://placehold.co/300x450/${bgColor}/${textColor}/png?text=${encodeURIComponent(titleText)}&font=poppins`;
  };

  const placeholderUrl = getPlaceholderUrl(anime.title);
  const posterToDisplay = imageError ? placeholderUrl : anime.posterUrl || placeholderUrl;


  const handleAddToWatchlist = async (status: string) => {
    let animeIdToUse = (anime as Doc<"anime">)._id;

    if (isRecommendation && !existingAnimeInDB) {
      try {
        toast.loading("Adding to collection...", { id: `add-${anime.title}` });
        const newAnimeId = await addAnimeByUser({
          title: anime.title,
          description: anime.description || "No description available.",
          posterUrl: anime.posterUrl || placeholderUrl,
          genres: anime.genres || [],
          year: anime.year,
          rating: anime.rating,
          emotionalTags: anime.emotionalTags || [],
          trailerUrl: anime.trailerUrl || undefined, // Pass undefined if null/empty
          studios: anime.studios || [],
          themes: anime.themes || []
        });
        if (newAnimeId) {
          animeIdToUse = newAnimeId;
          toast.success("Added to collection!", { id: `add-${anime.title}` });
        } else {
          throw new Error("Failed to get ID for new anime.");
        }
      } catch (error) {
        console.error("Failed to add anime:", error);
        toast.error("Could not add to collection.", { id: `add-${anime.title}` });
        return;
      }
    } else if (existingAnimeInDB) {
      animeIdToUse = existingAnimeInDB._id;
    }

    if (!animeIdToUse) {
      toast.error("Could not determine anime ID");
      return;
    }

    if (onAddToWatchlist) {
      onAddToWatchlist(animeIdToUse, status);
    } else {
      try {
        toast.loading("Updating watchlist...", { id: `watchlist-${animeIdToUse}` });
        await upsertToWatchlist({ animeId: animeIdToUse, status });
        toast.success(`Item updated to '${status}'!`, { id: `watchlist-${animeIdToUse}` });
      } catch (error) {
        console.error("Failed to update watchlist:", error);
        toast.error("Could not update watchlist.", { id: `watchlist-${animeIdToUse}` });
      }
    }
  };

  const currentWatchlistStatus = watchlistEntry?.status;
  const animeDocumentId = existingAnimeInDB?._id || (anime as Doc<"anime">)._id;

  const RatingStars = ({ rating, maxRating = 5 }: { rating?: number; maxRating?: number }) => {
    if (rating === undefined || rating === null) return null;
    const fullStars = Math.floor(rating / (10 / maxRating)); // Assuming rating is 0-10, map to 0-5 for stars
    const displayRating = (rating / 2).toFixed(1); // Convert 0-10 to 0-5 for display

    return (
      <div className="flex items-center gap-0.5">
        {[...Array(maxRating)].map((_, i) => (
          <svg
            key={i}
            className={`w-3 h-3 ${i < fullStars ? 'text-brand-primary-action' : 'text-brand-accent-peach'}`}
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        ))}
        <span className="text-xs text-brand-text-on-dark ml-1">{displayRating}</span>
      </div>
    );
  };

  // Button rendering logic using StyledButton
  const WatchlistButton = () => {
    const commonButtonClasses = "w-full text-xs py-2 min-h-[40px]"; // Adjusted for smaller buttons

    if (isRecommendation && !existingAnimeInDB) {
      return (
        <StyledButton
          onClick={() => handleAddToWatchlist("Plan to Watch")}
          variant="primary_small"
          className={commonButtonClasses}
        >
          <svg className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
          </svg>
          Add to Collection
        </StyledButton>
      );
    }

    if (animeDocumentId && (isRecommendation ? existingAnimeInDB : true)) {
      if (currentWatchlistStatus === "Plan to Watch") {
        return (
          <StyledButton
            onClick={() => handleAddToWatchlist("Watching")}
            variant="primary_small" // Or a custom variant if needed
            className={`${commonButtonClasses} !bg-brand-accent-gold hover:!bg-brand-accent-gold/80 !text-brand-surface`}
          >
            <svg className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h8m-9-4h2m8 0h2M3 18h18" />
            </svg>
            Start Watching
          </StyledButton>
        );
      } else if (currentWatchlistStatus === "Watching") {
        return (
          <StyledButton
            onClick={() => handleAddToWatchlist("Completed")}
            variant="primary_small"
            className={`${commonButtonClasses} !bg-brand-accent-peach hover:!bg-brand-accent-peach/80 !text-brand-text-primary`}
          >
            <svg className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
            Mark Complete
          </StyledButton>
        );
      } else if (currentWatchlistStatus === "Completed") {
        return (
          <div className={`${commonButtonClasses} bg-brand-primary-action/10 text-brand-primary-action border border-brand-primary-action/30 rounded-md font-medium flex items-center justify-center gap-1.5`}>
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            Completed
          </div>
        );
      } else { // Not on watchlist or other status
        return (
          <StyledButton
            onClick={() => handleAddToWatchlist("Plan to Watch")}
            variant="secondary_small"
            className={commonButtonClasses}
          >
            <svg className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
            Add to Watchlist
          </StyledButton>
        );
      }
    }
    return null;
  };

  // Base card classes
  const cardBaseClass = "bg-brand-surface text-brand-text-primary rounded-lg shadow-md hover:shadow-lg transition-all duration-300 flex flex-col h-full overflow-hidden";

  if (variant === "compact") {
    return (
      <div className={`${cardBaseClass} p-2.5`}> {/* Adjusted padding for compact */}
        <div className="flex gap-2.5 items-center">
          <div className="relative w-14 h-[84px] sm:w-16 sm:h-24 flex-shrink-0 rounded-md overflow-hidden bg-brand-accent-peach/30"> {/* Aspect ratio for poster */}
            {!imageLoaded && !imageError && <div className="absolute inset-0 bg-brand-accent-peach/40 animate-pulse" />}
            <img
              src={posterToDisplay}
              alt={anime.title}
              className={`w-full h-full object-cover transition-opacity duration-300 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
              onLoad={() => setImageLoaded(true)}
              onError={() => { setImageError(true); setImageLoaded(true); }}
            />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-heading font-semibold text-brand-primary-action text-sm leading-tight mb-0.5 line-clamp-2">
              {anime.title}
            </h3>
            {anime.year && <p className="text-xs text-brand-text-primary/70 mb-0.5">{anime.year}</p>}
            <RatingStars rating={anime.rating} /> {/* Assuming rating is 0-10 */}
            {/* Optionally show watchlist status icon for compact cards */}
          </div>
        </div>
      </div>
    );
  }

  // Default and Featured variants (Featured might have slightly more padding or emphasis)
  const paddingClass = variant === "featured" ? "p-3 sm:p-4" : "p-3";

  return (
    <div className={`${cardBaseClass} ${paddingClass}`}>
      {/* Poster Section */}
      <div className="relative w-full aspect-[2/3] rounded-md overflow-hidden bg-brand-accent-peach/30 mb-2.5">
         {!imageLoaded && !imageError && <div className="absolute inset-0 bg-brand-accent-peach/40 animate-pulse" />}
        <img
          src={posterToDisplay}
          alt={anime.title}
          className={`w-full h-full object-cover transition-opacity duration-300 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
          onLoad={() => setImageLoaded(true)}
          onError={() => { setImageError(true); setImageLoaded(true); }}
        />
        {imageLoaded && anime.rating !== undefined && ( // Show rating only if image loaded
          <div className="absolute top-1.5 right-1.5 sm:top-2 sm:right-2 bg-brand-background/70 backdrop-blur-sm rounded-full px-2 py-0.5 sm:px-2.5 sm:py-1">
            <RatingStars rating={anime.rating} />
          </div>
        )}
        {imageLoaded && anime.year && ( // Show year only if image loaded
          <div className="absolute top-1.5 left-1.5 sm:top-2 sm:left-2 bg-brand-accent-gold text-brand-surface text-xs font-medium px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-md shadow">
            {anime.year}
          </div>
        )}
      </div>

      {/* Content Section */}
      <div className="flex flex-col flex-grow justify-between">
        <div> {/* Text content wrapper */}
          <h3 className={`font-heading font-semibold text-brand-primary-action leading-tight mb-1 line-clamp-2 ${
            variant === "featured" ? "text-lg sm:text-xl" : "text-base sm:text-lg"
          }`}>
            {anime.title}
          </h3>
          {anime.description && (
            <p className="text-xs sm:text-sm text-brand-text-primary/80 line-clamp-2 sm:line-clamp-3 leading-relaxed mb-1.5">
              {anime.description}
            </p>
          )}
          {anime.genres && anime.genres.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-1.5">
              {anime.genres.slice(0, variant === "featured" ? 4 : 3).map((genre) => (
                <span
                  key={genre}
                  className="inline-block bg-brand-accent-gold/20 text-brand-accent-gold text-[10px] sm:text-xs font-medium px-2 py-0.5 rounded-full"
                >
                  {genre}
                </span>
              ))}
              {anime.genres.length > (variant === "featured" ? 4 : 3) && (
                <span className="text-[10px] sm:text-xs text-brand-text-primary/70 self-center">+{anime.genres.length - (variant === "featured" ? 4 : 3)}</span>
              )}
            </div>
          )}
        </div>

        {/* Action Buttons Wrapper */}
        <div className="space-y-2 pt-2 mt-auto">
          {onViewDetails && animeDocumentId && (
            <StyledButton
              onClick={() => onViewDetails(animeDocumentId)}
              variant="secondary_small"
              className="w-full text-xs py-2"
            >
               <svg className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
               </svg>
              View Details
            </StyledButton>
          )}
          <WatchlistButton />
          {anime.trailerUrl && (
            <a href={anime.trailerUrl} target="_blank" rel="noopener noreferrer" className="block w-full">
              <StyledButton variant="ghost" className="w-full text-xs py-2 text-brand-primary-action hover:bg-brand-primary-action/10">
                <svg className="w-3.5 h-3.5 mr-1.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                </svg>
                Trailer
              </StyledButton>
            </a>
          )}
        </div>
      </div>
    </div>
  );
};

export default memo(AnimeCardComponent);