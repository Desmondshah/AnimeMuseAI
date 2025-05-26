// src/components/admin/AdminDashboardPage.tsx
import React, { useState } from "react";
import StyledButton from "../shared/StyledButton";
import UserManagementPage from "../../admin/UserManagementPage"; // We'll create this next

interface AdminDashboardPageProps {
  onNavigateBack: () => void; // To go back to the main user dashboard
}

type AdminView = "overview" | "user_management" | "anime_management" | "review_moderation";

const AdminDashboardPage: React.FC<AdminDashboardPageProps> = ({ onNavigateBack }) => {
  const [currentAdminView, setCurrentAdminView] = useState<AdminView>("overview");

  const renderAdminContent = () => {
    switch (currentAdminView) {
      case "user_management":
        return <UserManagementPage />;
      // Add cases for other admin sections later
      // case "anime_management":
      //   return <AnimeManagementPage />;
      // case "review_moderation":
      //   return <ReviewModerationPage />;
      case "overview":
      default:
        return (
          <div className="text-center">
            <h2 className="text-2xl font-orbitron text-neon-cyan mb-4">Admin Overview</h2>
            <p className="text-brand-text-secondary">
              Select a section to manage. More features coming soon!
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
        {/* Admin Navigation Sidebar */}
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
            className="w-full justify-start text-left opacity-50 cursor-not-allowed" // Disabled for now
            disabled
          >
            🎬 Anime Management (Soon)
          </StyledButton>
          <StyledButton
            onClick={() => setCurrentAdminView("review_moderation")}
            variant={currentAdminView === "review_moderation" ? "primary" : "secondary"}
            className="w-full justify-start text-left opacity-50 cursor-not-allowed" // Disabled for now
            disabled
          >
            审查 Review Moderation (Soon)
          </StyledButton>
        </nav>

        {/* Admin Content Area */}
        <main className="md:w-3/4 neumorphic-card bg-brand-dark p-4 shadow-neumorphic-light-inset">
          {renderAdminContent()}
        </main>
      </div>
    </div>
  );
};

export default AdminDashboardPage;