// src/components/animuse/BottomNavigationBar.tsx
import React, { useRef, useState, useEffect } from "react";
import { motion, useScroll, useMotionValueEvent } from "framer-motion";
import { ValidViewName } from "./MainApp";

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

const BottomNavigationBar: React.FC<BottomNavigationBarProps> = ({ currentView, onTabChange }) => {
  const tabs: { view: ValidViewName; label: string; icon: string }[] = [
    { view: "dashboard", label: "HOME", icon: "dashboard" },
    { view: "moodboard_page", label: "MOOD", icon: "moodboard_page" },
    { view: "browse", label: "FIND", icon: "browse" },
    { view: "my_list", label: "LIST", icon: "my_list" },
    { view: "profile_settings", label: "USER", icon: "profile_settings" },
  ];

  const [isHidden, setIsHidden] = useState(false);
  const lastScrollY = useRef(0);
  const scrollContainerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    scrollContainerRef.current = document.getElementById('root');
  }, []);

  const { scrollY } = useScroll({
    container: scrollContainerRef
  });

  const handleTabClick = (view: ValidViewName) => {
    if ('vibrate' in navigator) {
      navigator.vibrate(50);
    }
    onTabChange(view);
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

  return (
    <motion.nav
      className="fixed bottom-0 left-0 right-0 bg-white border-t-4 border-black shadow-[0_-8px_0px_0px_#000] z-50"
      style={{
        paddingBottom: 'max(8px, env(safe-area-inset-bottom))',
        paddingLeft: 'env(safe-area-inset-left)',
        paddingRight: 'env(safe-area-inset-right)',
        willChange: 'transform'
      }}
      initial={{ transform: "translateY(100%)" }}
      animate={{
        transform: isHidden ? "translateY(100%)" : "translateY(0%)",
      }}
      transition={{
        type: 'tween',
        duration: 0.2,
        ease: 'easeInOut'
      }}
      viewport={{ once: false, margin: "0px" }}
    >
      {/* BRUTAL GRID PATTERN */}
      <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_24%,#000_25%,#000_26%,transparent_27%),linear-gradient(180deg,transparent_24%,#000_25%,#000_26%,transparent_27%)] bg-[length:40px_40px] opacity-10"></div>
      
      <div className="relative max-w-lg sm:max-w-xl md:max-w-2xl mx-auto flex justify-around items-center h-16 px-2">
        {tabs.map((tab, index) => {
          const isActive = currentView === tab.view;
          const colors = [
            'bg-brand-primary-action', // HOME - orange
            'bg-purple-500',           // MOOD - purple
            'bg-blue-500',            // FIND - blue
            'bg-green-500',           // LIST - green (only when active)
            'bg-brand-accent-gold',   // USER - gold
          ];
          const activeColor = colors[index];
          
          return (
            <button
              key={tab.view}
              onClick={() => handleTabClick(tab.view)}
              className={`
                relative flex flex-col items-center justify-center
                w-full h-full py-1 px-1 text-xs
                transition-all duration-75
                focus:outline-none
                touch-manipulation cursor-pointer
                border-2 border-black
                active:translate-x-0.5 active:translate-y-0.5
                ${isActive 
                  ? `${activeColor} text-white shadow-[2px_2px_0px_0px_#000] active:shadow-[1px_1px_0px_0px_#000]` 
                  : `bg-white text-black shadow-[2px_2px_0px_0px_#000] active:shadow-[1px_1px_0px_0px_#000] hover:bg-gray-100`
                }
              `}
              aria-current={isActive ? "page" : undefined}
              aria-label={`Navigate to ${tab.label}`}
              style={{
                WebkitTapHighlightColor: 'transparent',
                minHeight: '56px',
                minWidth: '56px',
              }}
            >
              <div className="relative z-10 flex flex-col items-center">
                <svg
                  className={`w-5 h-5 mb-1 stroke-[2.5] transition-all duration-75 ${isActive ? "text-white" : "text-black"}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth="2.5"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d={iconPaths[tab.icon]} />
                </svg>
                
                <span className={`text-[10px] font-black uppercase leading-none tracking-tight transition-all duration-75 ${isActive ? 'text-white' : 'text-black'}`}>
                  {tab.label}
                </span>
              </div>

              {/* BRUTAL ACTIVE INDICATOR */}
              {isActive && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-white border-2 border-black"></div>
              )}
            </button>
          );
        })}
      </div>
    </motion.nav>
  );
};

export default BottomNavigationBar;