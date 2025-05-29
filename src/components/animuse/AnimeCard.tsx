// src/components/animuse/AnimeCard.tsx
import React, { memo, useState, useEffect, useRef, useMemo } from "react";
import { Doc, Id } from "../../../convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { toast } from "sonner";
import { AnimeRecommendation } from "../../../convex/types";
import styles from '../../AnimeCard.module.css';

interface AnimeCardProps { // Renaming to AnimePosterProps might be clearer but keeping AnimeCard for now
  anime: AnimeRecommendation | Doc<"anime">;
  onViewDetails?: (animeId: Id<"anime">) => void;
  isRecommendation?: boolean;
  className?: string; 
}

const AnimeCardComponent: React.FC<AnimeCardProps> = ({
  anime,
  onViewDetails,
  isRecommendation = false,
  className, 
}) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  const addAnimeByUser = useMutation(api.anime.addAnimeByUser);

  const animeIdFromProp = (anime as Doc<"anime">)._id;
  const existingAnimeInDB = useQuery(
    api.anime.getAnimeByTitle,
    anime.title && !animeIdFromProp ? { title: anime.title } : "skip"
  );
  const animeDocumentId = animeIdFromProp || existingAnimeInDB?._id;
  
  const placeholderUrl = useMemo(() => {
    const bgColor = "ECB091"; 
    const textColor = "321D0B"; 
    return `https://placehold.co/300x450/${bgColor}/${textColor}/png?text=%20&font=poppins`;
  }, []);

  const posterToDisplay = useMemo(() => {
    return imageError || !anime.posterUrl ? placeholderUrl : anime.posterUrl;
  }, [imageError, anime.posterUrl, placeholderUrl]);

  useEffect(() => {
    setImageLoaded(false);
    setImageError(false);
    const imageElement = imgRef.current;
    if (imageElement && posterToDisplay) { 
      if (imageElement.src === posterToDisplay && imageElement.complete) {
        if (imageElement.naturalHeight > 0) setImageLoaded(true);
        else { setImageError(true); setImageLoaded(true); }
      }
    } else if (!posterToDisplay) {
        setImageError(true);
        setImageLoaded(true);
    }
  }, [posterToDisplay, anime._id]);

  const handleImageLoad = () => { setImageLoaded(true); setImageError(false); };
  const handleImageError = () => { setImageError(true); setImageLoaded(true); };
  
  const handleCardClick = async () => {
  let idToNavigate = animeDocumentId;
  
  // If we don't have an ID and this is a recommendation, try to add it to the database
  if (!idToNavigate && isRecommendation && onViewDetails) {
    try {
      const toastId = `prepare-details-${anime.title || 'new-anime'}`;
      toast.loading("Preparing details...", { id: toastId });
      
      // Create a more robust anime object for the database
      const animeToAdd = {
        title: anime.title || "Unknown Title",
        description: anime.description || "No description available.",
        posterUrl: anime.posterUrl || placeholderUrl,
        genres: Array.isArray(anime.genres) ? anime.genres : [],
        year: anime.year || undefined, // Convert null to undefined
        rating: anime.rating || undefined, // Convert null to undefined
        emotionalTags: Array.isArray(anime.emotionalTags) ? anime.emotionalTags : [],
        trailerUrl: anime.trailerUrl || undefined,
        studios: Array.isArray(anime.studios) ? anime.studios : [],
        themes: Array.isArray(anime.themes) ? anime.themes : []
      };
      
      idToNavigate = await addAnimeByUser(animeToAdd);
      toast.dismiss(toastId);
      
      if (!idToNavigate) {
        throw new Error("Could not add anime to database.");
      }
      
      toast.success("Details ready!");
    } catch (error: any) {
      console.error("Error adding AI recommendation before navigating:", error);
      toast.error("Could not prepare anime details. Please try again.");
      return; // Don't attempt navigation
    }
  }

  // Navigate if we have an ID and a navigation function
  if (idToNavigate && onViewDetails) {
    try {
      onViewDetails(idToNavigate);
    } catch (error) {
      console.error("Navigation error:", error);
      toast.error("Could not open details page.");
    }
  } else if (!onViewDetails) {
    console.warn("AnimeCard: onViewDetails prop is not provided.");
    toast.info("Navigation function not available.");
  } else if (!idToNavigate) {
    console.warn("AnimeCard: No anime ID available for navigation.");
    toast.info("Anime details are not ready yet.");
  }
};
  
  const displayRatingOrYear = anime.rating !== undefined && anime.rating !== null 
    ? `⭐ ${(anime.rating / 2).toFixed(1)}` 
    : anime.year ? String(anime.year) 
    : null;

  return (
    <div 
        className={`${styles.clickablePoster} ${className || ''}`} 
        onClick={handleCardClick}
        role="button"
        tabIndex={0}
        onKeyPress={(e) => (e.key === 'Enter' || e.key === ' ') && handleCardClick()}
        aria-label={`View details for ${anime.title || "anime"}`}
    >
      <div className={styles.imageContainer}>
        {!imageLoaded && !imageError && (
          <div className={styles.imageLoadingPlaceholder} />
        )}
        <img
          ref={imgRef}
          key={posterToDisplay}
          src={posterToDisplay}
          alt={anime.title ? `${anime.title} poster` : "Anime Poster"}
          className={`${styles.image} ${imageLoaded ? styles.imageLoaded : ''}`}
          onLoad={handleImageLoad}
          onError={handleImageError}
        />
      </div>
      {displayRatingOrYear && (
        <div className={styles.cornerRibbon}>
          <span className={styles.cornerRibbonText}>{displayRatingOrYear}</span>
        </div>
      )}
      {/* Title and other details are NOT rendered by this component anymore */}
    </div>
  );
};

export default memo(AnimeCardComponent);