import React, { useRef, useState, useLayoutEffect } from "react";
import { motion } from "framer-motion";
import { useMobileOptimizations } from "../../../../convex/useMobileOptimizations";

interface CarouselProps {
  children: React.ReactNode[];
  className?: string;
}

export default function Carousel({ children, className }: CarouselProps) {
  const { isMobile, shouldReduceAnimations } = useMobileOptimizations();
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (el) {
      setWidth(el.scrollWidth - el.offsetWidth);
    }
  }, [children]);

  return (
    <div
      ref={containerRef}
      className={"overflow-hidden" + (className ? ` ${className}` : "")}
    >
      <motion.div
        className={`flex space-x-6 sm:space-x-8 will-change-transform ${isMobile ? 'snap-x snap-mandatory' : ''}`}
        drag={isMobile ? "x" : false}
        dragConstraints={isMobile ? { right: 0, left: -width } : undefined}
        dragElastic={0.2}
        whileTap={{ cursor: isMobile ? "grabbing" : "default" }}
        transition={{ type: shouldReduceAnimations ? 'tween' : 'spring', bounce: 0.2 }}
      >
        {children}
      </motion.div>
    </div>
  );
}