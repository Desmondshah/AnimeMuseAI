// src/components/animuse/EnhancedAnimeCard.tsx - iPhone CPU & GPU Optimized
import React, { memo, useState, useEffect, useRef, useMemo, useCallback } from "react";
import { Doc, Id } from "../../../convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { toast } from "sonner";
import { AnimeRecommendation } from "../../../convex/types";
import { useIOSHardwareOptimization } from "../../../convex/useIOSHardwareOptimization";
import { useGPUAcceleration } from "../../../convex/useGPUAcceleration";
import { useWebWorkerPool } from "../../../convex/useWebWorkerPool";
import { useInView } from "react-intersection-observer";

interface EnhancedAnimeCardProps {
  anime: AnimeRecommendation | Doc<"anime">;
  onViewDetails?: (animeId: Id<"anime">) => void;
  isRecommendation?: boolean;
  className?: string;
  enableAdvancedOptimizations?: boolean;
  priority?: 'high' | 'normal' | 'low';
}

const EnhancedAnimeCard: React.FC<EnhancedAnimeCardProps> = memo(({
  anime,
  onViewDetails,
  isRecommendation = false,
  className = '',
  enableAdvancedOptimizations = true,
  priority = 'normal'
}) => {
  // Hardware optimization hooks
  const { capabilities, createGPUOptimizedElement, isOptimized } = useIOSHardwareOptimization();
  const { accelerateElement, processImage } = useGPUAcceleration();
  const workerPool = useWebWorkerPool({
    maxWorkers: capabilities.logicalCpuCores >= 4 ? 2 : 1,
    taskTimeout: 5000,
    enableLogging: false
  });

  // State management
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const [optimizedImageUrl, setOptimizedImageUrl] = useState<string | null>(null);
  const [isProcessingImage, setIsProcessingImage] = useState(false);

  // Refs
  const cardRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const animationFrameRef = useRef<number | undefined>(undefined);

  // Intersection observer for lazy loading and performance
  const { ref: intersectionRef, inView } = useInView({
    threshold: 0.1,
    triggerOnce: true,
    rootMargin: '50px',
  });

  // Convex queries and mutations
  const addAnimeByUser = useMutation(api.anime.addAnimeByUser);
  
  const animeIdFromProp = (anime as Doc<"anime">)._id;
  const shouldQueryByTitle = !animeIdFromProp && isRecommendation && anime.title;
  const existingAnimeInDB = useQuery(
    api.anime.getAnimeByTitle,
    shouldQueryByTitle ? { title: anime.title } : "skip"
  );
  
  const animeDocumentId = animeIdFromProp || existingAnimeInDB?._id;

  // Optimized placeholder generation
  const placeholderUrl = useMemo(() => {
    const bgColor = "ECB091";
    const textColor = "321D0B";
    const encodedTitle = encodeURIComponent((anime.title || "Anime").substring(0, 20));
    return `https://placehold.co/600x900/${bgColor}/${textColor}/png?text=${encodedTitle}&font=roboto`;
  }, [anime.title]);

  // Smart poster URL selection
  const posterToDisplay = useMemo(() => {
    if (imageError) return placeholderUrl;
    if (optimizedImageUrl) return optimizedImageUrl;

    const candidatePoster = anime.posterUrl || existingAnimeInDB?.posterUrl;
    
    if (!candidatePoster || 
        candidatePoster.includes('300x450') || 
        candidatePoster.includes('placeholder')) {
      return placeholderUrl;
    }

    return candidatePoster;
  }, [imageError, optimizedImageUrl, anime.posterUrl, existingAnimeInDB?.posterUrl, placeholderUrl]);

  // GPU-accelerated image processing
  const processImageWithGPU = useCallback(async (imageUrl: string) => {
    if (!enableAdvancedOptimizations || !capabilities.isIPhone || isProcessingImage) {
      return imageUrl;
    }

    setIsProcessingImage(true);
    
    try {
      // Use Web Worker for image optimization if available
      if (workerPool.isReady && capabilities.supportsOffscreenCanvas) {
        const optimizedUrl = await workerPool.compressImage(
          imageUrl,
          0.85, // quality
          600,  // max width
          900   // max height
        );
        setOptimizedImageUrl(optimizedUrl);
        return optimizedUrl;
      }

      // Fallback to GPU processing
      if (imgRef.current && capabilities.hardwareAcceleration) {
        const processed = await processImage(imgRef.current, {
          brightness: 0.05,
          contrast: 1.1,
          saturation: 1.05
        });
        setOptimizedImageUrl(processed);
        return processed;
      }

      return imageUrl;
    } catch (error) {
      console.warn('Image processing failed:', error);
      return imageUrl;
    } finally {
      setIsProcessingImage(false);
    }
  }, [
    enableAdvancedOptimizations,
    capabilities.isIPhone,
    capabilities.supportsOffscreenCanvas,
    capabilities.hardwareAcceleration,
    isProcessingImage,
    workerPool,
    processImage
  ]);

  // Enhanced image loading with hardware optimization
  const handleImageLoad = useCallback(async () => {
    setImageLoaded(true);
    setImageError(false);

    // Process image with GPU/CPU optimization after loading
    if (enableAdvancedOptimizations && inView && imgRef.current) {
      await processImageWithGPU(posterToDisplay);
    }
  }, [enableAdvancedOptimizations, inView, posterToDisplay, processImageWithGPU]);

  const handleImageError = useCallback(() => {
    setImageError(true);
    setImageLoaded(true);
  }, []);

  // Hardware-accelerated click handler
  const handleCardClick = useCallback(async () => {
    if (isNavigating) return;

    // iPhone haptic feedback
    if (capabilities.isIPhone && 'vibrate' in navigator) {
      navigator.vibrate(50);
    }

    // Prevent double-tap zoom
    const now = Date.now();
    if (now - (handleCardClick as any).lastClick < 300) {
      return;
    }
    (handleCardClick as any).lastClick = now;

    if (!onViewDetails) {
      toast.info('Click functionality not available for this item');
      return;
    }

    setIsNavigating(true);

    try {
      let idToNavigate = animeDocumentId;

      if (!idToNavigate && isRecommendation) {
        // Use Web Worker for data processing if available
        let processedAnimeData;
        
        if (workerPool.isReady) {
          processedAnimeData = await workerPool.processData([{
            title: anime.title?.trim() || "Unknown Title",
            description: anime.description?.trim() || "No description available.",
            posterUrl: optimizedImageUrl || anime.posterUrl || placeholderUrl,
            genres: anime.genres || [],
            year: anime.year,
            rating: anime.rating,
            emotionalTags: anime.emotionalTags || [],
            trailerUrl: anime.trailerUrl,
            studios: anime.studios || [],
            themes: anime.themes || []
          }], 'filter');
          
          if (processedAnimeData && processedAnimeData[0]) {
            idToNavigate = await addAnimeByUser(processedAnimeData[0]);
          }
        } else {
          // Fallback to regular processing
          const animeToAdd = {
            title: anime.title?.trim() || "Unknown Title",
            description: anime.description?.trim() || "No description available.",
            posterUrl: optimizedImageUrl || anime.posterUrl || placeholderUrl,
            genres: Array.isArray(anime.genres) ? anime.genres : [],
            year: typeof anime.year === 'number' ? anime.year : undefined,
            rating: typeof anime.rating === 'number' ? anime.rating : undefined,
            emotionalTags: Array.isArray(anime.emotionalTags) ? anime.emotionalTags : [],
            trailerUrl: anime.trailerUrl,
            studios: Array.isArray(anime.studios) ? anime.studios : [],
            themes: Array.isArray(anime.themes) ? anime.themes : []
          };
          
          idToNavigate = await addAnimeByUser(animeToAdd);
        }
      }

      if (!idToNavigate) {
        throw new Error("No anime ID available");
      }

      // GPU-accelerated navigation transition
      if (cardRef.current && capabilities.hardwareAcceleration) {
        accelerateElement(cardRef.current);
        cardRef.current.style.transform = 'scale(0.95)';
        cardRef.current.style.opacity = '0.8';
        
        setTimeout(() => {
          onViewDetails(idToNavigate!);
        }, 150);
      } else {
        onViewDetails(idToNavigate);
      }

    } catch (error: any) {
      console.error('Enhanced card click error:', error);
      toast.error(`Error: ${error.message}`);
    } finally {
      setIsNavigating(false);
    }
  }, [
    isNavigating,
    capabilities.isIPhone,
    capabilities.hardwareAcceleration,
    onViewDetails,
    animeDocumentId,
    isRecommendation,
    workerPool,
    optimizedImageUrl,
    anime,
    placeholderUrl,
    addAnimeByUser,
    accelerateElement
  ]);

  // Apply hardware optimizations to card element
  useEffect(() => {
    if (cardRef.current && enableAdvancedOptimizations && capabilities.isIPhone) {
      createGPUOptimizedElement(cardRef.current);
      accelerateElement(cardRef.current);
    }
  }, [enableAdvancedOptimizations, capabilities.isIPhone, createGPUOptimizedElement, accelerateElement]);

  // Performance monitoring
  useEffect(() => {
    if (capabilities.isIPhone && inView) {
      const startTime = performance.now();
      
      animationFrameRef.current = requestAnimationFrame(() => {
        const renderTime = performance.now() - startTime;
        if (renderTime > 16.67) { // > 60fps
          console.warn(`Slow render detected: ${renderTime.toFixed(2)}ms`);
        }
      });
      
      return () => {
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
      };
    }
  }, [capabilities.isIPhone, inView]);

  // Dynamic class generation based on capabilities
  const cardClasses = useMemo(() => {
    const baseClasses = [
      'relative',
      'group',
      'cursor-pointer',
      'transition-all',
      'duration-300',
      'ease-out',
      className
    ];

    if (capabilities.isIPhone && enableAdvancedOptimizations) {
      baseClasses.push(
        'iphone-gpu-accelerated',
        'iphone-hardware-layer',
        'iphone-performance-optimized'
      );

      if (capabilities.hardwareAcceleration) {
        baseClasses.push('iphone-gpu-scale');
      }

      if (priority === 'high') {
        baseClasses.push('iphone-15-pro-optimized');
      }

      if (capabilities.isLowPowerMode) {
        baseClasses.push('iphone-low-power');
      }
    }

    return baseClasses.join(' ');
  }, [capabilities, enableAdvancedOptimizations, className, priority]);

  const imageClasses = useMemo(() => {
    const baseClasses = [
      'w-full',
      'h-full',
      'object-cover',
      'rounded-lg',
      'transition-opacity',
      'duration-300'
    ];

    if (capabilities.isIPhone && enableAdvancedOptimizations) {
      baseClasses.push(
        'iphone-image-optimized',
        'iphone-ai-processing'
      );

      if (capabilities.hardwareAcceleration) {
        baseClasses.push('iphone-mps-ready');
      }
    }

    return baseClasses.join(' ');
  }, [capabilities, enableAdvancedOptimizations]);

  return (
    <div
      ref={(node) => {
        cardRef.current = node;
        intersectionRef(node);
      }}
      className={cardClasses}
      onClick={handleCardClick}
      style={{
        ...(isNavigating && { 
          transform: 'scale(0.95)', 
          opacity: 0.8,
          transition: 'all 0.15s ease-out'
        })
      }}
    >
      <div className="aspect-[3/4] relative overflow-hidden rounded-lg bg-brand-surface">
        {inView && (
          <>
            {/* Optimized image loading */}
            <img
              ref={imgRef}
              src={posterToDisplay}
              alt={anime.title || 'Anime poster'}
              className={imageClasses}
              loading={priority === 'high' ? 'eager' : 'lazy'}
              decoding="async"
              onLoad={handleImageLoad}
              onError={handleImageError}
              style={{
                opacity: imageLoaded ? 1 : 0,
                ...(isProcessingImage && { filter: 'blur(2px)' })
              }}
            />

            {/* Loading state */}
            {!imageLoaded && (
              <div className="absolute inset-0 bg-brand-surface animate-pulse flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-brand-accent-gold border-t-transparent rounded-full animate-spin" />
              </div>
            )}

            {/* GPU-accelerated overlay */}
            <div className={`
              absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent
              opacity-0 group-hover:opacity-100 transition-opacity duration-300
              ${capabilities.hardwareAcceleration ? 'iphone-backdrop-blur' : ''}
            `} />

            {/* Content overlay */}
            <div className="absolute bottom-0 left-0 right-0 p-4 text-white transform translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
              <h3 className={`
                font-semibold text-sm mb-1 line-clamp-2
                ${capabilities.isIPhone ? 'iphone-optimized-animation' : ''}
              `}>
                {anime.title}
              </h3>
              
              {anime.year && (
                <p className="text-xs text-white/80">
                  {anime.year}
                </p>
              )}
              
              {anime.rating && (
                <div className="flex items-center gap-1 mt-1">
                  <span className="text-yellow-400 text-xs">★</span>
                  <span className="text-xs text-white/80">
                    {typeof anime.rating === 'number' ? anime.rating.toFixed(1) : anime.rating}
                  </span>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Performance indicator (debug mode) */}
      {process.env.NODE_ENV === 'development' && capabilities.isIPhone && (
        <div className="absolute top-2 right-2 text-xs bg-black/50 text-white px-2 py-1 rounded">
          {isOptimized ? '🚀' : '⚠️'}
        </div>
      )}
    </div>
  );
});

EnhancedAnimeCard.displayName = 'EnhancedAnimeCard';

export default EnhancedAnimeCard; 