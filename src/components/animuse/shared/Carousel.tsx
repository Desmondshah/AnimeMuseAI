// OptimizedCarousel.tsx - Fixed version with proper snapping and positioning
import React, {
  useRef,
  useState,
  useLayoutEffect,
  useEffect,
  useCallback,
  useMemo,
  memo,
} from "react";
import {
  motion,
  useMotionValue,
  useSpring,
  AnimatePresence,
  PanInfo,
  useTransform,
} from "framer-motion";
import { useRafInterval } from "../../../../convex/useRafInterval";
import { useMobileOptimizations } from "../../../../convex/useMobileOptimizations";

interface CarouselProps {
  children: React.ReactNode[];
  className?: string;
  variant?: "default" | "stack" | "shuffle" | "perspective";
  autoPlay?: boolean;
  autoPlayInterval?: number;
  scaleEffect?: boolean;
  rotationEffect?: boolean;
  centerMode?: boolean;
  snapToCenter?: boolean;
  onItemClick?: (index: number) => void;
}

// ShuffleCard component - FIXED: Added isMobile prop
const ShuffleCard = memo(
  ({
    child,
    index,
    currentIndex,
    childrenLength,
    shouldReduceAnimations,
    isMobile,
    screenWidth,
    onIndexChange,
    onItemClick,
  }: {
    child: React.ReactNode;
    index: number;
    currentIndex: number;
    childrenLength: number;
    shouldReduceAnimations: boolean;
    isMobile: boolean; // FIXED: Added isMobile prop
    screenWidth: number;
    onIndexChange: (newIndex: number) => void;
    onItemClick?: (index: number) => void;
  }) => {
    const [isDragging, setIsDragging] = useState(false);
    const dragEndTimeout = useRef<number | null>(null);
    const dragX = useMotionValue(0);

    const cardData = useMemo(() => {
      const offset = index - currentIndex;
      const isVisible = Math.abs(offset) <= (isMobile ? 1 : 2); // Show fewer cards on mobile
      const isActive = offset === 0;
      const absOffset = Math.abs(offset);

      const width = screenWidth ||
        (typeof window !== "undefined" ? window.innerWidth : 768);
      const spacing = isMobile
        ? Math.min(12, Math.max(8, width / 30)) // Tighter spacing on mobile
        : 20;

      return {
        offset,
        isVisible,
        isActive,
        absOffset,
        baseRotationY: isMobile ? offset * 4 : offset * 8, // Less rotation on mobile
        baseX: offset * spacing,
        baseY: isMobile ? absOffset * (spacing / 6) : absOffset * (spacing / 4), // Less vertical offset on mobile
        baseZ: isMobile ? -absOffset * spacing * 2 : -absOffset * spacing * 3, // Less depth on mobile
        baseScale: isMobile ? (1 - absOffset * 0.08) : (1 - absOffset * 0.04), // More scale difference on mobile
        baseOpacity: isMobile ? (1 - absOffset * 0.3) : (1 - absOffset * 0.12), // More opacity difference on mobile
        zIndex: childrenLength - absOffset,
      };
    }, [index, currentIndex, childrenLength, isMobile, screenWidth]);

    const rotateY = useTransform(
      dragX,
      (v) => cardData.baseRotationY + (cardData.isActive ? v * (isMobile ? 0.04 : 0.08) : 0),
    );
    const translateX = useTransform(
      dragX,
      (v) => cardData.baseX + (cardData.isActive ? v * (isMobile ? 0.15 : 0.2) : 0),
    );

    const handleDragEnd = useCallback(
      (_: any, info: PanInfo) => {
         if (dragEndTimeout.current) clearTimeout(dragEndTimeout.current);
        dragEndTimeout.current = window.setTimeout(() => setIsDragging(false), isMobile ? 30 : 50);
        dragX.set(0);

        const threshold = isMobile ? 40 : 60; // Lower threshold for mobile
        const velocity = Math.abs(info.velocity.x);

        if (Math.abs(info.offset.x) > threshold || velocity > (isMobile ? 250 : 400)) {
          if (info.offset.x > 0 || (velocity > (isMobile ? 250 : 400) && info.velocity.x > 0)) {
            onIndexChange(Math.max(currentIndex - 1, 0));
          } else {
            onIndexChange(Math.min(currentIndex + 1, childrenLength - 1));
          }
          if ("vibrate" in navigator) navigator.vibrate(isMobile ? 30 : 40);
        }
      },
      [currentIndex, childrenLength, onIndexChange, dragX, isMobile],
    );

    const handleDragStart = useCallback(() => {
      if (dragEndTimeout.current) clearTimeout(dragEndTimeout.current);
      setIsDragging(true);
      if ("vibrate" in navigator) navigator.vibrate(20);
    }, []);

    const handleDrag = useCallback(
      (_: any, info: PanInfo) => {
        dragX.set(info.offset.x);

        // Prevent page scroll if dragging horizontally
        const horizontalMovement = Math.abs(info.offset.x);
        const verticalMovement = Math.abs(info.offset.y);

        if (horizontalMovement > verticalMovement && horizontalMovement > 5) {
          if (window.event) {
            window.event.preventDefault?.();
          }
        }
      },
      [dragX],
    );

    const handleTap = useCallback(() => {
      if (isDragging) return;

      if (!cardData.isActive) {
        onIndexChange(index);
        if ("vibrate" in navigator) navigator.vibrate(25);
        return;
      }

      onItemClick?.(index);
    }, [cardData.isActive, isDragging, index, onIndexChange, onItemClick]);

    useEffect(() => {
      return () => {
        if (dragEndTimeout.current) clearTimeout(dragEndTimeout.current);
      };
    }, []);

    if (!cardData.isVisible) return null;

    return (
      <motion.div
        className="absolute cursor-pointer"
        style={{
          willChange: "transform",
          backfaceVisibility: "hidden",
          WebkitBackfaceVisibility: "hidden",
          zIndex: cardData.zIndex,
          transform: `translate3d(0,0,${cardData.baseZ}px)`,
          rotateY,
          x: translateX,
          y: cardData.baseY,
          scale:
            cardData.baseScale + (cardData.isActive && isDragging ? (isMobile ? 0.005 : 0.01) : 0),
          opacity: cardData.baseOpacity,
        }}
        transition={{
          type: shouldReduceAnimations ? "tween" : "spring",
          damping: isMobile ? 18 : 25, // Even less damping on mobile
          stiffness: isMobile ? 220 : 180, // Higher stiffness on mobile
          mass: isMobile ? 0.5 : 0.8, // Lighter mass on mobile
          duration: shouldReduceAnimations ? (isMobile ? 0.12 : 0.2) : undefined,
        }}
        whileHover={
          cardData.isActive && !isDragging && !isMobile
            ? { scale: cardData.baseScale + 0.03, y: cardData.baseY - 6 }
            : cardData.absOffset === 1 && !isMobile
              ? {
                  scale: cardData.baseScale + 0.015,
                  opacity: cardData.baseOpacity + 0.08,
                }
              : {}
        }
        whileTap={{ scale: cardData.baseScale - (isMobile ? 0.01 : 0.02) }}
        drag={cardData.isActive ? "x" : false}
        dragConstraints={{ left: isMobile ? -80 : -120, right: isMobile ? 80 : 120 }}
        dragElastic={isMobile ? 0.03 : 0.05} // Much less elastic on mobile
        dragMomentum={false}
        dragDirectionLock={true}
        onDragStart={handleDragStart}
        onDrag={handleDrag}
        onDragEnd={handleDragEnd}
        onTap={handleTap}
      >
        <div
          className={`relative rounded-xl overflow-hidden transition-shadow duration-200 ${
            cardData.isActive ? "shadow-2xl ring-1 ring-white/20" : "shadow-lg"
          }`}
          style={{
            filter: cardData.isActive
              ? "drop-shadow(0 8px 25px rgba(0,0,0,0.3))"
              : "drop-shadow(0 4px 12px rgba(0,0,0,0.15))",
          }}
        >
          {child}
          {cardData.isActive && (
            <div
              className="absolute inset-0 rounded-xl pointer-events-none opacity-20"
              style={{
                background:
                  "linear-gradient(135deg, rgba(255,255,255,0.1), transparent 50%)",
              }}
            />
          )}
        </div>
      </motion.div>
    );
  },
);

