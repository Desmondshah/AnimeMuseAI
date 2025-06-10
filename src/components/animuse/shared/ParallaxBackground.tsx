import React from "react";
import { motion, useScroll, useTransform, useSpring } from "framer-motion";

interface ParallaxBackgroundProps {
  /** Optional CSS classes for positioning and styling */
  className?: string;
  /** Children to render inside the parallax container */
  children?: React.ReactNode;
  /** Multiplier controlling vertical parallax strength */
  speed?: number;
  /** Multiplier controlling horizontal parallax strength */
  horizontalSpeed?: number;
}

export default function ParallaxBackground({
  className,
  children,
  speed = 0.1,
  horizontalSpeed = 0,
}: ParallaxBackgroundProps) {
  // Track scroll position
  const { scrollY } = useScroll();

  // Map scroll position to translations
  const y = useSpring(useTransform(scrollY, (v) => -v * speed), {
    stiffness: 50,
    damping: 20,
  });
  const x = useSpring(useTransform(scrollY, (v) => v * horizontalSpeed), {
    stiffness: 50,
    damping: 20,
  });

  return (
    <motion.div style={{ x, y }} className={className}>
      {children}
    </motion.div>
  );
}