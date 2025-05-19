import React, { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import AIAssistantPage from "./AIAssistantPage";
import AnimeDetailPage from "./AnimeDetailPage";
import StyledButton from "./shared/StyledButton";

type CurrentView = "dashboard" | "ai_assistant" | "anime_detail";

export default function MainApp() {
  const userProfile = useQuery(api.users.getMyUserProfile);
  const [currentView, setCurrentView] = useState<CurrentView>("dashboard");
  const [selectedAnimeId, setSelectedAnimeId] = useState<Id<"anime"> | null>(null);

  const navigateToDetail = (animeId: Id<"anime">) => {
    setSelectedAnimeId(animeId);
    setCurrentView("anime_detail");
  };

  const renderContent = () => {
    switch (currentView) {
      case "ai_assistant":
        // AIAssistantPage will handle its own logic for navigating to details if needed,
        // or we can pass navigateToDetail as a prop.
        // For now, AnimeCard within AIAssistantPage will handle adding to DB.
        // If we want AnimeCard to also navigate to detail page from AI Assistant,
        // we'd need to pass a handler.
        return <AIAssistantPage />;
      case "anime_detail":
        if (selectedAnimeId) {
          return <AnimeDetailPage animeId={selectedAnimeId} onBack={() => setCurrentView("dashboard")} />;
        }
        // Fallback to dashboard if no ID (should not happen with proper navigation)
        setCurrentView("dashboard"); 
        return null; 
      case "dashboard":
      default:
        return (
          <div className="text-center p-4 neumorphic-card">
            <h1 className="text-3xl font-orbitron text-sakura-pink mb-4">
              Welcome to AniMuse, {userProfile?.name || "Explorer"}!
            </h1>
            <p className="text-brand-text-secondary mb-6">Your personalized anime journey begins now.</p>
            
            <StyledButton 
              onClick={() => setCurrentView("ai_assistant")}
              variant="primary"
              className="mb-8"
            >
              Talk to AniMuse AI
            </StyledButton>

            <div className="mt-8">
              <h2 className="text-2xl font-orbitron text-electric-blue mb-4">Home Dashboard</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 bg-brand-dark rounded-lg shadow-neumorphic-light-inset cursor-pointer hover:shadow-neumorphic-light transition-shadow">For You (Coming Soon)</div>
                <div className="p-4 bg-brand-dark rounded-lg shadow-neumorphic-light-inset cursor-pointer hover:shadow-neumorphic-light transition-shadow">Discover (Coming Soon)</div>
                <div className="p-4 bg-brand-dark rounded-lg shadow-neumorphic-light-inset cursor-pointer hover:shadow-neumorphic-light transition-shadow">Mood Board (Coming Soon)</div>
                <div 
                    className="p-4 bg-brand-dark rounded-lg shadow-neumorphic-light-inset cursor-pointer hover:shadow-neumorphic-light transition-shadow"
                    // onClick={() => setCurrentView("watchlist")} // Example for future watchlist page
                >
                    Watchlist (Coming Soon)
                </div>
              </div>
            </div>
          </div>
        );
    }
  };

  return <div className="w-full">{renderContent()}</div>;
}
