// src/components/animuse/AnimeCard.tsx - Performance Optimized Version
import React, { memo, useState, useEffect, useRef, useMemo, useCallback } from "react";
import { Doc, Id } from "../../../convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { toast } from "sonner";
import { AnimeRecommendation } from "../../../convex/types";
import { useMobileOptimizations } from "../../../convex/useMobileOptimizations";
import styles from '../../AnimeCard.module.css';

interface AnimeCardProps {
  anime: AnimeRecommendation | Doc<"anime">;
  onViewDetails?: (animeId: Id<"anime">) => void;
  isRecommendation?: boolean;
  className?: string; 
}

// Image preloader hook for better performance
const useImagePreloader = (src: string) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    if (!src) return;

    // Check if image is already cached
    const img = new Image();
    if (img.complete && img.naturalWidth > 0) {
      setIsLoaded(true);
      return;
    }

    const preloadImage = () => {
      const image = new Image();
      image.onload = () => {
        setIsLoaded(true);
        setHasError(false);
      };
      image.onerror = () => {
        setHasError(true);
        setIsLoaded(false);
      };
      image.src = src;
    };

    // Small delay to avoid blocking main thread
    const timer = setTimeout(preloadImage, 50);
    return () => clearTimeout(timer);
  }, [src]);

  return { isLoaded, hasError };
};

const AnimeCardComponent: React.FC<AnimeCardProps> = ({
  anime,
  onViewDetails,
  isRecommendation = false,
  className, 
}) => {
  const [isNavigating, setIsNavigating] = useState(false);
  const { shouldReduceAnimations, isLowPerformance } = useMobileOptimizations();
  
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
  
  // High-quality placeholder with memoization
  const placeholderUrl = useMemo(() => {
    const bgColor = "ECB091"; 
    const textColor = "321D0B"; 
    const encodedTitle = encodeURIComponent((anime.title || "Anime").substring(0, 20));
    return `https://placehold.co/600x900/${bgColor}/${textColor}/png?text=${encodedTitle}&font=roboto`;
  }, [anime.title]);

  // Optimized poster URL selection
  const posterToDisplay = useMemo(() => {
    // Prefer poster from recommendation, otherwise check DB result
    const candidatePoster = anime.posterUrl || existingAnimeInDB?.posterUrl;

    if (!candidatePoster ||
        candidatePoster.includes('300x450') ||
        candidatePoster.includes('placeholder')) {
      return placeholderUrl;
    }

    return candidatePoster;
  }, [anime.posterUrl, existingAnimeInDB?.posterUrl, placeholderUrl]);

  // Use optimized image preloader
  const { isLoaded: imageLoaded, hasError: imageError } = useImagePreloader(posterToDisplay);

  // Optimized click handler with debouncing
  const handleCardClick = useCallback(async () => {
    if (isNavigating) return;
    
    // Add haptic feedback if available (non-blocking)
    if ('vibrate' in navigator) {
      navigator.vibrate(50);
    }
    
    console.log(`[AnimeCard] Click handler started for: ${anime.title}`);
    
    // FIXED: Early return if no navigation function and it's needed
    if (!onViewDetails) {
      console.warn(`[AnimeCard] No navigation function provided for: ${anime.title}`);
      toast.info(`Click functionality not available for this item`);
      return;
    }
    
    setIsNavigating(true);
    
    try {
      let idToNavigate = animeDocumentId;
      
      // FIXED: Reduced wait time for database query
      if (shouldQueryByTitle && existingAnimeInDB === undefined) {
        console.log(`[AnimeCard] Waiting for database query to complete...`);
        // Reduced from 500ms to 200ms
        await new Promise(resolve => setTimeout(resolve, 200));
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
          
          // FIXED: Reduced delay from 200ms to 100ms
          await new Promise(resolve => setTimeout(resolve, 100));
          
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
  }, [isNavigating, anime.title, onViewDetails, animeDocumentId, shouldQueryByTitle, existingAnimeInDB, isRecommendation, anime, placeholderUrl, addAnimeByUser]);
  
  const displayRatingOrYear = useMemo(() => {
    return anime.rating !== undefined && anime.rating !== null 
      ? `⭐ ${(anime.rating / 2).toFixed(1)}` 
      : anime.year ? String(anime.year) 
      : null;
  }, [anime.rating, anime.year]);

  // Performance optimized styles
  const cardStyles = useMemo(() => ({
    cursor: isNavigating ? 'wait' : 'pointer',
    WebkitUserSelect: 'none' as const,
    userSelect: 'none' as const,
    contain: 'layout style paint' as const,
    willChange: shouldReduceAnimations ? 'auto' : 'transform',
  }), [isNavigating, shouldReduceAnimations]);

  const imageStyles = useMemo(() => ({
    opacity: imageLoaded ? 1 : 0,
    transition: shouldReduceAnimations ? 'opacity 0.15s ease-in-out' : 'opacity 0.3s ease-in-out',
    WebkitUserDrag: 'none' as const,
    userDrag: 'none' as const,
    pointerEvents: 'none' as const,
  }), [imageLoaded, shouldReduceAnimations]);

  return (
    <div 
      className={`${styles.clickablePoster} ${className || ''} ${isNavigating ? 'opacity-75 cursor-wait' : ''} 
        touch-manipulation select-none`}
      onClick={handleCardClick}
      role="button"
      tabIndex={0}
      onKeyPress={(e) => (e.key === 'Enter' || e.key === ' ') && handleCardClick()}
      aria-label={`View details for ${anime.title || "anime"}`}
      style={cardStyles}
    >
      <div className={`${styles.imageContainer} relative overflow-hidden`}>
        {/* Optimized loading skeleton - only show if image not loaded and not errored */}
        {!imageLoaded && !imageError && (
          <div className={`${styles.imageLoadingPlaceholder} bg-gradient-to-br from-brand-accent-gold/20 to-brand-surface`}>
            <div className={shouldReduceAnimations ? "text-center p-2" : "animate-pulse text-center p-2"}>
              <div className="text-lg sm:text-2xl mb-2">🎭</div>
              <div className="text-xs opacity-70">Loading...</div>
            </div>
          </div>
        )}
        
        <img
          src={posterToDisplay}
          alt={anime.title ? `${anime.title} poster` : "Anime Poster"}
          className={`${styles.image} ${imageLoaded ? styles.imageLoaded : ''}`}
          loading="lazy"
          decoding="async"
          sizes="(max-width: 375px) 50vw, (max-width: 768px) 33vw, (max-width: 1200px) 25vw, 20vw"
          style={imageStyles}
        />
      </div>
      
      {displayRatingOrYear && (
        <div className={styles.cornerRibbon}>
          <span className={styles.cornerRibbonText}>{displayRatingOrYear}</span>
        </div>
      )}
      
      {isNavigating && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg">
          <div className={shouldReduceAnimations ? 
            "rounded-full h-8 w-8 border-b-2 border-white" : 
            "animate-spin rounded-full h-8 w-8 border-b-2 border-white"}
          ></div>
        </div>
      )}
    </div>
  );
};

export default memo(AnimeCardComponent);