const useDebouncedIndex = (value: number, delay: number = 50) => {
  const [debouncedValue, setDebouncedValue] = useState(value);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );

  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [value, delay]);

  return debouncedValue;
};

const PositionIndicators = memo(
  ({
    childrenLength,
    currentIndex,
    onIndexChange,
  }: {
    childrenLength: number;
    currentIndex: number;
    onIndexChange: (index: number) => void;
  }) => (
    <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-1.5">
      {Array.from({ length: childrenLength }, (_, index) => (
        <motion.div
          key={index}
          className={`w-1.5 h-1.5 rounded-full cursor-pointer transition-all duration-200 ${
            index === currentIndex ? "bg-white/80 scale-110" : "bg-white/40"
          }`}
          whileTap={{ scale: 0.9 }}
          onClick={() => onIndexChange(index)}
        />
      ))}
    </div>
  ),
);

export default function OptimizedCarousel({
  children,
  className,
  variant = "default",
  autoPlay = false,
  autoPlayInterval = 3000,
  scaleEffect = false,
  rotationEffect = false,
  centerMode = false,
  snapToCenter = false,
  onItemClick,
}: CarouselProps) {
  const { isMobile, shouldReduceAnimations, performanceMetrics } =
    useMobileOptimizations();
  const screenWidth = performanceMetrics.screenSize.width;
  const containerRef = useRef<HTMLDivElement>(null);

  // FIXED: Better state management for default carousel
  const [containerWidth, setContainerWidth] = useState(0);
  const [itemWidth, setItemWidth] = useState(0);
  const [visibleItems, setVisibleItems] = useState(1);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [autoPlayActive, setAutoPlayActive] = useState(autoPlay);

  const debouncedCurrentIndex = useDebouncedIndex(currentIndex, 30);

  // FIXED: Motion values with proper spring configuration
  const x = useMotionValue(0);
  const springX = useSpring(x, {
    damping: isMobile ? 20 : 25, // Reduced damping for mobile
    stiffness: isMobile ? 200 : 180, // Increased stiffness for mobile
    mass: isMobile ? 0.6 : 0.8, // Reduced mass for mobile
    restDelta: 0.001,
  });

  // Transform values for effects
  const rotate = useTransform(
    x,
    [-containerWidth, 0, containerWidth],
    [rotationEffect ? 2 : 0, 0, rotationEffect ? -2 : 0],
  );
  const scale = useTransform(
    x,
    [-containerWidth, 0, containerWidth],
    [scaleEffect ? 0.98 : 1, 1, scaleEffect ? 0.98 : 1],
  );

  const handleIndexChange = useCallback((newIndex: number) => {
    setCurrentIndex(newIndex);
  }, []);

  // FIXED: Better size calculation
  useLayoutEffect(() => {
    const updateSizes = () => {
      const container = containerRef.current;
      if (!container) return;

      const containerRect = container.getBoundingClientRect();
      const firstChild = container.querySelector(".carousel-item");

      if (firstChild) {
        const childRect = firstChild.getBoundingClientRect();
        const gap = isMobile ? 24 : 32; // 6 = 24px, 8 = 32px in Tailwind

        setContainerWidth(containerRect.width);
        setItemWidth(childRect.width + gap);
        setVisibleItems(
          Math.floor(containerRect.width / (childRect.width + gap)),
        );
      }
    };

    updateSizes();
    window.addEventListener("resize", updateSizes);
    return () => window.removeEventListener("resize", updateSizes);
  }, [children, isMobile]);

  // FIXED: Proper position calculation and animation
  useEffect(() => {
    if (itemWidth > 0) {
      const targetPosition = -currentIndex * itemWidth;
      const maxPosition = -(children.length - visibleItems) * itemWidth;
      const clampedPosition = Math.max(
        maxPosition,
        Math.min(0, targetPosition),
      );

      x.set(clampedPosition);
    }
  }, [currentIndex, itemWidth, visibleItems, children.length, x]);

  // Auto-play effect using requestAnimationFrame for smoother updates
  useRafInterval(
    () => {
      setCurrentIndex((prev) => {
        const maxIndex = Math.max(0, children.length - visibleItems);
        return prev >= maxIndex ? 0 : prev + 1;
      });
    },
    autoPlayInterval,
    autoPlayActive && !isDragging && children.length > 1,
  );

  // FIXED: Enhanced gesture handling with proper snapping and scroll prevention
  const handleDragStart = useCallback((event: any) => {
    setIsDragging(true);
    setAutoPlayActive(false);

    // Prevent page scrolling during carousel drag
    if (event.touches) {
      event.preventDefault();
    }

    if ("vibrate" in navigator) navigator.vibrate(20);
  }, []);

  const handleDragEnd = useCallback(
    (_event: any, info: PanInfo) => {
      setIsDragging(false);

      if (itemWidth === 0) return;

      const threshold = isMobile ? itemWidth * 0.15 : itemWidth * 0.2; // Lower threshold for mobile
      const velocity = Math.abs(info.velocity.x);
      const offset = info.offset.x;

      let newIndex = currentIndex;

      // Determine direction based on offset and velocity
      if (offset > threshold || (velocity > (isMobile ? 200 : 300) && offset > 10)) {
        // Swiping right (previous item)
        newIndex = Math.max(0, currentIndex - 1);
      } else if (offset < -threshold || (velocity > (isMobile ? 200 : 300) && offset < -10)) {
        // Swiping left (next item)
        const maxIndex = Math.max(0, children.length - visibleItems);
        newIndex = Math.min(maxIndex, currentIndex + 1);
      }

      setCurrentIndex(newIndex);

      // Re-enable autoplay after a delay
      setTimeout(() => setAutoPlayActive(autoPlay), 2000);
    },
    [currentIndex, children.length, autoPlay, itemWidth, visibleItems, isMobile],
  );

  // FIXED: Better drag constraints and scroll prevention
  const dragConstraints = useMemo(() => {
    if (itemWidth === 0) return { left: 0, right: 0 };

    const maxScroll = Math.max(0, (children.length - visibleItems) * itemWidth);
    const overScrollAmount = isMobile ? itemWidth * 0.2 : itemWidth * 0.3; // Less over-scroll on mobile
    return {
      left: -maxScroll - overScrollAmount,
      right: overScrollAmount,
    };
  }, [itemWidth, children.length, visibleItems, isMobile]);

  // FIXED: Handle drag with direction detection to prevent page scroll
  const handleDrag = useCallback((event: any, info: PanInfo) => {
    // If we're dragging more horizontally than vertically, prevent page scroll
    const horizontalMovement = Math.abs(info.offset.x);
    const verticalMovement = Math.abs(info.offset.y);

    if (horizontalMovement > verticalMovement && horizontalMovement > 10) {
      event.preventDefault?.();
    }
  }, []);

  // Shuffle variant - FIXED: Pass isMobile prop
  const shuffleVariant = useMemo(
    () => (
      <div
        className="carousel-shuffle-container relative h-80 w-full flex items-center justify-center overflow-visible"
        style={{
          perspective: isMobile ? "600px" : `${Math.min(800, Math.max(500, screenWidth * 1.2))}px`,
          touchAction: "pan-y pinch-zoom", // Allow vertical scroll but manage horizontal
        }}
      >
        
        {children.map((child, index) => (
          <ShuffleCard
            key={`shuffle-card-${index}`}
            child={child}
            index={index}
            currentIndex={debouncedCurrentIndex}
            childrenLength={children.length}
            shouldReduceAnimations={shouldReduceAnimations}
            isMobile={isMobile} // FIXED: Pass isMobile prop
            screenWidth={screenWidth}
            onIndexChange={handleIndexChange}
            onItemClick={onItemClick}
          />
        ))}

        <PositionIndicators
          childrenLength={children.length}
          currentIndex={currentIndex}
          onIndexChange={handleIndexChange}
        />
      </div>
    ),
    [
      children,
      debouncedCurrentIndex,
      shouldReduceAnimations,
      isMobile, // FIXED: Added to dependencies
      screenWidth,
      handleIndexChange,
      onItemClick,
      currentIndex,
    ],
  );

  // Stack variant (unchanged)
  const stackVariant = useMemo(
    () => (
      <div className="relative h-80 w-full flex items-center justify-center">
        <AnimatePresence mode="popLayout">
          {children.map((child, index) => {
            const isActive = index === currentIndex;
            const isNext = index === currentIndex + 1;
            const isPrev = index === currentIndex - 1;

            if (!isActive && !isNext && !isPrev) return null;

            return (
              <motion.div
                key={`stack-card-${index}`}
                className="absolute cursor-pointer"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{
                  scale: isActive ? 1 : isNext ? 0.95 : 0.9,
                  opacity: isActive ? 1 : 0.7,
                  rotateY: isActive ? 0 : isNext ? 8 : -8,
                  x: isActive ? 0 : isNext ? 15 : -15,
                  y: isActive ? 0 : isNext ? 8 : 15,
                  zIndex: isActive ? 10 : isNext ? 5 : 1,
                }}
                exit={{ scale: 0.8, opacity: 0 }}
                transition={{
                  type: shouldReduceAnimations ? "tween" : "spring",
                  damping: 25,
                  stiffness: 400,
                  duration: shouldReduceAnimations ? 0.2 : undefined,
                }}
                whileTap={{ scale: 0.95 }}
                drag="x"
                dragConstraints={{ left: -50, right: 50 }}
                onDragEnd={(_, info) => {
                  if (Math.abs(info.offset.x) > 30) {
                    if (info.offset.x > 0 && currentIndex > 0) {
                      setCurrentIndex(currentIndex - 1);
                    } else if (
                      info.offset.x < 0 &&
                      currentIndex < children.length - 1
                    ) {
                      setCurrentIndex(currentIndex + 1);
                    }
                  }
                }}
                onTap={() => {
                  if (!isActive) {
                    setCurrentIndex(index);
                    if ("vibrate" in navigator) navigator.vibrate(30);
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
    ),
    [children, currentIndex, shouldReduceAnimations, onItemClick],
  );

  // FIXED: Default variant with proper positioning, snapping, and scroll prevention
  const defaultVariant = useMemo(
    () => (
      <div
        ref={containerRef}
        className="overflow-hidden"
        style={{ touchAction: "pan-y pinch-zoom" }} // Allow vertical scroll but manage horizontal
      >
        <motion.div
          className="flex space-x-6 sm:space-x-8 will-change-transform"
          style={{
            x: springX,
            scale,
            rotateY: rotate,
            touchAction: "none", // Disable browser touch handling for the draggable element
          }}
          drag="x"
          dragConstraints={dragConstraints}
          dragElastic={isMobile ? 0.08 : 0.1} // Slightly less elastic on mobile for better control
          dragMomentum={false}
          dragDirectionLock={true} // Lock to horizontal dragging only
          onDragStart={handleDragStart}
          onDrag={handleDrag}
          onDragEnd={handleDragEnd}
          whileTap={{ cursor: "grabbing" }}
          transition={{
            type: shouldReduceAnimations ? "tween" : "spring",
            damping: isMobile ? 20 : 25,
            stiffness: isMobile ? 200 : 180,
            mass: isMobile ? 0.6 : 0.8,
            duration: shouldReduceAnimations ? (isMobile ? 0.15 : 0.2) : undefined,
          }}
        >
          {children.map((child, index) => (
            <motion.div
              key={`default-card-${index}`}
              className="flex-shrink-0 carousel-item"
              whileTap={{ scale: 0.95 }}
              onTap={() => {
                if (!isDragging) {
                  if ("vibrate" in navigator) navigator.vibrate(25);
                  onItemClick?.(index);
                }
              }}
            >
              {child}
            </motion.div>
          ))}
        </motion.div>
      </div>
    ),
    [
      children,
      springX,
      dragConstraints,
      handleDragStart,
      handleDrag,
      handleDragEnd,
      scale,
      rotate,
      onItemClick,
      isDragging,
      shouldReduceAnimations,
    ],
  );

  return (
    <div className={`relative ${className || ""}`}>
      {variant === "stack" && stackVariant}
      {variant === "shuffle" && shuffleVariant}
      {(!variant || variant === "default") && defaultVariant}
    </div>
  );
}