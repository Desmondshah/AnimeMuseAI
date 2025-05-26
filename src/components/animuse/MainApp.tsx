// src/components/animuse/MainApp.tsx - Enhanced with better navigation
import React, { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import AIAssistantPage from "./AIAssistantPage";
import AnimeDetailPage from "./AnimeDetailPage";
import StyledButton from "./shared/StyledButton";
import WatchlistPage from "./onboarding/WatchlistPage";
import DiscoverPage from "./onboarding/DiscoverPage";
import ProfileStats from "./onboarding/ProfileStats";

type CurrentView = "dashboard" | "ai_assistant" | "anime_detail" | "watchlist" | "discover";

export default function MainApp() {
  const userProfile = useQuery(api.users.getMyUserProfile);
  const [currentView, setCurrentView] = useState<CurrentView>("dashboard");
  const [selectedAnimeId, setSelectedAnimeId] = useState<Id<"anime"> | null>(null);
  const [previousView, setPreviousView] = useState<CurrentView>("dashboard");

  const navigateToDetail = (animeId: Id<"anime">) => {
    setPreviousView(currentView);
    setSelectedAnimeId(animeId);
    setCurrentView("anime_detail");
  };

  const navigateToDashboard = () => {
    setPreviousView("dashboard");
    setCurrentView("dashboard");
    setSelectedAnimeId(null);
  };

  const navigateToDiscover = () => {
    setPreviousView(currentView);
    setCurrentView("discover");
  };

  const navigateToWatchlist = () => {
    setPreviousView(currentView);
    setCurrentView("watchlist");
  };

  const navigateToAIAssistant = () => {
    setPreviousView(currentView);
    setCurrentView("ai_assistant");
  };

  const navigateBack = () => {
    setCurrentView(previousView);
    if (previousView !== "anime_detail") {
      setSelectedAnimeId(null);
    }
  };

  const renderContent = () => {
    switch (currentView) {
      case "ai_assistant":
        return <AIAssistantPage />;
        
      case "anime_detail":
        if (selectedAnimeId) {
          return <AnimeDetailPage animeId={selectedAnimeId} onBack={navigateBack} />;
        }
        setCurrentView(previousView);
        return null;
        
      case "watchlist":
        return <WatchlistPage onViewDetails={navigateToDetail} onBack={navigateBack} />;
        
      case "discover":
        return <DiscoverPage onViewDetails={navigateToDetail} onBack={navigateBack} />;
        
      case "dashboard":
      default:
        return (
          <div className="p-4 neumorphic-card">
            <h1 className="text-3xl font-orbitron text-sakura-pink mb-4 text-center">
              Welcome to AniMuse, {userProfile?.name || "Explorer"}!
            </h1>
            <p className="text-brand-text-secondary mb-6 text-center">
              Your personalized anime journey begins now.
            </p>

            <div className="text-center mb-8">
              <StyledButton
                onClick={navigateToAIAssistant}
                variant="primary"
                className="text-lg px-8 py-4"
              >
                🤖 Talk to AniMuse AI
              </StyledButton>
            </div>

            <div className="mt-6">
              <h2 className="text-2xl font-orbitron text-electric-blue mb-4 text-center">Explore</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div 
                  className="p-4 bg-brand-dark rounded-lg shadow-neumorphic-light-inset cursor-pointer hover:shadow-neumorphic-light transition-shadow text-center"
                  onClick={navigateToDiscover}
                >
                  <h3 className="font-orbitron text-neon-cyan mb-2">🔍 Discover</h3>
                  <p className="text-xs text-brand-text-secondary">Browse & filter anime</p>
                </div>
                
                <div
                  className="p-4 bg-brand-dark rounded-lg shadow-neumorphic-light-inset cursor-pointer hover:shadow-neumorphic-light transition-shadow text-center"
                  onClick={navigateToWatchlist}
                >
                  <h3 className="font-orbitron text-neon-cyan mb-2">📚 Watchlist</h3>
                  <p className="text-xs text-brand-text-secondary">Your saved anime</p>
                </div>
                
                <div className="p-4 bg-brand-dark rounded-lg shadow-neumorphic-light-inset cursor-pointer hover:shadow-neumorphic-light transition-shadow text-center opacity-50">
                  <h3 className="font-orbitron text-neon-cyan mb-2">🎭 For You</h3>
                  <p className="text-xs text-brand-text-secondary">Coming Soon</p>
                </div>
                
                <div className="p-4 bg-brand-dark rounded-lg shadow-neumorphic-light-inset cursor-pointer hover:shadow-neumorphic-light transition-shadow text-center opacity-50">
                  <h3 className="font-orbitron text-neon-cyan mb-2">🎨 Mood Board</h3>
                  <p className="text-xs text-brand-text-secondary">Coming Soon</p>
                </div>
              </div>
            </div>
            
            <ProfileStats />
          </div>
        );
    }
  };

  // Debug info in development
  if (import.meta.env.DEV) {
    console.log("MainApp - Current view:", currentView);
    console.log("MainApp - User profile:", userProfile);
  }

  return (
    <div className="w-full">
      {/* Breadcrumb navigation */}
      {currentView !== "dashboard" && (
        <div className="mb-4 p-2 text-sm text-brand-text-secondary bg-brand-surface/50 rounded-lg">
          <button 
            onClick={navigateToDashboard}
            className="hover:text-neon-cyan transition-colors"
          >
            🏠 Dashboard
          </button>
          {currentView === "anime_detail" && previousView !== "dashboard" && (
            <>
              <span className="mx-2">•</span>
              <button 
                onClick={() => setCurrentView(previousView)}
                className="hover:text-neon-cyan transition-colors capitalize"
              >
                {previousView === "ai_assistant" ? "🤖 AI Assistant" : 
                 previousView === "discover" ? "🔍 Discover" :
                 previousView === "watchlist" ? "📚 Watchlist" : previousView}
              </button>
            </>
          )}
          <span className="mx-2">•</span>
          <span className="text-neon-cyan capitalize">
            {currentView === "ai_assistant" ? "🤖 AI Assistant" : 
             currentView === "anime_detail" ? "📺 Anime Details" :
             currentView === "discover" ? "🔍 Discover" :
             currentView === "watchlist" ? "📚 Watchlist" : currentView}
          </span>
        </div>
      )}
      
      {renderContent()}
    </div>
  );
}