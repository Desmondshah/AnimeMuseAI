// src/components/animuse/AnimeCard.tsx - Fixed version with improved error handling
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
  const [currentSrc, setCurrentSrc] = useState<string>("");
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const img = imgRef.current;
    if (img && img.complete && img.naturalWidth > 0) {
      setImageLoaded(true);
    }
  }, []);
  
  const addAnimeByUser = useMutation(api.anime.addAnimeByUser);

  // FIXED: Improved ID resolution logic
  const animeIdFromProp = (anime as Doc<"anime">)._id;
  
  // Only query by title if we don't have an ID AND it's a recommendation
  const shouldQueryByTitle = !animeIdFromProp && isRecommendation && anime.title;
  const existingAnimeInDB = useQuery(
    api.anime.getAnimeByTitle,
    shouldQueryByTitle ? { title: anime.title } : "skip"
  );
  
  // Determine the final anime ID to use
  const animeDocumentId = animeIdFromProp || existingAnimeInDB?._id;
  
  // High-quality placeholder
  const placeholderUrl = useMemo(() => {
    const bgColor = "ECB091"; 
    const textColor = "321D0B"; 
    const encodedTitle = encodeURIComponent((anime.title || "Anime").substring(0, 20));
    return `https://placehold.co/600x900/${bgColor}/${textColor}/png?text=${encodedTitle}&font=roboto`;
  }, [anime.title]);

  const posterToDisplay = useMemo(() => {
    if (imageError || !anime.posterUrl) return placeholderUrl;
    
    if (anime.posterUrl.includes('300x450') || anime.posterUrl.includes('placeholder')) {
      return placeholderUrl;
    }
    
    return anime.posterUrl;
  }, [imageError, anime.posterUrl, placeholderUrl]);

  // Reset loading state when poster URL changes
  useEffect(() => {
    setImageLoaded(false);
    setImageError(false);
    setCurrentSrc(posterToDisplay);
  }, [posterToDisplay]);

  // Detect cached images after the source is updated
  useEffect(() => {
    const img = imgRef.current;
    if (!imageLoaded && img && img.complete && img.naturalWidth > 0) {
      setImageLoaded(true);
    }
  }, [currentSrc, imageLoaded]);

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

  // FIXED: Improved click handler with better error handling and retry logic
  const handleCardClick = async () => {
  if (isNavigating) return;
  
  // Add haptic feedback if available
  if ('vibrate' in navigator) {
    navigator.vibrate(50);
  }
  
  // Prevent double-tap zoom on iOS
  const now = Date.now();
  if (now - (handleCardClick as any).lastClick < 300) {
    return;
  }
  (handleCardClick as any).lastClick = now;
  
  console.log(`[AnimeCard] Click handler started for: ${anime.title}`);
  console.log(`[AnimeCard] Current animeDocumentId: ${animeDocumentId}`);
  console.log(`[AnimeCard] isRecommendation: ${isRecommendation}`);
  console.log(`[AnimeCard] onViewDetails provided:`, !!onViewDetails);
  
  // FIXED: Early return if no navigation function and it's needed
  if (!onViewDetails) {
    console.warn(`[AnimeCard] No navigation function provided for: ${anime.title}`);
    toast.info(`Click functionality not available for this item`);
    return;
  }
  
  setIsNavigating(true);
  
  try {
    let idToNavigate = animeDocumentId;
    
    // FIXED: Wait for database query to complete if it's still loading
    if (shouldQueryByTitle && existingAnimeInDB === undefined) {
      console.log(`[AnimeCard] Waiting for database query to complete...`);
      // Give the query a moment to complete
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    // FIXED: Re-check for existing anime after waiting
    if (!idToNavigate && isRecommendation) {
      console.log(`[AnimeCard] No ID found, attempting to add anime to database...`);
      
      const toastId = `prepare-details-${anime.title?.replace(/[^a-zA-Z0-9]/g, '') || 'new-anime'}`;
      toast.loading("Preparing anime details...", { id: toastId });
      
      // FIXED: More robust anime object validation
      const animeToAdd = {
        title: anime.title?.trim() || "Unknown Title",
        description: anime.description?.trim() || "No description available.",
        posterUrl: (anime.posterUrl && !anime.posterUrl.includes('placeholder')) ? anime.posterUrl : placeholderUrl,
        genres: Array.isArray(anime.genres) ? anime.genres.filter(g => g && g.trim()) : [],
        year: typeof anime.year === 'number' && anime.year > 1900 ? anime.year : undefined,
        rating: typeof anime.rating === 'number' && anime.rating >= 0 && anime.rating <= 10 ? anime.rating : undefined,
        emotionalTags: Array.isArray(anime.emotionalTags) ? anime.emotionalTags.filter(tag => tag && tag.trim()) : [],
        trailerUrl: anime.trailerUrl && anime.trailerUrl.trim() ? anime.trailerUrl : undefined,
        studios: Array.isArray(anime.studios) ? anime.studios.filter(s => s && s.trim()) : [],
        themes: Array.isArray(anime.themes) ? anime.themes.filter(t => t && t.trim()) : []
      };
      
      console.log(`[AnimeCard] Adding anime to database with data:`, animeToAdd);
      
      try {
        // FIXED: Better error handling for the mutation
        idToNavigate = await addAnimeByUser(animeToAdd);
        
        if (!idToNavigate) {
          throw new Error("Mutation completed but returned no ID");
        }
        
        console.log(`[AnimeCard] Successfully added anime with ID: ${idToNavigate}`);
        toast.success("Anime added to database! Opening details...", { id: toastId, duration: 2000 });
        
        // FIXED: Small delay to ensure the anime is properly saved
        await new Promise(resolve => setTimeout(resolve, 200));
        
      } catch (mutationError: any) {
        console.error("[AnimeCard] Database mutation failed:", mutationError);
        toast.error(`Failed to add anime: ${mutationError.message || 'Unknown error'}`, { id: toastId });
        throw mutationError;
      }
    }

    // FIXED: Final validation before navigation
    if (!idToNavigate) {
      throw new Error("No anime ID available after all attempts");
    }
    
    console.log(`[AnimeCard] Navigating to anime detail with ID: ${idToNavigate}`);
    onViewDetails(idToNavigate);
    
  } catch (error: any) {
    console.error("[AnimeCard] Click handler error:", error);
    
    // FIXED: More specific error messages
    if (error.message.includes("mutation")) {
      toast.error(`Database error: ${error.message}`);
    } else if (error.message.includes("navigation")) {
      toast.error(`Navigation error: ${error.message}`);
    } else {
      toast.error(`Could not open anime details: ${error.message}`);
    }
    
    // FIXED: Fallback option for users
    setTimeout(() => {
      toast.info(`Try refreshing the page or contact support if the issue persists`, { duration: 5000 });
    }, 1000);
    
  } finally {
    setIsNavigating(false);
  }
};
  
  const displayRatingOrYear = anime.rating !== undefined && anime.rating !== null 
    ? `⭐ ${(anime.rating / 2).toFixed(1)}` 
    : anime.year ? String(anime.year) 
    : null;

  return (
    <div 
      className={`${styles.clickablePoster} ${className || ''} ${isNavigating ? 'opacity-75 cursor-wait' : ''} 
        touch-manipulation select-none`}
      onClick={handleCardClick}
      role="button"
      tabIndex={0}
      onKeyPress={(e) => (e.key === 'Enter' || e.key === ' ') && handleCardClick()}
      aria-label={`View details for ${anime.title || "anime"}`}
      style={{ 
        cursor: isNavigating ? 'wait' : 'pointer',
        WebkitUserSelect: 'none',
        userSelect: 'none'
      }}
    >
      <div className={`${styles.imageContainer} relative overflow-hidden`}>
        {/* Loading skeleton */}
        {!imageLoaded && (
          <div className={`${styles.imageLoadingPlaceholder} bg-gradient-to-br from-brand-accent-gold/20 to-brand-surface`}>
            <div className="animate-pulse text-center p-2">
              <div className="text-lg sm:text-2xl mb-2">🎭</div>
              <div className="text-xs opacity-70">Loading...</div>
            </div>
          </div>
        )}
        
        <img
          ref={imgRef}
          src={posterToDisplay}
          alt={anime.title ? `${anime.title} poster` : "Anime Poster"}
          className={`${styles.image} ${imageLoaded ? styles.imageLoaded : ''}`}
          onLoad={handleImageLoad}
          onError={handleImageError}
          loading="lazy"
          sizes="(max-width: 375px) 50vw, (max-width: 768px) 33vw, (max-width: 1200px) 25vw, 20vw"
          style={{ 
            opacity: imageLoaded ? 1 : 0,
            transition: 'opacity 0.3s ease-in-out',
            WebkitUserDrag: 'none',
            userDrag: 'none',
            pointerEvents: 'none',
          } as React.CSSProperties}
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