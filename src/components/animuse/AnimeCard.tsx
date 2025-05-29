// src/components/animuse/AnimeCard.tsx - Enhanced with high-quality placeholders and better navigation
import React, { memo, useState, useEffect, useRef, useMemo } from "react";
import { Doc, Id } from "../../../convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { toast } from "sonner";
import { AnimeRecommendation } from "../../../convex/types";
import styles from '../../AnimeCard.module.css';

interface AnimeCardProps {
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
  const [isNavigating, setIsNavigating] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  const addAnimeByUser = useMutation(api.anime.addAnimeByUser);

  const animeIdFromProp = (anime as Doc<"anime">)._id;
  const existingAnimeInDB = useQuery(
    api.anime.getAnimeByTitle,
    anime.title && !animeIdFromProp ? { title: anime.title } : "skip"
  );
  const animeDocumentId = animeIdFromProp || existingAnimeInDB?._id;
  
  // High-quality placeholder - increased to 600x900 for better resolution
  const placeholderUrl = useMemo(() => {
    const bgColor = "ECB091"; 
    const textColor = "321D0B"; 
    const encodedTitle = encodeURIComponent((anime.title || "Anime").substring(0, 20));
    return `https://placehold.co/600x900/${bgColor}/${textColor}/png?text=${encodedTitle}&font=roboto`;
  }, [anime.title]);

  const posterToDisplay = useMemo(() => {
    if (imageError || !anime.posterUrl) return placeholderUrl;
    
    // If the current poster is a low-quality placeholder, use our high-quality one
    if (anime.posterUrl.includes('300x450') || anime.posterUrl.includes('placeholder')) {
      return placeholderUrl;
    }
    
    return anime.posterUrl;
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

  const handleImageLoad = () => { 
    setImageLoaded(true); 
    setImageError(false); 
    console.log(`[AnimeCard] Successfully loaded poster for: ${anime.title}`);
  };
  
  const handleImageError = () => { 
    setImageError(true); 
    setImageLoaded(true); 
    console.warn(`[AnimeCard] Failed to load poster for: ${anime.title}, using placeholder`);
  };
  
  const handleCardClick = async () => {
    if (isNavigating) return; // Prevent double-clicks
    
    console.log(`[AnimeCard] Card clicked for: ${anime.title}`);
    console.log(`[AnimeCard] Is recommendation: ${isRecommendation}`);
    console.log(`[AnimeCard] Existing ID: ${animeDocumentId}`);
    console.log(`[AnimeCard] Has onViewDetails: ${!!onViewDetails}`);
    
    let idToNavigate = animeDocumentId;
  
    // If we don't have an ID and this is a recommendation, try to add it to the database
    if (!idToNavigate && isRecommendation && onViewDetails) {
      setIsNavigating(true);
      try {
        const toastId = `prepare-details-${anime.title || 'new-anime'}`;
        toast.loading("Preparing details...", { id: toastId });
        
        // Create a robust anime object for the database
        const animeToAdd = {
          title: anime.title || "Unknown Title",
          description: anime.description || "No description available.",
          posterUrl: anime.posterUrl || placeholderUrl,
          genres: Array.isArray(anime.genres) ? anime.genres : [],
          year: anime.year || undefined,
          rating: anime.rating || undefined,
          emotionalTags: Array.isArray(anime.emotionalTags) ? anime.emotionalTags : [],
          trailerUrl: anime.trailerUrl || undefined,
          studios: Array.isArray(anime.studios) ? anime.studios : [],
          themes: Array.isArray(anime.themes) ? anime.themes : []
        };
        
        console.log(`[AnimeCard] Adding anime to database:`, animeToAdd);
        idToNavigate = await addAnimeByUser(animeToAdd);
        toast.dismiss(toastId);
        
        if (!idToNavigate) {
          throw new Error("Could not add anime to database.");
        }
        
        console.log(`[AnimeCard] Successfully added anime with ID: ${idToNavigate}`);
        toast.success("Details ready! Opening...", { duration: 1000 });
      } catch (error: any) {
        console.error("[AnimeCard] Error adding AI recommendation:", error);
        toast.error("Could not prepare anime details. Please try again.");
        setIsNavigating(false);
        return;
      }
    }

    // Navigate if we have an ID and a navigation function
    if (idToNavigate && onViewDetails) {
      try {
        console.log(`[AnimeCard] Navigating to anime detail with ID: ${idToNavigate}`);
        onViewDetails(idToNavigate);
      } catch (error) {
        console.error("[AnimeCard] Navigation error:", error);
        toast.error("Could not open details page.");
      }
    } else if (!onViewDetails) {
      console.warn("[AnimeCard] onViewDetails prop is not provided.");
      toast.info("Navigation function not available.");
    } else if (!idToNavigate) {
      console.warn("[AnimeCard] No anime ID available for navigation.");
      toast.info("Anime details are not ready yet.");
    }
    
    setIsNavigating(false);
  };
  
  const displayRatingOrYear = anime.rating !== undefined && anime.rating !== null 
    ? `⭐ ${(anime.rating / 2).toFixed(1)}` 
    : anime.year ? String(anime.year) 
    : null;

  return (
    <div 
        className={`${styles.clickablePoster} ${className || ''} ${isNavigating ? 'opacity-75 cursor-wait' : ''}`} 
        onClick={handleCardClick}
        role="button"
        tabIndex={0}
        onKeyPress={(e) => (e.key === 'Enter' || e.key === ' ') && handleCardClick()}
        aria-label={`View details for ${anime.title || "anime"}`}
        style={{ cursor: isNavigating ? 'wait' : 'pointer' }}
    >
      <div className={styles.imageContainer}>
        {!imageLoaded && !imageError && (
          <div className={styles.imageLoadingPlaceholder}>
            <div className="animate-pulse text-center p-2">
              <div className="text-2xl mb-2">🎭</div>
              <div className="text-xs opacity-70">Loading...</div>
            </div>
          </div>
        )}
        <img
          ref={imgRef}
          key={posterToDisplay}
          src={posterToDisplay}
          alt={anime.title ? `${anime.title} poster` : "Anime Poster"}
          className={`${styles.image} ${imageLoaded ? styles.imageLoaded : ''}`}
          onLoad={handleImageLoad}
          onError={handleImageError}
          loading="lazy"
        />
      </div>
      {displayRatingOrYear && (
        <div className={styles.cornerRibbon}>
          <span className={styles.cornerRibbonText}>{displayRatingOrYear}</span>
        </div>
      )}
      {isNavigating && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
        </div>
      )}
    </div>
  );
};

export default memo(AnimeCardComponent);