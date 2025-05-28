// src/components/animuse/AnimeCard.tsx
import React, { memo, useState, useEffect, useRef, useMemo } from "react"; // Added useMemo
import { Doc, Id } from "../../../convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { toast } from "sonner";
import { AnimeRecommendation } from "../../../convex/types";
import StyledButton from "./shared/StyledButton";
import styles from '../../AnimeCard.module.css';

interface AnimeCardProps {
  anime: AnimeRecommendation | Doc<"anime">;
  onAddToWatchlist?: (animeId: Id<"anime">, status: string) => void;
  onViewDetails?: (animeId: Id<"anime">) => void;
  isRecommendation?: boolean;
}

const AnimeCardComponent: React.FC<AnimeCardProps> = ({
  anime,
  onAddToWatchlist,
  onViewDetails,
  isRecommendation = false,
}) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  const upsertToWatchlist = useMutation(api.anime.upsertToWatchlist);
  const addAnimeByUser = useMutation(api.anime.addAnimeByUser);

  const animeIdFromProp = (anime as Doc<"anime">)._id;
  const existingAnimeInDB = useQuery(
    api.anime.getAnimeByTitle,
    anime.title && !animeIdFromProp ? { title: anime.title } : "skip"
  );
  const animeDocumentId = animeIdFromProp || existingAnimeInDB?._id;
  const watchlistEntry = useQuery(
    api.anime.getWatchlistItem,
    animeDocumentId ? { animeId: animeDocumentId } : "skip"
  );

  // Memoize placeholderUrl
  const placeholderUrl = useMemo(() => {
    const bgColor = "ECB091"; // brand-accent-peach
    const textColor = "321D0B"; // brand-text-primary
    const title = anime.title || "Untitled"; // Fallback for title
    const titleText = title.length > 15 ? title.substring(0, 12) + "..." : title;
    return `https://placehold.co/400x600/${bgColor}/${textColor}/png?text=${encodeURIComponent(titleText)}&font=poppins`;
  }, [anime.title]);

  // Memoize posterToDisplay
  const posterToDisplay = useMemo(() => {
    return imageError ? placeholderUrl : anime.posterUrl || placeholderUrl;
  }, [imageError, placeholderUrl, anime.posterUrl]);

  useEffect(() => {
    // This effect runs if posterToDisplay string value actually changes, or on mount.
    setImageLoaded(false);
    setImageError(false);

    const imageElement = imgRef.current;
    if (imageElement) {
      // Check if the image (even placeholder) is already loaded by the browser
      if (imageElement.src === posterToDisplay && imageElement.complete) {
        if (imageElement.naturalHeight > 0) {
          setImageLoaded(true);
        } else {
          // Complete but no height, likely an error with the image source
          setImageError(true);
          setImageLoaded(true); // Still set loaded true to hide the initial placeholder div
        }
      }
      // If not complete, or src isn't set yet / different, the <img /> tag's onLoad/onError will handle it.
      // The key={posterToDisplay} on img helps ensure it re-evaluates if posterToDisplay truly changes.
    }
  }, [posterToDisplay]);

  const handleImageLoad = () => {
    setImageLoaded(true);
    setImageError(false);
  };

  const handleImageError = () => {
    setImageError(true);
    setImageLoaded(true); // Set loaded to true to hide the .imageLoadingPlaceholder and show the fallback (posterToDisplay will be placeholderUrl)
  };
  
  const handleAddToWatchlistInternal = async (status: string) => {
    let animeIdToUse = animeDocumentId;

    if (isRecommendation && !animeIdToUse) {
      try {
        toast.loading("Adding to collection...", { id: `add-${anime.title}` });
        const newAnimeId = await addAnimeByUser({
          title: anime.title || "Unknown Title",
          description: anime.description || "No description available.",
          posterUrl: anime.posterUrl || placeholderUrl,
          genres: anime.genres || [],
          year: anime.year,
          rating: anime.rating,
          emotionalTags: anime.emotionalTags || [],
          trailerUrl: anime.trailerUrl || undefined,
          studios: anime.studios || [],
          themes: anime.themes || []
        });
        if (newAnimeId) {
          animeIdToUse = newAnimeId;
          toast.success("Added to collection!", { id: `add-${anime.title}` });
        } else {
          throw new Error("Failed to get ID for new anime.");
        }
      } catch (error: any) {
        console.error("Failed to add anime:", error);
        toast.error(error.data?.message || error.message || "Could not add to collection.", { id: `add-${anime.title}` });
        return;
      }
    }
    
    if (!animeIdToUse) {
      if (isRecommendation) {
         try {
            toast.loading("Adding to collection (final attempt)...", { id: `add-final-${anime.title}` });
            const newAnimeId = await addAnimeByUser({
              title: anime.title || "Unknown Title", description: anime.description || "No description.",
              posterUrl: anime.posterUrl || placeholderUrl, genres: anime.genres || [],
              year: anime.year, rating: anime.rating,
              emotionalTags: anime.emotionalTags || [], trailerUrl: anime.trailerUrl || undefined,
              studios: anime.studios || [], themes: anime.themes || [],
            });
            if (!newAnimeId) throw new Error("Failed to create new anime entry.");
            animeIdToUse = newAnimeId;
            toast.success("Added to collection!", { id: `add-final-${anime.title}` });
        } catch (error: any) {
            toast.error(error.data?.message || error.message || "Could not process this new anime.", { id: `add-final-${anime.title}` });
            return;
        }
      } else {
        toast.error("Could not determine anime ID");
        return;
      }
    }

    if (onAddToWatchlist) {
      onAddToWatchlist(animeIdToUse, status);
    } else {
      try {
        toast.loading("Updating watchlist...", { id: `watchlist-${animeIdToUse}` });
        await upsertToWatchlist({ animeId: animeIdToUse, status });
        toast.success(`Item updated to '${status}'!`, { id: `watchlist-${animeIdToUse}` });
      } catch (error: any) {
        console.error("Failed to update watchlist:", error);
        toast.error(error.data?.message || error.message || "Could not update watchlist.", { id: `watchlist-${animeIdToUse}` });
      }
    }
  };

  const currentWatchlistStatus = watchlistEntry?.status;

  const renderWatchlistButton = () => {
    const commonButtonClasses = "w-full !text-xs !py-[7px]";

    if (isRecommendation && !animeDocumentId) {
      return (
        <StyledButton
          onClick={() => handleAddToWatchlistInternal("Plan to Watch")}
          variant="primary"
          className={commonButtonClasses}
        >
          Add to Collection
        </StyledButton>
      );
    }

    if (animeDocumentId) {
      if (currentWatchlistStatus === "Plan to Watch") {
        return (
          <StyledButton
            onClick={() => handleAddToWatchlistInternal("Watching")}
            variant="secondary" 
            className={`${commonButtonClasses} !border-brand-accent-gold !text-brand-accent-gold hover:!bg-brand-accent-gold hover:!text-brand-surface`}
          >
            Start Watching
          </StyledButton>
        );
      } else if (currentWatchlistStatus === "Watching") {
        return (
          <StyledButton
            onClick={() => handleAddToWatchlistInternal("Completed")}
            variant="secondary"
            className={`${commonButtonClasses} !border-brand-accent-peach !text-brand-accent-peach hover:!bg-brand-accent-peach hover:!text-brand-text-primary`}
          >
            Mark Complete
          </StyledButton>
        );
      } else if (currentWatchlistStatus === "Completed") {
        return (
          <div className={`${commonButtonClasses} bg-brand-primary-action/10 text-brand-primary-action border border-brand-primary-action/30 rounded-md font-medium flex items-center justify-center gap-1.5`}>
            ✓ Completed
          </div>
        );
      } else { 
        return (
          <StyledButton
            onClick={() => handleAddToWatchlistInternal("Plan to Watch")}
            variant="primary"
            className={commonButtonClasses}
          >
            Add to Watchlist
          </StyledButton>
        );
      }
    }
    return (
        <StyledButton
            onClick={() => handleAddToWatchlistInternal("Plan to Watch")}
            variant="primary"
            className={commonButtonClasses}
            disabled={!animeDocumentId && !isRecommendation}
        >
            Add to Watchlist
        </StyledButton>
    );
  };
  
  const displayRating = anime.rating !== undefined && anime.rating !== null ? (anime.rating / 2).toFixed(1) : null;
  const ribbonText = displayRating ? `⭐ ${displayRating}` : anime.year ? String(anime.year) : (anime.title ? "Info" : "New");


  return (
    <div className={styles.card}>
      <div className={styles.imageContainer}>
        {/* This placeholder is shown if neither imageLoaded nor imageError is true yet for the src */}
        {!imageLoaded && !imageError && (
          <div className={styles.imageLoadingPlaceholder} />
        )}
        <img
          ref={imgRef}
          key={posterToDisplay} // Helps React re-evaluate if the actual image URL string changes
          src={posterToDisplay}
          alt={anime.title || "Anime Poster"}
          className={`${styles.image} ${imageLoaded ? styles.imageLoaded : ''}`}
          onLoad={handleImageLoad}
          onError={handleImageError}
        />
        <div className={styles.imageOverlay}></div>
        <div className={styles.cornerRibbon}>
          <span className={styles.cornerRibbonText}>{ribbonText}</span>
        </div>
        {/* Only render rating container if image (even placeholder) is loaded and there's a rating */}
        {imageLoaded && displayRating && (
           <div className={styles.ratingContainer}>
             <div className={styles.ratingStars}>
               {[...Array(5)].map((_, i) => (
                 <svg key={i} className={`${styles.star} ${i < Math.floor(parseFloat(displayRating)) ? styles.starFilled : styles.starEmpty}`} fill="currentColor" viewBox="0 0 20 20">
                   <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                 </svg>
               ))}
             </div>
             <span className={styles.ratingText}>{displayRating}/5</span>
           </div>
         )}
      </div>

      <div className={styles.details}>
        <h3 className={styles.title} title={anime.title || "Untitled Anime"}>
          {anime.title || "Untitled Anime"}
        </h3>
        {anime.year && <p className={styles.year}>{anime.year}</p>}
        
        {anime.description && (
          <p className={styles.description} title={anime.description}>
            {anime.description}
          </p>
        )}

        {anime.genres && anime.genres.length > 0 && (
          <div className={styles.genres}>
            {anime.genres.slice(0, 2).map((genre) => ( 
              <span key={genre} className={styles.genreTag}>
                {genre}
              </span>
            ))}
            {anime.genres.length > 2 && (
                <span className={styles.genreTag}>+{anime.genres.length-2}</span>
            )}
          </div>
        )}
        
        <div className={styles.actions}>
          {onViewDetails && animeDocumentId && (
            <StyledButton
              onClick={() => onViewDetails(animeDocumentId)}
              variant="secondary"
              className="w-full !text-xs !py-[7px]"
            >
              View Details
            </StyledButton>
          )}
          {renderWatchlistButton()}
        </div>
      </div>
    </div>
  );
};

export default memo(AnimeCardComponent);