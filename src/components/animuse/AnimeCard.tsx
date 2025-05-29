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
    if (!idToNavigate && isRecommendation && onViewDetails) {
        try {
            const toastId = `prepare-details-${anime.title || 'new-anime'}`;
            toast.loading("Getting details...", { id: toastId });
            idToNavigate = await addAnimeByUser({
                title: anime.title || "Unknown Title",
                description: anime.description || "No description available.",
                posterUrl: anime.posterUrl || placeholderUrl,
                genres: anime.genres || [], year: anime.year, rating: anime.rating,
                emotionalTags: anime.emotionalTags || [],
                trailerUrl: anime.trailerUrl || undefined,
                studios: anime.studios || [], themes: anime.themes || []
            });
            toast.dismiss(toastId);
            if (!idToNavigate) throw new Error("Could not add anime to view details.");
        } catch (error: any) {
            toast.error(error.data?.message || error.message || "Error preparing details.");
            console.error("Error adding AI rec before navigating:", error);
            return;
        }
    }

    if (idToNavigate && onViewDetails) {
      onViewDetails(idToNavigate);
    } else if (!onViewDetails) {
        console.warn("AnimeCard (Poster): onViewDetails prop is not provided.");
    } else if (!idToNavigate) {
        toast.info("Details for this item are not available yet.");
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