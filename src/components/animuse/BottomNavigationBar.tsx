// src/components/animuse/BottomNavigationBar.tsx
import React from "react";
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
    { view: "dashboard", label: "Home", icon: "dashboard" },
    { view: "moodboard_page", label: "Mood", icon: "moodboard_page" }, 
    { view: "browse", label: "Browse", icon: "browse" },
    { view: "my_list", label: "List", icon: "my_list" },
    { view: "profile_settings", label: "Profile", icon: "profile_settings" },
  ];

  const handleTabClick = (view: ValidViewName) => {
    // Add haptic feedback if available
    if ('vibrate' in navigator) {
      navigator.vibrate(50);
    }
    onTabChange(view);
  };

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 bg-brand-surface/80 backdrop-blur-xl border-t border-brand-accent-gold/30 shadow-lg z-50 rounded-t-2xl"
      style={{
        paddingBottom: 'max(12px, env(safe-area-inset-bottom))',
        paddingLeft: 'env(safe-area-inset-left)',
        paddingRight: 'env(safe-area-inset-right)',
      }}
    >
      <div className="max-w-lg mx-auto flex justify-around items-center h-20 px-1">
        {tabs.map((tab) => {
          const isActive = currentView === tab.view;
          return (
            <button
              key={tab.view}
              onClick={() => handleTabClick(tab.view)}
              className={`
                relative flex flex-col items-center justify-center 
                w-full h-full py-2 px-2 text-xs 
                transition-all duration-200 ease-in-out 
                focus:outline-none focus:ring-2 focus:ring-brand-primary-action/50
                touch-manipulation cursor-pointer
                ${isActive ? "text-brand-primary-action" : "text-white/70 hover:text-brand-accent-gold active:text-brand-primary-action"}
              `}
              aria-current={isActive ? "page" : undefined}
              aria-label={`Navigate to ${tab.label}`}
              style={{
                WebkitTapHighlightColor: 'transparent',
                minHeight: '60px',
                minWidth: '60px',
              }}
            >
              {/* Larger touch target overlay */}
              <div 
                className="absolute inset-0 rounded-lg" 
                aria-hidden="true"
                style={{ minHeight: '60px', minWidth: '60px' }}
              />
              
              {/* Icon container with proper sizing */}
              <div className={`relative z-10 transition-transform duration-200 ${isActive ? 'scale-110' : 'hover:scale-105'}`}>
                <svg
                  className={`w-6 h-6 mb-1 transition-all duration-200 ${isActive ? "text-brand-primary-action" : "text-white/70"}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth="1.5"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d={iconPaths[tab.icon]} />
                </svg>
              </div>
              
              {/* Label */}
              <span className={`relative z-10 text-xs leading-tight transition-all duration-200 ${isActive ? 'font-semibold text-brand-primary-action' : 'text-white/70'}`}>
                {tab.label}
              </span>
              
              {/* Active indicator */}
              {isActive && (
                <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-8 h-1 bg-brand-primary-action rounded-full" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNavigationBar;