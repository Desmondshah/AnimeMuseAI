// src/components/animuse/MainApp.tsx
import React, { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import AIAssistantPage from "./AIAssistantPage";
import AnimeDetailPage from "./AnimeDetailPage";
import StyledButton from "./shared/StyledButton";
import WatchlistPage from "./onboarding/WatchlistPage";
import DiscoverPage from "./onboarding/DiscoverPage";
import ProfileStats from "./onboarding/ProfileStats"; // Added for Phase 2

type CurrentView = "dashboard" | "ai_assistant" | "anime_detail" | "watchlist" | "discover";

export default function MainApp() {
  const userProfile = useQuery(api.users.getMyUserProfile);
  const [currentView, setCurrentView] = useState<CurrentView>("dashboard");
  const [selectedAnimeId, setSelectedAnimeId] = useState<Id<"anime"> | null>(null);

  const navigateToDetail = (animeId: Id<"anime">) => {
    setSelectedAnimeId(animeId);
    setCurrentView("anime_detail");
  };

  const navigateToDashboard = () => setCurrentView("dashboard"); // Helper for back buttons

  const renderContent = () => {
    switch (currentView) {
      case "ai_assistant":
        return <AIAssistantPage />;
      case "anime_detail":
        if (selectedAnimeId) {
          // Decide where to go back to from AnimeDetail, perhaps remember previous view or always dashboard.
          return <AnimeDetailPage animeId={selectedAnimeId} onBack={navigateToDashboard} />;
        }
        setCurrentView("dashboard"); // Fallback
        return null;
      case "watchlist":
        return <WatchlistPage onViewDetails={navigateToDetail} />;
      case "discover":
        return <DiscoverPage onViewDetails={navigateToDetail} />;
      case "dashboard":
      default:
        return (
          <div className="p-4 neumorphic-card"> {/* Removed text-center for better layout with stats */}
            <h1 className="text-3xl font-orbitron text-sakura-pink mb-4 text-center">
              Welcome to AniMuse, {userProfile?.name || "Explorer"}!
            </h1>
            <p className="text-brand-text-secondary mb-6 text-center">Your personalized anime journey begins now.</p>

            <div className="text-center"> {/* Centering only the button */}
                <StyledButton
                onClick={() => setCurrentView("ai_assistant")}
                variant="primary"
                className="mb-8"
                >
                Talk to AniMuse AI
                </StyledButton>
            </div>


            <div className="mt-2"> {/* Reduced margin-top for dashboard sections */}
              <h2 className="text-2xl font-orbitron text-electric-blue mb-4 text-center">Explore</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 bg-brand-dark rounded-lg shadow-neumorphic-light-inset cursor-pointer hover:shadow-neumorphic-light transition-shadow text-center">For You (Coming Soon)</div>
                <div
                    className="p-4 bg-brand-dark rounded-lg shadow-neumorphic-light-inset cursor-pointer hover:shadow-neumorphic-light transition-shadow text-center"
                    onClick={() => setCurrentView("discover")}
                >
                    Discover
                </div>
                <div className="p-4 bg-brand-dark rounded-lg shadow-neumorphic-light-inset cursor-pointer hover:shadow-neumorphic-light transition-shadow text-center">Mood Board (Coming Soon)</div>
                <div
                    className="p-4 bg-brand-dark rounded-lg shadow-neumorphic-light-inset cursor-pointer hover:shadow-neumorphic-light transition-shadow text-center"
                    onClick={() => setCurrentView("watchlist")}
                >
                    Watchlist
                </div>
              </div>
            </div>
            <ProfileStats /> {/* Added for Phase 2 */}
          </div>
        );
    }
  };

  return <div className="w-full">{renderContent()}</div>;
}