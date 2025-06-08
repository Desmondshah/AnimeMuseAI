// Clean swipe-only Carousel.tsx - Remove all visible UI controls

import React, { useRef, useState, useLayoutEffect, useEffect, useCallback, useMemo } from "react";
import { motion, useMotionValue, useSpring, AnimatePresence, PanInfo, useTransform } from "framer-motion";
import { useMobileOptimizations } from "../../../../convex/useMobileOptimizations";

interface CarouselProps {
  children: React.ReactNode[];
  className?: string;
  // Keep only essential props
  variant?: 'default' | 'stack' | 'shuffle' | 'perspective';
  autoPlay?: boolean;
  autoPlayInterval?: number;
  scaleEffect?: boolean;
  rotationEffect?: boolean;
  // Remove showDots - no visible controls
  centerMode?: boolean;
  snapToCenter?: boolean;
  onItemClick?: (index: number) => void;
}

const useDebouncedIndex = (value: number, delay: number = 100) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

export default function Carousel({ 
  children, 
  className,
  variant = 'default',
  autoPlay = false,
  autoPlayInterval = 3000,
  scaleEffect = false,
  rotationEffect = false,
  centerMode = false,
  snapToCenter = false,
  onItemClick
}: CarouselProps) {
  const { isMobile, shouldReduceAnimations } = useMobileOptimizations();
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [width, setWidth] = useState(0);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [autoPlayActive, setAutoPlayActive] = useState(autoPlay);

  // Motion values for smooth animations
  const x = useMotionValue(0);
  const springX = useSpring(x, { damping: 20, stiffness: 300 });
  
  // Transform values for effects (but more subtle)
  const rotate = useTransform(x, [-width, 0, width], [rotationEffect ? 5 : 0, 0, rotationEffect ? -5 : 0]);
  const scale = useTransform(x, [-width, 0, width], [scaleEffect ? 0.9 : 1, 1, scaleEffect ? 0.9 : 1]);

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (el) {
      const newWidth = el.scrollWidth - el.offsetWidth;
      setWidth(newWidth);
    }
  }, [children]);

  // Auto-play (but pause when user interacts)
  useEffect(() => {
    if (!autoPlayActive || isDragging || children.length <= 1) return;
    
    const interval = setInterval(() => {
      setCurrentIndex(prev => {
        const next = (prev + 1) % children.length;
        return next;
      });
    }, autoPlayInterval);
    
    return () => clearInterval(interval);
  }, [autoPlayActive, isDragging, children.length, autoPlayInterval]);

  // Enhanced gesture handling
  const handleDragStart = useCallback(() => {
    setIsDragging(true);
    setAutoPlayActive(false); // Pause auto-play on interaction
    
    // Subtle haptic feedback
    if ('vibrate' in navigator) {
      navigator.vibrate(30);
    }
  }, []);

  const handleDragEnd = useCallback((_event: any, info: PanInfo) => {
    setIsDragging(false);
    
    // More sensitive swipe detection for mobile
    const threshold = isMobile ? 30 : 50;
    const velocity = Math.abs(info.velocity.x);
    
    let newIndex = currentIndex;
    
    // Consider both distance and velocity for natural feel
    if (info.offset.x > threshold || (velocity > 500 && info.offset.x > 10)) {
      // Swipe right
      newIndex = Math.max(0, currentIndex - 1);
    } else if (info.offset.x < -threshold || (velocity > 500 && info.offset.x < -10)) {
      // Swipe left
      newIndex = Math.min(children.length - 1, currentIndex + 1);
    }
    
    setCurrentIndex(newIndex);
    
    // Resume auto-play after a delay
    setTimeout(() => setAutoPlayActive(autoPlay), 3000);
  }, [currentIndex, children.length, autoPlay, isMobile]);

  // Stack variant (iOS wallet style - clean, no buttons)
  const renderStackVariant = () => (
    <div className="relative h-80 w-full flex items-center justify-center">
      <AnimatePresence mode="popLayout">
        {children.map((child, index) => {
          const isActive = index === currentIndex;
          const isNext = index === currentIndex + 1;
          const isPrev = index === currentIndex - 1;
          
          if (!isActive && !isNext && !isPrev) return null;
          
          return (
            <motion.div
              key={index}
              className="absolute cursor-pointer"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{
                scale: isActive ? 1 : isNext ? 0.95 : 0.9,
                opacity: isActive ? 1 : 0.7,
                rotateY: isActive ? 0 : isNext ? 8 : -8,
                x: isActive ? 0 : isNext ? 15 : -15,
                y: isActive ? 0 : isNext ? 8 : 15,
                zIndex: isActive ? 10 : isNext ? 5 : 1
              }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ 
                type: shouldReduceAnimations ? 'tween' : 'spring', 
                damping: 25, 
                stiffness: 400,
                duration: shouldReduceAnimations ? 0.2 : undefined
              }}
              whileTap={{ scale: 0.95 }}
              drag="x"
              dragConstraints={{ left: -50, right: 50 }}
              onDragEnd={(_, info) => {
                if (Math.abs(info.offset.x) > 30) {
                  if (info.offset.x > 0 && currentIndex > 0) {
                    setCurrentIndex(currentIndex - 1);
                  } else if (info.offset.x < 0 && currentIndex < children.length - 1) {
                    setCurrentIndex(currentIndex + 1);
                  }
                }
              }}
              onTap={() => {
                if (!isActive) {
                  setCurrentIndex(index);
                  if ('vibrate' in navigator) navigator.vibrate(30);
                }
                onItemClick?.(index);
              }}
            >
              {child}
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );

  const debouncedCurrentIndex = useDebouncedIndex(currentIndex, 50);
  
  // Memoize expensive calculations
  const visibleIndices = useMemo(() => {
    const indices = [];
    const range = variant === 'shuffle' ? 2 : 3;
    for (let i = Math.max(0, debouncedCurrentIndex - range); 
         i <= Math.min(children.length - 1, debouncedCurrentIndex + range); 
         i++) {
      indices.push(i);
    }
    return indices;
  }, [debouncedCurrentIndex, children.length, variant]);

  // Optimized professional shuffle variant 
  const renderShuffleVariant = () => {
    const [dragOffset, setDragOffset] = useState(0);
    const [isDraggingCard, setIsDraggingCard] = useState(false);
    
    return (
      <div 
        className="relative h-80 w-full flex items-center justify-center overflow-hidden"
        style={{ perspective: '800px' }}
      >
        {children.map((child, index) => {
          const offset = index - currentIndex;
          const isVisible = Math.abs(offset) <= 2; // Reduce visible cards for performance
          const isActive = offset === 0;
          const absOffset = Math.abs(offset);
          
          if (!isVisible) return null;
          
          // Simplified positioning for better performance
          const baseRotationY = offset * 8;
          const baseX = offset * 20;
          const baseY = absOffset * 4;
          const baseScale = 1 - absOffset * 0.04;
          const baseOpacity = 1 - absOffset * 0.12;
          
          return (
            <motion.div
              key={index}
              className="absolute cursor-pointer"
              style={{
                zIndex: children.length - absOffset,
                transform: `translate3d(0,0,${-absOffset * 50}px)`, // GPU acceleration
              }}
              animate={{
                rotateY: baseRotationY + (isDraggingCard && isActive ? dragOffset * 0.08 : 0),
                x: baseX + (isDraggingCard && isActive ? dragOffset * 0.2 : 0),
                y: baseY,
                scale: baseScale + (isActive && isDraggingCard ? 0.01 : 0),
                opacity: baseOpacity,
              }}
              transition={{
                type: shouldReduceAnimations ? 'tween' : 'spring',
                damping: 30,
                stiffness: 300, // Reduced for smoother feel
                duration: shouldReduceAnimations ? 0.15 : undefined,
              }}
              whileHover={
                isActive && !isDraggingCard
                  ? { scale: baseScale + 0.03, y: baseY - 6 }
                  : absOffset === 1
                  ? { scale: baseScale + 0.015, opacity: baseOpacity + 0.08 }
                  : {}
              }
              whileTap={{ scale: baseScale - 0.02 }}
              drag={isActive ? 'x' : false}
              dragConstraints={{ left: -120, right: 120 }}
              dragElastic={0.15}
              dragMomentum={false}
              onDragStart={() => {
                setIsDraggingCard(true);
                if ('vibrate' in navigator) navigator.vibrate(20);
              }}
              onDrag={(_, info) => {
                setDragOffset(info.offset.x);
              }}
              onDragEnd={(_event: any, info: PanInfo) => {
                setIsDraggingCard(false);
                setDragOffset(0);
                
                const threshold = 60;
                const velocity = Math.abs(info.velocity.x);
                
                if (Math.abs(info.offset.x) > threshold || velocity > 400) {
                  if (info.offset.x > 0 || (velocity > 400 && info.velocity.x > 0)) {
                    setCurrentIndex(prev => Math.max(prev - 1, 0));
                  } else {
                    setCurrentIndex(prev => Math.min(prev + 1, children.length - 1));
                  }
                  if ('vibrate' in navigator) navigator.vibrate(40);
                }
              }}
              onTap={() => {
                if (!isActive && !isDraggingCard) {
                  setCurrentIndex(index);
                  if ('vibrate' in navigator) navigator.vibrate(25);
                }
                onItemClick?.(index);
              }}
            >
              {/* Simplified card container for performance */}
              <div
                className={`relative rounded-xl overflow-hidden transition-shadow duration-200 ${
                  isActive
                    ? 'shadow-2xl ring-1 ring-white/20'
                    : 'shadow-lg'
                }`}
                style={{
                  filter: isActive ? 'drop-shadow(0 8px 25px rgba(0,0,0,0.3))' : 'drop-shadow(0 4px 12px rgba(0,0,0,0.15))',
                }}
              >
                {child}
                
                {/* Minimal active indicator */}
                {isActive && (
                  <div
                    className="absolute inset-0 rounded-xl pointer-events-none opacity-20"
                    style={{
                      background: 'linear-gradient(135deg, rgba(255,255,255,0.1), transparent 50%)',
                    }}
                  />
                )}
              </div>
            </motion.div>
          );
        })}
        
        {/* Simplified position indicators */}
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-1.5">
          {children.map((_, index) => (
            <motion.div
              key={index}
              className={`w-1.5 h-1.5 rounded-full cursor-pointer transition-all duration-200 ${
                index === currentIndex ? 'bg-white/80 scale-110' : 'bg-white/40'
              }`}
              whileTap={{ scale: 0.9 }}
              onClick={() => setCurrentIndex(index)}
            />
          ))}
        </div>
      </div>
    );
  };

  // Default variant - pure swipe, no visible controls
  const renderDefaultVariant = () => (
    <div ref={containerRef} className="overflow-hidden">
      <motion.div
        className="flex space-x-6 sm:space-x-8 will-change-transform touch-pan-x"
        style={{ x: springX }}
        drag="x"
        dragConstraints={{ right: 0, left: -width }}
        dragElastic={0.1}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        whileTap={{ cursor: "grabbing" }}
      >
        {children.map((child, index) => (
          <motion.div
            key={index}
            className="flex-shrink-0"
            style={{
              scale,
              rotateY: rotate,
            }}
            whileTap={{ scale: 0.95 }}
            onTap={() => {
              setCurrentIndex(index);
              if ('vibrate' in navigator) navigator.vibrate(30);
              onItemClick?.(index);
            }}
          >
            {child}
          </motion.div>
        ))}
      </motion.div>
    </div>
  );

  return (
    <div className={`relative ${className || ''}`}>
      {variant === 'stack' && renderStackVariant()}
      {variant === 'shuffle' && renderShuffleVariant()}
      {(!variant || variant === 'default') && renderDefaultVariant()}
      
      {/* REMOVED: All visible UI controls (dots, buttons, progress bars) */}
      
      {/* Optional: Very subtle indicators only - uncomment if you want minimal feedback */}
      {/* 
      <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2">
        <div className="flex space-x-1">
          {children.map((_, index) => (
            <div
              key={index}
              className={`w-1 h-1 rounded-full transition-colors duration-200 ${
                index === currentIndex ? 'bg-white/60' : 'bg-white/20'
              }`}
            />
          ))}
        </div>
      </div>
      */}
    </div>
  );
}

// Usage in MainApp.tsx - Clean and simple:
/*
<Carousel variant="stack" className="py-4">
  {category.recommendations.map((rec, index) => (
    <AnimeCard 
      key={index}
      anime={rec} 
      isRecommendation={true} 
      onViewDetails={handleAnimeCardClick}
    />
  ))}
</Carousel>

// Or for shuffle effect:
<Carousel variant="shuffle" className="py-4">
  {category.recommendations.map((rec, index) => (
    <AnimeCard 
      key={index}
      anime={rec} 
      isRecommendation={true} 
      onViewDetails={handleAnimeCardClick}
    />
  ))}
</Carousel>
*/