// src/components/admin/AdminDashboardPage.tsx
import React, { useState, memo } from "react"; // Added memo
import StyledButton from "../animuse/shared/StyledButton"; // Adjusted path
import UserManagementPage from "./UserManagementPage"; // This will need its own styling pass
import AnimeManagementPage from "../animuse/onboarding/AnimeManagementPage"; // This will need its own styling pass
import ReviewModerationPage from "./ReviewModerationPage"; // This will need its own styling pass

interface AdminDashboardPageProps {
  onNavigateBack: () => void;
}

type AdminView = "overview" | "user_management" | "anime_management" | "review_moderation";

// Memoized loading/placeholder for unstyled child components
const AdminContentPlaceholder: React.FC<{ sectionTitle: string }> = memo(({ sectionTitle }) => (
    <div className="flex flex-col items-center justify-center p-8 min-h-[200px] text-center">
        <div className="animate-pulse text-brand-text-primary/50 mb-2">
            <svg className="w-12 h-12" fill="currentColor" viewBox="0 0 20 20"><path d="M10 3.5a1.5 1.5 0 013 0V4a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-.5a1.5 1.5 0 000 3h.5a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-.5a1.5 1.5 0 00-3 0v.5a1 1 0 01-1 1H6a1 1 0 01-1-1v-3a1 1 0 011-1h.5a1.5 1.5 0 000-3H6a1 1 0 01-1-1V8a1 1 0 011-1h3a1 1 0 001-1v-.5z"></path></svg>
        </div>
        <h3 className="text-lg font-heading text-brand-text-primary/70">Loading {sectionTitle}...</h3>
        <p className="text-xs text-brand-text-primary/50 mt-1">This section will be styled soon.</p>
    </div>
));


const AdminDashboardPageComponent: React.FC<AdminDashboardPageProps> = ({ onNavigateBack }) => {
  const [currentAdminView, setCurrentAdminView] = useState<AdminView>("overview");

  const renderAdminContent = () => {
    switch (currentAdminView) {
      case "user_management":
        return <UserManagementPage />; // UserManagementPage will need its own refactor
      case "anime_management":
        return <AnimeManagementPage />; // AnimeManagementPage will need its own refactor
      case "review_moderation":
        return <ReviewModerationPage />; // ReviewModerationPage will need its own refactor
      case "overview":
      default:
        return (
          <div className="text-center p-6">
            <h2 className="text-xl sm:text-2xl font-heading text-brand-accent-gold mb-3">Admin Overview</h2>
            <p className="text-sm text-brand-text-primary/80">
              Select a section from the sidebar to manage application data.
            </p>
          </div>
        );
    }
  };

  return (
    // Main card for the admin dashboard: bg-brand-surface (Cream), text-brand-text-primary (Dark Brown)
    <div className="bg-brand-surface text-brand-text-primary rounded-xl shadow-xl p-4 sm:p-5 md:p-6 w-full mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-4 pb-3 sm:mb-5 sm:pb-4 border-b border-brand-accent-peach/30">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-heading text-brand-primary-action mb-2 sm:mb-0">Admin Dashboard</h1>
        <StyledButton onClick={onNavigateBack} variant="secondary_small" className="self-start sm:self-center !text-xs">
          &larr; Back to App
        </StyledButton>
      </div>

      <div className="flex flex-col md:flex-row gap-4 sm:gap-5">
        {/* Admin Navigation Sidebar */}
        <nav className="md:w-1/4 flex flex-col gap-1.5 sm:gap-2 p-3 bg-brand-accent-peach/10 rounded-lg">
          {[
            { view: "overview", label: "📊 Overview", disabled: false },
            { view: "user_management", label: "👥 Users", disabled: false },
            { view: "anime_management", label: "🎬 Anime", disabled: false },
            { view: "review_moderation", label: "审查 Reviews", disabled: false },
          ].map(item => (
            <StyledButton
              key={item.view}
              onClick={() => setCurrentAdminView(item.view as AdminView)}
              variant={currentAdminView === item.view ? "primary" : "secondary"}
              selected={currentAdminView === item.view} // Leverage selected prop for styling
              className="w-full justify-start text-left !text-xs sm:!text-sm !py-2 !px-2.5 sm:!px-3"
              disabled={item.disabled} // Example: can be dynamic
            >
              {item.label}
            </StyledButton>
          ))}
        </nav>

        {/* Admin Content Area */}
        {/* Contrasting background for the content area: Dark Brown on Cream page */}
        <main className="md:flex-1 bg-brand-background/10 text-brand-text-primary p-3 sm:p-4 rounded-lg shadow-inner min-h-[300px] md:min-h-[400px]">
          {renderAdminContent()}
        </main>
      </div>
    </div>
  );
};

export default memo(AdminDashboardPageComponent);