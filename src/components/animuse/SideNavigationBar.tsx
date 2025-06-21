import React from "react";
import { ValidViewName } from "./MainApp";

interface SideNavigationBarProps {
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

const SideNavigationBar: React.FC<SideNavigationBarProps> = ({ currentView, onTabChange }) => {
  const tabs: { view: ValidViewName; label: string; icon: string }[] = [
    { view: "dashboard", label: "Home", icon: "dashboard" },
    { view: "moodboard_page", label: "Mood", icon: "moodboard_page" },
    { view: "browse", label: "Browse", icon: "browse" },
    { view: "my_list", label: "List", icon: "my_list" },
    { view: "profile_settings", label: "Profile", icon: "profile_settings" },
  ];

  return (
    <div className="desktop-sidebar">
      {/* Logo/Title Section */}
      <div className="desktop-sidebar-header">
        <h1 className="desktop-sidebar-title">AniMuse</h1>
        <p className="desktop-sidebar-subtitle">AI-Powered Anime Discovery</p>
      </div>
      
      {/* Navigation */}
      <nav className="desktop-nav">
      {tabs.map(tab => {
        const isActive = currentView === tab.view;
        return (
          <button
            key={tab.view}
            onClick={() => onTabChange(tab.view)}
              className={`desktop-nav-item ${isActive ? 'active' : ''}`}
            aria-current={isActive ? 'page' : undefined}
          >
            <svg
                className="desktop-nav-icon"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth="1.5"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d={iconPaths[tab.icon]} />
            </svg>
              <span className="desktop-nav-label">{tab.label}</span>
          </button>
        );
      })}
    </nav>
    </div>
  );
};

export default SideNavigationBar;