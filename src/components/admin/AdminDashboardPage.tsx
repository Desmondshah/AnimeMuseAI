// src/components/admin/AdminDashboardPage.tsx - Updated
import React, { useState } from "react";
import StyledButton from "../animuse/shared/StyledButton";
import UserManagementPage from "./UserManagementPage";
import AnimeManagementPage from "../animuse/onboarding/AnimeManagementPage"; // FIXED: Use relative path
import ReviewModerationPage from "./ReviewModerationPage"; // Import ReviewModerationPage

interface AdminDashboardPageProps {
  onNavigateBack: () => void;
}

type AdminView = "overview" | "user_management" | "anime_management" | "review_moderation";

const AdminDashboardPage: React.FC<AdminDashboardPageProps> = ({ onNavigateBack }) => {
  const [currentAdminView, setCurrentAdminView] = useState<AdminView>("overview");

  const renderAdminContent = () => {
    switch (currentAdminView) {
      case "user_management":
        return <UserManagementPage />;
      case "anime_management":
        return <AnimeManagementPage />;
      case "review_moderation": // NEW CASE
        return <ReviewModerationPage />;
      case "overview":
      default:
        return (
          <div className="text-center">
            <h2 className="text-2xl font-orbitron text-neon-cyan mb-4">Admin Overview</h2>
            <p className="text-brand-text-secondary">
              Select a section to manage.
            </p>
          </div>
        );
    }
  };

  return (
    <div className="p-4 sm:p-6 neumorphic-card bg-brand-surface w-full mx-auto">
      <div className="flex justify-between items-center mb-6 pb-4 border-b border-brand-dark">
        <h1 className="text-3xl font-orbitron text-sakura-pink">Admin Dashboard</h1>
        <StyledButton onClick={onNavigateBack} variant="secondary_small">
          &larr; Back to App
        </StyledButton>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        <nav className="md:w-1/4 flex flex-col gap-3">
          <StyledButton
            onClick={() => setCurrentAdminView("overview")}
            variant={currentAdminView === "overview" ? "primary" : "secondary"}
            className="w-full justify-start text-left"
          >
            📊 Overview
          </StyledButton>
          <StyledButton
            onClick={() => setCurrentAdminView("user_management")}
            variant={currentAdminView === "user_management" ? "primary" : "secondary"}
            className="w-full justify-start text-left"
          >
            👥 User Management
          </StyledButton>
          <StyledButton
            onClick={() => setCurrentAdminView("anime_management")}
            variant={currentAdminView === "anime_management" ? "primary" : "secondary"}
            className="w-full justify-start text-left" 
          >
            🎬 Anime Management
          </StyledButton>
          <StyledButton
            onClick={() => setCurrentAdminView("review_moderation")}
            variant={currentAdminView === "review_moderation" ? "primary" : "secondary"}
            className="w-full justify-start text-left" // Enabled
          >
            审查 Review Moderation
          </StyledButton>
        </nav>

        <main className="md:w-3/4 neumorphic-card bg-brand-dark p-4 shadow-neumorphic-light-inset min-h-[300px]">
          {renderAdminContent()}
        </main>
      </div>
    </div>
  );
};

export default AdminDashboardPage;