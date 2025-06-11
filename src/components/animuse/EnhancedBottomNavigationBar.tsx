// src/components/animuse/EnhancedBottomNavigationBar.tsx
import React, { useRef, useState, useEffect } from "react";
import { motion, useScroll, useMotionValueEvent } from "framer-motion";
import { ValidViewName } from "./MainApp";
import { useTheme } from "../../hooks/useTheme";

interface BottomNavigationBarProps {
  currentView: ValidViewName; 
  onTabChange: (view: ValidViewName) => void;
}

const iconPaths: Record<string, string> = {
  dashboard: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6",
  moodboard_page: "M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01",
  browse: "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z",
  my_list: "M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z",
  profile_settings: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z",
};

const EnhancedBottomNavigationBar: React.FC<BottomNavigationBarProps> = ({ 
  currentView, 
  onTabChange 
}) => {
  const { isGlassTheme } = useTheme();
  const [isHidden, setIsHidden] = useState(false);
  const [activeTabPosition, setActiveTabPosition] = useState(0);
  const lastScrollY = useRef(0);
  const scrollContainerRef = useRef<HTMLElement | null>(null);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const tabs: { view: ValidViewName; label: string; icon: string; color?: string }[] = [
    { view: "dashboard", label: "Home", icon: "dashboard", color: isGlassTheme ? "#667EEA" : "#FF6B35" },
    { view: "moodboard_page", label: "Mood", icon: "moodboard_page", color: isGlassTheme ? "#764BA2" : "#B08968" },
    { view: "browse", label: "Browse", icon: "browse", color: isGlassTheme ? "#F093FB" : "#F4A261" },
    { view: "my_list", label: "List", icon: "my_list", color: isGlassTheme ? "#48BB78" : "#FF6B35" },
    { view: "profile_settings", label: "Profile", icon: "profile_settings", color: isGlassTheme ? "#ED8936" : "#B08968" },
  ];

  useEffect(() => {
    scrollContainerRef.current = document.getElementById('root');
  }, []);

  const { scrollY } = useScroll({
    container: scrollContainerRef
  });

  const handleTabClick = (view: ValidViewName, index: number) => {
    if ('vibrate' in navigator) {
      navigator.vibrate(50);
    }
    onTabChange(view);
    
    // Update active tab position for glass theme indicator
    if (isGlassTheme && tabRefs.current[index]) {
      const tabElement = tabRefs.current[index];
      const containerRect = tabElement?.parentElement?.getBoundingClientRect();
      const tabRect = tabElement?.getBoundingClientRect();
      
      if (containerRect && tabRect) {
        const position = tabRect.left - containerRect.left + (tabRect.width / 2);
        setActiveTabPosition(position);
      }
    }
  };

  useMotionValueEvent(scrollY, 'change', (latest) => {
    const currentY = latest;
    if (currentY > lastScrollY.current + 5 && currentY > 50) {
      setIsHidden(true);
    } else if (currentY < lastScrollY.current - 5 || currentY < 10) {
      setIsHidden(false);
    }
    lastScrollY.current = currentY;
  });

  // Update active tab position when current view changes
  useEffect(() => {
    const activeIndex = tabs.findIndex(tab => tab.view === currentView);
    if (activeIndex !== -1 && tabRefs.current[activeIndex] && isGlassTheme) {
      const tabElement = tabRefs.current[activeIndex];
      const containerRect = tabElement?.parentElement?.getBoundingClientRect();
      const tabRect = tabElement?.getBoundingClientRect();
      
      if (containerRect && tabRect) {
        const position = tabRect.left - containerRect.left + (tabRect.width / 2);
        setActiveTabPosition(position);
      }
    }
  }, [currentView, isGlassTheme, tabs]);

  const getNavStyles = () => {
    if (isGlassTheme) {
      return {
        background: 'rgba(255, 255, 255, 0.8)',
        backdropFilter: 'blur(40px)',
        WebkitBackdropFilter: 'blur(40px)',
        borderTop: '1px solid rgba(255, 255, 255, 0.2)',
        boxShadow: `
          0 -8px 32px rgba(0, 0, 0, 0.1),
          0 -4px 16px rgba(0, 0, 0, 0.05),
          inset 0 1px 0 rgba(255, 255, 255, 0.3)
        `,
      };
    } else {
      return {
        background: 'rgba(26, 26, 26, 0.8)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderTop: '1px solid rgba(176, 137, 104, 0.3)',
        boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.3)',
      };
    }
  };

  return (
    <motion.nav
      className="fixed bottom-0 left-0 right-0 z-50 rounded-t-2xl"
      style={{
        paddingBottom: 'max(12px, env(safe-area-inset-bottom))',
        paddingLeft: 'env(safe-area-inset-left)',
        paddingRight: 'env(safe-area-inset-right)',
        willChange: 'transform',
        ...getNavStyles(),
      }}
      initial={{ transform: "translateY(100%)" }}
      animate={{
        transform: isHidden ? "translateY(100%)" : "translateY(0%)",
      }}
      transition={{
        type: 'tween',
        duration: 0.3,
        ease: 'easeInOut'
      }}
    >
      {/* Glass Theme: Top Highlight Line */}
      {isGlassTheme && (
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/50 to-transparent" />
      )}
      
      {/* Glass Theme: Floating Active Tab Indicator */}
      {isGlassTheme && (
        <motion.div
          className="absolute top-3 h-12 w-16 rounded-2xl bg-gradient-to-r from-blue-500/20 to-purple-500/20 backdrop-blur-sm border border-white/30"
          style={{
            boxShadow: '0 4px 12px rgba(102, 126, 234, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.3)',
          }}
          animate={{
            x: activeTabPosition - 32, // Center the indicator (width/2)
          }}
          transition={{
            type: "spring",
            stiffness: 300,
            damping: 30,
          }}
        />
      )}

      <div className="max-w-lg mx-auto flex justify-around items-center h-20 px-1 relative">
        {tabs.map((tab, index) => {
          const isActive = currentView === tab.view;
          
          return (
            <button
              key={tab.view}
              ref={(el) => {
                tabRefs.current[index] = el;
              }}
              onClick={() => handleTabClick(tab.view, index)}
              className={`
                relative flex flex-col items-center justify-center
                w-full h-full py-2 px-2 text-xs
                transition-all duration-300 ease-out
                focus:outline-none touch-manipulation cursor-pointer
                ${isGlassTheme 
                  ? `${isActive ? 'text-blue-600' : 'text-gray-600 hover:text-gray-800'}` 
                  : `${isActive ? 'text-brand-primary-action' : 'text-white/70 hover:text-brand-accent-gold'}`
                }
                rounded-2xl
              `}
              style={{
                WebkitTapHighlightColor: 'transparent',
                minHeight: '60px',
                minWidth: '60px',
              }}
              aria-current={isActive ? "page" : undefined}
              aria-label={`Navigate to ${tab.label}`}
            >
              {/* Glass Theme: Individual Tab Ripple Effect */}
              {isGlassTheme && (
                <motion.div
                  className="absolute inset-0 rounded-2xl"
                  whileTap={{
                    background: 'radial-gradient(circle, rgba(255, 255, 255, 0.3) 0%, transparent 70%)',
                  }}
                  transition={{ duration: 0.2 }}
                />
              )}

              {/* Icon Container */}
              <motion.div
                className={`relative z-10 transition-all duration-300 ${
                  isActive ? 'scale-110' : 'hover:scale-105'
                }`}
                whileHover={{ scale: isActive ? 1.1 : 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <svg
                  className={`w-6 h-6 mb-1 transition-all duration-300 ${
                    isGlassTheme
                      ? isActive 
                        ? 'text-blue-600 drop-shadow-sm' 
                        : 'text-gray-600'
                      : isActive 
                        ? 'text-brand-primary-action' 
                        : 'text-white/70'
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth="1.5"
                  style={{
                    filter: isGlassTheme && isActive 
                      ? 'drop-shadow(0 2px 4px rgba(102, 126, 234, 0.3))' 
                      : 'none'
                  }}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d={iconPaths[tab.icon]} />
                </svg>

                {/* Glass Theme: Icon Glow Effect */}
                {isGlassTheme && isActive && (
                  <motion.div
                    className="absolute inset-0 rounded-full"
                    style={{
                      background: `radial-gradient(circle, ${tab.color}20 0%, transparent 70%)`,
                      filter: 'blur(8px)',
                    }}
                    animate={{
                      scale: [1, 1.2, 1],
                      opacity: [0.5, 0.8, 0.5],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: 'easeInOut',
                    }}
                  />
                )}
              </motion.div>

              {/* Label */}
              <motion.span
                className={`relative z-10 text-xs leading-tight transition-all duration-300 ${
                  isGlassTheme
                    ? isActive 
                      ? 'font-semibold text-blue-600' 
                      : 'text-gray-600'
                    : isActive 
                      ? 'font-semibold text-brand-primary-action' 
                      : 'text-white/70'
                }`}
                animate={{
                  scale: isActive ? 1.05 : 1,
                }}
                transition={{ duration: 0.2 }}
              >
                {tab.label}
              </motion.span>

              {/* Dark Theme: Active Indicator */}
              {!isGlassTheme && isActive && (
                <motion.div
                  className="absolute bottom-0 left-1/2 w-8 h-1 bg-brand-primary-action rounded-full"
                  layoutId="activeTab"
                  initial={false}
                  style={{ x: '-50%' }}
                  transition={{
                    type: "spring",
                    stiffness: 500,
                    damping: 30,
                  }}
                />
              )}

              {/* Glass Theme: Active State Background */}
              {isGlassTheme && isActive && (
                <motion.div
                  className="absolute inset-1 rounded-xl bg-gradient-to-t from-blue-500/10 to-purple-500/5"
                  initial={false}
                  animate={{
                    opacity: [0.3, 0.5, 0.3],
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Glass Theme: Bottom Reflection */}
      {isGlassTheme && (
        <div 
          className="absolute bottom-0 left-0 right-0 h-8 opacity-30"
          style={{
            background: 'linear-gradient(180deg, transparent 0%, rgba(255, 255, 255, 0.1) 100%)',
            borderRadius: '0 0 16px 16px',
          }}
        />
      )}

      {/* Glass Theme: Noise Texture Overlay */}
      {isGlassTheme && (
        <div 
          className="absolute inset-0 opacity-5 rounded-t-2xl"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='1' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
          }}
        />
      )}
    </motion.nav>
  );
};

export default EnhancedBottomNavigationBar;